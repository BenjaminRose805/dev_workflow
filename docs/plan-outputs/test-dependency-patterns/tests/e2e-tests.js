/**
 * End-to-End Tests for Dependency Patterns
 * Task 4.2: Build end-to-end tests (depends: 1.2, 3.4)
 *
 * This module contains comprehensive end-to-end tests that validate
 * dependency patterns using test fixtures (from 1.2) and combined
 * strategies (from 3.4).
 *
 * Test fixtures define various dependency patterns:
 * - linear: sequential task chain
 * - diamond: shared dependencies and convergence
 * - fan-out: one task to many
 * - fan-in: many tasks to one
 * - cross-phase: dependencies across execution phases
 *
 * Edge cases tested:
 * - no-dependencies: isolated tasks
 * - circular-detection: cycle detection
 * - multi-dependency: complex dependency graphs
 */

const assert = require('assert');
const {
  combinedStrategy,
  strategyA,
  strategyB
} = require('../strategies/combined-strategy');
const {
  areDependenciesSatisfied,
  findReadyTasks,
  calculateCriticalPathLength,
  detectCycles
} = require('../utils/shared-utils');
const testFixtures = require('../fixtures/sample-data.json');

/**
 * Test Suite: Dependency Pattern Validation
 */
const TestSuite = {
  name: 'End-to-End Dependency Pattern Tests',
  results: [],

  /**
   * Run all test suites
   */
  runAll() {
    console.log('Running End-to-End Dependency Pattern Tests\n');
    console.log('='.repeat(60));

    this.testLinearPattern();
    this.testDiamondPattern();
    this.testFanOutPattern();
    this.testFanInPattern();
    this.testEdgeCases();
    this.testCombinedStrategy();
    this.testExecutionOrder();

    this.printSummary();
    return this.results;
  },

  /**
   * Test: Linear Dependency Pattern
   */
  testLinearPattern() {
    console.log('\n[Linear Pattern Tests]');

    const linearTasks = [
      { id: 'task-linear-1', title: 'First task', status: 'pending', dependencies: [] },
      { id: 'task-linear-2', title: 'Second task', status: 'pending', dependencies: ['task-linear-1'] },
      { id: 'task-linear-3', title: 'Third task', status: 'pending', dependencies: ['task-linear-2'] },
      { id: 'task-linear-4', title: 'Fourth task', status: 'pending', dependencies: ['task-linear-3'] }
    ];

    // Test 1: Only first task ready initially
    let ready = findReadyTasks(linearTasks);
    this.assert(ready.length === 1, 'Only first task ready initially', ready.length);
    this.assert(ready[0].id === 'task-linear-1', 'First task is task-linear-1', ready[0]?.id);

    // Test 2: Sequential execution
    linearTasks[0].status = 'completed';
    ready = findReadyTasks(linearTasks);
    this.assert(ready.length === 1, 'Second task ready after first completes', ready.length);
    this.assert(ready[0].id === 'task-linear-2', 'Second task is task-linear-2', ready[0]?.id);

    // Test 3: Critical path length
    const pathLength = calculateCriticalPathLength(linearTasks);
    this.assert(pathLength === 4, 'Critical path length is 4', pathLength);
  },

  /**
   * Test: Diamond Dependency Pattern
   */
  testDiamondPattern() {
    console.log('\n[Diamond Pattern Tests]');

    const diamondTasks = [
      { id: 'diamond-apex', title: 'Top', status: 'pending', dependencies: [] },
      { id: 'diamond-left', title: 'Left', status: 'pending', dependencies: ['diamond-apex'] },
      { id: 'diamond-right', title: 'Right', status: 'pending', dependencies: ['diamond-apex'] },
      { id: 'diamond-base', title: 'Base', status: 'pending', dependencies: ['diamond-left', 'diamond-right'] }
    ];

    // Test 1: Only apex ready initially
    let ready = findReadyTasks(diamondTasks);
    this.assert(ready.length === 1, 'Only apex ready initially', ready.length);
    this.assert(ready[0].id === 'diamond-apex', 'Apex is first', ready[0]?.id);

    // Test 2: Both branches ready after apex
    diamondTasks[0].status = 'completed';
    ready = findReadyTasks(diamondTasks);
    this.assert(ready.length === 2, 'Both branches ready after apex', ready.length);
    const readyIds = ready.map(t => t.id).sort();
    this.assert(
      readyIds[0] === 'diamond-left' && readyIds[1] === 'diamond-right',
      'Left and right branches ready',
      readyIds.join(', ')
    );

    // Test 3: Base waits for both branches
    diamondTasks[1].status = 'completed';
    ready = findReadyTasks(diamondTasks);
    this.assert(ready.length === 1, 'Only right branch ready', ready.length);

    diamondTasks[2].status = 'completed';
    ready = findReadyTasks(diamondTasks);
    this.assert(ready.length === 1, 'Base ready after both branches', ready.length);
    this.assert(ready[0].id === 'diamond-base', 'Base is last', ready[0]?.id);

    // Test 4: Critical path
    const pathLength = calculateCriticalPathLength(diamondTasks);
    this.assert(pathLength === 3, 'Critical path length is 3', pathLength);
  },

  /**
   * Test: Fan-Out Dependency Pattern
   */
  testFanOutPattern() {
    console.log('\n[Fan-Out Pattern Tests]');

    const fanOutTasks = [
      { id: 'producer', title: 'Producer', status: 'pending', dependencies: [] },
      { id: 'consumer-1', title: 'Consumer 1', status: 'pending', dependencies: ['producer'] },
      { id: 'consumer-2', title: 'Consumer 2', status: 'pending', dependencies: ['producer'] },
      { id: 'consumer-3', title: 'Consumer 3', status: 'pending', dependencies: ['producer'] },
      { id: 'consumer-4', title: 'Consumer 4', status: 'pending', dependencies: ['producer'] }
    ];

    // Test 1: Only producer ready initially
    let ready = findReadyTasks(fanOutTasks);
    this.assert(ready.length === 1, 'Only producer ready initially', ready.length);

    // Test 2: All consumers ready after producer
    fanOutTasks[0].status = 'completed';
    ready = findReadyTasks(fanOutTasks);
    this.assert(ready.length === 4, 'All 4 consumers ready after producer', ready.length);

    // Test 3: Critical path
    const pathLength = calculateCriticalPathLength(fanOutTasks);
    this.assert(pathLength === 2, 'Critical path length is 2', pathLength);
  },

  /**
   * Test: Fan-In Dependency Pattern
   */
  testFanInPattern() {
    console.log('\n[Fan-In Pattern Tests]');

    const fanInTasks = [
      { id: 'source-1', title: 'Source 1', status: 'pending', dependencies: [] },
      { id: 'source-2', title: 'Source 2', status: 'pending', dependencies: [] },
      { id: 'source-3', title: 'Source 3', status: 'pending', dependencies: [] },
      { id: 'aggregator', title: 'Aggregator', status: 'pending', dependencies: ['source-1', 'source-2', 'source-3'] }
    ];

    // Test 1: All sources ready initially
    let ready = findReadyTasks(fanInTasks);
    this.assert(ready.length === 3, 'All 3 sources ready initially', ready.length);

    // Test 2: Aggregator waits for all sources
    fanInTasks[0].status = 'completed';
    fanInTasks[1].status = 'completed';
    ready = findReadyTasks(fanInTasks);
    this.assert(ready.length === 1, 'Only source-3 ready', ready.length);
    this.assert(ready[0].id === 'source-3', 'Source 3 is pending', ready[0]?.id);

    // Test 3: Aggregator ready after all sources
    fanInTasks[2].status = 'completed';
    ready = findReadyTasks(fanInTasks);
    this.assert(ready.length === 1, 'Aggregator ready', ready.length);
    this.assert(ready[0].id === 'aggregator', 'Aggregator is ready', ready[0]?.id);

    // Test 4: Multi-dependency check
    const deps = fanInTasks[3].dependencies;
    const statusMap = { 'source-1': 'completed', 'source-2': 'pending', 'source-3': 'completed' };
    const satisfied = areDependenciesSatisfied(deps, statusMap);
    this.assert(satisfied === false, 'Dependencies not satisfied with one pending', satisfied);

    statusMap['source-2'] = 'completed';
    const allSatisfied = areDependenciesSatisfied(deps, statusMap);
    this.assert(allSatisfied === true, 'Dependencies satisfied when all complete', allSatisfied);
  },

  /**
   * Test: Edge Cases
   */
  testEdgeCases() {
    console.log('\n[Edge Case Tests]');

    // No dependencies - all parallel
    const independentTasks = [
      { id: 'ind-1', title: 'Independent 1', status: 'pending', dependencies: [] },
      { id: 'ind-2', title: 'Independent 2', status: 'pending', dependencies: [] },
      { id: 'ind-3', title: 'Independent 3', status: 'pending', dependencies: [] }
    ];
    let ready = findReadyTasks(independentTasks);
    this.assert(ready.length === 3, 'All independent tasks ready', ready.length);

    // Circular dependency detection
    const circularTasks = [
      { id: 'circular-a', title: 'Task A', status: 'pending', dependencies: ['circular-c'] },
      { id: 'circular-b', title: 'Task B', status: 'pending', dependencies: ['circular-a'] },
      { id: 'circular-c', title: 'Task C', status: 'pending', dependencies: ['circular-b'] }
    ];
    const cycle = detectCycles(circularTasks);
    this.assert(cycle !== null, 'Cycle detected', cycle ? 'found' : 'not found');
    this.assert(cycle.length === 4, 'Cycle includes all tasks', cycle?.length);

    // No ready tasks when cycle exists
    ready = findReadyTasks(circularTasks);
    this.assert(ready.length === 0, 'No tasks ready with circular dependency', ready.length);

    // Complex multi-dependency
    const complexTasks = [
      { id: 'base-1', title: 'Base 1', status: 'pending', dependencies: [] },
      { id: 'base-2', title: 'Base 2', status: 'pending', dependencies: [] },
      { id: 'derived-1', title: 'Derived 1', status: 'pending', dependencies: ['base-1', 'base-2'] },
      { id: 'derived-2', title: 'Derived 2', status: 'pending', dependencies: ['base-1'] },
      { id: 'final', title: 'Final', status: 'pending', dependencies: ['derived-1', 'derived-2'] }
    ];

    ready = findReadyTasks(complexTasks);
    this.assert(ready.length === 2, 'Both base tasks ready', ready.length);

    complexTasks[0].status = 'completed';
    complexTasks[1].status = 'completed';
    ready = findReadyTasks(complexTasks);
    this.assert(ready.length === 2, 'Both derived tasks ready', ready.length);

    const pathLength = calculateCriticalPathLength(complexTasks);
    this.assert(pathLength === 3, 'Complex graph critical path is 3', pathLength);
  },

  /**
   * Test: Combined Strategy from Task 3.4
   */
  testCombinedStrategy() {
    console.log('\n[Combined Strategy Tests]');

    // Test eager strategy for high parallelism
    const manyTasks = Array.from({ length: 10 }, (_, i) => ({
      id: `task-${i}`,
      title: `Task ${i}`,
      status: 'pending',
      dependencies: []
    }));

    const context = {
      criticalPath: [],
      maxParallel: 4,
      areDependenciesMet: () => true,
      hasAvailableSlots: () => true
    };

    const selected = combinedStrategy.selectTasks(manyTasks, 4, context);
    this.assert(selected.length === 4, 'Eager strategy selects up to maxParallel', selected.length);

    // Test critical path priority
    const tasksWithCritical = [
      { id: 'critical-1', title: 'Critical task' },
      { id: 'normal-1', title: 'Normal task' },
      { id: 'normal-2', title: 'Normal task' }
    ];

    const criticalContext = {
      criticalPath: ['critical-1'],
      maxParallel: 2,
      areDependenciesMet: () => true,
      hasAvailableSlots: () => true
    };

    const criticalSelected = combinedStrategy.selectTasks(tasksWithCritical, 2, criticalContext);
    this.assert(
      criticalSelected[0].id === 'critical-1',
      'Critical path task prioritized',
      criticalSelected[0]?.id
    );

    // Test strategy statistics
    const stats = combinedStrategy.getStats();
    this.assert(stats.name === 'Adaptive Scheduling', 'Strategy name is Adaptive Scheduling', stats.name);
    this.assert(stats.components.length === 2, 'Has 2 component strategies', stats.components.length);
  },

  /**
   * Test: Execution Order and Parallelism
   */
  testExecutionOrder() {
    console.log('\n[Execution Order Tests]');

    // Test that dependencies are always respected
    const testPatterns = [
      {
        name: 'Linear',
        tasks: createLinearTasks(4),
        expectedBatches: 4
      },
      {
        name: 'Diamond',
        tasks: createDiamondTasks(),
        expectedBatches: 3
      },
      {
        name: 'Fan-Out',
        tasks: createFanOutTasks(3),
        expectedBatches: 2
      },
      {
        name: 'Fan-In',
        tasks: createFanInTasks(3),
        expectedBatches: 2
      }
    ];

    testPatterns.forEach(pattern => {
      const context = createExecutionContext(pattern.tasks);
      const schedule = scheduleTasksWithStrategy(pattern.tasks, context, 10);

      // Verify dependency ordering
      const completed = new Set();
      let orderValid = true;

      schedule.forEach((batch, batchIndex) => {
        batch.forEach(task => {
          (task.dependencies || []).forEach(depId => {
            if (!completed.has(depId)) {
              orderValid = false;
            }
          });
          completed.add(task.id);
        });
      });

      this.assert(
        orderValid,
        `${pattern.name} pattern respects dependencies`,
        orderValid ? 'valid' : 'invalid'
      );
    });
  },

  /**
   * Assert helper
   */
  assert(condition, message, actual) {
    const status = condition ? '✓' : '✗';
    const result = { passed: condition, message, actual };
    this.results.push(result);

    if (condition) {
      console.log(`  ${status} ${message}`);
    } else {
      console.log(`  ${status} ${message} (got: ${actual})`);
    }
  },

  /**
   * Print test summary
   */
  printSummary() {
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const total = this.results.length;

    console.log('\n' + '='.repeat(60));
    console.log(`Test Summary: ${passed}/${total} passed, ${failed} failed`);

    if (failed > 0) {
      console.log('\nFailed tests:');
      this.results.filter(r => !r.passed).forEach(r => {
        console.log(`  - ${r.message} (got: ${r.actual})`);
      });
    }

    console.log('='.repeat(60));
  }
};

/**
 * Helper Functions
 */

function createExecutionContext(tasks) {
  const completed = new Set();
  return {
    tasks: [...tasks],
    maxParallel: 10,
    criticalPath: [],
    areDependenciesMet(taskId) {
      const task = this.tasks.find(t => t.id === taskId);
      if (!task || !task.dependencies) return true;
      return task.dependencies.every(depId => completed.has(depId));
    },
    hasAvailableSlots: () => true,
    complete(taskId) {
      completed.add(taskId);
    }
  };
}

function scheduleTasksWithStrategy(tasks, context, maxParallel) {
  const schedule = [];
  const pending = tasks.map(t => ({ ...t }));

  while (pending.some(t => t.status === 'pending')) {
    const ready = findReadyTasks(pending);
    if (ready.length === 0) break;

    const selected = combinedStrategy.selectTasks(ready, maxParallel, context);
    if (selected.length === 0) break;

    schedule.push([...selected]);
    selected.forEach(task => {
      task.status = 'completed';
      context.complete(task.id);
    });
  }

  return schedule;
}

function createLinearTasks(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: `linear-${i}`,
    title: `Linear task ${i}`,
    status: 'pending',
    dependencies: i > 0 ? [`linear-${i - 1}`] : []
  }));
}

function createDiamondTasks() {
  return [
    { id: 'diamond-1', title: 'Apex', status: 'pending', dependencies: [] },
    { id: 'diamond-2', title: 'Left', status: 'pending', dependencies: ['diamond-1'] },
    { id: 'diamond-3', title: 'Right', status: 'pending', dependencies: ['diamond-1'] },
    { id: 'diamond-4', title: 'Base', status: 'pending', dependencies: ['diamond-2', 'diamond-3'] }
  ];
}

function createFanOutTasks(count) {
  const tasks = [{ id: 'fan-out-producer', title: 'Producer', status: 'pending', dependencies: [] }];
  for (let i = 0; i < count; i++) {
    tasks.push({
      id: `fan-out-consumer-${i}`,
      title: `Consumer ${i}`,
      status: 'pending',
      dependencies: ['fan-out-producer']
    });
  }
  return tasks;
}

function createFanInTasks(count) {
  const tasks = [];
  const sourceDeps = [];
  for (let i = 0; i < count; i++) {
    const id = `fan-in-source-${i}`;
    tasks.push({ id, title: `Source ${i}`, status: 'pending', dependencies: [] });
    sourceDeps.push(id);
  }
  tasks.push({ id: 'fan-in-aggregator', title: 'Aggregator', status: 'pending', dependencies: sourceDeps });
  return tasks;
}

// Run tests if executed directly
if (require.main === module) {
  TestSuite.runAll();
}

module.exports = {
  TestSuite,
  createExecutionContext,
  scheduleTasksWithStrategy,
  createLinearTasks,
  createDiamondTasks,
  createFanOutTasks,
  createFanInTasks
};
