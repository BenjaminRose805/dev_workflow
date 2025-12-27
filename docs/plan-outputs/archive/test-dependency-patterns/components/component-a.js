/**
 * Component A: Data Processing Component
 * Task 7.1: Component A (depends: 6.5)
 *
 * Fan-in pattern position:
 * This component depends on Feature A tests (6.5) and will be
 * combined with Components B and C in the final integration (7.4).
 *
 *   7.1 ──┐
 *   7.2 ──┼── 7.4 (Final Integration)
 *   7.3 ──┘
 *
 * Purpose: A data processing component that builds on the tested
 * FeatureAService to provide higher-level data operations including
 * batch processing, data pipelines, and result aggregation.
 */

const { FeatureAService, DataFormat, FEATURE_A_CONFIG } = require('../services/feature-a-service');

/**
 * Component A Configuration
 */
const COMPONENT_A_CONFIG = {
  name: 'ComponentA',
  version: '1.0.0',
  description: 'Data Processing Component',
  maxConcurrentOperations: 5,
  defaultBatchSize: 100,
  enableMetrics: true,
  retryAttempts: 3
};

/**
 * Operation types supported by Component A
 */
const OperationType = {
  PROCESS: 'process',
  TRANSFORM: 'transform',
  VALIDATE: 'validate',
  AGGREGATE: 'aggregate'
};

/**
 * Component A: High-level data processing operations
 */
class ComponentA {
  constructor(config = {}) {
    this.config = { ...COMPONENT_A_CONFIG, ...config };
    this.featureAService = new FeatureAService({
      maxBatchSize: this.config.defaultBatchSize,
      enableCaching: true
    });
    this.operationQueue = [];
    this.metrics = {
      operationsStarted: 0,
      operationsCompleted: 0,
      operationsFailed: 0,
      totalItemsProcessed: 0,
      averageProcessingTime: 0
    };
    this.running = false;
    this.startTime = null;
  }

  /**
   * Start the component and underlying service
   */
  async start() {
    if (this.running) {
      return { success: false, error: 'Component already running' };
    }

    await this.featureAService.start();
    this.running = true;
    this.startTime = Date.now();

    return {
      success: true,
      message: 'Component A started',
      config: this.config
    };
  }

  /**
   * Stop the component and underlying service
   */
  async stop() {
    if (!this.running) {
      return { success: false, error: 'Component not running' };
    }

    await this.featureAService.stop();
    this.running = false;

    return {
      success: true,
      message: 'Component A stopped',
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
   * Process a single data item
   * @param {Object} data - Data to process
   * @param {Object} options - Processing options
   */
  async processItem(data, options = {}) {
    if (!this.running) {
      return { success: false, error: 'Component not running' };
    }

    const startTime = Date.now();
    this.metrics.operationsStarted++;

    try {
      const result = await this.featureAService.processData(data, options);

      if (result.success) {
        this.metrics.operationsCompleted++;
        this.metrics.totalItemsProcessed++;
        this.updateAverageTime(Date.now() - startTime);
      } else {
        this.metrics.operationsFailed++;
      }

      return {
        success: result.success,
        data: result.data,
        processingTime: Date.now() - startTime,
        error: result.error
      };
    } catch (error) {
      this.metrics.operationsFailed++;
      return {
        success: false,
        error: error.message,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Process a batch of data items
   * @param {Array} items - Array of items to process
   * @param {Object} options - Batch processing options
   */
  async processBatch(items, options = {}) {
    if (!this.running) {
      return { success: false, error: 'Component not running' };
    }

    if (!Array.isArray(items)) {
      return { success: false, error: 'Items must be an array' };
    }

    const batchSize = options.batchSize || this.config.defaultBatchSize;
    const startTime = Date.now();
    const results = [];
    const errors = [];

    // Process in chunks
    for (let i = 0; i < items.length; i += batchSize) {
      const chunk = items.slice(i, i + batchSize);
      const chunkResults = await Promise.all(
        chunk.map(item => this.processItem(item, options))
      );

      chunkResults.forEach((result, index) => {
        if (result.success) {
          results.push(result.data);
        } else {
          errors.push({
            index: i + index,
            error: result.error
          });
        }
      });
    }

    return {
      success: errors.length === 0,
      totalItems: items.length,
      successCount: results.length,
      failureCount: errors.length,
      results,
      errors,
      processingTime: Date.now() - startTime
    };
  }

  /**
   * Transform data to specified format
   * @param {Object|Array} data - Data to transform
   * @param {string} format - Target format
   */
  transformData(data, format = DataFormat.JSON) {
    if (!this.running) {
      return { success: false, error: 'Component not running' };
    }

    return this.featureAService.transformData(data, format);
  }

  /**
   * Validate data against schema
   * @param {Object} data - Data to validate
   * @param {Object} schema - Validation schema
   */
  validateData(data, schema = null) {
    if (!this.running) {
      return { success: false, error: 'Component not running' };
    }

    return this.featureAService.validateData(data, schema);
  }

  /**
   * Aggregate results from multiple operations
   * @param {Array} results - Array of operation results
   */
  aggregateResults(results) {
    if (!Array.isArray(results) || results.length === 0) {
      return {
        success: false,
        error: 'Results must be a non-empty array'
      };
    }

    const aggregated = {
      totalCount: results.length,
      successCount: results.filter(r => r.success).length,
      failureCount: results.filter(r => !r.success).length,
      successRate: 0,
      data: [],
      errors: []
    };

    aggregated.successRate = (aggregated.successCount / aggregated.totalCount * 100).toFixed(2) + '%';

    results.forEach((result, index) => {
      if (result.success && result.data) {
        aggregated.data.push(result.data);
      }
      if (!result.success && result.error) {
        aggregated.errors.push({ index, error: result.error });
      }
    });

    return {
      success: true,
      aggregation: aggregated
    };
  }

  /**
   * Create a data pipeline
   * @param {Array} operations - Array of operation definitions
   */
  createPipeline(operations) {
    if (!Array.isArray(operations)) {
      return { success: false, error: 'Operations must be an array' };
    }

    const pipeline = {
      id: `pipeline_${Date.now()}`,
      operations: operations.map((op, index) => ({
        step: index + 1,
        type: op.type || OperationType.PROCESS,
        options: op.options || {}
      })),
      created: new Date().toISOString()
    };

    return {
      success: true,
      pipeline
    };
  }

  /**
   * Execute a data pipeline on input data
   * @param {Object} pipeline - Pipeline definition
   * @param {Object|Array} inputData - Input data
   */
  async executePipeline(pipeline, inputData) {
    if (!this.running) {
      return { success: false, error: 'Component not running' };
    }

    if (!pipeline || !pipeline.operations) {
      return { success: false, error: 'Invalid pipeline' };
    }

    const startTime = Date.now();
    let currentData = inputData;
    const stepResults = [];

    for (const operation of pipeline.operations) {
      const stepStart = Date.now();
      let stepResult;

      switch (operation.type) {
        case OperationType.PROCESS:
          stepResult = Array.isArray(currentData)
            ? await this.processBatch(currentData, operation.options)
            : await this.processItem(currentData, operation.options);
          break;
        case OperationType.TRANSFORM:
          stepResult = this.transformData(currentData, operation.options.format);
          break;
        case OperationType.VALIDATE:
          stepResult = this.validateData(currentData, operation.options.schema);
          break;
        case OperationType.AGGREGATE:
          stepResult = this.aggregateResults(Array.isArray(currentData) ? currentData : [currentData]);
          break;
        default:
          stepResult = { success: false, error: `Unknown operation type: ${operation.type}` };
      }

      stepResults.push({
        step: operation.step,
        type: operation.type,
        success: stepResult.success,
        duration: Date.now() - stepStart
      });

      if (!stepResult.success) {
        return {
          success: false,
          error: `Pipeline failed at step ${operation.step}`,
          failedStep: operation,
          stepResults,
          processingTime: Date.now() - startTime
        };
      }

      currentData = stepResult.data || stepResult.results || stepResult.aggregation || currentData;
    }

    return {
      success: true,
      pipeline: pipeline.id,
      stepsExecuted: stepResults.length,
      stepResults,
      outputData: currentData,
      processingTime: Date.now() - startTime
    };
  }

  /**
   * Update average processing time
   * @private
   */
  updateAverageTime(newTime) {
    const totalOps = this.metrics.operationsCompleted;
    const currentAvg = this.metrics.averageProcessingTime;
    this.metrics.averageProcessingTime = ((currentAvg * (totalOps - 1)) + newTime) / totalOps;
  }

  /**
   * Get component metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      uptime: this.running ? Date.now() - this.startTime : 0,
      featureAMetrics: this.featureAService.getProcessingMetrics()
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
      metrics: this.getMetrics(),
      featureAInfo: this.featureAService.getInfo()
    };
  }

  /**
   * Clear caches and reset metrics
   */
  reset() {
    this.featureAService.clearCache();
    this.metrics = {
      operationsStarted: 0,
      operationsCompleted: 0,
      operationsFailed: 0,
      totalItemsProcessed: 0,
      averageProcessingTime: 0
    };

    return { success: true, message: 'Component A reset' };
  }
}

module.exports = {
  ComponentA,
  COMPONENT_A_CONFIG,
  OperationType
};
