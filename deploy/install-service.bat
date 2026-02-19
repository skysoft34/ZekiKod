@echo off
echo ============================================
echo ZekiKod - Windows Service Installer
echo ============================================
echo.
echo This script will install ZekiKod Backend as a Windows Service.
echo You must run this script as Administrator.
echo.

REM Check for admin rights
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: This script requires Administrator privileges!
    echo.
    echo Please right-click this file and select "Run as Administrator"
    echo.
    pause
    exit /b 1
)

echo Administrator privileges confirmed.
echo.
echo Installing service...
echo.

cd /d "%~dp0.."

node deploy\install-service.js

echo.
pause
