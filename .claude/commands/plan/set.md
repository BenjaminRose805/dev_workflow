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

### 3.1. Initialize Status Tracking

After setting the plan path, initialize status tracking:

Execute status initialization:
```bash
node -e "const sm = require('./scripts/lib/status-manager'); const result = sm.initializePlanStatus('PLAN_PATH'); console.log(JSON.stringify(result));"
```

This creates `docs/plan-outputs/{plan-name}/` with:
- `status.json` - Task status tracking
- `findings/` - Task findings/outputs
- `timestamps/` - Execution timestamps

Also sets `.claude/current-plan-output.txt` to the output directory.

**If status already exists:**
- Load existing status instead of reinitializing
- Preserve previous execution history
- The `initializePlanStatus` function handles this automatically

**Status initialization response format:**
```json
{
  "success": true,
  "status": { /* status object */ },
  "error": null
}
```

**Error handling:**
- If `success: false`, status initialization failed but this is non-blocking
- Warn the user but continue with plan activation
- Status tracking is an optional enhancement

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
   - Count `- [ ]` (incomplete) and `- [x]` (complete) tasks
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
