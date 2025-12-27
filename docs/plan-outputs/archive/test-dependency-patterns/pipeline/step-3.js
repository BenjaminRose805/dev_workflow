/**
 * Pipeline Step 3: Transform Data
 * Task 5.3: Step 3 of pipeline (depends: 5.2)
 *
 * This is the third step in a long chain of sequential dependencies:
 * 5.1 → 5.2 → [5.3] → 5.4 → 5.5 → 5.6
 *
 * Purpose: Transforms validated configuration data from step 2 into
 * an intermediate format suitable for processing in subsequent steps.
 * This step applies normalization, enrichment, and restructuring.
 */

const { VALIDATION_RULES, executeStep2 } = require('./step-2.js');
const { PIPELINE_CONFIG, sharedState } = require('./step-1.js');

/**
 * Transformation rules for different data types
 */
const TRANSFORMATION_RULES = {
  normalizeStrings: true,
  enrichWithMetadata: true,
  flattenNested: false,
  preserveOriginal: true
};

/**
 * Default transformation context
 */
const TRANSFORM_CONTEXT = {
  version: '1.0.0',
  transformedBy: 'step-3',
  preserveFields: ['name', 'version', 'totalSteps']
};

/**
 * Normalize a string value
 * @param {string} value - The string to normalize
 * @returns {string} Normalized string
 */
function normalizeString(value) {
  if (typeof value !== 'string') {
    return value;
  }
  return value.trim().toLowerCase().replace(/\s+/g, '_');
}

/**
 * Enrich data with metadata
 * @param {Object} data - The data to enrich
 * @param {Object} context - Transformation context
 * @returns {Object} Enriched data
 */
function enrichWithMetadata(data, context = {}) {
  return {
    ...data,
    _metadata: {
      transformedAt: new Date().toISOString(),
      transformVersion: context.version || TRANSFORM_CONTEXT.version,
      transformedBy: context.transformedBy || TRANSFORM_CONTEXT.transformedBy,
      originalFields: Object.keys(data)
    }
  };
}

/**
 * Transform configuration data
 * @param {Object} config - Configuration to transform
 * @param {Object} options - Transformation options
 * @returns {Object} Transformed configuration
 */
function transformConfiguration(config, options = {}) {
  const rules = { ...TRANSFORMATION_RULES, ...options };
  let transformed = { ...config };

  // Step 1: Normalize string fields if enabled
  if (rules.normalizeStrings) {
    const normalizedFields = {};
    for (const [key, value] of Object.entries(transformed)) {
      if (typeof value === 'string' && !TRANSFORM_CONTEXT.preserveFields.includes(key)) {
        normalizedFields[key] = normalizeString(value);
      } else {
        normalizedFields[key] = value;
      }
    }
    transformed = normalizedFields;
  }

  // Step 2: Preserve original if enabled
  if (rules.preserveOriginal) {
    transformed._original = { ...config };
  }

  // Step 3: Enrich with metadata if enabled
  if (rules.enrichWithMetadata) {
    transformed = enrichWithMetadata(transformed, TRANSFORM_CONTEXT);
  }

  return transformed;
}

/**
 * Process step data and prepare for next step
 * @param {Object} stepData - Data from previous step
 * @returns {Object} Processed data for next step
 */
function processStepData(stepData) {
  const processed = {
    sourceStep: 2,
    targetStep: 3,
    processedAt: new Date().toISOString(),
    inputSummary: {
      hadValidation: !!stepData.validation,
      configWasValid: stepData.validation?.configValid || false,
      step1Completed: stepData.step1Check?.completed || false
    },
    transformations: []
  };

  // Track what transformations were applied
  if (TRANSFORMATION_RULES.normalizeStrings) {
    processed.transformations.push('normalize_strings');
  }
  if (TRANSFORMATION_RULES.enrichWithMetadata) {
    processed.transformations.push('enrich_metadata');
  }
  if (TRANSFORMATION_RULES.preserveOriginal) {
    processed.transformations.push('preserve_original');
  }

  return processed;
}

/**
 * Check that step 2 has been executed
 * @returns {Object} Step 2 check result
 */
function checkStep2Completed() {
  if (!sharedState.isInitialized) {
    return {
      completed: false,
      error: 'Pipeline not initialized. Step 1 and 2 must be executed first.'
    };
  }

  const step2Record = sharedState.steps.find(s => s.stepNumber === 2);
  if (!step2Record) {
    return {
      completed: false,
      error: 'Step 2 record not found. Execute step 2 first.'
    };
  }

  if (step2Record.data?.validation?.configValid === false) {
    return {
      completed: true,
      warning: 'Step 2 completed but configuration validation failed',
      step2Data: step2Record
    };
  }

  return {
    completed: true,
    step2Data: step2Record,
    message: 'Step 2 completed successfully'
  };
}

/**
 * Step 3: Transform Data
 * Transforms validated configuration into intermediate format
 *
 * @returns {Object} Step execution result
 */
function executeStep3() {
  // Ensure pipeline is initialized
  if (!sharedState.isInitialized) {
    // Initialize and run prerequisite steps
    const initResult = sharedState.initialize();
    if (!initResult.success) {
      return {
        success: false,
        step: 3,
        error: 'Failed to initialize pipeline state',
        details: initResult
      };
    }

    // Record prerequisite steps if missing
    if (!sharedState.steps.find(s => s.stepNumber === 1)) {
      sharedState.recordStep(1, {
        action: 'initialize',
        autoInitialized: true,
        message: 'Auto-initialized by step 3'
      });
    }

    if (!sharedState.steps.find(s => s.stepNumber === 2)) {
      sharedState.recordStep(2, {
        action: 'validate',
        autoInitialized: true,
        message: 'Auto-initialized by step 3'
      });
    }
  }

  // Check that step 2 was completed
  const step2Check = checkStep2Completed();

  // Transform the pipeline configuration
  const transformedConfig = transformConfiguration(PIPELINE_CONFIG);

  // Process step data from previous step
  const step2Record = sharedState.steps.find(s => s.stepNumber === 2);
  const processedData = processStepData(step2Record?.data || {});

  // Prepare step 3 execution data
  const stepData = {
    action: 'transform',
    target: 'pipeline_data',
    step2Check: {
      completed: step2Check.completed,
      message: step2Check.message || step2Check.error || step2Check.warning
    },
    transformation: {
      rulesApplied: Object.keys(TRANSFORMATION_RULES).filter(k => TRANSFORMATION_RULES[k]),
      fieldsTransformed: Object.keys(transformedConfig).filter(k => !k.startsWith('_')),
      hasMetadata: !!transformedConfig._metadata,
      hasOriginal: !!transformedConfig._original
    },
    processedData,
    timestamp: new Date().toISOString()
  };

  // Record step 3 execution
  const stepRecord = sharedState.recordStep(3, stepData);

  // Determine success
  const success = step2Check.completed;

  return {
    success,
    step: 3,
    message: success
      ? 'Step 3 completed: Data transformed successfully'
      : 'Step 3 completed with issues',
    nextStep: 4,
    data: stepData,
    transformedConfig,
    stepRecord,
    pipelineState: {
      stepsCompleted: sharedState.steps.length,
      isValid: sharedState.validateOrder().valid
    }
  };
}

module.exports = {
  TRANSFORMATION_RULES,
  TRANSFORM_CONTEXT,
  normalizeString,
  enrichWithMetadata,
  transformConfiguration,
  processStepData,
  checkStep2Completed,
  executeStep3
};
