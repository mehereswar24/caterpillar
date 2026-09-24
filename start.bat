@echo off
echo Starting CAT Smart Operator Assistant...
echo.

echo [1/3] Starting Whisper STT server (port 5001)...
start "Whisper STT" cmd /k "cd /d C:\Users\Mehereswar\Desktop\caterpillar && python whisper_server.py"

echo Waiting for Whisper to load model (15s)...
timeout /t 15 /nobreak > nul

echo [2/3] Starting Express backend (port 5000)...
start "CAT Backend" cmd /k "cd /d C:\Users\Mehereswar\Desktop\caterpillar\server && node src/index.js"

timeout /t 3 /nobreak > nul

echo [3/4] Starting Supervisor UI (port 3000)...
start "Supervisor UI" cmd /k "cd /d C:\Users\Mehereswar\Desktop\caterpillar\frontend && npm run dev"

echo [4/4] Starting Driver-Side UI (port 3001)...
start "Driver UI" cmd /k "cd /d C:\Users\Mehereswar\Desktop\caterpillar\driver-side && node node_modules/vite/bin/vite.js --port 3001"

echo.
echo All services starting. Open:
echo   Supervisor UI  -^> https://localhost:3000
echo   Driver Side    -^> http://localhost:3001
echo   Backend API    -^> http://localhost:5000
echo   Whisper STT    -^> http://127.0.0.1:5001/health
echo.
pause
