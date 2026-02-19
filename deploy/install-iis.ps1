# ZekiKod - IIS Deployment Script
# Run as Administrator

param(
    [string]$SiteName = "ZekiKod",
    [string]$AppPoolName = "ZekiKodAppPool",
    [int]$Port = 8080,
    [string]$PhysicalPath = "C:\inetpub\wwwroot\ZekiKod"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "ZekiKod - IIS Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell > Run as Administrator" -ForegroundColor Yellow
    Write-Host ""
    pause
    exit 1
}

# Get script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
$distPath = Join-Path $projectRoot "apps\ui\dist"

Write-Host "Project Root: $projectRoot" -ForegroundColor Gray
Write-Host "Dist Path:    $distPath" -ForegroundColor Gray
Write-Host "Target Path:  $PhysicalPath" -ForegroundColor Gray
Write-Host "Port:         $Port" -ForegroundColor Gray
Write-Host ""

# Check if dist exists
if (-not (Test-Path $distPath)) {
    Write-Host "ERROR: Frontend dist not found at $distPath" -ForegroundColor Red
    Write-Host "Please run: npm run build" -ForegroundColor Yellow
    Write-Host ""
    pause
    exit 1
}

# Check IIS
Write-Host "Checking IIS..." -ForegroundColor Cyan
$iis = Get-WindowsFeature -Name Web-Server -ErrorAction SilentlyContinue
if (-not $iis -or -not $iis.Installed) {
    Write-Host "IIS is not installed. Installing..." -ForegroundColor Yellow
    
    # Enable IIS
    Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServerRole -All
    Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServer -All
    Enable-WindowsOptionalFeature -Online -FeatureName IIS-CommonHttpFeatures -All
    Enable-WindowsOptionalFeature -Online -FeatureName IIS-HttpErrors -All
    Enable-WindowsOptionalFeature -Online -FeatureName IIS-ApplicationDevelopment -All
    Enable-WindowsOptionalFeature -Online -FeatureName IIS-NetFxExtensibility45 -All
    Enable-WindowsOptionalFeature -Online -FeatureName IIS-HealthAndDiagnostics -All
    Enable-WindowsOptionalFeature -Online -FeatureName IIS-HttpLogging -All
    Enable-WindowsOptionalFeature -Online -FeatureName IIS-Security -All
    Enable-WindowsOptionalFeature -Online -FeatureName IIS-RequestFiltering -All
    Enable-WindowsOptionalFeature -Online -FeatureName IIS-Performance -All
    Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServerManagementTools -All
    Enable-WindowsOptionalFeature -Online -FeatureName IIS-StaticContent -All
    Enable-WindowsOptionalFeature -Online -FeatureName IIS-DefaultDocument -All
    Enable-WindowsOptionalFeature -Online -FeatureName IIS-DirectoryBrowse -All
    
    Write-Host "IIS installed successfully!" -ForegroundColor Green
}

# Create physical directory
Write-Host "Creating directory: $PhysicalPath" -ForegroundColor Cyan
if (-not (Test-Path $PhysicalPath)) {
    New-Item -ItemType Directory -Path $PhysicalPath -Force | Out-Null
}

# Copy frontend files
Write-Host "Copying frontend files..." -ForegroundColor Cyan
Copy-Item -Path "$distPath\*" -Destination $PhysicalPath -Recurse -Force
Write-Host "Frontend files copied!" -ForegroundColor Green

# Create Application Pool
Write-Host "Creating Application Pool: $AppPoolName" -ForegroundColor Cyan
$appPool = Get-IISAppPool -Name $AppPoolName -ErrorAction SilentlyContinue
if ($appPool) {
    Write-Host "Application Pool already exists" -ForegroundColor Yellow
} else {
    New-WebAppPool -Name $AppPoolName
    Set-ItemProperty IIS:\AppPools\$AppPoolName -Name "managedRuntimeVersion" -Value ""
    Write-Host "Application Pool created!" -ForegroundColor Green
}

# Create Website
Write-Host "Creating Website: $SiteName" -ForegroundColor Cyan
$site = Get-Website -Name $SiteName -ErrorAction SilentlyContinue
if ($site) {
    Write-Host "Website already exists. Updating..." -ForegroundColor Yellow
    Set-ItemProperty "IIS:\Sites\$SiteName" -Name physicalPath -Value $PhysicalPath
    Set-ItemProperty "IIS:\Sites\$SiteName" -Name applicationPool -Value $AppPoolName
} else {
    New-Website -Name $SiteName -PhysicalPath $PhysicalPath -ApplicationPool $AppPoolName -Port $Port
    Write-Host "Website created!" -ForegroundColor Green
}

# Start website
Write-Host "Starting website..." -ForegroundColor Cyan
Start-Website -Name $SiteName -ErrorAction SilentlyContinue

# Check URL Rewrite
Write-Host ""
Write-Host "Checking URL Rewrite Module..." -ForegroundColor Cyan
$rewriteInstalled = Get-WindowsFeature -Name Web-Url-Auth -ErrorAction SilentlyContinue
if (-not $rewriteInstalled -or -not $rewriteInstalled.Installed) {
    Write-Host "URL Rewrite is not installed." -ForegroundColor Yellow
    Write-Host "Download from: https://www.iis.net/downloads/microsoft/url-rewrite" -ForegroundColor Yellow
    Write-Host "Or run: choco install urlrewrite" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "IIS Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Website:      http://localhost:$Port" -ForegroundColor Cyan
Write-Host "Physical Path: $PhysicalPath" -ForegroundColor Gray
Write-Host "App Pool:     $AppPoolName" -ForegroundColor Gray
Write-Host ""
Write-Host "Backend API:  http://localhost:3008" -ForegroundColor Cyan
Write-Host "              (Make sure ZekiKodBackend service is running)" -ForegroundColor Gray
Write-Host ""
Write-Host "To open IIS Manager:" -ForegroundColor Yellow
Write-Host "  1. Press Win+R" -ForegroundColor Gray
Write-Host "  2. Type: inetmgr" -ForegroundColor Gray
Write-Host "  3. Expand Sites > $SiteName" -ForegroundColor Gray
Write-Host ""
Write-Host "To manage service:" -ForegroundColor Yellow
Write-Host "  1. Press Win+R" -ForegroundColor Gray
Write-Host "  2. Type: services.msc" -ForegroundColor Gray
Write-Host "  3. Find: ZekiKodBackend" -ForegroundColor Gray
Write-Host ""
