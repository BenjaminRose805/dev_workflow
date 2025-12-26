# Rollback Plan

Rollback task, phase, or plan changes using git revert operations.

## Usage

```
/plan:rollback <subcommand> <target> [options]
```

**Subcommands:**
- `task <id>` - Rollback a single task by ID (e.g., `1.1`, `2.3`)
- `phase <n>` - Rollback all tasks in a phase (e.g., `1`, `2`)
- `plan [--force]` - Rollback entire plan (requires `--force` for unmerged plans)

**Options:**
- `--dry-run` - Show what would be reverted without making changes
- `--force` - Required for destructive operations (e.g., deleting unmerged plan branch)

## Instructions

### 1. Load Active Plan and Initialize Status

**See:** `.claude/commands/plan/_common/status-tracking.md` for complete status tracking reference.

**Quick reference:**
1. Read `.claude/current-plan.txt` to get the active plan path
2. If no active plan: inform user "No active plan set. Use /plan:set to choose a plan first." and stop
3. Call `initializePlanStatus(planPath)` to ensure status.json exists
4. Output directory is derived from plan name: `docs/plan-outputs/{plan-name}/`

### 2. Parse Arguments

Parse the subcommand and target from the provided arguments.

**Argument structure:**

```
/plan:rollback <subcommand> [target] [options]
                    │          │        │
                    │          │        └── --dry-run, --force
                    │          └── task ID (X.Y), phase number (N), or empty
                    └── task, phase, or plan
```

**Parsing algorithm:**

```
args = skill arguments (string)
tokens = split args on whitespace

# Extract options first (flags starting with --)
options = []
for token in tokens:
  if token starts with "--":
    options.push(token)
    remove from tokens

# Parse subcommand
subcommand = tokens[0] (lowercase)
if subcommand not in ["task", "phase", "plan"]:
  ERROR: "Unknown subcommand '$subcommand'. Expected: task, phase, or plan"

# Parse target based on subcommand
target = tokens[1] (if exists)
```

**Validation rules:**

| Subcommand | Target Required | Valid Format | Validation |
|------------|-----------------|--------------|------------|
| `task` | Yes | `X.Y` (e.g., `1.1`, `2.3`, `0.1`) | Must match `/^\d+\.\d+$/` |
| `phase` | Yes | Integer `N` (e.g., `1`, `2`, `0`) | Must match `/^\d+$/` |
| `plan` | No | None (optional `--force` flag) | N/A |

**Target validation against plan:**

After syntax validation, verify the target exists in the plan:

```
# For task rollback
if subcommand == "task":
  # Check task exists in status.json
  status = getStatus(planPath)
  task = status.tasks.find(t => t.id === target)
  if not task:
    ERROR: "Task '$target' not found in plan. Available tasks: ..."
  if task.status == "pending":
    WARN: "Task '$target' has status 'pending' - nothing to rollback"

# For phase rollback
if subcommand == "phase":
  # Check phase exists
  phaseTasks = status.tasks.filter(t => t.id.startsWith(target + "."))
  if phaseTasks.length == 0:
    ERROR: "Phase $target not found in plan. Available phases: ..."
  completedTasks = phaseTasks.filter(t => t.status == "completed")
  if completedTasks.length == 0:
    WARN: "No completed tasks in Phase $target - nothing to rollback"
```

**Error cases:**

```
# Missing subcommand
/plan:rollback
→ Error: Missing subcommand. Usage: /plan:rollback <task|phase|plan> <target>

# Unknown subcommand
/plan:rollback foo
→ Error: Unknown subcommand 'foo'. Expected: task, phase, or plan

# Missing target for task
/plan:rollback task
→ Error: Missing task ID. Usage: /plan:rollback task <id>

# Invalid task ID format
/plan:rollback task abc
→ Error: Invalid task ID 'abc'. Expected format: X.Y (e.g., 1.1, 2.3)

# Task not found in plan
/plan:rollback task 99.1
→ Error: Task '99.1' not found in plan.

# Missing target for phase
/plan:rollback phase
→ Error: Missing phase number. Usage: /plan:rollback phase <n>

# Invalid phase number
/plan:rollback phase abc
→ Error: Invalid phase number 'abc'. Expected integer (e.g., 1, 2)

# Phase not found in plan
/plan:rollback phase 99
→ Error: Phase 99 not found in plan. Available phases: 0, 1, 2, 3

# Plan rollback without --force (unmerged)
/plan:rollback plan
→ Error: Plan branch exists (unmerged). Use --force to delete branch.
```

**Option handling:**

| Option | Effect |
|--------|--------|
| `--dry-run` | Show what would be reverted without making changes |
| `--force` | Required for destructive operations (delete unmerged branch) |
| `--no-status-update` | Skip updating status.json (for manual recovery) |

**Parsed result structure:**

```javascript
{
  subcommand: "task" | "phase" | "plan",
  target: "1.1" | "2" | null,
  options: {
    dryRun: boolean,
    force: boolean,
    noStatusUpdate: boolean
  }
}
```

### 3. Verify Git Availability

Before performing any rollback, verify git is available:

```bash
git --version 2>/dev/null
```

- If command fails: Error "Git is not available. Rollback requires git." and stop
- If command succeeds: Continue with rollback

### 4. Execute Subcommand

Based on the parsed subcommand, execute the appropriate rollback logic.

---

#### 4.1 Task Rollback (`/plan:rollback task <id>`)

Rollback a single task by reverting its commit.

**Step 1: Locate the task commit**

```bash
# Get plan name for commit message pattern
PLAN_NAME=$(basename "$PLAN_PATH" .md)

# Find commit by task ID in commit message
git log --grep="task $TASK_ID:" --format="%H" -1
```

**Step 2: Handle commit not found**

If no commit is found:
```
⚠ No commit found for task $TASK_ID

This may happen if:
- The task was never committed (analysis-only task)
- The commit message format differs from expected pattern
- The task was implemented in a batch commit

Would you like to:
○ Mark task as pending (status update only)
○ Cancel rollback
```

**Step 3: Revert the commit**

```bash
# Show what will be reverted
git show $SHA --stat

# If not --dry-run, revert
git revert $SHA --no-edit
```

**Step 4: Update status.json**

Mark the task as `pending` (allowing re-implementation) or `rolled_back`:

```bash
node scripts/status-cli.js --plan="$PLAN_PATH" mark-skipped "$TASK_ID" --reason="Rolled back via /plan:rollback"
```

**Example output:**

```
Rolling back task 1.1...

Found commit: a1b2c3d
  [plan-name] task 1.1: Create auth middleware

Reverting commit...
  ✓ Created revert commit: d3c2b1a

Updating status...
  ✓ Task 1.1 marked as pending

Rollback complete.
```

---

#### 4.2 Phase Rollback (`/plan:rollback phase <n>`)

Rollback all tasks in a phase by reverting the commit range.

**Step 1: Identify phase commits**

```bash
# Get plan name
PLAN_NAME=$(basename "$PLAN_PATH" .md)

# Find all commits for this phase (tasks N.1, N.2, etc.)
git log --grep="\\[$PLAN_NAME\\] task $PHASE_NUM\\." --format="%H" --reverse
```

**Step 2: Handle partial phase**

Some tasks in the phase may not have commits (analysis-only, not yet implemented, etc.):

```
Phase 2 rollback:
  ✓ 2.1: Found commit a1b2c3d
  ✓ 2.2: Found commit b2c3d4e
  ⊘ 2.3: No commit found (status-only update)
  ✓ 2.4: Found commit c3d4e5f
```

**Step 3: Revert commits in reverse order**

```bash
# Revert from newest to oldest to avoid conflicts
for SHA in $(echo "$COMMITS" | tac); do
  git revert $SHA --no-edit
done
```

**Step 4: Update status.json for all tasks in phase**

```bash
# Mark all phase tasks as pending
for TASK_ID in $(get_phase_tasks $PHASE_NUM); do
  node scripts/status-cli.js --plan="$PLAN_PATH" mark-skipped "$TASK_ID" --reason="Rolled back via phase rollback"
done
```

**Example output:**

```
Rolling back Phase 2...

Found 3 commits for Phase 2:
  a1b2c3d - task 2.1: Implement feature
  b2c3d4e - task 2.2: Add tests
  c3d4e5f - task 2.4: Update docs

Reverting commits (newest first)...
  ✓ Reverted c3d4e5f
  ✓ Reverted b2c3d4e
  ✓ Reverted a1b2c3d

Updating status for 4 tasks...
  ✓ Task 2.1 marked as pending
  ✓ Task 2.2 marked as pending
  ✓ Task 2.3 marked as pending (no commit)
  ✓ Task 2.4 marked as pending

Phase 2 rollback complete.
```

---

#### 4.3 Plan Rollback (`/plan:rollback plan [--force]`)

Rollback an entire plan. Behavior depends on whether the plan is merged or unmerged.

**Step 1: Detect plan state**

```bash
# Get plan branch name
PLAN_NAME=$(basename "$PLAN_PATH" .md)
BRANCH_NAME="plan/$PLAN_NAME"

# Check if branch exists (unmerged) or has been merged
git rev-parse --verify "$BRANCH_NAME" 2>/dev/null
```

**Step 2a: Unmerged plan rollback (branch exists)**

For unmerged plans, the entire branch will be deleted. This is destructive.

```
⚠ Plan '$PLAN_NAME' has not been merged.

This will DELETE the branch 'plan/$PLAN_NAME' and all commits.
This action cannot be undone.

Use --force to confirm deletion.
```

If `--force` is provided:

```bash
# Switch to main first
git checkout main

# Delete the plan branch
git branch -D "plan/$PLAN_NAME"
```

**Step 2b: Merged plan rollback (branch deleted after merge)**

For merged plans, find and revert the merge commit:

```bash
# Find the merge/squash commit
git log main --grep="Plan: $PLAN_NAME" --format="%H" -1
```

If found, revert the merge:

```bash
git revert $MERGE_SHA --no-edit
```

**Step 3: Update status.json**

Mark entire plan as rolled back:

```bash
# Mark all tasks as pending
node scripts/status-cli.js --plan="$PLAN_PATH" validate
```

**Example output (unmerged):**

```
Rolling back plan 'my-feature'...

Plan state: Unmerged (branch exists)

⚠ This will delete branch 'plan/my-feature' with 5 commits.
Proceeding with --force...

Switching to main...
  ✓ Checked out 'main'

Deleting plan branch...
  ✓ Deleted branch 'plan/my-feature'

Plan rollback complete.
```

**Example output (merged):**

```
Rolling back plan 'my-feature'...

Plan state: Merged

Found merge commit: f6e5d4c
  Merge plan 'my-feature' into main

Reverting merge commit...
  ✓ Created revert commit: c4d5e6f

Plan rollback complete.
```

---

## Examples

### Example 1: Rollback a single task

**Scenario:** Task 1.1 was implemented but introduced a bug. You want to revert just that task.

```bash
# First, preview what will be rolled back
/plan:rollback task 1.1 --dry-run
```

**Output:**
```
[DRY RUN] Would rollback task 1.1

Task: 1.1 - Create auth middleware
Status: completed
Commit: a1b2c3d4 (2024-12-24 10:30:15)

Changes that would be reverted:
  M src/middleware/auth.ts (45 lines)
  A src/lib/jwt-utils.ts (120 lines)
  M src/routes/index.ts (5 lines)

No changes made (--dry-run mode).
```

```bash
# Execute the rollback
/plan:rollback task 1.1
```

**Output:**
```
Rolling back task 1.1...

Found commit: a1b2c3d4
  [my-plan] task 1.1: Create auth middleware

Reverting commit...
  ✓ Created revert commit: e5f6g7h8

Updating status...
  ✓ Task 1.1 marked as pending

Rollback complete. Task 1.1 can now be re-implemented.
```

---

### Example 2: Rollback an entire phase

**Scenario:** Phase 2 tasks all need to be redone due to a design change.

```bash
# Preview which tasks and commits will be affected
/plan:rollback phase 2 --dry-run
```

**Output:**
```
[DRY RUN] Would rollback Phase 2

Phase 2: Add Authentication (4 tasks)

Tasks in phase:
  2.1 [completed] Implement login endpoint
      Commit: b2c3d4e5
  2.2 [completed] Add session management
      Commit: c3d4e5f6
  2.3 [pending]   Add logout endpoint
      (no commit - status update only)
  2.4 [completed] Add auth tests
      Commit: d4e5f6g7

Commits to revert (newest first):
  d4e5f6g7 - task 2.4: Add auth tests
  c3d4e5f6 - task 2.2: Add session management
  b2c3d4e5 - task 2.1: Implement login endpoint

Total: 3 commits, 4 status updates

No changes made (--dry-run mode).
```

```bash
# Execute the phase rollback
/plan:rollback phase 2
```

---

### Example 3: Rollback an unmerged plan (discard work)

**Scenario:** You want to abandon an incomplete plan and delete all work.

```bash
# This will fail without --force
/plan:rollback plan
```

**Output:**
```
⚠ Plan 'my-feature' has not been merged.

Branch: plan/my-feature
Commits: 8
Status: 5/12 tasks completed

This will DELETE the branch and all commits.
This action cannot be undone.

Use --force to confirm deletion:
  /plan:rollback plan --force
```

```bash
# Confirm with --force
/plan:rollback plan --force
```

**Output:**
```
Rolling back plan 'my-feature'...

⚠ Destructive operation: Deleting unmerged branch

Creating backup tag...
  ✓ Created tag: backup/plan-my-feature-20241224-103015

Switching to main...
  ✓ Checked out 'main'

Deleting plan branch...
  ✓ Deleted branch 'plan/my-feature'

Plan rollback complete.
Backup available at: git checkout backup/plan-my-feature-20241224-103015
```

---

### Example 4: Rollback a merged plan

**Scenario:** A plan was completed and merged, but you need to undo it.

```bash
/plan:rollback plan
```

**Output:**
```
Rolling back plan 'my-feature'...

Plan state: Merged

Searching for merge commit...
Found: f6e5d4c3
  Squash merge: plan/my-feature into main

  Summary of changes in merge:
    12 files changed
    +450 insertions, -23 deletions

Reverting merge commit...
  ✓ Created revert commit: g7h8i9j0

Plan rollback complete.
All plan changes have been reverted on main.
```

---

### Example 5: Combining with other commands

**Workflow: Re-implement a task after rollback**

```bash
# Step 1: Rollback the problematic task
/plan:rollback task 3.2

# Step 2: Verify status shows task as pending
/plan:status

# Step 3: Re-implement with corrected approach
/plan:implement 3.2
```

**Workflow: Rollback and switch to different approach**

```bash
# Rollback entire phase that used wrong approach
/plan:rollback phase 2

# View tasks ready for re-implementation
/plan:status

# Implement with new approach
/plan:implement phase:2
```

---

### Quick Reference

| Command | Description |
|---------|-------------|
| `/plan:rollback task 1.1` | Rollback single task |
| `/plan:rollback task 1.1 --dry-run` | Preview task rollback |
| `/plan:rollback phase 2` | Rollback all phase 2 tasks |
| `/plan:rollback phase 2 --dry-run` | Preview phase rollback |
| `/plan:rollback plan` | Rollback merged plan |
| `/plan:rollback plan --force` | Rollback unmerged plan (delete branch) |
| `/plan:rollback plan --dry-run` | Preview plan rollback |

## Error Handling

**Common errors and solutions:**

| Error | Cause | Solution |
|-------|-------|----------|
| "No commit found for task" | Task was analysis-only or not committed | Use status update only |
| "Revert failed - conflicts" | Changes conflict with current state | Resolve conflicts manually, then continue |
| "Branch does not exist" | Plan already merged or never created | Use merged plan rollback |
| "Cannot delete branch - not on main" | Trying to delete current branch | Switch to main first |

**Conflict resolution:**

If a revert encounters conflicts:

```
⚠ Revert conflict detected

The following files have conflicts:
  - src/lib/auth.ts
  - src/routes/login.ts

Options:
○ Resolve conflicts manually (recommended)
○ Abort rollback and restore original state
○ Skip this commit and continue
```

## Safety Considerations

- **Backup before rollback:** Consider creating a backup tag before destructive operations
- **Test on feature branch:** For complex rollbacks, create a test branch first
- **Review changes:** Use `--dry-run` to preview changes before applying
- **Commit history:** Rollbacks create new revert commits, preserving history
