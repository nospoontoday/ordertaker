require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const Withdrawal = require('../models/Withdrawal');
const connectDB = require('../config/db');

/**
 * Script to Seed Test Orders for Past Dates
 * Creates completed orders for past dates to test sales-reports page
 */

const seedTestOrders = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    console.log('\n========================================');
    console.log('Starting Test Orders Seed');
    console.log('========================================\n');

    // Get menu items (or create some if none exist)
    let menuItems = await MenuItem.find({});
    
    if (menuItems.length === 0) {
      console.log('No menu items found. Creating sample menu items...');
      
      const sampleMenuItems = [
        { name: "Espresso", price: 3.5, category: "coffee", isBestSeller: true, image: "/espresso-shot.png" },
        { name: "Cappuccino", price: 4.5, category: "coffee", isBestSeller: true, image: "/frothy-cappuccino.png" },
        { name: "Latte", price: 4.5, category: "coffee", isBestSeller: true, image: "/latte-art.png" },
        { name: "Americano", price: 3.0, category: "coffee", image: "/americano-coffee.png" },
        { name: "Croissant", price: 3.5, category: "pastry", isBestSeller: true, image: "/golden-croissant.png" },
        { name: "Muffin", price: 3.0, category: "pastry", isBestSeller: true, image: "/blueberry-muffin.png" },
        { name: "Sandwich", price: 7.5, category: "food", isBestSeller: true, image: "/classic-sandwich.png" },
        { name: "Salad", price: 8.0, category: "food", image: "/vibrant-mixed-salad.png" },
      ];

      for (const item of sampleMenuItems) {
        const menuItem = new MenuItem(item);
        await menuItem.save();
      }
      
      menuItems = await MenuItem.find({});
      console.log(`✓ Created ${menuItems.length} menu items\n`);
    }

    console.log(`✓ Found ${menuItems.length} menu items\n`);

    // Create orders for past dates (last 7 days)
    const now = new Date();
    const ordersCreated = [];
    const withdrawalsCreated = [];

    for (let dayOffset = 1; dayOffset <= 7; dayOffset++) {
      // Create date for business day (8AM to 1AM next day)
      const businessDay = new Date(now);
      businessDay.setDate(businessDay.getDate() - dayOffset);
      
      // Create multiple orders throughout the business day
      const ordersPerDay = Math.floor(Math.random() * 5) + 3; // 3-7 orders per day
      
      for (let orderNum = 0; orderNum < ordersPerDay; orderNum++) {
        // Random time between 9AM and 11PM for this business day
        const orderDate = new Date(businessDay);
        const randomHour = 9 + Math.floor(Math.random() * 14); // 9AM to 11PM
        const randomMinute = Math.floor(Math.random() * 60);
        orderDate.setHours(randomHour, randomMinute, 0, 0);
        const createdAt = orderDate.getTime();

        // Create order with random items
        const numItems = Math.floor(Math.random() * 4) + 1; // 1-4 items
        const selectedItems = [];
        for (let i = 0; i < numItems; i++) {
          const randomMenuItem = menuItems[Math.floor(Math.random() * menuItems.length)];
          const quantity = Math.floor(Math.random() * 3) + 1; // 1-3 quantity
          
          selectedItems.push({
            id: randomMenuItem._id.toString(),
            name: randomMenuItem.name,
            price: randomMenuItem.price,
            quantity: quantity,
            status: 'served',
            itemType: Math.random() > 0.5 ? 'dine-in' : 'take-out',
          });
        }

        // Random payment method
        const paymentMethods = ['cash', 'gcash', 'cash', 'gcash', 'cash']; // More cash than gcash
        const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];

        const order = new Order({
          id: `order-test-${createdAt}-${orderNum}`,
          customerName: `Customer ${orderNum + 1} - Day ${dayOffset}`,
          items: selectedItems,
          createdAt: createdAt,
          isPaid: true,
          paymentMethod: paymentMethod,
          orderType: Math.random() > 0.5 ? 'dine-in' : 'take-out',
          appendedOrders: [],
        });

        await order.save();
        ordersCreated.push(order);
      }

      // Create some withdrawals/purchases for each day
      const hasWithdrawals = Math.random() > 0.3; // 70% chance
      if (hasWithdrawals) {
        const withdrawalDate = new Date(businessDay);
        withdrawalDate.setHours(10 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60), 0, 0);
        
        const withdrawalTypes = ['withdrawal', 'purchase'];
        const descriptions = [
          { withdrawal: ['Gas for generator', 'Cash for change', 'Daily cash withdrawal'], 
            purchase: ['Water refill', 'Miscellaneous fees', 'Office supplies'] }
        ];

        const type = withdrawalTypes[Math.floor(Math.random() * withdrawalTypes.length)];
        const descOptions = type === 'withdrawal' 
          ? ['Gas for generator', 'Cash for change', 'Daily cash withdrawal']
          : ['Water refill', 'Miscellaneous fees', 'Office supplies'];
        
        const withdrawal = new Withdrawal({
          type: type,
          amount: parseFloat((Math.random() * 500 + 50).toFixed(2)), // 50-550
          description: descOptions[Math.floor(Math.random() * descOptions.length)],
          createdAt: withdrawalDate.getTime(),
          createdBy: {
            userId: 'test-user-1',
            name: 'Test User',
            email: 'test@example.com',
          },
          paymentMethod: Math.random() > 0.5 ? 'cash' : null,
        });

        await withdrawal.save();
        withdrawalsCreated.push(withdrawal);
      }
    }

    console.log(`✓ Created ${ordersCreated.length} test orders`);
    console.log(`✓ Created ${withdrawalsCreated.length} test withdrawals/purchases`);
    console.log('\n========================================');
    console.log('Test orders seed completed successfully!');
    console.log('========================================\n');

    // Disconnect from MongoDB
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error seeding test orders:', error);
    process.exit(1);
  }
};

// Run the seed script
seedTestOrders();

