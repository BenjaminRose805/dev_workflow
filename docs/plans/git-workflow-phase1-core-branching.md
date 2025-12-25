# Implementation Plan: Git Workflow Phase 1 - Core Branching

## Overview

- **Goal:** Enable branch-per-plan workflow with commit-per-task enforcement
- **Priority:** P2
- **Created:** 2024-12-25
- **Output:** `docs/plan-outputs/git-workflow-phase1-core-branching/`

> Restructured 2024-12-25 for orchestrator isolation. Each task is self-contained and can run in a fresh session.

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

**Execution Note:** Tasks 1.1-1.4 are [SEQUENTIAL] - all modify `.claude/commands/plan/set.md`

- [ ] 1.1 Document current `/plan:set` implementation
  - Read `.claude/commands/plan/set.md` completely
  - Document the current workflow steps in `docs/plan-outputs/git-workflow-phase1-core-branching/findings/1.1.md`
  - Identify insertion points for: git availability check, branch operations, stash logic
  - Note any existing git-related code

- [ ] 1.2 Add git availability check and branch management to `.claude/commands/plan/set.md`
  - Read `.claude/commands/plan/set.md` to see current state
  - Add git availability check: `git --version` at start, set `GIT_AVAILABLE` flag
  - Add branch existence check: `git rev-parse --verify plan/{plan-name} 2>/dev/null`
  - If branch doesn't exist: create with `git checkout -b plan/{plan-name}`
  - If branch exists: switch with `git checkout plan/{plan-name}`
  - Log which action was taken
  - Handle non-git environments gracefully (skip all git ops if unavailable)

- [ ] 1.3 Add uncommitted changes handling to `.claude/commands/plan/set.md`
  - Read `.claude/commands/plan/set.md` to see current state
  - Before any branch switch, run `git status --porcelain | wc -l`
  - If uncommitted changes < 10 files: auto-stash with `git stash push -m "plan-switch: {old-plan} -> {new-plan}"`
  - If uncommitted changes >= 10 files: log warning and abort the plan switch
  - After successful branch switch, record branch name in `docs/plan-outputs/{plan-name}/status.json` metadata

- [ ] 1.4 Verify Phase 1 branch management
  - Test: Run `/plan:set test-plan`, verify branch created with `git branch --list plan/test-plan`
  - Test: Run `/plan:set test-plan` again, verify no error on second run
  - Test: Make uncommitted changes, run `/plan:set other-plan`, verify stash created
  - Test: Check `docs/plan-outputs/test-plan/status.json` contains `"branch": "plan/test-plan"`
  - Test: Run `/plan:set` in a non-git directory, verify graceful fallback message
  - Document all test results in `docs/plan-outputs/git-workflow-phase1-core-branching/findings/1.4.md`

---

## Phase 2: Branch Validation in /plan:implement

**Execution Note:** Tasks 2.1-2.3 are [SEQUENTIAL] - all modify `.claude/commands/plan/implement.md`

- [ ] 2.1 Document current `/plan:implement` commit workflow
  - Read `.claude/commands/plan/implement.md` completely
  - Document the current commit step implementation in `docs/plan-outputs/git-workflow-phase1-core-branching/findings/2.1.md`
  - Identify where branch validation should be added
  - Note the current commit message format

- [ ] 2.2 Add branch validation and enhanced commit format to `.claude/commands/plan/implement.md`
  - Read `.claude/commands/plan/implement.md` to see current state
  - Add git availability check at start: set flag, skip git ops if unavailable
  - Add branch validation: get current branch with `git branch --show-current`
  - If on wrong plan branch: log warning and auto-switch to `plan/{plan-name}`
  - If on non-plan branch (no `plan/` prefix): warn but continue for backwards compatibility
  - Update commit message format to: `[plan-name] Task X.Y: <description>`
  - Add multi-line commit body with plan name, phase number/name, and task ID using heredoc

- [ ] 2.3 Verify Phase 2 branch validation
  - Test: Checkout master, run `/plan:implement`, verify warning and auto-switch
  - Test: Checkout a feature branch, run `/plan:implement`, verify warning but continues
  - Test: Complete a task, run `git log -1`, verify format `[plan-name] Task X.Y: ...`
  - Test: Run `git log -1 --format=full`, verify body contains plan metadata
  - Test: Run `/plan:implement` in non-git environment, verify no git-related errors
  - Document all test results in `docs/plan-outputs/git-workflow-phase1-core-branching/findings/2.3.md`

---

## Phase 3: Git Utilities Documentation

**Execution Note:** Tasks 3.1-3.2 are [SEQUENTIAL] - both modify `.claude/commands/plan/_common/git-utilities.md`

- [ ] 3.1 Create git utilities documentation at `.claude/commands/plan/_common/git-utilities.md`
  - Create new file (check if exists first)
  - Add header and overview section explaining purpose
  - Document `getCurrentBranch()` pattern: `git branch --show-current` with bash example
  - Document `isOnPlanBranch()` pattern: check if branch name starts with `plan/`
  - Document `getPlanBranchName(planName)` pattern: return `plan/{planName}` format
  - Include code examples for each pattern

- [ ] 3.2 Add remaining git utilities to `.claude/commands/plan/_common/git-utilities.md`
  - Read `.claude/commands/plan/_common/git-utilities.md` to see current state
  - Document `hasUncommittedChanges()` pattern: `git status --porcelain`, check for non-empty
  - Document `branchExists(branchName)` pattern: `git rev-parse --verify` or `git branch --list`
  - Add error handling section: git unavailable detection, fallback patterns
  - Include complete code examples showing how to call git commands and handle errors

---

## Phase 4: Status Display Updates

**Execution Note:** Tasks 4.1-4.3 are [SEQUENTIAL] - all modify `scripts/status-cli.js`

- [ ] 4.1 Document current status-cli.js output format
  - Read `scripts/status-cli.js` completely
  - Find the `cmdProgress` or `cmdStatus` function
  - Document current output format in `docs/plan-outputs/git-workflow-phase1-core-branching/findings/4.1.md`
  - Identify where git info should be added

- [ ] 4.2 Add git information to `scripts/status-cli.js`
  - Read `scripts/status-cli.js` to see current state
  - Add `getGitInfo()` helper function that returns: `{ branch, uncommittedCount, commitCount, lastCommit }`
  - Use git commands: `git branch --show-current`, `git status --porcelain | wc -l`, `git rev-list --count HEAD ^master`, `git log -1 --format="%h %s"`
  - Return null if git unavailable
  - Call `getGitInfo()` in status/progress functions
  - Add output lines: "Branch:", "Uncommitted:", "Commits:", "Last:"
  - Handle null gracefully (show "N/A" or omit git section)

- [ ] 4.3 Add git information to `/plan:status` command
  - Read `.claude/commands/plan/status.md` to see current state
  - Add git info section matching format from status-cli.js: branch, uncommitted count, commit count, last commit
  - Check git availability before running git commands
  - Show "N/A" or omit git section if unavailable

---

## Phase 5: Integration Testing

- [ ] 5.1 Create integration test suite and execute all tests
  - Create test document at `docs/plan-outputs/git-workflow-phase1-core-branching/findings/5.1.md`
  - Execute complete workflow test: `/plan:set test-integration`, verify branch, implement task, verify commit format
  - Execute branch switching test: set plan A, set plan B, verify both branches created and switching works
  - Execute uncommitted changes test: make changes, switch plans, verify stash behavior
  - Execute edge case tests: branch already exists, switching to same plan, invalid plan names
  - Test backwards compatibility: run commands outside git repo or with git unavailable
  - Create summary checklist at top of findings with PASS/FAIL for each test case
  - Document actual command outputs captured during testing

---

## Success Criteria

- `/plan:set my-plan` creates branch `plan/my-plan`
- Subsequent `/plan:set my-plan` switches to existing branch
- Uncommitted changes are auto-stashed before switch with logged warning
- Every task creates exactly one commit with proper format
- `/plan:status` shows git branch and commit info
- Works gracefully when git unavailable

## Risks

- **Branch naming conflicts:** Mitigate with validation
- **Uncommitted changes lost:** Mitigate with auto-stash and logged warnings
- **Non-git environments:** Mitigate with graceful fallback
