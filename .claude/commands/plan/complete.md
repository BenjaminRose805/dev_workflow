# Complete Plan

Complete a plan by merging it to main with squash merge workflow.

## Usage

```
/plan:complete [options]
```

**Options:**
- `--no-archive` - Skip creating archive tag (default: create tag)
- `--sync` - Pull latest from main before merge
- `--merge <strategy>` - Merge strategy: `squash` (default), `commit`, `ff`

## Instructions

### 1. Load Active Plan and Initialize Status

**See:** `.claude/commands/plan/_common/status-tracking.md` for complete status tracking reference.

**Quick reference:**
1. Read `.claude/current-plan.txt` to get the active plan path
2. If no active plan: inform user "No active plan set. Use /plan:set to choose a plan first." and stop
3. Call `initializePlanStatus(planPath)` to ensure status.json exists
4. Output directory is derived from plan name: `docs/plan-outputs/{plan-name}/`

### 2. Verify All Tasks Completed

Before proceeding with completion, verify that all tasks are completed.

**Step 1: Load status.json**
```bash
# Get plan name from plan path
PLAN_NAME=$(basename "$PLAN_PATH" .md)
STATUS_FILE="docs/plan-outputs/$PLAN_NAME/status.json"
```

**Step 2: Check task completion status**
- Use `getStatus(planPath, true)` to get full status data
- Check that `summary.pending === 0` and `summary.in_progress === 0`
- Check that `summary.failed === 0` (or all failed tasks have been addressed)

**Step 3: Abort if incomplete**
- If any tasks are incomplete, abort with:
  ```
  ✗ Cannot complete plan: {pending} pending, {in_progress} in progress, {failed} failed

  Incomplete tasks:
  - {task.id}: {task.description} ({status})

  Complete all tasks before running /plan:complete
  ```
- Exit without making any changes

**Example output (success):**
```
✓ All tasks completed (15/15)
  Proceeding with plan completion...
```

**Example output (abort):**
```
✗ Cannot complete plan: 2 pending, 1 in progress, 0 failed

Incomplete tasks:
- 3.2: Add integration tests (pending)
- 3.3: Update documentation (pending)
- 2.1: Implement auth middleware (in_progress)

Complete all tasks before running /plan:complete
```

### 3. Verify Currently on Plan Branch

Verify that you're on the correct plan branch before completing.

**Step 1: Check git availability**
```bash
git --version 2>/dev/null
```
- If command fails: Warn "Git not available, skipping branch validation" and continue
- If command succeeds: Continue with branch validation

**Step 2: Get current branch and expected branch**
```bash
# Get current branch
CURRENT_BRANCH=$(git branch --show-current)

# Derive expected branch from plan name
PLAN_NAME=$(basename "$PLAN_PATH" .md)
EXPECTED_BRANCH="plan/$PLAN_NAME"
```

**Step 3: Validate branch**

| Current Branch | Action |
|----------------|--------|
| `plan/{plan-name}` (correct) | Continue - already on correct branch |
| `plan/{other-plan}` (wrong plan branch) | **Abort** - wrong plan branch |
| Non-plan branch (e.g., `main`, `master`) | **Abort** - not on plan branch |
| No branch (detached HEAD) | **Abort** - detached HEAD state |

**Branch validation logic:**
```bash
if [[ -z "$CURRENT_BRANCH" ]]; then
    echo "✗ Detached HEAD state. Cannot complete plan."
    echo "  Checkout the plan branch first: git checkout plan/$PLAN_NAME"
    exit 1
fi

if [[ "$CURRENT_BRANCH" != "$EXPECTED_BRANCH" ]]; then
    echo "✗ Not on plan branch."
    echo "  Current branch: $CURRENT_BRANCH"
    echo "  Expected branch: $EXPECTED_BRANCH"
    echo ""
    echo "  Switch to the plan branch before completing:"
    echo "    git checkout $EXPECTED_BRANCH"
    exit 1
fi
```

**Example output (success):**
```
✓ On correct branch: plan/my-plan
```

**Example output (wrong branch - abort):**
```
✗ Not on plan branch.
  Current branch: main
  Expected branch: plan/my-plan

  Switch to the plan branch before completing:
    git checkout plan/my-plan
```

### 4. Check for Merge Conflicts with Main (Dry-run Merge)

Before starting the actual merge, check for potential conflicts.

**Step 1: Fetch latest main (optional but recommended)**
```bash
# Optionally fetch latest to detect remote changes
git fetch origin main 2>/dev/null || true
```

**Step 2: Attempt dry-run merge**
```bash
# Try merging main into the current branch without committing
git merge --no-commit --no-ff main 2>&1
MERGE_EXIT_CODE=$?
```

**Step 3: Capture conflict information**
```bash
if [[ $MERGE_EXIT_CODE -ne 0 ]]; then
    # Get list of conflicting files
    CONFLICTS=$(git diff --name-only --diff-filter=U)
fi
```

**Step 4: Always abort the dry-run merge**
```bash
# Abort the merge to return to clean state
git merge --abort 2>/dev/null || true
```

**Step 5: Handle conflicts**

If conflicts were detected, abort with helpful message:
```
✗ Merge conflicts detected with main branch.

Conflicting files:
- src/lib/auth.ts
- src/routes/api.ts
- tests/auth.test.ts

Resolve conflicts before completing:
1. Merge main into your branch: git merge main
2. Resolve conflicts in listed files
3. Commit the resolution: git commit
4. Re-run /plan:complete
```

**Example output (success - no conflicts):**
```
✓ No merge conflicts with main
```

**Example output (conflicts detected - abort):**
```
✗ Merge conflicts detected with main branch.

Conflicting files:
- src/lib/auth.ts
- src/routes/api.ts

Resolve conflicts before completing:
1. Merge main into your branch: git merge main
2. Resolve conflicts in listed files
3. Commit the resolution: git commit
4. Re-run /plan:complete
```

### 5. Commit Any Uncommitted Changes

Before creating archive tags or merging, ensure all changes are committed.

**Step 1: Check for uncommitted changes**
```bash
UNCOMMITTED=$(git status --porcelain)
```

**Step 2: If changes exist, commit them**
```bash
if [[ -n "$UNCOMMITTED" ]]; then
    # Count modified files
    FILE_COUNT=$(echo "$UNCOMMITTED" | wc -l)

    # Stage all changes
    git add -A

    # Create summary commit
    git commit -m "$(cat <<EOF
[$PLAN_NAME] Final changes before completion

Committed $FILE_COUNT file(s) with uncommitted changes.
This commit was auto-generated by /plan:complete.

🤖 Generated with Claude Code

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
fi
```

**Step 3: Handle commit failure**
```bash
if [[ $? -ne 0 ]]; then
    echo "⚠ Warning: Failed to commit uncommitted changes"
    echo "  Please commit manually and re-run /plan:complete"
    exit 1
fi
```

**Example output (no changes):**
```
✓ No uncommitted changes
```

**Example output (changes committed):**
```
✓ Committed 3 file(s) with uncommitted changes
  Commit: abc1234 [my-plan] Final changes before completion
```

### 6. Create Archive Tag (Before Merge)

Create an archive tag to preserve the complete branch history before squashing.

**Note:** Skip this step if `--no-archive` option was provided.

**Step 1: Check if --no-archive was passed**
```bash
if [[ "$NO_ARCHIVE" == "true" ]]; then
    echo "⊘ Skipping archive tag (--no-archive)"
    ARCHIVE_TAG=""
else
    # Continue to create archive tag
fi
```

**Step 2: Create annotated archive tag**
```bash
# Create tag name
ARCHIVE_TAG="archive/plan-$PLAN_NAME"

# Create annotated tag pointing to current HEAD
git tag -a "$ARCHIVE_TAG" -m "$(cat <<EOF
Archive: $PLAN_NAME

Plan completed on $(date -Iseconds)
This tag preserves the individual commit history before squash merge.

To view commits:
  git log $ARCHIVE_TAG

To restore branch:
  git checkout -b restored-$PLAN_NAME $ARCHIVE_TAG
EOF
)"

if [[ $? -ne 0 ]]; then
    echo "⚠ Warning: Failed to create archive tag"
    echo "  Tag may already exist. Continuing without archive."
    ARCHIVE_TAG=""
else
    echo "✓ Created archive tag: $ARCHIVE_TAG"
fi
```

**Step 3: Verify tag was created**
```bash
if [[ -n "$ARCHIVE_TAG" ]]; then
    # Verify tag exists and points to current HEAD
    TAG_SHA=$(git rev-parse "$ARCHIVE_TAG" 2>/dev/null)
    HEAD_SHA=$(git rev-parse HEAD)

    if [[ "$TAG_SHA" == "$HEAD_SHA" ]]; then
        echo "  Tag points to: $(git log -1 --oneline HEAD)"
    else
        echo "⚠ Warning: Tag does not point to HEAD"
    fi
fi
```

**Example output (tag created):**
```
✓ Created archive tag: archive/plan-my-plan
  Tag points to: abc1234 [my-plan] task 3.5: Final task
```

**Example output (skipped with --no-archive):**
```
⊘ Skipping archive tag (--no-archive)
```

**Example output (tag already exists):**
```
⚠ Warning: Failed to create archive tag
  Tag may already exist. Continuing without archive.
```

### Accessing Archived History

After a plan is completed with squash merge, the original individual commits are preserved in the archive tag.

**View individual commits:**
```bash
# List all commits from the archived branch
git log archive/plan-{name}

# Show commits with diffs
git log -p archive/plan-{name}

# Compare archive to main
git log main..archive/plan-{name}
```

**Restore the original branch (if needed):**
```bash
# Create a new branch from the archive tag
git checkout -b restored-{plan-name} archive/plan-{name}
```

**Find all archived plans:**
```bash
# List all archive tags
git tag -l "archive/plan-*"

# Show archive tag details
git show archive/plan-{name}
```

## Error Handling

**Git not available:**
- If git commands fail, log warning but abort completion
- Plan completion requires git operations

**Branch validation fails:**
- Provide clear instructions on how to switch to the correct branch
- Do not attempt to auto-switch during completion (too risky)

**Merge conflict detection fails:**
- If dry-run merge fails for non-conflict reasons, log warning
- Proceed with caution and warn user

## Merge Strategy Guide

Choose the appropriate merge strategy based on your workflow needs:

### `--merge squash` (Default)

**When to use:**
- Clean main branch history with one commit per plan
- Completed work doesn't need granular commit history in main
- Standard workflow for most plans
- When you want a single, well-documented commit in main

**Behavior:**
- Creates a single new commit on main with all changes
- Original commits preserved in archive tag
- Plan branch is deleted after merge

**Example:**
```bash
/plan:complete                    # Uses squash by default
/plan:complete --merge squash     # Explicit squash
```

### `--merge commit`

**When to use:**
- Need to preserve merge point in history
- Working with long-running plans that diverged from main
- Team workflows that require merge commits for tracking
- When bisecting history is important

**Behavior:**
- Creates a merge commit joining plan branch to main
- Individual commits remain visible in main history
- Two-parent commit shows merge point

**Example:**
```bash
/plan:complete --merge commit
```

### `--merge ff` (Fast-Forward)

**When to use:**
- Plan branch has no divergence from main
- Want to preserve exact commit history without merge commit
- Prefer linear history on main
- Small, quick plans that don't need squashing

**Behavior:**
- Moves main pointer forward to plan branch HEAD
- No new commit created
- All individual commits appear directly in main
- **Fails if main has diverged** - must rebase or use another strategy

**Example:**
```bash
/plan:complete --merge ff         # Fast-forward if possible
```

### Strategy Comparison

| Strategy | History in Main | Archive Tag | Use When |
|----------|-----------------|-------------|----------|
| `squash` | Single commit | Yes (granular history) | Most plans (default) |
| `commit` | Merge commit + individual | Optional | Long-running branches |
| `ff` | Individual commits | Optional | Linear history, no divergence |

### Decision Flowchart

```
Plan complete. Which merge strategy?
    │
    ├─→ Want clean main history? → `--merge squash` (default)
    │
    ├─→ Plan diverged from main?
    │   ├─→ Yes, want merge marker → `--merge commit`
    │   └─→ No divergence, linear OK → `--merge ff`
    │
    └─→ Need individual commits visible in main?
        ├─→ Yes, with merge point → `--merge commit`
        └─→ Yes, linear history → `--merge ff`
```

## Success Criteria

Before proceeding to merge:
- All tasks in status.json are completed (or explicitly skipped)
- Currently on the correct plan branch (`plan/{plan-name}`)
- No merge conflicts with main branch

### 7. Switch to Main Branch

After all pre-checks pass and the archive tag is created, switch to the main branch.

**Step 1: Get main branch name**
```bash
# Determine the main branch (could be 'main' or 'master')
if git show-ref --verify --quiet refs/heads/main; then
    MAIN_BRANCH="main"
elif git show-ref --verify --quiet refs/heads/master; then
    MAIN_BRANCH="master"
else
    echo "✗ Neither 'main' nor 'master' branch found"
    exit 1
fi
```

**Step 2: Switch to main branch**
```bash
git checkout "$MAIN_BRANCH"
if [[ $? -ne 0 ]]; then
    echo "✗ Failed to switch to $MAIN_BRANCH branch"
    echo "  Current branch: $(git branch --show-current)"
    exit 1
fi
```

**Step 3: Optionally sync with remote (if --sync)**
```bash
if [[ "$SYNC_WITH_REMOTE" == "true" ]]; then
    echo "Pulling latest from origin/$MAIN_BRANCH..."
    git pull origin "$MAIN_BRANCH"
    if [[ $? -ne 0 ]]; then
        echo "⚠ Warning: Failed to pull from origin/$MAIN_BRANCH"
        echo "  Continuing with local state. Consider manual sync."
    fi
fi
```

**Example output (success):**
```
✓ Switched to main branch
```

**Example output (with --sync):**
```
✓ Switched to main branch
✓ Pulled latest from origin/main
```

**Example output (sync warning):**
```
✓ Switched to main branch
⚠ Warning: Failed to pull from origin/main
  Continuing with local state. Consider manual sync.
```

### 8. Perform Merge

Merge the plan branch into main using the selected strategy.

**Step 0: Parse merge strategy**
```bash
# MERGE_STRATEGY is parsed from --merge option (default: "squash")
# Valid values: "squash", "commit", "ff"
MERGE_STRATEGY="${MERGE_STRATEGY:-squash}"
```

**Step 1: Execute merge based on strategy**

#### Strategy: `--merge squash` (default)

Squash all commits into a single staged change, then create a new commit.

```bash
if [[ "$MERGE_STRATEGY" == "squash" ]]; then
    # PLAN_BRANCH was saved earlier (e.g., "plan/my-plan")
    git merge --squash "$PLAN_BRANCH"
    if [[ $? -ne 0 ]]; then
        echo "✗ Squash merge failed"
        echo ""
        echo "This may happen if:"
        echo "  - Merge conflicts occurred (resolve manually)"
        echo "  - Branch has diverged significantly from $MAIN_BRANCH"
        echo ""
        echo "To resolve:"
        echo "  1. Switch back to plan branch: git checkout $PLAN_BRANCH"
        echo "  2. Merge main into plan: git merge $MAIN_BRANCH"
        echo "  3. Resolve any conflicts and commit"
        echo "  4. Re-run /plan:complete"
        exit 1
    fi

    # Squash stages changes but doesn't commit - we'll commit in step 10
    FILE_COUNT=$(git diff --cached --name-only | wc -l)
    if [[ "$FILE_COUNT" -eq 0 ]]; then
        echo "⚠ No changes to merge (plan branch may be identical to $MAIN_BRANCH)"
    else
        echo "✓ Squash merge complete - $FILE_COUNT file(s) staged"
    fi
    NEEDS_COMMIT=true  # Will create commit in step 10
fi
```

#### Strategy: `--merge commit` (merge commit)

Create a merge commit that preserves the full branch history. Individual commits remain visible in the main branch history.

```bash
if [[ "$MERGE_STRATEGY" == "commit" ]]; then
    # PLAN_BRANCH was saved earlier (e.g., "plan/my-plan")
    git merge --no-ff "$PLAN_BRANCH"
    if [[ $? -ne 0 ]]; then
        echo "✗ Merge commit failed"
        echo ""
        echo "This may happen if:"
        echo "  - Merge conflicts occurred (resolve manually)"
        echo "  - Branch has diverged significantly from $MAIN_BRANCH"
        echo ""
        echo "To resolve:"
        echo "  1. Abort the merge: git merge --abort"
        echo "  2. Switch back to plan branch: git checkout $PLAN_BRANCH"
        echo "  3. Merge main into plan: git merge $MAIN_BRANCH"
        echo "  4. Resolve any conflicts and commit"
        echo "  5. Re-run /plan:complete --merge commit"
        exit 1
    fi

    echo "✓ Merge commit complete - history preserved"
    echo "  Individual commits visible in history"
    NEEDS_COMMIT=false  # --no-ff creates its own merge commit
fi
```

#### Strategy: `--merge ff` (fast-forward)

Fast-forward merge if the plan branch is ahead of main with no divergence. Preserves individual commits without creating a merge commit.

```bash
if [[ "$MERGE_STRATEGY" == "ff" ]]; then
    git merge --ff-only "$PLAN_BRANCH"
    if [[ $? -ne 0 ]]; then
        echo "✗ Fast-forward merge failed"
        echo ""
        echo "Fast-forward is only possible when main has not diverged."
        echo "The plan branch must be directly ahead of main."
        echo ""
        echo "Options:"
        echo "  1. Use --merge squash (default) to squash all commits"
        echo "  2. Use --merge commit to create a merge commit"
        echo "  3. Rebase plan branch onto main first, then retry --merge ff"
        exit 1
    fi

    echo "✓ Fast-forward merge complete"
    echo "  Individual commits preserved in history"
    NEEDS_COMMIT=false  # FF merge already includes commits
fi
```

**Step 2: Verify merge result**
```bash
# For squash: verify staged changes exist
if [[ "$MERGE_STRATEGY" == "squash" ]]; then
    STAGED=$(git diff --cached --stat)
    if [[ -z "$STAGED" ]]; then
        echo "⚠ No changes to merge (plan branch may be identical to $MAIN_BRANCH)"
        echo "  This can happen if all changes were already merged."
    fi
fi

# For commit: verify merge commit was created
if [[ "$MERGE_STRATEGY" == "commit" ]]; then
    MERGE_COMMIT=$(git rev-parse HEAD)
    echo "  Merge commit: $(git log -1 --oneline HEAD)"
fi

# For ff: verify HEAD moved forward
if [[ "$MERGE_STRATEGY" == "ff" ]]; then
    NEW_HEAD=$(git rev-parse HEAD)
    echo "  HEAD now at: $(git log -1 --oneline HEAD)"
fi
```

**Example output (squash - success):**
```
✓ Squash merge complete - 12 file(s) staged
```

**Example output (commit - success):**
```
✓ Merge commit complete - history preserved
  Individual commits visible in history
  Merge commit: abc1234 Merge branch 'plan/my-plan'
```

**Example output (commit - failure):**
```
✗ Merge commit failed

This may happen if:
  - Merge conflicts occurred (resolve manually)
  - Branch has diverged significantly from main

To resolve:
  1. Abort the merge: git merge --abort
  2. Switch back to plan branch: git checkout plan/my-plan
  3. Merge main into plan: git merge main
  4. Resolve any conflicts and commit
  5. Re-run /plan:complete --merge commit
```

**Example output (ff - success):**
```
✓ Fast-forward merge complete
  Individual commits preserved in history
  HEAD now at: abc1234 [my-plan] task 3.5: Final task
```

**Example output (ff - failure):**
```
✗ Fast-forward merge failed

Fast-forward is only possible when main has not diverged.
The plan branch must be directly ahead of main.

Options:
  1. Use --merge squash (default) to squash all commits
  2. Use --merge commit to create a merge commit
  3. Rebase plan branch onto main first, then retry --merge ff
```

**Example output (no changes):**
```
⚠ No changes to merge (plan branch may be identical to main)
  This can happen if all changes were already merged.
```

### 9. Generate Merge Commit Message

Generate a comprehensive commit message with plan metadata from status.json.

#### Message Format Specification

The merge commit message follows a structured format with distinct sections:

```
┌─────────────────────────────────────────────────────────────┐
│ HEADER: "Complete: {plan-name}"                             │
├─────────────────────────────────────────────────────────────┤
│ METADATA SECTION:                                           │
│   Plan: {full plan title from status.json}                  │
│   Tasks: {completed}/{total} | Phases: {phase-count}        │
│   Duration: {human-readable duration}                       │
├─────────────────────────────────────────────────────────────┤
│ PHASE SUMMARY:                                              │
│   Phases:                                                   │
│     - {Phase N}: {name} ({count} tasks)                     │
│     - ...                                                   │
├─────────────────────────────────────────────────────────────┤
│ ARCHIVE REFERENCE (if archive tag created):                 │
│   Archive: archive/plan-{name}                              │
│     View individual commits: git log archive/plan-{name}    │
├─────────────────────────────────────────────────────────────┤
│ OUTPUTS LINK:                                               │
│   Outputs: docs/plan-outputs/{plan-name}/                   │
├─────────────────────────────────────────────────────────────┤
│ ATTRIBUTION FOOTER:                                         │
│   🤖 Generated with Claude Code                              │
│   Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>   │
└─────────────────────────────────────────────────────────────┘
```

**Required metadata fields:**
| Field | Source | Description |
|-------|--------|-------------|
| `plan-name` | Plan filename (without .md) | Used in header and references |
| `plan-title` | `status.json → planName` | Full descriptive title |
| `completed` | `status.json → summary.completed` | Number of completed tasks |
| `total` | `status.json → summary.totalTasks` | Total task count |
| `phase-count` | Count of unique phases in `status.json` | Number of phases in plan |
| `duration` | Calculated from timestamps | Time from plan creation to completion |
| `phases` | `status.json → tasks[].phase` | Aggregated phase summary |
| `archive-tag` | Created in Step 6 or null | Reference to archived commits |

**Step 1: Load status.json for metadata**
```bash
STATUS_FILE="docs/plan-outputs/$PLAN_NAME/status.json"

# Extract metadata using node or jq
TOTAL_TASKS=$(node -e "console.log(require('./$STATUS_FILE').summary.totalTasks)")
COMPLETED=$(node -e "console.log(require('./$STATUS_FILE').summary.completed)")
PLAN_TITLE=$(node -e "console.log(require('./$STATUS_FILE').planName)")

# Count unique phases
PHASE_COUNT=$(node -e "
const status = require('./$STATUS_FILE');
const phases = new Set(status.tasks.map(t => t.phase));
console.log(phases.size);
")
```

**Step 2: Calculate duration**
```bash
# Get timestamps from status.json
CREATED_AT=$(node -e "console.log(require('./$STATUS_FILE').createdAt)")
COMPLETED_AT=$(date -Iseconds)

# Calculate duration (approximate)
# Note: Exact duration calculation may vary by platform
```

**Step 3: Get phase summary**

The phase summary lists each phase by name with its task count, providing a high-level overview of the plan's structure in the commit message.

```bash
# Extract unique phases and count tasks per phase
# Output format: "  - Phase N: Name (X tasks)" per line
PHASES=$(node -e "
const status = require('./$STATUS_FILE');
const phases = new Map();  // Preserve phase order

// Count tasks per phase (maintaining insertion order)
status.tasks.forEach(t => {
    const current = phases.get(t.phase) || 0;
    phases.set(t.phase, current + 1);
});

// Format each phase as a list item
phases.forEach((count, name) => {
    // Pluralize 'task' correctly
    const taskWord = count === 1 ? 'task' : 'tasks';
    console.log('  - ' + name + ' (' + count + ' ' + taskWord + ')');
});
")
```

**Phase summary format:**
```
Phases:
  - Phase 1: Setup (3 tasks)
  - Phase 2: Implementation (8 tasks)
  - Phase 3: Testing (4 tasks)
```

**Notes:**
- Phases appear in the order they were encountered in `status.json` (which reflects plan order)
- Phase names come from the plan's section headers (e.g., "Phase 2: Core Implementation")
- Task count reflects total tasks in that phase (regardless of completion status at merge time)

**Step 4: Build commit message**

The commit message follows this format:

```
Complete: {plan-name}

Plan: {plan-title}
Tasks: {completed}/{total} | Phases: {phase-count}
Duration: {duration}

Phases:
  - Phase 1: Setup (3 tasks)
  - Phase 2: Implementation (8 tasks)
  - Phase 3: Testing (4 tasks)

Archive: archive/plan-{name}
  View individual commits: git log archive/plan-{name}

Outputs: docs/plan-outputs/{plan-name}/

🤖 Generated with Claude Code

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

**Step 5: Handle archive tag reference**

The archive tag reference provides a link to the granular commit history preserved before the squash merge. This allows reviewers to:
- View individual task commits instead of the single squashed commit
- Understand the implementation sequence and debugging steps
- Cherry-pick specific changes if needed later

If `--no-archive` was used, omit the Archive section:
```bash
if [[ -n "$ARCHIVE_TAG" ]]; then
    # Include archive section with usage instructions
    ARCHIVE_SECTION="Archive: $ARCHIVE_TAG
  View individual commits: git log $ARCHIVE_TAG
  Compare with main: git log main..$ARCHIVE_TAG
  Restore branch if needed: git checkout -b restored-$PLAN_NAME $ARCHIVE_TAG
"
else
    ARCHIVE_SECTION=""
fi
```

**Archive section format:**
```
Archive: archive/plan-{name}
  View individual commits: git log archive/plan-{name}
  Compare with main: git log main..archive/plan-{name}
  Restore branch if needed: git checkout -b restored-{name} archive/plan-{name}
```

**Note:** The archive tag is created in Step 6 (before the merge). If `--no-archive` was specified, this section is omitted from the commit message entirely.

**Step 6: Include outputs directory link**

The outputs directory link points to the plan's output artifacts, including:
- `status.json` - Execution state and timing data
- `findings/` - Task analysis outputs and findings documents
- Any other artifacts generated during plan execution

```bash
# The outputs directory path is always included
OUTPUTS_DIR="docs/plan-outputs/$PLAN_NAME/"

# Verify the directory exists (it should, if status.json was used)
if [[ -d "$OUTPUTS_DIR" ]]; then
    OUTPUTS_SECTION="Outputs: $OUTPUTS_DIR"
else
    # Directory should always exist, but handle gracefully
    OUTPUTS_SECTION="Outputs: $OUTPUTS_DIR (not created)"
fi
```

**Outputs section format:**
```
Outputs: docs/plan-outputs/{plan-name}/
```

**What's in the outputs directory:**
| File/Directory | Description |
|----------------|-------------|
| `status.json` | Task execution status, timestamps, and run history |
| `findings/` | Task-specific findings and analysis documents (e.g., `1.1.md`, `2.3.md`) |
| Custom outputs | Any additional artifacts created by tasks |

**Note:** The outputs directory is always included in the commit message as it provides essential context for understanding the plan's execution history and results.

**Step 7: Add Claude Code attribution footer**

The attribution footer provides traceability for AI-assisted work and includes the co-authorship marker.

```bash
# The attribution footer is always included
ATTRIBUTION="🤖 Generated with Claude Code

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

**Attribution format:**
```
🤖 Generated with Claude Code

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

**Notes:**
- The emoji (🤖) provides visual distinction in git logs
- The `Co-Authored-By` trailer follows Git's standard format for commit co-authors
- This attribution is consistent with Claude Code's standard commit message format
- The footer should always be the last section of the commit message

**Example commit message:**
```
Complete: my-feature-plan

Plan: Implementation Plan: My Feature
Tasks: 15/15 | Phases: 4
Duration: 2 days

Phases:
  - Phase 0: Preparation (2 tasks)
  - Phase 1: Core Implementation (8 tasks)
  - Phase 2: Testing (3 tasks)
  - Phase 3: Documentation (2 tasks)

Archive: archive/plan-my-feature-plan
  View individual commits: git log archive/plan-my-feature-plan
  Compare with main: git log main..archive/plan-my-feature-plan
  Restore branch if needed: git checkout -b restored-my-feature-plan archive/plan-my-feature-plan

Outputs: docs/plan-outputs/my-feature-plan/

🤖 Generated with Claude Code

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

### 10. Create the Merge Commit

Create the final merge commit with the generated message.

**Step 1: Build the full commit message using heredoc**
```bash
# Use heredoc to preserve formatting
COMMIT_MSG=$(cat <<EOF
Complete: $PLAN_NAME

Plan: $PLAN_TITLE
Tasks: $COMPLETED/$TOTAL_TASKS | Phases: $PHASE_COUNT
Duration: $DURATION

Phases:
$PHASES
$ARCHIVE_SECTION
Outputs: docs/plan-outputs/$PLAN_NAME/

🤖 Generated with Claude Code

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)
```

**Step 2: Create the commit**
```bash
git commit -m "$COMMIT_MSG"
if [[ $? -ne 0 ]]; then
    echo "✗ Failed to create merge commit"
    echo ""
    echo "The staged changes from squash merge are still present."
    echo "You can manually commit with: git commit"
    exit 1
fi
```

**Step 3: Verify commit was created**
```bash
MERGE_COMMIT=$(git rev-parse HEAD)
echo "✓ Created merge commit: $MERGE_COMMIT"
echo "  $(git log -1 --oneline HEAD)"
```

**Step 4: Show commit summary**
```bash
# Display brief summary
echo ""
echo "Commit summary:"
git log -1 --stat HEAD | head -20
```

**Example output (success):**
```
✓ Created merge commit: abc123def
  abc123d Complete: my-feature-plan

Commit summary:
 .claude/commands/plan/complete.md |  150 +++++
 docs/plan-outputs/.../status.json |   85 +++
 src/lib/feature.ts                |  320 ++++++++++
 tests/feature.test.ts             |  180 ++++++
 4 files changed, 735 insertions(+)
```

**Example output (failure):**
```
✗ Failed to create merge commit

The staged changes from squash merge are still present.
You can manually commit with: git commit
```

**Handling empty commits:**

If no files changed (rare but possible):
```bash
# Check if there are staged changes
STAGED_COUNT=$(git diff --cached --name-only | wc -l)
if [[ "$STAGED_COUNT" -eq 0 ]]; then
    echo "⚠ No changes to commit - plan branch was identical to $MAIN_BRANCH"
    echo "  Skipping commit creation."
    MERGE_COMMIT=""
else
    # Proceed with normal commit
    git commit -m "$COMMIT_MSG"
fi
```

### 11. Delete Plan Branch

After successful merge, delete the plan branch to clean up.

**Step 1: Verify we're on main branch (safety check)**
```bash
CURRENT_BRANCH=$(git branch --show-current)
if [[ "$CURRENT_BRANCH" != "$MAIN_BRANCH" ]]; then
    echo "⚠ Warning: Not on $MAIN_BRANCH, skipping branch deletion"
    echo "  Current branch: $CURRENT_BRANCH"
    exit 0  # Exit gracefully - merge was successful
fi
```

**Step 2: Delete the plan branch**
```bash
# PLAN_BRANCH was saved earlier (e.g., "plan/my-plan")
git branch -D "$PLAN_BRANCH"
if [[ $? -ne 0 ]]; then
    echo "⚠ Warning: Failed to delete plan branch: $PLAN_BRANCH"
    echo "  You can delete it manually: git branch -D $PLAN_BRANCH"
else
    echo "✓ Deleted plan branch: $PLAN_BRANCH"
fi
```

**Step 3: Verify branch was deleted**
```bash
# Confirm branch no longer exists
if git show-ref --verify --quiet "refs/heads/$PLAN_BRANCH"; then
    echo "⚠ Branch still exists: $PLAN_BRANCH"
else
    echo "  Branch successfully removed from local repository"
fi
```

**Example output (success):**
```
✓ Deleted plan branch: plan/my-plan
  Branch successfully removed from local repository
```

**Example output (failure - non-fatal):**
```
⚠ Warning: Failed to delete plan branch: plan/my-plan
  You can delete it manually: git branch -D plan/my-plan
```

**Note:** Branch deletion failure is non-fatal. The merge was successful, and the archive tag preserves the branch history. The user can manually delete the branch if needed.

### 12. Update Status.json with Completion Information

After successful merge, update status.json with completion metadata.

**Step 1: Prepare completion data**
```bash
# Get timestamps
COMPLETED_AT=$(date -Iseconds)
MERGED_AT=$(date -Iseconds)

# Get merge commit SHA (already captured in Step 10)
MERGE_COMMIT_SHA=$(git rev-parse HEAD)

# Archive tag (captured in Step 6, or empty if --no-archive)
# ARCHIVE_TAG is already set from earlier step
```

**Step 2: Update status.json with completion fields**
```javascript
const fs = require('fs');

const statusPath = `docs/plan-outputs/${PLAN_NAME}/status.json`;
const status = JSON.parse(fs.readFileSync(statusPath, 'utf8'));

// Add completion timestamp
status.completedAt = COMPLETED_AT;

// Add merge timestamp
status.mergedAt = MERGED_AT;

// Add merge commit SHA
status.mergeCommit = MERGE_COMMIT_SHA;

// Add archive tag (null if --no-archive was used)
status.archiveTag = ARCHIVE_TAG || null;

// Write updated status
fs.writeFileSync(statusPath, JSON.stringify(status, null, 2));
```

**Using Node.js one-liner:**
```bash
node -e "
const fs = require('fs');
const statusPath = 'docs/plan-outputs/$PLAN_NAME/status.json';
const status = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
status.completedAt = '$(date -Iseconds)';
status.mergedAt = '$(date -Iseconds)';
status.mergeCommit = '$MERGE_COMMIT_SHA';
status.archiveTag = '$ARCHIVE_TAG' || null;
fs.writeFileSync(statusPath, JSON.stringify(status, null, 2));
console.log('✓ Updated status.json with completion info');
"
```

**Step 3: Verify status.json was updated**
```bash
# Verify the fields exist
node -e "
const status = require('./docs/plan-outputs/$PLAN_NAME/status.json');
const fields = ['completedAt', 'mergedAt', 'mergeCommit', 'archiveTag'];
const missing = fields.filter(f => !(f in status));
if (missing.length > 0) {
    console.log('⚠ Missing fields in status.json:', missing.join(', '));
} else {
    console.log('✓ All completion fields present in status.json');
    console.log('  completedAt:', status.completedAt);
    console.log('  mergedAt:', status.mergedAt);
    console.log('  mergeCommit:', status.mergeCommit);
    console.log('  archiveTag:', status.archiveTag || '(none - --no-archive)');
}
"
```

**Final status.json structure:**
```json
{
  "planPath": "docs/plans/my-plan.md",
  "planName": "My Plan",
  "createdAt": "2024-12-20T10:00:00Z",
  "lastUpdatedAt": "2024-12-25T15:30:00Z",
  "completedAt": "2024-12-25T16:00:00Z",
  "mergedAt": "2024-12-25T16:00:00Z",
  "mergeCommit": "abc123def456...",
  "archiveTag": "archive/plan-my-plan",
  "currentPhase": "Phase 3: Final",
  "tasks": [...],
  "runs": [...],
  "summary": {
    "totalTasks": 15,
    "completed": 15,
    "pending": 0,
    "in_progress": 0,
    "failed": 0,
    "skipped": 0
  }
}
```

**Example output (success):**
```
✓ Updated status.json with completion info
✓ All completion fields present in status.json
  completedAt: 2024-12-25T16:00:00+00:00
  mergedAt: 2024-12-25T16:00:00+00:00
  mergeCommit: abc123def456789...
  archiveTag: archive/plan-my-plan
```

**Example output (--no-archive used):**
```
✓ Updated status.json with completion info
✓ All completion fields present in status.json
  completedAt: 2024-12-25T16:00:00+00:00
  mergedAt: 2024-12-25T16:00:00+00:00
  mergeCommit: abc123def456789...
  archiveTag: (none - --no-archive)
```

**Error handling:**
```bash
if [[ $? -ne 0 ]]; then
    echo "⚠ Warning: Failed to update status.json"
    echo "  Plan completion was successful, but status tracking incomplete"
    echo "  You can manually add completion fields to: $STATUS_FILE"
fi
```

**Note:** Status.json update failure is non-fatal. The merge was successful, and the completion can be verified via git log. The status.json update is for tracking purposes only.
