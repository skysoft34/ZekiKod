$nssmPath = "$env:APPDATA\npm\node_modules\nssm\examples\nssm.exe"
$nodePath = "C:\Program Files\nodejs\node.exe"
$scriptPath = "C:\Users\SKYSOFT TEKNOLOJİ\Documents\ZekiKod\apps\server\dist\index.js"
$projectDir = "C:\Users\SKYSOFT TEKNOLOJİ\Documents\ZekiKod"
$dataDir = "$projectDir\data"
$logDir = "$projectDir\deploy\logs"

Write-Host "Installing ZekiKodBackend Windows Service..." -ForegroundColor Cyan
Write-Host ""

# Create log directory
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

# Remove existing service
$existingService = Get-Service -Name "ZekiKodBackend" -ErrorAction SilentlyContinue
if ($existingService) {
    Write-Host "Removing existing service..." -ForegroundColor Yellow
    Stop-Service -Name "ZekiKodBackend" -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    & $nssmPath remove ZekiKodBackend confirm 2>&1 | Out-Null
}

# Install service
Write-Host "Installing service..." -ForegroundColor Cyan
& $nssmPath install ZekiKodBackend $nodePath $scriptPath
& $nssmPath set ZekiKodBackend DisplayName "ZekiKod Backend Server"
& $nssmPath set ZekiKodBackend Description "ZekiKod AI Development Studio Backend - Port 3008"
& $nssmPath set ZekiKodBackend AppDirectory $projectDir
& $nssmPath set ZekiKodBackend AppEnvironmentExtra "NODE_ENV=production PORT=3008 DATA_DIR=$dataDir"
& $nssmPath set ZekiKodBackend AppStdout "$logDir\backend-service.log"
& $nssmPath set ZekiKodBackend AppStderr "$logDir\backend-service-error.log"
& $nssmPath set ZekiKodBackend Start SERVICE_AUTO_START
& $nssmPath set ZekiKodBackend ObjectName LocalSystem

Write-Host ""
Write-Host "Starting service..." -ForegroundColor Cyan
Start-Service -Name "ZekiKodBackend"

Start-Sleep -Seconds 3

Write-Host ""
Write-Host "Service Status:" -ForegroundColor Green
Get-Service -Name "ZekiKodBackend" | Select-Object Name, Status, StartType

Write-Host ""
Write-Host "Installation Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Check status: sc query ZekiKodBackend"
Write-Host "View logs:    Get-Content '$logDir\backend-service.log' -Tail 20"
