/**
 * Pipeline Step 1: Initialize Pipeline
 * Task 5.1: Step 1 of pipeline
 *
 * This is the first step in a long chain of sequential dependencies:
 * 5.1 → 5.2 → 5.3 → 5.4 → 5.5 → 5.6
 *
 * Purpose: Validates that the orchestrator correctly handles long
 * sequential dependency chains where each step must complete before
 * the next can begin.
 */

/**
 * Pipeline configuration for the sequential chain
 */
const PIPELINE_CONFIG = {
  name: 'Sequential Pipeline Test',
  version: '1.0.0',
  totalSteps: 6,
  currentStep: 1,
  validateOrder: true
};

/**
 * Pipeline state management
 * Tracks execution order and timing
 */
class PipelineState {
  constructor() {
    this.steps = [];
    this.startTime = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the pipeline state
   * @returns {Object} Initialization result
   */
  initialize() {
    if (this.isInitialized) {
      return {
        success: false,
        error: 'Pipeline already initialized'
      };
    }

    this.startTime = new Date().toISOString();
    this.isInitialized = true;

    return {
      success: true,
      startTime: this.startTime,
      message: 'Pipeline initialized successfully'
    };
  }

  /**
   * Record a step execution
   * @param {number} stepNumber - Step number (1-6)
   * @param {Object} data - Step execution data
   */
  recordStep(stepNumber, data) {
    if (!this.isInitialized) {
      throw new Error('Pipeline not initialized. Call initialize() first.');
    }

    const stepRecord = {
      stepNumber,
      timestamp: new Date().toISOString(),
      data,
      duration: null
    };

    // Calculate duration from previous step
    if (this.steps.length > 0) {
      const prevStep = this.steps[this.steps.length - 1];
      const prevTime = new Date(prevStep.timestamp);
      const currTime = new Date(stepRecord.timestamp);
      stepRecord.duration = currTime - prevTime;
    }

    this.steps.push(stepRecord);
    return stepRecord;
  }

  /**
   * Get execution summary
   * @returns {Object} Pipeline execution summary
   */
  getSummary() {
    return {
      config: PIPELINE_CONFIG,
      startTime: this.startTime,
      stepsCompleted: this.steps.length,
      totalDuration: this.calculateTotalDuration(),
      steps: this.steps.map(s => ({
        step: s.stepNumber,
        duration: s.duration ? `${s.duration}ms` : 'N/A'
      }))
    };
  }

  /**
   * Calculate total pipeline duration
   * @returns {number|null} Total duration in ms
   */
  calculateTotalDuration() {
    if (!this.startTime || this.steps.length === 0) {
      return null;
    }

    const start = new Date(this.startTime);
    const lastStep = this.steps[this.steps.length - 1];
    const end = new Date(lastStep.timestamp);
    return end - start;
  }

  /**
   * Validate execution order
   * @returns {Object} Validation result
   */
  validateOrder() {
    const errors = [];

    for (let i = 1; i < this.steps.length; i++) {
      const prev = this.steps[i - 1];
      const curr = this.steps[i];

      // Check step numbers are sequential
      if (curr.stepNumber !== prev.stepNumber + 1) {
        errors.push({
          type: 'ORDER_VIOLATION',
          expected: prev.stepNumber + 1,
          actual: curr.stepNumber,
          message: `Step ${curr.stepNumber} executed after step ${prev.stepNumber}`
        });
      }

      // Check timestamps are sequential
      if (new Date(curr.timestamp) < new Date(prev.timestamp)) {
        errors.push({
          type: 'TIMESTAMP_VIOLATION',
          step: curr.stepNumber,
          message: `Step ${curr.stepNumber} timestamp is before step ${prev.stepNumber}`
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

/**
 * Step 1: Initialize the pipeline
 * This is the entry point for the sequential chain
 */
function executeStep1() {
  const state = new PipelineState();

  // Initialize pipeline
  const initResult = state.initialize();
  if (!initResult.success) {
    return {
      success: false,
      step: 1,
      error: initResult.error
    };
  }

  // Record step 1 execution
  const stepData = {
    action: 'initialize',
    config: PIPELINE_CONFIG,
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      timestamp: new Date().toISOString()
    }
  };

  state.recordStep(1, stepData);

  return {
    success: true,
    step: 1,
    message: 'Step 1 completed: Pipeline initialized',
    state: state,
    nextStep: 2,
    data: stepData
  };
}

/**
 * Create a shared state instance for pipeline execution
 * Used by subsequent steps (5.2 - 5.6)
 */
const sharedState = new PipelineState();

module.exports = {
  PIPELINE_CONFIG,
  PipelineState,
  executeStep1,
  sharedState
};
