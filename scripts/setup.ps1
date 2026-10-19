$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Step($t) { Write-Host ""; Write-Host "==== $t ====" -ForegroundColor Yellow }
function Ok($t)   { Write-Host "  ✓ $t" -ForegroundColor Green }
function Refresh-Path {
  $env:Path = [Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [Environment]::GetEnvironmentVariable("Path","User")
}

if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
  Write-Host "winget پیدا نشد. «App Installer» را از Microsoft Store نصب کنید و دوباره اجرا کنید." -ForegroundColor Red
  exit 1
}

Step "۱/۴  .NET 9 SDK"
$hasDotnet9 = $false
if (Get-Command dotnet -ErrorAction SilentlyContinue) { $hasDotnet9 = (dotnet --list-sdks) -match "^9\." }
if ($hasDotnet9) { Ok "از قبل نصب است" } else {
  winget install --id Microsoft.DotNet.SDK.9 -e --source winget
  Refresh-Path; Ok "نصب شد"
}

Step "۲/۴  Node.js (LTS)"
$nodeOk = $false
if (Get-Command node -ErrorAction SilentlyContinue) { $nodeOk = [int]((node -v).TrimStart("v").Split(".")[0]) -ge 20 }
if ($nodeOk) { Ok "از قبل نصب است ($(node -v))" } else {
  winget install --id OpenJS.NodeJS.LTS -e --source winget
  Refresh-Path; Ok "نصب شد"
}

Step "۳/۴  بک‌اند: restore + build + test"
$env:DOTNET_CLI_TELEMETRY_OPTOUT = "1"
dotnet restore
dotnet build --no-restore
dotnet test --no-build
if ($LASTEXITCODE -ne 0) { Write-Host "تست‌ها رد شدند — خروجی بالا را بفرستید." -ForegroundColor Red; exit 1 }
Ok "همه‌ی تست‌ها سبز"

Step "۴/۴  فرانت: npm install"
Set-Location (Join-Path $root "web")
if (-not (Test-Path ".env.local")) { Copy-Item ".env.example" ".env.local"; Ok ".env.local ساخته شد" }
npm install --no-audit --no-fund
Ok "پکیج‌ها نصب شدند"



Write-Host ""
Write-Host "همه چیز آماده است. حالا start.bat را اجرا کنید." -ForegroundColor Green
