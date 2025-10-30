const express = require('express');
const router = express.Router();
const Withdrawal = require('../models/Withdrawal');

/**
 * @route   GET /api/withdrawals
 * @desc    Get all withdrawals with optional filters
 * @query   type - Filter by type (withdrawal/purchase)
 * @query   startDate - Start date timestamp (milliseconds)
 * @query   endDate - End date timestamp (milliseconds)
 * @query   limit - Limit number of results
 * @query   sortBy - Sort by field (createdAt, default: createdAt)
 * @query   sortOrder - Sort order (asc/desc, default: desc)
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const {
      type,
      startDate,
      endDate,
      limit,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};

    // Filter by type
    if (type) {
      query.type = type;
    }

    // Filter by date range
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = parseInt(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = parseInt(endDate);
      }
    }

    // Build sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    let withdrawalsQuery = Withdrawal.find(query).sort(sortOptions);

    // Apply limit if specified
    if (limit) {
      withdrawalsQuery = withdrawalsQuery.limit(parseInt(limit));
    }

    const withdrawals = await withdrawalsQuery.exec();

    res.json({
      success: true,
      count: withdrawals.length,
      data: withdrawals
    });
  } catch (error) {
    console.error('Error fetching withdrawals:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch withdrawals'
    });
  }
});

/**
 * @route   GET /api/withdrawals/:id
 * @desc    Get single withdrawal by ID
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const withdrawal = await Withdrawal.findById(req.params.id);

    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        error: 'Withdrawal not found'
      });
    }

    res.json({
      success: true,
      data: withdrawal
    });
  } catch (error) {
    console.error('Error fetching withdrawal:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch withdrawal'
    });
  }
});

/**
 * @route   POST /api/withdrawals
 * @desc    Create a new withdrawal or purchase
 * @body    { type, amount, description, createdBy, paymentMethod }
 * @access  Public
 */
router.post('/', async (req, res) => {
  try {
    const { type, amount, description, createdBy, paymentMethod, createdAt } = req.body;

    // Validation
    if (!type || !['withdrawal', 'purchase'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Type is required and must be "withdrawal" or "purchase"'
      });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Amount is required and must be greater than 0'
      });
    }

    if (!description || !description.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Description is required'
      });
    }

    // Use provided createdAt timestamp or default to current time
    // Validate createdAt if provided (must be a valid timestamp number)
    let createdAtTimestamp = Date.now();
    if (createdAt !== undefined && createdAt !== null) {
      if (typeof createdAt === 'number' && createdAt > 0) {
        // Allow any past timestamp and up to 1 day in the future (for timezone edge cases)
        // Users should be able to record withdrawals for past dates
        if (createdAt <= Date.now() + (24 * 60 * 60 * 1000)) {
          createdAtTimestamp = createdAt;
        } else {
          return res.status(400).json({
            success: false,
            error: 'Cannot create withdrawals for dates more than 1 day in the future'
          });
        }
      } else {
        return res.status(400).json({
          success: false,
          error: 'Invalid createdAt timestamp - must be a valid number'
        });
      }
    }

    // Create new withdrawal
    const withdrawal = new Withdrawal({
      type,
      amount: parseFloat(amount),
      description: description.trim(),
      createdAt: createdAtTimestamp,
      createdBy: createdBy || {},
      paymentMethod: paymentMethod || null
    });

    await withdrawal.save();

    res.status(201).json({
      success: true,
      data: withdrawal,
      message: `${type === 'withdrawal' ? 'Withdrawal' : 'Purchase'} recorded successfully`
    });
  } catch (error) {
    console.error('Error creating withdrawal:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create withdrawal'
    });
  }
});

/**
 * @route   DELETE /api/withdrawals/:id
 * @desc    Delete a withdrawal
 * @access  Public
 */
router.delete('/:id', async (req, res) => {
  try {
    const withdrawal = await Withdrawal.findByIdAndDelete(req.params.id);

    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        error: 'Withdrawal not found'
      });
    }

    res.json({
      success: true,
      message: 'Withdrawal deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting withdrawal:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete withdrawal'
    });
  }
});

module.exports = router;

