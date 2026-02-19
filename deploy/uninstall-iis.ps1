# ZekiKod - IIS Uninstall Script
# Run as Administrator

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "ZekiKod - IIS Uninstall" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

param(
    [string]$SiteName = "ZekiKod",
    [string]$AppPoolName = "ZekiKodAppPool",
    [string]$PhysicalPath = "C:\inetpub\wwwroot\ZekiKod"
)

# Check admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator!" -ForegroundColor Red
    pause
    exit 1
}

# Stop and remove website
$site = Get-Website -Name $SiteName -ErrorAction SilentlyContinue
if ($site) {
    Write-Host "Stopping website..." -ForegroundColor Cyan
    Stop-Website -Name $SiteName -ErrorAction SilentlyContinue
    
    Write-Host "Removing website..." -ForegroundColor Cyan
    Remove-Website -Name $SiteName -ErrorAction SilentlyContinue
    Write-Host "Website removed!" -ForegroundColor Green
} else {
    Write-Host "Website not found." -ForegroundColor Yellow
}

# Remove app pool
$appPool = Get-IISAppPool -Name $AppPoolName -ErrorAction SilentlyContinue
if ($appPool) {
    Write-Host "Removing application pool..." -ForegroundColor Cyan
    Remove-WebAppPool -Name $AppPoolName -ErrorAction SilentlyContinue
    Write-Host "Application pool removed!" -ForegroundColor Green
} else {
    Write-Host "Application pool not found." -ForegroundColor Yellow
}

# Ask to remove files
Write-Host ""
$removeFiles = Read-Host "Remove frontend files from $PhysicalPath? (Y/N)"
if ($removeFiles -eq 'Y' -or $removeFiles -eq 'y') {
    if (Test-Path $PhysicalPath) {
        Remove-Item -Path $PhysicalPath -Recurse -Force
        Write-Host "Files removed!" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "IIS Uninstall Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
