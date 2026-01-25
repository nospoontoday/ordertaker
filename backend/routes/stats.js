const express = require('express');
const router = express.Router();
const Stats = require('../models/Stats');
const { get, set, CACHE_KEYS, TTL } = require('../utils/cache');

// Add stats cache key
const STATS_CACHE_KEY = 'stats:global';
const STATS_TTL = 60; // 1 minute cache

/**
 * @route   GET /api/stats
 * @desc    Get global statistics including average wait time
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    // Check cache first
    const cachedStats = get(STATS_CACHE_KEY);
    if (cachedStats) {
      res.set('X-Cache', 'HIT');
      return res.json(cachedStats);
    }

    // Get or create global stats
    const stats = await Stats.getGlobalStats();

    const response = {
      success: true,
      data: {
        averageWaitTimeMs: stats.averageWaitTimeMs,
        completedOrdersCount: stats.completedOrdersCount,
        totalWaitTimeMs: stats.totalWaitTimeMs,
        lastUpdated: stats.lastUpdated
      }
    };

    // Cache the response
    set(STATS_CACHE_KEY, response, STATS_TTL);
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
 * @desc    Recalculate stats from all completed orders (admin utility)
 * @access  Private (should be protected in production)
 */
router.post('/recalculate', async (req, res) => {
  try {
    const Order = require('../models/Order');
    
    // Find all orders that have been fully served (have allItemsServedAt set)
    const completedOrders = await Order.find({
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

    // Update stats
    const stats = await Stats.findOneAndUpdate(
      { key: 'global' },
      {
        $set: {
          totalWaitTimeMs,
          completedOrdersCount,
          lastUpdated: Date.now()
        }
      },
      { upsert: true, new: true }
    );

    // Invalidate cache
    const { del } = require('../utils/cache');
    del(STATS_CACHE_KEY);

    res.json({
      success: true,
      message: 'Stats recalculated successfully',
      data: {
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
