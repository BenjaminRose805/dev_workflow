# Analysis Plan: Issue Detection

## Overview

- **Objective:** Identify bugs, broken functionality, errors, and failing tests
- **Type:** Analysis → Generates `fix-issues-implementation.md` plan
- **Created:** 2025-12-27
- **Output:** `docs/plan-outputs/fix-issues-analysis/`

> **Scope Boundary:** This plan focuses ONLY on things that are BROKEN. It does not cover:
> - Removing unused code (see: cleanup-analysis)
> - Improving working code (see: optimization-analysis)
> - Adding new features (see: missing-features-analysis)

---

## Phase 1: Test Failures

**Objective:** Find and document all failing tests.

- [ ] 1.1 Run all test suites and capture failures
  - Run Python tests (`pytest`) and capture output
  - Run JavaScript tests (`npm test`) and capture output
  - Document each failure with error message and stack trace
  - Document in finding: `findings/1-1-failing-tests.md`

- [ ] 1.2 Identify skipped and expected-failure tests
  - Find tests marked as skip/xfail
  - Assess if skip reasons are still valid
  - Identify tests that have been skipped too long
  - Document in finding: `findings/1-2-skipped-tests.md`

**VERIFY 1:** All test failures documented with reproduction steps

---

## Phase 2: Runtime Errors

**Objective:** Find code paths that produce errors.

- [ ] 2.1 Identify unhandled exceptions
  - Scan for bare `except:` clauses that swallow errors
  - Find `try/except` blocks that silently fail
  - Check for missing error handling on I/O operations
  - Document in finding: `findings/2-1-unhandled-exceptions.md`

- [ ] 2.2 Identify type errors and mismatches
  - Run type checkers (mypy, pyright) and capture errors
  - Find type annotation mismatches
  - Check for None handling issues
  - Document in finding: `findings/2-2-type-errors.md`

- [ ] 2.3 Identify import and module errors
  - Check for circular imports
  - Find missing dependencies in import statements
  - Check for incorrect relative imports
  - Document in finding: `findings/2-3-import-errors.md`

**VERIFY 2:** All runtime error paths documented

---

## Phase 3: Broken Functionality

**Objective:** Find features that don't work as expected.

- [ ] 3.1 Audit CLI commands for functionality
  - Test each CLI command/script with common inputs
  - Check for commands that crash or hang
  - Verify command outputs match documentation
  - Document in finding: `findings/3-1-broken-commands.md`

- [ ] 3.2 Audit API endpoints and interfaces
  - Test API endpoints (if any) for correct responses
  - Check for endpoints returning wrong status codes
  - Verify response formats match schemas
  - Document in finding: `findings/3-2-broken-apis.md`

- [ ] 3.3 Audit integrations and external dependencies
  - Check integrations with Claude API
  - Verify file system operations work correctly
  - Test git operations for edge cases
  - Document in finding: `findings/3-3-broken-integrations.md`

**VERIFY 3:** Broken functionality documented with expected vs actual behavior

---

## Phase 4: Data Integrity Issues

**Objective:** Find data handling bugs.

- [ ] 4.1 Identify JSON/data parsing issues
  - Check for JSON parse errors on malformed input
  - Find status.json corruption scenarios
  - Check for race conditions in file writes
  - Document in finding: `findings/4-1-parsing-issues.md`

- [ ] 4.2 Identify state management bugs
  - Check for state inconsistencies between files
  - Find race conditions in concurrent operations
  - Check for orphaned state after errors
  - Document in finding: `findings/4-2-state-bugs.md`

**VERIFY 4:** Data integrity issues documented with reproduction scenarios

---

## Phase 5: Lint and Static Analysis Errors

**Objective:** Find issues caught by static analysis tools.

- [ ] 5.1 Run linters and capture errors
  - Run ESLint on JavaScript files
  - Run flake8/pylint on Python files
  - Focus on error-level issues (not style warnings)
  - Document in finding: `findings/5-1-lint-errors.md`

- [ ] 5.2 Run security scanners
  - Check for known vulnerable patterns
  - Scan for hardcoded secrets or credentials
  - Check for injection vulnerabilities
  - Document in finding: `findings/5-2-security-issues.md`

**VERIFY 5:** Static analysis errors documented

---

## Phase 6: Generate Fix Plan

**Objective:** Create implementation plan from analysis findings.

- [ ] 6.1 Generate `fix-issues-implementation.md` plan
  - Read all findings from Phase 1-5
  - Group by severity (critical, high, medium, low)
  - Prioritize: failing tests > runtime errors > broken features > lint
  - Create tasks for each fix
  - Include regression test requirements
  - Write to `docs/plans/fix-issues-implementation.md`
  - Initialize status tracking for the new plan

**VERIFY 6:** Fix issues plan is valid and can be run by orchestrator

---

## Success Criteria

- [ ] All analysis phases complete with documented findings
- [ ] Each finding includes: issue, reproduction steps, severity, root cause
- [ ] Generated plan prioritizes critical issues first
- [ ] No overlap with other analysis plans

---

## Findings Template

```markdown
# Finding: [Category] - [Title]

## Summary
Brief description of the bug/issue.

## Issues Found

| Location | Issue | Severity | Repro Steps |
|----------|-------|----------|-------------|
| file.py:45 | Null pointer | Critical | Run with empty input |
| test_x.py | Assertion fail | High | `pytest test_x.py` |

## Root Cause Analysis
Explanation of why the bug occurs.

## Recommended Fixes
1. Add null check at line 45
2. Update test expectation

## Regression Tests Needed
- Test case for empty input
- Test case for null values
```
