/**
 * Plan Pointer Module
 *
 * Provides functions to read the active plan path and output path from
 * the standard pointer files. This module centralizes plan path resolution
 * to eliminate duplication across scripts.
 *
 * Pointer Files:
 *   - .claude/current-plan.txt      - Path to active plan markdown file
 *   - .claude/current-plan-output.txt - Path to plan output directory
 */

const fs = require('fs');
const path = require('path');

// Pointer file paths (relative to project root)
const CURRENT_PLAN_FILE = '.claude/current-plan.txt';
const CURRENT_OUTPUT_FILE = '.claude/current-plan-output.txt';

/**
 * Get the active plan path from .claude/current-plan.txt
 *
 * @returns {string|null} The plan path, or null if not set or file doesn't exist
 */
function getActivePlanPath() {
  try {
    if (!fs.existsSync(CURRENT_PLAN_FILE)) {
      return null;
    }
    const content = fs.readFileSync(CURRENT_PLAN_FILE, 'utf8').trim();
    return content || null;
  } catch (error) {
    return null;
  }
}

/**
 * Get the active plan output directory from .claude/current-plan-output.txt
 *
 * @returns {string|null} The output directory path, or null if not set
 */
function getActivePlanOutputPath() {
  try {
    if (!fs.existsSync(CURRENT_OUTPUT_FILE)) {
      return null;
    }
    const content = fs.readFileSync(CURRENT_OUTPUT_FILE, 'utf8').trim();
    return content || null;
  } catch (error) {
    return null;
  }
}

/**
 * Get the plan name from the plan path
 *
 * @param {string} planPath - Path to the plan file
 * @returns {string} The plan name (filename without extension)
 */
function getPlanName(planPath) {
  if (!planPath) return null;
  return path.basename(planPath, '.md');
}

/**
 * Get the status.json path for the active plan
 *
 * @returns {string|null} Path to status.json, or null if no active plan
 */
function getStatusPath() {
  const outputDir = getActivePlanOutputPath();
  if (!outputDir) return null;
  return path.join(outputDir, 'status.json');
}

/**
 * Check if an active plan is set
 *
 * @returns {boolean} True if an active plan is set
 */
function hasActivePlan() {
  return getActivePlanPath() !== null;
}

module.exports = {
  getActivePlanPath,
  getActivePlanOutputPath,
  getPlanName,
  getStatusPath,
  hasActivePlan,
  // Export constants for tests
  CURRENT_PLAN_FILE,
  CURRENT_OUTPUT_FILE
};
