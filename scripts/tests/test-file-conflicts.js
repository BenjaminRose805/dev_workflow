#!/usr/bin/env node
/**
 * Unit Tests for file conflict detection in plan-status.js
 *
 * Tests:
 * - extractFileReferences() - extracts file paths from task descriptions
 * - detectFileConflicts() - identifies tasks that modify the same files
 *
 * Run: node scripts/tests/test-file-conflicts.js
 */

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
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((val, idx) => val === sortedB[idx]);
}

// =============================================================================
// Tests for extractFileReferences
// =============================================================================

function testExtractFileReferences() {
  log('\n=== Testing: extractFileReferences ===');

  const { extractFileReferences } = require('../lib/plan-status.js');

  // Test 1: Backtick-quoted paths
  log('\n--- Backtick-quoted paths ---');

  const result1 = extractFileReferences('Update `src/api.ts` and `src/utils.ts`');
  logTest(
    'Extracts backtick-quoted paths',
    arraysEqual(result1, ['src/api.ts', 'src/utils.ts']),
    `Got: ${JSON.stringify(result1)}`
  );

  const result2 = extractFileReferences('Modify `scripts/lib/plan-status.js` to add new function');
  logTest(
    'Extracts deeply nested paths',
    result2.includes('scripts/lib/plan-status.js'),
    `Got: ${JSON.stringify(result2)}`
  );

  const result3 = extractFileReferences('Update `config.json` for settings');
  logTest(
    'Extracts simple filenames in backticks',
    result3.includes('config.json'),
    `Got: ${JSON.stringify(result3)}`
  );

  // Test 2: Common directory prefixes
  log('\n--- Common directory prefixes ---');

  const result4 = extractFileReferences('Changes to src/lib/auth.ts are needed');
  logTest(
    'Extracts src/ paths without backticks',
    result4.includes('src/lib/auth.ts'),
    `Got: ${JSON.stringify(result4)}`
  );

  const result5 = extractFileReferences('Add tests/unit/file-conflicts.test.js');
  logTest(
    'Extracts tests/ paths',
    result5.includes('tests/unit/file-conflicts.test.js'),
    `Got: ${JSON.stringify(result5)}`
  );

  const result6 = extractFileReferences('See docs/plans/my-plan.md for details');
  logTest(
    'Extracts docs/ paths',
    result6.includes('docs/plans/my-plan.md'),
    `Got: ${JSON.stringify(result6)}`
  );

  const result7 = extractFileReferences('Run scripts/status-cli.js for status');
  logTest(
    'Extracts scripts/ paths',
    result7.includes('scripts/status-cli.js'),
    `Got: ${JSON.stringify(result7)}`
  );

  const result8 = extractFileReferences('Use lib/utils.js helpers');
  logTest(
    'Extracts lib/ paths',
    result8.includes('lib/utils.js'),
    `Got: ${JSON.stringify(result8)}`
  );

  // Test 3: Modify/update patterns
  log('\n--- Modify/update patterns ---');

  const result9 = extractFileReferences('Modify status-cli.js to add new command');
  logTest(
    'Extracts from "modify" pattern',
    result9.includes('status-cli.js'),
    `Got: ${JSON.stringify(result9)}`
  );

  const result10 = extractFileReferences('Update plan-status.js with new function');
  logTest(
    'Extracts from "update" pattern',
    result10.includes('plan-status.js'),
    `Got: ${JSON.stringify(result10)}`
  );

  const result11 = extractFileReferences('Editing config.json for new setting');
  logTest(
    'Extracts from "editing" pattern',
    result11.includes('config.json'),
    `Got: ${JSON.stringify(result11)}`
  );

  // Test 4: "in <filename>" patterns
  log('\n--- "in <filename>" patterns ---');

  const result12 = extractFileReferences('Create function in status-cli.js');
  logTest(
    'Extracts from "in filename" pattern',
    result12.includes('status-cli.js'),
    `Got: ${JSON.stringify(result12)}`
  );

  const result13 = extractFileReferences('Add method in plan-status.js library');
  logTest(
    'Extracts from "in filename" pattern (variation)',
    result13.includes('plan-status.js'),
    `Got: ${JSON.stringify(result13)}`
  );

  // Test 5: Edge cases
  log('\n--- Edge cases ---');

  const result14 = extractFileReferences(null);
  logTest(
    'Handles null input',
    Array.isArray(result14) && result14.length === 0,
    `Got: ${JSON.stringify(result14)}`
  );

  const result15 = extractFileReferences(undefined);
  logTest(
    'Handles undefined input',
    Array.isArray(result15) && result15.length === 0,
    `Got: ${JSON.stringify(result15)}`
  );

  const result16 = extractFileReferences('');
  logTest(
    'Handles empty string',
    Array.isArray(result16) && result16.length === 0,
    `Got: ${JSON.stringify(result16)}`
  );

  const result17 = extractFileReferences('No file references here');
  logTest(
    'Returns empty array when no files found',
    Array.isArray(result17) && result17.length === 0,
    `Got: ${JSON.stringify(result17)}`
  );

  const result18 = extractFileReferences('Update `src/api.ts` and also src/api.ts reference');
  logTest(
    'Deduplicates file references',
    result18.filter(f => f === 'src/api.ts').length === 1,
    `Got: ${JSON.stringify(result18)}`
  );

  // Test 6: Mixed patterns in one description
  log('\n--- Mixed patterns ---');

  const result19 = extractFileReferences(
    'Update `src/api.ts`, modify utils.js, and add tests/api.test.js'
  );
  logTest(
    'Extracts from mixed patterns',
    result19.length >= 3 &&
      result19.includes('src/api.ts') &&
      result19.includes('utils.js') &&
      result19.includes('tests/api.test.js'),
    `Got: ${JSON.stringify(result19)}`
  );
}

// =============================================================================
// Tests for detectFileConflicts
// =============================================================================

function testDetectFileConflicts() {
  log('\n=== Testing: detectFileConflicts ===');

  const { detectFileConflicts } = require('../lib/plan-status.js');

  // Test 1: Basic conflict detection
  log('\n--- Basic conflict detection ---');

  const tasks1 = [
    { id: '2.1', description: 'Update `src/api.ts` with new endpoint' },
    { id: '2.2', description: 'Modify `src/api.ts` for authentication' }
  ];
  const conflicts1 = detectFileConflicts(tasks1);
  logTest(
    'Detects conflict when two tasks modify same file',
    conflicts1.length === 1 &&
      conflicts1[0].file === 'src/api.ts' &&
      arraysEqual(conflicts1[0].taskIds, ['2.1', '2.2']),
    `Got: ${JSON.stringify(conflicts1)}`
  );

  // Test 2: No conflicts
  log('\n--- No conflicts ---');

  const tasks2 = [
    { id: '2.1', description: 'Update `src/api.ts` with new endpoint' },
    { id: '2.2', description: 'Modify `src/utils.ts` for helpers' }
  ];
  const conflicts2 = detectFileConflicts(tasks2);
  logTest(
    'Returns empty array when no conflicts',
    conflicts2.length === 0,
    `Got: ${JSON.stringify(conflicts2)}`
  );

  // Test 3: Multiple conflicts
  log('\n--- Multiple conflicts ---');

  const tasks3 = [
    { id: '2.1', description: 'Update `src/api.ts` and `src/utils.ts`' },
    { id: '2.2', description: 'Modify `src/api.ts` for auth' },
    { id: '2.3', description: 'Update `src/utils.ts` with helpers' }
  ];
  const conflicts3 = detectFileConflicts(tasks3);
  logTest(
    'Detects multiple file conflicts',
    conflicts3.length === 2,
    `Got: ${JSON.stringify(conflicts3)}`
  );

  // Check specific conflicts
  const apiConflict = conflicts3.find(c => c.file === 'src/api.ts');
  const utilsConflict = conflicts3.find(c => c.file === 'src/utils.ts');
  logTest(
    'api.ts conflict includes correct tasks',
    apiConflict && arraysEqual(apiConflict.taskIds, ['2.1', '2.2']),
    `Got: ${JSON.stringify(apiConflict)}`
  );
  logTest(
    'utils.ts conflict includes correct tasks',
    utilsConflict && arraysEqual(utilsConflict.taskIds, ['2.1', '2.3']),
    `Got: ${JSON.stringify(utilsConflict)}`
  );

  // Test 4: Three-way conflict
  log('\n--- Three-way conflict ---');

  const tasks4 = [
    { id: '1.1', description: 'Add function to `shared.js`' },
    { id: '1.2', description: 'Update `shared.js` with helper' },
    { id: '1.3', description: 'Modify `shared.js` for export' }
  ];
  const conflicts4 = detectFileConflicts(tasks4);
  logTest(
    'Detects three-way conflict',
    conflicts4.length === 1 &&
      conflicts4[0].taskIds.length === 3 &&
      conflicts4[0].taskIds.includes('1.1') &&
      conflicts4[0].taskIds.includes('1.2') &&
      conflicts4[0].taskIds.includes('1.3'),
    `Got: ${JSON.stringify(conflicts4)}`
  );

  // Test 5: Edge cases
  log('\n--- Edge cases ---');

  const conflicts5 = detectFileConflicts(null);
  logTest(
    'Handles null input',
    Array.isArray(conflicts5) && conflicts5.length === 0,
    `Got: ${JSON.stringify(conflicts5)}`
  );

  const conflicts6 = detectFileConflicts([]);
  logTest(
    'Handles empty array',
    Array.isArray(conflicts6) && conflicts6.length === 0,
    `Got: ${JSON.stringify(conflicts6)}`
  );

  const conflicts7 = detectFileConflicts([{ id: '1.1' }]);
  logTest(
    'Handles task without description',
    Array.isArray(conflicts7) && conflicts7.length === 0,
    `Got: ${JSON.stringify(conflicts7)}`
  );

  const conflicts8 = detectFileConflicts([
    { id: '1.1', description: 'No file references here' },
    { id: '1.2', description: 'Also no files mentioned' }
  ]);
  logTest(
    'Returns empty when tasks have no file refs',
    conflicts8.length === 0,
    `Got: ${JSON.stringify(conflicts8)}`
  );

  // Test 6: Case insensitivity for file matching
  log('\n--- Case handling ---');

  const tasks6 = [
    { id: '1.1', description: 'Update `src/API.ts` with endpoint' },
    { id: '1.2', description: 'Modify `src/api.ts` for auth' }
  ];
  const conflicts9 = detectFileConflicts(tasks6);
  logTest(
    'Detects conflicts with case-insensitive matching',
    conflicts9.length === 1,
    `Got: ${JSON.stringify(conflicts9)}`
  );

  // Test 7: Real-world task descriptions from plan
  log('\n--- Real-world patterns ---');

  const realTasks = [
    {
      id: '2.1',
      description: 'Create `extractFileReferences(taskDescription)` function in `scripts/lib/plan-status.js`'
    },
    {
      id: '2.2',
      description: 'Create `detectFileConflicts(tasks)` function in `scripts/lib/plan-status.js`'
    },
    {
      id: '2.3',
      description: 'Integrate conflict detection into `cmdNext()` in `status-cli.js`'
    }
  ];
  const realConflicts = detectFileConflicts(realTasks);
  logTest(
    'Detects conflict in plan-status.js (tasks 2.1 and 2.2)',
    realConflicts.some(c =>
      c.file.includes('plan-status.js') &&
      c.taskIds.includes('2.1') &&
      c.taskIds.includes('2.2')
    ),
    `Got: ${JSON.stringify(realConflicts)}`
  );
}

// =============================================================================
// Main test runner
// =============================================================================

function runAllTests() {
  log('File Conflict Detection Unit Tests');
  log('==================================\n');

  try {
    testExtractFileReferences();
    testDetectFileConflicts();
  } catch (error) {
    log(`\n❌ Unexpected error: ${error.message}`);
    log(error.stack);
    process.exit(1);
  }

  // Summary
  log('\n========================================');
  log(`Tests: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);

  if (failed > 0) {
    log('\nFailed tests:');
    for (const f of failures) {
      log(`  - ${f.name}: ${f.error}`);
    }
    process.exit(1);
  } else {
    log('\n✅ All tests passed!');
    process.exit(0);
  }
}

runAllTests();
