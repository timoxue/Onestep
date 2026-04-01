# OpenClaw SaaS 自动化部署门户

一个用于 OpenClaw AI Agent 框架的一键部署 Web 应用，提供实时终端输出和进度跟踪功能。

## 功能特性

### 后端
- Docker 容器动态调度
- 实时日志流式传输
- 进度自动解析和同步
- 多租户配置支持
- 错误检测和处理

### 前端
- 只读终端界面（xterm.js）
- 实时进度条
- 二维码扫描提示
- 成功动画效果
- 完整的错误处理

## 系统要求

### 服务器端
- Node.js >= 18.x
- Docker Engine >= 20.10
- Docker Socket 访问权限

### 客户端
- 现代浏览器（Chrome、Firefox、Safari、Edge）

## 安装步骤

### 1. 克隆项目
```bash
git clone <repository-url>
cd onestep
```

### 2. 安装依赖

#### 后端依赖
```bash
npm install
```

#### 前端依赖
```bash
cd client
npm install
cd ..
```

### 3. 配置环境变量
```bash
cp .env.example .env
```

编辑 `.env` 文件，配置以下参数：
```env
PORT=3001
CLIENT_PORT=3000
DOCKER_SOCK=/var/run/docker.sock
DOCKER_IMAGE=node:18-alpine
OPENCLAW_INSTALL_URL=https://openclaw.ai/install.sh
LARK_PACKAGE=@larksuite/openclaw-lark
TENANT_ID=default
CONFIG_BASE_PATH=/var/lib/openclaw/configs
INSTALL_TIMEOUT=600000
```

### 4. 配置 Docker 权限
```bash
sudo usermod -aG docker $USER
# 重新登录使更改生效
```

### 5. 启动应用

#### 开发模式（同时启动前后端）
```bash
npm run dev
```

#### 生产模式
```bash
# 构建前端
cd client
npm run build
cd ..

# 启动后端
npm start
```

## 使用说明

1. **访问应用**
   - 前端地址: `http://localhost:3000`
   - 后端 API: `http://localhost:3001`

2. **启动部署**
   - 点击"开始部署"按钮
   - 观察终端输出和进度条
   - 等待二维码扫描提示

3. **完成配置**
   - 使用飞书 App 扫描二维码
   - 等待配置完成
   - 按照验证步骤进行测试

## 项目结构

```
onestep/
├── server.js                  # 主服务器文件
├── docker-manager.js          # Docker 容器管理器
├── package.json               # 后端依赖配置
├── .env.example              # 环境变量示例
├── client/                   # 前端应用
│   ├── package.json          # 前端依赖配置
│   ├── public/               # 静态文件
│   └── src/
│       ├── index.js          # 入口文件
│       ├── index.css         # 全局样式
│       ├── App.js            # 主应用组件
│       ├── App.css           # 应用样式
│       └── components/       # 组件目录
│           ├── DeploymentTerminal.js
│           ├── DeploymentTerminal.css
│           ├── ProgressBar.js
│           ├── ProgressBar.css
│           ├── StatusMessage.js
│           ├── StatusMessage.css
│           ├── SuccessAnimation.js
│           └── SuccessAnimation.css
└── README.md                 # 项目文档
```

## API 端点

### POST `/api/deploy`
启动新的部署任务

**请求体：**
```json
{
  "tenantId": "default"
}
```

**响应：**
```json
{
  "success": true,
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Deployment started successfully"
}
```

### POST `/api/deploy/:sessionId/stop`
停止指定的部署任务

### GET `/api/deploy/:sessionId/status`
获取部署任务状态

## Socket.io 事件

### 客户端 -> 服务器
- `join-deployment`: 加入部署会话
- `leave-deployment`: 离开部署会话

### 服务器 -> 客户端
- `progress`: 进度更新
- `log`: 日志输出
- `error`: 错误消息

## 进度映射

| 关键词 | 进度 | 说明 |
|--------|------|------|
| `[1/3] Preparing environment` | 15% | 环境准备 |
| `Installing OpenClaw` | 40% | 安装 OpenClaw |
| `OpenClaw installed successfully` | 60% | 安装完成 |
| `Scan with Feishu` | 80% | 需要扫码 |
| `Credentials verified` | 95% | 验证完成 |
| `OpenClaw is all set` | 100% | 全部完成 |

## 错误处理

系统会自动检测以下错误模式：
- `error:`
- `failed`
- `timeout`
- `unable to`
- `cannot`
- `permission denied`
- `connection refused`

检测到错误时，前端会显示：
- 错误消息
- "联系技术支持"按钮
- "重新开始"按钮

## 多租户支持

通过环境变量 `TENANT_ID` 和 `CONFIG_BASE_PATH` 支持多租户配置：

```javascript
// 示例：为不同租户创建独立配置
POST /api/deploy
{
  "tenantId": "company-a"
}

// 配置将保存到：
// /var/lib/openclaw/configs/company-a/
```

## 安全注意事项

1. **Docker Socket 权限**
   - 确保 Docker Socket 访问权限配置正确
   - 在生产环境中使用适当的权限控制

2. **环境变量**
   - 不要在代码中硬编码敏感信息
   - 使用环境变量或密钥管理服务

3. **网络访问**
   - 在生产环境中使用 HTTPS
   - 配置适当的防火墙规则

## 故障排除

### 容器无法启动
```bash
# 检查 Docker 服务状态
sudo systemctl status docker

# 检查 Docker Socket 权限
ls -l /var/run/docker.sock
```

### Socket 连接失败
```bash
# 检查防火墙设置
sudo firewall-cmd --list-ports

# 检查代理设置
export http_proxy=""
export https_proxy=""
```

### 前端构建失败
```bash
# 清除缓存并重新安装
cd client
rm -rf node_modules package-lock.json
npm install
npm run build
```

## 开发指南

### 添加新的进度标记
在 `docker-manager.js` 的 `progressPatterns` 数组中添加：

```javascript
{
  pattern: /your_pattern_here/i,
  progress: 75,
  message: 'Your message here'
}
```

### 自定义终端样式
在 `DeploymentTerminal.js` 中修改 `Terminal` 构造函数的 `theme` 配置。

### 修改错误检测模式
在 `docker-manager.js` 的 `errorPatterns` 数组中添加新的正则表达式。

## 许可证

MIT License

## 技术支持

如有问题，请联系：support@openclaw.ai

## 更新日志

### v1.0.0 (2026-04-01)
- 初始版本发布
- 完整的部署流程支持
- 实时终端输出
- 进度跟踪
- 错误处理
- 多租户支持
