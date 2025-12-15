/**
 * Lightweight in-memory cache utility using node-cache
 * Optimized for low-memory environments (2GB droplet)
 *
 * Cache TTL Settings:
 * - Menu items: 5 minutes (rarely change)
 * - Categories: 5 minutes (rarely change)
 * - Orders list: 30 seconds (changes frequently)
 * - Daily sales: 2 minutes (expensive computation)
 * - Inventory: 1 minute (moderate change frequency)
 */

const NodeCache = require('node-cache');

// Create cache instance with settings optimized for low memory
// stdTTL: default TTL in seconds (60s)
// checkperiod: how often to check for expired keys (120s)
// maxKeys: limit max entries to prevent memory issues (1000)
// useClones: false to reduce memory (we'll be careful with mutations)
const cache = new NodeCache({
  stdTTL: 60,
  checkperiod: 120,
  maxKeys: 1000,
  useClones: false,
  deleteOnExpire: true
});

// Cache key prefixes for different data types
const CACHE_KEYS = {
  MENU_ITEMS: 'menu:items',
  MENU_ITEM: 'menu:item:',
  CATEGORIES: 'categories:all',
  CATEGORY: 'category:',
  ORDERS: 'orders:',
  DAILY_SALES: 'daily-sales:',
  INVENTORY: 'inventory:',
  INVENTORY_STATS: 'inventory:stats'
};

// TTL settings in seconds for different data types
const TTL = {
  MENU_ITEMS: 300,      // 5 minutes - menu items rarely change
  CATEGORIES: 300,      // 5 minutes - categories rarely change
  ORDERS: 30,           // 30 seconds - orders change frequently
  DAILY_SALES: 120,     // 2 minutes - expensive computation
  INVENTORY: 60,        // 1 minute - moderate change frequency
  INSIGHTS: 300         // 5 minutes - expensive computation
};

/**
 * Get value from cache
 * @param {string} key - Cache key
 * @returns {*} Cached value or undefined
 */
function get(key) {
  return cache.get(key);
}

/**
 * Set value in cache with optional TTL
 * @param {string} key - Cache key
 * @param {*} value - Value to cache
 * @param {number} ttl - TTL in seconds (optional)
 * @returns {boolean} Success
 */
function set(key, value, ttl) {
  return cache.set(key, value, ttl);
}

/**
 * Delete a specific key from cache
 * @param {string} key - Cache key
 * @returns {number} Number of deleted entries
 */
function del(key) {
  return cache.del(key);
}

/**
 * Delete all keys matching a pattern (prefix)
 * @param {string} prefix - Key prefix to match
 * @returns {number} Number of deleted entries
 */
function delByPrefix(prefix) {
  const keys = cache.keys();
  const matchingKeys = keys.filter(key => key.startsWith(prefix));
  return cache.del(matchingKeys);
}

/**
 * Clear entire cache
 */
function flush() {
  cache.flushAll();
}

/**
 * Get cache statistics for monitoring
 * @returns {Object} Cache stats
 */
function getStats() {
  const stats = cache.getStats();
  const keys = cache.keys();

  return {
    hits: stats.hits,
    misses: stats.misses,
    hitRate: stats.hits + stats.misses > 0
      ? ((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(2) + '%'
      : '0%',
    keys: keys.length,
    ksize: stats.ksize,
    vsize: stats.vsize,
    // Group keys by prefix for debugging
    keysByType: {
      menuItems: keys.filter(k => k.startsWith('menu:')).length,
      categories: keys.filter(k => k.startsWith('categor')).length,
      orders: keys.filter(k => k.startsWith('orders:')).length,
      dailySales: keys.filter(k => k.startsWith('daily-sales:')).length,
      inventory: keys.filter(k => k.startsWith('inventory:')).length,
      other: keys.filter(k =>
        !k.startsWith('menu:') &&
        !k.startsWith('categor') &&
        !k.startsWith('orders:') &&
        !k.startsWith('daily-sales:') &&
        !k.startsWith('inventory:')
      ).length
    }
  };
}

/**
 * Invalidate menu-related caches
 */
function invalidateMenu() {
  delByPrefix('menu:');
  console.log('[Cache] Menu cache invalidated');
}

/**
 * Invalidate category caches
 */
function invalidateCategories() {
  delByPrefix('categor');
  console.log('[Cache] Categories cache invalidated');
}

/**
 * Invalidate order-related caches
 */
function invalidateOrders() {
  delByPrefix('orders:');
  delByPrefix('daily-sales:');
  console.log('[Cache] Orders and daily-sales cache invalidated');
}

/**
 * Invalidate inventory caches
 */
function invalidateInventory() {
  delByPrefix('inventory:');
  console.log('[Cache] Inventory cache invalidated');
}

/**
 * Cache middleware for Express routes
 * @param {string} keyGenerator - Function to generate cache key from req
 * @param {number} ttl - TTL in seconds
 * @returns {Function} Express middleware
 */
function cacheMiddleware(keyGenerator, ttl) {
  return (req, res, next) => {
    const key = typeof keyGenerator === 'function'
      ? keyGenerator(req)
      : keyGenerator;

    const cachedData = get(key);

    if (cachedData !== undefined) {
      // Add cache header for debugging
      res.set('X-Cache', 'HIT');
      return res.json(cachedData);
    }

    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json to cache the response
    res.json = (data) => {
      // Only cache successful responses
      if (data && data.success !== false) {
        set(key, data, ttl);
      }
      res.set('X-Cache', 'MISS');
      return originalJson(data);
    };

    next();
  };
}

// Log cache events for monitoring
cache.on('set', (key) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Cache] SET: ${key}`);
  }
});

cache.on('expired', (key) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Cache] EXPIRED: ${key}`);
  }
});

// Memory monitoring - warn if cache is getting large
setInterval(() => {
  const stats = cache.getStats();
  const memoryMB = (stats.vsize / 1024 / 1024).toFixed(2);

  // Warn if cache exceeds 50MB
  if (stats.vsize > 50 * 1024 * 1024) {
    console.warn(`[Cache] Warning: Cache size is ${memoryMB}MB. Consider reducing TTL or maxKeys.`);
  }
}, 60000); // Check every minute

module.exports = {
  cache,
  get,
  set,
  del,
  delByPrefix,
  flush,
  getStats,
  invalidateMenu,
  invalidateCategories,
  invalidateOrders,
  invalidateInventory,
  cacheMiddleware,
  CACHE_KEYS,
  TTL
};
