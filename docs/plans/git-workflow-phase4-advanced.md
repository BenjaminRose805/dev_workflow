# Implementation Plan: Git Workflow Phase 4 - Advanced Features

## Overview

- **Goal:** Implement advanced features for team workflows and automation
- **Priority:** P2
- **Created:** 2024-12-25
- **Restructured:** 2024-12-25 (for orchestrator isolation - each task self-contained)
- **Output:** docs/plan-outputs/git-workflow-phase4-advanced/

> Task findings are written to the `findings/` subdirectory. Use `/plan:status` to view progress.

## Dependencies

### Upstream
- **git-workflow-phase1-core-branching** - Foundation branching system (branch creation, switching, status)
- **git-workflow-phase2-completion** - Plan completion workflow (merge, archive)
- **git-workflow-phase3-safety** - Safety guards and conflict prevention

### Downstream
- None - This is the final phase in the git-workflow series

### External Tools
- **GitHub CLI (`gh`)** - Required for PR creation features (optional - graceful fallback if not installed)
- **Remote repository** - Required for sync features (optional - graceful fallback if not configured)

---

## Phase 1: Configuration System

**Execution Note:** Phase 1 must be implemented FIRST as it defines configuration options used by Phases 2-5.

- [ ] 1.1 Create configuration system with `.claude/git-workflow.json`
  - Create `.claude/git-workflow.json` with schema validation
  - Define all options: `strategy` (branch-per-plan, branch-per-phase), `branch_prefix` (default: "plan/"), `auto_commit` (default: true)
  - Define: `merge_strategy` (squash, merge, ff), `archive_branches` (default: true), `archive_retention_days` (default: 90)
  - Define: `sync_remote` (default: false), `phase_tags` (default: true), `enforce_branch` (default: true), `cleanup_age_days` (default: 30)
  - Create config loading helper that reads file, validates, returns config with defaults
  - Handle invalid config files by using defaults and warning user
  - Document all configuration options with examples in the file

---

## Phase 2: PR Creation Integration

**Execution Note:** Tasks 2.1-2.2 are [SEQUENTIAL] - all modify `.claude/commands/plan/complete.md`

- [ ] 2.1 Add PR creation workflow to `/plan:complete`
  - Read `.claude/commands/plan/complete.md` to see current state
  - Add `--pr` flag that: pushes branch with `git push -u origin plan/{name}`, generates PR description from plan summary
  - Generate PR: title from plan name, body with task list and completion status
  - Create PR using `gh pr create --title "..." --body "..."`
  - Add `--draft` flag to create draft PR
  - Skip local merge when `--pr` is used (PR workflow instead)
  - Handle GitHub CLI not installed with graceful error message

- [ ] 2.2 Verify PR creation
  - Verify --pr flag: `grep -c "\-\-pr" .claude/commands/plan/complete.md` >= 1
  - Verify --draft flag: `grep -c "\-\-draft" .claude/commands/plan/complete.md` >= 1
  - Verify gh pr create: `grep -c "gh pr create" .claude/commands/plan/complete.md` >= 1
  - Document results in `docs/plan-outputs/git-workflow-phase4-advanced/findings/2.2.md`

---

## Phase 3: Remote Sync

- [ ] 3.1 Implement automatic remote sync system
  - Read configuration for `sync_remote` option
  - Modify `/plan:set` to push after branch creation when `sync_remote: true`
  - Modify `/plan:implement` to push after each commit when `sync_remote: true`
  - Add `--push` flag for manual push trigger
  - Handle push failures gracefully (warn but don't fail task)
  - Check for remote repository configuration, skip sync gracefully if not configured

---

## Phase 4: Phase Tags

- [ ] 4.1 Implement phase tagging system
  - Read configuration for `phase_tags` option
  - Create git tags automatically after phase completion (detect when all phase tasks are done)
  - Tag format: `plan/{name}/phase-{N}` with phase name in annotation
  - Update `/plan:status` to display phase tags alongside phase information
  - Add tag-based rollback to `/plan:rollback phase N` using phase tags
  - Add `--push-tags` option to push tags to remote when sync is enabled

---

## Phase 5: Branch Cleanup Command

- [ ] 5.1 Create `/plan:cleanup` command
  - Check if `.claude/commands/plan/cleanup.md` exists first
  - Create new file with command header and usage: `/plan:cleanup [--delete] [--archive] [--yes]`
  - Read configuration for `cleanup_age_days` and `archive_branches` options
  - Identify stale plan branches using configurable age threshold
  - Display list with branch age and last commit info
  - Implement `--delete` flag to remove branches (local and remote)
  - Implement `--archive` flag to create archive tag before deletion
  - Add confirmation prompt before deletion (skip with `--yes`)
  - Handle local-only and remote-only branches appropriately

---

## Phase 6: Archive Tag Cleanup

- [ ] 6.1 Add archive retention to `/plan:cleanup`
  - Read `.claude/commands/plan/cleanup.md` to see current state
  - Read configuration for `archive_retention_days` option
  - List expired archive tags based on tag creation date
  - Implement deletion of old archive tags with confirmation
  - Add `--keep-archives` flag to skip archive cleanup
  - Handle edge cases: tags without dates, malformed tags

---

## Phase 7: Conflict Detection

- [ ] 7.1 Add pre-merge conflict detection to `/plan:complete`
  - Read `.claude/commands/plan/complete.md` to see current state
  - Before merging, perform dry-run: `git merge --no-commit --no-ff main`
  - Detect conflicting files from git status output
  - Abort dry-run with `git merge --abort`
  - If conflicts detected, present options: (1) rebase onto main, (2) manual resolve, (3) abort
  - Add `--force` flag to skip conflict check
  - Ensure working directory cleaned up properly after dry-run

---

## Phase 8: Documentation

- [ ] 8.1 Create comprehensive documentation for Phase 4 features
  - Update VISION.md with git workflow section covering all advanced features
  - Create troubleshooting guide for common issues: GitHub CLI not found, remote sync failures, merge conflicts, cleanup safety
  - Document all new commands: `/plan:cleanup`, `/plan:rollback phase`
  - Document all new flags: `--pr`, `--draft`, `--push`, `--delete`, `--archive`, `--force`, `--push-tags`, `--keep-archives`
  - Document all configuration options with examples
  - Add workflow diagrams showing PR creation flow, remote sync flow, conflict detection flow

---

## Phase 9: Integration Testing

- [ ] 9.1 Execute comprehensive integration tests for Phase 4 features
  - Create test document at `docs/plan-outputs/git-workflow-phase4-advanced/findings/9.1.md`
  - Test configuration system: valid config loads, invalid config warns and uses defaults
  - Test PR creation: `--pr` flag creates PR (if gh available), `--draft` creates draft
  - Test remote sync: with `sync_remote: true`, commits are pushed automatically
  - Test phase tags: tags created after phase completion, visible in status
  - Test cleanup: stale branches listed, `--delete` removes them, `--archive` creates tags first
  - Test conflict detection: simulated conflict triggers detection with options
  - Create summary checklist with PASS/FAIL for each test case

---

## Phase 10: Orchestrator Completion Integration

- [ ] 10.1 Add completion prompt to `/plan:orchestrate`
  - Read `.claude/commands/plan/orchestrate.md` to see current state
  - After 100% completion, prompt user: "Plan complete. Run /plan:complete to merge to main? [Y/n]"
  - If user confirms (Y or Enter), execute `/plan:complete` workflow
  - If user declines (n), show reminder: "Run /plan:complete when ready to merge"
  - Add `--no-complete` flag to skip the completion prompt entirely
  - Add `--auto-complete` flag to run `/plan:complete` automatically without prompting

- [ ] 10.2 Add completion prompt to `/plan:batch`
  - Read `.claude/commands/plan/batch.md` to see current state
  - After batch execution, check if plan is 100% complete
  - If 100%, show same completion prompt as orchestrate
  - Respect same `--no-complete` and `--auto-complete` flags
  - If not 100%, show remaining task count instead

- [ ] 10.3 Verify completion integration
  - Verify orchestrate has completion prompt: `grep -c "plan:complete" .claude/commands/plan/orchestrate.md` >= 1
  - Verify batch has completion prompt: `grep -c "plan:complete" .claude/commands/plan/batch.md` >= 1
  - Verify --auto-complete flag documented in both commands
  - Document results in `docs/plan-outputs/git-workflow-phase4-advanced/findings/10.3.md`

---

## Success Criteria

- `--pr` creates GitHub pull request with proper description
- Remote sync pushes automatically when enabled
- Phase tags created at phase completion
- Cleanup commands safely manage branches and tags
- Conflict detection prevents failed merges
- Configuration system allows full customization
- All features work without config file (defaults)
- All features documented with examples
- Orchestrator and batch prompt for `/plan:complete` when plan finishes

## Risks

- **GitHub CLI not installed:** Graceful error for PR features
- **No remote configured:** Skip sync features gracefully
- **Config file invalid:** Use defaults, warn user
- **Merge conflicts:** Detected before merge attempt
