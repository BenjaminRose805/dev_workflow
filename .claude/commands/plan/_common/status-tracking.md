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
- Output directory path is derived from plan name: `docs/plan-outputs/{plan-name}/`
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

## Execution Annotations

Plan files can include execution annotations to control how tasks and phases are run.

### `[SEQUENTIAL]` - Task-Level Constraint

Use `[SEQUENTIAL]` to mark tasks that must run one at a time, typically because they modify the same file.

**Syntax:**
```markdown
**Execution Note:** Tasks X.Y-X.Z are [SEQUENTIAL] - reason

## Phase 3: Database Migration
- [ ] 3.1 Add users table migration
- [ ] 3.2 Add indexes to users table
- [ ] 3.3 Add foreign key constraints
- [ ] 3.4 Run migration validation

**Execution Note:** Tasks 3.1-3.4 are [SEQUENTIAL] - all modify database schema
```

**Behavior:**
- Tasks in the range must be executed one at a time, in order
- The orchestrator will not start task 3.2 until 3.1 completes
- Prevents race conditions when multiple tasks modify the same resource

**Range formats supported:**
- `Tasks 3.1-3.4` - Range of tasks (3.1, 3.2, 3.3, 3.4)
- `Tasks 3.1, 3.3, 3.5` - Comma-separated list
- `Tasks 3.1-3.4 and 4.1-4.3` - Multiple ranges

### `[PARALLEL]` - Phase-Level Constraint

Use `[PARALLEL]` to mark phases that can run concurrently, enabling parallel execution across phase boundaries.

**Syntax:**
```markdown
**Execution Note:** Phases X-Y are [PARALLEL] - reason

## Phase 1: API Development
- [ ] 1.1 Create user endpoints
- [ ] 1.2 Add authentication

## Phase 2: Frontend Development
- [ ] 2.1 Create user components
- [ ] 2.2 Add auth UI

## Phase 3: Testing
- [ ] 3.1 Write API tests
- [ ] 3.2 Write frontend tests

**Execution Note:** Phases 1-3 are [PARALLEL] - independent modules
```

**Behavior:**
- Tasks from parallel phases can be returned together by `next` command
- The orchestrator can work on Phase 2 tasks while Phase 1 is still in progress
- File conflict detection warns if parallel phases touch the same files
- Sequential task annotations within parallel phases are still respected

**Range formats supported:**
- `Phases 1-3` - Range of phases (1, 2, 3)
- `Phases 1, 2, 3` - Comma-separated list
- `Phases 1-3, 5` - Mixed range and list

### Conflict Detection

The system automatically detects file conflicts:

1. **Within tasks:** If multiple tasks reference the same file, they're flagged with `fileConflict: true`
2. **Between parallel phases:** `getParallelPhases()` checks for files referenced by multiple parallel phases

**Example conflict warning:**
```json
{
  "parallelGroups": [{"phaseIds": [1, 2, 3]}],
  "hasConflicts": true,
  "conflicts": [{"file": "src/api.ts", "phases": [1, 3]}]
}
```

### API Functions for Constraints

| Function | Description |
|----------|-------------|
| `parseExecutionNotes(content)` | Parse both `[SEQUENTIAL]` and `[PARALLEL]` annotations |
| `getTaskConstraints(planPath, taskId)` | Get constraints for a specific task |
| `getParallelPhases(planPath)` | Get parallel phase groups with conflict detection |
| `detectFileConflicts(tasks)` | Detect file conflicts between tasks |

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

# Get next tasks (respects parallel phases and sequential annotations)
node scripts/status-cli.js next 5
```
