const express = require('express');
const router = express.Router();
const Stats = require('../models/Stats');
const { get, set, del, CACHE_KEYS, TTL } = require('../utils/cache');
const { DEFAULT_BRANCH, isValidBranchId } = require('../config/branches');

// Stats cache TTL
const STATS_TTL = 60; // 1 minute cache

/**
 * @route   GET /api/stats
 * @desc    Get statistics for a branch including average wait time
 * @query   branchId - Branch to get stats for
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const { branchId } = req.query;
    
    // Use provided branchId or default
    const effectiveBranchId = branchId && isValidBranchId(branchId) ? branchId : DEFAULT_BRANCH.id;

    // Generate branch-specific cache key
    const cacheKey = `stats:${effectiveBranchId}`;

    // Check cache first
    const cachedStats = get(cacheKey);
    if (cachedStats) {
      res.set('X-Cache', 'HIT');
      return res.json(cachedStats);
    }

    // Get or create stats for this branch
    const stats = await Stats.getGlobalStats(effectiveBranchId);

    const response = {
      success: true,
      data: {
        branchId: effectiveBranchId,
        averageWaitTimeMs: stats.averageWaitTimeMs,
        completedOrdersCount: stats.completedOrdersCount,
        totalWaitTimeMs: stats.totalWaitTimeMs,
        lastUpdated: stats.lastUpdated
      }
    };

    // Cache the response
    set(cacheKey, response, STATS_TTL);
    res.set('X-Cache', 'MISS');

    res.json(response);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch stats'
    });
  }
});

/**
 * @route   POST /api/stats/recalculate
 * @desc    Recalculate stats from all completed orders for a branch (admin utility)
 * @body    { branchId } - Optional branch to recalculate stats for
 * @access  Private (should be protected in production)
 */
router.post('/recalculate', async (req, res) => {
  try {
    const { branchId } = req.body;
    
    // Use provided branchId or default
    const effectiveBranchId = branchId && isValidBranchId(branchId) ? branchId : DEFAULT_BRANCH.id;

    const Order = require('../models/Order');
    
    // Find all orders for this branch that have been fully served
    const completedOrders = await Order.find({
      branchId: effectiveBranchId,
      allItemsServedAt: { $exists: true, $ne: null }
    });

    let totalWaitTimeMs = 0;
    let completedOrdersCount = 0;

    completedOrders.forEach(order => {
      if (order.allItemsServedAt && order.createdAt) {
        const waitTime = order.allItemsServedAt - order.createdAt;
        if (waitTime > 0) {
          totalWaitTimeMs += waitTime;
          completedOrdersCount++;
        }
      }
    });

    // Update stats for this branch
    const stats = await Stats.findOneAndUpdate(
      { key: 'global', branchId: effectiveBranchId },
      {
        $set: {
          totalWaitTimeMs,
          completedOrdersCount,
          lastUpdated: Date.now()
        }
      },
      { upsert: true, new: true }
    );

    // Invalidate cache for this branch
    del(`stats:${effectiveBranchId}`);

    res.json({
      success: true,
      message: 'Stats recalculated successfully',
      data: {
        branchId: effectiveBranchId,
        averageWaitTimeMs: stats.averageWaitTimeMs,
        completedOrdersCount: stats.completedOrdersCount,
        totalWaitTimeMs: stats.totalWaitTimeMs,
        lastUpdated: stats.lastUpdated
      }
    });
  } catch (error) {
    console.error('Error recalculating stats:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to recalculate stats'
    });
  }
});

module.exports = router;
