# Deployment Guide for DigitalOcean Droplet

This guide will help you deploy the Order Taker app to a DigitalOcean droplet accessible via IP address.

## Prerequisites

- DigitalOcean droplet (Ubuntu 20.04 or later recommended)
- SSH access to your droplet
- Basic Linux knowledge

## Step 1: Initial Server Setup

### Connect to your droplet:
```bash
ssh root@YOUR_DROPLET_IP
```

### Update system packages:
```bash
apt update && apt upgrade -y
```

### Install required software:
```bash
# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install -y docker-compose

# Install Nginx (reverse proxy)
apt install -y nginx

# Install PM2 (process manager for Node.js)
npm install -g pm2

# Verify installations
node --version
docker --version
docker-compose --version
nginx -v
pm2 --version
```

## Step 2: Clone Your Repository

```bash
# Install git if not installed
apt install -y git

# Navigate to a directory for your apps
cd /opt

# Clone your repository (replace with your actual repo URL)
git clone https://github.com/YOUR_USERNAME/ordertakerapp.git
cd ordertakerapp

# Or if you're using SSH:
# git clone git@github.com:YOUR_USERNAME/ordertakerapp.git
```

## Step 3: Configure Environment Variables

### Backend Environment:
```bash
cd /opt/ordertakerapp/backend
cp .env .env.production

# Edit backend .env file
nano .env
```

Update the `.env` file with production settings:
```env
# MongoDB Connection String (using docker service name or localhost)
MONGODB_URI=mongodb://admin:password123@mongo:27017/ordertaker?authSource=admin

# Server Port
PORT=5000

# Node Environment
NODE_ENV=production

# Replace password123 with a strong password!
```

### Frontend Environment:
```bash
cd /opt/ordertakerapp

# Create .env.local for production
nano .env.local
```

Add this content:
```env
# Use your droplet IP instead of localhost
NEXT_PUBLIC_API_URL=http://YOUR_DROPLET_IP:5000/api
```

**Important**: Replace `YOUR_DROPLET_IP` with your actual droplet IP address.

## Step 4: Build Frontend

```bash
cd /opt/ordertakerapp

# Install dependencies
npm install

# Build Next.js app for production
npm run build
```

## Step 5: Start Services with Docker Compose

```bash
cd /opt/ordertakerapp

# Use production docker-compose
docker-compose -f docker-compose.prod.yml up -d
```

This will start:
- MongoDB on port 27017
- Backend API on port 5000
- Frontend (Next.js) will be served via Nginx on port 80

## Step 6: Configure Nginx as Reverse Proxy

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/ordertaker
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name YOUR_DROPLET_IP;

    # Frontend (Next.js)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # WebSocket support (for Socket.io)
    location /socket.io {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

**Replace `YOUR_DROPLET_IP` with your actual IP address.**

### Enable the site and restart Nginx:
```bash
# Create symlink
ln -s /etc/nginx/sites-available/ordertaker /etc/nginx/sites-enabled/

# Remove default site (optional)
rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

# Restart Nginx
systemctl restart nginx
```

## Step 7: Configure Firewall

```bash
# Allow HTTP (port 80) and HTTPS (port 443) if needed
ufw allow 80/tcp
ufw allow 443/tcp

# Enable firewall
ufw enable

# Check status
ufw status
```

## Step 8: Seed Admin User

```bash
cd /opt/ordertakerapp/backend
node scripts/seedAdmin.js
```

This will create a super admin user:
- Email: `oliverjohnpr2013@gmail.com`
- Password: `admin123`

**Change the password immediately after first login!**

## Step 9: Access Your App

Open your browser and navigate to:
```
http://YOUR_DROPLET_IP
```

You should see your Order Taker app!

## Alternative: Using PM2 Instead of Docker

If you prefer not to use Docker for the Node.js services:

### Start Backend with PM2:
```bash
cd /opt/ordertakerapp/backend
pm2 start server.js --name ordertaker-backend
pm2 save
pm2 startup  # Follow instructions to enable auto-start on reboot
```

### Start Frontend with PM2:
```bash
cd /opt/ordertakerapp
pm2 start npm --name "ordertaker-frontend" -- start
pm2 save
```

## Useful Commands

### View running containers:
```bash
docker ps
```

### View logs:
```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f app
```

### Restart services:
```bash
docker-compose -f docker-compose.prod.yml restart
```

### Stop services:
```bash
docker-compose -f docker-compose.prod.yml down
```

### Start services:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Update your app:
```bash
cd /opt/ordertakerapp
git pull origin main
npm install
cd backend && npm install
cd ..
npm run build
docker-compose -f docker-compose.prod.yml restart
```

## Troubleshooting

### Check if ports are in use:
```bash
netstat -tulpn | grep LISTEN
```

### Check Nginx logs:
```bash
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log
```

### Check Docker logs:
```bash
docker-compose -f docker-compose.prod.yml logs
```

### Restart all services:
```bash
systemctl restart nginx
docker-compose -f docker-compose.prod.yml restart
```

## Security Notes

1. **Change default passwords** - Especially MongoDB password
2. **Configure firewall** - Only open necessary ports
3. **Use HTTPS** - Consider setting up Let's Encrypt even for internal use
4. **Regular updates** - Keep your server updated
5. **Backup MongoDB** - Set up regular database backups

## Quick Backup Script

Create a backup script:
```bash
nano /opt/ordertakerapp/backup.sh
```

Add:
```bash
#!/bin/bash
BACKUP_DIR="/opt/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
docker exec ordertaker-mongo mongodump --archive=$BACKUP_DIR/ordertaker_$DATE.archive --db=ordertaker
```

Make it executable:
```bash
chmod +x /opt/ordertakerapp/backup.sh
```

Add to crontab for daily backups:
```bash
crontab -e
# Add this line for daily backup at 2 AM:
0 2 * * * /opt/ordertakerapp/backup.sh
```

