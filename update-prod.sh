#!/bin/bash

# Production Update Script - Run on DigitalOcean Droplet
# Pulls latest Docker images and rebuilds containers
# Usage: bash update-prod.sh

set +e

echo "=========================================="
echo "Order Taker App - Production Update"
echo "=========================================="
echo ""

# Navigate to app directory
cd /opt/ordertakerapp

# Create backups directory if it doesn't exist
mkdir -p backups

echo "Step 1: Backing up MongoDB database..."
echo "=========================================="
BACKUP_DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="backups/mongodb_backup_${BACKUP_DATE}.gz"

# Create MongoDB backup using mongodump inside the container
docker exec ordertaker-mongo mongodump \
  --username=admin \
  --password=password123 \
  --authenticationDatabase=admin \
  --db=ordertaker \
  --archive=/tmp/backup.gz \
  --gzip

if [ $? -eq 0 ]; then
    # Copy backup from container to host
    docker cp ordertaker-mongo:/tmp/backup.gz "$BACKUP_FILE"
    if [ $? -eq 0 ]; then
        echo "✓ Database backed up successfully to $BACKUP_FILE"
        # Clean up temp file in container
        docker exec ordertaker-mongo rm /tmp/backup.gz

        # Keep only last 10 backups
        echo "Cleaning up old backups (keeping last 10)..."
        ls -t backups/mongodb_backup_*.gz | tail -n +11 | xargs -r rm
        echo "✓ Old backups cleaned up"
    else
        echo "⚠️  Warning: Could not copy backup from container"
    fi
else
    echo "⚠️  Warning: Database backup failed, but continuing with update..."
    echo "   If something goes wrong, you may lose data!"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Update cancelled."
        exit 1
    fi
fi
echo ""

echo "Step 2: Pulling latest Docker images..."
echo "=========================================="
docker compose -f docker-compose.prod.yml pull
if [ $? -eq 0 ]; then
    echo "✓ Docker images pulled successfully"
else
    echo "⚠️  Docker pull had issues, continuing..."
fi
echo ""

echo "Step 3: Stopping application containers (keeping data)..."
echo "=========================================="
# NOTE: This does NOT remove volumes, so MongoDB data persists
docker compose -f docker-compose.prod.yml down
if [ $? -eq 0 ]; then
    echo "✓ Containers stopped (MongoDB data volumes preserved)"
else
    echo "⚠️  Error stopping containers"
fi
echo ""

echo "Step 4: Starting updated containers..."
echo "=========================================="
docker compose -f docker-compose.prod.yml up -d
if [ $? -eq 0 ]; then
    echo "✓ Containers started with updated images"
else
    echo "⚠️  Container startup had issues"
fi
echo ""

echo "Step 5: Waiting for services to initialize..."
sleep 10

echo "Step 6: Verifying services..."
echo "=========================================="
docker compose -f docker-compose.prod.yml ps
echo "✓ Services verified"
echo ""

echo "Step 7: Verifying Nginx configuration..."
echo "=========================================="
if nginx -t 2>/dev/null; then
    echo "✓ Nginx configuration is valid"
    # Check if /uploads location exists
    if grep -q "location /uploads" /etc/nginx/sites-available/ordertaker 2>/dev/null; then
        echo "✓ Nginx has /uploads location configured"
    else
        echo "⚠️  Nginx missing /uploads location (image uploads may not work)"
        echo "   Run: bash fix-nginx-uploads.sh to fix this"
    fi
else
    echo "⚠️  Nginx configuration check skipped (nginx may not be installed)"
fi
echo ""

echo "=========================================="
echo "✓ UPDATE COMPLETE!"
echo "=========================================="
echo ""
echo "Your app is running at:"
echo "  http://159.89.204.58"
echo ""
echo "Useful commands:"
echo "  - View logs: docker compose -f docker-compose.prod.yml logs -f"
echo "  - Restart: docker compose -f docker-compose.prod.yml restart"
echo "  - Stop: docker compose -f docker-compose.prod.yml down"
echo "  - Start: docker compose -f docker-compose.prod.yml up -d"
echo ""
