# APT Lock Troubleshooting Guide

## Problem

When running `start-prod.sh`, you encounter:
```
Waiting for cache lock: Could not get lock /var/lib/dpkg/lock-frontend. 
It is held by process XXXXX (apt)
```

## Cause

Another `apt` process is running on the droplet, holding the package manager lock. This commonly happens when:
- The system is performing automatic security updates
- Another deployment script is running
- A previous installation was interrupted

## Solution

### Option 1: Wait for the Process to Complete (Recommended)

The updated `start-prod.sh` script now automatically waits for any existing apt processes to finish before proceeding. Simply run:

```bash
bash start-prod.sh
```

The script will:
1. Check if apt is locked
2. Wait with a message: "⏳ Waiting for apt to finish..."
3. Continue automatically once apt is free

### Option 2: Manual Fix (If Script Still Hangs)

If the script is still stuck, SSH into the droplet in a new terminal and run:

```bash
# Check what process is holding the lock
lsof /var/lib/dpkg/lock-frontend

# Wait for it to finish (check status)
ps aux | grep apt

# If it's taking too long, you can kill it (use with caution)
sudo kill -9 PROCESS_ID
```

### Option 3: Skip System Update

If you want to skip the system update and proceed faster, edit `start-prod.sh` and comment out the apt update line:

```bash
# Comment out this line:
# apt update && apt upgrade -y

# Or replace with just update (no upgrade):
apt update
```

Then run:
```bash
bash start-prod.sh
```

### Option 4: Wait and Retry

Simply wait a few minutes and try again:

```bash
# Wait 5 minutes
sleep 300

# Try again
bash start-prod.sh
```

## Prevention

To avoid this issue in the future:

1. **Check for running apt processes before deployment:**
   ```bash
   ps aux | grep apt
   ```

2. **Disable automatic updates temporarily:**
   ```bash
   sudo systemctl stop apt-daily.service
   sudo systemctl stop apt-daily-upgrade.service
   ```

3. **Run deployment during off-peak hours** when automatic updates are less likely

## What the Updated Script Does

The updated `start-prod.sh` now includes:

```bash
# Wait for any existing apt processes to finish
echo "Checking for running apt processes..."
while sudo lsof /var/lib/dpkg/lock-frontend 2>/dev/null | grep -q apt; do
    echo "⏳ Waiting for apt to finish (another process is using package manager)..."
    sleep 5
done
echo "✓ Package manager is free"
```

This automatically:
- Detects if apt is locked
- Waits 5 seconds between checks
- Continues once the lock is released
- Provides feedback to the user

## If All Else Fails

If the script is completely stuck and won't proceed:

1. **Press Ctrl+C** to stop the script
2. **SSH into the droplet** in a new terminal
3. **Kill the stuck process:**
   ```bash
   sudo pkill -9 apt
   sudo pkill -9 apt-get
   ```
4. **Clean up the lock:**
   ```bash
   sudo rm /var/lib/apt/lists/lock
   sudo rm /var/cache/apt/archives/lock
   sudo rm /var/lib/dpkg/lock*
   ```
5. **Reconfigure dpkg:**
   ```bash
   sudo dpkg --configure -a
   ```
6. **Try running the script again:**
   ```bash
   bash start-prod.sh
   ```

## Monitoring the Process

To monitor the deployment in real-time from another terminal:

```bash
# SSH into droplet in a new terminal
ssh root@YOUR_DROPLET_IP

# Watch the logs
tail -f /var/log/apt/term.log

# Or check process status
watch -n 1 'ps aux | grep apt'
```

## Questions?

If you continue to experience issues:

1. Check the logs: `docker compose -f docker-compose.prod.yml logs -f`
2. Review [`PROD_DEPLOYMENT.md`](PROD_DEPLOYMENT.md#troubleshooting)
3. Check DigitalOcean documentation on package management

---

**Updated:** November 2024  
**Status:** Fixed in latest `start-prod.sh`
