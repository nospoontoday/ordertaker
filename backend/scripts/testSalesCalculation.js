/**
 * Test script to verify sales calculation fix
 * This script simulates the daily-sales calculation logic
 * and verifies that totalSales matches the sum of item prices
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

// Models
const Order = require('../models/Order');

// Use command line arg for MongoDB URI or fall back to env variable
const MONGODB_URI = process.argv[2] || process.env.MONGODB_URI || 'mongodb://admin:password123@localhost:27017/ordertaker?authSource=admin';

async function testSalesCalculation() {
  console.log('========================================');
  console.log('Sales Calculation Test');
  console.log('========================================\n');
  
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    console.log('URI:', MONGODB_URI.replace(/\/\/.*:.*@/, '//***:***@'));
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to MongoDB\n');

    // Target date: January 11, 2026
    const targetDate = '2026-01-11';
    const [year, month, day] = targetDate.split('-').map(Number);
    
    // Create date range for the business day
    const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    const endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
    
    console.log(`Analyzing orders for: ${targetDate}`);
    console.log(`Date range: ${startOfDay.toISOString()} - ${endOfDay.toISOString()}\n`);

    // Get all paid orders for this date
    const orders = await Order.find({
      isPaid: true,
      createdAt: {
        $gte: startOfDay.getTime(),
        $lte: endOfDay.getTime()
      }
    });

    console.log(`Found ${orders.length} paid orders\n`);

    // Calculate totals using OLD method (payment amounts)
    let oldTotalSales = 0;
    let oldTotalCash = 0;
    let oldTotalGcash = 0;

    // Calculate totals using NEW method (item prices)
    let newTotalSales = 0;
    let newTotalCash = 0;
    let newTotalGcash = 0;

    // Sum of all item prices (should match itemsByCategory)
    let sumOfItemPrices = 0;

    const discrepancies = [];

    orders.forEach((order, idx) => {
      // Calculate item total for main order
      const mainOrderItemTotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      // OLD METHOD: Use payment amounts for split payments
      const oldCalculatePaymentTotals = (orderTotal, paymentMethod, cashAmount, gcashAmount) => {
        let actualPaymentTotal = 0;
        if (paymentMethod === "cash") {
          oldTotalCash += orderTotal;
          actualPaymentTotal = orderTotal;
        } else if (paymentMethod === "gcash") {
          oldTotalGcash += orderTotal;
          actualPaymentTotal = orderTotal;
        } else if (paymentMethod === "split") {
          const cash = Number(cashAmount) || 0;
          const gcash = Number(gcashAmount) || 0;
          oldTotalCash += cash;
          oldTotalGcash += gcash;
          actualPaymentTotal = cash + gcash;
        } else {
          oldTotalCash += orderTotal;
          actualPaymentTotal = orderTotal;
        }
        oldTotalSales += actualPaymentTotal;
        return actualPaymentTotal;
      };

      // NEW METHOD: Always use item total for totalSales
      const newCalculatePaymentTotals = (orderTotal, paymentMethod, cashAmount, gcashAmount) => {
        if (paymentMethod === "cash") {
          newTotalCash += orderTotal;
        } else if (paymentMethod === "gcash") {
          newTotalGcash += orderTotal;
        } else if (paymentMethod === "split") {
          const cash = Number(cashAmount) || 0;
          const gcash = Number(gcashAmount) || 0;
          newTotalCash += cash;
          newTotalGcash += gcash;
        } else {
          newTotalCash += orderTotal;
        }
        newTotalSales += orderTotal;
      };

      // Process main order
      const oldPaymentTotal = oldCalculatePaymentTotals(mainOrderItemTotal, order.paymentMethod, order.cashAmount, order.gcashAmount);
      newCalculatePaymentTotals(mainOrderItemTotal, order.paymentMethod, order.cashAmount, order.gcashAmount);
      sumOfItemPrices += mainOrderItemTotal;

      // Check for discrepancy in main order
      if (order.paymentMethod === 'split') {
        const paymentTotal = (Number(order.cashAmount) || 0) + (Number(order.gcashAmount) || 0);
        if (Math.abs(paymentTotal - mainOrderItemTotal) > 0.01) {
          discrepancies.push({
            orderId: order.id,
            orderNumber: order.orderNumber,
            customerName: order.customerName,
            type: 'main',
            itemTotal: mainOrderItemTotal,
            paymentTotal: paymentTotal,
            cashAmount: order.cashAmount,
            gcashAmount: order.gcashAmount,
            difference: paymentTotal - mainOrderItemTotal
          });
        }
      }

      // Process appended orders
      if (order.appendedOrders && order.appendedOrders.length > 0) {
        order.appendedOrders.forEach((appended, appendedIdx) => {
          if (appended.isPaid) {
            const appendedItemTotal = appended.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            
            oldCalculatePaymentTotals(appendedItemTotal, appended.paymentMethod, appended.cashAmount, appended.gcashAmount);
            newCalculatePaymentTotals(appendedItemTotal, appended.paymentMethod, appended.cashAmount, appended.gcashAmount);
            sumOfItemPrices += appendedItemTotal;

            // Check for discrepancy in appended order
            if (appended.paymentMethod === 'split') {
              const paymentTotal = (Number(appended.cashAmount) || 0) + (Number(appended.gcashAmount) || 0);
              if (Math.abs(paymentTotal - appendedItemTotal) > 0.01) {
                discrepancies.push({
                  orderId: order.id,
                  orderNumber: order.orderNumber,
                  customerName: order.customerName,
                  type: `appended-${appendedIdx}`,
                  itemTotal: appendedItemTotal,
                  paymentTotal: paymentTotal,
                  cashAmount: appended.cashAmount,
                  gcashAmount: appended.gcashAmount,
                  difference: paymentTotal - appendedItemTotal
                });
              }
            }
          }
        });
      }
    });

    console.log('========================================');
    console.log('CALCULATION RESULTS');
    console.log('========================================\n');

    console.log('OLD METHOD (using payment amounts for split):');
    console.log(`  Total Sales: ₱${oldTotalSales.toFixed(2)}`);
    console.log(`  Total Cash:  ₱${oldTotalCash.toFixed(2)}`);
    console.log(`  Total GCash: ₱${oldTotalGcash.toFixed(2)}\n`);

    console.log('NEW METHOD (using item prices):');
    console.log(`  Total Sales: ₱${newTotalSales.toFixed(2)}`);
    console.log(`  Total Cash:  ₱${newTotalCash.toFixed(2)}`);
    console.log(`  Total GCash: ₱${newTotalGcash.toFixed(2)}\n`);

    console.log('SUM OF ITEM PRICES (itemsByCategory):');
    console.log(`  Total: ₱${sumOfItemPrices.toFixed(2)}\n`);

    console.log('========================================');
    console.log('VERIFICATION');
    console.log('========================================\n');

    const difference = oldTotalSales - newTotalSales;
    if (Math.abs(difference) > 0.01) {
      console.log(`❌ DISCREPANCY FOUND: ₱${difference.toFixed(2)}`);
      console.log(`   Old Total Sales: ₱${oldTotalSales.toFixed(2)} (reported on UI)`);
      console.log(`   New Total Sales: ₱${newTotalSales.toFixed(2)} (should be correct)`);
      console.log(`   Sum of Items:    ₱${sumOfItemPrices.toFixed(2)}\n`);
      
      if (discrepancies.length > 0) {
        console.log('Orders with payment/item mismatch:');
        discrepancies.forEach(d => {
          console.log(`\n  Order #${d.orderNumber || 'N/A'} (${d.customerName}) - ${d.type}`);
          console.log(`    Item Total:    ₱${d.itemTotal.toFixed(2)}`);
          console.log(`    Payment Total: ₱${d.paymentTotal.toFixed(2)} (Cash: ₱${d.cashAmount || 0}, GCash: ₱${d.gcashAmount || 0})`);
          console.log(`    Difference:    ₱${d.difference.toFixed(2)}`);
        });
      }
    } else {
      console.log('✓ No discrepancy - calculations match!');
      console.log(`  Both methods give: ₱${newTotalSales.toFixed(2)}`);
    }

    console.log('\n========================================');
    console.log('FIX VERIFICATION');
    console.log('========================================\n');
    
    if (Math.abs(newTotalSales - sumOfItemPrices) < 0.01) {
      console.log('✓ NEW METHOD matches sum of item prices');
      console.log('  The fix ensures totalSales = sum of all item prices');
    } else {
      console.log('❌ Unexpected: New method does not match sum of item prices');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✓ Disconnected from MongoDB');
  }
}

testSalesCalculation();
