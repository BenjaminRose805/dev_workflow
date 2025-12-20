#!/usr/bin/env node

/**
 * Completed Plans Scanner
 * Scans archived plans in docs/completed plans/ directory.
 * These are historical plans with inline checkmarks (legacy format).
 *
 * Usage: node scripts/scan-completed-plans.js
 * Output: JSON to stdout
 */

const path = require('path');
const { readFile, globSync, resolvePath } = require('./lib/file-utils');
const { getTitle, countTasks } = require('./lib/markdown-parser');

/**
 * Scan a single completed plan file
 * @param {string} filePath - Absolute path to plan file
 * @returns {object|null} Plan metadata or null on error
 */
function scanCompletedPlan(filePath) {
  try {
    const content = readFile(filePath);
    if (!content) {
      console.error(`Warning: Could not read file ${filePath}`);
      return null;
    }

    const title = getTitle(content);
    const taskCounts = countTasks(content);

    return {
      path: filePath,
      title: title || path.basename(filePath, '.md'),
      totalTasks: taskCounts.complete + taskCounts.incomplete,
      complete: taskCounts.complete,
      incomplete: taskCounts.incomplete,
      completionPercentage: Math.round((taskCounts.complete / (taskCounts.complete + taskCounts.incomplete)) * 100) || 0,
      archived: true,
      archivedLocation: 'docs/completed plans/'
    };
  } catch (error) {
    console.error(`Error scanning ${filePath}: ${error.message}`);
    return null;
  }
}

/**
 * Scan all completed plan files
 * @returns {object} Scan results with completed plans array
 */
function scanAllCompletedPlans() {
  try {
    const completedPlansDir = resolvePath('docs', 'completed plans');
    const completedPlansPattern = path.join(completedPlansDir, '*.md');
    const planFiles = globSync(completedPlansPattern);

    if (planFiles.length === 0) {
      return {
        completedPlans: [],
        count: 0
      };
    }

    const plans = [];
    for (const filePath of planFiles) {
      const planData = scanCompletedPlan(filePath);
      if (planData) {
        plans.push(planData);
      }
    }

    plans.sort((a, b) => a.path.localeCompare(b.path));

    return {
      completedPlans: plans,
      count: plans.length,
      location: 'docs/completed plans/'
    };
  } catch (error) {
    console.error(`Fatal error scanning completed plans: ${error.message}`);
    return {
      completedPlans: [],
      count: 0,
      error: error.message
    };
  }
}

/**
 * Main entry point
 */
function main() {
  try {
    const results = scanAllCompletedPlans();
    console.log(JSON.stringify(results, null, 2));
    process.exit(0);
  } catch (error) {
    console.error(`Fatal error: ${error.message}`);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

// Export for testing and use by other scripts
module.exports = {
  scanCompletedPlan,
  scanAllCompletedPlans
};
