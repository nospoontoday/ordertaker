#!/bin/bash

# MongoDB Restore Script - Restores from backup
# Usage: bash restore-mongodb.sh [backup_file]
# If no backup file is specified, will list available backups

set -e

echo "=========================================="
echo "MongoDB Restore Script"
echo "=========================================="
echo ""

# Navigate to app directory
cd /opt/ordertakerapp

# Check if backup file is provided
if [ -z "$1" ]; then
    echo "Available backups:"
    echo "=========================================="
    ls -lht backups/mongodb_backup_*.gz 2>/dev/null || echo "No backups found"
    echo ""
    echo "Usage: bash restore-mongodb.sh backups/mongodb_backup_YYYYMMDD_HHMMSS.gz"
    exit 1
fi

BACKUP_FILE="$1"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "Backup file: $BACKUP_FILE"
echo ""
echo "⚠️  WARNING: This will restore the database from backup."
echo "   Current data will be replaced with backup data."
echo ""
read -p "Are you sure you want to continue? (yes/NO) " -r
echo
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "Restore cancelled."
    exit 0
fi

echo "Step 1: Copying backup to container..."
echo "=========================================="
docker cp "$BACKUP_FILE" ordertaker-mongo:/tmp/restore.gz
if [ $? -eq 0 ]; then
    echo "✓ Backup copied to container"
else
    echo "❌ Error: Failed to copy backup to container"
    exit 1
fi
echo ""

echo "Step 2: Restoring database..."
echo "=========================================="
docker exec ordertaker-mongo mongorestore \
  --username=admin \
  --password=password123 \
  --authenticationDatabase=admin \
  --db=ordertaker \
  --archive=/tmp/restore.gz \
  --gzip \
  --drop

if [ $? -eq 0 ]; then
    echo "✓ Database restored successfully"
    # Clean up temp file in container
    docker exec ordertaker-mongo rm /tmp/restore.gz
    echo "✓ Cleanup complete"
else
    echo "❌ Error: Database restore failed"
    exit 1
fi
echo ""

echo "=========================================="
echo "✓ RESTORE COMPLETE!"
echo "=========================================="
echo ""
echo "Database has been restored from: $BACKUP_FILE"
echo ""
