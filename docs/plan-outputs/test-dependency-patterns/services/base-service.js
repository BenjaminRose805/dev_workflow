/**
 * Base Service Module
 * Task 6.1: Create base service
 *
 * This is the root of the fan-out pattern:
 *       6.1 (this)
 *     /  |  \
 *   6.2 6.3 6.4
 *   |   |   |
 *  6.5 6.6 6.7
 *
 * Purpose: Validates that multiple tasks can correctly depend on
 * a single task, and that those dependents can run in parallel
 * once this task completes.
 */

/**
 * Service status enumeration
 */
const ServiceStatus = {
  STOPPED: 'stopped',
  STARTING: 'starting',
  RUNNING: 'running',
  STOPPING: 'stopping',
  ERROR: 'error'
};

/**
 * Base service configuration
 */
const DEFAULT_CONFIG = {
  name: 'BaseService',
  version: '1.0.0',
  timeout: 30000,
  retries: 3,
  healthCheckInterval: 5000
};

/**
 * Event types emitted by services
 */
const ServiceEvents = {
  START: 'service:start',
  STOP: 'service:stop',
  ERROR: 'service:error',
  HEALTH_CHECK: 'service:health',
  STATUS_CHANGE: 'service:status'
};

/**
 * Base Service Class
 * All feature services (6.2, 6.3, 6.4) will extend this class
 */
class BaseService {
  /**
   * Create a new service instance
   * @param {Object} config - Service configuration
   */
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.status = ServiceStatus.STOPPED;
    this.startTime = null;
    this.lastHealthCheck = null;
    this.healthCheckTimer = null;
    this.listeners = new Map();
    this.metrics = {
      requestCount: 0,
      errorCount: 0,
      lastError: null
    };
  }

  /**
   * Get service name
   * @returns {string} Service name
   */
  get name() {
    return this.config.name;
  }

  /**
   * Get service uptime in ms
   * @returns {number|null} Uptime in milliseconds
   */
  get uptime() {
    if (!this.startTime) return null;
    return Date.now() - this.startTime;
  }

  /**
   * Check if service is running
   * @returns {boolean} True if running
   */
  isRunning() {
    return this.status === ServiceStatus.RUNNING;
  }

  /**
   * Start the service
   * @returns {Promise<Object>} Start result
   */
  async start() {
    if (this.status === ServiceStatus.RUNNING) {
      return {
        success: false,
        error: 'Service already running'
      };
    }

    try {
      this._setStatus(ServiceStatus.STARTING);

      // Perform initialization
      await this._initialize();

      this.startTime = Date.now();
      this._setStatus(ServiceStatus.RUNNING);

      // Start health checks
      this._startHealthChecks();

      this._emit(ServiceEvents.START, {
        name: this.name,
        startTime: this.startTime
      });

      return {
        success: true,
        status: this.status,
        startTime: new Date(this.startTime).toISOString()
      };
    } catch (error) {
      this._setStatus(ServiceStatus.ERROR);
      this.metrics.lastError = error.message;
      this.metrics.errorCount++;

      this._emit(ServiceEvents.ERROR, {
        name: this.name,
        error: error.message
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Stop the service
   * @returns {Promise<Object>} Stop result
   */
  async stop() {
    if (this.status === ServiceStatus.STOPPED) {
      return {
        success: false,
        error: 'Service already stopped'
      };
    }

    try {
      this._setStatus(ServiceStatus.STOPPING);

      // Stop health checks
      this._stopHealthChecks();

      // Perform cleanup
      await this._cleanup();

      const uptime = this.uptime;
      this.startTime = null;
      this._setStatus(ServiceStatus.STOPPED);

      this._emit(ServiceEvents.STOP, {
        name: this.name,
        uptime
      });

      return {
        success: true,
        status: this.status,
        uptime
      };
    } catch (error) {
      this._setStatus(ServiceStatus.ERROR);
      this.metrics.lastError = error.message;
      this.metrics.errorCount++;

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Perform a health check
   * @returns {Object} Health status
   */
  healthCheck() {
    this.lastHealthCheck = Date.now();

    const health = {
      name: this.name,
      status: this.status,
      uptime: this.uptime,
      lastCheck: new Date(this.lastHealthCheck).toISOString(),
      metrics: { ...this.metrics }
    };

    this._emit(ServiceEvents.HEALTH_CHECK, health);

    return health;
  }

  /**
   * Get service information
   * @returns {Object} Service info
   */
  getInfo() {
    return {
      name: this.name,
      version: this.config.version,
      status: this.status,
      uptime: this.uptime,
      startTime: this.startTime ? new Date(this.startTime).toISOString() : null,
      config: this.config,
      metrics: { ...this.metrics }
    };
  }

  /**
   * Add event listener
   * @param {string} event - Event name
   * @param {Function} callback - Event handler
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {Function} callback - Event handler to remove
   */
  off(event, callback) {
    if (!this.listeners.has(event)) return;

    const callbacks = this.listeners.get(event);
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  /**
   * Track a request (for metrics)
   */
  trackRequest() {
    this.metrics.requestCount++;
  }

  /**
   * Track an error (for metrics)
   * @param {Error|string} error - The error
   */
  trackError(error) {
    this.metrics.errorCount++;
    this.metrics.lastError = error instanceof Error ? error.message : error;
  }

  // ==================== Protected Methods ====================

  /**
   * Initialize the service (override in subclass)
   * @protected
   */
  async _initialize() {
    // Base implementation - subclasses should override
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  /**
   * Cleanup the service (override in subclass)
   * @protected
   */
  async _cleanup() {
    // Base implementation - subclasses should override
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  // ==================== Private Methods ====================

  /**
   * Set service status and emit event
   * @private
   */
  _setStatus(newStatus) {
    const oldStatus = this.status;
    this.status = newStatus;

    this._emit(ServiceEvents.STATUS_CHANGE, {
      name: this.name,
      oldStatus,
      newStatus
    });
  }

  /**
   * Emit an event
   * @private
   */
  _emit(event, data) {
    if (!this.listeners.has(event)) return;

    const callbacks = this.listeners.get(event);
    callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event handler for ${event}:`, error);
      }
    });
  }

  /**
   * Start health check timer
   * @private
   */
  _startHealthChecks() {
    if (this.healthCheckTimer) return;

    this.healthCheckTimer = setInterval(() => {
      this.healthCheck();
    }, this.config.healthCheckInterval);
  }

  /**
   * Stop health check timer
   * @private
   */
  _stopHealthChecks() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }
}

/**
 * Service Registry
 * Manages multiple service instances
 */
class ServiceRegistry {
  constructor() {
    this.services = new Map();
  }

  /**
   * Register a service
   * @param {BaseService} service - Service to register
   */
  register(service) {
    if (this.services.has(service.name)) {
      throw new Error(`Service ${service.name} already registered`);
    }
    this.services.set(service.name, service);
  }

  /**
   * Unregister a service
   * @param {string} name - Service name
   */
  unregister(name) {
    this.services.delete(name);
  }

  /**
   * Get a service by name
   * @param {string} name - Service name
   * @returns {BaseService|undefined} The service
   */
  get(name) {
    return this.services.get(name);
  }

  /**
   * Get all services
   * @returns {BaseService[]} All registered services
   */
  getAll() {
    return Array.from(this.services.values());
  }

  /**
   * Start all services
   * @returns {Promise<Object[]>} Start results
   */
  async startAll() {
    const results = [];
    for (const service of this.services.values()) {
      const result = await service.start();
      results.push({ name: service.name, ...result });
    }
    return results;
  }

  /**
   * Stop all services
   * @returns {Promise<Object[]>} Stop results
   */
  async stopAll() {
    const results = [];
    for (const service of this.services.values()) {
      const result = await service.stop();
      results.push({ name: service.name, ...result });
    }
    return results;
  }

  /**
   * Health check all services
   * @returns {Object[]} Health results
   */
  healthCheckAll() {
    return Array.from(this.services.values()).map(s => s.healthCheck());
  }
}

// Create a shared registry instance
const sharedRegistry = new ServiceRegistry();

module.exports = {
  ServiceStatus,
  ServiceEvents,
  DEFAULT_CONFIG,
  BaseService,
  ServiceRegistry,
  sharedRegistry
};
