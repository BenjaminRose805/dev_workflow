/**
 * Agent Performance Tracker
 *
 * Comprehensive performance tracking and analysis for agent operations.
 * Tracks metrics per agent execution, persists data, and generates
 * actionable optimization reports.
 *
 * Features:
 * - Per-agent execution tracking (type, duration, tokens, cache status)
 * - Persistent storage in .claude/logs/agent-performance.json
 * - Multiple report formats (text, JSON, summary)
 * - Statistical analysis and trend detection
 * - Optimization recommendations
 * - Integration with agent-pool and agent-cache
 *
 * Usage:
 *   const tracker = require('./performance-tracker');
 *
 *   // Track agent execution
 *   const session = tracker.startTracking({
 *     agentType: 'research',
 *     taskId: 'analyze-file',
 *     metadata: { file: 'src/main.js' }
 *   });
 *
 *   // End tracking
 *   tracker.endTracking(session.id, {
 *     success: true,
 *     tokensUsed: 1500,
 *     cacheHit: false,
 *     result: { ... }
 *   });
 *
 *   // Generate report
 *   const report = tracker.generateReport('text');
 *   console.log(report);
 */

const fs = require('fs');
const path = require('path');
const { resolvePath, fileExists } = require('./file-utils');

// Constants
const PERFORMANCE_LOG_DIR = '.claude/logs';
const PERFORMANCE_LOG_FILE = 'agent-performance.json';
const MAX_LOG_ENTRIES = 1000; // Keep last 1000 entries
const REPORT_VERSION = 1;

/**
 * Agent execution status
 */
const ExecutionStatus = {
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  TIMEOUT: 'TIMEOUT',
  CANCELLED: 'CANCELLED',
};

/**
 * In-memory tracking sessions
 */
const activeSessions = new Map();

/**
 * In-memory statistics aggregation
 */
let aggregateStats = {
  totalExecutions: 0,
  successfulExecutions: 0,
  failedExecutions: 0,
  totalDuration: 0,
  totalTokens: 0,
  cacheHits: 0,
  cacheMisses: 0,
  byAgentType: {}, // { [type]: { count, duration, tokens, success, failed } }
  byTaskType: {},  // { [task]: { count, duration, tokens, success, failed } }
};

/**
 * Get the full path to the performance log file
 * @returns {string} Absolute path to log file
 */
function getLogFilePath() {
  return resolvePath(PERFORMANCE_LOG_DIR, PERFORMANCE_LOG_FILE);
}

/**
 * Ensure log directory exists
 * @returns {boolean} Success status
 */
function ensureLogDirectory() {
  try {
    const logDir = resolvePath(PERFORMANCE_LOG_DIR);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    return true;
  } catch (error) {
    console.error(`[performance-tracker] Failed to create log directory: ${error.message}`);
    return false;
  }
}

/**
 * Load existing performance log from disk
 * @returns {Array} Array of log entries
 */
function loadPerformanceLog() {
  try {
    const logFile = getLogFilePath();

    if (!fileExists(logFile)) {
      return [];
    }

    const content = fs.readFileSync(logFile, 'utf-8');
    const data = JSON.parse(content);

    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error(`[performance-tracker] Failed to load log: ${error.message}`);
    return [];
  }
}

/**
 * Save performance log to disk
 * @param {Array} entries - Log entries to save
 * @returns {boolean} Success status
 */
function savePerformanceLog(entries) {
  try {
    if (!ensureLogDirectory()) {
      return false;
    }

    const logFile = getLogFilePath();

    // Trim to max entries (keep most recent)
    const trimmedEntries = entries.slice(-MAX_LOG_ENTRIES);

    fs.writeFileSync(
      logFile,
      JSON.stringify(trimmedEntries, null, 2),
      'utf-8'
    );

    return true;
  } catch (error) {
    console.error(`[performance-tracker] Failed to save log: ${error.message}`);
    return false;
  }
}

/**
 * Generate a unique session ID
 * @returns {string} Session ID
 */
function generateSessionId() {
  return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Update aggregate statistics with a new entry
 * @param {object} entry - Performance log entry
 */
function updateAggregateStats(entry) {
  aggregateStats.totalExecutions++;

  if (entry.status === ExecutionStatus.SUCCESS) {
    aggregateStats.successfulExecutions++;
  } else {
    aggregateStats.failedExecutions++;
  }

  aggregateStats.totalDuration += entry.duration;
  aggregateStats.totalTokens += entry.tokensUsed || 0;

  if (entry.cacheHit) {
    aggregateStats.cacheHits++;
  } else if (entry.cacheHit === false) { // Explicit false, not undefined
    aggregateStats.cacheMisses++;
  }

  // Track by agent type
  const agentType = entry.agentType || 'unknown';
  if (!aggregateStats.byAgentType[agentType]) {
    aggregateStats.byAgentType[agentType] = {
      count: 0,
      duration: 0,
      tokens: 0,
      success: 0,
      failed: 0,
    };
  }

  const agentStats = aggregateStats.byAgentType[agentType];
  agentStats.count++;
  agentStats.duration += entry.duration;
  agentStats.tokens += entry.tokensUsed || 0;

  if (entry.status === ExecutionStatus.SUCCESS) {
    agentStats.success++;
  } else {
    agentStats.failed++;
  }

  // Track by task type
  const taskType = entry.taskType || entry.taskId || 'unknown';
  if (!aggregateStats.byTaskType[taskType]) {
    aggregateStats.byTaskType[taskType] = {
      count: 0,
      duration: 0,
      tokens: 0,
      success: 0,
      failed: 0,
    };
  }

  const taskStats = aggregateStats.byTaskType[taskType];
  taskStats.count++;
  taskStats.duration += entry.duration;
  taskStats.tokens += entry.tokensUsed || 0;

  if (entry.status === ExecutionStatus.SUCCESS) {
    taskStats.success++;
  } else {
    taskStats.failed++;
  }
}

/**
 * Start tracking an agent execution
 * @param {object} config - Tracking configuration
 * @param {string} config.agentType - Type of agent (e.g., 'research', 'verify', 'implement')
 * @param {string} [config.taskId] - Task identifier
 * @param {string} [config.taskType] - Task type/category
 * @param {object} [config.metadata] - Additional metadata
 * @returns {object} Session object with id and startTime
 */
function startTracking(config) {
  const {
    agentType,
    taskId = null,
    taskType = null,
    metadata = {},
  } = config;

  const sessionId = generateSessionId();
  const session = {
    id: sessionId,
    agentType,
    taskId,
    taskType,
    metadata,
    startTime: Date.now(),
  };

  activeSessions.set(sessionId, session);

  return session;
}

/**
 * End tracking an agent execution
 * @param {string} sessionId - Session ID from startTracking
 * @param {object} result - Execution result
 * @param {boolean} result.success - Whether execution succeeded
 * @param {number} [result.tokensUsed] - Tokens consumed (if available)
 * @param {boolean} [result.cacheHit] - Whether result was from cache
 * @param {string} [result.error] - Error message if failed
 * @param {object} [result.metadata] - Additional result metadata
 * @returns {object|null} Performance log entry or null if session not found
 */
function endTracking(sessionId, result) {
  const session = activeSessions.get(sessionId);

  if (!session) {
    console.error(`[performance-tracker] Session not found: ${sessionId}`);
    return null;
  }

  const endTime = Date.now();
  const duration = endTime - session.startTime;

  // Determine status
  let status = ExecutionStatus.SUCCESS;
  if (!result.success) {
    if (result.error && result.error.includes('timeout')) {
      status = ExecutionStatus.TIMEOUT;
    } else if (result.error && result.error.includes('cancelled')) {
      status = ExecutionStatus.CANCELLED;
    } else {
      status = ExecutionStatus.FAILED;
    }
  }

  // Create log entry
  const entry = {
    sessionId,
    agentType: session.agentType,
    taskId: session.taskId,
    taskType: session.taskType,
    status,
    startTime: session.startTime,
    endTime,
    duration,
    tokensUsed: result.tokensUsed || 0,
    cacheHit: result.cacheHit || false,
    error: result.error || null,
    metadata: {
      ...session.metadata,
      ...result.metadata,
    },
    timestamp: new Date(session.startTime).toISOString(),
  };

  // Remove from active sessions
  activeSessions.delete(sessionId);

  // Update aggregate stats
  updateAggregateStats(entry);

  // Persist to disk
  const existingLog = loadPerformanceLog();
  existingLog.push(entry);
  savePerformanceLog(existingLog);

  return entry;
}

/**
 * Track a complete execution (convenience method)
 * @param {object} config - Combined configuration
 * @param {Function} fn - Async function to execute
 * @returns {Promise<object>} Result with performance data
 */
async function track(config, fn) {
  const session = startTracking(config);

  try {
    const result = await fn();

    const entry = endTracking(session.id, {
      success: true,
      tokensUsed: result.tokensUsed || 0,
      cacheHit: result.fromCache || false,
      metadata: result.metadata || {},
    });

    return {
      success: true,
      result,
      performance: entry,
    };
  } catch (error) {
    const entry = endTracking(session.id, {
      success: false,
      error: error.message,
      metadata: { stack: error.stack },
    });

    return {
      success: false,
      error,
      performance: entry,
    };
  }
}

/**
 * Get current aggregate statistics
 * @returns {object} Aggregate statistics
 */
function getStats() {
  const successRate = aggregateStats.totalExecutions > 0
    ? (aggregateStats.successfulExecutions / aggregateStats.totalExecutions * 100).toFixed(2)
    : '0';

  const avgDuration = aggregateStats.totalExecutions > 0
    ? Math.round(aggregateStats.totalDuration / aggregateStats.totalExecutions)
    : 0;

  const avgTokens = aggregateStats.successfulExecutions > 0
    ? Math.round(aggregateStats.totalTokens / aggregateStats.successfulExecutions)
    : 0;

  const cacheHitRate = (aggregateStats.cacheHits + aggregateStats.cacheMisses) > 0
    ? (aggregateStats.cacheHits / (aggregateStats.cacheHits + aggregateStats.cacheMisses) * 100).toFixed(2)
    : '0';

  return {
    summary: {
      totalExecutions: aggregateStats.totalExecutions,
      successfulExecutions: aggregateStats.successfulExecutions,
      failedExecutions: aggregateStats.failedExecutions,
      successRate: `${successRate}%`,
      avgDuration: `${avgDuration}ms`,
      avgTokens,
      totalTokens: aggregateStats.totalTokens,
      cacheHitRate: `${cacheHitRate}%`,
    },
    byAgentType: aggregateStats.byAgentType,
    byTaskType: aggregateStats.byTaskType,
  };
}

/**
 * Calculate optimization recommendations based on performance data
 * @param {object} stats - Statistics object from getStats()
 * @returns {Array} Array of recommendation objects
 */
function generateRecommendations(stats) {
  const recommendations = [];

  // Check cache hit rate
  const cacheHitRate = parseFloat(stats.summary.cacheHitRate);
  if (cacheHitRate < 30 && aggregateStats.totalExecutions > 10) {
    recommendations.push({
      type: 'cache',
      priority: 'high',
      title: 'Low cache hit rate detected',
      description: `Current cache hit rate is ${stats.summary.cacheHitRate}. Consider increasing cache TTL or identifying repeated tasks that should be cached.`,
      impact: 'Could reduce execution time and token usage by 40-60%',
    });
  }

  // Check for slow agent types
  for (const [agentType, typeStats] of Object.entries(stats.byAgentType)) {
    const avgDuration = typeStats.count > 0 ? typeStats.duration / typeStats.count : 0;

    if (avgDuration > 30000 && typeStats.count > 5) { // > 30s avg
      recommendations.push({
        type: 'performance',
        priority: 'medium',
        title: `Slow ${agentType} agent detected`,
        description: `Average execution time for ${agentType} agents is ${Math.round(avgDuration / 1000)}s. Consider optimizing prompts, reducing context size, or parallelizing sub-tasks.`,
        impact: 'Could reduce execution time by 20-40%',
      });
    }
  }

  // Check for high failure rates
  for (const [agentType, typeStats] of Object.entries(stats.byAgentType)) {
    const failureRate = typeStats.count > 0 ? (typeStats.failed / typeStats.count * 100) : 0;

    if (failureRate > 20 && typeStats.count > 5) {
      recommendations.push({
        type: 'reliability',
        priority: 'high',
        title: `High failure rate for ${agentType} agents`,
        description: `${failureRate.toFixed(1)}% of ${agentType} agent executions fail. Review error logs, improve error handling, or adjust timeout settings.`,
        impact: 'Could improve success rate by 15-30%',
      });
    }
  }

  // Check for token-heavy agents
  for (const [agentType, typeStats] of Object.entries(stats.byAgentType)) {
    const avgTokens = typeStats.success > 0 ? typeStats.tokens / typeStats.success : 0;

    if (avgTokens > 5000 && typeStats.count > 5) {
      recommendations.push({
        type: 'cost',
        priority: 'medium',
        title: `High token usage for ${agentType} agents`,
        description: `Average token usage for ${agentType} agents is ${Math.round(avgTokens)}. Consider reducing prompt size, using smaller models for simple tasks, or implementing result streaming.`,
        impact: 'Could reduce costs by 20-50%',
      });
    }
  }

  // Check for parallelization opportunities
  const taskTypes = Object.keys(stats.byTaskType);
  const frequentTasks = taskTypes.filter(task => stats.byTaskType[task].count > 10);

  if (frequentTasks.length > 3 && aggregateStats.totalExecutions > 50) {
    recommendations.push({
      type: 'parallelization',
      priority: 'low',
      title: 'Parallelization opportunity detected',
      description: `Detected ${frequentTasks.length} frequently executed task types. Consider batching and parallelizing similar tasks using the agent pool.`,
      impact: 'Could reduce total execution time by 30-60%',
    });
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return recommendations;
}

/**
 * Generate performance report
 * @param {string} format - Report format: 'text', 'json', or 'summary'
 * @param {object} options - Report options
 * @param {boolean} [options.includeRecommendations=true] - Include optimization recommendations
 * @param {number} [options.lastN] - Only include last N entries for analysis
 * @returns {string|object} Report in requested format
 */
function generateReport(format = 'text', options = {}) {
  const {
    includeRecommendations = true,
    lastN = null,
  } = options;

  // Rebuild stats from log if lastN specified
  let stats = getStats();

  if (lastN !== null) {
    const log = loadPerformanceLog();
    const recentEntries = log.slice(-lastN);

    // Rebuild aggregate stats from recent entries
    const tempStats = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      totalDuration: 0,
      totalTokens: 0,
      cacheHits: 0,
      cacheMisses: 0,
      byAgentType: {},
      byTaskType: {},
    };

    // Temporarily swap stats
    const originalStats = aggregateStats;
    aggregateStats = tempStats;

    recentEntries.forEach(entry => updateAggregateStats(entry));

    stats = getStats();
    aggregateStats = originalStats; // Restore
  }

  const recommendations = includeRecommendations ? generateRecommendations(stats) : [];

  // JSON format
  if (format === 'json') {
    return JSON.stringify({
      version: REPORT_VERSION,
      generatedAt: new Date().toISOString(),
      stats,
      recommendations,
    }, null, 2);
  }

  // Summary format (compact)
  if (format === 'summary') {
    return {
      version: REPORT_VERSION,
      generatedAt: new Date().toISOString(),
      summary: stats.summary,
      topRecommendations: recommendations.slice(0, 3),
    };
  }

  // Text format (default)
  const lines = [];

  lines.push('═══════════════════════════════════════════════════════');
  lines.push('           AGENT PERFORMANCE REPORT');
  lines.push('═══════════════════════════════════════════════════════');
  lines.push('');

  // Summary section
  lines.push('SUMMARY');
  lines.push('───────────────────────────────────────────────────────');
  lines.push(`Total Executions:      ${stats.summary.totalExecutions}`);
  lines.push(`Successful:            ${stats.summary.successfulExecutions}`);
  lines.push(`Failed:                ${stats.summary.failedExecutions}`);
  lines.push(`Success Rate:          ${stats.summary.successRate}`);
  lines.push(`Average Duration:      ${stats.summary.avgDuration}`);
  lines.push(`Average Tokens/Task:   ${stats.summary.avgTokens}`);
  lines.push(`Total Tokens Used:     ${stats.summary.totalTokens.toLocaleString()}`);
  lines.push(`Cache Hit Rate:        ${stats.summary.cacheHitRate}`);
  lines.push('');

  // Agent type breakdown
  if (Object.keys(stats.byAgentType).length > 0) {
    lines.push('BY AGENT TYPE');
    lines.push('───────────────────────────────────────────────────────');

    for (const [agentType, typeStats] of Object.entries(stats.byAgentType)) {
      const avgDuration = typeStats.count > 0 ? Math.round(typeStats.duration / typeStats.count) : 0;
      const avgTokens = typeStats.success > 0 ? Math.round(typeStats.tokens / typeStats.success) : 0;
      const successRate = typeStats.count > 0 ? ((typeStats.success / typeStats.count) * 100).toFixed(1) : '0';

      lines.push(`${agentType}:`);
      lines.push(`  Executions:     ${typeStats.count}`);
      lines.push(`  Success Rate:   ${successRate}%`);
      lines.push(`  Avg Duration:   ${avgDuration}ms`);
      lines.push(`  Avg Tokens:     ${avgTokens}`);
      lines.push(`  Total Tokens:   ${typeStats.tokens.toLocaleString()}`);
      lines.push('');
    }
  }

  // Task type breakdown (top 5)
  if (Object.keys(stats.byTaskType).length > 0) {
    lines.push('TOP TASK TYPES (by frequency)');
    lines.push('───────────────────────────────────────────────────────');

    const sortedTasks = Object.entries(stats.byTaskType)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5);

    for (const [taskType, taskStats] of sortedTasks) {
      const avgDuration = taskStats.count > 0 ? Math.round(taskStats.duration / taskStats.count) : 0;
      const successRate = taskStats.count > 0 ? ((taskStats.success / taskStats.count) * 100).toFixed(1) : '0';

      lines.push(`${taskType}: ${taskStats.count} executions, ${successRate}% success, ${avgDuration}ms avg`);
    }
    lines.push('');
  }

  // Recommendations
  if (includeRecommendations && recommendations.length > 0) {
    lines.push('OPTIMIZATION RECOMMENDATIONS');
    lines.push('───────────────────────────────────────────────────────');

    recommendations.forEach((rec, i) => {
      const priorityLabel = rec.priority.toUpperCase();
      lines.push(`${i + 1}. [${priorityLabel}] ${rec.title}`);
      lines.push(`   ${rec.description}`);
      lines.push(`   Impact: ${rec.impact}`);
      lines.push('');
    });
  }

  // Token cost estimation (assuming Claude pricing)
  const estimatedCost = (stats.summary.totalTokens / 1000000) * 3.0; // $3 per million tokens (rough estimate)
  if (estimatedCost > 0.01) {
    lines.push('COST ESTIMATION');
    lines.push('───────────────────────────────────────────────────────');
    lines.push(`Estimated Cost: $${estimatedCost.toFixed(4)}`);
    lines.push('(Based on ~$3/million tokens - actual costs may vary)');
    lines.push('');
  }

  lines.push('═══════════════════════════════════════════════════════');
  lines.push(`Generated: ${new Date().toLocaleString()}`);
  lines.push(`Log File: ${getLogFilePath()}`);
  lines.push('═══════════════════════════════════════════════════════');

  return lines.join('\n');
}

/**
 * Clear all performance logs
 * @returns {boolean} Success status
 */
function clearLogs() {
  try {
    const logFile = getLogFilePath();

    if (fileExists(logFile)) {
      fs.unlinkSync(logFile);
    }

    // Reset aggregate stats
    aggregateStats = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      totalDuration: 0,
      totalTokens: 0,
      cacheHits: 0,
      cacheMisses: 0,
      byAgentType: {},
      byTaskType: {},
    };

    return true;
  } catch (error) {
    console.error(`[performance-tracker] Failed to clear logs: ${error.message}`);
    return false;
  }
}

/**
 * Export performance log entries for analysis
 * @param {object} options - Export options
 * @param {number} [options.lastN] - Export last N entries
 * @param {string} [options.agentType] - Filter by agent type
 * @param {string} [options.status] - Filter by status
 * @returns {Array} Filtered log entries
 */
function exportLogs(options = {}) {
  const {
    lastN = null,
    agentType = null,
    status = null,
  } = options;

  let entries = loadPerformanceLog();

  // Apply filters
  if (agentType) {
    entries = entries.filter(e => e.agentType === agentType);
  }

  if (status) {
    entries = entries.filter(e => e.status === status);
  }

  // Apply limit
  if (lastN !== null) {
    entries = entries.slice(-lastN);
  }

  return entries;
}

/**
 * Initialize tracker by loading existing logs into memory
 */
function initialize() {
  const entries = loadPerformanceLog();

  // Rebuild aggregate stats
  aggregateStats = {
    totalExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    totalDuration: 0,
    totalTokens: 0,
    cacheHits: 0,
    cacheMisses: 0,
    byAgentType: {},
    byTaskType: {},
  };

  entries.forEach(entry => updateAggregateStats(entry));

  console.error(`[performance-tracker] Initialized with ${entries.length} historical entries`);
}

// Initialize on module load
initialize();

module.exports = {
  // Core tracking
  startTracking,
  endTracking,
  track,

  // Statistics and reporting
  getStats,
  generateReport,
  generateRecommendations,

  // Data management
  clearLogs,
  exportLogs,
  initialize,

  // Constants
  ExecutionStatus,
  PERFORMANCE_LOG_FILE,
  PERFORMANCE_LOG_DIR,
};
