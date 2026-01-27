const express = require('express');
const router = express.Router();
const DTR = require('../models/DTR');
const User = require('../models/User');
const { DEFAULT_BRANCH, isValidBranchId } = require('../config/branches');

/**
 * @route   GET /api/dtr/status/:userId
 * @desc    Get current clock status for a user
 * @access  Public
 */
router.get('/status/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { branchId } = req.query;

    // Use provided branchId or default
    const effectiveBranchId = branchId && isValidBranchId(branchId) ? branchId : DEFAULT_BRANCH.id;

    // Find the most recent DTR record that's still clocked in for this branch
    const activeDTR = await DTR.findOne({
      userId,
      branchId: effectiveBranchId,
      status: 'clocked_in'
    }).sort({ clockInTime: -1 });

    res.json({
      success: true,
      data: {
        isClockedIn: !!activeDTR,
        activeDTR: activeDTR || null
      }
    });
  } catch (error) {
    console.error('Error getting DTR status:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get DTR status'
    });
  }
});

/**
 * @route   POST /api/dtr/clock-in
 * @desc    Clock in a user
 * @body    { userId, notes }
 * @access  Public
 */
router.post('/clock-in', async (req, res) => {
  try {
    const { userId, branchId, notes } = req.body;

    // Use provided branchId or default
    const effectiveBranchId = branchId && isValidBranchId(branchId) ? branchId : DEFAULT_BRANCH.id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    // Verify user exists and is crew
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    if (!user.isCrew()) {
      return res.status(403).json({
        success: false,
        error: 'Only crew members can use DTR'
      });
    }

    // Check if user is already clocked in at this branch
    const existingClockIn = await DTR.findOne({
      userId,
      branchId: effectiveBranchId,
      status: 'clocked_in'
    });

    if (existingClockIn) {
      return res.status(400).json({
        success: false,
        error: 'Already clocked in. Please clock out first.',
        data: existingClockIn
      });
    }

    // Create new DTR record
    const now = new Date();
    const date = now.toISOString().split('T')[0]; // YYYY-MM-DD

    const dtr = new DTR({
      userId,
      branchId: effectiveBranchId,
      clockInTime: now,
      date,
      status: 'clocked_in',
      notes: notes || ''
    });

    await dtr.save();

    // Populate user info
    await dtr.populate('userId', 'name email');

    res.json({
      success: true,
      data: dtr,
      message: 'Clocked in successfully'
    });
  } catch (error) {
    console.error('Error clocking in:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to clock in'
    });
  }
});

/**
 * @route   POST /api/dtr/clock-out
 * @desc    Clock out a user
 * @body    { userId, notes }
 * @access  Public
 */
router.post('/clock-out', async (req, res) => {
  try {
    const { userId, branchId, notes } = req.body;

    // Use provided branchId or default
    const effectiveBranchId = branchId && isValidBranchId(branchId) ? branchId : DEFAULT_BRANCH.id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    // Find active clock-in record for this branch
    const dtr = await DTR.findOne({
      userId,
      branchId: effectiveBranchId,
      status: 'clocked_in'
    }).sort({ clockInTime: -1 });

    if (!dtr) {
      return res.status(400).json({
        success: false,
        error: 'No active clock-in found. Please clock in first.'
      });
    }

    // Update DTR record
    dtr.clockOutTime = new Date();
    dtr.status = 'clocked_out';
    if (notes) {
      dtr.notes = dtr.notes ? `${dtr.notes} | ${notes}` : notes;
    }

    await dtr.save();

    // Populate user info
    await dtr.populate('userId', 'name email');

    res.json({
      success: true,
      data: {
        ...dtr.toObject(),
        workDuration: dtr.getWorkDuration()
      },
      message: 'Clocked out successfully'
    });
  } catch (error) {
    console.error('Error clocking out:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to clock out'
    });
  }
});

/**
 * @route   GET /api/dtr/records/:userId
 * @desc    Get DTR records for a specific user
 * @query   startDate, endDate, limit, page
 * @access  Public
 */
router.get('/records/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate, limit = 50, page = 1 } = req.query;

    const query = { userId };

    // Date range filter
    if (startDate || endDate) {
      query.clockInTime = {};
      if (startDate) {
        query.clockInTime.$gte = new Date(startDate);
      }
      if (endDate) {
        query.clockInTime.$lte = new Date(endDate);
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const records = await DTR.find(query)
      .populate('userId', 'name email')
      .sort({ clockInTime: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await DTR.countDocuments(query);

    // Calculate total hours for completed records
    let totalHours = 0;
    records.forEach(record => {
      if (record.clockOutTime) {
        const duration = (record.clockOutTime - record.clockInTime) / (1000 * 60 * 60);
        totalHours += duration;
      }
    });

    res.json({
      success: true,
      data: {
        records: records.map(r => ({
          ...r.toObject(),
          workDuration: r.getWorkDuration()
        })),
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        },
        summary: {
          totalRecords: total,
          totalHours: totalHours.toFixed(2)
        }
      }
    });
  } catch (error) {
    console.error('Error getting DTR records:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get DTR records'
    });
  }
});

/**
 * @route   GET /api/dtr/summary/:userId/:year/:month
 * @desc    Get monthly DTR summary for a user
 * @access  Public
 */
router.get('/summary/:userId/:year/:month', async (req, res) => {
  try {
    const { userId, year, month } = req.params;

    const summary = await DTR.getMonthlySummary(
      userId,
      parseInt(year),
      parseInt(month)
    );

    // Populate user info for each record
    await DTR.populate(summary.records, {
      path: 'userId',
      select: 'name email'
    });

    // Add work duration to each record
    summary.records = summary.records.map(r => ({
      ...r.toObject(),
      workDuration: r.getWorkDuration()
    }));

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error getting DTR summary:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get DTR summary'
    });
  }
});

/**
 * @route   GET /api/dtr/all
 * @desc    Get all crew DTR records (for admin)
 * @query   startDate, endDate, limit, page
 * @access  Public (should verify admin role on frontend)
 */
router.get('/all', async (req, res) => {
  try {
    const { branchId, startDate, endDate, limit = 100, page = 1 } = req.query;

    // Use provided branchId or default
    const effectiveBranchId = branchId && isValidBranchId(branchId) ? branchId : DEFAULT_BRANCH.id;

    const query = { branchId: effectiveBranchId };

    // Date range filter
    if (startDate || endDate) {
      query.clockInTime = {};
      if (startDate) {
        query.clockInTime.$gte = new Date(startDate);
      }
      if (endDate) {
        query.clockInTime.$lte = new Date(endDate);
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const records = await DTR.find(query)
      .populate('userId', 'name email role')
      .sort({ clockInTime: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await DTR.countDocuments(query);

    // Group by user and calculate stats
    const userStats = {};
    records.forEach(record => {
      const userId = record.userId._id.toString();
      if (!userStats[userId]) {
        userStats[userId] = {
          user: record.userId,
          totalDays: 0,
          totalHours: 0
        };
      }
      if (record.status === 'clocked_out') {
        userStats[userId].totalDays++;
        const duration = (record.clockOutTime - record.clockInTime) / (1000 * 60 * 60);
        userStats[userId].totalHours += duration;
      }
    });

    res.json({
      success: true,
      data: {
        records: records.map(r => ({
          ...r.toObject(),
          workDuration: r.getWorkDuration()
        })),
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        },
        userStats: Object.values(userStats).map(stat => ({
          ...stat,
          totalHours: stat.totalHours.toFixed(2)
        }))
      }
    });
  } catch (error) {
    console.error('Error getting all DTR records:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get DTR records'
    });
  }
});

module.exports = router;
