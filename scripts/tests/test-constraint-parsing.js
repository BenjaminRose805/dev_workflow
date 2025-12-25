#!/usr/bin/env node
/**
 * Unit Tests for constraint parsing functions in plan-status.js
 *
 * Tests:
 * - parseExecutionNotes() - parsing [SEQUENTIAL] annotations
 * - expandTaskRange() - converting ranges to task ID arrays
 * - getTaskConstraints() - getting constraints for specific tasks
 *
 * Run: node scripts/tests/test-constraint-parsing.js
 */

const fs = require('fs');
const path = require('path');

// Test configuration
const PROJECT_ROOT = process.cwd();
const TEST_PLAN_DIR = path.join(PROJECT_ROOT, 'docs/plans');
const TEST_PLAN_PATH = path.join(TEST_PLAN_DIR, 'test-constraint-parsing.md');

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

  // Create test plan with various [SEQUENTIAL] annotation formats
  const testPlanContent = `# Test Constraint Parsing Plan

## Phase 1: Parallel Tasks

**Objective:** These tasks can run in parallel.

**Tasks:**
- [ ] 1.1 First parallel task
- [ ] 1.2 Second parallel task
- [ ] 1.3 Third parallel task

## Phase 2: Sequential Tasks

**Objective:** These tasks must run sequentially.

**Execution Note:** Tasks 2.1-2.3 are [SEQUENTIAL] - all modify the same config file

**Tasks:**
- [ ] 2.1 First sequential task
- [ ] 2.2 Second sequential task
- [ ] 2.3 Third sequential task
- [ ] 2.4 Fourth task (not in sequential group)

## Phase 3: Mixed Tasks

**Objective:** Some tasks are sequential, others are parallel.

**Execution Note:** Tasks 3.1-3.2 are [SEQUENTIAL] - file dependency chain

**Tasks:**
- [ ] 3.1 Sequential task A
- [ ] 3.2 Sequential task B
- [ ] 3.3 Parallel task
- [ ] 3.4 Another parallel task
`;
  fs.writeFileSync(TEST_PLAN_PATH, testPlanContent);
}

function cleanupTestEnvironment() {
  try {
    fs.unlinkSync(TEST_PLAN_PATH);
  } catch (e) {}
}

function testExpandTaskRange() {
  log('\n=== Testing: expandTaskRange() ===');

  const { expandTaskRange } = require('../lib/plan-status.js');

  // Test range expansion
  log('\n--- Range Expansion ---');

  let result = expandTaskRange('3.1-3.4');
  logTest('range 3.1-3.4 expands correctly',
    arraysEqual(result, ['3.1', '3.2', '3.3', '3.4']),
    `Got: ${JSON.stringify(result)}`);

  result = expandTaskRange('2.1-2.3');
  logTest('range 2.1-2.3 expands correctly',
    arraysEqual(result, ['2.1', '2.2', '2.3']),
    `Got: ${JSON.stringify(result)}`);

  result = expandTaskRange('1.5-1.7');
  logTest('range 1.5-1.7 expands correctly',
    arraysEqual(result, ['1.5', '1.6', '1.7']),
    `Got: ${JSON.stringify(result)}`);

  // Test single task
  log('\n--- Single Task ---');

  result = expandTaskRange('3.1');
  logTest('single task 3.1 returns array',
    arraysEqual(result, ['3.1']),
    `Got: ${JSON.stringify(result)}`);

  result = expandTaskRange('0.1');
  logTest('single task 0.1 returns array',
    arraysEqual(result, ['0.1']),
    `Got: ${JSON.stringify(result)}`);

  // Test comma-separated list
  log('\n--- Comma-Separated List ---');

  result = expandTaskRange('3.1,3.3,3.5');
  logTest('list 3.1,3.3,3.5 expands correctly',
    arraysEqual(result, ['3.1', '3.3', '3.5']),
    `Got: ${JSON.stringify(result)}`);

  result = expandTaskRange('1.1, 1.3');
  logTest('list with spaces expands correctly',
    arraysEqual(result, ['1.1', '1.3']),
    `Got: ${JSON.stringify(result)}`);

  // Test edge cases
  log('\n--- Edge Cases ---');

  result = expandTaskRange('');
  logTest('empty string returns empty array',
    arraysEqual(result, []),
    `Got: ${JSON.stringify(result)}`);

  result = expandTaskRange(null);
  logTest('null returns empty array',
    arraysEqual(result, []),
    `Got: ${JSON.stringify(result)}`);

  result = expandTaskRange(undefined);
  logTest('undefined returns empty array',
    arraysEqual(result, []),
    `Got: ${JSON.stringify(result)}`);

  result = expandTaskRange('  3.1  ');
  logTest('whitespace-padded task is trimmed',
    arraysEqual(result, ['3.1']),
    `Got: ${JSON.stringify(result)}`);
}

function testParseExecutionNotes() {
  log('\n=== Testing: parseExecutionNotes() ===');

  const { parseExecutionNotes } = require('../lib/plan-status.js');

  // Test basic annotation parsing
  log('\n--- Basic Annotation Parsing ---');

  let content = `**Execution Note:** Tasks 2.1-2.3 are [SEQUENTIAL] - all modify same file`;
  let result = parseExecutionNotes(content);
  logTest('parses single annotation',
    result.length === 1,
    `Got ${result.length} constraints`);
  logTest('extracts correct task range',
    result[0]?.taskRange === '2.1-2.3',
    `Got: ${result[0]?.taskRange}`);
  logTest('extracts correct task IDs',
    arraysEqual(result[0]?.taskIds || [], ['2.1', '2.2', '2.3']),
    `Got: ${JSON.stringify(result[0]?.taskIds)}`);
  logTest('extracts correct reason',
    result[0]?.reason === 'all modify same file',
    `Got: ${result[0]?.reason}`);

  // Test multiple annotations
  log('\n--- Multiple Annotations ---');

  content = `## Phase 2
**Execution Note:** Tasks 2.1-2.3 are [SEQUENTIAL] - config changes

## Phase 3
**Execution Note:** Tasks 3.1-3.2 are [SEQUENTIAL] - file dependencies`;
  result = parseExecutionNotes(content);
  logTest('parses multiple annotations',
    result.length === 2,
    `Got ${result.length} constraints`);
  logTest('first constraint is 2.1-2.3',
    result[0]?.taskRange === '2.1-2.3',
    `Got: ${result[0]?.taskRange}`);
  logTest('second constraint is 3.1-3.2',
    result[1]?.taskRange === '3.1-3.2',
    `Got: ${result[1]?.taskRange}`);

  // Test different dash styles
  log('\n--- Dash Variations ---');

  content = `**Execution Note:** Tasks 2.1-2.3 are [SEQUENTIAL] – em dash reason`;
  result = parseExecutionNotes(content);
  logTest('handles em dash separator',
    result.length === 1 && result[0]?.reason === 'em dash reason',
    `Got: ${result[0]?.reason}`);

  content = `**Execution Note:** Tasks 2.1-2.3 are [SEQUENTIAL] — long dash reason`;
  result = parseExecutionNotes(content);
  logTest('handles long dash separator',
    result.length === 1 && result[0]?.reason === 'long dash reason',
    `Got: ${result[0]?.reason}`);

  // Test singular Task
  log('\n--- Singular/Plural Task ---');

  content = `**Execution Note:** Task 1.1-1.2 is [SEQUENTIAL] - dependency`;
  result = parseExecutionNotes(content);
  logTest('handles singular "Task"',
    result.length === 1 && result[0]?.taskRange === '1.1-1.2',
    `Got: ${result[0]?.taskRange}`);

  // Test no annotations
  log('\n--- No Annotations ---');

  content = `## Phase 1
Regular markdown content without any execution notes.`;
  result = parseExecutionNotes(content);
  logTest('returns empty array for no annotations',
    result.length === 0,
    `Got ${result.length} constraints`);

  // Test empty/null input
  log('\n--- Edge Cases ---');

  result = parseExecutionNotes('');
  logTest('empty string returns empty array',
    result.length === 0,
    `Got ${result.length} constraints`);

  result = parseExecutionNotes(null);
  logTest('null returns empty array',
    result.length === 0,
    `Got ${result.length} constraints`);

  result = parseExecutionNotes(undefined);
  logTest('undefined returns empty array',
    result.length === 0,
    `Got ${result.length} constraints`);
}

function testGetTaskConstraints() {
  log('\n=== Testing: getTaskConstraints() ===');

  const { getTaskConstraints } = require('../lib/plan-status.js');
  const planPath = 'docs/plans/test-constraint-parsing.md';

  // Test task in sequential group
  log('\n--- Task in Sequential Group ---');

  let result = getTaskConstraints(planPath, '2.1');
  logTest('returns constraint for task 2.1',
    result !== null,
    `Got: ${JSON.stringify(result)}`);
  logTest('constraint.sequential is true',
    result?.sequential === true,
    `Got: ${result?.sequential}`);
  logTest('constraint.sequentialGroup is correct',
    result?.sequentialGroup === '2.1-2.3',
    `Got: ${result?.sequentialGroup}`);
  logTest('constraint.reason is present',
    typeof result?.reason === 'string' && result.reason.length > 0,
    `Got: ${result?.reason}`);

  result = getTaskConstraints(planPath, '2.3');
  logTest('returns constraint for task 2.3 (same group as 2.1)',
    result?.sequential === true && result?.sequentialGroup === '2.1-2.3',
    `Got: ${JSON.stringify(result)}`);

  // Test task not in sequential group
  log('\n--- Task Not in Sequential Group ---');

  result = getTaskConstraints(planPath, '1.1');
  logTest('returns null for parallel task 1.1',
    result === null,
    `Got: ${JSON.stringify(result)}`);

  result = getTaskConstraints(planPath, '2.4');
  logTest('returns null for task 2.4 (not in sequential group)',
    result === null,
    `Got: ${JSON.stringify(result)}`);

  result = getTaskConstraints(planPath, '3.3');
  logTest('returns null for parallel task 3.3',
    result === null,
    `Got: ${JSON.stringify(result)}`);

  // Test task in second sequential group
  log('\n--- Second Sequential Group ---');

  result = getTaskConstraints(planPath, '3.1');
  logTest('returns constraint for task 3.1',
    result?.sequential === true,
    `Got: ${JSON.stringify(result)}`);
  logTest('constraint.sequentialGroup is 3.1-3.2',
    result?.sequentialGroup === '3.1-3.2',
    `Got: ${result?.sequentialGroup}`);

  // Test invalid task ID
  log('\n--- Invalid Task ID ---');

  result = getTaskConstraints(planPath, '99.99');
  logTest('returns null for non-existent task',
    result === null,
    `Got: ${JSON.stringify(result)}`);

  // Test invalid plan path
  log('\n--- Invalid Plan Path ---');

  result = getTaskConstraints('docs/plans/non-existent.md', '1.1');
  logTest('returns null for non-existent plan',
    result === null,
    `Got: ${JSON.stringify(result)}`);
}

function testRealWorldPlan() {
  log('\n=== Testing: Real-World Plan ===');

  const { parseExecutionNotes, getTaskConstraints } = require('../lib/plan-status.js');
  const planPath = 'docs/plans/implement-orchestration-constraints.md';

  // Test that we can parse the actual implementation plan
  log('\n--- Parsing Actual Plan ---');

  try {
    const content = fs.readFileSync(path.join(PROJECT_ROOT, planPath), 'utf8');
    const constraints = parseExecutionNotes(content);

    logTest('parses constraints from real plan',
      constraints.length > 0,
      `Found ${constraints.length} constraints`);

    // Find the Phase 2 constraint
    const phase2Constraint = constraints.find(c => c.taskIds.includes('2.1'));
    logTest('finds Phase 2 sequential constraint',
      phase2Constraint !== null,
      `Got: ${JSON.stringify(phase2Constraint)}`);

    if (phase2Constraint) {
      logTest('Phase 2 constraint includes 2.1-2.3',
        phase2Constraint.taskIds.includes('2.1') &&
        phase2Constraint.taskIds.includes('2.2') &&
        phase2Constraint.taskIds.includes('2.3'),
        `Got: ${JSON.stringify(phase2Constraint.taskIds)}`);
    }

  } catch (e) {
    logTest('can read real plan file',
      false,
      e.message);
  }

  // Test getTaskConstraints on real plan
  log('\n--- Getting Constraints from Real Plan ---');

  let result = getTaskConstraints(planPath, '2.1');
  logTest('getTaskConstraints returns constraint for 2.1',
    result?.sequential === true,
    `Got: ${JSON.stringify(result)}`);

  result = getTaskConstraints(planPath, '1.1');
  logTest('getTaskConstraints returns null for 1.1 (parallel)',
    result === null,
    `Got: ${JSON.stringify(result)}`);
}

function main() {
  log('========================================');
  log('  Constraint Parsing Unit Tests');
  log('========================================');

  try {
    log('\nSetting up test environment...');
    setupTestEnvironment();

    testExpandTaskRange();
    testParseExecutionNotes();
    testGetTaskConstraints();
    testRealWorldPlan();

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
