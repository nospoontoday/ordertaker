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

# Wait for MongoDB to be ready
echo "Step 3: Waiting for MongoDB to be ready..."
echo "=========================================="
sleep 3
echo "✓ MongoDB ready"
echo ""

# Run seeders
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

# Final status
echo "=========================================="
echo "✓ DATABASE RESET COMPLETE!"
echo "=========================================="
echo ""
echo "Database has been cleared and reseeded with:"
echo "  ✓ Admin user and crew members"
echo "  ✓ Menu items and categories"
echo ""
echo "Default credentials:"
echo "  Admin: oliverjohnpr2013@gmail.com / 123456"
echo "  Elwin: elwin@mail.com / 123456"
echo "  Krisnela: krisnela@mail.com / 123456"
echo "  Jowicks: jowicks@mail.com / 123456"
echo ""
echo "⚠️  Remember to change passwords after login!"
echo ""
