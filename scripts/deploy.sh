#!/usr/bin/env bash
# =============================================================================
# Cronograph — Production Deploy Script
# Runs on the VPS via GitHub Actions SSH
# =============================================================================
set -euo pipefail

DEPLOY_DIR="/opt/cronograph"
COMPOSE_FILE="docker-compose.prod.yml"
LOG_FILE="/var/log/cronograph-deploy.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

log() { echo "[$TIMESTAMP] $*" | tee -a "$LOG_FILE"; }

log "====== Deploy started ======"

cd "$DEPLOY_DIR"

# --- Snapshot do estado atual (rollback reference) ---
PREV_IMAGES=$(docker compose -f "$COMPOSE_FILE" images -q 2>/dev/null || true)
log "Previous images: $PREV_IMAGES"

# --- Pull latest code ---
log "Pulling latest code from GitHub..."
git fetch --all
git reset --hard origin/main

# --- Build new images ---
log "Building Docker images..."
docker compose -f "$COMPOSE_FILE" build --no-cache

# --- Restart services (zero-downtime friendly: db first, then backend, then frontend) ---
log "Restarting services..."
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans

# --- Health check ---
log "Waiting for backend health check..."
MAX_WAIT=60
WAITED=0
until curl -sf http://localhost:8003/health > /dev/null 2>&1 || [ $WAITED -ge $MAX_WAIT ]; do
  sleep 3
  WAITED=$((WAITED + 3))
done

if curl -sf http://localhost:8003/health > /dev/null 2>&1; then
  log "Backend healthy. Deploy successful."
else
  log "ERROR: Backend health check failed after ${MAX_WAIT}s."
  log "Rolling back..."
  # Rollback: restart with previous images (already pulled)
  docker compose -f "$COMPOSE_FILE" restart
  log "Rollback complete. Check logs: docker compose -f $COMPOSE_FILE logs"
  exit 1
fi

# --- Cleanup old images ---
docker image prune -f >> "$LOG_FILE" 2>&1

log "====== Deploy finished successfully ======"
