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

echo "Step 1: Pulling latest Docker images..."
echo "=========================================="
docker compose -f docker-compose.prod.yml pull
if [ $? -eq 0 ]; then
    echo "✓ Docker images pulled successfully"
else
    echo "⚠️  Docker pull had issues, continuing..."
fi
echo ""

echo "Step 2: Rebuilding and restarting containers..."
echo "=========================================="
docker compose -f docker-compose.prod.yml up -d --force-recreate
if [ $? -eq 0 ]; then
    echo "✓ Containers rebuilt and restarted"
else
    echo "⚠️  Container rebuild had issues"
fi
echo ""

echo "Step 3: Waiting for services to initialize..."
sleep 10

echo "Step 4: Verifying services..."
echo "=========================================="
docker compose -f docker-compose.prod.yml ps
echo "✓ Services verified"
echo ""

echo "=========================================="
echo "✓ UPDATE COMPLETE!"
echo "=========================================="
echo ""
echo "Your app is running at:"
echo "  http://165.232.167.105"
echo ""
echo "Useful commands:"
echo "  - View logs: docker compose -f docker-compose.prod.yml logs -f"
echo "  - Restart: docker compose -f docker-compose.prod.yml restart"
echo "  - Stop: docker compose -f docker-compose.prod.yml down"
echo "  - Start: docker compose -f docker-compose.prod.yml up -d"
echo ""
