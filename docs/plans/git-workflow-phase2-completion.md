# Implementation Plan: Git Workflow Phase 2 - Automated Completion

## Overview
- **Objective:** Implement `/plan:complete` command with squash merge workflow
- **Dependencies:** Phase 1 (Core Branching) must be complete
- **Created:** 2024-12-25
- **Restructured:** 2024-12-25 (consolidated for orchestrator isolation)
- **Output:** `docs/plan-outputs/git-workflow-phase2-completion/`

> Task findings are written to the `findings/` subdirectory. Use `/plan:status` to view progress.

## Phase 1: Command Implementation

- [ ] 1.1 Create `/plan:complete` command file at `.claude/commands/plan/complete.md` with complete implementation including:
  - Pre-completion verification: Check all tasks completed via status.json
  - Pre-completion verification: Verify currently on plan branch using `git branch --show-current`
  - Pre-completion verification: Check for merge conflicts with main using dry-run merge
  - Commit any uncommitted changes with summary message
  - Archive tag creation: Create tag `archive/plan-{name}` with timestamp annotation before merge using `git tag -a archive/plan-{name} -m "Archive of plan {name} - $(date)"`
  - Option `--no-archive` to skip archive tag creation
  - Document command usage, options, and how to access archived history via tag

## Phase 2: Squash Merge Workflow Implementation

- [ ] 2.1 In the `/plan:complete` command, implement the squash merge workflow with these steps:
  - Switch to main branch using `git checkout main`
  - Optional: Pull latest main with flag `--sync` using `git pull origin main`
  - Squash merge using `git merge --squash plan/{name}`
  - Generate and create merge commit with plan summary message
  - Delete plan branch using `git branch -D plan/{name}`

## Phase 3: Merge Commit Message Format

- [ ] 3.1 In the `/plan:complete` command, implement merge commit message generation with this format:
  - Plan metadata: task count, phase count, duration (calculated from status.json timestamps)
  - Phase summary: name and task count per phase
  - Link to archive tag for granular history: `See archive/plan-{name} for individual commits`
  - Link to outputs directory: `Outputs: docs/plan-outputs/{plan-name}/`
  - Claude Code attribution footer: "Generated with Claude Code\n\nCo-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"

## Phase 4: Merge Strategy Options

- [ ] 4.1 In the `/plan:complete` command, implement merge strategy options:
  - `--merge squash` (default): Squash merge with single commit using `git merge --squash`
  - `--merge commit`: Standard merge commit using `git merge --no-ff`, preserves history
  - `--merge ff`: Fast-forward merge if possible using `git merge --ff-only`
  - Document when to use each strategy (squash for clean history, commit for preserving granular commits, ff for linear history)

## Phase 5: Status Tracking Updates

- [ ] 5.1 In the `/plan:complete` command, implement status.json updates:
  - Add `completedAt` field with ISO timestamp
  - Add `mergedAt` field with ISO timestamp
  - Record merge commit SHA in `mergeCommit` field
  - Record archive tag name in `archiveTag` field
  - Ensure status.json reflects completion state correctly

## Success Criteria

- [ ] `/plan:complete` executes full workflow without errors
- [ ] Archive tag preserves all task commits
- [ ] Main branch shows single commit per plan (when using squash merge)
- [ ] Merge message includes useful metadata
- [ ] Plan branch deleted after successful merge
- [ ] Status.json updated with completion info

## Dependencies

- Phase 1 complete (branching and commits working)
- Git repository with main branch
- All plan tasks completed before running

## Risks

- **Merge conflicts:** Mitigate with pre-merge check
- **Incomplete plans:** Mitigate with task completion verification
- **Lost history:** Mitigate with archive tags before merge
