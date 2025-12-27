/**
 * Higher-Level Utility Wrappers for Test Dependency Patterns
 * Created: 2025-12-26
 *
 * This module provides higher-level abstractions built on top of shared-utils.js
 * including batch operations, logging/debugging wrappers, task graph visualization,
 * and execution status summaries.
 */

const {
  parseDependencies,
  areDependenciesSatisfied,
  findReadyTasks,
  calculateCriticalPathLength,
  detectCycles,
  formatStatus
} = require('./shared-utils.js');

/**
 * Batch Operations Wrapper
 * Provides convenient batch processing of multiple tasks
 */
class BatchOperations {
  /**
   * Parse dependencies for multiple tasks at once
   * @param {Object[]} tasks - Array of task objects with descriptions
   * @returns {Object} Map of task ID to dependencies array
   */
  static parseAllDependencies(tasks) {
    const dependencyMap = {};
    tasks.forEach(task => {
      dependencyMap[task.id] = parseDependencies(task.description);
    });
    return dependencyMap;
  }

  /**
   * Check which tasks have all dependencies satisfied
   * @param {Object[]} tasks - Array of task objects
   * @returns {Object} Map of task ID to satisfaction status
   */
  static checkAllDependencies(tasks) {
    const statusMap = {};
    tasks.forEach(task => {
      statusMap[task.id] = task.status;
    });

    const satisfactionMap = {};
    tasks.forEach(task => {
      const deps = task.dependencies || [];
      satisfactionMap[task.id] = areDependenciesSatisfied(deps, statusMap);
    });
    return satisfactionMap;
  }

  /**
   * Get execution sequence based on dependencies
   * @param {Object[]} tasks - Array of task objects
   * @returns {Object[]} Array of execution batches, each containing ready tasks
   */
  static getExecutionSequence(tasks) {
    const sequence = [];
    const remaining = [...tasks];
    const completed = new Set();

    while (remaining.length > 0) {
      const batch = findReadyTasks(remaining);

      if (batch.length === 0) {
        // No more ready tasks - either all done or circular dependency exists
        break;
      }

      sequence.push(batch);
      batch.forEach(task => {
        completed.add(task.id);
        const idx = remaining.findIndex(t => t.id === task.id);
        if (idx > -1) remaining.splice(idx, 1);
      });
    }

    return sequence;
  }

  /**
   * Update multiple task statuses at once
   * @param {Object[]} tasks - Array of task objects
   * @param {string[]} taskIds - Task IDs to update
   * @param {string} newStatus - New status value
   * @returns {Object[]} Updated tasks array
   */
  static updateTasksStatus(tasks, taskIds, newStatus) {
    return tasks.map(task => {
      if (taskIds.includes(task.id)) {
        return { ...task, status: newStatus };
      }
      return task;
    });
  }
}

/**
 * Logging and Debugging Wrapper
 * Provides enhanced logging for dependency tracking and execution
 */
class LoggingWrapper {
  constructor(options = {}) {
    this.verbose = options.verbose || false;
    this.prefix = options.prefix || '[DEP-DEBUG]';
    this.logs = [];
  }

  /**
   * Log task dependency analysis
   * @param {Object} task - Task object
   * @param {boolean} satisfied - Whether dependencies are satisfied
   */
  logDependencyCheck(task, satisfied) {
    const deps = task.dependencies || [];
    const message = `${this.prefix} Task ${task.id}: ${deps.length} dependencies ` +
                    `[${satisfied ? 'SATISFIED' : 'NOT SATISFIED'}]`;
    this._log(message);
  }

  /**
   * Log ready tasks identified
   * @param {Object[]} readyTasks - Tasks ready to execute
   */
  logReadyTasks(readyTasks) {
    const taskIds = readyTasks.map(t => t.id).join(', ');
    const message = `${this.prefix} Ready tasks: [${taskIds}]`;
    this._log(message);
  }

  /**
   * Log critical path analysis
   * @param {number} pathLength - Critical path length
   * @param {number} totalTasks - Total number of tasks
   */
  logCriticalPath(pathLength, totalTasks) {
    const parallelFactor = (totalTasks / pathLength).toFixed(2);
    const message = `${this.prefix} Critical path: ${pathLength} layers, ` +
                    `${totalTasks} tasks, parallelism factor: ${parallelFactor}x`;
    this._log(message);
  }

  /**
   * Log cycle detection results
   * @param {string[]|null} cycle - Cycle path if found
   */
  logCycleDetection(cycle) {
    if (cycle) {
      const path = cycle.join(' -> ');
      const message = `${this.prefix} CYCLE DETECTED: ${path}`;
      this._log(message, 'error');
    } else {
      const message = `${this.prefix} No cycles detected (graph is acyclic)`;
      this._log(message, 'info');
    }
  }

  /**
   * Log execution trace with status
   * @param {Object[]} tasks - Array of task objects
   */
  logExecutionTrace(tasks) {
    const message = `${this.prefix} Execution trace:`;
    this._log(message);

    tasks.forEach(task => {
      const deps = (task.dependencies || []).join(', ') || 'none';
      const statusStr = formatStatus(task.status);
      const traceMsg = `  ├─ ${task.id}: deps=[${deps}] ${statusStr}`;
      this._log(traceMsg);
    });
  }

  /**
   * Get all logs as string
   * @returns {string} Formatted log output
   */
  getLogs() {
    return this.logs.join('\n');
  }

  /**
   * Clear logs
   */
  clearLogs() {
    this.logs = [];
  }

  /**
   * Internal logging method
   * @private
   */
  _log(message, level = 'info') {
    const timestamp = new Date().toISOString().slice(11, 19);
    const logEntry = `${timestamp} [${level.toUpperCase()}] ${message}`;
    this.logs.push(logEntry);

    if (this.verbose) {
      console.log(logEntry);
    }
  }
}

/**
 * Task Graph Visualization Helper
 * Provides methods to generate visual representations of task graphs
 */
class TaskGraphVisualizer {
  /**
   * Generate ASCII tree representation of task dependencies
   * @param {Object[]} tasks - Array of task objects
   * @returns {string} ASCII tree diagram
   */
  static generateDependencyTree(tasks) {
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    const visited = new Set();
    let tree = 'Task Dependency Tree:\n';

    const renderTask = (taskId, indent = '', isLast = true) => {
      if (visited.has(taskId)) {
        return `${indent}${isLast ? '└─' : '├─'} ${taskId} (circular)\n`;
      }

      visited.add(taskId);
      const task = taskMap.get(taskId);
      if (!task) return '';

      const statusStr = formatStatus(task.status);
      let result = `${indent}${isLast ? '└─' : '├─'} ${taskId} ${statusStr}\n`;

      const deps = task.dependencies || [];
      deps.forEach((depId, index) => {
        const nextIndent = indent + (isLast ? '  ' : '│ ');
        result += renderTask(depId, nextIndent, index === deps.length - 1);
      });

      return result;
    };

    tasks.forEach(task => {
      if (!visited.has(task.id)) {
        tree += renderTask(task.id);
      }
    });

    return tree;
  }

  /**
   * Generate layer visualization showing parallel execution groups
   * @param {Object[]} tasks - Array of task objects
   * @returns {string} Layer-based visualization
   */
  static generateLayerVisualization(tasks) {
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    const layers = new Map();
    let maxLayer = 0;

    const calculateLayer = (taskId, memo = new Map()) => {
      if (memo.has(taskId)) return memo.get(taskId);

      const task = taskMap.get(taskId);
      if (!task || !task.dependencies || task.dependencies.length === 0) {
        memo.set(taskId, 0);
        return 0;
      }

      const maxDepLayer = Math.max(...task.dependencies.map(d => calculateLayer(d, memo)));
      const layer = maxDepLayer + 1;
      memo.set(taskId, layer);
      return layer;
    };

    tasks.forEach(task => {
      const layer = calculateLayer(task.id);
      if (!layers.has(layer)) layers.set(layer, []);
      layers.get(layer).push(task);
      maxLayer = Math.max(maxLayer, layer);
    });

    let visualization = 'Parallel Execution Layers:\n';
    for (let layer = 0; layer <= maxLayer; layer++) {
      const layerTasks = layers.get(layer) || [];
      const taskIds = layerTasks.map(t => t.id).join(', ');
      const taskCount = layerTasks.length;
      visualization += `Layer ${layer}: [${taskCount}] ${taskIds}\n`;
    }

    return visualization;
  }

  /**
   * Generate mermaid diagram syntax for task graph
   * @param {Object[]} tasks - Array of task objects
   * @returns {string} Mermaid diagram code
   */
  static generateMermaidDiagram(tasks) {
    let diagram = 'graph TD\n';

    tasks.forEach(task => {
      const status = task.status;
      const statusColor = {
        'completed': 'style=fill:#90EE90',
        'in_progress': 'style=fill:#FFD700',
        'pending': 'style=fill:#87CEEB',
        'failed': 'style=fill:#FF6B6B',
        'skipped': 'style=fill:#D3D3D3'
      };

      const statusStr = statusColor[status] || 'style=fill:#FFFFFF';
      diagram += `    ${task.id}["${task.id}<br/>${formatStatus(status)}"] ${statusStr}\n`;

      const deps = task.dependencies || [];
      deps.forEach(depId => {
        diagram += `    ${depId} --> ${task.id}\n`;
      });
    });

    return diagram;
  }
}

/**
 * Execution Status Summary Helper
 * Provides comprehensive status analysis and reporting
 */
class ExecutionStatusSummary {
  /**
   * Generate overall execution summary
   * @param {Object[]} tasks - Array of task objects
   * @returns {Object} Summary statistics
   */
  static generateSummary(tasks) {
    const statusCounts = {
      completed: 0,
      in_progress: 0,
      pending: 0,
      failed: 0,
      skipped: 0
    };

    tasks.forEach(task => {
      if (statusCounts.hasOwnProperty(task.status)) {
        statusCounts[task.status]++;
      }
    });

    const totalTasks = tasks.length;
    const completionPercentage = ((statusCounts.completed / totalTasks) * 100).toFixed(2);
    const readyTasks = findReadyTasks(tasks);
    const criticalPathLength = calculateCriticalPathLength(tasks);
    const cycleResult = detectCycles(tasks);

    return {
      totalTasks,
      statusCounts,
      completionPercentage: `${completionPercentage}%`,
      readyTasksCount: readyTasks.length,
      readyTaskIds: readyTasks.map(t => t.id),
      criticalPathLength,
      hasCycle: cycleResult !== null,
      cycleDetails: cycleResult ? cycleResult.join(' -> ') : null
    };
  }

  /**
   * Generate detailed status report
   * @param {Object[]} tasks - Array of task objects
   * @returns {string} Formatted status report
   */
  static generateStatusReport(tasks) {
    const summary = this.generateSummary(tasks);

    let report = 'EXECUTION STATUS REPORT\n';
    report += '=======================\n\n';

    report += `Total Tasks: ${summary.totalTasks}\n`;
    report += `Completion: ${summary.completionPercentage}\n\n`;

    report += 'Task Status Breakdown:\n';
    Object.entries(summary.statusCounts).forEach(([status, count]) => {
      const percentage = ((count / summary.totalTasks) * 100).toFixed(1);
      report += `  ${formatStatus(status)}: ${count} (${percentage}%)\n`;
    });

    report += `\nReady for Execution: ${summary.readyTasksCount}\n`;
    if (summary.readyTaskIds.length > 0) {
      report += `  Tasks: ${summary.readyTaskIds.join(', ')}\n`;
    }

    report += `\nCritical Path Length: ${summary.criticalPathLength} layers\n`;
    report += `Parallelism Factor: ${(summary.totalTasks / summary.criticalPathLength).toFixed(2)}x\n`;

    report += `\nDependency Graph:\n`;
    report += `  Cycle Detection: ${summary.hasCycle ? 'CYCLE FOUND' : 'Acyclic'}\n`;
    if (summary.cycleDetails) {
      report += `  Cycle Path: ${summary.cycleDetails}\n`;
    }

    return report;
  }

  /**
   * Generate task dependency matrix
   * @param {Object[]} tasks - Array of task objects
   * @returns {string} Formatted dependency matrix
   */
  static generateDependencyMatrix(tasks) {
    const taskIds = tasks.map(t => t.id).sort();
    const idToIndex = new Map(taskIds.map((id, idx) => [id, idx]));

    let matrix = '       ';
    taskIds.forEach(id => {
      matrix += id.padEnd(6);
    });
    matrix += '\n';
    matrix += '─'.repeat(7 + taskIds.length * 6) + '\n';

    taskIds.forEach(taskId => {
      matrix += taskId.padEnd(6) + ' ';
      const task = tasks.find(t => t.id === taskId);
      const deps = task.dependencies || [];

      taskIds.forEach(depId => {
        const isDep = deps.includes(depId);
        matrix += (isDep ? '  ✓   ' : '  -   ');
      });
      matrix += '\n';
    });

    return matrix;
  }

  /**
   * Generate bottleneck analysis
   * @param {Object[]} tasks - Array of task objects
   * @returns {Object} Bottleneck details
   */
  static analyzeBottlenecks(tasks) {
    const dependencyCount = {};
    const dependentCount = {};

    tasks.forEach(task => {
      const depsCount = (task.dependencies || []).length;
      dependencyCount[task.id] = depsCount;

      (task.dependencies || []).forEach(depId => {
        dependentCount[depId] = (dependentCount[depId] || 0) + 1;
      });
    });

    const bottlenecks = [];
    tasks.forEach(task => {
      const incomingDeps = dependencyCount[task.id] || 0;
      const outgoingDeps = dependentCount[task.id] || 0;

      if (incomingDeps > 0 || outgoingDeps > 0) {
        bottlenecks.push({
          taskId: task.id,
          incomingDependencies: incomingDeps,
          dependentTasks: outgoingDeps,
          criticalityScore: incomingDeps + outgoingDeps
        });
      }
    });

    return bottlenecks.sort((a, b) => b.criticalityScore - a.criticalityScore);
  }
}

module.exports = {
  BatchOperations,
  LoggingWrapper,
  TaskGraphVisualizer,
  ExecutionStatusSummary
};
