#!/usr/bin/env node
/**
 * Integration Tests for --plan argument
 *
 * Tests the --plan argument functionality across status-cli.js commands.
 * Run: node scripts/tests/test-plan-arg.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test configuration
const PROJECT_ROOT = process.cwd();
const TEST_PLAN_DIR = path.join(PROJECT_ROOT, 'docs/plans');
const TEST_PLAN_1_PATH = path.join(TEST_PLAN_DIR, 'test-plan-arg-1.md');
const TEST_PLAN_2_PATH = path.join(TEST_PLAN_DIR, 'test-plan-arg-2.md');
const TEST_OUTPUT_1_DIR = path.join(PROJECT_ROOT, 'docs/plan-outputs/test-plan-arg-1');
const TEST_OUTPUT_2_DIR = path.join(PROJECT_ROOT, 'docs/plan-outputs/test-plan-arg-2');
const STATUS_CLI = 'node scripts/status-cli.js';

// Store original current-plan.txt
let originalPlanPath = '';

// Track test results
let passed = 0;
let failed = 0;
const failures = [];

// Utility functions
function log(msg) {
  console.log(msg);
}

function logTest(name, success, error = null) {
  if (success) {
    passed++;
    log(`  ✓ ${name}`);
  } else {
    failed++;
    failures.push({ name, error });
    log(`  ✗ ${name}: ${error}`);
  }
}

function runCli(args) {
  const cmd = `${STATUS_CLI} ${args}`;
  try {
    const output = execSync(cmd, {
      encoding: 'utf8',
      cwd: PROJECT_ROOT
    });
    return { success: true, output, parsed: tryParse(output) };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      stderr: error.stderr?.toString() || '',
      stdout: error.stdout?.toString() || ''
    };
  }
}

function tryParse(output) {
  try {
    return JSON.parse(output);
  } catch {
    return null;
  }
}

function setupTestEnvironment() {
  // Save original current-plan.txt
  const claudeDir = path.join(PROJECT_ROOT, '.claude');
  try {
    originalPlanPath = fs.readFileSync(path.join(claudeDir, 'current-plan.txt'), 'utf8').trim();
  } catch (e) {
    originalPlanPath = '';
  }

  // Create test directories
  fs.mkdirSync(TEST_PLAN_DIR, { recursive: true });
  fs.mkdirSync(TEST_OUTPUT_1_DIR, { recursive: true });
  fs.mkdirSync(TEST_OUTPUT_2_DIR, { recursive: true });
  fs.mkdirSync(path.join(TEST_OUTPUT_1_DIR, 'findings'), { recursive: true });
  fs.mkdirSync(path.join(TEST_OUTPUT_2_DIR, 'findings'), { recursive: true });

  // Create test plan 1
  const testPlan1Content = `# Test Plan 1

## Phase 1: First Phase

- [ ] 1.1 First task of plan 1
- [ ] 1.2 Second task of plan 1
`;
  fs.writeFileSync(TEST_PLAN_1_PATH, testPlan1Content);

  // Create test plan 2
  const testPlan2Content = `# Test Plan 2

## Phase 1: First Phase

- [ ] 1.1 First task of plan 2
- [ ] 1.2 Second task of plan 2
`;
  fs.writeFileSync(TEST_PLAN_2_PATH, testPlan2Content);

  // Create status.json for plan 1
  const status1 = {
    planPath: 'docs/plans/test-plan-arg-1.md',
    planName: 'Test Plan 1',
    createdAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
    currentPhase: 'Phase 1: First Phase',
    tasks: [
      { id: '1.1', phase: 'Phase 1: First Phase', description: 'First task of plan 1', status: 'pending' },
      { id: '1.2', phase: 'Phase 1: First Phase', description: 'Second task of plan 1', status: 'pending' }
    ],
    runs: [],
    summary: {
      totalTasks: 2,
      completed: 0,
      pending: 2,
      in_progress: 0,
      failed: 0,
      skipped: 0
    }
  };
  fs.writeFileSync(path.join(TEST_OUTPUT_1_DIR, 'status.json'), JSON.stringify(status1, null, 2));

  // Create status.json for plan 2
  const status2 = {
    planPath: 'docs/plans/test-plan-arg-2.md',
    planName: 'Test Plan 2',
    createdAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
    currentPhase: 'Phase 1: First Phase',
    tasks: [
      { id: '1.1', phase: 'Phase 1: First Phase', description: 'First task of plan 2', status: 'pending' },
      { id: '1.2', phase: 'Phase 1: First Phase', description: 'Second task of plan 2', status: 'pending' }
    ],
    runs: [],
    summary: {
      totalTasks: 2,
      completed: 0,
      pending: 2,
      in_progress: 0,
      failed: 0,
      skipped: 0
    }
  };
  fs.writeFileSync(path.join(TEST_OUTPUT_2_DIR, 'status.json'), JSON.stringify(status2, null, 2));

  // Set current-plan.txt to plan 1 (for fallback tests)
  fs.writeFileSync(path.join(claudeDir, 'current-plan.txt'), 'docs/plans/test-plan-arg-1.md');
}

function cleanupTestEnvironment() {
  const claudeDir = path.join(PROJECT_ROOT, '.claude');

  // Restore original current-plan.txt
  if (originalPlanPath) {
    fs.writeFileSync(path.join(claudeDir, 'current-plan.txt'), originalPlanPath);
  }

  // Clean up test files
  try { fs.unlinkSync(TEST_PLAN_1_PATH); } catch (e) { /* ignore */ }
  try { fs.unlinkSync(TEST_PLAN_2_PATH); } catch (e) { /* ignore */ }
  try { fs.rmSync(TEST_OUTPUT_1_DIR, { recursive: true, force: true }); } catch (e) { /* ignore */ }
  try { fs.rmSync(TEST_OUTPUT_2_DIR, { recursive: true, force: true }); } catch (e) { /* ignore */ }
}

// Test suites
function testPlanArgExplicit() {
  log('\n=== Testing: --plan <path> explicit syntax ===');

  // Test with plan 2 using --plan argument
  const result = runCli('--plan docs/plans/test-plan-arg-2.md status');
  logTest('--plan status returns JSON', result.success && result.parsed !== null);
  logTest('--plan selects correct plan', result.parsed?.planName === 'Test Plan 2');
  logTest('--plan returns plan 2 path', result.parsed?.planPath?.includes('test-plan-arg-2'));
}

function testPlanArgEqualsSyntax() {
  log('\n=== Testing: --plan=<path> equals syntax ===');

  // Test with equals syntax
  const result = runCli('--plan=docs/plans/test-plan-arg-2.md status');
  logTest('--plan= status returns JSON', result.success && result.parsed !== null);
  logTest('--plan= selects correct plan', result.parsed?.planName === 'Test Plan 2');
}

function testPlanArgFallback() {
  log('\n=== Testing: fallback to current-plan.txt ===');

  // Without --plan, should use current-plan.txt (which points to plan 1)
  const result = runCli('status');
  logTest('fallback status returns JSON', result.success && result.parsed !== null);
  logTest('fallback selects plan 1', result.parsed?.planName === 'Test Plan 1');
}

function testPlanArgNonexistent() {
  log('\n=== Testing: --plan with nonexistent file ===');

  const result = runCli('--plan docs/plans/nonexistent.md status');
  logTest('nonexistent plan returns error', !result.success);
  logTest('error message mentions file not found',
    result.stderr?.includes('not found') || result.error?.includes('not found'));
}

function testPlanArgWithCommands() {
  log('\n=== Testing: --plan with various commands ===');

  // Test mark-started with --plan
  const startResult = runCli('--plan docs/plans/test-plan-arg-2.md mark-started 1.1');
  logTest('mark-started with --plan works', startResult.parsed?.success === true);

  // Verify the change was made to plan 2, not plan 1
  const plan2Status = JSON.parse(fs.readFileSync(path.join(TEST_OUTPUT_2_DIR, 'status.json'), 'utf8'));
  const task = plan2Status.tasks.find(t => t.id === '1.1');
  logTest('task updated in correct plan', task?.status === 'in_progress');

  // Verify plan 1 was not affected
  const plan1Status = JSON.parse(fs.readFileSync(path.join(TEST_OUTPUT_1_DIR, 'status.json'), 'utf8'));
  const plan1Task = plan1Status.tasks.find(t => t.id === '1.1');
  logTest('other plan not affected', plan1Task?.status === 'pending');

  // Test next command with --plan
  const nextResult = runCli('--plan docs/plans/test-plan-arg-2.md next 3');
  logTest('next with --plan works', nextResult.success && nextResult.parsed !== null);

  // Test progress with --plan
  const progressResult = runCli('--plan docs/plans/test-plan-arg-2.md progress');
  logTest('progress with --plan works', progressResult.success);
  logTest('progress shows correct plan', progressResult.output?.includes('Test Plan 2'));

  // Test phases with --plan
  const phasesResult = runCli('--plan docs/plans/test-plan-arg-2.md phases');
  logTest('phases with --plan works', phasesResult.success && phasesResult.parsed !== null);
}

function testPlanArgHelp() {
  log('\n=== Testing: --help shows --plan option ===');

  const result = runCli('--help');
  logTest('help shows --plan option', result.output?.includes('--plan'));
  logTest('help shows usage with --plan', result.output?.includes('[--plan <path>]'));
}

function testGetPlanPathFromArgsLibrary() {
  log('\n=== Testing: getPlanPathFromArgs library function ===');

  // Test the library function directly
  try {
    const { getPlanPathFromArgs } = require(path.join(PROJECT_ROOT, 'scripts/lib/plan-status.js'));

    // Test with explicit --plan
    const r1 = getPlanPathFromArgs(['--plan', 'docs/plans/test-plan-arg-1.md', 'status']);
    logTest('library extracts --plan path', r1.planPath === 'docs/plans/test-plan-arg-1.md');
    logTest('library returns remaining args', r1.remainingArgs.length === 1 && r1.remainingArgs[0] === 'status');
    logTest('library returns no error for valid path', r1.error === null);

    // Test with --plan= syntax
    const r2 = getPlanPathFromArgs(['--plan=docs/plans/test-plan-arg-1.md', 'next', '3']);
    logTest('library handles --plan= syntax', r2.planPath === 'docs/plans/test-plan-arg-1.md');
    logTest('library preserves multiple remaining args', r2.remainingArgs.length === 2);

    // Test with nonexistent file
    const r3 = getPlanPathFromArgs(['--plan', 'nonexistent.md', 'status']);
    logTest('library returns error for missing file', r3.error !== null);
    logTest('library returns null planPath for missing file', r3.planPath === null);

    // Test fallback to current-plan.txt
    const r4 = getPlanPathFromArgs(['status']);
    logTest('library falls back to current-plan.txt', r4.planPath !== null);
    logTest('library returns no error on fallback', r4.error === null);

  } catch (error) {
    logTest('library function exists', false, error.message);
  }
}

// Main test runner
function main() {
  log('========================================');
  log('  --plan Argument Integration Tests');
  log('========================================');

  try {
    log('\nSetting up test environment...');
    setupTestEnvironment();

    // Run all test suites
    testPlanArgExplicit();
    testPlanArgEqualsSyntax();
    testPlanArgFallback();
    testPlanArgNonexistent();
    testPlanArgWithCommands();
    testPlanArgHelp();
    testGetPlanPathFromArgsLibrary();

    // Summary
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

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

main();
