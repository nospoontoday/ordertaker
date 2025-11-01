# Manually Create Admin User in MongoDB

Complete guide to manually create an admin user in MongoDB without running seeders.

---

## Quick Method (Recommended)

### Step 1: Connect to MongoDB

```bash
ssh root@165.232.167.105
cd /opt/ordertakerapp

docker exec -it ordertaker-mongo mongosh \
  --username admin \
  --password password123 \
  --authenticationDatabase admin
```

### Step 2: Create Admin User

```javascript
// Switch to ordertaker database
use ordertaker

// Create admin user
db.users.insertOne({
  email: "oliverjohnpr2013@gmail.com",
  password: "$2a$10$abcdefghijklmnopqrstuvwxyz1234567890", // bcrypt hashed password
  role: "super_admin",
  name: "John (Admin)",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
})
```

### Step 3: Verify User Created

```javascript
db.users.findOne({ email: "oliverjohnpr2013@gmail.com" })
```

Should return the user document.

### Step 4: Exit MongoDB

```javascript
exit
```

---

## Using Node.js Script (Better - Hashes Password)

### Step 1: Create a Script

```bash
ssh root@165.232.167.105
cd /opt/ordertakerapp/backend

cat > create-admin.js << 'EOF'
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const createAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'oliverjohnpr2013@gmail.com' });
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists');
      await mongoose.connection.close();
      process.exit(0);
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('123456', salt);

    // Create admin user
    const admin = new User({
      email: 'oliverjohnpr2013@gmail.com',
      password: hashedPassword,
      role: 'super_admin',
      name: 'John (Admin)',
      isActive: true
    });

    await admin.save();
    console.log('✓ Admin user created successfully');
    console.log('  Email: oliverjohnpr2013@gmail.com');
    console.log('  Password: 123456');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

createAdmin();
EOF
```

### Step 2: Run the Script

```bash
node create-admin.js
```

**Expected output:**
```
✓ Connected to MongoDB
✓ Admin user created successfully
  Email: oliverjohnpr2013@gmail.com
  Password: 123456
```

### Step 3: Verify in MongoDB

```bash
docker exec -it ordertaker-mongo mongosh \
  --username admin \
  --password password123 \
  --authenticationDatabase admin \
  --eval "use ordertaker; db.users.findOne({ email: 'oliverjohnpr2013@gmail.com' })"
```

---

## Manual MongoDB Method (Advanced)

If you need to manually hash the password:

### Step 1: Generate Bcrypt Hash

```bash
# On your local machine or droplet
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('123456', 10, (err, hash) => { console.log(hash); });"
```

**Output example:**
```
$2a$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqr
```

### Step 2: Connect to MongoDB

```bash
docker exec -it ordertaker-mongo mongosh \
  --username admin \
  --password password123 \
  --authenticationDatabase admin
```

### Step 3: Insert User with Hashed Password

```javascript
use ordertaker

db.users.insertOne({
  email: "oliverjohnpr2013@gmail.com",
  password: "$2a$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqr",
  role: "super_admin",
  name: "John (Admin)",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
})
```

### Step 4: Verify

```javascript
db.users.findOne({ email: "oliverjohnpr2013@gmail.com" })
```

---

## Create Multiple Users

### Using Node.js Script

```bash
cat > create-users.js << 'EOF'
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const createUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB');

    // Clear existing users
    await User.deleteMany({});
    console.log('✓ Cleared existing users');

    const salt = await bcrypt.genSalt(10);
    const users = [
      {
        email: 'oliverjohnpr2013@gmail.com',
        password: '123456',
        role: 'super_admin',
        name: 'John (Admin)'
      },
      {
        email: 'elwin@mail.com',
        password: '123456',
        role: 'order_taker_crew',
        name: 'Elwin'
      },
      {
        email: 'krisnela@mail.com',
        password: '123456',
        role: 'order_taker_crew',
        name: 'Krisnela'
      },
      {
        email: 'jowicks@mail.com',
        password: '123456',
        role: 'crew',
        name: 'Jowicks'
      }
    ];

    for (const userData of users) {
      const hashedPassword = await bcrypt.hash(userData.password, salt);
      const user = new User({
        email: userData.email,
        password: hashedPassword,
        role: userData.role,
        name: userData.name,
        isActive: true
      });
      await user.save();
      console.log(`✓ Created: ${userData.email}`);
    }

    console.log('\n✓ All users created successfully');
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

createUsers();
EOF

node create-users.js
```

---

## Verify Admin User

### Check in App

```
http://165.232.167.105
```

**Login with:**
```
Email: oliverjohnpr2013@gmail.com
Password: 123456
```

### Check in MongoDB

```bash
docker exec -it ordertaker-mongo mongosh \
  --username admin \
  --password password123 \
  --authenticationDatabase admin \
  --eval "use ordertaker; db.users.find().pretty()"
```

---

## Troubleshooting

### User Not Found After Creation

```bash
# Check if user exists
docker exec -it ordertaker-mongo mongosh \
  --username admin \
  --password password123 \
  --authenticationDatabase admin \
  --eval "use ordertaker; db.users.countDocuments()"
```

If count is 0, user wasn't created. Try again.

### Can't Login After Creation

1. **Clear browser cache:**
   - Press `Ctrl+Shift+Delete`
   - Clear all cache
   - Try again

2. **Check password hash:**
   ```bash
   docker exec -it ordertaker-mongo mongosh \
     --username admin \
     --password password123 \
     --authenticationDatabase admin \
     --eval "use ordertaker; db.users.findOne({ email: 'oliverjohnpr2013@gmail.com' }).password"
   ```
   Should show a bcrypt hash starting with `$2a$` or `$2b$`

3. **Recreate user:**
   ```bash
   cd /opt/ordertakerapp/backend
   node create-admin.js
   ```

### MongoDB Connection Error

```bash
# Check if MongoDB is running
docker compose -f docker-compose.prod.yml ps

# If not running, start it
docker compose -f docker-compose.prod.yml up -d

# Wait and try again
sleep 5
```

---

## Quick Reference

### Create Admin Only

```bash
cd /opt/ordertakerapp/backend
node create-admin.js
```

### Create All Users

```bash
cd /opt/ordertakerapp/backend
node scripts/seedAdmin.js
```

### Verify Users

```bash
docker exec -it ordertaker-mongo mongosh \
  --username admin \
  --password password123 \
  --authenticationDatabase admin \
  --eval "use ordertaker; db.users.find().pretty()"
```

### Delete All Users

```bash
docker exec -it ordertaker-mongo mongosh \
  --username admin \
  --password password123 \
  --authenticationDatabase admin \
  --eval "use ordertaker; db.users.deleteMany({})"
```

---

## Default Credentials

```
Admin:
  Email: oliverjohnpr2013@gmail.com
  Password: 123456
  Role: super_admin

Crew Members:
  Elwin: elwin@mail.com / 123456
  Krisnela: krisnela@mail.com / 123456
  Jowicks: jowicks@mail.com / 123456
```

⚠️ **Change these passwords after login!**

---

**Last Updated:** November 1, 2024
