const express = require('express');
const router = express.Router();
const MenuItem = require('../models/MenuItem');

/**
 * @route   GET /api/menu-items
 * @desc    Get all menu items
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const { category, bestSellers } = req.query;

    // Build query filter
    let filter = {};

    if (category) {
      filter.category = category;
    }

    if (bestSellers === 'true') {
      filter.isBestSeller = true;
    }

    const menuItems = await MenuItem.find(filter).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: menuItems.length,
      data: menuItems
    });
  } catch (error) {
    console.error('Error fetching menu items:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching menu items'
    });
  }
});

/**
 * @route   GET /api/menu-items/:id
 * @desc    Get single menu item by ID
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id);

    if (!menuItem) {
      return res.status(404).json({
        success: false,
        error: 'Menu item not found'
      });
    }

    res.json({
      success: true,
      data: menuItem
    });
  } catch (error) {
    console.error('Error fetching menu item:', error);

    // Check if error is due to invalid ID format
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        error: 'Menu item not found'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Server error while fetching menu item'
    });
  }
});

/**
 * @route   POST /api/menu-items
 * @desc    Create new menu item
 * @access  Private (Admin)
 */
router.post('/', async (req, res) => {
  try {
    const { name, price, category, image, isBestSeller, owner } = req.body;

    // Validation
    if (!name || !price || !category) {
      return res.status(400).json({
        success: false,
        error: 'Please provide name, price, and category'
      });
    }

    // Validate owner if provided
    if (owner && !['john', 'elwin'].includes(owner)) {
      return res.status(400).json({
        success: false,
        error: 'Owner must be "john" or "elwin"'
      });
    }

    // Create menu item
    const menuItem = await MenuItem.create({
      name,
      price,
      category,
      image: image || '',
      isBestSeller: isBestSeller || false,
      owner: owner || 'john'
    });

    res.status(201).json({
      success: true,
      data: menuItem
    });
  } catch (error) {
    console.error('Error creating menu item:', error);

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
      error: 'Server error while creating menu item'
    });
  }
});

/**
 * @route   PUT /api/menu-items/:id
 * @desc    Update menu item
 * @access  Private (Admin)
 */
router.put('/:id', async (req, res) => {
  try {
    const { name, price, category, image, isBestSeller } = req.body;

    // Check if menu item exists
    let menuItem = await MenuItem.findById(req.params.id);

    if (!menuItem) {
      return res.status(404).json({
        success: false,
        error: 'Menu item not found'
      });
    }

    // Build update object with only provided fields
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (price !== undefined) updateData.price = price;
    if (category !== undefined) updateData.category = category;
    if (image !== undefined) updateData.image = image;
    if (isBestSeller !== undefined) updateData.isBestSeller = isBestSeller;

    // Update menu item
    menuItem = await MenuItem.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true, // Return updated document
        runValidators: true // Run schema validators
      }
    );

    res.json({
      success: true,
      data: menuItem
    });
  } catch (error) {
    console.error('Error updating menu item:', error);

    // Check if error is due to invalid ID format
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        error: 'Menu item not found'
      });
    }

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
      error: 'Server error while updating menu item'
    });
  }
});

/**
 * @route   DELETE /api/menu-items/:id
 * @desc    Delete menu item
 * @access  Private (Admin)
 */
router.delete('/:id', async (req, res) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id);

    if (!menuItem) {
      return res.status(404).json({
        success: false,
        error: 'Menu item not found'
      });
    }

    await MenuItem.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      data: {},
      message: 'Menu item deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting menu item:', error);

    // Check if error is due to invalid ID format
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        error: 'Menu item not found'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Server error while deleting menu item'
    });
  }
});

module.exports = router;
