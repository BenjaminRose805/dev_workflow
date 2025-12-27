/**
 * Combined Strategies Module
 * Task 3.4: Combine strategies (depends: 3.2, 3.3)
 *
 * This module combines Strategy A and Strategy B from the diamond pattern
 * to create a unified approach for handling dependency patterns.
 *
 * Diamond Pattern:
 *      3.1 (shared interface)
 *      /   \
 *    3.2   3.3  (parallel strategies)
 *      \   /
 *       3.4    (this combined strategy)
 */

/**
 * Strategy A: Eager Execution
 * Executes tasks as soon as dependencies are met
 */
const strategyA = {
  name: 'Eager Execution',
  priority: 'throughput',

  selectTasks(readyTasks, maxParallel) {
    // Take as many tasks as possible up to the limit
    return readyTasks.slice(0, maxParallel);
  },

  shouldExecute(task, context) {
    // Execute immediately if ready
    return context.areDependenciesMet(task.id);
  }
};

/**
 * Strategy B: Critical Path First
 * Prioritizes tasks on the critical path
 */
const strategyB = {
  name: 'Critical Path First',
  priority: 'latency',

  selectTasks(readyTasks, maxParallel, criticalPath) {
    // Sort by whether task is on critical path
    const sorted = [...readyTasks].sort((a, b) => {
      const aOnPath = criticalPath.includes(a.id) ? 0 : 1;
      const bOnPath = criticalPath.includes(b.id) ? 0 : 1;
      return aOnPath - bOnPath;
    });
    return sorted.slice(0, maxParallel);
  },

  shouldExecute(task, context) {
    // Prioritize critical path tasks
    if (context.criticalPath.includes(task.id)) {
      return context.areDependenciesMet(task.id);
    }
    // Only execute non-critical if resources available
    return context.areDependenciesMet(task.id) && context.hasAvailableSlots();
  }
};

/**
 * Combined Strategy: Adaptive Scheduling
 * Uses Strategy A for throughput when many tasks ready,
 * Uses Strategy B for latency when on critical path
 */
const combinedStrategy = {
  name: 'Adaptive Scheduling',
  priority: 'balanced',
  strategies: [strategyA, strategyB],

  /**
   * Select tasks for execution using adaptive strategy
   * @param {Object[]} readyTasks - Tasks ready to execute
   * @param {number} maxParallel - Max concurrent tasks
   * @param {Object} context - Execution context
   * @returns {Object[]} Tasks to execute
   */
  selectTasks(readyTasks, maxParallel, context) {
    const { criticalPath = [] } = context;

    // If many tasks ready (high parallelism available), use eager strategy
    if (readyTasks.length > maxParallel * 2) {
      return strategyA.selectTasks(readyTasks, maxParallel);
    }

    // If on critical path section, prioritize it
    const criticalReady = readyTasks.filter(t => criticalPath.includes(t.id));
    if (criticalReady.length > 0) {
      return strategyB.selectTasks(readyTasks, maxParallel, criticalPath);
    }

    // Default: eager execution
    return strategyA.selectTasks(readyTasks, maxParallel);
  },

  /**
   * Decide if a specific task should execute now
   * @param {Object} task - Task to evaluate
   * @param {Object} context - Execution context
   * @returns {boolean} True if task should execute
   */
  shouldExecute(task, context) {
    // Always check dependencies first
    if (!context.areDependenciesMet(task.id)) {
      return false;
    }

    // If on critical path, always execute when ready
    if (context.criticalPath && context.criticalPath.includes(task.id)) {
      return true;
    }

    // Otherwise, execute if slots available
    return context.hasAvailableSlots();
  },

  /**
   * Get strategy statistics
   * @returns {Object} Strategy usage stats
   */
  getStats() {
    return {
      name: this.name,
      components: this.strategies.map(s => s.name),
      adaptiveThreshold: 'maxParallel * 2'
    };
  }
};

module.exports = {
  strategyA,
  strategyB,
  combinedStrategy,
  default: combinedStrategy
};
