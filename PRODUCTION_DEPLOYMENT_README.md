# 🚀 Production Deployment Guide

Complete production deployment setup for Order Taker App on DigitalOcean.

## 📖 Quick Navigation

**New to this deployment?** Start here:
1. Read this file (you are here)
2. Follow [`PROD_QUICKSTART.md`](PROD_QUICKSTART.md) for fast deployment
3. Use [`DEPLOYMENT_CHECKLIST.md`](DEPLOYMENT_CHECKLIST.md) to track progress

**Need detailed information?**
- See [`PROD_DEPLOYMENT.md`](PROD_DEPLOYMENT.md) for comprehensive guide
- See [`DEPLOYMENT_SUMMARY.md`](DEPLOYMENT_SUMMARY.md) for file overview

---

## 🎯 What You'll Get

After following this guide, you'll have:

✅ **Automated Deployment** - Single command to build and push images  
✅ **Automated Setup** - Single command to configure entire server  
✅ **Automated Backups** - Daily MongoDB backups with restore capability  
✅ **Production Ready** - Nginx reverse proxy, firewall, SSL-ready  
✅ **Scalable** - Easy to update and redeploy  
✅ **Secure** - Environment variables, internal networking, firewall rules  

---

## 📋 Prerequisites

### Local Machine
- ✅ Docker installed (`docker --version`)
- ✅ Docker Hub account (free at https://hub.docker.com)
- ✅ Git (optional, for cloning)

### DigitalOcean Droplet
- ✅ Ubuntu 20.04 LTS or newer
- ✅ Minimum 2GB RAM (4GB recommended)
- ✅ Minimum 20GB storage
- ✅ SSH access

---

## 🚀 3-Step Deployment

### Step 1️⃣: Build & Push (Local Machine) - 5-10 minutes

```bash
# Navigate to project directory
cd /path/to/ordertaker

# Make script executable
chmod +x deploy-prod.sh

# Build and push to Docker Hub
./deploy-prod.sh YOUR_DOCKERHUB_USERNAME
```

**What happens:**
- Builds backend Docker image
- Builds frontend Docker image
- Pushes both to Docker Hub

**Next:** Go to Step 2

---

### Step 2️⃣: Setup Server (DigitalOcean) - 5-10 minutes

```bash
# SSH into your droplet
ssh root@YOUR_DROPLET_IP

# Clone project (or copy files)
git clone https://github.com/YOUR_USERNAME/ordertaker.git /opt/ordertakerapp
cd /opt/ordertakerapp

# Make script executable
chmod +x start-prod.sh

# Run setup
bash start-prod.sh
```

**What happens:**
- Installs Docker, Node.js, Nginx
- Pulls images from Docker Hub
- Starts all services
- Configures reverse proxy
- Seeds admin user

**Next:** Go to Step 3

---

### Step 3️⃣: Access Your App - 1 minute

Open your browser:
```
http://YOUR_DROPLET_IP
```

**Login with:**
- Email: `oliverjohnpr2013@gmail.com`
- Password: `admin123`

⚠️ **Change password immediately!**

---

## 📁 Files Created

| File | Purpose | Run On |
|------|---------|--------|
| [`deploy-prod.sh`](deploy-prod.sh) | Build & push images | Local machine |
| [`start-prod.sh`](start-prod.sh) | Setup & deploy server | DigitalOcean droplet |
| [`backup-db.sh`](backup-db.sh) | Backup MongoDB | DigitalOcean droplet |
| [`restore-db.sh`](restore-db.sh) | Restore MongoDB | DigitalOcean droplet |
| [`backend/.env.prod`](backend/.env.prod) | Backend config | DigitalOcean droplet |
| [`.env.local.prod`](.env.local.prod) | Frontend config | DigitalOcean droplet |

---

## 🔐 Security Checklist

After deployment, complete these security steps:

- [ ] Change admin password
- [ ] Update MongoDB credentials
- [ ] Update environment URLs with actual IP/domain
- [ ] Set up SSL/HTTPS (optional but recommended)
- [ ] Configure firewall rules
- [ ] Set up automated backups

See [`DEPLOYMENT_CHECKLIST.md`](DEPLOYMENT_CHECKLIST.md) for detailed steps.

---

## 💾 Backup & Restore

### Create Backup

```bash
bash backup-db.sh /backups
```

### Restore Backup

```bash
bash restore-db.sh /backups/ordertaker_backup_*.tar.gz
```

### Automated Daily Backups

```bash
crontab -e
# Add: 0 2 * * * cd /opt/ordertakerapp && bash backup-db.sh /backups
```

---

## 🔄 Updating Your App

After making changes locally:

```bash
# 1. Build and push new images
./deploy-prod.sh YOUR_DOCKERHUB_USERNAME v1.0.1

# 2. On droplet, pull and restart
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

---

## 🆘 Troubleshooting

### App not accessible?

```bash
# Check if services are running
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs -f

# Test connectivity
curl http://localhost:3000
```

### Services not starting?

```bash
# View detailed logs
docker compose -f docker-compose.prod.yml logs -f

# Restart services
docker compose -f docker-compose.prod.yml restart
```

### MongoDB issues?

```bash
# Check MongoDB logs
docker compose -f docker-compose.prod.yml logs mongo

# Test connection
docker exec ordertaker-mongo mongosh \
    --username admin \
    --password password123 \
    --authenticationDatabase admin \
    --eval "db.adminCommand('ping')"
```

For more troubleshooting, see [`PROD_DEPLOYMENT.md`](PROD_DEPLOYMENT.md#troubleshooting).

---

## 📚 Documentation

### Quick Start
- **[`PROD_QUICKSTART.md`](PROD_QUICKSTART.md)** - Fast-track 3-step guide

### Detailed Guides
- **[`PROD_DEPLOYMENT.md`](PROD_DEPLOYMENT.md)** - Comprehensive deployment guide
- **[`DEPLOYMENT_CHECKLIST.md`](DEPLOYMENT_CHECKLIST.md)** - Step-by-step checklist
- **[`DEPLOYMENT_SUMMARY.md`](DEPLOYMENT_SUMMARY.md)** - File overview

### Configuration
- **[`backend/.env.prod`](backend/.env.prod)** - Backend environment variables
- **[`.env.local.prod`](.env.local.prod)** - Frontend environment variables

---

## 🏗️ Architecture

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

## 🎯 Common Tasks

### View Logs

```bash
docker compose -f docker-compose.prod.yml logs -f
```

### Restart Services

```bash
docker compose -f docker-compose.prod.yml restart
```

### Stop Services

```bash
docker compose -f docker-compose.prod.yml down
```

### Start Services

```bash
docker compose -f docker-compose.prod.yml up -d
```

### Check Service Status

```bash
docker compose -f docker-compose.prod.yml ps
```

### SSH into Droplet

```bash
ssh root@YOUR_DROPLET_IP
```

### View Backups

```bash
ls -lh /backups/
```

---

## 📊 Deployment Workflow

```
┌─────────────────────────────────────────────────────────────┐
│ Phase 1: Local Machine (Build & Push)                       │
├─────────────────────────────────────────────────────────────┤
│ 1. Run: ./deploy-prod.sh YOUR_DOCKERHUB_USERNAME            │
│ 2. Images built and pushed to Docker Hub                    │
│ 3. Ready for droplet deployment                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Phase 2: DigitalOcean Droplet (Setup & Deploy)              │
├─────────────────────────────────────────────────────────────┤
│ 1. SSH into droplet                                         │
│ 2. Clone/copy project files                                 │
│ 3. Run: bash start-prod.sh                                  │
│ 4. Services started and configured                          │
│ 5. App accessible at http://YOUR_DROPLET_IP                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Phase 3: Access & Verify                                    │
├─────────────────────────────────────────────────────────────┤
│ 1. Open browser: http://YOUR_DROPLET_IP                     │
│ 2. Login with admin credentials                             │
│ 3. Change admin password                                    │
│ 4. Complete security checklist                              │
│ 5. Set up backups                                           │
└─────────────────────────────────────────────────────────────┘
```

---

## ⚡ Quick Reference

### Deployment Commands

```bash
# Local: Build and push
./deploy-prod.sh myusername

# Droplet: Initial setup
bash start-prod.sh

# Droplet: Update images
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

### Monitoring Commands

```bash
# View logs
docker compose -f docker-compose.prod.yml logs -f

# Check status
docker compose -f docker-compose.prod.yml ps

# Check resources
docker stats
```

### Backup Commands

```bash
# Create backup
bash backup-db.sh /backups

# Restore backup
bash restore-db.sh /backups/ordertaker_backup_*.tar.gz

# List backups
ls -lh /backups/
```

---

## 🔒 Security Notes

### Default Credentials

⚠️ **Change these immediately after deployment:**

- Admin Email: `oliverjohnpr2013@gmail.com`
- Admin Password: `admin123`
- MongoDB User: `admin`
- MongoDB Password: `password123`

### Environment Variables

Update these with your actual values:

- `FRONTEND_URL` - Your droplet IP or domain
- `NEXT_PUBLIC_API_URL` - Your droplet IP or domain
- MongoDB credentials - Use secure passwords

### Firewall

Configured to allow:
- Port 22 (SSH)
- Port 80 (HTTP)
- Port 443 (HTTPS)

---

## 📞 Support

### Documentation

- **Quick Start:** [`PROD_QUICKSTART.md`](PROD_QUICKSTART.md)
- **Detailed Guide:** [`PROD_DEPLOYMENT.md`](PROD_DEPLOYMENT.md)
- **Checklist:** [`DEPLOYMENT_CHECKLIST.md`](DEPLOYMENT_CHECKLIST.md)
- **Overview:** [`DEPLOYMENT_SUMMARY.md`](DEPLOYMENT_SUMMARY.md)

### Troubleshooting

1. Check logs: `docker compose -f docker-compose.prod.yml logs -f`
2. Review [`PROD_DEPLOYMENT.md`](PROD_DEPLOYMENT.md#troubleshooting)
3. Check DigitalOcean documentation
4. Check Docker documentation

---

## 🎉 You're Ready!

Everything is set up for production deployment. Follow the 3-step process above to get your app live.

**Next Steps:**
1. ✅ Read this file
2. ✅ Follow [`PROD_QUICKSTART.md`](PROD_QUICKSTART.md)
3. ✅ Use [`DEPLOYMENT_CHECKLIST.md`](DEPLOYMENT_CHECKLIST.md) to track progress
4. ✅ Refer to [`PROD_DEPLOYMENT.md`](PROD_DEPLOYMENT.md) for detailed information

---

**Version:** 1.0.0  
**Last Updated:** November 2024  
**Status:** Ready for Production Deployment ✅
