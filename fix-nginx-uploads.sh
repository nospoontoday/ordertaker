#!/bin/bash

# Fix Nginx Configuration for Image Uploads
# Run this on your production server to add /uploads location block

echo "=========================================="
echo "Fixing Nginx Configuration for Image Uploads"
echo "=========================================="
echo ""

# Get droplet IP from server_name or use current
DROPLET_IP=$(grep -oP 'server_name \K[^ ]+' /etc/nginx/sites-available/ordertaker 2>/dev/null | head -1)

if [ -z "$DROPLET_IP" ]; then
    echo "⚠️  Could not detect droplet IP, using _ as fallback"
    DROPLET_IP="_"
fi

echo "Updating Nginx configuration..."
echo "Detected server_name: $DROPLET_IP"
echo ""

# Backup current config
cp /etc/nginx/sites-available/ordertaker /etc/nginx/sites-available/ordertaker.backup.$(date +%Y%m%d_%H%M%S)
echo "✓ Backed up current config"

# Create new configuration with /uploads location
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

# Test Nginx configuration
echo ""
echo "Testing Nginx configuration..."
nginx -t

if [ $? -eq 0 ]; then
    echo "✓ Nginx configuration is valid"
    echo ""
    echo "Reloading Nginx..."
    systemctl reload nginx
    if [ $? -eq 0 ]; then
        echo "✓ Nginx reloaded successfully"
        echo ""
        echo "=========================================="
        echo "✓ Nginx configuration updated!"
        echo "=========================================="
        echo ""
        echo "Image uploads should now work correctly."
        echo "Try uploading a category image again."
    else
        echo "❌ Error reloading Nginx"
        echo "Restoring backup..."
        cp /etc/nginx/sites-available/ordertaker.backup.* /etc/nginx/sites-available/ordertaker 2>/dev/null
        systemctl reload nginx
        exit 1
    fi
else
    echo "❌ Nginx configuration has errors"
    echo "Restoring backup..."
    cp /etc/nginx/sites-available/ordertaker.backup.* /etc/nginx/sites-available/ordertaker 2>/dev/null
    exit 1
fi

echo ""

