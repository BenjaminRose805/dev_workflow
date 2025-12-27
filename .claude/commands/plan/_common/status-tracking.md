# Status Tracking Integration

Shared status tracking instructions for plan commands. Include this template in your command to enable consistent status.json integration.

## Loading Active Plan and Status

### Step 1: Load Active Plan

Use the worktree-aware plan resolution:

1. **CLAUDE_WORKTREE environment variable** - If set, check `$CLAUDE_WORKTREE/.claude-context/current-plan.txt`
2. **Worktree context** - Check `.claude-context/current-plan.txt` (worktree-specific)
3. **Main repo** - Fall back to `.claude/current-plan.txt` (main repo)

**Using status-cli.js:**
```bash
node scripts/status-cli.js worktree-context  # Debug context detection
node scripts/status-cli.js status            # Uses correct context automatically
```

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

### `(depends: X.Y)` - Task Dependencies

Use the `(depends: X.Y)` syntax in task descriptions to declare explicit dependencies between tasks. This enables fine-grained DAG-based scheduling where tasks can start as soon as their dependencies complete, regardless of phase boundaries.

**Syntax:**
```markdown
## Phase 1: Foundation
- [ ] 1.1 Create shared types (src/types/auth.ts)
- [ ] 1.2 Create database schema (src/db/schema.ts)
- [ ] 1.3 Implement auth service (depends: 1.1, 1.2)

## Phase 2: API Layer
- [ ] 2.1 Create auth middleware (depends: 1.3)
- [ ] 2.2 Create user endpoints (depends: 2.1)
- [ ] 2.3 Create admin endpoints (depends: 2.1)

## Phase 3: Testing
- [ ] 3.1 Unit tests for types (depends: 1.1)
- [ ] 3.2 Integration tests (depends: 2.2, 2.3)
```

**Format specification:**
- Pattern: `(depends: X.Y)` or `(depends: X.Y, X.Z, ...)`
- Must appear within the task description (checklist item or task section)
- Task IDs must be valid (exist in the plan)
- Case-insensitive: `(depends:`, `(Depends:`, `(DEPENDS:` all work
- Whitespace is flexible: `(depends:1.1)`, `(depends: 1.1)`, `(depends: 1.1, 1.2)`

**Behavior:**
- Task is "ready" when: status is `pending` AND all dependencies are `completed` or `skipped`
- Cross-phase dependencies are allowed (task 3.1 can depend on task 1.1)
- Circular dependencies are detected and rejected during initialization
- Self-dependency (task depends on itself) is rejected

**Validation rules:**
1. All dependency task IDs must exist in the plan
2. No circular dependencies (A→B→C→A is invalid)
3. No self-dependencies (task cannot depend on itself)
4. Dependencies are validated during `initializePlanStatus()`

**Example execution order with DAG:**
```
Given the plan above:
1. 1.1, 1.2 (parallel - no dependencies)
2. 1.3, 3.1 (parallel - 1.3 deps met, 3.1 only needs 1.1)
3. 2.1 (depends on 1.3)
4. 2.2, 2.3 (parallel - both depend only on 2.1)
5. 3.2 (depends on 2.2, 2.3)
```

**Error handling:**
- Invalid task ID in dependency: Error during initialization
- Circular dependency: Error during initialization with cycle path
- Self-dependency: Error during initialization

### Cross-Phase Dependency Behavior

Cross-phase dependencies enable fine-grained parallelism by allowing tasks to start as soon as their dependencies complete, regardless of phase boundaries.

#### How It Works

1. **Default behavior:** Tasks are selected based on dependency completion, not phase order
2. **A task from Phase 3 can start before Phase 2 completes** if its dependencies are met
3. **Phase ordering is preserved as a tiebreaker:** When multiple tasks are ready, earlier phases are prioritized

#### When to Use Phase Ordering vs Explicit Dependencies

| Use Case | Approach |
|----------|----------|
| Strict phase ordering required | Use `--phase-priority` flag with `next` command |
| Fine-grained parallelism desired | Use `(depends: X.Y)` syntax to express actual dependencies |
| Tasks in same phase are independent | No annotation needed - they run in parallel |
| Cross-phase task depends on specific task | Add `(depends: X.Y)` where X.Y is in earlier phase |

#### Best Practices for Complex Plans

1. **Use explicit dependencies** when a task genuinely depends on another's output
2. **Don't over-specify** - if task 2.1 depends on 1.1, 1.2, 1.3, consider if it really needs all three
3. **Consider the critical path** - tasks on the longest dependency chain determine total execution time
4. **Use phase ordering** for logical grouping, not for sequencing (use `(depends:)` for that)
5. **Combine with `[SEQUENTIAL]`** when tasks in the same file need ordering

#### Example: Maximizing Parallelism

**Before (phase-based ordering):**
```
Phase 1: Foundation (must complete entirely)
Phase 2: Implementation (waits for all of Phase 1)
Phase 3: Testing (waits for all of Phase 2)
```
Total steps: 3 sequential phases

**After (dependency-based ordering):**
```
Phase 1: 1.1 types, 1.2 schema (parallel)
Phase 2: 2.1 middleware (depends: 1.1)
Phase 3: 3.1 type tests (depends: 1.1) - CAN START WHILE 2.1 RUNS
         3.2 integration (depends: 2.1)
```
Total steps: More parallelism, faster overall

#### CLI Options

```bash
# Default: Cross-phase scheduling enabled
node scripts/status-cli.js next 5

# Strict phase ordering (only return earliest phase's tasks)
node scripts/status-cli.js next 5 --phase-priority

# Ignore dependencies entirely (for debugging)
node scripts/status-cli.js next 5 --ignore-deps
```

#### Progress Display

When tasks from multiple phases execute in parallel, the progress display shows:

**Text format:**
```
⚡ Cross-Phase Execution: 2 phases active
   Phase 2: 2.1
   Phase 3: 3.1, 3.2
```

**JSON format:**
```json
{
  "crossPhaseExecution": {
    "active": true,
    "phases": [2, 3],
    "description": "Tasks from 2 phases executing in parallel"
  }
}
```

**Markers format:**
```
[PROGRESS] cross_phase active=true phases=2,3
```

### `(non-blocking)` - Non-Blocking VERIFY Tasks

Use the `(non-blocking)` annotation on VERIFY sections to indicate that VERIFY tasks should not block the next phase from starting. This enables pipeline-style execution where implementation phases can overlap.

**Syntax:**
```markdown
**VERIFY Phase 1:** (non-blocking)
- [ ] Type check passes
- [ ] Unit tests pass
- [ ] Linting passes
```

**Alternative syntax (inline):**
```markdown
**VERIFY Phase 1 (non-blocking):**
- [ ] Tests pass
```

**Behavior:**
- VERIFY tasks in a `(non-blocking)` phase don't block the next phase from starting
- Next phase tasks become ready as soon as the main implementation tasks complete
- VERIFY failures are still reported but don't cascade to block dependent work
- Useful for parallelizing test runs with ongoing implementation

**Example: Pipeline Execution**
```markdown
## Phase 1: Foundation
- [ ] 1.1 Create types
- [ ] 1.2 Create utilities

**VERIFY Phase 1:** (non-blocking)
- [ ] 1.3 Type check passes
- [ ] 1.4 Unit tests pass

## Phase 2: Implementation (can start before 1.3, 1.4 complete)
- [ ] 2.1 Create service (depends: 1.1, 1.2)
- [ ] 2.2 Create API endpoints (depends: 2.1)
```

**Execution order:**
1. 1.1, 1.2 (parallel - no dependencies)
2. 2.1, 1.3, 1.4 (parallel - VERIFY is non-blocking, 2.1 has deps met)
3. 2.2 (depends on 2.1)

**API:**
```javascript
const { getNonBlockingVerifyPhases } = require('./lib/plan-status');
const result = getNonBlockingVerifyPhases(planPath);
// result.phases = [1]
// result.isNonBlocking(1) => true
// result.isNonBlocking(2) => false
```

### `pipeline-start` - Early Phase Advancement

Use `pipeline-start` annotations to allow a phase to start when a specific task completes, rather than waiting for the entire previous phase. This enables overlapping phase execution for better parallelism.

**Syntax (inline with phase header):**
```markdown
## Phase 2: API Layer (pipeline-start: when 1.3 completes)
- [ ] 2.1 Create auth middleware
- [ ] 2.2 Create user endpoints
```

**Syntax (standalone annotation before phase):**
```markdown
**pipeline-start:** when 1.3 completes

## Phase 2: API Layer
- [ ] 2.1 Create auth middleware
- [ ] 2.2 Create user endpoints
```

**Behavior:**
- Phase 2 tasks become ready as soon as task 1.3 completes
- This works even if Phase 1 has other pending tasks (1.4, 1.5, etc.)
- Tasks in the triggered phase that have explicit dependencies still respect those dependencies
- The trigger task must complete successfully (status: completed or skipped)

**When to Use Pipeline-Start:**

| Use Case | Recommendation |
|----------|----------------|
| Phase 2 only needs one key output from Phase 1 | Use `pipeline-start: when X.Y completes` |
| Phase 2 needs multiple specific outputs | Use `(depends: X.Y, X.Z)` on individual tasks |
| Phase 2 needs ALL of Phase 1 complete | Don't use pipeline-start (default behavior) |
| VERIFY tasks should not block next phase | Use `(non-blocking)` on VERIFY sections |

**Example: Build Pipeline with Early Testing**
```markdown
## Phase 1: Foundation
- [ ] 1.1 Create shared types (src/types/shared.ts)
- [ ] 1.2 Create database schema (src/db/schema.ts)
- [ ] 1.3 Create auth utilities (src/lib/auth.ts)

## Phase 2: Implementation (pipeline-start: when 1.1 completes)
- [ ] 2.1 Create user service (depends: 1.1, 1.2)
- [ ] 2.2 Create auth service (depends: 1.3)

## Phase 3: Testing (pipeline-start: when 2.1 completes)
- [ ] 3.1 Unit tests for user service
- [ ] 3.2 Integration tests (depends: 2.1, 2.2)
```

**Execution order with pipeline-start:**
1. 1.1 (starts immediately)
2. 1.2, 1.3, and Phase 2 becomes "eligible" (1.1 completed triggers Phase 2)
3. 2.1 starts when 1.1, 1.2 complete; 2.2 starts when 1.3 completes
4. Phase 3 triggered when 2.1 completes; 3.1 can start; 3.2 waits for 2.2

**Execution order without pipeline-start:**
1. 1.1, 1.2, 1.3 (parallel)
2. Wait for ALL of Phase 1 to complete
3. 2.1, 2.2 (parallel)
4. Wait for ALL of Phase 2 to complete
5. 3.1, 3.2

**API:**
```javascript
const { getPipelineStartTriggers } = require('./lib/plan-status');
const result = getPipelineStartTriggers(planPath);
// result.triggers = [{ phase: 2, triggerTaskId: "1.1" }, { phase: 3, triggerTaskId: "2.1" }]
// result.getTriggerForPhase(2) => "1.1"
// result.isTriggeredPhase(2) => true
```

**Progress Visualization:**

The progress display shows pipeline triggers and their status:

**Text format:**
```
Pipeline Triggers:
   ✓ Phase 2 starts when 1.1 completes [completed]
   ⏳ Phase 3 starts when 2.1 completes [in_progress]
```

**JSON format:**
```json
{
  "pipeline": {
    "triggers": [
      { "phase": 2, "triggerTask": "1.1", "triggerStatus": "completed", "pipelineActive": true },
      { "phase": 3, "triggerTask": "2.1", "triggerStatus": "in_progress", "pipelineActive": false }
    ],
    "activeOverlaps": [
      { "phase": 2, "triggeredBy": "1.1" }
    ]
  }
}
```

**Markers format:**
```
[PROGRESS] pipeline phase=2 trigger=1.1 active=true
[PROGRESS] pipeline phase=3 trigger=2.1 active=false
```

### Combining Pipeline Annotations

Pipeline annotations can be combined for sophisticated execution patterns:

```markdown
## Phase 1: Foundation
- [ ] 1.1 Create types
- [ ] 1.2 Create utilities
- [ ] 1.3 Critical infrastructure

**VERIFY Phase 1:** (non-blocking)
- [ ] 1.4 Type check
- [ ] 1.5 Unit tests

## Phase 2: Implementation (pipeline-start: when 1.3 completes)
- [ ] 2.1 Service A (depends: 1.1)
- [ ] 2.2 Service B (depends: 1.2)

**Execution Note:** Tasks 2.1-2.2 are [SEQUENTIAL] - modify shared config
```

This combines:
- Pipeline-start for early phase advancement
- Non-blocking VERIFY for parallel testing
- Explicit dependencies for fine-grained control
- Sequential constraint to prevent file conflicts

### API Functions for Constraints

| Function | Description |
|----------|-------------|
| `parseExecutionNotes(content)` | Parse `[SEQUENTIAL]`, `[PARALLEL]`, `(non-blocking)`, and `pipeline-start` annotations |
| `getTaskConstraints(planPath, taskId)` | Get constraints for a specific task |
| `getParallelPhases(planPath)` | Get parallel phase groups with conflict detection |
| `getNonBlockingVerifyPhases(planPath)` | Get non-blocking VERIFY phases with helper function |
| `getPipelineStartTriggers(planPath)` | Get pipeline-start triggers with helper functions |
| `detectFileConflicts(tasks)` | Detect file conflicts between tasks |
| `parseDependencies(taskDescription)` | Extract dependency task IDs from task description |
| `validateDependencies(taskId, deps, allTaskIds)` | Validate dependencies exist and no self-dependency |

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

# Progress in different formats
node scripts/status-cli.js progress                   # Human-readable text (default)
node scripts/status-cli.js progress --format=json     # Full structured JSON
node scripts/status-cli.js progress --format=markers  # Parseable progress markers

# Watch mode for continuous updates
node scripts/status-cli.js progress --watch                     # Markers format (default)
node scripts/status-cli.js progress --watch --format=json       # JSON format
```

## Progress Marker Format (TUI Integration)

The `--format=markers` output provides parseable progress markers for TUI integration. Each marker follows the format:

```
[PROGRESS] <entity>=<id> <key>=<value> [<key>=<value>...]
```

### Marker Types

| Marker | Format | Description |
|--------|--------|-------------|
| Plan | `[PROGRESS] plan status=<status> percent=<N>` | Overall plan progress |
| Phase | `[PROGRESS] phase=<N> status=<status> percent=<N>` | Phase-level progress |
| Task | `[PROGRESS] task=<id> status=<status>` | Task status change |
| Summary | `[PROGRESS] summary completed=<N> pending=<N> failed=<N>` | Count summary |

### Status Values

| Entity | Valid Status Values |
|--------|---------------------|
| Plan | `pending`, `in_progress`, `completed` |
| Phase | `pending`, `in_progress`, `completed` |
| Task | `pending`, `started`, `completed`, `failed`, `skipped` |

### Example Output

```
[PROGRESS] plan status=in_progress percent=77
[PROGRESS] phase=0 status=completed percent=100
[PROGRESS] phase=1 status=completed percent=100
[PROGRESS] phase=2 status=in_progress percent=60
[PROGRESS] phase=3 status=pending percent=0
[PROGRESS] task=2.3 status=started
[PROGRESS] summary completed=10 pending=5 failed=0
```

### Watch Mode

The `--watch` flag enables continuous polling (every 2 seconds) and outputs only changes:

```bash
node scripts/status-cli.js progress --watch
```

**Behavior:**
- Emits task status changes as they occur
- Emits summary updates when counts change
- Automatically exits when plan status becomes `completed`
- Handles Ctrl+C gracefully

### JSON Format (Alternative)

For richer structured data, use `--format=json`:

```json
{
  "plan": {
    "path": "docs/plans/my-plan.md",
    "name": "My Plan",
    "status": "in_progress"
  },
  "summary": {
    "total": 15,
    "completed": 10,
    "in_progress": 1,
    "pending": 4,
    "failed": 0,
    "skipped": 0,
    "percentage": 67
  },
  "phases": [
    {"number": 0, "name": "Phase 0: Setup", "total": 3, "completed": 3, "percentage": 100},
    {"number": 1, "name": "Phase 1: Implementation", "total": 5, "completed": 3, "percentage": 60}
  ],
  "currentPhase": "Phase 1: Implementation",
  "lastUpdated": "2025-12-25T22:00:00.000Z"
}
```
