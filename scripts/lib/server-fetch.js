/**
 * Server-Side Plan Status Fetching
 *
 * Task 12.5: Implement server-side plan status fetching
 *
 * This module provides utilities for fetching plan status data server-side,
 * designed for NextJS Server Components and API routes. It bypasses the
 * REST API and reads directly from the filesystem for optimal performance.
 *
 * Usage in NextJS:
 *
 * ```typescript
 * // app/plans/[name]/page.tsx
 * import { getPlanStatus, getAllPlans } from '@/lib/plan-status';
 *
 * export default async function PlanPage({ params }) {
 *   const plan = await getPlanStatus(params.name);
 *   return <PlanDetail plan={plan} />;
 * }
 * ```
 */

const fs = require('fs');
const path = require('path');

// =============================================================================
// Configuration
// =============================================================================

/**
 * Default paths (can be overridden via environment variables)
 */
const DEFAULTS = {
  REPO_ROOT: process.env.PLAN_REPO_ROOT || process.cwd(),
  PLANS_DIR: process.env.PLANS_DIR || 'docs/plans',
  OUTPUTS_DIR: process.env.OUTPUTS_DIR || 'docs/plan-outputs',
  CLAUDE_DIR: process.env.CLAUDE_DIR || '.claude',
};

/**
 * Get the repository root path
 */
function getRepoRoot() {
  return DEFAULTS.REPO_ROOT;
}

/**
 * Get path to plans directory
 */
function getPlansDir() {
  return path.join(getRepoRoot(), DEFAULTS.PLANS_DIR);
}

/**
 * Get path to outputs directory
 */
function getOutputsDir() {
  return path.join(getRepoRoot(), DEFAULTS.OUTPUTS_DIR);
}

// =============================================================================
// Type Definitions (for documentation - JSDoc)
// =============================================================================

/**
 * @typedef {Object} Progress
 * @property {number} total - Total number of tasks
 * @property {number} completed - Number of completed tasks
 * @property {number} pending - Number of pending tasks
 * @property {number} in_progress - Number of in-progress tasks
 * @property {number} failed - Number of failed tasks
 * @property {number} skipped - Number of skipped tasks
 * @property {number} percentage - Completion percentage (0-100)
 */

/**
 * @typedef {Object} Task
 * @property {string} id - Task ID (e.g., "12.1")
 * @property {string} phase - Phase name
 * @property {string} description - Task description
 * @property {'pending'|'in_progress'|'completed'|'failed'|'skipped'} status
 * @property {string} [startedAt] - ISO timestamp when task started
 * @property {string} [completedAt] - ISO timestamp when task completed
 * @property {string} [failedAt] - ISO timestamp when task failed
 * @property {string} [notes] - Completion notes
 * @property {string} [error] - Error message if failed
 */

/**
 * @typedef {Object} Phase
 * @property {number} number - Phase number
 * @property {string} name - Phase name
 * @property {number} total - Total tasks in phase
 * @property {number} completed - Completed tasks in phase
 * @property {number} percentage - Phase completion percentage
 */

/**
 * @typedef {Object} OrchestratorInfo
 * @property {boolean} running - Whether orchestrator is running
 * @property {number|null} pid - Process ID
 * @property {string} [startedAt] - ISO timestamp when started
 * @property {'batch'|'continuous'} [mode] - Execution mode
 */

/**
 * @typedef {Object} WorktreeInfo
 * @property {boolean} active - Whether worktree is active
 * @property {string} path - Absolute path to worktree
 * @property {string} branch - Branch name
 */

/**
 * @typedef {Object} PlanSummary
 * @property {string} name - Plan name (without .md)
 * @property {string} path - Path to plan file
 * @property {string} title - Plan title
 * @property {'pending'|'in_progress'|'completed'} status - Plan status
 * @property {Progress} progress - Progress information
 * @property {string|null} currentPhase - Current phase name
 * @property {OrchestratorInfo|null} orchestrator - Orchestrator status
 * @property {WorktreeInfo|null} worktree - Worktree information
 * @property {string|null} lastUpdatedAt - Last update timestamp
 */

/**
 * @typedef {Object} PlanDetail
 * @property {string} name - Plan name
 * @property {string} path - Path to plan file
 * @property {string} title - Plan title
 * @property {'pending'|'in_progress'|'completed'} status
 * @property {Progress} progress
 * @property {Phase[]} phases - Phase breakdown
 * @property {Task[]} tasks - All tasks
 * @property {string|null} currentPhase
 * @property {Object[]} recentActivity - Recent activity
 * @property {OrchestratorInfo|null} orchestrator
 * @property {WorktreeInfo|null} worktree
 * @property {string|null} lastUpdatedAt
 */

// =============================================================================
// Core Functions
// =============================================================================

/**
 * Read and parse status.json for a plan
 *
 * @param {string} planName - Plan name (without .md extension)
 * @returns {Object|null} - Parsed status object or null if not found
 */
function readStatusFile(planName) {
  const statusPath = path.join(getOutputsDir(), planName, 'status.json');

  try {
    if (fs.existsSync(statusPath)) {
      const content = fs.readFileSync(statusPath, 'utf8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.error(`Error reading status for ${planName}:`, error.message);
  }

  return null;
}

/**
 * Get orchestrator registry data
 *
 * @returns {Object|null} - Registry data or null
 */
function getOrchestratorRegistry() {
  const registryPath = path.join(getRepoRoot(), DEFAULTS.CLAUDE_DIR, 'orchestrator-registry.json');

  try {
    if (fs.existsSync(registryPath)) {
      const content = fs.readFileSync(registryPath, 'utf8');
      return JSON.parse(content);
    }
  } catch (error) {
    // Registry not available
  }

  return null;
}

/**
 * Check if orchestrator is running for a plan
 *
 * @param {string} planName - Plan name
 * @returns {OrchestratorInfo|null}
 */
function getOrchestratorStatus(planName) {
  const registry = getOrchestratorRegistry();
  if (!registry?.instances) return null;

  const instance = registry.instances.find(
    i => i.plan === planName && i.status === 'running'
  );

  if (instance) {
    return {
      running: true,
      pid: instance.pid,
      startedAt: instance.started_at,
      mode: instance.mode || 'batch'
    };
  }

  return null;
}

/**
 * Get worktree information for a plan
 *
 * @param {string} planName - Plan name
 * @returns {WorktreeInfo|null}
 */
function getWorktreeInfo(planName) {
  try {
    const { execSync } = require('child_process');
    const result = execSync('git worktree list --porcelain', {
      cwd: getRepoRoot(),
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });

    const branchName = `plan/${planName}`;
    const lines = result.split('\n');
    let currentWorktree = null;

    for (const line of lines) {
      if (line.startsWith('worktree ')) {
        currentWorktree = { path: line.substring(9) };
      } else if (line.startsWith('branch ') && currentWorktree) {
        const branch = line.substring(7).replace('refs/heads/', '');
        if (branch === branchName) {
          return {
            active: true,
            path: currentWorktree.path,
            branch: branch
          };
        }
      }
    }
  } catch (error) {
    // Git not available or not a git repo
  }

  return null;
}

/**
 * Calculate plan status from progress
 *
 * @param {Object} summary - Summary from status.json
 * @returns {'pending'|'in_progress'|'completed'}
 */
function calculatePlanStatus(summary) {
  if (!summary) return 'pending';

  if (summary.completed === summary.totalTasks && summary.totalTasks > 0) {
    return 'completed';
  } else if (summary.completed > 0 || summary.in_progress > 0) {
    return 'in_progress';
  }

  return 'pending';
}

/**
 * Calculate progress from summary
 *
 * @param {Object} summary - Summary from status.json
 * @returns {Progress}
 */
function calculateProgress(summary) {
  if (!summary) {
    return {
      total: 0,
      completed: 0,
      pending: 0,
      in_progress: 0,
      failed: 0,
      skipped: 0,
      percentage: 0
    };
  }

  return {
    total: summary.totalTasks || 0,
    completed: summary.completed || 0,
    pending: summary.pending || 0,
    in_progress: summary.in_progress || 0,
    failed: summary.failed || 0,
    skipped: summary.skipped || 0,
    percentage: summary.totalTasks > 0
      ? Math.round((summary.completed / summary.totalTasks) * 100)
      : 0
  };
}

/**
 * Group tasks by phase
 *
 * @param {Task[]} tasks - Array of tasks
 * @returns {Phase[]}
 */
function groupTasksByPhase(tasks) {
  const phaseMap = new Map();

  for (const task of tasks || []) {
    const phaseName = task.phase || 'Unknown Phase';
    if (!phaseMap.has(phaseName)) {
      const match = phaseName.match(/Phase\s+(\d+)/);
      phaseMap.set(phaseName, {
        number: match ? parseInt(match[1]) : 0,
        name: phaseName.replace(/^Phase\s+\d+:\s*/, ''),
        total: 0,
        completed: 0
      });
    }
    const phase = phaseMap.get(phaseName);
    phase.total++;
    if (task.status === 'completed') phase.completed++;
  }

  return Array.from(phaseMap.values())
    .sort((a, b) => a.number - b.number)
    .map(p => ({
      ...p,
      percentage: p.total > 0 ? Math.round((p.completed / p.total) * 100) : 0
    }));
}

/**
 * Get recent activity from tasks
 *
 * @param {Task[]} tasks - Array of tasks
 * @param {number} limit - Maximum activities to return
 * @returns {Object[]}
 */
function getRecentActivity(tasks, limit = 10) {
  return (tasks || [])
    .filter(t => t.completedAt || t.startedAt || t.failedAt)
    .map(t => ({
      timestamp: t.completedAt || t.failedAt || t.startedAt,
      taskId: t.id,
      action: t.status,
      description: t.description
    }))
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, limit);
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Get a list of all available plans with summary status
 *
 * @param {Object} [options] - Filter options
 * @param {string} [options.status] - Filter by status
 * @param {boolean} [options.worktree] - Filter by worktree presence
 * @returns {Promise<{plans: PlanSummary[], summary: Object}>}
 */
async function getAllPlans(options = {}) {
  const plansDir = getPlansDir();
  const plans = [];

  let runningCount = 0;
  let completedCount = 0;
  let pendingCount = 0;

  try {
    if (!fs.existsSync(plansDir)) {
      return { plans: [], summary: { totalPlans: 0, running: 0, pending: 0, completed: 0 } };
    }

    const files = fs.readdirSync(plansDir);

    for (const file of files) {
      if (!file.endsWith('.md')) continue;

      const planName = file.replace('.md', '');
      const planPath = path.join(DEFAULTS.PLANS_DIR, file);
      const status = readStatusFile(planName);
      const summary = status?.summary;
      const planStatus = calculatePlanStatus(summary);
      const orchestrator = getOrchestratorStatus(planName);
      const worktree = getWorktreeInfo(planName);

      // Update counts
      if (planStatus === 'completed') {
        completedCount++;
      } else if (orchestrator?.running || planStatus === 'in_progress') {
        if (orchestrator?.running) runningCount++;
      } else {
        pendingCount++;
      }

      // Apply filters
      if (options.status && planStatus !== options.status) continue;
      if (options.worktree === true && !worktree) continue;
      if (options.worktree === false && worktree) continue;

      plans.push({
        name: planName,
        path: planPath,
        title: status?.planName || planName,
        status: planStatus,
        progress: calculateProgress(summary),
        currentPhase: status?.currentPhase || null,
        orchestrator,
        worktree,
        lastUpdatedAt: status?.lastUpdatedAt || null
      });
    }
  } catch (error) {
    console.error('Error reading plans:', error.message);
  }

  return {
    plans,
    summary: {
      totalPlans: plans.length,
      running: runningCount,
      pending: pendingCount,
      completed: completedCount
    }
  };
}

/**
 * Get detailed status for a specific plan
 *
 * @param {string} planName - Plan name (without .md extension)
 * @returns {Promise<PlanDetail|null>}
 */
async function getPlanStatus(planName) {
  const status = readStatusFile(planName);

  if (!status) {
    return null;
  }

  const summary = status.summary || {};
  const tasks = status.tasks || [];
  const planStatus = calculatePlanStatus(summary);
  const orchestrator = getOrchestratorStatus(planName);
  const worktree = getWorktreeInfo(planName);

  return {
    name: planName,
    path: `${DEFAULTS.PLANS_DIR}/${planName}.md`,
    title: status.planName || planName,
    status: planStatus,
    progress: calculateProgress(summary),
    phases: groupTasksByPhase(tasks),
    tasks,
    currentPhase: status.currentPhase || null,
    recentActivity: getRecentActivity(tasks),
    orchestrator,
    worktree,
    lastUpdatedAt: status.lastUpdatedAt || null
  };
}

/**
 * Get lightweight status (optimized for polling)
 *
 * @param {string} planName - Plan name
 * @returns {Promise<Object|null>}
 */
async function getPlanQuickStatus(planName) {
  const status = readStatusFile(planName);

  if (!status) return null;

  const summary = status.summary || {};
  const currentTask = (status.tasks || []).find(t => t.status === 'in_progress');
  const orchestrator = getOrchestratorStatus(planName);

  return {
    name: planName,
    status: calculatePlanStatus(summary),
    progress: {
      total: summary.totalTasks || 0,
      completed: summary.completed || 0,
      percentage: summary.totalTasks > 0
        ? Math.round((summary.completed / summary.totalTasks) * 100)
        : 0
    },
    currentTask: currentTask ? {
      id: currentTask.id,
      description: currentTask.description,
      startedAt: currentTask.startedAt
    } : null,
    orchestrator: orchestrator ? {
      running: true,
      pid: orchestrator.pid
    } : null,
    lastUpdatedAt: status.lastUpdatedAt
  };
}

/**
 * Get tasks for a plan with optional filtering
 *
 * @param {string} planName - Plan name
 * @param {Object} [options] - Filter options
 * @param {string} [options.status] - Filter by task status
 * @param {number} [options.phase] - Filter by phase number
 * @returns {Promise<{tasks: Task[], summary: Object}|null>}
 */
async function getPlanTasks(planName, options = {}) {
  const status = readStatusFile(planName);

  if (!status) return null;

  let tasks = status.tasks || [];

  // Apply filters
  if (options.status) {
    tasks = tasks.filter(t => t.status === options.status);
  }

  if (options.phase !== undefined) {
    tasks = tasks.filter(t => {
      const match = t.phase.match(/Phase\s+(\d+)/);
      return match && parseInt(match[1]) === options.phase;
    });
  }

  return {
    tasks,
    summary: {
      total: tasks.length,
      completed: tasks.filter(t => t.status === 'completed').length,
      pending: tasks.filter(t => t.status === 'pending').length
    }
  };
}

/**
 * Get aggregate statistics across all plans
 *
 * @returns {Promise<Object>}
 */
async function getAggregateStats() {
  const { plans, summary } = await getAllPlans();

  let totalTasks = 0;
  let totalCompleted = 0;
  let totalPending = 0;
  let totalInProgress = 0;
  let totalFailed = 0;

  for (const plan of plans) {
    totalTasks += plan.progress.total;
    totalCompleted += plan.progress.completed;
    totalPending += plan.progress.pending;
    totalInProgress += plan.progress.in_progress;
    totalFailed += plan.progress.failed;
  }

  return {
    plans: summary,
    tasks: {
      total: totalTasks,
      completed: totalCompleted,
      pending: totalPending,
      in_progress: totalInProgress,
      failed: totalFailed,
      percentage: totalTasks > 0
        ? Math.round((totalCompleted / totalTasks) * 100)
        : 0
    }
  };
}

/**
 * Check if a plan exists
 *
 * @param {string} planName - Plan name
 * @returns {Promise<boolean>}
 */
async function planExists(planName) {
  const planPath = path.join(getPlansDir(), `${planName}.md`);
  return fs.existsSync(planPath);
}

/**
 * Watch for changes to a plan's status (for SSE/streaming)
 *
 * @param {string} planName - Plan name
 * @param {Function} callback - Called when status changes
 * @returns {Function} - Cleanup function
 */
function watchPlanStatus(planName, callback) {
  const statusPath = path.join(getOutputsDir(), planName, 'status.json');

  if (!fs.existsSync(statusPath)) {
    console.warn(`Status file not found: ${statusPath}`);
    return () => {};
  }

  const watcher = fs.watchFile(statusPath, { interval: 1000 }, async () => {
    const status = await getPlanQuickStatus(planName);
    if (status) {
      callback(status);
    }
  });

  // Return cleanup function
  return () => {
    fs.unwatchFile(statusPath);
  };
}

/**
 * Watch all plans for changes
 *
 * @param {Function} callback - Called when any plan changes
 * @returns {Function} - Cleanup function
 */
function watchAllPlans(callback) {
  const outputsDir = getOutputsDir();

  if (!fs.existsSync(outputsDir)) {
    console.warn(`Outputs directory not found: ${outputsDir}`);
    return () => {};
  }

  const watcher = fs.watch(outputsDir, { recursive: true }, async (eventType, filename) => {
    if (filename && filename.endsWith('status.json')) {
      const stats = await getAggregateStats();
      callback(stats);
    }
  });

  return () => {
    watcher.close();
  };
}

// =============================================================================
// NextJS Integration Helpers
// =============================================================================

/**
 * Create a Next.js API route handler for plan status
 *
 * Usage in app/api/plans/[name]/route.ts:
 *
 * ```typescript
 * import { createPlanHandler } from '@/lib/plan-status';
 * export const GET = createPlanHandler();
 * ```
 *
 * @returns {Function} - Next.js route handler
 */
function createPlanHandler() {
  return async (request, { params }) => {
    const planName = params.name;
    const status = await getPlanStatus(planName);

    if (!status) {
      return new Response(JSON.stringify({
        success: false,
        error: `Plan not found: ${planName}`,
        code: 'PLAN_NOT_FOUND'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify(status), {
      headers: { 'Content-Type': 'application/json' }
    });
  };
}

/**
 * Create a Next.js API route handler for plan list
 *
 * @returns {Function} - Next.js route handler
 */
function createPlansListHandler() {
  return async (request) => {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const worktree = url.searchParams.get('worktree');

    const result = await getAllPlans({
      status: status || undefined,
      worktree: worktree === 'true' ? true : worktree === 'false' ? false : undefined
    });

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' }
    });
  };
}

/**
 * Revalidation tag for Next.js
 * Use with revalidateTag() to trigger refetch
 */
const PLAN_CACHE_TAG = 'plan-status';

/**
 * Create fetch options for Next.js with caching
 *
 * @param {string} planName - Plan name
 * @param {Object} options - Cache options
 * @returns {Object} - Fetch options
 */
function createFetchOptions(planName, options = {}) {
  return {
    next: {
      tags: [PLAN_CACHE_TAG, `plan:${planName}`],
      revalidate: options.revalidate || 60 // Default 60 seconds
    }
  };
}

// =============================================================================
// Exports
// =============================================================================

module.exports = {
  // Core functions
  getAllPlans,
  getPlanStatus,
  getPlanQuickStatus,
  getPlanTasks,
  getAggregateStats,
  planExists,

  // Watchers
  watchPlanStatus,
  watchAllPlans,

  // NextJS helpers
  createPlanHandler,
  createPlansListHandler,
  createFetchOptions,
  PLAN_CACHE_TAG,

  // Utilities
  getRepoRoot,
  getPlansDir,
  getOutputsDir,
  getOrchestratorStatus,
  getWorktreeInfo
};
