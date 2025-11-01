#!/bin/bash

# MongoDB Backup Script
# Creates a backup of the MongoDB database
# Usage: bash backup-db.sh [BACKUP_DIR]
# Example: bash backup-db.sh
# Example: bash backup-db.sh /backups

set -e

# Default backup directory
BACKUP_DIR=${1:-.}

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Get current timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/ordertaker_backup_$TIMESTAMP.tar.gz"

echo "=========================================="
echo "MongoDB Backup"
echo "=========================================="
echo "Backup directory: $BACKUP_DIR"
echo "Backup file: $BACKUP_FILE"
echo ""

# Check if MongoDB container is running
if ! docker ps | grep -q ordertaker-mongo; then
    echo "⚠️  MongoDB container (ordertaker-mongo) is not running"
    echo "Please start the services first:"
    echo "  docker compose -f docker-compose.prod.yml up -d"
    exit 1
fi

echo "Step 1: Creating MongoDB dump..."
# Create a temporary directory for the dump
TEMP_DUMP_DIR="/tmp/ordertaker_dump_$TIMESTAMP"
mkdir -p "$TEMP_DUMP_DIR"

# Dump MongoDB database
docker exec ordertaker-mongo mongodump \
    --username admin \
    --password password123 \
    --authenticationDatabase admin \
    --db ordertaker \
    --out "$TEMP_DUMP_DIR"

echo "✓ MongoDB dump created"
echo ""

echo "Step 2: Compressing backup..."
# Compress the dump
tar -czf "$BACKUP_FILE" -C "$TEMP_DUMP_DIR" .

# Clean up temporary directory
rm -rf "$TEMP_DUMP_DIR"

echo "✓ Backup compressed"
echo ""

# Get file size
FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)

echo "=========================================="
echo "✓ BACKUP COMPLETE!"
echo "=========================================="
echo ""
echo "Backup file: $BACKUP_FILE"
echo "File size: $FILE_SIZE"
echo ""
echo "To restore this backup, run:"
echo "  bash restore-db.sh $BACKUP_FILE"
echo ""
