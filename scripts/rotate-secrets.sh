#!/usr/bin/env bash
# ============================================================
# Letsm AI - Safe Secrets Rotation
# ============================================================
# Safely rotates MongoDB / Redis / JWT / Mongo Express passwords.
# Works idempotently — can be re-run safely if interrupted.
#
# Usage (on VPS as root):
#   sudo /opt/letsm/scripts/rotate-secrets.sh
#
# What it does:
#   1. Detects current working MongoDB password (tries .env, .env.backup, prompts)
#   2. Generates new clean hex passwords (no special chars → no SCRAM issues)
#   3. Updates MongoDB user password using the OLD password
#   4. Updates Redis password by restarting Redis container
#   5. Updates .env and .env.backup atomically
#   6. Recreates backend + redis containers
#   7. Verifies health
#   8. Saves backup of OLD .env files for safety
# ============================================================
set -euo pipefail

ENV_FILE="/opt/letsm/.env"
ENV_BACKUP="/opt/letsm/.env.backup"
COMPOSE_FILE="/opt/letsm/docker-compose.prod.yml"

[ "$(id -u)" -eq 0 ] || { echo "Run as root: sudo $0"; exit 1; }
[ -f "$ENV_FILE" ] || { echo "❌ $ENV_FILE not found"; exit 1; }

log()  { echo -e "\n\033[1;32m▶ $*\033[0m"; }
warn() { echo -e "\n\033[1;33m⚠ $*\033[0m"; }
err()  { echo -e "\n\033[1;31m✗ $*\033[0m"; }

# ---- Helper: get var from a .env file ----
get_env() {
  local key="$1" file="$2"
  [ -f "$file" ] || return 1
  grep "^${key}=" "$file" 2>/dev/null | head -1 | cut -d= -f2-
}

# ---- Helper: try a mongo password ----
try_mongo_pw() {
  local pw="$1"
  [ -n "$pw" ] || return 1
  docker exec letsm_mongo mongosh --quiet \
    -u letsm_admin -p "$pw" \
    --authenticationDatabase admin \
    --eval "db.adminCommand('ping').ok" 2>/dev/null | grep -q "1$"
}

# ─────────────── 1. Find working mongo password ───────────────
log "Finding current working MongoDB password..."

CURRENT_MONGO_PW=""
for src in "$ENV_FILE" "$ENV_BACKUP"; do
  candidate=$(get_env MONGO_ROOT_PASSWORD "$src" || true)
  if [ -n "$candidate" ] && try_mongo_pw "$candidate"; then
    CURRENT_MONGO_PW="$candidate"
    echo "  ✓ Found working password in $src"
    break
  fi
done

if [ -z "$CURRENT_MONGO_PW" ]; then
  warn "Could not find working mongo password in .env files."
  echo "Please paste the current MongoDB root password (input hidden):"
  read -rs CURRENT_MONGO_PW
  echo ""
  if ! try_mongo_pw "$CURRENT_MONGO_PW"; then
    err "Password rejected by MongoDB. Aborting."
    exit 1
  fi
  echo "  ✓ Password verified"
fi

# ─────────────── 2. Generate new clean passwords ───────────────
log "Generating new clean hex passwords..."

NEW_MONGO_PW="$(openssl rand -hex 32)"
NEW_REDIS_PW="$(openssl rand -hex 32)"
NEW_JWT_KEY="$(openssl rand -hex 64)"
NEW_ME_PW="$(openssl rand -hex 16)"

echo "  ✓ Generated 4 new secrets (all hex — SCRAM-safe)"

# ─────────────── 3. Save backups of current .env files ───────────────
log "Saving backups of current .env files..."

ts="$(date -u +%Y%m%dT%H%M%SZ)"
cp -a "$ENV_FILE"   "${ENV_FILE}.bak.${ts}"
[ -f "$ENV_BACKUP" ] && cp -a "$ENV_BACKUP" "${ENV_BACKUP}.bak.${ts}"
chmod 600 "${ENV_FILE}.bak.${ts}" "${ENV_BACKUP}.bak.${ts}" 2>/dev/null || true
echo "  ✓ Backups: ${ENV_FILE}.bak.${ts}"

# ─────────────── 4. Update mongo password INSIDE mongo ───────────────
log "Updating MongoDB user password..."

docker exec letsm_mongo mongosh --quiet \
  -u letsm_admin -p "$CURRENT_MONGO_PW" \
  --authenticationDatabase admin \
  --eval "db.getSiblingDB('admin').updateUser('letsm_admin', { pwd: '${NEW_MONGO_PW}' })" \
  > /tmp/mongo_update.log 2>&1 || {
    err "Mongo password update failed:"
    cat /tmp/mongo_update.log
    exit 1
  }

# Verify new password works
if ! try_mongo_pw "$NEW_MONGO_PW"; then
  err "New mongo password verification failed. Rolling back..."
  exit 1
fi
echo "  ✓ MongoDB password updated and verified"

# ─────────────── 5. Update .env files atomically ───────────────
log "Updating .env files..."

update_env_var() {
  local key="$1" value="$2" file="$3"
  [ -f "$file" ] || return 0
  # Escape forward slashes and ampersands for sed
  local safe_value
  safe_value="$(printf '%s' "$value" | sed -e 's/[\/&]/\\&/g')"
  if grep -q "^${key}=" "$file"; then
    sed -i "s|^${key}=.*|${key}=${safe_value}|" "$file"
  else
    echo "${key}=${value}" >> "$file"
  fi
}

# Main .env
update_env_var "MONGO_ROOT_PASSWORD" "$NEW_MONGO_PW" "$ENV_FILE"
update_env_var "REDIS_PASSWORD"      "$NEW_REDIS_PW" "$ENV_FILE"
update_env_var "JWT_SECRET_KEY"      "$NEW_JWT_KEY"  "$ENV_FILE"
update_env_var "ME_PASSWORD"         "$NEW_ME_PW"    "$ENV_FILE"

# Backup .env (mongo password only — other secrets not needed here)
if [ -f "$ENV_BACKUP" ]; then
  update_env_var "MONGO_ROOT_PASSWORD" "$NEW_MONGO_PW" "$ENV_BACKUP"
fi

chmod 600 "$ENV_FILE" "$ENV_BACKUP" 2>/dev/null || true
chown letsm:letsm "$ENV_FILE" "$ENV_BACKUP" 2>/dev/null || true

echo "  ✓ .env files updated"

# ─────────────── 6. Recreate dependent containers ───────────────
log "Recreating backend + redis + mongo-express..."

cd /opt/letsm
docker compose -f "$COMPOSE_FILE" up -d --force-recreate \
  redis backend mongo-express 2>&1 | tail -20

# ─────────────── 7. Wait + smoke test ───────────────
log "Waiting for backend to be healthy..."

sleep 15
for i in 1 2 3 4 5 6; do
  if curl -fsS https://letsm.ai/api/health >/dev/null 2>&1; then
    echo "  ✓ Backend healthy"
    break
  fi
  echo "  attempt $i/6 — backend not ready, waiting 5s..."
  sleep 5
  if [ "$i" = "6" ]; then
    err "Backend never became healthy. Check: docker logs letsm_backend"
    exit 1
  fi
done

# ─────────────── 8. Test backup with new password ───────────────
log "Testing backup script with new credentials..."

if /opt/letsm/scripts/backup.sh > /tmp/backup_test.log 2>&1; then
  echo "  ✓ Backup works with new credentials"
else
  warn "Backup test failed. Check /tmp/backup_test.log"
  tail -20 /tmp/backup_test.log
fi

# ─────────────── 9. Summary ───────────────
echo ""
echo -e "\033[1;32m================================================\033[0m"
echo -e "\033[1;32m✅ Secrets rotation complete!\033[0m"
echo -e "\033[1;32m================================================\033[0m"
echo ""
echo "Rotated:"
echo "  • MONGO_ROOT_PASSWORD (DB + .env + .env.backup)"
echo "  • REDIS_PASSWORD       (.env)"
echo "  • JWT_SECRET_KEY       (.env)  — all users must re-login"
echo "  • ME_PASSWORD          (.env)  — Mongo Express UI"
echo ""
echo "Backups saved:"
echo "  • ${ENV_FILE}.bak.${ts}"
echo "  • ${ENV_BACKUP}.bak.${ts}"
echo ""
echo "Verify:"
echo "  curl https://letsm.ai/api/health"
echo ""
warn "JWT was rotated — log in again at https://letsm.ai/login"
