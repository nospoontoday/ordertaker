# Your Production Deployment Guide

**Droplet IP:** `165.232.167.105`  
**Docker Hub Username:** `oliverjohnpr2013`  
**Date:** November 1, 2024

---

## 🚀 Quick Start (3 Steps)

### Step 1: Build & Push (Local Machine)

```bash
chmod +x deploy-prod.sh
./deploy-prod.sh oliverjohnpr2013
```

**Time:** 5-10 minutes

---

### Step 2: Deploy to Droplet

```bash
# SSH into your droplet
ssh root@165.232.167.105

# Clone project
git clone https://github.com/YOUR_USERNAME/ordertaker.git /opt/ordertakerapp
cd /opt/ordertakerapp

# Fix apt lock if needed
bash fix-apt-lock.sh

# Run deployment
bash start-prod.sh
```

**Time:** 5-10 minutes

---

### Step 3: Access Your App

```
http://165.232.167.105
```

**Login with:**
- Email: `oliverjohnpr2013@gmail.com`
- Password: `admin123`

⚠️ **Change password immediately!**

---

## 🔧 If You Encounter Issues

### APT Lock Error

```bash
ssh root@165.232.167.105
bash fix-apt-lock.sh
bash start-prod.sh
```

### Console Logout During Deployment

```bash
# Run in background
nohup bash start-prod.sh > deployment.log 2>&1 &

# Monitor progress
tail -f deployment.log
```

---

## 📋 Configuration Files to Update

### 1. Update Docker Hub Username

On your droplet, update the docker-compose.prod.yml:

```bash
sed -i 's/YOUR_DOCKERHUB_USERNAME/oliverjohnpr2013/g' docker-compose.prod.yml
```

### 2. Backend Environment

File: `backend/.env.prod`

```bash
FRONTEND_URL=http://165.232.167.105
```

### 3. Frontend Environment

File: `.env.local.prod`

```bash
NEXT_PUBLIC_API_URL=http://165.232.167.105/api
```

---

## 🔐 Security Checklist (Post-Deployment)

- [ ] Changed admin password
- [ ] Updated MongoDB credentials
- [ ] Updated environment URLs (done above)
- [ ] Set up SSL/HTTPS (optional)
- [ ] Configured firewall
- [ ] Set up automated backups

---

## 💾 Backup & Restore

### Create Backup

```bash
ssh root@165.232.167.105
bash backup-db.sh /backups
```

### Restore Backup

```bash
ssh root@165.232.167.105
bash restore-db.sh /backups/ordertaker_backup_*.tar.gz
```

### Automated Daily Backups

```bash
ssh root@165.232.167.105
crontab -e
# Add: 0 2 * * * cd /opt/ordertakerapp && bash backup-db.sh /backups
```

---

## 🔄 Updating Your App

After making changes locally:

```bash
# 1. Build and push new images
./deploy-prod.sh oliverjohnpr2013 v1.0.1

# 2. On droplet, pull and restart
ssh root@165.232.167.105
cd /opt/ordertakerapp
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

---

## 📊 Useful Commands

### SSH into Droplet

```bash
ssh root@165.232.167.105
```

### View Logs

```bash
ssh root@165.232.167.105
cd /opt/ordertakerapp
docker compose -f docker-compose.prod.yml logs -f
```

### Check Services

```bash
ssh root@165.232.167.105
cd /opt/ordertakerapp
docker compose -f docker-compose.prod.yml ps
```

### Restart Services

```bash
ssh root@165.232.167.105
cd /opt/ordertakerapp
docker compose -f docker-compose.prod.yml restart
```

### Stop Services

```bash
ssh root@165.232.167.105
cd /opt/ordertakerapp
docker compose -f docker-compose.prod.yml down
```

### Start Services

```bash
ssh root@165.232.167.105
cd /opt/ordertakerapp
docker compose -f docker-compose.prod.yml up -d
```

---

## 🌐 Access Points

| Service | URL | Internal |
|---------|-----|----------|
| Frontend | http://165.232.167.105 | ✅ Public |
| Backend API | http://165.232.167.105/api | ✅ Public (via Nginx) |
| MongoDB | localhost:27017 | ❌ Internal only |
| Backend | localhost:5000 | ❌ Internal only |
| Frontend | localhost:3000 | ❌ Internal only |

---

## 📞 Quick Reference

### Local Machine Commands

```bash
# Build and push
./deploy-prod.sh oliverjohnpr2013

# Build with version tag
./deploy-prod.sh oliverjohnpr2013 v1.0.0
```

### Droplet Commands

```bash
# SSH
ssh root@165.232.167.105

# Fix apt lock
bash fix-apt-lock.sh

# Deploy
bash start-prod.sh

# Deploy in background
nohup bash start-prod.sh > deployment.log 2>&1 &

# Monitor logs
tail -f deployment.log

# Check services
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs -f

# Restart
docker compose -f docker-compose.prod.yml restart

# Backup
bash backup-db.sh /backups

# Restore
bash restore-db.sh /backups/ordertaker_backup_*.tar.gz
```

---

## 🎯 Deployment Checklist

- [ ] Local: Run `./deploy-prod.sh oliverjohnpr2013`
- [ ] Droplet: SSH into `165.232.167.105`
- [ ] Droplet: Clone project to `/opt/ordertakerapp`
- [ ] Droplet: Run `bash fix-apt-lock.sh` (if needed)
- [ ] Droplet: Run `bash start-prod.sh`
- [ ] Verify: Access `http://165.232.167.105`
- [ ] Security: Change admin password
- [ ] Security: Update MongoDB credentials
- [ ] Backup: Set up automated backups
- [ ] Monitor: Check logs regularly

---

## 📚 Full Documentation

For more detailed information:
- [`QUICK_FIX_GUIDE.md`](QUICK_FIX_GUIDE.md) - Quick fixes for common issues
- [`PROD_DEPLOYMENT.md`](PROD_DEPLOYMENT.md) - Comprehensive guide
- [`PROD_QUICKSTART.md`](PROD_QUICKSTART.md) - Fast-track guide
- [`DEPLOYMENT_CHECKLIST.md`](DEPLOYMENT_CHECKLIST.md) - Step-by-step checklist

---

## 🆘 Troubleshooting

### Can't SSH into droplet?

```bash
ssh -v root@165.232.167.105
# Check SSH key permissions
chmod 600 ~/.ssh/id_rsa
chmod 700 ~/.ssh
```

### APT lock stuck?

```bash
ssh root@165.232.167.105
bash fix-apt-lock.sh
```

### Services not running?

```bash
ssh root@165.232.167.105
cd /opt/ordertakerapp
docker compose -f docker-compose.prod.yml logs -f
```

### Can't access app?

```bash
# Check if services are running
ssh root@165.232.167.105
docker compose -f docker-compose.prod.yml ps

# Test connectivity
curl http://165.232.167.105
```

---

**Status:** Ready for Deployment ✅  
**Last Updated:** November 1, 2024
