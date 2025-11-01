#!/bin/bash

# Database Reset Script - Run on DigitalOcean Droplet
# Clears all data from database and reruns all seeders
# Usage: bash reset-db.sh

set +e

echo "=========================================="
echo "Order Taker App - Database Reset"
echo "=========================================="
echo ""
echo "⚠️  WARNING: This will DELETE ALL data from the database!"
echo ""

# Confirm action
read -p "Are you sure you want to reset the database? (yes/no) " -r
echo ""
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "Database reset cancelled"
    exit 0
fi

echo "Proceeding with database reset..."
echo ""

# Navigate to backend directory
cd /opt/ordertakerapp/backend

# Check if MongoDB is running
echo "Step 1: Checking MongoDB connection..."
echo "=========================================="
if ! docker ps | grep -q ordertaker-mongo; then
    echo "❌ MongoDB container is not running"
    echo "Please start services first:"
    echo "  cd /opt/ordertakerapp"
    echo "  docker compose -f docker-compose.prod.yml up -d"
    exit 1
fi
echo "✓ MongoDB is running"
echo ""

# Install dependencies if needed
echo "Step 2: Installing backend dependencies..."
echo "=========================================="
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "⚠️  Dependency installation had issues, continuing..."
    fi
else
    echo "✓ Dependencies already installed"
fi
echo ""

# Clear all data
echo "Step 3: Clearing all database data..."
echo "=========================================="
echo "Clearing users..."
node -e "
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    await User.deleteMany({});
    console.log('✓ Users cleared');
    await mongoose.connection.close();
  } catch (err) {
    console.error('Error clearing users:', err.message);
    process.exit(1);
  }
})();
" || echo "⚠️  Error clearing users"

echo "Clearing menu items..."
node -e "
require('dotenv').config();
const mongoose = require('mongoose');
const MenuItem = require('../models/MenuItem');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    await MenuItem.deleteMany({});
    console.log('✓ Menu items cleared');
    await mongoose.connection.close();
  } catch (err) {
    console.error('Error clearing menu items:', err.message);
    process.exit(1);
  }
})();
" || echo "⚠️  Error clearing menu items"

echo "Clearing categories..."
node -e "
require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('../models/Category');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    await Category.deleteMany({});
    console.log('✓ Categories cleared');
    await mongoose.connection.close();
  } catch (err) {
    console.error('Error clearing categories:', err.message);
    process.exit(1);
  }
})();
" || echo "⚠️  Error clearing categories"

echo "Clearing orders..."
node -e "
require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('../models/Order');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    await Order.deleteMany({});
    console.log('✓ Orders cleared');
    await mongoose.connection.close();
  } catch (err) {
    console.error('Error clearing orders:', err.message);
    process.exit(1);
  }
})();
" || echo "⚠️  Error clearing orders"

echo ""

# Reseed database
echo "Step 4: Reseeding database..."
echo "=========================================="

echo "Seeding users..."
node scripts/seedAdmin.js
if [ $? -eq 0 ]; then
    echo "✓ Users seeded"
else
    echo "⚠️  Error seeding users"
fi

echo ""
echo "Seeding menu items and categories..."
node scripts/seedMenuItems.js
if [ $? -eq 0 ]; then
    echo "✓ Menu items and categories seeded"
else
    echo "⚠️  Error seeding menu items"
fi

echo ""
echo "Seeding test orders..."
node scripts/seedTestOrders.js
if [ $? -eq 0 ]; then
    echo "✓ Test orders seeded"
else
    echo "⚠️  Error seeding test orders"
fi

echo ""

# Final status
echo "=========================================="
echo "✓ DATABASE RESET COMPLETE!"
echo "=========================================="
echo ""
echo "Database has been cleared and reseeded with:"
echo "  ✓ Admin user and crew members"
echo "  ✓ Menu items and categories"
echo "  ✓ Test orders"
echo ""
echo "Default credentials:"
echo "  Admin: oliverjohnpr2013@gmail.com / 123456"
echo "  Elwin: elwin@mail.com / 123456"
echo "  Krisnela: krisnela@mail.com / 123456"
echo "  Jowicks: jowicks@mail.com / 123456"
echo ""
echo "⚠️  Remember to change passwords after login!"
echo ""
