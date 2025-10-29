const express = require('express');
const router = express.Router();
const Order = require('../models/Order');

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
    const { id, customerName, items, createdAt, isPaid, appendedOrders, orderTakerName, orderTakerEmail } = req.body;

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
    const allowedUpdates = ['customerName', 'items', 'isPaid', 'appendedOrders'];
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
 * @desc    Delete an order
 * @access  Public
 */
router.delete('/:id', async (req, res) => {
  try {
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
    const { items, createdAt, isPaid } = req.body;

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
      isPaid: isPaid || false
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
    if (req.body.paymentMethod && !['cash', 'gcash'].includes(req.body.paymentMethod)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment method. Must be cash or gcash'
      });
    }

    // Toggle or set payment status
    order.isPaid = req.body.isPaid !== undefined ? req.body.isPaid : !order.isPaid;

    // Set payment method if marking as paid
    if (order.isPaid && req.body.paymentMethod) {
      order.paymentMethod = req.body.paymentMethod;
    } else if (!order.isPaid) {
      // Clear payment method if marking as unpaid
      order.paymentMethod = null;
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
    if (req.body.paymentMethod && !['cash', 'gcash'].includes(req.body.paymentMethod)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment method. Must be cash or gcash'
      });
    }

    // Toggle or set payment status
    appendedOrder.isPaid = req.body.isPaid !== undefined ? req.body.isPaid : !appendedOrder.isPaid;

    // Set payment method if marking as paid
    if (appendedOrder.isPaid && req.body.paymentMethod) {
      appendedOrder.paymentMethod = req.body.paymentMethod;
    } else if (!appendedOrder.isPaid) {
      // Clear payment method if marking as unpaid
      appendedOrder.paymentMethod = null;
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

module.exports = router;
