# Git Utilities Reference

Shared git utility patterns for plan commands. These patterns provide consistent git operations across all plan-related commands.

## Overview

Plan commands interact with git for:
- Branch management (creating, switching plan branches)
- Commit tracking (per-task commits with metadata)
- Status detection (uncommitted changes, branch state)

All git operations should be wrapped with availability checks to support non-git environments gracefully.

---

## Git Availability Check

Before any git operation, verify git is available:

```bash
# Check if git is available
if git --version 2>/dev/null; then
    GIT_AVAILABLE=true
else
    GIT_AVAILABLE=false
fi
```

**Usage pattern:**
```bash
if [ "$GIT_AVAILABLE" = true ]; then
    # Perform git operations
else
    # Skip git operations, log message if appropriate
    echo "Git not available - skipping branch operations"
fi
```

---

## Core Utility Patterns

### `getCurrentBranch()`

Get the current git branch name.

```bash
# Returns current branch name, empty string if detached HEAD or not a git repo
getCurrentBranch() {
    git branch --show-current 2>/dev/null
}

# Usage
CURRENT_BRANCH=$(getCurrentBranch)
if [ -z "$CURRENT_BRANCH" ]; then
    echo "Not on a branch (detached HEAD or not a git repo)"
fi
```

**Returns:**
- Branch name (e.g., `master`, `plan/my-plan`)
- Empty string if detached HEAD
- Empty string if not a git repository

---

### `isOnPlanBranch()`

Check if the current branch is a plan branch (has `plan/` prefix).

```bash
# Returns 0 (true) if on a plan branch, 1 (false) otherwise
isOnPlanBranch() {
    local current_branch
    current_branch=$(git branch --show-current 2>/dev/null)

    # Check if branch name starts with "plan/"
    if [[ "$current_branch" == plan/* ]]; then
        return 0  # true
    else
        return 1  # false
    fi
}

# Usage
if isOnPlanBranch; then
    echo "On a plan branch"
else
    echo "Not on a plan branch"
fi
```

**Alternative inline pattern:**
```bash
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null)
if [[ "$CURRENT_BRANCH" == plan/* ]]; then
    # On a plan branch
fi
```

---

### `getPlanBranchName(planName)`

Get the expected branch name for a given plan.

```bash
# Converts plan name to branch name format
# Input: plan name (with or without .md extension, with or without path)
# Output: plan/{plan-name} format
getPlanBranchName() {
    local plan_name="$1"

    # Remove path if present
    plan_name=$(basename "$plan_name")

    # Remove .md extension if present
    plan_name="${plan_name%.md}"

    echo "plan/$plan_name"
}

# Usage
PLAN_PATH="docs/plans/my-feature-plan.md"
EXPECTED_BRANCH=$(getPlanBranchName "$PLAN_PATH")
# Returns: plan/my-feature-plan
```

**Examples:**
| Input | Output |
|-------|--------|
| `my-plan` | `plan/my-plan` |
| `my-plan.md` | `plan/my-plan` |
| `docs/plans/my-plan.md` | `plan/my-plan` |

---

### `isOnCorrectPlanBranch(planName)`

Check if currently on the correct branch for a specific plan.

```bash
# Returns 0 if on correct branch, 1 otherwise
isOnCorrectPlanBranch() {
    local plan_name="$1"
    local current_branch expected_branch

    current_branch=$(git branch --show-current 2>/dev/null)
    expected_branch=$(getPlanBranchName "$plan_name")

    if [ "$current_branch" = "$expected_branch" ]; then
        return 0
    else
        return 1
    fi
}

# Usage
if isOnCorrectPlanBranch "$PLAN_PATH"; then
    echo "On correct plan branch"
else
    echo "On wrong branch"
fi
```

---

## Branch Validation Logic

Use this pattern in commands that require branch validation:

```bash
# Get current and expected branches
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null)
PLAN_NAME=$(basename "$PLAN_PATH" .md)
EXPECTED_BRANCH="plan/$PLAN_NAME"

# Determine action based on current branch state
if [ -z "$CURRENT_BRANCH" ]; then
    # Detached HEAD - warn but continue
    echo "Warning: In detached HEAD state. Consider checking out a branch."

elif [[ "$CURRENT_BRANCH" == plan/* ]] && [ "$CURRENT_BRANCH" != "$EXPECTED_BRANCH" ]; then
    # On wrong plan branch - auto-switch
    echo "Warning: On branch '$CURRENT_BRANCH' but plan expects '$EXPECTED_BRANCH'"
    git checkout "$EXPECTED_BRANCH" 2>/dev/null || git checkout -b "$EXPECTED_BRANCH"
    echo "Switched to branch '$EXPECTED_BRANCH'"

elif [[ ! "$CURRENT_BRANCH" == plan/* ]]; then
    # On non-plan branch (master, feature/x, etc.) - warn but continue for backwards compatibility
    echo "Warning: Not on a plan branch (currently on '$CURRENT_BRANCH')."
    echo "  Run /plan:set to switch to the plan branch '$EXPECTED_BRANCH'."
    echo "  Continuing with task implementation..."

else
    # On correct plan branch
    echo "Git branch: $CURRENT_BRANCH OK"
fi
```

---

## Commit Message Format

Standard commit message format for plan tasks:

```bash
# Variables
PLAN_NAME=$(basename "$PLAN_PATH" .md)
PHASE_NUM="2"
PHASE_NAME="Branch Validation in /plan:implement"
TASK_ID="2.3"
BRIEF_DESCRIPTION="Verify Phase 2 branch validation"

# Create commit with heredoc for multi-line message
git commit -m "$(cat <<EOF
[$PLAN_NAME] task $TASK_ID: $BRIEF_DESCRIPTION

Plan: $PLAN_NAME
Phase: $PHASE_NUM - $PHASE_NAME
Task: $TASK_ID
EOF
)"
```

**Resulting format:**
```
[git-workflow-phase1-core-branching] task 2.3: Verify Phase 2 branch validation

Plan: git-workflow-phase1-core-branching
Phase: 2 - Branch Validation in /plan:implement
Task: 2.3
```

---

## Error Handling

### Git Command Failures

Wrap git commands in error handling:

```bash
# Safe git command execution
safe_git() {
    if [ "$GIT_AVAILABLE" != true ]; then
        return 1
    fi
    git "$@" 2>/dev/null
}

# Usage
if ! safe_git checkout "$BRANCH_NAME"; then
    echo "Warning: Could not checkout branch $BRANCH_NAME"
    # Handle error appropriately
fi
```

### Non-Git Environments

Always provide graceful fallback:

```bash
# Pattern for optional git operations
if [ "$GIT_AVAILABLE" = true ]; then
    CURRENT_BRANCH=$(git branch --show-current)
    # ... git operations
else
    echo "Note: Git operations skipped (git not available)"
    # Continue without git features
fi
```

---

## Quick Reference

| Pattern | Command | Returns |
|---------|---------|---------|
| Check git available | `git --version 2>/dev/null` | Exit code 0 if available |
| Get current branch | `git branch --show-current` | Branch name or empty |
| Check if on plan branch | `[[ "$branch" == plan/* ]]` | Boolean |
| Get plan branch name | `echo "plan/$(basename "$path" .md)"` | `plan/{name}` |
| Check branch exists | `git rev-parse --verify $branch 2>/dev/null` | Exit code 0 if exists |
| Check uncommitted changes | `git status --porcelain` | List of changed files |
| Count uncommitted changes | `git status --porcelain \| wc -l` | Number of changes |
