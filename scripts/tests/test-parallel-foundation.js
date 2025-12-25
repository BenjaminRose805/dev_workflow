#!/usr/bin/env node
/**
 * End-to-End Integration Tests for Parallel Execution Foundation
 *
 * This test suite validates the complete parallel execution foundation:
 * - --plan argument for concurrent sessions
 * - File conflict detection between tasks
 * - Serial git commit queue
 * - [PARALLEL] phase annotation parsing
 * - Enhanced progress output formats
 *
 * Run: node scripts/tests/test-parallel-foundation.js
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// =============================================================================
// Test Configuration
// =============================================================================

const PROJECT_ROOT = process.cwd();
const TEST_PLAN_DIR = path.join(PROJECT_ROOT, 'docs/plans');
const TEST_OUTPUT_BASE = path.join(PROJECT_ROOT, 'docs/plan-outputs');
const STATUS_CLI = 'node scripts/status-cli.js';

// Track test results
let passed = 0;
let failed = 0;
const failures = [];

// Test plans for concurrent session simulation
const TEST_PLANS = {
  plan1: {
    path: 'docs/plans/test-e2e-parallel-1.md',
    outputDir: 'docs/plan-outputs/test-e2e-parallel-1'
  },
  plan2: {
    path: 'docs/plans/test-e2e-parallel-2.md',
    outputDir: 'docs/plan-outputs/test-e2e-parallel-2'
  },
  parallelPhases: {
    path: 'docs/plans/test-e2e-parallel-phases.md',
    outputDir: 'docs/plan-outputs/test-e2e-parallel-phases'
  },
  conflicting: {
    path: 'docs/plans/test-e2e-conflicts.md',
    outputDir: 'docs/plan-outputs/test-e2e-conflicts'
  }
};

// =============================================================================
// Utility Functions
// =============================================================================

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

function createTestPlan(planPath, content) {
  const fullPath = path.join(PROJECT_ROOT, planPath);
  const dir = path.dirname(fullPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(fullPath, content);
}

function createTestStatusJson(outputDir, status) {
  const fullDir = path.join(PROJECT_ROOT, outputDir);
  fs.mkdirSync(fullDir, { recursive: true });
  fs.mkdirSync(path.join(fullDir, 'findings'), { recursive: true });
  fs.writeFileSync(path.join(fullDir, 'status.json'), JSON.stringify(status, null, 2));
}

function cleanupTestFiles() {
  for (const plan of Object.values(TEST_PLANS)) {
    try {
      fs.unlinkSync(path.join(PROJECT_ROOT, plan.path));
    } catch (e) { /* ignore */ }
    try {
      fs.rmSync(path.join(PROJECT_ROOT, plan.outputDir), { recursive: true, force: true });
    } catch (e) { /* ignore */ }
  }
}

// =============================================================================
// Test Setup
// =============================================================================

function setupTestEnvironment() {
  // Create test plan 1
  createTestPlan(TEST_PLANS.plan1.path, `# Test Plan 1

## Phase 1: Setup

- [ ] 1.1 Initialize test environment for plan 1
- [ ] 1.2 Configure settings for plan 1

## Phase 2: Implementation

- [ ] 2.1 Implement feature A in plan 1
- [ ] 2.2 Implement feature B in plan 1
`);

  createTestStatusJson(TEST_PLANS.plan1.outputDir, {
    planPath: TEST_PLANS.plan1.path,
    planName: 'Test Plan 1',
    createdAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
    currentPhase: 'Phase 1: Setup',
    tasks: [
      { id: '1.1', phase: 'Phase 1: Setup', description: 'Initialize test environment for plan 1', status: 'pending' },
      { id: '1.2', phase: 'Phase 1: Setup', description: 'Configure settings for plan 1', status: 'pending' },
      { id: '2.1', phase: 'Phase 2: Implementation', description: 'Implement feature A in plan 1', status: 'pending' },
      { id: '2.2', phase: 'Phase 2: Implementation', description: 'Implement feature B in plan 1', status: 'pending' }
    ],
    runs: [],
    summary: { totalTasks: 4, completed: 0, pending: 4, in_progress: 0, failed: 0, skipped: 0 }
  });

  // Create test plan 2
  createTestPlan(TEST_PLANS.plan2.path, `# Test Plan 2

## Phase 1: Setup

- [ ] 1.1 Initialize test environment for plan 2
- [ ] 1.2 Configure settings for plan 2

## Phase 2: Implementation

- [ ] 2.1 Implement feature X in plan 2
- [ ] 2.2 Implement feature Y in plan 2
`);

  createTestStatusJson(TEST_PLANS.plan2.outputDir, {
    planPath: TEST_PLANS.plan2.path,
    planName: 'Test Plan 2',
    createdAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
    currentPhase: 'Phase 1: Setup',
    tasks: [
      { id: '1.1', phase: 'Phase 1: Setup', description: 'Initialize test environment for plan 2', status: 'pending' },
      { id: '1.2', phase: 'Phase 1: Setup', description: 'Configure settings for plan 2', status: 'pending' },
      { id: '2.1', phase: 'Phase 2: Implementation', description: 'Implement feature X in plan 2', status: 'pending' },
      { id: '2.2', phase: 'Phase 2: Implementation', description: 'Implement feature Y in plan 2', status: 'pending' }
    ],
    runs: [],
    summary: { totalTasks: 4, completed: 0, pending: 4, in_progress: 0, failed: 0, skipped: 0 }
  });

  // Create plan with [PARALLEL] phase annotations
  createTestPlan(TEST_PLANS.parallelPhases.path, `# Test Parallel Phases Plan

**Execution Note:** Phases 1-2 are [PARALLEL] - independent modules

## Phase 0: Preparation

- [ ] 0.1 Setup base infrastructure

## Phase 1: API Development

- [ ] 1.1 Create REST endpoints
- [ ] 1.2 Add API authentication

## Phase 2: UI Development

- [ ] 2.1 Create React components
- [ ] 2.2 Add form validation

## Phase 3: Integration

- [ ] 3.1 Connect API and UI
`);

  createTestStatusJson(TEST_PLANS.parallelPhases.outputDir, {
    planPath: TEST_PLANS.parallelPhases.path,
    planName: 'Test Parallel Phases Plan',
    createdAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
    currentPhase: 'Phase 0: Preparation',
    tasks: [
      { id: '0.1', phase: 'Phase 0: Preparation', description: 'Setup base infrastructure', status: 'completed' },
      { id: '1.1', phase: 'Phase 1: API Development', description: 'Create REST endpoints', status: 'pending' },
      { id: '1.2', phase: 'Phase 1: API Development', description: 'Add API authentication', status: 'pending' },
      { id: '2.1', phase: 'Phase 2: UI Development', description: 'Create React components', status: 'pending' },
      { id: '2.2', phase: 'Phase 2: UI Development', description: 'Add form validation', status: 'pending' },
      { id: '3.1', phase: 'Phase 3: Integration', description: 'Connect API and UI', status: 'pending' }
    ],
    runs: [],
    summary: { totalTasks: 6, completed: 1, pending: 5, in_progress: 0, failed: 0, skipped: 0 }
  });

  // Create plan with file conflicts
  createTestPlan(TEST_PLANS.conflicting.path, `# Test Conflicts Plan

## Phase 1: Core Changes

- [ ] 1.1 Update \`src/api.ts\` with new endpoint
- [ ] 1.2 Modify \`src/api.ts\` for authentication
- [ ] 1.3 Add \`src/utils.ts\` helpers
- [ ] 1.4 Update \`src/utils.ts\` validation
`);

  createTestStatusJson(TEST_PLANS.conflicting.outputDir, {
    planPath: TEST_PLANS.conflicting.path,
    planName: 'Test Conflicts Plan',
    createdAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
    currentPhase: 'Phase 1: Core Changes',
    tasks: [
      { id: '1.1', phase: 'Phase 1: Core Changes', description: 'Update `src/api.ts` with new endpoint', status: 'pending' },
      { id: '1.2', phase: 'Phase 1: Core Changes', description: 'Modify `src/api.ts` for authentication', status: 'pending' },
      { id: '1.3', phase: 'Phase 1: Core Changes', description: 'Add `src/utils.ts` helpers', status: 'pending' },
      { id: '1.4', phase: 'Phase 1: Core Changes', description: 'Update `src/utils.ts` validation', status: 'pending' }
    ],
    runs: [],
    summary: { totalTasks: 4, completed: 0, pending: 4, in_progress: 0, failed: 0, skipped: 0 }
  });
}

// =============================================================================
// Test Suites
// =============================================================================

function testConcurrentPlanSessions() {
  log('\n=== Test Suite: Concurrent Plan Sessions with --plan ===');

  // Test 1: Both plans can be accessed independently
  log('\n--- Independent Plan Access ---');

  const result1 = runCli(`--plan ${TEST_PLANS.plan1.path} status`);
  logTest('Plan 1 accessible with --plan',
    result1.success && result1.parsed?.planName === 'Test Plan 1',
    `Got: ${result1.parsed?.planName}`);

  const result2 = runCli(`--plan ${TEST_PLANS.plan2.path} status`);
  logTest('Plan 2 accessible with --plan',
    result2.success && result2.parsed?.planName === 'Test Plan 2',
    `Got: ${result2.parsed?.planName}`);

  // Test 2: Modify plan 1, verify plan 2 is unaffected
  log('\n--- Concurrent Modifications ---');

  const start1 = runCli(`--plan ${TEST_PLANS.plan1.path} mark-started 1.1`);
  logTest('Can start task in Plan 1',
    start1.success && start1.parsed?.success === true,
    start1.error);

  // Check plan 2 is unaffected
  const check2 = runCli(`--plan ${TEST_PLANS.plan2.path} status`);
  logTest('Plan 2 unaffected (0 in_progress)',
    check2.success && check2.parsed?.inProgress === 0,
    `Plan 2 inProgress: ${check2.parsed?.inProgress}`);

  // Modify plan 2
  const start2 = runCli(`--plan ${TEST_PLANS.plan2.path} mark-started 1.1`);
  logTest('Can start task in Plan 2',
    start2.success && start2.parsed?.success === true,
    start2.error);

  // Verify both plans now have in-progress tasks
  const verify1 = runCli(`--plan ${TEST_PLANS.plan1.path} status`);
  const verify2 = runCli(`--plan ${TEST_PLANS.plan2.path} status`);

  logTest('Both plans have in-progress tasks',
    verify1.parsed?.inProgress === 1 && verify2.parsed?.inProgress === 1,
    `Plan 1: ${verify1.parsed?.inProgress}, Plan 2: ${verify2.parsed?.inProgress}`);

  // Test 3: Complete tasks independently
  log('\n--- Independent Task Completion ---');

  const complete1 = runCli(`--plan ${TEST_PLANS.plan1.path} mark-complete 1.1 --notes "Done in plan 1"`);
  logTest('Can complete task in Plan 1',
    complete1.success && complete1.parsed?.success === true,
    complete1.error);

  const complete2 = runCli(`--plan ${TEST_PLANS.plan2.path} mark-complete 1.1 --notes "Done in plan 2"`);
  logTest('Can complete task in Plan 2',
    complete2.success && complete2.parsed?.success === true,
    complete2.error);

  // Verify final state
  const final1 = runCli(`--plan ${TEST_PLANS.plan1.path} status`);
  const final2 = runCli(`--plan ${TEST_PLANS.plan2.path} status`);

  logTest('Plan 1 has 1 completed task',
    final1.parsed?.completed === 1,
    `Plan 1 completed: ${final1.parsed?.completed}`);

  logTest('Plan 2 has 1 completed task',
    final2.parsed?.completed === 1,
    `Plan 2 completed: ${final2.parsed?.completed}`);
}

function testFileConflictDetection() {
  log('\n=== Test Suite: File Conflict Detection ===');

  // Test the conflict plan with file overlaps
  log('\n--- Conflict Detection in Next Command ---');

  const nextResult = runCli(`--plan ${TEST_PLANS.conflicting.path} next 4`);
  logTest('Next command succeeds',
    nextResult.success && nextResult.parsed !== null,
    nextResult.error);

  logTest('Returns 4 tasks',
    nextResult.parsed?.count === 4,
    `Got ${nextResult.parsed?.count} tasks`);

  // Check for fileConflicts in output
  logTest('Detects file conflicts',
    nextResult.parsed?.fileConflicts?.length > 0,
    `Got ${nextResult.parsed?.fileConflicts?.length || 0} conflicts`);

  // Check specific conflicts
  const conflicts = nextResult.parsed?.fileConflicts || [];
  const apiConflict = conflicts.find(c => c.file.includes('api.ts'));
  const utilsConflict = conflicts.find(c => c.file.includes('utils.ts'));

  logTest('Detects src/api.ts conflict',
    apiConflict !== undefined,
    `Conflicts: ${JSON.stringify(conflicts.map(c => c.file))}`);

  logTest('Detects src/utils.ts conflict',
    utilsConflict !== undefined,
    `Conflicts: ${JSON.stringify(conflicts.map(c => c.file))}`);

  // Check per-task conflict flags
  log('\n--- Per-Task Conflict Flags ---');

  const tasks = nextResult.parsed?.tasks || [];
  const task11 = tasks.find(t => t.id === '1.1');
  const task12 = tasks.find(t => t.id === '1.2');
  const task13 = tasks.find(t => t.id === '1.3');
  const task14 = tasks.find(t => t.id === '1.4');

  logTest('Task 1.1 marked as conflicting',
    task11?.fileConflict === true,
    `fileConflict: ${task11?.fileConflict}`);

  logTest('Task 1.2 marked as conflicting (with 1.1)',
    task12?.fileConflict === true && task12?.conflictsWith?.includes('1.1'),
    `conflictsWith: ${JSON.stringify(task12?.conflictsWith)}`);

  logTest('Task 1.3 marked as conflicting (with 1.4)',
    task13?.fileConflict === true && task13?.conflictsWith?.includes('1.4'),
    `conflictsWith: ${JSON.stringify(task13?.conflictsWith)}`);

  logTest('Conflicting files listed per task',
    task11?.conflictingFiles?.some(f => f.includes('api.ts')),
    `Files: ${JSON.stringify(task11?.conflictingFiles)}`);
}

function testParallelPhaseAnnotation() {
  log('\n=== Test Suite: [PARALLEL] Phase Annotation ===');

  // Test the parallel phases plan
  log('\n--- Parallel Phases in Next Command ---');

  const nextResult = runCli(`--plan ${TEST_PLANS.parallelPhases.path} next 6`);
  logTest('Next command succeeds',
    nextResult.success && nextResult.parsed !== null,
    nextResult.error);

  // Check for parallelPhases info
  logTest('Includes parallelPhases info',
    nextResult.parsed?.parallelPhases?.length > 0,
    `parallelPhases: ${JSON.stringify(nextResult.parsed?.parallelPhases)}`);

  // Check that tasks from both Phase 1 and Phase 2 are returned
  const tasks = nextResult.parsed?.tasks || [];
  const phase1Tasks = tasks.filter(t => t.phase === 1);
  const phase2Tasks = tasks.filter(t => t.phase === 2);

  logTest('Returns tasks from Phase 1',
    phase1Tasks.length > 0,
    `Phase 1 tasks: ${phase1Tasks.length}`);

  logTest('Returns tasks from Phase 2',
    phase2Tasks.length > 0,
    `Phase 2 tasks: ${phase2Tasks.length}`);

  // Check parallelPhase flag on tasks
  log('\n--- Per-Task Parallel Phase Flags ---');

  const task11 = tasks.find(t => t.id === '1.1');
  const task21 = tasks.find(t => t.id === '2.1');

  logTest('Phase 1 tasks marked with parallelPhase=true',
    task11?.parallelPhase === true,
    `Task 1.1 parallelPhase: ${task11?.parallelPhase}`);

  logTest('Phase 2 tasks marked with parallelPhase=true',
    task21?.parallelPhase === true,
    `Task 2.1 parallelPhase: ${task21?.parallelPhase}`);

  // Verify Phase 3 (not in parallel group) is not returned yet
  const phase3Tasks = tasks.filter(t => t.phase === 3);
  logTest('Phase 3 tasks not returned (depends on parallel phases)',
    phase3Tasks.length === 0,
    `Phase 3 tasks: ${phase3Tasks.length}`);
}

function testGitQueueStatus() {
  log('\n=== Test Suite: Git Commit Queue ===');

  // Test queue status is available via library
  log('\n--- Queue Status Availability ---');

  try {
    const { getQueueStatus, clearQueue } = require('../lib/git-queue.js');

    // Clear any pending items first
    clearQueue(false);

    const status = getQueueStatus();
    logTest('Queue status available',
      status !== null && typeof status === 'object',
      'getQueueStatus() failed');

    logTest('Queue has pendingCount property',
      typeof status.pendingCount === 'number',
      `Got: ${typeof status.pendingCount}`);

    logTest('Queue has isProcessing property',
      typeof status.isProcessing === 'boolean',
      `Got: ${typeof status.isProcessing}`);

    logTest('Queue starts empty',
      status.pendingCount === 0,
      `pendingCount: ${status.pendingCount}`);

  } catch (error) {
    logTest('Git queue module loads', false, error.message);
  }

  // Test queue status in progress output
  log('\n--- Queue Status in Progress Output ---');

  const progressResult = runCli(`--plan ${TEST_PLANS.plan1.path} progress --format=json`);
  logTest('Progress JSON format works',
    progressResult.success && progressResult.parsed !== null,
    progressResult.error);

  // Git queue may or may not be included depending on state
  logTest('Progress JSON has expected structure',
    progressResult.parsed?.plan && progressResult.parsed?.summary,
    `Keys: ${Object.keys(progressResult.parsed || {}).join(', ')}`);
}

function testProgressOutputFormats() {
  log('\n=== Test Suite: Progress Output Formats ===');

  // Test JSON format
  log('\n--- JSON Format ---');

  const jsonResult = runCli(`--plan ${TEST_PLANS.plan1.path} progress --format=json`);
  logTest('JSON format returns valid JSON',
    jsonResult.success && jsonResult.parsed !== null,
    jsonResult.error);

  logTest('JSON has plan info',
    jsonResult.parsed?.plan?.path && jsonResult.parsed?.plan?.name,
    `plan: ${JSON.stringify(jsonResult.parsed?.plan)}`);

  logTest('JSON has summary with counts',
    typeof jsonResult.parsed?.summary?.total === 'number' &&
    typeof jsonResult.parsed?.summary?.completed === 'number',
    `summary: ${JSON.stringify(jsonResult.parsed?.summary)}`);

  logTest('JSON has phases array',
    Array.isArray(jsonResult.parsed?.phases),
    `phases type: ${typeof jsonResult.parsed?.phases}`);

  // Test markers format
  log('\n--- Markers Format ---');

  const markersResult = runCli(`--plan ${TEST_PLANS.plan1.path} progress --format=markers`);
  logTest('Markers format succeeds',
    markersResult.success,
    markersResult.error);

  const lines = markersResult.output.split('\n').filter(l => l.startsWith('[PROGRESS]'));
  logTest('Markers format produces progress lines',
    lines.length > 0,
    `Found ${lines.length} progress lines`);

  logTest('Has plan-level marker',
    lines.some(l => l.includes('plan status=')),
    `Lines: ${lines.slice(0, 2).join(', ')}`);

  logTest('Has phase-level markers',
    lines.some(l => l.includes('phase=')),
    `Lines: ${lines.join(', ')}`);

  logTest('Has summary marker',
    lines.some(l => l.includes('summary completed=')),
    `Lines: ${lines.join(', ')}`);

  // Test text format (default)
  log('\n--- Text Format (Default) ---');

  const textResult = runCli(`--plan ${TEST_PLANS.plan1.path} progress`);
  logTest('Text format succeeds',
    textResult.success,
    textResult.error);

  logTest('Text format shows plan name',
    textResult.output.includes('Test Plan 1'),
    'Plan name not found');

  logTest('Text format shows progress bar',
    textResult.output.includes('Progress:') && textResult.output.includes('%'),
    'Progress bar not found');

  logTest('Text format shows task counts',
    textResult.output.includes('Completed:') && textResult.output.includes('Pending:'),
    'Task counts not found');
}

function testIntegratedWorkflow() {
  log('\n=== Test Suite: Integrated Workflow ===');

  // Simulate a realistic workflow with multiple features
  log('\n--- Realistic Workflow Simulation ---');

  const planPath = TEST_PLANS.parallelPhases.path;

  // Start with checking status
  const initialStatus = runCli(`--plan ${planPath} status`);
  logTest('Initial status check works',
    initialStatus.success && initialStatus.parsed?.completed === 1,
    `Completed: ${initialStatus.parsed?.completed}`);

  // Get next tasks (should return from parallel phases)
  const next = runCli(`--plan ${planPath} next 4`);
  logTest('Get next tasks for parallel phases',
    next.success && next.parsed?.count >= 2,
    `Got ${next.parsed?.count} tasks`);

  // Start a task from each parallel phase
  const start11 = runCli(`--plan ${planPath} mark-started 1.1`);
  const start21 = runCli(`--plan ${planPath} mark-started 2.1`);

  logTest('Start task 1.1 from Phase 1',
    start11.success && start11.parsed?.success === true,
    start11.error);

  logTest('Start task 2.1 from Phase 2',
    start21.success && start21.parsed?.success === true,
    start21.error);

  // Verify both are in progress
  const midStatus = runCli(`--plan ${planPath} status`);
  logTest('Both tasks now in_progress',
    midStatus.parsed?.inProgress === 2,
    `inProgress: ${midStatus.parsed?.inProgress}`);

  // Complete both tasks
  const complete11 = runCli(`--plan ${planPath} mark-complete 1.1 --notes "API done"`);
  const complete21 = runCli(`--plan ${planPath} mark-complete 2.1 --notes "UI done"`);

  logTest('Complete both parallel tasks',
    complete11.parsed?.success && complete21.parsed?.success,
    `1.1: ${complete11.parsed?.success}, 2.1: ${complete21.parsed?.success}`);

  // Check progress shows 50% (3/6 tasks)
  const progressResult = runCli(`--plan ${planPath} progress --format=json`);
  logTest('Progress updated correctly',
    progressResult.parsed?.summary?.completed === 3,
    `Completed: ${progressResult.parsed?.summary?.completed}`);

  logTest('Percentage calculated correctly',
    progressResult.parsed?.summary?.percentage === 50,
    `Percentage: ${progressResult.parsed?.summary?.percentage}%`);
}

// =============================================================================
// Main Test Runner
// =============================================================================

function main() {
  log('========================================');
  log('  Parallel Execution Foundation E2E Tests');
  log('========================================');

  try {
    log('\nSetting up test environment...');
    setupTestEnvironment();

    // Run all test suites
    testConcurrentPlanSessions();
    testFileConflictDetection();
    testParallelPhaseAnnotation();
    testGitQueueStatus();
    testProgressOutputFormats();
    testIntegratedWorkflow();

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
    cleanupTestFiles();
  }

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

main();
