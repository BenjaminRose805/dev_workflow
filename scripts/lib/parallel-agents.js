/**
 * Parallel Agent Execution
 * Runs multiple research agents concurrently with configurable limits.
 */

/**
 * Default configuration
 */
const DEFAULT_CONFIG = {
  maxConcurrent: 3,
  onProgress: null,
  onTaskComplete: null,
  verbose: false,
};

const MIN_CONCURRENT = 1;
const MAX_CONCURRENT = 5;

/**
 * Create initial progress status
 * @param {number} total - Total number of tasks
 * @returns {object} Progress status object
 */
function createProgressStatus(total) {
  return {
    total,
    completed: 0,
    running: 0,
    pending: total,
    errors: 0,
    currentTasks: [],
  };
}

/**
 * Update progress status
 * @param {object} status - Current status
 * @param {object} update - Updates to apply
 * @returns {object} Updated status
 */
function updateStatus(status, update) {
  return {
    ...status,
    ...update,
  };
}

/**
 * Run agents in parallel with concurrency control
 * @param {Array} tasks - Array of tasks to process
 * @param {Function} agentFn - Async function to run for each task (receives task as parameter)
 * @param {object} options - Configuration options
 * @param {number} [options.maxConcurrent=3] - Maximum concurrent agents (1-5)
 * @param {Function} [options.onProgress] - Progress callback receiving status object
 * @param {Function} [options.onTaskComplete] - Callback when each task completes (task, result)
 * @param {boolean} [options.verbose=false] - Enable verbose logging
 * @returns {Promise<Array>} Array of results in same order as tasks
 */
async function runAgentsInParallel(tasks, agentFn, options = {}) {
  // Merge with defaults
  const config = { ...DEFAULT_CONFIG, ...options };

  // Validate maxConcurrent
  const maxConcurrent = Math.max(
    MIN_CONCURRENT,
    Math.min(MAX_CONCURRENT, config.maxConcurrent)
  );

  if (config.verbose) {
    console.error(`[parallel-agents] Starting ${tasks.length} tasks with max concurrency ${maxConcurrent}`);
  }

  // Validate inputs
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return [];
  }

  if (typeof agentFn !== 'function') {
    throw new Error('agentFn must be a function');
  }

  // Initialize progress status
  let status = createProgressStatus(tasks.length);

  // Notify initial progress
  if (config.onProgress) {
    config.onProgress({ ...status });
  }

  // Results array (maintain task order)
  const results = new Array(tasks.length);

  // Task queue
  const queue = tasks.map((task, index) => ({ task, index }));
  let queueIndex = 0;

  /**
   * Process next task from queue
   * @returns {Promise<void>}
   */
  async function processNext() {
    if (queueIndex >= queue.length) {
      return; // No more tasks
    }

    const { task, index } = queue[queueIndex];
    queueIndex++;

    // Get task ID for tracking
    const taskId = task.id || task.task_id || `task-${index}`;

    // Update status
    status = updateStatus(status, {
      running: status.running + 1,
      pending: status.pending - 1,
      currentTasks: [...status.currentTasks, taskId],
    });

    if (config.onProgress) {
      config.onProgress({ ...status });
    }

    if (config.verbose) {
      console.error(`[parallel-agents] Starting task ${taskId} (${index + 1}/${tasks.length})`);
    }

    try {
      // Execute agent function
      const result = await agentFn(task);

      // Store result
      results[index] = result;

      // Check if result indicates error
      const isError = result && (result.error || result.status === 'ERROR');

      // Update status
      status = updateStatus(status, {
        completed: status.completed + 1,
        running: status.running - 1,
        errors: status.errors + (isError ? 1 : 0),
        currentTasks: status.currentTasks.filter(id => id !== taskId),
      });

      if (config.verbose) {
        const statusText = isError ? 'ERROR' : 'SUCCESS';
        console.error(`[parallel-agents] Task ${taskId} completed: ${statusText}`);
      }

      // Notify task completion
      if (config.onTaskComplete) {
        config.onTaskComplete(task, result);
      }

      // Notify progress
      if (config.onProgress) {
        config.onProgress({ ...status });
      }

    } catch (error) {
      // Handle unexpected errors
      const errorResult = {
        task_id: taskId,
        error: {
          code: 'EXECUTION_ERROR',
          message: error.message,
        },
        status: 'ERROR',
      };

      results[index] = errorResult;

      // Update status
      status = updateStatus(status, {
        completed: status.completed + 1,
        running: status.running - 1,
        errors: status.errors + 1,
        currentTasks: status.currentTasks.filter(id => id !== taskId),
      });

      if (config.verbose) {
        console.error(`[parallel-agents] Task ${taskId} failed: ${error.message}`);
      }

      // Notify task completion with error
      if (config.onTaskComplete) {
        config.onTaskComplete(task, errorResult);
      }

      // Notify progress
      if (config.onProgress) {
        config.onProgress({ ...status });
      }
    }
  }

  /**
   * Worker function - processes tasks from queue
   * @returns {Promise<void>}
   */
  async function worker() {
    while (queueIndex < queue.length) {
      await processNext();
    }
  }

  // Start workers
  const workers = [];
  const workerCount = Math.min(maxConcurrent, tasks.length);

  for (let i = 0; i < workerCount; i++) {
    workers.push(worker());
  }

  // Wait for all workers to complete
  await Promise.all(workers);

  if (config.verbose) {
    console.error(`[parallel-agents] All tasks completed: ${status.completed}/${status.total} (${status.errors} errors)`);
  }

  return results;
}

module.exports = {
  runAgentsInParallel,
};
