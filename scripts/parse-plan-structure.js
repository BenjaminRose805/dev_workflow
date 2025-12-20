#!/usr/bin/env node

/**
 * Parse Plan Structure Script
 *
 * Deep-parses a plan file to extract phases, tasks, line numbers, IDs, and priority markers.
 *
 * Usage:
 *   node scripts/parse-plan-structure.js <plan-path>
 *   node scripts/parse-plan-structure.js  # Uses .claude/current-plan.txt
 *
 * Output: JSON structure with phases and tasks
 */

const path = require('path');
const { readFile, fileExists, resolvePath } = require('./lib/file-utils');
const { parsePhases } = require('./lib/markdown-parser');

/**
 * Main function to parse plan structure
 * @param {string} planPath - Path to plan file
 * @returns {object} Parsed plan structure
 */
function parsePlanStructure(planPath) {
  // Resolve path (supports both absolute and relative)
  const resolvedPath = path.isAbsolute(planPath)
    ? planPath
    : resolvePath(planPath);

  // Check if file exists
  if (!fileExists(resolvedPath)) {
    return {
      success: false,
      error: {
        code: 'FILE_NOT_FOUND',
        message: `Plan file not found: ${planPath}`,
        context: { path: resolvedPath }
      }
    };
  }

  // Read file contents
  const content = readFile(resolvedPath);
  if (content === null) {
    return {
      success: false,
      error: {
        code: 'READ_ERROR',
        message: `Failed to read plan file: ${planPath}`,
        context: { path: resolvedPath }
      }
    };
  }

  // Parse phases using existing utility
  try {
    const phases = parsePhases(content);

    return {
      success: true,
      path: resolvedPath,
      phases: phases
    };
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'PARSE_ERROR',
        message: `Failed to parse plan file: ${err.message}`,
        context: { path: resolvedPath, error: err.message }
      }
    };
  }
}

/**
 * Get plan path from arguments or current-plan.txt
 * @returns {string|null} Plan path or null if not found
 */
function getPlanPath() {
  // Check command line arguments
  const args = process.argv.slice(2);
  if (args.length > 0) {
    return args[0];
  }

  // Try to read from .claude/current-plan.txt
  const currentPlanFile = resolvePath('.claude/current-plan.txt');
  if (!fileExists(currentPlanFile)) {
    return null;
  }

  const currentPlanPath = readFile(currentPlanFile);
  if (currentPlanPath === null) {
    return null;
  }

  // Trim whitespace and return
  return currentPlanPath.trim();
}

// Main execution
if (require.main === module) {
  const planPath = getPlanPath();

  if (!planPath) {
    const result = {
      success: false,
      error: {
        code: 'NO_PLAN_SPECIFIED',
        message: 'No plan file specified and .claude/current-plan.txt not found or empty',
        context: {
          usage: 'node scripts/parse-plan-structure.js <plan-path>'
        }
      }
    };
    console.log(JSON.stringify(result, null, 2));
    process.exit(1);
  }

  const result = parsePlanStructure(planPath);
  console.log(JSON.stringify(result, null, 2));

  // Exit with error code if parsing failed
  if (!result.success) {
    process.exit(1);
  }
}

module.exports = { parsePlanStructure, getPlanPath };
