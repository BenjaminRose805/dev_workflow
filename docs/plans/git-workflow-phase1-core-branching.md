# Implementation Plan: Git Workflow Phase 1 - Core Branching

## Overview
- **Objective:** Enable branch-per-plan workflow with commit-per-task enforcement
- **Dependencies:** None (foundation phase)
- **Builds On:** Existing `/plan:implement` commit step
- **Created:** 2024-12-25
- **Restructured:** 2024-12-25 (consolidated for orchestrator isolation)
- **Output:** `docs/plan-outputs/git-workflow-phase1-core-branching/`

> Task findings are written to the `findings/` subdirectory. Use `/plan:status` to view progress.

## Dependencies

### Upstream
- None (foundation phase)

### Downstream
- **git-workflow-phase2-completion.md** - Merge workflow and branch cleanup
- **git-workflow-phase3-safety.md** - Safety checks and rollback mechanisms
- **git-workflow-phase4-advanced.md** - Advanced features (stash, cherry-pick)
- **git-workflow-phase5-worktrees.md** - Parallel worktree execution

### External Tools
- Git (required for all branch operations)

---

## Phase 1: Branch Management in /plan:set

- [ ] 1.1 Implement complete branch management in `/plan:set` command
  - Read current `/plan:set` command implementation to understand its workflow
  - Add git branch detection to check if `plan/{plan-name}` branch exists using `git rev-parse --verify plan/{plan-name}`
  - If branch doesn't exist, create it with `git checkout -b plan/{plan-name}`
  - If branch exists, switch to it with `git checkout plan/{plan-name}`
  - Implement uncommitted changes detection before any branch switch using `git status --porcelain`
  - When uncommitted changes are detected, present interactive options: Commit, Stash, or Cancel
  - Record the branch name in status.json metadata under a "branch" field
  - Ensure graceful handling when git is unavailable (detect with `git --version` check)

## Phase 2: Branch Validation in /plan:implement

- [ ] 2.1 Add branch validation and enhanced commit formatting to `/plan:implement` command
  - At the start of `/plan:implement`, add branch validation logic
  - Check if currently on expected `plan/{plan-name}` branch using `git branch --show-current`
  - If on wrong plan branch, warn user and offer to switch to correct branch
  - If not on any plan branch (no `plan/` prefix), warn but allow continue for backwards compatibility
  - Update the existing commit step to include plan name and phase information in the commit body
  - Commit message format should be: `[plan-name] Task X.Y: <description>` with plan/phase metadata in body
  - Ensure all git operations handle non-git environments gracefully

## Phase 3: Git Utilities Documentation

- [ ] 3.1 Create comprehensive git utility patterns documentation in status-tracking.md
  - Document `getCurrentBranch()` pattern: use `git branch --show-current`
  - Document `isOnPlanBranch()` pattern: check if branch name has `plan/` prefix
  - Document `getPlanBranchName(planName)` pattern: return `plan/{planName}` format
  - Document `hasUncommittedChanges()` pattern: use `git status --porcelain` and check for non-empty output
  - Document `branchExists(branchName)` pattern: use `git rev-parse --verify` or `git branch --list`
  - Include code examples for each pattern showing how to call git commands via child_process
  - Add error handling patterns for when git is not available
  - Document how to parse git command outputs reliably

## Phase 4: Status Display Updates

- [ ] 4.1 Enhance `/plan:status` and CLI status to display git information
  - Update `/plan:status` skill to show current git branch at the top of output
  - Add uncommitted changes count using `git status --porcelain | wc -l`
  - Show commit count for current plan branch using `git rev-list --count HEAD ^master`
  - Display last commit SHA (abbreviated to 7 chars) and message using `git log -1 --format="%h %s"`
  - Update `node scripts/status-cli.js progress` to include the same git information
  - Format git info section clearly with labels like "Branch:", "Uncommitted:", "Commits:", "Last:"
  - Handle non-git environments by showing "N/A" or omitting git section entirely
  - Ensure performance remains good by caching git queries where appropriate

## Phase 5: Integration Testing

- [ ] 5.1 Create and execute comprehensive integration test suite for git workflow
  - Test complete workflow: run `/plan:set test-plan`, verify branch created, implement tasks, verify commits exist
  - Test branch switching: set plan A, set plan B, verify switches and branch creation
  - Test uncommitted changes handling: make changes, try to switch plans, verify prompts appear
  - Test backwards compatibility: run commands outside git repo or with git unavailable
  - Test edge cases: branch already exists, switching to same plan, invalid plan names
  - Document all test cases and their expected outcomes in findings
  - Run actual commands and capture outputs to verify behavior
  - Create a test checklist showing pass/fail for each scenario

## Success Criteria

- [ ] `/plan:set my-plan` creates branch `plan/my-plan`
- [ ] Subsequent `/plan:set my-plan` switches to existing branch
- [ ] Uncommitted changes trigger warning before switch
- [ ] Every task creates exactly one commit with proper format
- [ ] `/plan:status` shows git branch and commit info
- [ ] Works gracefully when git unavailable

## Risks

- **Branch naming conflicts:** Mitigate with validation
- **Uncommitted changes lost:** Mitigate with detection and prompts
- **Non-git environments:** Mitigate with graceful fallback
