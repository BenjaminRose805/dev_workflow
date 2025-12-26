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

## Next Steps

After pre-checks pass, the completion workflow will:
1. Handle any uncommitted changes
2. Create archive tag (unless `--no-archive`)
3. Switch to main branch
4. Perform squash merge (or selected strategy)
5. Create completion commit with metadata
6. Delete plan branch
7. Update status.json with completion info
