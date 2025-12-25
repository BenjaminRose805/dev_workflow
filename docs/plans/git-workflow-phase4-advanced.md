# Implementation Plan: Git Workflow Phase 4 - Advanced Features

## Overview
- **Objective:** Implement advanced features for team workflows and automation
- **Dependencies:** Phases 1-3 must be complete
- **Created:** 2024-12-25
- **Output:** `docs/plan-outputs/git-workflow-phase4-advanced/`

> Task findings are written to the `findings/` subdirectory. Use `/plan:status` to view progress.

## Phase 1: PR Creation Integration

- [ ] 1.1 Add `--pr` flag to `/plan:complete` command
- [ ] 1.2 Implement branch push: `git push -u origin plan/{name}`
- [ ] 1.3 Generate PR description from plan summary
- [ ] 1.4 Create PR using `gh pr create --title "..." --body "..."`
- [ ] 1.5 Add `--draft` option for draft PRs
- [ ] 1.6 Output PR URL after creation
- [ ] 1.7 Skip local merge when `--pr` used
- [ ] **VERIFY 1**: PR creation works with GitHub CLI

## Phase 2: Remote Sync

- [ ] 2.1 Add `sync_remote` configuration option
- [ ] 2.2 Implement push after branch creation in `/plan:set`
- [ ] 2.3 Implement push after each commit in `/plan:implement`
- [ ] 2.4 Add `--push` flag for manual push trigger
- [ ] 2.5 Handle push failures gracefully (warn, don't fail task)
- [ ] 2.6 Document remote sync behavior
- [ ] **VERIFY 2**: Remote sync works when enabled

## Phase 3: Phase Tags

- [ ] 3.1 Add automatic phase tagging after VERIFY tasks
- [ ] 3.2 Tag format: `plan/{name}/phase-{N}`
- [ ] 3.3 Include phase name in tag annotation
- [ ] 3.4 Add phase tags to status display
- [ ] 3.5 Use phase tags in `/plan:rollback phase` command
- [ ] 3.6 Add option to push tags: `--push-tags`
- [ ] **VERIFY 3**: Phase tags created and usable

## Phase 4: Branch Cleanup Command

- [ ] 4.1 Create `/plan:cleanup` command (or subcommand)
- [ ] 4.2 List stale plan branches (configurable age, default 30 days)
- [ ] 4.3 Show branch age and last commit info
- [ ] 4.4 Add `--delete` flag to remove listed branches
- [ ] 4.5 Add `--archive` flag to tag before delete
- [ ] 4.6 Add confirmation prompt for deletion
- [ ] 4.7 Handle both local and remote branches
- [ ] **VERIFY 4**: Cleanup command works safely

## Phase 5: Archive Tag Cleanup

- [ ] 5.1 Add archive retention configuration (default 90 days)
- [ ] 5.2 List expired archive tags
- [ ] 5.3 Add cleanup command for old archives
- [ ] 5.4 Add `--keep-archives` flag to skip cleanup
- [ ] 5.5 Document retention policy
- [ ] **VERIFY 5**: Archive cleanup respects retention

## Phase 6: Conflict Detection

- [ ] 6.1 Add pre-merge conflict check in `/plan:complete`
- [ ] 6.2 Implement dry-run merge: `git merge --no-commit --no-ff main`
- [ ] 6.3 Detect and report conflicting files
- [ ] 6.4 Offer resolution options: rebase, manual resolve, abort
- [ ] 6.5 Implement rebase option: `git rebase main`
- [ ] 6.6 Add `--force` to skip conflict check
- [ ] **VERIFY 6**: Conflicts detected before merge attempt

## Phase 7: Configuration System

- [ ] 7.1 Create `.claude/git-workflow.json` config file support
- [ ] 7.2 Define configuration schema with all options
- [ ] 7.3 Implement config loading in commands
- [ ] 7.4 Add default values for all options
- [ ] 7.5 Document all configuration options
- [ ] 7.6 Add config validation
- [ ] **VERIFY 7**: Configuration system works

## Phase 8: Configuration Options

- [ ] 8.1 Implement `strategy` option (branch-per-plan, branch-per-phase)
- [ ] 8.2 Implement `branch_prefix` option (default: "plan/")
- [ ] 8.3 Implement `auto_commit` option (default: true)
- [ ] 8.4 Implement `merge_strategy` option (squash, commit, ff)
- [ ] 8.5 Implement `archive_branches` option (default: true)
- [ ] 8.6 Implement `archive_retention_days` option (default: 90)
- [ ] 8.7 Implement `sync_remote` option (default: false)
- [ ] 8.8 Implement `phase_tags` option (default: true)
- [ ] 8.9 Implement `enforce_branch` option (default: true)
- [ ] **VERIFY 8**: All config options work correctly

## Phase 9: Documentation

- [ ] 9.1 Update VISION.md with git workflow section
- [ ] 9.2 Create git workflow troubleshooting guide
- [ ] 9.3 Add workflow diagrams to documentation
- [ ] 9.4 Document all new commands and options
- [ ] 9.5 Add examples for common scenarios
- [ ] **VERIFY 9**: Documentation complete and accurate

## Phase 10: Final Integration Testing

- [ ] 10.1 Test full workflow with PR creation
- [ ] 10.2 Test remote sync end-to-end
- [ ] 10.3 Test cleanup commands
- [ ] 10.4 Test conflict detection and resolution
- [ ] 10.5 Test all configuration options
- [ ] 10.6 Test backwards compatibility (no config file)
- [ ] **VERIFY 10**: All advanced features work together

## Success Criteria

- [ ] `--pr` creates GitHub pull request
- [ ] Remote sync pushes automatically when enabled
- [ ] Phase tags created at verification points
- [ ] Cleanup commands manage branches and tags
- [ ] Conflict detection prevents failed merges
- [ ] Configuration system allows customization
- [ ] All features documented

## Dependencies

- Phases 1-3 complete
- GitHub CLI (`gh`) installed for PR features
- Remote repository configured for sync features

## Risks

- **GitHub CLI not installed:** Graceful error for PR features
- **No remote configured:** Skip sync features gracefully
- **Config file invalid:** Use defaults, warn user
