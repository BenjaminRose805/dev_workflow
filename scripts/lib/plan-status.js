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
 * Parse execution notes from plan content to extract sequential constraints
 * @param {string} planContent - Full markdown content of the plan
 * @returns {Array<{taskRange: string, taskIds: string[], reason: string}>} Array of constraint objects
 * @example
 * const constraints = parseExecutionNotes(planContent);
 * // Returns: [{ taskRange: "3.1-3.4", taskIds: ["3.1","3.2","3.3","3.4"], reason: "all modify same file" }]
 */
function parseExecutionNotes(planContent) {
  if (!planContent || typeof planContent !== 'string') {
    return [];
  }

  const constraints = [];

  // Match pattern: **Execution Note:** Tasks X.Y-X.Z are [SEQUENTIAL] - reason
  // Also handle: **Execution Note:** Tasks X.Y-X.Z are [SEQUENTIAL] (reason)
  // And multiple task ranges in same note
  const notePattern = /\*\*Execution Note:\*\*\s*Tasks?\s+([\d.,\s-]+)\s+(?:are|is)\s+\[SEQUENTIAL\]\s*[-–—]?\s*(.+?)(?:\n|$)/gi;

  let match;
  while ((match = notePattern.exec(planContent)) !== null) {
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
          constraints.push({
            taskRange: cleanRange,
            taskIds,
            reason
          });
        }
      }
    }
  }

  return constraints;
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
  parseExecutionNotes,
  getTaskConstraints
};
