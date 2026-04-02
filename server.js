const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const OpenClawDeployer = require('./openclaw-deployer');
const path = require('path');
const { getDb, createUser, validateUser, findUserById, createDeployment, updateDeploymentStatus, getUserDeployments, deleteDeploymentBySessionId } = require('./db');
const { generateToken, authenticateToken } = require('./middleware/auth');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'client/build')));

// 部署管理器实例
const deployer = new OpenClawDeployer(io);

// ==================== 认证路由 ====================

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, email } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, error: '用户名和密码不能为空' });
    }
    if (username.length < 2 || username.length > 30) {
      return res.status(400).json({ success: false, error: '用户名长度需要在2-30个字符之间' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, error: '密码长度不能少于6个字符' });
    }

    const user = await createUser(username, password, email);
    const token = generateToken(user);
    res.json({ success: true, token, user: { id: user.id, username: user.username, email: user.email } });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, error: '用户名和密码不能为空' });
    }

    const user = await validateUser(username, password);
    const token = generateToken(user);
    res.json({ success: true, token, user: { id: user.id, username: user.username, email: user.email } });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(401).json({ success: false, error: error.message });
  }
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  const user = findUserById(req.user.id);
  if (!user) {
    return res.status(404).json({ success: false, error: '用户不存在' });
  }
  res.json({ success: true, user });
});

// ==================== 原有路由 ====================

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: Date.now(), socketClients: io.engine.clientsCount });
});

app.get('/api/docker/images', async (req, res) => {
  try {
    const images = await deployer.listAvailableImages();
    res.json({ success: true, images });
  } catch (error) {
    console.error('列出镜像错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/deploy', authenticateToken, async (req, res) => {
  try {
    const { botName = 'OpenClaw助手' } = req.body;
    const tenantId = req.user.username;

    console.log(`\n收到部署请求`);
    console.log(`   用户: ${tenantId} (ID: ${req.user.id})`);
    console.log(`   机器人: ${botName}`);

    const sessionId = await deployer.startDeployment(tenantId, botName, req.user.id);

    // 记录到数据库
    const deployment = deployer.deployments.get(sessionId);
    createDeployment(req.user.id, sessionId, botName, deployment.containerName);

    res.json({
      success: true,
      sessionId,
      message: '部署已启动',
    });
  } catch (error) {
    console.error('部署启动错误:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.post('/api/deploy/:sessionId/stop', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    await deployer.stopDeployment(sessionId);
    updateDeploymentStatus(sessionId, 'stopped');
    res.json({
      success: true,
      message: '部署已停止',
    });
  } catch (error) {
    console.error('部署停止错误:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// 查询当前用户有没有进行中的部署（服务器内存）
app.get('/api/deploy/active', authenticateToken, (req, res) => {
  for (const [sessionId, dep] of deployer.deployments.entries()) {
    if (dep.tenantId === req.user.username && dep.status === 'running') {
      return res.json({
        success: true,
        active: {
          sessionId,
          botName: dep.botName,
          status: dep.status,
          progress: dep.progress,
          message: dep.message,
        },
      });
    }
  }
  res.json({ success: true, active: null });
});

app.get('/api/deploy/:sessionId/status', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const status = deployer.getDeploymentStatus(sessionId);
    res.json(status);
  } catch (error) {
    console.error('状态查询错误:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ==================== 容器管理路由 ====================

app.get('/api/containers', authenticateToken, async (req, res) => {
  try {
    const username = req.user.username;
    const prefix = `openclaw-${username}-`;

    // 1. 从 DB 拿记录
    const deployments = getUserDeployments(req.user.id);
    const knownContainerNames = new Set(deployments.map(d => d.containerName).filter(Boolean));

    // 2. 直接扫 Docker，把不在 DB 里的容器也补进来（服务器重启后内存丢失的情况）
    try {
      const allContainers = await deployer.docker.listContainers({ all: true });
      for (const c of allContainers) {
        const name = (c.Names || []).map(n => n.replace(/^\//, ''))[0] || '';
        if (name.startsWith(prefix) && !knownContainerNames.has(name)) {
          deployments.unshift({
            sessionId: name,          // 没有 sessionId 就用容器名代替
            botName: name,            // 没有 botName 就显示容器名
            containerName: name,
            containerId: c.Id,
            status: c.State,
            createdAt: new Date(c.Created * 1000).toISOString(),
          });
        }
      }
    } catch (e) {
      // Docker 扫描失败不影响 DB 结果
    }

    // 3. 内存中进行中的部署也补进来
    const allNames = new Set(deployments.map(d => d.containerName).filter(Boolean));
    for (const [sessionId, dep] of deployer.deployments.entries()) {
      if (dep.tenantId === username && !allNames.has(dep.containerName)) {
        deployments.unshift({
          sessionId,
          botName: dep.botName,
          containerName: dep.containerName,
          containerId: null,
          status: dep.status,
          createdAt: new Date(dep.startTime).toISOString(),
        });
      }
    }

    // 4. 给每条记录查实时 Docker 状态
    const containers = [];
    for (const dep of deployments) {
      const memDep = deployer.deployments.get(dep.sessionId);
      if (memDep) {
        containers.push({
          ...dep,
          docker: { state: memDep.status, running: memDep.status === 'running' },
        });
        continue;
      }

      let dockerStatus = null;
      if (dep.containerName) {
        try {
          const container = deployer.docker.getContainer(dep.containerName);
          const info = await container.inspect();
          dockerStatus = { state: info.State.Status, running: info.State.Running };
        } catch (e) {
          dockerStatus = { state: 'removed', running: false };
        }
      }
      containers.push({ ...dep, docker: dockerStatus });
    }

    res.json({ success: true, containers });
  } catch (error) {
    console.error('列出容器错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/containers/:name/start', authenticateToken, async (req, res) => {
  try {
    const container = deployer.docker.getContainer(req.params.name);
    await container.start();
    res.json({ success: true, message: '容器已启动' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/containers/:name/stop', authenticateToken, async (req, res) => {
  try {
    const container = deployer.docker.getContainer(req.params.name);
    await container.stop({ t: 5 });
    res.json({ success: true, message: '容器已停止' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/containers/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const deployments = getUserDeployments(req.user.id);
    const dep = deployments.find(d => d.sessionId === sessionId);
    if (!dep) {
      return res.status(404).json({ success: false, error: '部署记录不存在' });
    }

    // 尝试删除 Docker 容器
    if (dep.containerName) {
      try {
        const container = deployer.docker.getContainer(dep.containerName);
        try { await container.stop({ t: 2 }); } catch (e) { /* 可能已停止 */ }
        await container.remove();
      } catch (e) {
        // 容器可能已不存在
      }
    }

    deleteDeploymentBySessionId(sessionId);
    deployer.deployments.delete(sessionId);
    res.json({ success: true, message: '已删除' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/containers/:name/logs', authenticateToken, async (req, res) => {
  try {
    const container = deployer.docker.getContainer(req.params.name);
    const logs = await container.logs({ stdout: true, stderr: true, tail: 200 });
    res.json({ success: true, logs: logs.toString('utf-8') });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Socket.io 连接处理
io.on('connection', (socket) => {
  console.log(`客户端已连接: ${socket.id}`);
  socket.onAny((event, ...args) => {
    console.log(`[event] ${socket.id} -> ${event}`, JSON.stringify(args).substring(0, 120));
  });

  socket.on('join-deployment', ({ sessionId }) => {
    socket.join(sessionId);
    console.log(`客户端 ${socket.id} 加入部署: ${sessionId}`);

    const deployment = deployer.deployments.get(sessionId);
    if (deployment && deployment.output.length > 0) {
      deployment.output.forEach((output) => {
        socket.emit('log', { output, timestamp: Date.now() });
      });
      socket.emit('progress', {
        progress: deployment.progress,
        message: deployment.message,
        status: deployment.status,
        timestamp: Date.now(),
      });
    }
  });

  socket.on('leave-deployment', ({ sessionId }) => {
    socket.leave(sessionId);
  });

  socket.on('disconnect', () => {
    console.log(`客户端已断开: ${socket.id}`);
  });
});

// 客户端路由回退
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

// 初始化数据库并启动服务器
const PORT = process.env.PORT || 3001;

async function start() {
  await getDb();
  console.log('数据库已初始化');

  server.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════╗
║  OpenClaw 部署门户服务器            ║
╚══════════════════════════════════╝

服务器运行在端口 ${PORT}
平台: ${process.platform}
环境: ${process.env.NODE_ENV || 'development'}
    `);
  });
}

start().catch(err => {
  console.error('启动失败:', err);
  process.exit(1);
});

// 优雅退出
process.on('SIGTERM', async () => {
  console.log('\n收到 SIGTERM，清理中...');
  await deployer.cleanupAll();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n收到 SIGINT，清理中...');
  await deployer.cleanupAll();
  process.exit(0);
});
