@echo off
REM OpenClaw 部署门户启动脚本 (Windows)

echo 🚀 启动 OpenClaw 部署门户...
echo.

REM 检查环境变量
if not exist .env (
    echo ⚠️  环境变量文件不存在，从示例创建...
    copy .env.example .env
)

REM 检查依赖
if not exist node_modules (
    echo 📦 安装后端依赖...
    call npm install
)

if not exist client\node_modules (
    echo 📦 安装前端依赖...
    cd client
    call npm install
    cd ..
)

REM 启动应用
echo ✅ 启动开发服务器...
call npm run dev
