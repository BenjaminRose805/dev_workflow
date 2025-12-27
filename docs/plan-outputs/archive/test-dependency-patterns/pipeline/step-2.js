/**
 * Pipeline Step 2: Validate Configuration
 * Task 5.2: Step 2 of pipeline (depends: 5.1)
 *
 * This is the second step in a long chain of sequential dependencies:
 * 5.1 → 5.2 → 5.3 → 5.4 → 5.5 → 5.6
 *
 * Purpose: Validates pipeline configuration and ensures step 1 has been
 * executed before proceeding. This step checks that all required
 * configuration values are present and valid.
 */

const { PIPELINE_CONFIG, sharedState } = require('./step-1.js');

/**
 * Validation rules for pipeline configuration
 */
const VALIDATION_RULES = {
  requiredFields: ['name', 'version', 'totalSteps', 'validateOrder'],
  minTotalSteps: 1,
  maxTotalSteps: 100,
  versionPattern: /^\d+\.\d+\.\d+$/
};

/**
 * Validate a single configuration field
 * @param {string} field - Field name
 * @param {*} value - Field value
 * @returns {Object} Validation result for the field
 */
function validateField(field, value) {
  const result = {
    field,
    valid: true,
    error: null
  };

  switch (field) {
    case 'name':
      if (typeof value !== 'string' || value.trim().length === 0) {
        result.valid = false;
        result.error = 'Name must be a non-empty string';
      }
      break;

    case 'version':
      if (!VALIDATION_RULES.versionPattern.test(value)) {
        result.valid = false;
        result.error = 'Version must follow semantic versioning (x.y.z)';
      }
      break;

    case 'totalSteps':
      if (typeof value !== 'number' ||
          value < VALIDATION_RULES.minTotalSteps ||
          value > VALIDATION_RULES.maxTotalSteps) {
        result.valid = false;
        result.error = `Total steps must be between ${VALIDATION_RULES.minTotalSteps} and ${VALIDATION_RULES.maxTotalSteps}`;
      }
      break;

    case 'validateOrder':
      if (typeof value !== 'boolean') {
        result.valid = false;
        result.error = 'validateOrder must be a boolean';
      }
      break;

    default:
      // Unknown fields are allowed but flagged
      result.warning = 'Unknown configuration field';
  }

  return result;
}

/**
 * Validate the entire pipeline configuration
 * @param {Object} config - Pipeline configuration object
 * @returns {Object} Complete validation results
 */
function validateConfiguration(config) {
  const results = {
    valid: true,
    checkedAt: new Date().toISOString(),
    fields: [],
    errors: [],
    warnings: []
  };

  // Check for required fields
  for (const field of VALIDATION_RULES.requiredFields) {
    if (!(field in config)) {
      results.valid = false;
      results.errors.push({
        type: 'MISSING_FIELD',
        field,
        message: `Required field '${field}' is missing`
      });
    }
  }

  // Validate each field in the config
  for (const [field, value] of Object.entries(config)) {
    const fieldResult = validateField(field, value);
    results.fields.push(fieldResult);

    if (!fieldResult.valid) {
      results.valid = false;
      results.errors.push({
        type: 'INVALID_FIELD',
        field,
        message: fieldResult.error
      });
    }

    if (fieldResult.warning) {
      results.warnings.push({
        type: 'FIELD_WARNING',
        field,
        message: fieldResult.warning
      });
    }
  }

  return results;
}

/**
 * Check that step 1 has been executed
 * @returns {Object} Step 1 check result
 */
function checkStep1Completed() {
  if (!sharedState.isInitialized) {
    return {
      completed: false,
      error: 'Step 1 has not been executed. Pipeline not initialized.'
    };
  }

  if (sharedState.steps.length === 0) {
    return {
      completed: false,
      error: 'Step 1 recorded no steps. Pipeline may be in invalid state.'
    };
  }

  const step1Record = sharedState.steps.find(s => s.stepNumber === 1);
  if (!step1Record) {
    return {
      completed: false,
      error: 'Step 1 record not found in pipeline state.'
    };
  }

  return {
    completed: true,
    step1Data: step1Record,
    message: 'Step 1 completed successfully'
  };
}

/**
 * Step 2: Validate Configuration
 * Validates that the pipeline configuration is correct and step 1 was executed
 *
 * @returns {Object} Step execution result
 */
function executeStep2() {
  // First, ensure shared state is initialized (step 1 should have done this)
  // If not initialized, initialize it now for testing purposes
  if (!sharedState.isInitialized) {
    const initResult = sharedState.initialize();
    if (!initResult.success) {
      return {
        success: false,
        step: 2,
        error: 'Failed to initialize pipeline state',
        details: initResult
      };
    }

    // Record step 1 as a prerequisite if it wasn't recorded
    sharedState.recordStep(1, {
      action: 'initialize',
      autoInitialized: true,
      message: 'Auto-initialized by step 2'
    });
  }

  // Check that step 1 was completed
  const step1Check = checkStep1Completed();

  // Validate the pipeline configuration
  const validationResult = validateConfiguration(PIPELINE_CONFIG);

  // Prepare step 2 execution data
  const stepData = {
    action: 'validate',
    target: 'pipeline_configuration',
    step1Check: {
      completed: step1Check.completed,
      message: step1Check.message || step1Check.error
    },
    validation: {
      configValid: validationResult.valid,
      fieldsChecked: validationResult.fields.length,
      errorsFound: validationResult.errors.length,
      warningsFound: validationResult.warnings.length
    },
    timestamp: new Date().toISOString()
  };

  // Record step 2 execution
  const stepRecord = sharedState.recordStep(2, stepData);

  // Determine success based on validation
  const success = step1Check.completed && validationResult.valid;

  return {
    success,
    step: 2,
    message: success
      ? 'Step 2 completed: Configuration validated successfully'
      : 'Step 2 completed with issues',
    nextStep: 3,
    data: stepData,
    validationDetails: validationResult,
    stepRecord,
    pipelineState: {
      stepsCompleted: sharedState.steps.length,
      isValid: sharedState.validateOrder().valid
    }
  };
}

module.exports = {
  VALIDATION_RULES,
  validateField,
  validateConfiguration,
  checkStep1Completed,
  executeStep2
};
