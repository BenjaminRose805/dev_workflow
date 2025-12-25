# Implementation Plan: Git Workflow Phase 3 - Safety & Rollback

## Overview

- **Goal:** Implement rollback commands and safety mechanisms
- **Priority:** P2
- **Created:** 2024-12-25
- **Restructured:** 2024-12-25 (for orchestrator isolation - each task self-contained)
- **Output:** `docs/plan-outputs/git-workflow-phase3-safety/`

> Task findings are written to the `findings/` subdirectory. Use `/plan:status` to view progress.

## Dependencies

### Upstream
- **git-workflow-phase1-core-branching.md** - Provides branch-per-plan workflow and commit-per-task (must be complete)
- **git-workflow-phase2-completion.md** - Provides `/plan:complete` squash merge workflow (must be complete)

### Downstream
- **git-workflow-phase4-advanced.md** - Advanced features extend safety mechanisms
- **git-workflow-phase5-worktrees.md** - Parallel execution uses rollback for error recovery

### External Tools
- Git (required for revert and rollback operations)

---

## Phase 1: Create /plan:rollback Command

**Execution Note:** Tasks 1.1-1.2 are [SEQUENTIAL] - all create/modify `.claude/commands/plan/rollback.md`

- [ ] 1.1 Create `/plan:rollback` command with task-level rollback
  - Check if `.claude/commands/plan/rollback.md` exists first
  - Create new file with command header and usage: `/plan:rollback <task|phase|plan> <target>`
  - Document all three subcommands: `task X.Y`, `phase N`, `plan [--force]`
  - Implement task-level rollback: locate commit with `git log --grep="task {id}:" --format="%H" -1`
  - Revert commit: `git revert <sha> --no-edit`
  - Update `docs/plan-outputs/{plan}/status.json` to mark task as `rolled_back` or `pending`
  - Handle edge cases: task commit not found (error), analysis-only tasks (status update only)

- [ ] 1.2 Add phase and plan rollback to `.claude/commands/plan/rollback.md`
  - Read `.claude/commands/plan/rollback.md` to see current state
  - Add phase rollback: detect commit range for phase, revert with `git revert <first>..<last> --no-edit`
  - Update all tasks in phase in status.json, handle partial phases (tasks without commits)
  - Add plan rollback: detect if merged or unmerged
  - For unmerged: require `--force`, delete branch with `git branch -D plan/{name}`
  - For merged: find merge commit with `git log --grep="Plan: {name}" --format="%H" -1`, revert it
  - Update status.json appropriately for both cases

---

## Phase 2: Create /plan:abandon Command

**Execution Note:** Tasks 2.1-2.2 are [SEQUENTIAL] - all create/modify `.claude/commands/plan/abandon.md`

- [ ] 2.1 Create `/plan:abandon` command
  - Check if `.claude/commands/plan/abandon.md` exists first
  - Create new file with command header and usage: `/plan:abandon [--force] [--no-backup]`
  - Require `--force` flag for destructive operation (abort without it, show warning)
  - Create backup tag: `backup/plan-{name}-{timestamp}` (unless `--no-backup`)
  - Handle uncommitted changes: detect with `git status --porcelain`, auto-stash with message
  - Switch to main: `git checkout main`
  - Delete plan branch: `git branch -D plan/{name}`
  - Update status.json with `abandoned` status and `abandonedAt` timestamp

- [ ] 2.2 Verify rollback and abandon commands
  - Verify rollback file: `test -f .claude/commands/plan/rollback.md`
  - Verify rollback has all subcommands: `grep -c "task\|phase\|plan" .claude/commands/plan/rollback.md` >= 6
  - Verify rollback has git operations: `grep -c "git log\|git revert" .claude/commands/plan/rollback.md` >= 2
  - Verify abandon file: `test -f .claude/commands/plan/abandon.md`
  - Verify abandon has --force and backup: `grep -c "force\|backup" .claude/commands/plan/abandon.md` >= 2
  - Document results in `docs/plan-outputs/git-workflow-phase3-safety/findings/2.2.md`

---

## Phase 3: Uncommitted Changes Protection

- [ ] 3.1 Add stash protection to `/plan:set` and `/plan:complete`
  - Read `.claude/commands/plan/set.md` and add uncommitted changes detection: `git status --porcelain`
  - Add auto-stash: `git stash push -m "plan/{name} WIP"`, auto-apply after switch: `git stash pop`
  - Handle stash failures (abort with message, never lose data)
  - Read `.claude/commands/plan/complete.md` and add uncommitted changes handling before merge
  - Commit any uncommitted changes before proceeding with merge
  - Verify stash handling exists in `.claude/commands/plan/abandon.md` (added in 2.1)
  - Document behavior changes in each file

---

## Phase 4: Branch Validation for Batch

- [ ] 4.1 Add branch validation to `/plan:batch`
  - Read `.claude/commands/plan/batch.md` to understand current implementation
  - Document current state in `docs/plan-outputs/git-workflow-phase3-safety/findings/4.1.md`
  - Add branch check: get current branch with `git rev-parse --abbrev-ref HEAD`
  - Compare against expected `plan/{name}`, auto-switch if on wrong branch
  - Add `--no-branch-check` flag to skip validation
  - Document the flag in usage section

---

## Phase 5: Pre-commit Hook Template

- [ ] 5.1 Create pre-commit hook template
  - Create `.githooks/` directory if it doesn't exist
  - Create `.githooks/pre-commit` with shebang `#!/bin/bash`
  - Add check for main/master branch commits (show warning, exit 0 to allow)
  - Add check for plan branch pattern (info message if not on plan branch)
  - Make executable: `chmod +x .githooks/pre-commit`
  - Create `.githooks/README.md` documenting installation: `git config core.hooksPath .githooks`
  - Document `--no-verify` bypass option

---

## Phase 6: Integration Testing

- [ ] 6.1 Execute comprehensive safety mechanism tests
  - Create test document at `docs/plan-outputs/git-workflow-phase3-safety/findings/6.1.md`
  - Test task rollback: complete a task, run `/plan:rollback task X.Y`, verify commit reverted, status updated
  - Test phase rollback: complete phase, run `/plan:rollback phase N`, verify all commits reverted
  - Test plan rollback (unmerged): create branch with commits, run `/plan:rollback plan --force`, verify branch deleted
  - Test abandon: create plan with work, run `/plan:abandon --force`, verify backup tag, branch deleted
  - Test uncommitted changes protection: make changes, switch plans, verify stash and no data loss
  - Verify pre-commit hook works: install hook, commit to main, verify warning shown
  - Create summary checklist with PASS/FAIL for each test case

---

## Success Criteria

- `/plan:rollback task X` reverts single task commit
- `/plan:rollback phase N` reverts entire phase
- `/plan:rollback plan` handles both merged and unmerged
- `/plan:abandon` safely discards plan with optional backup
- Uncommitted changes protected in all scenarios
- Pre-commit hook template available

## Risks

- **Revert conflicts:** Document manual resolution
- **Lost work on abandon:** Mitigate with backup tags
- **Hook installation issues:** Document clearly
