# Implementation Plan: Fix Issues

## Overview

- **Objective:** Fix bugs, broken functionality, errors, and failing tests identified in fix-issues-analysis
- **Type:** Implementation
- **Created:** 2025-12-27
- **Source:** `docs/plan-outputs/fix-issues-analysis/findings/`
- **Priority:** Critical > High > Medium > Low

> **Scope:** This plan fixes ONLY issues identified in the analysis phase. It does not add new features or refactor working code.

---

## Phase 0: Critical Fixes - Data Integrity

**Objective:** Fix issues that can cause data corruption or loss.

- [ ] 0.1 Add atomic write to orchestrator-registry.json in api-server.js
  - Location: scripts/api-server.js:437-439, 486-491
  - Issue: Non-atomic writes can corrupt registry with concurrent requests
  - Fix: Create `writeRegistryAtomic()` using temp+rename pattern

- [ ] 0.2 Add locking to updateTaskStatus in plan-status.js
  - Location: scripts/lib/plan-status.js:449-498
  - Issue: Concurrent task updates can overwrite each other
  - Fix: Use proper-lockfile or merge with plan-output-utils.js locked version

- [ ] 0.3 Fix loadStatus auto-fix race condition
  - Location: scripts/lib/plan-status.js:379-413
  - Issue: loadStatus() writes during read, causing TOCTOU race
  - Fix: Separate into loadStatusReadOnly() and loadStatusAndRepair() with locking

- [ ] 0.4 Remove process.chdir() global state mutation
  - Location: scripts/lib/worktree-utils.js:560-592
  - Issue: initializeWorktreeStatus() changes cwd globally, not thread-safe
  - Fix: Pass cwd to child processes instead of global chdir

**VERIFY 0:** Run concurrent status update tests - no data corruption

---

## Phase 1: Critical Fixes - Runtime Failures

**Objective:** Fix issues that can cause crashes or hangs.

- [ ] 1.1 Add timeout to Claude runner stdout iteration
  - Location: scripts/lib/claude_runner.py:80-88
  - Issue: Can hang indefinitely if Claude CLI produces no output
  - Fix: Use threading with timeout wrapper around stdout iteration

- [ ] 1.2 Fix subprocess timeout sequence in claude_runner.py
  - Location: scripts/lib/claude_runner.py:100
  - Issue: Timeout called after stdout iteration completes, ineffective
  - Fix: Implement proper timeout around entire read loop

- [ ] 1.3 Add try-catch for git-workflow.json parse in api-server.js
  - Location: scripts/api-server.js:58
  - Issue: Module load crashes if config file is corrupted
  - Fix: Wrap JSON.parse in try-catch with fallback to defaults

- [ ] 1.4 Add None guards for optional TUI/EventBus objects
  - Location: scripts/plan_orchestrator.py:947-1116, scripts/lib/claude_runner.py:242,270
  - Issue: Method calls on potentially None objects cause crashes
  - Fix: Add `if self.tui is not None:` guards

**VERIFY 1:** Run with corrupted config files - no crashes

---

## Phase 2: High Priority - E2E Test Failures

**Objective:** Fix failing end-to-end tests.

- [ ] 2.1 Fix plan-orchestrator.js status command output
  - Location: scripts/tests/test-orchestrator-e2e.py failures
  - Issue: `node scripts/plan-orchestrator.js status` returns empty output in tests
  - Fix: Investigate stdout vs stderr, ensure JSON output to stdout

- [ ] 2.2 Fix plan-orchestrator.js next command output
  - Location: scripts/tests/test-orchestrator-e2e.py failures
  - Issue: `node scripts/plan-orchestrator.js next 5` returns no output
  - Fix: Ensure command outputs JSON to stdout

- [ ] 2.3 Configure npm test script
  - Location: package.json
  - Issue: `npm test` runs echo command instead of actual tests
  - Fix: Set `"test": "node scripts/tests/run-all-tests.js"`

**VERIFY 2:** All tests pass: `python3 scripts/tests/test-orchestrator-e2e.py`

---

## Phase 3: High Priority - Type Errors

**Objective:** Fix type errors that could cause runtime failures.

- [ ] 3.1 Fix Literal type mismatches in orchestrator_server.py
  - Location: scripts/orchestrator_server.py:296, 354
  - Issue: str passed where Literal enum expected
  - Fix: Use type annotations with Literal values

- [ ] 3.2 Fix list type mismatch in panels.py
  - Location: scripts/tui/panels.py:1919
  - Issue: Appending Text to list[Table]
  - Fix: Change list type to Union[Table, Text]

- [ ] 3.3 Fix None handling in keyboard.py
  - Location: scripts/tui/keyboard.py:373-377, 427, 433
  - Issue: Variables initialized as None used without guards
  - Fix: Add proper null checks before use

- [ ] 3.4 Resolve duplicate tui module naming
  - Location: scripts/tui/__init__.py vs scripts/lib/tui.py
  - Issue: Duplicate module named "tui" confuses mypy
  - Fix: Rename one module or restructure imports

**VERIFY 3:** mypy passes with no errors: `mypy scripts/`

---

## Phase 4: Medium Priority - CLI/Server Bugs

**Objective:** Fix broken CLI commands and server issues.

- [ ] 4.1 Add sys.path modification to orchestrator_server.py
  - Location: scripts/orchestrator_server.py (missing)
  - Issue: Import fails when run directly without PYTHONPATH
  - Fix: Add project root to sys.path like run_api_server.py

- [ ] 4.2 Update FastAPI lifecycle handlers
  - Location: scripts/orchestrator_server.py:1554-1561
  - Issue: Uses deprecated @app.on_event() decorators
  - Fix: Convert to lifespan context manager pattern

- [ ] 4.3 Fix validate-plan-format.js file pattern
  - Location: scripts/validate-plan-format.js:199-200
  - Issue: Only matches `implement-*.md`, missing actual plans
  - Fix: Update pattern to match all .md plan files

- [ ] 4.4 Fix IPC silent error handling
  - Location: scripts/lib/orchestrator_ipc.py:268-269
  - Issue: Exceptions in _handle_client silently passed
  - Fix: Log errors and return meaningful error responses

- [ ] 4.5 Fix incomplete socket recv handling
  - Location: scripts/lib/orchestrator_ipc.py:117-119
  - Issue: Partial reads not handled for length prefix
  - Fix: Add loop to ensure complete 4-byte read

**VERIFY 4:** All CLI commands work: `python3 scripts/orchestrator_server.py --help`

---

## Phase 5: Medium Priority - API Consistency

**Objective:** Fix API response format mismatches.

- [ ] 5.1 Align GET /api/plans response envelope
  - Location: scripts/api-server.js:182-190
  - Issue: Uses `data` wrapper but OpenAPI expects `plans` key
  - Fix: Update response or OpenAPI spec to match

- [ ] 5.2 Fix POST /api/plans/:name/start status code
  - Location: scripts/api-server.js:386
  - Issue: Returns 200 instead of 201 Created
  - Fix: Return 201 for resource creation

- [ ] 5.3 Add JSON parse error handling for corrupted status.json
  - Location: scripts/orchestrator_server.py:517-518
  - Issue: Returns 404 instead of 500 for parse errors
  - Fix: Return 500 with error details for JSON errors

- [ ] 5.4 Add null check for timestamp sorting
  - Location: scripts/api-server.js:268-269
  - Issue: Activity sorting may fail with null timestamps
  - Fix: Add null-safe comparison in sort function

**VERIFY 5:** API responses match OpenAPI spec

---

## Phase 6: Medium Priority - Exception Handling

**Objective:** Replace bare except clauses and silent error swallowing.

- [ ] 6.1 Replace bare except in test-orchestrator-e2e.py
  - Location: scripts/tests/test-orchestrator-e2e.py (7 instances)
  - Issue: Bare `except:` catches all exceptions including KeyboardInterrupt
  - Fix: Use `except (json.JSONDecodeError, ValueError) as e:`

- [ ] 6.2 Add error logging to status_monitor.py poll loop
  - Location: scripts/lib/status_monitor.py:83
  - Issue: Silently swallows all errors in poll loop
  - Fix: Log errors at debug level before continue

- [ ] 6.3 Fix JSON parse error handling in claude_runner.py
  - Location: scripts/lib/claude_runner.py:208-209
  - Issue: Silent catch of JSONDecodeError masks issues
  - Fix: Log warning for malformed Claude output

**VERIFY 6:** `ruff check --select E722` shows 0 errors

---

## Phase 7: Medium Priority - Security Fixes

**Objective:** Fix shell injection and other security issues.

- [ ] 7.1 Fix shell injection in test-orchestrator-e2e.py
  - Location: scripts/tests/test-orchestrator-e2e.py:37-39
  - Issue: subprocess.run with shell=True
  - Fix: Use shlex.split() or pass command as array

- [ ] 7.2 Fix shell command building in worktree-utils.js
  - Location: scripts/lib/worktree-utils.js:161, 395, 1028
  - Issue: String concatenation for git commands without escaping
  - Fix: Use spawnSync with array arguments

- [ ] 7.3 Fix shell command in git-queue.js
  - Location: scripts/lib/git-queue.js:169
  - Issue: Array join without escaping for file paths
  - Fix: Use proper argument array for spawn

**VERIFY 7:** No shell=True or string concatenation in subprocess calls

---

## Phase 8: Low Priority - Lint Cleanup

**Objective:** Remove unused code and fix lint errors.

- [ ] 8.1 Remove unused JavaScript imports (59 instances)
  - Location: scripts/*.js, scripts/lib/*.js, scripts/tests/*.js
  - Issue: Unused imports clutter code
  - Fix: Remove all unused imports identified in lint finding

- [ ] 8.2 Remove unused Python imports (52 instances)
  - Location: scripts/*.py, scripts/lib/*.py, scripts/tui/*.py
  - Issue: Unused imports add noise
  - Fix: Run `ruff check --fix --select F401`

- [ ] 8.3 Fix f-strings without placeholders (22 instances)
  - Location: scripts/generate_api_types.py, scripts/tui/*.py
  - Issue: Redundant f-prefix on plain strings
  - Fix: Run `ruff check --fix --select F541`

- [ ] 8.4 Remove unused variables (8 Python + 59 JS instances)
  - Location: Various
  - Issue: Assigned but never used variables
  - Fix: Remove or use the variables

**VERIFY 8:** `ruff check --select E,F` and ESLint show 0 errors

---

## Phase 9: Low Priority - Documentation Fixes

**Objective:** Fix misleading or broken documentation examples.

- [ ] 9.1 Fix shell injection examples in documentation
  - Location: docs/plan-outputs/archive/analyze-git-workflow/findings/*.md
  - Issue: Examples show unsafe shell command patterns
  - Fix: Update examples to use safe spawn patterns

- [ ] 9.2 Document scan-plans.js output fields
  - Location: scripts/scan-plans.js or documentation
  - Issue: `incomplete`/`complete` vs `statusSummary` confusing
  - Fix: Add comments/docs explaining markdown vs status.json counts

**VERIFY 9:** Documentation reviewed and accurate

---

## Success Criteria

- [ ] All E2E tests pass (`python3 scripts/tests/test-orchestrator-e2e.py`)
- [ ] All JS tests pass (`node scripts/tests/run-all-tests.js`)
- [ ] No critical/high severity issues remain from analysis
- [ ] `npm test` runs actual tests
- [ ] mypy passes with reduced errors
- [ ] ruff passes with reduced errors

---

## Issue Summary by Severity

| Severity | Count | Phases |
|----------|-------|--------|
| Critical | 4 | 0 |
| High | 8 | 1, 2, 3 |
| Medium | 18 | 4, 5, 6, 7 |
| Low | 6+ | 8, 9 |

---

## Regression Test Requirements

After completing each phase, run:
1. `node scripts/tests/run-all-tests.js` - All JS tests
2. `python3 scripts/tests/test-orchestrator-constraints.py` - Constraint tests
3. `python3 scripts/tests/test-orchestrator-e2e.py` - E2E tests
4. `ruff check scripts/` - Python lint
5. `mypy scripts/` - Python types
