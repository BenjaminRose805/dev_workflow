/**
 * Timestamp Utilities
 * Functions for recording and querying execution timing data.
 */

const path = require('path');
const { readFile, writeFile, fileExists } = require('./file-utils');
const { getTimestampsDir } = require('./plan-status');

/**
 * Get path to runs directory
 * @param {string} planPath - Path to plan file
 * @returns {string} Absolute path to runs directory
 */
function getRunsDir(planPath) {
  return path.join(getTimestampsDir(planPath), 'runs');
}

/**
 * Get path to tasks directory
 * @param {string} planPath - Path to plan file
 * @returns {string} Absolute path to tasks directory
 */
function getTasksDir(planPath) {
  return path.join(getTimestampsDir(planPath), 'tasks');
}

/**
 * Get path to summary file
 * @param {string} planPath - Path to plan file
 * @returns {string} Absolute path to summary.json
 */
function getSummaryPath(planPath) {
  return path.join(getTimestampsDir(planPath), 'summary.json');
}

/**
 * Sanitize task ID for use as filename
 * @param {string} taskId - Task identifier (e.g., '1.1', 'VERIFY 1')
 * @returns {string} Safe filename
 */
function sanitizeTaskId(taskId) {
  return taskId.toLowerCase().replace(/\./g, '-').replace(/\s+/g, '-');
}

/**
 * Record timing for a completed task
 * @param {string} planPath - Path to plan file
 * @param {string} taskId - Task identifier
 * @param {object} timing - Timing data
 * @param {string} timing.runId - Run identifier
 * @param {string} timing.startedAt - ISO timestamp when task started
 * @param {string} timing.completedAt - ISO timestamp when task completed
 * @param {string} timing.status - Task status (completed, failed, skipped)
 * @returns {boolean} Success status
 */
function recordTaskTiming(planPath, taskId, timing) {
  const tasksDir = getTasksDir(planPath);
  const filename = `${sanitizeTaskId(taskId)}.json`;
  const filepath = path.join(tasksDir, filename);

  // Load existing or create new
  let taskData;
  const existing = readFile(filepath);
  if (existing) {
    try {
      taskData = JSON.parse(existing);
    } catch {
      taskData = null;
    }
  }

  if (!taskData) {
    taskData = {
      taskId,
      description: '',
      executions: [],
      statistics: {
        totalExecutions: 0,
        successRate: 0,
        avgDurationMs: 0,
        minDurationMs: null,
        maxDurationMs: null
      }
    };
  }

  // Calculate duration
  const durationMs = new Date(timing.completedAt) - new Date(timing.startedAt);

  // Add execution
  taskData.executions.push({
    runId: timing.runId,
    startedAt: timing.startedAt,
    completedAt: timing.completedAt,
    durationMs,
    status: timing.status
  });

  // Update statistics
  const completedExecutions = taskData.executions.filter(e => e.status === 'completed');
  taskData.statistics.totalExecutions = taskData.executions.length;
  taskData.statistics.successRate = completedExecutions.length / taskData.executions.length;

  if (completedExecutions.length > 0) {
    const durations = completedExecutions.map(e => e.durationMs);
    taskData.statistics.avgDurationMs = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
    taskData.statistics.minDurationMs = Math.min(...durations);
    taskData.statistics.maxDurationMs = Math.max(...durations);
  }

  return writeFile(filepath, JSON.stringify(taskData, null, 2));
}

/**
 * Record timing for a completed run
 * @param {string} planPath - Path to plan file
 * @param {string} runId - Run identifier
 * @param {object} runData - Run timing data
 * @returns {boolean} Success status
 */
function recordRunTiming(planPath, runId, runData) {
  const runsDir = getRunsDir(planPath);
  const filename = `${runId}.json`;
  const filepath = path.join(runsDir, filename);

  return writeFile(filepath, JSON.stringify(runData, null, 2));
}

/**
 * Get timing data for a specific run
 * @param {string} planPath - Path to plan file
 * @param {string} runId - Run identifier
 * @returns {object|null} Run timing data or null
 */
function getRunTiming(planPath, runId) {
  const runsDir = getRunsDir(planPath);
  const filename = `${runId}.json`;
  const filepath = path.join(runsDir, filename);
  const content = readFile(filepath);

  if (!content) return null;

  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Get timing history for a task
 * @param {string} planPath - Path to plan file
 * @param {string} taskId - Task identifier
 * @returns {object|null} Task timing history or null
 */
function getTaskHistory(planPath, taskId) {
  const tasksDir = getTasksDir(planPath);
  const filename = `${sanitizeTaskId(taskId)}.json`;
  const filepath = path.join(tasksDir, filename);
  const content = readFile(filepath);

  if (!content) return null;

  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Get or initialize summary
 * @param {string} planPath - Path to plan file
 * @returns {object} Summary data
 */
function getSummary(planPath) {
  const summaryPath = getSummaryPath(planPath);
  const content = readFile(summaryPath);

  if (content) {
    try {
      return JSON.parse(content);
    } catch {
      // Fall through to create new
    }
  }

  return {
    planPath,
    planName: '',
    totalRuns: 0,
    lastRun: null,
    totalExecutionTime: 0,
    averageRunTime: 0,
    taskStatistics: {
      avgTaskDuration: 0,
      fastestTask: null,
      slowestTask: null
    },
    parallelizationStats: {
      avgParallelGroups: 0,
      estimatedSequentialTime: 0,
      actualTime: 0,
      timeSavedPercent: 0
    }
  };
}

/**
 * Update summary after a run
 * @param {string} planPath - Path to plan file
 * @param {object} runData - Completed run data
 * @returns {boolean} Success status
 */
function updateSummary(planPath, runData) {
  const summary = getSummary(planPath);
  const summaryPath = getSummaryPath(planPath);

  summary.totalRuns++;
  summary.lastRun = runData.completedAt;
  summary.totalExecutionTime += runData.durationMs || 0;
  summary.averageRunTime = Math.round(summary.totalExecutionTime / summary.totalRuns);

  return writeFile(summaryPath, JSON.stringify(summary, null, 2));
}

/**
 * Format duration for display
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted duration
 */
function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3600000) {
    const mins = Math.floor(ms / 60000);
    const secs = Math.round((ms % 60000) / 1000);
    return `${mins}m ${secs}s`;
  }
  const hours = Math.floor(ms / 3600000);
  const mins = Math.round((ms % 3600000) / 60000);
  return `${hours}h ${mins}m`;
}

module.exports = {
  getRunsDir,
  getTasksDir,
  getSummaryPath,
  sanitizeTaskId,
  recordTaskTiming,
  recordRunTiming,
  getRunTiming,
  getTaskHistory,
  getSummary,
  updateSummary,
  formatDuration
};
