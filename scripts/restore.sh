#!/usr/bin/env bash
# ============================================================
# Letsm AI - Restore MongoDB from Backblaze B2 backup
# Usage: ./restore.sh <backup-filename.gz>
#        ./restore.sh latest         # picks newest backup
# ============================================================
set -euo pipefail

ENV_FILE="${ENV_FILE:-/opt/letsm/.env.backup}"
if [ -f "$ENV_FILE" ]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

: "${MONGO_ROOT_USER:?}"
: "${MONGO_ROOT_PASSWORD:?}"
: "${DB_NAME:?}"
: "${B2_BUCKET:?}"
: "${B2_ACCOUNT_ID:?}"
: "${B2_APP_KEY:?}"

ARG="${1:-latest}"
WORKDIR="/tmp/letsm-restore-$$"
mkdir -p "$WORKDIR"
trap 'rm -rf "$WORKDIR"' EXIT

# ---- Authorize B2 ----
b2 account authorize "${B2_ACCOUNT_ID}" "${B2_APP_KEY}" >/dev/null

if [ "$ARG" = "latest" ]; then
  FILE=$(b2 ls --recursive --json "${B2_BUCKET}" | \
    jq -r '[.[] | select(.fileName | startswith("mongo/"))] | sort_by(.uploadTimestamp) | last | .fileName')
  [ -z "$FILE" ] && { echo "❌ No backup found"; exit 1; }
else
  FILE="mongo/${ARG}"
fi

echo "▶ Restoring from: $FILE"
read -r -p "⚠️  This will OVERWRITE the '${DB_NAME}' database. Type 'YES' to continue: " CONFIRM
[ "$CONFIRM" = "YES" ] || { echo "Aborted"; exit 1; }

# ---- Download ----
b2 file download "b2://${B2_BUCKET}/${FILE}" "${WORKDIR}/dump.gz"

# ---- Restore (pipe into mongo container) ----
cat "${WORKDIR}/dump.gz" | docker exec -i letsm_mongo sh -c "mongorestore \
  --username='${MONGO_ROOT_USER}' \
  --password='${MONGO_ROOT_PASSWORD}' \
  --authenticationDatabase=admin \
  --drop \
  --gzip \
  --archive"

echo "✅ Restore complete. Restart backend: docker compose restart backend"
