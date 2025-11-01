# Production Maintenance Scripts Guide

Complete guide for using the production maintenance scripts.

---

## Overview

Three utility scripts for managing your production deployment:

1. **`update-prod.sh`** - Pull latest images and rebuild
2. **`reset-db.sh`** - Clear database and reseed
3. **`fix-apt-lock.sh`** - Fix apt lock issues (existing)

---

## 1. Update Production (`update-prod.sh`)

### Purpose

Pull latest Docker images from Docker Hub and rebuild containers without losing data.

### When to Use

- After pushing new images to Docker Hub
- To update to a new version
- After making code changes and rebuilding locally

### Usage

```bash
ssh root@165.232.167.105
cd /opt/ordertakerapp
bash update-prod.sh
```

### What It Does

1. Pulls latest Docker images from Docker Hub
2. Rebuilds containers with `--force-recreate`
3. Restarts all services
4. Verifies services are running
5. Displays status

### Example Workflow

```bash
# On local machine
./deploy-prod.sh oliverjohnpr2013 v1.0.1

# On droplet
ssh root@165.232.167.105
cd /opt/ordertakerapp
bash update-prod.sh
```

### Output

```
==========================================
Order Taker App - Production Update
==========================================

Step 1: Pulling latest Docker images...
==========================================
✓ Docker images pulled successfully

Step 2: Rebuilding and restarting containers...
==========================================
✓ Containers rebuilt and restarted

Step 3: Waiting for services to initialize...

Step 4: Verifying services...
==========================================
NAME                    COMMAND                  SERVICE             STATUS              PORTS
ordertaker-app          "npm start"              app                 Up 2 seconds        127.0.0.1:3000->3000/tcp
ordertaker-backend      "node server.js"         backend             Up 2 seconds        127.0.0.1:5000->5000/tcp
ordertaker-mongo        "docker-entrypoint.s…"   mongo               Up 3 seconds        127.0.0.1:27017->27017/tcp
✓ Services verified

==========================================
✓ UPDATE COMPLETE!
==========================================
```

---

## 2. Reset Database (`reset-db.sh`)

### Purpose

Clear all data from the database and reseed with fresh data.

### When to Use

- Testing the app with fresh data
- Resetting after testing
- Clearing old test data
- Starting fresh with default users and menu items

### Usage

```bash
ssh root@165.232.167.105
cd /opt/ordertakerapp
bash reset-db.sh
```

### What It Does

1. Confirms action (destructive operation)
2. Checks MongoDB is running
3. Installs backend dependencies
4. Clears all users
5. Clears all menu items
6. Clears all categories
7. Clears all orders
8. Reseeds users (admin + crew)
9. Reseeds menu items and categories
10. Reseeds test orders

### Confirmation

```
==========================================
Order Taker App - Database Reset
==========================================

⚠️  WARNING: This will DELETE ALL data from the database!

Are you sure you want to reset the database? (yes/no) yes

Proceeding with database reset...
```

### Data Cleared

- ❌ All users
- ❌ All menu items
- ❌ All categories
- ❌ All orders
- ❌ All transactions

### Data Reseeded

- ✅ Admin user: `oliverjohnpr2013@gmail.com` / `123456`
- ✅ Crew members (3 users)
- ✅ Menu items (Coffee, Pastries, Sandwiches, etc.)
- ✅ Categories</search>
<start_line>
1
end_line>
-1
use_regex>
false
ignore_case>
false
</search_and_replace>

### Output

```
==========================================
Order Taker App - Database Reset
==========================================

⚠️  WARNING: This will DELETE ALL data from the database!

Are you sure you want to reset the database? (yes/no) yes

Proceeding with database reset...

Step 1: Checking MongoDB connection...
==========================================
✓ MongoDB is running

Step 2: Installing backend dependencies...
==========================================
✓ Dependencies already installed

Step 3: Clearing all database data...
==========================================
Clearing users...
✓ Users cleared
Clearing menu items...
✓ Menu items cleared
Clearing categories...
✓ Categories cleared
Clearing orders...
✓ Orders cleared

Step 4: Reseeding database...
==========================================
Seeding users...
✓ All users created successfully
✓ Users seeded

Seeding menu items and categories...
✓ Menu items and categories seeded

==========================================
✓ DATABASE RESET COMPLETE!
==========================================

Database has been cleared and reseeded with:
  ✓ Admin user and crew members
  ✓ Menu items and categories</search>
<start_line>
1
end_line>
-1
use_regex>
false
ignore_case>
false
</search_and_replace>

Default credentials:
  Admin: oliverjohnpr2013@gmail.com / 123456
  Elwin: elwin@mail.com / 123456
  Krisnela: krisnela@mail.com / 123456
  Jowicks: jowicks@mail.com / 123456

⚠️  Remember to change passwords after login!
```

---

## 3. Fix APT Lock (`fix-apt-lock.sh`)

### Purpose

Quickly resolve apt lock issues.

### When to Use

- When `start-prod.sh` is stuck on apt lock
- When apt processes are holding locks

### Usage

```bash
ssh root@165.232.167.105
bash fix-apt-lock.sh
```

### What It Does

1. Kills all apt processes
2. Removes lock files
3. Reconfigures dpkg
4. Verifies package manager

---

## Complete Maintenance Workflow

### Initial Deployment

```bash
# Local machine
./deploy-prod.sh oliverjohnpr2013

# Droplet
ssh root@165.232.167.105
cd /opt/ordertakerapp
bash start-prod.sh
```

### Update to New Version

```bash
# Local machine
./deploy-prod.sh oliverjohnpr2013 v1.0.1

# Droplet
ssh root@165.232.167.105
cd /opt/ordertakerapp
bash update-prod.sh
```

### Reset Database for Testing

```bash
ssh root@165.232.167.105
cd /opt/ordertakerapp
bash reset-db.sh
```

### Fix APT Lock Issues

```bash
ssh root@165.232.167.105
bash fix-apt-lock.sh
bash start-prod.sh  # or bash update-prod.sh
```

---

## Quick Reference

### All Scripts

```bash
# Initial setup (one-time)
bash start-prod.sh

# Update images and rebuild
bash update-prod.sh

# Reset database
bash reset-db.sh

# Fix apt lock
bash fix-apt-lock.sh
```

### Common Commands

```bash
# SSH to droplet
ssh root@165.232.167.105

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

## Troubleshooting

### `update-prod.sh` Fails

```bash
# Check if services are running
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs -f

# Restart services
docker compose -f docker-compose.prod.yml restart

# Try update again
bash update-prod.sh
```

### `reset-db.sh` Fails

```bash
# Check MongoDB is running
docker compose -f docker-compose.prod.yml ps

# Check MongoDB logs
docker compose -f docker-compose.prod.yml logs mongo

# Start services if needed
docker compose -f docker-compose.prod.yml up -d

# Try reset again
bash reset-db.sh
```

### APT Lock Issues

```bash
# Fix apt lock
bash fix-apt-lock.sh

# Try deployment again
bash start-prod.sh
# or
bash update-prod.sh
```

---

## Safety Notes

⚠️ **`reset-db.sh` is destructive!**
- Clears ALL data from database
- Requires confirmation before proceeding
- Cannot be undone (unless you have a backup)

✅ **Always backup before resetting:**
```bash
bash backup-db.sh /backups
bash reset-db.sh
```

✅ **`update-prod.sh` is safe:**
- Does not delete data
- Only updates Docker images
- Can be run anytime

---

## Default Credentials After Reset

```
Admin User:
  Email: oliverjohnpr2013@gmail.com
  Password: 123456

Crew Members:
  1. Elwin: elwin@mail.com / 123456
  2. Krisnela: krisnela@mail.com / 123456
  3. Jowicks: jowicks@mail.com / 123456
```

⚠️ **Change these passwords after login!**

---

## Support

For issues:
1. Check logs: `docker compose -f docker-compose.prod.yml logs -f`
2. Verify services: `docker compose -f docker-compose.prod.yml ps`
3. Review [`SEEDING_GUIDE.md`](SEEDING_GUIDE.md)
4. Review [`PROD_DEPLOYMENT.md`](PROD_DEPLOYMENT.md)

---

**Last Updated:** November 1, 2024
