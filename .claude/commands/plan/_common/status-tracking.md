# Status Tracking Integration

Shared status tracking instructions for plan commands. Include this template in your command to enable consistent status.json integration.

## Loading Active Plan and Status

### Step 1: Load Active Plan

Read `.claude/current-plan.txt` to get the active plan path.

**If no active plan:**
- Inform the user: "No active plan set. Use /plan:set to choose a plan first."
- Stop execution

### Step 2: Initialize Status Tracking

**Initialize status tracking:**
- Call `initializePlanStatus(planPath)` to ensure output directory and status.json exist
- Read `.claude/current-plan-output.txt` to get the output directory path
- If initialization fails, warn the user but continue (status tracking is optional)

**Load current status:**
- Use `getStatus(planPath, true)` to get full status data
- Use `getTasksByPhase(planPath)` for phase-organized task lists

## Status Functions Reference

### Marking Task Progress

| Function | When to Use |
|----------|-------------|
| `markTaskStarted(planPath, taskId)` | Before beginning task work |
| `markTaskCompleted(planPath, taskId, findings?)` | After successful completion |
| `markTaskFailed(planPath, taskId, errorMessage)` | When task cannot be completed |
| `markTaskSkipped(planPath, taskId, reason)` | When skipping due to dependencies |

### Run Tracking

| Function | When to Use |
|----------|-------------|
| `startRun(planPath)` | At the beginning of an execution session; returns runId |
| `completeRun(planPath, runId, completedCount, failedCount)` | At the end of execution |

### Status Queries

| Function | Returns |
|----------|---------|
| `getStatus(planPath, refresh?)` | Full status object |
| `getTasksByPhase(planPath)` | Tasks organized by phase |
| `getIncompleteTasks(planPath)` | Array of pending/in_progress tasks |
| `formatProgress(planPath)` | Formatted progress display string |

## Status Symbols

Use consistent symbols across all status displays:

| Symbol | Status | Description |
|--------|--------|-------------|
| `◯` | pending | Task not yet started |
| `⟳` | in_progress | Currently being worked on |
| `✓` | completed | Successfully finished |
| `✗` | failed | Could not be completed |
| `⊘` | skipped | Skipped (dependency failure or other reason) |

## Progress Display

Use `formatProgress(planPath)` for consistent progress reporting:

```
Plan: Test Coverage Enhancement
Progress: [████████████░░░░░░░░] 60%

  ✓ Completed: 9
  ◯ Pending: 6
  ✗ Failed: 0
  ⊘ Skipped: 0

Total: 15 tasks
Current Phase: Phase 1: Critical Unit Tests
Last Updated: 12/18/2025, 2:30:45 PM
```

## Source of Truth

**IMPORTANT:**
- `status.json` is THE authoritative source for task completion status
- Markdown checkboxes (`- [ ]` / `- [x]`) are reference documentation only
- NEVER modify markdown checkboxes during execution
- All status updates go through the status-manager functions

## Error Handling

**If status tracking fails:**
- Log the error but continue execution
- Status tracking is helpful but not critical to task completion
- Warn the user that progress tracking may be incomplete

**Example error handling:**
```javascript
try {
  markTaskCompleted(planPath, taskId, findings);
} catch (error) {
  console.error(`Warning: Could not update status for ${taskId}: ${error.message}`);
  // Continue with execution
}
```

## CLI Integration

The `scripts/status-cli.js` script provides command-line access to status tracking:

```bash
# Mark task status
node scripts/status-cli.js mark-started TASK_ID
node scripts/status-cli.js mark-complete TASK_ID --notes "Summary"
node scripts/status-cli.js mark-failed TASK_ID --error "Error message"

# Query status
node scripts/status-cli.js status
node scripts/status-cli.js progress
node scripts/status-cli.js task TASK_ID
```
