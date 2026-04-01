@echo off
REM OpenClaw 部署门户重启脚本

echo ====================================
echo   重启服务器
echo ====================================
echo.

REM 停止所有 node 进程
tasklist | findstr "node.exe" > temp_nodes.txt
for /f "tokens=2" %%a in (temp_nodes.txt) do (
    taskkill /F /PID %%a >nul 2>&1
)
del temp_nodes.txt

echo [✓] 已停止所有 node 进程
echo.
echo 等待 3 秒...
timeout /t 3 /nobreak

REM 启动新服务器
echo [启动] 启动新的服务器...
cd /d "D:\Projects\onestep"
node server.js

pause
