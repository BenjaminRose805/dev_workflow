/**
 * Plan Output Utilities
 * Functions for managing plan output directories and status tracking.
 * Separates execution outputs from plan files for reusability.
 *
 * ## Source of Truth
 *
 * **status.json is THE authoritative source of truth for execution state.**
 *
 * The markdown plan file (e.g., `docs/plans/my-plan.md`) is reference documentation
 * that describes WHAT needs to be done. It should NOT be modified during execution.
 *
 * The status.json file (e.g., `docs/plan-outputs/my-plan/status.json`) tracks:
 * - Which tasks are pending, in_progress, completed, failed, or skipped
 * - Timestamps for task start/completion
 * - Summary counts and progress percentage
 * - Execution run history
 *
 * ### Why Two Files?
 *
 * 1. **Markdown for humans**: Easy to read, version control, and review
 * 2. **JSON for machines**: Easy to parse, update atomically, query programmatically
 * 3. **Separation of concerns**: Plan definition vs. execution state
 * 4. **Reusability**: Same plan can be re-executed with fresh status
 *
 * ### Important Rules
 *
 * - NEVER modify markdown checkboxes (`- [x]`) during execution
 * - ALWAYS use status.json for task state queries
 * - Use status-cli.js commands to update task status
 * - Markdown is read-only during plan execution
 */

const fs = require('fs');
const path = require('path');
const lockfile = require('proper-lockfile');
const { readFile, writeFile, writeFileAtomic, fileExists, resolvePath } = require('./file-utils');
const planStatusSchema = require('./schemas/plan-status.json');
const planPointer = require('./plan-pointer');

// Output directory base path
const OUTPUT_BASE = 'docs/plan-outputs';

// Lock configuration
const LOCK_OPTIONS = {
  stale: 60000,        // Lock is stale after 60 seconds (auto-released)
  lockfilePath: undefined, // Will be set dynamically per-file
  retries: {
    retries: 10,       // Retry up to 10 times (with backoff, ~10s total)
    factor: 1.5,       // Exponential factor
    minTimeout: 100,   // Start with 100ms
    maxTimeout: 2000,  // Max 2 seconds between retries
    randomize: true    // Add jitter to prevent thundering herd
  },
  realpath: false      // Don't resolve symlinks
};

// Lock timeout (total time to wait for lock acquisition)
const LOCK_TIMEOUT_MS = 10000; // 10 seconds

// Stale lock threshold (locks older than this are auto-released)
const STALE_LOCK_MS = 60000; // 60 seconds

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
 * Valid task statuses and their summary key mappings
 * Note: 'in_progress' is tracked separately but also decrements 'pending' when entered
 */
const VALID_STATUSES = ['pending', 'in_progress', 'completed', 'failed', 'skipped'];

/**
 * Create an empty summary object with all status counts initialized to 0
 * @returns {object} Empty summary object
 */
function createEmptySummary() {
  return {
    totalTasks: 0,
    completed: 0,
    pending: 0,
    in_progress: 0,
    failed: 0,
    skipped: 0
  };
}

/**
 * Recalculate summary by counting actual task statuses
 * This is the authoritative way to compute summary - use when summary may have drifted.
 * @param {object} status - Full status object with tasks array
 * @returns {object} Recalculated summary
 */
function recalculateSummary(status) {
  const summary = createEmptySummary();

  if (!status || !status.tasks || !Array.isArray(status.tasks)) {
    return summary;
  }

  summary.totalTasks = status.tasks.length;

  for (const task of status.tasks) {
    const taskStatus = task.status || 'pending';
    if (summary[taskStatus] !== undefined) {
      summary[taskStatus]++;
    } else {
      // Unknown status, treat as pending
      summary.pending++;
    }
  }

  return summary;
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
    // Metadata header explaining source of truth
    _comment: "This file is the authoritative source of truth for task execution state. The markdown plan file is read-only reference documentation. Use status-cli.js to update task status.",
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
    summary: createEmptySummary()
  };

  // Initialize summary with correct counts
  status.summary.totalTasks = tasks.length;
  status.summary.pending = tasks.length;

  if (saveStatus(planPath, status)) {
    return status;
  }
  return null;
}

/**
 * Check if a lock file is stale (older than STALE_LOCK_MS)
 * @param {string} statusPath - Path to status.json
 * @returns {boolean} True if lock is stale or doesn't exist
 */
function isLockStale(statusPath) {
  try {
    const lockPath = `${statusPath}.lock`;
    if (!fs.existsSync(lockPath)) {
      return true; // No lock = not stale (effectively available)
    }
    const stats = fs.statSync(lockPath);
    const ageMs = Date.now() - stats.mtimeMs;
    return ageMs > STALE_LOCK_MS;
  } catch (error) {
    return true; // If we can't check, assume available
  }
}

/**
 * Clean up stale lock if it exists
 * @param {string} statusPath - Path to status.json
 * @returns {boolean} True if lock was cleaned or didn't exist
 */
function cleanStaleLock(statusPath) {
  try {
    const lockPath = `${statusPath}.lock`;
    if (!fs.existsSync(lockPath)) {
      return true;
    }

    if (isLockStale(statusPath)) {
      // Try to remove the stale lock
      try {
        fs.unlinkSync(lockPath);
        console.warn(`Cleaned up stale lock: ${lockPath}`);
        return true;
      } catch (e) {
        console.error(`Failed to clean stale lock: ${e.message}`);
        return false;
      }
    }
    return false; // Lock exists and is not stale
  } catch (error) {
    return true;
  }
}

/**
 * Acquire lock on status.json file with timeout
 * @param {string} statusPath - Path to status.json
 * @param {number} timeoutMs - Maximum time to wait for lock (default: LOCK_TIMEOUT_MS)
 * @returns {Promise<Function|null>} Release function or null if failed/timeout
 */
async function acquireLock(statusPath, timeoutMs = LOCK_TIMEOUT_MS) {
  try {
    // Ensure the file exists before locking (proper-lockfile requires this)
    if (!fs.existsSync(statusPath)) {
      return null;
    }

    // Trust proper-lockfile's stale option (configured in LOCK_OPTIONS) to handle
    // stale lock detection. Manual cleanup was removed to prevent race conditions
    // where we might delete a lock that another process legitimately holds.

    // Create a promise that rejects after timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Lock acquisition timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    // Race between lock acquisition and timeout
    const release = await Promise.race([
      lockfile.lock(statusPath, LOCK_OPTIONS),
      timeoutPromise
    ]);

    return release;
  } catch (error) {
    if (error.message.includes('timed out')) {
      console.error(`Lock timeout on ${statusPath}: waited ${timeoutMs}ms`);
    } else {
      console.error(`Failed to acquire lock on ${statusPath}: ${error.message}`);
    }
    return null;
  }
}

/**
 * Check if a file is currently locked
 * @param {string} statusPath - Path to status.json
 * @returns {Promise<boolean>} True if locked
 */
async function isLocked(statusPath) {
  try {
    return await lockfile.check(statusPath, LOCK_OPTIONS);
  } catch (error) {
    return false;
  }
}

/**
 * Load status.json for a plan (no locking - use for read-only operations)
 * Validates and auto-fixes summary mismatches on load.
 * @param {string} planPath - Path to plan file
 * @param {object} options - Options
 * @param {boolean} options.skipValidation - Skip summary validation (default: false)
 * @returns {object|null} Status object or null if not found
 */
function loadStatus(planPath, options = {}) {
  const statusPath = getStatusPath(planPath);
  let content = readFile(statusPath);

  // If file doesn't exist, try recovery
  if (!content) {
    // Check if we have a backup
    const backupPath = getBackupPath(statusPath);
    if (fs.existsSync(backupPath)) {
      console.log('Primary status.json missing, trying backup...');
      if (restoreFromBackup(statusPath)) {
        content = readFile(statusPath);
      }
    }

    if (!content) return null;
  }

  // Try to parse JSON
  let status;
  try {
    status = JSON.parse(content);
  } catch (parseError) {
    console.error(`Failed to parse status.json: ${parseError.message}`);

    // Try recovery from backup
    console.log('Attempting recovery from backup...');
    if (restoreFromBackup(statusPath)) {
      const restoredContent = readFile(statusPath);
      if (restoredContent) {
        try {
          status = JSON.parse(restoredContent);
          console.log('Successfully recovered from backup');
        } catch (backupParseError) {
          console.error('Backup is also corrupt');
        }
      }
    }

    // If still no valid status, try rebuilding from markdown as last resort
    if (!status) {
      console.log('Attempting to rebuild from markdown...');
      const rebuildResult = rebuildStatusFromMarkdown(planPath);
      if (rebuildResult) {
        console.log('Successfully rebuilt status from markdown');
        return rebuildResult;
      }
      return null;
    }
  }

  // Validate and auto-fix summary on load (unless skipped)
  if (!options.skipValidation) {
    const originalSummary = status.summary || {};
    const originalKeys = Object.keys(originalSummary);

    // Ensure summary has all required keys
    status.summary = ensureSummaryKeys(originalSummary);
    const normalizedKeys = Object.keys(status.summary);

    // Check if we added missing keys
    const addedKeys = normalizedKeys.length > originalKeys.length;

    // Validate against actual task counts
    const validation = validateSummary(status, true);

    // Save if there was a mismatch OR if we added missing keys
    if (!validation.valid || addedKeys) {
      if (!validation.valid) {
        console.warn(`Summary mismatch detected on load: ${JSON.stringify(validation.mismatches)}`);
      }
      // Auto-save the fixed/normalized summary
      saveStatus(planPath, status);
    }
  }

  return status;
}

/**
 * Rebuild status.json from markdown plan file as a last resort recovery
 * All tasks will be marked as pending (completion state is lost)
 * @param {string} planPath - Path to plan file
 * @returns {object|null} Rebuilt status object or null if failed
 */
function rebuildStatusFromMarkdown(planPath) {
  try {
    const content = fs.readFileSync(planPath, 'utf8');
    if (!content) return null;

    // Extract plan title
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const planName = titleMatch ? titleMatch[1].trim() : path.basename(planPath, '.md');

    // Parse phases and tasks
    const phaseRegex = /^##\s+Phase\s+(\d+):\s*(.+)$/gm;
    const taskRegex = /^-\s+\[[ x]\]\s+(\d+\.\d+(?:\.\d+)?)\s+(.+)$/gm;

    const tasks = [];
    let currentPhase = null;

    const lines = content.split('\n');
    for (const line of lines) {
      // Check for phase header
      const phaseMatch = line.match(/^##\s+Phase\s+(\d+):\s*(.+)$/);
      if (phaseMatch) {
        currentPhase = `Phase ${phaseMatch[1]}: ${phaseMatch[2].trim()}`;
        continue;
      }

      // Check for task
      const taskMatch = line.match(/^-\s+\[[ x]\]\s+(\d+\.\d+(?:\.\d+)?)\s+(.+)$/);
      if (taskMatch && currentPhase) {
        tasks.push({
          id: taskMatch[1],
          phase: currentPhase,
          description: taskMatch[2].trim(),
          status: 'pending', // All tasks reset to pending
          recoveredAt: new Date().toISOString(),
          _note: 'Task rebuilt from markdown - completion status unknown'
        });
      }
    }

    if (tasks.length === 0) {
      console.warn('No tasks found in markdown file');
      return null;
    }

    // Create new status object
    const status = {
      _comment: "This file is the authoritative source of truth for task execution state. The markdown plan file is read-only reference documentation. Use status-cli.js to update task status.",
      _recovery: `Status rebuilt from markdown at ${new Date().toISOString()} due to corrupt status.json`,
      planPath,
      planName,
      createdAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
      currentPhase: tasks.length > 0 ? tasks[0].phase : null,
      tasks: tasks,
      runs: [],
      summary: createEmptySummary()
    };

    // Set correct pending count
    status.summary.totalTasks = tasks.length;
    status.summary.pending = tasks.length;

    // Save the rebuilt status
    if (saveStatus(planPath, status)) {
      console.log(`Rebuilt status.json with ${tasks.length} tasks from markdown`);
      return status;
    }

    return null;
  } catch (error) {
    console.error(`Failed to rebuild from markdown: ${error.message}`);
    return null;
  }
}

/**
 * Load status.json with file locking (for read-modify-write operations)
 * Returns both the status and a release function that MUST be called after saving.
 * @param {string} planPath - Path to plan file
 * @returns {Promise<{status: object, release: Function}|null>} Status and release function
 */
async function loadStatusWithLock(planPath) {
  const statusPath = getStatusPath(planPath);

  // Acquire lock first
  const release = await acquireLock(statusPath);
  if (!release) {
    // Try without lock if file doesn't exist yet
    const content = readFile(statusPath);
    if (!content) return null;
    try {
      return { status: JSON.parse(content), release: () => {} };
    } catch (error) {
      console.error(`Failed to parse status.json: ${error.message}`);
      return null;
    }
  }

  // Read the file while holding the lock
  const content = readFile(statusPath);
  if (!content) {
    await release();
    return null;
  }

  try {
    const status = JSON.parse(content);
    return { status, release };
  } catch (error) {
    console.error(`Failed to parse status.json: ${error.message}`);
    await release();
    return null;
  }
}

/**
 * Get path to backup file for status.json
 * @param {string} statusPath - Path to status.json
 * @returns {string} Path to backup file
 */
function getBackupPath(statusPath) {
  return statusPath + '.bak';
}

/**
 * Create backup of status.json before write
 * @param {string} statusPath - Path to status.json
 * @returns {boolean} Success status
 */
function createBackup(statusPath) {
  if (!fs.existsSync(statusPath)) {
    return true; // No file to backup
  }

  try {
    const backupPath = getBackupPath(statusPath);
    fs.copyFileSync(statusPath, backupPath);
    return true;
  } catch (error) {
    console.warn(`Failed to create backup: ${error.message}`);
    return false; // Non-fatal, continue with write
  }
}

/**
 * Restore status.json from backup
 * @param {string} statusPath - Path to status.json
 * @returns {boolean} Success status
 */
function restoreFromBackup(statusPath) {
  const backupPath = getBackupPath(statusPath);

  if (!fs.existsSync(backupPath)) {
    return false; // No backup available
  }

  try {
    fs.copyFileSync(backupPath, statusPath);
    console.log(`Restored status.json from backup`);
    return true;
  } catch (error) {
    console.error(`Failed to restore from backup: ${error.message}`);
    return false;
  }
}

/**
 * Save status.json for a plan (no locking - use only with loadStatusWithLock)
 * Uses atomic write to prevent corruption from partial writes.
 * Creates backup before each write for recovery.
 * @param {string} planPath - Path to plan file
 * @param {object} status - Status object to save
 * @returns {boolean} Success status
 */
function saveStatus(planPath, status) {
  const statusPath = getStatusPath(planPath);
  status.lastUpdatedAt = new Date().toISOString();

  // Create backup before write (non-blocking on failure)
  createBackup(statusPath);

  // Use atomic write to prevent corruption if process crashes mid-write
  return writeFileAtomic(statusPath, JSON.stringify(status, null, 2));
}

/**
 * Save status.json with file locking (atomic operation)
 * Acquires lock, saves atomically, and releases in one operation.
 * @param {string} planPath - Path to plan file
 * @param {object} status - Status object to save
 * @returns {Promise<boolean>} Success status
 */
async function saveStatusWithLock(planPath, status) {
  const statusPath = getStatusPath(planPath);

  // Try to acquire lock
  let release = null;
  try {
    if (fs.existsSync(statusPath)) {
      release = await lockfile.lock(statusPath, LOCK_OPTIONS);
    }
  } catch (error) {
    console.warn(`Could not acquire lock, proceeding without: ${error.message}`);
  }

  try {
    status.lastUpdatedAt = new Date().toISOString();
    // Use atomic write to prevent corruption if process crashes mid-write
    const success = writeFileAtomic(statusPath, JSON.stringify(status, null, 2));
    return success;
  } finally {
    if (release) {
      try {
        await release();
      } catch (e) {
        // Lock may have been released already
      }
    }
  }
}

/**
 * Ensure summary has all required keys, adding missing ones with 0
 * @param {object} summary - Summary object to normalize
 * @returns {object} Normalized summary
 */
function ensureSummaryKeys(summary) {
  const defaults = createEmptySummary();
  return { ...defaults, ...summary };
}

/**
 * Validate and optionally fix summary against actual task counts
 * @param {object} status - Full status object
 * @param {boolean} autoFix - If true, replace summary with recalculated values
 * @returns {{valid: boolean, mismatches: object, fixed: boolean}} Validation result
 */
function validateSummary(status, autoFix = false) {
  const result = { valid: true, mismatches: {}, fixed: false };

  if (!status || !status.tasks) {
    return result;
  }

  // Ensure summary has all keys
  status.summary = ensureSummaryKeys(status.summary || {});

  const calculated = recalculateSummary(status);

  // Check each field
  for (const key of Object.keys(calculated)) {
    if (status.summary[key] !== calculated[key]) {
      result.valid = false;
      result.mismatches[key] = {
        stored: status.summary[key],
        calculated: calculated[key]
      };
    }
  }

  if (!result.valid && autoFix) {
    status.summary = calculated;
    result.fixed = true;
  }

  return result;
}

/**
 * Update a task's status (sync version - no locking, for backwards compatibility)
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

  // Ensure summary has all required keys (handles legacy status.json without in_progress)
  status.summary = ensureSummaryKeys(status.summary || {});

  // Update summary incrementally
  if (oldStatus !== newStatus) {
    // Decrement old status count (if valid and > 0)
    if (oldStatus && status.summary[oldStatus] !== undefined && status.summary[oldStatus] > 0) {
      status.summary[oldStatus]--;
    }
    // Increment new status count (if valid)
    if (newStatus && status.summary[newStatus] !== undefined) {
      status.summary[newStatus]++;
    }
  }

  // Safety net: recalculate if summary seems off (optional extra validation)
  // This catches any drift from bugs or concurrent modifications
  const validation = validateSummary(status, true);
  if (!validation.valid) {
    console.warn(`Summary drift detected and auto-fixed: ${JSON.stringify(validation.mismatches)}`);
  }

  return saveStatus(planPath, status);
}

/**
 * Update a task's status with file locking (async version - prevents race conditions)
 * Use this version when multiple processes may update status concurrently.
 * @param {string} planPath - Path to plan file
 * @param {string} taskId - Task identifier
 * @param {string} newStatus - New status ('pending'|'in_progress'|'completed'|'failed'|'skipped')
 * @param {object} extras - Additional fields (error, findingsPath, etc.)
 * @returns {Promise<boolean>} Success status
 */
async function updateTaskStatusWithLock(planPath, taskId, newStatus, extras = {}) {
  const result = await loadStatusWithLock(planPath);
  if (!result) return false;

  const { status, release } = result;

  try {
    const task = status.tasks.find(t => t.id === taskId);
    if (!task) {
      return false;
    }

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

    // Ensure summary has all required keys (handles legacy status.json without in_progress)
    status.summary = ensureSummaryKeys(status.summary || {});

    // Update summary incrementally
    if (oldStatus !== newStatus) {
      // Decrement old status count (if valid and > 0)
      if (oldStatus && status.summary[oldStatus] !== undefined && status.summary[oldStatus] > 0) {
        status.summary[oldStatus]--;
      }
      // Increment new status count (if valid)
      if (newStatus && status.summary[newStatus] !== undefined) {
        status.summary[newStatus]++;
      }
    }

    // Safety net: recalculate if summary seems off
    const validation = validateSummary(status, true);
    if (!validation.valid) {
      console.warn(`Summary drift detected and auto-fixed: ${JSON.stringify(validation.mismatches)}`);
    }

    return saveStatus(planPath, status);
  } finally {
    try {
      await release();
    } catch (e) {
      // Lock may have been released already
    }
  }
}

/**
 * Batch update multiple tasks in a single transaction
 * This is more efficient than multiple updateTaskStatusWithLock calls
 * as it only acquires the lock once and does a single read-modify-write.
 *
 * @param {string} planPath - Path to plan file
 * @param {Array<{taskId: string, newStatus: string, extras?: object}>} updates - Array of updates
 * @returns {Promise<{success: boolean, updated: string[], failed: string[], errors: object}>}
 *
 * @example
 * const result = await batchUpdateTasks(planPath, [
 *   { taskId: '1.1', newStatus: 'completed', extras: { notes: 'Done!' } },
 *   { taskId: '1.2', newStatus: 'in_progress' },
 *   { taskId: '1.3', newStatus: 'failed', extras: { error: 'Build failed' } }
 * ]);
 * console.log(result.updated); // ['1.1', '1.2', '1.3']
 */
async function batchUpdateTasks(planPath, updates) {
  const result = {
    success: false,
    updated: [],
    failed: [],
    errors: {}
  };

  if (!updates || updates.length === 0) {
    result.success = true;
    return result;
  }

  const lockResult = await loadStatusWithLock(planPath);
  if (!lockResult) {
    result.errors._general = 'Failed to acquire lock or load status';
    return result;
  }

  const { status, release } = lockResult;

  try {
    const now = new Date().toISOString();

    // Ensure summary has all required keys before processing updates
    status.summary = ensureSummaryKeys(status.summary || {});

    for (const update of updates) {
      const { taskId, newStatus, extras = {} } = update;

      const task = status.tasks.find(t => t.id === taskId);
      if (!task) {
        result.failed.push(taskId);
        result.errors[taskId] = `Task not found: ${taskId}`;
        continue;
      }

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

      // Update summary incrementally
      if (oldStatus !== newStatus) {
        // Decrement old status count (if valid and > 0)
        if (oldStatus && status.summary[oldStatus] !== undefined && status.summary[oldStatus] > 0) {
          status.summary[oldStatus]--;
        }
        // Increment new status count (if valid)
        if (newStatus && status.summary[newStatus] !== undefined) {
          status.summary[newStatus]++;
        }
      }

      result.updated.push(taskId);
    }

    // Safety net: recalculate summary after all updates
    const validation = validateSummary(status, true);
    if (!validation.valid) {
      console.warn(`Summary drift detected and auto-fixed in batch update: ${JSON.stringify(validation.mismatches)}`);
    }

    // Single atomic write for all updates
    const saveSuccess = saveStatus(planPath, status);
    if (saveSuccess) {
      result.success = true;
    } else {
      result.success = false;
      result.errors._save = 'Failed to save status file';
    }

    return result;
  } finally {
    try {
      await release();
    } catch (e) {
      // Lock may have been released already
    }
  }
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

// =============================================================================
// Retry Tracking
// =============================================================================

/**
 * Maximum number of retries allowed for a task
 */
const MAX_RETRIES = 2;

/**
 * Stuck task threshold in milliseconds (30 minutes)
 */
const STUCK_TASK_THRESHOLD_MS = 30 * 60 * 1000;

/**
 * Increment retry count for a failed task
 * @param {string} planPath - Path to plan file
 * @param {string} taskId - Task identifier
 * @param {string} errorMessage - Error message from the failure
 * @returns {object} Result with {canRetry, retryCount, taskId}
 */
function incrementRetryCount(planPath, taskId, errorMessage) {
  const status = loadStatus(planPath);
  if (!status) {
    return { canRetry: false, retryCount: 0, taskId, error: 'Status not found' };
  }

  const task = status.tasks.find(t => t.id === taskId);
  if (!task) {
    return { canRetry: false, retryCount: 0, taskId, error: 'Task not found' };
  }

  // Initialize retry tracking if not present
  task.retryCount = (task.retryCount || 0) + 1;
  task.lastError = errorMessage;
  task.lastErrorAt = new Date().toISOString();

  // Determine if retry is allowed
  const canRetry = task.retryCount <= MAX_RETRIES;

  saveStatus(planPath, status);

  return {
    canRetry,
    retryCount: task.retryCount,
    maxRetries: MAX_RETRIES,
    taskId,
    lastError: errorMessage
  };
}

/**
 * Reset retry count for a task (e.g., when task succeeds after retry)
 * @param {string} planPath - Path to plan file
 * @param {string} taskId - Task identifier
 * @returns {boolean} Success status
 */
function resetRetryCount(planPath, taskId) {
  const status = loadStatus(planPath);
  if (!status) return false;

  const task = status.tasks.find(t => t.id === taskId);
  if (!task) return false;

  // Clear retry tracking but preserve lastError for history
  task.retryCount = 0;

  return saveStatus(planPath, status);
}

/**
 * Get all failed tasks that can be retried
 * @param {string} planPath - Path to plan file
 * @returns {Array} List of tasks that can be retried
 */
function getRetryableTasks(planPath) {
  const status = loadStatus(planPath);
  if (!status) return [];

  return status.tasks
    .filter(t => t.status === 'failed')
    .filter(t => (t.retryCount || 0) < MAX_RETRIES)
    .map(t => ({
      id: t.id,
      description: t.description,
      phase: t.phase,
      retryCount: t.retryCount || 0,
      lastError: t.lastError,
      lastErrorAt: t.lastErrorAt
    }));
}

/**
 * Get failed tasks that have exhausted retries
 * @param {string} planPath - Path to plan file
 * @returns {Array} List of tasks that cannot be retried
 */
function getExhaustedTasks(planPath) {
  const status = loadStatus(planPath);
  if (!status) return [];

  return status.tasks
    .filter(t => t.status === 'failed')
    .filter(t => (t.retryCount || 0) >= MAX_RETRIES)
    .map(t => ({
      id: t.id,
      description: t.description,
      phase: t.phase,
      retryCount: t.retryCount,
      lastError: t.lastError,
      lastErrorAt: t.lastErrorAt
    }));
}

/**
 * Detect and handle stuck tasks (in_progress for too long)
 * @param {string} planPath - Path to plan file
 * @param {number} thresholdMs - Threshold in milliseconds (default: 30 minutes)
 * @returns {Array} List of stuck tasks that were marked as failed
 */
function detectAndMarkStuckTasks(planPath, thresholdMs = STUCK_TASK_THRESHOLD_MS) {
  const status = loadStatus(planPath);
  if (!status) return [];

  const now = new Date();
  const stuckTasks = [];

  for (const task of status.tasks) {
    if (task.status === 'in_progress' && task.startedAt) {
      const startedAt = new Date(task.startedAt);
      const elapsedMs = now - startedAt;

      if (elapsedMs > thresholdMs) {
        // Mark as stuck/failed
        task.status = 'failed';
        task.completedAt = now.toISOString();
        task.duration = elapsedMs;
        task.lastError = `Task stuck: in_progress for ${Math.round(elapsedMs / 60000)} minutes (threshold: ${Math.round(thresholdMs / 60000)} minutes)`;
        task.lastErrorAt = now.toISOString();
        task.stuckDetected = true;

        stuckTasks.push({
          id: task.id,
          description: task.description,
          phase: task.phase,
          startedAt: task.startedAt,
          elapsedMinutes: Math.round(elapsedMs / 60000)
        });
      }
    }
  }

  if (stuckTasks.length > 0) {
    // Update summary
    status.summary = recalculateSummary(status);
    saveStatus(planPath, status);
  }

  return stuckTasks;
}

/**
 * Get stuck tasks without marking them (read-only check)
 * @param {string} planPath - Path to plan file
 * @param {number} thresholdMs - Threshold in milliseconds (default: 30 minutes)
 * @returns {Array} List of potentially stuck tasks
 */
function getStuckTasks(planPath, thresholdMs = STUCK_TASK_THRESHOLD_MS) {
  const status = loadStatus(planPath);
  if (!status) return [];

  const now = new Date();
  const stuckTasks = [];

  for (const task of status.tasks) {
    if (task.status === 'in_progress' && task.startedAt) {
      const startedAt = new Date(task.startedAt);
      const elapsedMs = now - startedAt;

      if (elapsedMs > thresholdMs) {
        stuckTasks.push({
          id: task.id,
          description: task.description,
          phase: task.phase,
          startedAt: task.startedAt,
          elapsedMinutes: Math.round(elapsedMs / 60000),
          thresholdMinutes: Math.round(thresholdMs / 60000)
        });
      }
    }
  }

  return stuckTasks;
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
  loadStatusWithLock,
  saveStatus,
  saveStatusWithLock,
  updateTaskStatus,
  updateTaskStatusWithLock,
  batchUpdateTasks,
  startRun,
  completeRun,
  writeFindings,
  readFindings,
  getProgress,
  // Summary utilities
  VALID_STATUSES,
  createEmptySummary,
  recalculateSummary,
  ensureSummaryKeys,
  validateSummary,
  // Lock utilities
  isLockStale,
  cleanStaleLock,
  isLocked,
  // Lock configuration exported for testing/configuration
  LOCK_OPTIONS,
  LOCK_TIMEOUT_MS,
  STALE_LOCK_MS,
  // Retry tracking
  MAX_RETRIES,
  STUCK_TASK_THRESHOLD_MS,
  incrementRetryCount,
  resetRetryCount,
  getRetryableTasks,
  getExhaustedTasks,
  detectAndMarkStuckTasks,
  getStuckTasks,
  // Backup and recovery
  getBackupPath,
  createBackup,
  restoreFromBackup,
  rebuildStatusFromMarkdown,
  // Plan pointer re-exports for convenience
  getActivePlanPath: planPointer.getActivePlanPath,
  getActivePlanOutputPath: planPointer.getActivePlanOutputPath,
  hasActivePlan: planPointer.hasActivePlan
};
