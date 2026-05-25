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

echo "[2/3] Rebuild backend + frontend + nginx..."
mkdir -p nginx/ssl
docker-compose build --no-cache backend frontend
docker-compose up -d --remove-orphans

echo "[3/3] Run any pending migrations..."
sleep 8
docker exec cs_backend npx prisma migrate deploy 2>/dev/null || \
  docker exec cs_backend npx prisma db push --accept-data-loss 2>/dev/null || true

echo ""
echo "=== UPDATE SELESAI ==="
docker-compose ps | grep -E 'NAME|cs_'
