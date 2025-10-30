require('dotenv').config();
const mongoose = require('mongoose');
const { execSync } = require('child_process');
const path = require('path');
const connectDB = require('../config/db');

// Import models
const User = require('../models/User');
const MenuItem = require('../models/MenuItem');
const Category = require('../models/Category');
const Order = require('../models/Order');
const Withdrawal = require('../models/Withdrawal');

/**
 * Script to Clear Database and Run Seeders
 * Seeds: Roles (Users), Items (MenuItems), Categories
 */

const clearDatabase = async () => {
  try {
    await connectDB();
    
    console.log('\n========================================');
    console.log('Clearing Database');
    console.log('========================================\n');

    // Clear only the collections we're going to seed
    console.log('Clearing Users...');
    const usersResult = await User.deleteMany({});
    console.log(`✓ Deleted ${usersResult.deletedCount} users`);

    console.log('Clearing MenuItems...');
    const menuItemsResult = await MenuItem.deleteMany({});
    console.log(`✓ Deleted ${menuItemsResult.deletedCount} menu items`);

    console.log('Clearing Categories...');
    const categoriesResult = await Category.deleteMany({});
    console.log(`✓ Deleted ${categoriesResult.deletedCount} categories`);

    console.log('Clearing Orders...');
    const ordersResult = await Order.deleteMany({});
    console.log(`✓ Deleted ${ordersResult.deletedCount} orders`);

    console.log('Clearing Withdrawals (withdrawals and purchases)...');
    const withdrawalsResult = await Withdrawal.deleteMany({});
    console.log(`✓ Deleted ${withdrawalsResult.deletedCount} withdrawals/purchases`);

    console.log('\n✓ Database cleared successfully!\n');
    
    await mongoose.connection.close();
  } catch (error) {
    console.error('\n❌ Error clearing database:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

const runSeeders = async () => {
  const backendDir = path.join(__dirname, '..');

  console.log('\n========================================');
  console.log('Running Seeders');
  console.log('========================================\n');

  try {
    // 1. Roles (Users)
    // Note: Roles are strings in User model, not a separate collection
    // They will be set when seeding Users
    console.log('1. Seeding Roles (Users)...');
    console.log('   Running: seedAdmin.js\n');
    execSync('node scripts/seedAdmin.js', {
      cwd: backendDir,
      stdio: 'inherit'
    });
    console.log('   ✓ Roles (Users) seeded successfully\n');

    // Wait a moment between seeders
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 2. Items (MenuItems) and Categories
    // Note: Categories are created automatically during MenuItems seeding
    console.log('2. Seeding Items (MenuItems) and Categories...');
    console.log('   Running: seedMenuItems.js\n');
    execSync('node scripts/seedMenuItems.js', {
      cwd: backendDir,
      stdio: 'inherit'
    });
    console.log('   ✓ Items and Categories seeded successfully\n');

    console.log('\n========================================');
    console.log('All Seeders Completed Successfully!');
    console.log('========================================\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error running seeders:', error);
    process.exit(1);
  }
};

// Main execution
const main = async () => {
  try {
    // Step 1: Clear database
    await clearDatabase();
    
    // Step 2: Run seeders
    await runSeeders();
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
};

// Run the script
main();

