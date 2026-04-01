@echo off
REM OpenClaw 部署门户 Windows 启动脚本

title OpenClaw 部署门户

echo ====================================
echo   OpenClaw 部署门户启动程序
echo ====================================
echo.

REM 检查 Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] Node.js 未安装或未添加到 PATH
    echo 请访问 https://nodejs.org/ 下载安装
    pause
    exit /b 1
)

echo [✓] Node.js 已安装

REM 检查 Docker
docker ps >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] Docker Desktop 未运行
    echo 请启动 Docker Desktop 后再试
    pause
    exit /b 1
)

echo [✓] Docker Desktop 正在运行

REM 检查依赖
if not exist node_modules (
    echo.
    echo [!] 首次运行，正在安装依赖...
    call npm install
    if %errorlevel% neq 0 (
        echo [错误] 依赖安装失败
        pause
        exit /b 1
    )
)

if not exist client\node_modules (
    echo.
    echo [!] 正在安装前端依赖...
    cd client
    call npm install
    if %errorlevel% neq 0 (
        echo [错误] 前端依赖安装失败
        cd ..
        pause
        exit /b 1
    )
    cd ..
)

REM 检查配置文件
if not exist .env (
    echo.
    echo [!] 创建配置文件...
    copy .env.windows.example .env >nul 2>&1
    echo [✓] 配置文件已创建

    REM 运行设置脚本
    echo.
    echo [!] 运行自动设置...
    call node setup-windows.js
)

echo.
echo ====================================
echo   启动 OpenClaw 部署门户
echo ====================================
echo.
echo 前端地址: http://localhost:3000
echo 后端 API:  http://localhost:3001
echo.
echo 按 Ctrl+C 停止服务
echo.

REM 启动应用
call npm run dev:windows

pause
