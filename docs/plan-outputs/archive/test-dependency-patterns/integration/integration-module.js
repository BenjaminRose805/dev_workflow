/**
 * Integration Module for Dependency Patterns Testing
 * Task 4.1: Create integration module (depends: 1.1, 2.1)
 *
 * This module ties together the base configuration (from task 1.1) and
 * extended configuration (from task 2.1) to provide:
 * - Unified configuration access
 * - Configuration validation and consistency checking
 * - Environment-specific overrides
 * - Configured scheduler/executor instance
 *
 * Dependency Chain:
 *   1.1 (base config)  \
 *                       4.1 (this integration module)
 *   2.1 (extended config) /
 */

const path = require('path');
const fs = require('fs');

/**
 * Base configuration - created by task 1.1
 * Contains fundamental configuration
 */
const baseConfig = {
  name: 'test-dependency-patterns',
  version: '1.0.0',
  createdAt: '2025-12-26T20:45:00Z',
  description: 'Base configuration for test dependency patterns',
  // Base execution settings
  environment: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
  timeoutMs: 30000,
  // Base paths
  configDir: path.resolve(__dirname, '../config'),
  fixturesDir: path.resolve(__dirname, '../fixtures'),
  dbDir: path.resolve(__dirname, '../db'),
  utilsDir: path.resolve(__dirname, '../utils'),
  strategiesDir: path.resolve(__dirname, '../strategies')
};

/**
 * Load extended configuration from file
 * Extended config is created by task 2.1
 */
function loadExtendedConfig() {
  const extendedConfigPath = path.join(baseConfig.configDir, 'extended-config.json');
  try {
    if (fs.existsSync(extendedConfigPath)) {
      const content = fs.readFileSync(extendedConfigPath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.warn(`Failed to load extended config from ${extendedConfigPath}:`, error.message);
  }
  return {};
}

/**
 * Merge configurations with proper precedence:
 * Environment variables > Extended config > Base config
 */
function mergeConfigurations(baseConf, extendedConf) {
  const merged = { ...baseConf };

  // Merge extended config sections
  if (extendedConf.scheduling) {
    merged.scheduling = { ...extendedConf.scheduling };
  }
  if (extendedConf.validation) {
    merged.validation = { ...extendedConf.validation };
  }
  if (extendedConf.reporting) {
    merged.reporting = { ...extendedConf.reporting };
  }
  if (extendedConf.execution) {
    merged.execution = { ...extendedConf.execution };
  }
  if (extendedConf.patterns) {
    merged.patterns = { ...extendedConf.patterns };
  }

  // Apply environment-specific overrides
  applyEnvironmentOverrides(merged);

  return merged;
}

/**
 * Apply environment-specific configuration overrides
 * Allows runtime configuration via environment variables
 */
function applyEnvironmentOverrides(config) {
  // Scheduling overrides
  if (process.env.DAG_AWARE !== undefined) {
    if (!config.scheduling) config.scheduling = {};
    config.scheduling.dagAware = process.env.DAG_AWARE === 'true';
  }
  if (process.env.PARALLEL_EXECUTION !== undefined) {
    if (!config.scheduling) config.scheduling = {};
    config.scheduling.parallelExecution = process.env.PARALLEL_EXECUTION === 'true';
  }
  if (process.env.MAX_PARALLEL_TASKS) {
    if (!config.scheduling) config.scheduling = {};
    config.scheduling.maxParallelTasks = parseInt(process.env.MAX_PARALLEL_TASKS, 10);
  }
  if (process.env.RESPECT_DEPENDENCIES !== undefined) {
    if (!config.scheduling) config.scheduling = {};
    config.scheduling.respectDependencies = process.env.RESPECT_DEPENDENCIES === 'true';
  }

  // Validation overrides
  if (process.env.CHECK_DEPENDENCY_CYCLES !== undefined) {
    if (!config.validation) config.validation = {};
    config.validation.checkDependencyCycles = process.env.CHECK_DEPENDENCY_CYCLES === 'true';
  }
  if (process.env.VALIDATE_PHASE_ORDER !== undefined) {
    if (!config.validation) config.validation = {};
    config.validation.validatePhaseOrder = process.env.VALIDATE_PHASE_ORDER === 'true';
  }
  if (process.env.STRICT_DEPENDENCY_CHECK !== undefined) {
    if (!config.validation) config.validation = {};
    config.validation.strictDependencyCheck = process.env.STRICT_DEPENDENCY_CHECK === 'true';
  }

  // Reporting overrides
  if (process.env.SHOW_PROGRESS !== undefined) {
    if (!config.reporting) config.reporting = {};
    config.reporting.showProgress = process.env.SHOW_PROGRESS === 'true';
  }
  if (process.env.SHOW_CRITICAL_PATH !== undefined) {
    if (!config.reporting) config.reporting = {};
    config.reporting.showCriticalPath = process.env.SHOW_CRITICAL_PATH === 'true';
  }
  if (process.env.SHOW_BLOCKED_TASKS !== undefined) {
    if (!config.reporting) config.reporting = {};
    config.reporting.showBlockedTasks = process.env.SHOW_BLOCKED_TASKS === 'true';
  }

  // Execution overrides
  if (process.env.CONTINUE_ON_FAILURE !== undefined) {
    if (!config.execution) config.execution = {};
    config.execution.continueOnFailure = process.env.CONTINUE_ON_FAILURE === 'true';
  }
  if (process.env.MAX_RETRIES) {
    if (!config.execution) config.execution = {};
    config.execution.maxRetries = parseInt(process.env.MAX_RETRIES, 10);
  }
  if (process.env.RETRY_DELAY_MS) {
    if (!config.execution) config.execution = {};
    config.execution.retryDelayMs = parseInt(process.env.RETRY_DELAY_MS, 10);
  }
}

/**
 * Validate configuration consistency
 * Ensures all required sections and values are present and valid
 */
function validateConfiguration(config) {
  const errors = [];
  const warnings = [];

  // Validate scheduling configuration
  if (config.scheduling) {
    if (config.scheduling.maxParallelTasks < 1) {
      errors.push('scheduling.maxParallelTasks must be >= 1');
    }
    if (config.scheduling.dagAware && !config.scheduling.respectDependencies) {
      warnings.push('scheduling: dagAware enabled but respectDependencies is disabled');
    }
  }

  // Validate validation configuration
  if (config.validation) {
    if (config.validation.strictDependencyCheck && !config.validation.checkDependencyCycles) {
      warnings.push('validation: strictDependencyCheck enabled but checkDependencyCycles is disabled');
    }
  }

  // Validate execution configuration
  if (config.execution) {
    if (config.execution.maxRetries < 0) {
      errors.push('execution.maxRetries must be >= 0');
    }
    if (config.execution.retryDelayMs < 0) {
      errors.push('execution.retryDelayMs must be >= 0');
    }
  }

  // Validate patterns are defined
  if (!config.patterns || Object.keys(config.patterns).length === 0) {
    warnings.push('No dependency patterns defined in configuration');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    hasWarnings: warnings.length > 0
  };
}

/**
 * Scheduler/Executor class
 * Provides unified interface for task scheduling and execution
 */
class SchedulerExecutor {
  constructor(config) {
    this.config = config;
    this.taskQueue = [];
    this.executingTasks = new Set();
    this.completedTasks = new Set();
    this.failedTasks = new Set();
  }

  /**
   * Check if a task's dependencies are satisfied
   * @param {string} taskId - Task ID to check
   * @param {Object} taskStatus - Map of task IDs to their status
   * @returns {boolean} True if all dependencies are completed
   */
  areDependenciesMet(taskId, taskStatus = {}) {
    const task = this.taskQueue.find(t => t.id === taskId);
    if (!task || !task.dependencies) return true;

    return task.dependencies.every(depId => {
      const status = taskStatus[depId];
      return this.completedTasks.has(depId) || this.failedTasks.has(depId);
    });
  }

  /**
   * Check for circular dependencies in task graph
   * @param {Object[]} tasks - Array of task objects
   * @returns {Object} Validation result with any cycles found
   */
  detectCircularDependencies(tasks) {
    const visited = new Set();
    const recursionStack = new Set();
    const cycles = [];

    const dfs = (taskId, path) => {
      if (recursionStack.has(taskId)) {
        const cycleStart = path.indexOf(taskId);
        if (cycleStart !== -1) {
          cycles.push([...path.slice(cycleStart), taskId]);
        }
        return;
      }
      if (visited.has(taskId)) return;

      visited.add(taskId);
      recursionStack.add(taskId);

      const task = tasks.find(t => t.id === taskId);
      if (task && task.dependencies) {
        for (const depId of task.dependencies) {
          dfs(depId, [...path, taskId]);
        }
      }

      recursionStack.delete(taskId);
    };

    for (const task of tasks) {
      if (!visited.has(task.id)) {
        dfs(task.id, []);
      }
    }

    return {
      hasCycles: cycles.length > 0,
      cycles,
      valid: cycles.length === 0
    };
  }

  /**
   * Add task to execution queue
   * @param {Object} task - Task object with id and optional dependencies
   */
  addTask(task) {
    if (!task.id) {
      throw new Error('Task must have an id property');
    }
    this.taskQueue.push({
      id: task.id,
      dependencies: task.dependencies || [],
      status: 'pending',
      ...task
    });
  }

  /**
   * Get available tasks for execution
   * Returns tasks that are pending and have all dependencies met
   * @returns {Object[]} Array of tasks ready to execute
   */
  getReadyTasks() {
    return this.taskQueue.filter(task => {
      if (task.status !== 'pending') return false;
      if (task.dependencies && task.dependencies.length > 0) {
        return task.dependencies.every(depId => this.completedTasks.has(depId));
      }
      return true;
    });
  }

  /**
   * Mark a task as completed
   * @param {string} taskId - Task ID
   */
  completeTask(taskId) {
    const task = this.taskQueue.find(t => t.id === taskId);
    if (task) {
      task.status = 'completed';
      this.completedTasks.add(taskId);
      this.executingTasks.delete(taskId);
    }
  }

  /**
   * Mark a task as failed
   * @param {string} taskId - Task ID
   */
  failTask(taskId) {
    const task = this.taskQueue.find(t => t.id === taskId);
    if (task) {
      task.status = 'failed';
      this.failedTasks.add(taskId);
      this.executingTasks.delete(taskId);
    }
  }

  /**
   * Get execution statistics
   * @returns {Object} Statistics about task execution
   */
  getStats() {
    const totalTasks = this.taskQueue.length;
    const completedCount = this.completedTasks.size;
    const failedCount = this.failedTasks.size;
    const pendingCount = totalTasks - completedCount - failedCount;

    return {
      totalTasks,
      completedTasks: completedCount,
      failedTasks: failedCount,
      pendingTasks: pendingCount,
      successRate: totalTasks > 0 ? (completedCount / totalTasks) * 100 : 0,
      executingCount: this.executingTasks.size,
      config: {
        scheduling: this.config.scheduling,
        validation: this.config.validation,
        execution: this.config.execution
      }
    };
  }

  /**
   * Get comprehensive system report
   * @returns {Object} Detailed report of configuration and execution state
   */
  generateReport() {
    return {
      timestamp: new Date().toISOString(),
      environment: this.config.environment,
      version: this.config.version,
      configuration: this.config,
      execution: this.getStats(),
      readyTasks: this.getReadyTasks(),
      queueLength: this.taskQueue.length
    };
  }
}

/**
 * Initialize and return the fully configured integration module
 */
function initializeIntegration() {
  // Load configurations
  const extendedConf = loadExtendedConfig();
  const mergedConfig = mergeConfigurations(baseConfig, extendedConf);

  // Validate merged configuration
  const validation = validateConfiguration(mergedConfig);
  if (!validation.isValid) {
    console.error('Configuration validation failed:', validation.errors);
    throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
  }
  if (validation.hasWarnings && baseConfig.logLevel !== 'silent') {
    console.warn('Configuration warnings:', validation.warnings);
  }

  // Create and return the configured executor
  return {
    config: mergedConfig,
    validation,
    executor: new SchedulerExecutor(mergedConfig),
    createExecutor: () => new SchedulerExecutor(mergedConfig)
  };
}

// Export the integration module
module.exports = {
  baseConfig,
  loadExtendedConfig,
  mergeConfigurations,
  applyEnvironmentOverrides,
  validateConfiguration,
  SchedulerExecutor,
  initializeIntegration,
  // Convenience function to get initialized integration
  getIntegration: initializeIntegration
};
