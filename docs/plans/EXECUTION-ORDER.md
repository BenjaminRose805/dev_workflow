# Plan Execution Order

This document defines the recommended order for executing plans in this repository.

## Overview

These plans implement two major feature sets:
1. **Parallel Execution** - Enable safe concurrent task/plan execution
2. **Git Workflow** - Branch-per-plan workflow with safety and automation

The plans are ordered to maximize safety and enable incremental value delivery.

---

## Execution Order

| Order | Plan | Tasks | Status |
|-------|------|-------|--------|
| 1 | [parallel-execution-foundation](parallel-execution-foundation.md) | 30 | Complete |
| 2 | [git-workflow-phase1-core-branching](git-workflow-phase1-core-branching.md) | 26 | Complete |
| 3 | [git-workflow-phase2-completion](git-workflow-phase2-completion.md) | 35 | Complete |
| 4 | [git-workflow-phase3-safety](git-workflow-phase3-safety.md) | 46 | Complete |
| 5 | [git-workflow-phase4-advanced](git-workflow-phase4-advanced.md) | 63 | Not Started |
| 6 | [git-workflow-phase5-worktrees](git-workflow-phase5-worktrees.md) | 84 | Not Started |
| 7 | [parallel-execution-dependencies](parallel-execution-dependencies.md) | 35 | Not Started |
| 8 | [tui-expansion-analysis](tui-expansion-analysis.md) | 57 | Not Started |
| 9 | [tui-integration-implementation](tui-integration-implementation.md) | 24 | Not Started |

**Total: 400 tasks across 9 plans**

---

## Plan Summaries

### 1. parallel-execution-foundation
**Goal:** Enable safe parallel execution with foundational improvements.

**Delivers:**
- `--plan` argument for all CLI commands (enables scripting/CI)
- Automatic file conflict detection between tasks
- Serial git commit queue (prevents merge conflicts)
- `[PARALLEL]` phase annotation support
- Enhanced progress output formats (`--format=json`, `--watch`)

**Why first:** These safety features protect all subsequent plan executions from race conditions and conflicts.

---

### 2. git-workflow-phase1-core-branching
**Goal:** Implement branch-per-plan workflow with commit-per-task.

**Delivers:**
- `/plan:set` creates/switches to `plan/{name}` branch
- Each task creates exactly one commit
- `/plan:status` shows git branch and commit info
- Auto-stash uncommitted changes on branch switch
- Git utility patterns documented

**Dependencies:** None (but benefits from plan 1's commit queue)

---

### 3. git-workflow-phase2-completion
**Goal:** Implement plan completion with squash merge workflow.

**Delivers:**
- `/plan:complete` command
- Squash merge to main branch (clean history)
- Archive tags preserve individual commits
- Merge commit with plan metadata
- Multiple merge strategies (`--merge squash|commit|ff`)

**Dependencies:** Plan 2 (needs branches to merge)

---

### 4. parallel-execution-dependencies
**Goal:** Enable fine-grained parallelism with task dependencies.

**Delivers:**
- `(depends: 1.1, 1.2)` syntax in task descriptions
- DAG-based task scheduling
- Cross-phase dependencies (task 3.1 can depend on 1.1 only)
- Pipeline phase overlap (next phase starts early)
- Dependency visualization (`deps --graph`)

**Why here:** DAG scheduling helps with the larger, more complex remaining plans.

**Expected speedup:** 30-45% on complex plans

---

### 5. git-workflow-phase3-safety
**Goal:** Implement rollback and safety mechanisms.

**Delivers:**
- `/plan:rollback task X.Y` - revert single task
- `/plan:rollback phase N` - revert entire phase
- `/plan:rollback plan` - revert merged plan
- `/plan:abandon` - safely discard with backup
- Pre-commit hook template
- Uncommitted changes protection

**Dependencies:** Plans 2-3 (needs branches and merge workflow)

---

### 5. git-workflow-phase4-advanced
**Goal:** Advanced features for team workflows and automation.

**Delivers:**
- `/plan:complete --pr` creates GitHub PR
- Auto-sync to remote (configurable)
- Phase tags at completion
- `/plan:cleanup` for stale branches/tags
- `.claude/git-workflow.json` configuration
- Pre-merge conflict detection
- Completion prompt in orchestrator

**Dependencies:** Plans 1-4 (builds on all prior git features)

---

### 6. git-workflow-phase5-worktrees
**Goal:** Enable parallel plan execution via git worktrees.

**Delivers:**
- Multiple plans running simultaneously
- `/plan:worktree create|list|remove|switch`
- Multi-orchestrator process management
- `--all-plans` aggregate status view
- REST API for frontend integration
- Multi-plan TUI interface
- Conflict detection between parallel plans

**Dependencies:** Plans 1-5 (capstone feature for git workflow)

---

### 7. parallel-execution-dependencies
**Goal:** Enable fine-grained parallelism with task dependencies.

**Delivers:**
- `(depends: 1.1, 1.2)` syntax in task descriptions
- DAG-based task scheduling
- Cross-phase dependencies
- Pipeline phase overlap
- Dependency visualization (`deps --graph`)

**Dependencies:** Plan 1 (parallel-execution-foundation)

---

### 8. tui-expansion-analysis
**Goal:** Analyze TUI expansion opportunities based on completed workflows.

**Delivers:**
- Git workflow TUI panel designs
- Parallel/sequential annotation visualization
- File conflict detection TUI mapping
- Multi-plan concurrent execution TUI
- Gap analysis vs current TUI plan

**Dependencies:** Plans 1-7 (analyzes their outputs)

---

### 9. tui-integration-implementation
**Goal:** Implement enhanced TUI with keyboard navigation and new panels.

**Delivers:**
- Keyboard navigation (vim-style)
- Phase progress bars, upcoming tasks panel
- Command palette with slash commands
- Dependency graph visualization
- Findings browser, artifact browser
- Responsive layouts, configuration persistence

**Dependencies:** Plan 8 (uses analysis results)

---

## Running the Plans

### Start First Plan
```bash
/plan:set parallel-execution-foundation
python3 scripts/plan_orchestrator.py --continue
```

### After Each Plan Completes
```bash
/plan:set <next-plan-name>
python3 scripts/plan_orchestrator.py --continue
```

### Check Progress
```bash
node scripts/status-cli.js progress
```

---

## Dependency Graph

```
parallel-execution-foundation (1) ✓
    │
    ├──► git-workflow-phase1-core-branching (2) ✓
    │        │
    │        └──► git-workflow-phase2-completion (3) ✓
    │                 │
    │                 └──► git-workflow-phase3-safety (4) ✓
    │                          │
    │                          └──► git-workflow-phase4-advanced (5)
    │                                   │
    │                                   └──► git-workflow-phase5-worktrees (6)
    │
    └──► parallel-execution-dependencies (7)
                    │
                    └──► tui-expansion-analysis (8)
                              │
                              └──► tui-integration-implementation (9)
```

---

## Time Estimates

| Plan | Tasks | Est. Iterations | Status |
|------|-------|-----------------|--------|
| 1 | 30 | ~6 | Complete |
| 2 | 26 | ~6 | Complete |
| 3 | 35 | ~7 | Complete |
| 4 | 46 | ~10 | Complete |
| 5 | 63 | ~13 | Not Started |
| 6 | 84 | ~17 | Not Started |
| 7 | 35 | ~7 | Not Started |
| 8 | 57 | ~12 | Not Started |
| 9 | 24 | ~5 | Not Started |

**Remaining: 263 tasks, ~54 iterations (~9 hours)**

*Estimates assume ~5 tasks/iteration, ~10 min/iteration*

---

## Value Delivery Checkpoints

After each plan, you gain usable functionality:

| After Plan | You Can... |
|------------|------------|
| 1-4 | ✓ Run safely with branches, rollback, conflict detection |
| 5 | Create PRs, sync to remote, auto-complete after orchestration |
| 6 | Run multiple plans in parallel via worktrees, REST API |
| 7 | Get 30%+ speedup with task-level dependencies |
| 8-9 | Use keyboard-driven TUI with dependency graphs, command palette |

---

## Notes

- Plans can be paused and resumed at any time
- Each plan is independently valuable (no need to complete all 7)
- The orchestrator handles task failures with retry logic
- Progress is saved in `docs/plan-outputs/{plan-name}/status.json`
