[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$root = Split-Path -Parent $PSScriptRoot
$env:Path = [Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [Environment]::GetEnvironmentVariable("Path","User")
Start-Process powershell -ArgumentList "-NoExit","-Command","`$host.UI.RawUI.WindowTitle='Moraveji API'; Set-Location '$root'; dotnet run --project src\Moraveji.Api --urls http://localhost:5080"
Start-Process powershell -ArgumentList "-NoExit","-Command","`$host.UI.RawUI.WindowTitle='Moraveji Web'; Set-Location '$root\web'; npm run dev"
Write-Host "در حال اجرای API و سایت... چند ثانیه صبر کنید."
Start-Sleep -Seconds 15
Start-Process "http://localhost:3000"
