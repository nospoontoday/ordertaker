#!/bin/bash

# Setup script to run on DigitalOcean Droplet
# This sets up the server and deploys the app

set -e

echo "=========================================="
echo "Setting up DigitalOcean Droplet"
echo "=========================================="

# Get droplet IP
DROPLET_IP=$(curl -s ifconfig.me || hostname -I | awk '{print $1}')

echo "Detected IP: $DROPLET_IP"

# Update system
echo ""
echo "Updating system packages..."
apt update && apt upgrade -y

# Install required software
echo ""
echo "Installing required software..."
apt install -y curl git nginx

# Install Node.js 20.x
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi

# Install Docker
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
fi

# Install Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "Installing Docker Compose..."
    apt install -y docker-compose
fi

echo ""
echo "Verifying installations..."
echo "Node.js: $(node --version)"
echo "Docker: $(docker --version)"
echo "Docker Compose: $(docker-compose --version)"
echo "Nginx: $(nginx -v 2>&1 | head -n1)"

# Navigate to app directory
cd /opt/ordertakerapp

# Build frontend
echo ""
echo "Building frontend..."
npm install
npm run build

# Update .env.local if needed
if [ ! -f .env.local ]; then
    echo "Creating .env.local..."
    cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://$DROPLET_IP/api
EOF
fi

# Start Docker services
echo ""
echo "Starting Docker services..."
docker-compose -f docker-compose.prod.yml up -d --build

# Wait a bit for services to start
echo "Waiting for services to start..."
sleep 10

# Setup Nginx
echo ""
echo "Setting up Nginx..."

# Create Nginx configuration
cat > /etc/nginx/sites-available/ordertaker << EOF
server {
    listen 80;
    server_name $DROPLET_IP _;

    # Frontend (Next.js)
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
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/ordertaker /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and restart Nginx
nginx -t
systemctl restart nginx

# Configure firewall
echo ""
echo "Configuring firewall..."
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Seed admin user
echo ""
echo "Seeding admin user..."
cd backend
if [ -f scripts/seedAdmin.js ]; then
    node scripts/seedAdmin.js || echo "⚠️  Could not seed admin (may already exist)"
fi

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Your app should be accessible at:"
echo "http://$DROPLET_IP"
echo ""
echo "Admin credentials:"
echo "Email: oliverjohnpr2013@gmail.com"
echo "Password: admin123"
echo ""
echo "⚠️  IMPORTANT: Change the admin password after first login!"
echo ""
echo "Useful commands:"
echo "  - View logs: docker-compose -f docker-compose.prod.yml logs -f"
echo "  - Restart: docker-compose -f docker-compose.prod.yml restart"
echo "  - Stop: docker-compose -f docker-compose.prod.yml down"
echo "  - Start: docker-compose -f docker-compose.prod.yml up -d"
echo ""

