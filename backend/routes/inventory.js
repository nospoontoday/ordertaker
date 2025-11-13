const express = require('express');
const router = express.Router();
const Inventory = require('../models/Inventory');

/**
 * @route   GET /api/inventory
 * @desc    Get all inventory items
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const { category, stockStatus } = req.query;

    // Build query filter
    let filter = {};

    if (category && category !== 'all') {
      filter.category = category;
    }

    const items = await Inventory.find(filter).sort({ createdAt: -1 });

    // Filter by stock status if provided
    let filteredItems = items;
    if (stockStatus) {
      filteredItems = items.filter(item => {
        const status = item.stockStatus;
        return status === stockStatus;
      });
    }

    res.json({
      success: true,
      count: filteredItems.length,
      data: filteredItems
    });
  } catch (error) {
    console.error('Error fetching inventory items:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching inventory items'
    });
  }
});

/**
 * @route   GET /api/inventory/stats
 * @desc    Get inventory statistics
 * @access  Public
 */
router.get('/stats', async (req, res) => {
  try {
    const items = await Inventory.find();

    const stats = {
      totalItems: items.length,
      inStock: items.filter(item => item.quantity > 0).length,
      lowStock: items.filter(item => item.isLowStock).length,
      outOfStock: items.filter(item => item.isOutOfStock).length
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching inventory stats:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching inventory stats'
    });
  }
});

/**
 * @route   GET /api/inventory/:id
 * @desc    Get single inventory item by ID
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const item = await Inventory.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Inventory item not found'
      });
    }

    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    console.error('Error fetching inventory item:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching inventory item'
    });
  }
});

/**
 * @route   POST /api/inventory
 * @desc    Create a new inventory item
 * @access  Public
 */
router.post('/', async (req, res) => {
  try {
    const { name, quantity, unit, category, lowStockThreshold, notes } = req.body;

    // Validate required fields
    if (!name || !unit || !category) {
      return res.status(400).json({
        success: false,
        error: 'Please provide name, unit, and category'
      });
    }

    // Check if item with same name already exists
    const existingItem = await Inventory.findOne({ name: name.trim() });
    if (existingItem) {
      return res.status(400).json({
        success: false,
        error: 'An item with this name already exists'
      });
    }

    const item = await Inventory.create({
      name,
      quantity: quantity || 0,
      unit,
      category,
      lowStockThreshold: lowStockThreshold || 10,
      notes
    });

    // Emit socket event for real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('inventory:created', item);
    }

    res.status(201).json({
      success: true,
      data: item
    });
  } catch (error) {
    console.error('Error creating inventory item:', error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        error: messages.join(', ')
      });
    }

    res.status(500).json({
      success: false,
      error: 'Server error while creating inventory item'
    });
  }
});

/**
 * @route   PUT /api/inventory/:id
 * @desc    Update an inventory item
 * @access  Public
 */
router.put('/:id', async (req, res) => {
  try {
    const { name, quantity, unit, category, lowStockThreshold, notes } = req.body;

    let item = await Inventory.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Inventory item not found'
      });
    }

    // Check if updating name to one that already exists
    if (name && name.trim() !== item.name) {
      const existingItem = await Inventory.findOne({ name: name.trim() });
      if (existingItem) {
        return res.status(400).json({
          success: false,
          error: 'An item with this name already exists'
        });
      }
    }

    // Update fields
    if (name !== undefined) item.name = name;
    if (quantity !== undefined) item.quantity = quantity;
    if (unit !== undefined) item.unit = unit;
    if (category !== undefined) item.category = category;
    if (lowStockThreshold !== undefined) item.lowStockThreshold = lowStockThreshold;
    if (notes !== undefined) item.notes = notes;

    await item.save();

    // Emit socket event for real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('inventory:updated', item);
    }

    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    console.error('Error updating inventory item:', error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        error: messages.join(', ')
      });
    }

    res.status(500).json({
      success: false,
      error: 'Server error while updating inventory item'
    });
  }
});

/**
 * @route   PATCH /api/inventory/:id/quantity
 * @desc    Update quantity of an inventory item (add or subtract)
 * @access  Public
 */
router.patch('/:id/quantity', async (req, res) => {
  try {
    const { delta, newQuantity } = req.body;

    let item = await Inventory.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Inventory item not found'
      });
    }

    // Update quantity
    if (newQuantity !== undefined) {
      item.quantity = Math.max(0, newQuantity);
    } else if (delta !== undefined) {
      item.quantity = Math.max(0, item.quantity + delta);
    } else {
      return res.status(400).json({
        success: false,
        error: 'Please provide either delta or newQuantity'
      });
    }

    await item.save();

    // Emit socket event for real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('inventory:updated', item);
    }

    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    console.error('Error updating inventory quantity:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while updating inventory quantity'
    });
  }
});

/**
 * @route   DELETE /api/inventory/:id
 * @desc    Delete an inventory item
 * @access  Public
 */
router.delete('/:id', async (req, res) => {
  try {
    const item = await Inventory.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Inventory item not found'
      });
    }

    await item.deleteOne();

    // Emit socket event for real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('inventory:deleted', { id: req.params.id });
    }

    res.json({
      success: true,
      data: {},
      message: 'Inventory item deleted'
    });
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while deleting inventory item'
    });
  }
});

/**
 * @route   POST /api/inventory/bulk
 * @desc    Create or update multiple inventory items
 * @access  Public
 */
router.post('/bulk', async (req, res) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Please provide an array of items'
      });
    }

    const results = {
      created: [],
      updated: [],
      errors: []
    };

    for (const itemData of items) {
      try {
        const existingItem = await Inventory.findOne({ name: itemData.name?.trim() });

        if (existingItem) {
          // Update existing item
          Object.assign(existingItem, itemData);
          await existingItem.save();
          results.updated.push(existingItem);
        } else {
          // Create new item
          const newItem = await Inventory.create(itemData);
          results.created.push(newItem);
        }
      } catch (error) {
        results.errors.push({
          item: itemData.name || 'Unknown',
          error: error.message
        });
      }
    }

    // Emit socket event for real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('inventory:bulk-update', results);
    }

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Error in bulk inventory operation:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while processing bulk inventory operation'
    });
  }
});

module.exports = router;
