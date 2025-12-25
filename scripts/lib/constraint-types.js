/**
 * @module constraint-types
 * @description Type definitions for execution constraint metadata
 *
 * This module defines the data structures used to represent [SEQUENTIAL]
 * and other execution constraints parsed from plan files.
 *
 * ## Usage
 *
 * ```javascript
 * const { createSequentialConstraint, createExecutionConstraints } = require('./constraint-types');
 *
 * // Create a sequential constraint from parsed annotation
 * const constraint = createSequentialConstraint(['3.1', '3.2', '3.3', '3.4'], 'all modify same file');
 *
 * // Create execution constraints for a specific task
 * const taskConstraints = createExecutionConstraints(true, '3.1-3.4', 'all modify same file');
 * ```
 */

/**
 * @typedef {Object} SequentialConstraint
 * @property {string} taskRange - The original range string (e.g., "3.1-3.4")
 * @property {string[]} taskIds - Array of task IDs in the sequential group
 * @property {string} reason - Reason for the sequential constraint
 */

/**
 * @typedef {Object} ExecutionConstraints
 * @property {boolean} sequential - Whether this task must run sequentially
 * @property {string} [sequentialGroup] - The group identifier (e.g., "3.1-3.4")
 * @property {string} [reason] - Reason for the constraint
 */

/**
 * Create a SequentialConstraint object
 * @param {string[]} taskIds - Array of task IDs in the sequential group
 * @param {string} reason - Reason for the sequential constraint
 * @param {string} [taskRange] - Original range string (auto-generated if not provided)
 * @returns {SequentialConstraint}
 */
function createSequentialConstraint(taskIds, reason, taskRange) {
  if (!Array.isArray(taskIds) || taskIds.length === 0) {
    throw new Error('taskIds must be a non-empty array');
  }

  // Auto-generate taskRange if not provided
  const range = taskRange || (
    taskIds.length === 1
      ? taskIds[0]
      : `${taskIds[0]}-${taskIds[taskIds.length - 1]}`
  );

  return {
    taskRange: range,
    taskIds: [...taskIds], // Copy to prevent mutation
    reason: reason || ''
  };
}

/**
 * Create an ExecutionConstraints object for a task
 * @param {boolean} sequential - Whether this task must run sequentially
 * @param {string} [sequentialGroup] - The group identifier
 * @param {string} [reason] - Reason for the constraint
 * @returns {ExecutionConstraints}
 */
function createExecutionConstraints(sequential, sequentialGroup, reason) {
  const constraints = {
    sequential: Boolean(sequential)
  };

  if (sequentialGroup) {
    constraints.sequentialGroup = sequentialGroup;
  }

  if (reason) {
    constraints.reason = reason;
  }

  return constraints;
}

/**
 * Check if constraints indicate sequential execution is required
 * @param {ExecutionConstraints|null|undefined} constraints
 * @returns {boolean}
 */
function isSequential(constraints) {
  return constraints != null && constraints.sequential === true;
}

/**
 * Check if two tasks are in the same sequential group
 * @param {ExecutionConstraints|null|undefined} constraints1
 * @param {ExecutionConstraints|null|undefined} constraints2
 * @returns {boolean}
 */
function inSameSequentialGroup(constraints1, constraints2) {
  if (!isSequential(constraints1) || !isSequential(constraints2)) {
    return false;
  }

  return (
    constraints1.sequentialGroup != null &&
    constraints2.sequentialGroup != null &&
    constraints1.sequentialGroup === constraints2.sequentialGroup
  );
}

/**
 * Validate a SequentialConstraint object
 * @param {*} constraint - Object to validate
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateSequentialConstraint(constraint) {
  const errors = [];

  if (!constraint || typeof constraint !== 'object') {
    return { valid: false, errors: ['Constraint must be an object'] };
  }

  if (typeof constraint.taskRange !== 'string') {
    errors.push('taskRange must be a string');
  }

  if (!Array.isArray(constraint.taskIds)) {
    errors.push('taskIds must be an array');
  } else if (constraint.taskIds.length === 0) {
    errors.push('taskIds must not be empty');
  } else if (!constraint.taskIds.every(id => typeof id === 'string')) {
    errors.push('all taskIds must be strings');
  }

  if (typeof constraint.reason !== 'string') {
    errors.push('reason must be a string');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate an ExecutionConstraints object
 * @param {*} constraints - Object to validate
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateExecutionConstraints(constraints) {
  const errors = [];

  if (!constraints || typeof constraints !== 'object') {
    return { valid: false, errors: ['Constraints must be an object'] };
  }

  if (typeof constraints.sequential !== 'boolean') {
    errors.push('sequential must be a boolean');
  }

  if (constraints.sequentialGroup != null && typeof constraints.sequentialGroup !== 'string') {
    errors.push('sequentialGroup must be a string if provided');
  }

  if (constraints.reason != null && typeof constraints.reason !== 'string') {
    errors.push('reason must be a string if provided');
  }

  return { valid: errors.length === 0, errors };
}

module.exports = {
  // Factory functions
  createSequentialConstraint,
  createExecutionConstraints,

  // Utility functions
  isSequential,
  inSameSequentialGroup,

  // Validation functions
  validateSequentialConstraint,
  validateExecutionConstraints
};
