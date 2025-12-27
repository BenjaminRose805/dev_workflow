/**
 * Feature X - Long Chain Pipeline Integration Feature
 * Task 8.2: Build feature X (depends: 8.1, 5.6)
 *
 * This module demonstrates the Mixed Complex Pattern (Phase 8)
 * by combining:
 * - ComplexModule from task 8.1 (cross-phase integration)
 * - Pipeline Step 6 from task 5.6 (long chain completion - output generation)
 *
 * Feature X focuses on providing a pipeline-aware task execution system
 * that leverages both the task scheduling capabilities from ComplexModule
 * and the multi-format output generation from the pipeline.
 *
 *   8.1 (ComplexModule) ─────┐
 *                            ├── [8.2] Feature X
 *   5.6 (Pipeline Step 6) ───┘
 */

const { ComplexModule, createComplexModule, ExecutionMetrics } = require('../complex/complex-module.js');
const {
  OUTPUT_CONFIG,
  FINAL_CONTEXT,
  formatJsonOutput,
  formatTextOutput,
  generateSummaryOutput,
  generateAllOutputs,
  executeStep6
} = require('../pipeline/step-6.js');

/**
 * Feature X Configuration
 */
const FEATURE_X_CONFIG = {
  name: 'FeatureX',
  version: '1.0.0',
  description: 'Pipeline-aware task execution combining ComplexModule and Pipeline output generation',
  enablePipelineOutput: true,
  enableJsonExport: true,
  enableTextExport: true,
  enableSummaryExport: true,
  autoPipeline: true,
  pipelineStages: 6
};

/**
 * Output format types supported by Feature X
 */
const OutputFormat = {
  JSON: 'json',
  TEXT: 'text',
  SUMMARY: 'summary',
  ALL: 'all'
};

/**
 * Pipeline stage status
 */
const StageStatus = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  SKIPPED: 'skipped'
};

/**
 * Feature X: Pipeline-Aware Task Execution
 *
 * Combines the task scheduling and execution from ComplexModule
 * with the multi-format output generation capabilities from the
 * pipeline's step 6 to provide a comprehensive execution and
 * output system.
 */
class FeatureX {
  /**
   * Create a FeatureX instance
   * @param {Object} config - Configuration options
   */
  constructor(config = {}) {
    this.config = { ...FEATURE_X_CONFIG, ...config };

    // Initialize ComplexModule (from task 8.1)
    this.complexModule = createComplexModule({
      maxParallel: config.maxParallel || 4,
      verbose: config.verbose || false,
      strategy: config.strategy || 'adaptive'
    });

    // Pipeline state (from task 5.6 concepts)
    this.pipelineState = {
      stages: [],
      currentStage: 0,
      isRunning: false,
      startTime: null,
      endTime: null
    };

    // Output configuration from step-6
    this.outputConfig = { ...OUTPUT_CONFIG, ...config.output };

    this.status = 'stopped';
    this.startTime = null;
    this.outputs = [];
    this.metrics = new FeatureXMetrics();

    // Event handlers
    this.eventHandlers = {
      onOutputGenerated: [],
      onStageComplete: [],
      onPipelineComplete: [],
      onError: []
    };

    // Initialize pipeline stages
    this._initializePipelineStages();
  }

  /**
   * Initialize pipeline stages based on configuration
   * @private
   */
  _initializePipelineStages() {
    const stageCount = this.config.pipelineStages || 6;
    this.pipelineState.stages = [];

    for (let i = 1; i <= stageCount; i++) {
      this.pipelineState.stages.push({
        number: i,
        name: `Stage ${i}`,
        status: StageStatus.PENDING,
        startTime: null,
        endTime: null,
        data: null
      });
    }
  }

  /**
   * Start Feature X
   * @returns {Promise<Object>} Start result
   */
  async start() {
    if (this.status === 'running') {
      return { success: false, error: 'Feature X already running' };
    }

    this.status = 'starting';

    try {
      this.status = 'running';
      this.startTime = Date.now();
      this.metrics.recordStart();

      return {
        success: true,
        message: 'Feature X started',
        config: {
          name: this.config.name,
          version: this.config.version,
          pipelineStages: this.config.pipelineStages,
          outputFormats: this._getEnabledFormats()
        }
      };
    } catch (error) {
      this.status = 'error';
      this._emitEvent('onError', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Stop Feature X
   * @returns {Promise<Object>} Stop result
   */
  async stop() {
    if (this.status === 'stopped') {
      return { success: false, error: 'Feature X already stopped' };
    }

    this.status = 'stopping';

    try {
      // Shutdown ComplexModule
      if (this.complexModule) {
        this.complexModule.shutdown();
      }

      // Reset pipeline state
      this.pipelineState.isRunning = false;
      this.pipelineState.currentStage = 0;

      this.status = 'stopped';
      const uptime = this.startTime ? Date.now() - this.startTime : 0;
      this.metrics.recordStop();

      return {
        success: true,
        message: 'Feature X stopped',
        uptime,
        outputsGenerated: this.outputs.length
      };
    } catch (error) {
      this.status = 'error';
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Execute tasks through ComplexModule with pipeline integration
   * @param {Object[]} tasks - Tasks to execute
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Execution result with pipeline outputs
   */
  async executeTasks(tasks, options = {}) {
    if (this.status !== 'running') {
      return { success: false, error: 'Feature X not running' };
    }

    const executionId = `exec_${Date.now()}`;

    // Start pipeline if autoPipeline is enabled
    if (this.config.autoPipeline && !this.pipelineState.isRunning) {
      this._startPipeline();
    }

    // Record stage 1: Task ingestion
    this._updateStage(1, StageStatus.RUNNING);
    this._updateStage(1, StageStatus.COMPLETED, {
      tasksIngested: tasks.length,
      timestamp: new Date().toISOString()
    });

    // Initialize ComplexModule with tasks (stage 2)
    this._updateStage(2, StageStatus.RUNNING);
    const initResult = this.complexModule.initialize(tasks);
    if (!initResult.success) {
      this._updateStage(2, StageStatus.FAILED, { error: initResult.error });
      return initResult;
    }
    this._updateStage(2, StageStatus.COMPLETED, initResult);

    // Execute tasks (stages 3-4)
    this._updateStage(3, StageStatus.RUNNING);
    this._updateStage(4, StageStatus.RUNNING);
    const execResult = await this.complexModule.execute();
    this._updateStage(3, StageStatus.COMPLETED, { scheduled: true });
    this._updateStage(4, StageStatus.COMPLETED, { executed: true, metrics: execResult.metrics });

    // Aggregate results (stage 5)
    this._updateStage(5, StageStatus.RUNNING);
    const aggregatedData = this._aggregateExecutionData(execResult);
    this._updateStage(5, StageStatus.COMPLETED, aggregatedData);

    // Generate outputs (stage 6 - from step-6.js patterns)
    this._updateStage(6, StageStatus.RUNNING);
    const outputs = this._generateOutputs(aggregatedData, options);
    this._updateStage(6, StageStatus.COMPLETED, { formatsGenerated: Object.keys(outputs.formats) });

    // Complete pipeline
    this._completePipeline();

    // Store outputs
    const outputRecord = {
      id: executionId,
      generatedAt: new Date().toISOString(),
      outputs,
      pipelineState: this._getPipelineSnapshot()
    };
    this.outputs.push(outputRecord);
    this._emitEvent('onOutputGenerated', outputRecord);

    this.metrics.recordExecution(execResult, outputs);

    return {
      success: execResult.success,
      executionId,
      executionResult: execResult,
      outputs,
      pipeline: this._getPipelineSnapshot()
    };
  }

  /**
   * Execute pipeline only (without task execution)
   * @param {Object} inputData - Data to process through pipeline
   * @param {Object} options - Pipeline options
   * @returns {Object} Pipeline result with outputs
   */
  runPipeline(inputData, options = {}) {
    if (this.status !== 'running') {
      return { success: false, error: 'Feature X not running' };
    }

    this._startPipeline();

    // Process through all stages
    let currentData = inputData;

    for (let i = 1; i <= this.config.pipelineStages; i++) {
      this._updateStage(i, StageStatus.RUNNING);

      try {
        currentData = this._processStage(i, currentData);
        this._updateStage(i, StageStatus.COMPLETED, currentData);
        this._emitEvent('onStageComplete', { stage: i, data: currentData });
      } catch (error) {
        this._updateStage(i, StageStatus.FAILED, { error: error.message });
        return {
          success: false,
          error: `Pipeline failed at stage ${i}: ${error.message}`,
          pipeline: this._getPipelineSnapshot()
        };
      }
    }

    this._completePipeline();

    // Generate outputs
    const outputs = this._generateOutputs(currentData, options);

    const result = {
      success: true,
      data: currentData,
      outputs,
      pipeline: this._getPipelineSnapshot()
    };

    this._emitEvent('onPipelineComplete', result);
    return result;
  }

  /**
   * Generate outputs in specified format
   * @param {Object} data - Data to format
   * @param {string} format - Output format (json, text, summary, all)
   * @returns {Object} Formatted output
   */
  generateOutput(data, format = OutputFormat.ALL) {
    switch (format) {
      case OutputFormat.JSON:
        return formatJsonOutput(data, { includeMetadata: this.outputConfig.includeMetadata });

      case OutputFormat.TEXT:
        return formatTextOutput(data, { includeTimestamps: this.outputConfig.includeTimestamps });

      case OutputFormat.SUMMARY:
        return generateSummaryOutput(data);

      case OutputFormat.ALL:
      default:
        return generateAllOutputs(data);
    }
  }

  /**
   * Get pipeline status
   * @returns {Object} Current pipeline state
   */
  getPipelineStatus() {
    return {
      isRunning: this.pipelineState.isRunning,
      currentStage: this.pipelineState.currentStage,
      totalStages: this.config.pipelineStages,
      stages: this.pipelineState.stages.map(s => ({
        number: s.number,
        name: s.name,
        status: s.status,
        duration: s.startTime && s.endTime ? s.endTime - s.startTime : null
      })),
      progress: this._calculatePipelineProgress()
    };
  }

  /**
   * Get execution metrics
   * @returns {Object} Combined metrics
   */
  getMetrics() {
    return {
      featureX: this.metrics.getReport(),
      complexModule: this.complexModule.getStatus().metrics,
      pipeline: {
        stagesConfigured: this.config.pipelineStages,
        stagesCompleted: this.pipelineState.stages.filter(s => s.status === StageStatus.COMPLETED).length,
        stagesFailed: this.pipelineState.stages.filter(s => s.status === StageStatus.FAILED).length
      },
      outputs: {
        totalGenerated: this.outputs.length,
        formatsEnabled: this._getEnabledFormats()
      },
      uptime: this.startTime ? Date.now() - this.startTime : 0,
      status: this.status
    };
  }

  /**
   * Get all generated outputs
   * @param {Object} options - Query options
   * @returns {Object[]} Output records
   */
  getOutputs(options = {}) {
    let outputs = [...this.outputs];

    if (options.format) {
      outputs = outputs.filter(o =>
        o.outputs?.formats && Object.keys(o.outputs.formats).includes(options.format)
      );
    }

    if (options.limit) {
      outputs = outputs.slice(-options.limit);
    }

    return outputs;
  }

  /**
   * Export data in specific format
   * @param {Object} data - Data to export
   * @param {string} format - Export format
   * @returns {string|Object} Exported data
   */
  export(data, format = OutputFormat.JSON) {
    const output = this.generateOutput(data, format);

    if (format === OutputFormat.TEXT) {
      return output;
    }

    if (this.outputConfig.prettyPrint) {
      return JSON.stringify(output, null, 2);
    }

    return output;
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
      pipeline: this.getPipelineStatus(),
      metrics: this.getMetrics(),
      outputsGenerated: this.outputs.length,
      components: {
        complexModule: {
          type: 'ComplexModule',
          description: 'Task scheduling and execution from 8.1'
        },
        pipelineOutput: {
          type: 'PipelineStep6',
          description: 'Multi-format output generation from 5.6'
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
   * Get visualization from ComplexModule
   * @param {string} format - Visualization format
   * @returns {string} Visualization output
   */
  visualize(format = 'layers') {
    return this.complexModule.visualize(format);
  }

  /**
   * Generate comprehensive report
   * @returns {string} Formatted report
   */
  generateReport() {
    let report = '='.repeat(60) + '\n';
    report += 'FEATURE X EXECUTION REPORT\n';
    report += '='.repeat(60) + '\n\n';

    // Feature info
    report += `Feature: ${this.config.name} v${this.config.version}\n`;
    report += `Status: ${this.status}\n`;
    report += `Uptime: ${this.startTime ? Date.now() - this.startTime : 0}ms\n\n`;

    // Pipeline status
    report += '-'.repeat(40) + '\n';
    report += 'PIPELINE STATUS\n';
    report += '-'.repeat(40) + '\n';
    const pipelineStatus = this.getPipelineStatus();
    report += `Stages: ${pipelineStatus.totalStages}\n`;
    report += `Progress: ${pipelineStatus.progress}%\n`;
    pipelineStatus.stages.forEach(s => {
      const icon = s.status === 'completed' ? '[x]' : s.status === 'failed' ? '[!]' : '[ ]';
      report += `  ${icon} ${s.name}: ${s.status}\n`;
    });
    report += '\n';

    // Metrics
    report += '-'.repeat(40) + '\n';
    report += 'METRICS\n';
    report += '-'.repeat(40) + '\n';
    const metrics = this.metrics.getReport();
    report += `Executions: ${metrics.executions}\n`;
    report += `Tasks Executed: ${metrics.totalTasksExecuted}\n`;
    report += `Tasks Failed: ${metrics.totalTasksFailed}\n`;
    report += `Outputs Generated: ${metrics.outputsGenerated}\n\n`;

    // Output formats
    report += '-'.repeat(40) + '\n';
    report += 'OUTPUT CONFIGURATION\n';
    report += '-'.repeat(40) + '\n';
    const formats = this._getEnabledFormats();
    report += `Enabled Formats: ${formats.join(', ')}\n`;
    report += `Pretty Print: ${this.outputConfig.prettyPrint}\n`;
    report += `Include Metadata: ${this.outputConfig.includeMetadata}\n\n`;

    // ComplexModule report
    if (this.complexModule && this.complexModule.initialized) {
      report += '-'.repeat(40) + '\n';
      report += 'COMPLEX MODULE STATUS\n';
      report += '-'.repeat(40) + '\n';
      report += this.complexModule.generateReport();
    }

    report += '\n' + '='.repeat(60) + '\n';
    report += 'End of Report\n';
    report += '='.repeat(60) + '\n';

    return report;
  }

  // ============ Private Methods ============

  /**
   * Start the pipeline
   * @private
   */
  _startPipeline() {
    this.pipelineState.isRunning = true;
    this.pipelineState.startTime = Date.now();
    this.pipelineState.currentStage = 0;
    this._initializePipelineStages();
  }

  /**
   * Complete the pipeline
   * @private
   */
  _completePipeline() {
    this.pipelineState.isRunning = false;
    this.pipelineState.endTime = Date.now();
  }

  /**
   * Update stage status
   * @private
   */
  _updateStage(stageNum, status, data = null) {
    const stage = this.pipelineState.stages.find(s => s.number === stageNum);
    if (!stage) return;

    stage.status = status;

    if (status === StageStatus.RUNNING) {
      stage.startTime = Date.now();
      this.pipelineState.currentStage = stageNum;
    } else if (status === StageStatus.COMPLETED || status === StageStatus.FAILED) {
      stage.endTime = Date.now();
    }

    if (data) {
      stage.data = data;
    }
  }

  /**
   * Process a pipeline stage
   * @private
   */
  _processStage(stageNum, inputData) {
    switch (stageNum) {
      case 1: // Ingest
        return { ...inputData, ingested: true, timestamp: Date.now() };
      case 2: // Validate
        return { ...inputData, validated: true };
      case 3: // Transform
        return { ...inputData, transformed: true };
      case 4: // Process
        return { ...inputData, processed: true };
      case 5: // Aggregate
        return { ...inputData, aggregated: true };
      case 6: // Output
        return { ...inputData, outputReady: true };
      default:
        return inputData;
    }
  }

  /**
   * Aggregate execution data for output
   * @private
   */
  _aggregateExecutionData(execResult) {
    return {
      execution: {
        success: execResult.success,
        metrics: execResult.metrics,
        finalStatus: execResult.finalStatus
      },
      pipeline: {
        stagesCompleted: this.pipelineState.stages.filter(s => s.status === StageStatus.COMPLETED).length,
        duration: this.pipelineState.startTime
          ? Date.now() - this.pipelineState.startTime
          : 0
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Generate outputs using step-6 patterns
   * @private
   */
  _generateOutputs(data, options = {}) {
    const outputs = {
      generatedAt: new Date().toISOString(),
      formats: {}
    };

    if (this.config.enableJsonExport) {
      outputs.formats.json = formatJsonOutput(data, {
        includeMetadata: this.outputConfig.includeMetadata
      });
    }

    if (this.config.enableTextExport) {
      outputs.formats.text = formatTextOutput(data, {
        includeTimestamps: this.outputConfig.includeTimestamps
      });
    }

    if (this.config.enableSummaryExport) {
      outputs.formats.summary = generateSummaryOutput(data);
    }

    return outputs;
  }

  /**
   * Get enabled output formats
   * @private
   */
  _getEnabledFormats() {
    const formats = [];
    if (this.config.enableJsonExport) formats.push('json');
    if (this.config.enableTextExport) formats.push('text');
    if (this.config.enableSummaryExport) formats.push('summary');
    return formats;
  }

  /**
   * Calculate pipeline progress percentage
   * @private
   */
  _calculatePipelineProgress() {
    const completed = this.pipelineState.stages.filter(
      s => s.status === StageStatus.COMPLETED
    ).length;
    return Math.round((completed / this.config.pipelineStages) * 100);
  }

  /**
   * Get pipeline state snapshot
   * @private
   */
  _getPipelineSnapshot() {
    return {
      isRunning: this.pipelineState.isRunning,
      currentStage: this.pipelineState.currentStage,
      totalStages: this.config.pipelineStages,
      progress: this._calculatePipelineProgress(),
      duration: this.pipelineState.startTime && this.pipelineState.endTime
        ? this.pipelineState.endTime - this.pipelineState.startTime
        : null
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
 * Feature X Metrics Tracker
 */
class FeatureXMetrics {
  constructor() {
    this.startTime = null;
    this.stopTime = null;
    this.executions = 0;
    this.totalTasksExecuted = 0;
    this.totalTasksFailed = 0;
    this.outputsGenerated = 0;
    this.pipelinesCompleted = 0;
    this.stagesProcessed = 0;
    this.formatsGenerated = {
      json: 0,
      text: 0,
      summary: 0
    };
  }

  recordStart() {
    this.startTime = Date.now();
  }

  recordStop() {
    this.stopTime = Date.now();
  }

  recordExecution(execResult, outputs) {
    this.executions++;
    if (execResult.metrics) {
      this.totalTasksExecuted += execResult.metrics.tasksExecuted || 0;
      this.totalTasksFailed += execResult.metrics.tasksFailed || 0;
    }

    if (outputs?.formats) {
      this.outputsGenerated++;
      Object.keys(outputs.formats).forEach(format => {
        if (this.formatsGenerated[format] !== undefined) {
          this.formatsGenerated[format]++;
        }
      });
    }

    this.pipelinesCompleted++;
  }

  recordPipelineStage() {
    this.stagesProcessed++;
  }

  getReport() {
    return {
      uptime: this.startTime ? (this.stopTime || Date.now()) - this.startTime : 0,
      executions: this.executions,
      totalTasksExecuted: this.totalTasksExecuted,
      totalTasksFailed: this.totalTasksFailed,
      outputsGenerated: this.outputsGenerated,
      pipelinesCompleted: this.pipelinesCompleted,
      stagesProcessed: this.stagesProcessed,
      formatBreakdown: this.formatsGenerated
    };
  }
}

/**
 * Factory function to create a FeatureX instance
 * @param {Object} options - Configuration options
 * @returns {FeatureX} New FeatureX instance
 */
function createFeatureX(options = {}) {
  return new FeatureX(options);
}

module.exports = {
  FeatureX,
  createFeatureX,
  FeatureXMetrics,
  FEATURE_X_CONFIG,
  OutputFormat,
  StageStatus
};
