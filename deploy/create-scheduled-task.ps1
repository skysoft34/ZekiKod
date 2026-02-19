# Create Scheduled Task for PM2 Auto-Start
$action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument '/c "C:\Users\SKYSOFT TEKNOLOJİ\Documents\ZekiKod\deploy\pm2-startup.bat"'
$trigger = New-ScheduledTaskTrigger -AtStartup
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERNAME" -LogonType Interactive

Register-ScheduledTask -TaskName "ZekiKod-PM2-AutoStart" -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force

Write-Host "Scheduled Task created successfully!" -ForegroundColor Green
Write-Host "PM2 will automatically start on Windows boot." -ForegroundColor Cyan
