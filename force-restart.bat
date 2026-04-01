@echo off
echo ====================================
echo   强制重启 OpenClaw 服务器
echo ====================================
echo.

REM 停止所有 node 进程
echo [1/4] 停止所有 node.exe 进程...
for /f "tokens=2" %%a in ('tasklist /FI "IMAGENAME eq node.exe" ^| findstr /V "node.exe"') do (
    taskkill /F /PID %%b >nul 2>&1
)
timeout /t 2 /nobreak >nul
echo [✓] 所有 node 进程已停止
echo.

REM 等待端口释放
echo [2/4] 等待端口释放...
timeout /t 3 /nobreak >nul
echo.

REM 清除 npm 缓存
echo [3/4] 清除 npm 缓存...
if exist "%APPDATA%\npm-cache\_cacache" (
    rmdir /s /q "%APPDATA%\npm-cache\_cacache"
    echo [✓] npm 缓存已清除
)
echo.

REM 删除可能存在的 configs 目录（如果是旧的结构）
if exist "configs" (
    echo [警告] 发现旧的 configs 目录
    choice /C /N /M "是否删除旧的 configs 目录？(Y/N)" /D "默认删除以避免冲突"
    if errorlevel 1 (
        rmdir /s /q "configs"
        echo [✓] 已删除旧 configs 目录
    )
)
echo.

REM 启动服务器
echo [4/4] 启动新的服务器...
cd /d "D:\Projects\onestep"
node server.js

echo.
echo ====================================
echo   服务器已启动
echo ====================================
echo.
echo 前端: http://localhost:3000
echo 后端: http://localhost:3001
echo.
echo 按 Ctrl+C 停止服务器
echo.

pause
