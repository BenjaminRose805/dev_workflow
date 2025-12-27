# Implementation Plan: Git Workflow Phase 2 - Automated Completion

## Overview

- **Goal:** Implement `/plan:complete` command with squash merge workflow
- **Priority:** P2
- **Created:** 2024-12-25
- **Output:** `docs/plan-outputs/git-workflow-phase2-completion/`

> Restructured 2024-12-25 for orchestrator isolation. Each task is self-contained and can run in a fresh session.

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

## Phase 1: Command Creation and Pre-checks

**Execution Note:** Tasks 1.1-1.3 are [SEQUENTIAL] - all create/modify `.claude/commands/plan/complete.md`

- [ ] 1.1 Create `/plan:complete` command with pre-completion verification
  - Check if `.claude/commands/plan/complete.md` exists first
  - Create new file with command header and usage: `/plan:complete [options]`
  - Add step to load `docs/plan-outputs/{plan}/status.json` and verify all tasks completed (abort if incomplete)
  - Add step to verify currently on `plan/{plan-name}` branch with `git branch --show-current` (warn if not)
  - Add merge conflict pre-check: dry-run merge with `git merge --no-commit --no-ff main` then `git merge --abort`
  - If conflicts detected: abort with message showing conflicting files

- [ ] 1.2 Add uncommitted changes handling and archive tags to `.claude/commands/plan/complete.md`
  - Read `.claude/commands/plan/complete.md` to see current state
  - Add uncommitted changes handling: check with `git status --porcelain`, commit if any exist with summary message
  - Add archive tag creation: `git tag -a archive/plan-{name} -m "Archive: {name} - $(date)"`
  - Add `--no-archive` option to skip archive tag creation
  - Document both options in usage section

- [ ] 1.3 Verify Phase 1 command creation
  - Verify file exists: `test -f .claude/commands/plan/complete.md`
  - Verify status check: `grep -c "status.json" .claude/commands/plan/complete.md` >= 1
  - Verify archive tag: `grep -c "archive/plan-" .claude/commands/plan/complete.md` >= 1
  - Verify --no-archive: `grep -c "\-\-no-archive" .claude/commands/plan/complete.md` >= 1
  - Document results in `docs/plan-outputs/git-workflow-phase2-completion/findings/1.3.md`

---

## Phase 2: Squash Merge Implementation

**Execution Note:** Tasks 2.1-2.2 are [SEQUENTIAL] - all modify `.claude/commands/plan/complete.md`

- [ ] 2.1 Add squash merge workflow to `.claude/commands/plan/complete.md`
  - Read `.claude/commands/plan/complete.md` to see current state
  - Add switch to main branch: `git checkout main` (handle failure)
  - Add `--sync` option: if set, run `git pull origin main` after checkout (handle failure)
  - Add squash merge step: `git merge --squash plan/{name}` (handle failure with helpful message)
  - Add plan branch cleanup after successful merge: `git branch -D plan/{name}`
  - Document `--sync` option in usage section

- [ ] 2.2 Verify Phase 2 squash merge
  - Verify checkout main: `grep -c "git checkout main" .claude/commands/plan/complete.md` >= 1
  - Verify squash: `grep -c "git merge --squash" .claude/commands/plan/complete.md` >= 1
  - Verify --sync: `grep -c "\-\-sync" .claude/commands/plan/complete.md` >= 1
  - Verify branch delete: `grep -c "git branch -D" .claude/commands/plan/complete.md` >= 1
  - Document results in `docs/plan-outputs/git-workflow-phase2-completion/findings/2.2.md`

---

## Phase 3: Merge Commit Message Format

**Execution Note:** Tasks 3.1-3.2 are [SEQUENTIAL] - all modify `.claude/commands/plan/complete.md`

- [ ] 3.1 Add comprehensive merge commit message to `.claude/commands/plan/complete.md`
  - Read `.claude/commands/plan/complete.md` to see current state
  - Add commit header template: `Complete: {plan-name}`
  - Add plan metadata to body: task count, phase count, duration (from status.json timestamps)
  - Add phase summary: list each phase name with task count
  - Add archive tag reference: `See archive/plan-{name} for individual commits` (only if tag created)
  - Add outputs directory link: `Outputs: docs/plan-outputs/{plan-name}/`
  - Add Claude Code attribution footer: "🤖 Generated with Claude Code" and "Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
  - Use heredoc for multi-line commit message

- [ ] 3.2 Verify Phase 3 commit message format
  - Verify metadata: `grep -c "task count\|duration" .claude/commands/plan/complete.md` >= 1
  - Verify archive ref: `grep -c "archive/plan-" .claude/commands/plan/complete.md` >= 2
  - Verify outputs link: `grep -c "docs/plan-outputs/" .claude/commands/plan/complete.md` >= 1
  - Verify attribution: `grep -c "Co-Authored-By" .claude/commands/plan/complete.md` >= 1
  - Document results in `docs/plan-outputs/git-workflow-phase2-completion/findings/3.2.md`

---

## Phase 4: Merge Strategy Options

**Execution Note:** Tasks 4.1-4.2 are [SEQUENTIAL] - all modify `.claude/commands/plan/complete.md`

- [ ] 4.1 Add merge strategy options to `.claude/commands/plan/complete.md`
  - Read `.claude/commands/plan/complete.md` to see current state
  - Add `--merge <strategy>` option parser with values: `squash` (default), `commit`, `ff`
  - Implement `--merge squash`: use existing squash merge (default)
  - Implement `--merge commit`: use `git merge --no-ff plan/{name}` to preserve individual history
  - Implement `--merge ff`: use `git merge --ff-only plan/{name}` (fail if not possible)
  - Add strategy guidance section explaining when to use each

- [ ] 4.2 Verify Phase 4 merge strategies
  - Verify --merge option: `grep -c "\-\-merge" .claude/commands/plan/complete.md` >= 3
  - Verify no-ff: `grep -c "git merge --no-ff" .claude/commands/plan/complete.md` >= 1
  - Verify ff-only: `grep -c "git merge --ff-only" .claude/commands/plan/complete.md` >= 1
  - Document results in `docs/plan-outputs/git-workflow-phase2-completion/findings/4.2.md`

---

## Phase 5: Status Tracking Updates

**Execution Note:** Tasks 5.1-5.2 are [SEQUENTIAL] - all modify `.claude/commands/plan/complete.md`

- [ ] 5.1 Add status.json completion updates to `.claude/commands/plan/complete.md`
  - Read `.claude/commands/plan/complete.md` to see current state
  - After successful merge, update `docs/plan-outputs/{plan}/status.json`
  - Add fields: `completedAt` (ISO timestamp), `mergedAt` (ISO timestamp)
  - Add fields: `mergeCommit` (SHA from `git rev-parse HEAD`), `archiveTag` (tag name or null)
  - Add documentation section showing final status.json structure

- [ ] 5.2 Verify Phase 5 status tracking
  - Verify completedAt: `grep -c "completedAt" .claude/commands/plan/complete.md` >= 1
  - Verify mergedAt: `grep -c "mergedAt" .claude/commands/plan/complete.md` >= 1
  - Verify mergeCommit: `grep -c "mergeCommit" .claude/commands/plan/complete.md` >= 1
  - Verify archiveTag: `grep -c "archiveTag" .claude/commands/plan/complete.md` >= 1
  - Document results in `docs/plan-outputs/git-workflow-phase2-completion/findings/5.2.md`

---

## Phase 6: Integration Testing

- [ ] 6.1 Execute comprehensive integration tests for `/plan:complete`
  - Create test document at `docs/plan-outputs/git-workflow-phase2-completion/findings/6.1.md`
  - Test basic completion: create test plan, complete all tasks, run `/plan:complete`, verify archive tag, branch merged, branch deleted
  - Test merge strategies: test each of `--merge squash`, `--merge commit`, `--merge ff`, verify expected git history
  - Test --no-archive: verify no archive tag created, status.json has `archiveTag: null`
  - Test error conditions: incomplete tasks (abort), merge conflicts (abort), not on plan branch (warn/switch)
  - Create summary checklist with PASS/FAIL for each test case
  - Document actual command outputs

---

## Success Criteria

- `/plan:complete` executes full workflow without errors
- Archive tag preserves all task commits
- Main branch shows single commit per plan (when using squash merge)
- Merge message includes useful metadata
- Plan branch deleted after successful merge
- Status.json updated with completion info

## Risks

- **Merge conflicts:** Mitigate with pre-merge check
- **Incomplete plans:** Mitigate with task completion verification
- **Lost history:** Mitigate with archive tags before merge
