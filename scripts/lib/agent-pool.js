/**
 * Enhanced Agent Pool Management
 *
 * Provides advanced agent execution with priority queues, health monitoring,
 * and graceful resource management.
 *
 * Features:
 * - Priority queue system (HIGH, NORMAL, LOW)
 * - Configurable concurrency limits (default: 3)
 * - Health monitoring (timeout tracking, error rate)
 * - Graceful shutdown and cleanup
 * - Pool statistics and metrics
 * - Integration with existing agent-cache and agent-launcher
 *
 * Usage:
 *   const { AgentPool } = require('./agent-pool');
 *
 *   const pool = new AgentPool({ maxConcurrent: 3 });
 *
 *   // Add tasks with priority
 *   pool.addTask({
 *     id: 'task-1',
 *     type: 'verify',
 *     priority: AgentPool.Priority.HIGH,
 *     fn: async () => { ... }
 *   });
 *
 *   // Start processing
 *   await pool.start();
 *
 *   // Get statistics
 *   const stats = pool.getStats();
 *
 *   // Graceful shutdown
 *   await pool.shutdown();
 */

const EventEmitter = require('events');
const { launchResearchAgent, ErrorCodes } = require('./agent-launcher');
const { getCachedResult, setCachedResult, generateCacheKey } = require('./agent-cache');

/**
 * Priority levels for task queue
 */
const Priority = {
  HIGH: 3,    // User-requested tasks
  NORMAL: 2,  // Standard tasks
  LOW: 1,     // Speculative/background tasks
};

/**
 * Agent pool state
 */
const PoolState = {
  IDLE: 'IDLE',
  RUNNING: 'RUNNING',
  PAUSED: 'PAUSED',
  SHUTTING_DOWN: 'SHUTTING_DOWN',
  SHUTDOWN: 'SHUTDOWN',
};

/**
 * Task states
 */
const TaskState = {
  QUEUED: 'QUEUED',
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
  TIMEOUT: 'TIMEOUT',
};

/**
 * Default pool configuration
 */
const DEFAULT_CONFIG = {
  maxConcurrent: 3,              // Max concurrent agents
  minConcurrent: 1,              // Min concurrent agents
  maxConcurrent_limit: 10,       // Hard limit on max concurrent
  healthCheckInterval: 5000,     // Health check interval (ms)
  errorRateThreshold: 0.5,       // Error rate threshold (0-1)
  timeoutThreshold: 0.3,         // Timeout rate threshold (0-1)
  maxRetries: 1,                 // Max retries per task
  retryDelay: 1000,              // Delay between retries (ms)
  enableCache: true,             // Enable result caching
  cacheTTL: 3600000,             // Cache TTL (1 hour)
  verbose: false,                // Verbose logging
};

/**
 * Agent Pool Manager
 * Manages a pool of agent workers with priority queuing and health monitoring
 */
class AgentPool extends EventEmitter {
  /**
   * Create an agent pool
   * @param {object} config - Pool configuration
   */
  constructor(config = {}) {
    super();

    // Merge configuration with defaults
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Validate configuration
    this._validateConfig();

    // Pool state
    this.state = PoolState.IDLE;

    // Task queues by priority (high, normal, low)
    this.queues = {
      [Priority.HIGH]: [],
      [Priority.NORMAL]: [],
      [Priority.LOW]: [],
    };

    // Active tasks (running)
    this.activeTasks = new Map();

    // Completed tasks history (limited to last 100)
    this.completedTasks = [];
    this.maxCompletedHistory = 100;

    // Statistics
    this.stats = {
      tasksQueued: 0,
      tasksStarted: 0,
      tasksCompleted: 0,
      tasksFailed: 0,
      tasksTimeout: 0,
      tasksCancelled: 0,
      totalExecutionTime: 0,
      cacheHits: 0,
      cacheMisses: 0,
      errorsLast10: [],      // Last 10 errors
      timeoutsLast10: [],    // Last 10 timeouts
    };

    // Health monitoring
    this.healthCheck = {
      interval: null,
      lastCheck: null,
      errorRate: 0,
      timeoutRate: 0,
      isHealthy: true,
    };

    // Worker management
    this.workers = [];
    this.workerCount = 0;

    // Shutdown tracking
    this.shutdownPromise = null;
    this.shutdownResolve = null;

    // Verbose logging helper
    this._verbose = this.config.verbose ? (...args) => {
      console.error('[agent-pool]', ...args);
    } : () => {};
  }

  /**
   * Validate configuration
   * @private
   */
  _validateConfig() {
    const { maxConcurrent, minConcurrent, maxConcurrent_limit } = this.config;

    if (maxConcurrent < 1 || maxConcurrent > maxConcurrent_limit) {
      throw new Error(`maxConcurrent must be between 1 and ${maxConcurrent_limit}`);
    }

    if (minConcurrent < 1 || minConcurrent > maxConcurrent) {
      throw new Error(`minConcurrent must be between 1 and ${maxConcurrent}`);
    }
  }

  /**
   * Add a task to the queue
   * @param {object} task - Task configuration
   * @param {string} task.id - Unique task ID
   * @param {Function} task.fn - Async function to execute
   * @param {number} [task.priority=Priority.NORMAL] - Task priority
   * @param {object} [task.cacheKey] - Optional cache key components
   * @param {object} [task.metadata] - Optional metadata
   * @returns {string} Task ID
   */
  addTask(task) {
    if (this.state === PoolState.SHUTDOWN || this.state === PoolState.SHUTTING_DOWN) {
      throw new Error('Cannot add tasks to shutdown pool');
    }

    const {
      id = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      fn,
      priority = Priority.NORMAL,
      cacheKey = null,
      metadata = {},
    } = task;

    if (typeof fn !== 'function') {
      throw new Error('Task fn must be a function');
    }

    // Validate priority
    const validPriorities = Object.values(Priority);
    if (!validPriorities.includes(priority)) {
      throw new Error(`Invalid priority. Must be one of: ${validPriorities.join(', ')}`);
    }

    // Create task object
    const taskObj = {
      id,
      fn,
      priority,
      cacheKey,
      metadata,
      state: TaskState.QUEUED,
      addedAt: Date.now(),
      startedAt: null,
      completedAt: null,
      result: null,
      error: null,
      retries: 0,
    };

    // Add to appropriate priority queue
    this.queues[priority].push(taskObj);
    this.stats.tasksQueued++;

    this._verbose(`Task ${id} added to queue (priority: ${priority})`);
    this.emit('taskAdded', taskObj);

    // If pool is running, trigger worker to pick up task
    if (this.state === PoolState.RUNNING) {
      this._tryStartTask();
    }

    return id;
  }

  /**
   * Get next task from priority queues
   * @private
   * @returns {object|null} Next task or null if no tasks
   */
  _getNextTask() {
    // Check queues in priority order: HIGH -> NORMAL -> LOW
    for (const priority of [Priority.HIGH, Priority.NORMAL, Priority.LOW]) {
      const queue = this.queues[priority];
      if (queue.length > 0) {
        return queue.shift();
      }
    }
    return null;
  }

  /**
   * Try to start a new task if capacity available
   * @private
   */
  _tryStartTask() {
    // Check if we can start more tasks
    if (this.activeTasks.size >= this.config.maxConcurrent) {
      return; // At capacity
    }

    if (this.state !== PoolState.RUNNING) {
      return; // Not running
    }

    // Get next task
    const task = this._getNextTask();
    if (!task) {
      return; // No tasks available
    }

    // Start the task
    this._executeTask(task);
  }

  /**
   * Execute a task
   * @private
   * @param {object} task - Task to execute
   */
  async _executeTask(task) {
    task.state = TaskState.RUNNING;
    task.startedAt = Date.now();

    this.activeTasks.set(task.id, task);
    this.stats.tasksStarted++;

    this._verbose(`Starting task ${task.id} (active: ${this.activeTasks.size}/${this.config.maxConcurrent})`);
    this.emit('taskStarted', task);

    try {
      // Check cache if enabled and cache key provided
      let result = null;
      let fromCache = false;

      if (this.config.enableCache && task.cacheKey) {
        const cacheKeyStr = typeof task.cacheKey === 'string'
          ? task.cacheKey
          : generateCacheKey(task.cacheKey.description || task.id, task.cacheKey.files || []);

        result = getCachedResult(cacheKeyStr, task.cacheKey.files || []);

        if (result !== null) {
          fromCache = true;
          this.stats.cacheHits++;
          this._verbose(`Cache hit for task ${task.id}`);
        } else {
          this.stats.cacheMisses++;
        }
      }

      // Execute task function if not cached
      if (!fromCache) {
        result = await task.fn();

        // Cache result if enabled
        if (this.config.enableCache && task.cacheKey && result) {
          const cacheKeyStr = typeof task.cacheKey === 'string'
            ? task.cacheKey
            : generateCacheKey(task.cacheKey.description || task.id, task.cacheKey.files || []);

          setCachedResult(cacheKeyStr, result, {
            ttlMs: this.config.cacheTTL,
            files: task.cacheKey.files || [],
            taskDescription: task.cacheKey.description || task.id,
          });
        }
      }

      // Task completed successfully
      task.state = TaskState.COMPLETED;
      task.completedAt = Date.now();
      task.result = result;
      task.fromCache = fromCache;

      this._handleTaskCompletion(task);

    } catch (error) {
      // Check if error is a timeout
      const isTimeout = error.code === ErrorCodes.TIMEOUT ||
                       error.message?.includes('timed out') ||
                       error.message?.includes('timeout');

      if (isTimeout) {
        task.state = TaskState.TIMEOUT;
        this.stats.tasksTimeout++;
        this.stats.timeoutsLast10.push({ taskId: task.id, timestamp: Date.now() });
        if (this.stats.timeoutsLast10.length > 10) {
          this.stats.timeoutsLast10.shift();
        }
      } else {
        task.state = TaskState.FAILED;
        this.stats.tasksFailed++;
        this.stats.errorsLast10.push({
          taskId: task.id,
          error: error.message,
          timestamp: Date.now()
        });
        if (this.stats.errorsLast10.length > 10) {
          this.stats.errorsLast10.shift();
        }
      }

      task.completedAt = Date.now();
      task.error = {
        message: error.message,
        code: error.code || 'UNKNOWN_ERROR',
        stack: error.stack,
      };

      // Check if should retry
      if (task.retries < this.config.maxRetries && !isTimeout) {
        this._verbose(`Task ${task.id} failed, retrying (${task.retries + 1}/${this.config.maxRetries})`);
        task.retries++;

        // Re-queue task after delay
        setTimeout(() => {
          if (this.state === PoolState.RUNNING) {
            task.state = TaskState.QUEUED;
            task.startedAt = null;
            task.completedAt = null;
            task.error = null;
            this.queues[task.priority].unshift(task); // Add to front of queue
            this._tryStartTask();
          }
        }, this.config.retryDelay);

        this.activeTasks.delete(task.id);
        return;
      }

      this._handleTaskCompletion(task);
    }
  }

  /**
   * Handle task completion (success or failure)
   * @private
   * @param {object} task - Completed task
   */
  _handleTaskCompletion(task) {
    const executionTime = task.completedAt - task.startedAt;
    this.stats.totalExecutionTime += executionTime;

    if (task.state === TaskState.COMPLETED) {
      this.stats.tasksCompleted++;
    }

    // Move to completed history
    this.completedTasks.push({
      id: task.id,
      state: task.state,
      priority: task.priority,
      executionTime,
      fromCache: task.fromCache,
      completedAt: task.completedAt,
      error: task.error,
    });

    // Trim history
    if (this.completedTasks.length > this.maxCompletedHistory) {
      this.completedTasks.shift();
    }

    // Remove from active tasks
    this.activeTasks.delete(task.id);

    this._verbose(`Task ${task.id} ${task.state} in ${executionTime}ms (active: ${this.activeTasks.size})`);
    this.emit('taskCompleted', task);

    // Try to start next task
    this._tryStartTask();

    // Check if pool is empty and shutting down
    if (this.state === PoolState.SHUTTING_DOWN &&
        this.activeTasks.size === 0 &&
        this._getTotalQueueSize() === 0) {
      this._completeShutdown();
    }
  }

  /**
   * Get total number of queued tasks
   * @private
   * @returns {number} Total queued tasks
   */
  _getTotalQueueSize() {
    return Object.values(this.queues).reduce((sum, queue) => sum + queue.length, 0);
  }

  /**
   * Start the agent pool
   * @returns {Promise<void>}
   */
  async start() {
    if (this.state === PoolState.RUNNING) {
      this._verbose('Pool already running');
      return;
    }

    if (this.state === PoolState.SHUTDOWN) {
      throw new Error('Cannot start a shutdown pool');
    }

    this.state = PoolState.RUNNING;
    this._verbose('Pool started');
    this.emit('poolStarted');

    // Start health monitoring
    this._startHealthCheck();

    // Start processing queued tasks
    const queueSize = this._getTotalQueueSize();
    const workersToStart = Math.min(queueSize, this.config.maxConcurrent);

    for (let i = 0; i < workersToStart; i++) {
      this._tryStartTask();
    }
  }

  /**
   * Pause the agent pool
   * Active tasks continue, but no new tasks will start
   * @returns {Promise<void>}
   */
  async pause() {
    if (this.state !== PoolState.RUNNING) {
      return;
    }

    this.state = PoolState.PAUSED;
    this._verbose('Pool paused');
    this.emit('poolPaused');

    // Stop health check
    this._stopHealthCheck();
  }

  /**
   * Resume the agent pool
   * @returns {Promise<void>}
   */
  async resume() {
    if (this.state !== PoolState.PAUSED) {
      return;
    }

    this.state = PoolState.RUNNING;
    this._verbose('Pool resumed');
    this.emit('poolResumed');

    // Restart health check
    this._startHealthCheck();

    // Resume task processing
    const queueSize = this._getTotalQueueSize();
    const availableSlots = this.config.maxConcurrent - this.activeTasks.size;
    const tasksToStart = Math.min(queueSize, availableSlots);

    for (let i = 0; i < tasksToStart; i++) {
      this._tryStartTask();
    }
  }

  /**
   * Gracefully shutdown the pool
   * Waits for active tasks to complete, cancels queued tasks
   * @param {object} options - Shutdown options
   * @param {boolean} [options.force=false] - Force immediate shutdown
   * @param {number} [options.timeout=30000] - Timeout for graceful shutdown (ms)
   * @returns {Promise<void>}
   */
  async shutdown(options = {}) {
    const { force = false, timeout = 30000 } = options;

    if (this.state === PoolState.SHUTDOWN) {
      return; // Already shutdown
    }

    if (this.state === PoolState.SHUTTING_DOWN) {
      return this.shutdownPromise; // Already shutting down
    }

    this.state = PoolState.SHUTTING_DOWN;
    this._verbose('Pool shutting down...');
    this.emit('poolShuttingDown');

    // Stop health check
    this._stopHealthCheck();

    // Cancel all queued tasks
    const cancelledCount = this._cancelQueuedTasks();
    this._verbose(`Cancelled ${cancelledCount} queued tasks`);

    // If force or no active tasks, shutdown immediately
    if (force || this.activeTasks.size === 0) {
      this._completeShutdown();
      return Promise.resolve();
    }

    // Wait for active tasks to complete
    this.shutdownPromise = new Promise((resolve) => {
      this.shutdownResolve = resolve;
    });

    // Set timeout for graceful shutdown
    const timeoutHandle = setTimeout(() => {
      this._verbose('Shutdown timeout reached, forcing shutdown');
      this._completeShutdown();
    }, timeout);

    await this.shutdownPromise;
    clearTimeout(timeoutHandle);
  }

  /**
   * Cancel all queued tasks
   * @private
   * @returns {number} Number of cancelled tasks
   */
  _cancelQueuedTasks() {
    let count = 0;

    for (const priority of Object.keys(this.queues)) {
      const queue = this.queues[priority];

      while (queue.length > 0) {
        const task = queue.shift();
        task.state = TaskState.CANCELLED;
        task.completedAt = Date.now();

        this.completedTasks.push({
          id: task.id,
          state: task.state,
          priority: task.priority,
          completedAt: task.completedAt,
        });

        this.stats.tasksCancelled++;
        count++;

        this.emit('taskCancelled', task);
      }
    }

    return count;
  }

  /**
   * Complete the shutdown process
   * @private
   */
  _completeShutdown() {
    this.state = PoolState.SHUTDOWN;
    this._verbose('Pool shutdown complete');
    this.emit('poolShutdown');

    if (this.shutdownResolve) {
      this.shutdownResolve();
      this.shutdownResolve = null;
      this.shutdownPromise = null;
    }
  }

  /**
   * Start health check monitoring
   * @private
   */
  _startHealthCheck() {
    if (this.healthCheck.interval) {
      return; // Already running
    }

    this.healthCheck.interval = setInterval(() => {
      this._performHealthCheck();
    }, this.config.healthCheckInterval);

    // Initial health check
    this._performHealthCheck();
  }

  /**
   * Stop health check monitoring
   * @private
   */
  _stopHealthCheck() {
    if (this.healthCheck.interval) {
      clearInterval(this.healthCheck.interval);
      this.healthCheck.interval = null;
    }
  }

  /**
   * Perform health check
   * @private
   */
  _performHealthCheck() {
    this.healthCheck.lastCheck = Date.now();

    const totalCompleted = this.stats.tasksCompleted + this.stats.tasksFailed + this.stats.tasksTimeout;

    if (totalCompleted === 0) {
      this.healthCheck.errorRate = 0;
      this.healthCheck.timeoutRate = 0;
      this.healthCheck.isHealthy = true;
      return;
    }

    // Calculate error and timeout rates
    this.healthCheck.errorRate = this.stats.tasksFailed / totalCompleted;
    this.healthCheck.timeoutRate = this.stats.tasksTimeout / totalCompleted;

    // Check if pool is healthy
    const wasHealthy = this.healthCheck.isHealthy;
    this.healthCheck.isHealthy =
      this.healthCheck.errorRate < this.config.errorRateThreshold &&
      this.healthCheck.timeoutRate < this.config.timeoutThreshold;

    // Emit health change event
    if (wasHealthy !== this.healthCheck.isHealthy) {
      this._verbose(`Pool health changed: ${this.healthCheck.isHealthy ? 'HEALTHY' : 'UNHEALTHY'}`);
      this.emit('healthChanged', this.healthCheck);
    }

    this.emit('healthCheck', this.healthCheck);
  }

  /**
   * Get pool statistics
   * @returns {object} Statistics object
   */
  getStats() {
    const queueSizes = {
      high: this.queues[Priority.HIGH].length,
      normal: this.queues[Priority.NORMAL].length,
      low: this.queues[Priority.LOW].length,
      total: this._getTotalQueueSize(),
    };

    const avgExecutionTime = this.stats.tasksCompleted > 0
      ? Math.round(this.stats.totalExecutionTime / this.stats.tasksCompleted)
      : 0;

    const totalCompleted = this.stats.tasksCompleted + this.stats.tasksFailed + this.stats.tasksTimeout;
    const successRate = totalCompleted > 0
      ? (this.stats.tasksCompleted / totalCompleted * 100).toFixed(2) + '%'
      : '0%';

    const cacheHitRate = (this.stats.cacheHits + this.stats.cacheMisses) > 0
      ? (this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses) * 100).toFixed(2) + '%'
      : '0%';

    return {
      state: this.state,
      health: {
        isHealthy: this.healthCheck.isHealthy,
        errorRate: (this.healthCheck.errorRate * 100).toFixed(2) + '%',
        timeoutRate: (this.healthCheck.timeoutRate * 100).toFixed(2) + '%',
        lastCheck: this.healthCheck.lastCheck,
      },
      queue: queueSizes,
      active: {
        count: this.activeTasks.size,
        tasks: Array.from(this.activeTasks.values()).map(t => ({
          id: t.id,
          priority: t.priority,
          startedAt: t.startedAt,
          runningFor: Date.now() - t.startedAt,
        })),
      },
      tasks: {
        queued: this.stats.tasksQueued,
        started: this.stats.tasksStarted,
        completed: this.stats.tasksCompleted,
        failed: this.stats.tasksFailed,
        timeout: this.stats.tasksTimeout,
        cancelled: this.stats.tasksCancelled,
        successRate,
      },
      performance: {
        avgExecutionTime: `${avgExecutionTime}ms`,
        totalExecutionTime: `${this.stats.totalExecutionTime}ms`,
      },
      cache: {
        enabled: this.config.enableCache,
        hits: this.stats.cacheHits,
        misses: this.stats.cacheMisses,
        hitRate: cacheHitRate,
      },
      recent: {
        errors: this.stats.errorsLast10,
        timeouts: this.stats.timeoutsLast10,
      },
    };
  }

  /**
   * Get current pool state
   * @returns {string} Current state
   */
  getState() {
    return this.state;
  }

  /**
   * Check if pool is healthy
   * @returns {boolean} True if healthy
   */
  isHealthy() {
    return this.healthCheck.isHealthy;
  }

  /**
   * Wait for all tasks to complete
   * @param {number} [timeout=0] - Optional timeout in ms (0 = no timeout)
   * @returns {Promise<void>}
   */
  async waitForCompletion(timeout = 0) {
    return new Promise((resolve, reject) => {
      const check = () => {
        if (this.activeTasks.size === 0 && this._getTotalQueueSize() === 0) {
          resolve();
          return true;
        }
        return false;
      };

      // Check immediately
      if (check()) {
        return;
      }

      // Set up timeout if specified
      let timeoutHandle = null;
      if (timeout > 0) {
        timeoutHandle = setTimeout(() => {
          this.removeListener('taskCompleted', onTaskComplete);
          reject(new Error('Timeout waiting for tasks to complete'));
        }, timeout);
      }

      // Listen for task completion
      const onTaskComplete = () => {
        if (check()) {
          this.removeListener('taskCompleted', onTaskComplete);
          if (timeoutHandle) {
            clearTimeout(timeoutHandle);
          }
        }
      };

      this.on('taskCompleted', onTaskComplete);
    });
  }
}

// Expose constants
AgentPool.Priority = Priority;
AgentPool.PoolState = PoolState;
AgentPool.TaskState = TaskState;

module.exports = {
  AgentPool,
  Priority,
  PoolState,
  TaskState,
};
