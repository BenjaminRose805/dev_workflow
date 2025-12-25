/**
 * @module plan-status
 * @description Unified API for Plan Execution Status Management
 *
 * This module consolidates functionality from:
 * - plan-output-utils.js (core status I/O)
 * - status-manager.js (higher-level wrappers)
 * - plan-pointer.js (active plan resolution)
 *
 * ## Source of Truth
 *
 * **status.json is THE authoritative source of truth for execution state.**
 *
 * The markdown plan file (e.g., `docs/plans/my-plan.md`) is reference documentation
 * that describes WHAT needs to be done. It should NOT be modified during execution.
 *
 * ## API Categories
 *
 * - **Path Resolution**: getActivePlanPath(), getOutputDir(), getStatusPath()
 * - **Core I/O**: loadStatus(), saveStatus()
 * - **Task Updates**: updateTaskStatus(), markTaskStarted(), markTaskCompleted(), etc.
 * - **Queries**: getNextTasks(), getProgress(), getStatusSummary()
 * - **Initialization**: initializePlanStatus()
 * - **Findings**: writeFindings(), readFindings()
 * - **Runs**: startRun(), completeRun()
 *
 * @example
 * const planStatus = require('./lib/plan-status');
 *
 * // Get active plan and load status
 * const planPath = planStatus.getActivePlanPath();
 * const status = planStatus.loadStatus(planPath);
 *
 * // Update task status
 * planStatus.markTaskStarted(planPath, '1.1');
 * planStatus.markTaskCompleted(planPath, '1.1', { notes: 'Done' });
 *
 * // Get next tasks
 * const nextTasks = planStatus.getNextTasks(planPath, 5);
 */

const fs = require('fs');
const path = require('path');

// Import getTitle from markdown-parser to avoid duplication
const { getTitle: getMarkdownTitle } = require('./markdown-parser');

// =============================================================================
// Configuration
// =============================================================================

// Pointer file for current plan
const CURRENT_PLAN_FILE = '.claude/current-plan.txt';

// Output directory base path
const OUTPUT_BASE = 'docs/plan-outputs';

// Valid task statuses
const VALID_STATUSES = ['pending', 'in_progress', 'completed', 'failed', 'skipped'];

// =============================================================================
// Path Resolution
// =============================================================================

/**
 * Get the project root directory
 * @returns {string} Absolute path to project root
 */
function getProjectRoot() {
  return process.cwd();
}

/**
 * Resolve a path relative to project root
 * @param {...string} segments - Path segments
 * @returns {string} Absolute path
 */
function resolvePath(...segments) {
  return path.resolve(getProjectRoot(), ...segments);
}

/**
 * Get the active plan path from .claude/current-plan.txt
 * @returns {string|null} The plan path, or null if not set
 */
function getActivePlanPath() {
  try {
    const pointerPath = resolvePath(CURRENT_PLAN_FILE);
    if (!fs.existsSync(pointerPath)) {
      return null;
    }
    const content = fs.readFileSync(pointerPath, 'utf8').trim();
    return content || null;
  } catch (error) {
    return null;
  }
}

/**
 * Check if an active plan is set
 * @returns {boolean} True if an active plan is set
 */
function hasActivePlan() {
  return getActivePlanPath() !== null;
}

/**
 * Get plan path from command line args, falling back to active plan.
 * Checks for --plan argument first, then falls back to getActivePlanPath().
 * Validates that the plan file exists.
 *
 * @param {string[]} args - Command line arguments (may include --plan <path> or --plan=<path>)
 * @returns {{ planPath: string|null, error: string|null, remainingArgs: string[] }}
 *   - planPath: The resolved plan path, or null if error
 *   - error: Error message if plan not found or not set, null otherwise
 *   - remainingArgs: Args with --plan and its value removed
 *
 * @example
 * const result = getPlanPathFromArgs(['--plan', 'docs/plans/my-plan.md', 'status']);
 * // { planPath: 'docs/plans/my-plan.md', error: null, remainingArgs: ['status'] }
 *
 * const result = getPlanPathFromArgs(['status']);
 * // Falls back to getActivePlanPath(), returns that if set
 */
function getPlanPathFromArgs(args) {
  let planArg = null;
  const remainingArgs = [];

  // Extract --plan argument
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--plan' && i + 1 < args.length) {
      planArg = args[i + 1];
      i++; // Skip the next arg (the plan path)
    } else if (args[i].startsWith('--plan=')) {
      planArg = args[i].slice('--plan='.length);
    } else {
      remainingArgs.push(args[i]);
    }
  }

  // Determine plan path
  let planPath;
  if (planArg) {
    // Validate the provided plan path exists
    const absolutePlanPath = path.isAbsolute(planArg) ? planArg : resolvePath(planArg);
    if (!fs.existsSync(absolutePlanPath)) {
      return {
        planPath: null,
        error: `Plan file not found: ${planArg}`,
        remainingArgs
      };
    }
    planPath = planArg;
  } else {
    // Fall back to active plan from current-plan.txt
    planPath = getActivePlanPath();
    if (!planPath) {
      return {
        planPath: null,
        error: 'No active plan set. Use --plan <path> or /plan:set to choose a plan first.',
        remainingArgs
      };
    }
  }

  return { planPath, error: null, remainingArgs };
}

/**
 * Get output directory name from plan path
 * @param {string} planPath - Path to plan file
 * @returns {string} Output directory name (e.g., 'my-plan')
 */
function getOutputDirName(planPath) {
  return path.basename(planPath, '.md');
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

// =============================================================================
// Directory Management
// =============================================================================

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
  return fs.existsSync(getOutputDir(planPath));
}

// =============================================================================
// Status I/O (Core)
// =============================================================================

/**
 * Read file safely
 * @param {string} filePath - Path to file
 * @returns {string|null} File contents or null
 */
function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    return null;
  }
}

/**
 * Write file atomically (write to temp, then rename)
 * @param {string} filePath - Path to file
 * @param {string} content - Content to write
 * @returns {boolean} Success status
 */
function writeFileAtomic(filePath, content) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const tempPath = filePath + '.tmp.' + process.pid;
    fs.writeFileSync(tempPath, content, 'utf8');
    fs.renameSync(tempPath, filePath);
    return true;
  } catch (error) {
    console.error(`Failed to write file: ${error.message}`);
    return false;
  }
}

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
      summary.pending++;
    }
  }

  return summary;
}

/**
 * Ensure summary has all required keys
 * @param {object} summary - Summary object to normalize
 * @returns {object} Normalized summary
 */
function ensureSummaryKeys(summary) {
  const defaults = createEmptySummary();
  return { ...defaults, ...summary };
}

/**
 * Load status.json for a plan
 * Validates and auto-fixes summary mismatches on load.
 * @param {string} planPath - Path to plan file
 * @param {object} options - Options
 * @param {boolean} options.skipValidation - Skip summary validation (default: false)
 * @returns {object|null} Status object or null if not found
 */
function loadStatus(planPath, options = {}) {
  const statusPath = getStatusPath(planPath);
  const content = readFile(statusPath);

  if (!content) return null;

  let status;
  try {
    status = JSON.parse(content);
  } catch (parseError) {
    console.error(`Failed to parse status.json: ${parseError.message}`);
    return null;
  }

  // Validate and auto-fix summary on load (unless skipped)
  if (!options.skipValidation) {
    status.summary = ensureSummaryKeys(status.summary || {});
    const calculated = recalculateSummary(status);

    let needsSave = false;
    for (const key of Object.keys(calculated)) {
      if (status.summary[key] !== calculated[key]) {
        needsSave = true;
        break;
      }
    }

    if (needsSave) {
      status.summary = calculated;
      saveStatus(planPath, status);
    }
  }

  return status;
}

/**
 * Save status.json for a plan
 * Uses atomic write to prevent corruption from partial writes.
 * Preserves all fields including:
 * - task.executionConstraints (per-task constraint metadata)
 * - status.sequentialGroups (plan-level constraint summary)
 * @param {string} planPath - Path to plan file
 * @param {object} status - Status object to save
 * @returns {boolean} Success status
 */
function saveStatus(planPath, status) {
  const statusPath = getStatusPath(planPath);
  status.lastUpdatedAt = new Date().toISOString();

  // Clean up undefined sequentialGroups (don't write null/undefined to JSON)
  if (status.sequentialGroups === undefined || status.sequentialGroups === null) {
    delete status.sequentialGroups;
  }

  return writeFileAtomic(statusPath, JSON.stringify(status, null, 2));
}

// =============================================================================
// Task Updates
// =============================================================================

/**
 * Update a task's status
 * @param {string} planPath - Path to plan file
 * @param {string} taskId - Task identifier
 * @param {string} newStatus - New status ('pending'|'in_progress'|'completed'|'failed'|'skipped')
 * @param {object} extras - Additional fields (error, notes, findingsPath, etc.)
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
  status.summary = ensureSummaryKeys(status.summary || {});
  if (oldStatus !== newStatus) {
    if (oldStatus && status.summary[oldStatus] !== undefined && status.summary[oldStatus] > 0) {
      status.summary[oldStatus]--;
    }
    if (newStatus && status.summary[newStatus] !== undefined) {
      status.summary[newStatus]++;
    }
  }

  // Safety net: recalculate if summary seems off
  const calculated = recalculateSummary(status);
  let drift = false;
  for (const key of Object.keys(calculated)) {
    if (status.summary[key] !== calculated[key]) {
      drift = true;
      break;
    }
  }
  if (drift) {
    status.summary = calculated;
  }

  return saveStatus(planPath, status);
}

/**
 * Mark a task as started (in_progress)
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
 * @param {object} options - Optional { notes, findings }
 * @returns {boolean} Success status
 */
function markTaskCompleted(planPath, taskId, options = {}) {
  const extras = {};

  if (options.notes) {
    extras.notes = options.notes;
  }

  if (options.findings) {
    const findingsPath = writeFindings(planPath, taskId, options.findings);
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

// =============================================================================
// Queries
// =============================================================================

/**
 * Get next recommended tasks
 * @param {string} planPath - Path to plan file
 * @param {number} count - Maximum number of tasks to return
 * @returns {Array} Array of next tasks
 */
function getNextTasks(planPath, count = 5) {
  const status = loadStatus(planPath);
  if (!status) return [];

  // First, return any in-progress tasks
  const inProgress = status.tasks.filter(t => t.status === 'in_progress');
  if (inProgress.length > 0) {
    return inProgress.slice(0, count).map(t => ({
      id: t.id,
      phase: t.phase,
      description: t.description,
      status: t.status,
      reason: 'in_progress - should be completed first'
    }));
  }

  // Then, get pending tasks in order
  const pending = status.tasks
    .filter(t => t.status === 'pending')
    .slice(0, count);

  return pending.map(t => ({
    id: t.id,
    phase: t.phase,
    description: t.description,
    status: t.status,
    reason: 'pending - ready to implement'
  }));
}

/**
 * Get progress summary for a plan
 * @param {string} planPath - Path to plan file
 * @returns {object|null} Progress summary or null
 */
function getProgress(planPath) {
  const status = loadStatus(planPath);
  if (!status) return null;

  const summary = status.summary || createEmptySummary();
  const total = summary.totalTasks || 0;
  const completed = summary.completed || 0;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    planName: status.planName,
    planPath: status.planPath,
    currentPhase: status.currentPhase,
    summary: summary,
    percentage: percentage,
    lastUpdated: status.lastUpdatedAt
  };
}

/**
 * Get overall status summary (matches plan-orchestrator.js format)
 * @param {string} planPath - Path to plan file
 * @returns {object|null} Status summary or null
 */
function getStatusSummary(planPath) {
  const status = loadStatus(planPath);
  if (!status) return null;

  const summary = status.summary || createEmptySummary();
  const total = summary.totalTasks || 0;
  const completed = summary.completed || 0;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    planPath: status.planPath,
    planName: status.planName,
    currentPhase: status.currentPhase,
    total: total,
    completed: completed,
    inProgress: summary.in_progress || 0,
    failed: summary.failed || 0,
    skipped: summary.skipped || 0,
    pending: summary.pending || 0,
    percentage: percentage
  };
}

// =============================================================================
// Initialization
// =============================================================================

/**
 * Parse phases and tasks from markdown plan
 * @param {string} content - Plan markdown content
 * @returns {Array} Array of phases with tasks
 */
function parsePhases(content) {
  const phases = [];
  let currentPhase = null;

  const lines = content.split('\n');
  for (const line of lines) {
    // Match phase headers: ## Phase N: Title
    const phaseMatch = line.match(/^##\s+Phase\s+(\d+):\s*(.+)$/);
    if (phaseMatch) {
      currentPhase = {
        id: parseInt(phaseMatch[1]),
        name: phaseMatch[2].trim(),
        tasks: []
      };
      phases.push(currentPhase);
      continue;
    }

    // Match task items: - [ ] N.N Description
    const taskMatch = line.match(/^-\s+\[([ x])\]\s+(\d+\.\d+(?:\.\d+)?)\s+(.+)$/);
    if (taskMatch && currentPhase) {
      currentPhase.tasks.push({
        id: taskMatch[2],
        title: taskMatch[3].trim(),
        complete: taskMatch[1] === 'x'
      });
    }
  }

  return phases;
}

/**
 * Get plan title from markdown content
 * Delegates to markdown-parser.js for consistent behavior
 * @param {string} content - Plan markdown content
 * @returns {string|null} Plan title or null
 */
function getTitle(content) {
  return getMarkdownTitle(content);
}

/**
 * Initialize status tracking for a plan
 * Creates output directory and status.json if they don't exist
 * Parses execution notes and attaches constraints to tasks
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

    // Parse execution constraints from plan content
    const constraints = parseExecutionNotes(content);

    // Build a lookup map for quick constraint checking
    const constraintMap = new Map();
    for (const constraint of constraints) {
      for (const taskId of constraint.taskIds) {
        constraintMap.set(taskId, {
          sequential: true,
          sequentialGroup: constraint.taskRange,
          reason: constraint.reason
        });
      }
    }

    // Build sequentialGroups summary for top-level storage
    const sequentialGroups = constraints.map(c => ({
      taskRange: c.taskRange,
      taskIds: c.taskIds,
      reason: c.reason
    }));

    // Convert phases to task list with constraints
    const tasks = [];
    for (const phase of phases) {
      for (const task of phase.tasks) {
        const taskData = {
          id: task.id,
          phase: `Phase ${phase.id}: ${phase.name}`,
          description: task.title
        };

        // Attach execution constraints if present
        const taskConstraint = constraintMap.get(task.id);
        if (taskConstraint) {
          taskData.executionConstraints = taskConstraint;
        }

        tasks.push(taskData);
      }
    }

    // Create output directory if needed
    if (!outputDirExists(planPath)) {
      if (!createOutputDir(planPath)) {
        return { success: false, status: null, error: 'Could not create output directory' };
      }
    }

    // Check if status already exists
    let status = loadStatus(planPath, { skipValidation: true });
    if (!status) {
      // Initialize new status
      const now = new Date().toISOString();
      status = {
        _comment: "This file is the authoritative source of truth for task execution state. The markdown plan file is read-only reference documentation. Use status-cli.js to update task status.",
        planPath,
        planName: title,
        createdAt: now,
        lastUpdatedAt: now,
        currentPhase: tasks.length > 0 ? tasks[0].phase : null,
        sequentialGroups: sequentialGroups.length > 0 ? sequentialGroups : undefined,
        tasks: tasks.map(task => {
          const taskObj = {
            id: task.id,
            phase: task.phase,
            description: task.description,
            status: 'pending'
          };
          // Include executionConstraints if present
          if (task.executionConstraints) {
            taskObj.executionConstraints = task.executionConstraints;
          }
          return taskObj;
        }),
        runs: [],
        summary: createEmptySummary()
      };

      status.summary.totalTasks = tasks.length;
      status.summary.pending = tasks.length;

      if (!saveStatus(planPath, status)) {
        return { success: false, status: null, error: 'Could not initialize status' };
      }
    }

    return { success: true, status, error: null };
  } catch (error) {
    return { success: false, status: null, error: error.message };
  }
}

/**
 * Refresh constraints from the plan file and update status.json
 * Useful if plan is edited after initialization to add/remove [SEQUENTIAL] annotations
 * @param {string} planPath - Path to plan file
 * @returns {{ success: boolean, updated: boolean, error: string|null }}
 */
function refreshConstraints(planPath) {
  try {
    // Read plan content
    const absolutePath = path.isAbsolute(planPath) ? planPath : resolvePath(planPath);
    const content = readFile(absolutePath);
    if (!content) {
      return { success: false, updated: false, error: 'Could not read plan file' };
    }

    // Load existing status
    const status = loadStatus(planPath);
    if (!status) {
      return { success: false, updated: false, error: 'No status.json found. Run init first.' };
    }

    // Parse execution constraints from plan content
    const constraints = parseExecutionNotes(content);

    // Build a lookup map for quick constraint checking
    const constraintMap = new Map();
    for (const constraint of constraints) {
      for (const taskId of constraint.taskIds) {
        constraintMap.set(taskId, {
          sequential: true,
          sequentialGroup: constraint.taskRange,
          reason: constraint.reason
        });
      }
    }

    // Build sequentialGroups summary for top-level storage
    const sequentialGroups = constraints.map(c => ({
      taskRange: c.taskRange,
      taskIds: c.taskIds,
      reason: c.reason
    }));

    // Update status with new constraints
    let updated = false;

    // Update top-level sequentialGroups
    const oldGroups = JSON.stringify(status.sequentialGroups || []);
    const newGroups = JSON.stringify(sequentialGroups);
    if (oldGroups !== newGroups) {
      status.sequentialGroups = sequentialGroups.length > 0 ? sequentialGroups : undefined;
      updated = true;
    }

    // Update per-task executionConstraints
    for (const task of status.tasks) {
      const newConstraint = constraintMap.get(task.id);
      const oldConstraint = JSON.stringify(task.executionConstraints || null);
      const newConstraintStr = JSON.stringify(newConstraint || null);

      if (oldConstraint !== newConstraintStr) {
        if (newConstraint) {
          task.executionConstraints = newConstraint;
        } else {
          delete task.executionConstraints;
        }
        updated = true;
      }
    }

    // Save if there were updates
    if (updated) {
      if (!saveStatus(planPath, status)) {
        return { success: false, updated: false, error: 'Could not save updated status' };
      }
    }

    return { success: true, updated, error: null };
  } catch (error) {
    return { success: false, updated: false, error: error.message };
  }
}

// =============================================================================
// Findings
// =============================================================================

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

  try {
    if (!fs.existsSync(findingsDir)) {
      fs.mkdirSync(findingsDir, { recursive: true });
    }
    fs.writeFileSync(filepath, content, 'utf8');
    return path.relative(getProjectRoot(), filepath);
  } catch (error) {
    console.error(`Failed to write findings: ${error.message}`);
    return null;
  }
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

// =============================================================================
// Run Management
// =============================================================================

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

// =============================================================================
// Constraint Parsing
// =============================================================================

/**
 * Expand a task range string into an array of task IDs
 * @param {string} rangeStr - Range string (e.g., "3.1-3.4", "3.1", "3.1,3.3")
 * @returns {string[]} Array of task IDs
 * @example
 * expandTaskRange("3.1-3.4") // ["3.1", "3.2", "3.3", "3.4"]
 * expandTaskRange("3.1") // ["3.1"]
 * expandTaskRange("3.1,3.3") // ["3.1", "3.3"]
 */
function expandTaskRange(rangeStr) {
  if (!rangeStr || typeof rangeStr !== 'string') {
    return [];
  }

  const trimmed = rangeStr.trim();

  // Handle comma-separated list: "3.1,3.3,3.5"
  if (trimmed.includes(',')) {
    return trimmed.split(',').map(s => s.trim()).filter(Boolean);
  }

  // Handle range: "3.1-3.4"
  const rangeMatch = trimmed.match(/^(\d+)\.(\d+)-(\d+)\.(\d+)$/);
  if (rangeMatch) {
    const [, startPhase, startTask, endPhase, endTask] = rangeMatch;
    const phase = parseInt(startPhase);
    const start = parseInt(startTask);
    const end = parseInt(endTask);

    // Only expand if same phase and valid range
    if (startPhase === endPhase && start <= end) {
      const tasks = [];
      for (let i = start; i <= end; i++) {
        tasks.push(`${phase}.${i}`);
      }
      return tasks;
    }
    // Different phases or invalid range - return as-is (start and end)
    return [`${startPhase}.${startTask}`, `${endPhase}.${endTask}`];
  }

  // Single task: "3.1"
  if (/^\d+\.\d+$/.test(trimmed)) {
    return [trimmed];
  }

  return [];
}

/**
 * Parse execution notes from plan content to extract sequential and parallel constraints
 * @param {string} planContent - Full markdown content of the plan
 * @returns {{
 *   sequential: Array<{taskRange: string, taskIds: string[], reason: string}>,
 *   parallel: Array<{phaseRange: string, phaseIds: number[], reason: string}>
 * }} Object with sequential task constraints and parallel phase constraints
 * @example
 * const constraints = parseExecutionNotes(planContent);
 * // Returns: {
 * //   sequential: [{ taskRange: "3.1-3.4", taskIds: ["3.1","3.2","3.3","3.4"], reason: "all modify same file" }],
 * //   parallel: [{ phaseRange: "1-3", phaseIds: [1, 2, 3], reason: "independent work" }]
 * // }
 *
 * // For backward compatibility, the returned object also acts as an array of sequential constraints
 */
function parseExecutionNotes(planContent) {
  if (!planContent || typeof planContent !== 'string') {
    const result = [];
    result.sequential = [];
    result.parallel = [];
    return result;
  }

  const sequential = [];
  const parallel = [];

  // Match pattern: **Execution Note:** Tasks X.Y-X.Z are [SEQUENTIAL] - reason
  // Also handle: **Execution Note:** Tasks X.Y-X.Z are [SEQUENTIAL] (reason)
  // And multiple task ranges in same note
  const sequentialPattern = /\*\*Execution Note:\*\*\s*Tasks?\s+([\d.,\s-]+)\s+(?:are|is)\s+\[SEQUENTIAL\]\s*[-–—]?\s*(.+?)(?:\n|$)/gi;

  let match;
  while ((match = sequentialPattern.exec(planContent)) !== null) {
    const taskRangeStr = match[1].trim();
    const reason = match[2].trim();

    // Handle multiple ranges separated by "and" or ","
    // e.g., "Tasks 2.1-2.3 and 3.1-3.4 are [SEQUENTIAL]"
    const ranges = taskRangeStr.split(/\s+and\s+|,\s*(?=\d)/i);

    for (const range of ranges) {
      const cleanRange = range.trim();
      if (cleanRange) {
        const taskIds = expandTaskRange(cleanRange);
        if (taskIds.length > 0) {
          sequential.push({
            taskRange: cleanRange,
            taskIds,
            reason
          });
        }
      }
    }
  }

  // Match pattern: **Execution Note:** Phases X-Y are [PARALLEL] - reason
  // Also handle: **Execution Note:** Phase X, Y, Z are [PARALLEL] - reason
  const parallelPattern = /\*\*Execution Note:\*\*\s*Phases?\s+([\d,\s-]+)\s+(?:are|is)\s+\[PARALLEL\]\s*[-–—]?\s*(.+?)(?:\n|$)/gi;

  while ((match = parallelPattern.exec(planContent)) !== null) {
    const phaseRangeStr = match[1].trim();
    const reason = match[2].trim();

    const phaseIds = expandPhaseRange(phaseRangeStr);
    if (phaseIds.length > 0) {
      parallel.push({
        phaseRange: phaseRangeStr,
        phaseIds,
        reason
      });
    }
  }

  // For backward compatibility, return an array-like object
  // that also has .sequential and .parallel properties
  const result = [...sequential];
  result.sequential = sequential;
  result.parallel = parallel;

  return result;
}

/**
 * Expand a phase range string into an array of phase numbers
 * @param {string} rangeStr - Range string (e.g., "1-3", "1, 2, 3", "1-3, 5")
 * @returns {number[]} Array of phase numbers
 * @example
 * expandPhaseRange("1-3") // [1, 2, 3]
 * expandPhaseRange("1, 2, 3") // [1, 2, 3]
 * expandPhaseRange("1-3, 5") // [1, 2, 3, 5]
 */
function expandPhaseRange(rangeStr) {
  if (!rangeStr || typeof rangeStr !== 'string') {
    return [];
  }

  const result = new Set();
  const trimmed = rangeStr.trim();

  // Split by comma for multiple ranges/numbers
  const parts = trimmed.split(/,\s*/);

  for (const part of parts) {
    const cleanPart = part.trim();

    // Check for range: "1-3"
    const rangeMatch = cleanPart.match(/^(\d+)\s*-\s*(\d+)$/);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1]);
      const end = parseInt(rangeMatch[2]);
      if (start <= end) {
        for (let i = start; i <= end; i++) {
          result.add(i);
        }
      }
      continue;
    }

    // Single number
    const numMatch = cleanPart.match(/^(\d+)$/);
    if (numMatch) {
      result.add(parseInt(numMatch[1]));
    }
  }

  return Array.from(result).sort((a, b) => a - b);
}

/**
 * Get execution constraints for a specific task
 * @param {string} planPath - Path to plan file
 * @param {string} taskId - Task identifier (e.g., "3.1")
 * @returns {{sequential: boolean, sequentialGroup: string|null, reason: string|null}|null} Constraint object or null
 */
function getTaskConstraints(planPath, taskId) {
  try {
    const absolutePath = path.isAbsolute(planPath) ? planPath : resolvePath(planPath);
    const content = readFile(absolutePath);
    if (!content) {
      return null;
    }

    const constraints = parseExecutionNotes(content);

    for (const constraint of constraints) {
      if (constraint.taskIds.includes(taskId)) {
        return {
          sequential: true,
          sequentialGroup: constraint.taskRange,
          reason: constraint.reason
        };
      }
    }

    return null;
  } catch (error) {
    console.error(`Failed to get task constraints: ${error.message}`);
    return null;
  }
}

/**
 * Get phases that can run in parallel based on [PARALLEL] annotations
 * Also checks for file conflicts between phases to warn about potential issues.
 *
 * @param {string} planPath - Path to plan file
 * @returns {{
 *   parallelGroups: Array<{phaseIds: number[], reason: string}>,
 *   allParallelPhases: number[],
 *   hasConflicts: boolean,
 *   conflicts: Array<{file: string, phases: number[]}>
 * }} Parallel phase information
 *
 * @example
 * const result = getParallelPhases('docs/plans/my-plan.md');
 * // {
 * //   parallelGroups: [{ phaseIds: [1, 2, 3], reason: "independent work" }],
 * //   allParallelPhases: [1, 2, 3],
 * //   hasConflicts: false,
 * //   conflicts: []
 * // }
 */
function getParallelPhases(planPath) {
  const result = {
    parallelGroups: [],
    allParallelPhases: [],
    hasConflicts: false,
    conflicts: []
  };

  try {
    // Read plan content
    const absolutePath = path.isAbsolute(planPath) ? planPath : resolvePath(planPath);
    const content = readFile(absolutePath);
    if (!content) {
      return result;
    }

    // Parse execution notes to get parallel phase annotations
    const constraints = parseExecutionNotes(content);

    if (!constraints.parallel || constraints.parallel.length === 0) {
      return result;
    }

    // Build parallel groups
    const allPhases = new Set();
    for (const group of constraints.parallel) {
      result.parallelGroups.push({
        phaseIds: group.phaseIds,
        reason: group.reason
      });
      for (const phaseId of group.phaseIds) {
        allPhases.add(phaseId);
      }
    }
    result.allParallelPhases = Array.from(allPhases).sort((a, b) => a - b);

    // Load status to get tasks by phase for conflict detection
    const status = loadStatus(planPath);
    if (!status || !status.tasks) {
      return result;
    }

    // Group tasks by phase number
    const tasksByPhase = new Map();
    for (const task of status.tasks) {
      const phaseMatch = task.phase ? task.phase.match(/Phase\s+(\d+)/) : null;
      if (phaseMatch) {
        const phaseNum = parseInt(phaseMatch[1]);
        if (!tasksByPhase.has(phaseNum)) {
          tasksByPhase.set(phaseNum, []);
        }
        tasksByPhase.get(phaseNum).push(task);
      }
    }

    // Check for file conflicts between parallel phases
    const fileToPhases = new Map();

    for (const phaseNum of result.allParallelPhases) {
      const phaseTasks = tasksByPhase.get(phaseNum) || [];
      for (const task of phaseTasks) {
        const files = extractFileReferences(task.description);
        for (const file of files) {
          const normalizedFile = file.toLowerCase();
          if (!fileToPhases.has(normalizedFile)) {
            fileToPhases.set(normalizedFile, {
              originalFile: file,
              phases: new Set()
            });
          }
          fileToPhases.get(normalizedFile).phases.add(phaseNum);
        }
      }
    }

    // Find files referenced by multiple parallel phases
    for (const [normalizedFile, data] of fileToPhases) {
      if (data.phases.size > 1) {
        result.conflicts.push({
          file: data.originalFile,
          phases: Array.from(data.phases).sort((a, b) => a - b)
        });
        result.hasConflicts = true;
      }
    }

    // Sort conflicts by file path
    result.conflicts.sort((a, b) => a.file.localeCompare(b.file));

    return result;
  } catch (error) {
    console.error(`Failed to get parallel phases: ${error.message}`);
    return result;
  }
}

// =============================================================================
// File Conflict Detection
// =============================================================================

/**
 * Extract file references from a task description
 * Matches:
 * - Backtick-quoted paths: `path/to/file.ts`
 * - Common directory prefixes: src/, tests/, docs/, scripts/, lib/
 * - Modify/update patterns: "modify X.ts", "update X.ts", "modifying X.ts", "updating X.ts"
 *
 * @param {string} taskDescription - Task description text
 * @returns {string[]} Array of unique file paths found
 *
 * @example
 * extractFileReferences("Update `src/api.ts` and `src/utils.ts`")
 * // Returns: ["src/api.ts", "src/utils.ts"]
 *
 * extractFileReferences("Modify scripts/status-cli.js to add new feature")
 * // Returns: ["scripts/status-cli.js"]
 */
function extractFileReferences(taskDescription) {
  if (!taskDescription || typeof taskDescription !== 'string') {
    return [];
  }

  const files = new Set();

  // Pattern 1: Backtick-quoted paths with file extension
  // Matches: `path/to/file.ts`, `src/utils.js`, `docs/readme.md`
  const backtickPattern = /`([^`]+\.[a-zA-Z0-9]+)`/g;
  let match;
  while ((match = backtickPattern.exec(taskDescription)) !== null) {
    const filePath = match[1].trim();
    // Filter out things that look like code snippets rather than paths
    if (!filePath.includes(' ') && !filePath.includes('(') && !filePath.includes(')')) {
      files.add(filePath);
    }
  }

  // Pattern 2: Common directory prefixes with file paths
  // Matches: src/api.ts, tests/unit/foo.test.js, docs/plans/plan.md, scripts/status-cli.js, lib/utils.js
  const dirPattern = /\b(src|tests|docs|scripts|lib|\.claude)\/[\w./-]+\.[a-zA-Z0-9]+\b/g;
  while ((match = dirPattern.exec(taskDescription)) !== null) {
    files.add(match[0]);
  }

  // Pattern 3: Modify/update patterns
  // Matches: "modify status-cli.js", "update plan-status.js", "modifying file.ts", "updating utils.js"
  const modifyPattern = /\b(?:modif(?:y|ying)|updat(?:e|ing)|edit(?:ing)?|chang(?:e|ing))\s+[`]?([a-zA-Z0-9_-]+\.[a-zA-Z0-9]+)[`]?\b/gi;
  while ((match = modifyPattern.exec(taskDescription)) !== null) {
    const filename = match[1];
    // Only add if it looks like a filename (has extension)
    if (/\.[a-zA-Z0-9]+$/.test(filename)) {
      files.add(filename);
    }
  }

  // Pattern 4: "in <filename>" patterns for files with known extensions
  // Matches: "in status-cli.js", "in plan-status.js"
  const inFilePattern = /\bin\s+[`]?([a-zA-Z0-9_-]+\.(?:js|ts|tsx|jsx|json|md|py|sh))[`]?\b/gi;
  while ((match = inFilePattern.exec(taskDescription)) !== null) {
    files.add(match[1]);
  }

  return Array.from(files);
}

/**
 * Detect file conflicts between multiple tasks
 * Identifies files that are referenced by more than one task.
 *
 * @param {Array<{id: string, description: string}>} tasks - Array of task objects
 * @returns {Array<{file: string, taskIds: string[]}>} Array of conflicts
 *
 * @example
 * const tasks = [
 *   { id: '2.1', description: 'Update `src/api.ts` with new endpoint' },
 *   { id: '2.2', description: 'Modify `src/api.ts` for authentication' }
 * ];
 * detectFileConflicts(tasks)
 * // Returns: [{ file: 'src/api.ts', taskIds: ['2.1', '2.2'] }]
 */
function detectFileConflicts(tasks) {
  if (!tasks || !Array.isArray(tasks)) {
    return [];
  }

  // Build map of file -> task IDs
  const fileToTasks = new Map();

  for (const task of tasks) {
    if (!task || !task.id || !task.description) {
      continue;
    }

    const files = extractFileReferences(task.description);
    for (const file of files) {
      // Normalize file path to handle both full paths and basenames
      const normalizedFile = file.toLowerCase();

      if (!fileToTasks.has(normalizedFile)) {
        fileToTasks.set(normalizedFile, {
          originalFile: file,
          taskIds: []
        });
      }
      fileToTasks.get(normalizedFile).taskIds.push(task.id);
    }
  }

  // Find files referenced by multiple tasks
  const conflicts = [];
  for (const [normalizedFile, data] of fileToTasks) {
    if (data.taskIds.length > 1) {
      conflicts.push({
        file: data.originalFile,
        taskIds: data.taskIds
      });
    }
  }

  // Sort conflicts by file path for consistent output
  conflicts.sort((a, b) => a.file.localeCompare(b.file));

  return conflicts;
}

// =============================================================================
// Validation
// =============================================================================

/**
 * Validate summary against actual task counts
 * @param {object} status - Full status object
 * @param {boolean} autoFix - If true, replace summary with recalculated values
 * @returns {{valid: boolean, mismatches: object, fixed: boolean}}
 */
function validateSummary(status, autoFix = false) {
  const result = { valid: true, mismatches: {}, fixed: false };

  if (!status || !status.tasks) {
    return result;
  }

  status.summary = ensureSummaryKeys(status.summary || {});
  const calculated = recalculateSummary(status);

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

// =============================================================================
// Git Operations (via git-queue)
// =============================================================================

// Lazy-load git-queue to avoid circular dependencies
let gitQueue = null;

function getGitQueue() {
  if (!gitQueue) {
    gitQueue = require('./git-queue');
  }
  return gitQueue;
}

/**
 * Commit task changes with queue (for parallel execution safety)
 * @param {string} planPath - Path to plan file
 * @param {string} taskId - Task identifier
 * @param {string} description - Brief description of the task
 * @param {string[]} files - Files to stage (empty for all)
 * @param {object} options - Options
 * @param {boolean} options.noQueue - Bypass queue for direct commit
 * @returns {Promise<{success: boolean, commitHash: string|null, error: string|null}>}
 */
async function commitTaskChanges(planPath, taskId, description, files = [], options = {}) {
  const { commitWithQueue } = getGitQueue();

  // Truncate description to 50 chars for commit message
  const shortDesc = description.length > 50
    ? description.slice(0, 47) + '...'
    : description;

  const message = `task ${taskId}: ${shortDesc}`;

  return commitWithQueue(message, files, options);
}

/**
 * Get git queue status
 * @returns {object} Queue status
 */
function getCommitQueueStatus() {
  const { getQueueStatus } = getGitQueue();
  return getQueueStatus();
}

/**
 * Wait for all pending commits to complete
 * @returns {Promise<void>}
 */
async function waitForCommitQueue() {
  const { waitForDrain } = getGitQueue();
  return waitForDrain();
}

// =============================================================================
// Exports
// =============================================================================

module.exports = {
  // Configuration
  CURRENT_PLAN_FILE,
  OUTPUT_BASE,
  VALID_STATUSES,

  // Path Resolution
  getActivePlanPath,
  hasActivePlan,
  getPlanPathFromArgs,
  getOutputDir,
  getOutputDirName,
  getStatusPath,
  getFindingsDir,
  getTimestampsDir,

  // Directory Management
  createOutputDir,
  outputDirExists,

  // Core I/O
  loadStatus,
  saveStatus,

  // Task Updates
  updateTaskStatus,
  markTaskStarted,
  markTaskCompleted,
  markTaskFailed,
  markTaskSkipped,

  // Queries
  getNextTasks,
  getProgress,
  getStatusSummary,

  // Initialization
  initializePlanStatus,
  refreshConstraints,
  parsePhases,
  getTitle,

  // Findings
  writeFindings,
  readFindings,

  // Run Management
  startRun,
  completeRun,

  // Validation / Utilities
  createEmptySummary,
  recalculateSummary,
  ensureSummaryKeys,
  validateSummary,

  // Constraint Parsing
  expandTaskRange,
  expandPhaseRange,
  parseExecutionNotes,
  getTaskConstraints,
  getParallelPhases,

  // File Conflict Detection
  extractFileReferences,
  detectFileConflicts,

  // Git Operations (via git-queue)
  commitTaskChanges,
  getCommitQueueStatus,
  waitForCommitQueue
};
