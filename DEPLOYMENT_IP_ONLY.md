# Deployment Guide: DigitalOcean Droplet (IP Address Only) - Docker Hub Method

Complete step-by-step guide to deploy the Order Taker app on a DigitalOcean droplet using Docker Hub and IP address only (no domain required).

## Prerequisites

- DigitalOcean account with a droplet created
- SSH access to your droplet
- Your droplet's IP address (e.g., `167.99.123.45`)
- Docker Hub account (free account is fine)
- Docker installed on your local machine
- Basic knowledge of Linux commands

---

## Overview

This deployment uses Docker Hub for image distribution:
1. **Local Machine**: Build Docker images and push to Docker Hub
2. **Droplet**: Pull images from Docker Hub and deploy with docker-compose

---

## Part A: Build and Push Images Locally (On Your Local Machine)

### Step 1: Login to Docker Hub

On your **local machine**, login to Docker Hub:

```bash
docker login
```

Enter your Docker Hub username and password.

### Step 2: Build and Push Images

**Option A: Using the build script (Recommended)**

```bash
cd /path/to/ordertakerapp
chmod +x build-and-push.sh
./build-and-push.sh YOUR_DOCKERHUB_USERNAME
```

**Example:**
```bash
./build-and-push.sh johndoe
```

**Option B: Manual build and push**

```bash
cd /path/to/ordertakerapp

# Build and tag backend image
cd backend
docker build -t YOUR_DOCKERHUB_USERNAME/ordertaker-backend:latest .
docker push YOUR_DOCKERHUB_USERNAME/ordertaker-backend:latest
cd ..

# Build and tag frontend image
docker build -t YOUR_DOCKERHUB_USERNAME/ordertaker-app:latest .
docker push YOUR_DOCKERHUB_USERNAME/ordertaker-app:latest
```

**Replace `YOUR_DOCKERHUB_USERNAME` with your Docker Hub username.**

**Example:**
```bash
# If your Docker Hub username is "johndoe"
docker build -t johndoe/ordertaker-backend:latest ./backend
docker push johndoe/ordertaker-backend:latest

docker build -t johndoe/ordertaker-app:latest .
docker push johndoe/ordertaker-app:latest
```

### Step 3: Verify Images on Docker Hub

Visit https://hub.docker.com and verify your images are uploaded:
- `YOUR_DOCKERHUB_USERNAME/ordertaker-backend:latest`
- `YOUR_DOCKERHUB_USERNAME/ordertaker-app:latest`

---

## Part B: Deploy on Droplet (On Your Droplet)

### Step 1: Create and Access Your Droplet

### 1.1 Create Droplet on DigitalOcean

1. Log in to [DigitalOcean](https://cloud.digitalocean.com)
2. Click **"Create"** → **"Droplets"**
3. Choose:
   - **Image**: Ubuntu 22.04 LTS (recommended)
   - **Plan**: Basic ($6/month minimum recommended)
   - **Region**: Choose closest to your users
   - **Authentication**: SSH keys (recommended) or root password
4. Click **"Create Droplet"**
5. Wait for droplet to be created (1-2 minutes)
6. **Note your droplet's IP address** (displayed on dashboard)

### 1.2 Connect to Your Droplet

```bash
ssh root@YOUR_DROPLET_IP
```

**Example:**
```bash
ssh root@167.99.123.45
```

If using SSH keys, you may need:
```bash
ssh -i /path/to/your/private_key root@YOUR_DROPLET_IP
```

---

## Step 2: Initial Server Setup

### 2.1 Update System Packages

```bash
apt update && apt upgrade -y
```

### 2.2 Install Required Software

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
usermod -aG docker root

# Install Docker Compose v2
apt install -y docker-compose-plugin

# Install Nginx (reverse proxy)
apt install -y nginx

# Install Git (for cloning repo - only needed for config files)
apt install -y git

# Verify installations
docker --version  # Should show Docker version
docker compose version  # Should show Docker Compose version
nginx -v         # Should show nginx version
```

**Note**: Node.js is NOT needed on the droplet since we're using Docker images!

---

## Step 3: Clone Repository (For Config Files Only)

We only need the configuration files from the repository, not the full codebase:

```bash
# Navigate to a directory for your apps
cd /opt

# Clone your repository (we only need docker-compose and env files)
git clone https://github.com/YOUR_USERNAME/ordertakerapp.git

# Navigate into the project
cd ordertakerapp
```

**Alternative: Create minimal project structure**

If you prefer not to clone the entire repo, you can create a minimal structure:

```bash
mkdir -p /opt/ordertakerapp/backend
cd /opt/ordertakerapp

# You'll manually create the needed config files (see steps below)
```

---

## Step 4: Configure Environment Variables

### 4.1 Backend Environment (.env)

```bash
cd /opt/ordertakerapp/backend

# Create .env file if it doesn't exist
nano .env
```

Add the following content (replace `YOUR_DROPLET_IP` with your actual IP):

```env
# MongoDB Connection (using docker service name)
MONGODB_URI=mongodb://admin:password123@mongo:27017/ordertaker?authSource=admin

# Server Port
PORT=5000

# Node Environment
NODE_ENV=production

# Frontend URL (use your droplet IP)
FRONTEND_URL=http://YOUR_DROPLET_IP
```

**Important**: 
- Replace `YOUR_DROPLET_IP` with your actual droplet IP (e.g., `167.99.123.45`)
- Change `password123` to a strong MongoDB password!
- Save with `Ctrl+O`, then `Enter`, then `Ctrl+X`

### 4.2 Frontend Environment (.env.local)

```bash
cd /opt/ordertakerapp

# Create .env.local file
nano .env.local
```

Add this content (replace `YOUR_DROPLET_IP` with your actual IP):

```env
# Backend API URL (use your droplet IP)
NEXT_PUBLIC_API_URL=http://YOUR_DROPLET_IP/api

# WebSocket URL (for real-time updates)
NEXT_PUBLIC_WS_URL=ws://YOUR_DROPLET_IP:5000
```

**Important**: Replace `YOUR_DROPLET_IP` with your actual droplet IP in both places.

Save with `Ctrl+O`, then `Enter`, then `Ctrl+X`.

---

## Step 5: Update Docker Compose to Use Your Docker Hub Images

**⚠️ Important**: Update `docker-compose.prod.yml` to use your Docker Hub images:

```bash
cd /opt/ordertakerapp

# Edit docker-compose.prod.yml
nano docker-compose.prod.yml
```

**Replace `YOUR_DOCKERHUB_USERNAME`** with your actual Docker Hub username in both:
- `backend` service: `image: YOUR_DOCKERHUB_USERNAME/ordertaker-backend:latest`
- `app` service: `image: YOUR_DOCKERHUB_USERNAME/ordertaker-app:latest`

**Example** (if your Docker Hub username is "johndoe"):
```yaml
backend:
  image: johndoe/ordertaker-backend:latest
  # ... rest of config

app:
  image: johndoe/ordertaker-app:latest
  # ... rest of config
```

Save with `Ctrl+O`, then `Enter`, then `Ctrl+X`.

---

## Step 6: Login to Docker Hub on Droplet

```bash
# Login to Docker Hub to pull private images (if your images are private)
docker login

# If your images are public, you can skip this step
```

**Note**: If your Docker Hub images are **public**, you don't need to login.

---

## Step 7: Pull Images and Start Services

```bash
cd /opt/ordertakerapp

# Pull latest images from Docker Hub
docker compose -f docker-compose.prod.yml pull

# Start all services
docker compose -f docker-compose.prod.yml up -d
```

This will start:
- **MongoDB** on port 27017 (internal only)
- **Backend API** on port 5000 (internal only, accessed via Nginx)
- **Frontend (Next.js)** on port 3000 (internal only, accessed via Nginx)

**Verify services are running:**
```bash
docker ps
```

You should see 3 containers running:
- `ordertaker-mongo`
- `ordertaker-backend`
- `ordertaker-app`

---

## Step 8: Configure Nginx Reverse Proxy

### 8.1 Create Nginx Configuration

```bash
# Create Nginx configuration file
nano /etc/nginx/sites-available/ordertaker
```

Add this configuration (replace `YOUR_DROPLET_IP` with your actual IP):

```nginx
server {
    listen 80;
    server_name YOUR_DROPLET_IP;

    # Increase client body size for file uploads
    client_max_body_size 10M;

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
        proxy_set_header X-Forwarded-Proto $scheme;
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
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket support (for Socket.io real-time updates)
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

**Important**: Replace `YOUR_DROPLET_IP` with your actual droplet IP address.

Save with `Ctrl+O`, then `Enter`, then `Ctrl+X`.

### 8.2 Enable Nginx Site

```bash
# Create symlink to enable the site
ln -s /etc/nginx/sites-available/ordertaker /etc/nginx/sites-enabled/

# Remove default Nginx site (optional)
rm /etc/nginx/sites-enabled/default

# Test Nginx configuration for errors
nginx -t

# If test passes, restart Nginx
systemctl restart nginx

# Enable Nginx to start on boot
systemctl enable nginx
```

---

## Step 9: Configure Firewall

```bash
# Allow HTTP (port 80) - required for web access
ufw allow 80/tcp

# Allow HTTPS (port 443) - optional for future SSL setup
ufw allow 443/tcp

# Allow SSH (port 22) - keep your SSH access
ufw allow 22/tcp

# Enable firewall
ufw enable

# Check firewall status
ufw status
```

---

## Step 10: Seed Admin User

```bash
cd /opt/ordertakerapp/backend

# Run the seed script inside the Docker container
docker exec ordertaker-backend node scripts/seedAdmin.js
```

Or if running backend directly (not in Docker):
```bash
cd /opt/ordertakerapp/backend
node scripts/seedAdmin.js
```

This creates the default admin user:
- **Email**: `oliverjohnpr2013@gmail.com`
- **Password**: `123456` (check seedAdmin.js for actual password)

**⚠️ Important**: Change the admin password immediately after first login!

---

## Step 11: Access Your App

Open your web browser and navigate to:

```
http://YOUR_DROPLET_IP
```

**Example:**
```
http://167.99.123.45
```

You should see the login page!

**Default Admin Credentials:**
- Email: `oliverjohnpr2013@gmail.com`
- Password: Check `backend/scripts/seedAdmin.js` for the default password

---

## Step 12: Verify Everything is Working

### 12.1 Check Services Status

```bash
# Check Docker containers
docker ps

# Check Nginx status
systemctl status nginx

# Check if ports are listening
netstat -tulpn | grep LISTEN
```

You should see:
- Port 80: Nginx listening
- Port 3000: Next.js app (internal)
- Port 5000: Backend API (internal)
- Port 27017: MongoDB (internal)

### 12.2 Test API Endpoint

From your local machine, test the API:
```bash
curl http://YOUR_DROPLET_IP/api/health
```

Should return a JSON response with status.

### 12.3 Check Logs

```bash
# View all service logs
docker compose -f docker-compose.prod.yml logs -f

# View specific service logs
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f app
docker compose -f docker-compose.prod.yml logs -f mongo

# View Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

---

## Common Commands Reference

### Start Services
```bash
cd /opt/ordertakerapp
docker compose -f docker-compose.prod.yml up -d
```

### Stop Services
```bash
cd /opt/ordertakerapp
docker compose -f docker-compose.prod.yml down
```

### Restart Services
```bash
cd /opt/ordertakerapp
docker compose -f docker-compose.prod.yml restart
```

### View Logs
```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f app
```

### Update Your App

**On your local machine:**
```bash
cd /path/to/ordertakerapp

# Make your code changes
# ... edit files ...

# Build and push new images
./build-and-push.sh YOUR_DOCKERHUB_USERNAME

# Or tag with a version
./build-and-push.sh YOUR_DOCKERHUB_USERNAME v1.0.1
```

**On your droplet:**
```bash
cd /opt/ordertakerapp

# Pull latest images from Docker Hub
docker compose -f docker-compose.prod.yml pull

# Restart containers with new images
docker compose -f docker-compose.prod.yml up -d
```

---

## Troubleshooting

### Issue: Can't access the app in browser

**Check:**
```bash
# 1. Check if Nginx is running
systemctl status nginx

# 2. Check if containers are running
docker ps

# 3. Check Nginx error logs
tail -f /var/log/nginx/error.log

# 4. Check if port 80 is open
ufw status
netstat -tulpn | grep 80
```

**Fix:**
```bash
# Restart Nginx
systemctl restart nginx

# Restart Docker containers
cd /opt/ordertakerapp
docker compose -f docker-compose.prod.yml restart
```

### Issue: API calls failing

**Check:**
```bash
# Check backend logs
docker compose -f docker-compose.prod.yml logs backend

# Check if backend is accessible
curl http://localhost:5000/api/health
```

**Fix:**
- Verify `.env.local` has correct `NEXT_PUBLIC_API_URL=http://YOUR_DROPLET_IP/api`
- Restart containers: `docker compose -f docker-compose.prod.yml restart app`
- Or pull latest image: `docker compose -f docker-compose.prod.yml pull app && docker compose -f docker-compose.prod.yml up -d app`

### Issue: MongoDB connection errors

**Check:**
```bash
# Check MongoDB logs
docker compose -f docker-compose.prod.yml logs mongo

# Check if MongoDB is accessible from backend container
docker exec ordertaker-backend ping mongo
```

**Fix:**
- Verify `MONGODB_URI` in `backend/.env` matches docker-compose password
- Restart MongoDB: `docker compose -f docker-compose.prod.yml restart mongo`

### Issue: Port already in use

**Check:**
```bash
# See what's using the ports
netstat -tulpn | grep LISTEN
```

**Fix:**
- Stop conflicting services or change ports in docker-compose.prod.yml

---

## Security Recommendations

1. **Change Default Passwords**
   - MongoDB password in `backend/.env` and `docker-compose.prod.yml`
   - Default admin password after first login

2. **Configure Firewall**
   - Only open ports 22 (SSH), 80 (HTTP), and 443 (HTTPS if using SSL)
   - Keep MongoDB port 27017 internal only (not exposed)

3. **Regular Updates**
   ```bash
   apt update && apt upgrade -y
   ```

4. **Enable Automatic Security Updates**
   ```bash
   apt install -y unattended-upgrades
   dpkg-reconfigure -plow unattended-upgrades
   ```

5. **Consider Adding SSL** (even for IP access)
   - Use Let's Encrypt with Certbot
   - Or use Cloudflare for free SSL

---

## Quick Deployment Checklist

**Part A: Local Build & Push**
- [ ] Docker Hub account created
- [ ] Logged into Docker Hub on local machine (`docker login`)
- [ ] Built backend image and pushed to Docker Hub
- [ ] Built frontend image and pushed to Docker Hub
- [ ] Verified images on Docker Hub

**Part B: Droplet Deployment**
- [ ] DigitalOcean droplet created and IP noted
- [ ] SSH access to droplet working
- [ ] System updated (`apt update && apt upgrade`)
- [ ] Docker, Docker Compose, Nginx installed
- [ ] Repository cloned or files uploaded to `/opt/ordertakerapp`
- [ ] Backend `.env` configured with correct IP
- [ ] Frontend `.env.local` configured with correct IP
- [ ] `docker-compose.prod.yml` updated with Docker Hub username
- [ ] Logged into Docker Hub on droplet (if images are private)
- [ ] Docker images pulled from Docker Hub (`docker compose -f docker-compose.prod.yml pull`)
- [ ] Docker containers started
- [ ] Nginx configured and restarted
- [ ] Firewall configured (port 80 open)
- [ ] Admin user seeded
- [ ] App accessible at `http://YOUR_DROPLET_IP`
- [ ] Login works with seeded admin credentials

---

## Support

If you encounter issues:

1. Check service logs: `docker compose -f docker-compose.prod.yml logs`
2. Check Nginx logs: `tail -f /var/log/nginx/error.log`
3. Verify all environment variables are set correctly
4. Ensure firewall allows port 80
5. Check DigitalOcean firewall settings (if enabled)

---

## Next Steps (Optional)

1. **Set up automatic backups** for MongoDB
2. **Configure monitoring** (optional)
3. **Set up SSL certificate** for HTTPS access
4. **Configure domain** (if you get one later)
5. **Set up CI/CD** for automated deployments

