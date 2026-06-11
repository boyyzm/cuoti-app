@echo off
chcp 65001 >nul
echo ========================================
echo   错题举一反三 - 本地服务器启动
echo ========================================
echo.

:: 获取本机IP
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    set IP=%%a
    goto :found
)
:found
set IP=%IP: =%

echo 正在启动服务器...
echo.
echo 请在手机浏览器中访问：
echo http://%IP%:8080
echo.
echo 按 Ctrl+C 停止服务器
echo.

python -m http.server 8080 --directory "%~dp0"
