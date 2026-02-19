@echo off
echo ============================================
echo ZekiKod - Start with PM2
echo ============================================
echo.

cd /d "%~dp0.."

echo Checking if PM2 is installed...
where pm2 >nul 2>nul
if errorlevel 1 (
    echo PM2 not found. Installing globally...
    npm install -g pm2
)

echo.
echo Starting ZekiKod Backend with PM2...
pm2 start ecosystem.config.js --env production

echo.
echo Saving PM2 configuration...
pm2 save

echo.
echo Setting up PM2 startup script...
pm2-startup install

echo.
echo ============================================
echo PM2 Status:
echo ============================================
pm2 status

echo.
echo ============================================
echo Backend started successfully!
echo ============================================
echo.
echo Server running on: http://localhost:3008
echo.
echo Useful PM2 commands:
echo   pm2 status          - Show status
echo   pm2 logs            - View logs
echo   pm2 restart all     - Restart all apps
echo   pm2 stop all        - Stop all apps
echo   pm2 monit           - Monitor dashboard
echo.
pause
