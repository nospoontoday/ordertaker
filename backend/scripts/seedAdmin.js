require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

/**
 * Seed Script to Create All Required Users
 * Clears all existing users and creates the predefined users
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

    // Clear all existing users
    console.log('Clearing existing users...');
    const deleteResult = await User.deleteMany({});
    console.log(`✓ Deleted ${deleteResult.deletedCount} existing users\n`);

    const salt = await bcrypt.genSalt(10);

    // Static passwords for all users
    const STATIC_PASSWORD = '123456';
    const passwords = {
      admin: STATIC_PASSWORD,
      elwin: STATIC_PASSWORD,
      krisnela: STATIC_PASSWORD,
      jowicks: STATIC_PASSWORD
    };

    // 1. Admin user
    const adminPassword = await bcrypt.hash(passwords.admin, salt);
    const admin = new User({
      email: 'oliverjohnpr2013@gmail.com',
      password: adminPassword,
      role: 'super_admin',
      name: 'John (Admin)',
      isActive: true
    });
    await admin.save();

    // 2. Elwin - Order Taker + Crew
    const elwinPassword = await bcrypt.hash(passwords.elwin, salt);
    const elwin = new User({
      email: 'elwin@mail.com',
      password: elwinPassword,
      role: 'order_taker_crew',
      name: 'Elwin',
      isActive: true
    });
    await elwin.save();

    // 3. Krisnela - Order Taker + Crew
    const krisnelaPassword = await bcrypt.hash(passwords.krisnela, salt);
    const krisnela = new User({
      email: 'krisnela@mail.com',
      password: krisnelaPassword,
      role: 'order_taker_crew',
      name: 'Krisnela',
      isActive: true
    });
    await krisnela.save();

    // 4. Jowicks - Crew
    const jowicksPassword = await bcrypt.hash(passwords.jowicks, salt);
    const jowicks = new User({
      email: 'jowicks@mail.com',
      password: jowicksPassword,
      role: 'crew',
      name: 'Jowicks',
      isActive: true
    });
    await jowicks.save();

    console.log('\n✓ All users created successfully\n');
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
    console.log(`4. Jowicks (Crew)`);
    console.log(`   Email: ${jowicks.email}`);
    console.log(`   Password: ${passwords.jowicks}`);
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
