#!/bin/bash

# Build and Push Docker Images to Docker Hub
# Usage: ./build-and-push.sh YOUR_DOCKERHUB_USERNAME [TAG]
# Example: ./build-and-push.sh johndoe
# Example: ./build-and-push.sh johndoe v1.0.0

set -e  # Exit on error

if [ -z "$1" ]; then
    echo "Usage: ./build-and-push.sh YOUR_DOCKERHUB_USERNAME [TAG]"
    echo "Example: ./build-and-push.sh johndoe"
    echo "Example: ./build-and-push.sh johndoe v1.0.0"
    exit 1
fi

DOCKERHUB_USERNAME=$1
TAG=${2:-latest}

echo "=========================================="
echo "Building and Pushing Docker Images"
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
echo "Step 1: Building backend image..."
cd backend
docker build -t ${DOCKERHUB_USERNAME}/ordertaker-backend:${TAG} .
docker tag ${DOCKERHUB_USERNAME}/ordertaker-backend:${TAG} ${DOCKERHUB_USERNAME}/ordertaker-backend:latest
cd ..

echo ""
echo "Step 2: Building frontend image..."
docker build -t ${DOCKERHUB_USERNAME}/ordertaker-app:${TAG} .
docker tag ${DOCKERHUB_USERNAME}/ordertaker-app:${TAG} ${DOCKERHUB_USERNAME}/ordertaker-app:latest

echo ""
echo "Step 3: Pushing backend image to Docker Hub..."
docker push ${DOCKERHUB_USERNAME}/ordertaker-backend:${TAG}
docker push ${DOCKERHUB_USERNAME}/ordertaker-backend:latest

echo ""
echo "Step 4: Pushing frontend image to Docker Hub..."
docker push ${DOCKERHUB_USERNAME}/ordertaker-app:${TAG}
docker push ${DOCKERHUB_USERNAME}/ordertaker-app:latest

echo ""
echo "=========================================="
echo "✓ Images successfully pushed to Docker Hub!"
echo "=========================================="
echo ""
echo "Backend image: ${DOCKERHUB_USERNAME}/ordertaker-backend:${TAG}"
echo "Frontend image: ${DOCKERHUB_USERNAME}/ordertaker-app:${TAG}"
echo ""
echo "Next steps on your droplet:"
echo "1. Update docker-compose.prod.yml with your Docker Hub username"
echo "2. Run: docker compose -f docker-compose.prod.yml pull"
echo "3. Run: docker compose -f docker-compose.prod.yml up -d"

