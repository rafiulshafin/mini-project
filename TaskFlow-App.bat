@echo off
setlocal
cd /d "%~dp0"

echo [TaskFlow] Checking if server is already running...
curl -s http://localhost:3000/api/health >nul 2>&1
if %errorlevel% neq 0 (
    echo [TaskFlow] Starting Node.js server...
    start /min "TaskFlow-Server" cmd /c "node src/server.js"
    timeout /t 2 /nobreak >nul
)

echo [TaskFlow] Launching app window...

:: Launch in standalone App Mode (looks and feels like a native desktop app)
where msedge >nul 2>&1
if %errorlevel% equ 0 (
    start msedge --app=http://localhost:3000
    exit /b 0
)

where chrome >nul 2>&1
if %errorlevel% equ 0 (
    start chrome --app=http://localhost:3000
    exit /b 0
)

:: Fallback to default browser
start http://localhost:3000
exit /b 0
