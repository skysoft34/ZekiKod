@echo off
echo Setting up PM2 to start automatically on Windows boot...

REM Add PM2 to Windows startup
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "ZekiKodPM2" /t REG_SZ /d "pm2 resurrect" /f

echo.
echo PM2 has been configured to start automatically.
echo.
echo To verify, check:
echo   - Registry: HKCU\Software\Microsoft\Windows\CurrentVersion\Run
echo   - Run: msconfig ^> Startup tab
echo.
echo Current PM2 processes:
pm2 list

echo.
pause
