/**
 * Component C: Logging & Monitoring Component
 * Task 7.3: Component C (depends: 6.7)
 *
 * Fan-in pattern position:
 * This component depends on Feature C tests (6.7) and will be
 * combined with Components A and B in the final integration (7.4).
 *
 *   7.1 ──┐
 *   7.2 ──┼── 7.4 (Final Integration)
 *   7.3 ──┘
 *
 * Purpose: A logging and monitoring component that builds on the tested
 * FeatureCService to provide higher-level logging operations including
 * structured logging, log aggregation, and monitoring dashboards.
 */

const { FeatureCService, LogLevel, LogLevelPriority, DEFAULT_LOGGING_CONFIG } = require('../services/feature-c-service');

/**
 * Component C Configuration
 */
const COMPONENT_C_CONFIG = {
  name: 'ComponentC',
  version: '1.0.0',
  description: 'Logging & Monitoring Component',
  maxLoggers: 10,
  defaultLogger: 'main',
  enableMonitoring: true,
  alertThreshold: 10,
  aggregationInterval: 60000
};

/**
 * Alert severity levels
 */
const AlertSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

/**
 * Monitoring metric types
 */
const MetricType = {
  COUNTER: 'counter',
  GAUGE: 'gauge',
  HISTOGRAM: 'histogram',
  TIMER: 'timer'
};

/**
 * Component C: High-level logging and monitoring operations
 */
class ComponentC {
  constructor(config = {}) {
    this.config = { ...COMPONENT_C_CONFIG, ...config };
    this.loggers = new Map();
    this.alerts = [];
    this.monitoringMetrics = new Map();
    this.aggregatedLogs = new Map();
    this.running = false;
    this.startTime = null;
    this.componentMetrics = {
      loggersCreated: 0,
      totalLogsWritten: 0,
      alertsTriggered: 0,
      metricsRecorded: 0
    };
  }

  /**
   * Start the component
   */
  async start() {
    if (this.running) {
      return { success: false, error: 'Component already running' };
    }

    // Create default logger
    await this.createLogger(this.config.defaultLogger);

    this.running = true;
    this.startTime = Date.now();

    // Start monitoring if enabled
    if (this.config.enableMonitoring) {
      this.startAggregation();
    }

    return {
      success: true,
      message: 'Component C started',
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

    // Stop all loggers
    for (const [name, logger] of this.loggers) {
      await logger.stop();
    }

    this.loggers.clear();
    this.running = false;

    return {
      success: true,
      message: 'Component C stopped',
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
   * Create a new logger
   * @param {string} name - Logger name
   * @param {Object} config - Logger configuration
   */
  async createLogger(name, config = {}) {
    if (this.loggers.has(name)) {
      return { success: false, error: `Logger '${name}' already exists` };
    }

    if (this.loggers.size >= this.config.maxLoggers) {
      return { success: false, error: 'Maximum loggers reached' };
    }

    const logger = new FeatureCService({
      ...DEFAULT_LOGGING_CONFIG,
      ...config,
      name: `logger:${name}`
    });

    await logger.start();
    this.loggers.set(name, logger);
    this.componentMetrics.loggersCreated++;

    return {
      success: true,
      logger: name,
      config: logger.config
    };
  }

  /**
   * Get a logger
   * @param {string} name - Logger name
   * @private
   */
  getLogger(name = null) {
    const loggerName = name || this.config.defaultLogger;
    return this.loggers.get(loggerName);
  }

  /**
   * Log a message
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} context - Log context
   * @param {Object} options - Options (logger name)
   */
  log(level, message, context = {}, options = {}) {
    if (!this.running) {
      return null;
    }

    const logger = this.getLogger(options.logger);
    if (!logger) {
      return null;
    }

    const entry = logger.log(level, message, {
      ...context,
      component: 'ComponentC',
      loggerName: options.logger || this.config.defaultLogger
    });

    if (entry) {
      this.componentMetrics.totalLogsWritten++;
      this.checkForAlerts(entry);
      this.updateAggregation(entry);
    }

    return entry;
  }

  /**
   * Log debug message
   */
  debug(message, context = {}, options = {}) {
    return this.log(LogLevel.DEBUG, message, context, options);
  }

  /**
   * Log info message
   */
  info(message, context = {}, options = {}) {
    return this.log(LogLevel.INFO, message, context, options);
  }

  /**
   * Log warning message
   */
  warn(message, context = {}, options = {}) {
    return this.log(LogLevel.WARN, message, context, options);
  }

  /**
   * Log error message
   */
  error(message, context = {}, options = {}) {
    return this.log(LogLevel.ERROR, message, context, options);
  }

  /**
   * Log with structured data
   * @param {Object} logData - Structured log data
   */
  structuredLog(logData) {
    const {
      level = LogLevel.INFO,
      message,
      service,
      operation,
      duration,
      success,
      error,
      metadata = {},
      logger
    } = logData;

    const context = {
      service,
      operation,
      duration,
      success,
      error,
      ...metadata
    };

    return this.log(level, message, context, { logger });
  }

  /**
   * Check if log entry should trigger an alert
   * @private
   */
  checkForAlerts(entry) {
    if (!this.config.enableMonitoring) return;

    // Alert on errors
    if (entry.level === LogLevel.ERROR) {
      const recentErrors = this.countRecentErrors(60000); // Last minute
      if (recentErrors >= this.config.alertThreshold) {
        this.triggerAlert({
          severity: AlertSeverity.HIGH,
          type: 'error_threshold',
          message: `Error threshold exceeded: ${recentErrors} errors in last minute`,
          relatedLog: entry.id
        });
      }
    }
  }

  /**
   * Count recent errors across all loggers
   * @private
   */
  countRecentErrors(timeWindow) {
    let count = 0;
    const cutoff = Date.now() - timeWindow;

    for (const [name, logger] of this.loggers) {
      const result = logger.getLogs({
        level: LogLevel.ERROR,
        startTime: cutoff
      });
      if (result.success) {
        count += result.logs.length;
      }
    }

    return count;
  }

  /**
   * Trigger an alert
   * @param {Object} alertData - Alert data
   */
  triggerAlert(alertData) {
    const alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      acknowledged: false,
      ...alertData
    };

    this.alerts.push(alert);
    this.componentMetrics.alertsTriggered++;

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }

    return alert;
  }

  /**
   * Get active alerts
   */
  getAlerts(options = {}) {
    let alerts = [...this.alerts];

    if (options.unacknowledgedOnly) {
      alerts = alerts.filter(a => !a.acknowledged);
    }

    if (options.severity) {
      alerts = alerts.filter(a => a.severity === options.severity);
    }

    if (options.limit) {
      alerts = alerts.slice(-options.limit);
    }

    return {
      success: true,
      alerts,
      total: this.alerts.length,
      unacknowledged: this.alerts.filter(a => !a.acknowledged).length
    };
  }

  /**
   * Acknowledge an alert
   * @param {string} alertId - Alert ID
   */
  acknowledgeAlert(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert) {
      return { success: false, error: 'Alert not found' };
    }

    alert.acknowledged = true;
    alert.acknowledgedAt = new Date().toISOString();

    return {
      success: true,
      alert
    };
  }

  /**
   * Start log aggregation
   * @private
   */
  startAggregation() {
    // Initial aggregation
    this.aggregateLogs();
  }

  /**
   * Aggregate logs by level
   * @private
   */
  aggregateLogs() {
    const aggregation = {
      timestamp: new Date().toISOString(),
      period: this.config.aggregationInterval,
      byLevel: {},
      byLogger: {},
      total: 0
    };

    for (const [name, logger] of this.loggers) {
      const stats = logger.getStats();
      aggregation.byLogger[name] = {
        total: stats.currentLogCount,
        levels: stats.levelCounts
      };

      for (const [level, count] of Object.entries(stats.levelCounts)) {
        aggregation.byLevel[level] = (aggregation.byLevel[level] || 0) + count;
        aggregation.total += count;
      }
    }

    this.aggregatedLogs.set(Date.now(), aggregation);

    // Keep only last 24 hours of aggregations
    const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
    for (const [timestamp] of this.aggregatedLogs) {
      if (timestamp < dayAgo) {
        this.aggregatedLogs.delete(timestamp);
      }
    }
  }

  /**
   * Record a monitoring metric
   * @param {string} name - Metric name
   * @param {number} value - Metric value
   * @param {string} type - Metric type
   * @param {Object} tags - Metric tags
   */
  recordMetric(name, value, type = MetricType.GAUGE, tags = {}) {
    if (!this.running) {
      return { success: false, error: 'Component not running' };
    }

    const metricKey = name;
    let metric = this.monitoringMetrics.get(metricKey);

    if (!metric) {
      metric = {
        name,
        type,
        values: [],
        tags
      };
      this.monitoringMetrics.set(metricKey, metric);
    }

    const dataPoint = {
      value,
      timestamp: Date.now()
    };

    switch (type) {
      case MetricType.COUNTER:
        const lastValue = metric.values.length > 0 ? metric.values[metric.values.length - 1].value : 0;
        dataPoint.value = lastValue + value;
        break;
      case MetricType.HISTOGRAM:
        // Store raw values for histogram
        break;
      case MetricType.TIMER:
        // Store timing values
        break;
    }

    metric.values.push(dataPoint);
    this.componentMetrics.metricsRecorded++;

    // Keep only last 1000 values
    if (metric.values.length > 1000) {
      metric.values = metric.values.slice(-1000);
    }

    return {
      success: true,
      metric: metricKey,
      value: dataPoint.value
    };
  }

  /**
   * Get metric data
   * @param {string} name - Metric name
   * @param {Object} options - Query options
   */
  getMetric(name, options = {}) {
    const metric = this.monitoringMetrics.get(name);
    if (!metric) {
      return { success: false, error: 'Metric not found' };
    }

    let values = [...metric.values];

    if (options.startTime) {
      values = values.filter(v => v.timestamp >= options.startTime);
    }

    if (options.endTime) {
      values = values.filter(v => v.timestamp <= options.endTime);
    }

    const stats = this.calculateMetricStats(values);

    return {
      success: true,
      metric: {
        name: metric.name,
        type: metric.type,
        tags: metric.tags,
        values: options.includeValues !== false ? values : undefined,
        stats
      }
    };
  }

  /**
   * Calculate statistics for metric values
   * @private
   */
  calculateMetricStats(values) {
    if (values.length === 0) {
      return { count: 0 };
    }

    const nums = values.map(v => v.value);
    const sum = nums.reduce((a, b) => a + b, 0);

    return {
      count: values.length,
      min: Math.min(...nums),
      max: Math.max(...nums),
      avg: sum / values.length,
      sum,
      latest: nums[nums.length - 1]
    };
  }

  /**
   * Update aggregation with new log entry
   * @private
   */
  updateAggregation(entry) {
    // This is called on each log entry
    // Could trigger periodic aggregation here
  }

  /**
   * Get logs from all loggers
   * @param {Object} options - Query options
   */
  getLogs(options = {}) {
    if (!this.running) {
      return { success: false, error: 'Component not running' };
    }

    const allLogs = [];

    for (const [name, logger] of this.loggers) {
      if (options.logger && options.logger !== name) {
        continue;
      }

      const result = logger.getLogs(options);
      if (result.success) {
        allLogs.push(...result.logs.map(log => ({
          ...log,
          _logger: name
        })));
      }
    }

    // Sort by timestamp
    allLogs.sort((a, b) => b.timestamp - a.timestamp);

    // Apply limit
    const limit = options.limit || 100;
    const limited = allLogs.slice(0, limit);

    return {
      success: true,
      logs: limited,
      total: allLogs.length,
      hasMore: allLogs.length > limit
    };
  }

  /**
   * Get statistics from all loggers
   */
  getAllStats() {
    const stats = {
      byLogger: {},
      totals: {
        logsWritten: 0,
        byLevel: {}
      }
    };

    for (const [name, logger] of this.loggers) {
      const loggerStats = logger.getStats();
      stats.byLogger[name] = loggerStats;
      stats.totals.logsWritten += loggerStats.currentLogCount;

      for (const [level, count] of Object.entries(loggerStats.levelCounts)) {
        stats.totals.byLevel[level] = (stats.totals.byLevel[level] || 0) + count;
      }
    }

    return {
      success: true,
      stats
    };
  }

  /**
   * Get component metrics
   */
  getMetrics() {
    return {
      ...this.componentMetrics,
      loggerCount: this.loggers.size,
      activeAlerts: this.alerts.filter(a => !a.acknowledged).length,
      monitoringMetricCount: this.monitoringMetrics.size,
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
      loggers: Array.from(this.loggers.keys()),
      metrics: this.getMetrics(),
      alerts: this.getAlerts({ limit: 5 })
    };
  }

  /**
   * Clear all logs and reset
   */
  async reset() {
    for (const [name, logger] of this.loggers) {
      logger.clearLogs();
    }

    this.alerts = [];
    this.monitoringMetrics.clear();
    this.aggregatedLogs.clear();

    this.componentMetrics = {
      loggersCreated: this.loggers.size,
      totalLogsWritten: 0,
      alertsTriggered: 0,
      metricsRecorded: 0
    };

    return { success: true, message: 'Component C reset' };
  }
}

module.exports = {
  ComponentC,
  COMPONENT_C_CONFIG,
  AlertSeverity,
  MetricType
};
