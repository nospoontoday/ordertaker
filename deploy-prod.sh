#!/bin/bash

# Production Deployment Script - Run on Local Machine
# This script builds Docker images and pushes them to Docker Hub
# Usage: ./deploy-prod.sh YOUR_DOCKERHUB_USERNAME [TAG]
# Example: ./deploy-prod.sh myusername
# Example: ./deploy-prod.sh myusername v1.0.0

set -e  # Exit on error

if [ -z "$1" ]; then
    echo "Usage: ./deploy-prod.sh YOUR_DOCKERHUB_USERNAME [TAG]"
    echo "Example: ./deploy-prod.sh myusername"
    echo "Example: ./deploy-prod.sh myusername v1.0.0"
    exit 1
fi

DOCKERHUB_USERNAME=$1
TAG=${2:-latest}

echo "=========================================="
echo "Production Deployment - Build & Push"
echo "=========================================="
echo "Docker Hub Username: $DOCKERHUB_USERNAME"
echo "Tag: $TAG"
echo ""

# Check if logged into Docker Hub
echo "Checking Docker Hub login..."
if ! docker info | grep -q "Username"; then
    echo "⚠️  Not logged into Docker Hub. Please login first:"
    echo "   docker login"
    echo ""
    read -p "Do you want to login now? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker login
    else
        echo "Please login to Docker Hub first: docker login"
        exit 1
    fi
fi

echo ""
echo "=========================================="
echo "Step 1: Building backend image..."
echo "=========================================="
cd backend
docker build --no-cache -t ${DOCKERHUB_USERNAME}/ordertaker-backend:${TAG} .
docker tag ${DOCKERHUB_USERNAME}/ordertaker-backend:${TAG} ${DOCKERHUB_USERNAME}/ordertaker-backend:latest
echo "✓ Backend image built successfully"
cd ..

echo ""
echo "=========================================="
echo "Step 2: Building frontend image..."
echo "=========================================="
docker build --no-cache -t ${DOCKERHUB_USERNAME}/ordertaker-app:${TAG} .
docker tag ${DOCKERHUB_USERNAME}/ordertaker-app:${TAG} ${DOCKERHUB_USERNAME}/ordertaker-app:latest
echo "✓ Frontend image built successfully"

echo ""
echo "=========================================="
echo "Step 3: Pushing backend image to Docker Hub..."
echo "=========================================="
docker push ${DOCKERHUB_USERNAME}/ordertaker-backend:${TAG}
docker push ${DOCKERHUB_USERNAME}/ordertaker-backend:latest
echo "✓ Backend image pushed successfully"

echo ""
echo "=========================================="
echo "Step 4: Pushing frontend image to Docker Hub..."
echo "=========================================="
docker push ${DOCKERHUB_USERNAME}/ordertaker-app:${TAG}
docker push ${DOCKERHUB_USERNAME}/ordertaker-app:latest
echo "✓ Frontend image pushed successfully"

echo ""
echo "=========================================="
echo "✓ DEPLOYMENT COMPLETE!"
echo "=========================================="
echo ""
echo "Images pushed to Docker Hub:"
echo "  Backend:  ${DOCKERHUB_USERNAME}/ordertaker-backend:${TAG}"
echo "  Frontend: ${DOCKERHUB_USERNAME}/ordertaker-app:${TAG}"
echo ""
echo "Next steps on your DigitalOcean droplet:"
echo "=========================================="
echo ""
echo "1. SSH into your droplet:"
echo "   ssh root@YOUR_DROPLET_IP"
echo ""
echo "2. Update docker-compose.prod.yml with your Docker Hub username:"
echo "   sed -i 's/YOUR_DOCKERHUB_USERNAME/${DOCKERHUB_USERNAME}/g' docker-compose.prod.yml"
echo ""
echo "3. Pull the latest images:"
echo "   docker compose -f docker-compose.prod.yml pull"
echo ""
echo "4. Start the services:"
echo "   docker compose -f docker-compose.prod.yml up -d"
echo ""
echo "5. Verify services are running:"
echo "   docker compose -f docker-compose.prod.yml ps"
echo ""
echo "Your app will be accessible at: http://YOUR_DROPLET_IP"
echo ""
