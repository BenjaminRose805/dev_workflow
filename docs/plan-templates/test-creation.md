# Test Creation Plan: {{test_name}}

## Overview
- **Target:** {{target_path}}
- **Test Type:** {{test_type}} (Unit | Integration | E2E)
- **Framework:** {{test_framework}}
- **Created:** {{date}}
- **Output:** `docs/plan-outputs/{{plan_filename}}/`

> Test results and coverage reports are written to the `findings/` subdirectory. Use `/plan:status` to view progress.

## Phase 1: Coverage Analysis
- [ ] 1.1 Run existing tests with coverage
- [ ] 1.2 Identify uncovered code paths
- [ ] 1.3 Prioritize by criticality
- [ ] **VERIFY 1**: Coverage analysis documented

## Phase 2: Test Design
- [ ] 2.1 Design test cases for priority areas
- [ ] 2.2 Identify required mocks/fixtures
- [ ] 2.3 Plan test data requirements
- [ ] **VERIFY 2**: Test design documented

## Phase 3: Implementation
- [ ] 3.1 Create test file structure
- [ ] 3.2 Implement mocks and fixtures
- [ ] 3.3 Write tests for each case
- [ ] 3.4 Verify tests pass
- [ ] **VERIFY 3**: All tests implemented and passing

## Phase 4: Validation
- [ ] 4.1 Run full test suite
- [ ] 4.2 Check coverage improvement
- [ ] 4.3 Verify no regressions
- [ ] 4.4 Review test quality
- [ ] **VERIFY 4**: Final validation complete

## Success Criteria
- [ ] Target coverage achieved
- [ ] All tests pass
- [ ] No false positives
- [ ] Tests are maintainable
- [ ] Results documented in `findings/`
