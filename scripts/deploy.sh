#!/usr/bin/env bash
# =============================================================================
# Cronograph — Production Deploy Script
# Runs on the VPS via GitHub Actions SSH
# =============================================================================
set -euo pipefail

DEPLOY_DIR="/opt/cronograph"
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.production"
LOG_FILE="/var/log/cronograph-deploy.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

log() { echo "[$TIMESTAMP] $*" | tee -a "$LOG_FILE"; }

COMPOSE="docker compose -f $COMPOSE_FILE --env-file $ENV_FILE"

log "====== Deploy started ======"

# --- Ensure deploy dir has a valid git repo ---
if [ ! -d "$DEPLOY_DIR/.git" ]; then
  log "No .git found — cloning fresh..."
  rm -rf "$DEPLOY_DIR"
  git clone https://github.com/leopbar/cronograph.git "$DEPLOY_DIR"
fi

cd "$DEPLOY_DIR"

# --- Pull latest code ---
log "Pulling latest code from GitHub..."
git fetch --all
git reset --hard origin/main

# --- Build new images ---
log "Building Docker images..."
$COMPOSE build --no-cache

# --- Restart services ---
log "Stopping previous containers (clears any orphaned name conflicts)..."
$COMPOSE down --remove-orphans || true
docker container prune -f >> "$LOG_FILE" 2>&1 || true

log "Starting services..."
$COMPOSE up -d --remove-orphans --force-recreate

# --- Health check ---
log "Waiting for backend health check..."
MAX_WAIT=90
WAITED=0
until curl -sf http://localhost:8003/health > /dev/null 2>&1 || [ $WAITED -ge $MAX_WAIT ]; do
  sleep 5
  WAITED=$((WAITED + 5))
done

if curl -sf http://localhost:8003/health > /dev/null 2>&1; then
  log "Backend healthy. Deploy successful."
else
  log "ERROR: Backend health check failed after ${MAX_WAIT}s."
  log "Rolling back..."
  $COMPOSE restart
  log "Rollback complete. Check logs: $COMPOSE logs"
  exit 1
fi

# --- Cleanup old images ---
docker image prune -f >> "$LOG_FILE" 2>&1

log "====== Deploy finished successfully ======"
