# Implementation Plan: Git Workflow Phase 3 - Safety & Rollback

## Overview
- **Objective:** Implement rollback commands and safety mechanisms
- **Dependencies:** Phase 1 and Phase 2 must be complete
- **Created:** 2024-12-25
- **Restructured:** 2024-12-25 (consolidated for orchestrator isolation)
- **Output:** `docs/plan-outputs/git-workflow-phase3-safety/`

> Task findings are written to the `findings/` subdirectory. Use `/plan:status` to view progress.

## Phase 1: Create /plan:rollback Command

- [ ] 1.1 Create complete `/plan:rollback` command at `.claude/commands/plan/rollback.md` with three subcommands (`task`, `phase`, `plan`), argument parsing for rollback targets, and comprehensive documentation including usage examples for each subcommand type

## Phase 2: Task-Level Rollback

- [ ] 2.1 Implement task-level rollback functionality in the `/plan:rollback task` command: locate task commit using `git log --grep="task {id}:" --format="%H" -1`, revert it using `git revert <sha> --no-edit`, update status.json to mark task as `rolled_back` or `pending`, and handle edge cases (task commit not found, analysis-only tasks with no commits)

## Phase 3: Phase-Level Rollback

- [ ] 3.1 Implement phase-level rollback functionality in the `/plan:rollback phase` command: detect phase commit range by finding first and last commits for the phase using git log, revert the range using `git revert <first>..<last> --no-edit`, update status.json for all tasks in the phase, and handle partial phases where some tasks were not committed

## Phase 4: Plan-Level Rollback

- [ ] 4.1 Implement plan-level rollback functionality in the `/plan:rollback plan` command: for unmerged plans, add confirmation prompt then delete the plan branch; for merged plans, locate merge commit using `git log --grep="Plan: {name}" --format="%H" -1`, revert it using `git revert <sha> --no-edit`, and update status.json appropriately

## Phase 5: Create /plan:abandon Command

- [ ] 5.1 Create complete `/plan:abandon` command at `.claude/commands/plan/abandon.md` that safely abandons a plan: implement confirmation prompt (skip with `--force` flag), create optional backup tag using pattern `backup/plan-{name}-{timestamp}`, switch to main branch and delete plan branch, update status.json with abandoned state, and handle uncommitted changes before abandoning

## Phase 6: Uncommitted Changes Protection

- [ ] 6.1 Implement standardized uncommitted changes detection and protection across `/plan:set`, `/plan:complete`, and `/plan:abandon` commands: create reusable prompt pattern offering "Commit / Stash / Cancel" options, implement stash creation using `git stash push -m "plan/{name} WIP"`, implement stash application after branch switch, ensuring uncommitted changes are never silently lost

## Phase 7: Branch Validation Enhancement

- [ ] 7.1 Add comprehensive branch validation to the `/plan:batch` command: check if user is on correct plan branch before execution, offer auto-switch option when on wrong branch, add `--no-branch-check` flag to override validation, and provide clear error messages explaining branch issues and how to resolve them

## Phase 8: Pre-commit Hook Template

- [ ] 8.1 Create complete pre-commit hook template at `.githooks/pre-commit`: implement warning when committing directly to main branch, add check for plan branch naming pattern, include `--no-verify` bypass mechanism, and document hook installation process and usage in README or appropriate documentation

## Phase 9: Integration Testing

- [ ] 9.1 Perform comprehensive integration testing of all rollback scenarios: test task rollback during plan execution, test phase rollback, test plan rollback for both unmerged and merged states, test abandon command with backup tag creation, and test uncommitted changes protection across all relevant scenarios

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
