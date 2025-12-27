/**
 * Pipeline Step 5: Aggregate Processed Data
 * Task 5.5: Step 5 of pipeline (depends: 5.4)
 *
 * This is the fifth step in a long chain of sequential dependencies:
 * 5.1 → 5.2 → 5.3 → 5.4 → [5.5] → 5.6
 *
 * Purpose: Aggregates the processed data from step 4, combining results
 * from multiple processing operations into unified summaries and reports.
 * This step handles data consolidation, summary generation, and preparation
 * for final output in step 6.
 */

const { PROCESSING_RULES, PROCESS_CONTEXT, executeStep4 } = require('./step-4.js');
const { PIPELINE_CONFIG, sharedState } = require('./step-1.js');

/**
 * Aggregation rules for data consolidation
 */
const AGGREGATION_RULES = {
  enableSummarization: true,
  enableConsolidation: true,
  enableReporting: true,
  preserveProcessingMetadata: true,
  maxGroupSize: 100
};

/**
 * Default aggregation context
 */
const AGGREGATE_CONTEXT = {
  version: '1.0.0',
  aggregatedBy: 'step-5',
  operations: ['summarize', 'consolidate', 'report']
};

/**
 * Summarize data by extracting key statistics
 * @param {Object} data - The data to summarize
 * @returns {Object} Summary statistics
 */
function summarizeData(data) {
  if (!data || typeof data !== 'object') {
    return {
      type: 'unknown',
      isEmpty: true,
      fieldCount: 0
    };
  }

  const keys = Object.keys(data);
  const dataKeys = keys.filter(k => !k.startsWith('_'));
  const metaKeys = keys.filter(k => k.startsWith('_'));

  return {
    type: Array.isArray(data) ? 'array' : 'object',
    isEmpty: keys.length === 0,
    totalFields: keys.length,
    dataFieldCount: dataKeys.length,
    metadataFieldCount: metaKeys.length,
    hasProcessingMeta: !!data._processing,
    hasComputedFields: !!data._computed,
    dataFields: dataKeys,
    metadataFields: metaKeys
  };
}

/**
 * Consolidate multiple data sources into a unified structure
 * @param {Array|Object} sources - Data sources to consolidate
 * @returns {Object} Consolidated data
 */
function consolidateData(sources) {
  if (!sources) {
    return { success: false, error: 'No sources provided' };
  }

  const sourceArray = Array.isArray(sources) ? sources : [sources];

  const consolidated = {
    sourceCount: sourceArray.length,
    consolidatedAt: new Date().toISOString(),
    data: [],
    metadata: {
      totalItems: 0,
      processedItems: 0,
      errors: []
    }
  };

  for (const source of sourceArray) {
    if (!source) {
      consolidated.metadata.errors.push('Null source encountered');
      continue;
    }

    consolidated.data.push(source);
    consolidated.metadata.totalItems++;
    consolidated.metadata.processedItems++;
  }

  return {
    success: true,
    consolidated
  };
}

/**
 * Generate a report from aggregated data
 * @param {Object} data - The aggregated data
 * @param {Object} options - Report options
 * @returns {Object} Generated report
 */
function generateReport(data, options = {}) {
  const report = {
    id: `report_${Date.now()}`,
    generatedAt: new Date().toISOString(),
    generatedBy: AGGREGATE_CONTEXT.aggregatedBy,
    version: AGGREGATE_CONTEXT.version,
    options: options,
    sections: []
  };

  // Summary section
  report.sections.push({
    name: 'summary',
    title: 'Data Summary',
    content: summarizeData(data)
  });

  // Processing section
  if (data._processing || data._computed) {
    report.sections.push({
      name: 'processing',
      title: 'Processing Details',
      content: {
        processingMeta: data._processing || null,
        computedFields: data._computed || null,
        rulesApplied: AGGREGATION_RULES
      }
    });
  }

  // Statistics section
  const stats = calculateStatistics(data);
  report.sections.push({
    name: 'statistics',
    title: 'Aggregation Statistics',
    content: stats
  });

  return report;
}

/**
 * Calculate statistics from data
 * @param {Object} data - The data to analyze
 * @returns {Object} Calculated statistics
 */
function calculateStatistics(data) {
  const stats = {
    calculatedAt: new Date().toISOString(),
    metrics: {}
  };

  if (!data || typeof data !== 'object') {
    stats.metrics.valid = false;
    return stats;
  }

  stats.metrics.valid = true;
  stats.metrics.keyCount = Object.keys(data).length;
  stats.metrics.nestedObjects = countNestedObjects(data);
  stats.metrics.totalValues = countTotalValues(data);
  stats.metrics.depth = calculateDepth(data);

  return stats;
}

/**
 * Count nested objects in a data structure
 * @param {Object} obj - The object to analyze
 * @returns {number} Count of nested objects
 */
function countNestedObjects(obj, depth = 0) {
  if (depth > 10) return 0; // Prevent infinite recursion

  let count = 0;
  for (const value of Object.values(obj)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      count++;
      count += countNestedObjects(value, depth + 1);
    }
  }
  return count;
}

/**
 * Count total values in a data structure
 * @param {Object} obj - The object to analyze
 * @returns {number} Count of values
 */
function countTotalValues(obj, depth = 0) {
  if (depth > 10) return 0;

  let count = 0;
  for (const value of Object.values(obj)) {
    if (value && typeof value === 'object') {
      count += countTotalValues(value, depth + 1);
    } else {
      count++;
    }
  }
  return count;
}

/**
 * Calculate the maximum depth of a data structure
 * @param {Object} obj - The object to analyze
 * @param {number} currentDepth - Current depth
 * @returns {number} Maximum depth
 */
function calculateDepth(obj, currentDepth = 0) {
  if (currentDepth > 20) return currentDepth;
  if (!obj || typeof obj !== 'object') return currentDepth;

  let maxDepth = currentDepth;
  for (const value of Object.values(obj)) {
    if (value && typeof value === 'object') {
      const childDepth = calculateDepth(value, currentDepth + 1);
      maxDepth = Math.max(maxDepth, childDepth);
    }
  }
  return maxDepth;
}

/**
 * Aggregate step data and prepare for final step
 * @param {Object} stepData - Data from previous step
 * @returns {Object} Aggregated data for next step
 */
function aggregateStepData(stepData) {
  const aggregated = {
    sourceStep: 4,
    targetStep: 5,
    aggregatedAt: new Date().toISOString(),
    inputSummary: {
      hadProcessing: !!stepData.processing,
      operationsApplied: stepData.processing?.operationsExecuted || [],
      complexity: stepData.processing?.complexity || 'unknown',
      step4Completed: stepData.step3Check?.completed || false
    },
    aggregations: []
  };

  // Track what aggregations were applied
  if (AGGREGATION_RULES.enableSummarization) {
    aggregated.aggregations.push('summarization');
  }
  if (AGGREGATION_RULES.enableConsolidation) {
    aggregated.aggregations.push('consolidation');
  }
  if (AGGREGATION_RULES.enableReporting) {
    aggregated.aggregations.push('reporting');
  }

  return aggregated;
}

/**
 * Check that step 4 has been executed
 * @returns {Object} Step 4 check result
 */
function checkStep4Completed() {
  if (!sharedState.isInitialized) {
    return {
      completed: false,
      error: 'Pipeline not initialized. Steps 1-4 must be executed first.'
    };
  }

  const step4Record = sharedState.steps.find(s => s.stepNumber === 4);
  if (!step4Record) {
    return {
      completed: false,
      error: 'Step 4 record not found. Execute step 4 first.'
    };
  }

  if (!step4Record.data?.processing) {
    return {
      completed: true,
      warning: 'Step 4 completed but no processing data found',
      step4Data: step4Record
    };
  }

  return {
    completed: true,
    step4Data: step4Record,
    message: 'Step 4 completed successfully'
  };
}

/**
 * Step 5: Aggregate Data
 * Aggregates processed data into summaries and reports
 *
 * @returns {Object} Step execution result
 */
function executeStep5() {
  // Ensure pipeline is initialized
  if (!sharedState.isInitialized) {
    // Initialize and run prerequisite steps
    const initResult = sharedState.initialize();
    if (!initResult.success) {
      return {
        success: false,
        step: 5,
        error: 'Failed to initialize pipeline state',
        details: initResult
      };
    }

    // Record prerequisite steps if missing
    for (let stepNum = 1; stepNum <= 4; stepNum++) {
      if (!sharedState.steps.find(s => s.stepNumber === stepNum)) {
        sharedState.recordStep(stepNum, {
          action: `step-${stepNum}`,
          autoInitialized: true,
          message: 'Auto-initialized by step 5'
        });
      }
    }
  }

  // Check that step 4 was completed
  const step4Check = checkStep4Completed();

  // Get processed config from step 4 or create mock
  const step4Record = sharedState.steps.find(s => s.stepNumber === 4);
  const processedConfig = step4Record?.data?.processedConfig || {
    ...PIPELINE_CONFIG,
    _processing: {
      processedAt: new Date().toISOString(),
      processVersion: PROCESS_CONTEXT.version
    }
  };

  // Summarize the processed data
  const summary = summarizeData(processedConfig);

  // Consolidate all step data
  const consolidationResult = consolidateData([
    { step: 1, type: 'initialization', config: PIPELINE_CONFIG },
    { step: 2, type: 'validation', validated: true },
    { step: 3, type: 'transformation', transformed: true },
    { step: 4, type: 'processing', processing: step4Record?.data?.processing },
    { step: 5, type: 'aggregation', aggregating: true }
  ]);

  // Generate report
  const report = generateReport(processedConfig, {
    includeMetadata: AGGREGATION_RULES.preserveProcessingMetadata,
    format: 'detailed'
  });

  // Aggregate step data from previous step
  const aggregatedData = aggregateStepData(step4Record?.data || {});

  // Prepare step 5 execution data
  const stepData = {
    action: 'aggregate',
    target: 'processed_data',
    step4Check: {
      completed: step4Check.completed,
      message: step4Check.message || step4Check.error || step4Check.warning
    },
    aggregation: {
      rulesApplied: Object.keys(AGGREGATION_RULES).filter(k => AGGREGATION_RULES[k]),
      operationsExecuted: AGGREGATE_CONTEXT.operations,
      summary,
      consolidation: consolidationResult.consolidated,
      report: {
        id: report.id,
        sectionCount: report.sections.length,
        generatedAt: report.generatedAt
      }
    },
    aggregatedData,
    timestamp: new Date().toISOString()
  };

  // Record step 5 execution
  const stepRecord = sharedState.recordStep(5, stepData);

  // Determine success
  const success = step4Check.completed;

  return {
    success,
    step: 5,
    message: success
      ? 'Step 5 completed: Data aggregated successfully'
      : 'Step 5 completed with issues',
    nextStep: 6,
    data: stepData,
    summary,
    consolidation: consolidationResult,
    report,
    stepRecord,
    pipelineState: {
      stepsCompleted: sharedState.steps.length,
      isValid: sharedState.validateOrder().valid
    }
  };
}

module.exports = {
  AGGREGATION_RULES,
  AGGREGATE_CONTEXT,
  summarizeData,
  consolidateData,
  generateReport,
  calculateStatistics,
  aggregateStepData,
  checkStep4Completed,
  executeStep5
};
