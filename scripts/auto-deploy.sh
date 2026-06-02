#!/bin/bash
# /opt/letsm/scripts/auto-deploy.sh
#
# Pulls the latest Docker images from GHCR every 60 seconds and redeploys
# if a newer digest is available. Avoids the need for GitHub Actions to
# SSH into the VPS (which fails due to fail2ban + dynamic Azure runner IPs).
#
# Install once:
#   sudo cp /opt/letsm/scripts/auto-deploy.{sh,service,timer} /etc/systemd/system/
#   sudo systemctl daemon-reload
#   sudo systemctl enable --now letsm-auto-deploy.timer
#
# Monitor:
#   journalctl -u letsm-auto-deploy.service -f
#   tail -f /var/log/letsm-auto-deploy.log
#
set -euo pipefail

LOG=/var/log/letsm-auto-deploy.log
COMPOSE_DIR=/opt/letsm
LOCKFILE=/tmp/letsm-auto-deploy.lock

# Prevent overlapping runs
exec 9>"$LOCKFILE"
if ! flock -n 9; then
  exit 0
fi

cd "$COMPOSE_DIR"

# Load .env so REGISTRY/IMAGE_PREFIX are available
set -a; . ./.env; set +a

# Default values if not in .env
export REGISTRY="${REGISTRY:-ghcr.io}"
export IMAGE_PREFIX="${IMAGE_PREFIX:-letsm-ai/letsm}"
export IMAGE_TAG="${IMAGE_TAG:-latest}"

log() {
  echo "[$(date -Iseconds)] $*" | tee -a "$LOG"
}

# Pull config & nginx changes from GitHub first (so compose files stay in sync)
if [ -d .git ]; then
  if git fetch origin main --quiet 2>>"$LOG"; then
    LOCAL=$(git rev-parse HEAD)
    REMOTE=$(git rev-parse origin/main)
    if [ "$LOCAL" != "$REMOTE" ]; then
      log "📦 New commit on main: $LOCAL → $REMOTE"
      # Reset everything EXCEPT the .env file
      git stash push -m "auto-deploy-stash-$(date +%s)" -- .env 2>>"$LOG" || true
      git reset --hard origin/main 2>>"$LOG"
      git stash pop 2>>"$LOG" || true
      # Use latest commit SHA as the image tag
      export IMAGE_TAG="$REMOTE"
    fi
  fi
fi

# Login to GHCR (token must be set in .env as GHCR_PULL_TOKEN)
if [ -n "${GHCR_PULL_TOKEN:-}" ] && [ -n "${GHCR_USER:-}" ]; then
  echo "$GHCR_PULL_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin >/dev/null 2>&1 || true
fi

# Check if any new image is available
NEED_REDEPLOY=0
for service in backend frontend whatsapp; do
  IMAGE="$REGISTRY/$IMAGE_PREFIX-$service:$IMAGE_TAG"
  BEFORE=$(docker image inspect --format='{{.Id}}' "$IMAGE" 2>/dev/null || echo "none")
  if docker pull "$IMAGE" >/dev/null 2>&1; then
    AFTER=$(docker image inspect --format='{{.Id}}' "$IMAGE" 2>/dev/null || echo "none")
    if [ "$BEFORE" != "$AFTER" ] || [ "$BEFORE" = "none" ]; then
      log "🆕 New $service image: $AFTER"
      NEED_REDEPLOY=1
    fi
  fi
done

if [ "$NEED_REDEPLOY" -eq 0 ]; then
  exit 0
fi

log "🚀 Redeploying letsm stack..."

# Clean any orphan containers from prior failures
for svc in backend frontend whatsapp; do
  ORPHANS=$(docker ps -a --filter "name=_letsm_${svc}" -q || true)
  if [ -n "$ORPHANS" ]; then
    log "  → Removing orphan ${svc} containers: $ORPHANS"
    docker rm -f $ORPHANS 2>>"$LOG" || true
  fi
done

# Rolling restart
docker compose -f docker-compose.prod.yml -f docker-compose.deploy.yml \
  up -d --remove-orphans >>"$LOG" 2>&1

# Reload nginx to refresh DNS to new backend/frontend IPs
sleep 5
docker exec letsm_nginx nginx -s reload >>"$LOG" 2>&1 \
  || docker compose -f docker-compose.prod.yml restart nginx >>"$LOG" 2>&1

# Smoke test
sleep 10
for i in 1 2 3 4 5 6 7 8 9 10; do
  if curl -fsS --max-time 5 https://letsm.ai/api/health >/dev/null 2>&1; then
    log "✅ Backend healthy after deploy"
    break
  fi
  if [ "$i" = "10" ]; then
    log "❌ Health check failed after 10 attempts"
    docker compose -f docker-compose.prod.yml logs --tail=30 backend >>"$LOG" 2>&1
  fi
  sleep 5
done

# Cleanup old images
docker image prune -af --filter "until=72h" >/dev/null 2>&1 || true

log "🎉 Deploy complete"
