# Implementation Plan: Git Workflow Phase 3 - Safety & Rollback

## Overview
- **Objective:** Implement rollback commands and safety mechanisms
- **Dependencies:** Phase 1 and Phase 2 must be complete
- **Created:** 2024-12-25
- **Output:** `docs/plan-outputs/git-workflow-phase3-safety/`

> Task findings are written to the `findings/` subdirectory. Use `/plan:status` to view progress.

## Phase 1: Create /plan:rollback Command

- [ ] 1.1 Create `.claude/commands/plan/rollback.md` command file
- [ ] 1.2 Define subcommand structure: `task`, `phase`, `plan`
- [ ] 1.3 Add argument parsing for rollback targets
- [ ] 1.4 Document command usage with examples
- [ ] **VERIFY 1**: Command structure created

## Phase 2: Task-Level Rollback

- [ ] 2.1 Implement task commit lookup: `git log --grep="task {id}:" --format="%H" -1`
- [ ] 2.2 Implement task revert: `git revert <sha> --no-edit`
- [ ] 2.3 Update status.json to mark task as `rolled_back` or `pending`
- [ ] 2.4 Handle case where task commit not found
- [ ] 2.5 Handle case where task was never committed (analysis-only)
- [ ] **VERIFY 2**: Task rollback works correctly

## Phase 3: Phase-Level Rollback

- [ ] 3.1 Implement phase commit range detection
- [ ] 3.2 Find first and last commit for phase using git log
- [ ] 3.3 Implement range revert: `git revert <first>..<last> --no-edit`
- [ ] 3.4 Update status.json for all tasks in phase
- [ ] 3.5 Handle partial phase (some tasks not committed)
- [ ] **VERIFY 3**: Phase rollback works correctly

## Phase 4: Plan-Level Rollback

- [ ] 4.1 Implement unmerged plan rollback (delete branch)
- [ ] 4.2 Add confirmation prompt before destructive action
- [ ] 4.3 Implement merged plan rollback (revert merge commit)
- [ ] 4.4 Find merge commit: `git log --grep="Plan: {name}" --format="%H" -1`
- [ ] 4.5 Revert merge: `git revert <sha> --no-edit`
- [ ] 4.6 Update status.json appropriately
- [ ] **VERIFY 4**: Plan rollback works for both merged and unmerged

## Phase 5: Create /plan:abandon Command

- [ ] 5.1 Create `.claude/commands/plan/abandon.md` command file
- [ ] 5.2 Add confirmation prompt (skip with `--force`)
- [ ] 5.3 Add optional backup tag: `backup/plan-{name}-{timestamp}`
- [ ] 5.4 Implement: switch to main, delete plan branch
- [ ] 5.5 Update status.json with abandoned state
- [ ] 5.6 Handle uncommitted changes before abandon
- [ ] **VERIFY 5**: Abandon command works safely

## Phase 6: Uncommitted Changes Protection

- [ ] 6.1 Standardize uncommitted changes detection across commands
- [ ] 6.2 Create reusable prompt pattern: Commit / Stash / Cancel
- [ ] 6.3 Implement stash creation: `git stash push -m "plan/{name} WIP"`
- [ ] 6.4 Implement stash application after switch
- [ ] 6.5 Add to `/plan:set`, `/plan:complete`, `/plan:abandon`
- [ ] **VERIFY 6**: Uncommitted changes never silently lost

## Phase 7: Branch Validation Enhancement

- [ ] 7.1 Add branch validation to `/plan:batch`
- [ ] 7.2 Add auto-switch option when on wrong branch
- [ ] 7.3 Add `--no-branch-check` flag for override
- [ ] 7.4 Improve error messages for branch issues
- [ ] **VERIFY 7**: All commands validate branch state

## Phase 8: Pre-commit Hook Template

- [ ] 8.1 Create `.githooks/pre-commit` template file
- [ ] 8.2 Add warning when committing directly to main
- [ ] 8.3 Add check for plan branch pattern
- [ ] 8.4 Document hook installation in README
- [ ] 8.5 Add `--no-verify` bypass documentation
- [ ] **VERIFY 8**: Hook template works and is documented

## Phase 9: Integration Testing

- [ ] 9.1 Test task rollback during plan execution
- [ ] 9.2 Test phase rollback
- [ ] 9.3 Test plan rollback (unmerged)
- [ ] 9.4 Test plan rollback (merged)
- [ ] 9.5 Test abandon with backup tag
- [ ] 9.6 Test uncommitted changes scenarios
- [ ] **VERIFY 9**: All safety features work correctly

## Success Criteria

- [ ] `/plan:rollback task X` reverts single task commit
- [ ] `/plan:rollback phase N` reverts entire phase
- [ ] `/plan:rollback plan` handles both merged and unmerged
- [ ] `/plan:abandon` safely discards plan with optional backup
- [ ] Uncommitted changes protected in all scenarios
- [ ] Pre-commit hook template available

## Dependencies

- Phase 1 and 2 complete
- Git repository with commits
- Understanding of revert vs reset

## Risks

- **Revert conflicts:** Document manual resolution
- **Lost work on abandon:** Mitigate with backup tags
- **Hook installation issues:** Document clearly
