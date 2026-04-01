# 快速启动指南

## 第一步：准备环境

```bash
# 确保已安装 Node.js (>= 18.x)
node --version

# 确保已安装 Docker
docker --version

# 确保有 Docker Socket 访问权限
ls -l /var/run/docker.sock
```

## 第二步：安装依赖

```bash
# 安装后端依赖
npm install

# 安装前端依赖
cd client && npm install && cd ..
```

## 第三步：配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑配置（可选，使用默认配置即可启动）
# vim .env
```

## 第四步：启动应用

### 开发模式（推荐）

```bash
# 同时启动前端和后端
npm run dev
```

访问：
- 前端: http://localhost:3000
- 后端 API: http://localhost:3001

### 生产模式

```bash
# 构建前端
cd client && npm run build && cd ..

# 启动后端
npm start
```

## 第五步：测试部署

1. 打开浏览器访问 http://localhost:3000
2. 点击"开始部署"按钮
3. 观察终端输出和进度条
4. 等待配置完成

## 故障排除

### 权限问题

```bash
# 将当前用户添加到 docker 组
sudo usermod -aG docker $USER

# 重新登录或运行
newgrp docker
```

### 端口被占用

```bash
# 查找占用端口的进程
lsof -i :3000
lsof -i :3001

# 或修改 .env 中的端口配置
```

### Docker 服务未运行

```bash
# 启动 Docker 服务
sudo systemctl start docker
# 或
sudo service docker start

# 检查 Docker 状态
sudo systemctl status docker
```

## 下一步

阅读完整文档了解更多功能：[README.md](README.md)
