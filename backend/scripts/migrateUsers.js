require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

/**
 * Migration Script - Update User Roles and Add New Users
 * - Updates Allen, Jowicks, Jay, Baan 1 to 'staff' role
 * - Creates users if they don't exist
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
    // Update/Create users with 'staff' role
    // ========================================
    console.log('Updating users to staff role...\n');

    const staffUsers = [
      { email: 'allen@mail.com', name: 'Allen' },
      { email: 'jowicks@mail.com', name: 'Jowicks' },
      { email: 'jay@mail.com', name: 'Jay' },
      { email: 'baan1@mail.com', name: 'Baan 1' }
    ];

    for (const userData of staffUsers) {
      const existingUser = await User.findOne({ email: userData.email });
      
      if (existingUser) {
        // Update existing user's role to staff
        await User.findOneAndUpdate(
          { email: userData.email },
          { $set: { role: 'staff' } },
          { new: true }
        );
        console.log(`✓ Updated ${userData.name} (${userData.email}) → role: staff`);
      } else {
        // Create new user with staff role
        const hashedPassword = await bcrypt.hash(STATIC_PASSWORD, salt);
        const user = new User({
          ...userData,
          role: 'staff',
          password: hashedPassword,
          isActive: true
        });
        await user.save();
        console.log(`✓ Created user: ${userData.email} (staff)`);
      }
    }

    console.log('\n========================================');
    console.log('Migration completed successfully!');
    console.log('========================================\n');

    console.log('Summary:');
    console.log('- Allen: staff role');
    console.log('- Jowicks: staff role');
    console.log('- Jay: staff role');
    console.log('- Baan 1: staff role');
    console.log('\nAll user passwords: 123456');

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
