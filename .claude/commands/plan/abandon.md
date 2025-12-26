# Abandon Plan

Abandon the current plan, discarding all work and deleting the plan branch.

## Usage

```
/plan:abandon [options]
```

**Options:**
- `--force` - Required flag to confirm destructive operation (skip confirmation prompt)
- `--no-backup` - Skip creating backup tag (default: create backup tag)

## Instructions

### 1. Load Active Plan and Initialize Status

**See:** `.claude/commands/plan/_common/status-tracking.md` for complete status tracking reference.

**Quick reference:**
1. Read `.claude/current-plan.txt` to get the active plan path
2. If no active plan: inform user "No active plan set. Use /plan:set to choose a plan first." and stop
3. Call `initializePlanStatus(planPath)` to ensure status.json exists
4. Output directory is derived from plan name: `docs/plan-outputs/{plan-name}/`

### 2. Parse Arguments

Parse options from the provided arguments.

**Argument structure:**

```
/plan:abandon [options]
              │
              └── --force, --no-backup
```

**Parsing algorithm:**

```
args = skill arguments (string)
tokens = split args on whitespace

# Extract options (flags starting with --)
options = {
  force: false,
  noBackup: false
}

for token in tokens:
  if token == "--force":
    options.force = true
  else if token == "--no-backup":
    options.noBackup = true
  else if token starts with "--":
    WARN: "Unknown option '$token'. Ignoring."
```

**Parsed result structure:**

```javascript
{
  options: {
    force: boolean,
    noBackup: boolean
  }
}
```

### 3. Verify Git Availability

Before performing abandon, verify git is available:

```bash
git --version 2>/dev/null
```

- If command fails: Error "Git is not available. Abandon requires git." and stop
- If command succeeds: Continue with abandon

### 4. Confirmation Prompt (Skip with --force)

**CRITICAL:** Abandon is a destructive operation. Require explicit confirmation unless `--force` is provided.

**Step 1: Check if --force was provided**

```bash
if [ "$FORCE" != "true" ]; then
  # Show confirmation prompt
fi
```

**Step 2: Show confirmation prompt (without --force)**

Display a warning with plan details:

```
!!! DESTRUCTIVE OPERATION !!!

Plan: {plan-name}
Branch: plan/{plan-name}
Status: {completed}/{total} tasks completed

This will:
1. Create backup tag (unless --no-backup)
2. Switch to main branch
3. DELETE the plan branch and all commits
4. Mark the plan as abandoned in status.json

This action cannot be undone (except via backup tag).

Are you sure you want to abandon this plan?
> Yes, abandon the plan
> No, cancel
```

**Step 3: Handle user response**

- If user selects "Yes, abandon the plan": Continue with abandon
- If user selects "No, cancel": Exit with message "Abandon cancelled."

**Step 4: Abort if no --force and not confirmed**

```bash
if [ "$FORCE" != "true" ]; then
  echo "!!! Abandon requires --force flag or explicit confirmation !!!"
  echo ""
  echo "Usage: /plan:abandon --force"
  echo ""
  echo "This will permanently delete the plan branch."
  exit 1
fi
```

### 5. Handle Uncommitted Changes

Before switching branches, detect and handle uncommitted changes.

**See:** `.claude/commands/plan/_common/uncommitted-changes-protection.md` for complete uncommitted changes protection patterns.

**Step 1: Detect uncommitted changes**

```bash
# Detect uncommitted changes
UNCOMMITTED=$(git status --porcelain)
CHANGE_COUNT=$(echo "$UNCOMMITTED" | grep -c .)

if [ "$CHANGE_COUNT" -gt 0 ]; then
  echo "Uncommitted changes detected ($CHANGE_COUNT files):"
  git status --short
fi
```

**Step 2: Prompt user for action (skip with --force)**

For abandon, offer the user a choice of how to handle uncommitted changes:

```
Uncommitted changes detected ({count} files). Choose how to proceed:

○ Stash changes (Recommended) - Stash changes (can be restored later)
○ Discard changes - Discard all uncommitted changes (DESTRUCTIVE)
○ Cancel - Abort abandon, keep working on current branch
```

**Note:** "Commit changes" is not offered for abandon because the branch will be deleted anyway, making the commit pointless.

**Using AskUserQuestion:**

```javascript
{
  questions: [{
    question: `Uncommitted changes detected (${changeCount} files). How would you like to proceed?`,
    header: "Changes",
    options: [
      {
        label: "Stash changes (Recommended)",
        description: "Stash changes for later restoration with git stash pop"
      },
      {
        label: "Discard changes",
        description: "Discard all uncommitted changes permanently (DESTRUCTIVE)"
      },
      {
        label: "Cancel",
        description: "Abort the abandon operation, keep working on current branch"
      }
    ],
    multiSelect: false
  }]
}
```

**Step 3: Handle user choice**

```bash
case "$USER_CHOICE" in
    "Stash"*)
        # Stash with plan-specific message
        STASH_MSG="plan/$PLAN_NAME abandon WIP"
        if git stash push -m "$STASH_MSG"; then
            echo "Stashed uncommitted changes: $STASH_MSG"
            STASHED=true
        else
            echo "Failed to stash changes. Aborting abandon."
            exit 1
        fi
        ;;
    "Discard"*)
        # Discard all changes
        echo "Discarding uncommitted changes..."
        git checkout -- .
        git clean -fd
        echo "Changes discarded"
        ;;
    "Cancel"*)
        echo "Abandon cancelled."
        exit 0
        ;;
esac
```

**Step 4: Auto-stash in autonomous/force mode**

When `--force` is provided, auto-stash without prompting:

```bash
if [ "$FORCE" = true ] && [ "$CHANGE_COUNT" -gt 0 ]; then
    # Auto-stash in force mode
    STASH_MSG="plan/$PLAN_NAME abandon WIP"
    if git stash push -m "$STASH_MSG"; then
        echo "Auto-stashed uncommitted changes: $STASH_MSG"
        STASHED=true
    else
        echo "Warning: Failed to stash changes"
        echo "  Please manually stash or discard changes, then retry."
        exit 1
    fi
fi
```

**Step 5: Note about stashed changes**

After abandon completes, remind user about stashed changes:

```
Uncommitted changes have been stashed.
Stash: plan/{name} abandon WIP

To recover stashed changes later:
  git stash list
  git stash pop
```

**Stash Message Format:**

| Format | Example |
|--------|---------|
| `plan/{plan-name} abandon WIP` | `plan/my-feature abandon WIP` |

### 6. Create Backup Tag (Optional)

Before deleting the branch, create a backup tag for recovery.

**Note:** Skip this step if `--no-backup` option was provided.

**Step 1: Check if --no-backup was passed**

```bash
if [ "$NO_BACKUP" == "true" ]; then
  echo "Skipping backup tag (--no-backup)"
  BACKUP_TAG=""
else
  # Continue to create backup tag
fi
```

**Step 2: Create backup tag with timestamp**

```bash
# Generate timestamp
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Create tag name: backup/plan-{name}-{timestamp}
BACKUP_TAG="backup/plan-$PLAN_NAME-$TIMESTAMP"

# Create annotated tag pointing to current HEAD on plan branch
git tag -a "$BACKUP_TAG" -m "$(cat <<EOF
Backup: $PLAN_NAME (abandoned)

Plan abandoned on $(date -Iseconds)
This tag preserves the plan branch before deletion.

Status at abandonment:
  - Completed: $COMPLETED_TASKS/$TOTAL_TASKS tasks

To restore this plan:
  git checkout -b plan/$PLAN_NAME $BACKUP_TAG
EOF
)"

if [ $? -ne 0 ]; then
  echo "Warning: Failed to create backup tag"
  echo "Continuing without backup..."
  BACKUP_TAG=""
else
  echo "Created backup tag: $BACKUP_TAG"
fi
```

**Backup tag format:**
```
backup/plan-{plan-name}-{YYYYMMDD-HHMMSS}
```

**Example:**
```
backup/plan-my-feature-20241225-143022
```

**Step 3: Verify backup tag was created**

```bash
if [ -n "$BACKUP_TAG" ]; then
  # Verify tag exists and points to correct commit
  TAG_SHA=$(git rev-parse "$BACKUP_TAG" 2>/dev/null)
  if [ -n "$TAG_SHA" ]; then
    echo "  Tag points to: $(git log -1 --oneline $TAG_SHA)"
    echo ""
    echo "  To restore later:"
    echo "    git checkout -b plan/$PLAN_NAME $BACKUP_TAG"
  fi
fi
```

**Example output:**
```
Created backup tag: backup/plan-my-feature-20241225-143022
  Tag points to: abc1234 [my-feature] task 3.2: Add tests

  To restore later:
    git checkout -b plan/my-feature backup/plan-my-feature-20241225-143022
```

### 7. Switch to Main Branch

Before deleting the plan branch, switch to main.

**Step 1: Get main branch name**

```bash
# Determine the main branch (could be 'main' or 'master')
if git show-ref --verify --quiet refs/heads/main; then
  MAIN_BRANCH="main"
elif git show-ref --verify --quiet refs/heads/master; then
  MAIN_BRANCH="master"
else
  echo "Error: Neither 'main' nor 'master' branch found"
  exit 1
fi
```

**Step 2: Switch to main branch**

```bash
git checkout "$MAIN_BRANCH"
if [ $? -ne 0 ]; then
  echo "Error: Failed to switch to $MAIN_BRANCH branch"
  echo ""
  echo "This may happen if:"
  echo "  - There are uncommitted changes (should have been stashed)"
  echo "  - The main branch has issues"
  echo ""
  echo "Please resolve manually and retry."
  exit 1
fi

echo "Switched to $MAIN_BRANCH branch"
```

**Example output:**
```
Switched to main branch
```

### 8. Delete Plan Branch

Delete the plan branch permanently.

**Step 1: Verify current branch is not the plan branch**

```bash
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" == "$PLAN_BRANCH" ]; then
  echo "Error: Still on plan branch. Cannot delete current branch."
  exit 1
fi
```

**Step 2: Delete the plan branch**

```bash
PLAN_BRANCH="plan/$PLAN_NAME"

git branch -D "$PLAN_BRANCH"
if [ $? -ne 0 ]; then
  echo "Error: Failed to delete plan branch: $PLAN_BRANCH"
  echo ""
  echo "The branch may already be deleted or have other issues."
  echo "You can manually delete: git branch -D $PLAN_BRANCH"
  exit 1
fi

echo "Deleted plan branch: $PLAN_BRANCH"
```

**Step 3: Verify branch was deleted**

```bash
if git show-ref --verify --quiet "refs/heads/$PLAN_BRANCH"; then
  echo "Warning: Branch still exists: $PLAN_BRANCH"
else
  echo "  Branch successfully removed from local repository"
fi
```

**Example output:**
```
Deleted plan branch: plan/my-feature
  Branch successfully removed from local repository
```

### 9. Update Status.json with Abandoned State

Mark the plan as abandoned in status.json.

**Step 1: Load current status**

```bash
STATUS_FILE="docs/plan-outputs/$PLAN_NAME/status.json"
```

**Step 2: Add abandoned fields to status.json**

```javascript
const fs = require('fs');

const statusPath = `docs/plan-outputs/${PLAN_NAME}/status.json`;
const status = JSON.parse(fs.readFileSync(statusPath, 'utf8'));

// Add abandoned timestamp
status.abandonedAt = new Date().toISOString();

// Record backup tag if created
status.backupTag = BACKUP_TAG || null;

// Add abandoned flag
status.abandoned = true;

// Write updated status
fs.writeFileSync(statusPath, JSON.stringify(status, null, 2));
```

**Using Node.js one-liner:**

```bash
ABANDONED_AT=$(date -Iseconds)

node -e "
const fs = require('fs');
const statusPath = 'docs/plan-outputs/$PLAN_NAME/status.json';
const status = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
status.abandonedAt = '$ABANDONED_AT';
status.backupTag = '$BACKUP_TAG' || null;
status.abandoned = true;
fs.writeFileSync(statusPath, JSON.stringify(status, null, 2));
console.log('Updated status.json with abandoned state');
"
```

**Step 3: Verify status.json was updated**

```bash
node -e "
const status = require('./docs/plan-outputs/$PLAN_NAME/status.json');
if (status.abandoned === true) {
  console.log('Abandoned at:', status.abandonedAt);
  console.log('Backup tag:', status.backupTag || '(none - --no-backup)');
} else {
  console.log('Warning: abandoned flag not set');
}
"
```

**Final status.json structure after abandon:**

```json
{
  "planPath": "docs/plans/my-plan.md",
  "planName": "My Plan",
  "createdAt": "2024-12-20T10:00:00Z",
  "lastUpdatedAt": "2024-12-25T15:30:00Z",
  "abandonedAt": "2024-12-25T16:00:00Z",
  "abandoned": true,
  "backupTag": "backup/plan-my-plan-20241225-160000",
  "currentPhase": "Phase 2: Implementation",
  "tasks": [...],
  "runs": [...],
  "summary": {
    "totalTasks": 15,
    "completed": 8,
    "pending": 6,
    "in_progress": 1,
    "failed": 0,
    "skipped": 0
  }
}
```

**Example output:**
```
Updated status.json with abandoned state
  Abandoned at: 2024-12-25T16:00:00+00:00
  Backup tag: backup/plan-my-plan-20241225-160000
```

### 10. Clear Current Plan (Optional)

Clear the current plan reference if it points to the abandoned plan.

**Step 1: Check if abandoned plan is the current plan**

```bash
CURRENT_PLAN=$(cat .claude/current-plan.txt 2>/dev/null)
if [ "$CURRENT_PLAN" == "$PLAN_PATH" ]; then
  echo "Clearing current plan reference..."
  echo "" > .claude/current-plan.txt
  echo "  Current plan cleared"
fi
```

**Note:** This is optional. The user may want to keep the reference to view the status.json or access findings.

### 11. Report Summary

After successful abandon, report the summary.

**Example output:**

```
Plan Abandoned Successfully

Plan: my-feature
Branch: plan/my-feature (deleted)

Backup: backup/plan-my-feature-20241225-143022
  To restore: git checkout -b plan/my-feature backup/plan-my-feature-20241225-143022

Status at abandonment:
  - Completed: 8/15 tasks
  - In progress: 1 task
  - Pending: 6 tasks

Status file: docs/plan-outputs/my-feature/status.json
Findings preserved in: docs/plan-outputs/my-feature/findings/
```

**Example output (--no-backup):**

```
Plan Abandoned Successfully

Plan: my-feature
Branch: plan/my-feature (deleted)

No backup tag created (--no-backup specified).
All commits on the plan branch have been permanently deleted.

Status at abandonment:
  - Completed: 8/15 tasks
  - In progress: 1 task
  - Pending: 6 tasks

Status file: docs/plan-outputs/my-feature/status.json
Findings preserved in: docs/plan-outputs/my-feature/findings/
```

## Error Handling

**Common errors and solutions:**

| Error | Cause | Solution |
|-------|-------|----------|
| "Git is not available" | Git not installed or not in PATH | Install git |
| "--force required" | Safety check for destructive operation | Add --force flag |
| "Failed to stash changes" | Stash operation failed | Manually commit or stash |
| "Failed to switch to main" | Branch switch error | Resolve manually |
| "Failed to delete branch" | Branch deletion error | Manual deletion |

**Recovery from errors:**

If abandon fails partway through:

1. **Check backup tag exists:** `git tag -l "backup/plan-*"`
2. **Restore from backup:** `git checkout -b plan/{name} backup/plan-{name}-{timestamp}`
3. **Check status.json:** Review `docs/plan-outputs/{name}/status.json` for state

## Examples

### Example 1: Abandon with confirmation

```bash
/plan:abandon
```

**Output:**
```
!!! DESTRUCTIVE OPERATION !!!

Plan: my-feature
Branch: plan/my-feature
Status: 8/15 tasks completed

This will:
1. Create backup tag (unless --no-backup)
2. Switch to main branch
3. DELETE the plan branch and all commits
4. Mark the plan as abandoned in status.json

This action cannot be undone (except via backup tag).

Are you sure you want to abandon this plan?
> Yes, abandon the plan     <-- selected
> No, cancel

Creating backup tag...
  Created: backup/plan-my-feature-20241225-143022

Switching to main...
  Switched to main branch

Deleting plan branch...
  Deleted: plan/my-feature

Updating status...
  Marked as abandoned

Plan Abandoned Successfully
```

### Example 2: Abandon with --force (skip confirmation)

```bash
/plan:abandon --force
```

**Output:**
```
Abandoning plan: my-feature

Creating backup tag...
  Created: backup/plan-my-feature-20241225-143022

Switching to main...
  Switched to main branch

Deleting plan branch...
  Deleted: plan/my-feature

Updating status...
  Marked as abandoned

Plan Abandoned Successfully
Backup: backup/plan-my-feature-20241225-143022
```

### Example 3: Abandon without backup

```bash
/plan:abandon --force --no-backup
```

**Output:**
```
Abandoning plan: my-feature

Skipping backup tag (--no-backup)

Switching to main...
  Switched to main branch

Deleting plan branch...
  Deleted: plan/my-feature

Updating status...
  Marked as abandoned

Plan Abandoned Successfully

!!! WARNING: No backup was created !!!
The plan branch commits are permanently deleted.
```

### Example 4: Abandon with uncommitted changes (interactive)

```bash
/plan:abandon
```

**Output:**
```
Abandoning plan: my-feature

Uncommitted changes detected (2 files):
 M src/lib/feature.ts
 A src/tests/feature.test.ts

Choose how to proceed:
○ Stash changes (Recommended)     <-- selected
○ Discard changes
○ Cancel

Stashing changes...
  Stashed: plan/my-feature abandon WIP

!!! DESTRUCTIVE OPERATION !!!
...

Plan Abandoned Successfully

Stashed changes preserved. To recover:
  git stash list
  git stash pop
```

### Example 5: Abandon with uncommitted changes (--force auto-stash)

```bash
/plan:abandon --force
```

**Output:**
```
Abandoning plan: my-feature

Uncommitted changes detected (2 files):
 M src/lib/feature.ts
 A src/tests/feature.test.ts

Auto-stashing uncommitted changes: plan/my-feature abandon WIP

Creating backup tag...
  Created: backup/plan-my-feature-20241225-143022

Switching to main...
  Switched to main branch

Deleting plan branch...
  Deleted: plan/my-feature

Plan Abandoned Successfully

Stashed changes preserved. To recover:
  git stash list
  git stash pop
```

## Quick Reference

| Command | Description |
|---------|-------------|
| `/plan:abandon` | Abandon with confirmation prompt |
| `/plan:abandon --force` | Abandon without confirmation |
| `/plan:abandon --no-backup` | Abandon without creating backup tag |
| `/plan:abandon --force --no-backup` | Quick abandon, no backup, no confirmation |

## Safety Considerations

- **Backup by default:** A backup tag is created unless `--no-backup` is specified
- **Force required:** The `--force` flag or explicit confirmation is required
- **Stash protection:** Uncommitted changes are automatically stashed
- **Status preserved:** The status.json and findings files are preserved for reference
- **Recovery possible:** Use backup tag to restore the branch if needed
