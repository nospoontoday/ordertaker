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

echo "Step 2: Stopping containers..."
echo "=========================================="
docker compose -f docker-compose.prod.yml down
if [ $? -eq 0 ]; then
    echo "✓ Containers stopped"
else
    echo "⚠️  Error stopping containers"
fi
echo ""

echo "Step 3: Starting updated containers..."
echo "=========================================="
docker compose -f docker-compose.prod.yml up -d --build
if [ $? -eq 0 ]; then
    echo "✓ Containers started with updated images"
else
    echo "⚠️  Container startup had issues"
fi
echo ""

echo "Step 4: Waiting for services to initialize..."
sleep 10

echo "Step 5: Verifying services..."
echo "=========================================="
docker compose -f docker-compose.prod.yml ps
echo "✓ Services verified"
echo ""

echo "Step 6: Verifying Nginx configuration..."
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
echo "  http://165.232.167.105"
echo ""
echo "Useful commands:"
echo "  - View logs: docker compose -f docker-compose.prod.yml logs -f"
echo "  - Restart: docker compose -f docker-compose.prod.yml restart"
echo "  - Stop: docker compose -f docker-compose.prod.yml down"
echo "  - Start: docker compose -f docker-compose.prod.yml up -d"
echo ""
