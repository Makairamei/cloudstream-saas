@echo off
echo ==========================================
echo  AUTO DEPLOY - CloudStream SaaS ke VPS
echo  Target: root@8.211.243.255
echo ==========================================
echo.

echo [1/4] Clone atau pull kode terbaru ke VPS...
ssh -o StrictHostKeyChecking=no root@8.211.243.255 "cd /root && ([ -d cloudstream/.git ] && cd cloudstream && git pull origin main || git clone https://github.com/Makairamei/cloudstream-saas.git cloudstream)"
echo.

echo [2/4] Setup .env jika belum ada...
ssh -o StrictHostKeyChecking=no root@8.211.243.255 "cd /root/cloudstream && [ ! -f .env ] && cp .env.example .env && echo '.env dibuat dari example' || echo '.env sudah ada, skip'"
echo.

echo [3/4] Rebuild frontend Docker container (3-5 menit)...
ssh -o StrictHostKeyChecking=no root@8.211.243.255 "cd /root/cloudstream && docker-compose build --no-cache frontend 2>&1 | tail -5 && docker-compose up -d frontend && echo 'Frontend restart OK'"
echo.

echo [4/4] Cek status...
ssh -o StrictHostKeyChecking=no root@8.211.243.255 "docker ps --format 'table {{.Names}}\t{{.Status}}' | grep -E 'NAME|cs_'"
echo.

echo ==========================================
echo  DEPLOY SELESAI!
echo  Cek: https://faxecez.eu.org/licenses
echo ==========================================
pause
