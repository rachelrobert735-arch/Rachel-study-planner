@echo off
cd /d "%~dp0"
echo Starting Rachel's study space at http://127.0.0.1:5173
echo Keep this window open while using the app.
call npm.cmd run dev -- --port 5173 --strictPort
pause
