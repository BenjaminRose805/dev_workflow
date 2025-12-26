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

## Subcommand Structure

This command uses a subcommand pattern with three distinct operations:

### `task` Subcommand

Rolls back a single task by reverting its commit.

| Aspect | Value |
|--------|-------|
| Syntax | `/plan:rollback task <id>` |
| Target | Task ID (e.g., `1.1`, `2.3`, `0.1`) |
| Git Operation | `git revert <sha> --no-edit` |
| Commit Pattern | `git log --grep="task <id>:" --format="%H" -1` |
| Status Update | Mark task as `pending` (allowing re-implementation) |
| Edge Cases | Analysis-only tasks (no commit), batch commits |

### `phase` Subcommand

Rolls back all tasks in a phase by reverting the commit range.

| Aspect | Value |
|--------|-------|
| Syntax | `/plan:rollback phase <n>` |
| Target | Phase number (e.g., `1`, `2`, `0`) |
| Git Operation | Revert all phase commits in reverse order |
| Commit Pattern | `git log --grep="\\[plan\\] task <n>\\." --format="%H" --reverse` |
| Status Update | Mark all phase tasks as `pending` |
| Edge Cases | Partial phases (some tasks without commits) |

### `plan` Subcommand

Rolls back an entire plan. Behavior depends on whether plan is merged or unmerged.

| Aspect | Unmerged Plan | Merged Plan |
|--------|---------------|-------------|
| Syntax | `/plan:rollback plan --force` | `/plan:rollback plan` |
| Detection | `git rev-parse --verify plan/<name>` succeeds | Branch doesn't exist |
| Git Operation | `git branch -D plan/<name>` | `git revert <merge-sha> --no-edit` |
| Commit Pattern | N/A (deletes branch) | `git log --grep="Plan: <name>" --format="%H" -1` |
| Requires `--force` | Yes (destructive) | No |
| Backup | Creates tag `backup/plan-<name>-<timestamp>` | N/A |

### Subcommand Routing

```
parse arguments → extract subcommand

if subcommand == "task":
    → validate task ID format (X.Y)
    → locate task commit
    → revert commit
    → update status.json

else if subcommand == "phase":
    → validate phase number (integer)
    → find all phase commits
    → revert in reverse order
    → update all task statuses

else if subcommand == "plan":
    → detect merged vs unmerged
    → if unmerged: require --force, delete branch
    → if merged: revert merge commit
    → update plan status
```

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

Use git log with --grep to find the commit by task ID pattern:

```bash
# Get plan name for commit message pattern
PLAN_NAME=$(basename "$PLAN_PATH" .md)

# Find commit by task ID in commit message
# Pattern matches: "[plan-name] task X.Y: description"
COMMIT_SHA=$(git log --grep="task $TASK_ID:" --format="%H" -1)
```

**Commit lookup details:**
- Uses `--grep` to search commit messages for the task ID pattern
- The pattern `task X.Y:` matches the commit format from `/plan:implement`
- `--format="%H"` returns only the full commit hash
- `-1` limits to the most recent matching commit (handles re-implementations)

**Alternative patterns to try if primary fails:**
```bash
# Try with plan name prefix (more specific)
git log --grep="\\[$PLAN_NAME\\] task $TASK_ID:" --format="%H" -1

# Try case-insensitive match
git log --grep="task $TASK_ID:" --format="%H" -1 -i
```

**Step 2: Determine task type and handle accordingly**

Check if the task exists and whether it was ever committed:

```bash
# Check if commit was found
if [ -z "$COMMIT_SHA" ]; then
  # No commit found - check task status in status.json
  TASK_STATUS=$(node scripts/status-cli.js --plan="$PLAN_PATH" status | jq -r ".tasks[] | select(.id == \"$TASK_ID\") | .status")

  if [ "$TASK_STATUS" = "completed" ]; then
    # Task marked complete but no commit found - likely analysis-only
    echo "⚠ Task $TASK_ID appears to be analysis-only (no commit found)"
    # Proceed to status-only rollback (Step 4)
  elif [ "$TASK_STATUS" = "pending" ]; then
    echo "⚠ Task $TASK_ID has status 'pending' - nothing to rollback"
    exit 0
  else
    # Task has some status but no commit
    echo "⚠ No commit found for task $TASK_ID"
  fi
fi
```

**Step 2a: Handle commit not found**

If no commit is found but the task needs rollback:

```
⚠ No commit found for task $TASK_ID

This may happen if:
- The task was never committed (analysis-only task)
- The commit message format differs from expected pattern
- The task was implemented in a batch commit with different ID

Options:
○ Mark task as pending (status update only) - Choose for analysis-only tasks
○ Search with alternate patterns - Choose if commit format may differ
○ Cancel rollback - Choose if unsure
```

**Analysis-only task detection:**
```bash
# Analysis-only tasks typically:
# 1. Have status "completed" in status.json
# 2. Have findings written to docs/plan-outputs/{plan}/findings/{task-id}.md
# 3. Have no associated commit

FINDINGS_PATH="docs/plan-outputs/$PLAN_NAME/findings/$TASK_ID.md"
if [ -f "$FINDINGS_PATH" ] && [ -z "$COMMIT_SHA" ]; then
  IS_ANALYSIS_ONLY=true
  echo "Detected analysis-only task (has findings, no commit)"
fi
```

**Step 2b: Handle analysis-only tasks**

For tasks that only produced analysis/findings without code changes:

```
Task $TASK_ID is analysis-only (no code commit).

Findings file: docs/plan-outputs/$PLAN_NAME/findings/$TASK_ID.md

Rollback actions:
1. ✓ Mark task status as pending (allowing re-analysis)
2. ? Delete findings file? (optional - preserves by default)

Proceeding with status-only rollback...
```

```bash
# For analysis-only rollback, just update status
# Skip git revert since there's no commit
SKIP_GIT_REVERT=true
```

**Step 3: Revert the commit (if found)**

Execute `git revert <sha> --no-edit` to create a new commit that undoes the task changes.

```bash
if [ -n "$COMMIT_SHA" ] && [ "$SKIP_GIT_REVERT" != "true" ]; then
  # Show what will be reverted
  echo "Found commit: ${COMMIT_SHA:0:7}"
  git show $COMMIT_SHA --stat --oneline

  # If not --dry-run, revert
  if [ "$DRY_RUN" != "true" ]; then
    # Execute the revert with --no-edit to auto-generate commit message
    if git revert $COMMIT_SHA --no-edit; then
      REVERT_SHA=$(git rev-parse HEAD)
      echo "✓ Created revert commit: ${REVERT_SHA:0:7}"
    else
      # Revert failed - likely due to conflicts
      REVERT_FAILED=true
      echo "⚠ Revert failed - conflicts detected"
    fi
  else
    echo "[DRY RUN] Would revert commit $COMMIT_SHA"
  fi
fi
```

**Revert command details:**
| Option | Purpose |
|--------|---------|
| `git revert <sha>` | Create a new commit that reverses the specified commit |
| `--no-edit` | Accept the auto-generated revert message without opening editor |
| `--no-commit` | (alternative) Stage changes without committing - use for batching |

**Handling revert conflicts:**

If the revert encounters conflicts (files modified since the original commit):

```bash
if [ "$REVERT_FAILED" = "true" ]; then
  echo ""
  echo "Revert encountered conflicts. Options:"
  echo ""
  echo "  1. Resolve manually:"
  echo "     - Edit conflicting files"
  echo "     - git add <files>"
  echo "     - git revert --continue"
  echo ""
  echo "  2. Abort the revert:"
  echo "     - git revert --abort"
  echo ""
  echo "  3. Skip this commit (for phase/plan rollback):"
  echo "     - git revert --skip"
  echo ""

  # Show conflicting files
  echo "Conflicting files:"
  git diff --name-only --diff-filter=U

  # Exit with error - caller must handle
  exit 1
fi
```

**Generated revert commit message:**

The `--no-edit` flag generates a message like:
```
Revert "[plan-name] task 1.1: Create auth middleware"

This reverts commit a1b2c3d4e5f6...
```

**Step 4: Update status.json**

Mark the task as `pending` (allowing re-implementation) or `rolled_back`:

```bash
# Determine new status
# - Use 'pending' if task should be re-implemented
# - Use status-cli mark-skipped with reason for rolled back state

if [ "$DRY_RUN" != "true" ]; then
  node scripts/status-cli.js --plan="$PLAN_PATH" mark-skipped "$TASK_ID" \
    --reason="Rolled back via /plan:rollback"
  echo "✓ Task $TASK_ID marked as skipped (rolled back)"
fi
```

**Status update options:**
| Scenario | New Status | Command |
|----------|------------|---------|
| Normal rollback | `skipped` with rollback reason | `mark-skipped --reason="Rolled back"` |
| Analysis-only rollback | `skipped` with analysis note | `mark-skipped --reason="Analysis rolled back"` |
| Re-implementation desired | Reset to pending state | `mark-skipped --reason="Rolled back for re-implementation"` |

**Example output (normal task with commit):**

```
Rolling back task 1.1...

Locating commit...
  Found commit: a1b2c3d
  [plan-name] task 1.1: Create auth middleware

  Files changed:
    src/middleware/auth.ts     | 45 ++++++++
    src/lib/jwt-utils.ts       | 120 ++++++++++++++++++
    src/routes/index.ts        | 5 +-

Reverting commit...
  ✓ Created revert commit: d3c2b1a

Updating status...
  ✓ Task 1.1 marked as skipped (rolled back)

Rollback complete.
```

**Example output (analysis-only task):**

```
Rolling back task 0.2...

Locating commit...
  ⊘ No commit found

Checking task type...
  ✓ Task has findings file: docs/plan-outputs/my-plan/findings/0.2.md
  ✓ Detected as analysis-only task

Performing status-only rollback...
  (No git revert needed - no code changes to undo)

Updating status...
  ✓ Task 0.2 marked as skipped (analysis rolled back)

Rollback complete.
Findings file preserved at: docs/plan-outputs/my-plan/findings/0.2.md
```

**Example output (commit not found - error case):**

```
Rolling back task 2.3...

Locating commit...
  ⚠ No commit found matching pattern "task 2.3:"

Trying alternate patterns...
  ⚠ No commit found with plan prefix "[my-plan] task 2.3:"

Task status: completed

This may indicate:
- The task was implemented but commit message format differs
- The task was part of a batch commit with a different ID
- The task was committed on a different branch

Options:
  1. Mark as pending anyway (status-only rollback)
  2. Specify commit SHA manually: /plan:rollback task 2.3 --sha=<commit>
  3. Cancel and investigate

Select option [1-3]:
```

---

#### 4.2 Phase Rollback (`/plan:rollback phase <n>`)

Rollback all tasks in a phase by reverting the commit range.

**Step 1: Detect phase commit range**

First, identify all commits that belong to the specified phase. Phase commits follow the pattern `[plan-name] task N.X:` where N is the phase number.

```bash
# Get plan name
PLAN_NAME=$(basename "$PLAN_PATH" .md)

# Find all commits for this phase (tasks N.1, N.2, etc.)
# --reverse gives oldest first, which we'll need to find the range
PHASE_COMMITS=$(git log --grep="\\[$PLAN_NAME\\] task $PHASE_NUM\\." --format="%H" --reverse)

# Count commits found
COMMIT_COUNT=$(echo "$PHASE_COMMITS" | grep -c . || echo 0)
echo "Found $COMMIT_COUNT commits for Phase $PHASE_NUM"
```

**Commit detection patterns:**
| Pattern | Purpose |
|---------|---------|
| `[plan-name] task N.` | Matches all tasks in phase N (N.1, N.2, etc.) |
| `--format="%H"` | Return only commit SHA hashes |
| `--reverse` | Return oldest commit first (chronological order) |

**Step 2: Find first and last commit for phase**

For range-based operations, identify the commit boundaries:

```bash
# Get first (oldest) commit in the phase
FIRST_COMMIT=$(echo "$PHASE_COMMITS" | head -1)

# Get last (newest) commit in the phase
LAST_COMMIT=$(echo "$PHASE_COMMITS" | tail -1)

# Show the range
if [ -n "$FIRST_COMMIT" ] && [ -n "$LAST_COMMIT" ]; then
  echo "Phase $PHASE_NUM commit range:"
  echo "  First: ${FIRST_COMMIT:0:7} (oldest)"
  echo "  Last:  ${LAST_COMMIT:0:7} (newest)"
  echo ""

  # Show commits in the range with details
  echo "Commits in range:"
  git log --oneline $FIRST_COMMIT^..$LAST_COMMIT 2>/dev/null || \
    git log --oneline $FIRST_COMMIT~1..$LAST_COMMIT 2>/dev/null || \
    git log --oneline $FIRST_COMMIT..$LAST_COMMIT
fi
```

**Edge cases for range detection:**
| Scenario | First | Last | Handling |
|----------|-------|------|----------|
| Single commit in phase | abc123 | abc123 | Revert single commit (no range) |
| Multiple commits | abc123 | def456 | Use range revert |
| No commits found | null | null | Status-only update |
| Non-contiguous commits | abc123 | def456 | Revert individually (commits may be interspersed) |

**Checking for non-contiguous commits:**

Phase commits may not be contiguous if tasks from different phases were implemented in interleaved order:

```bash
# Get all commits between first and last
ALL_IN_RANGE=$(git rev-list $FIRST_COMMIT^..$LAST_COMMIT 2>/dev/null | wc -l)

# If more commits in range than phase commits, they're non-contiguous
if [ "$ALL_IN_RANGE" -gt "$COMMIT_COUNT" ]; then
  echo "⚠ Warning: Phase commits are non-contiguous"
  echo "  Phase commits: $COMMIT_COUNT"
  echo "  Total in range: $ALL_IN_RANGE"
  echo "  Will revert individually to avoid affecting other phases"
  NON_CONTIGUOUS=true
fi
```

**Step 3: Revert commits (range or individual)**

For contiguous commits, use range revert. For non-contiguous, revert individually.

```bash
if [ "$NON_CONTIGUOUS" = "true" ] || [ "$COMMIT_COUNT" -eq 1 ]; then
  # Revert individually from newest to oldest
  echo "Reverting $COMMIT_COUNT commits individually..."

  for SHA in $(echo "$PHASE_COMMITS" | tac); do
    echo "  Reverting ${SHA:0:7}..."
    if git revert $SHA --no-edit; then
      echo "    ✓ Reverted"
    else
      echo "    ⚠ Conflict - requires manual resolution"
      REVERT_FAILED=true
      break
    fi
  done
else
  # Use range revert: git revert <first>..<last> --no-edit
  # Note: This reverts commits in reverse order automatically
  echo "Reverting commit range ${FIRST_COMMIT:0:7}..${LAST_COMMIT:0:7}..."

  # git revert with range: reverts commits from oldest to newest
  # We need newest to oldest, so use --no-commit then commit once
  if git revert ${FIRST_COMMIT}^..${LAST_COMMIT} --no-edit; then
    echo "✓ Range revert complete"
  else
    echo "⚠ Range revert encountered conflicts"
    echo ""
    echo "Options:"
    echo "  1. Resolve conflicts, then: git revert --continue"
    echo "  2. Abort range revert: git revert --abort"
    echo "  3. Try individual reverts instead"
    REVERT_FAILED=true
  fi
fi
```

**Range revert command details:**
| Command | Effect |
|---------|--------|
| `git revert <first>^..<last> --no-edit` | Revert all commits in range, creating one revert commit per original |
| `git revert <first>..<last> --no-commit` | Stage all reverts without committing (for single combined commit) |
| `git revert <sha> --no-edit` | Revert single commit |

**Step 4: Handle partial phase**

Some tasks in the phase may not have commits (analysis-only, not yet implemented, etc.):

```
Phase 2 rollback:
  ✓ 2.1: Found commit a1b2c3d
  ✓ 2.2: Found commit b2c3d4e
  ⊘ 2.3: No commit found (status-only update)
  ✓ 2.4: Found commit c3d4e5f
```

**Step 5: Update status.json for all tasks in phase**

Mark all phase tasks as rolled back, regardless of whether they had commits:

```bash
# Get all task IDs for this phase from status.json
PHASE_TASKS=$(node scripts/status-cli.js --plan="$PLAN_PATH" status | \
  jq -r ".tasks[] | select(.id | startswith(\"$PHASE_NUM.\")) | .id")

# Track update results
UPDATED=0
SKIPPED=0

# Mark each task
for TASK_ID in $PHASE_TASKS; do
  # Get current status
  CURRENT_STATUS=$(node scripts/status-cli.js --plan="$PLAN_PATH" status | \
    jq -r ".tasks[] | select(.id == \"$TASK_ID\") | .status")

  if [ "$CURRENT_STATUS" = "completed" ] || [ "$CURRENT_STATUS" = "in_progress" ]; then
    # Mark as skipped with rollback reason
    node scripts/status-cli.js --plan="$PLAN_PATH" mark-skipped "$TASK_ID" \
      --reason="Rolled back via phase $PHASE_NUM rollback"
    echo "  ✓ Task $TASK_ID marked as skipped (rolled back)"
    UPDATED=$((UPDATED + 1))
  else
    echo "  ⊘ Task $TASK_ID already $CURRENT_STATUS (no update needed)"
    SKIPPED=$((SKIPPED + 1))
  fi
done

echo ""
echo "Status updates: $UPDATED updated, $SKIPPED unchanged"
```

**Status update summary:**
| Original Status | New Status | Reason |
|-----------------|------------|--------|
| `completed` | `skipped` | "Rolled back via phase N rollback" |
| `in_progress` | `skipped` | "Rolled back via phase N rollback" |
| `pending` | `pending` | No change needed |
| `skipped` | `skipped` | No change needed |
| `failed` | `skipped` | "Rolled back via phase N rollback" |

**Example output:**

```
Rolling back Phase 2...

Detecting commit range...
  Found 3 commits for Phase 2
  First: a1b2c3d (oldest)
  Last:  c3d4e5f (newest)

Commits in range:
  a1b2c3d - [my-plan] task 2.1: Implement feature
  b2c3d4e - [my-plan] task 2.2: Add tests
  c3d4e5f - [my-plan] task 2.4: Update docs

Reverting commit range a1b2c3d..c3d4e5f...
  ✓ Range revert complete

Updating status for 4 tasks...
  ✓ Task 2.1 marked as skipped (rolled back)
  ✓ Task 2.2 marked as skipped (rolled back)
  ⊘ Task 2.3 already pending (no update needed)
  ✓ Task 2.4 marked as skipped (rolled back)

Status updates: 3 updated, 1 unchanged

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
