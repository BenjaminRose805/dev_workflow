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
const { execSync } = require('child_process');

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
  getReadyTasks,
  getBlockedTasks,
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
  getTaskConstraints,
  // File conflict detection
  extractFileReferences,
  detectFileConflicts,
  // Worktree context detection
  detectWorktreeContext
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
      // Handle --key=value syntax
      if (arg.includes('=')) {
        const eqIndex = arg.indexOf('=');
        const key = arg.slice(2, eqIndex);
        const value = arg.slice(eqIndex + 1);
        result.options[key] = value;
        i += 1;
      } else {
        const key = arg.slice(2);
        // Check if next arg is a value or another flag
        if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
          result.options[key] = args[i + 1];
          i += 2;
        } else {
          result.options[key] = true;
          i += 1;
        }
      }
    } else {
      result.positional.push(arg);
      i += 1;
    }
  }

  return result;
}

// =============================================================================
// Git Information Helper
// =============================================================================

/**
 * Get git information for the current repository
 * Returns null if git is unavailable or not in a git repository
 *
 * @returns {Object|null} Git info with branch, uncommittedCount, lastCommit
 */
function getGitInfo() {
  try {
    // Check if git is available
    execSync('git --version', { stdio: 'pipe' });
  } catch (error) {
    return null;
  }

  try {
    // Check if we're in a git repository
    execSync('git rev-parse --git-dir', { stdio: 'pipe' });
  } catch (error) {
    return null;
  }

  const result = {
    branch: null,
    uncommittedCount: 0,
    commitCount: null,
    lastCommit: null
  };

  try {
    // Get current branch
    result.branch = execSync('git branch --show-current', { encoding: 'utf8', stdio: 'pipe' }).trim();
  } catch (error) {
    // Branch unavailable (detached HEAD, etc.)
  }

  try {
    // Get uncommitted file count
    const statusOutput = execSync('git status --porcelain', { encoding: 'utf8', stdio: 'pipe' });
    result.uncommittedCount = statusOutput.trim() ? statusOutput.trim().split('\n').length : 0;
  } catch (error) {
    // Status unavailable
  }

  try {
    // Get commit count on current branch vs master/main
    // Try master first, then main
    let baseBranch = 'master';
    try {
      execSync('git rev-parse --verify master', { stdio: 'pipe' });
    } catch (e) {
      try {
        execSync('git rev-parse --verify main', { stdio: 'pipe' });
        baseBranch = 'main';
      } catch (e2) {
        // Neither master nor main exists, skip commit count
        baseBranch = null;
      }
    }
    if (baseBranch) {
      const countOutput = execSync(`git rev-list --count HEAD ^${baseBranch}`, { encoding: 'utf8', stdio: 'pipe' }).trim();
      result.commitCount = parseInt(countOutput, 10);
    }
  } catch (error) {
    // Commit count unavailable
  }

  try {
    // Get last commit SHA and message (abbreviated)
    const logOutput = execSync('git log -1 --format="%h %s"', { encoding: 'utf8', stdio: 'pipe' }).trim();
    if (logOutput) {
      const spaceIndex = logOutput.indexOf(' ');
      if (spaceIndex > 0) {
        result.lastCommit = {
          sha: logOutput.slice(0, spaceIndex),
          message: logOutput.slice(spaceIndex + 1)
        };
      }
    }
  } catch (error) {
    // No commits yet or log unavailable
  }

  return result;
}

// =============================================================================
// Command Implementations
// =============================================================================

/**
 * init - Initialize output directory and status.json for a plan
 *
 * Task 6.3: Added --validate-deps flag for comprehensive dependency validation
 *
 * Options:
 *   --validate-deps  Check all dependencies for validity, cycles, and invalid references
 *
 * @param {string} planPath - Path to plan file
 * @param {Object} options - Command options
 */
function cmdInit(planPath, options = {}) {
  const validateDeps = options['validate-deps'] === true;

  // If validating, perform comprehensive dependency check first
  if (validateDeps) {
    const validationResult = validatePlanDependencies(planPath);

    if (!validationResult.valid) {
      // Output validation errors and fail
      console.error('\n╔═══════════════════════════════════════════════════════════════════════╗');
      console.error('║                 DEPENDENCY VALIDATION FAILED                          ║');
      console.error('╠═══════════════════════════════════════════════════════════════════════╣');

      if (validationResult.hasCycle) {
        console.error('║ ✗ CYCLE DETECTED:                                                     ║');
        const cycleStr = validationResult.cyclePath.join(' → ');
        // Split long cycle paths across multiple lines
        const chunks = cycleStr.match(/.{1,66}/g) || [cycleStr];
        for (const chunk of chunks) {
          console.error(`║   ${chunk.padEnd(68)}║`);
        }
      }

      if (validationResult.invalidReferences.length > 0) {
        console.error('╟───────────────────────────────────────────────────────────────────────╢');
        console.error('║ ✗ INVALID REFERENCES:                                                 ║');
        for (const ref of validationResult.invalidReferences.slice(0, 10)) {
          const line = `  Task ${ref.taskId} → "${ref.invalidDep}" (not found)`;
          console.error(`║ ${line.padEnd(69)}║`);
        }
        if (validationResult.invalidReferences.length > 10) {
          console.error(`║   ... and ${validationResult.invalidReferences.length - 10} more`.padEnd(71) + '║');
        }
      }

      if (validationResult.selfDependencies.length > 0) {
        console.error('╟───────────────────────────────────────────────────────────────────────╢');
        console.error('║ ✗ SELF-DEPENDENCIES:                                                  ║');
        for (const taskId of validationResult.selfDependencies) {
          console.error(`║   Task ${taskId} depends on itself`.padEnd(71) + '║');
        }
      }

      console.error('╚═══════════════════════════════════════════════════════════════════════╝');
      console.error('');
      console.error('Fix the above issues in the plan file before initializing.');

      outputJSON({
        success: false,
        validationFailed: true,
        errors: validationResult.errors,
        hasCycle: validationResult.hasCycle,
        cyclePath: validationResult.cyclePath,
        invalidReferences: validationResult.invalidReferences,
        selfDependencies: validationResult.selfDependencies
      });
      process.exit(1);
    }

    // Validation passed - show success
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════════════════╗');
    console.log('║                 DEPENDENCY VALIDATION PASSED                          ║');
    console.log('╠═══════════════════════════════════════════════════════════════════════╣');
    console.log(`║  Total Tasks: ${String(validationResult.summary.totalTasks).padEnd(56)}║`);
    console.log(`║  Tasks with Dependencies: ${String(validationResult.summary.tasksWithDeps).padEnd(44)}║`);
    console.log(`║  Total Dependency Links: ${String(validationResult.summary.totalDependencies).padEnd(45)}║`);
    console.log(`║  No cycles detected ✓`.padEnd(71) + '║');
    console.log(`║  All references valid ✓`.padEnd(71) + '║');
    console.log('╚═══════════════════════════════════════════════════════════════════════╝');
    console.log('');
  }

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
    initialized: true,
    validationPassed: validateDeps ? true : undefined
  });
}

/**
 * Validate plan dependencies comprehensively
 *
 * Task 6.3: Comprehensive dependency validation
 *
 * Checks:
 * - All dependency task IDs exist in the plan
 * - No self-dependencies
 * - No circular dependencies (cycles)
 *
 * @param {string} planPath - Path to plan file
 * @returns {Object} Validation result
 */
function validatePlanDependencies(planPath) {
  const absolutePath = path.isAbsolute(planPath) ? planPath : path.resolve(process.cwd(), planPath);

  let content;
  try {
    content = fs.readFileSync(absolutePath, 'utf8');
  } catch (error) {
    return {
      valid: false,
      errors: [`Could not read plan file: ${error.message}`],
      hasCycle: false,
      cyclePath: null,
      invalidReferences: [],
      selfDependencies: [],
      summary: { totalTasks: 0, tasksWithDeps: 0, totalDependencies: 0 }
    };
  }

  // Parse tasks from the plan (reuse library function patterns)
  const { parsePhases } = require('./lib/markdown-parser');
  const phases = parsePhases(content);

  const allTaskIds = [];
  const taskDependencies = new Map();

  // Extract all task IDs and their dependencies
  for (const phase of phases) {
    for (const task of phase.tasks) {
      allTaskIds.push(task.id);

      // Parse dependencies from task description using regex
      const depMatch = task.title.match(/\(depends:\s*([\d.,\s]+)\)/i);
      if (depMatch) {
        const deps = depMatch[1].split(/[,\s]+/).filter(d => d.trim());
        taskDependencies.set(task.id, deps);
      }
    }
  }

  const allTaskIdSet = new Set(allTaskIds);
  const errors = [];
  const invalidReferences = [];
  const selfDependencies = [];
  let totalDependencies = 0;

  // Validate each task's dependencies
  for (const [taskId, deps] of taskDependencies) {
    totalDependencies += deps.length;

    for (const depId of deps) {
      // Check self-dependency
      if (depId === taskId) {
        selfDependencies.push(taskId);
        errors.push(`Task ${taskId} depends on itself`);
        continue;
      }

      // Check if dependency exists
      if (!allTaskIdSet.has(depId)) {
        invalidReferences.push({ taskId, invalidDep: depId });
        errors.push(`Task ${taskId} references non-existent dependency '${depId}'`);
      }
    }
  }

  // Build dependency graph for cycle detection
  const { buildDependencyGraph, detectDependencyCycles } = require('./lib/plan-status.js');

  // Create tasks array for buildDependencyGraph
  const tasksForGraph = [];
  for (const phase of phases) {
    for (const task of phase.tasks) {
      tasksForGraph.push({
        id: task.id,
        phase: `Phase ${phase.id}: ${phase.name}`,
        description: task.title
      });
    }
  }

  const dependencyGraph = buildDependencyGraph(tasksForGraph);
  const cyclePath = detectDependencyCycles(dependencyGraph);

  if (cyclePath) {
    errors.push(`Cycle detected: ${cyclePath.join(' → ')}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    hasCycle: cyclePath !== null,
    cyclePath,
    invalidReferences,
    selfDependencies,
    summary: {
      totalTasks: allTaskIds.length,
      tasksWithDeps: taskDependencies.size,
      totalDependencies
    }
  };
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
 * next [count] [--ignore-deps] [--phase-priority] - Get next recommended tasks (JSON)
 *
 * DAG-aware task selection using dependency graph.
 * A task is ready if all its dependencies are completed or skipped.
 *
 * ## Cross-Phase Scheduling (Task 4.1)
 * By default, tasks from different phases can be returned together if their
 * dependencies are met. This enables maximum parallelism.
 *
 * Output format (task 3.5):
 * - count: number of tasks returned
 * - tasks: array of task objects with:
 *   - id, description, phase, status, reason
 *   - dependencies: array of task IDs this task depends on
 *   - dependents: array of task IDs that depend on this task
 *   - blockedBy: array of incomplete dependencies (only when task is blocked)
 * - fileConflicts: (optional) array of file conflicts if any
 * - parallelPhases: (optional) parallel phase groups if any
 * - crossPhaseExecution: (optional) true when tasks from multiple phases are ready
 *
 * Options (task 3.4, 4.2):
 * --ignore-deps: Bypass dependency checking and return tasks by phase order only
 * --phase-priority: Only return tasks from the earliest phase with ready tasks (task 4.2)
 *
 * Logic:
 * 1. First check for in-progress tasks
 * 2. Then check for failed tasks that might be retried
 * 3. Use DAG-aware getReadyTasks() for pending tasks
 */
function cmdNext(planPath, countStr, options = {}) {
  const maxTasks = parseInt(countStr || '3', 10);
  const ignoreDeps = options['ignore-deps'] === true;
  const phasePriority = options['phase-priority'] === true;
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

  // Get parallel phase information
  const parallelPhaseSet = new Set();
  let parallelInfo = null;
  if (constraints.parallel && constraints.parallel.length > 0) {
    parallelInfo = constraints.parallel;
    for (const group of constraints.parallel) {
      for (const phaseId of group.phaseIds) {
        parallelPhaseSet.add(phaseId);
      }
    }
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
          dependencies: task.dependencies || [],
          dependents: task.dependents || [],
          ...getConstraintMetadata(task.id)
        });
      }
    }
  }

  if (next.length > 0) {
    const inProgressTasks = next.slice(0, maxTasks);
    // Detect conflicts even for in-progress tasks
    const conflicts = detectFileConflicts(inProgressTasks);
    const conflictMap = new Map();
    for (const conflict of conflicts) {
      for (const taskId of conflict.taskIds) {
        if (!conflictMap.has(taskId)) {
          conflictMap.set(taskId, {
            files: [],
            conflictsWith: new Set()
          });
        }
        conflictMap.get(taskId).files.push(conflict.file);
        for (const otherId of conflict.taskIds) {
          if (otherId !== taskId) {
            conflictMap.get(taskId).conflictsWith.add(otherId);
          }
        }
      }
    }
    const tasksWithConflicts = inProgressTasks.map(task => {
      const conflict = conflictMap.get(task.id);
      if (conflict) {
        return {
          ...task,
          fileConflict: true,
          conflictsWith: Array.from(conflict.conflictsWith),
          conflictingFiles: conflict.files
        };
      }
      return task;
    });
    outputJSON({
      count: tasksWithConflicts.length,
      tasks: tasksWithConflicts,
      fileConflicts: conflicts.length > 0 ? conflicts : undefined
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
          dependencies: task.dependencies || [],
          dependents: task.dependents || [],
          ...getConstraintMetadata(task.id)
        });
      }
    }
  }

  // If we have failed tasks, return them now
  if (next.length > 0) {
    const failedTasks = next.slice(0, maxTasks);
    outputJSON({
      count: failedTasks.length,
      tasks: failedTasks
    });
    return;
  }

  // 3. Use DAG-aware selection for pending tasks (task 3.2)
  // Task 4.1: Cross-phase scheduling enabled by default
  // Task 4.2: phasePriority limits to earliest phase when enabled
  // Task 5.3: Pass pipeline-start triggers for early phase advancement
  const pipelineStartTriggers = constraints.pipelineStart || [];
  const readyTasks = getReadyTasks(status, maxTasks, { ignoreDeps, phasePriority, pipelineStartTriggers });

  // Transform to output format with constraint metadata and dependencies (tasks 3.3 & 3.5)
  for (const task of readyTasks) {
    const taskData = {
      id: task.id,
      description: task.description,
      phase: task.phaseNumber,
      status: task.status,
      reason: 'pending - ready to implement',
      // Task 3.5: Include dependencies and dependents in output
      dependencies: task.dependencies,
      dependents: task.dependents,
      ...getConstraintMetadata(task.id)
    };

    // Task 3.3: Include blockedBy if task has unmet dependencies (only when ignoreDeps is true)
    if (ignoreDeps && task.blockedBy && task.blockedBy.length > 0) {
      taskData.blockedBy = task.blockedBy;
      taskData.reason = 'pending - has unmet dependencies (ignored with --ignore-deps)';
    }

    // Mark if this task is from a parallel phase
    if (parallelPhaseSet.has(task.phaseNumber)) {
      taskData.parallelPhase = true;
    }

    // Task 5.3: Mark if this task became ready via pipeline-start trigger
    if (task.pipelineTriggered) {
      taskData.pipelineTriggered = true;
      taskData.reason = 'pending - ready via pipeline-start trigger';
    }

    next.push(taskData);
  }

  // Also get blocked tasks to show what's waiting (for informational purposes)
  const blockedTasks = getBlockedTasks(status);

  // 4. Detect file conflicts among selected tasks
  const conflicts = detectFileConflicts(next);

  // Build lookup of task ID -> conflicting task IDs
  const conflictMap = new Map();
  for (const conflict of conflicts) {
    for (const taskId of conflict.taskIds) {
      if (!conflictMap.has(taskId)) {
        conflictMap.set(taskId, {
          files: [],
          conflictsWith: new Set()
        });
      }
      conflictMap.get(taskId).files.push(conflict.file);
      for (const otherId of conflict.taskIds) {
        if (otherId !== taskId) {
          conflictMap.get(taskId).conflictsWith.add(otherId);
        }
      }
    }
  }

  // Add conflict information to each task
  const tasksWithConflicts = next.map(task => {
    const conflict = conflictMap.get(task.id);
    if (conflict) {
      return {
        ...task,
        fileConflict: true,
        conflictsWith: Array.from(conflict.conflictsWith),
        conflictingFiles: conflict.files
      };
    }
    return task;
  });

  const output = {
    count: tasksWithConflicts.length,
    tasks: tasksWithConflicts
  };

  // Include file conflicts if any
  if (conflicts.length > 0) {
    output.fileConflicts = conflicts;
  }

  // Include parallel phase info if applicable
  if (parallelInfo && parallelInfo.length > 0) {
    output.parallelPhases = parallelInfo.map(g => ({
      phases: g.phaseIds,
      reason: g.reason
    }));
  }

  // Task 5.3: Include pipeline-start triggers if any
  if (pipelineStartTriggers.length > 0) {
    output.pipelineStartTriggers = pipelineStartTriggers.map(t => ({
      phase: t.phase,
      triggerTask: t.triggerTaskId
    }));
  }

  // Include blocked tasks count for visibility
  if (blockedTasks.length > 0) {
    output.blockedTaskCount = blockedTasks.length;
  }

  // Task 3.4: Show if --ignore-deps was used
  if (ignoreDeps) {
    output.ignoreDeps = true;
  }

  // Task 4.2: Show if --phase-priority was used
  if (phasePriority) {
    output.phasePriority = true;
  }

  // Task 4.3: Detect cross-phase execution (tasks from multiple phases ready)
  const phaseNumbers = new Set(tasksWithConflicts.map(t => t.phase));
  if (phaseNumbers.size > 1) {
    output.crossPhaseExecution = true;
    output.activePhases = Array.from(phaseNumbers).sort((a, b) => a - b);
  }

  outputJSON(output);
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
 * progress-watch - Continuously poll status.json and output progress changes
 *
 * Polls every 2 seconds, outputs changes as progress markers.
 * Exit when plan completes or on Ctrl+C.
 */
function cmdProgressWatch(planPath, options = {}) {
  const POLL_INTERVAL_MS = 2000;
  const format = options.format || 'markers';

  let lastStatus = null;
  let lastSummaryStr = '';

  // Track what we've emitted to avoid duplicates
  const emittedTasks = new Map(); // taskId -> status

  console.error(`Watching progress for: ${planPath}`);
  console.error(`Polling every ${POLL_INTERVAL_MS / 1000} seconds. Press Ctrl+C to stop.\n`);

  function poll() {
    const status = loadStatus(planPath);
    if (!status) {
      console.error('Error: status.json not found');
      return;
    }

    const summary = status.summary;
    const total = summary.totalTasks || 0;
    const completed = summary.completed || 0;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Determine plan status
    let planStatus = 'pending';
    if (completed === total && total > 0) {
      planStatus = 'completed';
    } else if (completed > 0 || (summary.in_progress || 0) > 0) {
      planStatus = 'in_progress';
    }

    // Check for task status changes
    for (const task of status.tasks) {
      const prevStatus = emittedTasks.get(task.id);
      if (prevStatus !== task.status) {
        // Emit task status change
        if (format === 'markers') {
          let statusStr = task.status;
          if (statusStr === 'in_progress') statusStr = 'started';
          console.log(`[PROGRESS] task=${task.id} status=${statusStr}`);
        } else if (format === 'json') {
          console.log(JSON.stringify({
            type: 'task',
            id: task.id,
            status: task.status,
            timestamp: new Date().toISOString()
          }));
        }
        emittedTasks.set(task.id, task.status);
      }
    }

    // Check for summary changes
    const currentSummaryStr = `${completed}/${total}/${summary.failed || 0}`;
    if (currentSummaryStr !== lastSummaryStr) {
      if (format === 'markers') {
        console.log(`[PROGRESS] plan status=${planStatus} percent=${percentage}`);
        console.log(`[PROGRESS] summary completed=${completed} pending=${summary.pending || 0} failed=${summary.failed || 0}`);
      } else if (format === 'json') {
        console.log(JSON.stringify({
          type: 'summary',
          status: planStatus,
          percentage,
          completed,
          pending: summary.pending || 0,
          failed: summary.failed || 0,
          timestamp: new Date().toISOString()
        }));
      }
      lastSummaryStr = currentSummaryStr;
    }

    // Check if plan is complete
    if (planStatus === 'completed') {
      if (format === 'markers') {
        console.log(`[PROGRESS] plan status=completed percent=100`);
      } else if (format === 'json') {
        console.log(JSON.stringify({
          type: 'complete',
          message: 'Plan execution completed',
          timestamp: new Date().toISOString()
        }));
      }
      console.error('\nPlan execution completed.');
      process.exit(0);
    }

    lastStatus = status;
  }

  // Initial poll
  poll();

  // Set up interval polling
  const intervalId = setInterval(poll, POLL_INTERVAL_MS);

  // Handle Ctrl+C gracefully
  process.on('SIGINT', () => {
    clearInterval(intervalId);
    console.error('\nWatch mode stopped.');
    process.exit(0);
  });
}

/**
 * progress - Show formatted progress bar
 *
 * Options:
 *   --format=text (default): Human-readable output with progress bar
 *   --format=json: Full structured JSON
 *   --format=markers: Progress marker format for parsing
 *   --watch: Continuously poll status.json and output changes
 */
function cmdProgress(planPath, options = {}) {
  // Handle watch mode
  if (options.watch) {
    cmdProgressWatch(planPath, options);
    return;
  }

  const status = loadStatus(planPath);
  if (!status) {
    exitWithError('No status.json found.');
  }

  const summary = status.summary;
  const total = summary.totalTasks || 0;
  const completed = summary.completed || 0;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  const format = options.format || 'text';

  // JSON format - full structured output
  if (format === 'json') {
    // Calculate phase progress
    const phaseMap = new Map();
    for (const task of status.tasks) {
      const phaseName = task.phase || 'Unknown Phase';
      if (!phaseMap.has(phaseName)) {
        const phaseMatch = phaseName.match(/Phase\s+(\d+)/);
        const phaseNumber = phaseMatch ? parseInt(phaseMatch[1]) : 0;
        phaseMap.set(phaseName, {
          number: phaseNumber,
          name: phaseName,
          total: 0,
          completed: 0,
          in_progress: 0,
          pending: 0,
          failed: 0,
          skipped: 0
        });
      }
      const phase = phaseMap.get(phaseName);
      phase.total++;
      if (summary[task.status] !== undefined) {
        phase[task.status]++;
      } else {
        phase.pending++;
      }
    }

    const phases = Array.from(phaseMap.values())
      .sort((a, b) => a.number - b.number)
      .map(p => ({
        number: p.number,
        name: p.name,
        total: p.total,
        completed: p.completed,
        in_progress: p.in_progress,
        pending: p.pending,
        failed: p.failed,
        skipped: p.skipped,
        percentage: p.total > 0 ? Math.round((p.completed / p.total) * 100) : 0
      }));

    // Determine plan status
    let planStatus = 'pending';
    if (completed === total && total > 0) {
      planStatus = 'completed';
    } else if (completed > 0 || (summary.in_progress || 0) > 0) {
      planStatus = 'in_progress';
    }

    const jsonOutput = {
      plan: {
        path: status.planPath,
        name: status.planName,
        status: planStatus
      },
      summary: {
        total,
        completed,
        in_progress: summary.in_progress || 0,
        pending: summary.pending || 0,
        failed: summary.failed || 0,
        skipped: summary.skipped || 0,
        percentage
      },
      phases,
      currentPhase: status.currentPhase,
      lastUpdated: status.lastUpdatedAt
    };

    // Include git information if available
    const gitInfo = getGitInfo();
    if (gitInfo) {
      jsonOutput.git = {
        branch: gitInfo.branch,
        uncommittedCount: gitInfo.uncommittedCount,
        commitCount: gitInfo.commitCount,
        lastCommit: gitInfo.lastCommit
      };
    }

    // Include git queue status if available
    try {
      const { getCommitQueueStatus } = require('./lib/plan-status.js');
      const queueStatus = getCommitQueueStatus();
      if (queueStatus.pendingCount > 0) {
        jsonOutput.gitQueue = {
          pending: queueStatus.pendingCount,
          isProcessing: queueStatus.isProcessing
        };
      }
    } catch (error) {
      // Git queue not available, skip silently
    }

    // Task 4.3: Detect cross-phase execution (multiple phases with in_progress tasks)
    const activePhases = phases.filter(p => p.in_progress > 0).map(p => p.number);
    if (activePhases.length > 1) {
      jsonOutput.crossPhaseExecution = {
        active: true,
        phases: activePhases,
        description: `Tasks from ${activePhases.length} phases executing in parallel`
      };
    }

    // Task 5.4: Add pipeline visualization info
    // Read plan file to get pipeline-start triggers
    let pipelineInfo = null;
    try {
      const absolutePath = path.isAbsolute(planPath) ? planPath : path.resolve(process.cwd(), planPath);
      const planContent = fs.readFileSync(absolutePath, 'utf8');
      const constraints = parseExecutionNotes(planContent);

      if (constraints.pipelineStart && constraints.pipelineStart.length > 0) {
        // Build pipeline visualization data
        const taskStatusMap = new Map();
        for (const task of status.tasks) {
          taskStatusMap.set(task.id, task.status);
        }

        pipelineInfo = {
          triggers: constraints.pipelineStart.map(t => {
            const triggerStatus = taskStatusMap.get(t.triggerTaskId);
            const isTriggered = triggerStatus === 'completed' || triggerStatus === 'skipped';
            return {
              phase: t.phase,
              triggerTask: t.triggerTaskId,
              triggerStatus: triggerStatus || 'unknown',
              pipelineActive: isTriggered
            };
          }),
          activeOverlaps: []
        };

        // Detect active pipeline overlaps (phases that started early due to triggers)
        for (const trigger of pipelineInfo.triggers) {
          if (trigger.pipelineActive) {
            const triggerPhase = phases.find(p => p.number === trigger.phase);
            if (triggerPhase && triggerPhase.in_progress > 0) {
              pipelineInfo.activeOverlaps.push({
                phase: trigger.phase,
                triggeredBy: trigger.triggerTask
              });
            }
          }
        }

        if (pipelineInfo.triggers.length > 0) {
          jsonOutput.pipeline = pipelineInfo;
        }
      }
    } catch (error) {
      // Plan file may not be readable, skip pipeline info
    }

    // Include worktree context if applicable
    const worktreeContext = detectWorktreeContext();
    if (worktreeContext.inWorktree) {
      jsonOutput.worktree = {
        inWorktree: true,
        worktreePath: worktreeContext.worktreePath,
        contextDir: '.claude-context'
      };
    }

    outputJSON(jsonOutput);
    return;
  }

  // Markers format - parseable progress markers for TUI integration
  if (format === 'markers') {
    // Determine plan status
    let planStatus = 'pending';
    if (completed === total && total > 0) {
      planStatus = 'completed';
    } else if (completed > 0 || (summary.in_progress || 0) > 0) {
      planStatus = 'in_progress';
    }

    // Plan-level marker
    console.log(`[PROGRESS] plan status=${planStatus} percent=${percentage}`);

    // Git marker
    const gitInfo = getGitInfo();
    if (gitInfo) {
      let gitMarker = `[PROGRESS] git branch=${gitInfo.branch || 'detached'} uncommitted=${gitInfo.uncommittedCount}`;
      if (gitInfo.commitCount !== null) {
        gitMarker += ` commits=${gitInfo.commitCount}`;
      }
      console.log(gitMarker);
      if (gitInfo.lastCommit) {
        console.log(`[PROGRESS] git last_commit=${gitInfo.lastCommit.sha}`);
      }
    }

    // Phase-level markers
    const phaseMap = new Map();
    for (const task of status.tasks) {
      const phaseName = task.phase || 'Unknown Phase';
      if (!phaseMap.has(phaseName)) {
        const phaseMatch = phaseName.match(/Phase\s+(\d+)/);
        const phaseNumber = phaseMatch ? parseInt(phaseMatch[1]) : 0;
        phaseMap.set(phaseName, {
          number: phaseNumber,
          total: 0,
          completed: 0,
          in_progress: 0
        });
      }
      const phase = phaseMap.get(phaseName);
      phase.total++;
      if (task.status === 'completed' || task.status === 'skipped') {
        phase.completed++;
      }
      if (task.status === 'in_progress') {
        phase.in_progress++;
      }
    }

    const phases = Array.from(phaseMap.values()).sort((a, b) => a.number - b.number);
    for (const phase of phases) {
      const phasePercent = phase.total > 0 ? Math.round((phase.completed / phase.total) * 100) : 0;
      let phaseStatus = 'pending';
      if (phase.completed === phase.total && phase.total > 0) {
        phaseStatus = 'completed';
      } else if (phase.completed > 0 || phase.in_progress > 0) {
        phaseStatus = 'in_progress';
      }
      console.log(`[PROGRESS] phase=${phase.number} status=${phaseStatus} percent=${phasePercent}`);
    }

    // Task 4.3: Cross-phase execution marker
    const activePhasesMarkers = phases.filter(p => p.in_progress > 0).map(p => p.number);
    if (activePhasesMarkers.length > 1) {
      console.log(`[PROGRESS] cross_phase active=true phases=${activePhasesMarkers.join(',')}`);
    }

    // Task 5.4: Pipeline markers
    try {
      const absolutePath = path.isAbsolute(planPath) ? planPath : path.resolve(process.cwd(), planPath);
      const planContent = fs.readFileSync(absolutePath, 'utf8');
      const constraints = parseExecutionNotes(planContent);

      if (constraints.pipelineStart && constraints.pipelineStart.length > 0) {
        const taskStatusMap = new Map();
        for (const task of status.tasks) {
          taskStatusMap.set(task.id, task.status);
        }

        for (const trigger of constraints.pipelineStart) {
          const triggerStatus = taskStatusMap.get(trigger.triggerTaskId);
          const isTriggered = triggerStatus === 'completed' || triggerStatus === 'skipped';
          console.log(`[PROGRESS] pipeline phase=${trigger.phase} trigger=${trigger.triggerTaskId} active=${isTriggered}`);
        }
      }
    } catch (error) {
      // Plan file may not be readable, skip pipeline markers
    }

    // Task-level markers for in-progress tasks
    for (const task of status.tasks) {
      if (task.status === 'in_progress') {
        console.log(`[PROGRESS] task=${task.id} status=started`);
      }
    }

    // Summary marker
    console.log(`[PROGRESS] summary completed=${completed} pending=${summary.pending || 0} failed=${summary.failed || 0}`);

    // Worktree marker
    const worktreeContext = detectWorktreeContext();
    if (worktreeContext.inWorktree) {
      console.log(`[PROGRESS] worktree path=${worktreeContext.worktreePath} context=.claude-context`);
    }
    return;
  }

  // Default: text format - human-readable output
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

  // Task 4.3: Show cross-phase execution status
  // Calculate which phases have in-progress tasks
  const phaseInProgress = new Map();
  for (const task of status.tasks) {
    if (task.status === 'in_progress') {
      const phaseName = task.phase || 'Unknown Phase';
      const phaseMatch = phaseName.match(/Phase\s+(\d+)/);
      const phaseNumber = phaseMatch ? parseInt(phaseMatch[1]) : 0;
      if (!phaseInProgress.has(phaseNumber)) {
        phaseInProgress.set(phaseNumber, []);
      }
      phaseInProgress.get(phaseNumber).push(task.id);
    }
  }
  if (phaseInProgress.size > 1) {
    console.log('');
    console.log(`⚡ Cross-Phase Execution: ${phaseInProgress.size} phases active`);
    for (const [phaseNum, taskIds] of Array.from(phaseInProgress.entries()).sort((a, b) => a[0] - b[0])) {
      console.log(`   Phase ${phaseNum}: ${taskIds.join(', ')}`);
    }
  }

  // Task 5.4: Show pipeline status (phase advancement triggers)
  try {
    const absolutePath = path.isAbsolute(planPath) ? planPath : path.resolve(process.cwd(), planPath);
    const planContent = fs.readFileSync(absolutePath, 'utf8');
    const constraints = parseExecutionNotes(planContent);

    if (constraints.pipelineStart && constraints.pipelineStart.length > 0) {
      const taskStatusMap = new Map();
      for (const task of status.tasks) {
        taskStatusMap.set(task.id, task.status);
      }

      // Show pipeline triggers and their status
      console.log('');
      console.log('Pipeline Triggers:');
      for (const trigger of constraints.pipelineStart) {
        const triggerStatus = taskStatusMap.get(trigger.triggerTaskId) || 'unknown';
        const isTriggered = triggerStatus === 'completed' || triggerStatus === 'skipped';
        const statusIcon = isTriggered ? '✓' : (triggerStatus === 'in_progress' ? '⏳' : '◯');
        console.log(`   ${statusIcon} Phase ${trigger.phase} starts when ${trigger.triggerTaskId} completes [${triggerStatus}]`);
      }
    }
  } catch (error) {
    // Plan file may not be readable, skip pipeline info
  }

  // Show git information
  const gitInfo = getGitInfo();
  if (gitInfo) {
    console.log('');
    console.log(`Branch: ${gitInfo.branch || '(detached HEAD)'}`);
    console.log(`Uncommitted: ${gitInfo.uncommittedCount} file(s)`);
    if (gitInfo.commitCount !== null) {
      console.log(`Commits: ${gitInfo.commitCount} ahead of base branch`);
    }
    if (gitInfo.lastCommit) {
      // Truncate message to 50 chars for display
      const msg = gitInfo.lastCommit.message.length > 50
        ? gitInfo.lastCommit.message.slice(0, 47) + '...'
        : gitInfo.lastCommit.message;
      console.log(`Last: ${gitInfo.lastCommit.sha} ${msg}`);
    }
  }

  // Show git queue status if there are pending commits
  try {
    const { getCommitQueueStatus } = require('./lib/plan-status.js');
    const queueStatus = getCommitQueueStatus();
    if (queueStatus.pendingCount > 0) {
      console.log('');
      console.log(`Git Queue: ${queueStatus.pendingCount} commit(s) pending`);
      if (queueStatus.isProcessing) {
        console.log(`  ⟳ Processing commit...`);
      }
    }
  } catch (error) {
    // Git queue not available, skip silently
  }

  // Show worktree context if applicable
  const worktreeContext = detectWorktreeContext();
  if (worktreeContext.inWorktree) {
    console.log('');
    console.log(`Worktree: ${worktreeContext.worktreePath}`);
    console.log(`  Context: .claude-context/ (worktree-specific)`);
  }
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
 * all-plans - Show aggregate status for all plans across all worktrees
 *
 * Task 6.1, 6.2, 6.3, 6.4, 6.5, 6.6: Aggregate status view
 *
 * Scans:
 * 1. Main repo (.claude/current-plan.txt)
 * 2. All worktrees (worktrees/plan-{name}/ with .claude-context/current-plan.txt)
 * 3. Orchestrator registry for running instances
 *
 * Options:
 *   --format=text (default): Human-readable table
 *   --format=json: Full structured JSON
 *   --json: Alias for --format=json (Task 6.5: programmatic access)
 */
function cmdAllPlans(options = {}) {
  // Task 6.5: Support --json as alias for --format=json
  const format = options.json ? 'json' : (options.format || 'text');
  const worktreeUtils = require('./lib/worktree-utils.js');

  const result = {
    plans: [],
    aggregate: {
      totalPlans: 0,
      totalTasks: 0,
      totalCompleted: 0,
      totalPending: 0,
      totalInProgress: 0,
      totalFailed: 0,
      overallPercentage: 0
    },
    worktrees: [],
    orchestrators: []
  };

  // Task 6.2: Scan all worktrees for active plans

  // 1. Get main repo plan (if any)
  const mainPlanPointer = path.join(process.cwd(), '.claude', 'current-plan.txt');
  if (fs.existsSync(mainPlanPointer)) {
    try {
      const mainPlanPath = fs.readFileSync(mainPlanPointer, 'utf8').trim();
      if (mainPlanPath) {
        const status = loadStatus(mainPlanPath);
        if (status) {
          result.plans.push({
            planPath: mainPlanPath,
            planName: status.planName,
            location: 'main',
            worktreePath: null,
            summary: status.summary,
            currentPhase: status.currentPhase,
            lastUpdated: status.lastUpdatedAt
          });
        }
      }
    } catch (error) {
      // Ignore errors
    }
  }

  // 2. Scan worktrees directory
  const worktreesDir = path.join(process.cwd(), 'worktrees');
  if (fs.existsSync(worktreesDir)) {
    try {
      const entries = fs.readdirSync(worktreesDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && entry.name.startsWith('plan-')) {
          const worktreePath = path.join(worktreesDir, entry.name);
          const contextPlanFile = path.join(worktreePath, '.claude-context', 'current-plan.txt');

          if (fs.existsSync(contextPlanFile)) {
            try {
              const planPath = fs.readFileSync(contextPlanFile, 'utf8').trim();
              if (planPath) {
                // Load status.json from this worktree's context
                const statusPath = path.join(worktreePath, 'docs', 'plan-outputs',
                  path.basename(planPath, '.md'), 'status.json');

                // Also try main repo location if worktree doesn't have its own
                const mainStatusPath = getStatusPath(planPath);

                let status = null;
                if (fs.existsSync(statusPath)) {
                  try {
                    status = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
                  } catch (e) { /* ignore */ }
                }
                if (!status && fs.existsSync(mainStatusPath)) {
                  try {
                    status = JSON.parse(fs.readFileSync(mainStatusPath, 'utf8'));
                  } catch (e) { /* ignore */ }
                }

                if (status) {
                  result.plans.push({
                    planPath: planPath,
                    planName: status.planName,
                    location: 'worktree',
                    worktreePath: worktreePath,
                    summary: status.summary,
                    currentPhase: status.currentPhase,
                    lastUpdated: status.lastUpdatedAt
                  });
                  result.worktrees.push({
                    name: entry.name,
                    path: worktreePath,
                    planPath: planPath
                  });
                }
              }
            } catch (error) {
              // Ignore errors
            }
          }
        }
      }
    } catch (error) {
      // Ignore errors
    }
  }

  // 3. Check orchestrator registry for running instances
  const registryPath = path.join(process.cwd(), '.claude', 'orchestrator-registry.json');
  if (fs.existsSync(registryPath)) {
    try {
      const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
      const instances = registry.instances || [];
      for (const inst of instances) {
        if (inst.status === 'running') {
          result.orchestrators.push({
            id: inst.id,
            pid: inst.pid,
            planPath: inst.plan_path,
            worktreePath: inst.worktree_path,
            startedAt: inst.started_at,
            lastHeartbeat: inst.last_heartbeat
          });
        }
      }
    } catch (error) {
      // Ignore errors
    }
  }

  // Task 6.3: Aggregate progress across all plans
  result.aggregate.totalPlans = result.plans.length;

  for (const plan of result.plans) {
    const summary = plan.summary || {};
    result.aggregate.totalTasks += summary.totalTasks || 0;
    result.aggregate.totalCompleted += summary.completed || 0;
    result.aggregate.totalPending += summary.pending || 0;
    result.aggregate.totalInProgress += summary.in_progress || 0;
    result.aggregate.totalFailed += summary.failed || 0;
  }

  if (result.aggregate.totalTasks > 0) {
    result.aggregate.overallPercentage = Math.round(
      (result.aggregate.totalCompleted / result.aggregate.totalTasks) * 100
    );
  }

  // Task 6.4: Show per-plan summary in table format

  if (format === 'json') {
    outputJSON(result);
    return;
  }

  // Text format: human-readable table
  if (result.plans.length === 0) {
    console.log('No active plans found.');
    console.log('');
    console.log('To start a plan:');
    console.log('  1. Create a plan file in docs/plans/');
    console.log('  2. Run: /plan:set <plan-name>');
    console.log('  3. Or use /plan:worktree create <name> for isolated execution');
    return;
  }

  // Header
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════════════════╗');
  console.log('║                         ALL PLANS STATUS                              ║');
  console.log('╠═══════════════════════════════════════════════════════════════════════╣');

  // Aggregate progress bar
  const aggBarWidth = 40;
  const aggFilled = Math.round((result.aggregate.overallPercentage / 100) * aggBarWidth);
  const aggEmpty = aggBarWidth - aggFilled;
  const aggBar = '█'.repeat(aggFilled) + '░'.repeat(aggEmpty);

  console.log(`║  Overall: [${aggBar}] ${String(result.aggregate.overallPercentage).padStart(3)}%     ║`);
  console.log(`║  Plans: ${result.aggregate.totalPlans}  Tasks: ${result.aggregate.totalCompleted}/${result.aggregate.totalTasks}  ` +
    `In Progress: ${result.aggregate.totalInProgress}  Failed: ${result.aggregate.totalFailed}`.padEnd(35) + '║');
  console.log('╠═══════════════════════════════════════════════════════════════════════╣');

  // Per-plan table
  console.log('║  PLAN                          PROGRESS    TASKS   PHASE              ║');
  console.log('╟───────────────────────────────────────────────────────────────────────╢');

  for (const plan of result.plans) {
    const summary = plan.summary || {};
    const total = summary.totalTasks || 0;
    const completed = summary.completed || 0;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Plan name (truncate to 28 chars)
    const planName = plan.planName || path.basename(plan.planPath, '.md');
    const displayName = planName.length > 28 ? planName.slice(0, 25) + '...' : planName;

    // Progress bar (10 chars)
    const barWidth = 10;
    const filled = Math.round((percentage / 100) * barWidth);
    const empty = barWidth - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);

    // Location indicator
    const locIndicator = plan.location === 'worktree' ? '⑂' : ' ';

    // Phase (truncate)
    const phase = plan.currentPhase || '';
    const phaseMatch = phase.match(/Phase\s+(\d+)/);
    const phaseNum = phaseMatch ? `P${phaseMatch[1]}` : '';

    // Check if orchestrator is running for this plan
    const isRunning = result.orchestrators.some(o => o.planPath === plan.planPath);
    const runIndicator = isRunning ? '●' : ' ';

    console.log(`║ ${runIndicator}${locIndicator} ${displayName.padEnd(28)} [${bar}] ${String(percentage).padStart(3)}%  ${String(completed).padStart(3)}/${String(total).padEnd(3)}  ${phaseNum.padEnd(3)} ║`);
  }

  console.log('╚═══════════════════════════════════════════════════════════════════════╝');

  // Legend
  console.log('');
  console.log('Legend: ● = orchestrator running, ⑂ = in worktree');

  // Task 6.6: Show worktree paths for worktree-based plans
  const worktreePlans = result.plans.filter(p => p.location === 'worktree' && p.worktreePath);
  if (worktreePlans.length > 0) {
    console.log('');
    console.log('Worktree Paths:');
    for (const plan of worktreePlans) {
      const planName = plan.planName || path.basename(plan.planPath, '.md');
      const shortName = planName.length > 40 ? planName.slice(0, 37) + '...' : planName;
      console.log(`  ⑂ ${shortName}`);
      console.log(`    ${plan.worktreePath}`);
    }
  }

  // Running orchestrators detail
  if (result.orchestrators.length > 0) {
    console.log('');
    console.log('Running Orchestrators:');
    for (const orch of result.orchestrators) {
      const planName = path.basename(orch.planPath || 'unknown', '.md');
      const worktreeInfo = orch.worktreePath ? ` [${path.basename(orch.worktreePath)}]` : '';
      console.log(`  ● ${orch.id} - ${planName}${worktreeInfo} (PID: ${orch.pid})`);
      // Task 6.6: Show worktree path for running orchestrators
      if (orch.worktreePath) {
        console.log(`    Worktree: ${orch.worktreePath}`);
      }
    }
  }

  console.log('');
}

/**
 * worktree-context - Check worktree context detection
 *
 * Shows whether we're in a worktree context and how the plan path is being resolved.
 * Useful for debugging worktree-related issues.
 */
function cmdWorktreeContext() {
  const worktreeContext = detectWorktreeContext();
  const activePlanPath = getActivePlanPath();

  // Check for environment variable
  const envWorktree = process.env.CLAUDE_WORKTREE || null;

  // Check for .claude-context/current-plan.txt
  const cwd = process.cwd();
  const claudeContextPath = path.join(cwd, '.claude-context', 'current-plan.txt');
  const claudeContextExists = fs.existsSync(claudeContextPath);

  // Check for .claude/current-plan.txt
  const mainContextPath = path.join(cwd, '.claude', 'current-plan.txt');
  const mainContextExists = fs.existsSync(mainContextPath);

  outputJSON({
    inWorktree: worktreeContext.inWorktree,
    worktreePath: worktreeContext.worktreePath,
    activePlanPath: activePlanPath,
    resolution: {
      source: worktreeContext.inWorktree
        ? (envWorktree ? 'CLAUDE_WORKTREE env' : '.claude-context/current-plan.txt')
        : (mainContextExists ? '.claude/current-plan.txt' : 'none'),
      envCLAUDE_WORKTREE: envWorktree,
      claudeContextExists: claudeContextExists,
      claudeContextPath: claudeContextPath,
      mainContextExists: mainContextExists,
      mainContextPath: mainContextPath
    },
    cwd: cwd
  });
}

/**
 * conflicts - Show conflict detection report for parallel plan branches
 *
 * Tasks 9.1-9.3: Conflict detection, file modification warnings, merge order
 */
function cmdConflicts(options) {
  // Import conflict detector (lazy load to avoid circular dependencies)
  const conflictDetector = require('./lib/conflict-detector.js');

  const format = options.format || 'text';

  if (format === 'json') {
    outputJSON(conflictDetector.generateConflictReportJSON());
  } else {
    console.log(conflictDetector.generateConflictReport());
  }
}

/**
 * rebase-check - Check if plan branches need to rebase on main
 *
 * Task 9.4: Support rebasing worktree on updated main
 *
 * Works with both worktrees and regular plan branches
 */
function cmdRebaseCheck(options) {
  const worktreeUtils = require('./lib/worktree-utils.js');
  const conflictDetector = require('./lib/conflict-detector.js');

  const repoRoot = worktreeUtils.getRepoRoot();
  if (!repoRoot) {
    exitWithError('Not in a git repository');
    return;
  }

  // Get all plan branches (worktree or not)
  const planBranches = conflictDetector.listPlanBranches();

  if (planBranches.length === 0) {
    if (options.format === 'json' || options.json) {
      outputJSON({ branches: [], needsRebase: false });
    } else {
      console.log('No plan branches found.');
    }
    return;
  }

  // Get worktrees to check if branches have associated worktrees
  const worktrees = worktreeUtils.listWorktrees();
  const worktreeByBranch = {};
  for (const wt of worktrees) {
    if (wt.branch) {
      worktreeByBranch[wt.branch] = wt.path;
    }
  }

  const results = [];
  for (const branch of planBranches) {
    const worktreePath = worktreeByBranch[branch];

    // Get rebase status for the branch directly
    const status = worktreeUtils.checkBranchRebaseStatus(branch);

    results.push({
      branch,
      path: worktreePath || null,
      isWorktree: !!worktreePath,
      planName: branch.replace('plan/', ''),
      needsRebase: status.needsRebase,
      behindCount: status.behindCount,
      aheadCount: status.aheadCount,
      error: status.error
    });
  }

  if (options.format === 'json' || options.json) {
    outputJSON({
      branches: results,
      needsRebase: results.some(r => r.needsRebase)
    });
  } else {
    console.log('Plan Branch Rebase Status:\n');

    const needingRebase = results.filter(r => r.needsRebase);
    const upToDate = results.filter(r => !r.needsRebase && !r.error);
    const errors = results.filter(r => r.error);

    if (needingRebase.length > 0) {
      console.log('⚠ Branches needing rebase:');
      for (const item of needingRebase) {
        const wtIndicator = item.isWorktree ? ' (worktree)' : '';
        console.log(`  ${item.branch}${wtIndicator} (${item.behindCount} behind, ${item.aheadCount} ahead)`);
        if (item.path) {
          console.log(`    cd ${item.path} && git rebase main`);
        } else {
          console.log(`    git checkout ${item.branch} && git rebase main`);
        }
      }
      console.log('');
    }

    if (upToDate.length > 0) {
      console.log('✓ Up-to-date branches:');
      for (const item of upToDate) {
        const wtIndicator = item.isWorktree ? ' (worktree)' : '';
        console.log(`  ${item.branch}${wtIndicator} (${item.aheadCount} commits ahead)`);
      }
      console.log('');
    }

    if (errors.length > 0) {
      console.log('✗ Error checking:');
      for (const item of errors) {
        console.log(`  ${item.branch}: ${item.error}`);
      }
    }
  }
}

/**
 * worktree-conflict - Check and handle merge conflicts for a worktree
 *
 * Task 9.5: Handle merge conflicts in worktree context
 *
 * Usage:
 *   node scripts/status-cli.js worktree-conflict [worktree-path] [--format=json]
 *   node scripts/status-cli.js worktree-conflict --abort  # Abort in-progress conflict
 */
function cmdWorktreeConflict(worktreePathArg, options) {
  const worktreeUtils = require('./lib/worktree-utils.js');
  const conflictDetector = require('./lib/conflict-detector.js');

  // Determine worktree path and branch
  let worktreePath = worktreePathArg;
  let branch = null;

  if (!worktreePath) {
    // Try to detect from current context
    const context = worktreeUtils.detectWorktreeContext();
    if (context.inWorktree) {
      worktreePath = context.worktreePath;
    } else {
      // If not in worktree, default to current directory
      worktreePath = process.cwd();
    }
  }

  // Resolve to absolute path
  worktreePath = require('path').resolve(worktreePath);

  // Check if it's a valid worktree
  const worktrees = worktreeUtils.listWorktrees();
  const foundWorktree = worktrees.find(wt => wt.path === worktreePath);

  if (foundWorktree) {
    branch = foundWorktree.branch;
  } else {
    // Try to get branch from current directory
    try {
      branch = require('child_process').execSync('git branch --show-current', {
        encoding: 'utf8',
        cwd: worktreePath,
        stdio: 'pipe'
      }).trim();
    } catch (error) {
      exitWithError(`Not a git worktree or repository: ${worktreePath}`);
      return;
    }
  }

  if (!branch) {
    exitWithError('Could not determine branch for worktree');
    return;
  }

  // Handle --abort option
  if (options.abort) {
    const abortResult = conflictDetector.abortWorktreeConflict(worktreePath);
    if (options.format === 'json' || options.json) {
      outputJSON(abortResult);
    } else {
      if (abortResult.success) {
        if (abortResult.operation) {
          console.log(`✓ Aborted ${abortResult.operation} operation`);
        } else {
          console.log('✓ No conflict operation to abort');
        }
      } else {
        console.log(`✗ Failed to abort: ${abortResult.error}`);
      }
    }
    return;
  }

  // Generate conflict report
  const report = conflictDetector.generateWorktreeConflictReport(worktreePath, branch);

  if (options.format === 'json' || options.json) {
    outputJSON(report.jsonData);
  } else {
    console.log(report.report);
  }
}

/**
 * merge-order - Show recommended merge order for plan branches
 *
 * Task 9.3: Implement merge order recommendation
 */
function cmdMergeOrder(options) {
  const conflictDetector = require('./lib/conflict-detector.js');

  const analysis = conflictDetector.getMergeOrderAnalysis();

  if (options.format === 'json' || options.json) {
    outputJSON(analysis);
  } else {
    console.log('📋 Recommended Merge Order:\n');

    if (analysis.recommendations.length === 0) {
      console.log('  No plan branches found.');
    } else {
      for (const rec of analysis.recommendations) {
        console.log(`  ${rec.order}. ${rec.branch}`);
        console.log(`     ${rec.reason} (${rec.fileCount} files)`);
      }
    }

    console.log('');
    console.log(`Strategy: ${analysis.suggestedStrategy}`);
    console.log('');

    if (analysis.conflictSummary.totalConflicts > 0) {
      console.log(`⚠ Conflicts: ${analysis.conflictSummary.totalConflicts} branch pairs`);
      console.log(`  High severity: ${analysis.conflictSummary.highSeverity}`);
      console.log(`  Affected files: ${analysis.conflictSummary.affectedFiles}`);
    } else {
      console.log('✓ No conflicts detected between branches');
    }
  }
}

/**
 * deps - Show dependency graph and summary for the plan
 *
 * Task 6.1: Dependency visualization command
 *
 * Usage:
 *   node scripts/status-cli.js deps                 - Show dependency summary
 *   node scripts/status-cli.js deps --graph         - ASCII graph visualization
 *   node scripts/status-cli.js deps --task 2.3      - Show deps for specific task
 *   node scripts/status-cli.js deps --format=json   - JSON output
 *
 * Options:
 *   --graph          Show ASCII dependency graph
 *   --task <id>      Show dependencies for specific task
 *   --format=text    Human-readable output (default)
 *   --format=json    Full structured JSON output
 */
function cmdDeps(planPath, options = {}) {
  const status = loadStatus(planPath);
  if (!status) {
    exitWithError('No status.json found.');
  }

  const format = options.format || 'text';
  const specificTask = options.task;
  const showGraph = options.graph === true;

  // Build dependency data from status.tasks
  const taskMap = new Map();
  const dependencyCount = { total: 0, satisfied: 0, unsatisfied: 0 };
  const tasksWithDeps = [];
  const tasksWithDependents = [];

  for (const task of status.tasks) {
    taskMap.set(task.id, task);
    const deps = task.dependencies || [];
    const dependents = task.dependents || [];

    if (deps.length > 0) {
      tasksWithDeps.push(task);
      dependencyCount.total += deps.length;

      for (const depId of deps) {
        const depTask = status.tasks.find(t => t.id === depId);
        if (depTask && (depTask.status === 'completed' || depTask.status === 'skipped')) {
          dependencyCount.satisfied++;
        } else {
          dependencyCount.unsatisfied++;
        }
      }
    }

    if (dependents.length > 0) {
      tasksWithDependents.push(task);
    }
  }

  // Find critical path (longest dependency chain)
  function findCriticalPath(taskId, visited = new Set()) {
    if (visited.has(taskId)) return [];
    visited.add(taskId);

    const task = taskMap.get(taskId);
    if (!task) return [];

    const dependents = task.dependents || [];
    if (dependents.length === 0) {
      return [taskId];
    }

    let longestPath = [];
    for (const depId of dependents) {
      const path = findCriticalPath(depId, new Set(visited));
      if (path.length > longestPath.length) {
        longestPath = path;
      }
    }

    return [taskId, ...longestPath];
  }

  // Find root tasks (no dependencies)
  const rootTasks = status.tasks.filter(t =>
    !t.dependencies || t.dependencies.length === 0
  );

  // Find all critical paths and get the longest
  let longestCriticalPath = [];
  for (const root of rootTasks) {
    const path = findCriticalPath(root.id);
    if (path.length > longestCriticalPath.length) {
      longestCriticalPath = path;
    }
  }

  // If specific task requested
  if (specificTask) {
    const task = taskMap.get(specificTask);
    if (!task) {
      exitWithError(`Task ${specificTask} not found.`);
    }

    const deps = task.dependencies || [];
    const dependents = task.dependents || [];

    const depDetails = deps.map(depId => {
      const depTask = taskMap.get(depId);
      return {
        id: depId,
        status: depTask ? depTask.status : 'unknown',
        description: depTask ? depTask.description : 'Unknown task'
      };
    });

    const dependentDetails = dependents.map(depId => {
      const depTask = taskMap.get(depId);
      return {
        id: depId,
        status: depTask ? depTask.status : 'unknown',
        description: depTask ? depTask.description : 'Unknown task'
      };
    });

    const blockedBy = deps.filter(depId => {
      const depTask = taskMap.get(depId);
      return !depTask || (depTask.status !== 'completed' && depTask.status !== 'skipped');
    });

    if (format === 'json') {
      outputJSON({
        task: {
          id: task.id,
          description: task.description,
          status: task.status,
          phase: task.phase
        },
        dependencies: depDetails,
        dependents: dependentDetails,
        blockedBy,
        isReady: blockedBy.length === 0 && task.status === 'pending'
      });
      return;
    }

    // Text format for specific task
    console.log('');
    console.log(`Task: ${task.id} - ${task.description}`);
    console.log(`Status: ${task.status}`);
    console.log(`Phase: ${task.phase}`);
    console.log('');

    if (deps.length > 0) {
      console.log('Dependencies (tasks this depends on):');
      for (const dep of depDetails) {
        const statusIcon = dep.status === 'completed' ? '✓' :
          dep.status === 'skipped' ? '⊘' :
            dep.status === 'in_progress' ? '⏳' :
              dep.status === 'failed' ? '✗' : '◯';
        console.log(`  ${statusIcon} ${dep.id}: ${dep.description} [${dep.status}]`);
      }
    } else {
      console.log('Dependencies: None');
    }

    console.log('');

    if (dependents.length > 0) {
      console.log('Dependents (tasks waiting on this):');
      for (const dep of dependentDetails) {
        const statusIcon = dep.status === 'completed' ? '✓' :
          dep.status === 'skipped' ? '⊘' :
            dep.status === 'in_progress' ? '⏳' :
              dep.status === 'failed' ? '✗' : '◯';
        console.log(`  ${statusIcon} ${dep.id}: ${dep.description} [${dep.status}]`);
      }
    } else {
      console.log('Dependents: None');
    }

    console.log('');

    if (blockedBy.length > 0) {
      console.log(`Blocked by: ${blockedBy.join(', ')}`);
    } else if (task.status === 'pending') {
      console.log('✓ Ready to execute (all dependencies satisfied)');
    }

    return;
  }

  // Show graph if requested
  if (showGraph) {
    if (format === 'json') {
      // For JSON format with --graph, include the graph as a string array
      const graphLines = generateAsciiGraph(status.tasks, taskMap);
      outputJSON({
        summary: {
          totalTasks: status.tasks.length,
          tasksWithDeps: tasksWithDeps.length,
          totalDependencies: dependencyCount.total,
          satisfied: dependencyCount.satisfied,
          unsatisfied: dependencyCount.unsatisfied
        },
        criticalPath: longestCriticalPath,
        criticalPathLength: longestCriticalPath.length,
        graph: graphLines
      });
      return;
    }

    // Text format with graph
    console.log('');
    console.log('Dependency Graph:');
    console.log('');

    const graphLines = generateAsciiGraph(status.tasks, taskMap);
    for (const line of graphLines) {
      console.log(line);
    }

    console.log('');
    console.log(`Critical Path (${longestCriticalPath.length} tasks): ${longestCriticalPath.join(' → ')}`);

    return;
  }

  // Default: summary view
  if (format === 'json') {
    // Group by phase
    const phaseMap = new Map();
    for (const task of status.tasks) {
      const phaseName = task.phase || 'Unknown Phase';
      if (!phaseMap.has(phaseName)) {
        phaseMap.set(phaseName, { tasks: [], depsCount: 0, blockedCount: 0 });
      }
      const phase = phaseMap.get(phaseName);
      phase.tasks.push({
        id: task.id,
        description: task.description,
        status: task.status,
        dependencies: task.dependencies || [],
        dependents: task.dependents || []
      });
      phase.depsCount += (task.dependencies || []).length;
      const blockedBy = (task.dependencies || []).filter(depId => {
        const depTask = taskMap.get(depId);
        return !depTask || (depTask.status !== 'completed' && depTask.status !== 'skipped');
      });
      if (blockedBy.length > 0 && task.status === 'pending') {
        phase.blockedCount++;
      }
    }

    outputJSON({
      summary: {
        totalTasks: status.tasks.length,
        tasksWithDeps: tasksWithDeps.length,
        totalDependencies: dependencyCount.total,
        satisfied: dependencyCount.satisfied,
        unsatisfied: dependencyCount.unsatisfied
      },
      criticalPath: longestCriticalPath,
      criticalPathLength: longestCriticalPath.length,
      phases: Array.from(phaseMap.entries()).map(([name, data]) => ({
        name,
        taskCount: data.tasks.length,
        dependencyCount: data.depsCount,
        blockedCount: data.blockedCount,
        tasks: data.tasks
      }))
    });
    return;
  }

  // Text format summary
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════════════════╗');
  console.log('║                      DEPENDENCY SUMMARY                               ║');
  console.log('╠═══════════════════════════════════════════════════════════════════════╣');
  console.log(`║  Total Tasks: ${String(status.tasks.length).padEnd(56)}║`);
  console.log(`║  Tasks with Dependencies: ${String(tasksWithDeps.length).padEnd(44)}║`);
  console.log(`║  Total Dependencies: ${String(dependencyCount.total).padEnd(49)}║`);
  console.log(`║    ✓ Satisfied: ${String(dependencyCount.satisfied).padEnd(53)}║`);
  console.log(`║    ◯ Unsatisfied: ${String(dependencyCount.unsatisfied).padEnd(51)}║`);
  console.log('╠═══════════════════════════════════════════════════════════════════════╣');
  console.log(`║  Critical Path Length: ${String(longestCriticalPath.length).padEnd(47)}║`);

  // Show critical path
  if (longestCriticalPath.length > 0) {
    const pathStr = longestCriticalPath.join(' → ');
    if (pathStr.length <= 50) {
      console.log(`║  Path: ${pathStr.padEnd(62)}║`);
    } else {
      // Split across multiple lines
      console.log('║  Path:'.padEnd(74) + '║');
      let remaining = pathStr;
      while (remaining.length > 0) {
        const chunk = remaining.slice(0, 60);
        remaining = remaining.slice(60);
        console.log(`║    ${chunk.padEnd(66)}║`);
      }
    }
  }

  console.log('╠═══════════════════════════════════════════════════════════════════════╣');
  console.log('║  Blocked Tasks:'.padEnd(74) + '║');

  // Show blocked tasks
  const blockedTasks = status.tasks.filter(t => {
    if (t.status !== 'pending') return false;
    const deps = t.dependencies || [];
    return deps.some(depId => {
      const depTask = taskMap.get(depId);
      return !depTask || (depTask.status !== 'completed' && depTask.status !== 'skipped');
    });
  });

  if (blockedTasks.length === 0) {
    console.log('║    None - all pending tasks are ready'.padEnd(74) + '║');
  } else {
    for (const task of blockedTasks.slice(0, 5)) {
      const deps = task.dependencies || [];
      const blockedBy = deps.filter(depId => {
        const depTask = taskMap.get(depId);
        return !depTask || (depTask.status !== 'completed' && depTask.status !== 'skipped');
      });
      const taskLine = `    ${task.id}: blocked by ${blockedBy.join(', ')}`;
      console.log(`║  ${taskLine.padEnd(68)}║`);
    }
    if (blockedTasks.length > 5) {
      console.log(`║    ... and ${blockedTasks.length - 5} more`.padEnd(74) + '║');
    }
  }

  console.log('╚═══════════════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('Use --graph for ASCII visualization, --task <id> for task details');
}

/**
 * Generate ASCII dependency graph
 *
 * Task 6.2: Enhanced ASCII visualization with:
 * - Tasks shown as nodes with status icons
 * - Dependency arrows showing relationships
 * - Highlighting for ready tasks, completed tasks, and blocked tasks
 * - Visual distinction between task states
 *
 * @param {Array} tasks - Array of task objects from status.json
 * @param {Map} taskMap - Map of taskId -> task for quick lookup
 * @returns {string[]} Array of lines to print
 */
function generateAsciiGraph(tasks, taskMap) {
  const lines = [];

  // Determine task state: ready, blocked, or other
  function getTaskState(task) {
    if (task.status === 'completed') return 'completed';
    if (task.status === 'skipped') return 'skipped';
    if (task.status === 'in_progress') return 'in_progress';
    if (task.status === 'failed') return 'failed';

    // For pending tasks, check if blocked
    const deps = task.dependencies || [];
    if (deps.length === 0) return 'ready';

    const isBlocked = deps.some(depId => {
      const depTask = taskMap.get(depId);
      return !depTask || (depTask.status !== 'completed' && depTask.status !== 'skipped');
    });

    return isBlocked ? 'blocked' : 'ready';
  }

  // Status icons with visual emphasis
  function getStatusIcon(state) {
    switch (state) {
      case 'completed': return '✓';
      case 'skipped': return '⊘';
      case 'in_progress': return '⏳';
      case 'failed': return '✗';
      case 'ready': return '▶';  // Ready to execute
      case 'blocked': return '◯';  // Blocked/waiting
      default: return '◯';
    }
  }

  // Group tasks by phase
  const phaseMap = new Map();
  for (const task of tasks) {
    const phaseName = task.phase || 'Unknown Phase';
    const phaseMatch = phaseName.match(/Phase\s+(\d+)/);
    const phaseNum = phaseMatch ? parseInt(phaseMatch[1]) : 0;
    if (!phaseMap.has(phaseNum)) {
      phaseMap.set(phaseNum, { name: phaseName, tasks: [] });
    }
    phaseMap.get(phaseNum).tasks.push(task);
  }

  const phases = Array.from(phaseMap.entries()).sort((a, b) => a[0] - b[0]);

  // Calculate stats for header
  let totalReady = 0, totalBlocked = 0, totalCompleted = 0;
  for (const task of tasks) {
    const state = getTaskState(task);
    if (state === 'ready') totalReady++;
    else if (state === 'blocked') totalBlocked++;
    else if (state === 'completed') totalCompleted++;
  }

  // Header with stats
  lines.push('╔════════════════════════════════════════════════════════════════╗');
  lines.push('║                    DEPENDENCY GRAPH                            ║');
  lines.push('╠════════════════════════════════════════════════════════════════╣');
  lines.push(`║  ✓ Completed: ${String(totalCompleted).padEnd(5)} ▶ Ready: ${String(totalReady).padEnd(5)} ◯ Blocked: ${String(totalBlocked).padEnd(5)}     ║`);
  lines.push('╚════════════════════════════════════════════════════════════════╝');
  lines.push('');

  for (const [phaseNum, phase] of phases) {
    // Phase header
    lines.push(`┌─────────────────────────────────────────────────────────────────`);
    lines.push(`│ ${phase.name}`);
    lines.push(`├─────────────────────────────────────────────────────────────────`);

    for (const task of phase.tasks) {
      const state = getTaskState(task);
      const statusIcon = getStatusIcon(state);
      const deps = task.dependencies || [];
      const dependents = task.dependents || [];

      // Build task display line
      let taskLine = `│ ${statusIcon} ${task.id}`;

      // Add brief description (truncate if too long)
      const maxDescLen = 30;
      if (task.description) {
        const desc = task.description.length > maxDescLen
          ? task.description.slice(0, maxDescLen - 3) + '...'
          : task.description;
        taskLine += ` ${desc}`;
      }

      lines.push(taskLine);

      // Show dependency arrows on separate line if any
      if (deps.length > 0 || dependents.length > 0) {
        let arrowLine = '│     ';

        if (deps.length > 0) {
          // Show dependencies with status indicators
          const depStates = deps.map(depId => {
            const depTask = taskMap.get(depId);
            if (!depTask) return `${depId}?`;
            const depState = getTaskState(depTask);
            const icon = depState === 'completed' ? '✓' :
              depState === 'skipped' ? '⊘' : '◯';
            return `${icon}${depId}`;
          });
          arrowLine += `← [${depStates.join(', ')}]`;
        }

        if (dependents.length > 0) {
          if (deps.length > 0) arrowLine += '  ';
          arrowLine += `→ [${dependents.join(', ')}]`;
        }

        lines.push(arrowLine);
      }
    }

    lines.push('│');
  }

  lines.push('└─────────────────────────────────────────────────────────────────');

  // Legend
  lines.push('');
  lines.push('Legend:');
  lines.push('  ✓ completed   ▶ ready (can execute)   ◯ blocked (waiting)');
  lines.push('  ⏳ in_progress   ✗ failed   ⊘ skipped');
  lines.push('  ← dependencies (must complete first)');
  lines.push('  → dependents (waiting on this task)');

  return lines;
}

/**
 * estimate - Dependency-aware progress estimation (Task 7.4)
 *
 * Provides intelligent progress estimation based on:
 * - Critical path analysis (longest dependency chain)
 * - Parallel execution opportunities
 * - Blocked time vs working time metrics
 *
 * Options:
 *   --format=text (default): Human-readable output
 *   --format=json: Full structured JSON
 *
 * @param {string} planPath - Path to plan file
 * @param {Object} options - Command options
 */
function cmdEstimate(planPath, options = {}) {
  const status = loadStatus(planPath);
  if (!status) {
    exitWithError('No status.json found.');
  }

  const format = options.format || 'text';

  // Build task maps for analysis
  const taskMap = new Map();
  const tasksByPhase = new Map();

  for (const task of status.tasks) {
    taskMap.set(task.id, task);

    const phaseName = task.phase || 'Unknown Phase';
    const phaseMatch = phaseName.match(/Phase\s+(\d+)/);
    const phaseNum = phaseMatch ? parseInt(phaseMatch[1]) : 0;

    if (!tasksByPhase.has(phaseNum)) {
      tasksByPhase.set(phaseNum, { name: phaseName, tasks: [] });
    }
    tasksByPhase.get(phaseNum).tasks.push(task);
  }

  // Calculate various metrics
  const total = status.tasks.length;
  const completed = status.tasks.filter(t => t.status === 'completed' || t.status === 'skipped').length;
  const inProgress = status.tasks.filter(t => t.status === 'in_progress').length;
  const pending = status.tasks.filter(t => t.status === 'pending').length;
  const failed = status.tasks.filter(t => t.status === 'failed').length;

  // Find critical path (longest dependency chain of remaining tasks)
  function findLongestPathFrom(taskId, visited = new Set()) {
    if (visited.has(taskId)) return { path: [], remaining: 0 };
    visited.add(taskId);

    const task = taskMap.get(taskId);
    if (!task) return { path: [], remaining: 0 };

    // Skip completed/skipped tasks for remaining work calculation
    const isRemaining = task.status === 'pending' || task.status === 'in_progress';

    const dependents = task.dependents || [];
    if (dependents.length === 0) {
      return {
        path: [taskId],
        remaining: isRemaining ? 1 : 0
      };
    }

    let longestPath = [];
    let maxRemaining = 0;

    for (const depId of dependents) {
      const result = findLongestPathFrom(depId, new Set(visited));
      if (result.path.length > longestPath.length) {
        longestPath = result.path;
        maxRemaining = result.remaining;
      }
    }

    return {
      path: [taskId, ...longestPath],
      remaining: (isRemaining ? 1 : 0) + maxRemaining
    };
  }

  // Find root tasks (no dependencies) to start critical path analysis
  const rootTasks = status.tasks.filter(t =>
    !t.dependencies || t.dependencies.length === 0
  );

  let criticalPath = [];
  let criticalPathRemaining = 0;

  for (const root of rootTasks) {
    const result = findLongestPathFrom(root.id);
    if (result.path.length > criticalPath.length) {
      criticalPath = result.path;
      criticalPathRemaining = result.remaining;
    }
  }

  // Calculate blocked vs ready tasks
  let readyCount = 0;
  let blockedCount = 0;
  const blockedTasks = [];
  const readyTasks = [];

  for (const task of status.tasks) {
    if (task.status !== 'pending') continue;

    const deps = task.dependencies || [];
    if (deps.length === 0) {
      readyCount++;
      readyTasks.push(task.id);
      continue;
    }

    const hasUnmetDeps = deps.some(depId => {
      const depTask = taskMap.get(depId);
      return !depTask || (depTask.status !== 'completed' && depTask.status !== 'skipped');
    });

    if (hasUnmetDeps) {
      blockedCount++;
      blockedTasks.push(task.id);
    } else {
      readyCount++;
      readyTasks.push(task.id);
    }
  }

  // Calculate parallelism potential
  // This is the ratio of tasks that can run in parallel vs critical path length
  const parallelismRatio = criticalPathRemaining > 0
    ? (pending / criticalPathRemaining).toFixed(2)
    : pending > 0 ? 'Infinite' : 'N/A';

  // Calculate "speedup factor" - how much faster parallel execution could be
  const speedupFactor = pending > 0 && criticalPathRemaining > 0
    ? (pending / criticalPathRemaining).toFixed(1)
    : 'N/A';

  // Calculate time-based estimates (assuming 1 unit per task)
  const sequentialTime = pending; // If all tasks run sequentially
  const parallelTime = criticalPathRemaining; // Minimum time with perfect parallelism
  const currentBlockedRatio = pending > 0 ? ((blockedCount / pending) * 100).toFixed(1) : 0;

  // Build phase progress for visualization
  const phaseProgress = [];
  for (const [phaseNum, phase] of Array.from(tasksByPhase.entries()).sort((a, b) => a[0] - b[0])) {
    const phaseTotal = phase.tasks.length;
    const phaseCompleted = phase.tasks.filter(t =>
      t.status === 'completed' || t.status === 'skipped'
    ).length;
    const phaseBlocked = phase.tasks.filter(t => {
      if (t.status !== 'pending') return false;
      const deps = t.dependencies || [];
      return deps.some(depId => {
        const depTask = taskMap.get(depId);
        return !depTask || (depTask.status !== 'completed' && depTask.status !== 'skipped');
      });
    }).length;
    const phaseReady = phase.tasks.filter(t => {
      if (t.status !== 'pending') return false;
      const deps = t.dependencies || [];
      if (deps.length === 0) return true;
      return !deps.some(depId => {
        const depTask = taskMap.get(depId);
        return !depTask || (depTask.status !== 'completed' && depTask.status !== 'skipped');
      });
    }).length;

    phaseProgress.push({
      number: phaseNum,
      name: phase.name,
      total: phaseTotal,
      completed: phaseCompleted,
      ready: phaseReady,
      blocked: phaseBlocked,
      percentage: Math.round((phaseCompleted / phaseTotal) * 100)
    });
  }

  // JSON output
  if (format === 'json') {
    outputJSON({
      summary: {
        total,
        completed,
        inProgress,
        pending,
        failed,
        percentage: Math.round((completed / total) * 100)
      },
      criticalPath: {
        path: criticalPath,
        length: criticalPath.length,
        remainingTasks: criticalPathRemaining,
        description: 'Longest dependency chain determining minimum completion time'
      },
      parallelism: {
        readyTasks,
        readyCount,
        blockedTasks,
        blockedCount,
        speedupFactor,
        blockedRatio: parseFloat(currentBlockedRatio),
        description: 'Tasks that can run in parallel vs tasks waiting on dependencies'
      },
      timeEstimate: {
        sequentialTime,
        parallelTime,
        savedTime: sequentialTime - parallelTime,
        efficiencyGain: sequentialTime > 0 ? `${Math.round((1 - parallelTime / sequentialTime) * 100)}%` : '0%'
      },
      phases: phaseProgress
    });
    return;
  }

  // Text output
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════════════════╗');
  console.log('║               DEPENDENCY-AWARE PROGRESS ESTIMATION                    ║');
  console.log('╠═══════════════════════════════════════════════════════════════════════╣');

  // Overall progress
  const percentage = Math.round((completed / total) * 100);
  const barWidth = 40;
  const filledWidth = Math.round((percentage / 100) * barWidth);
  const progressBar = '█'.repeat(filledWidth) + '░'.repeat(barWidth - filledWidth);

  console.log(`║  Progress: [${progressBar}] ${String(percentage + '%').padEnd(4)} ║`);
  console.log(`║  Status: ${String(completed).padStart(3)}/${total} completed, ${String(inProgress).padStart(2)} in progress, ${String(pending).padStart(3)} pending`.padEnd(69) + '    ║');

  console.log('╠═══════════════════════════════════════════════════════════════════════╣');
  console.log('║  CRITICAL PATH ANALYSIS                                               ║');
  console.log('╟───────────────────────────────────────────────────────────────────────╢');
  console.log(`║  Critical Path Length: ${String(criticalPath.length).padEnd(47)}║`);
  console.log(`║  Remaining on Critical Path: ${String(criticalPathRemaining).padEnd(41)}║`);

  // Show critical path (abbreviated if long)
  if (criticalPath.length > 0) {
    const pathStr = criticalPath.join(' → ');
    if (pathStr.length <= 50) {
      console.log(`║  Path: ${pathStr.padEnd(62)}║`);
    } else {
      // Show first few and last few
      const maxShow = 4;
      if (criticalPath.length <= maxShow * 2) {
        console.log(`║  Path: ${pathStr.slice(0, 50).padEnd(62)}║`);
        if (pathStr.length > 50) {
          console.log(`║        ${pathStr.slice(50, 100).padEnd(62)}║`);
        }
      } else {
        const firstPart = criticalPath.slice(0, maxShow).join(' → ');
        const lastPart = criticalPath.slice(-maxShow).join(' → ');
        console.log(`║  Path: ${firstPart.padEnd(62)}║`);
        console.log(`║        ... (${criticalPath.length - maxShow * 2} more) ...`.padEnd(71) + '║');
        console.log(`║        ${lastPart.padEnd(62)}║`);
      }
    }
  }

  console.log('╠═══════════════════════════════════════════════════════════════════════╣');
  console.log('║  PARALLELISM ANALYSIS                                                 ║');
  console.log('╟───────────────────────────────────────────────────────────────────────╢');
  console.log(`║  Ready to Execute: ${String(readyCount).padEnd(51)}║`);
  console.log(`║  Blocked by Dependencies: ${String(blockedCount).padEnd(44)}║`);
  console.log(`║  Blocked Ratio: ${String(currentBlockedRatio + '%').padEnd(54)}║`);
  console.log(`║  Speedup Factor: ${String(speedupFactor + 'x').padEnd(53)}║`);
  console.log(`║    (Tasks can run ${speedupFactor}x faster with parallel execution)`.padEnd(71) + '║');

  console.log('╠═══════════════════════════════════════════════════════════════════════╣');
  console.log('║  TIME ESTIMATE (in task units)                                        ║');
  console.log('╟───────────────────────────────────────────────────────────────────────╢');
  console.log(`║  Sequential Time (one at a time): ${String(sequentialTime).padEnd(35)}║`);
  console.log(`║  Parallel Time (critical path): ${String(parallelTime).padEnd(37)}║`);
  const savedTime = sequentialTime - parallelTime;
  const efficiency = sequentialTime > 0 ? Math.round((1 - parallelTime / sequentialTime) * 100) : 0;
  console.log(`║  Time Saved by Parallelism: ${String(savedTime).padEnd(42)}║`);
  console.log(`║  Efficiency Gain: ${String(efficiency + '%').padEnd(52)}║`);

  // Phase-by-phase progress
  console.log('╠═══════════════════════════════════════════════════════════════════════╣');
  console.log('║  PHASE PROGRESS                                                       ║');
  console.log('╟───────────────────────────────────────────────────────────────────────╢');

  for (const phase of phaseProgress) {
    const phaseBarWidth = 20;
    const phaseFilledWidth = Math.round((phase.percentage / 100) * phaseBarWidth);
    const phaseBar = '█'.repeat(phaseFilledWidth) + '░'.repeat(phaseBarWidth - phaseFilledWidth);
    const phaseLine = `  Phase ${phase.number}: [${phaseBar}] ${String(phase.percentage + '%').padEnd(4)} (▶${phase.ready} ◯${phase.blocked})`;
    console.log(`║${phaseLine.padEnd(70)}║`);
  }

  console.log('╚═══════════════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('Legend: ▶ = ready to execute, ◯ = blocked by dependencies');
  console.log('');
}

/**
 * resources - Show resource management status (Phase 10)
 *
 * Tasks 10.1-10.5: Resource management commands
 *
 * Options:
 *   --format=text (default): Human-readable output
 *   --format=json: Full structured JSON
 */
function cmdResources(options) {
  const worktreeUtils = require('./lib/worktree-utils.js');

  const format = options.format || (options.json ? 'json' : 'text');

  const resourceConfig = worktreeUtils.getResourceConfig();
  const limitCheck = worktreeUtils.checkConcurrentLimit();
  const diskCheck = worktreeUtils.checkDiskSpace();
  const staleWorktrees = worktreeUtils.getStaleWorktrees();
  const abandonedWorktrees = worktreeUtils.getAbandonedWorktrees();

  if (format === 'json') {
    outputJSON({
      config: resourceConfig,
      limits: {
        concurrent: limitCheck,
        diskSpace: diskCheck
      },
      worktrees: {
        stale: staleWorktrees,
        abandoned: abandonedWorktrees
      }
    });
    return;
  }

  // Text format
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════════════════╗');
  console.log('║                       RESOURCE STATUS                                 ║');
  console.log('╠═══════════════════════════════════════════════════════════════════════╣');

  // Concurrent worktrees
  const limitStatus = limitCheck.withinLimit ? '✓' : '✗';
  console.log(`║  Concurrent Worktrees: ${limitCheck.currentCount}/${limitCheck.maxAllowed} ${limitStatus.padEnd(41)}║`);

  // Disk space
  const diskStatus = diskCheck.sufficient ? '✓' : '✗';
  const diskWarning = diskCheck.warning ? ' ⚠' : '';
  const diskMB = worktreeUtils.getDiskSpace();
  console.log(`║  Disk Space: ${diskMB.available}MB available (${diskMB.usedPercent}% used) ${diskStatus}${diskWarning}`.padEnd(74) + '║');

  // Stale worktrees
  console.log(`║  Stale Worktrees: ${staleWorktrees.length} (>${resourceConfig.worktrees.stale_days} days inactive)`.padEnd(74) + '║');

  // Abandoned worktrees
  console.log(`║  Abandoned Worktrees: ${abandonedWorktrees.length}`.padEnd(74) + '║');

  console.log('╠═══════════════════════════════════════════════════════════════════════╣');
  console.log('║  CONFIGURATION                                                        ║');
  console.log('╟───────────────────────────────────────────────────────────────────────╢');
  console.log(`║  Max Concurrent: ${resourceConfig.worktrees.max_concurrent}`.padEnd(74) + '║');
  console.log(`║  Stale Threshold: ${resourceConfig.worktrees.stale_days} days`.padEnd(74) + '║');
  console.log(`║  Min Disk Space: ${resourceConfig.resources.min_disk_space_mb}MB`.padEnd(74) + '║');
  console.log(`║  Warn Disk Space: ${resourceConfig.resources.warn_disk_space_mb}MB`.padEnd(74) + '║');
  console.log(`║  Auto Cleanup: ${resourceConfig.worktrees.auto_cleanup ? 'enabled' : 'disabled'}`.padEnd(74) + '║');
  console.log('╚═══════════════════════════════════════════════════════════════════════╝');

  // Show stale worktrees if any
  if (staleWorktrees.length > 0) {
    console.log('');
    console.log('Stale Worktrees:');
    for (const wt of staleWorktrees) {
      const lastActive = wt.lastActivity
        ? new Date(wt.lastActivity).toLocaleDateString()
        : 'unknown';
      console.log(`  ⚠ ${wt.planName} - ${wt.inactiveDays} days inactive (last: ${lastActive})`);
      console.log(`    ${wt.path}`);
    }
  }

  // Show abandoned worktrees if any
  if (abandonedWorktrees.length > 0) {
    console.log('');
    console.log('Abandoned Worktrees (can be cleaned):');
    for (const wt of abandonedWorktrees) {
      const progress = wt.planProgress
        ? `${wt.planProgress.completed}/${wt.planProgress.total} tasks`
        : 'no status';
      const uncommitted = wt.hasUncommittedChanges ? ' [uncommitted changes]' : '';
      console.log(`  ✗ ${wt.planName} - ${progress}${uncommitted}`);
    }
    console.log('');
    console.log('  Run: node scripts/status-cli.js cleanup-worktrees --dry-run');
  }

  // Warnings
  if (!limitCheck.withinLimit || !diskCheck.sufficient || diskCheck.warning) {
    console.log('');
    console.log('Warnings:');
    if (!limitCheck.withinLimit) {
      console.log(`  ✗ ${limitCheck.error}`);
    }
    if (!diskCheck.sufficient) {
      console.log(`  ✗ ${diskCheck.message}`);
    } else if (diskCheck.warning) {
      console.log(`  ⚠ ${diskCheck.message}`);
    }
  }

  console.log('');
}

/**
 * stale-worktrees - Show stale worktrees (Phase 10.3)
 *
 * Options:
 *   --days <N>  Override stale threshold (default from config)
 *   --format=json  Output as JSON
 */
function cmdStaleWorktrees(options) {
  const worktreeUtils = require('./lib/worktree-utils.js');

  const staleDays = options.days ? parseInt(options.days) : undefined;
  const format = options.format || (options.json ? 'json' : 'text');

  const staleWorktrees = worktreeUtils.getStaleWorktrees({ staleDays });

  if (format === 'json') {
    outputJSON({
      threshold: staleDays || worktreeUtils.loadGitWorkflowConfig().worktrees.stale_days,
      count: staleWorktrees.length,
      worktrees: staleWorktrees
    });
    return;
  }

  if (staleWorktrees.length === 0) {
    console.log('No stale worktrees found.');
    return;
  }

  console.log(`Found ${staleWorktrees.length} stale worktree(s):\n`);

  for (const wt of staleWorktrees) {
    const lastActive = wt.lastActivity
      ? new Date(wt.lastActivity).toLocaleString()
      : 'unknown';
    console.log(`⚠ ${wt.branch}`);
    console.log(`  Path: ${wt.path}`);
    console.log(`  Age: ${wt.ageDays} days`);
    console.log(`  Last activity: ${lastActive} (${wt.inactiveDays} days ago)`);
    console.log('');
  }
}

/**
 * cleanup-worktrees - Clean up abandoned worktrees (Phase 10.4)
 *
 * Options:
 *   --dry-run       Only show what would be cleaned (default)
 *   --execute       Actually perform cleanup
 *   --force         Force removal even with uncommitted changes
 *   --delete-branch Also delete the associated branch
 *   --format=json   Output as JSON
 */
function cmdCleanupWorktrees(options) {
  const worktreeUtils = require('./lib/worktree-utils.js');

  const dryRun = !options.execute;
  const force = !!options.force;
  const deleteBranch = !!options['delete-branch'];
  const format = options.format || (options.json ? 'json' : 'text');

  const result = worktreeUtils.cleanupAbandonedWorktrees({ dryRun, force, deleteBranch });

  if (format === 'json') {
    outputJSON(result);
    return;
  }

  if (result.cleaned.length === 0 && result.skipped.length === 0) {
    console.log('No abandoned worktrees to clean up.');
    return;
  }

  if (dryRun) {
    console.log('DRY RUN - No changes will be made.\n');
  }

  if (result.cleaned.length > 0) {
    const verb = dryRun ? 'Would remove' : 'Removed';
    console.log(`${verb} ${result.cleaned.length} worktree(s):\n`);

    for (const wt of result.cleaned) {
      console.log(`  ✓ ${wt.planName}`);
      console.log(`    ${wt.path}`);
    }
    console.log('');
  }

  if (result.skipped.length > 0) {
    console.log(`Skipped ${result.skipped.length} worktree(s):\n`);

    for (const item of result.skipped) {
      console.log(`  ⊘ ${item.path}`);
      console.log(`    ${item.reason}`);
    }
    console.log('');
  }

  if (result.errors.length > 0) {
    console.log(`Errors (${result.errors.length}):\n`);

    for (const err of result.errors) {
      console.log(`  ✗ ${err.path}`);
      console.log(`    ${err.error}`);
    }
    console.log('');
  }

  if (dryRun && result.cleaned.length > 0) {
    console.log('To actually clean up, run with --execute:');
    console.log('  node scripts/status-cli.js cleanup-worktrees --execute');
    if (!force) {
      console.log('  Add --force to also remove worktrees with uncommitted changes');
    }
  }
}

/**
 * check-limits - Check if resource limits allow creating a new worktree (Phase 10.6)
 *
 * Options:
 *   --format=json    Output as JSON
 *   --wait           Wait for resources to become available
 *   --timeout <ms>   Wait timeout in milliseconds (default: 300000)
 *   --auto-cleanup   Automatically cleanup abandoned worktrees if resources exhausted
 *   --report         Show detailed exhaustion report if resources unavailable
 */
async function cmdCheckLimits(options) {
  const worktreeUtils = require('./lib/worktree-utils.js');

  const format = options.format || (options.json ? 'json' : 'text');
  const wait = options.wait || false;
  const autoCleanup = options['auto-cleanup'] || false;
  const showReport = options.report || false;
  const timeoutMs = options.timeout ? parseInt(options.timeout) : 300000;

  // Use enhanced graceful check
  const result = worktreeUtils.checkResourcesGracefully({ includeReport: showReport });

  // Handle wait mode
  if (wait && !result.canCreate) {
    if (format !== 'json') {
      console.log('Resources exhausted. Waiting for availability...\n');
    }

    const waitResult = await worktreeUtils.waitForResources({
      timeoutMs,
      pollIntervalMs: 10000,
      autoCleanup,
      onProgress: format !== 'json' ? (progress) => {
        console.log(`  ${progress.message}`);
      } : null
    });

    if (format === 'json') {
      outputJSON({
        ...result,
        waited: true,
        waitResult
      });
      return;
    }

    console.log('');
    if (waitResult.success) {
      console.log(`✓ Resources available after ${Math.round(waitResult.waitedMs / 1000)}s`);
      if (waitResult.autoCleanedCount > 0) {
        console.log(`  Auto-cleaned ${waitResult.autoCleanedCount} abandoned worktree(s)`);
      }
    } else {
      console.log(`✗ ${waitResult.error}`);
    }
    return;
  }

  // Standard output
  if (format === 'json') {
    outputJSON(result);
    return;
  }

  // Text format - show report if resources exhausted and report requested
  if (!result.canCreate && showReport && result.report) {
    console.log(result.report);
    return;
  }

  console.log('Resource Limits Check:\n');

  // Concurrent limit
  const concurrentStatus = result.checks.concurrentLimit.passed ? '✓' : '✗';
  console.log(`${concurrentStatus} Concurrent Worktrees: ${result.checks.concurrentLimit.current}/${result.checks.concurrentLimit.max}`);

  // Disk space
  const diskStatus = result.checks.diskSpace.passed ? '✓' : '✗';
  console.log(`${diskStatus} Disk Space: ${result.checks.diskSpace.availableMB}MB available (min: ${result.checks.diskSpace.requiredMB}MB)`);

  // Warnings
  if (result.checks.warnings.length > 0) {
    console.log('');
    console.log('Warnings:');
    for (const warning of result.checks.warnings) {
      console.log(`  ⚠ ${warning}`);
    }
  }

  console.log('');
  if (result.canCreate) {
    console.log('✓ Can create new worktree');
  } else {
    console.log(`✗ Cannot create new worktree: ${result.error}`);

    // Show recovery suggestions
    if (result.recoverySuggestions && result.recoverySuggestions.length > 0) {
      console.log('');
      console.log('Recovery Options:');
      result.recoverySuggestions.forEach((suggestion, i) => {
        console.log(`  ${i + 1}. ${suggestion}`);
      });
    }

    // Show auto-cleanup hint
    if (result.autoCleanupAvailable) {
      console.log('');
      console.log(`Tip: ${result.abandonedCount} abandoned worktree(s) can be auto-cleaned.`);
      console.log('  Run: node scripts/status-cli.js check-limits --auto-cleanup');
    }
  }
}

/**
 * Show help message
 */
function showHelp() {
  console.log(`
Status Manager CLI - Manage plan execution status

Usage:
  node scripts/status-cli.js [--plan <path>] <command> [options]

Global Options:
  --plan <path>                     Use specific plan file instead of current-plan.txt
                                    Supports both --plan <path> and --plan=<path>

Commands:
  init [--validate-deps]              Initialize output directory and status.json
                                      --validate-deps: Check dependencies for cycles/invalid refs
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
  next [count] [--ignore-deps]        Get next N recommended tasks (DAG-aware, JSON)
  phases                              List all phases with completion status (JSON)
  check <task-id>                     Check if a specific task can be started (JSON)
  progress [--format=<fmt>] [--watch]  Show progress (text|json|markers), --watch polls
  progress --all-plans [--format=<fmt>] [--json]  Aggregate status across all plans/worktrees
  all-plans [--format=<fmt>] [--json]  Same as progress --all-plans (--json for programmatic access)
  validate                            Validate and repair status.json
  sync-check                          Compare markdown vs status.json (read-only)
  retryable                           Get failed tasks that can be retried
  exhausted                           Get failed tasks with no retries left
  increment-retry <task-id>           Increment retry count for a task
  detect-stuck                        Detect and mark stuck tasks as failed
  worktree-context                    Check worktree context detection (JSON)
  deps [--graph] [--task <id>]        Show dependency graph/summary
  estimate [--format=<fmt>]           Dependency-aware progress estimation (critical path, parallelism)
  conflicts [--format=<fmt>]          Show conflict detection report (text|json)
  merge-order [--format=<fmt>] [--json]  Show recommended merge order (text|json)
  rebase-check [--format=<fmt>] [--json]  Check if worktrees need to rebase on main
  worktree-conflict [path] [--abort]  Analyze/resolve worktree merge conflicts
  resources [--format=<fmt>] [--json]  Show resource management status
  stale-worktrees [--days N] [--json]  Show stale worktrees
  cleanup-worktrees [--execute] [--force]  Clean up abandoned worktrees
  check-limits [options]                Check if resource limits allow new worktree
    --format=<fmt>                        Output format (text, json)
    --wait                                Wait for resources to become available
    --timeout <ms>                        Wait timeout in ms (default: 300000)
    --auto-cleanup                        Auto-cleanup abandoned worktrees
    --report                              Show detailed exhaustion report

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
  # Check current status (uses current-plan.txt)
  node scripts/status-cli.js status

  # Check status for a specific plan
  node scripts/status-cli.js --plan docs/plans/my-plan.md status

  # Mark a task complete with notes
  node scripts/status-cli.js mark-complete 1.1 --notes "Implemented auth middleware"

  # Get next 3 tasks from a specific plan
  node scripts/status-cli.js --plan docs/plans/my-plan.md next 3

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

  const parsed = parseArgs(remainingArgs);
  const { command, positional, options } = parsed;

  // Commands that don't require a plan path
  const noPlanCommands = ['all-plans', 'worktree-context', 'conflicts', 'merge-order', 'rebase-check', 'worktree-conflict', 'resources', 'stale-worktrees', 'cleanup-worktrees', 'check-limits'];
  const isAllPlansProgress = command === 'progress' && options['all-plans'];

  // Check for plan resolution errors (skip for commands that don't need a plan)
  if (error && !noPlanCommands.includes(command) && !isAllPlansProgress) {
    exitWithError(error);
  }

  // Dispatch to command handler
  switch (command) {
    case 'init':
      cmdInit(planPath, options);
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
      cmdNext(planPath, positional[0], options);
      break;

    case 'phases':
      cmdPhases(planPath);
      break;

    case 'check':
      cmdCheck(planPath, positional[0]);
      break;

    case 'progress':
      // Task 6.1: Handle --all-plans flag
      if (options['all-plans']) {
        cmdAllPlans(options);
      } else {
        cmdProgress(planPath, options);
      }
      break;

    case 'all-plans':
      // Alias for progress --all-plans
      cmdAllPlans(options);
      break;

    case 'validate':
      cmdValidate(planPath);
      break;

    case 'deps':
      cmdDeps(planPath, options);
      break;

    case 'estimate':
      cmdEstimate(planPath, options);
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

    case 'worktree-context':
      cmdWorktreeContext();
      break;

    case 'conflicts':
      cmdConflicts(options);
      break;

    case 'merge-order':
      cmdMergeOrder(options);
      break;

    case 'rebase-check':
      cmdRebaseCheck(options);
      break;

    case 'worktree-conflict':
      cmdWorktreeConflict(positional[0], options);
      break;

    // Phase 10: Resource Management
    case 'resources':
      cmdResources(options);
      break;

    case 'stale-worktrees':
      cmdStaleWorktrees(options);
      break;

    case 'cleanup-worktrees':
      cmdCleanupWorktrees(options);
      break;

    case 'check-limits':
      // Async function - wait for completion
      cmdCheckLimits(options).catch(err => {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      });
      break;

    default:
      exitWithError(`Unknown command: ${command}. Use --help for usage.`);
  }
}

main();
