@echo off
cd /d "%~dp0"
start "Remote Editor" /min python -u launch.py
echo Starting... waiting for tunnel...
timeout /t 15 /nobreak > nul
echo.
type tunnel_url.txt 2>nul
echo.
echo Above is your internet URL! Open it on your Android!
echo.
pause
