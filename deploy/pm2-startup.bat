@echo off
REM ZekiKod PM2 Startup Service
REM This batch file starts PM2 with saved processes on Windows boot

cd /d "C:\Users\SKYSOFT TEKNOLOJİ\Documents\ZekiKod"

REM Wait a bit for network/services to be ready
timeout /t 10 /nobreak >nul

REM Resurrect PM2 processes
pm2 resurrect

REM Save log
pm2 list > "C:\Users\SKYSOFT TEKNOLOJİ\Documents\ZekiKod\deploy\logs\pm2-startup.log" 2>&1
