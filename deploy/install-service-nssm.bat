@echo off
echo ============================================
echo ZekiKod Backend - Windows Service Installation
echo ============================================
echo.

REM Check admin rights
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: Administrator privileges required!
    echo.
    echo Please right-click and select "Run as Administrator"
    pause
    exit /b 1
)

echo Administrator privileges confirmed.
echo.

REM Set variables
set SERVICE_NAME=ZekiKodBackend
set PROJECT_DIR=C:\Users\SKYSOFT TEKNOLOJİ\Documents\ZekiKod
set NODE_EXE=C:\Program Files\nodejs\node.exe
set SERVER_SCRIPT=%PROJECT_DIR%\apps\server\dist\index.js
set DATA_DIR=%PROJECT_DIR%\data
set LOG_DIR=%PROJECT_DIR%\deploy\logs

echo Service Information:
echo   Name: %SERVICE_NAME%
echo   Node: %NODE_EXE%
echo   Script: %SERVER_SCRIPT%
echo   Port: 3008
echo.

REM Check if service exists
sc query %SERVICE_NAME% >nul 2>&1
if %errorLevel% equ 0 (
    echo Existing service found. Removing...
    sc stop %SERVICE_NAME% >nul 2>&1
    timeout /t 3 >nul
    sc delete %SERVICE_NAME% >nul 2>&1
    echo Existing service removed.
    echo.
)

REM Create log directory
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

echo Installing new service with NSSM...
echo.

REM Install service using nssm
nssm install %SERVICE_NAME% "%NODE_EXE%" "%SERVER_SCRIPT%"
nssm set %SERVICE_NAME% DisplayName "ZekiKod Backend Server"
nssm set %SERVICE_NAME% Description "ZekiKod AI Development Studio Backend - Port 3008"
nssm set %SERVICE_NAME% Application "%NODE_EXE%"
nssm set %SERVICE_NAME% AppParameters "%SERVER_SCRIPT%"
nssm set %SERVICE_NAME% AppDirectory "%PROJECT_DIR%"
nssm set %SERVICE_NAME% AppEnvironmentExtra NODE_ENV=production PORT=3008 DATA_DIR=%DATA_DIR%
nssm set %SERVICE_NAME% AppStdout "%LOG_DIR%\backend-service.log"
nssm set %SERVICE_NAME% AppStderr "%LOG_DIR%\backend-service-error.log"
nssm set %SERVICE_NAME% AppRotateFiles 1
nssm set %SERVICE_NAME% AppRotateOnline 1
nssm set %SERVICE_NAME% Start SERVICE_AUTO_START
nssm set %SERVICE_NAME% ObjectName LocalSystem

echo.
echo Service installation completed!
echo.
echo Starting service...
sc start %SERVICE_NAME%

timeout /t 3 >nul

echo.
echo ============================================
echo Installation Status:
echo ============================================
sc query %SERVICE_NAME%

echo.
echo ============================================
echo Service Management:
echo ============================================
echo   services.msc              - View Services
echo   sc start %SERVICE_NAME%   - Start
echo   sc stop %SERVICE_NAME%    - Stop
echo   sc query %SERVICE_NAME%   - Check Status
echo.
echo Log file: %LOG_DIR%\backend-service.log
echo.
pause
