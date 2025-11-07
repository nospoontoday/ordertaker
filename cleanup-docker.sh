#!/bin/bash

# Docker Cleanup Script - Run on Production Server
# This script cleans up unused Docker resources to free up disk space
# Usage: bash cleanup-docker.sh

set -e

echo "=========================================="
echo "Docker Cleanup - Freeing Disk Space"
echo "=========================================="
echo ""

echo "Current disk usage:"
df -h /
echo ""

echo "=========================================="
echo "Step 1: Removing stopped containers..."
echo "=========================================="
docker container prune -f
echo "✓ Stopped containers removed"
echo ""

echo "Step 2: Removing unused images..."
echo "=========================================="
docker image prune -a -f
echo "✓ Unused images removed"
echo ""

echo "Step 3: Removing unused build cache..."
echo "=========================================="
docker builder prune -a -f
echo "✓ Build cache removed"
echo ""

echo "Step 4: Removing unused networks..."
echo "=========================================="
docker network prune -f
echo "✓ Unused networks removed"
echo ""

echo "Step 5: Checking dangling volumes..."
echo "=========================================="
# List dangling volumes (be careful - we want to keep mongodb-data)
DANGLING_VOLUMES=$(docker volume ls -qf dangling=true | grep -v "mongodb-data" || true)
if [ -z "$DANGLING_VOLUMES" ]; then
    echo "No dangling volumes to remove (MongoDB data preserved)"
else
    echo "Found dangling volumes (excluding mongodb-data):"
    echo "$DANGLING_VOLUMES"
    echo "$DANGLING_VOLUMES" | xargs -r docker volume rm
    echo "✓ Dangling volumes removed"
fi
echo ""

echo "=========================================="
echo "Disk space after cleanup:"
echo "=========================================="
df -h /
echo ""

echo "=========================================="
echo "Docker disk usage:"
echo "=========================================="
docker system df
echo ""

echo "✓ CLEANUP COMPLETE!"
echo ""
echo "If you still need more space, consider:"
echo "  1. Upgrading your droplet size"
echo "  2. Adding a volume for Docker storage"
echo "  3. Cleaning up old log files: journalctl --vacuum-time=7d"
echo ""
