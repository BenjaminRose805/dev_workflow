#!/usr/bin/env node
/**
 * Status Manager CLI
 *
 * A robust command-line interface for managing plan execution status.
 * Replaces fragile inline JavaScript with proper CLI commands that Claude can invoke.
 *
 * ## Source of Truth
 *
 * This CLI manages status.json, which is THE authoritative source of truth for
 * task execution state. The markdown plan file is read-only reference documentation.
 *
 * - NEVER modify markdown checkboxes (- [x]) during execution
 * - ALWAYS use this CLI to update task status
 * - status.json is the single source of truth for all task state queries
 *
 * Usage:
 *   node scripts/status-cli.js <command> [options]
 *
 * Commands:
 *   status                           Show current plan status (JSON)
 *   mark-started <task-id>           Mark task as in_progress
 *   mark-complete <task-id>          Mark task as completed
 *   mark-failed <task-id>            Mark task as failed
 *   mark-skipped <task-id>           Mark task as skipped
 *   write-findings <task-id>         Write findings for a task
 *   read-findings <task-id>          Read findings for a task
 *   start-run                        Start a new execution run
 *   complete-run <run-id>            Complete an execution run
 *   next [count]                     Get next recommended tasks
 *   progress                         Show formatted progress bar
 *   validate                         Validate and repair status.json
 *   sync-check                       Compare markdown vs status.json (no modifications)
 */

const fs = require('fs');
const path = require('path');

// Import unified plan status library
const {
  // Path resolution
  getActivePlanPath,
  getPlanPathFromArgs,
  getOutputDir,
  getStatusPath,
  getFindingsDir,
  getTimestampsDir,
  // Core I/O
  loadStatus,
  saveStatus,
  // Task updates
  updateTaskStatus,
  // Queries
  getProgress,
  // Initialization
  initializePlanStatus,
  // Findings
  writeFindings,
  readFindings,
  // Run management
  startRun,
  completeRun,
  // Validation
  recalculateSummary,
  validateSummary,
  ensureSummaryKeys,
  // Constraint parsing
  parseExecutionNotes,
  getTaskConstraints
} = require('./lib/plan-status.js');

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Output JSON to stdout
 */
function outputJSON(data) {
  console.log(JSON.stringify(data, null, 2));
}

/**
 * Output error and exit
 */
function exitWithError(message, code = 1) {
  console.error(`Error: ${message}`);
  process.exit(code);
}

/**
 * Parse command line arguments
 */
function parseArgs(args) {
  const result = {
    command: args[0],
    positional: [],
    options: {}
  };

  let i = 1;
  while (i < args.length) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      // Check if next arg is a value or another flag
      if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
        result.options[key] = args[i + 1];
        i += 2;
      } else {
        result.options[key] = true;
        i += 1;
      }
    } else {
      result.positional.push(arg);
      i += 1;
    }
  }

  return result;
}

// =============================================================================
// Command Implementations
// =============================================================================

/**
 * init - Initialize output directory and status.json for a plan
 */
function cmdInit(planPath) {
  const result = initializePlanStatus(planPath);

  if (!result.success) {
    exitWithError(result.error || 'Failed to initialize plan status');
  }

  const outputDir = getOutputDir(planPath);
  const findingsDir = getFindingsDir(planPath);
  const timestampsDir = getTimestampsDir(planPath);

  outputJSON({
    success: true,
    planPath: planPath,
    outputDir: path.relative(process.cwd(), outputDir),
    structure: {
      statusJson: path.relative(process.cwd(), getStatusPath(planPath)),
      findingsDir: path.relative(process.cwd(), findingsDir),
      timestampsDir: path.relative(process.cwd(), timestampsDir)
    },
    taskCount: result.status.tasks.length,
    initialized: true
  });
}

/**
 * status - Show current plan status (JSON)
 * Auto-initializes status.json and output pointer if missing.
 *
 * Output matches plan-orchestrator.js format for compatibility:
 * - planPath, planName, source
 * - total, completed, inProgress, pending, failed, skipped
 * - percentage, currentPhase
 */
function cmdStatus(planPath) {
  let status = loadStatus(planPath);

  // Auto-initialize if status.json is missing
  if (!status) {
    const result = initializePlanStatus(planPath);
    if (!result.success) {
      exitWithError(`Could not initialize status: ${result.error}`);
    }
    status = result.status;
  }

  const summary = status.summary || {};
  const total = summary.totalTasks || 0;
  const completed = summary.completed || 0;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Build response matching plan-orchestrator.js format
  const response = {
    planPath: status.planPath,
    planName: status.planName,
    source: 'status.json',
    total: total,
    completed: completed,
    inProgress: summary.in_progress || 0,
    pending: summary.pending || 0,
    failed: summary.failed || 0,
    skipped: summary.skipped || 0,
    percentage: percentage,
    currentPhase: status.currentPhase || 'Unknown'
  };

  outputJSON(response);
}

/**
 * mark-started <task-id> - Mark task as in_progress
 */
function cmdMarkStarted(planPath, taskId) {
  if (!taskId) {
    exitWithError('Task ID is required. Usage: mark-started <task-id>');
  }

  const success = updateTaskStatus(planPath, taskId, 'in_progress');
  if (!success) {
    exitWithError(`Failed to mark task ${taskId} as started. Task may not exist.`);
  }

  outputJSON({ success: true, taskId, status: 'in_progress' });
}

/**
 * mark-complete <task-id> [--notes "..."] - Mark task as completed
 */
function cmdMarkComplete(planPath, taskId, options) {
  if (!taskId) {
    exitWithError('Task ID is required. Usage: mark-complete <task-id> [--notes "..."]');
  }

  const extras = {};
  if (options.notes) {
    extras.notes = options.notes;
  }

  const success = updateTaskStatus(planPath, taskId, 'completed', extras);
  if (!success) {
    exitWithError(`Failed to mark task ${taskId} as completed. Task may not exist.`);
  }

  outputJSON({ success: true, taskId, status: 'completed', notes: options.notes || null });
}

/**
 * mark-failed <task-id> --error "..." - Mark task as failed
 */
function cmdMarkFailed(planPath, taskId, options) {
  if (!taskId) {
    exitWithError('Task ID is required. Usage: mark-failed <task-id> --error "..."');
  }

  const extras = {};
  if (options.error) {
    extras.error = options.error;
  }

  const success = updateTaskStatus(planPath, taskId, 'failed', extras);
  if (!success) {
    exitWithError(`Failed to mark task ${taskId} as failed. Task may not exist.`);
  }

  outputJSON({ success: true, taskId, status: 'failed', error: options.error || null });
}

/**
 * mark-skipped <task-id> --reason "..." - Mark task as skipped
 */
function cmdMarkSkipped(planPath, taskId, options) {
  if (!taskId) {
    exitWithError('Task ID is required. Usage: mark-skipped <task-id> --reason "..."');
  }

  const extras = {};
  if (options.reason) {
    extras.reason = options.reason;
  }

  const success = updateTaskStatus(planPath, taskId, 'skipped', extras);
  if (!success) {
    exitWithError(`Failed to mark task ${taskId} as skipped. Task may not exist.`);
  }

  outputJSON({ success: true, taskId, status: 'skipped', reason: options.reason || null });
}

/**
 * write-findings <task-id> --file <path> | --stdin - Write findings for a task
 */
function cmdWriteFindings(planPath, taskId, options) {
  if (!taskId) {
    exitWithError('Task ID is required. Usage: write-findings <task-id> --file <path> | --stdin');
  }

  let content = '';

  if (options.file) {
    // Read from file
    try {
      content = fs.readFileSync(options.file, 'utf8');
    } catch (error) {
      exitWithError(`Failed to read file: ${options.file}`);
    }
  } else if (options.stdin) {
    // Read from stdin (synchronously)
    try {
      content = fs.readFileSync(0, 'utf8'); // fd 0 = stdin
    } catch (error) {
      exitWithError('Failed to read from stdin');
    }
  } else if (options.content) {
    // Direct content passed as option
    content = options.content;
  } else {
    exitWithError('Either --file <path>, --stdin, or --content "..." is required');
  }

  const relativePath = writeFindings(planPath, taskId, content);
  if (!relativePath) {
    exitWithError(`Failed to write findings for task ${taskId}`);
  }

  outputJSON({ success: true, taskId, findingsPath: relativePath });
}

/**
 * read-findings <task-id> - Read findings for a task
 */
function cmdReadFindings(planPath, taskId) {
  if (!taskId) {
    exitWithError('Task ID is required. Usage: read-findings <task-id>');
  }

  const content = readFindings(planPath, taskId);
  if (!content) {
    exitWithError(`No findings found for task ${taskId}`);
  }

  // Output raw content (not JSON) for easy piping
  console.log(content);
}

/**
 * start-run - Start a new execution run
 */
function cmdStartRun(planPath) {
  const runId = startRun(planPath);
  if (!runId) {
    exitWithError('Failed to start run. Check that status.json exists.');
  }

  outputJSON({ success: true, runId });
}

/**
 * complete-run <run-id> --completed N --failed N - Complete an execution run
 */
function cmdCompleteRun(planPath, runId, options) {
  if (!runId) {
    exitWithError('Run ID is required. Usage: complete-run <run-id> --completed N --failed N');
  }

  const completed = parseInt(options.completed || '0', 10);
  const failed = parseInt(options.failed || '0', 10);

  const success = completeRun(planPath, runId, completed, failed);
  if (!success) {
    exitWithError(`Failed to complete run ${runId}`);
  }

  outputJSON({ success: true, runId, completed, failed });
}

/**
 * next [count] - Get next recommended tasks (JSON)
 *
 * Output matches plan-orchestrator.js format for compatibility:
 * - count
 * - tasks (array with: id, description, phase, status, reason)
 *
 * Uses same logic as plan-orchestrator.js:
 * 1. First check for in-progress tasks
 * 2. Then check for failed tasks that might be retried
 * 3. Finally get pending tasks respecting phase order
 */
function cmdNext(planPath, countStr) {
  const maxTasks = parseInt(countStr || '3', 10);
  const status = loadStatus(planPath);
  if (!status) {
    exitWithError('No status.json found.');
  }

  // Read plan file and parse execution constraints
  let constraints = [];
  try {
    const absolutePath = path.isAbsolute(planPath) ? planPath : path.resolve(process.cwd(), planPath);
    const planContent = fs.readFileSync(absolutePath, 'utf8');
    constraints = parseExecutionNotes(planContent);
  } catch (error) {
    // Plan file may not exist; constraints will be empty (backward compatible)
  }

  // Helper to get constraint metadata for a task
  function getConstraintMetadata(taskId) {
    for (const constraint of constraints) {
      if (constraint.taskIds.includes(taskId)) {
        return {
          sequential: true,
          sequentialGroup: constraint.taskRange,
          sequentialReason: constraint.reason
        };
      }
    }
    return { sequential: false };
  }

  const next = [];

  // Group tasks by phase for phase-order logic
  const phaseMap = new Map();
  for (const task of status.tasks) {
    const phaseName = task.phase || 'Unknown Phase';
    if (!phaseMap.has(phaseName)) {
      const phaseMatch = phaseName.match(/Phase\s+(\d+)/);
      const phaseNumber = phaseMatch ? parseInt(phaseMatch[1]) : 0;
      phaseMap.set(phaseName, {
        number: phaseNumber,
        title: phaseName,
        tasks: []
      });
    }
    phaseMap.get(phaseName).tasks.push(task);
  }

  const phases = Array.from(phaseMap.values()).sort((a, b) => a.number - b.number);

  // 1. First check for in-progress tasks
  for (const phase of phases) {
    for (const task of phase.tasks) {
      if (task.status === 'in_progress') {
        next.push({
          id: task.id,
          description: task.description,
          phase: phase.number,
          status: task.status,
          reason: 'in_progress - should be completed first',
          ...getConstraintMetadata(task.id)
        });
      }
    }
  }

  if (next.length > 0) {
    outputJSON({
      count: Math.min(next.length, maxTasks),
      tasks: next.slice(0, maxTasks)
    });
    return;
  }

  // 2. Then check for failed tasks that might be retried
  for (const phase of phases) {
    for (const task of phase.tasks) {
      if (task.status === 'failed') {
        next.push({
          id: task.id,
          description: task.description,
          phase: phase.number,
          status: task.status,
          reason: 'failed - needs retry or manual intervention',
          ...getConstraintMetadata(task.id)
        });
      }
    }
  }

  // 3. Finally get pending tasks respecting phase order
  for (const phase of phases) {
    // Check if previous phases are complete enough (80% threshold)
    const previousPhases = phases.filter(p => p.number < phase.number);
    const previousIncomplete = previousPhases.some(p =>
      p.tasks.some(t => t.status === 'pending' || t.status === 'in_progress')
    );
    const previousMostlyComplete = previousPhases.every(p => {
      const completed = p.tasks.filter(t => t.status === 'completed' || t.status === 'skipped').length;
      return completed >= p.tasks.length * 0.8;
    });

    if (previousIncomplete && !previousMostlyComplete) {
      continue; // Skip this phase for now
    }

    for (const task of phase.tasks) {
      if (task.status === 'pending' && next.length < maxTasks) {
        next.push({
          id: task.id,
          description: task.description,
          phase: phase.number,
          status: task.status,
          reason: 'pending - ready to implement',
          ...getConstraintMetadata(task.id)
        });
      }
    }

    if (next.length >= maxTasks) break;
  }

  outputJSON({
    count: next.length,
    tasks: next
  });
}

/**
 * phases - List all phases with completion status (JSON)
 *
 * Output matches plan-orchestrator.js format:
 * - phases (array with: number, title, total, completed, percentage, status)
 */
function cmdPhases(planPath) {
  const status = loadStatus(planPath);
  if (!status) {
    exitWithError('No status.json found.');
  }

  // Group tasks by phase
  const phaseMap = new Map();
  for (const task of status.tasks) {
    const phaseName = task.phase || 'Unknown Phase';
    if (!phaseMap.has(phaseName)) {
      const phaseMatch = phaseName.match(/Phase\s+(\d+)/);
      const phaseNumber = phaseMatch ? parseInt(phaseMatch[1]) : 0;
      phaseMap.set(phaseName, {
        number: phaseNumber,
        title: phaseName.replace(/^Phase\s+\d+:\s*/, ''),
        tasks: []
      });
    }
    phaseMap.get(phaseName).tasks.push(task);
  }

  // Sort phases by number and calculate stats
  const phases = Array.from(phaseMap.values())
    .sort((a, b) => a.number - b.number)
    .map(phase => {
      const total = phase.tasks.length;
      const completed = phase.tasks.filter(t => t.status === 'completed').length;
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        number: phase.number,
        title: phase.title,
        total: total,
        completed: completed,
        percentage: percentage,
        status: percentage === 100 ? 'complete' : percentage > 0 ? 'in_progress' : 'pending'
      };
    });

  outputJSON({ phases });
}

/**
 * check <task-id> - Check if a specific task can be started (JSON)
 *
 * Output matches plan-orchestrator.js format:
 * - task (with id, description, status, phase)
 * - canStart (boolean)
 * - blockers (array of task IDs that block this task)
 * - phase (string like "Phase N: Title")
 */
function cmdCheck(planPath, taskId) {
  if (!taskId) {
    exitWithError('Task ID is required. Usage: check <task-id>');
  }

  const status = loadStatus(planPath);
  if (!status) {
    exitWithError('No status.json found.');
  }

  // Group tasks by phase
  const phaseMap = new Map();
  for (const task of status.tasks) {
    const phaseName = task.phase || 'Unknown Phase';
    if (!phaseMap.has(phaseName)) {
      const phaseMatch = phaseName.match(/Phase\s+(\d+)/);
      const phaseNumber = phaseMatch ? parseInt(phaseMatch[1]) : 0;
      phaseMap.set(phaseName, {
        number: phaseNumber,
        title: phaseName,
        tasks: []
      });
    }
    phaseMap.get(phaseName).tasks.push(task);
  }

  const phases = Array.from(phaseMap.values()).sort((a, b) => a.number - b.number);

  // Find the task and its phase
  for (const phase of phases) {
    const task = phase.tasks.find(t => t.id === taskId);
    if (task) {
      // Check previous phases for incomplete tasks
      const previousPhases = phases.filter(p => p.number < phase.number);
      const blockers = previousPhases.flatMap(p => p.tasks)
        .filter(t => t.status === 'pending' || t.status === 'in_progress')
        .map(t => t.id);

      outputJSON({
        task: {
          id: task.id,
          description: task.description,
          status: task.status,
          phase: phase.number
        },
        canStart: task.status === 'pending',
        blockers: blockers,
        phase: phase.title
      });
      return;
    }
  }

  outputJSON({ error: `Task ${taskId} not found` });
}

/**
 * progress - Show formatted progress bar
 */
function cmdProgress(planPath) {
  const status = loadStatus(planPath);
  if (!status) {
    exitWithError('No status.json found.');
  }

  const summary = status.summary;
  const total = summary.totalTasks || 0;
  const completed = summary.completed || 0;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Create progress bar
  const barWidth = 40;
  const filled = Math.round((percentage / 100) * barWidth);
  const empty = barWidth - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);

  console.log(`Plan: ${status.planName}`);
  console.log(`Progress: [${bar}] ${percentage}%`);
  console.log('');
  console.log(`  ✓ Completed: ${summary.completed}`);
  console.log(`  ◯ Pending: ${summary.pending}`);
  console.log(`  ⏳ In Progress: ${summary.in_progress || 0}`);
  console.log(`  ✗ Failed: ${summary.failed}`);
  console.log(`  ⊘ Skipped: ${summary.skipped}`);
  console.log('');
  console.log(`Total: ${total} tasks`);
  console.log(`Current Phase: ${status.currentPhase}`);
  console.log(`Last Updated: ${new Date(status.lastUpdatedAt).toLocaleString()}`);
}

/**
 * validate - Validate and repair status.json
 */
function cmdValidate(planPath) {
  const status = loadStatus(planPath, { skipValidation: true });
  if (!status) {
    exitWithError('No status.json found.');
  }

  const issues = [];
  let fixed = 0;

  // Check for missing summary keys
  const originalKeys = Object.keys(status.summary || {});
  status.summary = ensureSummaryKeys(status.summary || {});
  const newKeys = Object.keys(status.summary);
  if (newKeys.length > originalKeys.length) {
    const addedKeys = newKeys.filter(k => !originalKeys.includes(k));
    issues.push(`Missing summary keys added: ${addedKeys.join(', ')}`);
    fixed++;
  }

  // Validate summary counts
  const validation = validateSummary(status, true);
  if (!validation.valid) {
    for (const [key, mismatch] of Object.entries(validation.mismatches)) {
      issues.push(`Summary ${key}: was ${mismatch.stored}, should be ${mismatch.calculated}`);
    }
    fixed++;
  }

  // Check for orphaned tasks (tasks with invalid status)
  const validStatuses = ['pending', 'in_progress', 'completed', 'failed', 'skipped'];
  for (const task of status.tasks) {
    if (!validStatuses.includes(task.status)) {
      issues.push(`Task ${task.id} has invalid status: ${task.status}`);
      task.status = 'pending';
      fixed++;
    }
  }

  // Check for duplicate task IDs
  const taskIds = status.tasks.map(t => t.id);
  const duplicates = taskIds.filter((id, index) => taskIds.indexOf(id) !== index);
  if (duplicates.length > 0) {
    issues.push(`Duplicate task IDs found: ${[...new Set(duplicates)].join(', ')}`);
  }

  // Save if we made fixes
  if (fixed > 0) {
    saveStatus(planPath, status);
  }

  outputJSON({
    valid: issues.length === 0,
    issuesFound: issues.length,
    issuesFixed: fixed,
    issues: issues,
    summary: status.summary
  });
}

/**
 * sync-check - Compare markdown vs status.json (read-only, no modifications)
 *
 * This command compares task completion status between the markdown plan file
 * (which uses checkboxes like `- [x]`) and status.json (which tracks actual state).
 *
 * The comparison reports discrepancies without modifying either file.
 * status.json is the authoritative source of truth.
 */
function cmdSyncCheck(planPath) {
  // Load status.json
  const status = loadStatus(planPath);
  if (!status) {
    exitWithError('No status.json found. Initialize the plan first.');
  }

  // Parse markdown plan file
  let markdownContent;
  try {
    markdownContent = fs.readFileSync(planPath, 'utf8');
  } catch (error) {
    exitWithError(`Failed to read plan file: ${planPath}`);
  }

  // Build a map of task status from status.json
  const statusMap = new Map();
  for (const task of status.tasks) {
    statusMap.set(task.id, {
      status: task.status,
      description: task.description
    });
  }

  // Parse markdown checkboxes
  // Matches: - [ ] 1.1 Description or - [x] 1.1 Description
  const checkboxRegex = /^-\s+\[([ xX])\]\s+(\d+\.\d+(?:\.\d+)?)\s+(.+)$/gm;
  const markdownTasks = new Map();
  let match;

  while ((match = checkboxRegex.exec(markdownContent)) !== null) {
    const isChecked = match[1].toLowerCase() === 'x';
    const taskId = match[2];
    const description = match[3].trim();

    markdownTasks.set(taskId, {
      checked: isChecked,
      description: description
    });
  }

  // Compare and find discrepancies
  const discrepancies = [];
  const onlyInStatus = [];
  const onlyInMarkdown = [];

  // Check tasks in status.json
  for (const [taskId, statusTask] of statusMap) {
    const mdTask = markdownTasks.get(taskId);

    if (!mdTask) {
      onlyInStatus.push({
        id: taskId,
        description: statusTask.description,
        status: statusTask.status
      });
      continue;
    }

    // Compare completion status
    const statusCompleted = statusTask.status === 'completed';
    const mdCompleted = mdTask.checked;

    if (statusCompleted !== mdCompleted) {
      discrepancies.push({
        id: taskId,
        description: statusTask.description,
        statusJson: statusTask.status,
        markdownChecked: mdCompleted,
        issue: mdCompleted
          ? 'Markdown shows completed but status.json shows ' + statusTask.status
          : 'status.json shows completed but markdown checkbox is unchecked'
      });
    }
  }

  // Check tasks only in markdown
  for (const [taskId, mdTask] of markdownTasks) {
    if (!statusMap.has(taskId)) {
      onlyInMarkdown.push({
        id: taskId,
        description: mdTask.description,
        checked: mdTask.checked
      });
    }
  }

  // Build result
  const result = {
    planPath: planPath,
    statusJsonTasks: status.tasks.length,
    markdownTasks: markdownTasks.size,
    inSync: discrepancies.length === 0 && onlyInStatus.length === 0 && onlyInMarkdown.length === 0,
    discrepancies: discrepancies,
    onlyInStatusJson: onlyInStatus,
    onlyInMarkdown: onlyInMarkdown,
    summary: {
      discrepancyCount: discrepancies.length,
      onlyInStatusJsonCount: onlyInStatus.length,
      onlyInMarkdownCount: onlyInMarkdown.length
    },
    recommendation: discrepancies.length > 0
      ? 'status.json is the source of truth. Markdown checkboxes should not be modified during execution.'
      : 'Files are in sync.'
  };

  outputJSON(result);
}

/**
 * retryable - Get failed tasks that can be retried
 */
function cmdRetryable(planPath) {
  const { getRetryableTasks } = require('./lib/plan-output-utils');
  const tasks = getRetryableTasks(planPath);

  outputJSON({
    count: tasks.length,
    tasks: tasks
  });
}

/**
 * exhausted - Get failed tasks with no retries left
 */
function cmdExhausted(planPath) {
  const { getExhaustedTasks } = require('./lib/plan-output-utils');
  const tasks = getExhaustedTasks(planPath);

  outputJSON({
    count: tasks.length,
    tasks: tasks
  });
}

/**
 * increment-retry - Increment retry count for a failed task
 */
function cmdIncrementRetry(planPath, taskId, options) {
  if (!taskId) {
    exitWithError('Task ID required. Usage: increment-retry <task-id> [--error "message"]');
  }

  const { incrementRetryCount } = require('./lib/plan-output-utils');
  const errorMessage = options.error || 'Unknown error';

  const result = incrementRetryCount(planPath, taskId, errorMessage);
  outputJSON(result);
}

/**
 * detect-stuck - Detect and mark stuck tasks as failed
 */
function cmdDetectStuck(planPath) {
  const { detectAndMarkStuckTasks, STUCK_TASK_THRESHOLD_MS } = require('./lib/plan-output-utils');
  const stuckTasks = detectAndMarkStuckTasks(planPath);

  outputJSON({
    thresholdMinutes: Math.round(STUCK_TASK_THRESHOLD_MS / 60000),
    stuckCount: stuckTasks.length,
    stuckTasks: stuckTasks
  });
}

/**
 * Show help message
 */
function showHelp() {
  console.log(`
Status Manager CLI - Manage plan execution status

Usage:
  node scripts/status-cli.js <command> [options]

Commands:
  init                                Initialize output directory and status.json
  status                              Show current plan status (JSON)
  mark-started <task-id>              Mark task as in_progress
  mark-complete <task-id> [--notes]   Mark task as completed
  mark-failed <task-id> [--error]     Mark task as failed
  mark-skipped <task-id> [--reason]   Mark task as skipped
  write-findings <task-id> --file     Write findings from file
  write-findings <task-id> --stdin    Write findings from stdin
  write-findings <task-id> --content  Write findings from string
  read-findings <task-id>             Output findings content
  start-run                           Start new run, output run ID
  complete-run <run-id> --completed N --failed N
                                      Complete an execution run
  next [count]                        Get next N recommended tasks (JSON)
  phases                              List all phases with completion status (JSON)
  check <task-id>                     Check if a specific task can be started (JSON)
  progress                            Show formatted progress bar
  validate                            Validate and repair status.json
  sync-check                          Compare markdown vs status.json (read-only)
  retryable                           Get failed tasks that can be retried
  exhausted                           Get failed tasks with no retries left
  increment-retry <task-id>           Increment retry count for a task
  detect-stuck                        Detect and mark stuck tasks as failed

Options:
  --notes "..."      Notes to attach when marking complete
  --error "..."      Error message when marking failed
  --reason "..."     Reason when marking skipped
  --file <path>      Read findings from file
  --stdin            Read findings from stdin
  --content "..."    Findings content as string
  --completed N      Number of completed tasks (complete-run)
  --failed N         Number of failed tasks (complete-run)

Examples:
  # Check current status
  node scripts/status-cli.js status

  # Mark a task complete with notes
  node scripts/status-cli.js mark-complete 1.1 --notes "Implemented auth middleware"

  # Get next 3 tasks
  node scripts/status-cli.js next 3

  # Show progress bar
  node scripts/status-cli.js progress

  # Validate and fix status.json
  node scripts/status-cli.js validate
`);
}

// =============================================================================
// Main Entry Point
// =============================================================================

function main() {
  const rawArgs = process.argv.slice(2);

  // Use library helper to extract --plan and resolve plan path
  const { planPath, error, remainingArgs } = getPlanPathFromArgs(rawArgs);

  if (remainingArgs.length === 0 || remainingArgs[0] === '--help' || remainingArgs[0] === '-h') {
    showHelp();
    process.exit(0);
  }

  // Check for plan resolution errors
  if (error) {
    exitWithError(error);
  }

  const parsed = parseArgs(remainingArgs);
  const { command, positional, options } = parsed;

  // Dispatch to command handler
  switch (command) {
    case 'init':
      cmdInit(planPath);
      break;

    case 'status':
      cmdStatus(planPath);
      break;

    case 'mark-started':
      cmdMarkStarted(planPath, positional[0]);
      break;

    case 'mark-complete':
      cmdMarkComplete(planPath, positional[0], options);
      break;

    case 'mark-failed':
      cmdMarkFailed(planPath, positional[0], options);
      break;

    case 'mark-skipped':
      cmdMarkSkipped(planPath, positional[0], options);
      break;

    case 'write-findings':
      cmdWriteFindings(planPath, positional[0], options);
      break;

    case 'read-findings':
      cmdReadFindings(planPath, positional[0]);
      break;

    case 'start-run':
      cmdStartRun(planPath);
      break;

    case 'complete-run':
      cmdCompleteRun(planPath, positional[0], options);
      break;

    case 'next':
      cmdNext(planPath, positional[0]);
      break;

    case 'phases':
      cmdPhases(planPath);
      break;

    case 'check':
      cmdCheck(planPath, positional[0]);
      break;

    case 'progress':
      cmdProgress(planPath);
      break;

    case 'validate':
      cmdValidate(planPath);
      break;

    case 'sync-check':
      cmdSyncCheck(planPath);
      break;

    case 'retryable':
      cmdRetryable(planPath);
      break;

    case 'exhausted':
      cmdExhausted(planPath);
      break;

    case 'increment-retry':
      cmdIncrementRetry(planPath, positional[0], options);
      break;

    case 'detect-stuck':
      cmdDetectStuck(planPath);
      break;

    default:
      exitWithError(`Unknown command: ${command}. Use --help for usage.`);
  }
}

main();
