const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const { get, set, invalidateCategories, CACHE_KEYS, TTL } = require('../utils/cache');

/**
 * @route   GET /api/categories
 * @desc    Get all categories (cached for 5 minutes)
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    // Check cache first
    const cachedData = get(CACHE_KEYS.CATEGORIES);
    if (cachedData) {
      res.set('X-Cache', 'HIT');
      return res.json(cachedData);
    }

    const categories = await Category.find().sort({ createdAt: 1 });

    const response = {
      success: true,
      count: categories.length,
      data: categories
    };

    // Cache the response
    set(CACHE_KEYS.CATEGORIES, response, TTL.CATEGORIES);
    res.set('X-Cache', 'MISS');

    res.json(response);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching categories'
    });
  }
});

/**
 * @route   GET /api/categories/:id
 * @desc    Get single category by ID
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const category = await Category.findOne({ id: req.params.id });

    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    res.json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching category'
    });
  }
});

/**
 * @route   POST /api/categories
 * @desc    Create new category
 * @access  Private (Admin)
 */
router.post('/', async (req, res) => {
  try {
    const { id, name, image } = req.body;

    // Validation
    if (!id || !name) {
      return res.status(400).json({
        success: false,
        error: 'Please provide id and name'
      });
    }

    // Check if category with this ID already exists
    const existingCategory = await Category.findOne({ id: id.toLowerCase() });
    if (existingCategory) {
      return res.status(400).json({
        success: false,
        error: 'Category with this ID already exists'
      });
    }

    // Create category
    const category = await Category.create({
      id,
      name,
      image: image || ''
    });

    // Invalidate categories cache
    invalidateCategories();

    res.status(201).json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error('Error creating category:', error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        error: messages.join(', ')
      });
    }

    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'Category with this ID already exists'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Server error while creating category'
    });
  }
});

/**
 * @route   PUT /api/categories/:id
 * @desc    Update category
 * @access  Private (Admin)
 */
router.put('/:id', async (req, res) => {
  try {
    const { name, image } = req.body;

    // Check if category exists
    let category = await Category.findOne({ id: req.params.id });

    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    // Build update object with only provided fields
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (image !== undefined) updateData.image = image;

    // Update category
    category = await Category.findOneAndUpdate(
      { id: req.params.id },
      updateData,
      {
        new: true, // Return updated document
        runValidators: true // Run schema validators
      }
    );

    // Invalidate categories cache
    invalidateCategories();

    res.json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error('Error updating category:', error);

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
      error: 'Server error while updating category'
    });
  }
});

/**
 * @route   DELETE /api/categories/:id
 * @desc    Delete category
 * @access  Private (Admin)
 */
router.delete('/:id', async (req, res) => {
  try {
    const category = await Category.findOne({ id: req.params.id });

    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    await Category.findOneAndDelete({ id: req.params.id });

    // Invalidate categories cache
    invalidateCategories();

    res.json({
      success: true,
      data: {},
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while deleting category'
    });
  }
});

module.exports = router;
