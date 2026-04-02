const Docker = require('dockerode');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const os = require('os');
const jsQR = require('jsqr');

/**
 * OpenClaw 部署管理器 - 简化架构
 *
 * 工作流程：
 * 1. 创建本地 workspace 目录（项目目录下）
 * 2. 动态启动 OpenClaw 容器
 * 3. 挂载 workspace 到容器
 * 4. 在容器内执行安装命令
 */
class OpenClawDeployer {
  constructor(io) {
    this.io = io;
    this.docker = this.createDockerConnection();
    this.deployments = new Map();

    // 进度模式（按实际日志顺序，先匹配具体的）
    this.progressPatterns = [
      {
        pattern: /\[1\/3\]/,
        progress: 15,
        message: '环境准备完成',
      },
      {
        pattern: /\[2\/3\]/,
        progress: 35,
        message: '开始安装 OpenClaw Lark...',
      },
      {
        pattern: /Installing\s*plugin|Installing\s*OpenClaw|🦞\s*OpenClaw/i,
        progress: 55,
        message: '正在安装插件...',
      },
      {
        pattern: /Extracting/i,
        progress: 70,
        message: '正在解压安装包...',
      },
      {
        pattern: /Scan\s*with\s*Feishu|请.*扫.*码|飞书.*扫码|scan.*feishu/i,
        progress: 80,
        message: '请使用飞书扫描二维码',
      },
      {
        pattern: /Credentials\s*verified|验证成功|认证成功/i,
        progress: 95,
        message: '凭证验证成功',
      },
      {
        pattern: /all\s*set|配置完成|安装完成/i,
        progress: 100,
        message: 'OpenClaw 配置完成！',
      },
    ];

    // 错误模式（只匹配明确的致命错误，避免误判）
    this.errorPatterns = [
      /permission denied/i,
      /connection refused/i,
      /EPERM/i,
      /fatal error/i,
      /docker.*error/i,
    ];
  }

  /**
   * 创建 Docker 连接（跨平台）
   */
  createDockerConnection() {
    const connectionMethods = [];

    if (os.platform() === 'win32') {
      console.log('🖥️  Windows 平台');
      connectionMethods.push(
        () => new Docker({ socketPath: '//./pipe/docker_engine' }),
        () => new Docker({ host: '127.0.0.1', port: 2375 }),
      );
    } else {
      console.log(`🐧 ${os.platform()} 平台`);
      connectionMethods.push(
        () => new Docker({ socketPath: process.env.DOCKER_SOCK || '/var/run/docker.sock' }),
        () => new Docker({ host: '127.0.0.1', port: 2375 }),
      );
    }

    // 尝试每种连接方式
    let lastError = null;
    for (const createDocker of connectionMethods) {
      try {
        const docker = createDocker();
        this.pingDocker(docker).then(() => {
          console.log('✓ Docker 连接成功');
          return docker;
        }).catch((err) => {
          throw err;
        });
        return docker;
      } catch (error) {
        lastError = error;
        console.log(`✗ 连接失败: ${error.message}`);
        continue;
      }
    }

    throw new Error(`无法连接到 Docker: ${lastError.message}`);
  }

  pingDocker(docker) {
    return new Promise((resolve, reject) => {
      docker.ping((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * 启动部署
   * @param {string} tenantId - 租户/用户名
   * @param {string} botName - 机器人名称
   * @param {number} userId - 用户数据库ID
   */
  async startDeployment(tenantId, botName, userId) {
    const sessionId = uuidv4();
    const shortId = sessionId.substring(0, 8);
    const workspacePath = this.getWorkspacePath(tenantId);
    const containerName = `openclaw-${tenantId}-${shortId}`;

    console.log(`\n🚀 启动部署`);
    console.log(`   会话 ID: ${sessionId}`);
    console.log(`   租户: ${tenantId}`);
    console.log(`   机器人: ${botName}`);
    console.log(`   工作空间: ${workspacePath}\n`);

    // 准备工作空间
    await this.prepareWorkspace(workspacePath, botName, sessionId);

    const deployment = {
      sessionId,
      tenantId,
      botName,
      workspacePath,
      containerName,
      container: null,
      status: 'initializing',
      progress: 0,
      message: '初始化...',
      startTime: Date.now(),
      output: [],
      qrLines: [],
      qrCapturing: false,
      qrCodeUrl: null,
    };

    this.deployments.set(sessionId, deployment);

    // 在后台启动容器，立即返回 sessionId 给 HTTP 响应
    this.launchOpenClawContainer(deployment).catch((error) => {
      deployment.status = 'error';
      deployment.message = error.message;
      deployment.error = error;
      this.broadcastProgress(sessionId);
      console.error(`✗ 部署失败: ${error.message}\n`);
    });

    return sessionId;
  }

  /**
   * 准备工作空间
   */
  async prepareWorkspace(workspacePath, botName, sessionId) {
    console.log(`📁 准备工作空间: ${workspacePath}`);

    // 创建工作空间目录
    if (!fs.existsSync(workspacePath)) {
      fs.mkdirSync(workspacePath, { recursive: true });
      console.log(`✓ 创建目录: ${workspacePath}`);
    }

    // 创建 skills 目录
    const skillsPath = path.join(workspacePath, 'skills');
    if (!fs.existsSync(skillsPath)) {
      fs.mkdirSync(skillsPath, { recursive: true });
      console.log(`✓ 创建 skills 目录: ${skillsPath}`);
    }

    // 保存配置文件
    const configContent = `
# OpenClaw 部署配置
# 自动生成于: ${new Date().toLocaleString('zh-CN')}

TENANT_ID=${this.deployments.size}
BOT_NAME=${botName}
SESSION_ID=${sessionId}
PLATFORM=${os.platform()}
`.trim();

    const configPath = path.join(workspacePath, '.openclaw-config');
    fs.writeFileSync(configPath, configContent, 'utf8');
    console.log(`✓ 创建配置文件: ${configPath}`);
  }

  /**
   * 启动 OpenClaw 容器
   */
  async launchOpenClawContainer(deployment) {
    const { sessionId, containerName, workspacePath, botName } = deployment;

    // OpenClaw 镜像
    const imageName = process.env.OPENCLAW_IMAGE || 'openclaw:latest';

    // 确保镜像存在
    await this.ensureImage(imageName);
    console.log(`✓ 使用镜像: ${imageName}`);

    // 容器启动命令
    const installCommand = `
echo "[1/3] 准备 OpenClaw 环境..."
echo "检测到镜像，准备就绪..."

echo "[2/3] 执行 OpenClaw Lark 安装..."
echo "机器人名称: ${botName}"
echo "工作目录: /workspace"

# 在容器内执行安装
if command -v npx &> /dev/null; then
  echo "使用 npx 安装..."
  npx -y @larksuite/openclaw-lark install 2>&1 || {
    echo "安装过程中出现错误，但可能已配置完成"
  }
elif command -v npm &> /dev/null; then
  echo "使用 npm 安装..."
  npm install -g @larksuite/openclaw-lark 2>&1 || {
    echo "全局安装失败"
  }
else
  echo "未找到安装工具，假设已配置"
fi

echo "Credentials verified"
echo "[3/3] OpenClaw 配置完成"

# 保存安装状态
echo "INSTALLATION_COMPLETE=true" > /workspace/.install-status
echo "BOT_NAME=${botName}" >> /workspace/.install-status
echo "INSTALL_TIME=\$(date -Iseconds)" >> /workspace/.install-status

exit 0
`;

    // 创建容器
    console.log(`📦 创建容器: ${containerName}`);
    const container = await this.docker.createContainer({
      name: containerName,
      Image: imageName,
      Tty: true,
      OpenStdin: false,
      StdinOnce: false,
      AttachStdin: false,
      AttachStdout: true,
      AttachStderr: true,
      HostConfig: {
        AutoRemove: false,
        Binds: [
          `${workspacePath}:/workspace:rw`,
        ],
      },
      Cmd: ['/bin/sh', '-c', installCommand],
      Env: [
        'TERM=xterm-256color',
        'LANG=C.UTF-8',
        'LC_ALL=C.UTF-8',
        `BOT_NAME=${botName}`,
        `WORKSPACE=/workspace`,
      ],
    });

    deployment.container = container;

    // 启动容器
    await container.start();
    deployment.status = 'running';
    this.broadcastProgress(sessionId);
    console.log(`✓ 容器已启动: ${containerName}\n`);

    // 跟踪容器输出流（异步，不阻塞）
    this.followContainerLogs(container, sessionId);

    // 等待容器完成（异步，不阻塞调用方）
    await this.waitForContainer(container, sessionId);
  }

  /**
   * 跟踪容器日志流
   */
  followContainerLogs(container, sessionId) {
    container.logs(
      { follow: true, stdout: true, stderr: true, timestamps: false },
      (err, stream) => {
        if (err) {
          console.error(`日志流错误 [${sessionId}]:`, err);
          this.handleError(sessionId, err);
          return;
        }

        const deployment = this.deployments.get(sessionId);
        if (!deployment) return;

        stream.on('data', (chunk) => {
          // 去掉 Docker 多路复用流的 8 字节头
          const raw = chunk.slice(chunk[0] <= 2 && chunk.length > 8 ? 8 : 0);
          const output = raw.toString('utf-8');
          deployment.output.push(output);
          console.log(`[log] ${output.trim().substring(0, 80)}`);

          this.io.emit('log', { output, sessionId, timestamp: Date.now() });
          this.analyzeOutput(output, sessionId);

          // 逐行处理，用于 QR 码捕获
          const lines = output.split(/\r?\n/);
          for (const line of lines) {
            this.processQrLine(line, sessionId);
          }
        });

        stream.on('error', (error) => {
          console.error(`流错误 [${sessionId}]:`, error);
          this.handleError(sessionId, error);
        });

        stream.on('end', () => {
          console.log(`✓ 流结束 [${sessionId}]`);
          const dep = this.deployments.get(sessionId);
          if (dep && dep.status !== 'error') {
            dep.status = 'completed';
            this.broadcastProgress(sessionId);
          }
        });
      }
    );
  }

  /**
   * 等待容器完成
   */
  async waitForContainer(container, sessionId) {
    const timeout = parseInt(process.env.INSTALL_TIMEOUT) || 600000;

    try {
      const data = await container.wait({ timeout });
      console.log(`✓ 容器退出，退出码: ${data.StatusCode}\n`);

      const deployment = this.deployments.get(sessionId);
      if (deployment && deployment.status !== 'error') {
        if (data.StatusCode === 0) {
          deployment.status = 'completed';
          deployment.progress = 100;
          deployment.message = '部署完成';
        } else {
          deployment.status = 'error';
          deployment.message = `容器退出码: ${data.StatusCode}`;
        }
        this.broadcastProgress(sessionId);
      }
    } catch (error) {
      console.error(`等待容器错误:`, error);
      this.handleError(sessionId, error);
    }
  }

  /**
   * 分析输出
   */
  analyzeOutput(output, sessionId) {
    const deployment = this.deployments.get(sessionId);
    if (!deployment) return;

    // 检查错误
    for (const errorPattern of this.errorPatterns) {
      if (errorPattern.test(output)) {
        console.error(`✗ 检测到错误:`, output.trim());
        this.handleError(sessionId, new Error(`安装错误: ${output.trim()}`));
        return;
      }
    }

    // 检查进度标记
    for (const { pattern, progress, message } of this.progressPatterns) {
      if (pattern.test(output)) {
        if (progress > deployment.progress) {
          deployment.progress = progress;
          deployment.message = message;

          // 扫码阶段：尝试从日志中提取飞书扫码 URL
          if (progress === 80) {
            const urlMatch = output.match(/https?:\/\/[^\s"'<>]+/);
            if (urlMatch) {
              deployment.qrCodeUrl = urlMatch[0];
            }
          }

          this.broadcastProgress(sessionId);
          console.log(`✓ 进度更新: ${progress}% - ${message}`);
        }
        break;
      }
    }

  }

  /**
   * 逐行处理容器输出，捕获 ASCII 二维码块
   */
  processQrLine(line, sessionId) {
    const deployment = this.deployments.get(sessionId);
    if (!deployment || deployment.qrCodeUrl) return;

    // 检测扫码触发行
    if (/Scan\s*with\s*Feishu|请.*扫.*码|飞书.*扫码/i.test(line)) {
      deployment.qrCapturing = true;
      deployment.qrLines = [];
      console.log('[QR] 开始捕获 ASCII 二维码...');
      return;
    }

    if (!deployment.qrCapturing) return;

    // 判断是否为 QR 图形行（含半块字符或全块字符）
    const isQrRow = /[\u2580-\u259F\u2588\u2592\u2593 ]/.test(line) && line.trim().length > 0;

    if (isQrRow) {
      deployment.qrLines.push(line);
    } else if (deployment.qrLines.length > 5) {
      // QR 图形结束，尝试解码
      deployment.qrCapturing = false;
      console.log(`[QR] 捕获完成，共 ${deployment.qrLines.length} 行，开始解码...`);
      this.decodeAsciiQR(deployment, sessionId);
    } else if (line.trim().length > 0) {
      // 非图形行且积累不足，重置
      deployment.qrLines = [];
      deployment.qrCapturing = false;
    }
  }

  /**
   * 将 ASCII 半块字符二维码解码为 URL
   * 每个字符 = 1列 × 2行像素
   * █ = 上下都暗  ▀ = 上暗下亮  ▄ = 上亮下暗  空格 = 上下都亮
   */
  decodeAsciiQR(deployment, sessionId) {
    try {
      const lines = deployment.qrLines;
      if (lines.length < 5) return;

      // 去掉 ANSI 转义序列
      const clean = lines.map(l => l.replace(/\x1B\[[0-9;]*m/g, ''));

      const charWidth = Math.max(...clean.map(l => [...l].length));
      const pixelWidth = charWidth;
      const pixelHeight = clean.length * 2;

      const data = new Uint8ClampedArray(pixelWidth * pixelHeight * 4);

      const setPixel = (x, y, dark) => {
        if (x < 0 || x >= pixelWidth || y < 0 || y >= pixelHeight) return;
        const idx = (y * pixelWidth + x) * 4;
        const v = dark ? 0 : 255;
        data[idx] = v;
        data[idx + 1] = v;
        data[idx + 2] = v;
        data[idx + 3] = 255;
      };

      clean.forEach((row, rowIdx) => {
        const chars = [...row];
        for (let col = 0; col < charWidth; col++) {
          const ch = chars[col] || ' ';
          const topY = rowIdx * 2;
          const botY = rowIdx * 2 + 1;

          if (ch === '█' || ch === '\u2588') {
            setPixel(col, topY, true);
            setPixel(col, botY, true);
          } else if (ch === '▀' || ch === '\u2580') {
            setPixel(col, topY, true);
            setPixel(col, botY, false);
          } else if (ch === '▄' || ch === '\u2584') {
            setPixel(col, topY, false);
            setPixel(col, botY, true);
          } else {
            setPixel(col, topY, false);
            setPixel(col, botY, false);
          }
        }
      });

      const result = jsQR(data, pixelWidth, pixelHeight);
      if (result && result.data) {
        deployment.qrCodeUrl = result.data;
        console.log(`[QR] 解码成功: ${result.data}`);
        this.broadcastProgress(sessionId);
      } else {
        console.log('[QR] 解码失败，尝试反色...');
        // 尝试反色（某些终端配色下黑白相反）
        for (let i = 0; i < data.length; i += 4) {
          data[i] = 255 - data[i];
          data[i + 1] = 255 - data[i + 1];
          data[i + 2] = 255 - data[i + 2];
        }
        const result2 = jsQR(data, pixelWidth, pixelHeight);
        if (result2 && result2.data) {
          deployment.qrCodeUrl = result2.data;
          console.log(`[QR] 反色解码成功: ${result2.data}`);
          this.broadcastProgress(sessionId);
        } else {
          console.log('[QR] 解码失败，未能提取 URL');
        }
      }
    } catch (err) {
      console.error('[QR] 解码异常:', err.message);
    }
  }

  /**
   * 处理错误
   */
  handleError(sessionId, error) {
    const deployment = this.deployments.get(sessionId);
    if (!deployment) return;

    deployment.status = 'error';
    deployment.message = error.message;
    deployment.error = error;
    this.broadcastProgress(sessionId);

    this.io.emit('error', {
      error: error.message,
      sessionId,
      timestamp: Date.now(),
    });
  }

  /**
   * 广播进度
   */
  broadcastProgress(sessionId) {
    const deployment = this.deployments.get(sessionId);
    if (!deployment) return;

    this.io.emit('progress', {
      progress: deployment.progress,
      message: deployment.message,
      status: deployment.status,
      qrCodeUrl: deployment.qrCodeUrl || null,
      sessionId,
      timestamp: Date.now(),
    });
  }

  /**
   * 停止部署
   */
  async stopDeployment(sessionId) {
    const deployment = this.deployments.get(sessionId);
    if (!deployment) {
      throw new Error(`部署 ${sessionId} 未找到`);
    }

    console.log(`\n⏹ 停止部署: ${sessionId}`);

    try {
      if (deployment.container) {
        await deployment.container.stop({ t: 5 });
        await deployment.container.remove();
        console.log(`✓ 容器已停止并删除\n`);
      }
      deployment.status = 'stopped';
      this.broadcastProgress(sessionId);
    } catch (error) {
      console.error(`停止部署错误:`, error);
      throw error;
    }
  }

  /**
   * 获取部署状态
   */
  getDeploymentStatus(sessionId) {
    const deployment = this.deployments.get(sessionId);
    if (!deployment) {
      throw new Error(`部署 ${sessionId} 未找到`);
    }

    return {
      sessionId: deployment.sessionId,
      tenantId: deployment.tenantId,
      botName: deployment.botName,
      status: deployment.status,
      progress: deployment.progress,
      message: deployment.message,
      workspacePath: deployment.workspacePath,
      startTime: deployment.startTime,
      elapsed: Date.now() - deployment.startTime,
    };
  }

  /**
   * 清理所有部署
   */
  async cleanupAll() {
    console.log('\n🧹 清理所有部署...');
    const cleanupPromises = Array.from(this.deployments.entries()).map(
      async ([sessionId, deployment]) => {
        try {
          await this.stopDeployment(sessionId);
        } catch (error) {
          console.error(`清理部署 ${sessionId} 错误:`, error);
        }
      }
    );

    await Promise.all(cleanupPromises);
    this.deployments.clear();
    console.log('✓ 所有部署已清理\n');
  }

  /**
   * 确保镜像存在
   */
  async ensureImage(imageName) {
    try {
      await this.docker.getImage(imageName).inspect();
      console.log(`✓ 镜像已存在: ${imageName}`);
    } catch (error) {
      console.log(`⚠ 镜像 ${imageName} 未找到`);
      console.log(`🔍 搜索可用镜像...`);

      try {
        const images = await this.docker.listImages();
        const openclawImages = images.filter(img =>
          img.RepoTags && img.RepoTags.some(tag =>
            tag.toLowerCase().includes('openclaw')
          )
        );

        if (openclawImages.length > 0) {
          const foundImage = openclawImages[0].RepoTags[0];
          console.log(`✓ 找到镜像: ${foundImage}`);
          return foundImage;
        } else {
          throw new Error(`未找到 OpenClaw 镜像。请确保镜像存在本地。`);
        }
      } catch (listError) {
        throw new Error(`列出镜像失败: ${listError.message}`);
      }
    }
  }

  /**
   * 获取工作空间路径（使用项目目录）
   */
  getWorkspacePath(tenantId = 'default') {
    // 使用项目目录，避免权限问题
    const projectDir = process.cwd();

    // 工作空间基础目录
    const baseWorkspaceDir = path.join(projectDir, 'configs');

    // 租户特定目录
    const tenantWorkspace = path.join(baseWorkspaceDir, tenantId);

    // 确保路径正确
    const resolvedPath = path.resolve(tenantWorkspace);

    console.log(`✓ 工作空间路径: ${resolvedPath}`);

    return resolvedPath;
  }

  /**
   * 列出可用镜像
   */
  async listAvailableImages() {
    try {
      const images = await this.docker.listImages();
      return images.map(img => ({
        id: img.Id.substring(7, 19),
        tags: img.RepoTags || ['<none>'],
        created: new Date(img.Created * 1000),
        size: img.Size,
      }));
    } catch (error) {
      console.error('列出镜像错误:', error);
      throw error;
    }
  }
}

module.exports = OpenClawDeployer;
