@echo off
echo =============================================
echo   Automaker - Development Environment
echo =============================================
echo   UI:      http://localhost:7007
echo   Backend: http://localhost:7008
echo =============================================
echo.

REM Build shared packages first
echo Building shared packages...
call npm run build:packages
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Package build failed!
    pause
    exit /b %ERRORLEVEL%
)
echo.

REM Start backend server in a separate window with PORT=7008
echo Starting backend server on port 7008...
start "Automaker Backend" cmd /k "cd /d %~dp0 && set PORT=7008 && npm run _dev:server"

REM Wait for the server to initialize
echo Waiting for server to start...
timeout /t 8 /nobreak >nul
echo.

REM Start UI (Vite defaults: port 7007, proxy to localhost:7008)
echo Starting UI on port 7007...
echo Open http://localhost:7007 in your browser
echo.
npm run _dev:web
