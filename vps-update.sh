#!/bin/bash
# ============================================================
# CloudStream SaaS — VPS Update Script (incremental)
# Run after git push: ssh root@VPS "bash /root/cloudstream/vps-update.sh"
# ============================================================

APP_DIR="/root/cloudstream"

echo "=== CloudStream Update ==="
cd "$APP_DIR"

echo "[1/3] Git pull..."
git pull origin main

echo "[2/3] Rebuild frontend only..."
docker-compose build --no-cache frontend
docker-compose up -d frontend

echo "[3/3] Run any pending migrations..."
sleep 5
docker exec cs_backend npx prisma migrate deploy 2>/dev/null || true

echo ""
echo "=== UPDATE SELESAI ==="
docker-compose ps | grep -E 'NAME|cs_'
