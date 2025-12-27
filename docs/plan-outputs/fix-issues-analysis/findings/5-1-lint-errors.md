# Finding: Lint Errors

## Summary
Lint analysis found **59 JavaScript errors** (all unused variables) and **97 Python errors** (excluding 219 line-too-long style warnings). No syntax errors or undefined variable references were found in either language. The issues are primarily code hygiene problems that don't affect functionality but may indicate incomplete refactoring or dead code.

## Issues Found

### JavaScript (ESLint)
| Location | Error Code | Issue | Severity |
|----------|------------|-------|----------|
| scripts/api-server.js:40 | no-unused-vars | 'exec' is assigned a value but never used | Error |
| scripts/api-server.js:552 | no-unused-vars | 'watcher' is assigned a value but never used | Error |
| scripts/api-server.js:552 | no-unused-vars | 'prev' is defined but never used | Error |
| scripts/api-server.js:753 | no-unused-vars | 'config' is assigned a value but never used | Error |
| scripts/api-server.js:812 | no-unused-vars | 'head' is defined but never used | Error |
| scripts/api-server.js:1302 | no-unused-vars | 'parseQuery' is defined but never used | Error |
| scripts/cache-stats.js:42 | no-unused-vars | 'fileExists' is assigned a value but never used | Error |
| scripts/cache-stats.js:99 | no-unused-vars | 'printUsage' is defined but never used | Error |
| scripts/check-file-status.js:38 | no-unused-vars | 'getFileMtime' is assigned a value but never used | Error |
| scripts/check-file-status.js:93 | no-unused-vars | 'printUsage' is defined but never used | Error |
| scripts/index.js:71 | no-unused-vars | 'script' is assigned a value but never used | Error |
| scripts/lib/agent-launcher.js:7 | no-unused-vars | 'path' is assigned a value but never used | Error |
| scripts/lib/agent-pool.js:39 | no-unused-vars | 'launchResearchAgent' is assigned a value but never used | Error |
| scripts/lib/conflict-detector.js:176 | no-unused-vars | 'set1' is assigned a value but never used | Error |
| scripts/lib/conflict-detector.js:587 | no-unused-vars | 'count' is assigned a value but never used | Error |
| scripts/lib/git-queue.js:36 | no-unused-vars | 'spawn' is assigned a value but never used | Error |
| scripts/lib/git-queue.js:44 | no-unused-vars | 'MAX_RETRIES' is assigned a value but never used | Error |
| scripts/lib/git-queue.js:45 | no-unused-vars | 'RETRY_DELAY_MS' is assigned a value but never used | Error |
| scripts/lib/plan-output-utils.js:38 | no-unused-vars | 'planStatusSchema' is assigned a value but never used | Error |
| scripts/lib/plan-output-utils.js:219 | no-unused-vars | 'cleanStaleLock' is defined but never used | Error |
| scripts/lib/plan-output-utils.js:289 | no-unused-vars | 'isLocked' is defined but never used | Error |
| scripts/lib/plan-output-utils.js:400 | no-unused-vars | 'phaseRegex' is assigned a value but never used | Error |
| scripts/lib/plan-output-utils.js:401 | no-unused-vars | 'taskRegex' is assigned a value but never used | Error |
| scripts/lib/plan-output-utils.js:795 | no-unused-vars | 'batchUpdateTasks' is defined but never used | Error |
| scripts/lib/plan-status.js:1715 | no-unused-vars | 'phaseNumber' is defined but never used | Error |
| scripts/lib/plan-status.js:1761 | no-unused-vars | 'phaseNumber' is defined but never used | Error |
| scripts/lib/plan-status.js:1762 | no-unused-vars | 'phaseNumber' is defined but never used | Error |
| scripts/lib/plan-status.js:1890 | no-unused-vars | 'normalizedFile' is assigned a value but never used | Error |
| scripts/lib/plan-status.js:2023 | no-unused-vars | 'normalizedFile' is assigned a value but never used | Error |
| scripts/lib/timestamp-utils.js:7 | no-unused-vars | 'fileExists' is assigned a value but never used | Error |
| scripts/status-cli.js:55 | no-unused-vars | 'getProgress' is assigned a value but never used | Error |
| scripts/status-cli.js:67 | no-unused-vars | 'recalculateSummary' is assigned a value but never used | Error |
| scripts/status-cli.js:72 | no-unused-vars | 'getTaskConstraints' is assigned a value but never used | Error |
| scripts/status-cli.js:74 | no-unused-vars | 'extractFileReferences' is assigned a value but never used | Error |
| scripts/status-cli.js:1104 | no-unused-vars | 'lastStatus' is assigned a value but never used | Error |
| scripts/status-cli.js:1875 | no-unused-vars | 'worktreeUtils' is assigned a value but never used | Error |
| scripts/status-cli.js:2827 | no-unused-vars | 'phaseNum' is assigned a value but never used | Error |
| scripts/status-cli.js:3026 | no-unused-vars | 'parallelismRatio' is assigned a value but never used | Error |
| scripts/substitute-variables.js:48 | no-unused-vars | 'fs' is assigned a value but never used | Error |
| scripts/substitute-variables.js:49 | no-unused-vars | 'path' is assigned a value but never used | Error |
| scripts/substitute-variables.js:50 | no-unused-vars | 'fileExists' is assigned a value but never used | Error |
| scripts/validate-plan-format.js:70 | no-unused-vars | 'VERIFY_PATTERNS' is assigned a value but never used | Error |
| scripts/worktree-cli.js:27 | no-unused-vars | 'DEFAULT_WORKTREE_DIR' is assigned a value but never used | Error |
| scripts/tests/run-all-tests.js:9 | no-unused-vars | 'execSync' is assigned a value but never used | Error |
| scripts/tests/run-all-tests.js:10 | no-unused-vars | 'path' is assigned a value but never used | Error |
| scripts/tests/test-integration-phase13.js:13 | no-unused-vars | 'execSync' is assigned a value but never used | Error |
| scripts/tests/test-integration-phase13.js:13 | no-unused-vars | 'spawn' is assigned a value but never used | Error |
| scripts/tests/test-integration-phase13.js:16 | no-unused-vars | 'http' is assigned a value but never used | Error |
| scripts/tests/test-integration-phase13.js:44 | no-unused-vars | 'safeRequire' is defined but never used | Error |
| scripts/tests/test-parallel-foundation.js:15 | no-unused-vars | 'spawn' is assigned a value but never used | Error |
| scripts/tests/test-parallel-foundation.js:24 | no-unused-vars | 'TEST_PLAN_DIR' is assigned a value but never used | Error |
| scripts/tests/test-parallel-foundation.js:25 | no-unused-vars | 'TEST_OUTPUT_BASE' is assigned a value but never used | Error |
| scripts/tests/test-parallel-foundation.js:372 | no-unused-vars | 'task14' is assigned a value but never used | Error |
| scripts/tests/test-parallel-phases.js:434 | no-unused-vars | 'planPath' is assigned a value but never used | Error |
| scripts/tests/test-parallel-phases.js:532 | no-unused-vars | 'item' is assigned a value but never used | Error |
| scripts/tests/test-parallel-updates.js:11 | no-unused-vars | 'execSync' is assigned a value but never used | Error |
| scripts/tests/test-recovery.js:178 | no-unused-vars | 'result' is assigned a value but never used | Error |
| scripts/tests/test-recovery.js:216 | no-unused-vars | 'result' is assigned a value but never used | Error |
| scripts/tests/test-status-cli.js:9 | no-unused-vars | 'spawn' is assigned a value but never used | Error |

### Python (ruff)
#### Critical Issues (E722 - Bare Except)
| Location | Error Code | Issue | Severity |
|----------|------------|-------|----------|
| scripts/tests/test-orchestrator-e2e.py:61 | E722 | Do not use bare `except` | Error |
| scripts/tests/test-orchestrator-e2e.py:129 | E722 | Do not use bare `except` | Error |
| scripts/tests/test-orchestrator-e2e.py:133 | E722 | Do not use bare `except` | Error |
| scripts/tests/test-orchestrator-e2e.py:200 | E722 | Do not use bare `except` | Error |
| scripts/tests/test-orchestrator-e2e.py:217 | E722 | Do not use bare `except` | Error |
| scripts/tests/test-orchestrator-e2e.py:243 | E722 | Do not use bare `except` | Error |
| scripts/tests/test-orchestrator-e2e.py:271 | E722 | Do not use bare `except` | Error |

#### Module Import Issues (E402)
| Location | Error Code | Issue | Severity |
|----------|------------|-------|----------|
| scripts/multi_plan_monitor.py:44 | E402 | Module level import not at top of file | Error |
| scripts/plan_orchestrator.py:67-82 | E402 | Module level import not at top of file (6 instances) | Error |

#### Unused Variables (F841)
| Location | Error Code | Issue | Severity |
|----------|------------|-------|----------|
| scripts/lib/claude_runner.py:193 | F841 | Local variable `result_content` is assigned to but never used | Error |
| scripts/lib/orchestrator_registry.py:381 | F841 | Local variable `original_count` is assigned to but never used | Error |
| scripts/lib/tui.py:2242 | F841 | Local variable `task_id` is assigned to but never used | Error |
| scripts/tui/panels.py:201 | F841 | Local variable `overall_pct` is assigned to but never used | Error |
| scripts/tui/panels.py:217 | F841 | Local variable `style` is assigned to but never used | Error |
| scripts/tui/panels.py:722 | F841 | Local variable `total_completed` is assigned to but never used | Error |
| scripts/tui/panels.py:1069 | F841 | Local variable `in_progress` is assigned to but never used | Error |
| scripts/tui/panels.py:1255 | F841 | Local variable `data` is assigned to but never used | Error |

#### Unused Imports (F401) - 52 instances
Key files with unused imports:
- `scripts/generate_api_types.py`: `os` unused
- `scripts/lib/event_bus.py`: `time`, `Set` unused
- `scripts/lib/multi_plan_tui.py`: `Table`, `Style` unused
- `scripts/lib/orchestrator_ipc.py`: `Path` unused
- `scripts/lib/status_monitor.py`: `Any`, `Callable` unused
- `scripts/tui/panels.py`: multiple imports unused
- `scripts/tui/task_actions.py`: `os`, `List`, `Console`, `Align` unused
- `scripts/tui/task_picker.py`: `Any`, `Console`, `Table` unused

#### F-string Issues (F541) - 22 instances
Files with f-strings without placeholders:
- `scripts/generate_api_types.py`: 5 instances
- `scripts/lib/multi_plan_tui.py`: 2 instances
- `scripts/tui/task_actions.py`: 3 instances
- `scripts/tui/panels.py`: Multiple instances

#### Ambiguous Variable Name (E741)
| Location | Error Code | Issue | Severity |
|----------|------------|-------|----------|
| scripts/tests/test-orchestrator-constraints.py:297 | E741 | Ambiguous variable name: `l` | Error |

## Root Cause Analysis

1. **Bare Except Clauses (E722)**: All 7 instances are in test files (`test-orchestrator-e2e.py`). These catch all exceptions without specifying a type, which can hide bugs and make debugging difficult.

2. **Module Import Order (E402)**: The imports in `plan_orchestrator.py` and `multi_plan_monitor.py` are placed after path manipulation code that adds the project root to `sys.path`. This is a common pattern for scripts that need to import from a non-standard location, but it violates PEP 8.

3. **Unused Variables/Imports**: Large codebase evolution has left behind artifacts from refactoring:
   - Variables computed but never used (likely from removed features or incomplete implementations)
   - Imports added for future use that were never implemented
   - Destructured values where only some parts are used

4. **F-strings Without Placeholders**: These are redundant f-prefix usage on strings that don't contain any `{}` interpolation.

5. **JavaScript Unused Variables**: Similar to Python, many unused imports/variables suggest:
   - Incomplete refactoring
   - Functions defined for future use
   - Unused destructured imports from utility modules

## Recommended Fixes

1. **High Priority - Bare Except Clauses**:
   - Replace `except:` with `except Exception:` or more specific exception types
   - Location: `scripts/tests/test-orchestrator-e2e.py` (7 instances)

2. **Medium Priority - Unused Variables**:
   - Remove or use the 8 Python unused variables
   - Remove or use the 59 JavaScript unused variables
   - Run `ruff check --fix` to auto-fix 55 of the Python issues

3. **Low Priority - Import Order**:
   - Add `# noqa: E402` comments to legitimize the late imports, or
   - Restructure to use proper package installation

4. **Low Priority - F-string Cleanup**:
   - Remove unnecessary `f` prefixes from 22 string literals
   - Run `ruff check --fix` to auto-fix these

## Summary Statistics
| Language | Error Type | Count | Auto-fixable |
|----------|------------|-------|--------------|
| JavaScript | no-unused-vars | 59 | Manual |
| Python | F401 (unused-import) | 52 | 52 |
| Python | F541 (f-string-no-placeholder) | 22 | 22 |
| Python | F841 (unused-variable) | 8 | 8 (unsafe) |
| Python | E722 (bare-except) | 7 | Manual |
| Python | E402 (import-order) | 7 | Manual |
| Python | E741 (ambiguous-name) | 1 | Manual |
| **Total** | | **156** | **82** |

## Regression Tests Needed
- Run `npm test` after removing unused JS variables
- Run `python -m pytest` after removing unused Python variables
- Verify no runtime errors after cleanup
