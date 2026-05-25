#!/bin/bash
# ============================================================
# CloudStream SaaS — VPS Deploy Script
# Run on VPS: bash vps-deploy.sh
# ============================================================

set -e
APP_DIR="/root/cloudstream"
REPO_URL="https://github.com/Makairamei/cloudstream-saas.git"

echo "=== CloudStream SaaS VPS Deploy ==="

# ── Clone or pull ──────────────────────────────────────────
if [ -d "$APP_DIR/.git" ]; then
  echo "[1/5] Pulling latest code..."
  cd "$APP_DIR"
  git pull origin main
else
  echo "[1/5] Cloning repository..."
  git clone "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi

# ── Setup .env if missing ──────────────────────────────────
if [ ! -f "$APP_DIR/.env" ]; then
  echo "[2/5] Creating .env from example..."
  cp .env.example .env
  echo "  ⚠  EDIT /root/cloudstream/.env before continuing!"
  echo "  Key vars: DATABASE_URL, JWT_SECRET, NEXT_PUBLIC_API_URL"
  read -p "  Press ENTER after editing .env to continue..."
else
  echo "[2/5] .env already exists, skipping."
fi

# ── Build & start with Docker Compose ─────────────────────
echo "[3/5] Building Docker containers..."
cd "$APP_DIR"
docker-compose pull postgres redis 2>/dev/null || true
docker-compose build --no-cache backend frontend

echo "[4/5] Starting all services..."
docker-compose up -d

echo "[5/5] Running DB migrations & seed..."
sleep 8
docker-compose exec -T backend npx prisma migrate deploy 2>/dev/null || \
  docker exec cs_backend npx prisma migrate deploy
docker-compose exec -T backend npx prisma db seed 2>/dev/null || \
  docker exec cs_backend npx prisma db seed

echo ""
echo "=== DEPLOY SELESAI ==="
docker-compose ps
echo ""
echo "Frontend : http://$(curl -s ifconfig.me):3000"
echo "Backend  : http://$(curl -s ifconfig.me):3001"
