# Implementation Plan: Fix Orchestrator Bugs

## Overview

- **Goal:** Fix critical bugs in the plan orchestrator system to enable reliable autonomous plan execution
- **Priority:** P0 (critical path)
- **Created:** 2025-12-23
- **Output:** `docs/plan-outputs/fix-orchestrator-bugs/`

## Description

The plan orchestrator system has 18 identified issues preventing reliable autonomous execution. This plan addresses all critical bugs (race conditions, status tracking, streaming), significant design issues (two sources of truth, fragile inline JS), and edge cases. The fixes will ensure the orchestrator can execute plans reliably with accurate progress tracking and real-time visibility.

---

## Dependencies

### Upstream
- `scripts/lib/status-manager.js` - Status tracking API
- `scripts/lib/plan-output-utils.js` - Low-level status operations
- `scripts/plan_orchestrator.py` - Python TUI orchestrator
- `scripts/plan-orchestrator.js` - JavaScript status helper

### Downstream
- All `/plan:*` commands consume status-manager
- `plan_orchestrator.py` consumes all components

### External Tools
- `proper-lockfile` (npm) - For atomic file locking
- `rich` (Python) - Already installed for TUI

---

## Phase 1: Fix Critical Race Conditions

**Objective:** Eliminate data loss from concurrent status.json writes during parallel task execution.

**Tasks:**
- [ ] 1.1 Add file locking to plan-output-utils.js
  - Install `proper-lockfile` package
  - Wrap `loadStatus`/`saveStatus` in lock acquisition
  - Add retry logic with exponential backoff
- [ ] 1.2 Create atomic write function for status.json
  - Write to temp file first, then atomic rename
  - Ensure partial writes don't corrupt status
- [ ] 1.3 Add lock timeout and stale lock detection
  - Configure 10s lock timeout
  - Auto-release stale locks older than 60s
- [ ] 1.4 Add transaction-like batch updates
  - Create `batchUpdateTasks(planPath, updates[])` function
  - Single read-modify-write for multiple task updates

**VERIFY Phase 1:**
- [ ] Run 5 parallel `markTaskCompleted` calls - all 5 persist correctly
- [ ] Simulate crash during write - status.json remains valid
- [ ] Lock timeout works - stuck process doesn't block forever

---

## Phase 2: Fix Status Summary Tracking

**Objective:** Ensure progress percentages and task counts are always accurate.

**Tasks:**
- [ ] 2.1 Fix summary key mapping in updateTaskStatus
  - Map `in_progress` → decrements `pending` (not `in_progress`)
  - Add explicit key mapping object
  - Handle edge case where summary key doesn't exist
- [ ] 2.2 Add summary recalculation function
  - `recalculateSummary(status)` counts tasks by status
  - Call on every save as safety net
- [ ] 2.3 Fix initial summary when tasks parsed from markdown
  - Ensure `in_progress` count initialized to 0
  - Handle subtasks (e.g., 3.4.1) in counts
- [ ] 2.4 Add summary validation on load
  - Compare calculated vs stored summary
  - Log warning if mismatch, auto-fix

**VERIFY Phase 2:**
- [ ] After 10 status transitions, summary matches actual task counts
- [ ] `in_progress` correctly counted separately from `pending`
- [ ] Progress percentage accurate to within 1%

---

## Phase 3: Fix Python Streaming Parser

**Objective:** Enable real-time activity visibility in TUI during Claude execution.

**Tasks:**
- [ ] 3.1 Fix event timing in StreamingClaudeRunner
  - Fire `on_tool_start` at `content_block_start`, not `content_block_stop`
  - Capture tool name from initial block
  - Queue partial input JSON for later use
- [ ] 3.2 Implement proper `on_tool_end` handling
  - Detect tool completion via `content_block_stop`
  - Parse final tool input JSON
  - Fire `on_tool_end` callback with result summary
- [ ] 3.3 Connect `on_tool_end` callback in orchestrator
  - Pass `_on_tool_end` method to StreamingClaudeRunner
  - Update TUI activity tracker on completion
- [ ] 3.4 Add tool execution duration tracking
  - Record start time at `content_block_start`
  - Calculate duration at `content_block_stop`
  - Display duration in activity panel

**VERIFY Phase 3:**
- [ ] Activity panel shows tools AS they start (not after)
- [ ] Activity panel marks tools complete when done
- [ ] Duration shown for completed tools

---

## Phase 4: Create Status Manager CLI

**Objective:** Replace fragile inline JavaScript with robust CLI commands Claude can invoke.

**Tasks:**
- [ ] 4.1 Create `scripts/status-cli.js` with subcommands
  - `status` - Show current plan status (JSON output)
  - `mark-started <task-id>` - Mark task in_progress
  - `mark-complete <task-id> [--notes "..."]` - Mark task completed
  - `mark-failed <task-id> --error "..."` - Mark task failed
  - `mark-skipped <task-id> --reason "..."` - Mark task skipped
- [ ] 4.2 Add findings management commands
  - `write-findings <task-id> --file <path>` - Write findings from file
  - `write-findings <task-id> --stdin` - Write findings from stdin
  - `read-findings <task-id>` - Output findings content
- [ ] 4.3 Add run management commands
  - `start-run` - Start new run, output run ID
  - `complete-run <run-id> --completed N --failed N`
- [ ] 4.4 Add convenience commands
  - `next [count]` - Get next N recommended tasks (JSON)
  - `progress` - Show formatted progress bar
  - `validate` - Validate and repair status.json

**VERIFY Phase 4:**
- [ ] All commands work from bash
- [ ] JSON output is valid and parseable
- [ ] Error messages are clear and actionable

---

## Phase 5: Fix TUI Display Accuracy

**Objective:** Ensure TUI panels show accurate, real-time information.

**Tasks:**
- [ ] 5.1 Fix "In Progress" panel data source
  - Read from status.json `in_progress` tasks, not `getNextTasks()`
  - Update when status.json changes
- [ ] 5.2 Improve status monitor responsiveness
  - Reduce poll interval from 2s to 500ms
  - Use file watcher (inotify) instead of polling
- [ ] 5.3 Add heartbeat indicator
  - Show spinner or timestamp when Claude is running
  - Distinguish "waiting for Claude" from "Claude is working"
- [ ] 5.4 Fix progress bar calculation
  - Use summary from status.json, not parsed tasks
  - Handle edge case of 0 total tasks

**VERIFY Phase 5:**
- [ ] "In Progress" shows actual in_progress tasks
- [ ] Progress updates within 1s of status.json change
- [ ] Heartbeat visible during long operations

---

## Phase 6: Simplify Orchestrator Prompt

**Objective:** Create a clear, reliable prompt that Claude can execute without errors.

**Tasks:**
- [ ] 6.1 Rewrite `_build_prompt()` to use status-cli
  - Replace inline JavaScript with `node scripts/status-cli.js` commands
  - Provide clear examples of expected command usage
- [ ] 6.2 Add explicit task implementation instructions
  - Read plan file to understand task
  - Make code changes
  - Use status-cli to mark complete
- [ ] 6.3 Add error recovery instructions
  - What to do if task fails
  - How to mark failed and continue
- [ ] 6.4 Remove skill invocation references
  - Ensure prompt never mentions /plan:orchestrate
  - Explicit "implement directly" instruction

**VERIFY Phase 6:**
- [ ] Prompt under 2000 tokens
- [ ] No inline JavaScript in prompt
- [ ] Claude can execute prompt successfully

---

## Phase 7: Fix Task Source of Truth

**Objective:** Eliminate confusion between markdown checkboxes and status.json.

**Tasks:**
- [ ] 7.1 Document authoritative source clearly
  - status.json is THE source of truth for execution state
  - Markdown is reference documentation only
  - Add comment headers to status.json
- [ ] 7.2 Add sync validation command
  - `status-cli sync-check` - Compare markdown vs status.json
  - Report discrepancies without modifying either
- [ ] 7.3 Remove checkbox references from commands
  - Update implement.md to not mention `- [x]`
  - Clarify that markdown is never modified
- [ ] 7.4 Add task discovery from status.json
  - Ensure plan-orchestrator.js reads from status.json first
  - Only fall back to markdown if status.json missing

**VERIFY Phase 7:**
- [ ] No code modifies markdown checkboxes
- [ ] Task counts consistent between JS and Python
- [ ] Discrepancies are detectable

---

## Phase 8: Add Retry and Recovery Logic

**Objective:** Implement robust error handling and task retry.

**Tasks:**
- [ ] 8.1 Add retry tracking to task status
  - `retryCount` field in status.json
  - `lastError` field preserved across retries
- [ ] 8.2 Implement retry logic in Python orchestrator
  - Track failed tasks
  - Retry up to 2 times at end of iteration
  - Exponential backoff between retries
- [ ] 8.3 Add stuck task detection
  - Task `in_progress` for >30 minutes = stuck
  - Auto-mark as failed with timeout reason
- [ ] 8.4 Add recovery from corrupt status.json
  - Backup before each write
  - Restore from backup if JSON parse fails
  - Rebuild from markdown as last resort

**VERIFY Phase 8:**
- [ ] Failed task retried up to 2 times
- [ ] Stuck tasks detected and marked failed
- [ ] Corrupt status.json recoverable

---

## Phase 9: Testing & Validation

**Objective:** Ensure all fixes work correctly under real conditions.

**Tasks:**
- [ ] 9.1 Create unit tests for status-cli commands
  - Test each command with valid input
  - Test error cases (missing task, invalid JSON)
- [ ] 9.2 Create integration test for parallel updates
  - Spawn 10 parallel processes updating status.json
  - Verify all updates persisted correctly
- [ ] 9.3 Test Python orchestrator end-to-end
  - Run orchestrator on test plan with 5 tasks
  - Verify all tasks complete, status accurate
- [ ] 9.4 Test recovery scenarios
  - Simulate crash, verify recovery
  - Simulate corrupt file, verify rebuild

**VERIFY Phase 9:**
- [ ] All unit tests pass
- [ ] Parallel update test: 0 lost updates
- [ ] End-to-end test: plan completes successfully

---

## Phase 10: Documentation & Cleanup

**Objective:** Document the fixed system and clean up temporary code.

**Tasks:**
- [ ] 10.1 Update orchestrator README
  - Document status-cli commands
  - Explain status.json format
  - Troubleshooting guide
- [ ] 10.2 Update command documentation
  - Remove outdated inline JS patterns
  - Reference status-cli commands
- [ ] 10.3 Add architecture diagram
  - Show data flow between components
  - Clarify source of truth
- [ ] 10.4 Remove deprecated code
  - Clean up unused functions
  - Remove temporary workarounds

**VERIFY Phase 10:**
- [ ] README is accurate and complete
- [ ] Commands reference correct patterns
- [ ] No dead code remains

---

## Success Criteria

### Functional Requirements
- [ ] Orchestrator completes a 10-task plan without manual intervention
- [ ] All task completions persist (no race condition losses)
- [ ] Progress percentage always matches actual completion
- [ ] TUI shows real-time activity during execution
- [ ] Failed tasks are retried and handled gracefully

### Quality Requirements
- [ ] No critical bugs remaining
- [ ] Parallel updates tested and verified
- [ ] Recovery from failures documented and tested
- [ ] Code follows project conventions

### Performance Requirements
- [ ] Status update latency < 100ms
- [ ] TUI refresh latency < 500ms
- [ ] Lock acquisition < 1s (typical)

---

## Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| File locking breaks on Windows | High | Medium | Use cross-platform lockfile library, test on Windows |
| Streaming parser changes break other tools | Medium | Low | Only modify orchestrator's streaming runner |
| Status-cli adds dependency complexity | Low | Medium | Keep as single file, minimal dependencies |
| Migration breaks existing status.json files | High | Medium | Add version field, migration logic |

---

## Notes

- The original prompt bug (asking Claude to "Run /plan:orchestrate") has already been fixed
- Consider adding a `--dry-run` flag to status-cli for testing
- File locking may need adjustment for network filesystems
- The 18 issues identified in analysis are all addressed in this plan

---

## Issue to Task Mapping

| Issue # | Description | Addressed In |
|---------|-------------|--------------|
| 1 | Summary key mismatch | Phase 2 (2.1) |
| 2 | Streaming fires at wrong time | Phase 3 (3.1) |
| 3 | Missing on_tool_end | Phase 3 (3.2, 3.3) |
| 4 | Race condition on writes | Phase 1 (1.1-1.4) |
| 5 | JS/Python count mismatch | Phase 7 (7.4) |
| 6 | Missing status init check | Phase 8 (8.4) |
| 7 | Non-substituted placeholders | Phase 6 (6.1) |
| 8 | Wrong phase tasks returned | Phase 7 (7.4) |
| 9 | Duration in milliseconds | Phase 3 (3.4) |
| 10 | Infinite loop potential | Phase 8 (8.3) |
| 11 | Two sources of truth | Phase 7 (7.1-7.4) |
| 12 | Non-existent status manager | Phase 4 (4.1-4.4) |
| 13 | No heartbeat indicator | Phase 5 (5.3) |
| 14 | TUI shows wrong "In Progress" | Phase 5 (5.1) |
| 15 | No retry logic | Phase 8 (8.1-8.2) |
| 16 | Task ID collision | Phase 4 (4.1) |
| 17 | Empty plan handling | Phase 2 (2.3) |
| 18 | Timezone issues | Phase 3 (3.4) |
