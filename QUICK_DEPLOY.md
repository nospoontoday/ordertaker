# Quick Deployment Checklist (IP Address Only)

Quick reference for deploying to DigitalOcean droplet using IP address.

## Prerequisites
- DigitalOcean droplet (Ubuntu 22.04 LTS)
- Your droplet's IP address (e.g., `167.99.123.45`)

---

## Step-by-Step Commands

### 1. Connect to Droplet
```bash
ssh root@YOUR_DROPLET_IP
```

### 2. Install Required Software
```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install Docker & Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
apt install -y docker-compose-plugin
apt install -y nginx git
```

### 3. Clone Repository
```bash
cd /opt
git clone https://github.com/YOUR_USERNAME/ordertakerapp.git
cd ordertakerapp
```

### 4. Configure Backend Environment
```bash
cd backend
nano .env
```

**Add:**
```env
MONGODB_URI=mongodb://admin:password123@mongo:27017/ordertaker?authSource=admin
PORT=5000
NODE_ENV=production
FRONTEND_URL=http://YOUR_DROPLET_IP
```
*(Replace `YOUR_DROPLET_IP` with your actual IP)*

### 5. Configure Frontend Environment
```bash
cd /opt/ordertakerapp
nano .env.local
```

**Add:**
```env
NEXT_PUBLIC_API_URL=http://YOUR_DROPLET_IP/api
NEXT_PUBLIC_WS_URL=ws://YOUR_DROPLET_IP:5000
```
*(Replace `YOUR_DROPLET_IP` with your actual IP)*

### 6. Build Frontend
```bash
cd /opt/ordertakerapp
npm install
npm run build
```

### 7. Start Docker Services
```bash
docker compose -f docker-compose.prod.yml up -d
```

### 8. Configure Nginx
```bash
nano /etc/nginx/sites-available/ordertaker
```

**Paste this (replace `YOUR_DROPLET_IP`):**
```nginx
server {
    listen 80;
    server_name YOUR_DROPLET_IP;
    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /socket.io {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Enable Nginx:**
```bash
ln -s /etc/nginx/sites-available/ordertaker /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
```

### 9. Configure Firewall
```bash
ufw allow 80/tcp
ufw allow 22/tcp
ufw enable
```

### 10. Seed Admin User
```bash
docker exec ordertaker-backend node scripts/seedAdmin.js
```

### 11. Access Your App
Open browser: `http://YOUR_DROPLET_IP`

---

## Quick Commands Reference

```bash
# Check services
docker ps

# View logs
docker compose -f docker-compose.prod.yml logs -f

# Restart services
docker compose -f docker-compose.prod.yml restart

# Stop services
docker compose -f docker-compose.prod.yml down

# Start services
docker compose -f docker-compose.prod.yml up -d

# Update app
cd /opt/ordertakerapp
git pull
npm install
npm run build
docker compose -f docker-compose.prod.yml restart
```

---

## Troubleshooting

**Can't access app?**
```bash
# Check if containers are running
docker ps

# Check Nginx
systemctl status nginx

# Check logs
docker compose -f docker-compose.prod.yml logs
tail -f /var/log/nginx/error.log
```

**API not working?**
- Verify `.env.local` has: `NEXT_PUBLIC_API_URL=http://YOUR_DROPLET_IP/api`
- Rebuild: `npm run build`
- Restart: `docker compose -f docker-compose.prod.yml restart`

---

See `DEPLOYMENT_IP_ONLY.md` for detailed instructions.

