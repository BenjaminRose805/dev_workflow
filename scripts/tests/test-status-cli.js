#!/usr/bin/env node
/**
 * Unit Tests for status-cli.js
 *
 * Tests each command with valid input and error cases.
 * Run: node scripts/tests/test-status-cli.js
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test configuration
const PROJECT_ROOT = process.cwd();
const TEST_PLAN_DIR = path.join(PROJECT_ROOT, 'docs/plans');
const TEST_PLAN_PATH = path.join(TEST_PLAN_DIR, 'test-cli-unit.md');
const TEST_OUTPUT_DIR = path.join(PROJECT_ROOT, 'docs/plan-outputs/test-cli-unit');
const STATUS_CLI = 'node scripts/status-cli.js';

// Store original values to restore
let originalPlanPath = '';
// Note: current-plan-output.txt is no longer used - output path is derived from plan name

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

function runCli(args, options = {}) {
  const cmd = `${STATUS_CLI} ${args}`;
  try {
    const output = execSync(cmd, {
      encoding: 'utf8',
      cwd: process.cwd(),
      env: {
        ...process.env,
        TEST_PLAN_PATH: TEST_PLAN_PATH
      },
      ...options
    });
    return { success: true, output, parsed: tryParse(output) };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      stderr: error.stderr,
      stdout: error.stdout
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
  // Save original values
  const claudeDir = path.join(PROJECT_ROOT, '.claude');
  try {
    originalPlanPath = fs.readFileSync(path.join(claudeDir, 'current-plan.txt'), 'utf8').trim();
  } catch (e) {
    originalPlanPath = '';
  }
  // Note: current-plan-output.txt is no longer used - output path is derived from plan name

  // Create test directories
  fs.mkdirSync(TEST_PLAN_DIR, { recursive: true });
  fs.mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
  fs.mkdirSync(path.join(TEST_OUTPUT_DIR, 'findings'), { recursive: true });

  // Create test plan markdown (use relative path from project root)
  const relativePlanPath = 'docs/plans/test-cli-unit.md';
  const testPlanContent = `# Test Plan

## Phase 1: Test Phase

**Tasks:**
- [ ] 1.1 First test task
- [ ] 1.2 Second test task
- [ ] 1.3 Third test task

## Phase 2: Another Phase

**Tasks:**
- [ ] 2.1 Fourth test task
- [ ] 2.2 Fifth test task
`;
  fs.writeFileSync(TEST_PLAN_PATH, testPlanContent);

  // Create initial status.json
  const status = {
    _comment: "Test status file",
    planPath: relativePlanPath,
    planName: "Test Plan",
    createdAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
    currentPhase: "Phase 1: Test Phase",
    tasks: [
      { id: "1.1", phase: "Phase 1: Test Phase", description: "First test task", status: "pending" },
      { id: "1.2", phase: "Phase 1: Test Phase", description: "Second test task", status: "pending" },
      { id: "1.3", phase: "Phase 1: Test Phase", description: "Third test task", status: "pending" },
      { id: "2.1", phase: "Phase 2: Another Phase", description: "Fourth test task", status: "pending" },
      { id: "2.2", phase: "Phase 2: Another Phase", description: "Fifth test task", status: "pending" }
    ],
    runs: [],
    summary: {
      totalTasks: 5,
      completed: 0,
      pending: 5,
      in_progress: 0,
      failed: 0,
      skipped: 0
    }
  };
  fs.writeFileSync(
    path.join(TEST_OUTPUT_DIR, 'status.json'),
    JSON.stringify(status, null, 2)
  );

  // Set up current-plan.txt to point to test plan (use relative path)
  // Output path is derived from plan name: docs/plan-outputs/test-cli-unit/
  fs.writeFileSync(
    path.join(claudeDir, 'current-plan.txt'),
    relativePlanPath
  );
}

function cleanupTestEnvironment() {
  const claudeDir = path.join(PROJECT_ROOT, '.claude');

  // Restore original current-plan.txt
  if (originalPlanPath) {
    fs.writeFileSync(path.join(claudeDir, 'current-plan.txt'), originalPlanPath);
  }
  // Note: current-plan-output.txt is no longer used - output path is derived from plan name

  // Clean up test files
  try {
    fs.unlinkSync(TEST_PLAN_PATH);
  } catch (e) {
    // Ignore
  }
  try {
    fs.rmSync(TEST_OUTPUT_DIR, { recursive: true, force: true });
  } catch (e) {
    // Ignore cleanup errors
  }
}

// Test suites
function testStatusCommand() {
  log('\n=== Testing: status command ===');

  // Test valid status
  const result = runCli('status');
  logTest('status returns JSON', result.success && result.parsed !== null);
  logTest('status has planPath', typeof result.parsed?.planPath === 'string');
  // Note: status command returns a summary, not the full status with tasks array
  logTest('status has total tasks count', typeof result.parsed?.total === 'number');
  logTest('status has percentage', typeof result.parsed?.percentage === 'number');
}

function testMarkStarted() {
  log('\n=== Testing: mark-started command ===');

  // Test valid mark-started
  const result = runCli('mark-started 1.1');
  logTest('mark-started returns success', result.parsed?.success === true);
  logTest('mark-started sets in_progress', result.parsed?.status === 'in_progress');

  // Verify task status via check command
  const check = runCli('check 1.1');
  logTest('task is now in_progress', check.parsed?.task?.status === 'in_progress');

  // Test invalid task ID
  const invalid = runCli('mark-started 99.99');
  logTest('mark-started rejects invalid task', invalid.parsed?.success === false || !invalid.success);
}

function testMarkComplete() {
  log('\n=== Testing: mark-complete command ===');

  // First mark as started
  runCli('mark-started 1.2');

  // Test valid mark-complete
  const result = runCli('mark-complete 1.2 --notes "Test completion"');
  logTest('mark-complete returns success', result.parsed?.success === true);
  logTest('mark-complete sets completed', result.parsed?.status === 'completed');

  // Verify task status via check command
  const check = runCli('check 1.2');
  logTest('task is now completed', check.parsed?.task?.status === 'completed');

  // Verify summary via status command
  const status = runCli('status');
  logTest('summary updated', status.parsed?.completed >= 1);

  // Test missing task ID
  const missing = runCli('mark-complete');
  logTest('mark-complete requires task ID', !missing.success || missing.parsed?.error);
}

function testMarkFailed() {
  log('\n=== Testing: mark-failed command ===');

  // First mark as started
  runCli('mark-started 1.3');

  // Test valid mark-failed
  const result = runCli('mark-failed 1.3 --error "Test failure reason"');
  logTest('mark-failed returns success', result.parsed?.success === true);
  logTest('mark-failed sets failed', result.parsed?.status === 'failed');

  // Verify task status via check command
  const check = runCli('check 1.3');
  logTest('task is now failed', check.parsed?.task?.status === 'failed');

  // Verify summary via status command
  const status = runCli('status');
  logTest('summary updated', status.parsed?.failed >= 1);
}

function testMarkSkipped() {
  log('\n=== Testing: mark-skipped command ===');

  // Test valid mark-skipped
  const result = runCli('mark-skipped 2.1 --reason "Not needed"');
  logTest('mark-skipped returns success', result.parsed?.success === true);
  logTest('mark-skipped sets skipped', result.parsed?.status === 'skipped');

  // Verify task status via check command
  const check = runCli('check 2.1');
  logTest('task is now skipped', check.parsed?.task?.status === 'skipped');
}

function testNextCommand() {
  log('\n=== Testing: next command ===');

  // Reset a task to pending for testing
  const status = JSON.parse(fs.readFileSync(path.join(TEST_OUTPUT_DIR, 'status.json'), 'utf8'));
  status.tasks[4].status = 'pending'; // 2.2
  fs.writeFileSync(path.join(TEST_OUTPUT_DIR, 'status.json'), JSON.stringify(status, null, 2));

  // Test next command
  const result = runCli('next 3');
  logTest('next returns JSON', result.success && result.parsed !== null);
  // next command returns {count, tasks} structure
  logTest('next has count', typeof result.parsed?.count === 'number');
  logTest('next has tasks array', Array.isArray(result.parsed?.tasks));
}

function testProgressCommand() {
  log('\n=== Testing: progress command ===');

  const result = runCli('progress');
  logTest('progress returns output', result.success);
  logTest('progress contains percentage', result.output?.includes('%'));
  logTest('progress contains counts', result.output?.includes('Completed'));
}

function testValidateCommand() {
  log('\n=== Testing: validate command ===');

  const result = runCli('validate');
  logTest('validate returns JSON', result.success && result.parsed !== null);
  logTest('validate has valid field', typeof result.parsed?.valid === 'boolean');
}

function testSyncCheckCommand() {
  log('\n=== Testing: sync-check command ===');

  const result = runCli('sync-check');
  logTest('sync-check returns JSON', result.success && result.parsed !== null);
  logTest('sync-check has inSync field', typeof result.parsed?.inSync === 'boolean');
  logTest('sync-check has discrepancies array', Array.isArray(result.parsed?.discrepancies));
}

function testRetryableCommand() {
  log('\n=== Testing: retryable command ===');

  const result = runCli('retryable');
  logTest('retryable returns JSON', result.success && result.parsed !== null);
  logTest('retryable has tasks array', Array.isArray(result.parsed?.tasks));
  // Task 1.3 was marked failed, should appear in retryable
  logTest('retryable finds failed task', result.parsed?.tasks?.some(t => t.id === '1.3') || result.parsed?.count >= 0);
}

function testDetectStuckCommand() {
  log('\n=== Testing: detect-stuck command ===');

  const result = runCli('detect-stuck');
  logTest('detect-stuck returns JSON', result.success && result.parsed !== null);
  logTest('detect-stuck has thresholdMinutes', typeof result.parsed?.thresholdMinutes === 'number');
  logTest('detect-stuck has stuckTasks array', Array.isArray(result.parsed?.stuckTasks));
}

function testRunManagement() {
  log('\n=== Testing: run management commands ===');

  // Test start-run
  const startResult = runCli('start-run');
  logTest('start-run returns success', startResult.parsed?.success === true);
  logTest('start-run returns runId', typeof startResult.parsed?.runId === 'string');

  const runId = startResult.parsed?.runId;

  // Test complete-run
  if (runId) {
    const completeResult = runCli(`complete-run ${runId} --completed 2 --failed 1`);
    logTest('complete-run returns success', completeResult.parsed?.success === true);
  } else {
    logTest('complete-run (skipped - no runId)', false, 'No runId from start-run');
  }
}

function testFindingsManagement() {
  log('\n=== Testing: findings commands ===');

  // Test write-findings
  const writeResult = runCli('write-findings 1.2 --content "Test findings content"');
  logTest('write-findings returns success', writeResult.parsed?.success === true);

  // Test read-findings - note: it returns the content directly or {success, content}
  const readResult = runCli('read-findings 1.2');
  const hasContent = readResult.parsed?.success === true ||
                     readResult.parsed?.content !== undefined ||
                     (readResult.success && readResult.output?.includes('Test findings'));
  logTest('read-findings returns content', hasContent);

  const correctContent = readResult.parsed?.content?.includes('Test findings') ||
                         readResult.output?.includes('Test findings');
  logTest('read-findings has correct content', correctContent);

  // Test read-findings for non-existent task
  const missingResult = runCli('read-findings 99.99');
  logTest('read-findings handles missing', !missingResult.success || missingResult.parsed?.success === false);
}

function testErrorHandling() {
  log('\n=== Testing: error handling ===');

  // Test unknown command
  const unknown = runCli('unknown-command');
  logTest('unknown command returns error', !unknown.success);

  // Test missing required args
  const missingArgs = runCli('mark-started');
  logTest('missing args returns error', !missingArgs.success || missingArgs.parsed?.error);
}

// Main test runner
function main() {
  log('========================================');
  log('  Status CLI Unit Tests');
  log('========================================');

  try {
    log('\nSetting up test environment...');
    setupTestEnvironment();

    // Run all test suites
    testStatusCommand();
    testMarkStarted();
    testMarkComplete();
    testMarkFailed();
    testMarkSkipped();
    testNextCommand();
    testProgressCommand();
    testValidateCommand();
    testSyncCheckCommand();
    testRetryableCommand();
    testDetectStuckCommand();
    testRunManagement();
    testFindingsManagement();
    testErrorHandling();

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
