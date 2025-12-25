# Implementation Plan: Parallel Execution Foundation

## Overview

- **Goal:** Enable safe parallel execution with explicit plan arguments, automatic conflict detection, and serialized git operations
- **Priority:** P1
- **Created:** 2025-12-25
- **Output:** `docs/plan-outputs/parallel-execution-foundation/`

> Quick wins from parallel execution architecture analysis. These foundational changes protect all subsequent plan executions.

> Task findings are written to the `findings/` subdirectory. Use `/plan:status` to view progress.

## Dependencies

### Upstream
- **parallel-execution-architecture.md** (COMPLETED) - Analysis that identified these improvements

### Downstream
- **git-workflow-phase1-core-branching.md** - Benefits from commit queue
- **parallel-execution-dependencies.md** - Builds on this foundation
- All future plans benefit from conflict detection

### External Tools
- Git (for commit queue operations)

---

## Phase 0: Preparation

- [ ] 0.1 Create backup of current `scripts/status-cli.js` and `scripts/lib/plan-status.js` before modifications
- [ ] 0.2 Review current argument parsing in `status-cli.js` to understand extension points

**VERIFY Phase 0:**
- [ ] Backup files exist in `docs/plan-outputs/parallel-execution-foundation/backups/`
- [ ] Current CLI interface documented

---

## Phase 1: Explicit Plan Argument

**Objective:** Allow all status-cli.js commands to accept an explicit `--plan` argument instead of relying solely on `current-plan.txt`.

- [ ] 1.1 Add `--plan <path>` argument parsing to `scripts/status-cli.js` main function
  - Parse `--plan` before other arguments
  - Store in variable for use by all commands
  - Remove from args array before passing to command handlers
- [ ] 1.2 Create `getPlanPathFromArgs(args)` helper function in `scripts/lib/plan-status.js`
  - Check for `--plan` argument first
  - Fall back to `getActivePlanPath()` if not provided
  - Validate plan file exists, return error if not
- [ ] 1.3 Update all command handlers in `status-cli.js` to use the new helper
  - `cmdStatus`, `cmdNext`, `cmdProgress`, `cmdPhases`
  - `cmdMarkStarted`, `cmdMarkComplete`, `cmdMarkFailed`, `cmdMarkSkipped`
  - `cmdWriteFindings`, `cmdReadFindings`
  - `cmdStartRun`, `cmdCompleteRun`
  - `cmdCheck`, `cmdValidate`, `cmdSyncCheck`
  - `cmdRetryable`, `cmdExhausted`, `cmdIncrementRetry`, `cmdDetectStuck`
- [ ] 1.4 Update `--help` output to document `--plan` argument
- [ ] 1.5 Add integration tests for `--plan` argument in `scripts/tests/test-plan-arg.js`

**VERIFY Phase 1:**
- [ ] `node scripts/status-cli.js --plan docs/plans/test.md status` works without setting current-plan.txt
- [ ] `node scripts/status-cli.js --plan nonexistent.md status` shows clear error message
- [ ] All commands work with both `--plan` argument and `current-plan.txt` fallback
- [ ] `--help` output shows `--plan` option

---

## Phase 2: File Conflict Detection

**Objective:** Automatically detect when multiple tasks would modify the same files and mark them as sequential.

- [ ] 2.1 Create `extractFileReferences(taskDescription)` function in `scripts/lib/plan-status.js`
  - Match backtick-quoted paths: `` `path/to/file.ts` ``
  - Match `src/`, `tests/`, `docs/`, `scripts/` paths
  - Match "modify/modifying/update/updating X.ts" patterns
  - Return array of unique file paths
- [ ] 2.2 Create `detectFileConflicts(tasks)` function in `scripts/lib/plan-status.js`
  - Build map of file -> task IDs
  - Identify files referenced by multiple tasks
  - Return array of `{ file, taskIds }` conflicts
- [ ] 2.3 Integrate conflict detection into `cmdNext()` in `status-cli.js`
  - After selecting candidate tasks, run conflict detection
  - Add `fileConflict: true` flag to conflicting tasks in output
  - Add `conflictsWith: [taskIds]` to show which tasks conflict
- [ ] 2.4 Update `next` command JSON output to include conflict information
- [ ] 2.5 Add unit tests for file reference extraction in `scripts/tests/test-file-conflicts.js`

**VERIFY Phase 2:**
- [ ] `extractFileReferences("Update \`src/api.ts\` and \`src/utils.ts\`")` returns `["src/api.ts", "src/utils.ts"]`
- [ ] Two tasks mentioning same file show `fileConflict: true` in `next` output
- [ ] Conflict information helps orchestrator run tasks sequentially

---

## Phase 3: Serial Git Commit Queue

**Objective:** Prevent concurrent git commits from causing merge conflicts during parallel task execution.

- [ ] 3.1 Create `scripts/lib/git-queue.js` with commit queue implementation
  - Queue data structure for pending commits
  - `queueCommit(message, files, callback)` function
  - `processQueue()` to execute commits sequentially
  - Lock mechanism to prevent concurrent processing
- [ ] 3.2 Add `commitWithQueue(message, files)` async wrapper function
  - Returns promise that resolves when commit completes
  - Handles commit failures gracefully
- [ ] 3.3 Create queue status file at `docs/plan-outputs/.git-queue-status.json`
  - Track pending commits
  - Track last commit timestamp
  - Enable recovery after crashes
- [ ] 3.4 Add `--no-queue` flag to bypass queue for manual operations
- [ ] 3.5 Integrate queue into plan-status.js commit operations
  - Update any existing commit helpers to use queue
- [ ] 3.6 Add queue status to `status-cli.js progress` output
  - Show pending commit count if > 0

**VERIFY Phase 3:**
- [ ] Rapid sequential commits don't cause git errors
- [ ] Queue status file tracks pending commits
- [ ] `--no-queue` bypasses queue for direct commits
- [ ] Queue recovers gracefully from interrupted operations

---

## Phase 4: PARALLEL Phase Annotation

**Objective:** Allow phases to be explicitly marked as parallelizable, mirroring the existing `[SEQUENTIAL]` annotation.

- [ ] 4.1 Add `[PARALLEL]` annotation parsing to `parseExecutionNotes()` in `plan-status.js`
  - Pattern: `**Execution Note:** Phases X-Y are [PARALLEL] - reason`
  - Extract phase numbers from annotation
  - Store in status.json under `parallelPhases` array
- [ ] 4.2 Create `getParallelPhases(planPath)` function
  - Return array of phase numbers that can run in parallel
  - Check for file conflicts between phases
- [ ] 4.3 Update `cmdNext()` to consider parallel phases
  - If current phase is in parallel group, also return tasks from other parallel phases
  - Respect individual task `[SEQUENTIAL]` annotations within parallel phases
- [ ] 4.4 Document `[PARALLEL]` annotation usage in `.claude/commands/plan/_common/status-tracking.md`
- [ ] 4.5 Add tests for parallel phase detection

**VERIFY Phase 4:**
- [ ] Plan with `[PARALLEL]` annotation correctly parsed
- [ ] `next` command returns tasks from parallel phases together
- [ ] Sequential tasks within parallel phases still run sequentially
- [ ] Documentation updated with examples

---

## Phase 5: Enhanced Progress Output

**Objective:** Add structured progress markers for TUI and programmatic consumption.

- [ ] 5.1 Add `--format` flag to `status-cli.js progress` command
  - `--format=text` (default): Current human-readable output
  - `--format=json`: Full structured JSON
  - `--format=markers`: Progress marker format for parsing
- [ ] 5.2 Define progress marker format
  - `[PROGRESS] task=X.Y status=started|completed|failed`
  - `[PROGRESS] phase=N status=started|completed percent=XX`
  - `[PROGRESS] plan status=in_progress|completed percent=XX`
- [ ] 5.3 Add `--watch` flag for continuous progress output
  - Poll status.json every 2 seconds
  - Output changes as progress markers
  - Exit when plan completes or on Ctrl+C
- [ ] 5.4 Document progress marker format for TUI integration

**VERIFY Phase 5:**
- [ ] `node scripts/status-cli.js progress --format=json` returns valid JSON
- [ ] `node scripts/status-cli.js progress --format=markers` returns parseable markers
- [ ] `--watch` continuously outputs progress updates
- [ ] Format documented for downstream consumers

---

## Phase 6: Integration Testing

- [ ] 6.1 Create end-to-end test script `scripts/tests/test-parallel-foundation.js`
  - Test `--plan` argument with multiple concurrent sessions
  - Test file conflict detection with sample tasks
  - Test commit queue with rapid commits
  - Test parallel phase annotation parsing
- [ ] 6.2 Test with actual orchestrator execution
  - Run two plans in separate terminals using `--plan`
  - Verify no conflicts or race conditions
- [ ] 6.3 Document test results in findings

**VERIFY Phase 6:**
- [ ] All unit tests pass
- [ ] Integration tests pass
- [ ] Two concurrent plan executions work without conflicts
- [ ] Test results documented

---

## Success Criteria

### Functional
- [ ] `--plan` argument works for all status-cli.js commands
- [ ] File conflicts automatically detected and flagged
- [ ] Git commits serialized to prevent merge conflicts
- [ ] `[PARALLEL]` annotation enables phase-level parallelism
- [ ] Progress output available in multiple formats

### Quality
- [ ] All changes backward-compatible (no breaking changes)
- [ ] Unit tests cover new functionality
- [ ] Documentation updated

---

## Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Breaking existing scripts | HIGH | LOW | Backward-compatible design, extensive testing |
| Commit queue deadlock | MEDIUM | LOW | Timeout mechanism, manual bypass flag |
| False positive file conflicts | LOW | MEDIUM | Conservative pattern matching, manual override |
| Performance impact | LOW | LOW | Queue is lightweight, conflict detection is fast |
