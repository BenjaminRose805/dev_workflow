# Implementation Plan: Git Workflow Phase 1 - Core Branching

## Overview
- **Objective:** Enable branch-per-plan workflow with commit-per-task enforcement
- **Dependencies:** None (foundation phase)
- **Builds On:** Existing `/plan:implement` commit step
- **Created:** 2024-12-25
- **Output:** `docs/plan-outputs/git-workflow-phase1-core-branching/`

> Task findings are written to the `findings/` subdirectory. Use `/plan:status` to view progress.

## Phase 1: Branch Management in /plan:set

- [ ] 1.1 Read current `/plan:set` command and understand its workflow
- [ ] 1.2 Add git branch check: does `plan/{plan-name}` exist?
- [ ] 1.3 If branch doesn't exist, create it: `git checkout -b plan/{plan-name}`
- [ ] 1.4 If branch exists, switch to it: `git checkout plan/{plan-name}`
- [ ] 1.5 Add uncommitted changes detection before branch switch
- [ ] 1.6 Present options when uncommitted changes exist: Commit, Stash, Cancel
- [ ] 1.7 Record branch name in status.json metadata
- [ ] **VERIFY 1**: `/plan:set` creates and switches branches correctly

## Phase 2: Branch Validation in /plan:implement

- [ ] 2.1 Add branch validation at start of `/plan:implement`
- [ ] 2.2 Check if currently on expected `plan/{plan-name}` branch
- [ ] 2.3 If on wrong branch, warn user and offer to switch
- [ ] 2.4 If not on any plan branch, warn but allow continue (backwards compat)
- [ ] 2.5 Update the existing commit step to include plan/phase in commit body
- [ ] **VERIFY 2**: `/plan:implement` validates branch and creates proper commits

## Phase 3: Git Utilities

- [ ] 3.1 Create git utility functions documentation in status-tracking.md
- [ ] 3.2 Document `getCurrentBranch()` pattern (use `git branch --show-current`)
- [ ] 3.3 Document `isOnPlanBranch()` pattern (check prefix `plan/`)
- [ ] 3.4 Document `getPlanBranchName(planName)` pattern
- [ ] 3.5 Document `hasUncommittedChanges()` pattern (use `git status --porcelain`)
- [ ] **VERIFY 3**: Utility patterns documented and usable by commands

## Phase 4: Status Display Updates

- [ ] 4.1 Update `/plan:status` to show current git branch
- [ ] 4.2 Show uncommitted changes count in status output
- [ ] 4.3 Show commit count for current plan branch
- [ ] 4.4 Show last commit SHA and message (abbreviated)
- [ ] 4.5 Add git info to `node scripts/status-cli.js progress` output
- [ ] **VERIFY 4**: Status displays git information correctly

## Phase 5: Integration Testing

- [ ] 5.1 Test full workflow: set plan → implement tasks → verify commits exist
- [ ] 5.2 Test branch switching between plans
- [ ] 5.3 Test uncommitted changes handling
- [ ] 5.4 Test backwards compatibility (running without git or outside repo)
- [ ] **VERIFY 5**: All integration tests pass

## Success Criteria

- [ ] `/plan:set my-plan` creates branch `plan/my-plan`
- [ ] Subsequent `/plan:set my-plan` switches to existing branch
- [ ] Uncommitted changes trigger warning before switch
- [ ] Every task creates exactly one commit with proper format
- [ ] `/plan:status` shows git branch and commit info
- [ ] Works gracefully when git unavailable

## Dependencies

- Existing `/plan:set` command
- Existing `/plan:implement` command with commit step
- Git installed and repository initialized

## Risks

- **Branch naming conflicts:** Mitigate with validation
- **Uncommitted changes lost:** Mitigate with detection and prompts
- **Non-git environments:** Mitigate with graceful fallback
