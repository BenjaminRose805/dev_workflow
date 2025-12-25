# Implementation Plan: Git Workflow Phase 4 - Advanced Features

## Overview
- **Objective:** Implement advanced features for team workflows and automation
- **Dependencies:** Phases 1-3 must be complete
- **Created:** 2024-12-25
- **Restructured:** 2024-12-25 (consolidated for orchestrator isolation)
- **Output:** `docs/plan-outputs/git-workflow-phase4-advanced/`

> Task findings are written to the `findings/` subdirectory. Use `/plan:status` to view progress.

## Phase 1: PR Creation Integration

- [ ] 1.1 Implement complete PR creation workflow in `/plan:complete`: Add `--pr` and `--draft` flags that push the branch (`git push -u origin plan/{name}`), generate a PR description from the plan summary (title from plan name, body with task list and completion status), create the PR using `gh pr create --title "..." --body "..."`, output the PR URL, and skip the local merge when `--pr` is used. Handle GitHub CLI not being installed with a graceful error message.

## Phase 2: Remote Sync

- [ ] 2.1 Implement automatic remote sync system: Add `sync_remote` configuration option (default: false) that when enabled pushes after branch creation in `/plan:set` and after each commit in `/plan:implement`. Include a `--push` flag for manual push trigger. Handle push failures gracefully by warning the user but not failing the task. Check for remote repository configuration and skip sync gracefully if not configured.

## Phase 3: Phase Tags

- [ ] 3.1 Implement complete phase tagging system: Create git tags automatically after phase completion (detect when all phase tasks are done) using format `plan/{name}/phase-{N}` with phase name in tag annotation. Update `/plan:status` to display phase tags alongside phase information. Implement `/plan:rollback phase` command that uses phase tags to rollback to a specific phase. Add `--push-tags` option to push tags to remote when sync is enabled.

## Phase 4: Branch Cleanup Command

- [ ] 4.1 Create complete `/plan:cleanup` command: Identify stale plan branches using configurable age threshold (default 30 days), display list with branch age and last commit info, implement `--delete` flag to remove branches (both local and remote), implement `--archive` flag to create archive tag before deletion, add confirmation prompt before deletion (with --yes to skip), and handle cases where remote branches exist but local ones don't and vice versa.

## Phase 5: Archive Tag Cleanup

- [ ] 5.1 Implement archive retention system: Add `archive_retention_days` configuration option (default: 90 days) and create cleanup command that lists expired archive tags based on tag creation date. Implement deletion of old archive tags with confirmation prompt. Add `--keep-archives` flag to skip cleanup. Include retention policy in command help and handle edge cases like tags without dates gracefully.

## Phase 6: Conflict Detection

- [ ] 6.1 Implement pre-merge conflict detection in `/plan:complete`: Before merging, perform dry-run merge using `git merge --no-commit --no-ff main`, detect conflicting files from git status output, and abort the dry-run merge. If conflicts detected, present user with options: (1) rebase onto main using `git rebase main`, (2) manual resolve then retry, or (3) abort merge. Add `--force` flag to skip conflict check. Ensure working directory is cleaned up properly after dry-run regardless of outcome.

## Phase 7: Configuration System

- [ ] 7.1 Create complete configuration system: Implement `.claude/git-workflow.json` config file support with schema validation. Define schema including all options: `strategy` (branch-per-plan, branch-per-phase), `branch_prefix` (default: "plan/"), `auto_commit` (default: true), `merge_strategy` (squash, merge, ff), `archive_branches` (default: true), `archive_retention_days` (default: 90), `sync_remote` (default: false), `phase_tags` (default: true), `enforce_branch` (default: true), and `cleanup_age_days` (default: 30). Implement config loading in all relevant commands with proper default values. Handle invalid config files by using defaults and warning user. Document all configuration options with examples.

## Phase 8: Documentation

- [ ] 8.1 Create comprehensive documentation for Phase 4 features: Update VISION.md with git workflow section covering all advanced features. Create troubleshooting guide for common issues (GitHub CLI not found, remote sync failures, merge conflicts, cleanup safety). Add workflow diagrams showing PR creation flow, remote sync flow, and conflict detection flow. Document all new commands (`/plan:cleanup`, `/plan:rollback phase`), flags (`--pr`, `--draft`, `--push`, `--delete`, `--archive`, `--force`, `--push-tags`, `--keep-archives`), and configuration options. Include examples for common scenarios: creating PR from plan, syncing with remote, cleaning up old branches, handling conflicts.

## Phase 9: Integration Testing

- [ ] 9.1 Create comprehensive integration test scenarios: Develop test cases for PR creation workflow (with and without GitHub CLI), remote sync end-to-end (branch creation, commits, tag pushing), cleanup commands (branch and archive cleanup with various ages), conflict detection and resolution (simulated conflicts, rebase, manual resolve), all configuration options (each option enabled/disabled), and backwards compatibility (no config file present). Document test results and any issues found.

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

- Phases 1-3 complete
- GitHub CLI (`gh`) installed for PR features (optional)
- Remote repository configured for sync features (optional)

## Risks

- **GitHub CLI not installed:** Graceful error for PR features
- **No remote configured:** Skip sync features gracefully
- **Config file invalid:** Use defaults, warn user
- **Merge conflicts:** Detected before merge attempt
