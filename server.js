const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const OpenClawDeployer = require('./openclaw-deployer');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || `http://localhost:${process.env.CLIENT_PORT}`,
    methods: ['GET', 'POST'],
  },
});

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'client/build')));

// 部署管理器实例
const deployer = new OpenClawDeployer(io);

// 路由
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: Date.now() });
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

app.post('/api/deploy', async (req, res) => {
  try {
    const { tenantId = 'default', botName = 'OpenClaw助手' } = req.body;
    console.log(`\n🚀 收到部署请求`);
    console.log(`   租户: ${tenantId}`);
    console.log(`   机器人: ${botName}`);

    const sessionId = await deployer.startDeployment(tenantId, botName);
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

app.post('/api/deploy/:sessionId/stop', async (req, res) => {
  try {
    const { sessionId } = req.params;
    await deployer.stopDeployment(sessionId);
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

app.get('/api/deploy/:sessionId/status', async (req, res) => {
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

// Socket.io 连接处理
io.on('connection', (socket) => {
  console.log(`✓ 客户端已连接: ${socket.id}`);

  socket.on('join-deployment', ({ sessionId }) => {
    socket.join(sessionId);
    console.log(`✓ 客户端 ${socket.id} 加入部署: ${sessionId}`);
  });

  socket.on('leave-deployment', ({ sessionId }) => {
    socket.leave(sessionId);
    console.log(`✓ 客户端 ${socket.id} 离开部署: ${sessionId}`);
  });

  socket.on('disconnect', () => {
    console.log(`✗ 客户端已断开: ${socket.id}`);
  });
});

// 客户端路由回退
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

// 启动服务器
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════╗
║  OpenClaw 部署门户服务器            ║
║   跨平台支持 (Windows/Linux/macOS)  ║
╚══════════════════════════════════╝

服务器运行在端口 ${PORT}
Docker 连接: 自动检测
平台: ${process.platform}
环境: ${process.env.NODE_ENV || 'development'}

API 端点:
  - GET  /api/health
  - GET  /api/docker/images
  - POST /api/deploy
  - POST /api/deploy/:sessionId/stop
  - GET  /api/deploy/:sessionId/status

工作空间配置:
  - 工作空间: ~/openclaw-workspaces/
  - 容器挂载: /workspace
  - Skills 目录: /workspace/skills

  `);
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
