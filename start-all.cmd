@echo off
rem Starts everything for the CAT Smart Operator demo, each in its own window:
rem   Whisper STT (:5001), Face recognition (:5002), backend API (:5000), driver-side cockpit, dashboard frontend
cd /d "%~dp0"

start "CAT Whisper STT :5001" cmd /k "python whisper_server.py"
start "CAT Face ID :5002"     cmd /k "python face_server.py"
start "CAT Backend :5000"     cmd /k "cd /d server && node src\index.js"
start "CAT Driver-side"       cmd /k "cd /d driver-side && npm.cmd run dev"
start "CAT Dashboard"         cmd /k "cd /d frontend && npm.cmd run dev"

echo.
echo Started 5 windows. Whisper takes ~15s to load its model before "Hey Cat" works.
echo Close the windows to stop the servers.
