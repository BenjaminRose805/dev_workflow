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

### 8. Perform Squash Merge

Squash all commits from the plan branch into a single staged change.

**Step 1: Execute squash merge**
```bash
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
```

**Step 2: Verify staged changes**
```bash
# The squash merge stages all changes but doesn't commit
STAGED=$(git diff --cached --stat)
if [[ -z "$STAGED" ]]; then
    echo "⚠ No changes to merge (plan branch may be identical to $MAIN_BRANCH)"
    echo "  This can happen if all changes were already merged."
else
    FILE_COUNT=$(git diff --cached --name-only | wc -l)
    echo "✓ Squash merge complete - $FILE_COUNT file(s) staged"
fi
```

**Example output (success):**
```
✓ Squash merge complete - 12 file(s) staged
```

**Example output (no changes):**
```
⚠ No changes to merge (plan branch may be identical to main)
  This can happen if all changes were already merged.
```

**Example output (failure):**
```
✗ Squash merge failed

This may happen if:
  - Merge conflicts occurred (resolve manually)
  - Branch has diverged significantly from main

To resolve:
  1. Switch back to plan branch: git checkout plan/my-plan
  2. Merge main into plan: git merge main
  3. Resolve any conflicts and commit
  4. Re-run /plan:complete
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
│   Tasks: {completed}/{total}                                │
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
```bash
# Extract unique phases and count tasks per phase
PHASES=$(node -e "
const status = require('./$STATUS_FILE');
const phases = {};
status.tasks.forEach(t => {
    phases[t.phase] = (phases[t.phase] || 0) + 1;
});
Object.entries(phases).forEach(([name, count]) => {
    console.log('  - ' + name + ' (' + count + ' tasks)');
});
")
```

**Step 4: Build commit message**

The commit message follows this format:

```
Complete: {plan-name}

Plan: {plan-title}
Tasks: {completed}/{total}
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

If `--no-archive` was used, omit the Archive section:
```bash
if [[ -n "$ARCHIVE_TAG" ]]; then
    ARCHIVE_SECTION="Archive: $ARCHIVE_TAG
  View individual commits: git log $ARCHIVE_TAG
"
else
    ARCHIVE_SECTION=""
fi
```

**Example commit message:**
```
Complete: my-feature-plan

Plan: Implementation Plan: My Feature
Tasks: 15/15
Duration: 2 days

Phases:
  - Phase 0: Preparation (2 tasks)
  - Phase 1: Core Implementation (8 tasks)
  - Phase 2: Testing (3 tasks)
  - Phase 3: Documentation (2 tasks)

Archive: archive/plan-my-feature-plan
  View individual commits: git log archive/plan-my-feature-plan

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
Tasks: $COMPLETED/$TOTAL_TASKS
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
