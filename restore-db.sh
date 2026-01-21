#!/bin/bash

# MongoDB Restore Script
# Restores a MongoDB database from a backup
# Usage: bash restore-db.sh /path/to/backup.tar.gz
# Example: bash restore-db.sh ordertaker_backup_20231115_143022.tar.gz

set -e

if [ -z "$1" ]; then
    echo "Usage: bash restore-db.sh /path/to/backup.tar.gz"
    echo "Example: bash restore-db.sh ordertaker_backup_20231115_143022.tar.gz"
    exit 1
fi

BACKUP_FILE=$1

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "=========================================="
echo "MongoDB Restore"
echo "=========================================="
echo "Backup file: $BACKUP_FILE"
echo ""

# Check if MongoDB container is running
if ! docker ps | grep -q ordertaker-mongo; then
    echo "⚠️  MongoDB container (ordertaker-mongo) is not running"
    echo "Please start the services first:"
    echo "  docker compose -f docker-compose.prod.yml up -d"
    exit 1
fi

# Confirm restore operation
echo "⚠️  WARNING: This will overwrite the current database!"
read -p "Are you sure you want to restore from this backup? (yes/no) " -r
echo ""
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "Restore cancelled"
    exit 1
fi

echo "Step 1: Extracting backup..."
# Create a temporary directory for extraction
TEMP_RESTORE_DIR="/tmp/ordertaker_restore_$$"
mkdir -p "$TEMP_RESTORE_DIR"

# Extract the backup
tar -xzf "$BACKUP_FILE" -C "$TEMP_RESTORE_DIR"

echo "✓ Backup extracted"
echo ""

echo "Step 2: Dropping existing database..."
# Drop the existing database
docker exec ordertaker-mongo mongosh \
    --username admin \
    --password password123 \
    --authenticationDatabase admin \
    --eval "db.getSiblingDB('ordertaker').dropDatabase()"

echo "✓ Existing database dropped"
echo ""

echo "Step 3: Restoring database from backup..."
# Copy the dump to the container
docker cp "$TEMP_RESTORE_DIR/ordertaker" ordertaker-mongo:/tmp/restore_dump

# Restore the database
docker exec ordertaker-mongo mongorestore \
    --username admin \
    --password password123 \
    --authenticationDatabase admin \
    --db ordertaker \
    /tmp/restore_dump/ordertaker

# Clean up
docker exec ordertaker-mongo rm -rf /tmp/restore_dump

echo "✓ Database restored"
echo ""

# Clean up temporary directory
rm -rf "$TEMP_RESTORE_DIR"

echo "=========================================="
echo "✓ RESTORE COMPLETE!"
echo "=========================================="
echo ""
echo "Database has been successfully restored from:"
echo "  $BACKUP_FILE"
echo ""
echo "Verify the restore by checking the app:"
echo "  http://YOUR_DROPLET_IP"
echo ""
