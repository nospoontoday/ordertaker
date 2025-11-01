# Production Deployment - Quick Start Guide

Fast-track guide to deploy your Order Taker App to DigitalOcean.

## 📋 Prerequisites

- ✅ Docker installed locally
- ✅ Docker Hub account (free)
- ✅ DigitalOcean droplet (Ubuntu 20.04+, 2GB+ RAM)
- ✅ SSH access to droplet

## 🚀 Deployment in 3 Steps

### Step 1: Build & Push (Local Machine)

```bash
# Make script executable
chmod +x deploy-prod.sh

# Build and push to Docker Hub
./deploy-prod.sh YOUR_DOCKERHUB_USERNAME
```

**Time:** ~5-10 minutes (depending on internet speed)

**What happens:**
- Builds backend Docker image
- Builds frontend Docker image  
- Pushes both to Docker Hub

### Step 2: Setup Droplet (DigitalOcean)

```bash
# SSH into droplet
ssh root@YOUR_DROPLET_IP

# Clone project (or copy files)
git clone https://github.com/YOUR_USERNAME/ordertaker.git /opt/ordertakerapp
cd /opt/ordertakerapp

# Make script executable
chmod +x start-prod.sh

# Run setup
bash start-prod.sh
```

**Time:** ~5-10 minutes

**What happens:**
- Installs Docker, Node.js, Nginx
- Pulls images from Docker Hub
- Starts all services
- Configures reverse proxy
- Seeds admin user

### Step 3: Access Your App

```
http://YOUR_DROPLET_IP
```

**Login with:**
- Email: `oliverjohnpr2013@gmail.com`
- Password: `admin123`

⚠️ **Change password immediately after first login!**

---

## 📝 Configuration

### Update Docker Hub Username

Before running `start-prod.sh`, update the docker-compose.prod.yml:

```bash
sed -i 's/YOUR_DOCKERHUB_USERNAME/YOUR_ACTUAL_USERNAME/g' docker-compose.prod.yml
```

### Update Environment Variables

Edit these files with your droplet IP or domain:

**`backend/.env.prod`:**
```bash
FRONTEND_URL=http://YOUR_DROPLET_IP
```

**`.env.local.prod`:**
```bash
NEXT_PUBLIC_API_URL=http://YOUR_DROPLET_IP/api
```

---

## 🔄 Updating Your App

After making changes locally:

```bash
# On local machine
./deploy-prod.sh YOUR_DOCKERHUB_USERNAME v1.0.1

# On droplet
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

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
# On droplet
crontab -e

# Add this line:
0 2 * * * cd /opt/ordertakerapp && bash backup-db.sh /backups
```

---

## 🔧 Common Commands

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

---

## ⚠️ Security Checklist

- [ ] Changed admin password
- [ ] Updated MongoDB credentials in `backend/.env.prod`
- [ ] Updated `FRONTEND_URL` and `NEXT_PUBLIC_API_URL` with actual IP/domain
- [ ] Set up SSL/HTTPS (optional but recommended)
- [ ] Configured firewall rules
- [ ] Set up automated backups
- [ ] Tested backup/restore process

---

## 🆘 Troubleshooting

### Services not starting?

```bash
docker compose -f docker-compose.prod.yml logs -f
```

### Can't access app?

```bash
# Check if services are running
docker compose -f docker-compose.prod.yml ps

# Check Nginx
systemctl status nginx

# Test connectivity
curl http://localhost:3000
```

### MongoDB connection error?

```bash
docker compose -f docker-compose.prod.yml logs mongo
```

### Port already in use?

```bash
lsof -i :80
lsof -i :3000
lsof -i :5000
```

---

## 📚 Full Documentation

For detailed information, see [`PROD_DEPLOYMENT.md`](PROD_DEPLOYMENT.md)

---

## 📁 Files Created

| File | Purpose |
|------|---------|
| `deploy-prod.sh` | Build and push images to Docker Hub |
| `start-prod.sh` | Setup and start services on droplet |
| `backup-db.sh` | Backup MongoDB database |
| `restore-db.sh` | Restore MongoDB from backup |
| `backend/.env.prod` | Backend production environment |
| `.env.local.prod` | Frontend production environment |
| `PROD_DEPLOYMENT.md` | Complete deployment guide |
| `PROD_QUICKSTART.md` | This file |

---

## 🎯 Next Steps

1. ✅ Review this guide
2. ✅ Update Docker Hub username in scripts
3. ✅ Run `./deploy-prod.sh YOUR_USERNAME` locally
4. ✅ SSH into droplet and run `bash start-prod.sh`
5. ✅ Access app at `http://YOUR_DROPLET_IP`
6. ✅ Change admin password
7. ✅ Set up backups

---

**Questions?** Check [`PROD_DEPLOYMENT.md`](PROD_DEPLOYMENT.md) for detailed troubleshooting and configuration options.
