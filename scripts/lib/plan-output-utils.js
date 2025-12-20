/**
 * Plan Output Utilities
 * Functions for managing plan output directories and status tracking.
 * Separates execution outputs from plan files for reusability.
 */

const fs = require('fs');
const path = require('path');
const { readFile, writeFile, fileExists, resolvePath } = require('./file-utils');
const planStatusSchema = require('./schemas/plan-status.json');

// Output directory base path
const OUTPUT_BASE = 'docs/plan-outputs';

/**
 * Generate output directory name from plan path
 * @param {string} planPath - Path to plan file (e.g., 'docs/plans/my-plan.md')
 * @returns {string} Output directory name (e.g., 'my-plan')
 */
function getOutputDirName(planPath) {
  const basename = path.basename(planPath, '.md');
  return basename;
}

/**
 * Get full path to output directory for a plan
 * @param {string} planPath - Path to plan file
 * @returns {string} Absolute path to output directory
 */
function getOutputDir(planPath) {
  const dirName = getOutputDirName(planPath);
  return resolvePath(OUTPUT_BASE, dirName);
}

/**
 * Get path to status.json for a plan
 * @param {string} planPath - Path to plan file
 * @returns {string} Absolute path to status.json
 */
function getStatusPath(planPath) {
  return path.join(getOutputDir(planPath), 'status.json');
}

/**
 * Get path to findings directory for a plan
 * @param {string} planPath - Path to plan file
 * @returns {string} Absolute path to findings directory
 */
function getFindingsDir(planPath) {
  return path.join(getOutputDir(planPath), 'findings');
}

/**
 * Get path to timestamps directory for a plan
 * @param {string} planPath - Path to plan file
 * @returns {string} Absolute path to timestamps directory
 */
function getTimestampsDir(planPath) {
  return path.join(getOutputDir(planPath), 'timestamps');
}

/**
 * Create output directory structure for a plan
 * @param {string} planPath - Path to plan file
 * @returns {boolean} Success status
 */
function createOutputDir(planPath) {
  try {
    const outputDir = getOutputDir(planPath);
    const findingsDir = getFindingsDir(planPath);
    const timestampsDir = getTimestampsDir(planPath);

    fs.mkdirSync(outputDir, { recursive: true });
    fs.mkdirSync(findingsDir, { recursive: true });
    fs.mkdirSync(timestampsDir, { recursive: true });

    return true;
  } catch (error) {
    console.error(`Failed to create output directory: ${error.message}`);
    return false;
  }
}

/**
 * Check if output directory exists for a plan
 * @param {string} planPath - Path to plan file
 * @returns {boolean}
 */
function outputDirExists(planPath) {
  return fileExists(getOutputDir(planPath));
}

/**
 * Initialize status.json for a plan
 * @param {string} planPath - Path to plan file
 * @param {string} planName - Human-readable plan name
 * @param {Array<{id: string, phase: string, description: string}>} tasks - List of tasks
 * @returns {object|null} Initialized status object or null on failure
 */
function initializeStatus(planPath, planName, tasks) {
  const now = new Date().toISOString();

  const status = {
    planPath,
    planName,
    createdAt: now,
    lastUpdatedAt: now,
    currentPhase: tasks.length > 0 ? tasks[0].phase : null,
    tasks: tasks.map(task => ({
      id: task.id,
      phase: task.phase,
      description: task.description,
      status: 'pending'
    })),
    runs: [],
    summary: {
      totalTasks: tasks.length,
      completed: 0,
      pending: tasks.length,
      failed: 0,
      skipped: 0
    }
  };

  if (saveStatus(planPath, status)) {
    return status;
  }
  return null;
}

/**
 * Load status.json for a plan
 * @param {string} planPath - Path to plan file
 * @returns {object|null} Status object or null if not found
 */
function loadStatus(planPath) {
  const statusPath = getStatusPath(planPath);
  const content = readFile(statusPath);
  if (!content) return null;

  try {
    return JSON.parse(content);
  } catch (error) {
    console.error(`Failed to parse status.json: ${error.message}`);
    return null;
  }
}

/**
 * Save status.json for a plan
 * @param {string} planPath - Path to plan file
 * @param {object} status - Status object to save
 * @returns {boolean} Success status
 */
function saveStatus(planPath, status) {
  const statusPath = getStatusPath(planPath);
  status.lastUpdatedAt = new Date().toISOString();
  return writeFile(statusPath, JSON.stringify(status, null, 2));
}

/**
 * Update a task's status
 * @param {string} planPath - Path to plan file
 * @param {string} taskId - Task identifier
 * @param {string} newStatus - New status ('pending'|'in_progress'|'completed'|'failed'|'skipped')
 * @param {object} extras - Additional fields (error, findingsPath, etc.)
 * @returns {boolean} Success status
 */
function updateTaskStatus(planPath, taskId, newStatus, extras = {}) {
  const status = loadStatus(planPath);
  if (!status) return false;

  const task = status.tasks.find(t => t.id === taskId);
  if (!task) return false;

  const now = new Date().toISOString();
  const oldStatus = task.status;
  task.status = newStatus;

  // Update timing
  if (newStatus === 'in_progress' && !task.startedAt) {
    task.startedAt = now;
  }
  if (['completed', 'failed', 'skipped'].includes(newStatus)) {
    task.completedAt = now;
    if (task.startedAt) {
      task.duration = new Date(now) - new Date(task.startedAt);
    }
  }

  // Apply extras
  Object.assign(task, extras);

  // Update summary
  if (oldStatus !== newStatus) {
    if (oldStatus && status.summary[oldStatus] > 0) {
      status.summary[oldStatus]--;
    }
    if (newStatus && status.summary[newStatus] !== undefined) {
      status.summary[newStatus]++;
    }
  }

  return saveStatus(planPath, status);
}

/**
 * Start a new execution run
 * @param {string} planPath - Path to plan file
 * @returns {string|null} Run ID or null on failure
 */
function startRun(planPath) {
  const status = loadStatus(planPath);
  if (!status) return null;

  const runId = `run-${Date.now()}`;
  const run = {
    runId,
    startedAt: new Date().toISOString(),
    tasksCompleted: 0,
    tasksFailed: 0
  };

  status.runs = status.runs || [];
  status.runs.push(run);

  if (saveStatus(planPath, status)) {
    return runId;
  }
  return null;
}

/**
 * Complete the current run
 * @param {string} planPath - Path to plan file
 * @param {string} runId - Run ID to complete
 * @param {number} completed - Tasks completed
 * @param {number} failed - Tasks failed
 * @returns {boolean} Success status
 */
function completeRun(planPath, runId, completed, failed) {
  const status = loadStatus(planPath);
  if (!status || !status.runs) return false;

  const run = status.runs.find(r => r.runId === runId);
  if (!run) return false;

  run.completedAt = new Date().toISOString();
  run.tasksCompleted = completed;
  run.tasksFailed = failed;

  return saveStatus(planPath, status);
}

/**
 * Write findings to a file
 * @param {string} planPath - Path to plan file
 * @param {string} taskId - Task identifier
 * @param {string} content - Findings content (markdown)
 * @returns {string|null} Relative path to findings file or null on failure
 */
function writeFindings(planPath, taskId, content) {
  const findingsDir = getFindingsDir(planPath);
  const filename = `${taskId.replace(/\./g, '-')}.md`;
  const filepath = path.join(findingsDir, filename);
  const relativePath = path.relative(resolvePath('.'), filepath);

  if (writeFile(filepath, content)) {
    return relativePath;
  }
  return null;
}

/**
 * Read findings for a task
 * @param {string} planPath - Path to plan file
 * @param {string} taskId - Task identifier
 * @returns {string|null} Findings content or null if not found
 */
function readFindings(planPath, taskId) {
  const findingsDir = getFindingsDir(planPath);
  const filename = `${taskId.replace(/\./g, '-')}.md`;
  const filepath = path.join(findingsDir, filename);
  return readFile(filepath);
}

/**
 * Get progress summary for a plan
 * @param {string} planPath - Path to plan file
 * @returns {object|null} Progress summary or null if no status
 */
function getProgress(planPath) {
  const status = loadStatus(planPath);
  if (!status) return null;

  return {
    planName: status.planName,
    currentPhase: status.currentPhase,
    summary: status.summary,
    lastUpdated: status.lastUpdatedAt,
    runs: status.runs ? status.runs.length : 0
  };
}

module.exports = {
  OUTPUT_BASE,
  getOutputDirName,
  getOutputDir,
  getStatusPath,
  getFindingsDir,
  getTimestampsDir,
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
};
