require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('../models/Order');
const connectDB = require('../config/db');

/**
 * Script to Clear All Orders
 * Removes all orders from the database
 */

const clearOrders = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    console.log('\n========================================');
    console.log('Starting Order Database Cleanup');
    console.log('========================================\n');

    // Clear all orders
    console.log('Clearing all orders...');
    const deleteResult = await Order.deleteMany({});
    console.log(`✓ Deleted ${deleteResult.deletedCount} orders\n`);

    console.log('========================================');
    console.log('All orders cleared successfully!');
    console.log('========================================\n');

    // Disconnect from MongoDB
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error clearing orders:', error);
    process.exit(1);
  }
};

// Run the script
clearOrders();
