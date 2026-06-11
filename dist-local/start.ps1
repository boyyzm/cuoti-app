$port = 8080
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Get local IP
$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch "Loopback" -and $_.IPAddress -notmatch "^169" } | Select-Object -First 1).IPAddress

Write-Host "========================================"
Write-Host "  错题举一反三 - 本地服务器启动"
Write-Host "========================================"
Write-Host ""
Write-Host "请在手机浏览器中访问："
Write-Host "http://${ip}:${port}"
Write-Host ""
Write-Host "按 Ctrl+C 停止服务器"
Write-Host ""

# Start HTTP server
python -m http.server $port --directory $dir
