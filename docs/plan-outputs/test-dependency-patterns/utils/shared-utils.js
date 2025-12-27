/**
 * Shared Utility Functions for Test Dependency Patterns
 * Created: 2025-12-26
 */

/**
 * Parse task dependencies from a task description
 * @param {string} description - Task description containing (depends: X.Y, X.Z)
 * @returns {string[]} Array of dependency task IDs
 */
function parseDependencies(description) {
  const match = description.match(/\(depends:\s*([^)]+)\)/i);
  if (!match) return [];
  return match[1].split(',').map(dep => dep.trim());
}

/**
 * Check if all dependencies are satisfied
 * @param {string[]} dependencies - Array of dependency task IDs
 * @param {Object} taskStatus - Map of task ID to status
 * @returns {boolean} True if all dependencies are completed
 */
function areDependenciesSatisfied(dependencies, taskStatus) {
  return dependencies.every(depId => {
    const status = taskStatus[depId];
    return status === 'completed' || status === 'skipped';
  });
}

/**
 * Find all ready tasks (pending with satisfied dependencies)
 * @param {Object[]} tasks - Array of task objects
 * @returns {Object[]} Tasks that are ready to execute
 */
function findReadyTasks(tasks) {
  const statusMap = {};
  tasks.forEach(task => {
    statusMap[task.id] = task.status;
  });

  return tasks.filter(task => {
    if (task.status !== 'pending') return false;
    const deps = task.dependencies || [];
    return areDependenciesSatisfied(deps, statusMap);
  });
}

/**
 * Calculate critical path length through task graph
 * @param {Object[]} tasks - Array of task objects with dependencies
 * @returns {number} Length of the critical path
 */
function calculateCriticalPathLength(tasks) {
  const memo = new Map();
  const taskMap = new Map(tasks.map(t => [t.id, t]));

  function getDepth(taskId) {
    if (memo.has(taskId)) return memo.get(taskId);

    const task = taskMap.get(taskId);
    if (!task || !task.dependencies || task.dependencies.length === 0) {
      memo.set(taskId, 1);
      return 1;
    }

    const maxDepDeth = Math.max(...task.dependencies.map(getDepth));
    const depth = maxDepDeth + 1;
    memo.set(taskId, depth);
    return depth;
  }

  let maxDepth = 0;
  for (const task of tasks) {
    maxDepth = Math.max(maxDepth, getDepth(task.id));
  }
  return maxDepth;
}

/**
 * Detect cycles in dependency graph
 * @param {Object[]} tasks - Array of task objects with dependencies
 * @returns {string[]|null} Cycle path if found, null otherwise
 */
function detectCycles(tasks) {
  const taskMap = new Map(tasks.map(t => [t.id, t]));
  const visited = new Set();
  const recursionStack = new Set();

  function dfs(taskId, path) {
    if (recursionStack.has(taskId)) {
      return [...path, taskId];
    }
    if (visited.has(taskId)) return null;

    visited.add(taskId);
    recursionStack.add(taskId);

    const task = taskMap.get(taskId);
    if (task && task.dependencies) {
      for (const depId of task.dependencies) {
        const cycle = dfs(depId, [...path, taskId]);
        if (cycle) return cycle;
      }
    }

    recursionStack.delete(taskId);
    return null;
  }

  for (const task of tasks) {
    const cycle = dfs(task.id, []);
    if (cycle) return cycle;
  }
  return null;
}

/**
 * Format task status for display
 * @param {string} status - Task status
 * @returns {string} Formatted status with symbol
 */
function formatStatus(status) {
  const symbols = {
    'completed': '✓',
    'in_progress': '◐',
    'pending': '◯',
    'failed': '✗',
    'skipped': '⊘'
  };
  return `${symbols[status] || '?'} ${status}`;
}

module.exports = {
  parseDependencies,
  areDependenciesSatisfied,
  findReadyTasks,
  calculateCriticalPathLength,
  detectCycles,
  formatStatus
};
