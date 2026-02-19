@echo off
echo ============================================
echo ZekiKod - Full Deployment
echo ============================================
echo.

cd /d "%~dp0.."

echo Step 1: Building packages...
call npm run build:packages
if errorlevel 1 (
    echo ERROR: Package build failed!
    pause
    exit /b 1
)

echo.
echo Step 2: Building server...
call npm run build:server
if errorlevel 1 (
    echo ERROR: Server build failed!
    pause
    exit /b 1
)

echo.
echo Step 3: Building frontend...
call npm run build
if errorlevel 1 (
    echo ERROR: Frontend build failed!
    pause
    exit /b 1
)

echo.
echo ============================================
echo Build Complete!
echo ============================================
echo.
echo Next steps:
echo.
echo 1. Install Windows Service (run as Administrator):
echo    deploy\install-service.bat
echo.
echo 2. For IIS deployment:
echo    - Copy apps\ui\dist folder to IIS web root
echo    - Configure IIS site to point to that folder
echo    - Ensure URL Rewrite and Application Request Routing are installed
echo    - web.config is already included in dist folder
echo.
echo 3. Backend API will run on port 3008
echo    Frontend should be accessible via IIS
echo.
pause
