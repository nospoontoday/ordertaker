require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const connectDB = require('../config/db');

/**
 * Seed Script to Create Super Admin User
 * Clears all existing users and creates the super admin
 */

const seedAdmin = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    console.log('\n========================================');
    console.log('Starting User Database Seed');
    console.log('========================================\n');

    // Clear all existing users
    console.log('Clearing existing users...');
    const deleteResult = await User.deleteMany({});
    console.log(`✓ Deleted ${deleteResult.deletedCount} existing users\n`);

    // Hash password for super admin
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    // Create super admin user
    const superAdmin = new User({
      email: 'oliverjohnpr2013@gmail.com',
      password: hashedPassword,
      role: 'super_admin',
      name: 'Super Admin',
      isActive: true
    });

    await superAdmin.save();
    console.log('✓ Super Admin created successfully');
    console.log('\nSuper Admin Details:');
    console.log('-------------------');
    console.log(`Email: ${superAdmin.email}`);
    console.log(`Role: ${superAdmin.role}`);
    console.log(`Name: ${superAdmin.name}`);
    console.log('Password: admin123');
    console.log('\n⚠️  IMPORTANT: Change the default password after first login!');

    console.log('\n========================================');
    console.log('Seed completed successfully!');
    console.log('========================================\n');

    // Disconnect from MongoDB
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error seeding database:', error);
    process.exit(1);
  }
};

// Run the seed script
seedAdmin();
