require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

/**
 * Migration Script - Update User Roles and Add New Users
 * - Updates Allen and Jowicks to order_taker_crew
 * - Creates Jay and Baan 1 as order_taker_crew
 * Safe to run multiple times (idempotent)
 */

const migrateUsers = async () => {
  let shouldCloseConnection = false;

  try {
    // Check if already connected
    const wasConnected = mongoose.connection.readyState === 1;

    if (!wasConnected) {
      const mongoUri = process.env.MONGODB_URI;

      if (!mongoUri) {
        console.error('❌ Error: MONGODB_URI environment variable is not set');
        process.exit(1);
      }

      try {
        await mongoose.connect(mongoUri, {
          serverSelectionTimeoutMS: 10000,
        });
        shouldCloseConnection = true;
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
    console.log('Starting User Migration');
    console.log('========================================\n');

    const salt = await bcrypt.genSalt(10);
    const STATIC_PASSWORD = '123456';

    // ========================================
    // PART 1: Update existing users' roles
    // ========================================
    console.log('Part 1: Updating existing user roles...\n');

    const usersToUpdate = [
      { email: 'allen@mail.com', name: 'Allen', newRole: 'order_taker_crew' },
      { email: 'jowicks@mail.com', name: 'Jowicks', newRole: 'order_taker_crew' }
    ];

    for (const user of usersToUpdate) {
      const result = await User.findOneAndUpdate(
        { email: user.email },
        { $set: { role: user.newRole } },
        { new: true }
      );

      if (result) {
        console.log(`✓ Updated ${user.name} (${user.email}) → role: ${user.newRole}`);
      } else {
        console.log(`⚠ User ${user.email} not found - skipping update`);
      }
    }

    // ========================================
    // PART 2: Create new users if not exists
    // ========================================
    console.log('\nPart 2: Creating new users...\n');

    const newUsers = [
      { email: 'jay@mail.com', name: 'Jay', role: 'order_taker_crew' },
      { email: 'baan1@mail.com', name: 'Baan 1', role: 'order_taker_crew' }
    ];

    for (const userData of newUsers) {
      const existingUser = await User.findOne({ email: userData.email });
      
      if (existingUser) {
        console.log(`⊘ User ${userData.email} already exists - skipping`);
      } else {
        const hashedPassword = await bcrypt.hash(STATIC_PASSWORD, salt);
        const user = new User({
          ...userData,
          password: hashedPassword,
          isActive: true
        });
        await user.save();
        console.log(`✓ Created user: ${userData.email} (${userData.role})`);
      }
    }

    console.log('\n========================================');
    console.log('Migration completed successfully!');
    console.log('========================================\n');

    console.log('Summary:');
    console.log('- Allen: updated to order_taker_crew');
    console.log('- Jowicks: updated to order_taker_crew');
    console.log('- Jay: created as order_taker_crew');
    console.log('- Baan 1: created as order_taker_crew');
    console.log('\nAll new user passwords: 123456');

  } catch (error) {
    console.error('\n❌ Error during migration:', error);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  } finally {
    if (shouldCloseConnection && mongoose.connection.readyState === 1) {
      try {
        await mongoose.connection.close();
        console.log('\n✓ MongoDB connection closed');
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

// Run the migration
migrateUsers().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
