#!/usr/bin/env bash
# ============================================================
# Letsm AI - Automated MongoDB Backup → Backblaze B2
# Run via cron daily at 03:00 server time
# ============================================================
# Cron entry:
#   0 3 * * * /opt/letsm/scripts/backup.sh >> /var/log/letsm-backup.log 2>&1
# ============================================================
set -euo pipefail

# ---- Config (override via /opt/letsm/.env.backup) ----
ENV_FILE="${ENV_FILE:-/opt/letsm/.env.backup}"
if [ -f "$ENV_FILE" ]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

: "${MONGO_ROOT_USER:?MONGO_ROOT_USER not set}"
: "${MONGO_ROOT_PASSWORD:?MONGO_ROOT_PASSWORD not set}"
: "${DB_NAME:?DB_NAME not set}"
: "${B2_BUCKET:?B2_BUCKET not set}"
: "${B2_ACCOUNT_ID:?B2_ACCOUNT_ID not set}"
: "${B2_APP_KEY:?B2_APP_KEY not set}"

# ---- Vars ----
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
LOCAL_DIR="/var/backups/letsm"
ARCHIVE="${LOCAL_DIR}/letsm-${DB_NAME}-${TIMESTAMP}.gz"
WA_ARCHIVE="${LOCAL_DIR}/wa-auth-${TIMESTAMP}.tar.gz"
RETENTION_LOCAL_DAYS="${RETENTION_LOCAL_DAYS:-3}"
RETENTION_REMOTE_DAYS="${RETENTION_REMOTE_DAYS:-30}"
TG_BOT_TOKEN="${TG_BOT_TOKEN:-}"
TG_CHAT_ID="${TG_CHAT_ID:-}"

mkdir -p "$LOCAL_DIR"

notify() {
  local msg="$1"
  echo "[$(date -u +%FT%TZ)] $msg"
  if [ -n "$TG_BOT_TOKEN" ] && [ -n "$TG_CHAT_ID" ]; then
    curl -sS -X POST "https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage" \
      -d "chat_id=${TG_CHAT_ID}" \
      -d "text=🔔 Letsm Backup: ${msg}" >/dev/null || true
  fi
}

trap 'notify "❌ Backup FAILED at line $LINENO"' ERR

# ---- 1. MongoDB dump ----
echo "▶ Dumping MongoDB..."
docker exec letsm_mongo sh -c "mongodump \
  --username='${MONGO_ROOT_USER}' \
  --password='${MONGO_ROOT_PASSWORD}' \
  --authenticationDatabase=admin \
  --db='${DB_NAME}' \
  --archive --gzip" > "$ARCHIVE"

DUMP_SIZE=$(du -h "$ARCHIVE" | cut -f1)
echo "✓ Dump size: $DUMP_SIZE"

# ---- 2. WhatsApp auth folder (so sessions survive disaster) ----
echo "▶ Archiving WhatsApp auth_info volume..."
docker run --rm \
  -v letsm_wa_auth:/data:ro \
  -v "${LOCAL_DIR}:/backup" \
  alpine sh -c "cd /data && tar czf /backup/$(basename "$WA_ARCHIVE") ."

# ---- 3. Install b2 CLI if missing ----
if ! command -v b2 >/dev/null 2>&1; then
  echo "▶ Installing b2 CLI..."
  curl -sSL -o /usr/local/bin/b2 \
    https://github.com/Backblaze/B2_Command_Line_Tool/releases/latest/download/b2-linux
  chmod +x /usr/local/bin/b2
fi

# ---- 4. Authorize & upload ----
echo "▶ Uploading to Backblaze B2 (bucket: ${B2_BUCKET})..."
b2 account authorize "${B2_ACCOUNT_ID}" "${B2_APP_KEY}" >/dev/null
b2 file upload --quiet "${B2_BUCKET}" "$ARCHIVE"    "mongo/$(basename "$ARCHIVE")"
b2 file upload --quiet "${B2_BUCKET}" "$WA_ARCHIVE" "whatsapp/$(basename "$WA_ARCHIVE")"

# ---- 5. Prune ----
echo "▶ Pruning local backups older than ${RETENTION_LOCAL_DAYS}d..."
find "$LOCAL_DIR" -type f -mtime "+${RETENTION_LOCAL_DAYS}" -delete

# Remote retention is enforced by B2 lifecycle rules (set in bucket config),
# but we can also prune programmatically:
echo "▶ Pruning remote backups older than ${RETENTION_REMOTE_DAYS}d..."
CUTOFF=$(date -u -d "${RETENTION_REMOTE_DAYS} days ago" +%s 2>/dev/null || date -u -v-"${RETENTION_REMOTE_DAYS}"d +%s)
b2 ls --recursive --json "${B2_BUCKET}" | \
  jq -r --argjson cutoff "$CUTOFF" '.[] | select(.uploadTimestamp/1000 < $cutoff) | .fileName' 2>/dev/null | \
  while read -r f; do
    [ -n "$f" ] && b2 file delete "b2://${B2_BUCKET}/${f}" || true
  done

notify "✅ Backup OK ($DUMP_SIZE) - $(basename "$ARCHIVE")"
echo "✅ Done."
