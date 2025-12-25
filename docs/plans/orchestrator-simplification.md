# Implementation Plan: Orchestrator Simplification

## Overview
- **Objective:** Reduce orchestrator complexity from 7 files/4600 lines to 3-4 files/~2000 lines
- **Scope:** scripts/plan_orchestrator.py, scripts/plan-runner.sh, scripts/plan-orchestrator.js, scripts/status-cli.js, scripts/lib/status-manager.js, scripts/lib/plan-output-utils.js, scripts/lib/plan-pointer.js
- **Created:** 2025-12-24
- **Estimated Reduction:** ~50% code reduction, clearer architecture

## Current State

```
plan_orchestrator.py (1405 lines) - Python TUI + main loop
       │
       ├──► plan-runner.sh (168 lines) - Bash wrapper (unnecessary)
       │         │
       │         └──► plan-orchestrator.js (456 lines) - Node status queries
       │
       └──► claude CLI
                 │
                 └──► status-cli.js (800 lines) - Node CLI for updates
                           │
                           ├──► status-manager.js (446 lines) - High-level API
                           │
                           └──► plan-output-utils.js (1200+ lines) - Low-level I/O
                                     │
                                     └──► plan-pointer.js (94 lines) - Pointer management
```

## Target State

```
plan_orchestrator.py - Python TUI + main loop (unchanged)
       │
       └──► status-cli.js - Unified CLI (queries + updates)
                 │
                 └──► lib/plan-status.js - Single unified library
```

## Phase 0: Preparation (No breaking changes)
- [ ] 0.1 Create comprehensive test suite for current behavior
- [ ] 0.2 Document all CLI commands and their expected outputs
- [ ] 0.3 Identify all callers of each script (grep for usage)
- [ ] **VERIFY 0**: All tests pass, baseline established

## Phase 1: Eliminate plan-runner.sh (Low risk)
- [ ] 1.1 Update `plan_orchestrator.py` to call `node scripts/plan-orchestrator.js` directly
- [ ] 1.2 Update any other callers of `plan-runner.sh` to use node directly
- [ ] 1.3 Deprecate `plan-runner.sh` (add warning, keep for compatibility)
- [ ] 1.4 After verification period, delete `plan-runner.sh`
- [ ] **VERIFY 1**: Python orchestrator works without plan-runner.sh

## Phase 2: Consolidate Status Libraries (Medium risk)
- [ ] 2.1 Audit all exports from `status-manager.js` - identify what's actually used
- [ ] 2.2 Audit all exports from `plan-output-utils.js` - identify what's actually used
- [ ] 2.3 Audit `plan-pointer.js` - only `getActivePlanPath()` is essential
- [ ] 2.4 Create `lib/plan-status.js` with unified API:
  - Core: `loadStatus()`, `saveStatus()`, `updateTaskStatus()`
  - Queries: `getNextTasks()`, `getProgress()`, `getStatusSummary()`
  - Init: `initializePlanStatus()`
  - Path resolution: `getActivePlanPath()`, `getOutputDir()`, `getStatusPath()`
- [ ] 2.5 Migrate `status-cli.js` to use new unified library
- [ ] 2.6 Migrate `plan-orchestrator.js` to use new unified library
- [ ] 2.7 Delete redundant files: `status-manager.js`, `plan-pointer.js`
- [ ] 2.8 Rename `plan-output-utils.js` to `plan-status.js` (or delete if fully migrated)
- [ ] **VERIFY 2**: All status operations work, tests pass

## Phase 3: Merge plan-orchestrator.js into status-cli.js (Medium risk)
- [ ] 3.1 Add `status` command to `status-cli.js` (matches plan-orchestrator.js output)
- [ ] 3.2 Add `next` command to `status-cli.js` (matches plan-orchestrator.js output)
- [ ] 3.3 Add `phases` command to `status-cli.js`
- [ ] 3.4 Add `check` command to `status-cli.js`
- [ ] 3.5 Update `plan_orchestrator.py` to call `status-cli.js` instead of `plan-orchestrator.js`
- [ ] 3.6 Delete `plan-orchestrator.js`
- [ ] **VERIFY 3**: Python orchestrator works with status-cli.js for all queries

## Phase 4: Standardize Path Resolution (Low risk)
- [ ] 4.1 Remove `.claude/current-plan-output.txt` pointer dependency
- [ ] 4.2 Always derive output path from plan name: `docs/plan-outputs/{plan-name}/`
- [ ] 4.3 Keep `.claude/current-plan.txt` as the single pointer
- [ ] 4.4 Update all path resolution to use consistent derivation
- [ ] 4.5 Delete pointer update logic (no longer needed)
- [ ] **VERIFY 4**: Orchestrator works without output pointer file

## Phase 5: Code Cleanup (Low risk)
- [ ] 5.1 Remove duplicate markdown parsing (use single `markdown-parser.js`)
- [ ] 5.2 Remove duplicate summary calculation (single source in plan-status.js)
- [ ] 5.3 Remove unused exports and dead code
- [ ] 5.4 Add JSDoc comments to public API
- [ ] 5.5 Update documentation to reflect new architecture
- [ ] **VERIFY 5**: Final tests pass, documentation accurate

## Phase 6: Orchestrator Uses Plan Commands (Architecture change)

Currently the orchestrator bypasses `/plan:implement`, `/plan:verify`, etc. and sends Claude
a simplified prompt with inline instructions. This duplicates logic and misses features like:
- Template variable handling
- Agent execution strategy (parallel agents, read-only pattern)
- Run tracking (startRun/completeRun)
- Findings collection
- Sophisticated error handling

This phase makes the orchestrator use the same commands humans use.

### 6.1 Add Autonomous Mode to Commands
- [ ] 6.1.1 Add `--autonomous` flag to `/plan:implement` - skips AskUserQuestion prompts
- [ ] 6.1.2 Add `--autonomous` flag to `/plan:verify` - skips confirmation prompts
- [ ] 6.1.3 Add `--autonomous` flag to `/plan:batch` - skips all interactive prompts
- [ ] 6.1.4 Document autonomous mode behavior in each command

### 6.2 Update Command Behavior for Autonomous Mode
- [ ] 6.2.1 `/plan:implement --autonomous`: Accept task IDs as args, skip selection UI
- [ ] 6.2.2 `/plan:implement --autonomous`: Proceed without execution preview confirmation
- [ ] 6.2.3 `/plan:verify --autonomous`: Run verification without asking to continue
- [ ] 6.2.4 All commands: Output structured progress (for TUI parsing if needed)

### 6.3 Simplify Orchestrator Prompt
- [ ] 6.3.1 Replace inline implementation instructions with command invocation
- [ ] 6.3.2 New prompt format: `Run: /plan:implement 1.1 1.2 1.3 --autonomous`
- [ ] 6.3.3 Remove `status-cli.js mark-started/mark-complete` from prompt (commands handle it)
- [ ] 6.3.4 Keep only high-level guidance (stop conditions, error handling)

### 6.4 Update _build_prompt() in plan_orchestrator.py
- [ ] 6.4.1 Generate command invocation instead of inline instructions
- [ ] 6.4.2 Batch tasks appropriately for command args
- [ ] 6.4.3 Add `--autonomous` flag to all command invocations
- [ ] 6.4.4 Simplify prompt from ~50 lines to ~10 lines

### 6.5 Verification
- [ ] **VERIFY 6.5.1**: Run orchestrator with single task - command executes correctly
- [ ] **VERIFY 6.5.2**: Run orchestrator with multiple tasks - batching works
- [ ] **VERIFY 6.5.3**: TUI still tracks progress (status.json updates work)
- [ ] **VERIFY 6.5.4**: TUI still shows tool activity (streaming works through Skill)
- [ ] **VERIFY 6.5.5**: Error handling works (failed tasks marked correctly)
- [ ] **VERIFY 6.5.6**: Full plan execution completes successfully

## Dependency Graph
```
Phase 0 (tests)
    → Phase 1 (remove bash wrapper)
    → Phase 2 (consolidate libs)
    → Phase 3 (merge JS files)
    → Phase 4 (simplify paths)
    → Phase 5 (cleanup)
    → Phase 6 (use commands) ← NEW: architectural improvement
```

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Breaking Claude commands | Test each /plan:* command after changes |
| Breaking Python orchestrator | Run full orchestration test after each phase |
| Data loss in status.json | All changes are read-path only initially |
| Regression in TUI | Manual TUI testing after Phase 1, 3, 6 |
| Autonomous mode breaks interactivity | Keep flags optional, default to interactive |
| Skill expansion overhead | Measure latency, optimize if needed |
| Command changes break orchestrator | Version lock command behavior for autonomous mode |

## Success Criteria
- [ ] **File Count**: 7 files → 3-4 files
- [ ] **Line Count**: ~4600 lines → ~2000 lines
- [ ] **Single Source of Truth**: One `loadStatus()`, one `getOutputDir()`
- [ ] **No Pointer Sync Issues**: Output path derived, not stored
- [ ] **All Tests Pass**: Existing functionality preserved
- [ ] **Clear Architecture**: Python → Node CLI → Single JS library
- [ ] **Commands Are Source of Truth**: Orchestrator uses same commands as humans
- [ ] **Simplified Prompt**: Orchestrator prompt reduced from ~50 lines to ~10 lines
- [ ] **Full Feature Parity**: Orchestrator gets template handling, agent strategy, run tracking

## Files to Delete (by end)
1. `scripts/plan-runner.sh`
2. `scripts/plan-orchestrator.js`
3. `scripts/lib/status-manager.js`
4. `scripts/lib/plan-pointer.js`
5. `.claude/current-plan-output.txt` (pointer file)

## Files to Keep/Modify
1. `scripts/plan_orchestrator.py` - Minor updates to call node directly
2. `scripts/status-cli.js` - Expanded to include query commands
3. `scripts/lib/plan-status.js` - New unified library (renamed from plan-output-utils.js)
4. `scripts/lib/markdown-parser.js` - Keep as-is (single source for parsing)
