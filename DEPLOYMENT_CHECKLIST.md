# Production Deployment Checklist

Complete step-by-step checklist for deploying Order Taker App to DigitalOcean.

## ✅ Pre-Deployment Setup

### Local Machine Setup
- [ ] Docker installed and running (`docker --version`)
- [ ] Docker Hub account created
- [ ] Logged into Docker Hub (`docker login`)
- [ ] Project files ready and up-to-date
- [ ] All scripts have execute permissions:
  ```bash
  chmod +x deploy-prod.sh
  chmod +x start-prod.sh
  chmod +x backup-db.sh
  chmod +x restore-db.sh
  ```

### DigitalOcean Droplet Setup
- [ ] Droplet created (Ubuntu 20.04 LTS or newer)
- [ ] Minimum 2GB RAM (4GB recommended)
- [ ] Minimum 20GB storage
- [ ] SSH access verified
- [ ] Root password changed (if using password auth)
- [ ] SSH key configured (recommended)

---

## 🔨 Phase 1: Build & Push (Local Machine)

### Step 1: Prepare Local Environment

```bash
# Navigate to project directory
cd /path/to/ordertaker

# Verify Docker is running
docker ps

# Verify Docker Hub login
docker info | grep Username
```

- [ ] Docker is running
- [ ] Docker Hub login verified
- [ ] Project directory ready

### Step 2: Build and Push Images

```bash
# Make script executable (if not already done)
chmod +x deploy-prod.sh

# Run deployment script
./deploy-prod.sh YOUR_DOCKERHUB_USERNAME

# Or with version tag
./deploy-prod.sh YOUR_DOCKERHUB_USERNAME v1.0.0
```

**Expected output:**
```
✓ Backend image built successfully
✓ Frontend image built successfully
✓ Backend image pushed successfully
✓ Frontend image pushed successfully
✓ DEPLOYMENT COMPLETE!
```

- [ ] Backend image built successfully
- [ ] Frontend image built successfully
- [ ] Images pushed to Docker Hub
- [ ] Docker Hub username noted for next phase

### Step 3: Verify Images on Docker Hub

Visit: `https://hub.docker.com/r/YOUR_DOCKERHUB_USERNAME/`

- [ ] `ordertaker-backend` image visible
- [ ] `ordertaker-app` image visible
- [ ] Both images tagged with `latest`
- [ ] Version tag present (if used)

---

## 🚀 Phase 2: Setup DigitalOcean Droplet

### Step 1: Connect to Droplet

```bash
# SSH into droplet
ssh root@YOUR_DROPLET_IP

# Verify connection
whoami  # Should output: root
```

- [ ] SSH connection successful
- [ ] Logged in as root

### Step 2: Prepare Project Directory

```bash
# Create app directory
mkdir -p /opt/ordertakerapp
cd /opt/ordertakerapp

# Option A: Clone from GitHub
git clone https://github.com/YOUR_USERNAME/ordertaker.git .

# Option B: Copy via rsync (from local machine)
# rsync -avz --exclude 'node_modules' --exclude '.next' . root@YOUR_DROPLET_IP:/opt/ordertakerapp/
```

- [ ] Project files copied to `/opt/ordertakerapp`
- [ ] All files present (check with `ls -la`)

### Step 3: Update Configuration

```bash
# Update Docker Hub username in docker-compose.prod.yml
sed -i 's/YOUR_DOCKERHUB_USERNAME/YOUR_ACTUAL_USERNAME/g' docker-compose.prod.yml

# Verify the change
grep "image:" docker-compose.prod.yml
```

**Expected output:**
```
image: YOUR_ACTUAL_USERNAME/ordertaker-backend:latest
image: YOUR_ACTUAL_USERNAME/ordertaker-app:latest
```

- [ ] Docker Hub username updated in docker-compose.prod.yml
- [ ] Change verified with grep command

### Step 4: Make Scripts Executable

```bash
chmod +x start-prod.sh
chmod +x backup-db.sh
chmod +x restore-db.sh

# Verify permissions
ls -la *.sh
```

- [ ] All scripts have execute permissions (x flag visible)

### Step 5: Run Startup Script

```bash
# Run the startup script
bash start-prod.sh
```

**Expected output:**
```
✓ System packages updated
✓ All required software installed
✓ All installations verified
✓ Docker Compose configuration verified
✓ Backend environment configured
✓ Frontend environment configured with IP: YOUR_DROPLET_IP
✓ Docker images pulled successfully
✓ Docker services started
✓ Services verified
✓ Nginx configured and restarted
✓ Firewall configured
✓ PRODUCTION SETUP COMPLETE!
```

- [ ] System packages updated
- [ ] Docker installed
- [ ] Docker Compose installed
- [ ] Node.js installed
- [ ] Nginx installed
- [ ] Docker images pulled
- [ ] Services started
- [ ] Nginx configured
- [ ] Firewall configured
- [ ] Admin user seeded

### Step 6: Verify Services

```bash
# Check service status
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs -f

# Test connectivity
curl http://localhost:3000
curl http://localhost:5000/api/health
```

- [ ] All services running (status: Up)
- [ ] No error messages in logs
- [ ] Frontend responds (curl returns HTML)
- [ ] Backend responds (curl returns JSON)

---

## 🌐 Phase 3: Access & Verify

### Step 1: Access Application

Open browser and navigate to:
```
http://YOUR_DROPLET_IP
```

- [ ] App loads successfully
- [ ] No connection errors
- [ ] Login page visible

### Step 2: Login with Admin Credentials

```
Email: oliverjohnpr2013@gmail.com
Password: admin123
```

- [ ] Login successful
- [ ] Dashboard loads
- [ ] No errors in browser console

### Step 3: Verify Functionality

- [ ] Can navigate between pages
- [ ] Can create orders
- [ ] Can view reports
- [ ] API calls working (check Network tab in DevTools)

---

## 🔐 Phase 4: Security Hardening

### Step 1: Change Admin Password

```bash
# In the app, go to Settings/Profile
# Change password from: admin123 to: YOUR_SECURE_PASSWORD
```

- [ ] Admin password changed
- [ ] New password tested

### Step 2: Update MongoDB Credentials

```bash
# SSH into droplet
ssh root@YOUR_DROPLET_IP
cd /opt/ordertakerapp

# Edit backend environment
nano backend/.env

# Update MONGODB_URI with new credentials
# Example: mongodb://newuser:newpassword@mongo:27017/ordertaker?authSource=admin

# Save and exit (Ctrl+X, Y, Enter)

# Restart services
docker compose -f docker-compose.prod.yml restart
```

- [ ] MongoDB credentials updated
- [ ] Services restarted
- [ ] App still accessible

### Step 3: Update Environment URLs

```bash
# Edit backend environment
nano backend/.env

# Update FRONTEND_URL with actual droplet IP or domain
# Example: FRONTEND_URL=http://165.22.123.45

# Edit frontend environment
nano .env.local

# Update NEXT_PUBLIC_API_URL with actual droplet IP or domain
# Example: NEXT_PUBLIC_API_URL=http://165.22.123.45/api

# Restart services
docker compose -f docker-compose.prod.yml restart
```

- [ ] FRONTEND_URL updated
- [ ] NEXT_PUBLIC_API_URL updated
- [ ] Services restarted
- [ ] App still accessible

### Step 4: Set Up SSL/HTTPS (Optional but Recommended)

```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Get certificate (replace with your domain)
certbot --nginx -d yourdomain.com

# Auto-renewal is configured automatically
```

- [ ] SSL certificate installed (if using domain)
- [ ] HTTPS working (if applicable)

### Step 5: Verify Firewall

```bash
# Check firewall status
ufw status

# Should show:
# 22/tcp    ALLOW
# 80/tcp    ALLOW
# 443/tcp   ALLOW
```

- [ ] Firewall enabled
- [ ] SSH port (22) allowed
- [ ] HTTP port (80) allowed
- [ ] HTTPS port (443) allowed

---

## 💾 Phase 5: Backup Setup

### Step 1: Create Initial Backup

```bash
# SSH into droplet
ssh root@YOUR_DROPLET_IP
cd /opt/ordertakerapp

# Create backup directory
mkdir -p /backups

# Create initial backup
bash backup-db.sh /backups

# Verify backup created
ls -lh /backups/
```

- [ ] Backup directory created
- [ ] Initial backup created
- [ ] Backup file visible with `ls -lh`

### Step 2: Test Restore Process

```bash
# List available backups
ls -lh /backups/

# Test restore (this will overwrite current DB)
bash restore-db.sh /backups/ordertaker_backup_*.tar.gz

# Verify app still works
# Open browser and check: http://YOUR_DROPLET_IP
```

- [ ] Restore process completed
- [ ] App still accessible after restore
- [ ] Data intact

### Step 3: Set Up Automated Daily Backups

```bash
# Edit crontab
crontab -e

# Add this line for daily backup at 2 AM:
0 2 * * * cd /opt/ordertakerapp && bash backup-db.sh /backups

# Save and exit (Ctrl+X, Y, Enter)

# Verify cron job
crontab -l
```

- [ ] Cron job added
- [ ] Cron job verified with `crontab -l`

### Step 4: Set Up Backup Retention (Optional)

```bash
# Edit crontab
crontab -e

# Add this line to keep only last 7 days of backups:
0 3 * * * cd /backups && find . -name "ordertaker_backup_*.tar.gz" -mtime +7 -delete

# Save and exit
```

- [ ] Backup retention policy configured (optional)

---

## 📊 Phase 6: Monitoring & Maintenance

### Step 1: Set Up Log Monitoring

```bash
# SSH into droplet
ssh root@YOUR_DROPLET_IP
cd /opt/ordertakerapp

# View real-time logs
docker compose -f docker-compose.prod.yml logs -f

# View specific service logs
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f app
docker compose -f docker-compose.prod.yml logs -f mongo
```

- [ ] Can view logs successfully
- [ ] No critical errors visible

### Step 2: Document Important Information

Create a file with important deployment information:

```bash
# Create deployment info file
cat > /opt/ordertakerapp/DEPLOYMENT_INFO.txt << EOF
Deployment Date: $(date)
Droplet IP: YOUR_DROPLET_IP
Docker Hub Username: YOUR_DOCKERHUB_USERNAME
Admin Email: oliverjohnpr2013@gmail.com
Backup Location: /backups
Backup Schedule: Daily at 2 AM
Backup Retention: 7 days

Important Commands:
- View logs: docker compose -f docker-compose.prod.yml logs -f
- Restart: docker compose -f docker-compose.prod.yml restart
- Stop: docker compose -f docker-compose.prod.yml down
- Start: docker compose -f docker-compose.prod.yml up -d
- Backup: bash backup-db.sh /backups
- Restore: bash restore-db.sh /backups/ordertaker_backup_*.tar.gz
EOF
```

- [ ] Deployment info documented
- [ ] Important commands saved

---

## ✨ Final Verification

### Step 1: Full System Check

```bash
# SSH into droplet
ssh root@YOUR_DROPLET_IP
cd /opt/ordertakerapp

# Check all services
docker compose -f docker-compose.prod.yml ps

# Check disk space
df -h

# Check memory usage
free -h

# Check Docker disk usage
docker system df
```

- [ ] All services running
- [ ] Sufficient disk space available
- [ ] Sufficient memory available

### Step 2: Application Functionality Test

- [ ] Can access app at `http://YOUR_DROPLET_IP`
- [ ] Can login with admin credentials
- [ ] Can create new orders
- [ ] Can view historical orders
- [ ] Can generate reports
- [ ] Can upload images
- [ ] API endpoints responding
- [ ] No console errors in browser

### Step 3: Backup Verification

```bash
# Verify backup exists
ls -lh /backups/

# Verify backup is recent
stat /backups/ordertaker_backup_*.tar.gz
```

- [ ] Backup file exists
- [ ] Backup is recent (created today)
- [ ] Backup file size is reasonable (> 1MB)

---

## 🎉 Deployment Complete!

### Summary

- [x] Local machine setup complete
- [x] Docker images built and pushed
- [x] DigitalOcean droplet configured
- [x] Application deployed and running
- [x] Security hardened
- [x] Backups configured
- [x] Monitoring set up

### Next Steps

1. **Monitor the application** for the first 24-48 hours
2. **Check logs regularly** for any errors
3. **Verify backups** are running daily
4. **Test restore process** monthly
5. **Keep system updated** with security patches
6. **Plan for scaling** if needed

### Important Reminders

⚠️ **Security:**
- Admin password changed ✓
- MongoDB credentials updated ✓
- Environment URLs updated ✓
- Firewall configured ✓
- Backups automated ✓

⚠️ **Maintenance:**
- Check logs weekly
- Test backups monthly
- Update system monthly
- Monitor disk space
- Review security settings quarterly

---

## 📞 Support & Troubleshooting

### Quick Troubleshooting

**App not accessible?**
```bash
docker compose -f docker-compose.prod.yml ps
systemctl status nginx
curl http://localhost:3000
```

**Services not running?**
```bash
docker compose -f docker-compose.prod.yml logs -f
docker compose -f docker-compose.prod.yml restart
```

**Database issues?**
```bash
docker compose -f docker-compose.prod.yml logs mongo
bash restore-db.sh /backups/ordertaker_backup_*.tar.gz
```

### Documentation

- [`PROD_QUICKSTART.md`](PROD_QUICKSTART.md) - Quick reference
- [`PROD_DEPLOYMENT.md`](PROD_DEPLOYMENT.md) - Detailed guide
- [`DEPLOYMENT_SUMMARY.md`](DEPLOYMENT_SUMMARY.md) - Overview

---

**Deployment Date:** _______________  
**Deployed By:** _______________  
**Droplet IP:** _______________  
**Docker Hub Username:** _______________  

---

**Version:** 1.0.0  
**Last Updated:** November 2024
