#!/usr/bin/env node
/**
 * Unit Tests for parallel phase detection in plan-status.js
 *
 * Tests:
 * - parseExecutionNotes() - parsing [PARALLEL] annotations for phases
 * - expandPhaseRange() - converting ranges to phase ID arrays
 * - getParallelPhases() - getting parallel phase groups with conflict detection
 * - cmdNext() integration with parallel phases
 *
 * Run: node scripts/tests/test-parallel-phases.js
 */

const fs = require('fs');
const path = require('path');

// Test configuration
const PROJECT_ROOT = process.cwd();
const TEST_PLAN_DIR = path.join(PROJECT_ROOT, 'docs/plans');
const TEST_OUTPUT_DIR = path.join(PROJECT_ROOT, 'docs/plan-outputs/test-parallel-phases');
const TEST_PLAN_PATH = path.join(TEST_PLAN_DIR, 'test-parallel-phases.md');

// Track test results
let passed = 0;
let failed = 0;
const failures = [];

function log(msg) {
  console.log(msg);
}

function logTest(name, success, error = null) {
  if (success) {
    passed++;
    log(`  ✓ ${name}`);
  } else {
    failed++;
    failures.push({ name, error: error || 'Failed' });
    log(`  ✗ ${name}: ${error || 'Failed'}`);
  }
}

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function setupTestEnvironment() {
  fs.mkdirSync(TEST_PLAN_DIR, { recursive: true });
  fs.mkdirSync(TEST_OUTPUT_DIR, { recursive: true });

  // Create test plan with [PARALLEL] phase annotations
  const testPlanContent = `# Test Parallel Phase Detection Plan

## Overview

This plan tests parallel phase detection functionality.

**Execution Note:** Phases 1-3 are [PARALLEL] - independent modules

## Phase 0: Preparation

- [ ] 0.1 Setup environment
- [ ] 0.2 Initialize dependencies

## Phase 1: API Development

- [ ] 1.1 Create user endpoints
- [ ] 1.2 Add authentication
- [ ] 1.3 Add authorization

## Phase 2: Frontend Development

- [ ] 2.1 Create user components
- [ ] 2.2 Add auth UI
- [ ] 2.3 Add dashboard

## Phase 3: Testing

- [ ] 3.1 Write API tests
- [ ] 3.2 Write frontend tests
- [ ] 3.3 Integration tests

## Phase 4: Deployment

- [ ] 4.1 Configure CI/CD
- [ ] 4.2 Deploy to staging
`;
  fs.writeFileSync(TEST_PLAN_PATH, testPlanContent);

  // Create status.json for the test plan
  const statusJson = {
    planPath: 'docs/plans/test-parallel-phases.md',
    planName: 'Test Parallel Phase Detection Plan',
    createdAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
    currentPhase: 'Phase 0: Preparation',
    tasks: [
      { id: '0.1', phase: 'Phase 0: Preparation', description: 'Setup environment', status: 'completed' },
      { id: '0.2', phase: 'Phase 0: Preparation', description: 'Initialize dependencies', status: 'completed' },
      { id: '1.1', phase: 'Phase 1: API Development', description: 'Create user endpoints', status: 'pending' },
      { id: '1.2', phase: 'Phase 1: API Development', description: 'Add authentication', status: 'pending' },
      { id: '1.3', phase: 'Phase 1: API Development', description: 'Add authorization', status: 'pending' },
      { id: '2.1', phase: 'Phase 2: Frontend Development', description: 'Create user components', status: 'pending' },
      { id: '2.2', phase: 'Phase 2: Frontend Development', description: 'Add auth UI', status: 'pending' },
      { id: '2.3', phase: 'Phase 2: Frontend Development', description: 'Add dashboard', status: 'pending' },
      { id: '3.1', phase: 'Phase 3: Testing', description: 'Write API tests', status: 'pending' },
      { id: '3.2', phase: 'Phase 3: Testing', description: 'Write frontend tests', status: 'pending' },
      { id: '3.3', phase: 'Phase 3: Testing', description: 'Integration tests', status: 'pending' },
      { id: '4.1', phase: 'Phase 4: Deployment', description: 'Configure CI/CD', status: 'pending' },
      { id: '4.2', phase: 'Phase 4: Deployment', description: 'Deploy to staging', status: 'pending' }
    ],
    runs: [],
    summary: {
      totalTasks: 13,
      completed: 2,
      pending: 11,
      in_progress: 0,
      failed: 0,
      skipped: 0
    }
  };
  fs.writeFileSync(path.join(TEST_OUTPUT_DIR, 'status.json'), JSON.stringify(statusJson, null, 2));
}

function setupConflictTestPlan() {
  // Create a plan where parallel phases have file conflicts
  const conflictPlanPath = path.join(TEST_PLAN_DIR, 'test-parallel-conflicts.md');
  const conflictOutputDir = path.join(PROJECT_ROOT, 'docs/plan-outputs/test-parallel-conflicts');
  fs.mkdirSync(conflictOutputDir, { recursive: true });

  const conflictPlanContent = `# Test Parallel Conflicts Plan

**Execution Note:** Phases 1-2 are [PARALLEL] - both touch same files

## Phase 1: API Changes

- [ ] 1.1 Update \`src/api.ts\` with new endpoint
- [ ] 1.2 Modify \`src/utils.ts\` for validation

## Phase 2: Auth Changes

- [ ] 2.1 Update \`src/api.ts\` for authentication
- [ ] 2.2 Add \`src/auth.ts\` middleware
`;
  fs.writeFileSync(conflictPlanPath, conflictPlanContent);

  const conflictStatusJson = {
    planPath: 'docs/plans/test-parallel-conflicts.md',
    planName: 'Test Parallel Conflicts Plan',
    createdAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
    currentPhase: 'Phase 1: API Changes',
    tasks: [
      { id: '1.1', phase: 'Phase 1: API Changes', description: 'Update `src/api.ts` with new endpoint', status: 'pending' },
      { id: '1.2', phase: 'Phase 1: API Changes', description: 'Modify `src/utils.ts` for validation', status: 'pending' },
      { id: '2.1', phase: 'Phase 2: Auth Changes', description: 'Update `src/api.ts` for authentication', status: 'pending' },
      { id: '2.2', phase: 'Phase 2: Auth Changes', description: 'Add `src/auth.ts` middleware', status: 'pending' }
    ],
    runs: [],
    summary: {
      totalTasks: 4,
      completed: 0,
      pending: 4,
      in_progress: 0,
      failed: 0,
      skipped: 0
    }
  };
  fs.writeFileSync(path.join(conflictOutputDir, 'status.json'), JSON.stringify(conflictStatusJson, null, 2));

  return { planPath: conflictPlanPath, outputDir: conflictOutputDir };
}

function cleanupTestEnvironment() {
  try {
    fs.unlinkSync(TEST_PLAN_PATH);
    fs.rmSync(TEST_OUTPUT_DIR, { recursive: true, force: true });
  } catch (e) {}

  // Clean up conflict test plan
  try {
    fs.unlinkSync(path.join(TEST_PLAN_DIR, 'test-parallel-conflicts.md'));
    fs.rmSync(path.join(PROJECT_ROOT, 'docs/plan-outputs/test-parallel-conflicts'), { recursive: true, force: true });
  } catch (e) {}
}

function testExpandPhaseRange() {
  log('\n=== Testing: expandPhaseRange() ===');

  const { expandPhaseRange } = require('../lib/plan-status.js');

  // Test range expansion
  log('\n--- Range Expansion ---');

  let result = expandPhaseRange('1-3');
  logTest('range 1-3 expands correctly',
    arraysEqual(result, [1, 2, 3]),
    `Got: ${JSON.stringify(result)}`);

  result = expandPhaseRange('2-5');
  logTest('range 2-5 expands correctly',
    arraysEqual(result, [2, 3, 4, 5]),
    `Got: ${JSON.stringify(result)}`);

  // Test comma-separated list
  log('\n--- Comma-Separated List ---');

  result = expandPhaseRange('1, 2, 3');
  logTest('list 1, 2, 3 expands correctly',
    arraysEqual(result, [1, 2, 3]),
    `Got: ${JSON.stringify(result)}`);

  result = expandPhaseRange('1,3,5');
  logTest('list 1,3,5 without spaces expands correctly',
    arraysEqual(result, [1, 3, 5]),
    `Got: ${JSON.stringify(result)}`);

  // Test mixed range and list
  log('\n--- Mixed Range and List ---');

  result = expandPhaseRange('1-3, 5');
  logTest('mixed 1-3, 5 expands correctly',
    arraysEqual(result, [1, 2, 3, 5]),
    `Got: ${JSON.stringify(result)}`);

  result = expandPhaseRange('1, 3-5');
  logTest('mixed 1, 3-5 expands correctly',
    arraysEqual(result, [1, 3, 4, 5]),
    `Got: ${JSON.stringify(result)}`);

  // Test single number
  log('\n--- Single Number ---');

  result = expandPhaseRange('3');
  logTest('single number 3 expands correctly',
    arraysEqual(result, [3]),
    `Got: ${JSON.stringify(result)}`);

  // Test edge cases
  log('\n--- Edge Cases ---');

  result = expandPhaseRange('');
  logTest('empty string returns empty array',
    arraysEqual(result, []),
    `Got: ${JSON.stringify(result)}`);

  result = expandPhaseRange(null);
  logTest('null returns empty array',
    arraysEqual(result, []),
    `Got: ${JSON.stringify(result)}`);

  result = expandPhaseRange(undefined);
  logTest('undefined returns empty array',
    arraysEqual(result, []),
    `Got: ${JSON.stringify(result)}`);

  result = expandPhaseRange('  2-4  ');
  logTest('whitespace-padded range is trimmed',
    arraysEqual(result, [2, 3, 4]),
    `Got: ${JSON.stringify(result)}`);
}

function testParseExecutionNotesParallel() {
  log('\n=== Testing: parseExecutionNotes() for [PARALLEL] ===');

  const { parseExecutionNotes } = require('../lib/plan-status.js');

  // Test basic parallel annotation parsing
  log('\n--- Basic Parallel Annotation ---');

  let content = `**Execution Note:** Phases 1-3 are [PARALLEL] - independent modules`;
  let result = parseExecutionNotes(content);

  logTest('parallel property exists',
    Array.isArray(result.parallel),
    `Got: ${typeof result.parallel}`);
  logTest('parses single parallel annotation',
    result.parallel.length === 1,
    `Got ${result.parallel.length} parallel constraints`);
  logTest('extracts correct phase range string',
    result.parallel[0]?.phaseRange === '1-3',
    `Got: ${result.parallel[0]?.phaseRange}`);
  logTest('extracts correct phase IDs',
    arraysEqual(result.parallel[0]?.phaseIds || [], [1, 2, 3]),
    `Got: ${JSON.stringify(result.parallel[0]?.phaseIds)}`);
  logTest('extracts correct reason',
    result.parallel[0]?.reason === 'independent modules',
    `Got: ${result.parallel[0]?.reason}`);

  // Test multiple parallel groups
  log('\n--- Multiple Parallel Groups ---');

  content = `**Execution Note:** Phases 1-2 are [PARALLEL] - frontend work
**Execution Note:** Phases 4-5 are [PARALLEL] - deployment`;
  result = parseExecutionNotes(content);

  logTest('parses multiple parallel groups',
    result.parallel.length === 2,
    `Got ${result.parallel.length} parallel constraints`);
  logTest('first group is 1-2',
    arraysEqual(result.parallel[0]?.phaseIds || [], [1, 2]),
    `Got: ${JSON.stringify(result.parallel[0]?.phaseIds)}`);
  logTest('second group is 4-5',
    arraysEqual(result.parallel[1]?.phaseIds || [], [4, 5]),
    `Got: ${JSON.stringify(result.parallel[1]?.phaseIds)}`);

  // Test comma-separated phases
  log('\n--- Comma-Separated Phases ---');

  content = `**Execution Note:** Phases 1, 3, 5 are [PARALLEL] - independent`;
  result = parseExecutionNotes(content);

  logTest('parses comma-separated phases',
    result.parallel.length === 1,
    `Got ${result.parallel.length} parallel constraints`);
  logTest('extracts non-contiguous phases',
    arraysEqual(result.parallel[0]?.phaseIds || [], [1, 3, 5]),
    `Got: ${JSON.stringify(result.parallel[0]?.phaseIds)}`);

  // Test singular "Phase"
  log('\n--- Singular Phase ---');

  content = `**Execution Note:** Phase 1-2 is [PARALLEL] - reason`;
  result = parseExecutionNotes(content);

  logTest('handles singular "Phase"',
    result.parallel.length === 1 && arraysEqual(result.parallel[0]?.phaseIds || [], [1, 2]),
    `Got: ${JSON.stringify(result.parallel[0]?.phaseIds)}`);

  // Test mixed sequential and parallel
  log('\n--- Mixed Sequential and Parallel ---');

  content = `**Execution Note:** Tasks 2.1-2.3 are [SEQUENTIAL] - file dependency
**Execution Note:** Phases 1-3 are [PARALLEL] - independent work`;
  result = parseExecutionNotes(content);

  logTest('parses both sequential and parallel',
    result.length === 1 && result.parallel.length === 1,
    `Got ${result.length} sequential, ${result.parallel.length} parallel`);
  logTest('sequential constraint is correct',
    result[0]?.taskRange === '2.1-2.3',
    `Got: ${result[0]?.taskRange}`);
  logTest('parallel constraint is correct',
    arraysEqual(result.parallel[0]?.phaseIds || [], [1, 2, 3]),
    `Got: ${JSON.stringify(result.parallel[0]?.phaseIds)}`);

  // Test no parallel annotations
  log('\n--- No Parallel Annotations ---');

  content = `## Phase 1
Regular content without parallel annotations.
**Execution Note:** Tasks 1.1-1.3 are [SEQUENTIAL] - reason`;
  result = parseExecutionNotes(content);

  logTest('returns empty parallel array when no parallel annotations',
    Array.isArray(result.parallel) && result.parallel.length === 0,
    `Got: ${JSON.stringify(result.parallel)}`);
  logTest('still parses sequential annotations',
    result.length === 1,
    `Got ${result.length} sequential constraints`);

  // Test dash variations
  log('\n--- Dash Variations ---');

  content = `**Execution Note:** Phases 1-3 are [PARALLEL] – em dash reason`;
  result = parseExecutionNotes(content);
  logTest('handles em dash separator',
    result.parallel.length === 1 && result.parallel[0]?.reason === 'em dash reason',
    `Got: ${result.parallel[0]?.reason}`);
}

function testGetParallelPhases() {
  log('\n=== Testing: getParallelPhases() ===');

  const { getParallelPhases } = require('../lib/plan-status.js');
  const planPath = 'docs/plans/test-parallel-phases.md';

  // Test basic parallel phase retrieval
  log('\n--- Basic Parallel Phase Retrieval ---');

  let result = getParallelPhases(planPath);

  logTest('returns parallelGroups array',
    Array.isArray(result.parallelGroups),
    `Got: ${typeof result.parallelGroups}`);
  logTest('has one parallel group',
    result.parallelGroups.length === 1,
    `Got ${result.parallelGroups.length} groups`);
  logTest('parallel group contains phases 1, 2, 3',
    arraysEqual(result.parallelGroups[0]?.phaseIds || [], [1, 2, 3]),
    `Got: ${JSON.stringify(result.parallelGroups[0]?.phaseIds)}`);

  logTest('returns allParallelPhases array',
    Array.isArray(result.allParallelPhases),
    `Got: ${typeof result.allParallelPhases}`);
  logTest('allParallelPhases contains 1, 2, 3',
    arraysEqual(result.allParallelPhases, [1, 2, 3]),
    `Got: ${JSON.stringify(result.allParallelPhases)}`);

  logTest('hasConflicts is false for non-conflicting plan',
    result.hasConflicts === false,
    `Got: ${result.hasConflicts}`);
  logTest('conflicts array is empty',
    result.conflicts.length === 0,
    `Got: ${JSON.stringify(result.conflicts)}`);

  // Test non-existent plan
  log('\n--- Non-Existent Plan ---');

  result = getParallelPhases('docs/plans/non-existent-plan.md');
  logTest('returns empty for non-existent plan',
    result.parallelGroups.length === 0 && result.allParallelPhases.length === 0,
    `Got: ${JSON.stringify(result)}`);

  // Test plan without parallel annotations
  log('\n--- Plan Without Parallel Annotations ---');

  result = getParallelPhases('docs/plans/test-constraint-parsing.md');
  logTest('returns empty for plan without parallel annotations',
    result.parallelGroups.length === 0,
    `Got ${result.parallelGroups.length} groups`);
}

function testGetParallelPhasesWithConflicts() {
  log('\n=== Testing: getParallelPhases() with File Conflicts ===');

  const { getParallelPhases } = require('../lib/plan-status.js');

  // Setup conflict test plan
  const { planPath } = setupConflictTestPlan();

  let result = getParallelPhases('docs/plans/test-parallel-conflicts.md');

  logTest('detects parallel phases in conflict plan',
    result.parallelGroups.length === 1,
    `Got ${result.parallelGroups.length} groups`);

  logTest('hasConflicts is true when files overlap',
    result.hasConflicts === true,
    `Got: ${result.hasConflicts}`);

  logTest('conflicts array is non-empty',
    result.conflicts.length > 0,
    `Got ${result.conflicts.length} conflicts`);

  // Check that src/api.ts is detected as conflicting
  const apiConflict = result.conflicts.find(c =>
    c.file.toLowerCase().includes('api.ts')
  );
  logTest('src/api.ts is detected as conflicting',
    apiConflict !== undefined,
    `Got conflicts: ${JSON.stringify(result.conflicts)}`);

  if (apiConflict) {
    logTest('conflict includes phases 1 and 2',
      apiConflict.phases.includes(1) && apiConflict.phases.includes(2),
      `Got phases: ${JSON.stringify(apiConflict.phases)}`);
  }
}

function testCmdNextWithParallelPhases() {
  log('\n=== Testing: cmdNext() with Parallel Phases ===');

  const { execSync } = require('child_process');
  const planPath = 'docs/plans/test-parallel-phases.md';

  // Run next command and parse JSON output
  log('\n--- Next Command Output ---');

  try {
    const output = execSync(`node scripts/status-cli.js --plan ${planPath} next 10`, {
      encoding: 'utf8',
      cwd: PROJECT_ROOT
    });

    const result = JSON.parse(output);

    logTest('next command returns tasks',
      result.count > 0,
      `Got ${result.count} tasks`);

    logTest('returns tasks array',
      Array.isArray(result.tasks),
      `Got: ${typeof result.tasks}`);

    // Check if tasks from multiple parallel phases are returned
    const phases = new Set(result.tasks.map(t => t.phase));
    logTest('returns tasks from multiple phases',
      phases.size > 1,
      `Got tasks from ${phases.size} phase(s): ${JSON.stringify(Array.from(phases))}`);

    // Check if parallelPhases info is included
    logTest('includes parallelPhases info',
      result.parallelPhases !== undefined,
      `Got: ${JSON.stringify(result.parallelPhases)}`);

    // Check that tasks are marked with parallelPhase flag
    const parallelTasks = result.tasks.filter(t => t.parallelPhase === true);
    logTest('some tasks have parallelPhase flag',
      parallelTasks.length > 0,
      `Got ${parallelTasks.length} tasks with parallelPhase=true`);

  } catch (e) {
    logTest('next command executes without error',
      false,
      e.message);
  }
}

function testBackwardCompatibility() {
  log('\n=== Testing: Backward Compatibility ===');

  const { parseExecutionNotes } = require('../lib/plan-status.js');

  // Test that the result can still be used as an array (backward compat)
  log('\n--- Array-Like Behavior ---');

  const content = `**Execution Note:** Tasks 2.1-2.3 are [SEQUENTIAL] - file dependency
**Execution Note:** Phases 1-3 are [PARALLEL] - independent`;
  const result = parseExecutionNotes(content);

  logTest('result has length property',
    typeof result.length === 'number',
    `Got: ${typeof result.length}`);
  logTest('result is iterable with for...of',
    (() => {
      let count = 0;
      for (const item of result) {
        count++;
      }
      return count === 1; // One sequential constraint
    })(),
    `Expected 1 iteration`);

  logTest('result[0] accesses first sequential constraint',
    result[0]?.taskRange === '2.1-2.3',
    `Got: ${result[0]?.taskRange}`);

  logTest('result.sequential property exists',
    Array.isArray(result.sequential),
    `Got: ${typeof result.sequential}`);

  logTest('result.parallel property exists',
    Array.isArray(result.parallel),
    `Got: ${typeof result.parallel}`);

  logTest('result.sequential matches array entries',
    result.sequential.length === result.length,
    `Got ${result.sequential.length} sequential, ${result.length} array entries`);
}

function main() {
  log('========================================');
  log('  Parallel Phase Detection Unit Tests');
  log('========================================');

  try {
    log('\nSetting up test environment...');
    setupTestEnvironment();

    testExpandPhaseRange();
    testParseExecutionNotesParallel();
    testGetParallelPhases();
    testGetParallelPhasesWithConflicts();
    testCmdNextWithParallelPhases();
    testBackwardCompatibility();

    log('\n========================================');
    log('  Test Results');
    log('========================================');
    log(`  Passed: ${passed}`);
    log(`  Failed: ${failed}`);
    log(`  Total:  ${passed + failed}`);

    if (failures.length > 0) {
      log('\n  Failures:');
      failures.forEach(f => log(`    - ${f.name}: ${f.error}`));
    }

    log('========================================\n');

  } finally {
    log('Cleaning up test environment...');
    cleanupTestEnvironment();
  }

  process.exit(failed > 0 ? 1 : 0);
}

main();
