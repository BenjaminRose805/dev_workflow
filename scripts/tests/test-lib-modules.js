#!/usr/bin/env node
/**
 * Unit Tests for lib modules: plan-status.js (unified library)
 *
 * Tests the unified plan status library that consolidates:
 * - plan-pointer.js (path resolution)
 * - status-manager.js (high-level status operations)
 * - plan-output-utils.js (low-level I/O)
 *
 * Run: node scripts/tests/test-lib-modules.js
 */

const fs = require('fs');
const path = require('path');

// Test configuration
const PROJECT_ROOT = process.cwd();
const TEST_PLAN_DIR = path.join(PROJECT_ROOT, 'docs/plans');
const TEST_PLAN_PATH = path.join(TEST_PLAN_DIR, 'test-lib-modules.md');
const TEST_OUTPUT_DIR = path.join(PROJECT_ROOT, 'docs/plan-outputs/test-lib-modules');

// Store original values
let originalPlanPath = '';

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

function setupTestEnvironment() {
  const claudeDir = path.join(PROJECT_ROOT, '.claude');
  try {
    originalPlanPath = fs.readFileSync(path.join(claudeDir, 'current-plan.txt'), 'utf8').trim();
  } catch (e) {
    originalPlanPath = '';
  }

  fs.mkdirSync(TEST_PLAN_DIR, { recursive: true });
  fs.mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
  fs.mkdirSync(path.join(TEST_OUTPUT_DIR, 'findings'), { recursive: true });

  const relativePlanPath = 'docs/plans/test-lib-modules.md';
  const testPlanContent = `# Test Lib Modules Plan

## Phase 1: Tasks

**Tasks:**
- [ ] 1.1 First task
- [ ] 1.2 Second task
`;
  fs.writeFileSync(TEST_PLAN_PATH, testPlanContent);

  fs.writeFileSync(
    path.join(claudeDir, 'current-plan.txt'),
    relativePlanPath
  );
}

function cleanupTestEnvironment() {
  const claudeDir = path.join(PROJECT_ROOT, '.claude');

  if (originalPlanPath) {
    fs.writeFileSync(path.join(claudeDir, 'current-plan.txt'), originalPlanPath);
  }

  try {
    fs.unlinkSync(TEST_PLAN_PATH);
  } catch (e) {}
  try {
    fs.rmSync(TEST_OUTPUT_DIR, { recursive: true, force: true });
  } catch (e) {}
}

function testPlanStatus() {
  log('\n=== Testing: plan-status.js (Unified Library) ===');

  const planStatus = require('../lib/plan-status.js');
  const planPath = 'docs/plans/test-lib-modules.md';

  // Test path resolution
  log('\n--- Path Resolution ---');

  const activePath = planStatus.getActivePlanPath();
  logTest('getActivePlanPath returns string', typeof activePath === 'string');
  logTest('getActivePlanPath returns test path', activePath.includes('test-lib-modules'));

  const hasActive = planStatus.hasActivePlan();
  logTest('hasActivePlan returns boolean', typeof hasActive === 'boolean');
  logTest('hasActivePlan is true', hasActive === true);

  const outputDir = planStatus.getOutputDir(planPath);
  logTest('getOutputDir returns string', typeof outputDir === 'string');
  logTest('getOutputDir contains plan name', outputDir.includes('test-lib-modules'));

  const statusPath = planStatus.getStatusPath(planPath);
  logTest('getStatusPath returns string', typeof statusPath === 'string');
  logTest('getStatusPath ends with status.json', statusPath.endsWith('status.json'));

  const findingsDir = planStatus.getFindingsDir(planPath);
  logTest('getFindingsDir returns string', typeof findingsDir === 'string');
  logTest('getFindingsDir ends with findings', findingsDir.endsWith('findings'));

  // Test initialization
  log('\n--- Initialization ---');

  const initResult = planStatus.initializePlanStatus(planPath);
  logTest('initializePlanStatus returns object', typeof initResult === 'object');
  logTest('initializePlanStatus success', initResult.success === true);
  logTest('initializePlanStatus has status', initResult.status !== null);

  // Test core I/O
  log('\n--- Core I/O ---');

  const status = planStatus.loadStatus(planPath);
  logTest('loadStatus returns object', typeof status === 'object');
  logTest('loadStatus has tasks', Array.isArray(status?.tasks));

  // Test task updates
  log('\n--- Task Updates ---');

  const startedResult = planStatus.markTaskStarted(planPath, '1.1');
  logTest('markTaskStarted returns boolean', typeof startedResult === 'boolean');
  logTest('markTaskStarted succeeds', startedResult === true);

  // Verify task is now in_progress
  const statusAfterStart = planStatus.loadStatus(planPath);
  const taskAfterStart = statusAfterStart?.tasks?.find(t => t.id === '1.1');
  logTest('task is in_progress', taskAfterStart?.status === 'in_progress');

  const completedResult = planStatus.markTaskCompleted(planPath, '1.1', { notes: 'Test findings' });
  logTest('markTaskCompleted returns boolean', typeof completedResult === 'boolean');
  logTest('markTaskCompleted succeeds', completedResult === true);

  // Verify task is now completed
  const statusAfterComplete = planStatus.loadStatus(planPath);
  const taskAfterComplete = statusAfterComplete?.tasks?.find(t => t.id === '1.1');
  logTest('task is completed', taskAfterComplete?.status === 'completed');

  planStatus.markTaskStarted(planPath, '1.2');
  const failedResult = planStatus.markTaskFailed(planPath, '1.2', 'Test error');
  logTest('markTaskFailed succeeds', failedResult === true);

  const statusAfterFail = planStatus.loadStatus(planPath);
  const taskAfterFail = statusAfterFail?.tasks?.find(t => t.id === '1.2');
  logTest('task is failed', taskAfterFail?.status === 'failed');

  // Test queries
  log('\n--- Queries ---');

  const progress = planStatus.getProgress(planPath);
  logTest('getProgress returns object', typeof progress === 'object');
  logTest('getProgress has percentage', typeof progress?.percentage === 'number');

  const statusSummary = planStatus.getStatusSummary(planPath);
  logTest('getStatusSummary returns object', typeof statusSummary === 'object');
  logTest('getStatusSummary has total', typeof statusSummary?.total === 'number');

  const nextTasks = planStatus.getNextTasks(planPath);
  logTest('getNextTasks returns array', Array.isArray(nextTasks));

  // Test summary validation
  log('\n--- Summary Validation ---');

  const summary = planStatus.recalculateSummary(statusAfterComplete);
  logTest('recalculateSummary returns object', typeof summary === 'object');
  logTest('recalculateSummary has totalTasks', typeof summary.totalTasks === 'number');

  const ensured = planStatus.ensureSummaryKeys({});
  logTest('ensureSummaryKeys adds missing keys', ensured.totalTasks === 0);
  logTest('ensureSummaryKeys adds all keys', 'completed' in ensured && 'pending' in ensured);

  // Test run management
  log('\n--- Run Management ---');

  const runId = planStatus.startRun(planPath);
  logTest('startRun returns runId', typeof runId === 'string');

  const completeRunResult = planStatus.completeRun(planPath, runId, 1, 1);
  logTest('completeRun returns boolean', typeof completeRunResult === 'boolean');
  logTest('completeRun succeeds', completeRunResult === true);

  // Test configuration exports
  log('\n--- Configuration ---');

  logTest('CURRENT_PLAN_FILE exported', typeof planStatus.CURRENT_PLAN_FILE === 'string');
  logTest('OUTPUT_BASE exported', typeof planStatus.OUTPUT_BASE === 'string');
  logTest('VALID_STATUSES exported', Array.isArray(planStatus.VALID_STATUSES));
}

function main() {
  log('========================================');
  log('  Plan Status Library Unit Tests');
  log('========================================');

  try {
    log('\nSetting up test environment...');
    setupTestEnvironment();

    testPlanStatus();

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
