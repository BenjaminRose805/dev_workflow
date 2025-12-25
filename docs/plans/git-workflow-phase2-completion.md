# Implementation Plan: Git Workflow Phase 2 - Automated Completion

## Overview
- **Objective:** Implement `/plan:complete` command with squash merge workflow
- **Dependencies:** Phase 1 (Core Branching) must be complete
- **Created:** 2024-12-25
- **Output:** `docs/plan-outputs/git-workflow-phase2-completion/`

> Task findings are written to the `findings/` subdirectory. Use `/plan:status` to view progress.

## Phase 1: Create /plan:complete Command

- [ ] 1.1 Create `.claude/commands/plan/complete.md` command file
- [ ] 1.2 Add step: Verify all tasks completed (check status.json)
- [ ] 1.3 Add step: Commit any uncommitted changes with summary message
- [ ] 1.4 Add step: Verify currently on plan branch
- [ ] 1.5 Add step: Check for merge conflicts with main (dry-run merge)
- [ ] 1.6 Document command usage and options
- [ ] **VERIFY 1**: Command structure created and documented

## Phase 2: Archive Tag Creation

- [ ] 2.1 Add step: Create archive tag before merge (`archive/plan-{name}`)
- [ ] 2.2 Include timestamp in tag annotation
- [ ] 2.3 Document how to access archived history via tag
- [ ] 2.4 Add option to skip archive: `--no-archive`
- [ ] **VERIFY 2**: Archive tags created correctly and accessible

## Phase 3: Squash Merge Workflow

- [ ] 3.1 Add step: Switch to main branch (`git checkout main`)
- [ ] 3.2 Add step: Pull latest main (optional, with flag `--sync`)
- [ ] 3.3 Add step: Squash merge (`git merge --squash plan/{name}`)
- [ ] 3.4 Add step: Generate merge commit message with plan summary
- [ ] 3.5 Add step: Create the merge commit
- [ ] 3.6 Add step: Delete plan branch (`git branch -D plan/{name}`)
- [ ] **VERIFY 3**: Squash merge workflow executes correctly

## Phase 4: Merge Commit Message Generation

- [ ] 4.1 Design merge commit message format with metadata
- [ ] 4.2 Include task count, phase count, duration
- [ ] 4.3 Include phase summary (name and task count per phase)
- [ ] 4.4 Include link to archive tag for granular history
- [ ] 4.5 Include link to outputs directory
- [ ] 4.6 Add Claude Code attribution footer
- [ ] **VERIFY 4**: Merge messages are informative and consistent

## Phase 5: Merge Strategy Options

- [ ] 5.1 Add `--merge squash` option (default)
- [ ] 5.2 Add `--merge commit` option (merge commit, preserves history)
- [ ] 5.3 Add `--merge ff` option (fast-forward if possible)
- [ ] 5.4 Document when to use each strategy
- [ ] **VERIFY 5**: All merge strategies work correctly

## Phase 6: Status Updates

- [ ] 6.1 Update status.json with completion timestamp
- [ ] 6.2 Record merge commit SHA in status.json
- [ ] 6.3 Record archive tag name in status.json
- [ ] 6.4 Add `completedAt` and `mergedAt` fields
- [ ] **VERIFY 6**: Status tracking reflects completion state

## Phase 7: Integration Testing

- [ ] 7.1 Test complete workflow: set → implement all → complete
- [ ] 7.2 Test with uncommitted changes at completion time
- [ ] 7.3 Test archive tag access after branch deletion
- [ ] 7.4 Test each merge strategy option
- [ ] 7.5 Verify main branch has single squashed commit
- [ ] **VERIFY 7**: Full integration tests pass

## Success Criteria

- [ ] `/plan:complete` executes full workflow without errors
- [ ] Archive tag preserves all task commits
- [ ] Main branch shows single commit per plan
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
