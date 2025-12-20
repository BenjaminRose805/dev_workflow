/**
 * Speculative Research Pipeline
 *
 * Implements intelligent pre-fetching of research for upcoming tasks.
 * While the main agent executes Task N, a background agent speculatively
 * researches Task N+1 using LOW priority to avoid blocking user work.
 *
 * Key Features:
 * - Sequential task execution with look-ahead pre-fetching
 * - Separate cache directory (.claude/cache/speculative/)
 * - Automatic cache invalidation on file changes
 * - Wait time tracking and metrics
 * - Integration with agent-pool's priority system
 *
 * Usage:
 *   const { SpeculativeResearchPipeline } = require('./speculative-research');
 *
 *   const pipeline = new SpeculativeResearchPipeline({
 *     agentPool: pool,
 *     lookAhead: 1, // Pre-fetch 1 task ahead
 *   });
 *
 *   const results = await pipeline.executeTasks([
 *     { id: 'task-1', template: 'research.txt', variables: {...} },
 *     { id: 'task-2', template: 'analyze.txt', variables: {...} },
 *     { id: 'task-3', template: 'verify.txt', variables: {...} },
 *   ]);
 *
 *   console.log(pipeline.getMetrics()); // View wait time reduction
 */

const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');
const { AgentPool, Priority } = require('./agent-pool');
const { launchResearchAgent } = require('./agent-launcher');
const { generateCacheKey, CACHE_DIR: RESEARCH_CACHE_DIR } = require('./agent-cache');
const { resolvePath, fileExists, writeFile, readFile, getFileMtime } = require('./file-utils');

// Constants
const SPECULATIVE_CACHE_DIR = '.claude/cache/speculative';
const DEFAULT_TTL_MS = 30 * 60 * 1000; // 30 minutes (shorter than research cache)
const CACHE_VERSION = 1;

/**
 * Task execution states
 */
const TaskExecutionState = {
  PENDING: 'PENDING',           // Not yet started
  PREFETCHING: 'PREFETCHING',   // Speculative research in progress
  PREFETCHED: 'PREFETCHED',     // Speculative research complete
  EXECUTING: 'EXECUTING',       // Main execution in progress
  COMPLETED: 'COMPLETED',       // Execution complete
  FAILED: 'FAILED',            // Execution failed
  CANCELLED: 'CANCELLED',       // Execution cancelled
};

/**
 * Default configuration
 */
const DEFAULT_CONFIG = {
  lookAhead: 1,                 // Number of tasks to pre-fetch ahead
  enableSpeculation: true,      // Enable speculative pre-fetching
  cacheTTL: DEFAULT_TTL_MS,     // Cache TTL for speculative results
  trackMetrics: true,           // Track timing metrics
  verbose: false,               // Verbose logging
  autoCleanup: true,            // Auto cleanup expired entries
};

/**
 * Speculative Research Pipeline
 * Executes tasks sequentially with intelligent pre-fetching
 */
class SpeculativeResearchPipeline extends EventEmitter {
  /**
   * Create a speculative research pipeline
   * @param {object} config - Configuration object
   * @param {AgentPool} [config.agentPool] - Optional agent pool (creates new if not provided)
   * @param {number} [config.lookAhead=1] - Number of tasks to pre-fetch ahead
   * @param {boolean} [config.enableSpeculation=true] - Enable speculative pre-fetching
   * @param {number} [config.cacheTTL] - Cache TTL in milliseconds
   * @param {boolean} [config.trackMetrics=true] - Track timing metrics
   * @param {boolean} [config.verbose=false] - Verbose logging
   */
  constructor(config = {}) {
    super();

    // Merge configuration
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Use provided agent pool or create new one
    this.agentPool = config.agentPool || new AgentPool({
      maxConcurrent: 3,
      enableCache: false, // We handle caching separately
      verbose: this.config.verbose,
    });

    // Task queue and state tracking
    this.tasks = [];
    this.taskStates = new Map(); // taskId -> state
    this.taskResults = new Map(); // taskId -> result
    this.speculativeTaskIds = new Map(); // taskId -> pool task ID

    // Metrics tracking
    this.metrics = {
      totalTasks: 0,
      tasksCompleted: 0,
      tasksFailed: 0,
      speculativeCacheHits: 0,
      speculativeCacheMisses: 0,
      totalWaitTime: 0,        // Time spent waiting for research
      totalSavedTime: 0,       // Time saved by speculation
      waitTimes: [],           // Individual wait times per task
      taskTimings: [],         // Detailed timing per task
    };

    // Execution state
    this.isExecuting = false;
    this.currentTaskIndex = -1;

    // Verbose logging helper
    this._verbose = this.config.verbose ? (...args) => {
      console.error('[speculative-research]', ...args);
    } : () => {};

    // Initialize cache directory
    this._ensureSpeculativeCacheDir();

    // Auto cleanup on init
    if (this.config.autoCleanup) {
      this._cleanupExpiredEntries();
    }
  }

  /**
   * Ensure speculative cache directory exists
   * @private
   */
  _ensureSpeculativeCacheDir() {
    try {
      const cacheDir = resolvePath(SPECULATIVE_CACHE_DIR);
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }
    } catch (error) {
      this._verbose(`Failed to create speculative cache directory: ${error.message}`);
    }
  }

  /**
   * Generate speculative cache key
   * @private
   * @param {object} task - Task configuration
   * @returns {string} Cache key
   */
  _generateSpeculativeCacheKey(task) {
    const keyInput = {
      template: task.template,
      variables: task.variables || {},
      files: task.files || [],
    };
    return generateCacheKey(JSON.stringify(keyInput), task.files || []);
  }

  /**
   * Get speculative cache file path
   * @private
   * @param {string} key - Cache key
   * @returns {string} Absolute path to cache file
   */
  _getSpeculativeCacheFilePath(key) {
    return resolvePath(SPECULATIVE_CACHE_DIR, `${key}.json`);
  }

  /**
   * Validate speculative cache entry
   * @private
   * @param {object} entry - Cache entry
   * @param {string[]} files - Files to validate
   * @returns {boolean} True if valid
   */
  _isSpeculativeCacheValid(entry, files = []) {
    // Check version
    if (entry.version !== CACHE_VERSION) {
      return false;
    }

    // Check TTL
    const now = new Date().toISOString();
    if (entry.expires_at && entry.expires_at < now) {
      return false;
    }

    // Check file mtimes
    if (entry.file_mtimes && typeof entry.file_mtimes === 'object') {
      for (const [filePath, cachedMtime] of Object.entries(entry.file_mtimes)) {
        const currentMtime = getFileMtime(filePath);
        if (currentMtime === null || currentMtime !== cachedMtime) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Get speculative cached result
   * @private
   * @param {string} key - Cache key
   * @param {string[]} files - Files to validate
   * @returns {any|null} Cached result or null
   */
  _getSpeculativeCachedResult(key, files = []) {
    try {
      const cacheFile = this._getSpeculativeCacheFilePath(key);

      if (!fileExists(cacheFile)) {
        return null;
      }

      const content = readFile(cacheFile);
      if (!content) {
        return null;
      }

      const entry = JSON.parse(content);

      if (!this._isSpeculativeCacheValid(entry, files)) {
        // Clean up invalid entry
        try {
          fs.unlinkSync(cacheFile);
        } catch (err) {
          // Ignore
        }
        return null;
      }

      return entry.result;

    } catch (error) {
      this._verbose(`Error reading speculative cache: ${error.message}`);
      return null;
    }
  }

  /**
   * Set speculative cached result
   * @private
   * @param {string} key - Cache key
   * @param {any} result - Result to cache
   * @param {object} task - Task configuration
   * @returns {boolean} Success status
   */
  _setSpeculativeCachedResult(key, result, task) {
    try {
      this._ensureSpeculativeCacheDir();

      // Collect file mtimes
      const fileMtimes = {};
      const files = task.files || [];
      for (const file of files) {
        const mtime = getFileMtime(file);
        if (mtime !== null) {
          fileMtimes[file] = mtime;
        }
      }

      // Create cache entry
      const now = new Date();
      const expiresAt = new Date(now.getTime() + this.config.cacheTTL);

      const entry = {
        version: CACHE_VERSION,
        key,
        task_id: task.id,
        created_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        file_mtimes: fileMtimes,
        result,
      };

      // Write to cache file
      const cacheFile = this._getSpeculativeCacheFilePath(key);
      writeFile(cacheFile, JSON.stringify(entry, null, 2));

      return true;

    } catch (error) {
      this._verbose(`Failed to set speculative cache: ${error.message}`);
      return false;
    }
  }

  /**
   * Clean up expired speculative cache entries
   * @private
   * @returns {number} Number of entries cleaned
   */
  _cleanupExpiredEntries() {
    try {
      const cacheDir = resolvePath(SPECULATIVE_CACHE_DIR);

      if (!fs.existsSync(cacheDir)) {
        return 0;
      }

      let count = 0;
      const files = fs.readdirSync(cacheDir);

      for (const file of files) {
        if (!file.endsWith('.json')) {
          continue;
        }

        const filePath = path.join(cacheDir, file);

        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const entry = JSON.parse(content);

          if (!this._isSpeculativeCacheValid(entry)) {
            fs.unlinkSync(filePath);
            count++;
          }
        } catch (err) {
          // Invalid file, delete it
          try {
            fs.unlinkSync(filePath);
            count++;
          } catch (deleteErr) {
            // Ignore
          }
        }
      }

      if (count > 0) {
        this._verbose(`Cleaned up ${count} expired speculative cache entries`);
      }

      return count;

    } catch (error) {
      this._verbose(`Failed to cleanup expired entries: ${error.message}`);
      return 0;
    }
  }

  /**
   * Execute a single task (check cache first, then execute)
   * @private
   * @param {object} task - Task configuration
   * @param {boolean} isSpeculative - Whether this is speculative execution
   * @returns {Promise<object>} Task result
   */
  async _executeTask(task, isSpeculative = false) {
    const startTime = Date.now();
    let waitTime = 0;
    let fromCache = false;
    let result = null;

    const cacheKey = this._generateSpeculativeCacheKey(task);

    // Check speculative cache first
    if (this.config.enableSpeculation) {
      result = this._getSpeculativeCachedResult(cacheKey, task.files || []);

      if (result !== null) {
        fromCache = true;
        waitTime = 0; // No wait time if cached

        if (!isSpeculative) {
          this.metrics.speculativeCacheHits++;
          this._verbose(`Task ${task.id}: CACHE HIT (speculative)`);
        }
      } else {
        if (!isSpeculative) {
          this.metrics.speculativeCacheMisses++;
        }
      }
    }

    // Execute if not cached
    if (!fromCache) {
      const executeStartTime = Date.now();
      waitTime = executeStartTime - startTime;

      try {
        const response = await launchResearchAgent({
          template: task.template,
          variables: task.variables || {},
          timeout: task.timeout,
          cwd: task.cwd,
          schema: task.schema,
        });

        if (response.success) {
          result = response.result;

          // Cache speculative result
          if (this.config.enableSpeculation) {
            this._setSpeculativeCachedResult(cacheKey, result, task);
          }
        } else {
          // Agent returned error
          result = {
            error: response.error,
            success: false,
          };
        }

      } catch (error) {
        result = {
          error: {
            code: 'EXECUTION_ERROR',
            message: error.message,
          },
          success: false,
        };
      }
    }

    const totalTime = Date.now() - startTime;
    const executionTime = totalTime - waitTime;

    return {
      task_id: task.id,
      result,
      success: !result.error,
      fromCache,
      timing: {
        waitTime,
        executionTime,
        totalTime,
      },
    };
  }

  /**
   * Start speculative pre-fetching for a task
   * @private
   * @param {object} task - Task to pre-fetch
   * @param {number} taskIndex - Index in task list
   */
  _startSpeculativePrefetch(task, taskIndex) {
    if (!this.config.enableSpeculation) {
      return;
    }

    // Check if already prefetched or prefetching
    const state = this.taskStates.get(task.id);
    if (state === TaskExecutionState.PREFETCHING || state === TaskExecutionState.PREFETCHED) {
      return;
    }

    // Check speculative cache
    const cacheKey = this._generateSpeculativeCacheKey(task);
    const cached = this._getSpeculativeCachedResult(cacheKey, task.files || []);

    if (cached !== null) {
      // Already in cache
      this.taskStates.set(task.id, TaskExecutionState.PREFETCHED);
      this._verbose(`Task ${task.id}: Already prefetched (index ${taskIndex})`);
      return;
    }

    // Start speculative task with LOW priority
    this.taskStates.set(task.id, TaskExecutionState.PREFETCHING);
    this._verbose(`Task ${task.id}: Starting speculative prefetch (index ${taskIndex})`);

    const poolTaskId = this.agentPool.addTask({
      id: `speculative-${task.id}`,
      priority: Priority.LOW, // LOW priority - yields to user work
      fn: async () => {
        const result = await this._executeTask(task, true);
        this.taskStates.set(task.id, TaskExecutionState.PREFETCHED);
        this._verbose(`Task ${task.id}: Prefetch complete`);
        this.emit('taskPrefetched', { task, result });
        return result;
      },
    });

    this.speculativeTaskIds.set(task.id, poolTaskId);
  }

  /**
   * Execute tasks sequentially with speculative pre-fetching
   * @param {Array<object>} tasks - Array of task configurations
   * @param {string} tasks[].id - Unique task ID
   * @param {string} tasks[].template - Agent template path
   * @param {object} tasks[].variables - Template variables
   * @param {string[]} [tasks[].files] - Files that affect cache validity
   * @param {number} [tasks[].timeout] - Task timeout
   * @param {string} [tasks[].cwd] - Working directory
   * @param {object} [tasks[].schema] - Response schema
   * @returns {Promise<Array<object>>} Array of task results
   */
  async executeTasks(tasks) {
    if (!Array.isArray(tasks) || tasks.length === 0) {
      return [];
    }

    this.isExecuting = true;
    this.tasks = tasks;
    this.currentTaskIndex = -1;

    // Reset metrics
    this.metrics.totalTasks = tasks.length;
    this.metrics.tasksCompleted = 0;
    this.metrics.tasksFailed = 0;
    this.metrics.speculativeCacheHits = 0;
    this.metrics.speculativeCacheMisses = 0;
    this.metrics.totalWaitTime = 0;
    this.metrics.totalSavedTime = 0;
    this.metrics.waitTimes = [];
    this.metrics.taskTimings = [];

    // Initialize task states
    for (const task of tasks) {
      this.taskStates.set(task.id, TaskExecutionState.PENDING);
    }

    // Start agent pool if not already running
    if (this.agentPool.getState() !== 'RUNNING') {
      await this.agentPool.start();
    }

    this._verbose(`Starting execution of ${tasks.length} tasks with look-ahead=${this.config.lookAhead}`);
    this.emit('pipelineStarted', { totalTasks: tasks.length });

    const results = [];

    // Execute tasks sequentially
    for (let i = 0; i < tasks.length; i++) {
      this.currentTaskIndex = i;
      const task = tasks[i];

      // Start speculative pre-fetching for upcoming tasks
      for (let j = 1; j <= this.config.lookAhead; j++) {
        const nextIndex = i + j;
        if (nextIndex < tasks.length) {
          this._startSpeculativePrefetch(tasks[nextIndex], nextIndex);
        }
      }

      // Execute current task
      this.taskStates.set(task.id, TaskExecutionState.EXECUTING);
      this._verbose(`Task ${task.id}: Starting execution (${i + 1}/${tasks.length})`);
      this.emit('taskStarted', { task, index: i });

      const taskStartTime = Date.now();

      // Add to agent pool with NORMAL priority (higher than speculative)
      const taskResult = await new Promise((resolve) => {
        this.agentPool.addTask({
          id: `main-${task.id}`,
          priority: Priority.NORMAL, // Higher than speculative
          fn: async () => {
            const result = await this._executeTask(task, false);
            resolve(result);
            return result;
          },
        });
      });

      const taskEndTime = Date.now();
      const taskDuration = taskEndTime - taskStartTime;

      // Update task state
      if (taskResult.success) {
        this.taskStates.set(task.id, TaskExecutionState.COMPLETED);
        this.metrics.tasksCompleted++;
      } else {
        this.taskStates.set(task.id, TaskExecutionState.FAILED);
        this.metrics.tasksFailed++;
      }

      // Track metrics
      this.metrics.waitTimes.push(taskResult.timing.waitTime);
      this.metrics.totalWaitTime += taskResult.timing.waitTime;

      // Estimate time saved by speculation
      // If we got a cache hit, we saved approximately the execution time
      if (taskResult.fromCache) {
        // Estimate execution time based on similar tasks or use average
        const avgExecutionTime = this.metrics.taskTimings.length > 0
          ? this.metrics.taskTimings.reduce((sum, t) => sum + t.executionTime, 0) / this.metrics.taskTimings.length
          : 5000; // Default 5 seconds

        this.metrics.totalSavedTime += avgExecutionTime;
      }

      // Record detailed timing
      this.metrics.taskTimings.push({
        taskId: task.id,
        taskIndex: i,
        waitTime: taskResult.timing.waitTime,
        executionTime: taskResult.timing.executionTime,
        totalTime: taskResult.timing.totalTime,
        fromCache: taskResult.fromCache,
      });

      results.push(taskResult);

      this._verbose(
        `Task ${task.id}: ${taskResult.success ? 'SUCCESS' : 'FAILED'} ` +
        `(wait: ${taskResult.timing.waitTime}ms, exec: ${taskResult.timing.executionTime}ms, ` +
        `from cache: ${taskResult.fromCache})`
      );

      this.emit('taskCompleted', {
        task,
        result: taskResult,
        index: i,
        progress: {
          completed: i + 1,
          total: tasks.length,
          remaining: tasks.length - (i + 1),
        },
      });
    }

    this.isExecuting = false;
    this._verbose(
      `Pipeline complete: ${this.metrics.tasksCompleted}/${this.metrics.totalTasks} succeeded, ` +
      `${this.metrics.speculativeCacheHits} cache hits, ` +
      `total wait time: ${this.metrics.totalWaitTime}ms, ` +
      `estimated saved time: ${this.metrics.totalSavedTime}ms`
    );

    this.emit('pipelineCompleted', {
      results,
      metrics: this.getMetrics(),
    });

    return results;
  }

  /**
   * Get pipeline metrics
   * @returns {object} Metrics object
   */
  getMetrics() {
    const avgWaitTime = this.metrics.waitTimes.length > 0
      ? Math.round(this.metrics.waitTimes.reduce((sum, t) => sum + t, 0) / this.metrics.waitTimes.length)
      : 0;

    const maxWaitTime = this.metrics.waitTimes.length > 0
      ? Math.max(...this.metrics.waitTimes)
      : 0;

    const minWaitTime = this.metrics.waitTimes.length > 0
      ? Math.min(...this.metrics.waitTimes)
      : 0;

    const cacheHitRate = (this.metrics.speculativeCacheHits + this.metrics.speculativeCacheMisses) > 0
      ? (this.metrics.speculativeCacheHits / (this.metrics.speculativeCacheHits + this.metrics.speculativeCacheMisses) * 100).toFixed(2) + '%'
      : '0%';

    const successRate = this.metrics.totalTasks > 0
      ? (this.metrics.tasksCompleted / this.metrics.totalTasks * 100).toFixed(2) + '%'
      : '0%';

    return {
      summary: {
        totalTasks: this.metrics.totalTasks,
        tasksCompleted: this.metrics.tasksCompleted,
        tasksFailed: this.metrics.tasksFailed,
        successRate,
      },
      speculation: {
        enabled: this.config.enableSpeculation,
        lookAhead: this.config.lookAhead,
        cacheHits: this.metrics.speculativeCacheHits,
        cacheMisses: this.metrics.speculativeCacheMisses,
        cacheHitRate,
      },
      timing: {
        totalWaitTime: `${this.metrics.totalWaitTime}ms`,
        totalSavedTime: `${this.metrics.totalSavedTime}ms`,
        avgWaitTime: `${avgWaitTime}ms`,
        maxWaitTime: `${maxWaitTime}ms`,
        minWaitTime: `${minWaitTime}ms`,
        waitTimeReduction: this.metrics.totalSavedTime > 0
          ? ((this.metrics.totalSavedTime / (this.metrics.totalWaitTime + this.metrics.totalSavedTime)) * 100).toFixed(2) + '%'
          : '0%',
      },
      perTask: this.metrics.taskTimings,
    };
  }

  /**
   * Get current pipeline state
   * @returns {object} State object
   */
  getState() {
    return {
      isExecuting: this.isExecuting,
      currentTaskIndex: this.currentTaskIndex,
      totalTasks: this.tasks.length,
      currentTask: this.currentTaskIndex >= 0 && this.currentTaskIndex < this.tasks.length
        ? this.tasks[this.currentTaskIndex]
        : null,
      taskStates: Object.fromEntries(this.taskStates),
    };
  }

  /**
   * Invalidate speculative cache
   * @param {string|null} taskId - Optional task ID to invalidate (null = all)
   * @returns {number} Number of entries invalidated
   */
  invalidateCache(taskId = null) {
    try {
      const cacheDir = resolvePath(SPECULATIVE_CACHE_DIR);

      if (!fs.existsSync(cacheDir)) {
        return 0;
      }

      let count = 0;
      const files = fs.readdirSync(cacheDir);

      for (const file of files) {
        if (!file.endsWith('.json')) {
          continue;
        }

        const filePath = path.join(cacheDir, file);

        // If specific task ID, check if it matches
        if (taskId !== null) {
          try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const entry = JSON.parse(content);

            if (entry.task_id !== taskId) {
              continue; // Not the task we're looking for
            }
          } catch (err) {
            continue;
          }
        }

        // Delete the file
        try {
          fs.unlinkSync(filePath);
          count++;
        } catch (err) {
          // Ignore deletion errors
        }
      }

      this._verbose(`Invalidated ${count} speculative cache entries`);
      return count;

    } catch (error) {
      this._verbose(`Failed to invalidate cache: ${error.message}`);
      return 0;
    }
  }

  /**
   * Shutdown the pipeline and agent pool
   * @param {object} options - Shutdown options
   * @returns {Promise<void>}
   */
  async shutdown(options = {}) {
    this._verbose('Shutting down pipeline...');

    // Wait for current task to complete if executing
    if (this.isExecuting) {
      this._verbose('Waiting for current task to complete...');
      await new Promise((resolve) => {
        this.once('pipelineCompleted', resolve);
      });
    }

    // Shutdown agent pool
    await this.agentPool.shutdown(options);

    this._verbose('Pipeline shutdown complete');
  }
}

module.exports = {
  SpeculativeResearchPipeline,
  TaskExecutionState,
  SPECULATIVE_CACHE_DIR,
};
