require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

/**
 * Seed Script to Create All Required Users
 * Checks if users exist before creating them (safe for production)
 * Safe to run while backend server is running
 */

const seedUsers = async () => {
  let shouldCloseConnection = false;

  try {
    // Check if already connected
    const wasConnected = mongoose.connection.readyState === 1;

    if (!wasConnected) {
      // Connect to MongoDB only if not already connected
      const mongoUri = process.env.MONGODB_URI;

      if (!mongoUri) {
        console.error('❌ Error: MONGODB_URI environment variable is not set');
        process.exit(1);
      }

      try {
        await mongoose.connect(mongoUri, {
          serverSelectionTimeoutMS: 10000,
        });
        shouldCloseConnection = true; // Only close if we opened it
        console.log(`✓ MongoDB Connected: ${mongoose.connection.host}`);
        console.log(`✓ Database: ${mongoose.connection.name}`);
      } catch (connectError) {
        console.error('❌ Error connecting to MongoDB:', connectError.message);
        process.exit(1);
      }
    } else {
      console.log('✓ Using existing MongoDB connection');
    }

    console.log('\n========================================');
    console.log('Starting User Database Seed');
    console.log('========================================\n');

    const salt = await bcrypt.genSalt(10);

    // Static passwords for all users
    const STATIC_PASSWORD = '123456';
    const passwords = {
      admin: STATIC_PASSWORD,
      elwin: STATIC_PASSWORD,
      krisnela: STATIC_PASSWORD,
      jowicks: STATIC_PASSWORD,
      allen: STATIC_PASSWORD,
      jay: STATIC_PASSWORD,
      baan1: STATIC_PASSWORD
    };

    // Helper function to create user if not exists
    const createUserIfNotExists = async (userData, password) => {
      const existingUser = await User.findOne({ email: userData.email });
      if (existingUser) {
        console.log(`⊘ User ${userData.email} already exists - skipping`);
        return existingUser;
      }

      const hashedPassword = await bcrypt.hash(password, salt);
      const user = new User({
        ...userData,
        password: hashedPassword
      });
      await user.save();
      console.log(`✓ Created user: ${userData.email} (${userData.role})`);
      return user;
    };

    // 1. Admin user
    const admin = await createUserIfNotExists({
      email: 'oliverjohnpr2013@gmail.com',
      role: 'super_admin',
      name: 'John (Admin)',
      isActive: true
    }, passwords.admin);

    // 2. Elwin - Order Taker + Crew
    const elwin = await createUserIfNotExists({
      email: 'elwin@mail.com',
      role: 'order_taker_crew',
      name: 'Elwin',
      isActive: true
    }, passwords.elwin);

    // 3. Krisnela - Order Taker + Crew
    const krisnela = await createUserIfNotExists({
      email: 'krisnela@mail.com',
      role: 'order_taker_crew',
      name: 'Krisnela',
      isActive: true
    }, passwords.krisnela);

    // 4. Jowicks - Order Taker + Crew
    const jowicks = await createUserIfNotExists({
      email: 'jowicks@mail.com',
      role: 'order_taker_crew',
      name: 'Jowicks',
      isActive: true
    }, passwords.jowicks);

    // 5. Allen - Order Taker + Crew
    const allen = await createUserIfNotExists({
      email: 'allen@mail.com',
      role: 'order_taker_crew',
      name: 'Allen',
      isActive: true
    }, passwords.allen);

    // 6. Jay - Order Taker + Crew
    const jay = await createUserIfNotExists({
      email: 'jay@mail.com',
      role: 'order_taker_crew',
      name: 'Jay',
      isActive: true
    }, passwords.jay);

    // 7. Baan 1 - Order Taker + Crew
    const baan1 = await createUserIfNotExists({
      email: 'baan1@mail.com',
      role: 'order_taker_crew',
      name: 'Baan 1',
      isActive: true
    }, passwords.baan1);

    console.log('\n✓ User seeding completed successfully\n');
    console.log('User Credentials:');
    console.log('=================');
    console.log(`1. Admin (Super Admin)`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Password: ${passwords.admin}`);
    console.log('');
    console.log(`2. Elwin (Order Taker + Crew)`);
    console.log(`   Email: ${elwin.email}`);
    console.log(`   Password: ${passwords.elwin}`);
    console.log('');
    console.log(`3. Krisnela (Order Taker + Crew)`);
    console.log(`   Email: ${krisnela.email}`);
    console.log(`   Password: ${passwords.krisnela}`);
    console.log('');
    console.log(`4. Jowicks (Order Taker + Crew)`);
    console.log(`   Email: ${jowicks.email}`);
    console.log(`   Password: ${passwords.jowicks}`);
    console.log('');
    console.log(`5. Allen (Order Taker + Crew)`);
    console.log(`   Email: ${allen.email}`);
    console.log(`   Password: ${passwords.allen}`);
    console.log('');
    console.log(`6. Jay (Order Taker + Crew)`);
    console.log(`   Email: ${jay.email}`);
    console.log(`   Password: ${passwords.jay}`);
    console.log('');
    console.log(`7. Baan 1 (Order Taker + Crew)`);
    console.log(`   Email: ${baan1.email}`);
    console.log(`   Password: ${passwords.baan1}`);
    console.log('');
    console.log('⚠️  IMPORTANT: Save these passwords securely!');
    console.log('⚠️  Users should change their passwords after first login!');

    console.log('\n========================================');
    console.log('Seed completed successfully!');
    console.log('========================================\n');

  } catch (error) {
    console.error('\n❌ Error seeding database:', error);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  } finally {
    // Only close connection if we opened it
    // Don't close if it was already open (main server's connection)
    if (shouldCloseConnection && mongoose.connection.readyState === 1) {
      try {
        await mongoose.connection.close();
        console.log('✓ MongoDB connection closed');
      } catch (closeError) {
        console.error('Warning: Error closing connection:', closeError.message);
      }
    }
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled promise rejection:', error);
  process.exit(1);
});

// Run the seed script
seedUsers().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
