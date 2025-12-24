#!/usr/bin/env node

/**
 * Plan Scanner
 * Scans all plan files in docs/plans/ and generates JSON summary.
 *
 * Usage: node scripts/scan-plans.js
 * Output: JSON to stdout
 */

const path = require('path');
const { readFile, globSync, resolvePath, getCached, setCached } = require('./lib/file-utils');
const { getTitle, countTasks, parsePhases } = require('./lib/markdown-parser');
const { loadStatus, outputDirExists, getOutputDir } = require('./lib/plan-output-utils');
const { getActivePlanPath } = require('./lib/plan-pointer');

/**
 * Scan a single plan file
 * @param {string} filePath - Absolute path to plan file
 * @returns {object|null} Plan metadata or null on error
 */
function scanPlanFile(filePath) {
  try {
    // Check cache first
    const cacheKey = `plan:${filePath}`;
    const cached = getCached(cacheKey, [filePath]);
    if (cached) {
      return cached;
    }

    const content = readFile(filePath);
    if (!content) {
      console.error(`Warning: Could not read file ${filePath}`);
      return null;
    }

    // Extract metadata
    const title = getTitle(content);
    const taskCounts = countTasks(content);
    const phases = parsePhases(content);

    // Get relative path for status lookup
    const relativePath = path.relative(resolvePath('.'), filePath);

    const result = {
      path: filePath,
      title: title || path.basename(filePath, '.md'),
      incomplete: taskCounts.incomplete,
      complete: taskCounts.complete,
      phases: phases.map(phase => ({
        id: phase.id,
        name: phase.name,
        taskCount: phase.tasks.length,
        completeCount: phase.tasks.filter(t => t.complete).length,
        incompleteCount: phase.tasks.filter(t => !t.complete).length
      }))
    };

    // Check for status.json (output separation)
    if (outputDirExists(relativePath)) {
      const status = loadStatus(relativePath);
      if (status) {
        result.hasStatusTracking = true;
        result.outputDir = path.relative(resolvePath('.'), getOutputDir(relativePath));
        result.statusSummary = status.summary;
        result.lastUpdated = status.lastUpdatedAt;
        result.runCount = status.runs ? status.runs.length : 0;
      }
    }

    // Cache the result (include status path in cache dependencies if it exists)
    const cacheDeps = [filePath];
    if (result.hasStatusTracking) {
      cacheDeps.push(path.join(getOutputDir(relativePath), 'status.json'));
    }
    setCached(cacheKey, result, cacheDeps);

    return result;
  } catch (error) {
    console.error(`Error scanning ${filePath}: ${error.message}`);
    return null;
  }
}

/**
 * Scan all plan files in docs/plans/
 * @returns {object} Scan results with currentPlan and plans array
 */
function scanAllPlans() {
  try {
    // Get current plan using plan-pointer module
    const currentPlan = getActivePlanPath();

    // Find all plan files
    const planPattern = resolvePath('docs', 'plans', '*.md');
    const planFiles = globSync(planPattern);

    if (planFiles.length === 0) {
      console.error('Warning: No plan files found in docs/plans/');
    }

    // Scan each plan file
    const plans = [];
    for (const filePath of planFiles) {
      const planData = scanPlanFile(filePath);
      if (planData) {
        plans.push(planData);
      }
    }

    // Sort plans by path for consistent ordering
    plans.sort((a, b) => a.path.localeCompare(b.path));

    return {
      currentPlan,
      plans
    };
  } catch (error) {
    console.error(`Fatal error scanning plans: ${error.message}`);
    return {
      currentPlan: null,
      plans: [],
      error: error.message
    };
  }
}

/**
 * Main entry point
 */
function main() {
  try {
    const results = scanAllPlans();

    // Output JSON to stdout
    console.log(JSON.stringify(results, null, 2));

    // Exit with success
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

// Export for testing
module.exports = {
  getCurrentPlan: getActivePlanPath, // Re-export for backwards compatibility
  scanPlanFile,
  scanAllPlans
};
