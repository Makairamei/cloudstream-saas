@echo off
setlocal ENABLEDELAYEDEXPANSION
set HOST=8.211.243.255
set USER=root
set PASS=A9!Lm3#Qa7Tx5
set P=%TEMP%\plink.exe

if not exist "%P%" (
  powershell -NoProfile -Command "Invoke-WebRequest -Uri 'https://the.earth.li/~sgtatham/putty/latest/w64/plink.exe' -OutFile '%TEMP%\plink.exe'"
)

"%P%" -ssh -batch -l %USER% -pw %PASS% %HOST% "bash -lc 'set -e; cd /root/cloudstream/frontend; npm ci --silent; npm run build; pm2 restart cs-frontend; pm2 logs cs-frontend --nostream --lines 60 | tail -n 60'"

echo. & echo DONE (frontend rebuilt). Press any key to close.
pause > nul
