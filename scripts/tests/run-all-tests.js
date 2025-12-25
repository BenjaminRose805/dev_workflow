#!/usr/bin/env node
/**
 * Master Test Runner
 *
 * Runs all orchestrator-related tests and reports overall results.
 * Run: node scripts/tests/run-all-tests.js
 */

const { execSync, spawnSync } = require('child_process');
const path = require('path');

const TESTS = [
  { name: 'Status CLI Tests', script: 'scripts/tests/test-status-cli.js' },
  { name: 'Lib Modules Tests', script: 'scripts/tests/test-lib-modules.js' },
  { name: 'Parallel Updates Tests', script: 'scripts/tests/test-parallel-updates.js' },
  { name: 'Recovery Tests', script: 'scripts/tests/test-recovery.js' },
  { name: 'Status File Validation', script: 'scripts/tests/validate-status-files.js' }
];

function log(msg) {
  console.log(msg);
}

function runTest(test) {
  log(`\n${'='.repeat(60)}`);
  log(`Running: ${test.name}`);
  log(`Script: ${test.script}`);
  log('='.repeat(60));

  const startTime = Date.now();

  try {
    const result = spawnSync('node', [test.script], {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: 'pipe'
    });

    const elapsed = Date.now() - startTime;

    // Print output
    if (result.stdout) {
      console.log(result.stdout);
    }
    if (result.stderr) {
      console.error(result.stderr);
    }

    return {
      name: test.name,
      success: result.status === 0,
      elapsed,
      error: result.status !== 0 ? `Exit code: ${result.status}` : null
    };
  } catch (error) {
    const elapsed = Date.now() - startTime;
    return {
      name: test.name,
      success: false,
      elapsed,
      error: error.message
    };
  }
}

function main() {
  log('╔══════════════════════════════════════════════════════════════════╗');
  log('║              ORCHESTRATOR TEST SUITE                            ║');
  log('║                                                                  ║');
  log('║  Comprehensive tests for plan orchestration components          ║');
  log('╚══════════════════════════════════════════════════════════════════╝');

  const results = [];
  const startTime = Date.now();

  for (const test of TESTS) {
    const result = runTest(test);
    results.push(result);
  }

  const totalElapsed = Date.now() - startTime;

  // Summary
  log('\n');
  log('╔══════════════════════════════════════════════════════════════════╗');
  log('║                    TEST SUITE RESULTS                            ║');
  log('╚══════════════════════════════════════════════════════════════════╝');
  log('');

  const passed = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  for (const result of results) {
    const status = result.success ? '✓ PASS' : '✗ FAIL';
    const time = `${result.elapsed}ms`;
    log(`  ${status} ${result.name.padEnd(35)} ${time}`);
    if (!result.success && result.error) {
      log(`         └─ ${result.error}`);
    }
  }

  log('');
  log('─'.repeat(60));
  log(`  Total: ${results.length} test suites`);
  log(`  Passed: ${passed.length}`);
  log(`  Failed: ${failed.length}`);
  log(`  Time: ${totalElapsed}ms`);
  log('─'.repeat(60));

  if (failed.length === 0) {
    log('\n  ✓ ALL TESTS PASSED\n');
    process.exit(0);
  } else {
    log('\n  ✗ SOME TESTS FAILED\n');
    process.exit(1);
  }
}

main();
