# 🚀 OpenClaw Windows + Docker Desktop 快速部署指南

## 前提条件检查清单

- [ ] Windows 10/11 操作系统
- [ ] Docker Desktop 已安装并运行
- [ ] Node.js >= 18.x 已安装
- [ ] OpenClaw Docker 镜像已存在本地

## 📝 一分钟快速启动

```powershell
# 1. 进入项目目录
cd D:\Projects\onestep

# 2. 安装依赖
npm install

# 3. 运行 Windows 设置脚本
node setup-windows.js

# 4. 启动应用
npm run dev:windows

# 5. 打开浏览器
# http://localhost:3000
```

## 🔧 手动配置（如果自动设置失败）

### 1. 检查 Docker Desktop

```powershell
# 查看 Docker 状态
docker ps
```

如果失败，请：
1. 启动 Docker Desktop
2. 等待 Docker 完全启动（右下角有图标）
3. 再次运行 `docker ps`

### 2. 查找您的 OpenClaw 镜像

```powershell
# 列出所有镜像
docker images
```

找到包含 "openclaw" 的镜像，例如：
```
openclaw    latest    abc123def456    2 hours ago    500MB
```

### 3. 创建配置文件

```powershell
# 复制示例配置
copy .env.windows.example .env

# 编辑配置
notepad .env
```

修改以下内容：
```env
# 设置您的镜像名称
OPENCLAW_IMAGE=openclaw:latest

# 如果镜像名不同，改为实际的
# OPENCLAW_IMAGE=my-openclaw-image:v1.0
```

### 4. 启动应用

```powershell
# 开发模式（同时启动前后端）
npm run dev:windows

# 或仅启动后端
npm run start:windows
```

## 🐳 Docker Desktop 配置

### 启用 Docker API（可选）

如果需要通过 HTTP 连接：

1. 打开 Docker Desktop 设置
2. 进入 "General"
3. 勾选 "Expose daemon on tcp://localhost:2375 without TLS"
4. 重启 Docker Desktop

## 📁 目录结构

```
D:\Projects\onestep\
├── server.js              # Linux/WSL 服务器
├── server-windows.js      # Windows 服务器（主要使用）
├── docker-manager.js      # Linux Docker 管理器
├── docker-manager-windows.js  # Windows Docker 管理器（主要使用）
├── setup-windows.js       # Windows 自动设置脚本
├── .env                   # 环境变量配置
├── .env.windows.example   # Windows 配置示例
├── client/                # 前端应用
└── configs/               # 配置目录（自动创建）
```

## 🔍 常见问题解决

### Q1: Docker 连接失败

**错误信息**: `Unable to connect to Docker`

**解决方法**:
```powershell
# 重启 Docker Desktop
# 方法1: 任务管理器中结束 Docker Desktop 进程
# 方法2: 右键系统托盘 Docker 图标 -> Restart

# 等待 Docker 完全启动后再试
docker ps
```

### Q2: 找不到 OpenClaw 镜像

**错误信息**: `OpenClaw image not found`

**解决方法**:
```powershell
# 1. 查看所有镜像
docker images

# 2. 如果有镜像但名称不是 openclaw:latest
docker tag <your-image-name> openclaw:latest

# 3. 或编辑 .env 设置正确的镜像名
OPENCLAW_IMAGE=<your-image-name>
```

### Q3: 端口被占用

**错误信息**: `Port 3000/3001 is already in use`

**解决方法**:
```powershell
# 查找占用端口的进程
netstat -ano | findstr :3000
netstat -ano | findstr :3001

# 结束进程（替换 <PID>）
taskkill /PID <PID> /F

# 或修改 .env 中的端口
PORT=3002
CLIENT_PORT=3001
```

### Q4: 无法创建配置目录

**错误信息**: `Cannot create config directory`

**解决方法**:
```powershell
# 以管理员身份运行 PowerShell
# 右键 PowerShell -> 以管理员身份运行

# 手动创建目录
mkdir C:\Users\$env:USERNAME\openclaw-configs
```

## 📊 验证部署

部署完成后，通过以下方式验证：

### 1. Web 界面验证
- 访问 http://localhost:3000
- 点击"开始部署"
- 观察进度条和终端输出
- 完成后显示"配置成功"

### 2. 飞书验证
- 打开飞书 App
- 在群聊或私聊中发送：`/feishu start`
- 等待机器人响应

### 3. Docker 验证
```powershell
# 查看运行中的容器
docker ps

# 查看容器日志
docker logs <container-id>

# 进入容器检查
docker exec -it <container-id> sh
```

## 🎯 使用建议

### 开发环境
- 使用 `npm run dev:windows`
- 前后端同时启动
- 支持热重载

### 生产环境
```powershell
# 构建前端
cd client
npm run build
cd ..

# 启动后端
npm run start:windows
```

### 使用进程管理器（推荐生产）
```powershell
# 使用 PM2
npm install -g pm2
pm2 start server-windows.js --name openclaw-portal
pm2 save
pm2 startup
```

## 📚 相关文档

- [完整 README](README.md)
- [Windows 专用 README](README-WINDOWS.md)
- [项目结构说明](PROJECT_STRUCTURE.md)
- [快速启动指南](QUICK_START.md)

## 🔧 技术支持

遇到问题？

1. 查看日志文件（如果配置了）
2. 检查 Docker Desktop 状态
3. 验证环境变量配置
4. 联系技术支持: support@openclaw.ai

---

**祝您使用愉快！** 🎉
