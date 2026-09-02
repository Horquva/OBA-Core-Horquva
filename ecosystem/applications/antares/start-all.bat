@echo off
REM start-all.bat — launches the whole Antares stack automatically.
REM Double-click this file (or run it from a terminal) inside the
REM ecosystem\applications\antares folder.

cd /d %~dp0

echo ============================================
echo  Installing Python dependencies (first run only)...
echo ============================================
cd services\capability-service
pip install -r requirements.txt
cd ..\validation-service
pip install -r requirements.txt
cd ..\research-service
pip install -r requirements.txt
cd ..\operationalization-service
pip install -r requirements.txt
cd ..\..

echo.
echo ============================================
echo  Starting all 7 services + gateway...
echo ============================================

start "1-lifecycle-service"   cmd /k "cd services\lifecycle-service && set PORT=4001 && node src\server.js"
start "2-integration-service" cmd /k "cd services\integration-service && set PORT=4002 && node src\server.js"
start "3-governance-engine"   cmd /k "cd governance\engine && set PORT=4003 && node server.js"
start "4-capability-service"  cmd /k "cd services\capability-service && python -m uvicorn api:app --port 4004"
start "5-validation-service"  cmd /k "cd services\validation-service && python -m uvicorn app.api:app --port 4005"
start "6-research-service"    cmd /k "cd services\research-service && python -m uvicorn server:app --port 4006"
start "7-operationalization-service" cmd /k "cd services\operationalization-service && python -m uvicorn server:app --port 4007"

echo Waiting 7 seconds for services to boot before starting the gateway...
timeout /t 7 /nobreak > nul

start "8-gateway" cmd /k "node gateway.js"

echo Waiting 3 seconds before opening the dashboard...
timeout /t 3 /nobreak > nul

start http://127.0.0.1:4000

echo.
echo ============================================
echo  All 8 windows launched. Dashboard opening at:
echo  http://127.0.0.1:4000
echo.
echo  If a window shows an error, read it and fix
echo  just that one window — the others are fine.
echo ============================================
pause
