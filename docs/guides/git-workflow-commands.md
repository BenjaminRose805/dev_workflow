# Git Workflow Commands Reference

Complete reference for all plan commands with git workflow integration.

---

## Commands Overview

| Command | Purpose | Key Flags |
|---------|---------|-----------|
| `/plan:set` | Set active plan, create/switch branch | `--push` |
| `/plan:implement` | Implement tasks with auto-commit | `--push`, `--autonomous` |
| `/plan:verify` | Verify tasks, create phase tags | `--push-tags` |
| `/plan:complete` | Complete plan, merge or PR | `--pr`, `--draft`, `--merge`, `--force` |
| `/plan:cleanup` | Remove stale branches | `--delete`, `--archive`, `--yes` |
| `/plan:rollback` | Rollback tasks or phases | `phase`, `task` |

---

## /plan:set

Sets the active plan and creates/switches to the plan branch.

### Usage

```bash
/plan:set [plan-name]
/plan:set [plan-name] --push
```

### Arguments

| Argument | Description |
|----------|-------------|
| `plan-name` | Plan filename (with or without path/extension) |

### Flags

| Flag | Description |
|------|-------------|
| `--push` | Push branch to remote after creation |

### Behavior

1. Reads plan from `docs/plans/{plan-name}.md`
2. Creates branch `plan/{plan-name}` if it doesn't exist
3. Switches to the plan branch
4. Sets plan as active in `.claude/current-plan.txt`
5. If `sync_remote: true` or `--push`, pushes to remote

### Examples

```bash
# Set plan and create branch
/plan:set my-feature

# Set plan and push to remote
/plan:set my-feature --push

# Set plan with full path
/plan:set docs/plans/my-feature.md
```

---

## /plan:implement

Implements plan tasks with automatic commits.

### Usage

```bash
/plan:implement [task-ids] [flags]
/plan:implement phase:N [flags]
/plan:implement all [flags]
```

### Arguments

| Argument | Description |
|----------|-------------|
| `task-ids` | Space-separated task IDs (e.g., `1.1 1.2 1.3`) |
| `phase:N` | All pending tasks in phase N |
| `all` | All pending tasks |

### Flags

| Flag | Description |
|------|-------------|
| `--autonomous` | Skip all interactive prompts |
| `--push` | Push commits to remote after each task |

### Behavior

1. Validates current branch matches plan (if `enforce_branch: true`)
2. Implements each task
3. Creates commit: `[plan-name] task {id}: {description}`
4. If `sync_remote: true` or `--push`, pushes after each commit

### Commit Format

```
[plan-name] task 1.1: Create authentication middleware

Plan: plan-name
Phase: 1 - Setup
Task: 1.1
```

### Examples

```bash
# Implement single task
/plan:implement 1.1

# Implement multiple tasks
/plan:implement 1.1 1.2 1.3

# Implement entire phase
/plan:implement phase:1

# Implement all with auto-push
/plan:implement all --autonomous --push
```

---

## /plan:verify

Verifies task completion and creates phase tags.

### Usage

```bash
/plan:verify [task-ids] [flags]
/plan:verify phase:N [flags]
/plan:verify all [flags]
```

### Arguments

| Argument | Description |
|----------|-------------|
| `task-ids` | Space-separated task IDs to verify |
| `phase:N` | Verify all tasks in phase N |
| `all` | Verify all completed tasks |

### Flags

| Flag | Description |
|------|-------------|
| `--autonomous` | Skip interactive prompts |
| `--push-tags` | Push phase tags to remote |

### Phase Tags

When all tasks in a phase are complete, creates tag:
```
plan/{plan-name}/phase-{N}
```

Tag annotation includes:
- Phase name and number
- Plan name
- Task count
- Timestamp

### Examples

```bash
# Verify specific tasks
/plan:verify 1.1 1.2

# Verify phase and push tags
/plan:verify phase:1 --push-tags

# Verify all with auto-push
/plan:verify all --autonomous --push-tags
```

---

## /plan:complete

Completes a plan by merging to main or creating a PR.

### Usage

```bash
/plan:complete [flags]
```

### Flags

| Flag | Description | Default |
|------|-------------|---------|
| `--pr` | Create GitHub PR instead of local merge | - |
| `--draft` | Create PR as draft (requires `--pr`) | - |
| `--merge <strategy>` | Merge strategy: `squash`, `commit`, `ff` | From config |
| `--force` | Skip conflict detection | - |
| `--no-archive` | Skip archive tag creation | - |

### Merge Strategies

| Strategy | Description | Git Command |
|----------|-------------|-------------|
| `squash` | Combine all commits into one | `git merge --squash` |
| `commit` | Create merge commit | `git merge --no-ff` |
| `ff` | Fast-forward if possible | `git merge --ff-only` |

### PR Creation

When `--pr` is used:
1. Checks for conflicts (dry-run merge)
2. Pushes branch to remote
3. Creates PR with `gh pr create`
4. Outputs PR URL
5. Skips local merge

### Conflict Detection

Before merge, performs dry-run to detect conflicts:
- If conflicts found, offers: Rebase, Manual resolve, Abort
- Use `--force` to skip this check

### Examples

```bash
# Complete with default settings
/plan:complete

# Create PR
/plan:complete --pr

# Create draft PR
/plan:complete --pr --draft

# Use specific merge strategy
/plan:complete --merge commit

# Force merge without conflict check
/plan:complete --force
```

---

## /plan:cleanup

Removes stale plan branches and expired archive tags.

### Usage

```bash
/plan:cleanup [flags]
```

### Flags

| Flag | Description |
|------|-------------|
| `--delete` | Actually delete branches (otherwise preview only) |
| `--archive` | Create archive tags before deletion |
| `--yes` | Skip confirmation prompt |
| `--keep-archives` | Don't cleanup expired archive tags |

### Stale Detection

Branch is considered stale if:
- No commits in `cleanup_age_days` (default: 30)
- Not the current branch
- Matches plan branch pattern

### Archive Tags

When `--archive` is used:
- Creates `archive/plan-{branch-name}` tag
- Preserves full commit history
- Tagged before branch deletion

### Archive Retention

Archive tags older than `archive_retention_days` (default: 90) are listed for cleanup.
Use `--keep-archives` to skip this.

### Examples

```bash
# Preview stale branches
/plan:cleanup

# Delete with archive
/plan:cleanup --delete --archive

# Delete without confirmation
/plan:cleanup --delete --yes

# Delete but keep old archives
/plan:cleanup --delete --keep-archives
```

---

## /plan:rollback

Rollback completed tasks or phases.

### Usage

```bash
/plan:rollback task <task-id>
/plan:rollback phase <phase-number>
```

### Arguments

| Argument | Description |
|----------|-------------|
| `task <id>` | Rollback specific task (e.g., `1.1`) |
| `phase <N>` | Rollback entire phase |

### Phase Rollback with Tags

If phase tags exist (`phase_tags: true`):
- Uses tag `plan/{plan-name}/phase-{N}` as reference
- Reverts all commits after that tag

### Examples

```bash
# Rollback single task
/plan:rollback task 1.3

# Rollback entire phase
/plan:rollback phase 2
```

---

## Configuration Options

All options in `.claude/git-workflow.json`:

### Branching

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `strategy` | string | `"branch-per-plan"` | `branch-per-plan` or `branch-per-phase` |
| `branch_prefix` | string | `"plan/"` | Prefix for branch names |
| `enforce_branch` | boolean | `true` | Require correct plan branch |

### Commits

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `auto_commit` | boolean | `true` | Commit after each task |
| `merge_strategy` | string | `"squash"` | Default: `squash`, `commit`, `ff` |

### Remote

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `sync_remote` | boolean | `false` | Auto-push after commits |

### Tags & Archives

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `phase_tags` | boolean | `true` | Create phase completion tags |
| `archive_branches` | boolean | `true` | Archive before deletion |
| `archive_retention_days` | integer | `90` | Days to keep archives |

### Cleanup

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `cleanup_age_days` | integer | `30` | Days before branch is stale |

### Example Configuration

```json
{
  "strategy": "branch-per-plan",
  "branch_prefix": "plan/",
  "auto_commit": true,
  "merge_strategy": "squash",
  "sync_remote": false,
  "phase_tags": true,
  "archive_branches": true,
  "archive_retention_days": 90,
  "enforce_branch": true,
  "cleanup_age_days": 30
}
```

---

## Quick Reference

### Common Workflows

```bash
# Start working on a plan
/plan:set my-plan

# Implement tasks
/plan:implement phase:1 --autonomous

# Verify and tag
/plan:verify phase:1 --push-tags

# Complete with PR
/plan:complete --pr

# Cleanup old branches
/plan:cleanup --delete --archive
```

### Git Commands Used

| Operation | Command |
|-----------|---------|
| Create branch | `git checkout -b plan/{name}` |
| Switch branch | `git checkout plan/{name}` |
| Commit | `git commit -m "[plan] task X: desc"` |
| Push branch | `git push -u origin plan/{name}` |
| Push commits | `git push` |
| Create tag | `git tag -a plan/{name}/phase-N -m "..."` |
| Push tag | `git push origin plan/{name}/phase-N` |
| Squash merge | `git merge --squash plan/{name}` |
| Create PR | `gh pr create --title "..." --body "..."` |
| Delete branch | `git branch -D plan/{name}` |
