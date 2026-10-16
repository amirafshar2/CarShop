[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$root = Split-Path -Parent $PSScriptRoot
$env:Path = [Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [Environment]::GetEnvironmentVariable("Path","User")

Write-Host "بستن سرور قبلی سایت روی پورت 3000 (اگر باز باشد)..."
Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue |
  ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 1

$next = Join-Path $root "web\.next"
if (Test-Path $next) { Remove-Item $next -Recurse -Force; Write-Host "کش .next پاک شد." }

Start-Process powershell -ArgumentList "-NoExit","-Command","`$host.UI.RawUI.WindowTitle='Moraveji Web'; Set-Location '$root\web'; npm run dev"
Write-Host "سایت در حال اجراست... (بار اول حدود ۳۰ ثانیه طول می‌کشد)"
Start-Sleep -Seconds 25
Start-Process "http://localhost:3000"
