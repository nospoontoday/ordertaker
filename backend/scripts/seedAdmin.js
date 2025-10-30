require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const connectDB = require('../config/db');

/**
 * Seed Script to Create All Required Users
 * Clears all existing users and creates the predefined users
 */

const seedUsers = async () => {
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

    const salt = await bcrypt.genSalt(10);

    // Static passwords for all users (change these if needed)
    const passwords = {
      admin: 'Admin123!',
      elwin: 'Elwin123!',
      krisnela: 'Krisnela123!',
      jowicks: 'Jowicks123!'
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

    // Disconnect from MongoDB
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error seeding database:', error);
    process.exit(1);
  }
};

// Run the seed script
seedUsers();
