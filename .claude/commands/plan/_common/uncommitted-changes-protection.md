# Uncommitted Changes Protection

Shared patterns for detecting and handling uncommitted changes before branch operations. This ensures no data loss when switching branches or performing destructive operations.

## Overview

Commands that switch branches or perform destructive operations should:
1. Detect uncommitted changes before the operation
2. Offer the user a choice: Commit / Stash / Cancel
3. Handle the user's choice appropriately
4. Apply stashed changes after the operation (if applicable)

**Commands that should use this pattern:**
- `/plan:set` - Branch switch when changing plans
- `/plan:complete` - Branch switch to main before merge
- `/plan:abandon` - Branch switch to main before deletion

---

## 1. Uncommitted Changes Detection

Standardized detection pattern for all commands.

### Detection Function

```bash
# Detect uncommitted changes and return count
# Returns: Number of changed files (0 if clean)
detectUncommittedChanges() {
    local status_output
    status_output=$(git status --porcelain 2>/dev/null)

    if [ -z "$status_output" ]; then
        echo "0"
        return 1  # false - no changes
    else
        echo "$status_output" | wc -l
        return 0  # true - has changes
    fi
}

# Usage
CHANGE_COUNT=$(detectUncommittedChanges)
if [ "$CHANGE_COUNT" -gt 0 ]; then
    echo "Detected $CHANGE_COUNT uncommitted changes"
fi
```

### Detailed Change Information

```bash
# Get detailed change information for display
getChangeDetails() {
    git status --short 2>/dev/null
}

# Usage - show user what changes exist
echo "Uncommitted changes:"
getChangeDetails
```

**Output format:**
```
 M src/lib/feature.ts
 M tests/feature.test.ts
?? src/lib/new-file.ts
```

### Status Codes

| Code | Meaning |
|------|---------|
| `M` | Modified |
| `A` | Added (staged) |
| `D` | Deleted |
| `R` | Renamed |
| `C` | Copied |
| `??` | Untracked |
| `!!` | Ignored (with `--ignored`) |

---

## 2. User Prompt Pattern: Commit / Stash / Cancel

When uncommitted changes are detected and a branch switch is needed, prompt the user.

### AskUserQuestion Format

```
Uncommitted changes detected ({count} files). Choose how to proceed:

○ Commit changes - Commit all changes to current branch before switching
○ Stash changes - Stash changes (can be restored later with `git stash pop`)
○ Cancel - Abort operation, keep working on current branch
```

### Implementation Pattern

```javascript
// Use AskUserQuestion tool
{
  questions: [{
    question: `Uncommitted changes detected (${changeCount} files). How would you like to proceed?`,
    header: "Changes",
    options: [
      {
        label: "Commit changes (Recommended)",
        description: "Commit all changes to current branch before switching"
      },
      {
        label: "Stash changes",
        description: "Stash changes for later restoration with git stash pop"
      },
      {
        label: "Cancel",
        description: "Abort the operation, keep working on current branch"
      }
    ],
    multiSelect: false
  }]
}
```

### Response Handling

```bash
case "$USER_CHOICE" in
    "Commit changes"*)
        # Commit all changes
        handleCommit
        ;;
    "Stash changes"*)
        # Stash changes
        handleStash
        ;;
    "Cancel"*)
        # Abort the operation
        echo "Operation cancelled. Staying on current branch."
        exit 0
        ;;
esac
```

### Autonomous Mode Behavior

When `--autonomous` flag is present, skip the interactive prompt:

```bash
if [ "$AUTONOMOUS" = true ]; then
    # Auto-stash in autonomous mode (safest non-interactive option)
    echo "Autonomous mode: auto-stashing uncommitted changes"
    handleStash
else
    # Interactive prompt
    # ... use AskUserQuestion
fi
```

**Rationale:** Auto-stash is chosen for autonomous mode because:
- Commits might fail (hooks, conflicts)
- Cancel would block automation
- Stash preserves work and can be recovered

---

## 3. Stash Creation Pattern

Create stashes with descriptive, plan-specific messages.

### Stash Message Format

```
plan/{plan-name} {operation} WIP
```

**Examples:**
| Operation | Stash Message |
|-----------|---------------|
| Branch switch | `plan/my-plan switch WIP` |
| Plan completion | `plan/my-plan complete WIP` |
| Plan abandon | `plan/my-plan abandon WIP` |

### Stash Creation Function

```bash
# Create a stash with plan-specific message
# Arguments: $1 = plan name, $2 = operation (switch/complete/abandon)
# Returns: 0 on success, 1 on failure
createPlanStash() {
    local plan_name="$1"
    local operation="$2"
    local stash_msg="plan/$plan_name $operation WIP"

    # Create stash with message
    if git stash push -m "$stash_msg" 2>/dev/null; then
        echo "Stashed changes: $stash_msg"
        return 0
    else
        echo "Failed to stash changes"
        return 1
    fi
}

# Usage
PLAN_NAME=$(basename "$PLAN_PATH" .md)
if createPlanStash "$PLAN_NAME" "switch"; then
    STASH_CREATED=true
else
    echo "Error: Could not stash changes. Aborting."
    exit 1
fi
```

### Stash Creation with Untracked Files

To include untracked files in the stash:

```bash
# Include untracked files with -u flag
git stash push -u -m "$stash_msg"
```

| Flag | Behavior |
|------|----------|
| (none) | Only tracked files |
| `-u` | Include untracked files |
| `-a` | Include untracked and ignored files |

### Stash Verification

```bash
# Verify stash was created
verifyStashCreated() {
    local stash_msg="$1"

    # Check if the latest stash matches our message
    local latest_stash
    latest_stash=$(git stash list -1 --format="%s" 2>/dev/null)

    if [[ "$latest_stash" == *"$stash_msg"* ]]; then
        return 0  # Stash found
    else
        return 1  # Stash not found
    fi
}
```

---

## 4. Stash Application Pattern

Apply stashed changes after branch operations complete.

### Stash Application Function

```bash
# Apply the most recent stash (if we created one)
# Arguments: $1 = plan name (for message matching), $2 = operation
# Returns: 0 on success, 1 on failure or conflict
applyPlanStash() {
    local plan_name="$1"
    local operation="$2"
    local expected_msg="plan/$plan_name $operation WIP"

    # Verify we're applying the right stash
    local latest_stash_msg
    latest_stash_msg=$(git stash list -1 --format="%s" 2>/dev/null)

    if [[ "$latest_stash_msg" != *"$expected_msg"* ]]; then
        echo "Warning: Latest stash doesn't match expected. Skipping auto-apply."
        echo "  Expected: $expected_msg"
        echo "  Found: $latest_stash_msg"
        echo "  Manual apply: git stash pop"
        return 1
    fi

    # Apply the stash
    if git stash pop 2>/dev/null; then
        echo "Applied stashed changes"
        return 0
    else
        echo "Warning: Stash apply had conflicts"
        echo "  Resolve conflicts and run: git stash drop"
        return 1
    fi
}
```

### Handling Stash Conflicts

When `git stash pop` fails due to conflicts:

```bash
# Check if stash pop failed due to conflicts
if ! git stash pop 2>&1; then
    local stash_status=$?

    if git diff --name-only --diff-filter=U | grep -q .; then
        # Conflicts exist
        echo "Stash apply had conflicts. Please resolve:"
        git diff --name-only --diff-filter=U
        echo ""
        echo "After resolving, run: git stash drop"
    else
        # Other failure
        echo "Stash apply failed. Stash is still saved."
        echo "  View stash: git stash show"
        echo "  Retry: git stash pop"
    fi
fi
```

### Stash Cleanup

After successful application:

```bash
# Note: git stash pop automatically removes the stash on success
# If using git stash apply instead, clean up manually:
# git stash drop
```

---

## 5. Complete Workflow Examples

### Example 1: Plan Switch with Uncommitted Changes

```bash
# Step 1: Detect changes
CHANGE_COUNT=$(detectUncommittedChanges)
if [ "$CHANGE_COUNT" -gt 0 ]; then
    echo "Uncommitted changes detected ($CHANGE_COUNT files)"

    # Step 2: Prompt user (or auto-stash if autonomous)
    if [ "$AUTONOMOUS" = true ]; then
        USER_CHOICE="Stash changes"
    else
        # Use AskUserQuestion
        USER_CHOICE="..."
    fi

    # Step 3: Handle choice
    case "$USER_CHOICE" in
        "Commit"*)
            git add -A
            git commit -m "WIP: Save changes before switching to plan/$NEW_PLAN"
            ;;
        "Stash"*)
            createPlanStash "$CURRENT_PLAN" "switch"
            STASH_CREATED=true
            ;;
        "Cancel"*)
            exit 0
            ;;
    esac
fi

# Step 4: Perform branch switch
git checkout "plan/$NEW_PLAN"

# Step 5: Apply stash if we created one and switching back
# Note: Typically don't auto-apply on switch to different plan
# User can manually apply with: git stash pop
```

### Example 2: Plan Abandon with Uncommitted Changes

```bash
PLAN_NAME=$(basename "$PLAN_PATH" .md)

# Step 1: Detect changes
CHANGE_COUNT=$(detectUncommittedChanges)
if [ "$CHANGE_COUNT" -gt 0 ]; then
    echo "Uncommitted changes detected ($CHANGE_COUNT files)"
    getChangeDetails

    # Step 2: For abandon, auto-stash is the only safe option
    # (commit would be lost anyway when branch is deleted)
    echo ""
    echo "These changes will be stashed before abandoning the plan."
    echo "You can recover them later with: git stash pop"
    echo ""

    # Step 3: Create stash
    if ! createPlanStash "$PLAN_NAME" "abandon"; then
        echo "Error: Failed to stash changes. Aborting abandon."
        exit 1
    fi
    STASH_CREATED=true
fi

# Step 4: Switch to main and delete branch
git checkout main
git branch -D "plan/$PLAN_NAME"

# Step 5: Note about recovery
if [ "$STASH_CREATED" = true ]; then
    echo ""
    echo "Stashed changes preserved. To recover:"
    echo "  git stash list"
    echo "  git stash pop"
fi
```

### Example 3: Plan Complete with Uncommitted Changes

```bash
# Step 1: Detect changes
CHANGE_COUNT=$(detectUncommittedChanges)
if [ "$CHANGE_COUNT" -gt 0 ]; then
    echo "Uncommitted changes detected ($CHANGE_COUNT files)"

    # Step 2: For complete, commit is the best option
    # Changes should be included in the squash merge
    echo ""
    echo "Committing uncommitted changes before completion..."

    git add -A
    git commit -m "[$PLAN_NAME] Final changes before completion

Committed $CHANGE_COUNT file(s) with uncommitted changes.
This commit was auto-generated by /plan:complete.

🤖 Generated with Claude Code

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"

    if [ $? -ne 0 ]; then
        echo "Warning: Failed to commit uncommitted changes"
        echo "Please commit manually and re-run /plan:complete"
        exit 1
    fi
fi

# Step 3: Continue with completion workflow
```

---

## 6. Quick Reference

### Detection Commands

| Command | Purpose |
|---------|---------|
| `git status --porcelain` | Machine-readable status (empty = clean) |
| `git status --short` | Human-readable short status |
| `git status --porcelain \| wc -l` | Count of changed files |

### Stash Commands

| Command | Purpose |
|---------|---------|
| `git stash push -m "message"` | Create stash with message |
| `git stash push -u -m "message"` | Include untracked files |
| `git stash list` | List all stashes |
| `git stash show` | Show latest stash diff |
| `git stash pop` | Apply and remove latest stash |
| `git stash apply` | Apply but keep stash |
| `git stash drop` | Remove latest stash |

### Stash Message Format

```
plan/{plan-name} {operation} WIP
```

Operations: `switch`, `complete`, `abandon`

---

## 7. Error Handling

### Stash Creation Failure

```bash
if ! git stash push -m "$stash_msg"; then
    echo "Error: Failed to stash changes"
    echo ""
    echo "Possible causes:"
    echo "  - No changes to stash (already clean)"
    echo "  - Git not available"
    echo "  - Repository issues"
    echo ""
    echo "Please commit or manually stash your changes, then retry."
    exit 1
fi
```

### Stash Apply Conflicts

```bash
if ! git stash pop; then
    echo "Warning: Stash apply had conflicts"
    echo ""
    echo "Conflicting files:"
    git diff --name-only --diff-filter=U
    echo ""
    echo "To resolve:"
    echo "  1. Edit conflicting files"
    echo "  2. git add <files>"
    echo "  3. git stash drop"
fi
```

### No Stash to Apply

```bash
# Check if there are any stashes
if [ -z "$(git stash list)" ]; then
    echo "No stash to apply (stash list is empty)"
fi
```
