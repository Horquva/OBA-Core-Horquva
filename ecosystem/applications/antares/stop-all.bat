@echo off
REM stop-all.bat — closes every window start-all.bat opened.

taskkill /FI "WINDOWTITLE eq 1-lifecycle-service*" /T /F > nul 2>&1
taskkill /FI "WINDOWTITLE eq 2-integration-service*" /T /F > nul 2>&1
taskkill /FI "WINDOWTITLE eq 3-governance-engine*" /T /F > nul 2>&1
taskkill /FI "WINDOWTITLE eq 4-capability-service*" /T /F > nul 2>&1
taskkill /FI "WINDOWTITLE eq 5-validation-service*" /T /F > nul 2>&1
taskkill /FI "WINDOWTITLE eq 6-research-service*" /T /F > nul 2>&1
taskkill /FI "WINDOWTITLE eq 7-gateway*" /T /F > nul 2>&1

echo All Antares service windows closed.
pause
