# OpenClaw 部署门户 - Windows + Docker Desktop 版本

专为 Windows Docker Desktop 环境优化的 OpenClaw 一键部署门户。

## 🖥️ 系统要求

- **操作系统**: Windows 10/11
- **Node.js**: >= 18.x
- **Docker Desktop**: 最新版本
- **OpenClaw 镜像**: 已在本地构建的 OpenClaw Docker 镜像

## 🚀 快速开始

### 1. 确认 Docker Desktop 运行状态

```powershell
# 检查 Docker 是否运行
docker ps

# 如果 Docker 未运行，请启动 Docker Desktop
```

### 2. 确认 OpenClaw 镜像

```powershell
# 查看本地镜像
docker images

# 确认看到 openclaw 镜像
# 如果镜像名称不同，记下镜像名称
```

### 3. 安装依赖

```powershell
# 安装后端依赖
npm install

# 安装前端依赖
cd client
npm install
cd ..
```

### 4. 运行自动设置

```powershell
# 运行 Windows 设置脚本
npm run setup
```

设置脚本会自动：
- ✅ 检查系统环境
- ✅ 创建配置文件
- ✅ 检测 Docker Desktop
- ✅ 查找 OpenClaw 镜像
- ✅ 创建配置目录

### 5. 手动配置（可选）

如果自动设置未找到镜像，手动编辑 `.env` 文件：

```env
# 编辑镜像名称
OPENCLAW_IMAGE=your-openclaw-image-name:tag
```

### 6. 启动应用

#### 开发模式
```powershell
npm run dev
```

#### 生产模式
```powershell
# 构建前端
cd client
npm run build
cd ..

# 启动后端
npm start
```

### 7. 访问应用

打开浏览器访问: http://localhost:3000

## 📁 Windows 特定配置

### Docker 连接方式

Windows Docker Desktop 使用以下连接方式（自动检测）：

1. **Named Pipe** (默认)
   ```
   //./pipe/docker_engine
   ```

2. **HTTP API** (备选)
   ```
   http://127.0.0.1:2375
   ```

3. **WSL Socket** (备选)
   ```
   /var/run/docker.sock
   ```

### 配置路径

Windows 配置目录默认位置：

```
C:\Users\<YourUsername>\openclaw-configs\
```

多租户配置：

```
C:\Users\<YourUsername>\openclaw-configs\
├── default\
├── tenant-1\
└── tenant-2\
```

## 🔧 环境变量

编辑 `.env` 文件进行配置：

```env
# 服务器配置
PORT=3001
CLIENT_PORT=3000

# Docker 配置
DOCKER_SOCK=//./pipe/docker_engine

# OpenClaw 镜像（重要！）
OPENCLAW_IMAGE=openclaw:latest

# 多租户配置
TENANT_ID=default
CONFIG_BASE_PATH=C:\Users\${USER}\openclaw-configs

# 超时设置
INSTALL_TIMEOUT=600000
```

## 🐳 使用本地 OpenClaw 镜像

### 1. 标记镜像

如果您的镜像名称不是 `openclaw:latest`：

```powershell
# 为镜像打标签
docker tag <your-image> openclaw:latest
```

### 2. 或者在 .env 中指定

```env
OPENCLAW_IMAGE=my-openclaw:v2.0
```

### 3. 验证镜像

```powershell
# 列出所有 OpenClaw 相关镜像
docker images | findstr openclaw
```

## 📊 API 端点

### 镜像列表（新增）
```
GET /api/docker/images
```

返回本地所有可用的 Docker 镜像列表。

### 部署操作
```
POST /api/deploy
POST /api/deploy/:sessionId/stop
GET /api/deploy/:sessionId/status
```

## 🔍 故障排除

### Docker 连接失败

**问题**: 无法连接到 Docker Desktop

**解决**:
1. 确认 Docker Desktop 正在运行
2. 检查 Docker Desktop 设置中的"Expose daemon on tcp://localhost:2375 without TLS"
3. 重启 Docker Desktop

```powershell
# 测试连接
docker ps
```

### 镜像未找到

**问题**: 系统找不到 OpenClaw 镜像

**解决**:
```powershell
# 1. 查看所有镜像
docker images

# 2. 如果镜像存在但名称不同，编辑 .env:
OPENCLAW_IMAGE=<your-image-name>

# 3. 或重新标记镜像
docker tag <your-image> openclaw:latest
```

### 权限问题

**问题**: 无法创建配置目录

**解决**:
1. 以管理员身份运行 PowerShell
2. 检查文件夹权限
3. 手动创建配置目录

```powershell
# 手动创建
mkdir C:\Users\$env:USERNAME\openclaw-configs
```

### 端口被占用

**问题**: 端口 3000 或 3001 被占用

**解决**:
```powershell
# 查找占用端口的进程
netstat -ano | findstr :3000
netstat -ano | findstr :3001

# 或修改 .env 中的端口
PORT=3002
CLIENT_PORT=3001
```

## 🎯 使用指南

### 1. 启动部署

1. 访问 http://localhost:3000
2. 点击"开始部署"
3. 观察终端输出和进度条

### 2. 扫码配置

当进度达到 80% 时：
- 使用飞书 App 扫描二维码
- 完成机器人配置

### 3. 验证配置

部署完成后：
- 打开飞书 App
- 发送 `/feishu start`
- 等待机器人响应

## 📈 进度说明

| 步骤 | 进度 | 说明 |
|------|------|------|
| 环境准备 | 15% | 容器初始化 |
| 安装 OpenClaw | 40% | 执行安装脚本 |
| 安装完成 | 60% | OpenClaw 就绪 |
| 扫码配置 | 80% | 等待用户扫码 |
| 验证完成 | 95% | 凭证验证 |
| 全部完成 | 100% | 部署成功 |

## 🔒 安全建议

1. **不要提交 .env 文件到 Git**
   ```powershell
   # .gitignore 已配置
   echo .env >> .gitignore
   ```

2. **使用强密码**配置飞书机器人

3. **限制网络访问**生产环境

4. **定期更新** OpenClaw 镜像

## 📞 技术支持

- Email: support@openclaw.ai
- 文档: README.md
- Windows 支持: README-WINDOWS.md

## 🔄 更新日志

### v1.0.0 (2026-04-01)
- ✅ Windows Docker Desktop 支持
- ✅ 自动化设置脚本
- ✅ 本地镜像检测
- ✅ Named Pipe 连接
- ✅ Windows 路径处理

---

**注意**: 此版本专为 Windows + Docker Desktop 环境设计。如需 Linux/WSL 支持，请使用主版本配置文件。
