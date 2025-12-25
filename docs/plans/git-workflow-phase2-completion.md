# Implementation Plan: Git Workflow Phase 2 - Automated Completion

## Overview

- **Goal:** Implement `/plan:complete` command with squash merge workflow
- **Priority:** P2
- **Created:** 2024-12-25
- **Output:** `docs/plan-outputs/git-workflow-phase2-completion/`

> Restructured 2024-12-25 for orchestrator isolation.

> Task findings are written to the `findings/` subdirectory. Use `/plan:status` to view progress.

## Dependencies

### Upstream
- **git-workflow-phase1-core-branching.md** - Provides branch-per-plan workflow and commit-per-task (must be complete)

### Downstream
- **git-workflow-phase3-safety.md** - Safety checks build on completion workflow
- **git-workflow-phase4-advanced.md** - Advanced features extend base completion
- **git-workflow-phase5-worktrees.md** - Parallel execution uses completion for each worktree

### External Tools
- Git (required for merge operations)

---

## Phase 1: Command Implementation

- [ ] 1.1 Create `/plan:complete` command file at `.claude/commands/plan/complete.md` with basic structure and usage documentation
- [ ] 1.2 Add pre-completion verification in `.claude/commands/plan/complete.md`:
  - [ ] 1.2.1 Check all tasks completed via `docs/plan-outputs/{plan}/status.json`
  - [ ] 1.2.2 Verify currently on plan branch using `git branch --show-current`
  - [ ] 1.2.3 Check for merge conflicts with main using dry-run merge
- [ ] 1.3 Add uncommitted changes handling in `.claude/commands/plan/complete.md`: commit any uncommitted changes with summary message
- [ ] 1.4 Add archive tag creation in `.claude/commands/plan/complete.md`: create tag `archive/plan-{name}` with timestamp annotation using `git tag -a archive/plan-{name} -m "Archive of plan {name} - $(date)"`
- [ ] 1.5 Add `--no-archive` option in `.claude/commands/plan/complete.md` to skip archive tag creation
- [ ] 1.6 Document command usage, options, and how to access archived history via tag in `.claude/commands/plan/complete.md`

**VERIFY Phase 1:**
- [ ] `test -f .claude/commands/plan/complete.md` returns 0 (file exists)
- [ ] `grep -c "status.json" .claude/commands/plan/complete.md` returns >= 1
- [ ] `grep -c "archive/plan-" .claude/commands/plan/complete.md` returns >= 1
- [ ] `grep -c "\-\-no-archive" .claude/commands/plan/complete.md` returns >= 1

---

## Phase 2: Squash Merge Workflow Implementation

- [ ] 2.1 Add switch to main branch step in `.claude/commands/plan/complete.md` using `git checkout main`
- [ ] 2.2 Add `--sync` option in `.claude/commands/plan/complete.md` to pull latest main using `git pull origin main`
- [ ] 2.3 Add squash merge step in `.claude/commands/plan/complete.md` using `git merge --squash plan/{name}`
- [ ] 2.4 Add merge commit creation in `.claude/commands/plan/complete.md` with plan summary message
- [ ] 2.5 Add plan branch cleanup in `.claude/commands/plan/complete.md` using `git branch -D plan/{name}`

**VERIFY Phase 2:**
- [ ] `grep -c "git checkout main" .claude/commands/plan/complete.md` returns >= 1
- [ ] `grep -c "git merge --squash" .claude/commands/plan/complete.md` returns >= 1
- [ ] `grep -c "\-\-sync" .claude/commands/plan/complete.md` returns >= 1
- [ ] `grep -c "git branch -D" .claude/commands/plan/complete.md` returns >= 1

---

## Phase 3: Merge Commit Message Format

- [ ] 3.1 Add merge commit message template in `.claude/commands/plan/complete.md` with header format
- [ ] 3.2 Add plan metadata to merge message in `.claude/commands/plan/complete.md`: task count, phase count, duration (calculated from `docs/plan-outputs/{plan}/status.json` timestamps)
- [ ] 3.3 Add phase summary to merge message in `.claude/commands/plan/complete.md`: name and task count per phase
- [ ] 3.4 Add archive tag reference to merge message in `.claude/commands/plan/complete.md`: `See archive/plan-{name} for individual commits`
- [ ] 3.5 Add outputs directory link to merge message in `.claude/commands/plan/complete.md`: `Outputs: docs/plan-outputs/{plan-name}/`
- [ ] 3.6 Add Claude Code attribution footer to merge message in `.claude/commands/plan/complete.md`: "Generated with Claude Code\n\nCo-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"

**VERIFY Phase 3:**
- [ ] `grep -c "task count" .claude/commands/plan/complete.md` returns >= 1
- [ ] `grep -c "phase count" .claude/commands/plan/complete.md` returns >= 1
- [ ] `grep -c "archive/plan-" .claude/commands/plan/complete.md` returns >= 1
- [ ] `grep -c "docs/plan-outputs/" .claude/commands/plan/complete.md` returns >= 1
- [ ] `grep -c "Co-Authored-By" .claude/commands/plan/complete.md` returns >= 1

---

## Phase 4: Merge Strategy Options

- [ ] 4.1 Add `--merge` option parser in `.claude/commands/plan/complete.md` supporting `squash`, `commit`, and `ff` values
- [ ] 4.2 Add `--merge squash` (default) implementation in `.claude/commands/plan/complete.md`: squash merge with single commit using `git merge --squash`
- [ ] 4.3 Add `--merge commit` implementation in `.claude/commands/plan/complete.md`: standard merge commit using `git merge --no-ff`, preserves history
- [ ] 4.4 Add `--merge ff` implementation in `.claude/commands/plan/complete.md`: fast-forward merge using `git merge --ff-only`
- [ ] 4.5 Document merge strategy guidance in `.claude/commands/plan/complete.md`: when to use each strategy (squash for clean history, commit for preserving granular commits, ff for linear history)

**VERIFY Phase 4:**
- [ ] `grep -c "\-\-merge squash" .claude/commands/plan/complete.md` returns >= 1
- [ ] `grep -c "\-\-merge commit" .claude/commands/plan/complete.md` returns >= 1
- [ ] `grep -c "\-\-merge ff" .claude/commands/plan/complete.md` returns >= 1
- [ ] `grep -c "git merge --no-ff" .claude/commands/plan/complete.md` returns >= 1
- [ ] `grep -c "git merge --ff-only" .claude/commands/plan/complete.md` returns >= 1

---

## Phase 5: Status Tracking Updates

- [ ] 5.1 Add status.json update step in `.claude/commands/plan/complete.md` that modifies `docs/plan-outputs/{plan}/status.json`
- [ ] 5.2 Add `completedAt` field with ISO timestamp to status.json update in `.claude/commands/plan/complete.md`
- [ ] 5.3 Add `mergedAt` field with ISO timestamp to status.json update in `.claude/commands/plan/complete.md`
- [ ] 5.4 Add `mergeCommit` field with merge commit SHA to status.json update in `.claude/commands/plan/complete.md`
- [ ] 5.5 Add `archiveTag` field with archive tag name to status.json update in `.claude/commands/plan/complete.md`
- [ ] 5.6 Document status.json final state format in `.claude/commands/plan/complete.md`

**VERIFY Phase 5:**
- [ ] `grep -c "completedAt" .claude/commands/plan/complete.md` returns >= 1
- [ ] `grep -c "mergedAt" .claude/commands/plan/complete.md` returns >= 1
- [ ] `grep -c "mergeCommit" .claude/commands/plan/complete.md` returns >= 1
- [ ] `grep -c "archiveTag" .claude/commands/plan/complete.md` returns >= 1
- [ ] `grep -c "status.json" .claude/commands/plan/complete.md` returns >= 2

---

## Success Criteria

- [ ] `/plan:complete` executes full workflow without errors
- [ ] Archive tag preserves all task commits
- [ ] Main branch shows single commit per plan (when using squash merge)
- [ ] Merge message includes useful metadata
- [ ] Plan branch deleted after successful merge
- [ ] Status.json updated with completion info

## Risks

- **Merge conflicts:** Mitigate with pre-merge check
- **Incomplete plans:** Mitigate with task completion verification
- **Lost history:** Mitigate with archive tags before merge
