/**
 * @module worktree-utils
 * @description Utilities for managing git worktrees for parallel plan execution.
 *
 * This module provides functions for:
 * - Creating worktrees with proper directory structure
 * - Initializing worktree context (.claude-context/)
 * - Copying config files to worktree
 * - Setting the current plan pointer
 * - Initializing status.json for the plan
 * - Detecting worktree context in status-cli.js
 *
 * ## Worktree Directory Structure
 *
 * ```
 * repo/
 * ├── .git/                              # Shared git data
 * ├── .claude/                           # Main repo config
 * │   ├── current-plan.txt               # Active plan for main worktree
 * │   └── git-workflow.json              # Git workflow config
 * └── worktrees/
 *     └── plan-{name}/                   # Worktree for plan
 *         ├── .claude-context/           # Worktree-specific context
 *         │   ├── current-plan.txt       # This worktree's active plan
 *         │   └── git-workflow.json      # Config copy
 *         └── ... (git worktree files)
 * ```
 *
 * ## Context Resolution Priority
 *
 * 1. CLAUDE_WORKTREE environment variable
 * 2. .claude-context/current-plan.txt (worktree-specific)
 * 3. .claude/current-plan.txt (main repo fallback)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// =============================================================================
// Configuration
// =============================================================================

// Worktree context directory name (alternative to .claude/ in worktrees)
const WORKTREE_CONTEXT_DIR = '.claude-context';

// Main repo config directory
const MAIN_CONFIG_DIR = '.claude';

// Current plan pointer file name
const CURRENT_PLAN_FILE = 'current-plan.txt';

// Git workflow config file name
const GIT_WORKFLOW_FILE = 'git-workflow.json';

// Default worktree directory (relative to repo root)
const DEFAULT_WORKTREE_DIR = 'worktrees';

// Minimum required git version for worktree support
const MIN_GIT_VERSION = { major: 2, minor: 5 };

// =============================================================================
// Git Utilities
// =============================================================================

/**
 * Check if git is available
 * @returns {boolean}
 */
function isGitAvailable() {
  try {
    execSync('git --version', { stdio: 'pipe' });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get git version as { major, minor }
 * @returns {{ major: number, minor: number } | null}
 */
function getGitVersion() {
  try {
    const output = execSync('git --version', { encoding: 'utf8', stdio: 'pipe' });
    const match = output.match(/(\d+)\.(\d+)/);
    if (match) {
      return {
        major: parseInt(match[1]),
        minor: parseInt(match[2])
      };
    }
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Check if git version supports worktrees (>= 2.5)
 * @returns {{ supported: boolean, version: string | null, error: string | null }}
 */
function checkGitWorktreeSupport() {
  const version = getGitVersion();
  if (!version) {
    return {
      supported: false,
      version: null,
      error: 'Could not determine git version'
    };
  }

  const versionStr = `${version.major}.${version.minor}`;
  const supported = version.major > MIN_GIT_VERSION.major ||
    (version.major === MIN_GIT_VERSION.major && version.minor >= MIN_GIT_VERSION.minor);

  if (!supported) {
    return {
      supported: false,
      version: versionStr,
      error: `Git version ${MIN_GIT_VERSION.major}.${MIN_GIT_VERSION.minor}+ required for worktree support. Current: ${versionStr}`
    };
  }

  return { supported: true, version: versionStr, error: null };
}

/**
 * Check if current directory is inside a git repository
 * @returns {boolean}
 */
function isGitRepository() {
  try {
    execSync('git rev-parse --git-dir', { stdio: 'pipe' });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get the repository root directory
 * @returns {string | null}
 */
function getRepoRoot() {
  try {
    const output = execSync('git rev-parse --show-toplevel', { encoding: 'utf8', stdio: 'pipe' });
    return output.trim();
  } catch (error) {
    return null;
  }
}

/**
 * Check if a git branch exists
 * @param {string} branchName - Branch name to check
 * @returns {boolean}
 */
function branchExists(branchName) {
  try {
    execSync(`git rev-parse --verify "${branchName}"`, { stdio: 'pipe' });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Check if a branch is checked out in any worktree
 *
 * Task 2.6: Handle existing branch - detect if already attached
 *
 * @param {string} branchName - Branch name to check (e.g., 'plan/feature-auth')
 * @returns {{ checked_out: boolean, worktree_path: string | null }}
 */
function isBranchCheckedOutInWorktree(branchName) {
  const worktrees = listWorktrees();
  for (const wt of worktrees) {
    if (wt.branch === branchName) {
      return { checked_out: true, worktree_path: wt.path };
    }
  }
  return { checked_out: false, worktree_path: null };
}

/**
 * Get current git branch
 * @returns {string | null}
 */
function getCurrentBranch() {
  try {
    const output = execSync('git branch --show-current', { encoding: 'utf8', stdio: 'pipe' });
    return output.trim() || null;
  } catch (error) {
    return null;
  }
}

/**
 * List all git worktrees
 * @returns {Array<{ path: string, head: string, branch: string | null }>}
 */
function listWorktrees() {
  try {
    const output = execSync('git worktree list --porcelain', { encoding: 'utf8', stdio: 'pipe' });
    const worktrees = [];
    let current = {};

    for (const line of output.split('\n')) {
      if (line.startsWith('worktree ')) {
        current = { path: line.slice(9), head: '', branch: null };
      } else if (line.startsWith('HEAD ')) {
        current.head = line.slice(5);
      } else if (line.startsWith('branch ')) {
        current.branch = line.slice(7).replace('refs/heads/', '');
      } else if (line === '') {
        if (current.path) {
          worktrees.push(current);
        }
        current = {};
      }
    }

    // Handle last entry if no trailing newline
    if (current.path) {
      worktrees.push(current);
    }

    return worktrees;
  } catch (error) {
    return [];
  }
}

/**
 * Check if a worktree exists for the given path
 * @param {string} worktreePath - Absolute path to worktree
 * @returns {boolean}
 */
function worktreeExists(worktreePath) {
  const worktrees = listWorktrees();
  return worktrees.some(wt => wt.path === worktreePath);
}

// =============================================================================
// Worktree Creation
// =============================================================================

/**
 * Create a git worktree for a plan
 *
 * Task 2.1: Create worktree directory: `git worktree add worktrees/plan-{name} -b plan/{name}`
 * Task 2.6: Handle existing branch (attach to existing vs error)
 *
 * @param {string} planName - Name of the plan (e.g., 'feature-auth')
 * @param {object} options - Options
 * @param {boolean} options.attach - Attach to existing branch instead of creating new
 * @param {boolean} options.autoAttach - Automatically attach if branch exists (no error)
 * @param {boolean} options.force - Force creation even if issues exist
 * @param {string} options.directory - Custom worktree directory (default: 'worktrees')
 * @returns {{
 *   success: boolean,
 *   worktreePath: string | null,
 *   branchName: string | null,
 *   created: boolean,
 *   attached: boolean,
 *   branchExisted: boolean,
 *   error: string | null,
 *   hint: string | null
 * }}
 */
function createWorktree(planName, options = {}) {
  const { attach = false, autoAttach = false, force = false, directory = DEFAULT_WORKTREE_DIR } = options;

  // Base result object
  const baseResult = {
    success: false,
    worktreePath: null,
    branchName: null,
    created: false,
    attached: false,
    branchExisted: false,
    error: null,
    hint: null
  };

  // Validate prerequisites
  const gitCheck = checkGitWorktreeSupport();
  if (!gitCheck.supported) {
    return { ...baseResult, error: gitCheck.error };
  }

  if (!isGitRepository()) {
    return { ...baseResult, error: 'Not in a git repository' };
  }

  const repoRoot = getRepoRoot();
  if (!repoRoot) {
    return { ...baseResult, error: 'Could not determine repository root' };
  }

  // Validate plan name
  if (!planName || !/^[a-zA-Z0-9_-]+$/.test(planName)) {
    return {
      ...baseResult,
      error: 'Invalid plan name. Use only alphanumeric characters, hyphens, and underscores.'
    };
  }

  // Build paths
  const worktreePath = path.join(repoRoot, directory, `plan-${planName}`);
  const branchName = `plan/${planName}`;
  baseResult.worktreePath = worktreePath;
  baseResult.branchName = branchName;

  // Check if worktree already exists
  if (worktreeExists(worktreePath)) {
    return {
      ...baseResult,
      error: `Worktree already exists: ${worktreePath}`,
      hint: 'Use /plan:worktree remove to remove it first, or cd to it to continue work.'
    };
  }

  // Check if directory exists but is not a worktree
  if (fs.existsSync(worktreePath)) {
    if (!force) {
      return {
        ...baseResult,
        error: `Directory exists but is not a git worktree: ${worktreePath}`,
        hint: 'Use --force to remove and recreate, or remove the directory manually.'
      };
    }
    // Force: remove the directory
    try {
      fs.rmSync(worktreePath, { recursive: true, force: true });
    } catch (error) {
      return {
        ...baseResult,
        error: `Could not remove existing directory: ${error.message}`
      };
    }
  }

  // Ensure worktrees parent directory exists
  const worktreesParent = path.join(repoRoot, directory);
  try {
    fs.mkdirSync(worktreesParent, { recursive: true });
  } catch (error) {
    return {
      ...baseResult,
      error: `Could not create worktrees directory: ${error.message}`
    };
  }

  // Task 2.6: Check branch existence and handle appropriately
  const branchExistsAlready = branchExists(branchName);
  baseResult.branchExisted = branchExistsAlready;

  // Build git worktree add command
  let gitCommand;
  let willAttach = false;

  if (branchExistsAlready) {
    // Check if branch is already checked out in another worktree
    const checkedOut = isBranchCheckedOutInWorktree(branchName);
    if (checkedOut.checked_out) {
      return {
        ...baseResult,
        error: `Branch '${branchName}' is already checked out in another worktree`,
        hint: `Worktree at: ${checkedOut.worktree_path}\nTo continue work: cd ${checkedOut.worktree_path}\nTo remove first: /plan:worktree remove ${planName}`
      };
    }

    // Determine if we should attach
    if (attach || autoAttach) {
      // Attach to existing branch
      gitCommand = `git worktree add "${worktreePath}" "${branchName}"`;
      willAttach = true;
    } else {
      // Provide helpful error with options
      return {
        ...baseResult,
        error: `Branch already exists: ${branchName}`,
        hint: `Options:\n  --attach      Attach worktree to existing branch (continue previous work)\n  --auto-attach Same as --attach, for scripting\n  --force       Create new branch from current HEAD (loses existing branch)`
      };
    }
  } else {
    // Create new branch with worktree
    gitCommand = `git worktree add "${worktreePath}" -b "${branchName}"`;
  }

  // Execute git worktree add
  try {
    execSync(gitCommand, { stdio: 'pipe', cwd: repoRoot });
  } catch (error) {
    // Parse common error messages for better hints
    const errorMessage = error.message || error.toString();
    let hint = null;

    if (errorMessage.includes('already exists')) {
      hint = 'The branch or worktree may exist. Use --attach or remove the existing one.';
    } else if (errorMessage.includes('permission denied')) {
      hint = 'Check directory permissions for the worktrees directory.';
    } else if (errorMessage.includes('not a valid')) {
      hint = 'The starting point may be invalid. Try running from a clean state.';
    }

    return {
      ...baseResult,
      error: `Failed to create worktree: ${errorMessage}`,
      hint
    };
  }

  // Verify worktree was created (basic check - detailed validation in validateWorktreeCreation)
  if (!worktreeExists(worktreePath)) {
    return {
      ...baseResult,
      error: 'Worktree creation command succeeded but worktree not found in git worktree list',
      hint: 'This may indicate a git internal error. Try running git worktree prune and try again.'
    };
  }

  return {
    success: true,
    worktreePath,
    branchName,
    created: !branchExistsAlready,
    attached: willAttach,
    branchExisted: branchExistsAlready,
    error: null,
    hint: null
  };
}

// =============================================================================
// Context Initialization
// =============================================================================

/**
 * Initialize worktree context directory
 *
 * Task 2.2: Initialize plan context in worktree (.claude-context/ directory)
 *
 * @param {string} worktreePath - Absolute path to worktree
 * @returns {{ success: boolean, contextDir: string | null, error: string | null }}
 */
function initializeWorktreeContext(worktreePath) {
  if (!fs.existsSync(worktreePath)) {
    return {
      success: false,
      contextDir: null,
      error: `Worktree path does not exist: ${worktreePath}`
    };
  }

  const contextDir = path.join(worktreePath, WORKTREE_CONTEXT_DIR);

  try {
    fs.mkdirSync(contextDir, { recursive: true });
    return { success: true, contextDir, error: null };
  } catch (error) {
    return {
      success: false,
      contextDir: null,
      error: `Failed to create context directory: ${error.message}`
    };
  }
}

/**
 * Copy config files to worktree context
 *
 * Task 2.3: Copy necessary config files to worktree context
 *
 * @param {string} worktreePath - Absolute path to worktree
 * @param {string} repoRoot - Absolute path to repo root
 * @returns {{ success: boolean, copiedFiles: string[], error: string | null }}
 */
function copyConfigToWorktree(worktreePath, repoRoot) {
  const contextDir = path.join(worktreePath, WORKTREE_CONTEXT_DIR);
  const copiedFiles = [];

  // Ensure context directory exists
  if (!fs.existsSync(contextDir)) {
    const initResult = initializeWorktreeContext(worktreePath);
    if (!initResult.success) {
      return { success: false, copiedFiles: [], error: initResult.error };
    }
  }

  // Files to copy from .claude/ to .claude-context/
  const configFiles = [GIT_WORKFLOW_FILE];

  for (const filename of configFiles) {
    const srcPath = path.join(repoRoot, MAIN_CONFIG_DIR, filename);
    const destPath = path.join(contextDir, filename);

    if (fs.existsSync(srcPath)) {
      try {
        fs.copyFileSync(srcPath, destPath);
        copiedFiles.push(filename);
      } catch (error) {
        return {
          success: false,
          copiedFiles,
          error: `Failed to copy ${filename}: ${error.message}`
        };
      }
    }
  }

  return { success: true, copiedFiles, error: null };
}

/**
 * Set the current plan pointer in worktree context
 *
 * Task 2.4: Set current plan pointer in worktree context
 *
 * @param {string} worktreePath - Absolute path to worktree
 * @param {string} planPath - Relative path to plan file (e.g., 'docs/plans/feature-auth.md')
 * @returns {{ success: boolean, pointerPath: string | null, error: string | null }}
 */
function setWorktreePlanPointer(worktreePath, planPath) {
  const contextDir = path.join(worktreePath, WORKTREE_CONTEXT_DIR);

  // Ensure context directory exists
  if (!fs.existsSync(contextDir)) {
    const initResult = initializeWorktreeContext(worktreePath);
    if (!initResult.success) {
      return { success: false, pointerPath: null, error: initResult.error };
    }
  }

  const pointerPath = path.join(contextDir, CURRENT_PLAN_FILE);

  try {
    fs.writeFileSync(pointerPath, planPath + '\n', 'utf8');
    return { success: true, pointerPath, error: null };
  } catch (error) {
    return {
      success: false,
      pointerPath: null,
      error: `Failed to set plan pointer: ${error.message}`
    };
  }
}

/**
 * Initialize status.json for a plan in worktree
 *
 * Task 2.5: Initialize status.json for the plan
 *
 * @param {string} worktreePath - Absolute path to worktree
 * @param {string} planPath - Relative path to plan file
 * @returns {{ success: boolean, statusPath: string | null, error: string | null }}
 */
function initializeWorktreeStatus(worktreePath, planPath) {
  // Import plan-status module for initialization
  const planStatus = require('./plan-status');

  // The status-cli.js and plan-status.js work with paths relative to cwd
  // We need to run from the worktree directory context
  const originalCwd = process.cwd();

  try {
    process.chdir(worktreePath);

    const result = planStatus.initializePlanStatus(planPath);

    process.chdir(originalCwd);

    if (!result.success) {
      return {
        success: false,
        statusPath: null,
        error: result.error || 'Failed to initialize status'
      };
    }

    const statusPath = planStatus.getStatusPath(planPath);
    return { success: true, statusPath, error: null };
  } catch (error) {
    process.chdir(originalCwd);
    return {
      success: false,
      statusPath: null,
      error: `Failed to initialize status: ${error.message}`
    };
  }
}

// =============================================================================
// Worktree Validation (Task 2.7)
// =============================================================================

/**
 * Validate that a worktree was created successfully
 *
 * Task 2.7: Validate worktree creation succeeded
 *
 * Performs comprehensive validation:
 * - Directory exists and is accessible
 * - Git index is valid (HEAD file exists)
 * - Branch is correctly checked out
 * - Worktree appears in git worktree list
 * - Core git files are present
 *
 * @param {string} worktreePath - Absolute path to the worktree
 * @param {string} branchName - Expected branch name (e.g., 'plan/feature-auth')
 * @returns {{
 *   valid: boolean,
 *   checks: {
 *     directoryExists: boolean,
 *     gitIndexValid: boolean,
 *     branchCorrect: boolean,
 *     inWorktreeList: boolean,
 *     coreFilesPresent: boolean
 *   },
 *   issues: string[],
 *   details: object
 * }}
 */
function validateWorktreeCreation(worktreePath, branchName) {
  const result = {
    valid: true,
    checks: {
      directoryExists: false,
      gitIndexValid: false,
      branchCorrect: false,
      inWorktreeList: false,
      coreFilesPresent: false
    },
    issues: [],
    details: {}
  };

  // Check 1: Directory exists and is accessible
  try {
    const stat = fs.statSync(worktreePath);
    if (stat.isDirectory()) {
      result.checks.directoryExists = true;
    } else {
      result.issues.push(`Path exists but is not a directory: ${worktreePath}`);
      result.valid = false;
    }
  } catch (error) {
    result.issues.push(`Directory does not exist or is not accessible: ${worktreePath}`);
    result.valid = false;
  }

  // Check 2: Git index is valid (has .git file pointing to main repo)
  const gitFile = path.join(worktreePath, '.git');
  try {
    if (fs.existsSync(gitFile)) {
      const gitContent = fs.readFileSync(gitFile, 'utf8').trim();
      if (gitContent.startsWith('gitdir:')) {
        result.checks.gitIndexValid = true;
        result.details.gitdir = gitContent.split('gitdir:')[1].trim();
      } else {
        result.issues.push('.git file does not contain valid gitdir reference');
        result.valid = false;
      }
    } else {
      result.issues.push('.git file not found in worktree');
      result.valid = false;
    }
  } catch (error) {
    result.issues.push(`Could not read .git file: ${error.message}`);
    result.valid = false;
  }

  // Check 3: Branch is correctly checked out
  try {
    const headOutput = execSync('git branch --show-current', {
      encoding: 'utf8',
      stdio: 'pipe',
      cwd: worktreePath
    }).trim();
    result.details.currentBranch = headOutput;

    if (headOutput === branchName) {
      result.checks.branchCorrect = true;
    } else {
      result.issues.push(`Expected branch '${branchName}' but found '${headOutput}'`);
      result.valid = false;
    }
  } catch (error) {
    result.issues.push(`Could not determine current branch: ${error.message}`);
    result.valid = false;
  }

  // Check 4: Worktree appears in git worktree list
  const worktrees = listWorktrees();
  const foundWorktree = worktrees.find(wt => wt.path === worktreePath);
  if (foundWorktree) {
    result.checks.inWorktreeList = true;
    result.details.worktreeEntry = foundWorktree;
  } else {
    result.issues.push('Worktree not found in git worktree list');
    result.valid = false;
  }

  // Check 5: Core git files are present (HEAD must be readable)
  try {
    execSync('git rev-parse HEAD', {
      encoding: 'utf8',
      stdio: 'pipe',
      cwd: worktreePath
    });
    result.checks.coreFilesPresent = true;
  } catch (error) {
    result.issues.push(`Git HEAD is not valid: ${error.message}`);
    result.valid = false;
  }

  return result;
}

// =============================================================================
// Complete Workflow
// =============================================================================

/**
 * Create a worktree with full initialization
 *
 * Combines tasks 2.1-2.7:
 * - Create worktree directory (2.1)
 * - Initialize .claude-context/ (2.2)
 * - Copy config files (2.3)
 * - Set current plan pointer (2.4)
 * - Initialize status.json (2.5)
 * - Handle existing branch (2.6)
 * - Validate worktree creation (2.7)
 *
 * @param {string} planName - Name of the plan (e.g., 'feature-auth')
 * @param {object} options - Options
 * @param {boolean} options.attach - Attach to existing branch instead of creating new
 * @param {boolean} options.autoAttach - Automatically attach if branch exists (no error)
 * @param {boolean} options.force - Force creation even if issues exist
 * @param {string} options.directory - Custom worktree directory (default: 'worktrees')
 * @param {boolean} options.noInit - Skip status.json initialization
 * @param {string} options.planPath - Custom plan path (default: 'docs/plans/{planName}.md')
 * @returns {{
 *   success: boolean,
 *   worktreePath: string | null,
 *   branchName: string | null,
 *   contextDir: string | null,
 *   planPath: string | null,
 *   statusPath: string | null,
 *   copiedFiles: string[],
 *   warnings: string[],
 *   error: string | null,
 *   hint: string | null,
 *   branchCreated: boolean,
 *   branchAttached: boolean,
 *   branchExisted: boolean,
 *   validation: object | null
 * }}
 */
function createWorktreeWithContext(planName, options = {}) {
  const {
    attach = false,
    autoAttach = false,
    force = false,
    directory = DEFAULT_WORKTREE_DIR,
    noInit = false,
    planPath: customPlanPath = null,
    skipResourceCheck = false
  } = options;

  const result = {
    success: false,
    worktreePath: null,
    branchName: null,
    contextDir: null,
    planPath: null,
    statusPath: null,
    copiedFiles: [],
    warnings: [],
    error: null,
    hint: null,
    branchCreated: false,
    branchAttached: false,
    branchExisted: false,
    validation: null,
    resourceCheck: null
  };

  // Get repo root
  const repoRoot = getRepoRoot();
  if (!repoRoot) {
    result.error = 'Could not determine repository root';
    return result;
  }

  // Task 10.1/10.2/10.6: Check resource limits before creating worktree
  if (!skipResourceCheck) {
    const resourceCheck = checkResourceLimits();
    result.resourceCheck = resourceCheck;

    if (!resourceCheck.canCreate) {
      result.error = resourceCheck.error;
      result.hint = 'Use --skip-resource-check to bypass resource limits (not recommended)';
      return result;
    }

    // Add warnings to result
    for (const warning of resourceCheck.checks.warnings) {
      result.warnings.push(`Resource: ${warning}`);
    }
  }

  // Determine plan path
  const planPath = customPlanPath || `docs/plans/${planName}.md`;
  result.planPath = planPath;

  // Check if plan file exists (warning only)
  const absolutePlanPath = path.join(repoRoot, planPath);
  if (!fs.existsSync(absolutePlanPath)) {
    result.warnings.push(`Plan file not found: ${planPath}`);
  }

  // Task 2.1 + 2.6: Create worktree directory (handles existing branch)
  const worktreeResult = createWorktree(planName, { attach, autoAttach, force, directory });
  if (!worktreeResult.success) {
    result.error = worktreeResult.error;
    result.hint = worktreeResult.hint;
    result.worktreePath = worktreeResult.worktreePath;
    result.branchName = worktreeResult.branchName;
    return result;
  }
  result.worktreePath = worktreeResult.worktreePath;
  result.branchName = worktreeResult.branchName;
  result.branchCreated = worktreeResult.created;
  result.branchAttached = worktreeResult.attached;
  result.branchExisted = worktreeResult.branchExisted;

  // Task 2.7: Validate worktree creation
  const validationResult = validateWorktreeCreation(result.worktreePath, result.branchName);
  result.validation = validationResult;
  if (!validationResult.valid) {
    // Non-fatal: add warnings for validation issues
    for (const issue of validationResult.issues) {
      result.warnings.push(`Validation: ${issue}`);
    }
  }

  // Task 2.2: Initialize plan context in worktree
  const contextResult = initializeWorktreeContext(result.worktreePath);
  if (!contextResult.success) {
    result.warnings.push(`Failed to initialize context: ${contextResult.error}`);
  } else {
    result.contextDir = contextResult.contextDir;
  }

  // Task 2.3: Copy necessary config files
  const copyResult = copyConfigToWorktree(result.worktreePath, repoRoot);
  if (!copyResult.success) {
    result.warnings.push(`Failed to copy config: ${copyResult.error}`);
  } else {
    result.copiedFiles = copyResult.copiedFiles;
  }

  // Task 2.4: Set current plan pointer
  const pointerResult = setWorktreePlanPointer(result.worktreePath, planPath);
  if (!pointerResult.success) {
    result.warnings.push(`Failed to set plan pointer: ${pointerResult.error}`);
  }

  // Task 2.5: Initialize status.json (unless --no-init)
  if (!noInit && fs.existsSync(absolutePlanPath)) {
    const statusResult = initializeWorktreeStatus(result.worktreePath, planPath);
    if (!statusResult.success) {
      result.warnings.push(`Failed to initialize status: ${statusResult.error}`);
    } else {
      result.statusPath = statusResult.statusPath;
    }
  } else if (noInit) {
    result.warnings.push('Status initialization skipped (--no-init)');
  }

  result.success = true;
  return result;
}

// =============================================================================
// Context Detection (for status-cli.js integration)
// =============================================================================

/**
 * Detect if we're running in a worktree context
 *
 * Task 3.6: Fallback to repo root when not in worktree
 * - Returns repoRoot for all cases (worktree or not)
 * - Returns contextSource to indicate how the context was resolved
 *
 * @returns {{
 *   inWorktree: boolean,
 *   worktreePath: string | null,
 *   planPath: string | null,
 *   repoRoot: string | null,
 *   contextSource: 'env' | 'worktree' | 'repo' | null
 * }}
 */
function detectWorktreeContext() {
  const result = {
    inWorktree: false,
    worktreePath: null,
    planPath: null,
    repoRoot: null,
    contextSource: null
  };

  // Try to determine repo root via git command
  const repoRoot = getRepoRoot();
  result.repoRoot = repoRoot || process.cwd();

  // Priority 1: CLAUDE_WORKTREE environment variable
  const envWorktree = process.env.CLAUDE_WORKTREE;
  if (envWorktree && fs.existsSync(envWorktree)) {
    const contextDir = path.join(envWorktree, WORKTREE_CONTEXT_DIR);
    const planPointer = path.join(contextDir, CURRENT_PLAN_FILE);

    if (fs.existsSync(planPointer)) {
      result.inWorktree = true;
      result.worktreePath = envWorktree;
      result.contextSource = 'env';
      try {
        result.planPath = fs.readFileSync(planPointer, 'utf8').trim();
      } catch (error) {
        // Ignore read errors
      }
      return result;
    }
  }

  // Priority 2: Check current directory for .claude-context/
  const cwd = process.cwd();
  const localContextDir = path.join(cwd, WORKTREE_CONTEXT_DIR);
  const localPlanPointer = path.join(localContextDir, CURRENT_PLAN_FILE);

  if (fs.existsSync(localPlanPointer)) {
    result.inWorktree = true;
    result.worktreePath = cwd;
    result.contextSource = 'worktree';
    try {
      result.planPath = fs.readFileSync(localPlanPointer, 'utf8').trim();
    } catch (error) {
      // Ignore read errors
    }
    return result;
  }

  // Priority 3: Fallback to repo root .claude/current-plan.txt
  const mainPlanPointer = path.join(result.repoRoot, MAIN_CONFIG_DIR, CURRENT_PLAN_FILE);
  if (fs.existsSync(mainPlanPointer)) {
    result.contextSource = 'repo';
    try {
      result.planPath = fs.readFileSync(mainPlanPointer, 'utf8').trim();
    } catch (error) {
      // Ignore read errors
    }
  }

  return result;
}

/**
 * Get the active plan path with worktree awareness
 * Falls back to main repo .claude/current-plan.txt if not in worktree
 *
 * @returns {string | null} The plan path, or null if not set
 */
function getWorktreeAwarePlanPath() {
  // First check worktree context
  const worktreeContext = detectWorktreeContext();
  if (worktreeContext.inWorktree && worktreeContext.planPath) {
    return worktreeContext.planPath;
  }

  // Fallback to main repo .claude/current-plan.txt
  const mainPlanPointer = path.join(process.cwd(), MAIN_CONFIG_DIR, CURRENT_PLAN_FILE);
  if (fs.existsSync(mainPlanPointer)) {
    try {
      const planPath = fs.readFileSync(mainPlanPointer, 'utf8').trim();
      return planPath || null;
    } catch (error) {
      return null;
    }
  }

  return null;
}

// =============================================================================
// Worktree Removal
// =============================================================================

/**
 * Remove a git worktree
 *
 * @param {string} planName - Name of the plan
 * @param {object} options - Options
 * @param {boolean} options.force - Force removal even with uncommitted changes
 * @param {string} options.directory - Worktree directory (default: 'worktrees')
 * @returns {{ success: boolean, error: string | null }}
 */
function removeWorktree(planName, options = {}) {
  const { force = false, directory = DEFAULT_WORKTREE_DIR } = options;

  const repoRoot = getRepoRoot();
  if (!repoRoot) {
    return { success: false, error: 'Could not determine repository root' };
  }

  const worktreePath = path.join(repoRoot, directory, `plan-${planName}`);

  if (!worktreeExists(worktreePath)) {
    return { success: false, error: `Worktree not found: ${worktreePath}` };
  }

  const forceFlag = force ? ' --force' : '';

  try {
    execSync(`git worktree remove "${worktreePath}"${forceFlag}`, { stdio: 'pipe', cwd: repoRoot });
    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: `Failed to remove worktree: ${error.message}` };
  }
}

/**
 * Prune stale worktree references
 * @returns {{ success: boolean, error: string | null }}
 */
function pruneWorktrees() {
  try {
    execSync('git worktree prune', { stdio: 'pipe' });
    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: `Failed to prune worktrees: ${error.message}` };
  }
}

// =============================================================================
// Dependent Worktree Detection (Task 8.6)
// =============================================================================

/**
 * Find worktrees that might be affected by changes from a completed plan
 *
 * Task 8.6: Handle completion when other worktrees depend on changes
 *
 * Detects worktrees whose branches:
 * - Were created before the merge commit
 * - Might need to rebase to incorporate changes
 *
 * @param {string} mergeCommit - SHA of the merge commit on main
 * @returns {Array<{ path: string, branch: string, behindMain: number, planName: string }>}
 */
function findDependentWorktrees(mergeCommit) {
  const worktrees = listWorktrees();
  const repoRoot = getRepoRoot();
  const dependents = [];

  if (!repoRoot) {
    return dependents;
  }

  for (const wt of worktrees) {
    // Skip non-plan branches
    if (!wt.branch || !wt.branch.startsWith('plan/')) continue;

    const planName = wt.branch.replace('plan/', '');

    try {
      // Get the merge base between main and the worktree branch
      const mergeBase = execSync(
        `git merge-base main "${wt.branch}"`,
        { encoding: 'utf8', cwd: repoRoot, stdio: 'pipe' }
      ).trim();

      // Count how many commits this branch is behind main
      const behindCount = parseInt(execSync(
        `git rev-list --count "${mergeBase}".."${mergeCommit}"`,
        { encoding: 'utf8', cwd: repoRoot, stdio: 'pipe' }
      ).trim());

      if (behindCount > 0) {
        dependents.push({
          path: wt.path,
          branch: wt.branch,
          behindMain: behindCount,
          planName
        });
      }
    } catch (error) {
      // Skip worktrees we can't analyze (e.g., detached HEAD)
    }
  }

  return dependents;
}

/**
 * Check if a worktree needs to rebase on updated main
 *
 * @param {string} worktreePath - Path to the worktree
 * @returns {{ needsRebase: boolean, behindCount: number, aheadCount: number, error: string | null }}
 */
function checkWorktreeRebaseStatus(worktreePath) {
  const repoRoot = getRepoRoot();
  if (!repoRoot) {
    return { needsRebase: false, behindCount: 0, aheadCount: 0, error: 'Not in a git repository' };
  }

  try {
    // Get the current branch in the worktree
    const branch = execSync('git branch --show-current', {
      encoding: 'utf8',
      cwd: worktreePath,
      stdio: 'pipe'
    }).trim();

    if (!branch) {
      return { needsRebase: false, behindCount: 0, aheadCount: 0, error: 'Detached HEAD state' };
    }

    return checkBranchRebaseStatus(branch);
  } catch (error) {
    return {
      needsRebase: false,
      behindCount: 0,
      aheadCount: 0,
      error: error.message
    };
  }
}

/**
 * Check if a branch needs to rebase on updated main
 *
 * Task 9.4: Support rebasing worktree on updated main
 *
 * @param {string} branch - Branch name to check (e.g., 'plan/feature-auth')
 * @returns {{ needsRebase: boolean, behindCount: number, aheadCount: number, error: string | null }}
 */
function checkBranchRebaseStatus(branch) {
  const repoRoot = getRepoRoot();
  if (!repoRoot) {
    return { needsRebase: false, behindCount: 0, aheadCount: 0, error: 'Not in a git repository' };
  }

  try {
    // Determine main branch (main or master)
    let mainBranch = 'main';
    try {
      execSync('git rev-parse --verify main', { cwd: repoRoot, stdio: 'pipe' });
    } catch {
      try {
        execSync('git rev-parse --verify master', { cwd: repoRoot, stdio: 'pipe' });
        mainBranch = 'master';
      } catch {
        return { needsRebase: false, behindCount: 0, aheadCount: 0, error: 'No main/master branch found' };
      }
    }

    // Count commits behind main (from repo root to access all branches)
    const behindCount = parseInt(execSync(
      `git rev-list --count "${branch}".."${mainBranch}"`,
      { encoding: 'utf8', cwd: repoRoot, stdio: 'pipe' }
    ).trim());

    // Count commits ahead of main
    const aheadCount = parseInt(execSync(
      `git rev-list --count "${mainBranch}".."${branch}"`,
      { encoding: 'utf8', cwd: repoRoot, stdio: 'pipe' }
    ).trim());

    return {
      needsRebase: behindCount > 0,
      behindCount,
      aheadCount,
      error: null
    };
  } catch (error) {
    return {
      needsRebase: false,
      behindCount: 0,
      aheadCount: 0,
      error: error.message
    };
  }
}

/**
 * Rebase a worktree onto main
 *
 * Task 9.4: Support rebasing worktree on updated main
 *
 * @param {string} worktreePath - Path to the worktree
 * @param {object} options - Options
 * @param {boolean} options.abort - Abort the rebase on conflict (default: true)
 * @returns {{ success: boolean, conflict: boolean, conflictFiles: string[], error: string | null }}
 */
function rebaseWorktreeOnMain(worktreePath, options = {}) {
  const { abort = true } = options;

  try {
    execSync('git rebase main', {
      cwd: worktreePath,
      stdio: 'pipe'
    });
    return { success: true, conflict: false, conflictFiles: [], error: null };
  } catch (error) {
    // Check if it's a conflict
    try {
      const conflictFiles = execSync('git diff --name-only --diff-filter=U', {
        encoding: 'utf8',
        cwd: worktreePath,
        stdio: 'pipe'
      }).trim().split('\n').filter(f => f);

      if (conflictFiles.length > 0) {
        if (abort) {
          execSync('git rebase --abort', { cwd: worktreePath, stdio: 'pipe' });
        }
        return {
          success: false,
          conflict: true,
          conflictFiles,
          error: `Rebase conflict in ${conflictFiles.length} file(s)`
        };
      }
    } catch (conflictError) {
      // Not in a conflict state, must be another error
    }

    return {
      success: false,
      conflict: false,
      conflictFiles: [],
      error: error.message
    };
  }
}

// =============================================================================
// Resource Management (Phase 10)
// =============================================================================

/**
 * Load git-workflow.json configuration
 *
 * @returns {object} Configuration object with defaults
 */
function loadGitWorkflowConfig() {
  const repoRoot = getRepoRoot();
  if (!repoRoot) {
    return getDefaultConfig();
  }

  const configPath = path.join(repoRoot, MAIN_CONFIG_DIR, GIT_WORKFLOW_FILE);

  try {
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(content);
      // Merge with defaults
      return {
        ...getDefaultConfig(),
        ...config,
        worktrees: {
          ...getDefaultConfig().worktrees,
          ...(config.worktrees || {})
        },
        resources: {
          ...getDefaultConfig().resources,
          ...(config.resources || {})
        }
      };
    }
  } catch (error) {
    // Ignore errors, return defaults
  }

  return getDefaultConfig();
}

/**
 * Get default configuration values
 *
 * @returns {object} Default configuration
 */
function getDefaultConfig() {
  return {
    worktrees: {
      enabled: true,
      directory: 'worktrees',
      max_concurrent: 3,
      auto_cleanup: true,
      stale_days: 14
    },
    resources: {
      min_disk_space_mb: 500,
      warn_disk_space_mb: 1000,
      check_disk_space: true
    }
  };
}

/**
 * Task 10.1: Check if concurrent worktree limit would be exceeded
 *
 * @param {object} options - Options
 * @param {number} options.limit - Override the configured limit
 * @returns {{
 *   withinLimit: boolean,
 *   currentCount: number,
 *   maxAllowed: number,
 *   canCreate: boolean,
 *   error: string | null
 * }}
 */
function checkConcurrentLimit(options = {}) {
  const config = loadGitWorkflowConfig();
  const maxAllowed = options.limit || config.worktrees.max_concurrent || 3;

  // Get current active worktrees (excluding main worktree)
  const worktrees = listWorktrees();
  const planWorktrees = worktrees.filter(wt =>
    wt.branch && wt.branch.startsWith('plan/')
  );

  const currentCount = planWorktrees.length;
  const withinLimit = currentCount < maxAllowed;

  return {
    withinLimit,
    currentCount,
    maxAllowed,
    canCreate: withinLimit,
    error: withinLimit ? null : `Concurrent worktree limit reached (${currentCount}/${maxAllowed}). Complete or remove existing worktrees first.`
  };
}

/**
 * Task 10.2: Get disk space information for worktrees directory
 *
 * Uses 'df' command on Linux/macOS to get disk usage.
 *
 * @param {string} targetPath - Path to check (defaults to worktrees directory)
 * @returns {{
 *   available: number,  // Available space in MB
 *   total: number,      // Total space in MB
 *   used: number,       // Used space in MB
 *   usedPercent: number, // Percentage used
 *   path: string,       // Path checked
 *   error: string | null
 * }}
 */
function getDiskSpace(targetPath = null) {
  const repoRoot = getRepoRoot();
  if (!repoRoot) {
    return {
      available: 0,
      total: 0,
      used: 0,
      usedPercent: 0,
      path: null,
      error: 'Not in a git repository'
    };
  }

  const config = loadGitWorkflowConfig();
  const checkPath = targetPath || path.join(repoRoot, config.worktrees.directory || DEFAULT_WORKTREE_DIR);

  // Use parent directory if target doesn't exist yet
  const pathToCheck = fs.existsSync(checkPath) ? checkPath : repoRoot;

  try {
    // Use df command to get disk space (works on Linux/macOS)
    const output = execSync(`df -Pm "${pathToCheck}" | tail -1`, {
      encoding: 'utf8',
      stdio: 'pipe'
    });

    // Parse df output: Filesystem 1M-blocks Used Available Capacity Mounted
    const parts = output.trim().split(/\s+/);
    if (parts.length >= 4) {
      const total = parseInt(parts[1]) || 0;
      const used = parseInt(parts[2]) || 0;
      const available = parseInt(parts[3]) || 0;
      const usedPercent = total > 0 ? Math.round((used / total) * 100) : 0;

      return {
        available,
        total,
        used,
        usedPercent,
        path: pathToCheck,
        error: null
      };
    }

    return {
      available: 0,
      total: 0,
      used: 0,
      usedPercent: 0,
      path: pathToCheck,
      error: 'Could not parse df output'
    };
  } catch (error) {
    return {
      available: 0,
      total: 0,
      used: 0,
      usedPercent: 0,
      path: pathToCheck,
      error: `Failed to get disk space: ${error.message}`
    };
  }
}

/**
 * Task 10.2: Check if there's enough disk space for a new worktree
 *
 * @returns {{
 *   sufficient: boolean,
 *   warning: boolean,
 *   availableMB: number,
 *   minRequiredMB: number,
 *   warnThresholdMB: number,
 *   message: string | null
 * }}
 */
function checkDiskSpace() {
  const config = loadGitWorkflowConfig();
  const resources = config.resources || {};

  if (!resources.check_disk_space) {
    return {
      sufficient: true,
      warning: false,
      availableMB: 0,
      minRequiredMB: 0,
      warnThresholdMB: 0,
      message: 'Disk space check disabled'
    };
  }

  const minRequired = resources.min_disk_space_mb || 500;
  const warnThreshold = resources.warn_disk_space_mb || 1000;

  const diskInfo = getDiskSpace();

  if (diskInfo.error) {
    return {
      sufficient: true, // Assume OK if we can't check
      warning: true,
      availableMB: 0,
      minRequiredMB: minRequired,
      warnThresholdMB: warnThreshold,
      message: `Could not check disk space: ${diskInfo.error}`
    };
  }

  const available = diskInfo.available;
  const sufficient = available >= minRequired;
  const warning = available < warnThreshold && available >= minRequired;

  let message = null;
  if (!sufficient) {
    message = `Insufficient disk space: ${available}MB available, ${minRequired}MB required`;
  } else if (warning) {
    message = `Low disk space warning: ${available}MB available (threshold: ${warnThreshold}MB)`;
  }

  return {
    sufficient,
    warning,
    availableMB: available,
    minRequiredMB: minRequired,
    warnThresholdMB: warnThreshold,
    message
  };
}

/**
 * Task 10.3: Get worktree age and staleness information
 *
 * @param {string} worktreePath - Path to worktree
 * @returns {{
 *   createdAt: Date | null,
 *   lastActivity: Date | null,
 *   ageDays: number,
 *   inactiveDays: number,
 *   isStale: boolean,
 *   staleDaysThreshold: number,
 *   error: string | null
 * }}
 */
function getWorktreeAge(worktreePath) {
  const config = loadGitWorkflowConfig();
  const staleDays = config.worktrees.stale_days || 14;

  const result = {
    createdAt: null,
    lastActivity: null,
    ageDays: 0,
    inactiveDays: 0,
    isStale: false,
    staleDaysThreshold: staleDays,
    error: null
  };

  if (!fs.existsSync(worktreePath)) {
    result.error = 'Worktree path does not exist';
    return result;
  }

  try {
    // Get creation time from .git file
    const gitFile = path.join(worktreePath, '.git');
    if (fs.existsSync(gitFile)) {
      const stat = fs.statSync(gitFile);
      result.createdAt = stat.birthtime || stat.ctime;
    }

    // Get last activity from the most recent commit on this branch
    try {
      const lastCommitTime = execSync('git log -1 --format=%ci', {
        encoding: 'utf8',
        cwd: worktreePath,
        stdio: 'pipe'
      }).trim();

      if (lastCommitTime) {
        result.lastActivity = new Date(lastCommitTime);
      }
    } catch (gitError) {
      // Fall back to file system modification time
      const stat = fs.statSync(worktreePath);
      result.lastActivity = stat.mtime;
    }

    // Calculate age and inactivity
    const now = new Date();

    if (result.createdAt) {
      result.ageDays = Math.floor((now - result.createdAt) / (1000 * 60 * 60 * 24));
    }

    if (result.lastActivity) {
      result.inactiveDays = Math.floor((now - result.lastActivity) / (1000 * 60 * 60 * 24));
      result.isStale = result.inactiveDays >= staleDays;
    }

    return result;
  } catch (error) {
    result.error = error.message;
    return result;
  }
}

/**
 * Task 10.3: Get all stale worktrees
 *
 * @param {object} options - Options
 * @param {number} options.staleDays - Override stale threshold
 * @returns {Array<{
 *   path: string,
 *   branch: string,
 *   planName: string,
 *   ageDays: number,
 *   inactiveDays: number,
 *   lastActivity: Date | null
 * }>}
 */
function getStaleWorktrees(options = {}) {
  const config = loadGitWorkflowConfig();
  const staleDays = options.staleDays || config.worktrees.stale_days || 14;

  const worktrees = listWorktrees();
  const staleWorktrees = [];

  for (const wt of worktrees) {
    // Skip non-plan worktrees
    if (!wt.branch || !wt.branch.startsWith('plan/')) continue;

    const ageInfo = getWorktreeAge(wt.path);

    if (ageInfo.inactiveDays >= staleDays) {
      staleWorktrees.push({
        path: wt.path,
        branch: wt.branch,
        planName: wt.branch.replace('plan/', ''),
        ageDays: ageInfo.ageDays,
        inactiveDays: ageInfo.inactiveDays,
        lastActivity: ageInfo.lastActivity
      });
    }
  }

  // Sort by inactivity (most stale first)
  staleWorktrees.sort((a, b) => b.inactiveDays - a.inactiveDays);

  return staleWorktrees;
}

/**
 * Task 10.4: Get abandoned worktrees (no recent activity, no in-progress tasks)
 *
 * An abandoned worktree is:
 * - Stale (exceeds stale_days threshold)
 * - Has no in-progress tasks in status.json
 * - Optionally: has no uncommitted changes
 *
 * @param {object} options - Options
 * @param {boolean} options.includeUncommitted - Include worktrees with uncommitted changes
 * @returns {Array<{
 *   path: string,
 *   branch: string,
 *   planName: string,
 *   inactiveDays: number,
 *   hasUncommittedChanges: boolean,
 *   hasInProgressTasks: boolean,
 *   planProgress: { completed: number, total: number } | null
 * }>}
 */
function getAbandonedWorktrees(options = {}) {
  const { includeUncommitted = false } = options;

  const staleWorktrees = getStaleWorktrees();
  const abandonedWorktrees = [];

  for (const wt of staleWorktrees) {
    let hasUncommittedChanges = false;
    let hasInProgressTasks = false;
    let planProgress = null;

    // Check for uncommitted changes
    try {
      const statusOutput = execSync('git status --porcelain', {
        encoding: 'utf8',
        cwd: wt.path,
        stdio: 'pipe'
      });
      hasUncommittedChanges = statusOutput.trim().length > 0;
    } catch (error) {
      // Assume no uncommitted changes if we can't check
    }

    // Check for in-progress tasks
    try {
      const contextDir = path.join(wt.path, WORKTREE_CONTEXT_DIR);
      const planPointerFile = path.join(contextDir, CURRENT_PLAN_FILE);

      if (fs.existsSync(planPointerFile)) {
        const planPath = fs.readFileSync(planPointerFile, 'utf8').trim();
        const statusPath = path.join(wt.path, 'docs', 'plan-outputs',
          path.basename(planPath, '.md'), 'status.json');

        if (fs.existsSync(statusPath)) {
          const status = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
          const tasks = status.tasks || [];

          hasInProgressTasks = tasks.some(t => t.status === 'in_progress');

          const summary = status.summary || {};
          planProgress = {
            completed: summary.completed || 0,
            total: summary.totalTasks || 0
          };
        }
      }
    } catch (error) {
      // Ignore errors
    }

    // Consider abandoned if stale and no in-progress tasks
    if (!hasInProgressTasks && (includeUncommitted || !hasUncommittedChanges)) {
      abandonedWorktrees.push({
        path: wt.path,
        branch: wt.branch,
        planName: wt.planName,
        inactiveDays: wt.inactiveDays,
        hasUncommittedChanges,
        hasInProgressTasks,
        planProgress
      });
    }
  }

  return abandonedWorktrees;
}

/**
 * Task 10.4: Clean up abandoned worktrees
 *
 * @param {object} options - Options
 * @param {boolean} options.dryRun - Only report what would be cleaned (default: true)
 * @param {boolean} options.force - Force removal even with uncommitted changes
 * @param {boolean} options.deleteBranch - Also delete the associated branch
 * @returns {{
 *   cleaned: Array<{ path: string, branch: string, planName: string }>,
 *   skipped: Array<{ path: string, reason: string }>,
 *   errors: Array<{ path: string, error: string }>,
 *   dryRun: boolean
 * }}
 */
function cleanupAbandonedWorktrees(options = {}) {
  const { dryRun = true, force = false, deleteBranch = false } = options;

  const abandoned = getAbandonedWorktrees({ includeUncommitted: force });
  const result = {
    cleaned: [],
    skipped: [],
    errors: [],
    dryRun
  };

  for (const wt of abandoned) {
    // Skip if has uncommitted changes and not forcing
    if (wt.hasUncommittedChanges && !force) {
      result.skipped.push({
        path: wt.path,
        reason: 'Has uncommitted changes (use --force to remove)'
      });
      continue;
    }

    if (dryRun) {
      result.cleaned.push({
        path: wt.path,
        branch: wt.branch,
        planName: wt.planName
      });
      continue;
    }

    // Actually remove the worktree
    try {
      const removeResult = removeWorktree(wt.planName, { force });
      if (removeResult.success) {
        result.cleaned.push({
          path: wt.path,
          branch: wt.branch,
          planName: wt.planName
        });

        // Optionally delete the branch
        if (deleteBranch) {
          try {
            execSync(`git branch -D "${wt.branch}"`, { stdio: 'pipe' });
          } catch (branchError) {
            // Non-fatal, just log it
            result.errors.push({
              path: wt.path,
              error: `Worktree removed but branch deletion failed: ${branchError.message}`
            });
          }
        }
      } else {
        result.errors.push({
          path: wt.path,
          error: removeResult.error
        });
      }
    } catch (error) {
      result.errors.push({
        path: wt.path,
        error: error.message
      });
    }
  }

  // Also prune stale worktree references
  if (!dryRun) {
    pruneWorktrees();
  }

  return result;
}

/**
 * Task 10.1 & 10.6: Check all resource limits before creating a worktree
 *
 * Combines all resource checks into a single validation function.
 *
 * @param {object} options - Options
 * @returns {{
 *   canCreate: boolean,
 *   checks: {
 *     concurrentLimit: { passed: boolean, current: number, max: number },
 *     diskSpace: { passed: boolean, availableMB: number, requiredMB: number },
 *     warnings: string[]
 *   },
 *   error: string | null
 * }}
 */
function checkResourceLimits(options = {}) {
  const checks = {
    concurrentLimit: { passed: true, current: 0, max: 0 },
    diskSpace: { passed: true, availableMB: 0, requiredMB: 0 },
    warnings: []
  };

  let canCreate = true;
  let error = null;

  // Check concurrent limit
  const limitCheck = checkConcurrentLimit(options);
  checks.concurrentLimit = {
    passed: limitCheck.withinLimit,
    current: limitCheck.currentCount,
    max: limitCheck.maxAllowed
  };

  if (!limitCheck.withinLimit) {
    canCreate = false;
    error = limitCheck.error;
  }

  // Check disk space
  const diskCheck = checkDiskSpace();
  checks.diskSpace = {
    passed: diskCheck.sufficient,
    availableMB: diskCheck.availableMB,
    requiredMB: diskCheck.minRequiredMB
  };

  if (!diskCheck.sufficient) {
    canCreate = false;
    error = error || diskCheck.message;
  }

  if (diskCheck.warning && diskCheck.message) {
    checks.warnings.push(diskCheck.message);
  }

  // Check for stale worktrees and warn
  const stale = getStaleWorktrees();
  if (stale.length > 0) {
    checks.warnings.push(
      `${stale.length} stale worktree(s) found. Consider running cleanup.`
    );
  }

  return { canCreate, checks, error };
}

/**
 * Task 10.5: Get resource configuration summary
 *
 * @returns {{
 *   worktrees: object,
 *   resources: object,
 *   currentState: {
 *     activeWorktrees: number,
 *     staleWorktrees: number,
 *     abandonedWorktrees: number,
 *     diskAvailableMB: number
 *   }
 * }}
 */
function getResourceConfig() {
  const config = loadGitWorkflowConfig();

  // Get current state
  const worktrees = listWorktrees();
  const planWorktrees = worktrees.filter(wt =>
    wt.branch && wt.branch.startsWith('plan/')
  );
  const stale = getStaleWorktrees();
  const abandoned = getAbandonedWorktrees();
  const disk = getDiskSpace();

  return {
    worktrees: config.worktrees,
    resources: config.resources || getDefaultConfig().resources,
    currentState: {
      activeWorktrees: planWorktrees.length,
      staleWorktrees: stale.length,
      abandonedWorktrees: abandoned.length,
      diskAvailableMB: disk.available
    }
  };
}

// =============================================================================
// Resource Exhaustion Error Class (Task 10.6)
// =============================================================================

/**
 * Resource types that can be exhausted
 */
const ResourceType = {
  CONCURRENT_LIMIT: 'concurrent_limit',
  DISK_SPACE: 'disk_space',
  STALE_WORKTREES: 'stale_worktrees'
};

/**
 * Custom error class for resource exhaustion scenarios
 *
 * Task 10.6: Handle resource exhaustion gracefully with clear error messages
 *
 * @class ResourceExhaustedError
 * @extends Error
 */
class ResourceExhaustedError extends Error {
  /**
   * @param {string} resourceType - Type of resource exhausted (from ResourceType)
   * @param {object} details - Details about the exhaustion
   * @param {string[]} recoverySuggestions - Actionable steps to recover
   */
  constructor(resourceType, details, recoverySuggestions = []) {
    const message = ResourceExhaustedError.formatMessage(resourceType, details);
    super(message);
    this.name = 'ResourceExhaustedError';
    this.resourceType = resourceType;
    this.details = details;
    this.recoverySuggestions = recoverySuggestions;
    this.timestamp = new Date().toISOString();
  }

  /**
   * Format error message based on resource type
   */
  static formatMessage(resourceType, details) {
    switch (resourceType) {
      case ResourceType.CONCURRENT_LIMIT:
        return `Concurrent worktree limit reached (${details.current}/${details.max}). Cannot create new worktree.`;
      case ResourceType.DISK_SPACE:
        return `Insufficient disk space: ${details.available}MB available, ${details.required}MB required.`;
      case ResourceType.STALE_WORKTREES:
        return `Too many stale worktrees (${details.count}). Cleanup required before creating new worktrees.`;
      default:
        return `Resource exhausted: ${resourceType}`;
    }
  }

  /**
   * Get a JSON-serializable representation
   */
  toJSON() {
    return {
      error: this.name,
      resourceType: this.resourceType,
      message: this.message,
      details: this.details,
      recoverySuggestions: this.recoverySuggestions,
      timestamp: this.timestamp
    };
  }
}

/**
 * Task 10.6: Generate recovery suggestions based on resource state
 *
 * @param {object} resourceCheck - Result from checkResourceLimits()
 * @returns {string[]} Array of actionable recovery suggestions
 */
function getRecoverySuggestions(resourceCheck) {
  const suggestions = [];
  const checks = resourceCheck.checks;

  // Concurrent limit suggestions
  if (!checks.concurrentLimit.passed) {
    suggestions.push(
      `Complete an existing plan: /plan:complete or git worktree remove`,
      `Remove abandoned worktrees: node scripts/status-cli.js cleanup-worktrees --execute`,
      `View active worktrees: node scripts/status-cli.js all-plans`
    );
  }

  // Disk space suggestions
  if (!checks.diskSpace.passed) {
    const neededMB = checks.diskSpace.requiredMB - checks.diskSpace.availableMB;
    suggestions.push(
      `Free at least ${neededMB}MB of disk space`,
      `Remove completed worktrees: node scripts/status-cli.js cleanup-worktrees --execute`,
      `Prune git objects: git gc --prune=now`
    );
  }

  // Stale worktrees warning - suggest cleanup
  if (checks.warnings.some(w => w.includes('stale worktree'))) {
    suggestions.push(
      `Clean up stale worktrees: node scripts/status-cli.js cleanup-worktrees --execute`,
      `View stale worktrees: node scripts/status-cli.js stale-worktrees`
    );
  }

  return suggestions;
}

/**
 * Task 10.6: Create ResourceExhaustedError from resource check result
 *
 * @param {object} resourceCheck - Result from checkResourceLimits()
 * @returns {ResourceExhaustedError} Error with recovery suggestions
 */
function createResourceExhaustedError(resourceCheck) {
  const checks = resourceCheck.checks;
  let resourceType;
  let details = {};

  // Determine primary resource type that failed
  if (!checks.concurrentLimit.passed) {
    resourceType = ResourceType.CONCURRENT_LIMIT;
    details = {
      current: checks.concurrentLimit.current,
      max: checks.concurrentLimit.max
    };
  } else if (!checks.diskSpace.passed) {
    resourceType = ResourceType.DISK_SPACE;
    details = {
      available: checks.diskSpace.availableMB,
      required: checks.diskSpace.requiredMB
    };
  } else {
    resourceType = 'unknown';
  }

  const suggestions = getRecoverySuggestions(resourceCheck);

  return new ResourceExhaustedError(resourceType, details, suggestions);
}

/**
 * Task 10.6: Wait for resources to become available
 *
 * Polls resource availability at regular intervals until resources free up
 * or timeout is reached. Useful for automated scripts that can wait.
 *
 * @param {object} options - Options
 * @param {number} options.timeoutMs - Maximum time to wait in milliseconds (default: 300000 = 5 min)
 * @param {number} options.pollIntervalMs - Poll interval in milliseconds (default: 10000 = 10 sec)
 * @param {boolean} options.autoCleanup - Attempt auto-cleanup of abandoned worktrees (default: false)
 * @param {function} options.onProgress - Callback for progress updates
 * @returns {Promise<{ success: boolean, waitedMs: number, autoCleanedCount: number, error: string | null }>}
 */
async function waitForResources(options = {}) {
  const {
    timeoutMs = 300000,
    pollIntervalMs = 10000,
    autoCleanup = false,
    onProgress = null
  } = options;

  const startTime = Date.now();
  let autoCleanedCount = 0;

  // Helper to sleep
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // If auto-cleanup is enabled, try it first
  if (autoCleanup) {
    const abandonedBefore = getAbandonedWorktrees({ includeUncommitted: false });
    if (abandonedBefore.length > 0) {
      if (onProgress) {
        onProgress({
          type: 'cleanup',
          message: `Attempting auto-cleanup of ${abandonedBefore.length} abandoned worktree(s)...`
        });
      }

      const cleanupResult = cleanupAbandonedWorktrees({
        dryRun: false,
        force: false,
        deleteBranch: false
      });

      autoCleanedCount = cleanupResult.cleaned.length;

      if (onProgress && autoCleanedCount > 0) {
        onProgress({
          type: 'cleanup_complete',
          message: `Auto-cleaned ${autoCleanedCount} abandoned worktree(s)`
        });
      }
    }
  }

  // Check if resources are now available
  let resourceCheck = checkResourceLimits();
  if (resourceCheck.canCreate) {
    return {
      success: true,
      waitedMs: Date.now() - startTime,
      autoCleanedCount,
      error: null
    };
  }

  // Poll until resources are available or timeout
  while (Date.now() - startTime < timeoutMs) {
    if (onProgress) {
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      const remaining = Math.round((timeoutMs - (Date.now() - startTime)) / 1000);
      onProgress({
        type: 'waiting',
        message: `Waiting for resources... (${elapsed}s elapsed, ${remaining}s remaining)`,
        checks: resourceCheck.checks
      });
    }

    await sleep(pollIntervalMs);

    resourceCheck = checkResourceLimits();
    if (resourceCheck.canCreate) {
      return {
        success: true,
        waitedMs: Date.now() - startTime,
        autoCleanedCount,
        error: null
      };
    }
  }

  // Timeout reached
  return {
    success: false,
    waitedMs: Date.now() - startTime,
    autoCleanedCount,
    error: `Resource wait timeout after ${Math.round(timeoutMs / 1000)} seconds: ${resourceCheck.error}`
  };
}

/**
 * Task 10.6: Get formatted resource exhaustion report
 *
 * @param {object} resourceCheck - Result from checkResourceLimits()
 * @returns {string} Formatted report for display
 */
function formatResourceExhaustionReport(resourceCheck) {
  const lines = [];
  const checks = resourceCheck.checks;

  lines.push('═══════════════════════════════════════════════════════════════════════');
  lines.push('                     RESOURCE EXHAUSTION REPORT                        ');
  lines.push('═══════════════════════════════════════════════════════════════════════');
  lines.push('');

  // Status summary
  lines.push('Resource Status:');

  // Concurrent limit
  const concurrentStatus = checks.concurrentLimit.passed ? '✓' : '✗';
  lines.push(`  ${concurrentStatus} Concurrent Worktrees: ${checks.concurrentLimit.current}/${checks.concurrentLimit.max}`);

  // Disk space
  const diskStatus = checks.diskSpace.passed ? '✓' : '✗';
  lines.push(`  ${diskStatus} Disk Space: ${checks.diskSpace.availableMB}MB available (min: ${checks.diskSpace.requiredMB}MB)`);

  lines.push('');

  // Warnings
  if (checks.warnings.length > 0) {
    lines.push('Warnings:');
    for (const warning of checks.warnings) {
      lines.push(`  ⚠ ${warning}`);
    }
    lines.push('');
  }

  // Recovery suggestions
  const suggestions = getRecoverySuggestions(resourceCheck);
  if (suggestions.length > 0) {
    lines.push('Recovery Options:');
    suggestions.forEach((suggestion, i) => {
      lines.push(`  ${i + 1}. ${suggestion}`);
    });
    lines.push('');
  }

  // Auto-cleanup hint
  const abandoned = getAbandonedWorktrees({ includeUncommitted: false });
  if (abandoned.length > 0) {
    lines.push('Quick Fix Available:');
    lines.push(`  ${abandoned.length} abandoned worktree(s) can be auto-cleaned.`);
    lines.push(`  Run: node scripts/status-cli.js cleanup-worktrees --execute`);
    lines.push('');
  }

  lines.push('═══════════════════════════════════════════════════════════════════════');

  return lines.join('\n');
}

/**
 * Task 10.6: Enhanced resource check with graceful error handling
 *
 * @param {object} options - Options
 * @param {boolean} options.throwOnExhaustion - Throw ResourceExhaustedError if resources unavailable
 * @param {boolean} options.includeReport - Include formatted report in result
 * @returns {object} Enhanced resource check result
 */
function checkResourcesGracefully(options = {}) {
  const { throwOnExhaustion = false, includeReport = false } = options;

  const result = checkResourceLimits(options);

  // Add recovery suggestions
  result.recoverySuggestions = getRecoverySuggestions(result);

  // Add formatted report if requested
  if (includeReport) {
    result.report = formatResourceExhaustionReport(result);
  }

  // Add auto-cleanup info
  const abandoned = getAbandonedWorktrees({ includeUncommitted: false });
  result.autoCleanupAvailable = abandoned.length > 0;
  result.abandonedCount = abandoned.length;

  // Throw if requested and resources exhausted
  if (throwOnExhaustion && !result.canCreate) {
    throw createResourceExhaustedError(result);
  }

  return result;
}

// =============================================================================
// Exports
// =============================================================================

module.exports = {
  // Configuration
  WORKTREE_CONTEXT_DIR,
  MAIN_CONFIG_DIR,
  CURRENT_PLAN_FILE,
  GIT_WORKFLOW_FILE,
  DEFAULT_WORKTREE_DIR,
  MIN_GIT_VERSION,

  // Git utilities
  isGitAvailable,
  getGitVersion,
  checkGitWorktreeSupport,
  isGitRepository,
  getRepoRoot,
  branchExists,
  getCurrentBranch,
  listWorktrees,
  worktreeExists,

  // Task 2.6: Branch handling
  isBranchCheckedOutInWorktree,

  // Worktree creation (Task 2.1)
  createWorktree,

  // Context initialization (Task 2.2)
  initializeWorktreeContext,

  // Config copying (Task 2.3)
  copyConfigToWorktree,

  // Plan pointer (Task 2.4)
  setWorktreePlanPointer,

  // Status initialization (Task 2.5)
  initializeWorktreeStatus,

  // Task 2.7: Worktree validation
  validateWorktreeCreation,

  // Complete workflow
  createWorktreeWithContext,

  // Context detection
  detectWorktreeContext,
  getWorktreeAwarePlanPath,

  // Worktree removal
  removeWorktree,
  pruneWorktrees,

  // Task 8.6: Dependent worktree detection
  findDependentWorktrees,
  checkWorktreeRebaseStatus,
  checkBranchRebaseStatus,

  // Task 9.4: Worktree rebasing
  rebaseWorktreeOnMain,

  // Phase 10: Resource Management
  loadGitWorkflowConfig,
  getDefaultConfig,
  checkConcurrentLimit,
  getDiskSpace,
  checkDiskSpace,
  getWorktreeAge,
  getStaleWorktrees,
  getAbandonedWorktrees,
  cleanupAbandonedWorktrees,
  checkResourceLimits,
  getResourceConfig,

  // Task 10.6: Graceful Resource Exhaustion Handling
  ResourceType,
  ResourceExhaustedError,
  getRecoverySuggestions,
  createResourceExhaustedError,
  waitForResources,
  formatResourceExhaustionReport,
  checkResourcesGracefully
};
