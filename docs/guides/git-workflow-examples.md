# Git Workflow Examples

Real-world examples for common scenarios using the plan system's git workflow.

---

## Scenario 1: Solo Developer - New Feature

A single developer adding a new feature with squash merge.

### Setup

```bash
# No special configuration needed - defaults work well
# Optional: disable archiving to reduce clutter
echo '{"archive_branches": false}' > .claude/git-workflow.json
```

### Workflow

```bash
# 1. Create the plan
/plan:create my-new-feature

# 2. Set it as active (creates branch)
/plan:set my-new-feature
# Output: Switched to branch 'plan/my-new-feature'

# 3. Implement phase by phase
/plan:implement phase:0 --autonomous
/plan:implement phase:1 --autonomous
/plan:implement phase:2 --autonomous

# 4. Verify all tasks
/plan:verify all

# 5. Complete - squash merge to main
/plan:complete
# Output:
#   Merged plan/my-new-feature into main (squash)
#   Deleted branch plan/my-new-feature
```

### Result

- Single commit on main with all changes
- Clean history
- No leftover branches

---

## Scenario 2: Team - PR Workflow

Team collaboration using GitHub PRs for code review.

### Setup

```json
// .claude/git-workflow.json
{
  "sync_remote": true,
  "archive_branches": true,
  "phase_tags": true
}
```

### Workflow

```bash
# 1. Start the plan
/plan:set feature-auth
# Output:
#   Created branch 'plan/feature-auth'
#   Pushed to remote

# 2. Implement tasks (commits pushed automatically)
/plan:implement 1.1 1.2 1.3
# Each task: committed + pushed

# 3. Create PR for review
/plan:complete --pr
# Output:
#   Pushed plan/feature-auth to origin
#   Created PR: https://github.com/org/repo/pull/123

# 4. After PR merged on GitHub:
/plan:cleanup --delete
# Removes local branch
```

### PR Description (auto-generated)

```markdown
## Summary
Implements user authentication with JWT tokens.

### Tasks Completed
- [x] 1.1: Create auth middleware
- [x] 1.2: Add login endpoint
- [x] 1.3: Add logout endpoint
- [x] 2.1: Write auth tests
- [x] 2.2: Add rate limiting

### Configuration Changes
- Added JWT_SECRET to .env.example

---
Generated from plan: feature-auth
```

---

## Scenario 3: Long-Running Project - Phase-by-Phase

Large project with incremental merges per phase.

### Setup

```json
// .claude/git-workflow.json
{
  "strategy": "branch-per-phase",
  "sync_remote": true,
  "phase_tags": true
}
```

### Workflow

```bash
# 1. Start Phase 0
/plan:set major-refactor
# Creates: plan/major-refactor/phase-0

# 2. Complete Phase 0
/plan:implement phase:0 --autonomous
/plan:verify phase:0 --push-tags
# Creates tag: plan/major-refactor/phase-0

# 3. PR for Phase 0
/plan:complete --pr --draft
# Creates draft PR for Phase 0 only

# 4. After Phase 0 merged, start Phase 1
/plan:set major-refactor
# Creates: plan/major-refactor/phase-1

# 5. Repeat for each phase
```

### Benefits

- Smaller, reviewable PRs
- Phase tags mark milestones
- Can ship phases independently

---

## Scenario 4: CI/CD Integration

Automated execution in CI/CD pipeline.

### GitHub Actions Example

```yaml
name: Plan Execution

on:
  workflow_dispatch:
    inputs:
      plan_name:
        description: 'Plan to execute'
        required: true
      phase:
        description: 'Phase to run (or "all")'
        default: 'all'

jobs:
  execute:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set Plan
        run: |
          echo "${{ inputs.plan_name }}" > .claude/current-plan.txt
          git checkout -B "plan/${{ inputs.plan_name }}"

      - name: Execute Plan
        run: |
          # Run orchestrator in autonomous mode
          /plan:implement ${{ inputs.phase }} --autonomous --push

      - name: Create PR on Completion
        if: inputs.phase == 'all'
        run: |
          /plan:complete --pr
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Configuration for CI

```json
// .claude/git-workflow.json
{
  "auto_commit": true,
  "sync_remote": true,
  "enforce_branch": false  // CI manages branches
}
```

---

## Scenario 5: Recovering from Mistakes

Rollback scenarios when things go wrong.

### Rollback Single Task

```bash
# Oops, task 2.3 broke something
/plan:rollback task 2.3
# Reverts commit for task 2.3
# Marks task as pending in status.json

# Fix and retry
/plan:implement 2.3
```

### Rollback Entire Phase

```bash
# Phase 3 didn't work out
/plan:rollback phase 3
# Uses phase tag to revert all Phase 3 commits
# All Phase 3 tasks marked as pending
```

### Recover from Deleted Branch

```bash
# Accidentally deleted a branch
git branch -D plan/my-feature  # Oops!

# If archive exists:
git checkout -b plan/my-feature archive/plan-my-feature

# If no archive, check reflog:
git reflog
# Find commit hash, then:
git checkout -b plan/my-feature abc1234
```

---

## Scenario 6: Custom Branch Prefix

Organization using different naming convention.

### Setup

```json
// .claude/git-workflow.json
{
  "branch_prefix": "feature/plan-"
}
```

### Result

```bash
/plan:set user-auth
# Creates: feature/plan-user-auth

git branch
# * feature/plan-user-auth
#   main
```

---

## Scenario 7: Manual Commit Control

Developer who prefers batching commits.

### Setup

```json
// .claude/git-workflow.json
{
  "auto_commit": false
}
```

### Workflow

```bash
# Implement multiple tasks
/plan:implement 1.1 1.2 1.3 --autonomous
# Output: Tasks completed. Changes uncommitted.

# Review changes
git status
git diff

# Commit as a group
git add -A
git commit -m "feat(auth): implement login flow (tasks 1.1-1.3)"

# Continue with more tasks
/plan:implement 2.1 2.2 --autonomous

# Commit next group
git add -A
git commit -m "test(auth): add auth tests (tasks 2.1-2.2)"
```

---

## Scenario 8: Conflict Resolution

Handling merge conflicts before completion.

### Scenario

```bash
/plan:complete
# Output:
#   Conflicts detected:
#   - src/lib/auth.ts
#   - src/routes/api.ts
#
#   Options:
#   1. Rebase onto main
#   2. Resolve manually
#   3. Abort
```

### Option 1: Rebase (Recommended)

```bash
# Select rebase
# System runs: git rebase main
# If auto-resolved: continues to merge
# If manual needed: opens editor
```

### Option 2: Manual Resolution

```bash
# System shows conflict files
# You edit and resolve each file

# Mark resolved
git add src/lib/auth.ts
git add src/routes/api.ts

# Continue
git rebase --continue

# Then complete
/plan:complete
```

### Option 3: Force Merge

```bash
# Skip conflict check (if you're confident)
/plan:complete --force
```

---

## Scenario 9: Cleanup Old Branches

Maintaining repository hygiene.

### Preview Stale Branches

```bash
/plan:cleanup
# Output:
#   Stale branches (>30 days inactive):
#
#   Branch                    Age    Last Commit
#   plan/old-feature         45d    abc1234: Fix login
#   plan/abandoned-test      62d    def5678: WIP tests
#
#   Run with --delete to remove
```

### Delete with Archive

```bash
/plan:cleanup --delete --archive
# Output:
#   Creating archives...
#   ✓ archive/plan-old-feature
#   ✓ archive/plan-abandoned-test
#
#   Deleting branches...
#   ✓ Deleted plan/old-feature
#   ✓ Deleted plan/abandoned-test
```

### Cleanup Archives Too

```bash
/plan:cleanup --delete
# Also shows expired archive tags (>90 days)
# and offers to delete them

# Or keep archives forever:
/plan:cleanup --delete --keep-archives
```

---

## Scenario 10: Multiple Plans in Parallel

Working on multiple features simultaneously.

### Workflow

```bash
# Start first plan
/plan:set feature-a
/plan:implement 1.1 1.2

# Switch to urgent fix
/plan:set hotfix-b
/plan:implement all --autonomous
/plan:complete  # Merge hotfix immediately

# Resume first plan
/plan:set feature-a
# Auto-switches back to plan/feature-a
/plan:implement 1.3 1.4
```

### Viewing All Plan Branches

```bash
git branch -a | grep plan/
# plan/feature-a
# plan/feature-c
# plan/old-stuff
```

---

## Configuration Presets

### Minimal (Solo Developer)

```json
{
  "archive_branches": false,
  "phase_tags": false,
  "sync_remote": false
}
```

### Team Standard

```json
{
  "sync_remote": true,
  "phase_tags": true,
  "archive_branches": true,
  "merge_strategy": "squash"
}
```

### Strict Enterprise

```json
{
  "enforce_branch": true,
  "sync_remote": true,
  "archive_branches": true,
  "archive_retention_days": 365,
  "cleanup_age_days": 90,
  "phase_tags": true
}
```

### CI/CD Optimized

```json
{
  "auto_commit": true,
  "sync_remote": true,
  "enforce_branch": false,
  "merge_strategy": "squash"
}
```
