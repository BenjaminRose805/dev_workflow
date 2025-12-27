/**
 * Final Integration Module
 * Task 7.4: Final integration (depends: 7.1, 7.2, 7.3)
 *
 * Fan-in pattern completion:
 * This module integrates all three components (A, B, C) into a unified
 * system that provides data processing, caching, and logging capabilities.
 *
 *   7.1 (ComponentA) ──┐
 *   7.2 (ComponentB) ──┼── [7.4] Final Integration
 *   7.3 (ComponentC) ──┘
 *
 * Purpose: Combines ComponentA (data processing), ComponentB (cache management),
 * and ComponentC (logging/monitoring) into a cohesive integrated system that
 * provides a unified API for all operations.
 */

const { ComponentA, COMPONENT_A_CONFIG, OperationType } = require('../components/component-a.js');
const { ComponentB, COMPONENT_B_CONFIG, CacheStrategy } = require('../components/component-b.js');
const { ComponentC, COMPONENT_C_CONFIG, AlertSeverity, MetricType } = require('../components/component-c.js');

/**
 * Integrated System Configuration
 */
const INTEGRATION_CONFIG = {
  name: 'IntegratedSystem',
  version: '1.0.0',
  description: 'Unified data processing, caching, and logging system',
  enableAutoRecovery: true,
  enableHealthChecks: true,
  healthCheckInterval: 30000,
  maxRetries: 3,
  retryDelay: 1000
};

/**
 * System status enum
 */
const SystemStatus = {
  STOPPED: 'stopped',
  STARTING: 'starting',
  RUNNING: 'running',
  DEGRADED: 'degraded',
  STOPPING: 'stopping',
  ERROR: 'error'
};

/**
 * IntegratedSystem: Unified system combining all components
 *
 * This class integrates:
 * - ComponentA: Data processing (from Task 7.1)
 * - ComponentB: Cache management (from Task 7.2)
 * - ComponentC: Logging & monitoring (from Task 7.3)
 */
class IntegratedSystem {
  constructor(config = {}) {
    this.config = { ...INTEGRATION_CONFIG, ...config };

    // Initialize components
    this.componentA = new ComponentA(config.componentA || {});
    this.componentB = new ComponentB(config.componentB || {});
    this.componentC = new ComponentC(config.componentC || {});

    this.status = SystemStatus.STOPPED;
    this.startTime = null;
    this.lastHealthCheck = null;

    this.systemMetrics = {
      operationsTotal: 0,
      operationsSuccessful: 0,
      operationsFailed: 0,
      cacheHits: 0,
      cacheMisses: 0,
      logsWritten: 0,
      errorsLogged: 0
    };
  }

  /**
   * Start the integrated system
   * Starts all components in the correct order
   */
  async start() {
    if (this.status === SystemStatus.RUNNING) {
      return { success: false, error: 'System already running' };
    }

    this.status = SystemStatus.STARTING;
    const results = { componentA: null, componentB: null, componentC: null };

    try {
      // Start logging first so we can log other component starts
      results.componentC = await this.componentC.start();
      if (!results.componentC.success) {
        throw new Error(`ComponentC failed to start: ${results.componentC.error}`);
      }
      this.log('info', 'ComponentC (Logging) started');

      // Start cache next
      results.componentB = await this.componentB.start();
      if (!results.componentB.success) {
        throw new Error(`ComponentB failed to start: ${results.componentB.error}`);
      }
      this.log('info', 'ComponentB (Cache) started');

      // Start data processing last
      results.componentA = await this.componentA.start();
      if (!results.componentA.success) {
        throw new Error(`ComponentA failed to start: ${results.componentA.error}`);
      }
      this.log('info', 'ComponentA (Data Processing) started');

      this.status = SystemStatus.RUNNING;
      this.startTime = Date.now();
      this.log('info', 'IntegratedSystem started successfully', {
        config: this.config.name,
        version: this.config.version
      });

      return {
        success: true,
        message: 'IntegratedSystem started',
        components: results,
        config: this.config
      };
    } catch (error) {
      this.status = SystemStatus.ERROR;
      return {
        success: false,
        error: error.message,
        components: results
      };
    }
  }

  /**
   * Stop the integrated system
   * Stops all components in reverse order
   */
  async stop() {
    if (this.status === SystemStatus.STOPPED) {
      return { success: false, error: 'System already stopped' };
    }

    this.status = SystemStatus.STOPPING;
    const results = { componentA: null, componentB: null, componentC: null };

    try {
      // Stop in reverse order of start
      if (this.componentA.isRunning()) {
        results.componentA = await this.componentA.stop();
      }

      if (this.componentB.isRunning()) {
        results.componentB = await this.componentB.stop();
      }

      if (this.componentC.isRunning()) {
        this.log('info', 'IntegratedSystem stopping');
        results.componentC = await this.componentC.stop();
      }

      this.status = SystemStatus.STOPPED;
      const uptime = this.startTime ? Date.now() - this.startTime : 0;

      return {
        success: true,
        message: 'IntegratedSystem stopped',
        uptime,
        components: results
      };
    } catch (error) {
      this.status = SystemStatus.ERROR;
      return {
        success: false,
        error: error.message,
        components: results
      };
    }
  }

  /**
   * Internal logging helper
   * @private
   */
  log(level, message, context = {}) {
    if (this.componentC.isRunning()) {
      const entry = this.componentC.log(level, message, {
        ...context,
        system: 'IntegratedSystem'
      });
      if (entry) {
        this.systemMetrics.logsWritten++;
        if (level === 'error') {
          this.systemMetrics.errorsLogged++;
        }
      }
      return entry;
    }
    return null;
  }

  /**
   * Process data with caching support
   * @param {Object} data - Data to process
   * @param {Object} options - Processing options
   */
  async processData(data, options = {}) {
    if (this.status !== SystemStatus.RUNNING) {
      return { success: false, error: 'System not running' };
    }

    this.systemMetrics.operationsTotal++;
    const startTime = Date.now();
    const cacheKey = options.cacheKey || `process_${JSON.stringify(data).slice(0, 50)}`;

    try {
      // Check cache first
      if (options.useCache !== false) {
        const cached = this.componentB.get(cacheKey);
        if (cached !== undefined) {
          this.systemMetrics.cacheHits++;
          this.systemMetrics.operationsSuccessful++;
          this.log('debug', 'Cache hit for data processing', { cacheKey });
          return {
            success: true,
            data: cached,
            source: 'cache',
            processingTime: Date.now() - startTime
          };
        }
        this.systemMetrics.cacheMisses++;
      }

      // Process the data
      const result = await this.componentA.processItem(data, options);

      if (result.success) {
        // Cache the result
        if (options.useCache !== false) {
          this.componentB.set(cacheKey, result.data, { ttl: options.cacheTtl });
        }

        this.systemMetrics.operationsSuccessful++;
        this.log('debug', 'Data processed successfully', {
          processingTime: result.processingTime
        });

        return {
          success: true,
          data: result.data,
          source: 'processed',
          processingTime: Date.now() - startTime
        };
      } else {
        throw new Error(result.error || 'Processing failed');
      }
    } catch (error) {
      this.systemMetrics.operationsFailed++;
      this.log('error', 'Data processing failed', { error: error.message });
      return {
        success: false,
        error: error.message,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Process a batch of items
   * @param {Array} items - Items to process
   * @param {Object} options - Batch options
   */
  async processBatch(items, options = {}) {
    if (this.status !== SystemStatus.RUNNING) {
      return { success: false, error: 'System not running' };
    }

    this.log('info', 'Starting batch processing', { itemCount: items.length });
    const startTime = Date.now();

    const result = await this.componentA.processBatch(items, options);

    this.log('info', 'Batch processing completed', {
      successCount: result.successCount,
      failureCount: result.failureCount,
      duration: Date.now() - startTime
    });

    return {
      ...result,
      totalTime: Date.now() - startTime
    };
  }

  /**
   * Get or set cached data with automatic processing
   * @param {string} key - Cache key
   * @param {Function} processor - Function to process data if not cached
   * @param {Object} options - Options
   */
  async getOrProcess(key, processor, options = {}) {
    if (this.status !== SystemStatus.RUNNING) {
      return { success: false, error: 'System not running' };
    }

    return this.componentB.getOrSet(key, async () => {
      const data = await processor();
      const result = await this.processData(data, { useCache: false });
      return result.success ? result.data : data;
    }, options);
  }

  /**
   * Create a processing pipeline with logging
   * @param {Array} operations - Pipeline operations
   */
  createPipeline(operations) {
    const pipelineResult = this.componentA.createPipeline(operations);

    if (pipelineResult.success) {
      this.log('info', 'Pipeline created', {
        pipelineId: pipelineResult.pipeline.id,
        operationCount: pipelineResult.pipeline.operations.length
      });
    }

    return pipelineResult;
  }

  /**
   * Execute a pipeline with full integration
   * @param {Object} pipeline - Pipeline to execute
   * @param {Object|Array} inputData - Input data
   */
  async executePipeline(pipeline, inputData) {
    if (this.status !== SystemStatus.RUNNING) {
      return { success: false, error: 'System not running' };
    }

    const startTime = Date.now();
    this.log('info', 'Executing pipeline', { pipelineId: pipeline.id });

    // Record metric for pipeline execution
    this.componentC.recordMetric('pipeline_executions', 1, MetricType.COUNTER);

    const result = await this.componentA.executePipeline(pipeline, inputData);

    // Record execution time
    this.componentC.recordMetric('pipeline_duration', Date.now() - startTime, MetricType.TIMER);

    if (result.success) {
      this.log('info', 'Pipeline executed successfully', {
        pipelineId: pipeline.id,
        stepsExecuted: result.stepsExecuted,
        duration: result.processingTime
      });
    } else {
      this.log('error', 'Pipeline execution failed', {
        pipelineId: pipeline.id,
        error: result.error,
        failedStep: result.failedStep
      });
    }

    return result;
  }

  /**
   * Get health status of all components
   */
  getHealthStatus() {
    const health = {
      status: this.status,
      timestamp: new Date().toISOString(),
      components: {
        componentA: {
          running: this.componentA.isRunning(),
          metrics: this.componentA.isRunning() ? this.componentA.getMetrics() : null
        },
        componentB: {
          running: this.componentB.isRunning(),
          metrics: this.componentB.isRunning() ? this.componentB.getMetrics() : null
        },
        componentC: {
          running: this.componentC.isRunning(),
          metrics: this.componentC.isRunning() ? this.componentC.getMetrics() : null
        }
      },
      overall: 'healthy'
    };

    // Determine overall health
    const runningComponents = [
      health.components.componentA.running,
      health.components.componentB.running,
      health.components.componentC.running
    ].filter(Boolean).length;

    if (runningComponents === 0) {
      health.overall = 'down';
    } else if (runningComponents < 3) {
      health.overall = 'degraded';
    }

    this.lastHealthCheck = health;
    return health;
  }

  /**
   * Get aggregated system metrics
   */
  getSystemMetrics() {
    const componentMetrics = {
      componentA: this.componentA.isRunning() ? this.componentA.getMetrics() : null,
      componentB: this.componentB.isRunning() ? this.componentB.getMetrics() : null,
      componentC: this.componentC.isRunning() ? this.componentC.getMetrics() : null
    };

    return {
      system: this.systemMetrics,
      components: componentMetrics,
      uptime: this.startTime ? Date.now() - this.startTime : 0,
      status: this.status
    };
  }

  /**
   * Get system info
   */
  getInfo() {
    return {
      config: this.config,
      status: this.status,
      startTime: this.startTime,
      uptime: this.startTime ? Date.now() - this.startTime : 0,
      components: {
        componentA: this.componentA.getInfo(),
        componentB: this.componentB.getInfo(),
        componentC: this.componentC.getInfo()
      },
      metrics: this.getSystemMetrics(),
      health: this.getHealthStatus()
    };
  }

  /**
   * Get active alerts from ComponentC
   * @param {Object} options - Alert query options
   */
  getAlerts(options = {}) {
    if (!this.componentC.isRunning()) {
      return { success: false, error: 'Logging component not running' };
    }
    return this.componentC.getAlerts(options);
  }

  /**
   * Clear all caches
   */
  clearCaches() {
    if (!this.componentB.isRunning()) {
      return { success: false, error: 'Cache component not running' };
    }

    const result = this.componentB.clear();
    if (result.success) {
      this.log('info', 'Caches cleared', { clearedCount: result.clearedCount });
    }
    return result;
  }

  /**
   * Reset all components
   */
  async reset() {
    const results = {
      componentA: null,
      componentB: null,
      componentC: null
    };

    if (this.componentA.isRunning()) {
      results.componentA = this.componentA.reset();
    }

    if (this.componentB.isRunning()) {
      results.componentB = await this.componentB.reset();
    }

    if (this.componentC.isRunning()) {
      results.componentC = await this.componentC.reset();
    }

    // Reset system metrics
    this.systemMetrics = {
      operationsTotal: 0,
      operationsSuccessful: 0,
      operationsFailed: 0,
      cacheHits: 0,
      cacheMisses: 0,
      logsWritten: 0,
      errorsLogged: 0
    };

    this.log('info', 'IntegratedSystem reset');

    return {
      success: true,
      message: 'System reset',
      components: results
    };
  }
}

/**
 * Create a pre-configured integrated system
 * @param {Object} options - Configuration options
 */
function createIntegratedSystem(options = {}) {
  const system = new IntegratedSystem({
    ...options,
    componentA: {
      maxConcurrentOperations: options.maxConcurrent || 5,
      defaultBatchSize: options.batchSize || 100
    },
    componentB: {
      maxNamespaces: options.maxCacheNamespaces || 10,
      defaultNamespace: 'integrated'
    },
    componentC: {
      maxLoggers: options.maxLoggers || 5,
      defaultLogger: 'system',
      enableMonitoring: options.enableMonitoring !== false
    }
  });

  return system;
}

module.exports = {
  IntegratedSystem,
  INTEGRATION_CONFIG,
  SystemStatus,
  createIntegratedSystem,
  // Re-export component types for convenience
  OperationType,
  CacheStrategy,
  AlertSeverity,
  MetricType
};
