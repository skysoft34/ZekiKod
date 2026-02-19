@echo off
echo ============================================
echo ZekiKod - Production Server
echo ============================================
echo.

cd /d "%~dp0.."

echo Checking PM2 status...
pm2 list

echo.
echo ============================================
echo Services Running:
echo ============================================
echo.
echo Backend:  http://localhost:3008
echo Frontend: http://localhost:7007
echo.
echo Health Check:
curl -s http://localhost:3008/api/health
echo.
echo.
echo ============================================
echo Management Commands:
echo ============================================
echo   pm2 status          - Show service status
echo   pm2 logs            - View all logs
echo   pm2 logs zekikod-backend  - Backend logs only
echo   pm2 logs zekikod-frontend - Frontend logs only
echo   pm2 restart all     - Restart all services
echo   pm2 stop all        - Stop all services
echo   pm2 monit           - Real-time monitoring
echo.
pause
