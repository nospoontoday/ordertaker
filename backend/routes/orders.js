const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const DailyReportValidation = require('../models/DailyReportValidation');
const User = require('../models/User');

/**
 * Helper function to format date as YYYY-MM-DD from UTC components
 * (ensures consistent date extraction regardless of server timezone)
 * This extracts the actual calendar date from a timestamp
 */
function formatLocalDate(date) {
  // Use UTC methods to extract the date components
  // This ensures the date is consistent regardless of server timezone
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Helper function to calculate business day date from a timestamp
 * Business day logic: 8AM to 1AM next day (in local timezone, but we use UTC for consistency)
 * Returns a Date object set to 8 AM UTC of the business day
 * 
 * The key insight: We extract the UTC calendar date from the timestamp,
 * which represents the actual calendar date regardless of timezone.
 * Business day adjustments only apply when UTC hours indicate early morning (1AM-8AM),
 * which might be from the previous calendar day's business period.
 */
function getBusinessDayDate(timestamp) {
  const date = new Date(timestamp);
  
  // Extract UTC calendar date components - this gives us the actual calendar date
  // e.g., Oct 13, 2025 2 PM UTC+8 = Oct 13, 2025 6 AM UTC = calendar date Oct 13
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const hours = date.getUTCHours();
  
  // Start with the UTC calendar date
  let businessDayDate = new Date(Date.UTC(year, month, day));
  
  // Business day logic: Use UTC calendar date for accuracy
  // Only adjust for very early morning hours (< 1 AM UTC) which are clearly from previous day
  // This ensures that transactions created at 2 PM local (e.g., 6 AM UTC) stay on their calendar date
  if (hours < 1) {
    // Between midnight and 1AM UTC, belongs to previous calendar day's business period
    businessDayDate.setUTCDate(businessDayDate.getUTCDate() - 1);
  }
  // For all other times, use the UTC calendar date directly
  // This ensures accurate date assignment regardless of timezone
  
  // Set to 8 AM UTC to represent the business day start
  businessDayDate.setUTCHours(8, 0, 0, 0);
  
  return businessDayDate;
}

/**
 * @route   GET /api/orders
 * @desc    Get all orders with optional filters
 * @query   isPaid - Filter by payment status (true/false)
 * @query   status - Filter by item status (pending/preparing/ready/served)
 * @query   customerName - Filter by customer name (partial match)
 * @query   limit - Limit number of results (default: all)
 * @query   sortBy - Sort by field (createdAt/customerName, default: createdAt)
 * @query   sortOrder - Sort order (asc/desc, default: desc)
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const {
      isPaid,
      status,
      customerName,
      limit,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};

    // Filter by payment status
    if (isPaid !== undefined) {
      query.isPaid = isPaid === 'true';
    }

    // Filter by customer name (case-insensitive partial match)
    if (customerName) {
      query.customerName = { $regex: customerName, $options: 'i' };
    }

    // Filter by item status
    if (status) {
      query['items.status'] = status;
    }

    // Build sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    let ordersQuery = Order.find(query).sort(sortOptions);

    // Apply limit if specified
    if (limit) {
      ordersQuery = ordersQuery.limit(parseInt(limit));
    }

    const orders = await ordersQuery;

    res.json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch orders'
    });
  }
});

/**
 * @route   DELETE /api/orders/all
 * @desc    Delete all orders (use with caution!)
 * @access  Public
 */
router.delete('/all', async (req, res) => {
  try {
    const result = await Order.deleteMany({});

    res.json({
      success: true,
      message: `Successfully deleted ${result.deletedCount} orders`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error deleting all orders:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete orders'
    });
  }
});

/**
 * @route   GET /api/orders/daily-sales
 * @desc    Get daily sales summaries grouped by date
 * @query   page - Page number (default: 1)
 * @query   limit - Items per page (default: 10)
 * @access  Public
 */
router.get('/daily-sales', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get all paid orders
    const allOrders = await Order.find({ isPaid: true }).sort({ createdAt: -1 });
    
    // Get all withdrawals
    const Withdrawal = require('../models/Withdrawal');
    const allWithdrawals = await Withdrawal.find().sort({ createdAt: -1 });

    // Get menu items to map item IDs to categories
    const MenuItem = require('../models/MenuItem');
    const menuItems = await MenuItem.find({});
    const menuItemMap = new Map();
    menuItems.forEach((menuItem) => {
      menuItemMap.set(menuItem._id.toString(), menuItem);
      menuItemMap.set(menuItem.id, menuItem);
    });

    // Group orders by business day (8AM to 1AM next day)
    const dailySalesMap = new Map();

    allOrders.forEach((order) => {
      // Calculate business day date using UTC to ensure accuracy
      const businessDayDate = getBusinessDayDate(order.createdAt);
      
      // Use date string as key (YYYY-MM-DD format) extracted from UTC
      const dateKey = formatLocalDate(businessDayDate);
      
      if (!dailySalesMap.has(dateKey)) {
        dailySalesMap.set(dateKey, {
          date: dateKey,
          dateTimestamp: businessDayDate.getTime(),
          orders: [],
          items: new Map(), // category -> { items: Map(itemName -> { quantity, price, total }) }
          withdrawals: [],
          purchases: [],
          totalSales: 0,
          totalCash: 0,
          totalGcash: 0,
          totalWithdrawals: 0,
          totalPurchases: 0,
          totalCashWithdrawals: 0,
          totalGcashWithdrawals: 0,
          totalCashPurchases: 0,
          totalGcashPurchases: 0,
          // Owner-specific totals
          salesByOwner: {
            john: 0,
            elwin: 0
          },
          withdrawalsByOwner: {
            john: 0,
            elwin: 0,
            all: 0  // Split withdrawals/purchases
          },
          purchasesByOwner: {
            john: 0,
            elwin: 0,
            all: 0  // Split purchases
          }
        });
      }

      const dailySales = dailySalesMap.get(dateKey);
      dailySales.orders.push(order);

      // Helper function to get category for an item
      const getItemCategory = (item) => {
        // First check if item has category directly
        if (item.category) return item.category;
        
        // Try to get from menu item map
        const menuItem = menuItemMap.get(item.id);
        if (menuItem && menuItem.category) {
          return menuItem.category;
        }
        
        return 'uncategorized';
      };

      // Helper function to get owner for an item
      const getItemOwner = (item) => {
        // First check if item has owner directly
        if (item.owner && ['john', 'elwin'].includes(item.owner)) {
          return item.owner;
        }
        
        // Try to get from menu item map
        const menuItem = menuItemMap.get(item.id);
        if (menuItem && menuItem.owner && ['john', 'elwin'].includes(menuItem.owner)) {
          return menuItem.owner;
        }
        
        // Default to john if owner not found (for legacy items)
        return 'john';
      };

      // Helper function to calculate payment method totals
      const calculatePaymentTotals = (orderTotal, paymentMethod, cashAmount, gcashAmount) => {
        if (paymentMethod === "cash") {
          dailySales.totalCash += orderTotal;
        } else if (paymentMethod === "gcash") {
          dailySales.totalGcash += orderTotal;
        } else if (paymentMethod === "split") {
          dailySales.totalCash += cashAmount || 0;
          dailySales.totalGcash += gcashAmount || 0;
        } else {
          // Default to cash for legacy orders without payment method
          dailySales.totalCash += orderTotal;
        }
      };

      // Process main order items
      const mainOrderTotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      calculatePaymentTotals(mainOrderTotal, order.paymentMethod, order.cashAmount, order.gcashAmount);

      order.items.forEach((item) => {
        const category = getItemCategory(item);
        const owner = getItemOwner(item);
        const itemTotal = item.price * item.quantity;
        
        // Track sales by owner
        dailySales.salesByOwner[owner] += itemTotal;
        
        if (!dailySales.items.has(category)) {
          dailySales.items.set(category, new Map());
        }
        
        const categoryItems = dailySales.items.get(category);
        const itemKey = `${item.name}_${item.price}`;
        
        if (!categoryItems.has(itemKey)) {
          categoryItems.set(itemKey, {
            name: item.name,
            price: item.price,
            quantity: 0,
            total: 0,
          });
        }
        
        const itemData = categoryItems.get(itemKey);
        itemData.quantity += item.quantity;
        itemData.total += itemTotal;
        dailySales.totalSales += itemTotal;
      });

      // Process appended orders
      if (order.appendedOrders && order.appendedOrders.length > 0) {
        order.appendedOrders.forEach((appended) => {
          if (appended.isPaid) {
            const appendedOrderTotal = appended.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
            calculatePaymentTotals(appendedOrderTotal, appended.paymentMethod, appended.cashAmount, appended.gcashAmount);

            appended.items.forEach((item) => {
              const category = getItemCategory(item);
              const owner = getItemOwner(item);
              const itemTotal = item.price * item.quantity;
              
              // Track sales by owner
              dailySales.salesByOwner[owner] += itemTotal;
              
              if (!dailySales.items.has(category)) {
                dailySales.items.set(category, new Map());
              }
              
              const categoryItems = dailySales.items.get(category);
              const itemKey = `${item.name}_${item.price}`;
              
              if (!categoryItems.has(itemKey)) {
                categoryItems.set(itemKey, {
                  name: item.name,
                  price: item.price,
                  quantity: 0,
                  total: 0,
                });
              }
              
              const itemData = categoryItems.get(itemKey);
              itemData.quantity += item.quantity;
              itemData.total += itemTotal;
              dailySales.totalSales += itemTotal;
            });
          }
        });
      }
    });

    // Process withdrawals and purchases
    allWithdrawals.forEach((withdrawal) => {
      // Calculate business day date using UTC to ensure accuracy
      const businessDayDate = getBusinessDayDate(withdrawal.createdAt);
      
      const dateKey = formatLocalDate(businessDayDate);
      
      if (dailySalesMap.has(dateKey)) {
        const dailySales = dailySalesMap.get(dateKey);
        const chargedTo = withdrawal.chargedTo || 'john';
        
        if (withdrawal.type === 'withdrawal') {
          dailySales.withdrawals.push(withdrawal);
          dailySales.totalWithdrawals += withdrawal.amount;

          // Track withdrawals by payment method
          const paymentMethod = withdrawal.paymentMethod || 'cash'; // Default to cash if not specified
          if (paymentMethod === 'gcash') {
            dailySales.totalGcashWithdrawals += withdrawal.amount;
          } else {
            dailySales.totalCashWithdrawals += withdrawal.amount;
          }

          // Track withdrawals by owner
          if (chargedTo === 'all') {
            // Split equally between both owners
            dailySales.withdrawalsByOwner.john += withdrawal.amount / 2;
            dailySales.withdrawalsByOwner.elwin += withdrawal.amount / 2;
            dailySales.withdrawalsByOwner.all += withdrawal.amount;
          } else {
            dailySales.withdrawalsByOwner[chargedTo] += withdrawal.amount;
          }
        } else if (withdrawal.type === 'purchase') {
          dailySales.purchases.push(withdrawal);
          dailySales.totalPurchases += withdrawal.amount;

          // Track purchases by payment method
          const paymentMethod = withdrawal.paymentMethod || 'cash'; // Default to cash if not specified
          if (paymentMethod === 'gcash') {
            dailySales.totalGcashPurchases += withdrawal.amount;
          } else {
            dailySales.totalCashPurchases += withdrawal.amount;
          }

          // Track purchases by owner
          if (chargedTo === 'all') {
            // Split equally between both owners
            dailySales.purchasesByOwner.john += withdrawal.amount / 2;
            dailySales.purchasesByOwner.elwin += withdrawal.amount / 2;
            dailySales.purchasesByOwner.all += withdrawal.amount;
          } else {
            dailySales.purchasesByOwner[chargedTo] += withdrawal.amount;
          }
        }
      }
    });

    // Convert Map to Array and sort by date (latest first)
    let dailySalesArray = Array.from(dailySalesMap.values()).map((daily) => {
      // Convert category items Map to array
      const itemsByCategory = {};
      daily.items.forEach((categoryItems, category) => {
        itemsByCategory[category] = Array.from(categoryItems.values());
      });

      // Calculate net totals per owner
      const johnTotalDeductions = daily.withdrawalsByOwner.john + daily.purchasesByOwner.john;
      const elwinTotalDeductions = daily.withdrawalsByOwner.elwin + daily.purchasesByOwner.elwin;
      const johnNetTotal = daily.salesByOwner.john - johnTotalDeductions;
      const elwinNetTotal = daily.salesByOwner.elwin - elwinTotalDeductions;

      // Calculate cash and gcash received after deducting withdrawals/purchases from their respective payment methods
      const calculatedTotalCash = daily.totalCash - daily.totalCashWithdrawals - daily.totalCashPurchases;
      const calculatedTotalGcash = daily.totalGcash - daily.totalGcashWithdrawals - daily.totalGcashPurchases;

      return {
        date: daily.date,
        dateTimestamp: daily.dateTimestamp,
        itemsByCategory,
        withdrawals: daily.withdrawals,
        purchases: daily.purchases,
        totalSales: daily.totalSales,
        // Gross amounts (before deductions)
        grossCash: daily.totalCash,
        grossGcash: daily.totalGcash,
        // Net amounts (after deductions)
        totalCash: calculatedTotalCash,
        totalGcash: calculatedTotalGcash,
        // Breakdown by payment method
        totalCashWithdrawals: daily.totalCashWithdrawals,
        totalGcashWithdrawals: daily.totalGcashWithdrawals,
        totalCashPurchases: daily.totalCashPurchases,
        totalGcashPurchases: daily.totalGcashPurchases,
        totalWithdrawals: daily.totalWithdrawals,
        totalPurchases: daily.totalPurchases,
        netSales: daily.totalSales - daily.totalWithdrawals - daily.totalPurchases,
        // Owner breakdown
        salesByOwner: {
          john: daily.salesByOwner.john,
          elwin: daily.salesByOwner.elwin
        },
        withdrawalsByOwner: {
          john: daily.withdrawalsByOwner.john,
          elwin: daily.withdrawalsByOwner.elwin,
          all: daily.withdrawalsByOwner.all
        },
        purchasesByOwner: {
          john: daily.purchasesByOwner.john,
          elwin: daily.purchasesByOwner.elwin,
          all: daily.purchasesByOwner.all
        },
        netTotalsByOwner: {
          john: johnNetTotal,
          elwin: elwinNetTotal
        }
      };
    });

    // Sort by date descending (latest first)
    dailySalesArray.sort((a, b) => b.dateTimestamp - a.dateTimestamp);

    // Get validation status for all dates
    const dateKeys = dailySalesArray.map(daily => daily.date);
    const validations = await DailyReportValidation.find({ date: { $in: dateKeys } });
    const validationMap = new Map();
    validations.forEach(val => {
      validationMap.set(val.date, {
        isValidated: val.isValidated,
        validatedAt: val.validatedAt,
        validatedBy: val.validatedBy
      });
    });

    // Add validation status to each daily report
    dailySalesArray = dailySalesArray.map(daily => ({
      ...daily,
      isValidated: validationMap.has(daily.date) ? validationMap.get(daily.date).isValidated : false,
      validatedAt: validationMap.has(daily.date) ? validationMap.get(daily.date).validatedAt : null,
      validatedBy: validationMap.has(daily.date) ? validationMap.get(daily.date).validatedBy : null
    }));

    // Pagination
    const total = dailySalesArray.length;
    const paginatedData = dailySalesArray.slice(skip, skip + limit);

    res.json({
      success: true,
      data: paginatedData,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching daily sales:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch daily sales'
    });
  }
});

/**
 * @route   POST /api/orders/daily-sales/:date/validate
 * @desc    Mark a daily report as validated (super admin only)
 * @params  date - Date in YYYY-MM-DD format
 * @body    { user } - User object with id, email, name, role
 * @access  Super Admin only
 */
router.post('/daily-sales/:date/validate', async (req, res) => {
  try {
    const { date } = req.params;
    const { user } = req.body;

    // Validate date format
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format. Must be YYYY-MM-DD'
      });
    }

    // Validate user
    if (!user || !user.id || !user.role) {
      return res.status(400).json({
        success: false,
        error: 'User information is required'
      });
    }

    // Verify user is super_admin
    if (user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Only super admin can validate daily reports'
      });
    }

    // Verify user exists and has super_admin role
    const dbUser = await User.findById(user.id);
    if (!dbUser || dbUser.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized. Only super admin can validate daily reports'
      });
    }

    // Create or update validation record
    const validation = await DailyReportValidation.findOneAndUpdate(
      { date },
      {
        date,
        isValidated: true,
        validatedAt: Date.now(),
        validatedBy: {
          userId: user.id,
          name: user.name || '',
          email: user.email || ''
        }
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      data: validation,
      message: 'Daily report marked as validated'
    });
  } catch (error) {
    console.error('Error validating daily report:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to validate daily report'
    });
  }
});

/**
 * @route   GET /api/orders/daily-sales/:date/details
 * @desc    Get detailed orders and withdrawals for a specific date (admin only)
 * @params  date - Date in YYYY-MM-DD format
 * @access  Admin or Super Admin only
 */
router.get('/daily-sales/:date/details', async (req, res) => {
  try {
    const { date } = req.params;

    // Validate date format
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format. Must be YYYY-MM-DD'
      });
    }

    // Parse the date to get start and end timestamps for the business day
    const [year, month, day] = date.split('-').map(Number);
    const startDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

    // Get all orders and withdrawals for this date
    const [orders, withdrawals] = await Promise.all([
      Order.find({
        createdAt: {
          $gte: startDate.getTime(),
          $lte: endDate.getTime()
        }
      }).sort({ createdAt: 1 }),
      require('../models/Withdrawal').find({
        createdAt: {
          $gte: startDate.getTime(),
          $lte: endDate.getTime()
        }
      }).sort({ createdAt: 1 })
    ]);

    res.json({
      success: true,
      data: {
        orders,
        withdrawals
      }
    });
  } catch (error) {
    console.error('Error fetching daily sales details:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch daily sales details'
    });
  }
});

/**
 * @route   DELETE /api/orders/daily-sales/:date
 * @desc    Delete a daily sales report (admin/super_admin only)
 * @params  date - Date in YYYY-MM-DD format
 * @access  Admin or Super Admin only
 */
router.delete('/daily-sales/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const { userId } = req.body;

    // Validate date format
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format. Must be YYYY-MM-DD'
      });
    }

    // Validate user
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    // Verify user exists and is admin or super_admin
    const dbUser = await User.findById(userId);
    if (!dbUser || (dbUser.role !== 'admin' && dbUser.role !== 'super_admin')) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized. Only admins can delete daily sales reports'
      });
    }

    // Parse the date to get start and end timestamps for the business day
    const [year, month, day] = date.split('-').map(Number);
    const startDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

    // Delete all orders and withdrawals for this date
    const [ordersResult, withdrawalsResult, validationResult] = await Promise.all([
      Order.deleteMany({
        createdAt: {
          $gte: startDate.getTime(),
          $lte: endDate.getTime()
        }
      }),
      require('../models/Withdrawal').deleteMany({
        createdAt: {
          $gte: startDate.getTime(),
          $lte: endDate.getTime()
        }
      }),
      DailyReportValidation.findOneAndDelete({ date })
    ]);

    res.json({
      success: true,
      message: 'Daily sales report deleted successfully',
      data: {
        ordersDeleted: ordersResult.deletedCount,
        withdrawalsDeleted: withdrawalsResult.deletedCount,
        validationDeleted: !!validationResult
      }
    });
  } catch (error) {
    console.error('Error deleting daily sales report:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete daily sales report'
    });
  }
});

/**
 * @route   GET /api/orders/:id
 * @desc    Get single order by ID
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findOne({ id: req.params.id });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch order'
    });
  }
});

/**
 * @route   POST /api/orders
 * @desc    Create a new order
 * @body    { id, customerName, items, createdAt, isPaid, appendedOrders }
 * @access  Public
 */
router.post('/', async (req, res) => {
  try {
    const { id, customerName, items, createdAt, isPaid, paymentMethod, orderType, appendedOrders, orderTakerName, orderTakerEmail, amountReceived, cashAmount, gcashAmount } = req.body;

    // Validation
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Order ID is required'
      });
    }

    if (!customerName || !customerName.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Customer name is required'
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Order must have at least one item'
      });
    }

    // Check if order with this ID already exists
    const existingOrder = await Order.findOne({ id });
    if (existingOrder) {
      return res.status(409).json({
        success: false,
        error: 'Order with this ID already exists'
      });
    }

    // Get the next order number (auto-increment)
    const lastOrder = await Order.findOne({ orderNumber: { $exists: true, $type: 'number' } })
      .sort({ orderNumber: -1 })
      .select('orderNumber');

    let nextOrderNumber = 1;
    if (lastOrder && lastOrder.orderNumber && typeof lastOrder.orderNumber === 'number') {
      nextOrderNumber = lastOrder.orderNumber + 1;
    }

    console.log('Last order number:', lastOrder?.orderNumber, 'Next order number:', nextOrderNumber);

    // Create new order
    const order = new Order({
      id,
      orderNumber: nextOrderNumber,
      customerName: customerName.trim(),
      items,
      createdAt: createdAt || Date.now(),
      isPaid: isPaid || false,
      paymentMethod: paymentMethod || null,
      amountReceived: amountReceived || undefined,
      cashAmount: cashAmount || undefined,
      gcashAmount: gcashAmount || undefined,
      orderType: orderType || 'dine-in',
      appendedOrders: appendedOrders || [],
      orderTakerName: orderTakerName || null,
      orderTakerEmail: orderTakerEmail || null
    });

    await order.save();

    // Emit WebSocket event for new order
    const io = req.app.get('io');
    if (io) {
      setImmediate(() => {
        io.emit('order:created', order.toObject());
      });
    }

    res.status(201).json({
      success: true,
      data: order,
      message: 'Order created successfully'
    });
  } catch (error) {
    console.error('Error creating order:', error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create order'
    });
  }
});

/**
 * @route   PUT /api/orders/:id
 * @desc    Update an order
 * @body    Partial order data to update
 * @access  Public
 */
router.put('/:id', async (req, res) => {
  try {
    const allowedUpdates = ['customerName', 'items', 'isPaid', 'appendedOrders', 'notes'];
    const updates = Object.keys(req.body);
    const isValidOperation = updates.every(update => allowedUpdates.includes(update));

    if (!isValidOperation) {
      return res.status(400).json({
        success: false,
        error: 'Invalid updates. Allowed fields: ' + allowedUpdates.join(', ')
      });
    }

    const order = await Order.findOne({ id: req.params.id });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Apply updates
    updates.forEach(update => {
      order[update] = req.body[update];
    });

    await order.save();

    // Emit WebSocket event for order update
    const io = req.app.get('io');
    if (io) {
      setImmediate(() => {
        io.emit('order:updated', order.toObject());
      });
    }

    res.json({
      success: true,
      data: order,
      message: 'Order updated successfully'
    });
  } catch (error) {
    console.error('Error updating order:', error);

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update order'
    });
  }
});

/**
 * @route   DELETE /api/orders/:id
 * @desc    Delete an order (super admin only)
 * @body    { userId } - User ID to verify authorization
 * @access  Super Admin only
 */
router.delete('/:id', async (req, res) => {
  try {
    const { userId } = req.body;

    // Validate user authorization
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    // Verify user exists and is super_admin
    const dbUser = await User.findById(userId);
    if (!dbUser || dbUser.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized. Only super admin can delete orders'
      });
    }

    const order = await Order.findOneAndDelete({ id: req.params.id });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Emit WebSocket event for order deletion
    const io = req.app.get('io');
    if (io) {
      setImmediate(() => {
        io.emit('order:deleted', order.id);
      });
    }

    res.json({
      success: true,
      data: order,
      message: 'Order deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete order'
    });
  }
});

/**
 * @route   POST /api/orders/:id/append
 * @desc    Append items to an existing order
 * @body    { items, createdAt, isPaid }
 * @access  Public
 */
router.post('/:id/append', async (req, res) => {
  try {
    const { items, createdAt, isPaid, paymentMethod, cashAmount, gcashAmount, amountReceived } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Items array is required and must not be empty'
      });
    }

    const order = await Order.findOne({ id: req.params.id });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Create appended order object
    const appendedOrder = {
      id: `appended-${Date.now()}`,
      items: items.map(item => ({
        ...item,
        status: item.status || 'pending'
      })),
      createdAt: createdAt || Date.now(),
      isPaid: isPaid || false,
      paymentMethod: paymentMethod || null,
      cashAmount: cashAmount || undefined,
      gcashAmount: gcashAmount || undefined,
      amountReceived: amountReceived || undefined
    };

    order.appendedOrders.push(appendedOrder);
    await order.save();

    // Emit WebSocket event for appended items
    const io = req.app.get('io');
    if (io) {
      setImmediate(() => {
        io.emit('order:updated', order.toObject());
      });
    }

    res.json({
      success: true,
      data: order,
      message: 'Items appended successfully'
    });
  } catch (error) {
    console.error('Error appending items:', error);

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to append items'
    });
  }
});

/**
 * @route   PUT /api/orders/:id/items/:itemId/status
 * @desc    Update the status of a specific item in an order
 * @body    { status }
 * @access  Public
 */
router.put('/:id/items/:itemId/status', async (req, res) => {
  try {
    const { status, preparedBy, preparedByEmail, servedBy, servedByEmail, preparingAt, readyAt, servedAt } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required'
      });
    }

    const validStatuses = ['pending', 'preparing', 'ready', 'served'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
      });
    }

    const order = await Order.findOne({ id: req.params.id });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Find and update the item in main items
    const mainItem = order.items.find(item => item.id === req.params.itemId);
    if (mainItem) {
      mainItem.status = status;

      // Set crew tracking fields
      if (preparedBy !== undefined) mainItem.preparedBy = preparedBy;
      if (preparedByEmail !== undefined) mainItem.preparedByEmail = preparedByEmail;
      if (servedBy !== undefined) mainItem.servedBy = servedBy;
      if (servedByEmail !== undefined) mainItem.servedByEmail = servedByEmail;

      // Set timestamps based on status changes or from request
      const now = Date.now();
      if (preparingAt !== undefined) {
        mainItem.preparingAt = preparingAt;
      } else if (status === 'preparing' && !mainItem.preparingAt) {
        mainItem.preparingAt = now;
      }
      if (readyAt !== undefined) {
        mainItem.readyAt = readyAt;
      } else if (status === 'ready' && !mainItem.readyAt) {
        mainItem.readyAt = now;
      }
      if (servedAt !== undefined) {
        mainItem.servedAt = servedAt;
      } else if (status === 'served' && !mainItem.servedAt) {
        mainItem.servedAt = now;
      }
      
      // Mark items array as modified
      order.markModified('items');
      await order.save();
      
      // Check if all items are now served
      const allMainServed = order.items.every(item => item.status === 'served');
      const allAppendedServed = order.appendedOrders.length === 0 ||
        order.appendedOrders.every(appended =>
          appended.items.every(item => item.status === 'served')
        );
      
      if (allMainServed && allAppendedServed && !order.allItemsServedAt) {
        order.allItemsServedAt = now;
        await order.save();
      }

      // Emit WebSocket event for real-time update IMMEDIATELY
      const io = req.app.get('io');
      if (io) {
        setImmediate(() => {
          io.emit('order:updated', order.toObject());
        });
      }

      return res.json({
        success: true,
        data: order,
        message: 'Item status updated successfully'
      });
    }

    // If not found in main items, search in appended orders
    console.log('Searching in appended orders for itemId:', req.params.itemId);
    console.log('Number of appended orders:', order.appendedOrders.length);

    let itemFound = false;
    for (let i = 0; i < order.appendedOrders.length; i++) {
      const appendedOrder = order.appendedOrders[i];
      console.log(`Checking appended order ${i}, items:`, appendedOrder.items.map(it => ({ id: it.id, status: it.status })));

      const appendedItem = appendedOrder.items.find(item => item.id === req.params.itemId);
      if (appendedItem) {
        console.log('Found item in appended order! Current status:', appendedItem.status, 'New status:', status);
        appendedItem.status = status;

        // Set crew tracking fields
        if (preparedBy !== undefined) appendedItem.preparedBy = preparedBy;
        if (preparedByEmail !== undefined) appendedItem.preparedByEmail = preparedByEmail;
        if (servedBy !== undefined) appendedItem.servedBy = servedBy;
        if (servedByEmail !== undefined) appendedItem.servedByEmail = servedByEmail;

        // Set timestamps based on status changes or from request
        const now = Date.now();
        if (preparingAt !== undefined) {
          appendedItem.preparingAt = preparingAt;
        } else if (status === 'preparing' && !appendedItem.preparingAt) {
          appendedItem.preparingAt = now;
        }
        if (readyAt !== undefined) {
          appendedItem.readyAt = readyAt;
        } else if (status === 'ready' && !appendedItem.readyAt) {
          appendedItem.readyAt = now;
        }
        if (servedAt !== undefined) {
          appendedItem.servedAt = servedAt;
        } else if (status === 'served' && !appendedItem.servedAt) {
          appendedItem.servedAt = now;
        }
        
        itemFound = true;
        console.log('Item status after update:', appendedItem.status);
        break;
      }
    }

    if (!itemFound) {
      console.log('Item not found in any appended orders');
      return res.status(404).json({
        success: false,
        error: 'Item not found in order'
      });
    }

    // Mark the appendedOrders array as modified so Mongoose saves the changes
    order.markModified('appendedOrders');
    console.log('About to save order...');
    await order.save();
    console.log('Order saved successfully');
    
    // Check if all items are now served
    const allMainServed = order.items.every(item => item.status === 'served');
    const allAppendedServed = order.appendedOrders.length === 0 ||
      order.appendedOrders.every(appended =>
        appended.items.every(item => item.status === 'served')
      );
    
    if (allMainServed && allAppendedServed && !order.allItemsServedAt) {
      order.allItemsServedAt = Date.now();
      await order.save();
    }

    // Emit WebSocket event for real-time update IMMEDIATELY
    const io = req.app.get('io');
    if (io) {
      setImmediate(() => {
        io.emit('order:updated', order.toObject());
      });
    }

    res.json({
      success: true,
      data: order,
      message: 'Item status updated successfully'
    });
  } catch (error) {
    console.error('Error updating item status:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update item status'
    });
  }
});

/**
 * @route   PUT /api/orders/:id/payment
 * @desc    Toggle payment status of main order
 * @body    { isPaid, paymentMethod } (optional, will toggle if not provided)
 * @access  Public
 */
router.put('/:id/payment', async (req, res) => {
  try {
    const order = await Order.findOne({ id: req.params.id });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Validate payment method if provided
    if (req.body.paymentMethod && !['cash', 'gcash', 'split'].includes(req.body.paymentMethod)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment method. Must be cash, gcash, or split'
      });
    }

    // Toggle or set payment status
    order.isPaid = req.body.isPaid !== undefined ? req.body.isPaid : !order.isPaid;

    // Set payment method if marking as paid
    if (order.isPaid && req.body.paymentMethod) {
      order.paymentMethod = req.body.paymentMethod;

      // Calculate and store the paid amount (total of main order items at time of payment)
      const mainOrderTotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      order.paidAmount = mainOrderTotal;

      // Store amount received from request body
      if (req.body.amountReceived !== undefined) {
        order.amountReceived = req.body.amountReceived;
      }

      // Set split payment amounts if provided
      if (req.body.paymentMethod === 'split') {
        order.cashAmount = req.body.cashAmount || 0;
        order.gcashAmount = req.body.gcashAmount || 0;
        console.log('Saving split payment:', {
          orderId: order.id,
          cashAmount: order.cashAmount,
          gcashAmount: order.gcashAmount,
          paidAmount: order.paidAmount,
          amountReceived: order.amountReceived
        });
      } else {
        // Clear split amounts for non-split payments
        order.cashAmount = undefined;
        order.gcashAmount = undefined;
      }
    } else if (!order.isPaid) {
      // Clear payment method and amounts if marking as unpaid
      order.paymentMethod = null;
      order.cashAmount = undefined;
      order.gcashAmount = undefined;
      order.paidAmount = undefined;
      order.amountReceived = undefined;
    }

    await order.save();

    // Log saved order for debugging split payments
    if (order.paymentMethod === 'split') {
      console.log('Order saved with split payment:', {
        orderId: order.id,
        paymentMethod: order.paymentMethod,
        cashAmount: order.cashAmount,
        gcashAmount: order.gcashAmount,
        isPaid: order.isPaid
      });
    }

    // Emit WebSocket event for real-time update
    const io = req.app.get('io');
    if (io) {
      setImmediate(() => {
        io.emit('order:updated', order.toObject());
      });
    }

    res.json({
      success: true,
      data: order,
      message: `Order marked as ${order.isPaid ? 'paid' : 'unpaid'}`
    });
  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update payment status'
    });
  }
});

/**
 * @route   PUT /api/orders/:id/appended/:appendedId/payment
 * @desc    Toggle payment status of an appended order
 * @body    { isPaid, paymentMethod } (optional, will toggle if not provided)
 * @access  Public
 */
router.put('/:id/appended/:appendedId/payment', async (req, res) => {
  try {
    const order = await Order.findOne({ id: req.params.id });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    const appendedOrder = order.appendedOrders.find(
      appended => appended.id === req.params.appendedId
    );

    if (!appendedOrder) {
      return res.status(404).json({
        success: false,
        error: 'Appended order not found'
      });
    }

    // Validate payment method if provided
    if (req.body.paymentMethod && !['cash', 'gcash', 'split'].includes(req.body.paymentMethod)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment method. Must be cash, gcash, or split'
      });
    }

    // Toggle or set payment status
    appendedOrder.isPaid = req.body.isPaid !== undefined ? req.body.isPaid : !appendedOrder.isPaid;

    // Set payment method if marking as paid
    if (appendedOrder.isPaid && req.body.paymentMethod) {
      appendedOrder.paymentMethod = req.body.paymentMethod;

      // Calculate and store the paid amount (total of appended order items at time of payment)
      const appendedOrderTotal = appendedOrder.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      appendedOrder.paidAmount = appendedOrderTotal;

      // Store amount received from request body
      if (req.body.amountReceived !== undefined) {
        appendedOrder.amountReceived = req.body.amountReceived;
      }

      // Set split payment amounts if provided
      if (req.body.paymentMethod === 'split') {
        appendedOrder.cashAmount = req.body.cashAmount || 0;
        appendedOrder.gcashAmount = req.body.gcashAmount || 0;
      } else {
        // Clear split amounts for non-split payments
        appendedOrder.cashAmount = undefined;
        appendedOrder.gcashAmount = undefined;
      }
    } else if (!appendedOrder.isPaid) {
      // Clear payment method and amounts if marking as unpaid
      appendedOrder.paymentMethod = null;
      appendedOrder.cashAmount = undefined;
      appendedOrder.gcashAmount = undefined;
      appendedOrder.paidAmount = undefined;
      appendedOrder.amountReceived = undefined;
    }

    await order.save();

    // Emit WebSocket event for real-time update
    const io = req.app.get('io');
    if (io) {
      setImmediate(() => {
        io.emit('order:updated', order.toObject());
      });
    }

    res.json({
      success: true,
      data: order,
      message: `Appended order marked as ${appendedOrder.isPaid ? 'paid' : 'unpaid'}`
    });
  } catch (error) {
    console.error('Error updating appended order payment status:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update appended order payment status'
    });
  }
});

/**
 * @route   DELETE /api/orders/:id/appended/:appendedId
 * @desc    Delete an appended order
 * @access  Public
 */
router.delete('/:id/appended/:appendedId', async (req, res) => {
  try {
    const order = await Order.findOne({ id: req.params.id });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    const initialLength = order.appendedOrders.length;
    order.appendedOrders = order.appendedOrders.filter(
      appended => appended.id !== req.params.appendedId
    );

    if (order.appendedOrders.length === initialLength) {
      return res.status(404).json({
        success: false,
        error: 'Appended order not found'
      });
    }

    await order.save();

    // Emit WebSocket event for real-time update
    const io = req.app.get('io');
    if (io) {
      setImmediate(() => {
        io.emit('order:updated', order.toObject());
      });
    }

    res.json({
      success: true,
      data: order,
      message: 'Appended order deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting appended order:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete appended order'
    });
  }
});

/**
 * @route   PUT /api/orders/:id/appended/:appendedId/items/:itemId/status
 * @desc    Update an item status in an appended order
 * @body    { status }
 * @access  Public
 */
router.put('/:id/appended/:appendedId/items/:itemId/status', async (req, res) => {
  try {
    const { status, preparedBy, preparedByEmail, servedBy, servedByEmail, preparingAt, readyAt, servedAt } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required'
      });
    }

    const validStatuses = ['pending', 'preparing', 'ready', 'served'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
      });
    }

    const order = await Order.findOne({ id: req.params.id });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Find the appended order
    const appendedOrder = order.appendedOrders.find(
      appended => appended.id === req.params.appendedId
    );

    if (!appendedOrder) {
      return res.status(404).json({
        success: false,
        error: 'Appended order not found'
      });
    }

    // Find and update the item in the appended order
    const item = appendedOrder.items.find(item => item.id === req.params.itemId);

    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Item not found in appended order'
      });
    }

    item.status = status;

    // Set crew tracking fields
    if (preparedBy !== undefined) item.preparedBy = preparedBy;
    if (preparedByEmail !== undefined) item.preparedByEmail = preparedByEmail;
    if (servedBy !== undefined) item.servedBy = servedBy;
    if (servedByEmail !== undefined) item.servedByEmail = servedByEmail;

    // Set timestamps based on status changes or from request
    const now = Date.now();
    if (preparingAt !== undefined) {
      item.preparingAt = preparingAt;
    } else if (status === 'preparing' && !item.preparingAt) {
      item.preparingAt = now;
    }
    if (readyAt !== undefined) {
      item.readyAt = readyAt;
    } else if (status === 'ready' && !item.readyAt) {
      item.readyAt = now;
    }
    if (servedAt !== undefined) {
      item.servedAt = servedAt;
    } else if (status === 'served' && !item.servedAt) {
      item.servedAt = now;
    }

    // Mark the appendedOrders array as modified so Mongoose saves the changes
    order.markModified('appendedOrders');
    await order.save();
    
    // Check if all items are now served
    const allMainServed = order.items.every(item => item.status === 'served');
    const allAppendedServed = order.appendedOrders.length === 0 ||
      order.appendedOrders.every(appended =>
        appended.items.every(item => item.status === 'served')
      );
    
    if (allMainServed && allAppendedServed && !order.allItemsServedAt) {
      order.allItemsServedAt = now;
      await order.save();
    }

    // Emit WebSocket event for real-time update
    const io = req.app.get('io');
    if (io) {
      setImmediate(() => {
        io.emit('order:updated', order.toObject());
      });
    }

    res.json({
      success: true,
      data: order,
      message: 'Appended item status updated successfully'
    });
  } catch (error) {
    console.error('Error updating appended item status:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update appended item status'
    });
  }
});

/**
 * @route   GET /api/orders/stats/summary
 * @desc    Get order statistics summary
 * @access  Public
 */
router.get('/stats/summary', async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const paidOrders = await Order.countDocuments({ isPaid: true });
    const unpaidOrders = totalOrders - paidOrders;

    // Get orders from today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const todayOrders = await Order.countDocuments({
      createdAt: { $gte: startOfDay.getTime() }
    });

    // Calculate total revenue
    const orders = await Order.find({ isPaid: true });
    const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);

    res.json({
      success: true,
      data: {
        totalOrders,
        paidOrders,
        unpaidOrders,
        todayOrders,
        totalRevenue
      }
    });
  } catch (error) {
    console.error('Error fetching order stats:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch order statistics'
    });
  }
});

/**
 * @route   GET /api/orders/daily-sales
 * @desc    Get daily sales summaries grouped by date
 * @query   page - Page number (default: 1)
 * @query   limit - Items per page (default: 10)
 * @access  Public
 */
router.get('/daily-sales', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get all paid orders
    const allOrders = await Order.find({ isPaid: true }).sort({ createdAt: -1 });
    
    // Get all withdrawals
    const Withdrawal = require('../models/Withdrawal');
    const allWithdrawals = await Withdrawal.find().sort({ createdAt: -1 });

    // Get menu items to map item IDs to categories
    const MenuItem = require('../models/MenuItem');
    const menuItems = await MenuItem.find({});
    const menuItemMap = new Map();
    menuItems.forEach((menuItem) => {
      menuItemMap.set(menuItem._id.toString(), menuItem);
      menuItemMap.set(menuItem.id, menuItem);
    });

    // Group orders by business day (8AM to 1AM next day)
    const dailySalesMap = new Map();

    allOrders.forEach((order) => {
      // Calculate business day date using UTC to ensure accuracy
      const businessDayDate = getBusinessDayDate(order.createdAt);
      
      // Use date string as key (YYYY-MM-DD format) extracted from UTC
      const dateKey = formatLocalDate(businessDayDate);
      
      if (!dailySalesMap.has(dateKey)) {
        dailySalesMap.set(dateKey, {
          date: dateKey,
          dateTimestamp: businessDayDate.getTime(),
          orders: [],
          items: new Map(), // category -> { items: Map(itemName -> { quantity, price, total }) }
          withdrawals: [],
          purchases: [],
          totalSales: 0,
          totalWithdrawals: 0,
          totalPurchases: 0,
        });
      }

      const dailySales = dailySalesMap.get(dateKey);
      dailySales.orders.push(order);

      // Helper function to get category for an item
      const getItemCategory = (item) => {
        // First check if item has category directly
        if (item.category) return item.category;
        
        // Try to get from menu item map
        const menuItem = menuItemMap.get(item.id);
        if (menuItem && menuItem.category) {
          return menuItem.category;
        }
        
        return 'uncategorized';
      };

      // Process main order items
      order.items.forEach((item) => {
        const category = getItemCategory(item);
        
        if (!dailySales.items.has(category)) {
          dailySales.items.set(category, new Map());
        }
        
        const categoryItems = dailySales.items.get(category);
        const itemKey = `${item.name}_${item.price}`;
        
        if (!categoryItems.has(itemKey)) {
          categoryItems.set(itemKey, {
            name: item.name,
            price: item.price,
            quantity: 0,
            total: 0,
          });
        }
        
        const itemData = categoryItems.get(itemKey);
        itemData.quantity += item.quantity;
        itemData.total += item.price * item.quantity;
        dailySales.totalSales += item.price * item.quantity;
      });

      // Process appended orders
      if (order.appendedOrders && order.appendedOrders.length > 0) {
        order.appendedOrders.forEach((appended) => {
          if (appended.isPaid) {
            appended.items.forEach((item) => {
              const category = getItemCategory(item);
              
              if (!dailySales.items.has(category)) {
                dailySales.items.set(category, new Map());
              }
              
              const categoryItems = dailySales.items.get(category);
              const itemKey = `${item.name}_${item.price}`;
              
              if (!categoryItems.has(itemKey)) {
                categoryItems.set(itemKey, {
                  name: item.name,
                  price: item.price,
                  quantity: 0,
                  total: 0,
                });
              }
              
              const itemData = categoryItems.get(itemKey);
              itemData.quantity += item.quantity;
              itemData.total += item.price * item.quantity;
              dailySales.totalSales += item.price * item.quantity;
            });
          }
        });
      }
    });

    // Process withdrawals and purchases
    allWithdrawals.forEach((withdrawal) => {
      // Calculate business day date using UTC to ensure accuracy
      const businessDayDate = getBusinessDayDate(withdrawal.createdAt);
      
      const dateKey = formatLocalDate(businessDayDate);
      
      if (dailySalesMap.has(dateKey)) {
        const dailySales = dailySalesMap.get(dateKey);
        
        if (withdrawal.type === 'withdrawal') {
          dailySales.withdrawals.push(withdrawal);
          dailySales.totalWithdrawals += withdrawal.amount;
        } else if (withdrawal.type === 'purchase') {
          dailySales.purchases.push(withdrawal);
          dailySales.totalPurchases += withdrawal.amount;
        }
      }
    });

    // Convert Map to Array and sort by date (latest first)
    let dailySalesArray = Array.from(dailySalesMap.values()).map((daily) => {
      // Convert category items Map to array
      const itemsByCategory = {};
      daily.items.forEach((categoryItems, category) => {
        itemsByCategory[category] = Array.from(categoryItems.values());
      });

      return {
        date: daily.date,
        dateTimestamp: daily.dateTimestamp,
        itemsByCategory,
        withdrawals: daily.withdrawals,
        purchases: daily.purchases,
        totalSales: daily.totalSales,
        totalWithdrawals: daily.totalWithdrawals,
        totalPurchases: daily.totalPurchases,
        netSales: daily.totalSales - daily.totalWithdrawals - daily.totalPurchases,
      };
    });

    // Sort by date descending (latest first)
    dailySalesArray.sort((a, b) => b.dateTimestamp - a.dateTimestamp);

    // Pagination
    const total = dailySalesArray.length;
    const paginatedData = dailySalesArray.slice(skip, skip + limit);

    res.json({
      success: true,
      data: paginatedData,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching daily sales:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch daily sales'
    });
  }
});

/**
 * @route   POST /api/orders/sync
 * @desc    Sync an order from offline device to server
 * @access  Public
 */
router.post('/sync', async (req, res) => {
  try {
    const orderData = req.body;

    // Check if order already exists
    const existingOrder = await Order.findOne({ id: orderData.id });

    if (existingOrder) {
      // Update existing order with newer data
      Object.assign(existingOrder, orderData);
      await existingOrder.save();

      res.json({
        success: true,
        message: 'Order synced successfully (updated)',
        order: existingOrder,
      });
    } else {
      // Create new order
      const newOrder = new Order(orderData);
      await newOrder.save();

      res.status(201).json({
        success: true,
        message: 'Order synced successfully (created)',
        order: newOrder,
      });
    }
  } catch (error) {
    console.error('Error syncing order:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to sync order',
    });
  }
});

/**
 * @route   GET /api/orders/updates
 * @desc    Get orders updated since a timestamp (for pulling server changes)
 * @query   since - Timestamp to get updates since
 * @access  Public
 */
router.get('/updates', async (req, res) => {
  try {
    const since = parseInt(req.query.since) || 0;

    // Find orders modified after the given timestamp
    const orders = await Order.find({
      $or: [
        { lastModified: { $gt: since } },
        { createdAt: { $gt: since } },
      ],
    }).sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    console.error('Error fetching order updates:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch order updates',
    });
  }
});

module.exports = router;
