/**
 * Complex Module - Cross-Phase Integration
 * Task 8.1: Initialize complex module (depends: 4.3)
 *
 * This module integrates components from multiple phases:
 * - Phase 1: Shared utilities (shared-utils.js)
 * - Phase 2: Utility wrappers (utility-wrappers.js)
 * - Phase 3: Combined strategy (combined-strategy.js)
 * - Phase 4: Documentation (documentation.md)
 *
 * Demonstrates the Mixed Complex Pattern (Phase 8) by combining
 * all dependency patterns into a unified execution system.
 */

// Import from Phase 1: Core utility functions
const {
  parseDependencies,
  areDependenciesSatisfied,
  findReadyTasks,
  calculateCriticalPathLength,
  detectCycles,
  formatStatus
} = require('../utils/shared-utils.js');

// Import from Phase 2: Higher-level wrappers
const {
  BatchOperations,
  LoggingWrapper,
  TaskGraphVisualizer,
  ExecutionStatusSummary
} = require('../utils/utility-wrappers.js');

// Import from Phase 3: Scheduling strategies
const {
  strategyA,
  strategyB,
  combinedStrategy
} = require('../strategies/combined-strategy.js');

/**
 * Execution metrics tracking
 */
class ExecutionMetrics {
  constructor() {
    this.startTime = null;
    this.endTime = null;
    this.tasksExecuted = 0;
    this.tasksFailed = 0;
    this.tasksSkipped = 0;
    this.batchesProcessed = 0;
    this.parallelismAchieved = [];
    this.strategyDecisions = {
      eager: 0,
      criticalPath: 0,
      adaptive: 0
    };
    this.executionHistory = [];
  }

  /**
   * Record start of execution
   */
  recordStart() {
    this.startTime = Date.now();
  }

  /**
   * Record end of execution
   */
  recordEnd() {
    this.endTime = Date.now();
  }

  /**
   * Record a batch execution
   * @param {Object[]} tasks - Tasks executed in batch
   * @param {string} strategyUsed - Strategy name used
   */
  recordBatch(tasks, strategyUsed) {
    this.batchesProcessed++;
    this.parallelismAchieved.push(tasks.length);

    if (strategyUsed === 'Eager Execution') {
      this.strategyDecisions.eager++;
    } else if (strategyUsed === 'Critical Path First') {
      this.strategyDecisions.criticalPath++;
    } else {
      this.strategyDecisions.adaptive++;
    }

    this.executionHistory.push({
      batch: this.batchesProcessed,
      taskIds: tasks.map(t => t.id),
      strategy: strategyUsed,
      timestamp: Date.now()
    });
  }

  /**
   * Record task completion
   * @param {string} status - Final task status
   */
  recordTaskCompletion(status) {
    if (status === 'completed') {
      this.tasksExecuted++;
    } else if (status === 'failed') {
      this.tasksFailed++;
    } else if (status === 'skipped') {
      this.tasksSkipped++;
    }
  }

  /**
   * Get execution duration in milliseconds
   * @returns {number|null} Duration or null if not complete
   */
  getDuration() {
    if (!this.startTime) return null;
    const end = this.endTime || Date.now();
    return end - this.startTime;
  }

  /**
   * Get average parallelism factor
   * @returns {number} Average tasks per batch
   */
  getAverageParallelism() {
    if (this.parallelismAchieved.length === 0) return 0;
    const sum = this.parallelismAchieved.reduce((a, b) => a + b, 0);
    return sum / this.parallelismAchieved.length;
  }

  /**
   * Generate metrics report
   * @returns {Object} Comprehensive metrics object
   */
  getReport() {
    return {
      duration: this.getDuration(),
      durationFormatted: this.getDuration() ? `${this.getDuration()}ms` : 'N/A',
      tasksExecuted: this.tasksExecuted,
      tasksFailed: this.tasksFailed,
      tasksSkipped: this.tasksSkipped,
      totalProcessed: this.tasksExecuted + this.tasksFailed + this.tasksSkipped,
      batchesProcessed: this.batchesProcessed,
      averageParallelism: this.getAverageParallelism().toFixed(2),
      maxParallelism: Math.max(...this.parallelismAchieved, 0),
      strategyDecisions: this.strategyDecisions,
      executionHistory: this.executionHistory
    };
  }
}

/**
 * ComplexModule - Main integration class
 *
 * Integrates shared utilities, wrappers, and combined strategy
 * for comprehensive task scheduling and execution.
 */
class ComplexModule {
  /**
   * Create a ComplexModule instance
   * @param {Object} options - Configuration options
   * @param {number} options.maxParallel - Maximum concurrent tasks (default: 4)
   * @param {boolean} options.verbose - Enable verbose logging (default: false)
   * @param {string} options.strategy - Strategy preference: 'eager', 'critical', 'adaptive' (default: 'adaptive')
   */
  constructor(options = {}) {
    this.maxParallel = options.maxParallel || 4;
    this.verbose = options.verbose || false;
    this.strategyPreference = options.strategy || 'adaptive';

    this.tasks = [];
    this.criticalPath = [];
    this.initialized = false;
    this.running = false;
    this.shutdownRequested = false;

    // Initialize logging
    this.logger = new LoggingWrapper({
      verbose: this.verbose,
      prefix: '[ComplexModule]'
    });

    // Initialize metrics
    this.metrics = new ExecutionMetrics();

    // Execution context for strategies
    this.context = {
      areDependenciesMet: (taskId) => this._areDependenciesMet(taskId),
      hasAvailableSlots: () => this._hasAvailableSlots(),
      criticalPath: this.criticalPath
    };

    // Active task tracking
    this.activeTasks = new Set();

    // Event handlers
    this.eventHandlers = {
      onTaskStart: [],
      onTaskComplete: [],
      onBatchStart: [],
      onBatchComplete: [],
      onError: []
    };
  }

  /**
   * Initialize the module with tasks
   * @param {Object[]} tasks - Array of task objects
   * @returns {Object} Initialization result
   */
  initialize(tasks) {
    if (this.initialized) {
      return { success: false, error: 'Module already initialized' };
    }

    // Validate tasks
    if (!Array.isArray(tasks) || tasks.length === 0) {
      return { success: false, error: 'Tasks must be a non-empty array' };
    }

    // Check for cycles
    const cycle = detectCycles(tasks);
    if (cycle) {
      this.logger.logCycleDetection(cycle);
      return {
        success: false,
        error: 'Circular dependency detected',
        cycle: cycle
      };
    }

    // Store and prepare tasks
    this.tasks = tasks.map(task => ({
      ...task,
      status: task.status || 'pending',
      dependencies: task.dependencies || []
    }));

    // Calculate critical path
    this.criticalPath = this._calculateCriticalPath();
    this.context.criticalPath = this.criticalPath;

    // Log initialization
    this.logger.logCriticalPath(
      calculateCriticalPathLength(this.tasks),
      this.tasks.length
    );

    this.initialized = true;

    return {
      success: true,
      taskCount: this.tasks.length,
      criticalPathLength: calculateCriticalPathLength(this.tasks),
      readyTasks: findReadyTasks(this.tasks).map(t => t.id)
    };
  }

  /**
   * Execute tasks using the configured strategy
   * @param {Object[]} tasksToExecute - Optional specific tasks to execute
   * @returns {Promise<Object>} Execution result
   */
  async execute(tasksToExecute = null) {
    if (!this.initialized) {
      return { success: false, error: 'Module not initialized' };
    }

    if (this.running) {
      return { success: false, error: 'Execution already in progress' };
    }

    this.running = true;
    this.shutdownRequested = false;
    this.metrics.recordStart();

    try {
      // If specific tasks provided, filter to those
      const targetTasks = tasksToExecute || this.tasks;

      // Get execution sequence
      const sequence = BatchOperations.getExecutionSequence(
        targetTasks.filter(t => t.status === 'pending')
      );

      // Process batches
      for (const batch of sequence) {
        if (this.shutdownRequested) {
          this.logger._log('Shutdown requested, stopping execution', 'warn');
          break;
        }

        await this._executeBatch(batch);
      }

      this.metrics.recordEnd();

      return {
        success: true,
        metrics: this.metrics.getReport(),
        finalStatus: this._getStatusSummary()
      };
    } catch (error) {
      this._emitEvent('onError', error);
      return {
        success: false,
        error: error.message,
        metrics: this.metrics.getReport()
      };
    } finally {
      this.running = false;
    }
  }

  /**
   * Get current execution status
   * @returns {Object} Status information
   */
  getStatus() {
    const summary = ExecutionStatusSummary.generateSummary(this.tasks);

    return {
      initialized: this.initialized,
      running: this.running,
      taskSummary: summary,
      metrics: this.metrics.getReport(),
      activeTasks: Array.from(this.activeTasks),
      logs: this.logger.getLogs()
    };
  }

  /**
   * Shutdown the module gracefully
   * @param {Object} options - Shutdown options
   * @param {boolean} options.force - Force immediate shutdown
   * @returns {Object} Shutdown result
   */
  shutdown(options = {}) {
    const force = options.force || false;

    if (!this.initialized) {
      return { success: true, message: 'Module was not initialized' };
    }

    if (this.running) {
      if (force) {
        this.running = false;
        this.shutdownRequested = true;
        this.activeTasks.clear();
        return { success: true, message: 'Forced shutdown complete' };
      } else {
        this.shutdownRequested = true;
        return { success: true, message: 'Graceful shutdown initiated' };
      }
    }

    // Clean up
    this.initialized = false;
    this.tasks = [];
    this.criticalPath = [];
    this.activeTasks.clear();
    this.logger.clearLogs();

    return { success: true, message: 'Shutdown complete' };
  }

  /**
   * Register an event handler
   * @param {string} event - Event name
   * @param {Function} handler - Handler function
   */
  on(event, handler) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event].push(handler);
    }
  }

  /**
   * Get visualization of task graph
   * @param {string} format - Visualization format: 'tree', 'layers', 'mermaid'
   * @returns {string} Visualization output
   */
  visualize(format = 'layers') {
    if (!this.initialized) {
      return 'Module not initialized';
    }

    switch (format) {
      case 'tree':
        return TaskGraphVisualizer.generateDependencyTree(this.tasks);
      case 'mermaid':
        return TaskGraphVisualizer.generateMermaidDiagram(this.tasks);
      case 'layers':
      default:
        return TaskGraphVisualizer.generateLayerVisualization(this.tasks);
    }
  }

  /**
   * Generate detailed report
   * @returns {string} Formatted report
   */
  generateReport() {
    if (!this.initialized) {
      return 'Module not initialized - no report available';
    }

    let report = '=' .repeat(60) + '\n';
    report += 'COMPLEX MODULE EXECUTION REPORT\n';
    report += '=' .repeat(60) + '\n\n';

    // Status section
    report += ExecutionStatusSummary.generateStatusReport(this.tasks);
    report += '\n';

    // Metrics section
    const metrics = this.metrics.getReport();
    report += '-'.repeat(40) + '\n';
    report += 'EXECUTION METRICS\n';
    report += '-'.repeat(40) + '\n';
    report += `Duration: ${metrics.durationFormatted}\n`;
    report += `Tasks Executed: ${metrics.tasksExecuted}\n`;
    report += `Tasks Failed: ${metrics.tasksFailed}\n`;
    report += `Tasks Skipped: ${metrics.tasksSkipped}\n`;
    report += `Batches Processed: ${metrics.batchesProcessed}\n`;
    report += `Average Parallelism: ${metrics.averageParallelism}x\n`;
    report += `Max Parallelism: ${metrics.maxParallelism}\n\n`;

    // Strategy decisions
    report += 'Strategy Decisions:\n';
    report += `  Eager Execution: ${metrics.strategyDecisions.eager}\n`;
    report += `  Critical Path: ${metrics.strategyDecisions.criticalPath}\n`;
    report += `  Adaptive: ${metrics.strategyDecisions.adaptive}\n\n`;

    // Layer visualization
    report += '-'.repeat(40) + '\n';
    report += 'TASK LAYERS\n';
    report += '-'.repeat(40) + '\n';
    report += this.visualize('layers');
    report += '\n';

    // Bottleneck analysis
    const bottlenecks = ExecutionStatusSummary.analyzeBottlenecks(this.tasks);
    if (bottlenecks.length > 0) {
      report += '-'.repeat(40) + '\n';
      report += 'BOTTLENECK ANALYSIS (Top 5)\n';
      report += '-'.repeat(40) + '\n';
      bottlenecks.slice(0, 5).forEach((b, i) => {
        report += `${i + 1}. Task ${b.taskId}: `;
        report += `in=${b.incomingDependencies}, out=${b.dependentTasks}, `;
        report += `score=${b.criticalityScore}\n`;
      });
    }

    report += '\n' + '='.repeat(60) + '\n';
    report += 'End of Report\n';
    report += '='.repeat(60) + '\n';

    return report;
  }

  // ============ Private Methods ============

  /**
   * Execute a batch of tasks
   * @private
   */
  async _executeBatch(batch) {
    this._emitEvent('onBatchStart', batch);
    this.logger.logReadyTasks(batch);

    // Select tasks using strategy
    const selectedTasks = this._selectTasksWithStrategy(batch);
    const strategyUsed = this._getActiveStrategyName();

    this.metrics.recordBatch(selectedTasks, strategyUsed);

    // Execute tasks (simulated - in real implementation would be async)
    const results = await Promise.all(
      selectedTasks.map(task => this._executeTask(task))
    );

    this._emitEvent('onBatchComplete', { batch: selectedTasks, results });

    return results;
  }

  /**
   * Execute a single task
   * @private
   */
  async _executeTask(task) {
    this._emitEvent('onTaskStart', task);
    this.activeTasks.add(task.id);

    // Update task status to in_progress
    this._updateTaskStatus(task.id, 'in_progress');
    this.logger.logDependencyCheck(task, true);

    try {
      // Simulate task execution
      // In real implementation, this would execute actual task logic
      await this._simulateTaskExecution(task);

      // Mark as completed
      this._updateTaskStatus(task.id, 'completed');
      this.metrics.recordTaskCompletion('completed');
      this._emitEvent('onTaskComplete', { task, status: 'completed' });

      return { taskId: task.id, success: true };
    } catch (error) {
      this._updateTaskStatus(task.id, 'failed');
      this.metrics.recordTaskCompletion('failed');
      this._emitEvent('onTaskComplete', { task, status: 'failed', error });

      return { taskId: task.id, success: false, error: error.message };
    } finally {
      this.activeTasks.delete(task.id);
    }
  }

  /**
   * Simulate task execution (for testing/demo purposes)
   * @private
   */
  async _simulateTaskExecution(task) {
    // Simulate some async work
    return new Promise((resolve) => {
      setTimeout(resolve, 10);
    });
  }

  /**
   * Select tasks using the configured strategy
   * @private
   */
  _selectTasksWithStrategy(readyTasks) {
    switch (this.strategyPreference) {
      case 'eager':
        return strategyA.selectTasks(readyTasks, this.maxParallel);
      case 'critical':
        return strategyB.selectTasks(readyTasks, this.maxParallel, this.criticalPath);
      case 'adaptive':
      default:
        return combinedStrategy.selectTasks(readyTasks, this.maxParallel, this.context);
    }
  }

  /**
   * Get active strategy name
   * @private
   */
  _getActiveStrategyName() {
    switch (this.strategyPreference) {
      case 'eager':
        return strategyA.name;
      case 'critical':
        return strategyB.name;
      default:
        return combinedStrategy.name;
    }
  }

  /**
   * Check if task dependencies are met
   * @private
   */
  _areDependenciesMet(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return false;

    const statusMap = {};
    this.tasks.forEach(t => {
      statusMap[t.id] = t.status;
    });

    return areDependenciesSatisfied(task.dependencies || [], statusMap);
  }

  /**
   * Check if there are available execution slots
   * @private
   */
  _hasAvailableSlots() {
    return this.activeTasks.size < this.maxParallel;
  }

  /**
   * Update task status
   * @private
   */
  _updateTaskStatus(taskId, status) {
    const task = this.tasks.find(t => t.id === taskId);
    if (task) {
      task.status = status;
    }
  }

  /**
   * Calculate critical path task IDs
   * @private
   */
  _calculateCriticalPath() {
    const taskMap = new Map(this.tasks.map(t => [t.id, t]));
    const depths = new Map();

    const getDepth = (taskId) => {
      if (depths.has(taskId)) return depths.get(taskId);

      const task = taskMap.get(taskId);
      if (!task || !task.dependencies || task.dependencies.length === 0) {
        depths.set(taskId, 1);
        return 1;
      }

      const maxDepDepth = Math.max(...task.dependencies.map(getDepth));
      const depth = maxDepDepth + 1;
      depths.set(taskId, depth);
      return depth;
    };

    // Calculate depths for all tasks
    this.tasks.forEach(task => getDepth(task.id));

    // Find max depth
    const maxDepth = Math.max(...Array.from(depths.values()));

    // Find critical path (tasks at each depth level on longest path)
    const criticalTasks = [];
    this.tasks.forEach(task => {
      if (depths.get(task.id) === maxDepth) {
        criticalTasks.push(task.id);
      }
    });

    return criticalTasks;
  }

  /**
   * Get status summary
   * @private
   */
  _getStatusSummary() {
    return ExecutionStatusSummary.generateSummary(this.tasks);
  }

  /**
   * Emit an event to registered handlers
   * @private
   */
  _emitEvent(eventName, data) {
    const handlers = this.eventHandlers[eventName] || [];
    handlers.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        // Log but don't fail on handler errors
        this.logger._log(`Event handler error: ${error.message}`, 'error');
      }
    });
  }
}

/**
 * Factory function to create a ComplexModule instance
 * @param {Object} options - Configuration options
 * @returns {ComplexModule} New ComplexModule instance
 */
function createComplexModule(options = {}) {
  return new ComplexModule(options);
}

module.exports = {
  ComplexModule,
  createComplexModule,
  ExecutionMetrics
};
