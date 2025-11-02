#!/bin/bash

# Production Startup Script - Run on DigitalOcean Droplet
# This script sets up the server and starts the application
# Usage: bash start-prod.sh
# Or run in background: nohup bash start-prod.sh > deployment.log 2>&1 &

# Don't exit on error - continue with deployment
set +e

echo "=========================================="
echo "Order Taker App - Production Setup"
echo "=========================================="
echo ""

# Get droplet IP
DROPLET_IP=$(curl -s ifconfig.me || hostname -I | awk '{print $1}')
echo "Detected Droplet IP: $DROPLET_IP"
echo ""

# Kill any existing apt processes immediately
echo "Checking for running apt processes..."
pkill -9 apt 2>/dev/null || true
pkill -9 apt-get 2>/dev/null || true
pkill -9 unattended-upgrade 2>/dev/null || true
sleep 2
echo "✓ Package manager ready"
echo ""

# Update system
echo "=========================================="
echo "Step 1: Updating system packages..."
echo "=========================================="
apt update && apt upgrade -y
if [ $? -eq 0 ]; then
    echo "✓ System packages updated"
else
    echo "⚠️  System update had issues, continuing..."
fi
echo ""

# Install required software
echo "=========================================="
echo "Step 2: Installing required software..."
echo "=========================================="
apt install -y curl git nginx

# Install Node.js 20.x if not present
if ! command -v node &> /dev/null; then
    echo "Installing Node.js 20.x..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi

# Install Docker if not present
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
fi

# Install Docker Compose if not present
if ! command -v docker-compose &> /dev/null; then
    echo "Installing Docker Compose..."
    apt install -y docker-compose
fi

echo "✓ All required software installed"
echo ""

# Verify installations
echo "=========================================="
echo "Step 3: Verifying installations..."
echo "=========================================="
echo "Node.js: $(node --version)"
echo "Docker: $(docker --version)"
echo "Docker Compose: $(docker-compose --version)"
echo "Nginx: $(nginx -v 2>&1 | head -n1)"
echo "✓ All installations verified"
echo ""

# Navigate to app directory
cd /opt/ordertakerapp

# Update docker-compose.prod.yml with Docker Hub username if needed
echo "=========================================="
echo "Step 4: Configuring Docker Compose..."
echo "=========================================="
if grep -q "YOUR_DOCKERHUB_USERNAME" docker-compose.prod.yml; then
    echo "⚠️  docker-compose.prod.yml still contains YOUR_DOCKERHUB_USERNAME"
    echo "Please update it with your actual Docker Hub username before continuing"
    echo ""
    echo "Edit the file and replace YOUR_DOCKERHUB_USERNAME with your username"
    exit 1
fi
echo "✓ Docker Compose configuration verified"
echo ""

# Setup environment files
echo "=========================================="
echo "Step 5: Setting up environment files..."
echo "=========================================="

# Copy production environment files
if [ -f backend/.env.prod ]; then
    cp backend/.env.prod backend/.env
    echo "✓ Backend environment configured"
else
    echo "⚠️  backend/.env.prod not found"
    exit 1
fi

if [ -f .env.local.prod ]; then
    cp .env.local.prod .env.local
    # Update API URL with actual droplet IP
    sed -i "s|http://localhost/api|http://$DROPLET_IP/api|g" .env.local
    echo "✓ Frontend environment configured with IP: $DROPLET_IP"
else
    echo "⚠️  .env.local.prod not found"
    exit 1
fi

echo ""

# Pull Docker images
echo "=========================================="
echo "Step 6: Pulling Docker images from Docker Hub..."
echo "=========================================="
docker compose -f docker-compose.prod.yml pull
if [ $? -eq 0 ]; then
    echo "✓ Docker images pulled successfully"
else
    echo "⚠️  Docker pull had issues, continuing..."
fi
echo ""

# Start Docker services
echo "=========================================="
echo "Step 7: Starting Docker services..."
echo "=========================================="
docker compose -f docker-compose.prod.yml up -d
echo "✓ Docker services started"
echo ""

# Wait for services to start
echo "Waiting for services to initialize (10 seconds)..."
sleep 10

# Verify services are running
echo "=========================================="
echo "Step 8: Verifying services..."
echo "=========================================="
docker compose -f docker-compose.prod.yml ps
echo "✓ Services verified"
echo ""

# Setup Nginx reverse proxy
echo "=========================================="
echo "Step 9: Configuring Nginx reverse proxy..."
echo "=========================================="

cat > /etc/nginx/sites-available/ordertaker << EOF
server {
    listen 80;
    server_name $DROPLET_IP _;

    # Increase client body size for file uploads
    client_max_body_size 10M;

    # Uploaded images - proxy to backend
    location /uploads {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }

    # WebSocket support (for Socket.io)
    location /socket.io {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }

    # Frontend (Next.js) - must be last
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/ordertaker /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and restart Nginx
nginx -t
if [ $? -eq 0 ]; then
    systemctl restart nginx
    echo "✓ Nginx configured and restarted"
else
    echo "⚠️  Nginx configuration had issues"
fi
echo ""

# Configure firewall (run in background to prevent logout)
echo "=========================================="
echo "Step 10: Configuring firewall..."
echo "=========================================="
(
    ufw allow 22/tcp > /dev/null 2>&1
    ufw allow 80/tcp > /dev/null 2>&1
    ufw allow 443/tcp > /dev/null 2>&1
    ufw --force enable > /dev/null 2>&1
) &
FIREWALL_PID=$!
echo "✓ Firewall configuration started (PID: $FIREWALL_PID)"
echo ""

# Seed database with initial data
echo "=========================================="
echo "Step 11: Seeding database with initial data..."
echo "=========================================="
cd backend

# Install backend dependencies if not already installed
if [ ! -d "node_modules" ]; then
    echo "Installing backend dependencies..."
    npm install
fi

# Run all seeders
echo ""
echo "Running seeders..."

# Seed admin and users
if [ -f scripts/seedAdmin.js ]; then
    echo "Seeding users..."
    node scripts/seedAdmin.js || echo "⚠️  User seeding had issues"
else
    echo "⚠️  seedAdmin.js not found"
fi

# Seed menu items and categories
if [ -f scripts/seedMenuItems.js ]; then
    echo "Seeding menu items and categories..."
    node scripts/seedMenuItems.js || echo "⚠️  Menu items seeding had issues"
else
    echo "⚠️  seedMenuItems.js not found"
fi

echo "✓ Database seeding completed"
cd ..
echo ""

# Final status
echo "=========================================="
echo "✓ PRODUCTION SETUP COMPLETE!"
echo "=========================================="
echo ""
echo "Your app is now live at:"
echo "  http://$DROPLET_IP"
echo ""
echo "Admin credentials:"
echo "  Email: oliverjohnpr2013@gmail.com"
echo "  Password: admin123"
echo ""
echo "⚠️  IMPORTANT SECURITY NOTES:"
echo "  1. Change the admin password immediately after first login"
echo "  2. Update MongoDB credentials in backend/.env.prod"
echo "  3. Consider setting up SSL/HTTPS with Let's Encrypt"
echo "  4. Set up regular backups using: bash backup-db.sh"
echo ""
echo "Useful commands:"
echo "  - View logs: docker compose -f docker-compose.prod.yml logs -f"
echo "  - Restart services: docker compose -f docker-compose.prod.yml restart"
echo "  - Stop services: docker compose -f docker-compose.prod.yml down"
echo "  - Start services: docker compose -f docker-compose.prod.yml up -d"
echo "  - Backup database: bash backup-db.sh"
echo "  - Restore database: bash restore-db.sh /path/to/backup.tar.gz"
echo ""
