# Finding: Outdated Documentation - Inline Comments

## Summary

Audit of the codebase identified several instances of outdated documentation and stale comments. These include:
- One unimplemented TODO in the orchestrator API server related to phase parsing
- Multiple comments referencing deprecated architecture (current-plan-output.txt no longer used)
- A placeholder implementation in TUI keyboard handling
- Documentation referencing legacy plan format with inline checkmarks
- Comments explaining removed lock cleanup logic due to race conditions
- Comments about trimming old error logs that may need context updates

## Outdated Docstrings/JSDoc

| File | Line | Issue | Risk | Notes |
|------|------|-------|------|-------|
| scripts/scan-completed-plans.js | 6 | References "legacy format" with inline checkmarks | Low | Historical context only - applies to archived plans, not active |
| scripts/lib/plan-output-utils.js | 256-258 | Comments explaining removed manual lock cleanup logic | Medium | Documents historical design decision; helpful for understanding current approach |

## Stale TODO/FIXME Comments

| File | Line | Comment | Assessment |
|------|------|---------|------------|
| scripts/orchestrator_server.py | 357 | `# TODO: Parse phases from plan file` | Potentially Stale - Implementation is incomplete |

## Comments Referencing Old Architecture

| File | Line | Comment | Issue |
|------|------|---------|-------|
| scripts/tests/test-orchestrator-e2e.py | 28, 59, 127 | `# Note: current-plan-output.txt is no longer used - output path is derived from plan name` | Outdated reference - clarifies migration but repetitive |
| scripts/tests/test-recovery.js | 26, 77 | `// Note: current-plan-output.txt is no longer used - output path is derived from plan name` | Outdated reference - same as above |
| scripts/tests/test-status-cli.js | 22, 84, 155 | `// Note: current-plan-output.txt is no longer used - output path is derived from plan name` | Outdated reference - repeated across multiple test files |
| scripts/tui/keyboard.py | 291 | `# This is a placeholder - actual implementation handled by TUI` | Incomplete - `_toggle_help` has no actual implementation |

## Incomplete/Placeholder Implementations

| File | Line | Function | Status | Notes |
|------|------|----------|--------|-------|
| scripts/tui/keyboard.py | 289-292 | `_toggle_help()` | Placeholder | Method returns True but has no actual logic; marked as placeholder |

## Recommendations

### Priority 1 - Fix Immediately
1. **Resolve TODO in orchestrator_server.py (line 357)**: Either implement phase parsing or document why it's not needed. Currently, phases are initialized as empty list with a TODO comment that may indicate incomplete implementation.

### Priority 2 - Review and Clarify
1. **keyboard.py placeholder (line 291)**: Verify if the `_toggle_help()` placeholder is intentional or if implementation is needed. If intentional, update comment to explain architectural reasoning.

2. **Lock cleanup comments (plan-output-utils.js lines 256-258)**: These comments are helpful but could be consolidated into a clearer documentation block explaining the lock strategy and race condition concerns.

### Priority 3 - Cleanup (Low Risk)
1. **Deduplicate "no longer used" comments**: The comments about `current-plan-output.txt` appear in 5+ test files. Consider consolidating into a single comment block or documentation rather than repeating across files.
   - Locations: `test-orchestrator-e2e.py` (3x), `test-recovery.js` (2x), `test-status-cli.js` (3x)
   - Recommendation: Remove redundant inline comments and document once in API documentation

2. **Legacy format reference (scan-completed-plans.js line 6)**: Keep as-is since it accurately describes archived plans. No action needed.

## Items to Keep As-Is

- **compact_threshold configuration** (config.py, tui.py): Documentation is current and accurate for compact mode feature
- **Stale threshold documentation** (orchestrator_registry.py): Properly documents staleness criteria
- **Error log trimming** (error_handler.py line 221): Straightforward housekeeping code with appropriate comments
