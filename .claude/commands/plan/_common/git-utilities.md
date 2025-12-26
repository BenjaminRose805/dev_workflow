# Git Utilities Reference

Shared git utility patterns for plan commands. These patterns provide consistent git operations across all plan-related commands.

## Overview

Plan commands interact with git for:
- Branch management (creating, switching plan branches)
- Commit tracking (per-task commits with metadata)
- Status detection (uncommitted changes, branch state)

All git operations should be wrapped with availability checks to support non-git environments gracefully.

---

## Workflow Diagrams

### Plan Lifecycle Flow

```
                    ┌─────────────┐
                    │  /plan:set  │
                    └──────┬──────┘
                           │
              ┌────────────▼────────────┐
              │  Create/switch branch   │
              │  plan/{plan-name}       │
              └────────────┬────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
   ┌───────────┐     ┌───────────┐     ┌───────────┐
   │  Phase 1  │     │  Phase 2  │     │  Phase N  │
   │   Tasks   │────▶│   Tasks   │────▶│   Tasks   │
   └───────────┘     └───────────┘     └───────────┘
         │                 │                 │
         ▼                 ▼                 ▼
   ┌───────────┐     ┌───────────┐     ┌───────────┐
   │  Commit   │     │  Commit   │     │  Commit   │
   │  + Tag    │     │  + Tag    │     │  + Tag    │
   └───────────┘     └───────────┘     └───────────┘
                           │
              ┌────────────▼────────────┐
              │    /plan:complete       │
              │  (merge/PR/squash)      │
              └────────────┬────────────┘
                           │
              ┌────────────▼────────────┐
              │   Archive + Cleanup     │
              └─────────────────────────┘
```

### PR Creation Flow

```
  /plan:complete --pr
         │
         ▼
  ┌──────────────────┐
  │ Check conflicts  │
  │ (dry-run merge)  │
  └────────┬─────────┘
           │
     ┌─────┴─────┐
     │ Conflicts?│
     └─────┬─────┘
       Yes │ No
     ┌─────┴─────┐
     ▼           ▼
┌─────────┐ ┌─────────────┐
│ Offer:  │ │ Push branch │
│ Rebase  │ │ to remote   │
│ Manual  │ └──────┬──────┘
│ Abort   │        │
└─────────┘        ▼
              ┌─────────────┐
              │ gh pr create│
              │ --title ... │
              │ --body ...  │
              └──────┬──────┘
                     │
                     ▼
              ┌─────────────┐
              │ Output URL  │
              │ Skip merge  │
              └─────────────┘
```

### Remote Sync Flow

```
  ┌─────────────────────────────────────────────┐
  │             sync_remote: true               │
  │          OR --push flag passed              │
  └───────────────────┬─────────────────────────┘
                      │
          ┌───────────▼───────────┐
          │  Check remote exists  │
          │  git remote get-url   │
          └───────────┬───────────┘
                      │
           ┌──────────┴──────────┐
           │   Remote exists?    │
           └──────────┬──────────┘
              No      │     Yes
           ┌──────────┴──────────┐
           ▼                     ▼
    ┌──────────────┐    ┌──────────────┐
    │ Log warning  │    │  git push    │
    │ Skip push    │    │  -u origin   │
    └──────────────┘    └──────┬───────┘
                               │
                    ┌──────────┴──────────┐
                    │   Push succeeded?   │
                    └──────────┬──────────┘
                       No      │     Yes
                    ┌──────────┴──────────┐
                    ▼                     ▼
             ┌──────────────┐    ┌──────────────┐
             │ Warn user    │    │ Log success  │
             │ Continue ok  │    │ "Pushed to   │
             │ (graceful)   │    │  remote"     │
             └──────────────┘    └──────────────┘
```

### Conflict Detection Flow

```
  /plan:complete
         │
         ▼
  ┌──────────────────────────────┐
  │ Dry-run merge check          │
  │ git merge --no-commit main   │
  └──────────────┬───────────────┘
                 │
          ┌──────┴──────┐
          │  Conflicts? │
          └──────┬──────┘
             No  │  Yes
          ┌──────┴──────┐
          │             │
          ▼             ▼
   ┌────────────┐ ┌────────────────────┐
   │ git merge  │ │ git merge --abort  │
   │ --abort    │ │ (cleanup dry-run)  │
   │ (cleanup)  │ └─────────┬──────────┘
   └──────┬─────┘           │
          │                 ▼
          │        ┌─────────────────┐
          │        │ Show conflicts  │
          │        │ - file1.ts      │
          │        │ - file2.ts      │
          │        └────────┬────────┘
          │                 │
          │                 ▼
          │        ┌─────────────────┐
          │        │ Ask user:       │
          │        │ 1. Rebase       │
          │        │ 2. Manual       │
          │        │ 3. Abort        │
          │        └────────┬────────┘
          │                 │
          ▼                 ▼
  ┌───────────────┐  ┌────────────────┐
  │ Proceed with  │  │ Handle choice  │
  │ merge         │  │ accordingly    │
  └───────────────┘  └────────────────┘
```

### Branch Cleanup Flow

```
  /plan:cleanup
         │
         ▼
  ┌────────────────────────────┐
  │ List local plan branches   │
  │ git branch -l "plan/*"     │
  └────────────┬───────────────┘
               │
               ▼
  ┌────────────────────────────┐
  │ Check last commit date     │
  │ for each branch            │
  └────────────┬───────────────┘
               │
               ▼
  ┌────────────────────────────┐
  │ Filter by cleanup_age_days │
  │ (default: 30)              │
  └────────────┬───────────────┘
               │
               ▼
  ┌────────────────────────────┐
  │ Display stale branches     │
  │ with age and last commit   │
  └────────────┬───────────────┘
               │
        ┌──────┴──────┐
        │  --delete?  │
        └──────┬──────┘
           No  │  Yes
        ┌──────┴──────┐
        │             │
        ▼             ▼
  ┌───────────┐ ┌─────────────────┐
  │ Preview   │ │ --archive?      │
  │ only      │ └────────┬────────┘
  └───────────┘      Yes │ No
                  ┌──────┴──────┐
                  ▼             ▼
           ┌───────────┐ ┌───────────┐
           │ Create    │ │ Delete    │
           │ archive   │ │ branches  │
           │ tags      │ │ directly  │
           └─────┬─────┘ └─────┬─────┘
                 │             │
                 └──────┬──────┘
                        ▼
                 ┌───────────┐
                 │ Delete    │
                 │ branches  │
                 └───────────┘
```

### Phase Tag Workflow

```
  Task Completion (via /plan:verify)
         │
         ▼
  ┌────────────────────────────┐
  │ Check if all phase tasks   │
  │ are now complete           │
  └────────────┬───────────────┘
               │
        ┌──────┴──────┐
        │ Phase done? │
        └──────┬──────┘
           No  │  Yes
        ┌──────┴──────┐
        │             │
        ▼             ▼
  ┌───────────┐ ┌─────────────────────────┐
  │ Continue  │ │ Check phase_tags config │
  │ normally  │ └────────────┬────────────┘
  └───────────┘              │
                      ┌──────┴──────┐
                      │ Enabled?    │
                      └──────┬──────┘
                         No  │  Yes
                      ┌──────┴──────┐
                      │             │
                      ▼             ▼
                ┌───────────┐ ┌───────────────────┐
                │ Skip tag  │ │ Create tag        │
                │ creation  │ │ plan/{plan}/      │
                └───────────┘ │ phase-{N}         │
                              └─────────┬─────────┘
                                        │
                                        ▼
                              ┌───────────────────┐
                              │ --push-tags OR    │
                              │ sync_remote?      │
                              └─────────┬─────────┘
                                  Yes   │  No
                              ┌─────────┴─────────┐
                              ▼                   ▼
                        ┌───────────┐       ┌───────────┐
                        │ Push tag  │       │ Local tag │
                        │ to remote │       │ only      │
                        └───────────┘       └───────────┘
```

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

Check if the current branch is a plan branch (respects configured prefix).

```bash
# Returns 0 (true) if on a plan branch, 1 (false) otherwise
isOnPlanBranch() {
    local current_branch
    current_branch=$(git branch --show-current 2>/dev/null)

    # Load configured prefix
    local CONFIG_FILE=".claude/git-workflow.json"
    local BRANCH_PREFIX="plan/"

    if [ -f "$CONFIG_FILE" ]; then
        BRANCH_PREFIX=$(cat "$CONFIG_FILE" | grep -o '"branch_prefix":\s*"[^"]*"' | grep -o '"[^"]*"$' | tr -d '"')
        BRANCH_PREFIX=${BRANCH_PREFIX:-plan/}
    fi

    # Check if branch name starts with configured prefix
    if [[ "$current_branch" == ${BRANCH_PREFIX}* ]]; then
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

**Alternative inline pattern (with default prefix):**
```bash
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null)
if [[ "$CURRENT_BRANCH" == plan/* ]]; then
    # On a plan branch (assumes default prefix)
fi
```

**Note:** For backwards compatibility, the default prefix `plan/` is used if no configuration exists.

---

### `getPlanBranchName(planName, [phaseNumber])`

Get the expected branch name for a given plan, respecting configuration.

```bash
# Converts plan name to branch name format based on strategy configuration
# Input: plan name (with or without .md extension, with or without path)
#        optional phase number for branch-per-phase strategy
# Output: {prefix}{plan-name} or {prefix}{plan-name}/phase-{N} format
getPlanBranchName() {
    local plan_name="$1"
    local phase_num="$2"

    # Remove path if present
    plan_name=$(basename "$plan_name")

    # Remove .md extension if present
    plan_name="${plan_name%.md}"

    # Load configuration
    local CONFIG_FILE=".claude/git-workflow.json"
    local STRATEGY="branch-per-plan"
    local BRANCH_PREFIX="plan/"

    if [ -f "$CONFIG_FILE" ]; then
        STRATEGY=$(cat "$CONFIG_FILE" | grep -o '"strategy":\s*"[^"]*"' | grep -o '"[^"]*"$' | tr -d '"')
        STRATEGY=${STRATEGY:-branch-per-plan}
        BRANCH_PREFIX=$(cat "$CONFIG_FILE" | grep -o '"branch_prefix":\s*"[^"]*"' | grep -o '"[^"]*"$' | tr -d '"')
        BRANCH_PREFIX=${BRANCH_PREFIX:-plan/}
    fi

    if [ "$STRATEGY" = "branch-per-phase" ] && [ -n "$phase_num" ]; then
        echo "${BRANCH_PREFIX}${plan_name}/phase-${phase_num}"
    else
        echo "${BRANCH_PREFIX}${plan_name}"
    fi
}

# Usage
PLAN_PATH="docs/plans/my-feature-plan.md"
EXPECTED_BRANCH=$(getPlanBranchName "$PLAN_PATH")
# Returns: plan/my-feature-plan (with default config)

# With custom prefix configured as "feature/plan-":
# Returns: feature/plan-my-feature-plan

# With branch-per-phase strategy and phase number:
EXPECTED_BRANCH=$(getPlanBranchName "$PLAN_PATH" "2")
# Returns: plan/my-feature-plan/phase-2
```

**Examples (with default configuration):**
| Input | Output |
|-------|--------|
| `my-plan` | `plan/my-plan` |
| `my-plan.md` | `plan/my-plan` |
| `docs/plans/my-plan.md` | `plan/my-plan` |

**Examples (with custom branch_prefix "feature/"):**
| Input | Output |
|-------|--------|
| `my-plan` | `feature/my-plan` |
| `my-plan.md` | `feature/my-plan` |

**Examples (with branch-per-phase strategy):**
| Input | Phase | Output |
|-------|-------|--------|
| `my-plan` | 1 | `plan/my-plan/phase-1` |
| `my-plan` | 2 | `plan/my-plan/phase-2` |

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

### `hasUncommittedChanges()`

Check if there are uncommitted changes in the working directory.

```bash
# Returns 0 (true) if there are uncommitted changes, 1 (false) if clean
hasUncommittedChanges() {
    local status_output
    status_output=$(git status --porcelain 2>/dev/null)

    if [ -n "$status_output" ]; then
        return 0  # true - has uncommitted changes
    else
        return 1  # false - working directory is clean
    fi
}

# Usage
if hasUncommittedChanges; then
    echo "There are uncommitted changes"
else
    echo "Working directory is clean"
fi
```

**Alternative inline pattern:**
```bash
# Check for any uncommitted changes (staged or unstaged)
if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
    echo "Has uncommitted changes"
fi
```

**With file count:**
```bash
# Get count of changed files
CHANGE_COUNT=$(git status --porcelain 2>/dev/null | wc -l)
if [ "$CHANGE_COUNT" -gt 0 ]; then
    echo "$CHANGE_COUNT files with uncommitted changes"
fi
```

**Returns:**
- Exit code 0 (true) if there are uncommitted changes
- Exit code 1 (false) if working directory is clean
- Exit code 1 if not a git repository

**Notes:**
- `git status --porcelain` provides machine-parseable output
- Output is empty when working directory is clean
- Includes both staged and unstaged changes
- Includes untracked files (use `--untracked-files=no` to exclude)

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

## Remote Sync

Plan commands can automatically push changes to a remote repository. This enables team collaboration and provides backup of work in progress.

### Configuration

Remote sync is controlled by:

1. **Configuration file** (`.claude/git-workflow.json`):
   ```json
   {
     "sync_remote": true
   }
   ```

2. **Command-line flag** (`--push`):
   ```bash
   /plan:set --push           # Push branch after creation
   /plan:implement 1.1 --push  # Push after each task commit
   ```

The `--push` flag overrides the configuration for that invocation.

### Behavior by Command

| Command | Sync Trigger | What Gets Pushed |
|---------|--------------|------------------|
| `/plan:set` | After branch creation/switch | New plan branch |
| `/plan:implement` | After each task commit | Task commits |
| `/plan:complete --pr` | Before PR creation | Plan branch |

### Remote Check

Before pushing, commands verify a remote exists:

```bash
# Check if remote exists
if git remote get-url origin 2>/dev/null; then
    # Remote exists, proceed with push
else
    echo "Warning: No remote configured, skipping push"
fi
```

### Push Operations

**Branch push (after creation):**
```bash
git push -u origin plan/{plan-name}
```
- Uses `-u` to set upstream tracking
- Only on newly created branches

**Commit push (after task):**
```bash
git push
```
- Pushes current branch to its upstream
- Assumes upstream is already set

### Graceful Failure Handling

Push failures do NOT fail the command. The pattern is:

```bash
if git push 2>&1; then
    echo "Pushed to remote"
else
    echo "⚠ Failed to push to remote: [error message]"
    echo "  Continuing with local-only changes..."
    # Command continues normally
fi
```

**Common failure scenarios:**
- No remote configured → Skip push, log info message
- Network unavailable → Log warning, continue locally
- Permission denied → Log warning, suggest manual push
- Branch protected → Log warning, continue locally

### Example Output

**Successful push:**
```
✓ 1.1 Create auth middleware
  Committed: [my-plan] task 1.1: Create auth middleware
  Pushed commit to remote
```

**Failed push (graceful):**
```
✓ 1.1 Create auth middleware
  Committed: [my-plan] task 1.1: Create auth middleware
  ⚠ Failed to push to remote: Permission denied
    Task completed locally. Push manually with: git push
```

### Manual Sync

If automatic sync is disabled, push manually:

```bash
# Push current branch
git push

# Push with upstream tracking (first time)
git push -u origin $(git branch --show-current)

# Push all plan branches
git push origin 'refs/heads/plan/*:refs/heads/plan/*'
```

---

## Phase Tags

Phase tags mark completed phases in git history, enabling phase-based rollback and progress tracking.

### Tag Format

**Format:** `plan/{plan-name}/phase-{N}`

| Example Plan | Phase Number | Tag Name |
|-------------|--------------|----------|
| `my-feature.md` | 1 | `plan/my-feature/phase-1` |
| `test-coverage.md` | 2 | `plan/test-coverage/phase-2` |
| `refactor-auth.md` | 0 | `plan/refactor-auth/phase-0` |

### Creating Phase Tags

Use annotated tags to include phase metadata:

```bash
PLAN_NAME=$(basename "$PLAN_PATH" .md)
PHASE_NUM=1
PHASE_TITLE="Critical Unit Tests"
TASK_COUNT=5

PHASE_TAG="plan/$PLAN_NAME/phase-$PHASE_NUM"

# Create annotated tag with phase name in annotation
git tag -a "$PHASE_TAG" -m "$(cat <<EOF
Phase $PHASE_NUM: $PHASE_TITLE

Plan: $PLAN_NAME
Phase: $PHASE_NUM
Tasks: $TASK_COUNT completed
Tagged at: $(date -Iseconds)
EOF
)"
```

**Annotation content includes:**
- Phase name and number in the first line (e.g., "Phase 1: Critical Unit Tests")
- Plan name for identification
- Task count for reference
- Timestamp for tracking

### Checking Phase Tag Existence

Before creating a tag, check if it already exists:

```bash
PHASE_TAG="plan/$PLAN_NAME/phase-$PHASE_NUM"

if git rev-parse --verify "refs/tags/$PHASE_TAG" >/dev/null 2>&1; then
    echo "Phase tag already exists: $PHASE_TAG"
else
    # Create new tag
fi
```

### Listing Phase Tags

Get all phase tags for a plan:

```bash
PLAN_NAME=$(basename "$PLAN_PATH" .md)

# List all phase tags for this plan
git tag -l "plan/$PLAN_NAME/phase-*"
```

**Example output:**
```
plan/my-feature/phase-0
plan/my-feature/phase-1
plan/my-feature/phase-2
```

### Reading Tag Annotations

Get the annotation content from a phase tag:

```bash
PHASE_TAG="plan/$PLAN_NAME/phase-1"

# Get annotation message
git tag -n99 "$PHASE_TAG"

# Get full tag details including annotation
git show "$PHASE_TAG" --quiet
```

### Pushing Phase Tags

Push tags to remote. Tags are pushed when:
- `sync_remote: true` in `.claude/git-workflow.json`, OR
- `--push-tags` flag is passed to the command

**Commands that support `--push-tags`:**
- `/plan:verify` - Push phase tags when phase completes
- `/plan:implement` - Push phase tags when phase completes (via `--push-tags`)

```bash
# Push a single phase tag
git push origin "$PHASE_TAG"

# Push all phase tags for a plan
git push origin "refs/tags/plan/$PLAN_NAME/phase-*"

# Push all tags
git push origin --tags
```

**Example usage:**
```bash
# Verify tasks and push any new phase tags
/plan:verify phase:1 --push-tags

# Autonomous verification with tag pushing
/plan:verify all --autonomous --push-tags
```

### Using Phase Tags for Rollback

Phase tags enable targeted rollback in `/plan:rollback phase`:

```bash
PLAN_NAME=$(basename "$PLAN_PATH" .md)
PHASE_NUM=2

PHASE_TAG="plan/$PLAN_NAME/phase-$PHASE_NUM"

# Check if phase tag exists
if git rev-parse --verify "refs/tags/$PHASE_TAG" >/dev/null 2>&1; then
    # Get the commit the tag points to
    PHASE_COMMIT=$(git rev-list -n 1 "$PHASE_TAG")
    echo "Phase $PHASE_NUM tagged at commit: $PHASE_COMMIT"

    # Find commits after this tag (commits to revert)
    COMMITS_TO_REVERT=$(git rev-list "$PHASE_TAG"..HEAD)
else
    echo "No phase tag found - using commit-based rollback"
fi
```

### Quick Reference - Phase Tags

| Operation | Command |
|-----------|---------|
| Create phase tag | `git tag -a "plan/$PLAN/phase-$N" -m "message"` |
| Check tag exists | `git rev-parse --verify "refs/tags/$TAG" 2>/dev/null` |
| List plan's tags | `git tag -l "plan/$PLAN/phase-*"` |
| Get tag annotation | `git tag -n99 "$TAG"` |
| Push single tag | `git push origin "$TAG"` |
| Get tagged commit | `git rev-list -n 1 "$TAG"` |
| Delete local tag | `git tag -d "$TAG"` |
| Delete remote tag | `git push origin --delete "$TAG"` |

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
| Check remote exists | `git remote get-url origin 2>/dev/null` | Exit code 0 if exists |
| Push with upstream | `git push -u origin $branch` | Sets tracking branch |
| Push current branch | `git push` | Pushes to upstream |
| Push phase tag | `/plan:verify --push-tags` | Pushes phase tags to remote |

---

## Configuration System

Plan commands use `.claude/git-workflow.json` for configuration. This file is optional - all options have sensible defaults.

### Configuration File Location

```
.claude/git-workflow.json
```

The configuration file is checked at the project root's `.claude/` directory.

### Loading Configuration

Use this pattern to load configuration with defaults:

**Bash pattern:**
```bash
# Load configuration from .claude/git-workflow.json
loadConfig() {
    local CONFIG_FILE=".claude/git-workflow.json"

    if [ ! -f "$CONFIG_FILE" ]; then
        # No config file - use all defaults
        STRATEGY="branch-per-plan"
        BRANCH_PREFIX="plan/"
        AUTO_COMMIT=true
        MERGE_STRATEGY="squash"
        ARCHIVE_BRANCHES=true
        ARCHIVE_RETENTION_DAYS=90
        SYNC_REMOTE=false
        PHASE_TAGS=true
        ENFORCE_BRANCH=true
        CLEANUP_AGE_DAYS=30
        return 0
    fi

    # Load values with defaults
    STRATEGY=$(grep -o '"strategy":\s*"[^"]*"' "$CONFIG_FILE" | grep -o '"[^"]*"$' | tr -d '"' || echo "branch-per-plan")
    BRANCH_PREFIX=$(grep -o '"branch_prefix":\s*"[^"]*"' "$CONFIG_FILE" | grep -o '"[^"]*"$' | tr -d '"' || echo "plan/")
    AUTO_COMMIT=$(grep -o '"auto_commit":\s*true' "$CONFIG_FILE" >/dev/null && echo true || echo false)
    MERGE_STRATEGY=$(grep -o '"merge_strategy":\s*"[^"]*"' "$CONFIG_FILE" | grep -o '"[^"]*"$' | tr -d '"' || echo "squash")
    ARCHIVE_BRANCHES=$(grep -o '"archive_branches":\s*true' "$CONFIG_FILE" >/dev/null && echo true || echo false)
    ARCHIVE_RETENTION_DAYS=$(grep -o '"archive_retention_days":\s*[0-9]*' "$CONFIG_FILE" | grep -o '[0-9]*' || echo 90)
    SYNC_REMOTE=$(grep -o '"sync_remote":\s*true' "$CONFIG_FILE" >/dev/null && echo true || echo false)
    PHASE_TAGS=$(grep -o '"phase_tags":\s*false' "$CONFIG_FILE" >/dev/null && echo false || echo true)
    ENFORCE_BRANCH=$(grep -o '"enforce_branch":\s*false' "$CONFIG_FILE" >/dev/null && echo false || echo true)
    CLEANUP_AGE_DAYS=$(grep -o '"cleanup_age_days":\s*[0-9]*' "$CONFIG_FILE" | grep -o '[0-9]*' || echo 30)
}
```

**Node.js pattern:**
```javascript
function loadConfig() {
    const CONFIG_FILE = '.claude/git-workflow.json';
    const DEFAULTS = {
        strategy: 'branch-per-plan',
        branch_prefix: 'plan/',
        auto_commit: true,
        merge_strategy: 'squash',
        archive_branches: true,
        archive_retention_days: 90,
        sync_remote: false,
        phase_tags: true,
        enforce_branch: true,
        cleanup_age_days: 30
    };

    try {
        const fs = require('fs');
        if (!fs.existsSync(CONFIG_FILE)) {
            return DEFAULTS;
        }

        const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        return { ...DEFAULTS, ...config };
    } catch (error) {
        console.warn('Warning: Invalid git-workflow.json, using defaults');
        return DEFAULTS;
    }
}
```

### Configuration Options Reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `strategy` | string | `"branch-per-plan"` | Branching strategy: `branch-per-plan` or `branch-per-phase` |
| `branch_prefix` | string | `"plan/"` | Prefix for plan branch names |
| `auto_commit` | boolean | `true` | Auto-commit after task completion |
| `merge_strategy` | string | `"squash"` | Default merge strategy: `squash`, `commit`, or `ff` |
| `archive_branches` | boolean | `true` | Create archive tags before branch deletion |
| `archive_retention_days` | integer | `90` | Days to retain archive tags |
| `sync_remote` | boolean | `false` | Auto-push to remote after commits |
| `phase_tags` | boolean | `true` | Create git tags on phase completion |
| `enforce_branch` | boolean | `true` | Require correct plan branch |
| `cleanup_age_days` | integer | `30` | Days of inactivity before branch is stale |

### Checking Individual Options

**Check sync_remote:**
```bash
SYNC_REMOTE=$(cat .claude/git-workflow.json 2>/dev/null | grep -o '"sync_remote":\s*true' || echo "")
if [ -n "$SYNC_REMOTE" ]; then
    # sync_remote is enabled
fi
```

**Check phase_tags disabled:**
```bash
PHASE_TAGS_DISABLED=$(cat .claude/git-workflow.json 2>/dev/null | grep -o '"phase_tags":\s*false' || echo "")
if [ -n "$PHASE_TAGS_DISABLED" ]; then
    # phase_tags is disabled
fi
```

**Check archive_retention_days:**
```bash
ARCHIVE_RETENTION=$(cat .claude/git-workflow.json 2>/dev/null | grep -o '"archive_retention_days":\s*[0-9]*' | grep -o '[0-9]*')
ARCHIVE_RETENTION=${ARCHIVE_RETENTION:-90}  # Default to 90 if not found
```

### Invalid Configuration Handling

When the config file is invalid JSON or contains invalid values:

1. **Log a warning** to inform the user
2. **Use default values** for all options
3. **Continue execution** - don't fail the command

```bash
# Validate JSON structure
if [ -f ".claude/git-workflow.json" ]; then
    if ! node -e "JSON.parse(require('fs').readFileSync('.claude/git-workflow.json', 'utf8'))" 2>/dev/null; then
        echo "⚠ Warning: Invalid .claude/git-workflow.json, using defaults"
        # Use all defaults
    fi
fi
```

### Configuration Validation

Use this function to validate configuration values and report issues:

**Node.js validation pattern:**
```javascript
function validateConfig(config) {
    const errors = [];
    const warnings = [];

    // Validate strategy (enum)
    const validStrategies = ['branch-per-plan', 'branch-per-phase'];
    if (config.strategy && !validStrategies.includes(config.strategy)) {
        errors.push(`Invalid strategy: "${config.strategy}" (must be: ${validStrategies.join(', ')})`);
    }

    // Validate merge_strategy (enum)
    const validMergeStrategies = ['squash', 'commit', 'ff'];
    if (config.merge_strategy && !validMergeStrategies.includes(config.merge_strategy)) {
        errors.push(`Invalid merge_strategy: "${config.merge_strategy}" (must be: ${validMergeStrategies.join(', ')})`);
    }

    // Validate branch_prefix (string)
    if (config.branch_prefix !== undefined && typeof config.branch_prefix !== 'string') {
        errors.push(`Invalid branch_prefix: must be a string`);
    }
    if (config.branch_prefix && !config.branch_prefix.endsWith('/')) {
        warnings.push(`branch_prefix "${config.branch_prefix}" does not end with '/' - branches will be named "${config.branch_prefix}plan-name"`);
    }

    // Validate boolean options
    const booleanOptions = ['auto_commit', 'archive_branches', 'sync_remote', 'phase_tags', 'enforce_branch'];
    for (const opt of booleanOptions) {
        if (config[opt] !== undefined && typeof config[opt] !== 'boolean') {
            errors.push(`Invalid ${opt}: must be true or false`);
        }
    }

    // Validate integer options with minimum values
    const integerOptions = {
        archive_retention_days: { min: 1, description: 'days' },
        cleanup_age_days: { min: 1, description: 'days' }
    };
    for (const [opt, constraints] of Object.entries(integerOptions)) {
        if (config[opt] !== undefined) {
            if (!Number.isInteger(config[opt])) {
                errors.push(`Invalid ${opt}: must be an integer`);
            } else if (config[opt] < constraints.min) {
                errors.push(`Invalid ${opt}: must be at least ${constraints.min} ${constraints.description}`);
            }
        }
    }

    return { errors, warnings, valid: errors.length === 0 };
}
```

**Bash validation pattern (simplified):**
```bash
validateConfig() {
    local CONFIG_FILE=".claude/git-workflow.json"
    local VALIDATION_ERRORS=""

    if [ ! -f "$CONFIG_FILE" ]; then
        return 0  # No config file is valid - defaults will be used
    fi

    # Validate JSON structure
    if ! node -e "JSON.parse(require('fs').readFileSync('$CONFIG_FILE', 'utf8'))" 2>/dev/null; then
        echo "⚠ Invalid JSON in $CONFIG_FILE"
        return 1
    fi

    # Validate strategy enum
    local STRATEGY=$(grep -o '"strategy":\s*"[^"]*"' "$CONFIG_FILE" | grep -o '"[^"]*"$' | tr -d '"')
    if [ -n "$STRATEGY" ] && [ "$STRATEGY" != "branch-per-plan" ] && [ "$STRATEGY" != "branch-per-phase" ]; then
        echo "⚠ Invalid strategy: $STRATEGY (must be: branch-per-plan, branch-per-phase)"
        VALIDATION_ERRORS="yes"
    fi

    # Validate merge_strategy enum
    local MERGE_STRATEGY=$(grep -o '"merge_strategy":\s*"[^"]*"' "$CONFIG_FILE" | grep -o '"[^"]*"$' | tr -d '"')
    if [ -n "$MERGE_STRATEGY" ] && [ "$MERGE_STRATEGY" != "squash" ] && [ "$MERGE_STRATEGY" != "commit" ] && [ "$MERGE_STRATEGY" != "ff" ]; then
        echo "⚠ Invalid merge_strategy: $MERGE_STRATEGY (must be: squash, commit, ff)"
        VALIDATION_ERRORS="yes"
    fi

    # Validate integer options
    local ARCHIVE_RETENTION=$(grep -o '"archive_retention_days":\s*[0-9]*' "$CONFIG_FILE" | grep -o '[0-9]*')
    if [ -n "$ARCHIVE_RETENTION" ] && [ "$ARCHIVE_RETENTION" -lt 1 ]; then
        echo "⚠ Invalid archive_retention_days: must be at least 1"
        VALIDATION_ERRORS="yes"
    fi

    local CLEANUP_AGE=$(grep -o '"cleanup_age_days":\s*[0-9]*' "$CONFIG_FILE" | grep -o '[0-9]*')
    if [ -n "$CLEANUP_AGE" ] && [ "$CLEANUP_AGE" -lt 1 ]; then
        echo "⚠ Invalid cleanup_age_days: must be at least 1"
        VALIDATION_ERRORS="yes"
    fi

    if [ -n "$VALIDATION_ERRORS" ]; then
        echo "Using default values for invalid options"
    fi

    return 0  # Don't fail - just warn and use defaults
}
```

**Validation behavior:**
- Invalid JSON structure → Warn and use all defaults
- Invalid option value → Warn and use default for that option
- Unknown options → Ignored (forward compatibility)
- Missing options → Use defaults (all options are optional)

**Example validation output:**
```
⚠ Invalid strategy: "rebase" (must be: branch-per-plan, branch-per-phase)
⚠ Invalid archive_retention_days: must be at least 1
Using default values for invalid options
```

**When to validate:**
1. At the start of any plan command that uses configuration
2. Before using any configuration value
3. After loading the config file

**Integration pattern:**
```javascript
// In command initialization
const config = loadConfig();  // Load with defaults
const validation = validateConfig(config);

if (validation.warnings.length > 0) {
    validation.warnings.forEach(w => console.log(`⚠ ${w}`));
}

if (!validation.valid) {
    validation.errors.forEach(e => console.log(`⚠ ${e}`));
    console.log('Using default values for invalid options');
    // Continue with defaults - don't fail
}
```

### Example Configurations

**Team workflow with remote sync:**
```json
{
  "sync_remote": true,
  "merge_strategy": "squash",
  "archive_branches": true,
  "phase_tags": true
}
```

**Solo developer - minimal:**
```json
{
  "sync_remote": false,
  "archive_branches": false,
  "phase_tags": false
}
```

**Strict workflow:**
```json
{
  "enforce_branch": true,
  "archive_retention_days": 180,
  "cleanup_age_days": 60
}
```

**Custom branch prefix:**
```json
{
  "branch_prefix": "feature/plan-",
  "strategy": "branch-per-plan"
}
```

---

## Branching Strategy

The `strategy` option controls how branches are created for plans.

### Strategy: `branch-per-plan` (Default)

Creates a single branch for the entire plan. All tasks across all phases are implemented on this branch.

**Branch naming:** `{prefix}{plan-name}`
- Example: `plan/my-feature` (with default prefix)
- Example: `feature/my-feature` (with custom prefix)

**Best for:**
- Small to medium plans
- Plans that will be reviewed as a single unit
- Solo development workflows

**Example workflow:**
```
1. /plan:set my-feature          -> Creates plan/my-feature
2. /plan:implement phase:1       -> All commits on plan/my-feature
3. /plan:implement phase:2       -> Continues on plan/my-feature
4. /plan:complete                -> Merges plan/my-feature to main
```

### Strategy: `branch-per-phase`

Creates a new branch for each phase. Allows incremental review and merge of phases.

**Branch naming:** `{prefix}{plan-name}/phase-{N}`
- Example: `plan/my-feature/phase-1`, `plan/my-feature/phase-2`
- Example: `feature/my-feature/phase-1` (with custom prefix)

**Best for:**
- Large, multi-phase plans
- Plans requiring phase-by-phase review
- Team workflows with incremental merges

**Example workflow:**
```
1. /plan:set my-feature          -> Creates plan/my-feature/phase-1
2. /plan:implement phase:1       -> Commits on plan/my-feature/phase-1
3. Complete phase 1 review       -> Merge phase-1 branch to main
4. Start phase 2                 -> Creates plan/my-feature/phase-2
5. /plan:implement phase:2       -> Commits on plan/my-feature/phase-2
6. /plan:complete                -> Merges final phase to main
```

**Phase transition handling:**
When all tasks in a phase are completed and verified:
1. The current phase branch can be merged independently
2. A new branch is created for the next phase
3. The new branch starts from the current main branch

### Configuring Strategy

Set in `.claude/git-workflow.json`:

```json
{
  "strategy": "branch-per-phase",
  "branch_prefix": "plan/"
}
```

**Valid values:**
- `"branch-per-plan"` (default) - Single branch per plan
- `"branch-per-phase"` - New branch for each phase

---

## Auto-Commit Behavior

The `auto_commit` option controls whether changes are automatically committed after each task completion.

### Enabled (Default)

When `auto_commit: true` (default):
- After each task is marked complete, all changes are automatically staged and committed
- Commit message follows the standard format: `[plan-name] task {id}: {description}`
- Enables granular history with one commit per task

**Example workflow:**
```
Task 1.1 complete → Auto-commit: "[my-plan] task 1.1: Add auth middleware"
Task 1.2 complete → Auto-commit: "[my-plan] task 1.2: Add auth tests"
```

### Disabled

When `auto_commit: false`:
- Changes remain uncommitted after task completion
- User has full control over when to commit
- Useful for batching changes or custom commit strategies

**Configuration:**
```json
{
  "auto_commit": false
}
```

**Behavior when disabled:**
```
✓ 1.1 Add auth middleware - Completed
  ⚠ Auto-commit disabled (auto_commit: false in config)
    Changes remain uncommitted. Commit manually when ready.
```

**Manual commit workflow:**
```bash
# After completing multiple tasks, commit manually
git add -A
git commit -m "Implement authentication features (tasks 1.1-1.3)"
```

### Use Cases

| Scenario | Recommended Setting |
|----------|---------------------|
| Standard workflow with task-by-task tracking | `auto_commit: true` (default) |
| Want to review changes before committing | `auto_commit: false` |
| Batching multiple tasks into logical commits | `auto_commit: false` |
| CI/CD pipelines that manage commits | `auto_commit: false` |
| Large monorepos with commit hooks | `auto_commit: false` |

---

## Merge Strategy Configuration

The `merge_strategy` option sets the default merge strategy for `/plan:complete`.

### Available Strategies

| Strategy | Git Command | Result |
|----------|-------------|--------|
| `squash` (default) | `git merge --squash` | Single commit with all changes |
| `commit` | `git merge --no-ff` | Merge commit preserving history |
| `ff` | `git merge --ff-only` | Fast-forward (linear history) |

### Configuration

Set the default merge strategy in `.claude/git-workflow.json`:

```json
{
  "merge_strategy": "squash"
}
```

### Strategy Details

#### `squash` (Default)
- Combines all plan branch commits into a single new commit
- Creates cleaner main branch history
- Original commits preserved in archive tag (if enabled)
- Best for: Most workflows, especially with many small task commits

```bash
# Resulting history:
main: A---B---C---D (squashed plan changes)
```

#### `commit` (Merge Commit)
- Creates a merge commit with two parents
- Preserves complete commit history in main
- Shows merge point in git log
- Best for: Long-running branches, audit trails

```bash
# Resulting history:
main: A---B-------M (merge commit)
           \     /
plan:       C---D
```

#### `ff` (Fast-Forward)
- Moves main pointer to plan branch HEAD
- No merge commit created
- Requires no divergence from main
- Best for: Linear history, small quick plans

```bash
# Resulting history (if no divergence):
main: A---B---C---D (plan commits directly on main)
```

### Command-Line Override

The `--merge` flag overrides the configured default:

```bash
# Use configured default (or squash if not set)
/plan:complete

# Override with specific strategy
/plan:complete --merge commit
/plan:complete --merge ff
```

### Strategy Selection Guide

| Scenario | Recommended Strategy |
|----------|---------------------|
| Standard workflow | `squash` (default) |
| Need to preserve individual commits in main | `commit` |
| Working on a linear branch (no divergence) | `ff` |
| Large teams with code review | `squash` or `commit` |
| Solo development with fast iteration | `ff` or `squash` |

---

## Archive Branches Configuration

The `archive_branches` option controls whether archive tags are created before branch deletion.

### Purpose

When using squash merge, individual task commits are combined into a single commit. Archive tags preserve the original granular commit history for reference.

### Configuration

```json
{
  "archive_branches": true
}
```

### Enabled (Default)

When `archive_branches: true`:
- Archive tag created before plan branch is deleted
- Tag format: `archive/plan-{plan-name}`
- Preserves complete commit history
- Allows recovery of individual commits after squash

**Created automatically by:**
- `/plan:complete` (before merge)
- `/plan:cleanup --archive` (before deletion)

### Disabled

When `archive_branches: false`:
- No archive tag created by default
- Branch history lost after squash merge
- Reduces tag clutter in repository

**Configuration:**
```json
{
  "archive_branches": false
}
```

### Command-Line Override

The `--no-archive` flag overrides the configured default:

```bash
# Uses configured default (or true if not set)
/plan:complete

# Force skip archive even if config says true
/plan:complete --no-archive
```

### Archive Tag Format

Archive tags use the format: `archive/plan-{plan-name}`

| Plan Name | Archive Tag |
|-----------|-------------|
| `my-feature` | `archive/plan-my-feature` |
| `test-coverage` | `archive/plan-test-coverage` |

### Accessing Archived History

```bash
# List all archive tags
git tag -l "archive/plan-*"

# View commits in an archive
git log archive/plan-my-feature

# Compare archive to current main
git log main..archive/plan-my-feature

# Restore branch from archive
git checkout -b restored-my-feature archive/plan-my-feature
```

### Use Cases

| Scenario | Recommended Setting |
|----------|---------------------|
| Team workflows with squash merge | `archive_branches: true` (default) |
| Solo development with simple history | `archive_branches: false` |
| Compliance/audit requirements | `archive_branches: true` |
| Large repos with many plans | Consider `archive_branches: false` + manual archives |

### Retention

Archive tags can be cleaned up with `/plan:cleanup`:
- Controlled by `archive_retention_days` (default: 90 days)
- Use `--keep-archives` to skip archive cleanup

---

## Branch Enforcement Configuration

The `enforce_branch` option controls whether plan commands require being on the correct plan branch.

### Purpose

When enabled (default), plan commands verify you're on the correct `plan/{plan-name}` branch before executing. This prevents accidentally implementing tasks on the wrong branch.

### Configuration

```json
{
  "enforce_branch": true
}
```

### Enabled (Default)

When `enforce_branch: true`:
- Commands check if current branch matches expected plan branch
- If on a non-plan branch (e.g., `main`, `feature/x`), execution **fails with error**
- User must switch to correct branch via `/plan:set` or disable enforcement
- If on wrong plan branch (e.g., `plan/other-plan`), auto-switches to correct branch

**Error when not on plan branch:**
```
✗ Error: Not on a plan branch (currently on 'main').
  This plan requires being on branch 'plan/my-plan'.

  To fix: Run /plan:set to switch to the correct plan branch.
  To disable: Set "enforce_branch": false in .claude/git-workflow.json
```

### Disabled

When `enforce_branch: false`:
- Commands warn but continue execution on any branch
- Useful for legacy workflows or special situations
- Provides backwards compatibility with pre-git-workflow behavior

**Configuration:**
```json
{
  "enforce_branch": false
}
```

**Behavior when disabled:**
```
⚠ Warning: Not on a plan branch (currently on 'main').
  Run /plan:set to switch to the plan branch 'plan/my-plan'.
  Continuing with task implementation...
```

### Commands Affected

| Command | Behavior when enforce_branch: true |
|---------|-----------------------------------|
| `/plan:implement` | Fails if not on correct plan branch |
| `/plan:batch` | Fails if not on correct plan branch |
| `/plan:verify` | Warns but continues (verification-only) |
| `/plan:complete` | Requires plan branch for merge |

### Use Cases

| Scenario | Recommended Setting |
|----------|---------------------|
| Team workflows with branch isolation | `enforce_branch: true` (default) |
| Solo development with loose workflow | `enforce_branch: false` |
| CI/CD pipelines managing branches | `enforce_branch: true` |
| Legacy projects transitioning to plan system | `enforce_branch: false` initially |
| Strict branch hygiene requirements | `enforce_branch: true` |

### Temporarily Bypassing

For commands that support it, use `--no-branch-check` flag:

```bash
# Skip branch validation for this execution only
/plan:batch 1.1 1.2 --no-branch-check
```

This does not modify the configuration - subsequent commands will still enforce branch requirements.
