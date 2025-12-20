/**
 * Status Manager
 * High-level API for managing plan execution status.
 * Bridges plan files (markdown) with status tracking (JSON).
 */

const path = require('path');
const { readFile, writeFile, fileExists, resolvePath } = require('./file-utils');
const { parsePhases, getTitle } = require('./markdown-parser');
const {
  getOutputDir,
  getStatusPath,
  createOutputDir,
  outputDirExists,
  initializeStatus,
  loadStatus,
  saveStatus,
  updateTaskStatus,
  startRun,
  completeRun,
  writeFindings,
  readFindings,
  getProgress
} = require('./plan-output-utils');

// Pointer file for current plan output
const OUTPUT_POINTER_PATH = '.claude/current-plan-output.txt';

/**
 * Get the current plan output directory path
 * @returns {string|null} Output directory path or null
 */
function getCurrentOutputDir() {
  const pointerPath = resolvePath(OUTPUT_POINTER_PATH);
  const content = readFile(pointerPath);
  return content ? content.trim() : null;
}

/**
 * Set the current plan output directory
 * @param {string} outputDir - Output directory path (relative to project root)
 * @returns {boolean} Success status
 */
function setCurrentOutputDir(outputDir) {
  const pointerPath = resolvePath(OUTPUT_POINTER_PATH);
  return writeFile(pointerPath, outputDir + '\n');
}

/**
 * Initialize status tracking for a plan
 * Creates output directory and status.json if they don't exist
 * @param {string} planPath - Path to plan file
 * @returns {{ success: boolean, status: object|null, error: string|null }}
 */
function initializePlanStatus(planPath) {
  try {
    // Read plan content
    const absolutePath = path.isAbsolute(planPath) ? planPath : resolvePath(planPath);
    const content = readFile(absolutePath);
    if (!content) {
      return { success: false, status: null, error: 'Could not read plan file' };
    }

    // Extract plan metadata
    const title = getTitle(content) || path.basename(planPath, '.md');
    const phases = parsePhases(content);

    // Convert phases to task list
    const tasks = [];
    for (const phase of phases) {
      for (const task of phase.tasks) {
        tasks.push({
          id: task.id,
          phase: `Phase ${phase.id}: ${phase.name}`,
          description: task.title
        });
      }
    }

    // Create output directory if needed
    if (!outputDirExists(planPath)) {
      if (!createOutputDir(planPath)) {
        return { success: false, status: null, error: 'Could not create output directory' };
      }
    }

    // Check if status already exists
    let status = loadStatus(planPath);
    if (!status) {
      // Initialize new status
      status = initializeStatus(planPath, title, tasks);
      if (!status) {
        return { success: false, status: null, error: 'Could not initialize status' };
      }
    }

    // Update output pointer
    const outputDir = getOutputDir(planPath);
    const relativeOutputDir = path.relative(resolvePath('.'), outputDir);
    setCurrentOutputDir(relativeOutputDir);

    return { success: true, status, error: null };
  } catch (error) {
    return { success: false, status: null, error: error.message };
  }
}

/**
 * Get status for a plan, initializing if needed
 * @param {string} planPath - Path to plan file
 * @param {boolean} initIfMissing - Initialize if status doesn't exist
 * @returns {object|null} Status object or null
 */
function getStatus(planPath, initIfMissing = false) {
  let status = loadStatus(planPath);

  if (!status && initIfMissing) {
    const result = initializePlanStatus(planPath);
    status = result.status;
  }

  return status;
}

/**
 * Get formatted progress display
 * @param {string} planPath - Path to plan file
 * @returns {string} Formatted progress string
 */
function formatProgress(planPath) {
  const status = loadStatus(planPath);
  if (!status) {
    return 'No status tracking available for this plan.';
  }

  const { summary, planName, currentPhase, lastUpdatedAt } = status;
  const { totalTasks, completed, pending, failed, skipped } = summary;

  const percent = totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0;
  const barWidth = 20;
  const filledWidth = Math.round((percent / 100) * barWidth);
  const bar = '█'.repeat(filledWidth) + '░'.repeat(barWidth - filledWidth);

  const lines = [
    `Plan: ${planName}`,
    `Progress: [${bar}] ${percent}%`,
    ``,
    `  ✓ Completed: ${completed}`,
    `  ◯ Pending: ${pending}`,
    `  ✗ Failed: ${failed}`,
    `  ⊘ Skipped: ${skipped}`,
    ``,
    `Total: ${totalTasks} tasks`,
  ];

  if (currentPhase) {
    lines.push(`Current Phase: ${currentPhase}`);
  }

  if (lastUpdatedAt) {
    const date = new Date(lastUpdatedAt);
    lines.push(`Last Updated: ${date.toLocaleString()}`);
  }

  return lines.join('\n');
}

/**
 * Get task status by ID
 * @param {string} planPath - Path to plan file
 * @param {string} taskId - Task identifier
 * @returns {object|null} Task object or null
 */
function getTaskStatus(planPath, taskId) {
  const status = loadStatus(planPath);
  if (!status) return null;

  return status.tasks.find(t => t.id === taskId) || null;
}

/**
 * Get all tasks grouped by phase
 * @param {string} planPath - Path to plan file
 * @returns {object|null} Tasks grouped by phase or null
 */
function getTasksByPhase(planPath) {
  const status = loadStatus(planPath);
  if (!status) return null;

  const byPhase = {};
  for (const task of status.tasks) {
    const phase = task.phase || 'Unknown';
    if (!byPhase[phase]) {
      byPhase[phase] = [];
    }
    byPhase[phase].push(task);
  }

  return byPhase;
}

/**
 * Get incomplete tasks
 * @param {string} planPath - Path to plan file
 * @returns {Array} Array of incomplete tasks
 */
function getIncompleteTasks(planPath) {
  const status = loadStatus(planPath);
  if (!status) return [];

  return status.tasks.filter(t => t.status !== 'completed');
}

/**
 * Get task completion status with fallback to markdown parsing
 * Checks status.json first (new format), falls back to markdown (old format)
 * @param {string} planPath - Path to plan file
 * @returns {object} { tasks: [...], source: 'status.json' | 'markdown' | 'none', summary: {...} }
 */
function getTaskStatusWithFallback(planPath) {
  // Try status.json first (new format)
  const status = loadStatus(planPath);

  if (status) {
    // New format: return tasks from status.json
    return {
      tasks: status.tasks.map(task => ({
        id: task.id,
        phase: task.phase,
        description: task.description,
        status: task.status,
        complete: task.status === 'completed',
        startedAt: task.startedAt,
        completedAt: task.completedAt,
        duration: task.duration,
        error: task.error,
        skipReason: task.skipReason,
        findingsPath: task.findingsPath
      })),
      source: 'status.json',
      summary: status.summary
    };
  }

  // Fallback: parse markdown directly (old format)
  const absolutePath = path.isAbsolute(planPath) ? planPath : resolvePath(planPath);
  const content = readFile(absolutePath);

  if (!content) {
    return {
      tasks: [],
      source: 'none',
      summary: { totalTasks: 0, completed: 0, pending: 0, failed: 0, skipped: 0 }
    };
  }

  // Parse phases from markdown
  const phases = parsePhases(content);
  const tasks = [];

  for (const phase of phases) {
    for (const task of phase.tasks) {
      tasks.push({
        id: task.id,
        phase: `Phase ${phase.id}: ${phase.name}`,
        description: task.title,
        status: task.complete ? 'completed' : 'pending',
        complete: task.complete,
        priority: task.priority
      });
    }
  }

  // Calculate summary from markdown
  const completed = tasks.filter(t => t.complete).length;
  const pending = tasks.filter(t => !t.complete).length;

  return {
    tasks,
    source: 'markdown',
    summary: {
      totalTasks: tasks.length,
      completed,
      pending,
      failed: 0,
      skipped: 0
    }
  };
}

/**
 * Mark a task as started
 * @param {string} planPath - Path to plan file
 * @param {string} taskId - Task identifier
 * @returns {boolean} Success status
 */
function markTaskStarted(planPath, taskId) {
  return updateTaskStatus(planPath, taskId, 'in_progress');
}

/**
 * Mark a task as completed
 * @param {string} planPath - Path to plan file
 * @param {string} taskId - Task identifier
 * @param {string} findingsContent - Optional findings content
 * @returns {boolean} Success status
 */
function markTaskCompleted(planPath, taskId, findingsContent = null) {
  const extras = {};

  if (findingsContent) {
    const findingsPath = writeFindings(planPath, taskId, findingsContent);
    if (findingsPath) {
      extras.findingsPath = findingsPath;
    }
  }

  return updateTaskStatus(planPath, taskId, 'completed', extras);
}

/**
 * Mark a task as failed
 * @param {string} planPath - Path to plan file
 * @param {string} taskId - Task identifier
 * @param {string} errorMessage - Error message
 * @returns {boolean} Success status
 */
function markTaskFailed(planPath, taskId, errorMessage) {
  return updateTaskStatus(planPath, taskId, 'failed', { error: errorMessage });
}

/**
 * Mark a task as skipped
 * @param {string} planPath - Path to plan file
 * @param {string} taskId - Task identifier
 * @param {string} reason - Reason for skipping
 * @returns {boolean} Success status
 */
function markTaskSkipped(planPath, taskId, reason) {
  return updateTaskStatus(planPath, taskId, 'skipped', { skipReason: reason });
}

/**
 * Update current phase
 * @param {string} planPath - Path to plan file
 * @param {string} phaseName - Phase name
 * @returns {boolean} Success status
 */
function setCurrentPhase(planPath, phaseName) {
  const status = loadStatus(planPath);
  if (!status) return false;

  status.currentPhase = phaseName;
  return saveStatus(planPath, status);
}

/**
 * Get run history
 * @param {string} planPath - Path to plan file
 * @returns {Array} Array of run objects
 */
function getRunHistory(planPath) {
  const status = loadStatus(planPath);
  if (!status || !status.runs) return [];
  return status.runs;
}

/**
 * Format run history for display
 * @param {string} planPath - Path to plan file
 * @returns {string} Formatted run history
 */
function formatRunHistory(planPath) {
  const runs = getRunHistory(planPath);
  if (runs.length === 0) {
    return 'No execution runs recorded.';
  }

  const lines = ['Execution History:', ''];
  for (const run of runs) {
    const start = new Date(run.startedAt);
    const end = run.completedAt ? new Date(run.completedAt) : null;
    const duration = end ? formatDuration(end - start) : 'in progress';

    lines.push(`  ${run.runId}`);
    lines.push(`    Started: ${start.toLocaleString()}`);
    lines.push(`    Duration: ${duration}`);
    lines.push(`    Completed: ${run.tasksCompleted || 0}, Failed: ${run.tasksFailed || 0}`);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Format duration in human-readable format
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted duration
 */
function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3600000) return `${Math.round(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
  return `${Math.round(ms / 3600000)}h ${Math.round((ms % 3600000) / 60000)}m`;
}

module.exports = {
  // Pointer management
  OUTPUT_POINTER_PATH,
  getCurrentOutputDir,
  setCurrentOutputDir,

  // Initialization
  initializePlanStatus,
  getStatus,

  // Progress display
  formatProgress,
  formatRunHistory,
  formatDuration,

  // Task management
  getTaskStatus,
  getTasksByPhase,
  getIncompleteTasks,
  getTaskStatusWithFallback,
  markTaskStarted,
  markTaskCompleted,
  markTaskFailed,
  markTaskSkipped,

  // Phase management
  setCurrentPhase,

  // Run management
  startRun,
  completeRun,
  getRunHistory,

  // Re-export commonly used functions
  loadStatus,
  saveStatus,
  writeFindings,
  readFindings,
  getProgress
};
