# Implementation Plan: Git Workflow Phase 3 - Safety & Rollback

## Overview

- **Goal:** Implement rollback commands and safety mechanisms
- **Priority:** P2
- **Created:** 2024-12-25
- **Restructured:** 2024-12-25 (consolidated for orchestrator isolation)
- **Output:** `docs/plan-outputs/git-workflow-phase3-safety/`

> Task findings are written to the `findings/` subdirectory. Use `/plan:status` to view progress.

## Phase 1: Create /plan:rollback Command

- [ ] 1.1 Create complete `/plan:rollback` command at `.claude/commands/plan/rollback.md` with three subcommands (`task`, `phase`, `plan`), argument parsing for rollback targets, and comprehensive documentation including usage examples for each subcommand type

**VERIFY Phase 1:**
- [ ] `test -f .claude/commands/plan/rollback.md && echo "exists"` returns "exists"
- [ ] `grep -c "task\|phase\|plan" .claude/commands/plan/rollback.md` returns >= 6 (subcommands documented)
- [ ] `grep -c "## Usage\|## Example" .claude/commands/plan/rollback.md` returns >= 1

---

## Phase 2: Task-Level Rollback

- [ ] 2.1 Implement task-level rollback functionality in `.claude/commands/plan/rollback.md` for the `task` subcommand: locate task commit using `git log --grep="task {id}:" --format="%H" -1`, revert it using `git revert <sha> --no-edit`, update `docs/plan-outputs/{plan}/status.json` to mark task as `rolled_back` or `pending`, and handle edge cases (task commit not found: report error and exit; analysis-only tasks with no commits: mark status only without git revert)

**VERIFY Phase 2:**
- [ ] `grep -c "git log --grep" .claude/commands/plan/rollback.md` returns >= 1
- [ ] `grep -c "git revert" .claude/commands/plan/rollback.md` returns >= 1
- [ ] `grep -c "rolled_back\|pending" .claude/commands/plan/rollback.md` returns >= 1

---

## Phase 3: Phase-Level Rollback

- [ ] 3.1 Implement phase-level rollback functionality in `.claude/commands/plan/rollback.md` for the `phase` subcommand: detect phase commit range by finding first and last commits for the phase using git log, revert the range using `git revert <first>..<last> --no-edit`, update `docs/plan-outputs/{plan}/status.json` for all tasks in the phase, and handle partial phases (tasks without commits: update status only; mixed committed/uncommitted: revert what exists and log skipped tasks)

**VERIFY Phase 3:**
- [ ] `grep -c "phase" .claude/commands/plan/rollback.md` returns >= 3
- [ ] `grep -c "range\|first.*last" .claude/commands/plan/rollback.md` returns >= 1
- [ ] Phase rollback section documents partial phase handling

---

## Phase 4: Plan-Level Rollback

- [ ] 4.1 Implement plan-level rollback functionality in `.claude/commands/plan/rollback.md` for the `plan` subcommand: for unmerged plans, require `--force` flag to delete the plan branch (abort without flag and display warning); for merged plans, locate merge commit using `git log --grep="Plan: {name}" --format="%H" -1`, revert it using `git revert <sha> --no-edit`, and update `docs/plan-outputs/{plan}/status.json` appropriately

**VERIFY Phase 4:**
- [ ] `grep -c "unmerged\|merged" .claude/commands/plan/rollback.md` returns >= 2
- [ ] `grep -c "branch" .claude/commands/plan/rollback.md` returns >= 1
- [ ] Plan rollback section covers both merged and unmerged scenarios

---

## Phase 5: Create /plan:abandon Command

- [ ] 5.1 Create complete `/plan:abandon` command at `.claude/commands/plan/abandon.md` that safely abandons a plan: require `--force` flag for destructive operations (abort and display warning without flag), create backup tag using pattern `backup/plan-{name}-{timestamp}` unless `--no-backup` flag is provided, switch to main branch and delete plan branch, update `docs/plan-outputs/{plan}/status.json` with abandoned state, and handle uncommitted changes (stash automatically with message `plan/{name} WIP - auto-stash before abandon`)

**VERIFY Phase 5:**
- [ ] `test -f .claude/commands/plan/abandon.md && echo "exists"` returns "exists"
- [ ] `grep -c "force\|--force" .claude/commands/plan/abandon.md` returns >= 1
- [ ] `grep -c "backup" .claude/commands/plan/abandon.md` returns >= 1
- [ ] `grep -c "abandoned" .claude/commands/plan/abandon.md` returns >= 1

---

## Phase 6: Uncommitted Changes Protection

- [ ] 6.1 Implement standardized uncommitted changes detection and protection in `.claude/commands/plan/set.md`, `.claude/commands/plan/complete.md`, and `.claude/commands/plan/abandon.md`: detect uncommitted changes using `git status --porcelain`, auto-stash changes using `git stash push -m "plan/{name} WIP"` before branch operations, auto-apply stash after successful branch switch using `git stash pop`, and abort with clear error message if stash operations fail (never silently lose changes)

**VERIFY Phase 6:**
- [ ] `grep -c "stash" .claude/commands/plan/set.md` returns >= 1
- [ ] `grep -c "stash" .claude/commands/plan/complete.md` returns >= 1
- [ ] `grep -c "stash" .claude/commands/plan/abandon.md` returns >= 1
- [ ] All three commands document auto-stash behavior

---

## Phase 7: Branch Validation Enhancement

- [ ] 7.1 Add comprehensive branch validation to `.claude/commands/plan/batch.md`: check if user is on correct plan branch before execution using `git rev-parse --abbrev-ref HEAD`, auto-switch to correct branch using `git checkout plan/{name}` when on wrong branch, add `--no-branch-check` flag to override validation, and provide clear error messages explaining branch issues and how to resolve them

**VERIFY Phase 7:**
- [ ] `grep -c "branch" .claude/commands/plan/batch.md` returns >= 2
- [ ] `grep -c "no-branch-check\|--no-branch-check" .claude/commands/plan/batch.md` returns >= 1
- [ ] Branch validation section includes automatic switch behavior

---

## Phase 8: Pre-commit Hook Template

- [ ] 8.1 Create complete pre-commit hook template at `.githooks/pre-commit`: implement warning when committing directly to main branch, add check for plan branch naming pattern, include `--no-verify` bypass mechanism, and document hook installation process and usage in README or appropriate documentation

**VERIFY Phase 8:**
- [ ] `test -f .githooks/pre-commit && echo "exists"` returns "exists"
- [ ] `grep -c "main\|master" .githooks/pre-commit` returns >= 1
- [ ] `grep -c "plan/" .githooks/pre-commit` returns >= 1
- [ ] `test -x .githooks/pre-commit && echo "executable"` returns "executable"

---

## Phase 9: Integration Testing

- [ ] 9.1 Perform comprehensive integration testing of all rollback scenarios: test task rollback during plan execution, test phase rollback, test plan rollback for both unmerged and merged states, test abandon command with backup tag creation, and test uncommitted changes protection across all relevant scenarios

**VERIFY Phase 9:**
- [ ] Task rollback test passes (revert single task, verify status.json updated)
- [ ] Phase rollback test passes (revert multiple tasks in phase)
- [ ] Plan rollback test passes for unmerged plan (branch deleted)
- [ ] Plan rollback test passes for merged plan (merge commit reverted)
- [ ] Abandon with backup test passes (backup tag created)
- [ ] Uncommitted changes protection test passes (no silent data loss)

---

## Success Criteria

- [ ] `/plan:rollback task X` reverts single task commit
- [ ] `/plan:rollback phase N` reverts entire phase
- [ ] `/plan:rollback plan` handles both merged and unmerged
- [ ] `/plan:abandon` safely discards plan with optional backup
- [ ] Uncommitted changes protected in all scenarios
- [ ] Pre-commit hook template available

## Dependencies

### Upstream
- **git-workflow-phase1-core-branching.md** - Provides branch-per-plan workflow and commit-per-task (must be complete)
- **git-workflow-phase2-completion.md** - Provides `/plan:complete` squash merge workflow (must be complete)

### Downstream
- **git-workflow-phase4-advanced.md** - Advanced features extend safety mechanisms
- **git-workflow-phase5-worktrees.md** - Parallel execution uses rollback for error recovery

### External Tools
- Git (required for revert and rollback operations)

## Risks

- **Revert conflicts:** Document manual resolution
- **Lost work on abandon:** Mitigate with backup tags
- **Hook installation issues:** Document clearly
