#!/bin/bash

# Simple Deployment Script for DigitalOcean Droplet
# Usage: ./deploy.sh YOUR_DROPLET_IP

set -e  # Exit on error

if [ -z "$1" ]; then
    echo "Usage: ./deploy.sh YOUR_DROPLET_IP"
    echo "Example: ./deploy.sh 165.22.123.45"
    exit 1
fi

DROPLET_IP=$1

echo "=========================================="
echo "Deploying Order Taker App to $DROPLET_IP"
echo "=========================================="

echo "Step 1: Updating environment files..."

# Update frontend .env.local with droplet IP
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://$DROPLET_IP/api
EOF

echo "✓ Created .env.local with API URL: http://$DROPLET_IP/api"

# Check if backend .env exists, create if not
if [ ! -f backend/.env ]; then
    echo "⚠️  backend/.env not found. Please create it with:"
    echo "   cd backend && cp .env .env.backup && nano .env"
    echo "   Make sure to update MONGODB_URI for production"
fi

echo ""
echo "Step 2: Building frontend..."
npm install
npm run build

echo ""
echo "Step 3: Building Docker images..."
docker-compose -f docker-compose.prod.yml build

echo ""
echo "=========================================="
echo "Deployment files ready!"
echo "=========================================="
echo ""
echo "Next steps on your droplet:"
echo ""
echo "1. Copy files to droplet:"
echo "   rsync -avz --exclude 'node_modules' --exclude '.next' . root@$DROPLET_IP:/opt/ordertakerapp/"
echo ""
echo "2. SSH to droplet:"
echo "   ssh root@$DROPLET_IP"
echo ""
echo "3. On droplet, run:"
echo "   cd /opt/ordertakerapp"
echo "   bash setup-droplet.sh"
echo ""
echo "Or follow the manual steps in DEPLOYMENT.md"

