#!/usr/bin/env node
/**
 * Integration Test: Parallel Updates to status.json
 *
 * Tests that multiple concurrent processes can safely update status.json
 * without losing updates or corrupting data.
 *
 * Run: node scripts/tests/test-parallel-updates.js
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test configuration
const PROJECT_ROOT = process.cwd();
const TEST_PLAN_PATH = path.join(PROJECT_ROOT, 'docs/plans/test-parallel.md');
const TEST_OUTPUT_DIR = path.join(PROJECT_ROOT, 'docs/plan-outputs/test-parallel');
const NUM_PARALLEL_PROCESSES = 10;
const UPDATES_PER_PROCESS = 3;

// Store original values
let originalPlanPath = '';
let originalOutputPath = '';

function log(msg) {
  console.log(msg);
}

function setupTestEnvironment() {
  const claudeDir = path.join(PROJECT_ROOT, '.claude');

  // Save original values
  try {
    originalPlanPath = fs.readFileSync(path.join(claudeDir, 'current-plan.txt'), 'utf8').trim();
  } catch (e) {
    originalPlanPath = '';
  }
  try {
    originalOutputPath = fs.readFileSync(path.join(claudeDir, 'current-plan-output.txt'), 'utf8').trim();
  } catch (e) {
    originalOutputPath = '';
  }

  // Create test directories
  fs.mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
  fs.mkdirSync(path.join(TEST_OUTPUT_DIR, 'findings'), { recursive: true });

  // Create test plan with many tasks (one per parallel process)
  const tasks = [];
  for (let i = 0; i < NUM_PARALLEL_PROCESSES * UPDATES_PER_PROCESS; i++) {
    tasks.push(`- [ ] ${Math.floor(i / UPDATES_PER_PROCESS + 1)}.${(i % UPDATES_PER_PROCESS) + 1} Task ${i + 1}`);
  }

  const testPlanContent = `# Parallel Update Test Plan

## Phase 1: Parallel Test Tasks

**Tasks:**
${tasks.join('\n')}
`;
  fs.writeFileSync(TEST_PLAN_PATH, testPlanContent);

  // Create initial status.json with all tasks
  const statusTasks = [];
  for (let i = 0; i < NUM_PARALLEL_PROCESSES * UPDATES_PER_PROCESS; i++) {
    statusTasks.push({
      id: `${Math.floor(i / UPDATES_PER_PROCESS) + 1}.${(i % UPDATES_PER_PROCESS) + 1}`,
      phase: "Phase 1: Parallel Test Tasks",
      description: `Task ${i + 1}`,
      status: "pending"
    });
  }

  const status = {
    _comment: "Test status file for parallel updates",
    planPath: 'docs/plans/test-parallel.md',
    planName: "Parallel Update Test Plan",
    createdAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
    currentPhase: "Phase 1: Parallel Test Tasks",
    tasks: statusTasks,
    runs: [],
    summary: {
      totalTasks: statusTasks.length,
      completed: 0,
      pending: statusTasks.length,
      in_progress: 0,
      failed: 0,
      skipped: 0
    }
  };
  fs.writeFileSync(
    path.join(TEST_OUTPUT_DIR, 'status.json'),
    JSON.stringify(status, null, 2)
  );

  // Set current plan pointers
  fs.writeFileSync(path.join(claudeDir, 'current-plan.txt'), 'docs/plans/test-parallel.md');
  fs.writeFileSync(path.join(claudeDir, 'current-plan-output.txt'), 'docs/plan-outputs/test-parallel');

  log(`Created ${statusTasks.length} test tasks for parallel update test`);
}

function cleanupTestEnvironment() {
  const claudeDir = path.join(PROJECT_ROOT, '.claude');

  // Restore original values
  if (originalPlanPath) {
    fs.writeFileSync(path.join(claudeDir, 'current-plan.txt'), originalPlanPath);
  }
  if (originalOutputPath) {
    fs.writeFileSync(path.join(claudeDir, 'current-plan-output.txt'), originalOutputPath);
  }

  // Clean up test files
  try {
    fs.unlinkSync(TEST_PLAN_PATH);
  } catch (e) { /* ignore */ }
  try {
    fs.rmSync(TEST_OUTPUT_DIR, { recursive: true, force: true });
  } catch (e) { /* ignore */ }
}

/**
 * Run a single update command
 */
function runUpdateAsync(taskId, action) {
  return new Promise((resolve) => {
    const args = action === 'complete'
      ? ['scripts/status-cli.js', 'mark-complete', taskId, '--notes', `Completed by parallel test`]
      : ['scripts/status-cli.js', 'mark-started', taskId];

    const proc = spawn('node', args, {
      cwd: PROJECT_ROOT,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    proc.on('close', (code) => {
      let success = false;
      try {
        const result = JSON.parse(stdout);
        success = result.success === true;
      } catch (e) {
        success = false;
      }
      resolve({ taskId, action, code, success, stdout, stderr });
    });

    proc.on('error', (err) => {
      resolve({ taskId, action, code: -1, success: false, error: err.message });
    });
  });
}

/**
 * Run multiple update commands in parallel
 */
async function runParallelUpdates() {
  const updates = [];

  // Generate update commands
  for (let proc = 0; proc < NUM_PARALLEL_PROCESSES; proc++) {
    for (let update = 0; update < UPDATES_PER_PROCESS; update++) {
      const taskId = `${proc + 1}.${update + 1}`;
      // Alternate between mark-started and mark-complete
      const action = update === 0 ? 'started' : 'complete';
      updates.push({ taskId, action });
    }
  }

  log(`\nLaunching ${updates.length} parallel updates...`);
  const startTime = Date.now();

  // Run all updates in parallel
  const results = await Promise.all(
    updates.map(u => runUpdateAsync(u.taskId, u.action))
  );

  const elapsed = Date.now() - startTime;
  log(`Completed in ${elapsed}ms`);

  return results;
}

/**
 * Verify the final state
 */
function verifyResults(results) {
  log('\n=== Verification ===');

  // Count successes and failures
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  log(`Commands executed: ${results.length}`);
  log(`Successful: ${successful.length}`);
  log(`Failed: ${failed.length}`);

  if (failed.length > 0) {
    log('\nFailed commands:');
    failed.forEach(r => {
      log(`  - ${r.taskId} ${r.action}: ${r.stderr || r.error || 'unknown error'}`);
    });
  }

  // Read final status
  const statusPath = path.join(TEST_OUTPUT_DIR, 'status.json');
  let finalStatus;
  try {
    finalStatus = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
  } catch (e) {
    log('\nERROR: Could not read final status.json');
    return false;
  }

  // Verify status.json is valid JSON
  log(`\nFinal status.json:`);
  log(`  Tasks: ${finalStatus.tasks?.length || 0}`);
  log(`  Summary - Pending: ${finalStatus.summary?.pending}, In Progress: ${finalStatus.summary?.in_progress}, Completed: ${finalStatus.summary?.completed}`);

  // Verify summary matches actual task counts
  const actualCounts = {
    pending: 0,
    in_progress: 0,
    completed: 0,
    failed: 0,
    skipped: 0
  };

  for (const task of finalStatus.tasks || []) {
    if (actualCounts[task.status] !== undefined) {
      actualCounts[task.status]++;
    }
  }

  log(`\nActual task counts:`);
  log(`  Pending: ${actualCounts.pending}`);
  log(`  In Progress: ${actualCounts.in_progress}`);
  log(`  Completed: ${actualCounts.completed}`);

  // Check if summary matches actual
  const summaryMatches =
    actualCounts.pending === finalStatus.summary?.pending &&
    actualCounts.in_progress === finalStatus.summary?.in_progress &&
    actualCounts.completed === finalStatus.summary?.completed;

  if (summaryMatches) {
    log(`\n✓ Summary matches actual task counts`);
  } else {
    log(`\n✗ Summary MISMATCH detected!`);
    log(`  Expected pending: ${actualCounts.pending}, got: ${finalStatus.summary?.pending}`);
    log(`  Expected in_progress: ${actualCounts.in_progress}, got: ${finalStatus.summary?.in_progress}`);
    log(`  Expected completed: ${actualCounts.completed}, got: ${finalStatus.summary?.completed}`);
  }

  // Calculate success metrics
  const lostUpdates = results.length - successful.length;
  const allUpdatesSucceeded = lostUpdates === 0;

  log('\n=== Test Results ===');
  if (allUpdatesSucceeded && summaryMatches) {
    log('✓ PASSED: All parallel updates succeeded with no data loss');
    return true;
  } else {
    if (lostUpdates > 0) {
      log(`✗ FAILED: ${lostUpdates} updates were lost`);
    }
    if (!summaryMatches) {
      log('✗ FAILED: Summary does not match actual task counts');
    }
    return false;
  }
}

async function main() {
  log('========================================');
  log('  Parallel Updates Integration Test');
  log('========================================');
  log(`\nConfiguration:`);
  log(`  Parallel processes: ${NUM_PARALLEL_PROCESSES}`);
  log(`  Updates per process: ${UPDATES_PER_PROCESS}`);
  log(`  Total updates: ${NUM_PARALLEL_PROCESSES * UPDATES_PER_PROCESS}`);

  try {
    log('\nSetting up test environment...');
    setupTestEnvironment();

    const results = await runParallelUpdates();
    const passed = verifyResults(results);

    log('\n========================================');
    log(passed ? '  TEST PASSED' : '  TEST FAILED');
    log('========================================\n');

    return passed ? 0 : 1;
  } finally {
    log('Cleaning up test environment...');
    cleanupTestEnvironment();
  }
}

main().then(code => process.exit(code)).catch(err => {
  console.error('Test error:', err);
  cleanupTestEnvironment();
  process.exit(1);
});
