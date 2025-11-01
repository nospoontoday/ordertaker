# Verify Production Seeding

Complete guide to confirm that your production database has been successfully seeded.

---

## Quick Verification

### 1. Login to App

```
http://165.232.167.105
```

**Try logging in with:**
```
Email: oliverjohnpr2013@gmail.com
Password: 123456
```

If login works → ✅ Users seeded successfully

---

### 2. Check Menu Items

After logging in:
1. Navigate to the order page
2. Look for menu items (Coffee, Pastries, Sandwiches, etc.)
3. If items appear → ✅ Menu items seeded successfully

---

### 3. Check Crew Members

After logging in as admin:
1. Go to Admin panel
2. Look for user management section
3. Should see 4 users:
   - oliverjohnpr2013@gmail.com (Admin)
   - elwin@mail.com (Order Taker + Crew)
   - krisnela@mail.com (Order Taker + Crew)
   - jowicks@mail.com (Crew)

If all 4 users appear → ✅ All users seeded successfully

---

## Detailed Verification (MongoDB)

### Connect to MongoDB

```bash
ssh root@165.232.167.105
cd /opt/ordertakerapp

# Connect to MongoDB
docker exec -it ordertaker-mongo mongosh \
  --username admin \
  --password password123 \
  --authenticationDatabase admin
```

### Check Users Collection

```bash
# In MongoDB shell
use ordertaker
db.users.find().pretty()
```

**Expected output:**
```
{
  "_id": ObjectId("..."),
  "email": "oliverjohnpr2013@gmail.com",
  "password": "...",
  "role": "super_admin",
  "name": "John (Admin)",
  "isActive": true,
  ...
}
{
  "_id": ObjectId("..."),
  "email": "elwin@mail.com",
  "password": "...",
  "role": "order_taker_crew",
  "name": "Elwin",
  "isActive": true,
  ...
}
...
```

**Count users:**
```bash
db.users.countDocuments()
```

Should return: **4**

---

### Check Menu Items Collection

```bash
# In MongoDB shell
db.menuitems.find().pretty()
```

**Expected output:**
```
{
  "_id": ObjectId("..."),
  "name": "Americano",
  "category": ObjectId("..."),
  "price": 3.50,
  "description": "Strong black coffee",
  ...
}
...
```

**Count menu items:**
```bash
db.menuitems.countDocuments()
```

Should return: **Multiple items** (typically 15-20+)

---

### Check Categories Collection

```bash
# In MongoDB shell
db.categories.find().pretty()
```

**Expected output:**
```
{
  "_id": ObjectId("..."),
  "name": "Coffee",
  "description": "Coffee beverages",
  ...
}
{
  "_id": ObjectId("..."),
  "name": "Pastries",
  "description": "Fresh pastries",
  ...
}
...
```

**Count categories:**
```bash
db.categories.countDocuments()
```

Should return: **6** (Coffee, Pastries, Sandwiches, Salads, Beverages, Desserts)

---

### Exit MongoDB

```bash
exit
```

---

## Verification Checklist

### Users
- [ ] Can login with `oliverjohnpr2013@gmail.com` / `123456`
- [ ] Can login with `elwin@mail.com` / `123456`
- [ ] Can login with `krisnela@mail.com` / `123456`
- [ ] Can login with `jowicks@mail.com` / `123456`
- [ ] MongoDB shows 4 users: `db.users.countDocuments()` = 4

### Menu Items
- [ ] Menu items visible in app
- [ ] Can see Coffee items
- [ ] Can see Pastries items
- [ ] Can see Sandwiches items
- [ ] MongoDB shows items: `db.menuitems.countDocuments()` > 0

### Categories
- [ ] Categories visible in app
- [ ] MongoDB shows 6 categories: `db.categories.countDocuments()` = 6

---

## Troubleshooting

### Can't Login

**Problem:** Login fails with seeded credentials

**Solution:**
```bash
# Check if users were actually created
ssh root@165.232.167.105
cd /opt/ordertakerapp/backend

# Reseed users
node scripts/seedAdmin.js

# Check logs
docker compose -f docker-compose.prod.yml logs backend
```

### No Menu Items Visible

**Problem:** Menu items don't appear in app

**Solution:**
```bash
# Check if menu items were created
docker exec -it ordertaker-mongo mongosh \
  --username admin \
  --password password123 \
  --authenticationDatabase admin \
  --eval "use ordertaker; db.menuitems.countDocuments()"

# If 0, reseed menu items
cd /opt/ordertakerapp/backend
node scripts/seedMenuItems.js
```

### MongoDB Connection Error

**Problem:** Can't connect to MongoDB

**Solution:**
```bash
# Check if MongoDB is running
docker compose -f docker-compose.prod.yml ps

# If not running, start it
docker compose -f docker-compose.prod.yml up -d

# Wait a few seconds and try again
sleep 5
docker exec -it ordertaker-mongo mongosh \
  --username admin \
  --password password123 \
  --authenticationDatabase admin
```

---

## Quick Verification Commands

### All in One

```bash
ssh root@165.232.167.105
cd /opt/ordertakerapp

# Check users
docker exec -it ordertaker-mongo mongosh \
  --username admin \
  --password password123 \
  --authenticationDatabase admin \
  --eval "use ordertaker; console.log('Users:', db.users.countDocuments()); console.log('Menu Items:', db.menuitems.countDocuments()); console.log('Categories:', db.categories.countDocuments());"
```

**Expected output:**
```
Users: 4
Menu Items: 15+
Categories: 6
```

---

## After Verification

### If Everything Looks Good ✅

1. Change admin password
2. Change crew member passwords
3. Start using the app!

### If Something is Missing ❌

1. Check logs: `docker compose -f docker-compose.prod.yml logs -f`
2. Reseed: `bash reset-db.sh`
3. Verify again

---

## Expected Data Summary

| Collection | Expected Count | Status |
|-----------|-----------------|--------|
| Users | 4 | ✅ |
| Menu Items | 15+ | ✅ |
| Categories | 6 | ✅ |
| Orders | 0 | ✅ (empty initially) |

---

**Last Updated:** November 1, 2024
