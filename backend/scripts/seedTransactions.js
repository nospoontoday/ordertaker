require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const Withdrawal = require('../models/Withdrawal');
const connectDB = require('../config/db');

/**
 * Seed Script for Historical Transactions
 * Generates completed orders (sales) and withdrawals/purchases for past days
 * All transactions are assumed paid in cash and withdrawn in cash
 */

const seedTransactions = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    console.log('\n========================================');
    console.log('Starting Historical Transactions Seed');
    console.log('========================================\n');

    // Get menu items
    const menuItems = await MenuItem.find({});
    
    if (menuItems.length === 0) {
      console.error('❌ No menu items found. Please seed menu items first.');
      await mongoose.connection.close();
      process.exit(1);
    }

    console.log(`✓ Found ${menuItems.length} menu items\n`);

    // Separate menu items by owner
    const johnItems = menuItems.filter(item => item.owner === 'john');
    const elwinItems = menuItems.filter(item => item.owner === 'elwin');

    console.log(`  - John's items: ${johnItems.length}`);
    console.log(`  - Elwin's items: ${elwinItems.length}\n`);

    if (johnItems.length === 0 || elwinItems.length === 0) {
      console.warn('⚠️  Warning: Not all owners have items. Some sales may not be generated.\n');
    }

    // Sample customer names
    const customerNames = [
      'John Doe', 'Jane Smith', 'Mike Johnson', 'Sarah Williams', 'David Brown',
      'Emily Davis', 'Chris Anderson', 'Lisa Martinez', 'Tom Wilson', 'Amy Taylor',
      'Ryan Moore', 'Jessica Garcia', 'Kevin Lee', 'Amanda White', 'Brian Harris',
      'Nicole Clark', 'Daniel Lewis', 'Michelle Walker', 'Andrew Hall', 'Rachel Young'
    ];

    // Sample withdrawal/purchase descriptions
    const withdrawalDescriptions = [
      'Cash withdrawal for operations',
      'Daily cash withdrawal',
      'Withdrawal for petty cash',
      'Cash out for expenses'
    ];

    const purchaseDescriptions = [
      'Water supply',
      'Gas/Utility',
      'Supplies purchase',
      'Miscellaneous expenses',
      'Ingredient purchase',
      'Equipment maintenance',
      'Cleaning supplies',
      'Paper supplies',
      'Coffee beans supply',
      'Food ingredients'
    ];

    const now = new Date();
    const ordersCreated = [];
    const withdrawalsCreated = [];
    const purchasesCreated = [];

    // Generate data for the last 30 days
    const daysToGenerate = 30;
    
    console.log(`Generating transactions for the last ${daysToGenerate} days...\n`);

    for (let dayOffset = 1; dayOffset <= daysToGenerate; dayOffset++) {
      // Create date for business day (8AM to 1AM next day)
      const businessDay = new Date(now);
      businessDay.setDate(businessDay.getDate() - dayOffset);
      
      // Generate sales (completed orders) for this day
      const ordersPerDay = Math.floor(Math.random() * 8) + 5; // 5-12 orders per day
      
      for (let orderNum = 0; orderNum < ordersPerDay; orderNum++) {
        // Random time between 9AM and 11PM for this business day
        const orderDate = new Date(businessDay);
        const randomHour = 9 + Math.floor(Math.random() * 14); // 9AM to 11PM
        const randomMinute = Math.floor(Math.random() * 60);
        orderDate.setHours(randomHour, randomMinute, 0, 0);
        const createdAt = orderDate.getTime();

        // Determine which owner's items to use (random, but can mix both)
        const useJohnItems = Math.random() > 0.3; // 70% chance to use John's items
        const useElwinItems = Math.random() > 0.3; // 70% chance to use Elwin's items
        
        // Create order with random items
        const numItems = Math.floor(Math.random() * 3) + 1; // 1-3 items
        const selectedItems = [];
        
        // Select items based on owner preference
        let availableItems = [];
        if (useJohnItems && useElwinItems) {
          // Mix both owners
          availableItems = [...johnItems, ...elwinItems];
        } else if (useJohnItems) {
          availableItems = johnItems;
        } else if (useElwinItems) {
          availableItems = elwinItems;
        } else {
          // Fallback to all items
          availableItems = menuItems;
        }

        if (availableItems.length === 0) {
          availableItems = menuItems;
        }

        for (let i = 0; i < numItems; i++) {
          const randomMenuItem = availableItems[Math.floor(Math.random() * availableItems.length)];
          const quantity = Math.floor(Math.random() * 2) + 1; // 1-2 quantity
          
          selectedItems.push({
            id: randomMenuItem._id.toString(),
            name: randomMenuItem.name,
            price: randomMenuItem.price,
            quantity: quantity,
            status: 'served',
            itemType: Math.random() > 0.5 ? 'dine-in' : 'take-out',
            servedAt: createdAt + (i * 60000 * Math.random() * 30), // Random serve time
            servedBy: 'Krisnela',
            servedByEmail: 'krisnela@mail.com'
          });
        }

        // All transactions paid in cash (as specified)
        const totalAmount = selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        const order = new Order({
          id: `order-hist-${createdAt}-${orderNum}`,
          orderNumber: ordersCreated.length + 1,
          customerName: customerNames[Math.floor(Math.random() * customerNames.length)],
          items: selectedItems,
          createdAt: createdAt,
          isPaid: true,
          paymentMethod: 'cash', // All paid in cash
          cashAmount: totalAmount,
          gcashAmount: 0,
          orderType: Math.random() > 0.5 ? 'dine-in' : 'take-out',
          appendedOrders: [],
          allItemsServedAt: createdAt + (selectedItems.length * 60000 * 10), // All items served within 10 minutes
          orderTakerName: 'Elwin',
          orderTakerEmail: 'elwin@mail.com'
        });

        await order.save();
        ordersCreated.push(order);
      }

      // Generate withdrawals for this day (0-3 withdrawals per day)
      const withdrawalsPerDay = Math.floor(Math.random() * 3); // 0-2 withdrawals
      for (let i = 0; i < withdrawalsPerDay; i++) {
        const withdrawalDate = new Date(businessDay);
        const randomHour = 10 + Math.floor(Math.random() * 10); // 10AM to 8PM
        const randomMinute = Math.floor(Math.random() * 60);
        withdrawalDate.setHours(randomHour, randomMinute, 0, 0);
        const withdrawalTime = withdrawalDate.getTime();

        // Random amount between 200 and 2000
        const amount = Math.floor(Math.random() * 1800) + 200;

        // Random owner (john, elwin, or all)
        const chargedToOptions = ['john', 'elwin', 'all'];
        const chargedTo = chargedToOptions[Math.floor(Math.random() * chargedToOptions.length)];

        const withdrawal = new Withdrawal({
          type: 'withdrawal',
          amount: amount,
          description: withdrawalDescriptions[Math.floor(Math.random() * withdrawalDescriptions.length)],
          createdAt: withdrawalTime,
          createdBy: {
            userId: 'user-1',
            name: 'John',
            email: 'oliverjohnpr2013@gmail.com'
          },
          paymentMethod: 'cash', // All withdrawn in cash
          chargedTo: chargedTo
        });

        await withdrawal.save();
        withdrawalsCreated.push(withdrawal);
      }

      // Generate purchases for this day (1-4 purchases per day)
      const purchasesPerDay = Math.floor(Math.random() * 3) + 1; // 1-3 purchases
      for (let i = 0; i < purchasesPerDay; i++) {
        const purchaseDate = new Date(businessDay);
        const randomHour = 8 + Math.floor(Math.random() * 12); // 8AM to 8PM
        const randomMinute = Math.floor(Math.random() * 60);
        purchaseDate.setHours(randomHour, randomMinute, 0, 0);
        const purchaseTime = purchaseDate.getTime();

        // Random amount between 50 and 500
        const amount = Math.floor(Math.random() * 450) + 50;

        // Random owner (john, elwin, or all)
        const chargedToOptions = ['john', 'elwin', 'all'];
        const chargedTo = chargedToOptions[Math.floor(Math.random() * chargedToOptions.length)];

        const purchase = new Withdrawal({
          type: 'purchase',
          amount: amount,
          description: purchaseDescriptions[Math.floor(Math.random() * purchaseDescriptions.length)],
          createdAt: purchaseTime,
          createdBy: {
            userId: 'user-2',
            name: 'Elwin',
            email: 'elwin@mail.com'
          },
          paymentMethod: 'cash', // All purchased in cash
          chargedTo: chargedTo
        });

        await purchase.save();
        purchasesCreated.push(purchase);
      }

      if (dayOffset % 5 === 0 || dayOffset === daysToGenerate) {
        console.log(`✓ Generated data for day ${dayOffset}/${daysToGenerate} (${businessDay.toISOString().split('T')[0]})`);
      }
    }

    // Summary
    console.log('\n========================================');
    console.log('Seed Summary');
    console.log('========================================');
    console.log(`✓ Created: ${ordersCreated.length} completed orders (sales)`);
    console.log(`✓ Created: ${withdrawalsCreated.length} withdrawals`);
    console.log(`✓ Created: ${purchasesCreated.length} purchases`);
    console.log(`✓ Total transactions: ${ordersCreated.length + withdrawalsCreated.length + purchasesCreated.length}`);
    
    // Calculate totals
    const totalSales = ordersCreated.reduce((sum, order) => {
      const orderTotal = order.items.reduce((itemSum, item) => itemSum + (item.price * item.quantity), 0);
      return sum + orderTotal;
    }, 0);

    const totalWithdrawals = withdrawalsCreated.reduce((sum, w) => sum + w.amount, 0);
    const totalPurchases = purchasesCreated.reduce((sum, p) => sum + p.amount, 0);

    console.log(`\n💰 Financial Summary:`);
    console.log(`   Total Sales: ₱${totalSales.toFixed(2)}`);
    console.log(`   Total Withdrawals: ₱${totalWithdrawals.toFixed(2)}`);
    console.log(`   Total Purchases: ₱${totalPurchases.toFixed(2)}`);
    console.log(`   Net Balance: ₱${(totalSales - totalWithdrawals - totalPurchases).toFixed(2)}`);

    console.log('\n========================================');
    console.log('Seed completed successfully!');
    console.log('========================================\n');

    // Disconnect from MongoDB
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error seeding transactions:', error);
    process.exit(1);
  }
};

// Run the seed script
seedTransactions();

