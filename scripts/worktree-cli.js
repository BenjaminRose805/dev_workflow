#!/usr/bin/env node
/**
 * Worktree CLI
 *
 * Command-line interface for managing git worktrees for parallel plan execution.
 * This script is invoked by the /plan:worktree skill command.
 *
 * Usage:
 *   node scripts/worktree-cli.js <command> [options]
 *
 * Commands:
 *   create <plan-name>    Create worktree for a plan
 *   list                  List active worktrees with plan status
 *   remove <plan-name>    Remove worktree after merge
 *   context               Show current worktree context
 *
 * Options:
 *   --attach              Attach to existing branch instead of creating new
 *   --force               Force creation/removal even if issues exist
 *   --no-init             Skip status.json initialization
 *   --json                Output in JSON format
 */

const {
  // Configuration
  WORKTREE_CONTEXT_DIR,
  DEFAULT_WORKTREE_DIR,

  // Git utilities
  checkGitWorktreeSupport,
  isGitRepository,
  getRepoRoot,
  listWorktrees,
  getCurrentBranch,

  // Worktree operations
  createWorktreeWithContext,
  removeWorktree,
  pruneWorktrees,
  detectWorktreeContext
} = require('./lib/worktree-utils');

const fs = require('fs');
const path = require('path');

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
    options: {
      attach: false,
      autoAttach: false,
      force: false,
      noInit: false,
      json: false
    }
  };

  let i = 1;
  while (i < args.length) {
    const arg = args[i];
    if (arg === '--attach') {
      result.options.attach = true;
    } else if (arg === '--auto-attach') {
      result.options.autoAttach = true;
    } else if (arg === '--force') {
      result.options.force = true;
    } else if (arg === '--no-init') {
      result.options.noInit = true;
    } else if (arg === '--json') {
      result.options.json = true;
    } else if (arg.startsWith('--')) {
      // Handle --key=value syntax
      if (arg.includes('=')) {
        const [key, value] = arg.slice(2).split('=', 2);
        result.options[key.replace(/-/g, '')] = value;
      } else {
        result.options[arg.slice(2).replace(/-/g, '')] = true;
      }
    } else {
      result.positional.push(arg);
    }
    i += 1;
  }

  return result;
}

// =============================================================================
// Command Implementations
// =============================================================================

/**
 * create <plan-name> - Create a worktree for a plan
 */
function cmdCreate(planName, options) {
  if (!planName) {
    exitWithError('Plan name is required. Usage: create <plan-name>');
  }

  const result = createWorktreeWithContext(planName, {
    attach: options.attach,
    autoAttach: options.autoAttach,
    force: options.force,
    noInit: options.noInit
  });

  if (options.json) {
    outputJSON(result);
    return;
  }

  if (!result.success) {
    // Show error with hint if available
    console.error(`Error: ${result.error}`);
    if (result.hint) {
      console.error('');
      console.error('Hint:');
      for (const line of result.hint.split('\n')) {
        console.error(`  ${line}`);
      }
    }
    process.exit(1);
  }

  console.log('');
  console.log('Worktree Created Successfully');
  console.log('─────────────────────────────');
  console.log('');
  console.log(`Plan:       ${planName}`);
  console.log(`Worktree:   ${result.worktreePath}`);
  console.log(`Branch:     ${result.branchName}`);
  console.log(`Context:    ${result.contextDir}`);
  console.log(`Plan File:  ${result.planPath}`);

  // Show branch status (Task 2.6)
  if (result.branchExisted) {
    if (result.branchAttached) {
      console.log(`Mode:       Attached to existing branch`);
    }
  } else if (result.branchCreated) {
    console.log(`Mode:       New branch created`);
  }

  if (result.statusPath) {
    console.log(`Status:     ${result.statusPath}`);
  }

  if (result.copiedFiles.length > 0) {
    console.log(`Config:     ${result.copiedFiles.join(', ')}`);
  }

  // Show validation results (Task 2.7)
  if (result.validation) {
    const v = result.validation;
    if (v.valid) {
      console.log(`Validated:  ✓ All checks passed`);
    } else {
      console.log(`Validated:  ⚠ Some checks failed`);
    }
  }

  if (result.warnings.length > 0) {
    console.log('');
    console.log('Warnings:');
    for (const warning of result.warnings) {
      console.log(`  ⚠ ${warning}`);
    }
  }

  console.log('');
  console.log('To work in this worktree:');
  console.log(`  cd ${result.worktreePath}`);
  console.log('');
  console.log('To run orchestrator in this worktree:');
  console.log(`  python scripts/plan_orchestrator.py --worktree ${result.worktreePath}`);
}

/**
 * list - List all active worktrees with plan status
 */
function cmdList(options) {
  const repoRoot = getRepoRoot();
  if (!repoRoot) {
    exitWithError('Not in a git repository');
  }

  const worktrees = listWorktrees();

  // Filter to plan worktrees (in worktrees/ directory or on plan/ branches)
  const planWorktrees = worktrees.filter(wt => {
    const isInWorktreesDir = wt.path.includes('/worktrees/plan-');
    const isOnPlanBranch = wt.branch && wt.branch.startsWith('plan/');
    return isInWorktreesDir || isOnPlanBranch;
  });

  // Gather status information for each worktree
  const results = planWorktrees.map(wt => {
    const planName = wt.branch ? wt.branch.replace('plan/', '') : path.basename(wt.path).replace('plan-', '');
    const statusFile = path.join(wt.path, 'docs', 'plan-outputs', planName, 'status.json');
    const contextFile = path.join(wt.path, WORKTREE_CONTEXT_DIR, 'current-plan.txt');

    let progress = { completed: 0, total: 0, percentage: 0 };
    let hasStatus = false;
    let hasContext = false;

    // Check for status.json
    if (fs.existsSync(statusFile)) {
      try {
        const status = JSON.parse(fs.readFileSync(statusFile, 'utf8'));
        const summary = status.summary || {};
        progress.completed = summary.completed || 0;
        progress.total = summary.totalTasks || 0;
        progress.percentage = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;
        hasStatus = true;
      } catch (error) {
        // Ignore parse errors
      }
    }

    // Check for context file
    if (fs.existsSync(contextFile)) {
      hasContext = true;
    }

    return {
      name: planName,
      branch: wt.branch || '(detached)',
      path: wt.path,
      head: wt.head.slice(0, 7),
      progress,
      hasStatus,
      hasContext
    };
  });

  if (options.json) {
    outputJSON({
      worktrees: results,
      count: results.length
    });
    return;
  }

  if (results.length === 0) {
    console.log('No active plan worktrees found.');
    console.log('');
    console.log('To create a worktree:');
    console.log('  /plan:worktree create <plan-name>');
    return;
  }

  console.log('');
  console.log('Active Plan Worktrees');
  console.log('─────────────────────────────────────────────────────────────────────');
  console.log('');

  // Table header
  const nameWidth = Math.max(20, ...results.map(r => r.name.length));
  const branchWidth = Math.max(25, ...results.map(r => r.branch.length));

  console.log(`${'Plan Name'.padEnd(nameWidth)}  ${'Branch'.padEnd(branchWidth)}  Progress    Head`);
  console.log('─'.repeat(nameWidth + branchWidth + 30));

  for (const wt of results) {
    const progressStr = wt.hasStatus
      ? `${wt.progress.completed}/${wt.progress.total}`.padEnd(10)
      : 'no status'.padEnd(10);

    const branchDisplay = wt.branch.length > branchWidth
      ? wt.branch.slice(0, branchWidth - 3) + '...'
      : wt.branch.padEnd(branchWidth);

    console.log(`${wt.name.padEnd(nameWidth)}  ${branchDisplay}  ${progressStr}  ${wt.head}`);
  }

  console.log('');
  console.log('Paths:');
  for (const wt of results) {
    console.log(`  ${wt.name}: ${wt.path}`);
  }

  console.log('');
  console.log(`Total: ${results.length} active plan worktree(s)`);
}

/**
 * remove <plan-name> - Remove a worktree
 */
function cmdRemove(planName, options) {
  if (!planName) {
    exitWithError('Plan name is required. Usage: remove <plan-name>');
  }

  const result = removeWorktree(planName, { force: options.force });

  if (options.json) {
    outputJSON({
      success: result.success,
      planName,
      error: result.error
    });
    return;
  }

  if (!result.success) {
    exitWithError(result.error);
  }

  // Prune stale worktree references
  pruneWorktrees();

  console.log('');
  console.log('Worktree Removed');
  console.log('────────────────');
  console.log('');
  console.log(`Plan:       ${planName}`);
  console.log(`Status:     Removed successfully`);
  console.log('');

  // List remaining worktrees
  console.log('Remaining worktrees:');
  const remaining = listWorktrees().filter(wt =>
    wt.path.includes('/worktrees/plan-') || (wt.branch && wt.branch.startsWith('plan/'))
  );

  if (remaining.length === 0) {
    console.log('  (none)');
  } else {
    for (const wt of remaining) {
      const name = wt.branch ? wt.branch.replace('plan/', '') : path.basename(wt.path).replace('plan-', '');
      console.log(`  ${name}: ${wt.path}`);
    }
  }
}

/**
 * context - Show current worktree context
 */
function cmdContext(options) {
  const context = detectWorktreeContext();
  const currentBranch = getCurrentBranch();

  if (options.json) {
    outputJSON({
      ...context,
      currentBranch
    });
    return;
  }

  console.log('');
  console.log('Worktree Context');
  console.log('────────────────');
  console.log('');

  if (context.inWorktree) {
    console.log(`In Worktree:  Yes`);
    console.log(`Worktree:     ${context.worktreePath}`);
    console.log(`Plan:         ${context.planPath || '(not set)'}`);
  } else {
    console.log(`In Worktree:  No`);
    console.log(`Location:     Main repository`);
  }

  console.log(`Branch:       ${currentBranch || '(detached HEAD)'}`);
}

/**
 * Show help message
 */
function showHelp() {
  console.log(`
Worktree CLI - Manage git worktrees for parallel plan execution

Usage:
  node scripts/worktree-cli.js <command> [options]

Commands:
  create <plan-name>    Create worktree for a plan
  list                  List active worktrees with plan status
  remove <plan-name>    Remove worktree after merge
  context               Show current worktree context

Options:
  --attach              Attach to existing branch instead of creating new
  --auto-attach         Same as --attach, for scripting (no confirmation)
  --force               Force creation/removal even if issues exist
  --no-init             Skip status.json initialization
  --json                Output in JSON format

Examples:
  # Create a worktree for a new plan
  node scripts/worktree-cli.js create my-feature

  # Create worktree and attach to existing branch (continue previous work)
  node scripts/worktree-cli.js create my-feature --attach

  # Auto-attach if branch exists (for scripting)
  node scripts/worktree-cli.js create my-feature --auto-attach

  # List all plan worktrees
  node scripts/worktree-cli.js list

  # List in JSON format
  node scripts/worktree-cli.js list --json

  # Remove a worktree
  node scripts/worktree-cli.js remove my-feature

  # Force remove (even with uncommitted changes)
  node scripts/worktree-cli.js remove my-feature --force

  # Check current worktree context
  node scripts/worktree-cli.js context

Branch Handling:
  When creating a worktree, if the branch already exists:
  - Without --attach: Error with hint showing options
  - With --attach: Attach worktree to existing branch
  - If branch is in another worktree: Error with worktree path
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

  // Check git prerequisites
  const gitCheck = checkGitWorktreeSupport();
  if (!gitCheck.supported) {
    exitWithError(gitCheck.error);
  }

  if (!isGitRepository()) {
    exitWithError('Not in a git repository');
  }

  const { command, positional, options } = parseArgs(args);

  switch (command) {
    case 'create':
      cmdCreate(positional[0], options);
      break;

    case 'list':
      cmdList(options);
      break;

    case 'remove':
      cmdRemove(positional[0], options);
      break;

    case 'context':
      cmdContext(options);
      break;

    default:
      exitWithError(`Unknown command: ${command}. Use --help for usage.`);
  }
}

main();
