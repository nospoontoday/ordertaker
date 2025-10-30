# Deployment Guide: Docker Hub Method (IP Address Only)

Quick reference guide for deploying using Docker Hub workflow.

## Workflow Overview

```
Local Machine                    Docker Hub                  Droplet
     |                               |                         |
     |-- Build Images --------------->|                         |
     |-- Push Images ----------------->|                         |
     |                                 |<-- Pull Images --------|
     |                                 |                         |
     |                                 |-- Deploy with Compose -|
```

---

## Part 1: Local Setup (Build & Push)

### Step 1: Login to Docker Hub

```bash
docker login
```

Enter your Docker Hub credentials.

### Step 2: Build and Push Images

**Quick method (using script):**
```bash
cd /path/to/ordertakerapp
chmod +x build-and-push.sh
./build-and-push.sh YOUR_DOCKERHUB_USERNAME
```

**Manual method:**
```bash
cd /path/to/ordertakerapp

# Build backend
cd backend
docker build -t YOUR_DOCKERHUB_USERNAME/ordertaker-backend:latest .
docker push YOUR_DOCKERHUB_USERNAME/ordertaker-backend:latest
cd ..

# Build frontend
docker build -t YOUR_DOCKERHUB_USERNAME/ordertaker-app:latest .
docker push YOUR_DOCKERHUB_USERNAME/ordertaker-app:latest
```

### Step 3: Verify on Docker Hub

Visit https://hub.docker.com and confirm:
- `YOUR_DOCKERHUB_USERNAME/ordertaker-backend:latest`
- `YOUR_DOCKERHUB_USERNAME/ordertaker-app:latest`

---

## Part 2: Droplet Setup (Deploy)

### Step 1: Initial Server Setup

```bash
# Connect to droplet
ssh root@YOUR_DROPLET_IP

# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
apt install -y docker-compose-plugin nginx git
```

### Step 2: Get Configuration Files

```bash
cd /opt
git clone https://github.com/YOUR_USERNAME/ordertakerapp.git
cd ordertakerapp
```

### Step 3: Configure Environment Variables

**Backend `.env`:**
```bash
cd backend
nano .env
```

```env
MONGODB_URI=mongodb://admin:password123@mongo:27017/ordertaker?authSource=admin
PORT=5000
NODE_ENV=production
FRONTEND_URL=http://YOUR_DROPLET_IP
```

**Frontend `.env.local`:**
```bash
cd /opt/ordertakerapp
nano .env.local
```

```env
NEXT_PUBLIC_API_URL=http://YOUR_DROPLET_IP/api
NEXT_PUBLIC_WS_URL=ws://YOUR_DROPLET_IP:5000
```

### Step 4: Update Docker Compose

```bash
nano docker-compose.prod.yml
```

**Update image names:**
```yaml
backend:
  image: YOUR_DOCKERHUB_USERNAME/ordertaker-backend:latest  # Change this

app:
  image: YOUR_DOCKERHUB_USERNAME/ordertaker-app:latest  # Change this
```

### Step 5: Pull and Deploy

```bash
# Login to Docker Hub (if images are private)
docker login

# Pull latest images
docker compose -f docker-compose.prod.yml pull

# Start services
docker compose -f docker-compose.prod.yml up -d
```

### Step 6: Configure Nginx

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
    }

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

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

**Enable Nginx:**
```bash
ln -s /etc/nginx/sites-available/ordertaker /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
```

### Step 7: Configure Firewall

```bash
ufw allow 80/tcp
ufw allow 22/tcp
ufw enable
```

### Step 8: Seed Admin User

```bash
docker exec ordertaker-backend node scripts/seedAdmin.js
```

### Step 9: Access App

Open browser: `http://YOUR_DROPLET_IP`

---

## Updating Your App

**When you make code changes:**

1. **On local machine:**
   ```bash
   ./build-and-push.sh YOUR_DOCKERHUB_USERNAME
   ```

2. **On droplet:**
   ```bash
   docker compose -f docker-compose.prod.yml pull
   docker compose -f docker-compose.prod.yml up -d
   ```

---

## Benefits of This Approach

✅ **No build tools needed on droplet** - Node.js, npm not required
✅ **Faster deployments** - Just pull images, no building
✅ **Version control** - Tag images with versions
✅ **Rollback easy** - Use different image tags
✅ **Consistent builds** - Same image used everywhere

