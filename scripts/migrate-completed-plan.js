#!/usr/bin/env node

/**
 * Migrate Completed Plan
 * Migrates a plan from docs/completed plans/ to the new status tracking system.
 * Creates output directory with status.json showing 100% completion.
 *
 * Usage: node scripts/migrate-completed-plan.js <plan-path>
 * Optional: --dry-run to preview without creating files
 */

const path = require('path');
const { readFile, resolvePath, fileExists } = require('./lib/file-utils');
const { parsePhases, getTitle } = require('./lib/markdown-parser');
const {
  createOutputDir,
  loadStatus,
  saveStatus,
  updateTaskStatus,
  outputDirExists,
  getOutputDir
} = require('./lib/plan-status');
// initializeStatus is specific to plan-output-utils (different signature)
const { initializeStatus } = require('./lib/plan-output-utils');

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const planPath = args.find(arg => !arg.startsWith('--'));

  return { planPath, dryRun };
}

/**
 * Migrate a completed plan to the new system
 * @param {string} planPath - Path to completed plan file
 * @param {boolean} dryRun - If true, don't create files
 * @returns {object} Migration result
 */
function migrateCompletedPlan(planPath, dryRun = false) {
  try {
    // Validate plan exists
    const absolutePath = path.isAbsolute(planPath) ? planPath : resolvePath(planPath);
    if (!fileExists(absolutePath)) {
      return {
        success: false,
        error: `Plan file not found: ${planPath}`
      };
    }

    // Check if already migrated
    if (outputDirExists(planPath)) {
      return {
        success: false,
        error: `Plan already has output directory: ${planPath}`,
        alreadyMigrated: true
      };
    }

    // Read and parse plan
    const content = readFile(absolutePath);
    if (!content) {
      return {
        success: false,
        error: `Could not read plan file: ${planPath}`
      };
    }

    const title = getTitle(content);
    const phases = parsePhases(content);

    // Extract all tasks
    const tasks = [];
    for (const phase of phases) {
      for (const task of phase.tasks) {
        tasks.push({
          id: task.id,
          phase: phase.name,
          description: task.title,
          complete: task.complete
        });
      }
    }

    if (tasks.length === 0) {
      return {
        success: false,
        error: 'No tasks found in plan'
      };
    }

    // Count completed tasks
    const completedCount = tasks.filter(t => t.complete).length;
    const allComplete = completedCount === tasks.length;

    if (dryRun) {
      return {
        success: true,
        dryRun: true,
        planPath,
        planTitle: title,
        totalTasks: tasks.length,
        completedTasks: completedCount,
        allComplete,
        message: 'Would create output directory and status.json with all tasks marked complete'
      };
    }

    // Create output directory
    if (!createOutputDir(planPath)) {
      return {
        success: false,
        error: 'Failed to create output directory'
      };
    }

    // Initialize status with all tasks
    const status = initializeStatus(planPath, title, tasks);
    if (!status) {
      return {
        success: false,
        error: 'Failed to initialize status.json'
      };
    }

    // Mark all completed tasks as completed
    const migratedAt = new Date().toISOString();
    for (const task of tasks) {
      if (task.complete) {
        updateTaskStatus(planPath, task.id, 'completed', {
          completedAt: migratedAt,
          findingsPath: null,
          migrated: true
        });
      }
    }

    // Add migration metadata to status
    const updatedStatus = loadStatus(planPath);
    if (updatedStatus) {
      updatedStatus.migrated = true;
      updatedStatus.migratedAt = migratedAt;
      updatedStatus.migratedFrom = planPath;
      saveStatus(planPath, updatedStatus);
    }

    return {
      success: true,
      planPath,
      planTitle: title,
      totalTasks: tasks.length,
      completedTasks: completedCount,
      allComplete,
      outputDir: getOutputDir(planPath),
      message: 'Successfully migrated completed plan'
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Main entry point
 */
function main() {
  const { planPath, dryRun } = parseArgs();

  if (!planPath) {
    console.error('Usage: node scripts/migrate-completed-plan.js <plan-path> [--dry-run]');
    console.error('');
    console.error('Example:');
    console.error('  node scripts/migrate-completed-plan.js "docs/completed plans/test-suite-implementation.md"');
    console.error('  node scripts/migrate-completed-plan.js "docs/completed plans/plan-commands.md" --dry-run');
    process.exit(1);
  }

  const result = migrateCompletedPlan(planPath, dryRun);

  if (result.success) {
    console.log('✓ Migration successful');
    console.log('');
    console.log(`Plan: ${result.planTitle}`);
    console.log(`Tasks: ${result.completedTasks}/${result.totalTasks} complete`);
    if (result.dryRun) {
      console.log('');
      console.log('[DRY RUN - No files created]');
      console.log(result.message);
    } else {
      console.log(`Output: ${result.outputDir}`);
      console.log('');
      console.log('The plan can now be queried with status tracking commands.');
    }
    process.exit(0);
  } else {
    console.error('✗ Migration failed');
    console.error('');
    console.error(`Error: ${result.error}`);
    if (result.alreadyMigrated) {
      console.error('');
      console.error('This plan has already been migrated to the new system.');
    }
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

// Export for testing
module.exports = {
  migrateCompletedPlan
};
