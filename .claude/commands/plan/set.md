# Set Active Plan

Set the current working plan file for subsequent `/plan:*` commands.

## Instructions

1. **Scan for plan files**: Execute `node scripts/scan-plans.js` to get plan data in JSON format
   - Parse the output to extract plan metadata, titles, and task counts
   - Identify the currently active plan from `currentPlan` field
   - **On script error**: Fall back to manual scanning (see Error Handling section)

2. **Present options using AskUserQuestion**:
   - Show each plan with its title and task counts
   - Format: `{filename} - {title} ({incomplete} remaining, {complete} done)`
   - If a plan is currently active, indicate it with "(current)"

3. **After user selection**:
   - Write the selected plan's relative path to `.claude/current-plan.txt`
   - Confirm the selection to the user
   - Show a brief summary of the plan's contents (phases/sections and task counts)

### 3.0.1 Check for Uncommitted Changes (Before Branch Switch)

Before switching branches (when git is available), check for uncommitted changes:

```bash
# Check if git is available
git --version 2>/dev/null

# If git available, check for uncommitted changes
git status --porcelain
```

**Detection logic:**
1. Run `git status --porcelain` to get list of uncommitted changes
2. Count the number of modified/untracked files
3. Store the result for the branch switching step (3.0.2)

**When uncommitted changes are detected:**
- If switching to a different plan branch, the branch switch step (3.0.2) will handle this
- The detection step only identifies changes; subsequent steps determine what to do

**Output format:**
```
Detected N uncommitted changes in working directory.
```

**Skip this check if:**
- Git is not available (not a git repository or git not installed)
- The selected plan is the same as the current plan (no branch switch needed)

### 3.1. Initialize Status Tracking

**See:** `.claude/commands/plan/_common/status-tracking.md` for complete status tracking reference.

After setting the plan path, initialize status tracking:

```bash
# Initialize output directory and status.json
node scripts/status-cli.js init
```

This creates `docs/plan-outputs/{plan-name}/` with:
- `status.json` - Task status tracking (the authoritative source of truth)
- `findings/` - Task findings/outputs
- `timestamps/` - Execution timestamps

The output directory path is derived from the plan name - no separate pointer needed.

**Error handling:**
- If status cannot be loaded, check `.claude/current-plan.txt` is set correctly
- Status tracking is optional, plan can be used without it

## Script Output Format

The script returns JSON:
```json
{
  "currentPlan": "docs/plans/example.md",
  "plans": [
    {
      "path": "/absolute/path/to/plan.md",
      "title": "Plan Title",
      "incomplete": 42,
      "complete": 13,
      "phases": [
        { "id": "1", "name": "Phase Name", "taskCount": 15, "completeCount": 3, "incompleteCount": 12 }
      ]
    }
  ]
}
```

## Example Output

After setting the plan, confirm like:

```
Active plan set to: docs/plans/test-suite-implementation.md
Output directory: docs/plan-outputs/test-suite-implementation/

Plan Summary:
- Phase 1: Critical Unit Tests (5 tasks, 2 completed)
- Phase 2: Mock CLI & Integration (3 tasks, 0 completed)
- Phase 3: E2E Tests (4 tasks, 0 completed)

Total: 12 tasks (10 remaining)

Progress: [████████░░░░░░░░░░░░] 40%
  ✓ Completed: 4
  ◯ Pending: 6
  ✗ Failed: 0
  ⊘ Skipped: 0

Use /plan:implement to work on tasks.
```

**If status tracking is available:**
- Show the progress bar with completion percentages
- Display task counts by status (completed, pending, failed, skipped)

**If status tracking is not available:**
- Skip the progress display
- Show only the plan summary from markdown parsing

## Error Handling

### Script Errors

If `node scripts/scan-plans.js` fails (non-zero exit code or invalid JSON):

1. **Log the error**: Append error details to `.claude/logs/script-errors.log`
   ```
   [timestamp] scan-plans.js: <error message>
   ```

2. **Show user message**:
   ```
   ⚠ Script scan failed, using manual scanning...
   ```

3. **Fall back to manual scanning**:
   - Use Glob to find `docs/plans/*.md`
   - Read each file to extract title (first `#` heading)
   - Parse task IDs from `- [ ] ID Description` patterns
   - Note: Markdown checkbox state is for display only; status.json is authoritative
   - Read `.claude/current-plan.txt` for current plan
   - Continue with step 2 as normal

### Status Initialization Errors

If status initialization fails:

1. **Show warning message**:
   ```
   ⚠ Status tracking unavailable: <error message>
   ```

2. **Continue with plan activation**:
   - The plan is still set as active in `.claude/current-plan.txt`
   - Status tracking is optional, plan can be used without it
   - User can manually retry status init later if needed

3. **Common errors**:
   - Output directory creation fails: Check permissions on `docs/plan-outputs/`
   - Plan file not found: Verify the plan path is correct
   - Invalid plan format: Plan markdown may be malformed
