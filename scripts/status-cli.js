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

// Import shared modules
const { getActivePlanPath } = require('./lib/plan-pointer.js');

// Import plan-output-utils
const {
  loadStatus,
  saveStatus,
  updateTaskStatus,
  getStatusPath,
  getProgress,
  startRun,
  completeRun,
  writeFindings,
  readFindings,
  recalculateSummary,
  validateSummary,
  ensureSummaryKeys
} = require('./lib/plan-output-utils.js');

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
 * status - Show current plan status (JSON)
 */
function cmdStatus(planPath) {
  const status = loadStatus(planPath);
  if (!status) {
    exitWithError('No status.json found. Initialize the plan first.');
  }

  // Build response with key info
  const response = {
    planPath: status.planPath,
    planName: status.planName,
    currentPhase: status.currentPhase,
    lastUpdatedAt: status.lastUpdatedAt,
    summary: status.summary,
    tasks: status.tasks.map(t => ({
      id: t.id,
      phase: t.phase,
      description: t.description,
      status: t.status
    }))
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
 */
function cmdNext(planPath, countStr) {
  const count = parseInt(countStr || '5', 10);
  const status = loadStatus(planPath);
  if (!status) {
    exitWithError('No status.json found.');
  }

  // Get pending tasks, prioritizing by phase order
  const pendingTasks = status.tasks
    .filter(t => t.status === 'pending')
    .slice(0, count);

  // Also identify the current phase
  const inProgressTasks = status.tasks.filter(t => t.status === 'in_progress');

  outputJSON({
    planPath: status.planPath,
    currentPhase: status.currentPhase,
    inProgress: inProgressTasks.map(t => ({ id: t.id, description: t.description })),
    nextTasks: pendingTasks.map(t => ({
      id: t.id,
      phase: t.phase,
      description: t.description
    })),
    summary: status.summary
  });
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
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    showHelp();
    process.exit(0);
  }

  const parsed = parseArgs(args);
  const { command, positional, options } = parsed;

  // Get active plan path
  const planPath = getActivePlanPath();
  if (!planPath) {
    exitWithError('No active plan set. Use /plan:set to choose a plan first.');
  }

  // Dispatch to command handler
  switch (command) {
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
