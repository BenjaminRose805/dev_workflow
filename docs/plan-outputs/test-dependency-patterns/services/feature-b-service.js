/**
 * Feature B Service - Caching Service
 * Task 6.3: Feature B module (depends on 6.1)
 *
 * Part of the fan-out pattern:
 *       6.1 (base)
 *     /  |  \
 *   6.2 6.3 6.4
 *        ^
 *      (this)
 *
 * Purpose: Provides in-memory caching functionality with TTL support.
 * Demonstrates extending BaseService for specialized functionality.
 */

const { BaseService, ServiceEvents } = require('./base-service');

/**
 * Cache entry structure
 * @typedef {Object} CacheEntry
 * @property {*} value - The cached value
 * @property {number} createdAt - Timestamp when entry was created
 * @property {number|null} expiresAt - Timestamp when entry expires (null = never)
 */

/**
 * Cache events specific to FeatureBService
 */
const CacheEvents = {
  HIT: 'cache:hit',
  MISS: 'cache:miss',
  SET: 'cache:set',
  DELETE: 'cache:delete',
  CLEAR: 'cache:clear',
  EXPIRE: 'cache:expire'
};

/**
 * Default cache configuration
 */
const DEFAULT_CACHE_CONFIG = {
  name: 'FeatureBService',
  maxSize: 1000,
  defaultTtl: null, // null means no expiration by default
  cleanupInterval: 60000, // cleanup expired entries every minute
  version: '1.0.0'
};

/**
 * Feature B Service - Caching Service
 * Extends BaseService to provide in-memory caching with TTL support
 */
class FeatureBService extends BaseService {
  /**
   * Create a new caching service instance
   * @param {Object} config - Service configuration
   * @param {string} [config.name='FeatureBService'] - Service name
   * @param {number} [config.maxSize=1000] - Maximum cache entries
   * @param {number|null} [config.defaultTtl=null] - Default TTL in ms (null = no expiration)
   * @param {number} [config.cleanupInterval=60000] - Cleanup interval in ms
   */
  constructor(config = {}) {
    super({ ...DEFAULT_CACHE_CONFIG, ...config });

    this.cache = new Map();
    this.cleanupTimer = null;

    // Cache-specific metrics
    this.cacheMetrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      expirations: 0
    };
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  get stats() {
    const hitRate = this.cacheMetrics.hits + this.cacheMetrics.misses > 0
      ? (this.cacheMetrics.hits / (this.cacheMetrics.hits + this.cacheMetrics.misses)) * 100
      : 0;

    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      ...this.cacheMetrics,
      hitRate: hitRate.toFixed(2) + '%'
    };
  }

  /**
   * Get a value from the cache
   * @param {string} key - Cache key
   * @returns {*} Cached value or undefined if not found/expired
   */
  get(key) {
    this.trackRequest();

    if (!this.isRunning()) {
      this.trackError('Service not running');
      return undefined;
    }

    const entry = this.cache.get(key);

    if (!entry) {
      this.cacheMetrics.misses++;
      this._emit(CacheEvents.MISS, { key });
      return undefined;
    }

    // Check if entry has expired
    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      this._deleteEntry(key, true);
      this.cacheMetrics.misses++;
      this._emit(CacheEvents.MISS, { key, reason: 'expired' });
      return undefined;
    }

    this.cacheMetrics.hits++;
    this._emit(CacheEvents.HIT, { key });
    return entry.value;
  }

  /**
   * Set a value in the cache
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number|null} [ttl] - Time to live in milliseconds (null = use default)
   * @returns {boolean} True if set successfully
   */
  set(key, value, ttl = null) {
    this.trackRequest();

    if (!this.isRunning()) {
      this.trackError('Service not running');
      return false;
    }

    // Use provided TTL, fall back to default, null means no expiration
    const effectiveTtl = ttl !== null ? ttl : this.config.defaultTtl;

    // Check if we need to evict entries
    if (this.cache.size >= this.config.maxSize && !this.cache.has(key)) {
      this._evictOldest();
    }

    const now = Date.now();
    const entry = {
      value,
      createdAt: now,
      expiresAt: effectiveTtl !== null ? now + effectiveTtl : null
    };

    this.cache.set(key, entry);
    this.cacheMetrics.sets++;

    this._emit(CacheEvents.SET, {
      key,
      ttl: effectiveTtl,
      expiresAt: entry.expiresAt
    });

    return true;
  }

  /**
   * Delete a value from the cache
   * @param {string} key - Cache key
   * @returns {boolean} True if the key existed and was deleted
   */
  delete(key) {
    this.trackRequest();

    if (!this.isRunning()) {
      this.trackError('Service not running');
      return false;
    }

    return this._deleteEntry(key, false);
  }

  /**
   * Clear all entries from the cache
   * @returns {number} Number of entries cleared
   */
  clear() {
    this.trackRequest();

    if (!this.isRunning()) {
      this.trackError('Service not running');
      return 0;
    }

    const count = this.cache.size;
    this.cache.clear();

    this._emit(CacheEvents.CLEAR, { entriesCleared: count });

    return count;
  }

  /**
   * Check if a key exists in the cache (and is not expired)
   * @param {string} key - Cache key
   * @returns {boolean} True if key exists and is not expired
   */
  has(key) {
    this.trackRequest();

    if (!this.isRunning()) {
      return false;
    }

    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    // Check if entry has expired
    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      this._deleteEntry(key, true);
      return false;
    }

    return true;
  }

  /**
   * Get all keys in the cache
   * @returns {string[]} Array of cache keys
   */
  keys() {
    if (!this.isRunning()) {
      return [];
    }

    // Filter out expired keys
    const validKeys = [];
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt === null || entry.expiresAt > now) {
        validKeys.push(key);
      }
    }

    return validKeys;
  }

  /**
   * Get multiple values at once
   * @param {string[]} keys - Array of cache keys
   * @returns {Map<string, *>} Map of key to value (only existing keys)
   */
  getMany(keys) {
    const results = new Map();

    for (const key of keys) {
      const value = this.get(key);
      if (value !== undefined) {
        results.set(key, value);
      }
    }

    return results;
  }

  /**
   * Set multiple values at once
   * @param {Map<string, *>|Object} entries - Entries to set
   * @param {number|null} [ttl] - TTL for all entries
   * @returns {number} Number of entries set
   */
  setMany(entries, ttl = null) {
    let count = 0;
    const iterable = entries instanceof Map ? entries.entries() : Object.entries(entries);

    for (const [key, value] of iterable) {
      if (this.set(key, value, ttl)) {
        count++;
      }
    }

    return count;
  }

  /**
   * Get entry metadata
   * @param {string} key - Cache key
   * @returns {Object|null} Entry metadata or null if not found
   */
  getMetadata(key) {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    const now = Date.now();
    return {
      key,
      createdAt: new Date(entry.createdAt).toISOString(),
      expiresAt: entry.expiresAt ? new Date(entry.expiresAt).toISOString() : null,
      isExpired: entry.expiresAt !== null && now > entry.expiresAt,
      ttlRemaining: entry.expiresAt !== null ? Math.max(0, entry.expiresAt - now) : null
    };
  }

  /**
   * Get service information including cache stats
   * @returns {Object} Service info with cache statistics
   */
  getInfo() {
    const baseInfo = super.getInfo();
    return {
      ...baseInfo,
      cache: this.stats
    };
  }

  /**
   * Perform a health check including cache health
   * @returns {Object} Health status
   */
  healthCheck() {
    const baseHealth = super.healthCheck();
    return {
      ...baseHealth,
      cache: {
        size: this.cache.size,
        maxSize: this.config.maxSize,
        utilizationPercent: ((this.cache.size / this.config.maxSize) * 100).toFixed(2) + '%'
      }
    };
  }

  // ==================== Protected Methods ====================

  /**
   * Initialize the caching service
   * @protected
   */
  async _initialize() {
    // Clear any existing cache
    this.cache.clear();

    // Reset cache metrics
    this.cacheMetrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      expirations: 0
    };

    // Start cleanup timer for expired entries
    this._startCleanupTimer();

    // Simulate async initialization
    await new Promise(resolve => setTimeout(resolve, 15));
  }

  /**
   * Cleanup the caching service
   * @protected
   */
  async _cleanup() {
    // Stop cleanup timer
    this._stopCleanupTimer();

    // Clear the cache
    this.cache.clear();

    // Simulate async cleanup
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  // ==================== Private Methods ====================

  /**
   * Delete an entry from the cache
   * @param {string} key - Cache key
   * @param {boolean} isExpiration - Whether this is due to expiration
   * @returns {boolean} True if entry was deleted
   * @private
   */
  _deleteEntry(key, isExpiration) {
    const existed = this.cache.delete(key);

    if (existed) {
      if (isExpiration) {
        this.cacheMetrics.expirations++;
        this._emit(CacheEvents.EXPIRE, { key });
      } else {
        this.cacheMetrics.deletes++;
        this._emit(CacheEvents.DELETE, { key });
      }
    }

    return existed;
  }

  /**
   * Evict the oldest entry when cache is full
   * @private
   */
  _evictOldest() {
    let oldestKey = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
        oldestKey = key;
      }
    }

    if (oldestKey !== null) {
      this.cache.delete(oldestKey);
      this.cacheMetrics.evictions++;
    }
  }

  /**
   * Start the cleanup timer for expired entries
   * @private
   */
  _startCleanupTimer() {
    if (this.cleanupTimer) return;

    this.cleanupTimer = setInterval(() => {
      this._cleanupExpired();
    }, this.config.cleanupInterval);
  }

  /**
   * Stop the cleanup timer
   * @private
   */
  _stopCleanupTimer() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Remove all expired entries
   * @private
   */
  _cleanupExpired() {
    const now = Date.now();
    const expiredKeys = [];

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt !== null && entry.expiresAt <= now) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this._deleteEntry(key, true);
    }

    if (expiredKeys.length > 0) {
      // Optionally emit a bulk expiration event
      this._emit('cache:cleanup', {
        expiredCount: expiredKeys.length,
        remainingSize: this.cache.size
      });
    }
  }
}

module.exports = {
  FeatureBService,
  CacheEvents,
  DEFAULT_CACHE_CONFIG
};
