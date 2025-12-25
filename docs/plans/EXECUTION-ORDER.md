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
| 1 | [parallel-execution-foundation](parallel-execution-foundation.md) | 30 | Not Started |
| 2 | [git-workflow-phase1-core-branching](git-workflow-phase1-core-branching.md) | 26 | Not Started |
| 3 | [git-workflow-phase2-completion](git-workflow-phase2-completion.md) | 35 | Not Started |
| 4 | [parallel-execution-dependencies](parallel-execution-dependencies.md) | 35 | Not Started |
| 5 | [git-workflow-phase3-safety](git-workflow-phase3-safety.md) | 46 | Not Started |
| 6 | [git-workflow-phase4-advanced](git-workflow-phase4-advanced.md) | 63 | Not Started |
| 7 | [git-workflow-phase5-worktrees](git-workflow-phase5-worktrees.md) | 84 | Not Started |

**Total: 319 tasks across 7 plans**

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

### 6. git-workflow-phase4-advanced
**Goal:** Advanced features for team workflows and automation.

**Delivers:**
- `/plan:complete --pr` creates GitHub PR
- Auto-sync to remote (configurable)
- Phase tags at completion
- `/plan:cleanup` for stale branches/tags
- `.claude/git-workflow.json` configuration
- Pre-merge conflict detection

**Dependencies:** Plans 2-3, 5 (builds on all prior git features)

---

### 7. git-workflow-phase5-worktrees
**Goal:** Enable parallel plan execution via git worktrees.

**Delivers:**
- Multiple plans running simultaneously
- `/plan:worktree create|list|remove|switch`
- Multi-orchestrator process management
- `--all-plans` aggregate status view
- REST API for frontend integration
- Multi-plan TUI interface
- Conflict detection between parallel plans

**Dependencies:** All prior plans (capstone feature)

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
parallel-execution-foundation (1)
    │
    ├──► git-workflow-phase1-core-branching (2)
    │        │
    │        └──► git-workflow-phase2-completion (3)
    │                 │
    │                 ├──► git-workflow-phase3-safety (5)
    │                 │        │
    │                 │        └──► git-workflow-phase4-advanced (6)
    │                 │                 │
    │                 │                 └──► git-workflow-phase5-worktrees (7)
    │                 │                              ▲
    └──► parallel-execution-dependencies (4) ───────┘
```

---

## Time Estimates

| Plan | Tasks | Est. Iterations | Est. Time |
|------|-------|-----------------|-----------|
| 1 | 30 | ~6 | ~1 hour |
| 2 | 26 | ~6 | ~1 hour |
| 3 | 35 | ~7 | ~1.5 hours |
| 4 | 35 | ~7 | ~1.5 hours |
| 5 | 46 | ~10 | ~2 hours |
| 6 | 63 | ~13 | ~2.5 hours |
| 7 | 84 | ~17 | ~3 hours |

**Total: ~12-15 hours of orchestrator runtime**

*Estimates assume ~5 tasks/iteration, ~10 min/iteration*

---

## Value Delivery Checkpoints

After each plan, you gain usable functionality:

| After Plan | You Can... |
|------------|------------|
| 1 | Run multiple CLI sessions safely, see file conflicts |
| 2 | Work on plans in isolated branches |
| 3 | Complete plans with clean merge commits |
| 4 | Get 30%+ speedup on complex plans |
| 5 | Safely rollback mistakes |
| 6 | Create PRs, sync to remote, configure behavior |
| 7 | Run multiple plans in parallel |

---

## Notes

- Plans can be paused and resumed at any time
- Each plan is independently valuable (no need to complete all 7)
- The orchestrator handles task failures with retry logic
- Progress is saved in `docs/plan-outputs/{plan-name}/status.json`
