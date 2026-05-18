#!/bin/bash

# Load environment variables
if [ -f /opt/letsm/.env.backup ]; then
    export $(grep -v "^#" /opt/letsm/.env.backup | xargs)
fi

BACKUP_DIR="/opt/letsm/backup"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
ARCHIVE="${BACKUP_DIR}/mongodb-${TIMESTAMP}.archive.gz"

mkdir -p "$BACKUP_DIR"

echo "▶ Dumping MongoDB..."
docker exec letsm_mongo sh -c "mongodump --archive --gzip" > "$ARCHIVE"

DUMP_SIZE=$(du -h "$ARCHIVE" | cut -f1)
echo "✓ Dump size: $DUMP_SIZE"
echo "✓ Backup completed: $ARCHIVE"

# Upload to Backblaze B2
# Upload to Backblaze B2
echo "▶ Uploading to Backblaze B2..."
rclone copy "$ARCHIVE" "b2:letsm-backups/letsm-backups/"
echo "✓ Upload completed to B2"

