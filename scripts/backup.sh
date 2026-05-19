#!/usr/bin/env bash
set -euo pipefail
[ -f /opt/letsm/.env.backup ] && source /opt/letsm/.env.backup
: "${MONGO_ROOT_USER:=letsm_admin}"
: "${MONGO_ROOT_PASSWORD:?missing}"

BACKUP_DIR="/opt/letsm/backup"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
ARCHIVE="${BACKUP_DIR}/mongodb-${TIMESTAMP}.archive.gz"
mkdir -p "$BACKUP_DIR"

if ! docker ps --format '{{.Names}}' | grep -q '^letsm_mongo$'; then
  echo "X letsm_mongo not running. Aborting." >&2
  exit 1
fi

echo "> Dumping MongoDB (authenticated)..."
docker exec letsm_mongo sh -c "mongodump \
  --username='${MONGO_ROOT_USER}' \
  --password='${MONGO_ROOT_PASSWORD}' \
  --authenticationDatabase=admin \
  --archive --gzip" > "$ARCHIVE"

SIZE=$(stat -c%s "$ARCHIVE")
if [ "$SIZE" -lt 1000 ]; then
  echo "X Backup too small ($SIZE bytes). Deleting." >&2
  rm -f "$ARCHIVE"
  exit 1
fi

echo "OK Backup: $(du -h "$ARCHIVE" | cut -f1) -> $ARCHIVE"

if command -v rclone >/dev/null && rclone listremotes 2>/dev/null | grep -q "^b2:"; then
  echo "> Uploading to B2..."
  rclone copy "$ARCHIVE" "b2:letsm-backups/" --quiet && echo "OK Uploaded"
fi

find "$BACKUP_DIR" -name "mongodb-*.archive.gz" -mtime +3 -delete
