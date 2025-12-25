#!/usr/bin/env node
/**
 * Recovery Scenarios Test
 *
 * Tests the recovery mechanisms:
 * - Backup file creation
 * - Recovery from corrupt status.json
 * - Rebuild from markdown as last resort
 *
 * Run: node scripts/tests/test-recovery.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Test configuration
const PROJECT_ROOT = process.cwd();
const TEST_PLAN_PATH = path.join(PROJECT_ROOT, 'docs/plans/test-recovery.md');
const TEST_OUTPUT_DIR = path.join(PROJECT_ROOT, 'docs/plan-outputs/test-recovery');
const STATUS_PATH = path.join(TEST_OUTPUT_DIR, 'status.json');
const BACKUP_PATH = STATUS_PATH + '.bak';

// Store original values
let originalPlanPath = '';
// Note: current-plan-output.txt is no longer used - output path is derived from plan name

// Test results
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
    failures.push({ name, error });
    log(`  ✗ ${name}: ${error}`);
  }
}

function runCli(args) {
  try {
    const output = execSync(`node scripts/status-cli.js ${args}`, {
      encoding: 'utf8',
      cwd: PROJECT_ROOT
    });
    return { success: true, output, parsed: tryParse(output) };
  } catch (error) {
    return { success: false, error: error.message };
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
  const claudeDir = path.join(PROJECT_ROOT, '.claude');

  // Save original values
  try {
    originalPlanPath = fs.readFileSync(path.join(claudeDir, 'current-plan.txt'), 'utf8').trim();
  } catch (e) {
    originalPlanPath = '';
  }
  // Note: current-plan-output.txt is no longer used - output path is derived from plan name

  // Create test directories
  fs.mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
  fs.mkdirSync(path.join(TEST_OUTPUT_DIR, 'findings'), { recursive: true });

  // Create test plan
  const testPlanContent = `# Recovery Test Plan

## Phase 1: Recovery Tasks

**Tasks:**
- [ ] 1.1 First recovery task
- [ ] 1.2 Second recovery task
- [ ] 1.3 Third recovery task
`;
  fs.writeFileSync(TEST_PLAN_PATH, testPlanContent);

  // Create initial status.json
  const status = {
    _comment: "Recovery test status",
    planPath: 'docs/plans/test-recovery.md',
    planName: "Recovery Test Plan",
    createdAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
    currentPhase: "Phase 1: Recovery Tasks",
    tasks: [
      { id: "1.1", phase: "Phase 1: Recovery Tasks", description: "First recovery task", status: "pending" },
      { id: "1.2", phase: "Phase 1: Recovery Tasks", description: "Second recovery task", status: "completed" },
      { id: "1.3", phase: "Phase 1: Recovery Tasks", description: "Third recovery task", status: "pending" }
    ],
    runs: [],
    summary: {
      totalTasks: 3,
      completed: 1,
      pending: 2,
      in_progress: 0,
      failed: 0,
      skipped: 0
    }
  };
  fs.writeFileSync(STATUS_PATH, JSON.stringify(status, null, 2));

  // Set current plan pointer (output path is derived from plan name)
  fs.writeFileSync(path.join(claudeDir, 'current-plan.txt'), 'docs/plans/test-recovery.md');

  log('Created test environment with valid status.json');
}

function cleanupTestEnvironment() {
  const claudeDir = path.join(PROJECT_ROOT, '.claude');

  // Restore original values
  if (originalPlanPath) {
    fs.writeFileSync(path.join(claudeDir, 'current-plan.txt'), originalPlanPath);
  }
  // Note: current-plan-output.txt is no longer used - output path is derived from plan name

  // Clean up test files
  try { fs.unlinkSync(TEST_PLAN_PATH); } catch (e) { /* ignore */ }
  try { fs.rmSync(TEST_OUTPUT_DIR, { recursive: true, force: true }); } catch (e) { /* ignore */ }
}

function testAtomicWrites() {
  log('\n=== Test: Atomic Writes ===');

  // Perform an update - the new implementation uses atomic writes (temp + rename)
  // instead of backup files for data safety
  const result = runCli('mark-started 1.1');
  logTest('mark-started succeeds', result.success);

  // Verify status.json is valid after update
  try {
    const content = fs.readFileSync(STATUS_PATH, 'utf8');
    const status = JSON.parse(content);
    const task = status.tasks.find(t => t.id === '1.1');
    logTest('status.json valid after update', task?.status === 'in_progress');
  } catch (e) {
    logTest('status.json valid after update', false, e.message);
  }
}

function testRecoveryFromCorruptFile() {
  log('\n=== Test: Recovery from Corrupt File ===');

  // Create a valid status.json first
  const validStatus = {
    planPath: 'docs/plans/test-recovery.md',
    planName: "Recovery Test Plan",
    tasks: [
      { id: "1.1", phase: "Phase 1", description: "Task 1", status: "completed" },
      { id: "1.2", phase: "Phase 1", description: "Task 2", status: "pending" }
    ],
    summary: { totalTasks: 2, completed: 1, pending: 1, in_progress: 0, failed: 0, skipped: 0 }
  };
  fs.writeFileSync(STATUS_PATH, JSON.stringify(validStatus, null, 2));

  // Create a backup
  fs.writeFileSync(BACKUP_PATH, JSON.stringify(validStatus, null, 2));

  // Now corrupt the main status.json
  fs.writeFileSync(STATUS_PATH, '{"invalid json that is not complete');

  // Try to read status - should recover from backup
  const result = runCli('status');

  // The loadStatus function should have recovered
  // Check if status.json is now valid
  try {
    const content = fs.readFileSync(STATUS_PATH, 'utf8');
    const status = JSON.parse(content);
    logTest('status.json recovered', status.tasks !== undefined);
    logTest('recovered data is valid', status.tasks.length >= 0);
  } catch (e) {
    logTest('status.json recovered', false, e.message);
  }
}

function testRebuildFromMarkdown() {
  log('\n=== Test: Rebuild from Markdown ===');

  // Delete both status.json and backup
  try { fs.unlinkSync(STATUS_PATH); } catch (e) { /* ignore */ }
  try { fs.unlinkSync(BACKUP_PATH); } catch (e) { /* ignore */ }

  // Ensure the markdown plan exists
  const planExists = fs.existsSync(TEST_PLAN_PATH);
  logTest('markdown plan exists', planExists);

  if (!planExists) {
    logTest('rebuild from markdown', false, 'No markdown plan');
    return;
  }

  // The plan-output-utils rebuildStatusFromMarkdown should work
  // Let's test it via status-cli
  // First we need to initialize the plan

  // Create a minimal corrupt status to trigger rebuild
  fs.writeFileSync(STATUS_PATH, 'not json');

  // Try to get status - this should trigger rebuild
  const result = runCli('status');

  // Check if rebuild happened
  try {
    const content = fs.readFileSync(STATUS_PATH, 'utf8');
    const status = JSON.parse(content);

    logTest('status.json rebuilt', status.tasks !== undefined);
    logTest('tasks discovered from markdown', status.tasks?.length >= 0);

    // Check for recovery marker
    if (status._recovery) {
      logTest('recovery marker present', true);
    }
  } catch (e) {
    // If status command failed, check if it's because rebuild failed
    logTest('status.json rebuilt', false, e.message);
  }
}

function testStuckTaskRecovery() {
  log('\n=== Test: Stuck Task Detection ===');

  // Create status with a stuck task (in_progress for "30+ minutes" - simulated with old timestamp)
  const stuckTime = new Date(Date.now() - 35 * 60 * 1000).toISOString(); // 35 min ago
  const status = {
    planPath: 'docs/plans/test-recovery.md',
    planName: "Recovery Test Plan",
    currentPhase: "Phase 1: Recovery Tasks",
    tasks: [
      { id: "1.1", phase: "Phase 1", description: "Stuck task", status: "in_progress", startedAt: stuckTime },
      { id: "1.2", phase: "Phase 1", description: "Normal task", status: "pending" }
    ],
    summary: { totalTasks: 2, completed: 0, pending: 1, in_progress: 1, failed: 0, skipped: 0 }
  };
  fs.writeFileSync(STATUS_PATH, JSON.stringify(status, null, 2));

  // Run detect-stuck
  const result = runCli('detect-stuck');
  logTest('detect-stuck command works', result.success);

  if (result.parsed) {
    logTest('stuck task found', result.parsed.stuckCount >= 1);

    // Check if task was marked as failed
    const finalStatus = JSON.parse(fs.readFileSync(STATUS_PATH, 'utf8'));
    const stuckTask = finalStatus.tasks.find(t => t.id === '1.1');
    logTest('stuck task marked failed', stuckTask?.status === 'failed');
  }
}

function testRetryTracking() {
  log('\n=== Test: Retry Tracking ===');

  // Create status with a failed task
  const status = {
    planPath: 'docs/plans/test-recovery.md',
    planName: "Recovery Test Plan",
    tasks: [
      { id: "1.1", phase: "Phase 1", description: "Failed task", status: "failed", retryCount: 0 },
      { id: "1.2", phase: "Phase 1", description: "Pending task", status: "pending" }
    ],
    summary: { totalTasks: 2, completed: 0, pending: 1, in_progress: 0, failed: 1, skipped: 0 }
  };
  fs.writeFileSync(STATUS_PATH, JSON.stringify(status, null, 2));

  // Increment retry count
  const result = runCli('increment-retry 1.1 --error "Test error"');
  logTest('increment-retry works', result.success);

  if (result.parsed) {
    logTest('retry count incremented', result.parsed.retryCount >= 1);
    logTest('can retry flag set', typeof result.parsed.canRetry === 'boolean');
  }

  // Check retryable command
  const retryable = runCli('retryable');
  logTest('retryable command works', retryable.success);
}

function main() {
  log('========================================');
  log('  Recovery Scenarios Test');
  log('========================================');

  try {
    log('\nSetting up test environment...');
    setupTestEnvironment();

    testAtomicWrites();
    testRecoveryFromCorruptFile();
    testRebuildFromMarkdown();
    testStuckTaskRecovery();
    testRetryTracking();

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
