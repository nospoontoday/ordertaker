# Database Seeding Guide

Complete guide for seeding your Order Taker App database with initial data.

---

## Overview

The seeding process populates your database with:
- **Users** - Admin and crew members
- **Menu Items** - Food/beverage items
- **Categories** - Item categories
- **Test Orders** - Sample orders for testing

---

## Automatic Seeding (During Deployment)

The `start-prod.sh` script automatically runs all seeders during deployment:

```bash
bash start-prod.sh
```

**What gets seeded:**
1. ✅ Users (admin + crew)
2. ✅ Menu items and categories
3. ✅ Test orders (optional)

---

## Manual Seeding

### Prerequisites

```bash
# SSH into droplet
ssh root@165.232.167.105
cd /opt/ordertakerapp/backend

# Install dependencies (if not already installed)
npm install
```

### Seed Users

Seeds admin user and crew members:

```bash
node scripts/seedAdmin.js
```

**Creates:**
- Admin: `oliverjohnpr2013@gmail.com` / `123456`
- Elwin: `elwin@mail.com` / `123456` (Order Taker + Crew)
- Krisnela: `krisnela@mail.com` / `123456` (Order Taker + Crew)
- Jowicks: `jowicks@mail.com` / `123456` (Crew)

### Seed Menu Items & Categories

Seeds food/beverage items and categories:

```bash
node scripts/seedMenuItems.js
```

**Creates:**
- Categories (Coffee, Pastries, Sandwiches, etc.)
- Menu items with prices and descriptions

### Seed All at Once

Run all seeders in sequence:

```bash
# From backend directory
node scripts/seedAdmin.js && \
node scripts/seedMenuItems.js
```

---

## Seeder Scripts

### 1. seedAdmin.js

**Purpose:** Create users and roles

**File:** `backend/scripts/seedAdmin.js`

**What it does:**
- Clears existing users
- Creates admin user
- Creates crew members with different roles
- Hashes passwords with bcrypt

**Output:**
```
✓ All users created successfully

User Credentials:
=================
1. Admin (Super Admin)
   Email: oliverjohnpr2013@gmail.com
   Password: 123456

2. Elwin (Order Taker + Crew)
   Email: elwin@mail.com
   Password: 123456

3. Krisnela (Order Taker + Crew)
   Email: krisnela@mail.com
   Password: 123456

4. Jowicks (Crew)
   Email: jowicks@mail.com
   Password: 123456
```

---

### 2. seedMenuItems.js

**Purpose:** Create menu items and categories

**File:** `backend/scripts/seedMenuItems.js`

**What it does:**
- Creates food/beverage categories
- Creates menu items with prices
- Associates items with categories

**Categories created:**
- Coffee
- Pastries
- Sandwiches
- Salads
- Beverages
- Desserts

---

### 3. seedTestOrders.js

**Purpose:** Create sample orders for testing

**File:** `backend/scripts/seedTestOrders.js`

**What it does:**
- Creates test orders with various statuses
- Includes different order items
- Sets different timestamps for testing reports

**Order statuses:**
- Pending
- Confirmed
- Completed
- Cancelled

---

### 4. seedTransactions.js

**Purpose:** Create sample transactions (optional)

**File:** `backend/scripts/seedTransactions.js`

**Usage:**
```bash
node scripts/seedTransactions.js
```

---

## Clearing Data

### Clear All Users

```bash
node scripts/seedAdmin.js
```

This script clears all users before seeding new ones.

### Clear All Orders

```bash
node scripts/clearOrders.js
```

Clears all orders from the database.

### Clear and Reseed Everything

```bash
node scripts/clearAndSeed.js
```

Clears all data and runs all seeders.

---

## Troubleshooting

### "Cannot find module dotenv"

**Problem:** Dependencies not installed

**Solution:**
```bash
cd backend
npm install
node scripts/seedAdmin.js
```

### "MONGODB_URI environment variable is not set"

**Problem:** Environment variables not loaded

**Solution:**
```bash
# Make sure .env file exists in backend directory
cat backend/.env

# Should contain:
# MONGODB_URI=mongodb://admin:password123@mongo:27017/ordertaker?authSource=admin

# If missing, copy from .env.prod
cp backend/.env.prod backend/.env
```

### "Connection refused"

**Problem:** MongoDB not running

**Solution:**
```bash
# Check if MongoDB container is running
docker compose -f docker-compose.prod.yml ps

# If not running, start it
docker compose -f docker-compose.prod.yml up -d
```

### "User already exists"

**Problem:** Users already seeded

**Solution:**
```bash
# The script will clear existing users before seeding
# Just run it again
node scripts/seedAdmin.js
```

---

## Default Credentials

### Admin User

```
Email: oliverjohnpr2013@gmail.com
Password: 123456
Role: Super Admin
```

### Crew Members

```
1. Elwin
   Email: elwin@mail.com
   Password: 123456
   Role: Order Taker + Crew

2. Krisnela
   Email: krisnela@mail.com
   Password: 123456
   Role: Order Taker + Crew

3. Jowicks
   Email: jowicks@mail.com
   Password: 123456
   Role: Crew
```

⚠️ **IMPORTANT:** Change these passwords after first login!

---

## Seeding During Deployment

The `start-prod.sh` script automatically:

1. Installs backend dependencies
2. Runs `seedAdmin.js` (users)
3. Runs `seedMenuItems.js` (menu items)
4. Runs `seedTestOrders.js` (test orders)

**No manual action needed!**

---

## Seeding After Deployment

To reseed data after deployment:

```bash
ssh root@165.232.167.105
cd /opt/ordertakerapp/backend

# Reseed all data
node scripts/seedAdmin.js
node scripts/seedMenuItems.js
node scripts/seedTestOrders.js
```

---

## Verifying Seeded Data

### Check Users

```bash
ssh root@165.232.167.105
cd /opt/ordertakerapp

# Connect to MongoDB
docker exec -it ordertaker-mongo mongosh \
  --username admin \
  --password password123 \
  --authenticationDatabase admin \
  --eval "db.users.find().pretty()"
```

### Check Menu Items

```bash
docker exec -it ordertaker-mongo mongosh \
  --username admin \
  --password password123 \
  --authenticationDatabase admin \
  --eval "db.menuitems.find().pretty()"
```

### Check Orders

```bash
docker exec -it ordertaker-mongo mongosh \
  --username admin \
  --password password123 \
  --authenticationDatabase admin \
  --eval "db.orders.find().pretty()"
```

---

## Quick Commands

```bash
# SSH to droplet
ssh root@165.232.167.105

# Navigate to backend
cd /opt/ordertakerapp/backend

# Install dependencies
npm install

# Seed users
node scripts/seedAdmin.js

# Seed menu items
node scripts/seedMenuItems.js

# Seed test orders
node scripts/seedTestOrders.js

# Seed all at once
node scripts/seedAdmin.js && node scripts/seedMenuItems.js && node scripts/seedTestOrders.js

# Clear orders
node scripts/clearOrders.js

# Clear and reseed everything
node scripts/clearAndSeed.js
```

---

## Environment Variables

Make sure these are set in `backend/.env`:

```bash
MONGODB_URI=mongodb://admin:password123@mongo:27017/ordertaker?authSource=admin
NODE_ENV=production
PORT=5000
FRONTEND_URL=http://165.232.167.105
```

---

## Support

For issues:
1. Check logs: `docker compose -f docker-compose.prod.yml logs -f`
2. Verify MongoDB is running: `docker compose -f docker-compose.prod.yml ps`
3. Check environment variables: `cat backend/.env`
4. Review seeder scripts: `backend/scripts/`

---

**Last Updated:** November 1, 2024
