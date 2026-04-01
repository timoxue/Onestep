# 🚀 OpenClaw 部署门户 - Windows Docker Desktop 版本

## ✨ 特性

专为 Windows Docker Desktop 环境优化的一键部署门户：

- ✅ **自动检测** Docker Desktop 和 OpenClaw 镜像
- ✅ **实时终端** 显示部署过程
- ✅ **进度跟踪** 可视化部署进度
- ✅ **扫码配置** 飞书机器人配置
- ✅ **多租户** 支持独立配置
- ✅ **错误处理** 完善的错误提示

## 📋 系统要求

- Windows 10/11
- Docker Desktop（已安装并运行）
- Node.js >= 18.x
- OpenClaw Docker 镜像（本地已有）

## 🎯 快速开始（3步搞定）

### 1️⃣ 检查环境

双击运行：
```
检查环境.bat
```

### 2️⃣ 首次配置

如果检查通过，双击运行：
```
启动应用.bat
```

首次运行会自动：
- 安装依赖
- 创建配置文件
- 检测 Docker 和镜像

### 3️⃣ 打开浏览器

访问：
```
http://localhost:3000
```

点击"开始部署"，等待完成！

## 📁 文件说明

| 文件 | 说明 |
|------|------|
| `启动应用.bat` | 一键启动脚本 |
| `检查环境.bat` | 环境检查脚本 |
| `setup-windows.js` | 自动配置脚本 |
| `server-windows.js` | Windows 服务器 |
| `docker-manager-windows.js` | Docker 管理器 |
| `.env` | 环境变量配置 |

## 🔧 手动配置（可选）

### 1. 查找您的 OpenClaw 镜像

```powershell
docker images | findstr openclaw
```

### 2. 编辑配置文件

```powershell
notepad .env
```

修改：
```env
OPENCLAW_IMAGE=你的镜像名称:标签
```

例如：
```env
OPENCLAW_IMAGE=openclaw:latest
# 或
OPENCLAW_IMAGE=my-openclaw:v1.0
```

### 3. 启动应用

```powershell
npm run dev:windows
```

## 🐳 Docker Desktop 设置

### 启用 API（可选）

如果连接问题，启用 Docker API：

1. 打开 Docker Desktop
2. Settings → General
3. 勾选 "Expose daemon on tcp://localhost:2375 without TLS"
4. 点击 "Apply & Restart"

## 📊 部署流程

```
开始部署
    ↓
[环境准备 15%]
    ↓
[安装 OpenClaw 40%]
    ↓
[安装完成 60%]
    ↓
[扫码配置 80%] ← 使用飞书 App 扫码
    ↓
[验证完成 95%]
    ↓
[全部完成 100%]
```

## 🔍 常见问题

### Q: Docker 连接失败？

**A:** 确保 Docker Desktop 正在运行：
1. 检查系统托盘 Docker 图标
2. 如果未运行，启动 Docker Desktop
3. 等待图标显示"运行中"

### Q: 找不到 OpenClaw 镜像？

**A:**
```powershell
# 查看所有镜像
docker images

# 如果有其他名称的镜像
docker tag <你的镜像名> openclaw:latest

# 或在 .env 中设置
OPENCLAW_IMAGE=<你的镜像名>
```

### Q: 端口被占用？

**A:** 编辑 `.env` 文件：
```env
PORT=3002
CLIENT_PORT=3001
```

### Q: 权限问题？

**A:** 以管理员身份运行脚本：
```powershell
# 右键点击脚本
# 选择"以管理员身份运行"
```

## 📚 命令参考

### 启动命令

```powershell
# 开发模式（推荐）
npm run dev:windows

# 仅启动后端
npm run start:windows

# 仅启动前端
cd client
npm start
```

### 配置命令

```powershell
# 运行自动配置
node setup-windows.js

# 查看本地镜像
docker images | findstr openclaw

# 查看运行中的容器
docker ps

# 查看容器日志
docker logs <容器ID>
```

### 构建命令

```powershell
# 构建前端（生产）
cd client
npm run build
cd ..

# 启动生产服务器
npm run start:windows
```

## 🎨 界面预览

### 主界面
```
┌─────────────────────────────────────┐
│  🚀 OpenClaw 部署门户              │
├─────────────────────────────────────┤
│  ████████████░░░░░░  60%          │
│  当前: OpenClaw installed...       │
│                                     │
│  [实时终端]                         │
│  $ Preparing environment...          │
│  $ Installing OpenClaw...           │
│  $ OpenClaw installed successfully  │
│                                     │
│  [开始部署] [停止]                  │
└─────────────────────────────────────┘
```

## 🔒 安全提示

1. **不要提交** `.env` 文件到 Git
2. **定期更新** OpenClaw 镜像
3. **使用强密码** 配置飞书机器人
4. **限制访问** 生产环境网络

## 📞 获取帮助

- **文档**: README-WINDOWS.md
- **快速指南**: WINDOWS_GUIDE.md
- **技术支持**: support@openclaw.ai

## 🎉 开始使用

现在就运行 `检查环境.bat` 开始吧！

```powershell
检查环境.bat
```

---

**提示**: 首次使用建议先运行环境检查，确保所有依赖都正确配置。
