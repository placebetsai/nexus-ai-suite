@echo off
cd /d "%~dp0"
echo Starting Remote Editor Server...
echo.
python -u server.py
