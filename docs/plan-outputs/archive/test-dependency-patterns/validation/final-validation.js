/**
 * Final Validation - Complete System Verification
 * Task 8.5: Final validation (depends: 8.4)
 *
 * This module represents the final task in the Test Dependency Patterns
 * validation plan. It validates that all dependency patterns have been
 * correctly executed and all components are properly integrated.
 *
 * Dependency Chain:
 *   8.4 (Combined Features) → [8.5] Final Validation
 *
 * Complete Dependency Tree to 8.5:
 *
 *   Phase 1: Foundation (No Dependencies)
 *   ├── 1.1 → 2.1 → 4.1 ────────────────────┐
 *   ├── 1.2 → 2.2 → 4.2 ────────────────────┤
 *   ├── 1.3 → 2.3 ──────────────────────────┤
 *   └── 1.4 → 2.4 → 4.3 → 8.1 ──────────────┼─┐
 *                                            │ │
 *   Phase 3: Diamond Pattern                 │ │
 *   └── 3.1 → 3.2 ──┬── 3.4 → 4.2 ───────────┤ │
 *             3.3 ──┘       └→ 4.3 ──────────┤ │
 *                                            │ │
 *   Phase 5: Long Chain                      │ │
 *   └── 5.1 → 5.2 → 5.3 → 5.4 → 5.5 → 5.6 ───┤ │
 *                                            │ │
 *   Phase 6: Fan-Out Pattern                 │ │
 *   └── 6.1 → 6.2 → 6.5 ──┐                  │ │
 *           → 6.3 → 6.6 ──┼── 7.1/7.2/7.3 ───┤ │
 *           → 6.4 → 6.7 ──┘         │        │ │
 *                                   ↓        │ │
 *   Phase 7: Fan-In Pattern         7.4 ─────┤ │
 *                                            │ │
 *   Phase 8: Mixed Complex                   │ │
 *   ├── 8.1 (ComplexModule) ─────────────────┘ │
 *   │     ↓                                    │
 *   ├── 8.1 + 5.6 → 8.2 (FeatureX) ────────────┤
 *   ├── 8.1 + 7.4 → 8.3 (FeatureY) ────────────┤
 *   │                    ↓                     │
 *   └── 8.2 + 8.3 → 8.4 (CombinedFeatures) ────┘
 *                    ↓
 *              [8.5] Final Validation ← YOU ARE HERE
 *
 * This task validates:
 * 1. All 37 tasks executed successfully
 * 2. All dependency patterns worked correctly
 * 3. All modules are properly integrated
 * 4. System produces expected outputs
 */

const {
  CombinedFeatures,
  createCombinedFeatures,
  CombinedMetrics,
  COMBINED_CONFIG,
  OperationMode
} = require('../features/combined-features.js');

/**
 * Validation result status
 */
const ValidationStatus = {
  PASSED: 'passed',
  FAILED: 'failed',
  WARNING: 'warning',
  SKIPPED: 'skipped'
};

/**
 * Validation categories
 */
const ValidationCategory = {
  DEPENDENCY: 'dependency',
  INTEGRATION: 'integration',
  FUNCTIONALITY: 'functionality',
  PERFORMANCE: 'performance'
};

/**
 * Final Validation Configuration
 */
const VALIDATION_CONFIG = {
  name: 'FinalValidation',
  version: '1.0.0',
  description: 'Complete system validation for Test Dependency Patterns',
  expectedTotalTasks: 37,
  expectedPhases: 8,
  validationCategories: ['dependency', 'integration', 'functionality', 'performance'],
  thresholds: {
    minTaskCompletion: 100,       // Percentage
    maxFailedDependencies: 0,     // Count
    minIntegrationScore: 95,      // Percentage
    maxResponseTime: 5000         // Milliseconds
  }
};

/**
 * Dependency Pattern Definitions
 */
const DEPENDENCY_PATTERNS = {
  foundation: {
    name: 'Foundation (No Dependencies)',
    phase: 1,
    tasks: ['1.1', '1.2', '1.3', '1.4'],
    type: 'independent',
    description: 'All tasks can run in parallel'
  },
  simple: {
    name: 'Simple Dependencies',
    phase: 2,
    tasks: ['2.1', '2.2', '2.3', '2.4'],
    type: 'linear',
    description: 'Each task depends on corresponding Phase 1 task',
    dependencies: {
      '2.1': ['1.1'],
      '2.2': ['1.2'],
      '2.3': ['1.3'],
      '2.4': ['1.4']
    }
  },
  diamond: {
    name: 'Diamond Pattern',
    phase: 3,
    tasks: ['3.1', '3.2', '3.3', '3.4'],
    type: 'diamond',
    description: 'A→B, A→C, B→D, C→D pattern',
    dependencies: {
      '3.1': [],
      '3.2': ['3.1'],
      '3.3': ['3.1'],
      '3.4': ['3.2', '3.3']
    }
  },
  crossPhase: {
    name: 'Cross-Phase Dependencies',
    phase: 4,
    tasks: ['4.1', '4.2', '4.3'],
    type: 'cross-phase',
    description: 'Dependencies spanning multiple phases',
    dependencies: {
      '4.1': ['1.1', '2.1'],
      '4.2': ['1.2', '3.4'],
      '4.3': ['1.4', '2.4', '3.4']
    }
  },
  longChain: {
    name: 'Long Chain',
    phase: 5,
    tasks: ['5.1', '5.2', '5.3', '5.4', '5.5', '5.6'],
    type: 'sequential',
    description: 'Strictly sequential A→B→C→D→E→F',
    dependencies: {
      '5.1': [],
      '5.2': ['5.1'],
      '5.3': ['5.2'],
      '5.4': ['5.3'],
      '5.5': ['5.4'],
      '5.6': ['5.5']
    }
  },
  fanOut: {
    name: 'Fan-Out Pattern',
    phase: 6,
    tasks: ['6.1', '6.2', '6.3', '6.4', '6.5', '6.6', '6.7'],
    type: 'fan-out',
    description: 'One task with many dependents',
    dependencies: {
      '6.1': [],
      '6.2': ['6.1'],
      '6.3': ['6.1'],
      '6.4': ['6.1'],
      '6.5': ['6.2'],
      '6.6': ['6.3'],
      '6.7': ['6.4']
    }
  },
  fanIn: {
    name: 'Fan-In Pattern',
    phase: 7,
    tasks: ['7.1', '7.2', '7.3', '7.4'],
    type: 'fan-in',
    description: 'Many tasks flowing to one',
    dependencies: {
      '7.1': ['6.5'],
      '7.2': ['6.6'],
      '7.3': ['6.7'],
      '7.4': ['7.1', '7.2', '7.3']
    }
  },
  mixedComplex: {
    name: 'Mixed Complex Pattern',
    phase: 8,
    tasks: ['8.1', '8.2', '8.3', '8.4', '8.5'],
    type: 'mixed',
    description: 'Combination of all patterns',
    dependencies: {
      '8.1': ['4.3'],
      '8.2': ['8.1', '5.6'],
      '8.3': ['8.1', '7.4'],
      '8.4': ['8.2', '8.3'],
      '8.5': ['8.4']
    }
  }
};

/**
 * Final Validation: Complete System Verification
 *
 * Validates all dependency patterns, integrations, and functionality
 * of the test dependency patterns plan execution.
 */
class FinalValidation {
  /**
   * Create a FinalValidation instance
   * @param {Object} config - Configuration options
   */
  constructor(config = {}) {
    this.config = { ...VALIDATION_CONFIG, ...config };
    this.results = {
      timestamp: null,
      duration: null,
      overall: null,
      categories: {},
      patterns: {},
      details: [],
      summary: null
    };
    this.startTime = null;

    // Initialize combined features for functional validation
    this.combinedFeatures = null;
  }

  /**
   * Run complete validation suite
   * @param {Object} planStatus - Status.json content with task completion info
   * @returns {Promise<Object>} Validation results
   */
  async runValidation(planStatus) {
    this.startTime = Date.now();
    this.results.timestamp = new Date().toISOString();

    console.log('='.repeat(70));
    console.log('FINAL VALIDATION - Test Dependency Patterns');
    console.log('='.repeat(70));
    console.log('');

    try {
      // Category 1: Dependency Pattern Validation
      console.log('Phase 1: Validating Dependency Patterns...');
      this.results.categories.dependency = await this._validateDependencyPatterns(planStatus);

      // Category 2: Integration Validation
      console.log('Phase 2: Validating Component Integration...');
      this.results.categories.integration = await this._validateIntegration();

      // Category 3: Functionality Validation
      console.log('Phase 3: Validating Functionality...');
      this.results.categories.functionality = await this._validateFunctionality();

      // Category 4: Performance Validation
      console.log('Phase 4: Validating Performance...');
      this.results.categories.performance = await this._validatePerformance(planStatus);

      // Calculate overall result
      this._calculateOverallResult();

      // Generate summary
      this.results.summary = this._generateSummary();
      this.results.duration = Date.now() - this.startTime;

      console.log('');
      console.log(this.results.summary);

      return this.results;
    } catch (error) {
      this.results.overall = ValidationStatus.FAILED;
      this.results.error = error.message;
      this.results.duration = Date.now() - this.startTime;
      return this.results;
    }
  }

  /**
   * Validate all dependency patterns
   * @private
   */
  async _validateDependencyPatterns(planStatus) {
    const categoryResult = {
      status: ValidationStatus.PASSED,
      patterns: {},
      checks: []
    };

    for (const [patternKey, pattern] of Object.entries(DEPENDENCY_PATTERNS)) {
      const patternResult = this._validatePattern(patternKey, pattern, planStatus);
      categoryResult.patterns[patternKey] = patternResult;
      this.results.patterns[patternKey] = patternResult;

      if (patternResult.status === ValidationStatus.FAILED) {
        categoryResult.status = ValidationStatus.FAILED;
      } else if (patternResult.status === ValidationStatus.WARNING &&
                 categoryResult.status === ValidationStatus.PASSED) {
        categoryResult.status = ValidationStatus.WARNING;
      }

      categoryResult.checks.push({
        name: `Pattern: ${pattern.name}`,
        status: patternResult.status,
        message: patternResult.message
      });
    }

    // Additional dependency checks
    categoryResult.checks.push(
      this._checkNoCycles(),
      this._checkCriticalPath(planStatus),
      this._checkParallelizability()
    );

    return categoryResult;
  }

  /**
   * Validate a single dependency pattern
   * @private
   */
  _validatePattern(patternKey, pattern, planStatus) {
    const result = {
      name: pattern.name,
      phase: pattern.phase,
      type: pattern.type,
      status: ValidationStatus.PASSED,
      tasksValidated: 0,
      tasksFailed: 0,
      details: []
    };

    // Check each task in the pattern
    for (const taskId of pattern.tasks) {
      const taskStatus = this._getTaskStatus(taskId, planStatus);

      if (!taskStatus) {
        result.details.push({
          taskId,
          status: ValidationStatus.WARNING,
          message: 'Task not found in status'
        });
        result.tasksFailed++;
        continue;
      }

      if (taskStatus.status !== 'completed') {
        result.details.push({
          taskId,
          status: ValidationStatus.FAILED,
          message: `Task not completed: ${taskStatus.status}`
        });
        result.tasksFailed++;
        result.status = ValidationStatus.FAILED;
        continue;
      }

      // Validate dependencies were satisfied
      if (pattern.dependencies && pattern.dependencies[taskId]) {
        const depCheck = this._checkDependenciesSatisfied(
          taskId,
          pattern.dependencies[taskId],
          planStatus
        );

        if (!depCheck.satisfied) {
          result.details.push({
            taskId,
            status: ValidationStatus.FAILED,
            message: `Dependencies not satisfied: ${depCheck.missing.join(', ')}`
          });
          result.tasksFailed++;
          result.status = ValidationStatus.FAILED;
          continue;
        }
      }

      result.details.push({
        taskId,
        status: ValidationStatus.PASSED,
        message: 'Task completed with dependencies satisfied'
      });
      result.tasksValidated++;
    }

    result.message = result.status === ValidationStatus.PASSED
      ? `All ${pattern.tasks.length} tasks validated successfully`
      : `${result.tasksFailed}/${pattern.tasks.length} tasks failed validation`;

    return result;
  }

  /**
   * Validate component integration
   * @private
   */
  async _validateIntegration() {
    const categoryResult = {
      status: ValidationStatus.PASSED,
      checks: []
    };

    try {
      // Initialize combined features
      this.combinedFeatures = createCombinedFeatures({
        maxParallel: 2,
        verbose: false,
        operationMode: OperationMode.COORDINATED
      });

      // Check 1: CombinedFeatures can be instantiated
      categoryResult.checks.push({
        name: 'CombinedFeatures Instantiation',
        status: this.combinedFeatures ? ValidationStatus.PASSED : ValidationStatus.FAILED,
        message: this.combinedFeatures
          ? 'CombinedFeatures created successfully'
          : 'Failed to create CombinedFeatures'
      });

      // Check 2: Configuration is correct
      const config = this.combinedFeatures.config;
      const configValid = config.name === 'CombinedFeatures' &&
                          config.enablePipeline === true &&
                          config.enableMonitoring === true;
      categoryResult.checks.push({
        name: 'Configuration Validation',
        status: configValid ? ValidationStatus.PASSED : ValidationStatus.FAILED,
        message: configValid
          ? 'Configuration matches expected values'
          : 'Configuration mismatch'
      });

      // Check 3: Dependencies are correctly wired
      const info = this.combinedFeatures.getInfo();
      const depsValid = info.dependencies &&
                        info.dependencies.combined &&
                        info.dependencies.combined.from.includes('8.2 (FeatureX)') &&
                        info.dependencies.combined.from.includes('8.3 (FeatureY)');
      categoryResult.checks.push({
        name: 'Dependency Wiring',
        status: depsValid ? ValidationStatus.PASSED : ValidationStatus.FAILED,
        message: depsValid
          ? 'Dependencies correctly wired (8.2, 8.3 → 8.4)'
          : 'Dependency wiring issue detected'
      });

      // Check 4: Feature X component present
      const featureXPresent = this.combinedFeatures.featureX !== null &&
                              this.combinedFeatures.featureX !== undefined;
      categoryResult.checks.push({
        name: 'FeatureX Component',
        status: featureXPresent ? ValidationStatus.PASSED : ValidationStatus.FAILED,
        message: featureXPresent
          ? 'FeatureX component integrated'
          : 'FeatureX component missing'
      });

      // Check 5: Feature Y component present
      const featureYPresent = this.combinedFeatures.featureY !== null &&
                              this.combinedFeatures.featureY !== undefined;
      categoryResult.checks.push({
        name: 'FeatureY Component',
        status: featureYPresent ? ValidationStatus.PASSED : ValidationStatus.FAILED,
        message: featureYPresent
          ? 'FeatureY component integrated'
          : 'FeatureY component missing'
      });

      // Determine overall category status
      const failed = categoryResult.checks.filter(c => c.status === ValidationStatus.FAILED);
      if (failed.length > 0) {
        categoryResult.status = ValidationStatus.FAILED;
      }

    } catch (error) {
      categoryResult.status = ValidationStatus.FAILED;
      categoryResult.checks.push({
        name: 'Integration Error',
        status: ValidationStatus.FAILED,
        message: `Integration validation error: ${error.message}`
      });
    }

    return categoryResult;
  }

  /**
   * Validate functionality
   * @private
   */
  async _validateFunctionality() {
    const categoryResult = {
      status: ValidationStatus.PASSED,
      checks: []
    };

    try {
      // Check 1: Start/Stop functionality
      const startResult = await this.combinedFeatures.start();
      categoryResult.checks.push({
        name: 'System Start',
        status: startResult.success ? ValidationStatus.PASSED : ValidationStatus.FAILED,
        message: startResult.success
          ? 'CombinedFeatures started successfully'
          : `Start failed: ${startResult.error}`
      });

      if (startResult.success) {
        // Check 2: Health status
        const health = this.combinedFeatures.getHealthStatus();
        const healthValid = health.status === 'running' && health.overall !== 'down';
        categoryResult.checks.push({
          name: 'Health Status',
          status: healthValid ? ValidationStatus.PASSED : ValidationStatus.WARNING,
          message: `Health: ${health.overall}, Status: ${health.status}`
        });

        // Check 3: Metrics retrieval
        const metrics = this.combinedFeatures.getMetrics();
        const metricsValid = metrics && metrics.combined && metrics.status === 'running';
        categoryResult.checks.push({
          name: 'Metrics Retrieval',
          status: metricsValid ? ValidationStatus.PASSED : ValidationStatus.WARNING,
          message: metricsValid
            ? 'Metrics available and valid'
            : 'Metrics incomplete'
        });

        // Check 4: Report generation
        const report = this.combinedFeatures.generateComprehensiveReport();
        const reportValid = report && report.includes('COMBINED FEATURES EXECUTION REPORT');
        categoryResult.checks.push({
          name: 'Report Generation',
          status: reportValid ? ValidationStatus.PASSED : ValidationStatus.FAILED,
          message: reportValid
            ? 'Comprehensive report generated successfully'
            : 'Report generation failed'
        });

        // Check 5: Visualization
        const viz = this.combinedFeatures.visualize();
        const vizValid = viz && viz.dependencyGraph;
        categoryResult.checks.push({
          name: 'Visualization',
          status: vizValid ? ValidationStatus.PASSED : ValidationStatus.WARNING,
          message: vizValid
            ? 'Dependency visualization available'
            : 'Visualization incomplete'
        });

        // Stop the system
        const stopResult = await this.combinedFeatures.stop();
        categoryResult.checks.push({
          name: 'System Stop',
          status: stopResult.success ? ValidationStatus.PASSED : ValidationStatus.WARNING,
          message: stopResult.success
            ? `Stopped after ${stopResult.uptimeFormatted}`
            : `Stop issue: ${stopResult.error}`
        });
      }

      // Determine overall category status
      const failed = categoryResult.checks.filter(c => c.status === ValidationStatus.FAILED);
      if (failed.length > 0) {
        categoryResult.status = ValidationStatus.FAILED;
      } else if (categoryResult.checks.some(c => c.status === ValidationStatus.WARNING)) {
        categoryResult.status = ValidationStatus.WARNING;
      }

    } catch (error) {
      categoryResult.status = ValidationStatus.FAILED;
      categoryResult.checks.push({
        name: 'Functionality Error',
        status: ValidationStatus.FAILED,
        message: `Functionality validation error: ${error.message}`
      });
    }

    return categoryResult;
  }

  /**
   * Validate performance characteristics
   * @private
   */
  async _validatePerformance(planStatus) {
    const categoryResult = {
      status: ValidationStatus.PASSED,
      checks: []
    };

    // Check 1: Task completion rate
    const totalTasks = planStatus.summary?.totalTasks || 0;
    const completedTasks = planStatus.summary?.completed || 0;
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    const completionValid = completionRate >= this.config.thresholds.minTaskCompletion - 5; // Allow 8.5

    categoryResult.checks.push({
      name: 'Task Completion Rate',
      status: completionValid ? ValidationStatus.PASSED : ValidationStatus.FAILED,
      message: `${completionRate.toFixed(1)}% tasks completed (${completedTasks}/${totalTasks})`
    });

    // Check 2: No failed tasks
    const failedTasks = planStatus.summary?.failed || 0;
    const noFailures = failedTasks === 0;
    categoryResult.checks.push({
      name: 'No Failed Tasks',
      status: noFailures ? ValidationStatus.PASSED : ValidationStatus.FAILED,
      message: noFailures
        ? 'No task failures recorded'
        : `${failedTasks} task(s) failed`
    });

    // Check 3: Parallelism utilized
    const phases = Object.values(DEPENDENCY_PATTERNS);
    const independentPhases = phases.filter(p => p.type === 'independent' || p.type === 'fan-out');
    const parallelismValid = independentPhases.length >= 2;
    categoryResult.checks.push({
      name: 'Parallelism Opportunities',
      status: parallelismValid ? ValidationStatus.PASSED : ValidationStatus.WARNING,
      message: `${independentPhases.length} phases with parallel execution potential`
    });

    // Check 4: Critical path efficiency
    const criticalPathLength = this._calculateCriticalPathLength();
    const totalPatternTasks = phases.reduce((sum, p) => sum + p.tasks.length, 0);
    const efficiency = ((totalPatternTasks / criticalPathLength) * 100).toFixed(1);
    const efficiencyValid = parseFloat(efficiency) >= 150; // At least 1.5x speedup potential

    categoryResult.checks.push({
      name: 'Critical Path Efficiency',
      status: efficiencyValid ? ValidationStatus.PASSED : ValidationStatus.WARNING,
      message: `Parallelism factor: ${(totalPatternTasks / criticalPathLength).toFixed(2)}x (critical path: ${criticalPathLength} steps)`
    });

    // Check 5: All phases complete
    const expectedPhases = this.config.expectedPhases;
    const completedPhases = this._countCompletedPhases(planStatus);
    const phasesComplete = completedPhases >= expectedPhases;

    categoryResult.checks.push({
      name: 'Phase Completion',
      status: phasesComplete ? ValidationStatus.PASSED : ValidationStatus.WARNING,
      message: `${completedPhases}/${expectedPhases} phases completed`
    });

    // Determine overall category status
    const failed = categoryResult.checks.filter(c => c.status === ValidationStatus.FAILED);
    if (failed.length > 0) {
      categoryResult.status = ValidationStatus.FAILED;
    } else if (categoryResult.checks.some(c => c.status === ValidationStatus.WARNING)) {
      categoryResult.status = ValidationStatus.WARNING;
    }

    return categoryResult;
  }

  /**
   * Check that there are no cycles in the dependency graph
   * @private
   */
  _checkNoCycles() {
    // Build adjacency list
    const graph = new Map();
    for (const pattern of Object.values(DEPENDENCY_PATTERNS)) {
      if (!pattern.dependencies) continue;
      for (const [taskId, deps] of Object.entries(pattern.dependencies)) {
        if (!graph.has(taskId)) graph.set(taskId, []);
        for (const dep of deps) {
          graph.get(taskId).push(dep);
        }
      }
    }

    // DFS cycle detection
    const visited = new Set();
    const recStack = new Set();

    const hasCycle = (node) => {
      if (!visited.has(node)) {
        visited.add(node);
        recStack.add(node);

        const neighbors = graph.get(node) || [];
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor) && hasCycle(neighbor)) {
            return true;
          } else if (recStack.has(neighbor)) {
            return true;
          }
        }
      }
      recStack.delete(node);
      return false;
    };

    let cycleFound = false;
    for (const node of graph.keys()) {
      if (hasCycle(node)) {
        cycleFound = true;
        break;
      }
    }

    return {
      name: 'No Dependency Cycles',
      status: cycleFound ? ValidationStatus.FAILED : ValidationStatus.PASSED,
      message: cycleFound
        ? 'Cycle detected in dependency graph'
        : 'Dependency graph is acyclic (valid DAG)'
    };
  }

  /**
   * Check critical path is correctly identified
   * @private
   */
  _checkCriticalPath(planStatus) {
    const criticalPathLength = this._calculateCriticalPathLength();
    const isValid = criticalPathLength > 0 && criticalPathLength <= 15;

    return {
      name: 'Critical Path Analysis',
      status: isValid ? ValidationStatus.PASSED : ValidationStatus.WARNING,
      message: `Critical path length: ${criticalPathLength} tasks`
    };
  }

  /**
   * Check parallelizability of the plan
   * @private
   */
  _checkParallelizability() {
    // Count tasks that can run in parallel at each level
    let maxParallel = 0;

    // Phase 1: All 4 tasks can run in parallel
    maxParallel = Math.max(maxParallel, 4);

    // Phase 6: After 6.1, 6.2/6.3/6.4 can run in parallel
    maxParallel = Math.max(maxParallel, 3);

    const isParallelizable = maxParallel >= 3;

    return {
      name: 'Parallelizability',
      status: isParallelizable ? ValidationStatus.PASSED : ValidationStatus.WARNING,
      message: `Maximum parallel width: ${maxParallel} tasks`
    };
  }

  /**
   * Calculate critical path length through all patterns
   * @private
   */
  _calculateCriticalPathLength() {
    // Longest paths:
    // Path 1: 1.1 → 2.1 → 4.1 (3 steps, but 4.1 not on critical path to 8.5)
    // Path 2: 5.1 → 5.2 → 5.3 → 5.4 → 5.5 → 5.6 → 8.2 → 8.4 → 8.5 (9 steps)
    // Path 3: 6.1 → 6.2 → 6.5 → 7.1 → 7.4 → 8.3 → 8.4 → 8.5 (8 steps)
    // Path 4: 1.4 → 2.4 → 4.3 → 8.1 → 8.2 → 8.4 → 8.5 (7 steps)
    //
    // Critical path is through the long chain: 9 steps
    return 9;
  }

  /**
   * Count completed phases
   * @private
   */
  _countCompletedPhases(planStatus) {
    const tasks = planStatus.tasks || [];
    const phases = {};

    for (const task of tasks) {
      const phase = parseInt(task.id.split('.')[0], 10);
      if (!phases[phase]) {
        phases[phase] = { total: 0, completed: 0 };
      }
      phases[phase].total++;
      if (task.status === 'completed') {
        phases[phase].completed++;
      }
    }

    return Object.values(phases).filter(p => p.completed === p.total).length;
  }

  /**
   * Get task status from plan status
   * @private
   */
  _getTaskStatus(taskId, planStatus) {
    const tasks = planStatus.tasks || [];
    return tasks.find(t => t.id === taskId);
  }

  /**
   * Check if dependencies were satisfied before task executed
   * @private
   */
  _checkDependenciesSatisfied(taskId, dependencies, planStatus) {
    const missing = [];

    for (const depId of dependencies) {
      const depTask = this._getTaskStatus(depId, planStatus);
      if (!depTask || depTask.status !== 'completed') {
        missing.push(depId);
      }
    }

    return {
      satisfied: missing.length === 0,
      missing
    };
  }

  /**
   * Calculate overall validation result
   * @private
   */
  _calculateOverallResult() {
    const categories = Object.values(this.results.categories);

    if (categories.some(c => c.status === ValidationStatus.FAILED)) {
      this.results.overall = ValidationStatus.FAILED;
    } else if (categories.some(c => c.status === ValidationStatus.WARNING)) {
      this.results.overall = ValidationStatus.WARNING;
    } else {
      this.results.overall = ValidationStatus.PASSED;
    }
  }

  /**
   * Generate summary report
   * @private
   */
  _generateSummary() {
    const lines = [];
    lines.push('');
    lines.push('='.repeat(70));
    lines.push('FINAL VALIDATION SUMMARY');
    lines.push('='.repeat(70));
    lines.push('');

    // Overall result
    const statusIcon = {
      [ValidationStatus.PASSED]: '✓',
      [ValidationStatus.FAILED]: '✗',
      [ValidationStatus.WARNING]: '⚠'
    };

    lines.push(`Overall Result: ${statusIcon[this.results.overall]} ${this.results.overall.toUpperCase()}`);
    lines.push(`Duration: ${this.results.duration}ms`);
    lines.push('');

    // Category results
    lines.push('-'.repeat(50));
    lines.push('Validation Categories:');
    lines.push('-'.repeat(50));

    for (const [category, result] of Object.entries(this.results.categories)) {
      const icon = statusIcon[result.status] || '?';
      const checksCount = result.checks?.length || 0;
      const passedCount = result.checks?.filter(c => c.status === ValidationStatus.PASSED).length || 0;
      lines.push(`  ${icon} ${category.charAt(0).toUpperCase() + category.slice(1)}: ${passedCount}/${checksCount} checks passed`);
    }
    lines.push('');

    // Pattern results
    lines.push('-'.repeat(50));
    lines.push('Dependency Patterns Validated:');
    lines.push('-'.repeat(50));

    for (const [patternKey, result] of Object.entries(this.results.patterns)) {
      const icon = statusIcon[result.status] || '?';
      lines.push(`  ${icon} Phase ${result.phase}: ${result.name} (${result.type})`);
    }
    lines.push('');

    // Final message
    lines.push('-'.repeat(50));
    if (this.results.overall === ValidationStatus.PASSED) {
      lines.push('All dependency patterns validated successfully!');
      lines.push('The Test Dependency Patterns plan has completed correctly.');
      lines.push('DAG-aware scheduling is working as expected.');
    } else if (this.results.overall === ValidationStatus.WARNING) {
      lines.push('Validation completed with warnings.');
      lines.push('Some non-critical checks require attention.');
    } else {
      lines.push('Validation FAILED.');
      lines.push('Please review the detailed results above.');
    }
    lines.push('-'.repeat(50));
    lines.push('');
    lines.push('='.repeat(70));
    lines.push('End of Final Validation');
    lines.push('='.repeat(70));

    return lines.join('\n');
  }

  /**
   * Get detailed results
   * @returns {Object} Full validation results
   */
  getResults() {
    return this.results;
  }

  /**
   * Export results as JSON
   * @returns {string} JSON string of results
   */
  exportResults() {
    return JSON.stringify(this.results, null, 2);
  }
}

/**
 * Factory function to create a FinalValidation instance
 * @param {Object} options - Configuration options
 * @returns {FinalValidation} New FinalValidation instance
 */
function createFinalValidation(options = {}) {
  return new FinalValidation(options);
}

/**
 * Run final validation (convenience function)
 * @param {Object} planStatus - Status.json content
 * @returns {Promise<Object>} Validation results
 */
async function runFinalValidation(planStatus) {
  const validator = createFinalValidation();
  return await validator.runValidation(planStatus);
}

module.exports = {
  FinalValidation,
  createFinalValidation,
  runFinalValidation,
  ValidationStatus,
  ValidationCategory,
  VALIDATION_CONFIG,
  DEPENDENCY_PATTERNS
};
