/**
 * Component B: Cache Management Component
 * Task 7.2: Component B (depends: 6.6)
 *
 * Fan-in pattern position:
 * This component depends on Feature B tests (6.6) and will be
 * combined with Components A and C in the final integration (7.4).
 *
 *   7.1 ──┐
 *   7.2 ──┼── 7.4 (Final Integration)
 *   7.3 ──┘
 *
 * Purpose: A cache management component that builds on the tested
 * FeatureBService to provide higher-level caching operations including
 * namespaced caching, cache groups, and distributed cache patterns.
 */

const { FeatureBService, CacheEvents, DEFAULT_CACHE_CONFIG } = require('../services/feature-b-service');

/**
 * Component B Configuration
 */
const COMPONENT_B_CONFIG = {
  name: 'ComponentB',
  version: '1.0.0',
  description: 'Cache Management Component',
  maxNamespaces: 10,
  defaultNamespace: 'default',
  enableDistributed: false,
  syncInterval: 5000
};

/**
 * Cache strategy types
 */
const CacheStrategy = {
  LRU: 'lru',
  LFU: 'lfu',
  FIFO: 'fifo',
  TTL: 'ttl'
};

/**
 * Component B: High-level cache management operations
 */
class ComponentB {
  constructor(config = {}) {
    this.config = { ...COMPONENT_B_CONFIG, ...config };
    this.namespaces = new Map();
    this.groups = new Map();
    this.metrics = {
      namespacesCreated: 0,
      groupsCreated: 0,
      totalGets: 0,
      totalSets: 0,
      totalHits: 0,
      totalMisses: 0
    };
    this.running = false;
    this.startTime = null;
  }

  /**
   * Start the component
   */
  async start() {
    if (this.running) {
      return { success: false, error: 'Component already running' };
    }

    // Create default namespace
    await this.createNamespace(this.config.defaultNamespace);

    this.running = true;
    this.startTime = Date.now();

    return {
      success: true,
      message: 'Component B started',
      config: this.config
    };
  }

  /**
   * Stop the component
   */
  async stop() {
    if (!this.running) {
      return { success: false, error: 'Component not running' };
    }

    // Stop all namespace services
    for (const [name, service] of this.namespaces) {
      await service.stop();
    }

    this.namespaces.clear();
    this.groups.clear();
    this.running = false;

    return {
      success: true,
      message: 'Component B stopped',
      uptime: Date.now() - this.startTime
    };
  }

  /**
   * Check if component is running
   */
  isRunning() {
    return this.running;
  }

  /**
   * Create a new cache namespace
   * @param {string} name - Namespace name
   * @param {Object} config - Namespace configuration
   */
  async createNamespace(name, config = {}) {
    if (this.namespaces.has(name)) {
      return { success: false, error: `Namespace '${name}' already exists` };
    }

    if (this.namespaces.size >= this.config.maxNamespaces) {
      return { success: false, error: 'Maximum namespaces reached' };
    }

    const service = new FeatureBService({
      ...DEFAULT_CACHE_CONFIG,
      ...config,
      name: `cache:${name}`
    });

    await service.start();
    this.namespaces.set(name, service);
    this.metrics.namespacesCreated++;

    return {
      success: true,
      namespace: name,
      config: service.config
    };
  }

  /**
   * Delete a cache namespace
   * @param {string} name - Namespace name
   */
  async deleteNamespace(name) {
    if (name === this.config.defaultNamespace) {
      return { success: false, error: 'Cannot delete default namespace' };
    }

    if (!this.namespaces.has(name)) {
      return { success: false, error: `Namespace '${name}' not found` };
    }

    const service = this.namespaces.get(name);
    await service.stop();
    this.namespaces.delete(name);

    // Remove from any groups
    for (const [groupName, group] of this.groups) {
      group.namespaces = group.namespaces.filter(ns => ns !== name);
    }

    return {
      success: true,
      message: `Namespace '${name}' deleted`
    };
  }

  /**
   * Get a namespace service
   * @param {string} name - Namespace name
   * @private
   */
  getNamespace(name = null) {
    const nsName = name || this.config.defaultNamespace;
    return this.namespaces.get(nsName);
  }

  /**
   * Set a value in cache
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {Object} options - Options (namespace, ttl)
   */
  set(key, value, options = {}) {
    if (!this.running) {
      return false;
    }

    const namespace = this.getNamespace(options.namespace);
    if (!namespace) {
      return false;
    }

    this.metrics.totalSets++;
    return namespace.set(key, value, options.ttl);
  }

  /**
   * Get a value from cache
   * @param {string} key - Cache key
   * @param {Object} options - Options (namespace)
   */
  get(key, options = {}) {
    if (!this.running) {
      return undefined;
    }

    const namespace = this.getNamespace(options.namespace);
    if (!namespace) {
      return undefined;
    }

    this.metrics.totalGets++;
    const value = namespace.get(key);

    if (value !== undefined) {
      this.metrics.totalHits++;
    } else {
      this.metrics.totalMisses++;
    }

    return value;
  }

  /**
   * Check if key exists in cache
   * @param {string} key - Cache key
   * @param {Object} options - Options (namespace)
   */
  has(key, options = {}) {
    if (!this.running) {
      return false;
    }

    const namespace = this.getNamespace(options.namespace);
    return namespace ? namespace.has(key) : false;
  }

  /**
   * Delete a key from cache
   * @param {string} key - Cache key
   * @param {Object} options - Options (namespace)
   */
  delete(key, options = {}) {
    if (!this.running) {
      return false;
    }

    const namespace = this.getNamespace(options.namespace);
    return namespace ? namespace.delete(key) : false;
  }

  /**
   * Clear cache in namespace
   * @param {string} namespaceName - Namespace to clear (null for default)
   */
  clear(namespaceName = null) {
    if (!this.running) {
      return { success: false, error: 'Component not running' };
    }

    const namespace = this.getNamespace(namespaceName);
    if (!namespace) {
      return { success: false, error: 'Namespace not found' };
    }

    const count = namespace.clear();
    return {
      success: true,
      namespace: namespaceName || this.config.defaultNamespace,
      clearedCount: count
    };
  }

  /**
   * Create a cache group
   * @param {string} groupName - Group name
   * @param {Array} namespaceNames - Namespaces in group
   */
  createGroup(groupName, namespaceNames = []) {
    if (this.groups.has(groupName)) {
      return { success: false, error: `Group '${groupName}' already exists` };
    }

    // Validate namespaces exist
    const validNamespaces = namespaceNames.filter(ns => this.namespaces.has(ns));

    this.groups.set(groupName, {
      name: groupName,
      namespaces: validNamespaces,
      created: new Date().toISOString()
    });

    this.metrics.groupsCreated++;

    return {
      success: true,
      group: groupName,
      namespaces: validNamespaces
    };
  }

  /**
   * Set value in all namespaces of a group
   * @param {string} groupName - Group name
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} ttl - TTL in milliseconds
   */
  setInGroup(groupName, key, value, ttl = null) {
    const group = this.groups.get(groupName);
    if (!group) {
      return { success: false, error: `Group '${groupName}' not found` };
    }

    let successCount = 0;
    for (const nsName of group.namespaces) {
      if (this.set(key, value, { namespace: nsName, ttl })) {
        successCount++;
      }
    }

    return {
      success: successCount === group.namespaces.length,
      groupName,
      namespacesUpdated: successCount,
      total: group.namespaces.length
    };
  }

  /**
   * Get value from first available namespace in group
   * @param {string} groupName - Group name
   * @param {string} key - Cache key
   */
  getFromGroup(groupName, key) {
    const group = this.groups.get(groupName);
    if (!group) {
      return { success: false, error: `Group '${groupName}' not found` };
    }

    for (const nsName of group.namespaces) {
      const value = this.get(key, { namespace: nsName });
      if (value !== undefined) {
        return {
          success: true,
          value,
          foundIn: nsName
        };
      }
    }

    return {
      success: false,
      error: 'Key not found in any namespace'
    };
  }

  /**
   * Clear all namespaces in a group
   * @param {string} groupName - Group name
   */
  clearGroup(groupName) {
    const group = this.groups.get(groupName);
    if (!group) {
      return { success: false, error: `Group '${groupName}' not found` };
    }

    let totalCleared = 0;
    for (const nsName of group.namespaces) {
      const result = this.clear(nsName);
      if (result.success) {
        totalCleared += result.clearedCount;
      }
    }

    return {
      success: true,
      groupName,
      totalCleared
    };
  }

  /**
   * Get or set value (cache-aside pattern)
   * @param {string} key - Cache key
   * @param {Function} fetcher - Function to fetch value if not cached
   * @param {Object} options - Options (namespace, ttl)
   */
  async getOrSet(key, fetcher, options = {}) {
    if (!this.running) {
      return { success: false, error: 'Component not running' };
    }

    // Try to get from cache
    const cached = this.get(key, options);
    if (cached !== undefined) {
      return {
        success: true,
        value: cached,
        source: 'cache'
      };
    }

    // Fetch the value
    try {
      const value = await fetcher();
      this.set(key, value, options);
      return {
        success: true,
        value,
        source: 'fetcher'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get statistics for a namespace
   * @param {string} namespaceName - Namespace name (null for default)
   */
  getNamespaceStats(namespaceName = null) {
    const namespace = this.getNamespace(namespaceName);
    if (!namespace) {
      return { success: false, error: 'Namespace not found' };
    }

    return {
      success: true,
      namespace: namespaceName || this.config.defaultNamespace,
      stats: namespace.stats
    };
  }

  /**
   * Get all namespace stats
   */
  getAllStats() {
    const stats = {};
    for (const [name, service] of this.namespaces) {
      stats[name] = service.stats;
    }
    return stats;
  }

  /**
   * Get component metrics
   */
  getMetrics() {
    const hitRate = this.metrics.totalGets > 0
      ? ((this.metrics.totalHits / this.metrics.totalGets) * 100).toFixed(2) + '%'
      : '0.00%';

    return {
      ...this.metrics,
      hitRate,
      namespaceCount: this.namespaces.size,
      groupCount: this.groups.size,
      uptime: this.running ? Date.now() - this.startTime : 0
    };
  }

  /**
   * Get component info
   */
  getInfo() {
    return {
      config: this.config,
      running: this.running,
      startTime: this.startTime,
      namespaces: Array.from(this.namespaces.keys()),
      groups: Array.from(this.groups.keys()),
      metrics: this.getMetrics()
    };
  }

  /**
   * Reset all namespaces
   */
  async reset() {
    for (const [name, service] of this.namespaces) {
      service.clear();
    }

    this.metrics = {
      namespacesCreated: this.namespaces.size,
      groupsCreated: this.groups.size,
      totalGets: 0,
      totalSets: 0,
      totalHits: 0,
      totalMisses: 0
    };

    return { success: true, message: 'Component B reset' };
  }
}

module.exports = {
  ComponentB,
  COMPONENT_B_CONFIG,
  CacheStrategy
};
