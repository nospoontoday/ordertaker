# Production Deployment Guide - Order Taker App

Complete guide for deploying the Order Taker App to DigitalOcean using Docker and Docker Hub.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Deployment Workflow](#deployment-workflow)
4. [Step-by-Step Instructions](#step-by-step-instructions)
5. [Environment Configuration](#environment-configuration)
6. [Backup & Restore](#backup--restore)
7. [Troubleshooting](#troubleshooting)
8. [Maintenance](#maintenance)
9. [Security Considerations](#security-considerations)

---

## Overview

This deployment uses a three-stage process:

1. **Local Machine**: Build Docker images and push to Docker Hub
2. **Docker Hub**: Store and distribute images
3. **DigitalOcean Droplet**: Pull images and run the application

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    DigitalOcean Droplet                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Nginx (Reverse Proxy)                   │  │
│  │         Port 80 → Routes to backend/frontend        │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ↓                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │          Docker Network (ordertaker-network)         │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │                                                      │  │
│  │  ┌─────────────────┐  ┌─────────────────────────┐  │  │
│  │  │  MongoDB        │  │  Backend (Node.js)      │  │  │
│  │  │  Port: 27017    │  │  Port: 5000             │  │  │
│  │  │  (internal)     │  │  (internal)             │  │  │
│  │  └─────────────────┘  └─────────────────────────┘  │  │
│  │                                                      │  │
│  │  ┌──────────────────────────────────────────────┐  │  │
│  │  │  Frontend (Next.js)                          │  │  │
│  │  │  Port: 3000 (internal)                       │  │  │
│  │  └──────────────────────────────────────────────┘  │  │
│  │                                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

### Local Machine
- Docker installed and running
- Docker Hub account (free)
- Git (optional, for cloning the project)
- Bash shell

### DigitalOcean Droplet
- Ubuntu 20.04 LTS or newer
- Minimum 2GB RAM (4GB recommended)
- Minimum 20GB storage
- SSH access to the droplet

---

## Deployment Workflow

### Phase 1: Local Machine (Build & Push)

```bash
# 1. Make the script executable
chmod +x deploy-prod.sh

# 2. Build and push images to Docker Hub
./deploy-prod.sh YOUR_DOCKERHUB_USERNAME

# 3. Optionally, tag with version
./deploy-prod.sh YOUR_DOCKERHUB_USERNAME v1.0.0
```

**What this does:**
- Builds backend Docker image
- Builds frontend Docker image
- Pushes both images to Docker Hub
- Provides next steps for droplet deployment

### Phase 2: DigitalOcean Droplet (Setup & Deploy)

```bash
# 1. SSH into your droplet
ssh root@YOUR_DROPLET_IP

# 2. Clone the project (if not already there)
git clone https://github.com/YOUR_USERNAME/ordertaker.git /opt/ordertakerapp
cd /opt/ordertakerapp

# 3. Make the startup script executable
chmod +x start-prod.sh

# 4. Run the startup script
bash start-prod.sh
```

**What this does:**
- Installs Docker, Docker Compose, Node.js, Nginx
- Pulls Docker images from Docker Hub
- Starts MongoDB, Backend, and Frontend containers
- Configures Nginx as reverse proxy
- Seeds admin user
- Sets up firewall rules

### Phase 3: Access Your App

```
http://YOUR_DROPLET_IP
```

---

## Step-by-Step Instructions

### Step 1: Prepare Local Machine

```bash
# Navigate to project directory
cd /path/to/ordertaker

# Make deploy script executable
chmod +x deploy-prod.sh

# Verify Docker is running
docker --version
docker ps
```

### Step 2: Build and Push Images

```bash
# Login to Docker Hub (if not already logged in)
docker login

# Build and push images
./deploy-prod.sh myusername

# Or with version tag
./deploy-prod.sh myusername v1.0.0
```

**Expected output:**
```
✓ Backend image built successfully
✓ Frontend image built successfully
✓ Backend image pushed successfully
✓ Frontend image pushed successfully
✓ DEPLOYMENT COMPLETE!
```

### Step 3: Prepare DigitalOcean Droplet

```bash
# SSH into droplet
ssh root@YOUR_DROPLET_IP

# Create app directory
mkdir -p /opt/ordertakerapp
cd /opt/ordertakerapp

# Clone or copy your project files
# Option A: Clone from GitHub
git clone https://github.com/YOUR_USERNAME/ordertaker.git .

# Option B: Copy files via rsync (from local machine)
# rsync -avz --exclude 'node_modules' --exclude '.next' . root@YOUR_DROPLET_IP:/opt/ordertakerapp/
```

### Step 4: Update Docker Hub Username

```bash
# On the droplet, update docker-compose.prod.yml
sed -i 's/YOUR_DOCKERHUB_USERNAME/myusername/g' docker-compose.prod.yml

# Verify the change
grep "image:" docker-compose.prod.yml
```

### Step 5: Run Startup Script

```bash
# Make script executable
chmod +x start-prod.sh

# Run the startup script
bash start-prod.sh
```

This will:
- Update system packages
- Install Docker, Docker Compose, Node.js, Nginx
- Pull Docker images
- Start all services
- Configure Nginx
- Seed admin user

### Step 6: Verify Deployment

```bash
# Check if services are running
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs -f

# Test the app
curl http://localhost:3000
curl http://localhost:5000/api/health
```

### Step 7: Access Your App

Open your browser and navigate to:
```
http://YOUR_DROPLET_IP
```

---

## Environment Configuration

### Backend Environment (.env.prod)

Located at: `backend/.env.prod`

```bash
# MongoDB Connection String
MONGODB_URI="mongodb://admin:password123@mongo:27017/ordertaker?authSource=admin"

# Server Port
PORT=5000

# Node Environment
NODE_ENV=production

# Frontend URL (update with your droplet IP or domain)
FRONTEND_URL=http://YOUR_DROPLET_IP
```

**Important:** Update `FRONTEND_URL` with your actual droplet IP or domain.

### Frontend Environment (.env.local.prod)

Located at: `.env.local.prod`

```bash
# Backend API URL (update with your droplet IP or domain)
NEXT_PUBLIC_API_URL=http://YOUR_DROPLET_IP/api
```

**Important:** Update `NEXT_PUBLIC_API_URL` with your actual droplet IP or domain.

### Updating Environment Variables

To update environment variables after deployment:

```bash
# SSH into droplet
ssh root@YOUR_DROPLET_IP
cd /opt/ordertakerapp

# Edit the environment file
nano backend/.env

# Restart services to apply changes
docker compose -f docker-compose.prod.yml restart
```

---

## Backup & Restore

### Creating a Backup

```bash
# Backup to current directory
bash backup-db.sh

# Backup to specific directory
bash backup-db.sh /backups

# Backup with custom naming
bash backup-db.sh /backups/$(date +%Y%m%d)
```

**Output:**
```
Backup file: ./ordertaker_backup_20231115_143022.tar.gz
File size: 2.5M
```

### Restoring from Backup

```bash
# Restore from backup file
bash restore-db.sh ordertaker_backup_20231115_143022.tar.gz

# Restore from specific path
bash restore-db.sh /backups/ordertaker_backup_20231115_143022.tar.gz
```

**Important:** This will overwrite the current database. You'll be prompted to confirm.

### Automated Backups

Set up a cron job for daily backups:

```bash
# SSH into droplet
ssh root@YOUR_DROPLET_IP

# Edit crontab
crontab -e

# Add this line for daily backup at 2 AM
0 2 * * * cd /opt/ordertakerapp && bash backup-db.sh /backups

# Save and exit (Ctrl+X, then Y, then Enter)

# Verify cron job
crontab -l
```

---

## Troubleshooting

### Services Not Starting

```bash
# Check service status
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs -f

# Restart services
docker compose -f docker-compose.prod.yml restart

# Rebuild and restart
docker compose -f docker-compose.prod.yml up -d --force-recreate
```

### MongoDB Connection Issues

```bash
# Check MongoDB logs
docker compose -f docker-compose.prod.yml logs mongo

# Test MongoDB connection
docker exec ordertaker-mongo mongosh \
    --username admin \
    --password password123 \
    --authenticationDatabase admin \
    --eval "db.adminCommand('ping')"
```

### Nginx Not Working

```bash
# Test Nginx configuration
nginx -t

# View Nginx logs
tail -f /var/log/nginx/error.log

# Restart Nginx
systemctl restart nginx

# Check if Nginx is running
systemctl status nginx
```

### Port Already in Use

```bash
# Find process using port 80
lsof -i :80

# Find process using port 3000
lsof -i :3000

# Find process using port 5000
lsof -i :5000

# Kill process (replace PID with actual process ID)
kill -9 PID
```

### Docker Image Pull Fails

```bash
# Verify Docker Hub username in docker-compose.prod.yml
grep "image:" docker-compose.prod.yml

# Manually pull images
docker pull YOUR_DOCKERHUB_USERNAME/ordertaker-backend:latest
docker pull YOUR_DOCKERHUB_USERNAME/ordertaker-app:latest

# Check Docker Hub for image availability
# https://hub.docker.com/r/YOUR_DOCKERHUB_USERNAME/ordertaker-backend
```

### App Not Accessible

```bash
# Check firewall rules
ufw status

# Allow HTTP and HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Check if services are running
docker compose -f docker-compose.prod.yml ps

# Test connectivity
curl http://localhost:3000
curl http://localhost:5000/api/health
```

---

## Maintenance

### Viewing Logs

```bash
# View all service logs
docker compose -f docker-compose.prod.yml logs -f

# View specific service logs
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f app
docker compose -f docker-compose.prod.yml logs -f mongo

# View last 100 lines
docker compose -f docker-compose.prod.yml logs --tail=100
```

### Restarting Services

```bash
# Restart all services
docker compose -f docker-compose.prod.yml restart

# Restart specific service
docker compose -f docker-compose.prod.yml restart backend

# Stop all services
docker compose -f docker-compose.prod.yml down

# Start all services
docker compose -f docker-compose.prod.yml up -d
```

### Updating the Application

```bash
# On local machine, build and push new images
./deploy-prod.sh myusername v1.0.1

# On droplet, pull and restart
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

### Checking Disk Space

```bash
# Check disk usage
df -h

# Check Docker disk usage
docker system df

# Clean up unused Docker resources
docker system prune -a
```

### Monitoring Services

```bash
# Check service status
docker compose -f docker-compose.prod.yml ps

# Check resource usage
docker stats

# Check container details
docker inspect ordertaker-backend
docker inspect ordertaker-app
docker inspect ordertaker-mongo
```

---

## Security Considerations

### ⚠️ Critical Security Tasks

1. **Change Admin Password**
   ```bash
   # Login to app and change password immediately
   # Default: oliverjohnpr2013@gmail.com / admin123
   ```

2. **Update MongoDB Credentials**
   ```bash
   # Edit backend/.env
   nano backend/.env
   
   # Change MONGODB_URI with new credentials
   # Restart services
   docker compose -f docker-compose.prod.yml restart
   ```

3. **Set Up SSL/HTTPS**
   ```bash
   # Install Certbot
   apt install -y certbot python3-certbot-nginx
   
   # Get certificate (replace with your domain)
   certbot --nginx -d yourdomain.com
   
   # Auto-renewal is configured automatically
   ```

4. **Configure Firewall**
   ```bash
   # Current rules
   ufw status
   
   # Only allow necessary ports
   ufw allow 22/tcp    # SSH
   ufw allow 80/tcp    # HTTP
   ufw allow 443/tcp   # HTTPS
   ufw deny incoming
   ufw allow outgoing
   ```

5. **Regular Backups**
   ```bash
   # Set up automated daily backups
   crontab -e
   # Add: 0 2 * * * cd /opt/ordertakerapp && bash backup-db.sh /backups
   ```

### Environment Variables

- Never commit `.env` files to Git
- Use `.env.prod` for production configuration
- Keep sensitive data (passwords, API keys) secure
- Rotate credentials regularly

### MongoDB Security

- Change default credentials in production
- Restrict MongoDB access to internal network only
- Enable authentication (already configured)
- Regular backups and testing restore procedures

### Nginx Security

- Keep Nginx updated
- Use SSL/HTTPS certificates
- Configure security headers
- Enable rate limiting for API endpoints

### System Security

- Keep system packages updated: `apt update && apt upgrade -y`
- Use SSH keys instead of passwords
- Disable root login
- Configure fail2ban for brute-force protection
- Monitor logs regularly

---

## Quick Reference Commands

### Deployment

```bash
# Local: Build and push
./deploy-prod.sh myusername

# Droplet: Initial setup
bash start-prod.sh

# Droplet: Update images
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

### Monitoring

```bash
# View logs
docker compose -f docker-compose.prod.yml logs -f

# Check status
docker compose -f docker-compose.prod.yml ps

# Check resources
docker stats
```

### Backup & Restore

```bash
# Backup
bash backup-db.sh /backups

# Restore
bash restore-db.sh /backups/ordertaker_backup_*.tar.gz
```

### Maintenance

```bash
# Restart services
docker compose -f docker-compose.prod.yml restart

# Stop services
docker compose -f docker-compose.prod.yml down

# Start services
docker compose -f docker-compose.prod.yml up -d

# View specific logs
docker compose -f docker-compose.prod.yml logs -f backend
```

---

## Support & Troubleshooting

For issues or questions:

1. Check logs: `docker compose -f docker-compose.prod.yml logs -f`
2. Review this guide's Troubleshooting section
3. Check DigitalOcean documentation
4. Review Docker documentation

---

## Version History

- **v1.0.0** - Initial production deployment guide
  - Docker-based deployment
  - MongoDB backup/restore
  - Nginx reverse proxy
  - Automated setup script

---

**Last Updated:** November 2024
