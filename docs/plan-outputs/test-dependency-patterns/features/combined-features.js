/**
 * Combined Features - Feature X + Feature Y Integration
 * Task 8.4: Combine features (depends: 8.2, 8.3)
 *
 * This module demonstrates the Mixed Complex Pattern (Phase 8)
 * by combining both feature branches:
 * - FeatureX from task 8.2 (pipeline-aware execution + output generation)
 * - FeatureY from task 8.3 (monitoring + reporting + integration)
 *
 * The combined system provides:
 * - Pipeline execution with multi-format output generation (from X)
 * - Unified monitoring and health reporting (from Y)
 * - Cross-feature coordination and metrics aggregation
 * - Comprehensive execution and output management
 *
 * Dependency visualization:
 *
 *   8.1 (ComplexModule) ─────┐
 *                            ├── 8.2 (FeatureX) ──┐
 *   5.6 (Pipeline Step 6) ───┘                    │
 *                                                 ├── [8.4] Combined Features
 *   8.1 (ComplexModule) ─────┐                    │
 *                            ├── 8.3 (FeatureY) ──┘
 *   7.4 (IntegratedSystem) ──┘
 */

const {
  FeatureX,
  createFeatureX,
  FeatureXMetrics,
  FEATURE_X_CONFIG,
  OutputFormat,
  StageStatus
} = require('./feature-x.js');

const {
  FeatureY,
  createFeatureY,
  FeatureYMetrics,
  FEATURE_Y_CONFIG,
  ReportType
} = require('./feature-y.js');

/**
 * Combined Features Configuration
 */
const COMBINED_CONFIG = {
  name: 'CombinedFeatures',
  version: '1.0.0',
  description: 'Unified system combining FeatureX (pipeline/output) and FeatureY (monitoring/reporting)',
  enablePipeline: true,
  enableMonitoring: true,
  enableOutputGeneration: true,
  enableReporting: true,
  enableCrossFeatureMetrics: true,
  coordinationMode: 'unified', // 'unified', 'independent', 'sequential'
  healthCheckInterval: 30000
};

/**
 * Combined operation modes
 */
const OperationMode = {
  PIPELINE_FIRST: 'pipeline_first',      // Execute pipeline then monitor
  MONITOR_FIRST: 'monitor_first',        // Start monitoring then pipeline
  PARALLEL: 'parallel',                  // Execute both in parallel
  COORDINATED: 'coordinated'             // Unified coordination
};

/**
 * Combined Features: Unified Pipeline and Monitoring System
 *
 * Integrates FeatureX's pipeline-aware task execution and multi-format
 * output generation with FeatureY's monitoring and reporting capabilities
 * to provide a comprehensive execution and observability platform.
 */
class CombinedFeatures {
  /**
   * Create a CombinedFeatures instance
   * @param {Object} config - Configuration options
   */
  constructor(config = {}) {
    this.config = { ...COMBINED_CONFIG, ...config };

    // Initialize both features
    this.featureX = createFeatureX({
      maxParallel: config.maxParallel || 4,
      verbose: config.verbose || false,
      strategy: config.strategy || 'adaptive',
      ...config.featureX
    });

    this.featureY = createFeatureY({
      maxParallel: config.maxParallel || 4,
      maxConcurrent: config.maxConcurrent || 5,
      verbose: config.verbose || false,
      ...config.featureY
    });

    this.status = 'stopped';
    this.startTime = null;
    this.operationMode = config.operationMode || OperationMode.COORDINATED;
    this.metrics = new CombinedMetrics();
    this.executionHistory = [];

    // Event handlers
    this.eventHandlers = {
      onStart: [],
      onStop: [],
      onPipelineComplete: [],
      onReportGenerated: [],
      onHealthUpdate: [],
      onError: []
    };

    // Cross-feature coordination state
    this.coordinationState = {
      activeOperations: new Set(),
      pendingSync: [],
      lastSyncTime: null
    };

    // Wire up internal event handlers for coordination
    this._setupInternalEventHandlers();
  }

  /**
   * Set up internal event handlers for cross-feature coordination
   * @private
   */
  _setupInternalEventHandlers() {
    // Forward FeatureX events
    this.featureX.on('onPipelineComplete', (result) => {
      this._handlePipelineComplete(result);
    });

    this.featureX.on('onOutputGenerated', (output) => {
      this.metrics.recordOutput(output);
    });

    // Forward FeatureY events
    this.featureY.on('onReportGenerated', (report) => {
      this._handleReportGenerated(report);
    });

    this.featureY.on('onHealthCheck', (health) => {
      this._handleHealthUpdate(health);
    });
  }

  /**
   * Start the combined features system
   * @returns {Promise<Object>} Start result
   */
  async start() {
    if (this.status === 'running') {
      return { success: false, error: 'Combined features already running' };
    }

    this.status = 'starting';
    const results = {
      featureX: null,
      featureY: null
    };

    try {
      // Start order depends on operation mode
      if (this.operationMode === OperationMode.MONITOR_FIRST) {
        results.featureY = await this.featureY.start();
        if (!results.featureY.success) {
          throw new Error(`FeatureY failed to start: ${results.featureY.error}`);
        }
        results.featureX = await this.featureX.start();
        if (!results.featureX.success) {
          throw new Error(`FeatureX failed to start: ${results.featureX.error}`);
        }
      } else if (this.operationMode === OperationMode.PARALLEL) {
        [results.featureX, results.featureY] = await Promise.all([
          this.featureX.start(),
          this.featureY.start()
        ]);

        if (!results.featureX.success) {
          throw new Error(`FeatureX failed to start: ${results.featureX.error}`);
        }
        if (!results.featureY.success) {
          throw new Error(`FeatureY failed to start: ${results.featureY.error}`);
        }
      } else {
        // Default: Pipeline first or Coordinated
        results.featureX = await this.featureX.start();
        if (!results.featureX.success) {
          throw new Error(`FeatureX failed to start: ${results.featureX.error}`);
        }
        results.featureY = await this.featureY.start();
        if (!results.featureY.success) {
          throw new Error(`FeatureY failed to start: ${results.featureY.error}`);
        }
      }

      this.status = 'running';
      this.startTime = Date.now();
      this.metrics.recordStart();

      this._emitEvent('onStart', {
        timestamp: new Date().toISOString(),
        components: results
      });

      return {
        success: true,
        message: 'Combined features started',
        operationMode: this.operationMode,
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
   * Stop the combined features system
   * @returns {Promise<Object>} Stop result
   */
  async stop() {
    if (this.status === 'stopped') {
      return { success: false, error: 'Combined features already stopped' };
    }

    this.status = 'stopping';
    const results = {
      featureX: null,
      featureY: null
    };

    try {
      // Stop in reverse order (graceful shutdown)
      results.featureY = await this.featureY.stop();
      results.featureX = await this.featureX.stop();

      this.status = 'stopped';
      const uptime = this.startTime ? Date.now() - this.startTime : 0;
      this.metrics.recordStop();

      this._emitEvent('onStop', {
        timestamp: new Date().toISOString(),
        uptime,
        components: results
      });

      return {
        success: true,
        message: 'Combined features stopped',
        uptime,
        uptimeFormatted: `${Math.floor(uptime / 1000)}s`,
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
   * Execute tasks with pipeline processing and monitoring
   * @param {Object[]} tasks - Tasks to execute
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Combined execution result
   */
  async executeTasks(tasks, options = {}) {
    if (this.status !== 'running') {
      return { success: false, error: 'Combined features not running' };
    }

    const executionId = `combined_exec_${Date.now()}`;
    this.coordinationState.activeOperations.add(executionId);

    try {
      let result;

      if (this.operationMode === OperationMode.COORDINATED) {
        result = await this._executeCoordinated(tasks, options);
      } else if (this.operationMode === OperationMode.PARALLEL) {
        result = await this._executeParallel(tasks, options);
      } else {
        result = await this._executeSequential(tasks, options);
      }

      // Record in history
      this.executionHistory.push({
        id: executionId,
        timestamp: new Date().toISOString(),
        taskCount: tasks.length,
        result
      });

      this.metrics.recordExecution(result);

      return {
        ...result,
        executionId
      };
    } finally {
      this.coordinationState.activeOperations.delete(executionId);
    }
  }

  /**
   * Execute with coordinated approach (unified)
   * @private
   */
  async _executeCoordinated(tasks, options) {
    // Phase 1: Execute through FeatureX (pipeline + output)
    const pipelineResult = await this.featureX.executeTasks(tasks, {
      ...options,
      generateOutput: true
    });

    // Phase 2: Generate monitoring report through FeatureY
    const monitoringResult = await this.featureY.executeTasks(tasks, {
      ...options,
      generateReport: true,
      cacheResult: true
    });

    // Phase 3: Combine results
    const combinedReport = this._generateCombinedReport(pipelineResult, monitoringResult);

    return {
      success: pipelineResult.success && monitoringResult.success,
      mode: 'coordinated',
      pipeline: {
        success: pipelineResult.success,
        outputs: pipelineResult.outputs,
        pipelineState: pipelineResult.pipeline
      },
      monitoring: {
        success: monitoringResult.success,
        metrics: monitoringResult.metrics
      },
      combinedReport,
      metrics: this._getCombinedMetrics()
    };
  }

  /**
   * Execute both features in parallel
   * @private
   */
  async _executeParallel(tasks, options) {
    const [pipelineResult, monitoringResult] = await Promise.all([
      this.featureX.executeTasks(tasks, { ...options, generateOutput: true }),
      this.featureY.executeTasks(tasks, { ...options, generateReport: true })
    ]);

    const combinedReport = this._generateCombinedReport(pipelineResult, monitoringResult);

    return {
      success: pipelineResult.success && monitoringResult.success,
      mode: 'parallel',
      pipeline: {
        success: pipelineResult.success,
        outputs: pipelineResult.outputs,
        pipelineState: pipelineResult.pipeline
      },
      monitoring: {
        success: monitoringResult.success,
        metrics: monitoringResult.metrics
      },
      combinedReport,
      metrics: this._getCombinedMetrics()
    };
  }

  /**
   * Execute features sequentially
   * @private
   */
  async _executeSequential(tasks, options) {
    let pipelineResult, monitoringResult;

    if (this.operationMode === OperationMode.PIPELINE_FIRST) {
      pipelineResult = await this.featureX.executeTasks(tasks, { ...options, generateOutput: true });
      monitoringResult = await this.featureY.executeTasks(tasks, { ...options, generateReport: true });
    } else {
      monitoringResult = await this.featureY.executeTasks(tasks, { ...options, generateReport: true });
      pipelineResult = await this.featureX.executeTasks(tasks, { ...options, generateOutput: true });
    }

    const combinedReport = this._generateCombinedReport(pipelineResult, monitoringResult);

    return {
      success: pipelineResult.success && monitoringResult.success,
      mode: 'sequential',
      pipeline: {
        success: pipelineResult.success,
        outputs: pipelineResult.outputs,
        pipelineState: pipelineResult.pipeline
      },
      monitoring: {
        success: monitoringResult.success,
        metrics: monitoringResult.metrics
      },
      combinedReport,
      metrics: this._getCombinedMetrics()
    };
  }

  /**
   * Run pipeline only (FeatureX)
   * @param {Object} inputData - Input data for pipeline
   * @param {Object} options - Pipeline options
   * @returns {Object} Pipeline result
   */
  runPipeline(inputData, options = {}) {
    if (this.status !== 'running') {
      return { success: false, error: 'Combined features not running' };
    }

    return this.featureX.runPipeline(inputData, options);
  }

  /**
   * Generate report only (FeatureY)
   * @param {string} type - Report type
   * @param {Object} context - Report context
   * @returns {Object} Report
   */
  generateReport(type = ReportType.COMBINED, context = {}) {
    if (this.status !== 'running') {
      return { success: false, error: 'Combined features not running' };
    }

    return this.featureY.generateReport(type, context);
  }

  /**
   * Generate output in specific format (FeatureX)
   * @param {Object} data - Data to format
   * @param {string} format - Output format
   * @returns {Object} Formatted output
   */
  generateOutput(data, format = OutputFormat.ALL) {
    return this.featureX.generateOutput(data, format);
  }

  /**
   * Get combined health status
   * @returns {Object} Health status from both features
   */
  getHealthStatus() {
    const featureXInfo = this.featureX.getInfo();
    const featureYHealth = this.featureY.getHealthStatus();

    const health = {
      status: this.status,
      timestamp: new Date().toISOString(),
      uptime: this.startTime ? Date.now() - this.startTime : 0,
      operationMode: this.operationMode,
      components: {
        featureX: {
          status: featureXInfo.status,
          pipeline: featureXInfo.pipeline,
          outputsGenerated: featureXInfo.outputsGenerated
        },
        featureY: featureYHealth
      },
      overall: 'healthy'
    };

    // Determine overall health
    if (this.status !== 'running') {
      health.overall = 'down';
    } else if (featureYHealth.overall !== 'healthy') {
      health.overall = 'degraded';
    }

    return health;
  }

  /**
   * Get aggregated metrics from both features
   * @returns {Object} Combined metrics
   */
  getMetrics() {
    const featureXMetrics = this.featureX.getMetrics();
    const featureYMetrics = this.featureY.getMetrics();

    return {
      combined: this.metrics.getReport(),
      featureX: featureXMetrics,
      featureY: featureYMetrics,
      uptime: this.startTime ? Date.now() - this.startTime : 0,
      status: this.status,
      operationMode: this.operationMode,
      executionCount: this.executionHistory.length,
      aggregated: this._aggregateMetrics(featureXMetrics, featureYMetrics)
    };
  }

  /**
   * Get all outputs (from FeatureX)
   * @param {Object} options - Query options
   * @returns {Object[]} Output records
   */
  getOutputs(options = {}) {
    return this.featureX.getOutputs(options);
  }

  /**
   * Get all reports (from FeatureY)
   * @param {Object} options - Query options
   * @returns {Object[]} Reports
   */
  getReports(options = {}) {
    return this.featureY.getReports(options);
  }

  /**
   * Get execution history
   * @param {Object} options - Query options
   * @returns {Object[]} Execution history
   */
  getExecutionHistory(options = {}) {
    let history = [...this.executionHistory];

    if (options.limit) {
      history = history.slice(-options.limit);
    }

    return history;
  }

  /**
   * Get complete combined info
   * @returns {Object} Complete information
   */
  getInfo() {
    return {
      config: this.config,
      status: this.status,
      operationMode: this.operationMode,
      startTime: this.startTime,
      uptime: this.startTime ? Date.now() - this.startTime : 0,
      health: this.getHealthStatus(),
      metrics: this.getMetrics(),
      executionCount: this.executionHistory.length,
      components: {
        featureX: this.featureX.getInfo(),
        featureY: this.featureY.getInfo()
      },
      dependencies: {
        featureX: {
          from: ['8.1 (ComplexModule)', '5.6 (Pipeline Step 6)'],
          task: '8.2'
        },
        featureY: {
          from: ['8.1 (ComplexModule)', '7.4 (IntegratedSystem)'],
          task: '8.3'
        },
        combined: {
          from: ['8.2 (FeatureX)', '8.3 (FeatureY)'],
          task: '8.4'
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
   * Get visualizations from both features
   * @returns {Object} Visualizations
   */
  visualize() {
    return {
      featureX: this.featureX.visualize('layers'),
      dependencyGraph: this._generateDependencyVisualization()
    };
  }

  /**
   * Generate comprehensive combined report
   * @returns {string} Formatted report
   */
  generateComprehensiveReport() {
    let report = '='.repeat(70) + '\n';
    report += 'COMBINED FEATURES EXECUTION REPORT\n';
    report += '='.repeat(70) + '\n\n';

    // Overview section
    report += '-'.repeat(50) + '\n';
    report += 'SYSTEM OVERVIEW\n';
    report += '-'.repeat(50) + '\n';
    report += `Feature: ${this.config.name} v${this.config.version}\n`;
    report += `Status: ${this.status}\n`;
    report += `Operation Mode: ${this.operationMode}\n`;
    report += `Uptime: ${this.startTime ? Date.now() - this.startTime : 0}ms\n`;
    report += `Executions: ${this.executionHistory.length}\n\n`;

    // Component status
    report += '-'.repeat(50) + '\n';
    report += 'COMPONENT STATUS\n';
    report += '-'.repeat(50) + '\n';
    const health = this.getHealthStatus();
    report += `Overall: ${health.overall}\n`;
    report += `FeatureX: ${health.components.featureX.status}\n`;
    report += `FeatureY: ${health.components.featureY.overall || 'N/A'}\n\n`;

    // Metrics summary
    report += '-'.repeat(50) + '\n';
    report += 'METRICS SUMMARY\n';
    report += '-'.repeat(50) + '\n';
    const metrics = this.metrics.getReport();
    report += `Total Executions: ${metrics.executions}\n`;
    report += `Pipeline Runs: ${metrics.pipelineRuns}\n`;
    report += `Monitoring Operations: ${metrics.monitoringOps}\n`;
    report += `Outputs Generated: ${metrics.outputsGenerated}\n`;
    report += `Reports Generated: ${metrics.reportsGenerated}\n\n`;

    // Dependency tree
    report += '-'.repeat(50) + '\n';
    report += 'DEPENDENCY TREE\n';
    report += '-'.repeat(50) + '\n';
    report += this._generateDependencyVisualization();
    report += '\n';

    // Feature X report
    if (this.featureX.status === 'running' || this.featureX.startTime) {
      report += '\n' + '-'.repeat(50) + '\n';
      report += 'FEATURE X (Pipeline/Output) DETAILS\n';
      report += '-'.repeat(50) + '\n';
      const featureXInfo = this.featureX.getInfo();
      report += `Pipeline Stages: ${featureXInfo.pipeline?.totalStages || 'N/A'}\n`;
      report += `Pipeline Progress: ${featureXInfo.pipeline?.progress || 0}%\n`;
      report += `Outputs Generated: ${featureXInfo.outputsGenerated || 0}\n`;
    }

    // Feature Y report
    if (this.featureY.status === 'running' || this.featureY.startTime) {
      report += '\n' + '-'.repeat(50) + '\n';
      report += 'FEATURE Y (Monitoring/Reporting) DETAILS\n';
      report += '-'.repeat(50) + '\n';
      const featureYMetrics = this.featureY.getMetrics();
      report += `Task Executions: ${featureYMetrics.featureY?.taskExecutions || 0}\n`;
      report += `Data Processing Ops: ${featureYMetrics.featureY?.dataProcessingOps || 0}\n`;
      report += `Cache Hit Rate: ${featureYMetrics.featureY?.cacheHitRate || 'N/A'}\n`;
      report += `Reports Generated: ${featureYMetrics.reportsGenerated || 0}\n`;
    }

    report += '\n' + '='.repeat(70) + '\n';
    report += 'End of Combined Report\n';
    report += '='.repeat(70) + '\n';

    return report;
  }

  // ============ Private Methods ============

  /**
   * Generate combined report from both execution results
   * @private
   */
  _generateCombinedReport(pipelineResult, monitoringResult) {
    return {
      id: `combined_report_${Date.now()}`,
      generatedAt: new Date().toISOString(),
      type: 'combined',
      success: pipelineResult.success && monitoringResult.success,
      sections: [
        {
          name: 'pipeline',
          title: 'Pipeline Execution',
          content: {
            success: pipelineResult.success,
            stagesCompleted: pipelineResult.pipeline?.progress || 0,
            outputFormats: pipelineResult.outputs?.formats
              ? Object.keys(pipelineResult.outputs.formats)
              : []
          }
        },
        {
          name: 'monitoring',
          title: 'Monitoring & Metrics',
          content: {
            success: monitoringResult.success,
            tasksExecuted: monitoringResult.metrics?.tasksExecuted || 0,
            tasksFailed: monitoringResult.metrics?.tasksFailed || 0
          }
        },
        {
          name: 'integration',
          title: 'Cross-Feature Integration',
          content: {
            operationMode: this.operationMode,
            coordinationActive: this.coordinationState.activeOperations.size > 0,
            lastSync: this.coordinationState.lastSyncTime
          }
        }
      ]
    };
  }

  /**
   * Get combined metrics
   * @private
   */
  _getCombinedMetrics() {
    return {
      combined: this.metrics.getReport(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Aggregate metrics from both features
   * @private
   */
  _aggregateMetrics(featureXMetrics, featureYMetrics) {
    return {
      totalExecutions:
        (featureXMetrics.featureX?.executions || 0) +
        (featureYMetrics.featureY?.taskExecutions || 0),
      totalTasksProcessed:
        (featureXMetrics.featureX?.totalTasksExecuted || 0) +
        (featureYMetrics.featureY?.totalTasksExecuted || 0),
      totalOutputs:
        (featureXMetrics.outputs?.totalGenerated || 0),
      totalReports: featureYMetrics.reportsGenerated || 0,
      combinedUptime: Math.max(
        featureXMetrics.uptime || 0,
        featureYMetrics.uptime || 0
      )
    };
  }

  /**
   * Generate dependency visualization
   * @private
   */
  _generateDependencyVisualization() {
    return `
Phase 8: Mixed Complex Pattern Dependency Tree
===============================================

Level 0 (Foundation):
├── 1.1 Base Configuration
├── 1.2 Test Fixtures
├── 1.3 Database
└── 1.4 Shared Utilities

Level 1 (Extended):
├── 2.1 Extended Config ─────────────────────┐
├── 2.4 Utility Wrappers ─────────────────┐  │
│                                         │  │
Level 2 (Strategies):                     │  │
├── 3.1 Shared Interface ──┐              │  │
├── 3.2 Strategy A ────────┼─┐            │  │
├── 3.3 Strategy B ────────┼─┤            │  │
└── 3.4 Combined Strategy ─┘ │            │  │
                             │            │  │
Level 3 (Integration):       │            │  │
├── 4.3 Documentation ───────┴────────────┴──┴── 8.1 ComplexModule
│
Level 4 (Pipeline):
├── 5.1 → 5.2 → 5.3 → 5.4 → 5.5 → 5.6 ─────────┐
│                                               │
Level 5 (Fan-Out/Fan-In):                       │
├── 6.1 → 6.2 → 6.5 ──┐                         │
├── 6.1 → 6.3 → 6.6 ──┼─ 7.1, 7.2, 7.3 → 7.4 ──┤
└── 6.1 → 6.4 → 6.7 ──┘                │        │
                                       │        │
Level 6 (Features):                    │        │
├── 8.1 + 5.6 ──────────────────────── │ ──→ 8.2 FeatureX
└── 8.1 + 7.4 ─────────────────────────┘ ──→ 8.3 FeatureY
                                              │
Level 7 (Combined):                           │
└── 8.2 + 8.3 ────────────────────────────→ [8.4] Combined Features

Legend:
  → : depends on
  ─ : same level connection
`;
  }

  /**
   * Handle pipeline complete event
   * @private
   */
  _handlePipelineComplete(result) {
    this.coordinationState.lastSyncTime = Date.now();
    this.metrics.recordPipelineRun();
    this._emitEvent('onPipelineComplete', result);
  }

  /**
   * Handle report generated event
   * @private
   */
  _handleReportGenerated(report) {
    this.metrics.recordReportGeneration();
    this._emitEvent('onReportGenerated', report);
  }

  /**
   * Handle health update event
   * @private
   */
  _handleHealthUpdate(health) {
    this._emitEvent('onHealthUpdate', health);
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
 * Combined Metrics Tracker
 */
class CombinedMetrics {
  constructor() {
    this.startTime = null;
    this.stopTime = null;
    this.executions = 0;
    this.pipelineRuns = 0;
    this.monitoringOps = 0;
    this.outputsGenerated = 0;
    this.reportsGenerated = 0;
    this.coordinatedOperations = 0;
    this.parallelOperations = 0;
    this.sequentialOperations = 0;
  }

  recordStart() {
    this.startTime = Date.now();
  }

  recordStop() {
    this.stopTime = Date.now();
  }

  recordExecution(result) {
    this.executions++;
    if (result.mode === 'coordinated') {
      this.coordinatedOperations++;
    } else if (result.mode === 'parallel') {
      this.parallelOperations++;
    } else {
      this.sequentialOperations++;
    }
  }

  recordPipelineRun() {
    this.pipelineRuns++;
  }

  recordMonitoringOp() {
    this.monitoringOps++;
  }

  recordOutput(output) {
    this.outputsGenerated++;
  }

  recordReportGeneration() {
    this.reportsGenerated++;
  }

  getReport() {
    return {
      uptime: this.startTime ? (this.stopTime || Date.now()) - this.startTime : 0,
      executions: this.executions,
      pipelineRuns: this.pipelineRuns,
      monitoringOps: this.monitoringOps,
      outputsGenerated: this.outputsGenerated,
      reportsGenerated: this.reportsGenerated,
      operationBreakdown: {
        coordinated: this.coordinatedOperations,
        parallel: this.parallelOperations,
        sequential: this.sequentialOperations
      }
    };
  }
}

/**
 * Factory function to create a CombinedFeatures instance
 * @param {Object} options - Configuration options
 * @returns {CombinedFeatures} New CombinedFeatures instance
 */
function createCombinedFeatures(options = {}) {
  return new CombinedFeatures(options);
}

module.exports = {
  CombinedFeatures,
  createCombinedFeatures,
  CombinedMetrics,
  COMBINED_CONFIG,
  OperationMode
};
