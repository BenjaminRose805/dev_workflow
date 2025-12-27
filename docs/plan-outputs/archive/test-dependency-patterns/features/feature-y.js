/**
 * Feature Y - Fan-In Integration Feature
 * Task 8.3: Build feature Y (depends: 8.1, 7.4)
 *
 * This module demonstrates the Mixed Complex Pattern (Phase 8)
 * by combining:
 * - ComplexModule from task 8.1 (cross-phase integration)
 * - IntegratedSystem from task 7.4 (fan-in pattern completion)
 *
 * Feature Y focuses on providing a unified monitoring and reporting
 * interface that leverages both the task execution capabilities
 * from ComplexModule and the component integration from IntegratedSystem.
 *
 *   8.1 (ComplexModule) ─────┐
 *                            ├── [8.3] Feature Y
 *   7.4 (IntegratedSystem) ──┘
 */

const { ComplexModule, createComplexModule, ExecutionMetrics } = require('../complex/complex-module.js');
const {
  IntegratedSystem,
  createIntegratedSystem,
  SystemStatus,
  OperationType,
  CacheStrategy,
  AlertSeverity,
  MetricType
} = require('../integration/final-integration.js');

/**
 * Feature Y Configuration
 */
const FEATURE_Y_CONFIG = {
  name: 'FeatureY',
  version: '1.0.0',
  description: 'Unified monitoring and reporting feature combining ComplexModule and IntegratedSystem',
  enableMonitoring: true,
  enableReporting: true,
  enableCaching: true,
  reportingInterval: 60000,
  healthCheckInterval: 30000
};

/**
 * Report types supported by Feature Y
 */
const ReportType = {
  EXECUTION: 'execution',
  HEALTH: 'health',
  METRICS: 'metrics',
  COMBINED: 'combined'
};

/**
 * Feature Y: Unified Monitoring and Reporting
 *
 * Combines the task scheduling and execution from ComplexModule
 * with the component integration and monitoring from IntegratedSystem
 * to provide a comprehensive monitoring and reporting solution.
 */
class FeatureY {
  /**
   * Create a FeatureY instance
   * @param {Object} config - Configuration options
   */
  constructor(config = {}) {
    this.config = { ...FEATURE_Y_CONFIG, ...config };

    // Initialize ComplexModule (from task 8.1)
    this.complexModule = createComplexModule({
      maxParallel: config.maxParallel || 4,
      verbose: config.verbose || false,
      strategy: config.strategy || 'adaptive'
    });

    // Initialize IntegratedSystem (from task 7.4)
    this.integratedSystem = createIntegratedSystem({
      maxConcurrent: config.maxConcurrent || 5,
      batchSize: config.batchSize || 100,
      enableMonitoring: this.config.enableMonitoring
    });

    this.status = 'stopped';
    this.startTime = null;
    this.reports = [];
    this.metrics = new FeatureYMetrics();

    // Event handlers
    this.eventHandlers = {
      onReportGenerated: [],
      onHealthCheck: [],
      onError: []
    };
  }

  /**
   * Start Feature Y and all underlying systems
   * @returns {Promise<Object>} Start result
   */
  async start() {
    if (this.status === 'running') {
      return { success: false, error: 'Feature Y already running' };
    }

    this.status = 'starting';
    const results = {
      integratedSystem: null,
      complexModule: null
    };

    try {
      // Start IntegratedSystem first (provides logging for ComplexModule)
      results.integratedSystem = await this.integratedSystem.start();
      if (!results.integratedSystem.success) {
        throw new Error(`IntegratedSystem failed to start: ${results.integratedSystem.error}`);
      }

      this.status = 'running';
      this.startTime = Date.now();
      this.metrics.recordStart();

      this._log('info', 'Feature Y started successfully', {
        config: this.config.name,
        version: this.config.version
      });

      return {
        success: true,
        message: 'Feature Y started',
        components: results
      };
    } catch (error) {
      this.status = 'error';
      this._emitEvent('onError', error);
      return {
        success: false,
        error: error.message,
        components: results
      };
    }
  }

  /**
   * Stop Feature Y and all underlying systems
   * @returns {Promise<Object>} Stop result
   */
  async stop() {
    if (this.status === 'stopped') {
      return { success: false, error: 'Feature Y already stopped' };
    }

    this.status = 'stopping';
    const results = {
      complexModule: null,
      integratedSystem: null
    };

    try {
      // Shutdown ComplexModule first
      if (this.complexModule) {
        results.complexModule = this.complexModule.shutdown();
      }

      // Stop IntegratedSystem
      results.integratedSystem = await this.integratedSystem.stop();

      this.status = 'stopped';
      const uptime = this.startTime ? Date.now() - this.startTime : 0;
      this.metrics.recordStop();

      return {
        success: true,
        message: 'Feature Y stopped',
        uptime,
        components: results
      };
    } catch (error) {
      this.status = 'error';
      return {
        success: false,
        error: error.message,
        components: results
      };
    }
  }

  /**
   * Initialize and execute tasks through ComplexModule
   * @param {Object[]} tasks - Tasks to execute
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Execution result
   */
  async executeTasks(tasks, options = {}) {
    if (this.status !== 'running') {
      return { success: false, error: 'Feature Y not running' };
    }

    this._log('info', 'Starting task execution', { taskCount: tasks.length });

    // Initialize ComplexModule with tasks
    const initResult = this.complexModule.initialize(tasks);
    if (!initResult.success) {
      this._log('error', 'Task initialization failed', { error: initResult.error });
      return initResult;
    }

    // Execute tasks
    const execResult = await this.complexModule.execute();

    // Cache the execution result
    if (options.cacheResult !== false && this.config.enableCaching) {
      const cacheKey = `task_exec_${Date.now()}`;
      await this.integratedSystem.processData(execResult.metrics, {
        cacheKey,
        cacheTtl: 3600000 // 1 hour
      });
    }

    // Generate report if requested
    if (options.generateReport !== false) {
      const report = this.generateReport(ReportType.EXECUTION, {
        executionResult: execResult
      });
      this.reports.push(report);
      this._emitEvent('onReportGenerated', report);
    }

    this.metrics.recordTaskExecution(execResult);
    this._log('info', 'Task execution completed', {
      success: execResult.success,
      tasksExecuted: execResult.metrics?.tasksExecuted
    });

    return execResult;
  }

  /**
   * Process data through IntegratedSystem with caching
   * @param {Object} data - Data to process
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processing result
   */
  async processData(data, options = {}) {
    if (this.status !== 'running') {
      return { success: false, error: 'Feature Y not running' };
    }

    const result = await this.integratedSystem.processData(data, options);
    this.metrics.recordDataProcessing(result);

    return result;
  }

  /**
   * Generate a report
   * @param {string} type - Report type
   * @param {Object} context - Report context
   * @returns {Object} Generated report
   */
  generateReport(type, context = {}) {
    const report = {
      id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      generatedAt: new Date().toISOString(),
      generatedBy: 'FeatureY',
      version: this.config.version,
      sections: []
    };

    switch (type) {
      case ReportType.EXECUTION:
        report.sections.push(this._generateExecutionSection(context));
        break;

      case ReportType.HEALTH:
        report.sections.push(this._generateHealthSection());
        break;

      case ReportType.METRICS:
        report.sections.push(this._generateMetricsSection());
        break;

      case ReportType.COMBINED:
        report.sections.push(this._generateExecutionSection(context));
        report.sections.push(this._generateHealthSection());
        report.sections.push(this._generateMetricsSection());
        break;

      default:
        report.sections.push({ name: 'unknown', error: `Unknown report type: ${type}` });
    }

    return report;
  }

  /**
   * Get health status of all components
   * @returns {Object} Combined health status
   */
  getHealthStatus() {
    const complexModuleStatus = this.complexModule.getStatus();
    const integratedSystemHealth = this.integratedSystem.getHealthStatus();

    const health = {
      status: this.status,
      timestamp: new Date().toISOString(),
      uptime: this.startTime ? Date.now() - this.startTime : 0,
      components: {
        complexModule: {
          initialized: complexModuleStatus.initialized,
          running: complexModuleStatus.running,
          activeTasks: complexModuleStatus.activeTasks
        },
        integratedSystem: integratedSystemHealth
      },
      overall: 'healthy'
    };

    // Determine overall health
    if (this.status !== 'running') {
      health.overall = 'down';
    } else if (integratedSystemHealth.overall !== 'healthy') {
      health.overall = 'degraded';
    }

    this._emitEvent('onHealthCheck', health);
    return health;
  }

  /**
   * Get aggregated metrics from all components
   * @returns {Object} Combined metrics
   */
  getMetrics() {
    return {
      featureY: this.metrics.getReport(),
      complexModule: this.complexModule.getStatus().metrics,
      integratedSystem: this.integratedSystem.getSystemMetrics(),
      uptime: this.startTime ? Date.now() - this.startTime : 0,
      status: this.status,
      reportsGenerated: this.reports.length
    };
  }

  /**
   * Get all generated reports
   * @param {Object} options - Query options
   * @returns {Object[]} Reports
   */
  getReports(options = {}) {
    let reports = [...this.reports];

    if (options.type) {
      reports = reports.filter(r => r.type === options.type);
    }

    if (options.limit) {
      reports = reports.slice(-options.limit);
    }

    return reports;
  }

  /**
   * Clear cached data
   * @returns {Object} Clear result
   */
  clearCaches() {
    if (this.status !== 'running') {
      return { success: false, error: 'Feature Y not running' };
    }

    const result = this.integratedSystem.clearCaches();
    this._log('info', 'Caches cleared', { result });
    return result;
  }

  /**
   * Get complete feature info
   * @returns {Object} Feature information
   */
  getInfo() {
    return {
      config: this.config,
      status: this.status,
      startTime: this.startTime,
      uptime: this.startTime ? Date.now() - this.startTime : 0,
      health: this.getHealthStatus(),
      metrics: this.getMetrics(),
      reportsGenerated: this.reports.length,
      components: {
        complexModule: {
          type: 'ComplexModule',
          description: 'Task scheduling and execution from 8.1'
        },
        integratedSystem: {
          type: 'IntegratedSystem',
          description: 'Component integration from 7.4'
        }
      }
    };
  }

  /**
   * Register an event handler
   * @param {string} event - Event name
   * @param {Function} handler - Handler function
   */
  on(event, handler) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event].push(handler);
    }
  }

  /**
   * Create a processing pipeline
   * @param {Array} operations - Pipeline operations
   * @returns {Object} Pipeline result
   */
  createPipeline(operations) {
    if (this.status !== 'running') {
      return { success: false, error: 'Feature Y not running' };
    }

    return this.integratedSystem.createPipeline(operations);
  }

  /**
   * Execute a processing pipeline
   * @param {Object} pipeline - Pipeline to execute
   * @param {Object|Array} inputData - Input data
   * @returns {Promise<Object>} Execution result
   */
  async executePipeline(pipeline, inputData) {
    if (this.status !== 'running') {
      return { success: false, error: 'Feature Y not running' };
    }

    const result = await this.integratedSystem.executePipeline(pipeline, inputData);
    this.metrics.recordPipelineExecution(result);
    return result;
  }

  // ============ Private Methods ============

  /**
   * Internal logging helper
   * @private
   */
  _log(level, message, context = {}) {
    if (this.integratedSystem.status === SystemStatus.RUNNING) {
      // Use IntegratedSystem's logging
      const logMethod = this.integratedSystem.log || (() => null);
      if (typeof logMethod === 'function') {
        logMethod.call(this.integratedSystem, level, message, {
          ...context,
          feature: 'FeatureY'
        });
      }
    }
  }

  /**
   * Generate execution report section
   * @private
   */
  _generateExecutionSection(context) {
    const section = {
      name: 'execution',
      title: 'Task Execution Summary',
      generatedAt: new Date().toISOString()
    };

    if (context.executionResult) {
      const metrics = context.executionResult.metrics || {};
      section.content = {
        success: context.executionResult.success,
        tasksExecuted: metrics.tasksExecuted || 0,
        tasksFailed: metrics.tasksFailed || 0,
        tasksSkipped: metrics.tasksSkipped || 0,
        batchesProcessed: metrics.batchesProcessed || 0,
        averageParallelism: metrics.averageParallelism || 0,
        duration: metrics.durationFormatted || 'N/A',
        strategyDecisions: metrics.strategyDecisions || {}
      };
    } else {
      section.content = {
        message: 'No execution context provided'
      };
    }

    return section;
  }

  /**
   * Generate health report section
   * @private
   */
  _generateHealthSection() {
    const health = this.getHealthStatus();
    return {
      name: 'health',
      title: 'System Health Status',
      generatedAt: new Date().toISOString(),
      content: {
        overallStatus: health.overall,
        featureYStatus: health.status,
        uptime: health.uptime,
        uptimeFormatted: `${Math.floor(health.uptime / 1000)}s`,
        components: health.components
      }
    };
  }

  /**
   * Generate metrics report section
   * @private
   */
  _generateMetricsSection() {
    const metrics = this.getMetrics();
    return {
      name: 'metrics',
      title: 'System Metrics',
      generatedAt: new Date().toISOString(),
      content: {
        featureY: metrics.featureY,
        uptime: metrics.uptime,
        reportsGenerated: metrics.reportsGenerated,
        status: metrics.status
      }
    };
  }

  /**
   * Emit an event to registered handlers
   * @private
   */
  _emitEvent(eventName, data) {
    const handlers = this.eventHandlers[eventName] || [];
    handlers.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        // Ignore handler errors
      }
    });
  }
}

/**
 * Feature Y Metrics Tracker
 */
class FeatureYMetrics {
  constructor() {
    this.startTime = null;
    this.stopTime = null;
    this.taskExecutions = 0;
    this.dataProcessingOps = 0;
    this.pipelineExecutions = 0;
    this.totalTasksExecuted = 0;
    this.totalTasksFailed = 0;
    this.dataProcessed = 0;
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  recordStart() {
    this.startTime = Date.now();
  }

  recordStop() {
    this.stopTime = Date.now();
  }

  recordTaskExecution(result) {
    this.taskExecutions++;
    if (result.metrics) {
      this.totalTasksExecuted += result.metrics.tasksExecuted || 0;
      this.totalTasksFailed += result.metrics.tasksFailed || 0;
    }
  }

  recordDataProcessing(result) {
    this.dataProcessingOps++;
    if (result.source === 'cache') {
      this.cacheHits++;
    } else {
      this.cacheMisses++;
    }
    this.dataProcessed++;
  }

  recordPipelineExecution(result) {
    this.pipelineExecutions++;
  }

  getReport() {
    return {
      uptime: this.startTime ? (this.stopTime || Date.now()) - this.startTime : 0,
      taskExecutions: this.taskExecutions,
      totalTasksExecuted: this.totalTasksExecuted,
      totalTasksFailed: this.totalTasksFailed,
      dataProcessingOps: this.dataProcessingOps,
      pipelineExecutions: this.pipelineExecutions,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      cacheHitRate: this.dataProcessingOps > 0
        ? ((this.cacheHits / this.dataProcessingOps) * 100).toFixed(2) + '%'
        : 'N/A'
    };
  }
}

/**
 * Factory function to create a FeatureY instance
 * @param {Object} options - Configuration options
 * @returns {FeatureY} New FeatureY instance
 */
function createFeatureY(options = {}) {
  return new FeatureY(options);
}

module.exports = {
  FeatureY,
  createFeatureY,
  FeatureYMetrics,
  FEATURE_Y_CONFIG,
  ReportType
};
