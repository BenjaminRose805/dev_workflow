/**
 * Feature C Service - Logging Service
 * Task 6.4: Feature C module (depends: 6.1)
 *
 * Part of the fan-out pattern test:
 *       6.1 (base)
 *     /  |  \
 *   6.2 6.3 6.4 (this)
 *   |   |   |
 *  6.5 6.6 6.7
 *
 * This service provides structured logging capabilities including:
 * - Multiple log levels (debug, info, warn, error)
 * - Contextual logging with metadata
 * - Log storage and retrieval with filtering
 * - Log rotation and management
 */

const { BaseService, ServiceStatus } = require('./base-service');

/**
 * Log level enumeration with numeric priorities
 */
const LogLevel = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error'
};

/**
 * Log level priority (lower = more verbose)
 */
const LogLevelPriority = {
  [LogLevel.DEBUG]: 0,
  [LogLevel.INFO]: 1,
  [LogLevel.WARN]: 2,
  [LogLevel.ERROR]: 3
};

/**
 * Default logging configuration
 */
const DEFAULT_LOGGING_CONFIG = {
  name: 'FeatureCService',
  maxLogs: 10000,
  minLevel: LogLevel.DEBUG,
  includeTimestamp: true,
  includeContext: true,
  rotationThreshold: 8000
};

/**
 * Feature C Service - Logging
 * Extends BaseService to provide comprehensive logging functionality
 */
class FeatureCService extends BaseService {
  /**
   * Create a new logging service instance
   * @param {Object} config - Service configuration
   */
  constructor(config = {}) {
    super({ ...DEFAULT_LOGGING_CONFIG, ...config });

    this.logs = [];
    this.logIndex = 0;
    this.minLevelPriority = LogLevelPriority[this.config.minLevel] || 0;
    this.rotatedLogs = [];
    this.totalLogsWritten = 0;
  }

  /**
   * Initialize the logging service
   * @protected
   */
  async _initialize() {
    // Clear any existing logs on fresh start
    this.logs = [];
    this.logIndex = 0;
    this.rotatedLogs = [];
    this.totalLogsWritten = 0;

    // Log service start
    this._internalLog(LogLevel.INFO, 'Logging service initialized', {
      maxLogs: this.config.maxLogs,
      minLevel: this.config.minLevel
    });

    await new Promise(resolve => setTimeout(resolve, 10));
  }

  /**
   * Cleanup the logging service
   * @protected
   */
  async _cleanup() {
    // Log service shutdown
    this._internalLog(LogLevel.INFO, 'Logging service shutting down', {
      totalLogsWritten: this.totalLogsWritten,
      currentLogCount: this.logs.length
    });

    // Optionally flush logs here in a real implementation
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  /**
   * Log a message at the specified level
   * @param {string} level - Log level (debug, info, warn, error)
   * @param {string} message - Log message
   * @param {Object} context - Optional context/metadata
   * @returns {Object|null} The log entry or null if filtered
   */
  log(level, message, context = {}) {
    if (!this.isRunning()) {
      console.warn('FeatureCService: Cannot log when service is not running');
      return null;
    }

    this.trackRequest();

    // Validate log level
    const normalizedLevel = level.toLowerCase();
    if (!LogLevelPriority.hasOwnProperty(normalizedLevel)) {
      this.trackError(`Invalid log level: ${level}`);
      return null;
    }

    // Check if level meets minimum threshold
    if (LogLevelPriority[normalizedLevel] < this.minLevelPriority) {
      return null;
    }

    return this._internalLog(normalizedLevel, message, context);
  }

  /**
   * Log a debug message
   * @param {string} message - Log message
   * @param {Object} context - Optional context/metadata
   * @returns {Object|null} The log entry or null if filtered
   */
  debug(message, context = {}) {
    return this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Log an info message
   * @param {string} message - Log message
   * @param {Object} context - Optional context/metadata
   * @returns {Object|null} The log entry or null if filtered
   */
  info(message, context = {}) {
    return this.log(LogLevel.INFO, message, context);
  }

  /**
   * Log a warning message
   * @param {string} message - Log message
   * @param {Object} context - Optional context/metadata
   * @returns {Object|null} The log entry or null if filtered
   */
  warn(message, context = {}) {
    return this.log(LogLevel.WARN, message, context);
  }

  /**
   * Log an error message
   * @param {string} message - Log message
   * @param {Object} context - Optional context/metadata
   * @returns {Object|null} The log entry or null if filtered
   */
  error(message, context = {}) {
    return this.log(LogLevel.ERROR, message, context);
  }

  /**
   * Get logs with optional filtering
   * @param {Object} filters - Filter options
   * @param {string} filters.level - Filter by log level
   * @param {string} filters.search - Search in message text
   * @param {Date|number} filters.startTime - Filter logs after this time
   * @param {Date|number} filters.endTime - Filter logs before this time
   * @param {number} filters.limit - Maximum number of logs to return
   * @param {number} filters.offset - Number of logs to skip
   * @param {boolean} filters.includeRotated - Include rotated/archived logs
   * @returns {Object} Filtered logs and metadata
   */
  getLogs(filters = {}) {
    if (!this.isRunning()) {
      return {
        success: false,
        error: 'Service not running',
        logs: [],
        total: 0
      };
    }

    this.trackRequest();

    let filteredLogs = [...this.logs];

    // Include rotated logs if requested
    if (filters.includeRotated && this.rotatedLogs.length > 0) {
      filteredLogs = [...this.rotatedLogs, ...filteredLogs];
    }

    // Filter by level
    if (filters.level) {
      const levelPriority = LogLevelPriority[filters.level.toLowerCase()];
      if (levelPriority !== undefined) {
        filteredLogs = filteredLogs.filter(log =>
          LogLevelPriority[log.level] >= levelPriority
        );
      }
    }

    // Filter by search term
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filteredLogs = filteredLogs.filter(log =>
        log.message.toLowerCase().includes(searchLower) ||
        JSON.stringify(log.context).toLowerCase().includes(searchLower)
      );
    }

    // Filter by time range
    if (filters.startTime) {
      const startMs = filters.startTime instanceof Date
        ? filters.startTime.getTime()
        : filters.startTime;
      filteredLogs = filteredLogs.filter(log => log.timestamp >= startMs);
    }

    if (filters.endTime) {
      const endMs = filters.endTime instanceof Date
        ? filters.endTime.getTime()
        : filters.endTime;
      filteredLogs = filteredLogs.filter(log => log.timestamp <= endMs);
    }

    const total = filteredLogs.length;

    // Apply pagination
    const offset = filters.offset || 0;
    const limit = filters.limit || filteredLogs.length;
    filteredLogs = filteredLogs.slice(offset, offset + limit);

    return {
      success: true,
      logs: filteredLogs,
      total,
      offset,
      limit,
      hasMore: offset + filteredLogs.length < total
    };
  }

  /**
   * Clear all logs
   * @param {boolean} includeRotated - Also clear rotated logs
   * @returns {Object} Clear result
   */
  clearLogs(includeRotated = false) {
    if (!this.isRunning()) {
      return {
        success: false,
        error: 'Service not running'
      };
    }

    const clearedCount = this.logs.length;
    this.logs = [];

    let rotatedCleared = 0;
    if (includeRotated) {
      rotatedCleared = this.rotatedLogs.length;
      this.rotatedLogs = [];
    }

    this._internalLog(LogLevel.INFO, 'Logs cleared', {
      clearedCount,
      rotatedCleared
    });

    return {
      success: true,
      clearedCount,
      rotatedCleared
    };
  }

  /**
   * Get logging statistics
   * @returns {Object} Logging statistics
   */
  getStats() {
    const levelCounts = {
      [LogLevel.DEBUG]: 0,
      [LogLevel.INFO]: 0,
      [LogLevel.WARN]: 0,
      [LogLevel.ERROR]: 0
    };

    this.logs.forEach(log => {
      if (levelCounts.hasOwnProperty(log.level)) {
        levelCounts[log.level]++;
      }
    });

    return {
      totalLogsWritten: this.totalLogsWritten,
      currentLogCount: this.logs.length,
      rotatedLogCount: this.rotatedLogs.length,
      maxLogs: this.config.maxLogs,
      minLevel: this.config.minLevel,
      levelCounts,
      oldestLog: this.logs.length > 0 ? this.logs[0].timestamp : null,
      newestLog: this.logs.length > 0 ? this.logs[this.logs.length - 1].timestamp : null
    };
  }

  /**
   * Set the minimum log level
   * @param {string} level - New minimum log level
   * @returns {Object} Result
   */
  setMinLevel(level) {
    const normalizedLevel = level.toLowerCase();
    if (!LogLevelPriority.hasOwnProperty(normalizedLevel)) {
      return {
        success: false,
        error: `Invalid log level: ${level}`
      };
    }

    const oldLevel = this.config.minLevel;
    this.config.minLevel = normalizedLevel;
    this.minLevelPriority = LogLevelPriority[normalizedLevel];

    this._internalLog(LogLevel.INFO, 'Minimum log level changed', {
      oldLevel,
      newLevel: normalizedLevel
    });

    return {
      success: true,
      oldLevel,
      newLevel: normalizedLevel
    };
  }

  // ==================== Private Methods ====================

  /**
   * Internal log method that bypasses running check
   * @private
   */
  _internalLog(level, message, context = {}) {
    const entry = {
      id: ++this.logIndex,
      level,
      message,
      context: this.config.includeContext ? { ...context } : {},
      timestamp: this.config.includeTimestamp ? Date.now() : null,
      timestampISO: this.config.includeTimestamp ? new Date().toISOString() : null
    };

    this.logs.push(entry);
    this.totalLogsWritten++;

    // Perform log rotation if needed
    this._checkRotation();

    return entry;
  }

  /**
   * Check if log rotation is needed and perform if necessary
   * @private
   */
  _checkRotation() {
    if (this.logs.length >= this.config.rotationThreshold) {
      // Move oldest logs to rotated storage
      const rotateCount = Math.floor(this.logs.length * 0.25);
      const toRotate = this.logs.splice(0, rotateCount);

      // Keep only the most recent rotated logs
      this.rotatedLogs = [...this.rotatedLogs, ...toRotate]
        .slice(-this.config.maxLogs);
    }
  }
}

module.exports = {
  LogLevel,
  LogLevelPriority,
  DEFAULT_LOGGING_CONFIG,
  FeatureCService
};
