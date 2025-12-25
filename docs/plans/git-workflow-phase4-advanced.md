# Implementation Plan: Git Workflow Phase 4 - Advanced Features

## Overview

- **Goal:** Implement advanced features for team workflows and automation
- **Priority:** P2
- **Created:** 2024-12-25
- **Output:** docs/plan-outputs/git-workflow-phase4-advanced/

> Task findings are written to the `findings/` subdirectory. Use `/plan:status` to view progress.

## Phase 1: PR Creation Integration

**Execution Note:** Task 1.1 references configuration options defined in Phase 7. Implement Phase 7 first, or implement with hardcoded defaults that will be made configurable later.

- [ ] 1.1 Implement complete PR creation workflow in `/plan:complete`: Add `--pr` and `--draft` flags that push the branch (`git push -u origin plan/{name}`), generate a PR description from the plan summary (title from plan name, body with task list and completion status), create the PR using `gh pr create --title "..." --body "..."`, output the PR URL, and skip the local merge when `--pr` is used. Handle GitHub CLI not being installed with a graceful error message.

**VERIFY Phase 1:**
- [ ] `gh pr create --help` returns usage info OR graceful error message displayed
- [ ] Running `/plan:complete --pr` on test plan creates PR with correct title and body
- [ ] `--draft` flag creates draft PR (verify via `gh pr view --json isDraft`)

## Phase 2: Remote Sync

**Execution Note:** Task 2.1 uses `sync_remote` configuration from Phase 7. Implement Phase 7 first, or implement with hardcoded defaults.

- [ ] 2.1 Implement automatic remote sync system: Add `sync_remote` configuration option (default: false) that when enabled pushes after branch creation in `/plan:set` and after each commit in `/plan:implement`. Include a `--push` flag for manual push trigger. Handle push failures gracefully by warning the user but not failing the task. Check for remote repository configuration and skip sync gracefully if not configured.

**VERIFY Phase 2:**
- [ ] `git remote -v` shows configured remote OR graceful skip message
- [ ] With `sync_remote: true`, `git log --oneline origin/plan/{name}` shows pushed commits
- [ ] Push failure shows warning but task completes successfully

## Phase 3: Phase Tags

**Execution Note:** Task 3.1 uses `phase_tags` configuration from Phase 7. Implement Phase 7 first, or implement with hardcoded defaults.

- [ ] 3.1 Implement complete phase tagging system: Create git tags automatically after phase completion (detect when all phase tasks are done) using format `plan/{name}/phase-{N}` with phase name in tag annotation. Update `/plan:status` to display phase tags alongside phase information. Implement `/plan:rollback phase` command that uses phase tags to rollback to a specific phase. Add `--push-tags` option to push tags to remote when sync is enabled.

**VERIFY Phase 3:**
- [ ] `git tag -l "plan/*/phase-*"` lists created phase tags
- [ ] `/plan:status` output includes phase tag information
- [ ] `/plan:rollback phase N` restores branch to phase tag state

## Phase 4: Branch Cleanup Command

**Execution Note:** Task 4.1 uses `cleanup_age_days` and `archive_branches` configuration from Phase 7. Implement Phase 7 first, or implement with hardcoded defaults.

- [ ] 4.1 Create complete `/plan:cleanup` command: Identify stale plan branches using configurable age threshold (default 30 days), display list with branch age and last commit info, implement `--delete` flag to remove branches (both local and remote), implement `--archive` flag to create archive tag before deletion, add confirmation prompt before deletion (with --yes to skip), and handle cases where remote branches exist but local ones don't and vice versa.

**VERIFY Phase 4:**
- [ ] `/plan:cleanup` lists stale branches with age and commit info
- [ ] `git branch -a | grep plan/` shows branches removed after `--delete`
- [ ] `git tag -l "archive/*"` shows archive tags created with `--archive`

## Phase 5: Archive Tag Cleanup

**Execution Note:** Task 5.1 uses `archive_retention_days` configuration from Phase 7. Implement Phase 7 first, or implement with hardcoded defaults.

- [ ] 5.1 Implement archive retention system: Add `archive_retention_days` configuration option (default: 90 days) and create cleanup command that lists expired archive tags based on tag creation date. Implement deletion of old archive tags with confirmation prompt. Add `--keep-archives` flag to skip cleanup. Include retention policy in command help and handle edge cases like tags without dates gracefully.

**VERIFY Phase 5:**
- [ ] Archive cleanup lists tags older than `archive_retention_days`
- [ ] `git tag -l "archive/*"` shows old tags removed after cleanup
- [ ] `--keep-archives` skips archive tag deletion

## Phase 6: Conflict Detection

**Execution Note:** Task 6.1 uses `merge_strategy` configuration from Phase 7. Implement Phase 7 first, or implement with hardcoded defaults.

- [ ] 6.1 Implement pre-merge conflict detection in `/plan:complete`: Before merging, perform dry-run merge using `git merge --no-commit --no-ff main`, detect conflicting files from git status output, and abort the dry-run merge. If conflicts detected, present user with options: (1) rebase onto main using `git rebase main`, (2) manual resolve then retry, or (3) abort merge. Add `--force` flag to skip conflict check. Ensure working directory is cleaned up properly after dry-run regardless of outcome.

**VERIFY Phase 6:**
- [ ] Simulated conflict triggers detection message with options
- [ ] `git status` shows clean working directory after dry-run abort
- [ ] `--force` flag skips conflict detection and proceeds with merge

## Phase 7: Configuration System

**Execution Note:** Phase 7 should be implemented FIRST as it defines configuration options used by Phases 1-6. Phases 8-9 are [SEQUENTIAL] and depend on all prior phases being complete.

- [ ] 7.1 Create complete configuration system: Implement `.claude/git-workflow.json` config file support with schema validation. Define schema including all options: `strategy` (branch-per-plan, branch-per-phase), `branch_prefix` (default: "plan/"), `auto_commit` (default: true), `merge_strategy` (squash, merge, ff), `archive_branches` (default: true), `archive_retention_days` (default: 90), `sync_remote` (default: false), `phase_tags` (default: true), `enforce_branch` (default: true), and `cleanup_age_days` (default: 30). Implement config loading in all relevant commands with proper default values. Handle invalid config files by using defaults and warning user. Document all configuration options with examples.

**VERIFY Phase 7:**
- [ ] `.claude/git-workflow.json` with valid config loads without errors
- [ ] Invalid config file triggers warning and uses defaults
- [ ] All config options affect command behavior as documented

## Phase 8: Documentation

**Execution Note:** Phase 8 is [SEQUENTIAL] - depends on Phases 1-7 being complete as it documents all features.

- [ ] 8.1 Create comprehensive documentation for Phase 4 features: Update VISION.md with git workflow section covering all advanced features. Create troubleshooting guide for common issues (GitHub CLI not found, remote sync failures, merge conflicts, cleanup safety). Add workflow diagrams showing PR creation flow, remote sync flow, and conflict detection flow. Document all new commands (`/plan:cleanup`, `/plan:rollback phase`), flags (`--pr`, `--draft`, `--push`, `--delete`, `--archive`, `--force`, `--push-tags`, `--keep-archives`), and configuration options. Include examples for common scenarios: creating PR from plan, syncing with remote, cleaning up old branches, handling conflicts.

**VERIFY Phase 8:**
- [ ] VISION.md contains git workflow section with all advanced features
- [ ] Troubleshooting guide exists with common issue solutions
- [ ] All new commands and flags documented with examples

## Phase 9: Integration Testing

**Execution Note:** Phase 9 is [SEQUENTIAL] - depends on Phases 1-7 being complete as it tests all features.

- [ ] 9.1 Create comprehensive integration test scenarios: Develop test cases for PR creation workflow (with and without GitHub CLI), remote sync end-to-end (branch creation, commits, tag pushing), cleanup commands (branch and archive cleanup with various ages), conflict detection and resolution (simulated conflicts, rebase, manual resolve), all configuration options (each option enabled/disabled), and backwards compatibility (no config file present). Document test results and any issues found.

**VERIFY Phase 9:**
- [ ] Test scenarios cover all Phase 4 features
- [ ] Test results documented in findings directory
- [ ] All tests pass or issues documented with resolution path

## Success Criteria

- [ ] `--pr` creates GitHub pull request with proper description
- [ ] Remote sync pushes automatically when enabled
- [ ] Phase tags created at phase completion
- [ ] Cleanup commands safely manage branches and tags
- [ ] Conflict detection prevents failed merges
- [ ] Configuration system allows full customization
- [ ] All features work without config file (defaults)
- [ ] All features documented with examples

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

## Risks

- **GitHub CLI not installed:** Graceful error for PR features
- **No remote configured:** Skip sync features gracefully
- **Config file invalid:** Use defaults, warn user
- **Merge conflicts:** Detected before merge attempt
