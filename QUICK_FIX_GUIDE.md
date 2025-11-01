# Quick Fix Guide - Production Deployment Issues

## Issue 1: APT Lock Error

**Error Message:**
```
Waiting for cache lock: Could not get lock /var/lib/dpkg/lock-frontend. 
It is held by process XXXXX (apt)
```

### Quick Fix

```bash
# Run the fix script
bash fix-apt-lock.sh

# Then run deployment
bash start-prod.sh
```

**What it does:**
- Kills all apt processes immediately
- Removes lock files
- Reconfigures dpkg
- Verifies package manager is working

---

## Issue 2: Console Logout During Deployment

**Problem:** SSH session disconnects during `start-prod.sh` execution

### Solution

The updated `start-prod.sh` now:
- Uses `set +e` instead of `set -e` (continues on errors)
- Runs firewall configuration in background (prevents logout)
- Better error handling throughout

**To run safely:**

```bash
# Option 1: Run normally (recommended)
bash start-prod.sh

# Option 2: Run in background with logging
nohup bash start-prod.sh > deployment.log 2>&1 &

# Option 3: Use screen or tmux for persistent session
screen -S deployment
bash start-prod.sh
# Press Ctrl+A then D to detach
# Later: screen -r deployment to reattach
```

**Monitor progress:**
```bash
# In another terminal
tail -f deployment.log

# Or check services
docker compose -f docker-compose.prod.yml ps
```

---

## Complete Deployment Workflow (Fixed)

### Step 1: Fix APT Lock (if needed)

```bash
bash fix-apt-lock.sh
```

### Step 2: Run Deployment

```bash
# Option A: Direct (recommended for most cases)
bash start-prod.sh

# Option B: Background with logging (for long deployments)
nohup bash start-prod.sh > deployment.log 2>&1 &

# Option C: With screen (for persistent session)
screen -S deployment
bash start-prod.sh
```

### Step 3: Monitor Progress

```bash
# Check logs
tail -f deployment.log

# Or check services
docker compose -f docker-compose.prod.yml ps

# View real-time logs
docker compose -f docker-compose.prod.yml logs -f
```

### Step 4: Verify Deployment

```bash
# Check if app is accessible
curl http://YOUR_DROPLET_IP

# Check services
docker compose -f docker-compose.prod.yml ps

# Check logs for errors
docker compose -f docker-compose.prod.yml logs
```

---

## Troubleshooting

### Script Still Hangs on APT

```bash
# In another terminal, kill the process
ssh root@YOUR_DROPLET_IP
bash fix-apt-lock.sh
```

### Services Not Starting

```bash
# Check logs
docker compose -f docker-compose.prod.yml logs -f

# Restart services
docker compose -f docker-compose.prod.yml restart

# Check if ports are in use
lsof -i :80
lsof -i :3000
lsof -i :5000
```

### Can't Access App

```bash
# Check if services are running
docker compose -f docker-compose.prod.yml ps

# Check Nginx
systemctl status nginx

# Test connectivity
curl http://localhost:3000
curl http://localhost:5000/api/health
```

### Firewall Issues

```bash
# Check firewall status
ufw status

# Allow ports manually
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
```

---

## Key Changes in Updated Scripts

### `start-prod.sh`
- ✅ Changed `set -e` to `set +e` (continues on errors)
- ✅ Immediately kills apt processes (no waiting)
- ✅ Firewall runs in background (prevents logout)
- ✅ Better error handling throughout
- ✅ Can be run with `nohup` for background execution

### `fix-apt-lock.sh`
- ✅ Immediately kills apt processes
- ✅ No waiting period
- ✅ Clears all lock files
- ✅ Reconfigures dpkg
- ✅ Verifies package manager

---

## Running in Background

### Using nohup (Recommended)

```bash
# Start deployment in background
nohup bash start-prod.sh > deployment.log 2>&1 &

# Check progress
tail -f deployment.log

# Check if still running
ps aux | grep start-prod.sh

# Kill if needed
pkill -f start-prod.sh
```

### Using screen

```bash
# Start screen session
screen -S deployment

# Run script
bash start-prod.sh

# Detach (Ctrl+A then D)

# Later, reattach
screen -r deployment

# Kill session
screen -X -S deployment quit
```

### Using tmux

```bash
# Start tmux session
tmux new-session -d -s deployment

# Run script
tmux send-keys -t deployment "bash start-prod.sh" Enter

# Check progress
tmux capture-pane -t deployment -p

# Kill session
tmux kill-session -t deployment
```

---

## Quick Commands Reference

```bash
# Fix apt lock
bash fix-apt-lock.sh

# Deploy (normal)
bash start-prod.sh

# Deploy (background)
nohup bash start-prod.sh > deployment.log 2>&1 &

# Monitor logs
tail -f deployment.log

# Check services
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs -f

# Restart services
docker compose -f docker-compose.prod.yml restart

# Stop services
docker compose -f docker-compose.prod.yml down

# Start services
docker compose -f docker-compose.prod.yml up -d

# Backup database
bash backup-db.sh /backups

# Restore database
bash restore-db.sh /backups/ordertaker_backup_*.tar.gz
```

---

## Support

For more detailed information:
- [`PROD_DEPLOYMENT.md`](PROD_DEPLOYMENT.md) - Comprehensive guide
- [`APT_LOCK_TROUBLESHOOTING.md`](APT_LOCK_TROUBLESHOOTING.md) - APT lock details
- [`DEPLOYMENT_CHECKLIST.md`](DEPLOYMENT_CHECKLIST.md) - Step-by-step checklist

---

**Updated:** November 2024  
**Status:** Ready for Production Deployment ✅
