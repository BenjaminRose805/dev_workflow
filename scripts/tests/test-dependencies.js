#!/usr/bin/env node
/**
 * Unit Tests for dependency parsing functions in plan-status.js
 *
 * Tests:
 * - parseDependencies() - extracting dependency task IDs from task descriptions
 * - validateDependencies() - validating dependency task IDs
 *
 * Run: node scripts/tests/test-dependencies.js
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
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function testParseDependencies() {
  log('\n=== Testing: parseDependencies() ===');

  const { parseDependencies } = require('../lib/plan-status.js');

  // Test single dependency
  log('\n--- Single Dependency ---');

  let result = parseDependencies('Implement auth service (depends: 1.1)');
  logTest('single dependency extracted correctly',
    arraysEqual(result, ['1.1']),
    `Got: ${JSON.stringify(result)}`);

  result = parseDependencies('Create middleware (depends: 2.3)');
  logTest('another single dependency',
    arraysEqual(result, ['2.3']),
    `Got: ${JSON.stringify(result)}`);

  // Test multiple dependencies
  log('\n--- Multiple Dependencies ---');

  result = parseDependencies('Implement auth service (depends: 1.1, 1.2)');
  logTest('two dependencies extracted correctly',
    arraysEqual(result, ['1.1', '1.2']),
    `Got: ${JSON.stringify(result)}`);

  result = parseDependencies('Complex task (depends: 1.1, 1.2, 2.3)');
  logTest('three dependencies extracted correctly',
    arraysEqual(result, ['1.1', '1.2', '2.3']),
    `Got: ${JSON.stringify(result)}`);

  result = parseDependencies('Many deps (depends: 1.1, 2.1, 2.2, 3.1, 3.2)');
  logTest('five dependencies extracted correctly',
    arraysEqual(result, ['1.1', '2.1', '2.2', '3.1', '3.2']),
    `Got: ${JSON.stringify(result)}`);

  // Test whitespace variations
  log('\n--- Whitespace Variations ---');

  result = parseDependencies('Task (depends:1.1)');
  logTest('no space after colon',
    arraysEqual(result, ['1.1']),
    `Got: ${JSON.stringify(result)}`);

  result = parseDependencies('Task (depends:  1.1)');
  logTest('extra spaces after colon',
    arraysEqual(result, ['1.1']),
    `Got: ${JSON.stringify(result)}`);

  result = parseDependencies('Task (depends: 1.1,1.2)');
  logTest('no spaces around comma',
    arraysEqual(result, ['1.1', '1.2']),
    `Got: ${JSON.stringify(result)}`);

  result = parseDependencies('Task (depends: 1.1 , 1.2)');
  logTest('spaces around comma',
    arraysEqual(result, ['1.1', '1.2']),
    `Got: ${JSON.stringify(result)}`);

  result = parseDependencies('Task (depends:  1.1,  2.3 )');
  logTest('various whitespace patterns',
    arraysEqual(result, ['1.1', '2.3']),
    `Got: ${JSON.stringify(result)}`);

  // Test case insensitivity
  log('\n--- Case Insensitivity ---');

  result = parseDependencies('Task (DEPENDS: 1.1, 1.2)');
  logTest('uppercase DEPENDS',
    arraysEqual(result, ['1.1', '1.2']),
    `Got: ${JSON.stringify(result)}`);

  result = parseDependencies('Task (Depends: 1.1)');
  logTest('capitalized Depends',
    arraysEqual(result, ['1.1']),
    `Got: ${JSON.stringify(result)}`);

  result = parseDependencies('Task (DePeNdS: 2.1)');
  logTest('mixed case DePeNdS',
    arraysEqual(result, ['2.1']),
    `Got: ${JSON.stringify(result)}`);

  // Test no dependencies
  log('\n--- No Dependencies ---');

  result = parseDependencies('Regular task without dependencies');
  logTest('no dependency syntax returns empty array',
    arraysEqual(result, []),
    `Got: ${JSON.stringify(result)}`);

  result = parseDependencies('Task with parentheses (but not depends)');
  logTest('parentheses without depends returns empty',
    arraysEqual(result, []),
    `Got: ${JSON.stringify(result)}`);

  result = parseDependencies('Task depends on 1.1');
  logTest('missing parentheses/colon returns empty',
    arraysEqual(result, []),
    `Got: ${JSON.stringify(result)}`);

  // Test invalid formats
  log('\n--- Invalid Formats ---');

  result = parseDependencies('Task (depends: invalid)');
  logTest('non-numeric ID filtered out',
    arraysEqual(result, []),
    `Got: ${JSON.stringify(result)}`);

  result = parseDependencies('Task (depends: 1.1, invalid, 2.2)');
  logTest('invalid text in middle causes regex to stop (expected: empty)',
    arraysEqual(result, []),
    `Got: ${JSON.stringify(result)}`);

  result = parseDependencies('Task (depends: 1, 2.2)');
  logTest('ID without decimal filtered out',
    arraysEqual(result, ['2.2']),
    `Got: ${JSON.stringify(result)}`);

  // Test three-level task IDs
  log('\n--- Three-Level Task IDs ---');

  result = parseDependencies('Task (depends: 1.1.1)');
  logTest('three-level task ID accepted',
    arraysEqual(result, ['1.1.1']),
    `Got: ${JSON.stringify(result)}`);

  result = parseDependencies('Task (depends: 1.1, 1.1.2)');
  logTest('mixed two and three-level IDs',
    arraysEqual(result, ['1.1', '1.1.2']),
    `Got: ${JSON.stringify(result)}`);

  // Test edge cases
  log('\n--- Edge Cases ---');

  result = parseDependencies('');
  logTest('empty string returns empty array',
    arraysEqual(result, []),
    `Got: ${JSON.stringify(result)}`);

  result = parseDependencies(null);
  logTest('null returns empty array',
    arraysEqual(result, []),
    `Got: ${JSON.stringify(result)}`);

  result = parseDependencies(undefined);
  logTest('undefined returns empty array',
    arraysEqual(result, []),
    `Got: ${JSON.stringify(result)}`);

  result = parseDependencies(123);
  logTest('number returns empty array',
    arraysEqual(result, []),
    `Got: ${JSON.stringify(result)}`);

  // Test dependency in longer description
  log('\n--- Dependency in Context ---');

  result = parseDependencies('Create user endpoints for authentication (depends: 1.3) with proper error handling');
  logTest('dependency in middle of description',
    arraysEqual(result, ['1.3']),
    `Got: ${JSON.stringify(result)}`);

  result = parseDependencies('(depends: 1.1) Task at start');
  logTest('dependency at start of description',
    arraysEqual(result, ['1.1']),
    `Got: ${JSON.stringify(result)}`);
}

function testValidateDependencies() {
  log('\n=== Testing: validateDependencies() ===');

  const { validateDependencies } = require('../lib/plan-status.js');
  const allTaskIds = ['1.1', '1.2', '1.3', '2.1', '2.2', '2.3', '3.1'];

  // Test valid dependencies
  log('\n--- Valid Dependencies ---');

  let result = validateDependencies('1.3', ['1.1', '1.2'], allTaskIds);
  logTest('valid dependencies return valid=true',
    result.valid === true,
    `Got valid=${result.valid}`);
  logTest('valid dependencies have no errors',
    result.errors.length === 0,
    `Got ${result.errors.length} errors`);
  logTest('valid dependencies have no invalidIds',
    result.invalidIds.length === 0,
    `Got ${result.invalidIds.length} invalid IDs`);
  logTest('valid dependencies have hasSelfDependency=false',
    result.hasSelfDependency === false,
    `Got hasSelfDependency=${result.hasSelfDependency}`);

  // Test self-dependency
  log('\n--- Self-Dependency Detection ---');

  result = validateDependencies('1.3', ['1.1', '1.3'], allTaskIds);
  logTest('self-dependency returns valid=false',
    result.valid === false,
    `Got valid=${result.valid}`);
  logTest('self-dependency sets hasSelfDependency=true',
    result.hasSelfDependency === true,
    `Got hasSelfDependency=${result.hasSelfDependency}`);
  logTest('self-dependency has error message',
    result.errors.some(e => e.includes('cannot depend on itself')),
    `Got: ${JSON.stringify(result.errors)}`);

  // Test invalid task ID
  log('\n--- Invalid Task ID Detection ---');

  result = validateDependencies('1.3', ['1.1', '9.9'], allTaskIds);
  logTest('invalid ID returns valid=false',
    result.valid === false,
    `Got valid=${result.valid}`);
  logTest('invalid ID is in invalidIds array',
    result.invalidIds.includes('9.9'),
    `Got invalidIds: ${JSON.stringify(result.invalidIds)}`);
  logTest('invalid ID has error message',
    result.errors.some(e => e.includes("'9.9'") && e.includes('does not exist')),
    `Got: ${JSON.stringify(result.errors)}`);

  // Test multiple errors
  log('\n--- Multiple Errors ---');

  result = validateDependencies('1.3', ['1.3', '9.9', '8.8'], allTaskIds);
  logTest('multiple errors all detected',
    result.errors.length === 3,
    `Got ${result.errors.length} errors`);
  logTest('self-dependency detected with other errors',
    result.hasSelfDependency === true,
    `Got hasSelfDependency=${result.hasSelfDependency}`);
  logTest('multiple invalid IDs detected',
    result.invalidIds.length === 2,
    `Got ${result.invalidIds.length} invalid IDs`);
  logTest('both invalid IDs in array',
    result.invalidIds.includes('9.9') && result.invalidIds.includes('8.8'),
    `Got invalidIds: ${JSON.stringify(result.invalidIds)}`);

  // Test empty dependencies
  log('\n--- Empty Dependencies ---');

  result = validateDependencies('1.3', [], allTaskIds);
  logTest('empty array returns valid=true',
    result.valid === true,
    `Got valid=${result.valid}`);

  result = validateDependencies('1.3', null, allTaskIds);
  logTest('null dependencies returns valid=true',
    result.valid === true,
    `Got valid=${result.valid}`);

  result = validateDependencies('1.3', undefined, allTaskIds);
  logTest('undefined dependencies returns valid=true',
    result.valid === true,
    `Got valid=${result.valid}`);

  // Test edge cases
  log('\n--- Edge Cases ---');

  result = validateDependencies('1.3', ['1.1'], null);
  logTest('null allTaskIds returns valid=false',
    result.valid === false,
    `Got valid=${result.valid}`);

  result = validateDependencies('1.3', ['1.1'], []);
  logTest('empty allTaskIds flags deps as invalid',
    result.valid === false && result.invalidIds.includes('1.1'),
    `Got valid=${result.valid}, invalidIds=${JSON.stringify(result.invalidIds)}`);

  // Test cross-phase dependencies
  log('\n--- Cross-Phase Dependencies ---');

  result = validateDependencies('3.1', ['1.1', '2.1'], allTaskIds);
  logTest('cross-phase dependencies are valid',
    result.valid === true,
    `Got valid=${result.valid}`);
}

function testIntegration() {
  log('\n=== Testing: Integration (parse + validate) ===');

  const { parseDependencies, validateDependencies } = require('../lib/plan-status.js');
  const allTaskIds = ['1.1', '1.2', '1.3', '2.1', '2.2', '2.3'];

  // Test complete workflow
  log('\n--- Parse Then Validate ---');

  let description = 'Implement auth service (depends: 1.1, 1.2)';
  let deps = parseDependencies(description);
  let validation = validateDependencies('1.3', deps, allTaskIds);
  logTest('valid workflow: parse and validate succeeds',
    validation.valid === true,
    `Got valid=${validation.valid}`);

  description = 'Circular task (depends: 1.3)';
  deps = parseDependencies(description);
  validation = validateDependencies('1.3', deps, allTaskIds);
  logTest('self-dependency caught: parse then validate',
    validation.valid === false && validation.hasSelfDependency === true,
    `Got valid=${validation.valid}, hasSelfDependency=${validation.hasSelfDependency}`);

  description = 'Invalid ref task (depends: 1.1, 99.99)';
  deps = parseDependencies(description);
  validation = validateDependencies('2.1', deps, allTaskIds);
  logTest('invalid ID caught: parse then validate',
    validation.valid === false && validation.invalidIds.includes('99.99'),
    `Got valid=${validation.valid}, invalidIds=${JSON.stringify(validation.invalidIds)}`);

  // Test no dependencies
  description = 'Task without dependencies';
  deps = parseDependencies(description);
  validation = validateDependencies('1.1', deps, allTaskIds);
  logTest('no dependencies: parse returns empty, validation passes',
    deps.length === 0 && validation.valid === true,
    `Got deps.length=${deps.length}, valid=${validation.valid}`);
}

function testPipelineStartParsing() {
  log('\n=== Testing: parseExecutionNotes() - pipeline-start ===');

  const { parseExecutionNotes } = require('../lib/plan-status.js');

  // Test standalone pipeline-start annotation
  log('\n--- Standalone pipeline-start ---');

  let content = `
## Phase 1: Foundation
- [ ] 1.1 Create types
- [ ] 1.2 Create utilities
- [ ] 1.3 Implement service

**pipeline-start:** when 1.3 completes

## Phase 2: API Layer
- [ ] 2.1 Create endpoints
`;

  let result = parseExecutionNotes(content);
  logTest('standalone pipeline-start parsed',
    result.pipelineStart && result.pipelineStart.length === 1,
    `Got pipelineStart.length: ${result.pipelineStart ? result.pipelineStart.length : 'undefined'}`);

  logTest('correct phase detected',
    result.pipelineStart && result.pipelineStart[0]?.phase === 2,
    `Got phase: ${result.pipelineStart ? result.pipelineStart[0]?.phase : 'undefined'}`);

  logTest('correct trigger task ID',
    result.pipelineStart && result.pipelineStart[0]?.triggerTaskId === '1.3',
    `Got triggerTaskId: ${result.pipelineStart ? result.pipelineStart[0]?.triggerTaskId : 'undefined'}`);

  // Test inline pipeline-start annotation
  log('\n--- Inline pipeline-start ---');

  content = `
## Phase 1: Foundation
- [ ] 1.1 Create types
- [ ] 1.2 Implement service

## Phase 2: API Layer (pipeline-start: when 1.2 completes)
- [ ] 2.1 Create endpoints
- [ ] 2.2 Add middleware
`;

  result = parseExecutionNotes(content);
  logTest('inline pipeline-start parsed',
    result.pipelineStart && result.pipelineStart.length === 1,
    `Got pipelineStart.length: ${result.pipelineStart ? result.pipelineStart.length : 'undefined'}`);

  logTest('inline: correct phase detected',
    result.pipelineStart && result.pipelineStart[0]?.phase === 2,
    `Got phase: ${result.pipelineStart ? result.pipelineStart[0]?.phase : 'undefined'}`);

  logTest('inline: correct trigger task ID',
    result.pipelineStart && result.pipelineStart[0]?.triggerTaskId === '1.2',
    `Got triggerTaskId: ${result.pipelineStart ? result.pipelineStart[0]?.triggerTaskId : 'undefined'}`);

  // Test multiple pipeline-start annotations
  log('\n--- Multiple pipeline-start ---');

  content = `
## Phase 1: Foundation
- [ ] 1.1 Create types
- [ ] 1.2 Implement service

## Phase 2: API Layer (pipeline-start: when 1.2 completes)
- [ ] 2.1 Create endpoints

## Phase 3: Testing (pipeline-start: when 2.1 completes)
- [ ] 3.1 Write tests
`;

  result = parseExecutionNotes(content);
  logTest('multiple pipeline-start parsed',
    result.pipelineStart && result.pipelineStart.length === 2,
    `Got pipelineStart.length: ${result.pipelineStart ? result.pipelineStart.length : 'undefined'}`);

  logTest('first trigger is phase 2',
    result.pipelineStart && result.pipelineStart[0]?.phase === 2,
    `Got phase: ${result.pipelineStart ? result.pipelineStart[0]?.phase : 'undefined'}`);

  logTest('second trigger is phase 3',
    result.pipelineStart && result.pipelineStart[1]?.phase === 3,
    `Got phase: ${result.pipelineStart ? result.pipelineStart[1]?.phase : 'undefined'}`);

  // Test no pipeline-start annotations
  log('\n--- No pipeline-start ---');

  content = `
## Phase 1: Foundation
- [ ] 1.1 Create types

## Phase 2: API Layer
- [ ] 2.1 Create endpoints
`;

  result = parseExecutionNotes(content);
  logTest('no pipeline-start returns empty array',
    result.pipelineStart && result.pipelineStart.length === 0,
    `Got pipelineStart.length: ${result.pipelineStart ? result.pipelineStart.length : 'undefined'}`);

  // Test task ID with three segments (e.g., 1.2.1)
  log('\n--- Three-segment task IDs ---');

  content = `
## Phase 1: Foundation
- [ ] 1.1.1 Create types

## Phase 2: API Layer (pipeline-start: when 1.1.1 completes)
- [ ] 2.1 Create endpoints
`;

  result = parseExecutionNotes(content);
  logTest('three-segment task ID parsed',
    result.pipelineStart && result.pipelineStart.length === 1 && result.pipelineStart[0]?.triggerTaskId === '1.1.1',
    `Got triggerTaskId: ${result.pipelineStart ? result.pipelineStart[0]?.triggerTaskId : 'undefined'}`);
}

function main() {
  log('========================================');
  log('  Dependency Parsing Unit Tests');
  log('========================================');

  testParseDependencies();
  testValidateDependencies();
  testIntegration();
  testPipelineStartParsing();

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

  process.exit(failed > 0 ? 1 : 0);
}

main();
