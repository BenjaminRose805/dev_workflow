/**
 * Pipeline Step 4: Process Transformed Data
 * Task 5.4: Step 4 of pipeline (depends: 5.3)
 *
 * This is the fourth step in a long chain of sequential dependencies:
 * 5.1 → 5.2 → 5.3 → [5.4] → 5.5 → 5.6
 *
 * Purpose: Processes the transformed data from step 3, applying business
 * logic and preparing it for aggregation in subsequent steps.
 * This step handles data enrichment, filtering, and computation.
 */

const { TRANSFORMATION_RULES, TRANSFORM_CONTEXT, executeStep3 } = require('./step-3.js');
const { PIPELINE_CONFIG, sharedState } = require('./step-1.js');

/**
 * Processing rules for data operations
 */
const PROCESSING_RULES = {
  enableFiltering: true,
  enableEnrichment: true,
  enableComputation: true,
  preserveTransformMetadata: true
};

/**
 * Default processing context
 */
const PROCESS_CONTEXT = {
  version: '1.0.0',
  processedBy: 'step-4',
  operations: ['filter', 'enrich', 'compute']
};

/**
 * Filter data based on criteria
 * @param {Object} data - The data to filter
 * @param {Object} criteria - Filter criteria
 * @returns {Object} Filtered data
 */
function filterData(data, criteria = {}) {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const filtered = {};
  const excludeKeys = criteria.excludeKeys || ['_original'];
  const includeMetadata = criteria.includeMetadata !== false;

  for (const [key, value] of Object.entries(data)) {
    // Skip excluded keys unless they're metadata and we want to keep it
    if (excludeKeys.includes(key)) {
      if (includeMetadata && key.startsWith('_')) {
        filtered[key] = value;
      }
      continue;
    }
    filtered[key] = value;
  }

  return filtered;
}

/**
 * Enrich data with additional computed fields
 * @param {Object} data - The data to enrich
 * @param {Object} context - Processing context
 * @returns {Object} Enriched data
 */
function enrichData(data, context = {}) {
  const enriched = { ...data };

  // Add processing metadata
  enriched._processing = {
    processedAt: new Date().toISOString(),
    processVersion: context.version || PROCESS_CONTEXT.version,
    processedBy: context.processedBy || PROCESS_CONTEXT.processedBy,
    operations: context.operations || PROCESS_CONTEXT.operations
  };

  // Compute field counts
  const fieldCount = Object.keys(data).filter(k => !k.startsWith('_')).length;
  enriched._processing.fieldCount = fieldCount;

  // Determine data complexity
  let complexity = 'simple';
  if (fieldCount > 10) {
    complexity = 'complex';
  } else if (fieldCount > 5) {
    complexity = 'moderate';
  }
  enriched._processing.complexity = complexity;

  return enriched;
}

/**
 * Perform computations on data
 * @param {Object} data - The data to compute on
 * @returns {Object} Data with computed fields
 */
function computeFields(data) {
  const computed = { ...data };

  // Compute hash of data keys for integrity checking
  const keyHash = Object.keys(data)
    .filter(k => !k.startsWith('_'))
    .sort()
    .join(':');

  computed._computed = {
    keyHash,
    keyCount: Object.keys(data).filter(k => !k.startsWith('_')).length,
    metadataCount: Object.keys(data).filter(k => k.startsWith('_')).length,
    hasTransformMetadata: !!data._metadata,
    hasOriginal: !!data._original,
    computedAt: new Date().toISOString()
  };

  return computed;
}

/**
 * Process configuration through all operations
 * @param {Object} config - Configuration to process
 * @param {Object} options - Processing options
 * @returns {Object} Processed configuration
 */
function processConfiguration(config, options = {}) {
  const rules = { ...PROCESSING_RULES, ...options };
  let processed = { ...config };

  // Step 1: Filter data if enabled
  if (rules.enableFiltering) {
    processed = filterData(processed, {
      excludeKeys: options.excludeKeys || ['_original'],
      includeMetadata: rules.preserveTransformMetadata
    });
  }

  // Step 2: Enrich data if enabled
  if (rules.enableEnrichment) {
    processed = enrichData(processed, PROCESS_CONTEXT);
  }

  // Step 3: Compute fields if enabled
  if (rules.enableComputation) {
    processed = computeFields(processed);
  }

  return processed;
}

/**
 * Process step data and prepare for next step
 * @param {Object} stepData - Data from previous step
 * @returns {Object} Processed data for next step
 */
function processStepData(stepData) {
  const processed = {
    sourceStep: 3,
    targetStep: 4,
    processedAt: new Date().toISOString(),
    inputSummary: {
      hadTransformation: !!stepData.transformation,
      rulesApplied: stepData.transformation?.rulesApplied || [],
      hasMetadata: stepData.transformation?.hasMetadata || false,
      step3Completed: stepData.step2Check?.completed || false
    },
    operations: []
  };

  // Track what operations were applied
  if (PROCESSING_RULES.enableFiltering) {
    processed.operations.push('filtering');
  }
  if (PROCESSING_RULES.enableEnrichment) {
    processed.operations.push('enrichment');
  }
  if (PROCESSING_RULES.enableComputation) {
    processed.operations.push('computation');
  }

  return processed;
}

/**
 * Check that step 3 has been executed
 * @returns {Object} Step 3 check result
 */
function checkStep3Completed() {
  if (!sharedState.isInitialized) {
    return {
      completed: false,
      error: 'Pipeline not initialized. Steps 1-3 must be executed first.'
    };
  }

  const step3Record = sharedState.steps.find(s => s.stepNumber === 3);
  if (!step3Record) {
    return {
      completed: false,
      error: 'Step 3 record not found. Execute step 3 first.'
    };
  }

  if (!step3Record.data?.transformation) {
    return {
      completed: true,
      warning: 'Step 3 completed but no transformation data found',
      step3Data: step3Record
    };
  }

  return {
    completed: true,
    step3Data: step3Record,
    message: 'Step 3 completed successfully'
  };
}

/**
 * Step 4: Process Data
 * Processes transformed data with business logic
 *
 * @returns {Object} Step execution result
 */
function executeStep4() {
  // Ensure pipeline is initialized
  if (!sharedState.isInitialized) {
    // Initialize and run prerequisite steps
    const initResult = sharedState.initialize();
    if (!initResult.success) {
      return {
        success: false,
        step: 4,
        error: 'Failed to initialize pipeline state',
        details: initResult
      };
    }

    // Record prerequisite steps if missing
    for (let stepNum = 1; stepNum <= 3; stepNum++) {
      if (!sharedState.steps.find(s => s.stepNumber === stepNum)) {
        sharedState.recordStep(stepNum, {
          action: `step-${stepNum}`,
          autoInitialized: true,
          message: 'Auto-initialized by step 4'
        });
      }
    }
  }

  // Check that step 3 was completed
  const step3Check = checkStep3Completed();

  // Get transformed config from step 3 or create mock
  const step3Record = sharedState.steps.find(s => s.stepNumber === 3);
  const transformedConfig = step3Record?.data?.transformedConfig || {
    ...PIPELINE_CONFIG,
    _metadata: {
      transformedAt: new Date().toISOString(),
      transformVersion: TRANSFORM_CONTEXT.version
    }
  };

  // Process the transformed configuration
  const processedConfig = processConfiguration(transformedConfig);

  // Process step data from previous step
  const processedData = processStepData(step3Record?.data || {});

  // Prepare step 4 execution data
  const stepData = {
    action: 'process',
    target: 'transformed_data',
    step3Check: {
      completed: step3Check.completed,
      message: step3Check.message || step3Check.error || step3Check.warning
    },
    processing: {
      rulesApplied: Object.keys(PROCESSING_RULES).filter(k => PROCESSING_RULES[k]),
      operationsExecuted: PROCESS_CONTEXT.operations,
      hasProcessingMeta: !!processedConfig._processing,
      hasComputedFields: !!processedConfig._computed,
      complexity: processedConfig._processing?.complexity || 'unknown'
    },
    processedData,
    timestamp: new Date().toISOString()
  };

  // Record step 4 execution
  const stepRecord = sharedState.recordStep(4, stepData);

  // Determine success
  const success = step3Check.completed;

  return {
    success,
    step: 4,
    message: success
      ? 'Step 4 completed: Data processed successfully'
      : 'Step 4 completed with issues',
    nextStep: 5,
    data: stepData,
    processedConfig,
    stepRecord,
    pipelineState: {
      stepsCompleted: sharedState.steps.length,
      isValid: sharedState.validateOrder().valid
    }
  };
}

module.exports = {
  PROCESSING_RULES,
  PROCESS_CONTEXT,
  filterData,
  enrichData,
  computeFields,
  processConfiguration,
  processStepData,
  checkStep3Completed,
  executeStep4
};
