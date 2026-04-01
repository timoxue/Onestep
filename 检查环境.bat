@echo off
REM OpenClaw 部署门户环境检查脚本

title OpenClaw 环境检查

echo ====================================
echo   OpenClaw 环境检查
echo ====================================
echo.

set ALL_OK=1

REM 检查 Node.js
echo [1/5] 检查 Node.js...
node --version >nul 2>&1
if %errorlevel% equ 0 (
    echo      ✓ Node.js 已安装
    for /f "tokens=*" %%i in ('node --version') do echo      版本: %%i
) else (
    echo      ✗ Node.js 未安装
    set ALL_OK=0
)
echo.

REM 检查 npm
echo [2/5] 检查 npm...
npm --version >nul 2>&1
if %errorlevel% equ 0 (
    echo      ✓ npm 已安装
    for /f "tokens=*" %%i in ('npm --version') do echo      版本: %%i
) else (
    echo      ✗ npm 未安装
    set ALL_OK=0
)
echo.

REM 检查 Docker
echo [3/5] 检查 Docker Desktop...
docker ps >nul 2>&1
if %errorlevel% equ 0 (
    echo      ✓ Docker Desktop 正在运行
    for /f "tokens=*" %%i in ('docker --version') do echo      %%i
) else (
    echo      ✗ Docker Desktop 未运行
    echo      请启动 Docker Desktop
    set ALL_OK=0
)
echo.

REM 检查 OpenClaw 镜像
echo [4/5] 检查 OpenClaw 镜像...
docker images openclaw >nul 2>&1
if %errorlevel% equ 0 (
    echo      ✓ 找到 OpenClaw 镜像
    docker images openclaw --format "      {{.Repository}}:{{.Tag}} ({{.Size}})"
) else (
    echo      ⚠ 未找到 openclaw:latest 镜像
    echo      检查其他镜像...
    docker images | findstr /i openclaw >nul 2>&1
    if %errorlevel% equ 0 (
        echo      ✓ 找到其他 OpenClaw 镜像
        docker images | findstr /i openclaw
    ) else (
        echo      ✗ 未找到任何 OpenClaw 镜像
        echo      请确保 OpenClaw 镜像已构建
        set ALL_OK=0
    )
)
echo.

REM 检查配置文件
echo [5/5] 检查配置文件...
if exist .env (
    echo      ✓ 配置文件已存在
) else (
    echo      ⚠ 配置文件不存在
    echo      首次运行时会自动创建
)
echo.

echo ====================================
if %ALL_OK% equ 1 (
    echo   环境检查通过！✓
    echo.
    echo   可以运行启动脚本：
    echo   启动应用.bat
) else (
    echo   环境检查失败！✗
    echo.
    echo   请解决上述问题后再试
)
echo ====================================
echo.

pause
