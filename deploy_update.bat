@echo off
setlocal
echo ==========================================
echo  AUTO DEPLOY - CloudStream SaaS ke VPS
echo  Target: root@8.211.243.255
echo ==========================================
echo.

set SRC=D:\APK\CloudStream\New Design\cloudstream-saas\frontend
set ZIP=C:\Users\USER\cs-update.zip

echo [1/4] Build frontend...
cd /d "%SRC%"
call npm run build
if errorlevel 1 ( echo BUILD GAGAL! && pause && exit /b 1 )
echo Build OK.
echo.

echo [2/4] Zip output (.next/standalone + .next/static)...
if exist "%ZIP%" del "%ZIP%"
powershell -NoProfile -Command ^
  "Add-Type -Assembly System.IO.Compression.FileSystem; $a=[System.IO.Compression.ZipFile]::Open('%ZIP%','Create'); $b='%SRC%\.next\standalone\.next'; Get-ChildItem $b -Recurse -File | ForEach-Object { $r=$_.FullName.Substring($b.Length+1).Replace('\','/'); [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($a,$_.FullName,'dotnext/'+$r)|Out-Null }; $s='%SRC%\.next\static'; Get-ChildItem $s -Recurse -File | ForEach-Object { $r=$_.FullName.Substring($s.Length+1).Replace('\','/'); [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($a,$_.FullName,'static/'+$r)|Out-Null }; $a.Dispose(); Write-Host 'Zip OK'"
echo.

echo [3/4] Upload dan deploy ke VPS via PowerShell...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$p=ConvertTo-SecureString 'A9!Lm3#Qa7Tx5' -AsPlainText -Force; $c=New-Object PSCredential('root',$p); Set-SCPItem -ComputerName 8.211.243.255 -Credential $c -AcceptKey -Force -Path '%ZIP%' -Destination /tmp/; $s=New-SSHSession -ComputerName 8.211.243.255 -Credential $c -AcceptKey -Force; Invoke-SSHCommand -SessionId $s.SessionId -TimeOut 30 -Command 'rm -rf /tmp/csu && mkdir /tmp/csu && cd /tmp/csu && unzip -q /tmp/cs-update.zip && cp -r dotnext/. /root/cloudstream/frontend/.next/ && cp -r static/. /root/cloudstream/frontend/.next/static/ && pm2 restart cs-frontend && echo DEPLOY_OK' | Select-Object -ExpandProperty Output; Remove-SSHSession $s"
echo.

echo [4/4] Done!
echo ==========================================
echo  DEPLOY SELESAI!
echo  Cek: https://faxecez.eu.org/licenses
echo ==========================================
pause
