# OpenClaw 部署门户 - 项目结构说明

## 📁 完整文件列表

### 后端核心文件

| 文件路径 | 说明 |
|---------|------|
| `server.js` | Express + Socket.io 主服务器 |
| `docker-manager.js` | Docker 容器管理器和流处理器 |
| `package.json` | 后端依赖配置 |
| `.env.example` | 环境变量模板 |

### 前端核心文件

| 文件路径 | 说明 |
|---------|------|
| `client/package.json` | 前端依赖配置 |
| `client/public/index.html` | HTML 入口文件 |
| `client/src/index.js` | React 入口文件 |
| `client/src/index.css` | 全局样式 |

### 前端组件

| 组件文件 | 说明 |
|---------|------|
| `client/src/App.js` | 主应用组件 |
| `client/src/App.css` | 应用样式 |
| `client/src/components/DeploymentTerminal.js` | 终端组件（xterm.js） |
| `client/src/components/DeploymentTerminal.css` | 终端样式 |
| `client/src/components/ProgressBar.js` | 进度条组件 |
| `client/src/components/ProgressBar.css` | 进度条样式 |
| `client/src/components/StatusMessage.js` | 状态消息组件 |
| `client/src/components/StatusMessage.css` | 状态消息样式 |
| `client/src/components/SuccessAnimation.js` | 成功动画组件 |
| `client/src/components/SuccessAnimation.css` | 动画样式 |

### 配置文件

| 文件路径 | 说明 |
|---------|------|
| `.gitignore` | Git 忽略文件配置 |
| `Dockerfile` | Docker 镜像构建文件 |
| `docker-compose.yml` | Docker Compose 配置 |
| `README.md` | 完整项目文档 |
| `QUICK_START.md` | 快速启动指南 |

## 🚀 快速开始

```bash
# 1. 安装依赖
npm install
cd client && npm install && cd ..

# 2. 配置环境（可选，使用默认值即可）
cp .env.example .env

# 3. 启动开发服务器
npm run dev

# 4. 访问应用
# 前端: http://localhost:3000
# 后端: http://localhost:3001
```

## 📦 技术栈

### 后端
- **Node.js** (>= 18.x)
- **Express.js** - Web 框架
- **Socket.io** - 实时通信
- **Dockerode** - Docker Engine API 客户端
- **CORS** - 跨域支持

### 前端
- **React 18** - UI 框架
- **Ant Design** - UI 组件库
- **xterm.js** - 终端仿真
- **Socket.io-client** - 客户端实时通信

## 🔑 核心功能

### 后端功能

1. **容器调度**
   - 动态创建 Docker 容器
   - 执行 OpenClaw 安装脚本
   - 多租户配置隔离

2. **流式传输**
   - 实时捕获容器 stdout/stderr
   - 通过 Socket.io 推送前端
   - UTF-8 编码支持

3. **进度解析**
   - 正则表达式匹配关键词
   - 自动映射百分比
   - 实时同步前端

4. **错误检测**
   - 自动识别错误模式
   - 超时处理
   - 异常通知

### 前端功能

1. **只读终端**
   - xterm.js 渲染
   - disableStdin: true
   - UTF-8 支持
   - 实时日志显示

2. **进度跟踪**
   - 可视化进度条
   - 步骤指示器
   - 状态提示

3. **交互提示**
   - 二维码扫描提醒
   - 成功动画
   - 错误处理按钮

## 📊 数据流

```
用户点击"开始部署"
    ↓
前端调用 POST /api/deploy
    ↓
后端创建 Docker 容器
    ↓
容器执行安装脚本
    ↓
stdout → Socket.io → 前端 xterm.js
    ↓
正则解析 → 进度更新 → 进度条
    ↓
部署完成/错误处理
```

## 🔧 配置说明

### 环境变量

```env
# 服务器配置
PORT=3001                          # 后端端口
CLIENT_PORT=3000                    # 前端端口

# Docker 配置
DOCKER_SOCK=/var/run/docker.sock   # Docker Socket 路径
DOCKER_IMAGE=node:18-alpine        # 基础镜像

# OpenClaw 配置
OPENCLAW_INSTALL_URL=https://openclaw.ai/install.sh
LARK_PACKAGE=@larksuite/openclaw-lark

# 多租户配置
TENANT_ID=default                   # 租户 ID
CONFIG_BASE_PATH=/var/lib/openclaw/configs  # 配置路径

# 超时配置
INSTALL_TIMEOUT=600000             # 安装超时（毫秒）
STREAM_BUFFER_SIZE=8192            # 流缓冲区大小
```

## 🎨 界面预览

### 主界面
```
┌─────────────────────────────────────┐
│  🚀 OpenClaw 部署门户              │
├─────────────────────────────────────┤
│  [进度条: ████████░░░░  60%]       │
│  当前步骤: Installing OpenClaw     │
│                                     │
│  [终端窗口]                         │
│  ╔══════════════════════════════╗   │
│  ║ OpenClaw Deployment Terminal ║   │
│  ╚══════════════════════════════╝   │
│  $ Installing OpenClaw...          │
│  $ OpenClaw installed successfully  │
│  $ Scan with Feishu                  │
│                                     │
│  [开始部署] [停止部署] [重新开始]   │
└─────────────────────────────────────┘
```

## 🔐 安全考虑

1. **Docker Socket 权限**
   - 确保 Socket 文件权限正确
   - 生产环境使用专用用户

2. **环境变量**
   - 不要提交 .env 到 Git
   - 使用密钥管理服务

3. **输入验证**
   - 验证 tenantId 格式
   - 限制容器资源

## 🐛 常见问题

### Q: 容器无法启动？
A: 检查 Docker 服务状态和 Socket 权限

### Q: Socket 连接失败？
A: 检查防火墙和代理设置

### Q: 终端输出乱码？
A: 确保系统使用 UTF-8 编码

## 📞 技术支持

- Email: support@openclaw.ai
- 文档: 见 README.md
