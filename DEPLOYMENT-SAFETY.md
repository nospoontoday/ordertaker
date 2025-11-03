# Deployment Safety Guide

This document explains how database safety is handled in production deployments.

## Database Protection Features

### 1. Persistent Data Storage

The `docker-compose.prod.yml` uses **named volumes** for MongoDB:
```yaml
volumes:
  mongo-data:
  mongo-config:
```

**What this means:**
- Data persists even when containers are stopped or removed
- Running `docker compose down` does NOT delete data
- Only `docker compose down -v` would delete data (which we NEVER do)

### 2. Automatic Backups on Update

The `update-prod.sh` script **automatically backs up** the database before any updates:

```bash
bash update-prod.sh
```

**What happens:**
1. Creates a timestamped backup in `backups/mongodb_backup_YYYYMMDD_HHMMSS.gz`
2. Keeps the last 10 backups automatically
3. Asks for confirmation if backup fails
4. Then pulls new images and restarts containers
5. **Data volumes are preserved** during restart

### 3. Safe Database Reset

The `reset-db.sh` script has multiple safety features:

```bash
bash reset-db.sh
```

**Safety features:**
1. Requires typing "yes" to confirm
2. **Automatically creates a backup** before wiping data
3. Backup is saved as `backups/mongodb_backup_before_reset_YYYYMMDD_HHMMSS.gz`
4. Only then clears and reseeds database

### 4. Manual Restore Capability

You can restore from any backup:

```bash
# List available backups
bash restore-mongodb.sh

# Restore from specific backup
bash restore-mongodb.sh backups/mongodb_backup_20250103_143022.gz
```

**Safety features:**
1. Lists all available backups if no file specified
2. Verifies backup file exists before proceeding
3. Requires typing "yes" to confirm
4. Uses `--drop` flag to replace current data with backup

## Production Update Workflow

### Standard Update (Safe - No Data Loss)

```bash
# 1. SSH into droplet
ssh root@165.232.167.105

# 2. Navigate to app directory
cd /opt/ordertakerapp

# 3. Pull latest code (if needed)
git pull

# 4. Run update script (includes automatic backup)
bash update-prod.sh
```

**What happens:**
1. ✓ Database is backed up automatically
2. ✓ New Docker images are pulled
3. ✓ Containers are stopped
4. ✓ **Data volumes remain intact**
5. ✓ Containers are started with new images
6. ✓ All data is preserved

### Emergency Restore

If something goes wrong after an update:

```bash
# 1. List available backups
bash restore-mongodb.sh

# 2. Restore from the backup before update
bash restore-mongodb.sh backups/mongodb_backup_20250103_143022.gz
```

## Scripts Overview

| Script | Purpose | Data Safety |
|--------|---------|-------------|
| `update-prod.sh` | Update app with new images | ✓ Auto-backup, preserves data |
| `reset-db.sh` | Wipe and reseed database | ✓ Auto-backup before reset |
| `restore-mongodb.sh` | Restore from backup | ⚠️  Requires confirmation |
| `deploy-prod.sh` | Build and push images | ✓ No database changes |
| `start-prod.sh` | Start containers | ✓ No database changes |

## Backup Storage

**Location:** `/opt/ordertakerapp/backups/`

**Retention:** Last 10 backups are kept automatically

**Manual Backup:**
```bash
cd /opt/ordertakerapp
bash backup-db.sh
```

## Important Notes

### Safe Commands (No Data Loss)
```bash
docker compose -f docker-compose.prod.yml down      # Safe - data persists
docker compose -f docker-compose.prod.yml up -d     # Safe - uses existing data
docker compose -f docker-compose.prod.yml restart   # Safe - no data changes
docker compose -f docker-compose.prod.yml pull      # Safe - only pulls images
```

### DANGEROUS Commands (Can Lose Data)
```bash
# ⛔ NEVER RUN THESE IN PRODUCTION:
docker compose -f docker-compose.prod.yml down -v   # ⛔ DELETES ALL DATA
docker volume rm mongo-data                          # ⛔ DELETES ALL DATA
bash reset-db.sh                                     # ⚠️  Wipes DB (but creates backup first)
```

## Verification After Update

After running `update-prod.sh`, verify everything works:

```bash
# 1. Check services are running
docker compose -f docker-compose.prod.yml ps

# 2. Check logs for errors
docker compose -f docker-compose.prod.yml logs -f --tail=50

# 3. Test the app
curl http://165.232.167.105
```

## Questions?

- **Q: Will my data be lost when I update?**
  - **A:** No. The update script preserves all data and creates a backup first.

- **Q: How do I restore if something goes wrong?**
  - **A:** Use `bash restore-mongodb.sh` and select the backup created before the update.

- **Q: Where are backups stored?**
  - **A:** In `/opt/ordertakerapp/backups/` on the droplet.

- **Q: Can I download backups to my computer?**
  - **A:** Yes. Use `scp root@165.232.167.105:/opt/ordertakerapp/backups/*.gz ./`

- **Q: How long are backups kept?**
  - **A:** The 10 most recent backups are kept automatically.
