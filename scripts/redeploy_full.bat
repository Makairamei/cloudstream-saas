@echo off
setlocal ENABLEDELAYEDEXPANSION
set HOST=8.211.243.255
set USER=root
set PASS=A9!Lm3#Qa7Tx5
set P=%TEMP%\plink.exe

if not exist "%P%" (
  powershell -NoProfile -Command "Invoke-WebRequest -Uri 'https://the.earth.li/~sgtatham/putty/latest/w64/plink.exe' -OutFile '%TEMP%\plink.exe'"
)

"%P%" -ssh -batch -hostkey "SHA256:b+J+KRgcp12VpZwXTdEKa9ATDnptSl9cc7ECvG6E4cE" -l %USER% -pw %PASS% %HOST% "bash -lc 'set -e; cd /root/cloudstream; git fetch origin main && git reset --hard origin/main; (cd backend && npm ci --silent && npm run build && pm2 restart cs-backend); (cd frontend && npm ci --silent && npm run build && pm2 restart cs-frontend); curl -s http://localhost:3001/api/health || true'"

echo. & echo DONE (full redeploy). Press any key to close.
pause > nul
