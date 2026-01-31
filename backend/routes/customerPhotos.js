const express = require('express');
const router = express.Router();
const CustomerPhoto = require('../models/CustomerPhoto');
const User = require('../models/User');
const { get, set, del, delByPrefix, CACHE_KEYS, TTL } = require('../utils/cache');

// Cache key for customer photos
const CUSTOMER_PHOTOS_CACHE_KEY = 'customer-photos:all';
const CUSTOMER_PHOTOS_ACTIVE_CACHE_KEY = 'customer-photos:active';

/**
 * Invalidate customer photos cache
 */
function invalidateCustomerPhotosCache() {
  delByPrefix('customer-photos:');
  console.log('[Cache] Customer photos cache invalidated');
}

/**
 * Verify user is super_admin
 * @param {string} userId - User ID to verify
 * @returns {Promise<boolean>} True if user is super_admin
 */
async function verifyAdmin(userId) {
  if (!userId) return false;
  const user = await User.findById(userId);
  return user && user.role === 'super_admin';
}

/**
 * @route   GET /api/customer-photos
 * @desc    Get all customer photos (ordered by displayOrder)
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    // Check cache first
    const cachedData = get(CUSTOMER_PHOTOS_CACHE_KEY);
    if (cachedData) {
      res.set('X-Cache', 'HIT');
      return res.json(cachedData);
    }

    const photos = await CustomerPhoto.find().sort({ displayOrder: 1, createdAt: -1 });

    const response = {
      success: true,
      count: photos.length,
      data: photos
    };

    // Cache the response for 5 minutes
    set(CUSTOMER_PHOTOS_CACHE_KEY, response, 300);
    res.set('X-Cache', 'MISS');

    res.json(response);
  } catch (error) {
    console.error('Error fetching customer photos:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching customer photos'
    });
  }
});

/**
 * @route   GET /api/customer-photos/active
 * @desc    Get active customer photos (max 6, ordered by displayOrder)
 * @access  Public
 */
router.get('/active', async (req, res) => {
  try {
    // Check cache first
    const cachedData = get(CUSTOMER_PHOTOS_ACTIVE_CACHE_KEY);
    if (cachedData) {
      res.set('X-Cache', 'HIT');
      return res.json(cachedData);
    }

    const photos = await CustomerPhoto.find({ isActive: true })
      .sort({ displayOrder: 1 })
      .limit(6);

    const response = {
      success: true,
      count: photos.length,
      data: photos
    };

    // Cache the response for 5 minutes
    set(CUSTOMER_PHOTOS_ACTIVE_CACHE_KEY, response, 300);
    res.set('X-Cache', 'MISS');

    res.json(response);
  } catch (error) {
    console.error('Error fetching active customer photos:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching active customer photos'
    });
  }
});

/**
 * @route   GET /api/customer-photos/:id
 * @desc    Get single customer photo by ID
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const photo = await CustomerPhoto.findById(req.params.id);

    if (!photo) {
      return res.status(404).json({
        success: false,
        error: 'Customer photo not found'
      });
    }

    res.json({
      success: true,
      data: photo
    });
  } catch (error) {
    console.error('Error fetching customer photo:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching customer photo'
    });
  }
});

/**
 * @route   POST /api/customer-photos
 * @desc    Create new customer photo
 * @access  Private (Super Admin)
 */
router.post('/', async (req, res) => {
  try {
    const { imageUrl, displayOrder, isActive, altText, userId } = req.body;

    // Verify admin
    if (!await verifyAdmin(userId)) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized. Only super admin can create customer photos'
      });
    }

    // Validation
    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        error: 'Please provide an image URL'
      });
    }

    // Get the next display order if not provided
    let order = displayOrder;
    if (!order) {
      const maxOrder = await CustomerPhoto.findOne().sort({ displayOrder: -1 });
      order = maxOrder ? maxOrder.displayOrder + 1 : 1;
    }

    // Create photo
    const photo = await CustomerPhoto.create({
      imageUrl,
      displayOrder: order,
      isActive: isActive || false,
      altText: altText || 'Customer photo'
    });

    // Invalidate cache
    invalidateCustomerPhotosCache();

    res.status(201).json({
      success: true,
      data: photo
    });
  } catch (error) {
    console.error('Error creating customer photo:', error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = error.message || 'Validation error';
      return res.status(400).json({
        success: false,
        error: messages
      });
    }

    res.status(500).json({
      success: false,
      error: 'Server error while creating customer photo'
    });
  }
});

/**
 * @route   PUT /api/customer-photos/:id
 * @desc    Update customer photo
 * @access  Private (Super Admin)
 */
router.put('/:id', async (req, res) => {
  try {
    const { imageUrl, displayOrder, isActive, altText, userId } = req.body;

    // Verify admin
    if (!await verifyAdmin(userId)) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized. Only super admin can update customer photos'
      });
    }

    // Check if photo exists
    let photo = await CustomerPhoto.findById(req.params.id);

    if (!photo) {
      return res.status(404).json({
        success: false,
        error: 'Customer photo not found'
      });
    }

    // Build update object with only provided fields
    const updateData = {};
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (displayOrder !== undefined) updateData.displayOrder = displayOrder;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (altText !== undefined) updateData.altText = altText;

    // Check active limit if setting isActive to true
    if (isActive === true && !photo.isActive) {
      const activeCount = await CustomerPhoto.countDocuments({
        isActive: true,
        _id: { $ne: photo._id }
      });
      if (activeCount >= 6) {
        return res.status(400).json({
          success: false,
          error: 'Maximum of 6 photos can be active at a time. Please deactivate another photo first.'
        });
      }
    }

    // Update photo
    photo = await CustomerPhoto.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    );

    // Invalidate cache
    invalidateCustomerPhotosCache();

    res.json({
      success: true,
      data: photo
    });
  } catch (error) {
    console.error('Error updating customer photo:', error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = error.message || 'Validation error';
      return res.status(400).json({
        success: false,
        error: messages
      });
    }

    res.status(500).json({
      success: false,
      error: 'Server error while updating customer photo'
    });
  }
});

/**
 * @route   PUT /api/customer-photos/reorder
 * @desc    Update display order of multiple photos
 * @access  Private (Super Admin)
 */
router.put('/reorder/batch', async (req, res) => {
  try {
    const { photos, userId } = req.body;

    // Verify admin
    if (!await verifyAdmin(userId)) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized. Only super admin can reorder customer photos'
      });
    }

    // Validation
    if (!photos || !Array.isArray(photos)) {
      return res.status(400).json({
        success: false,
        error: 'Please provide an array of photos with id and displayOrder'
      });
    }

    // Update each photo's display order
    const updatePromises = photos.map(({ id, displayOrder }) =>
      CustomerPhoto.findByIdAndUpdate(
        id,
        { displayOrder },
        { new: true, runValidators: true }
      )
    );

    await Promise.all(updatePromises);

    // Invalidate cache
    invalidateCustomerPhotosCache();

    // Fetch updated photos
    const updatedPhotos = await CustomerPhoto.find().sort({ displayOrder: 1 });

    res.json({
      success: true,
      data: updatedPhotos
    });
  } catch (error) {
    console.error('Error reordering customer photos:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while reordering customer photos'
    });
  }
});

/**
 * @route   DELETE /api/customer-photos/:id
 * @desc    Delete customer photo
 * @access  Private (Super Admin)
 */
router.delete('/:id', async (req, res) => {
  try {
    const { userId } = req.body;

    // Verify admin
    if (!await verifyAdmin(userId)) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized. Only super admin can delete customer photos'
      });
    }

    const photo = await CustomerPhoto.findById(req.params.id);

    if (!photo) {
      return res.status(404).json({
        success: false,
        error: 'Customer photo not found'
      });
    }

    await CustomerPhoto.findByIdAndDelete(req.params.id);

    // Invalidate cache
    invalidateCustomerPhotosCache();

    res.json({
      success: true,
      data: {},
      message: 'Customer photo deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting customer photo:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while deleting customer photo'
    });
  }
});

module.exports = router;
