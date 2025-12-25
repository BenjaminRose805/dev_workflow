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

- [ ] 1.1 Create `/plan:complete` command file at `.claude/commands/plan/complete.md` with complete implementation including:
  - Pre-completion verification: Check all tasks completed via status.json
  - Pre-completion verification: Verify currently on plan branch using `git branch --show-current`
  - Pre-completion verification: Check for merge conflicts with main using dry-run merge
  - Commit any uncommitted changes with summary message
  - Archive tag creation: Create tag `archive/plan-{name}` with timestamp annotation before merge using `git tag -a archive/plan-{name} -m "Archive of plan {name} - $(date)"`
  - Option `--no-archive` to skip archive tag creation
  - Document command usage, options, and how to access archived history via tag

**VERIFY Phase 1:**
- [ ] `test -f .claude/commands/plan/complete.md` returns 0 (file exists)
- [ ] `grep -c "status.json" .claude/commands/plan/complete.md` returns >= 1
- [ ] `grep -c "archive/plan-" .claude/commands/plan/complete.md` returns >= 1
- [ ] `grep -c "\-\-no-archive" .claude/commands/plan/complete.md` returns >= 1

---

## Phase 2: Squash Merge Workflow Implementation

- [ ] 2.1 In the `/plan:complete` command, implement the squash merge workflow with these steps:
  - Switch to main branch using `git checkout main`
  - Optional: Pull latest main with flag `--sync` using `git pull origin main`
  - Squash merge using `git merge --squash plan/{name}`
  - Generate and create merge commit with plan summary message
  - Delete plan branch using `git branch -D plan/{name}`

**VERIFY Phase 2:**
- [ ] `grep -c "git checkout main" .claude/commands/plan/complete.md` returns >= 1
- [ ] `grep -c "git merge --squash" .claude/commands/plan/complete.md` returns >= 1
- [ ] `grep -c "\-\-sync" .claude/commands/plan/complete.md` returns >= 1
- [ ] `grep -c "git branch -D" .claude/commands/plan/complete.md` returns >= 1

---

## Phase 3: Merge Commit Message Format

- [ ] 3.1 In the `/plan:complete` command, implement merge commit message generation with this format:
  - Plan metadata: task count, phase count, duration (calculated from status.json timestamps)
  - Phase summary: name and task count per phase
  - Link to archive tag for granular history: `See archive/plan-{name} for individual commits`
  - Link to outputs directory: `Outputs: docs/plan-outputs/{plan-name}/`
  - Claude Code attribution footer: "Generated with Claude Code\n\nCo-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"

**VERIFY Phase 3:**
- [ ] `grep -c "task count" .claude/commands/plan/complete.md` returns >= 1
- [ ] `grep -c "phase count" .claude/commands/plan/complete.md` returns >= 1
- [ ] `grep -c "archive/plan-" .claude/commands/plan/complete.md` returns >= 1
- [ ] `grep -c "docs/plan-outputs/" .claude/commands/plan/complete.md` returns >= 1
- [ ] `grep -c "Co-Authored-By" .claude/commands/plan/complete.md` returns >= 1

---

## Phase 4: Merge Strategy Options

- [ ] 4.1 In the `/plan:complete` command, implement merge strategy options:
  - `--merge squash` (default): Squash merge with single commit using `git merge --squash`
  - `--merge commit`: Standard merge commit using `git merge --no-ff`, preserves history
  - `--merge ff`: Fast-forward merge if possible using `git merge --ff-only`
  - Document when to use each strategy (squash for clean history, commit for preserving granular commits, ff for linear history)

**VERIFY Phase 4:**
- [ ] `grep -c "\-\-merge squash" .claude/commands/plan/complete.md` returns >= 1
- [ ] `grep -c "\-\-merge commit" .claude/commands/plan/complete.md` returns >= 1
- [ ] `grep -c "\-\-merge ff" .claude/commands/plan/complete.md` returns >= 1
- [ ] `grep -c "git merge --no-ff" .claude/commands/plan/complete.md` returns >= 1
- [ ] `grep -c "git merge --ff-only" .claude/commands/plan/complete.md` returns >= 1

---

## Phase 5: Status Tracking Updates

- [ ] 5.1 In the `/plan:complete` command, implement status.json updates:
  - Add `completedAt` field with ISO timestamp
  - Add `mergedAt` field with ISO timestamp
  - Record merge commit SHA in `mergeCommit` field
  - Record archive tag name in `archiveTag` field
  - Ensure status.json reflects completion state correctly

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
