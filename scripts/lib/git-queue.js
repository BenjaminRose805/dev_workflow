/**
 * @module git-queue
 * @description Serial Git Commit Queue for Parallel Execution
 *
 * Prevents concurrent git commits from causing merge conflicts during parallel
 * task execution. Provides a queue that serializes all commit operations.
 *
 * ## Usage
 *
 * ```javascript
 * const { commitWithQueue, getQueueStatus } = require('./lib/git-queue');
 *
 * // Queue a commit (returns promise)
 * await commitWithQueue('feat: add new feature', ['src/feature.js']);
 *
 * // Bypass queue for manual/direct commits (--no-queue flag)
 * await commitWithQueue('manual: direct commit', [], { noQueue: true });
 * // Or use the convenience function:
 * await commitDirect('manual: direct commit', []);
 *
 * // Check queue status
 * const status = getQueueStatus();
 * console.log(`Pending: ${status.pendingCount}`);
 * ```
 *
 * ## Queue Status File
 *
 * The queue persists status to `docs/plan-outputs/.git-queue-status.json` for:
 * - Tracking pending commits
 * - Recovery after crashes
 * - Monitoring by external tools (TUI, orchestrator)
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

// =============================================================================
// Configuration
// =============================================================================

const QUEUE_STATUS_PATH = 'docs/plan-outputs/.git-queue-status.json';
const LOCK_TIMEOUT_MS = 60000; // 1 minute lock timeout
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// =============================================================================
// Queue State
// =============================================================================

// In-memory queue for pending commits
const commitQueue = [];

// Lock state
let isProcessing = false;
let lockAcquiredAt = null;

// Callbacks waiting for queue to drain
const drainCallbacks = [];

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get project root directory
 * @returns {string} Absolute path to project root
 */
function getProjectRoot() {
  return process.cwd();
}

/**
 * Resolve path relative to project root
 * @param {...string} segments - Path segments
 * @returns {string} Absolute path
 */
function resolvePath(...segments) {
  return path.resolve(getProjectRoot(), ...segments);
}

/**
 * Read queue status from file
 * @returns {object} Queue status object
 */
function readQueueStatus() {
  try {
    const statusPath = resolvePath(QUEUE_STATUS_PATH);
    if (fs.existsSync(statusPath)) {
      const content = fs.readFileSync(statusPath, 'utf8');
      return JSON.parse(content);
    }
  } catch (error) {
    // Status file doesn't exist or is corrupted - return defaults
  }

  return {
    pending: [],
    lastCommitAt: null,
    totalCommits: 0,
    failedCommits: 0,
    isProcessing: false,
    lockAcquiredAt: null
  };
}

/**
 * Write queue status to file (atomic write)
 * @param {object} status - Queue status object
 * @returns {boolean} Success status
 */
function writeQueueStatus(status) {
  try {
    const statusPath = resolvePath(QUEUE_STATUS_PATH);
    const dir = path.dirname(statusPath);

    // Ensure directory exists
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Atomic write: write to temp file, then rename
    const tempPath = statusPath + '.tmp.' + process.pid;
    fs.writeFileSync(tempPath, JSON.stringify(status, null, 2), 'utf8');
    fs.renameSync(tempPath, statusPath);
    return true;
  } catch (error) {
    console.error(`Failed to write queue status: ${error.message}`);
    return false;
  }
}

/**
 * Update queue status file with current state
 */
function syncQueueStatus() {
  const status = readQueueStatus();

  status.pending = commitQueue.map((item, index) => ({
    id: item.id,
    message: item.message,
    files: item.files,
    queuedAt: item.queuedAt,
    position: index
  }));
  status.isProcessing = isProcessing;
  status.lockAcquiredAt = lockAcquiredAt;
  status.pendingCount = commitQueue.length;

  writeQueueStatus(status);
}

/**
 * Generate unique commit ID
 * @returns {string} Unique ID
 */
function generateCommitId() {
  return `commit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Execute git command
 * @param {string[]} args - Git command arguments
 * @param {object} options - Exec options
 * @returns {{success: boolean, output: string, error: string|null}}
 */
function execGit(args, options = {}) {
  try {
    const output = execSync(`git ${args.join(' ')}`, {
      encoding: 'utf8',
      cwd: getProjectRoot(),
      stdio: ['pipe', 'pipe', 'pipe'],
      ...options
    });
    return { success: true, output: output.trim(), error: null };
  } catch (error) {
    return {
      success: false,
      output: error.stdout ? error.stdout.toString().trim() : '',
      error: error.stderr ? error.stderr.toString().trim() : error.message
    };
  }
}

/**
 * Check if there are uncommitted changes
 * @returns {boolean} True if there are changes to commit
 */
function hasUncommittedChanges() {
  const result = execGit(['status', '--porcelain']);
  return result.success && result.output.length > 0;
}

/**
 * Stage files for commit
 * @param {string[]} files - Files to stage (empty for all)
 * @returns {{success: boolean, error: string|null}}
 */
function stageFiles(files) {
  if (files && files.length > 0) {
    // Stage specific files
    const result = execGit(['add', '--', ...files]);
    return { success: result.success, error: result.error };
  } else {
    // Stage all changes
    const result = execGit(['add', '-A']);
    return { success: result.success, error: result.error };
  }
}

/**
 * Create a git commit
 * @param {string} message - Commit message
 * @returns {{success: boolean, commitHash: string|null, error: string|null}}
 */
function createCommit(message) {
  // Use heredoc-style message to handle multi-line messages properly
  const result = execGit(['commit', '-m', message]);

  if (result.success) {
    // Extract commit hash from output
    const hashMatch = result.output.match(/\[[\w-]+ ([a-f0-9]+)\]/);
    const commitHash = hashMatch ? hashMatch[1] : null;
    return { success: true, commitHash, error: null };
  }

  // Check if it's a "nothing to commit" error (not really an error)
  if (result.error && result.error.includes('nothing to commit')) {
    return { success: true, commitHash: null, error: null };
  }

  return { success: false, commitHash: null, error: result.error };
}

// =============================================================================
// Queue Operations
// =============================================================================

/**
 * Add a commit to the queue
 * @param {string} message - Commit message
 * @param {string[]} files - Files to stage (empty for all)
 * @param {object} options - Options
 * @returns {Promise<{success: boolean, commitHash: string|null, error: string|null}>}
 */
function queueCommit(message, files = [], options = {}) {
  return new Promise((resolve, reject) => {
    const id = generateCommitId();
    const queuedAt = new Date().toISOString();

    const item = {
      id,
      message,
      files: files || [],
      queuedAt,
      options,
      resolve,
      reject
    };

    commitQueue.push(item);
    syncQueueStatus();

    // Start processing if not already
    processQueue();
  });
}

/**
 * Process the commit queue
 * Runs commits sequentially to prevent conflicts
 */
async function processQueue() {
  // Already processing
  if (isProcessing) {
    return;
  }

  // Check for stale lock
  if (lockAcquiredAt) {
    const lockAge = Date.now() - new Date(lockAcquiredAt).getTime();
    if (lockAge > LOCK_TIMEOUT_MS) {
      console.warn('Git queue lock timed out, releasing...');
      isProcessing = false;
      lockAcquiredAt = null;
    }
  }

  // Nothing to process
  if (commitQueue.length === 0) {
    // Notify drain callbacks
    while (drainCallbacks.length > 0) {
      const callback = drainCallbacks.shift();
      callback();
    }
    return;
  }

  // Acquire lock
  isProcessing = true;
  lockAcquiredAt = new Date().toISOString();
  syncQueueStatus();

  // Process first item in queue
  const item = commitQueue[0];

  try {
    let result;

    // Stage files
    const stageResult = stageFiles(item.files);
    if (!stageResult.success) {
      result = { success: false, commitHash: null, error: `Failed to stage files: ${stageResult.error}` };
    } else {
      // Create commit
      result = createCommit(item.message);
    }

    // Update status
    const status = readQueueStatus();
    if (result.success) {
      status.lastCommitAt = new Date().toISOString();
      status.totalCommits = (status.totalCommits || 0) + 1;
      if (result.commitHash) {
        status.lastCommitHash = result.commitHash;
      }
    } else {
      status.failedCommits = (status.failedCommits || 0) + 1;
      status.lastError = result.error;
    }
    writeQueueStatus(status);

    // Remove from queue and resolve
    commitQueue.shift();
    item.resolve(result);

  } catch (error) {
    // Unexpected error
    commitQueue.shift();
    item.reject(error);

    const status = readQueueStatus();
    status.failedCommits = (status.failedCommits || 0) + 1;
    status.lastError = error.message;
    writeQueueStatus(status);
  }

  // Release lock
  isProcessing = false;
  lockAcquiredAt = null;
  syncQueueStatus();

  // Process next item
  if (commitQueue.length > 0) {
    // Small delay between commits to prevent rapid-fire issues
    setTimeout(() => processQueue(), 100);
  } else {
    // Notify drain callbacks
    while (drainCallbacks.length > 0) {
      const callback = drainCallbacks.shift();
      callback();
    }
  }
}

/**
 * Commit with queue wrapper (async/await friendly)
 * @param {string} message - Commit message
 * @param {string[]} files - Files to stage (empty for all)
 * @param {object} options - Options
 * @param {boolean} options.noQueue - Bypass queue for direct commit
 * @returns {Promise<{success: boolean, commitHash: string|null, error: string|null, queued: boolean}>}
 */
async function commitWithQueue(message, files = [], options = {}) {
  // Bypass queue if requested
  if (options.noQueue) {
    const stageResult = stageFiles(files);
    if (!stageResult.success) {
      return { success: false, commitHash: null, error: stageResult.error, queued: false };
    }
    const result = createCommit(message);
    return { ...result, queued: false };
  }

  // Queue the commit
  const result = await queueCommit(message, files, options);
  return { ...result, queued: true };
}

/**
 * Get current queue status
 * @returns {object} Queue status
 */
function getQueueStatus() {
  const fileStatus = readQueueStatus();

  return {
    pendingCount: commitQueue.length,
    isProcessing,
    lockAcquiredAt,
    pending: commitQueue.map((item, index) => ({
      id: item.id,
      message: item.message,
      files: item.files,
      queuedAt: item.queuedAt,
      position: index
    })),
    lastCommitAt: fileStatus.lastCommitAt,
    lastCommitHash: fileStatus.lastCommitHash,
    totalCommits: fileStatus.totalCommits || 0,
    failedCommits: fileStatus.failedCommits || 0,
    lastError: fileStatus.lastError
  };
}

/**
 * Wait for the queue to drain
 * @returns {Promise<void>}
 */
function waitForDrain() {
  return new Promise((resolve) => {
    if (commitQueue.length === 0 && !isProcessing) {
      resolve();
    } else {
      drainCallbacks.push(resolve);
    }
  });
}

/**
 * Clear the queue (for recovery/testing)
 * @param {boolean} rejectPending - Whether to reject pending commits
 */
function clearQueue(rejectPending = false) {
  if (rejectPending) {
    while (commitQueue.length > 0) {
      const item = commitQueue.shift();
      item.reject(new Error('Queue cleared'));
    }
  } else {
    commitQueue.length = 0;
  }

  isProcessing = false;
  lockAcquiredAt = null;
  syncQueueStatus();
}

/**
 * Recover from a crash by processing any pending commits in the status file
 * This is called on module load if there are orphaned pending commits
 * @returns {number} Number of recovered commits
 */
function recoverFromCrash() {
  const status = readQueueStatus();

  // Check for orphaned pending commits (in file but not in memory)
  if (status.pending && status.pending.length > 0 && commitQueue.length === 0) {
    console.warn(`Found ${status.pending.length} orphaned pending commits, clearing status...`);

    // Clear the orphaned status (the commits were likely never made)
    status.pending = [];
    status.isProcessing = false;
    status.lockAcquiredAt = null;
    writeQueueStatus(status);

    return status.pending.length;
  }

  // Check for stale lock
  if (status.isProcessing && status.lockAcquiredAt) {
    const lockAge = Date.now() - new Date(status.lockAcquiredAt).getTime();
    if (lockAge > LOCK_TIMEOUT_MS) {
      console.warn('Found stale lock in queue status, clearing...');
      status.isProcessing = false;
      status.lockAcquiredAt = null;
      writeQueueStatus(status);
    }
  }

  return 0;
}

/**
 * Direct commit without queue (--no-queue convenience function)
 * Use this for manual operations that should bypass the queue.
 *
 * @param {string} message - Commit message
 * @param {string[]} files - Files to stage (empty for all)
 * @returns {Promise<{success: boolean, commitHash: string|null, error: string|null, queued: boolean}>}
 *
 * @example
 * // Bypass queue for manual operations
 * await commitDirect('manual: fix typo', ['README.md']);
 */
async function commitDirect(message, files = []) {
  return commitWithQueue(message, files, { noQueue: true });
}

// =============================================================================
// Exports
// =============================================================================

module.exports = {
  // Main API
  commitWithQueue,
  commitDirect,
  queueCommit,
  getQueueStatus,
  waitForDrain,
  clearQueue,
  recoverFromCrash,

  // Low-level utilities (for testing/advanced use)
  stageFiles,
  createCommit,
  hasUncommittedChanges,
  execGit,

  // Configuration
  QUEUE_STATUS_PATH,
  LOCK_TIMEOUT_MS
};
