# Batch Task Execution

Select multiple tasks for batch/parallel execution with detailed preview and progress tracking.

## Instructions

### 1. Load Active Plan and Initialize Status

**See:** `.claude/commands/plan/_common/status-tracking.md` for complete status tracking reference.

**Quick reference:**
1. Read `.claude/current-plan.txt` to get the active plan path
2. If no active plan: inform user "No active plan set. Use /plan:set to choose a plan first." and stop
3. Call `initializePlanStatus(planPath)` to create output directory and status.json
4. Output directory is derived from plan name: `docs/plan-outputs/{plan-name}/`

### 1.1. Git Branch Validation

**See:** `.claude/commands/plan/_common/git-utilities.md` for complete git utility patterns.

After loading the active plan, validate that you're on the correct git branch:

**Step 1: Check if `--no-branch-check` flag is present**

```bash
# Parse arguments for --no-branch-check flag
NO_BRANCH_CHECK=false
for arg in $ARGS; do
    if [ "$arg" = "--no-branch-check" ]; then
        NO_BRANCH_CHECK=true
        # Remove flag from args for further parsing
    fi
done

if [ "$NO_BRANCH_CHECK" = true ]; then
    echo "⚠ Branch validation skipped (--no-branch-check)"
    # Skip all branch validation steps
fi
```

**Step 2: Check git availability**

```bash
if ! git --version 2>/dev/null; then
    GIT_AVAILABLE=false
    echo "⚠ Git not available - skipping branch validation"
    # Skip all git operations in this section
fi
```

**Step 3: Get current branch and expected branch**

```bash
# Get current branch
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null)

# Derive expected branch from plan name
PLAN_NAME=$(basename "$PLAN_PATH" .md)
EXPECTED_BRANCH="plan/$PLAN_NAME"
```

**Step 4: Validate branch and take action**

| Current Branch | Action |
|----------------|--------|
| `plan/{plan-name}` (correct) | ✓ Continue normally |
| `plan/{other-plan}` (wrong plan branch) | Auto-switch with prompt (or auto-switch in autonomous mode) |
| Non-plan branch (e.g., `main`, `feature/x`) | Warn but continue for backwards compatibility |
| No branch (detached HEAD) | Warn but continue |

**Branch validation logic:**

```bash
# Case 1: Detached HEAD
if [ -z "$CURRENT_BRANCH" ]; then
    echo "⚠ Warning: In detached HEAD state."
    echo "  Consider checking out the plan branch: git checkout $EXPECTED_BRANCH"
    echo "  Continuing with batch execution..."

# Case 2: On correct plan branch
elif [ "$CURRENT_BRANCH" = "$EXPECTED_BRANCH" ]; then
    echo "✓ Git branch: $CURRENT_BRANCH"

# Case 3: On wrong plan branch
elif [[ "$CURRENT_BRANCH" == plan/* ]]; then
    echo "⚠ On wrong plan branch: $CURRENT_BRANCH"
    echo "  Expected branch: $EXPECTED_BRANCH"

    if [ "$AUTONOMOUS" = true ]; then
        # Auto-switch in autonomous mode
        echo "  Auto-switching to correct branch..."
        if git checkout "$EXPECTED_BRANCH" 2>/dev/null; then
            echo "  ✓ Switched to $EXPECTED_BRANCH"
        elif git checkout -b "$EXPECTED_BRANCH" 2>/dev/null; then
            echo "  ✓ Created and switched to $EXPECTED_BRANCH"
        else
            echo "  ✗ Failed to switch branches. Aborting."
            exit 1
        fi
    else
        # Prompt user in interactive mode
        # Use AskUserQuestion with options: Switch / Continue / Cancel
        # See "Auto-Switch Prompt" section below
    fi

# Case 4: On non-plan branch (backwards compatibility)
else
    echo "⚠ Warning: Not on a plan branch (currently on '$CURRENT_BRANCH')."
    echo "  Expected branch: $EXPECTED_BRANCH"
    echo "  Run /plan:set to switch to the plan branch."
    echo "  Continuing with batch execution..."
fi
```

**Auto-Switch Prompt (Interactive Mode):**

When on the wrong plan branch and in interactive mode, prompt the user:

```
⚠ On wrong plan branch: plan/other-plan
  Expected branch: plan/my-plan

Choose how to proceed:
○ Switch to correct branch (Recommended) - Switch to plan/my-plan
○ Continue on current branch - Execute tasks on plan/other-plan
○ Cancel - Abort batch execution
```

**Implementation with AskUserQuestion:**

```javascript
{
  questions: [{
    question: "You're on the wrong plan branch. How would you like to proceed?",
    header: "Branch",
    options: [
      {
        label: "Switch to correct branch (Recommended)",
        description: `Switch from ${currentBranch} to ${expectedBranch}`
      },
      {
        label: "Continue on current branch",
        description: `Execute tasks while staying on ${currentBranch}`
      },
      {
        label: "Cancel",
        description: "Abort batch execution"
      }
    ],
    multiSelect: false
  }]
}
```

**Response handling:**

```bash
case "$USER_CHOICE" in
    "Switch"*)
        if git checkout "$EXPECTED_BRANCH" 2>/dev/null; then
            echo "✓ Switched to $EXPECTED_BRANCH"
        elif git checkout -b "$EXPECTED_BRANCH" 2>/dev/null; then
            echo "✓ Created and switched to $EXPECTED_BRANCH"
        else
            echo "✗ Failed to switch branches."
            echo "  You may have uncommitted changes that conflict."
            echo "  Please resolve manually and retry."
            exit 1
        fi
        ;;
    "Continue"*)
        echo "Continuing on $CURRENT_BRANCH"
        ;;
    "Cancel"*)
        echo "Batch execution cancelled."
        exit 0
        ;;
esac
```

**Example output (correct branch):**
```
✓ Git branch: plan/my-plan
```

**Example output (wrong plan branch - auto-switched in autonomous mode):**
```
⚠ On wrong plan branch: plan/other-plan
  Expected branch: plan/my-plan
  Auto-switching to correct branch...
  ✓ Switched to plan/my-plan
```

**Example output (non-plan branch - backwards compatibility):**
```
⚠ Warning: Not on a plan branch (currently on 'main').
  Expected branch: plan/my-plan
  Run /plan:set to switch to the plan branch.
  Continuing with batch execution...
```

**Example output (--no-branch-check used):**
```
⚠ Branch validation skipped (--no-branch-check)
```

**Error messages for branch issues:**

| Scenario | Error Message |
|----------|---------------|
| Failed to switch | `✗ Failed to switch branches. You may have uncommitted changes that conflict. Please resolve manually and retry.` |
| Branch doesn't exist | `✗ Branch plan/{name} does not exist. Run /plan:set to create it.` |
| Detached HEAD | `⚠ Warning: In detached HEAD state. Consider checking out the plan branch: git checkout plan/{name}` |
| Git unavailable | `⚠ Git not available - skipping branch validation` |

---

### 1.5. Parse Arguments (if provided)

If arguments are passed to this skill, parse them to determine which tasks to batch execute:

**Argument formats supported:**

| Format | Example | Behavior |
|--------|---------|----------|
| Single task ID | `1.1` | Execute task 1.1 only |
| Multiple task IDs | `1.1 1.2 1.3` | Execute listed tasks |
| Phase selector | `phase:1` or `p:1` | All pending tasks in Phase 1 |
| All pending | `all` | All pending tasks (with confirmation) |
| No arguments | (empty) | Interactive selection (step 3) |
| `--autonomous` | `1.1 1.2 --autonomous` | Skip all interactive prompts |
| `--no-branch-check` | `1.1 --no-branch-check` | Skip git branch validation |

**Autonomous Mode:**

When `--autonomous` flag is present:
- Skip batch selection interface (step 3)
- Skip execution preview confirmation (step 5)
- Skip all error recovery prompts (step 8) - continue with remaining tasks on failure
- Task IDs MUST be provided as arguments
- Still report progress and final summary normally

**Detecting flags:**
```
args = skill arguments
autonomous = args contains "--autonomous"
noBranchCheck = args contains "--no-branch-check"
args = args with "--autonomous" and "--no-branch-check" removed (for further parsing)
```

**Parsing logic:**

```
args = skill arguments (may be empty)

if args is empty:
    → Continue to step 3 (interactive selection)

if args == "all":
    → Select all pending tasks
    → Show confirmation: "Execute all N pending tasks?"
    → If confirmed, skip to step 4

if args matches /^p(hase)?:\d+$/i:
    → Extract phase number
    → Select all pending tasks in that phase
    → Skip to step 4

if args matches /^[\d.]+([\s,]+[\d.]+)*$/:
    → Split on spaces or commas
    → Treat each as a task ID (e.g., "1.1", "2.3", "0.1")
    → Validate each task ID exists in the plan
    → If any invalid, report: "Task ID 'X.X' not found in plan"
    → Skip to step 4 with validated tasks

otherwise:
    → Treat as search string
    → Find tasks whose description contains the string
    → If multiple matches, show them and ask user to select
    → If single match, confirm and proceed
```

**Validation:**
- For each task ID, verify it exists in the parsed plan
- Check task is not already completed (warn but allow if user insists)
- Report any invalid IDs before proceeding

**Examples:**

```bash
# Execute specific task
/plan:batch 1.1

# Execute multiple tasks
/plan:batch 1.1 1.2 1.3
/plan:batch 1.1, 1.2, 1.3

# Execute entire phase
/plan:batch phase:2
/plan:batch p:1

# Execute all pending
/plan:batch all

# Search by description
/plan:batch websocket

# Skip branch validation
/plan:batch 1.1 --no-branch-check

# Combined flags
/plan:batch 1.1 1.2 --autonomous --no-branch-check
```

### 2. Parse Plan File

Read the plan and extract:
- All phases with their names
- All incomplete tasks grouped by phase
- Task dependencies (if mentioned)
- Task complexity indicators (CRITICAL, HIGH, MEDIUM, etc.)

**Optional:** Use `getIncompleteTasks(planPath)` to get tasks from status.json if available, falling back to parsing the markdown file if status tracking isn't initialized yet.

### 3. Present Batch Selection Interface (Interactive Mode)

**Skip this step if arguments were provided in step 1.5 or if `--autonomous` mode is enabled.** In autonomous mode, task IDs MUST be provided as arguments.

Use AskUserQuestion with multi-select, featuring quick-select options:

```
Batch Task Selection:

═══ Quick Select ═══
☐ All incomplete tasks (12 tasks)
☐ All Phase 0 tasks (5 tasks)
☐ All Phase 1 tasks (5 tasks)
☐ All Phase 2 tasks (2 tasks)

═══ Phase 0: Test Directory Restructure ═══
☐ 0.1 Move e2e/ → tests/e2e/
☐ 0.2 Move fixtures to tests/fixtures/
☐ 0.3 Update playwright.config.ts
☐ 0.4 Update vitest.config.ts
☐ 0.5 Delete empty e2e/ directory

═══ Phase 1: Critical Unit Tests ═══
☐ 1.1 websocket-connection.test.ts (CRITICAL)
☐ 1.2 preferences-store.test.ts (HIGH)
☐ 1.3 api-utils.test.ts (HIGH)
☐ 1.4 phases.test.ts (MEDIUM)
☐ 1.5 advance/route.test.ts (HIGH)

═══ Phase 2: Mock CLI & Integration ═══
☐ 2.1 mock-claude-cli.ts
☐ 2.2 orchestrator.integration.test.ts
```

### 4. Analyze Selection and Build Execution Plan

After user selects tasks:

**Step 1: Group by phase**
```
Selected tasks by phase:
- Phase 0: [0.3, 0.4]
- Phase 1: [1.1, 1.2, 1.3]
- Phase 2: [2.1, 2.2]
```

**Step 2: Detect dependencies**
- Check if any task explicitly depends on another
- Check if tasks modify the same files
- Check for implicit ordering (e.g., "move" before "delete")

**Step 3: Build parallel groups**
- Tasks in same phase with no conflicts → parallel
- Tasks with dependencies → sequential
- Cross-phase tasks → sequential by phase order

### 5. Show Execution Preview

**In `--autonomous` mode:** Skip the confirmation prompt and proceed directly to execution. Still display the execution plan for logging purposes, but don't wait for user confirmation.

Use the **execution-confirm template** (`.claude/templates/questions/execution-confirm.md`) to display the execution plan.

**Template Configuration:**
- `title`: "EXECUTION PLAN"
- `strategy`: Describe the execution strategy (e.g., "Mixed parallel/sequential", "Sequential by phase")
- `groups`: Array of execution groups with phase names, parallel/sequential flags, and tasks
- `summary`: Include task count, phases, parallel/sequential breakdown, estimated parallel groups
- `options`: ["Execute this plan", "Modify selection", "Cancel"] (skip in autonomous mode)

**Example output** (generated from template):

```
═══════════════════════════════════════════════════════
                    EXECUTION PLAN
═══════════════════════════════════════════════════════

Phase 0 (Sequential - file operations):
│
├─► 0.3 Update playwright.config.ts
│
└─► 0.4 Update vitest.config.ts

        ↓ (Phase 0 complete, proceed to Phase 1)

Phase 1 (Parallel - independent test files):
│
├─┬─► 1.1 websocket-connection.test.ts
│ │
├─┬─► 1.2 preferences-store.test.ts
│ │
├─┬─► 1.3 api-utils.test.ts
│
└── (All 3 tasks run concurrently)

        ↓ (Phase 1 complete, proceed to Phase 2)

Phase 2 (Sequential - 2.2 depends on 2.1):
│
├─► 2.1 mock-claude-cli.ts
│
└─► 2.2 orchestrator.integration.test.ts

═══════════════════════════════════════════════════════
Summary: 7 tasks in 3 phases
  • 3 tasks will run in parallel
  • 4 tasks will run sequentially
  • Estimated parallel groups: 5
═══════════════════════════════════════════════════════

Options:
○ Execute this plan
○ Modify selection
○ Cancel
```

See template documentation for full configuration options and additional examples.

### 6. Execute with Progress Tracking

If user confirms execution:

**Start a new execution run:**
- Call `startRun(planPath)` to create a run record and get a runId
- Store the runId for completion tracking

**Use the progress-display template** (`.claude/templates/output/progress-display.md`) for real-time updates.

**Status symbols** (from `.claude/templates/shared/status-symbols.md`):
- `◯` - Pending
- `⟳` - In progress
- `✓` - Completed
- `✗` - Failed
- `⊘` - Skipped (due to dependency failure)

**Initialize progress display:**
```
═══ Batch Execution Started ═══

Phase 0: Test Directory Restructure
  ◯ 0.3 Update playwright.config.ts
  ◯ 0.4 Update vitest.config.ts

Phase 1: Critical Unit Tests
  ◯ 1.1 websocket-connection.test.ts
  ◯ 1.2 preferences-store.test.ts
  ◯ 1.3 api-utils.test.ts

Phase 2: Mock CLI & Integration
  ◯ 2.1 mock-claude-cli.ts
  ◯ 2.2 orchestrator.integration.test.ts
```

**Update as tasks complete:**
```
Phase 0: Test Directory Restructure
  ✓ 0.3 Update playwright.config.ts (12s)
  ⟳ 0.4 Update vitest.config.ts (in progress...)
```

### 7. Parallel Execution Strategy

**For parallel tasks, use the Task tool with multiple agents:**

```
Launching parallel group (Phase 1):
- Agent 1: 1.1 websocket-connection.test.ts
- Agent 2: 1.2 preferences-store.test.ts
- Agent 3: 1.3 api-utils.test.ts

Waiting for all agents to complete...
```

**IMPORTANT - Read-Only Agent Pattern:**
Agents should RETURN content, not write files directly. This avoids permission issues and provides a checkpoint before changes are committed.

When launching agents, include this in the prompt:
```
IMPORTANT: Do NOT write files directly. Instead:
1. Analyze the task requirements
2. Generate the complete code/content
3. Return your output in this format:
   FILE: <path>
   ```<language>
   <content>
   ```
4. The main conversation will handle file writing
```

**Parallel execution rules:**
1. Launch all tasks in the group simultaneously using multiple Task tool calls
2. **Mark each task as started** with `markTaskStarted(planPath, taskId)` before launching its agent
3. Wait for all to complete before moving to next group
4. If one fails, continue others but note the failure
5. Collect all results (generated content) before proceeding
6. **Main conversation writes files** after collecting all agent outputs
7. Verify files were written correctly, then mark tasks complete with status tracking

### 8. Handle Failures

**Use the error-report template** (`.claude/templates/output/error-report.md`) for failure display and the **error-recovery template** (`.claude/templates/questions/error-recovery.md`) for user options.

**In `--autonomous` mode:** Skip error recovery prompts and automatically continue with remaining tasks. Still report failures for logging purposes.

**If a task fails:**
- Call `markTaskFailed(planPath, taskId, errorMessage)` to record the failure
- In autonomous mode: log the error and continue with remaining tasks
- In interactive mode: show recovery options

```
✗ 1.2 preferences-store.test.ts - FAILED
  Error: Test file created but 3 tests failing

  Options: (skipped in autonomous mode - auto-continue)
  ○ Continue with remaining tasks
  ○ Pause and fix this task
  ○ Abort batch execution
```

**If a dependency fails:**
- Call `markTaskSkipped(planPath, taskId, reason)` for all dependent tasks

```
✗ 2.1 mock-claude-cli.ts - FAILED

Affected dependent tasks:
  ⊘ 2.2 orchestrator.integration.test.ts - SKIPPED (depends on 2.1)
```

### 9. Mark Completed Tasks

After each successful task:
- Update status.json via `markTaskCompleted(planPath, taskId)`
- Write any findings to the `findings/` folder via the optional second parameter: `markTaskCompleted(planPath, taskId, findingsContent)`
- Don't wait for batch to complete
- This ensures progress is saved even if batch is interrupted

**Example:**
```javascript
// Basic completion
markTaskCompleted(planPath, '1.1');

// With findings
const findings = "Created 15 test cases covering all WebSocket connection scenarios";
markTaskCompleted(planPath, '1.1', findings);
```

### 10. Final Summary

**Complete the execution run:**
- Call `completeRun(planPath, runId, completedCount, failedCount)` to finalize the run record

**Use the execution-summary template** (`.claude/templates/output/execution-summary.md`) for the final results display.

**Template Configuration:**
- `title`: "BATCH EXECUTION COMPLETE"
- `results`: Object with completed, failed, skipped counts
- `completed_items`: Array of completed tasks with timing
- `failed_items`: Array of failed tasks with error messages
- `skipped_items`: Array of skipped tasks with reasons
- `timing`: Object with total_time, sequential_estimate, time_saved
- `next_steps`: Suggested actions based on results

**Example output:**

```
═══════════════════════════════════════════════════════
                 BATCH EXECUTION COMPLETE
═══════════════════════════════════════════════════════

Results:
  ✓ Completed: 6 tasks
  ✗ Failed: 1 task
  ⊘ Skipped: 0 tasks

─── Completed Tasks ───
  ✓ 0.3 Update playwright.config.ts (12s)
  ✓ 0.4 Update vitest.config.ts (8s)
  ✓ 1.1 websocket-connection.test.ts (2m 34s)
  ✓ 1.2 preferences-store.test.ts (1m 12s)
  ✓ 1.3 api-utils.test.ts (45s)
  ✓ 2.1 mock-claude-cli.ts (1m 56s)

─── Failed Tasks ───
  ✗ 2.2 orchestrator.integration.test.ts
    Error: Could not import mock-claude-cli fixture

─── Timing ───
Total time: 4m 23s (with parallelization)
Sequential estimate: 8m 15s
Time saved: ~47%

Status updated: 6 tasks marked complete
Remaining in plan: 6 tasks

─── Progress ───
```

**Show updated progress:**
- Use `formatProgress(planPath)` to display the current progress bar and statistics

**Example progress output:**
```
Plan: Test Coverage Improvement
Progress: [████████████░░░░░░░░] 60%

  ✓ Completed: 6
  ◯ Pending: 4
  ✗ Failed: 1
  ⊘ Skipped: 1

Total: 12 tasks
Current Phase: Phase 1: Critical Unit Tests
Last Updated: 12/18/2025, 3:45:23 PM
```

**Next Steps:**
```
─── Next Steps ───
  → Run /plan:batch again to continue
  → Run /plan:verify to check failed tasks

═══════════════════════════════════════════════════════
```

See `.claude/templates/output/execution-summary.md` for full template documentation.

## Execution Optimization

**Maximize parallelism:**
- All independent tasks in same phase run together
- Use up to 5 parallel agents for large batches
- Balance load across agents (don't give one agent 5 tasks while another gets 1)

**Minimize context switching:**
- Group related tasks even within parallel execution
- Keep file-modifying tasks sequential to avoid conflicts
- Run quick tasks first within a parallel group

## Important Notes

- **Agents are read-only** - Agents return content; main conversation writes files
- **Save progress continuously** - Mark tasks done immediately with `markTaskCompleted()`, not at end
- **Respect dependencies** - Never run dependent tasks in parallel
- **Handle interruption** - User can cancel mid-batch; completed work is preserved in status.json
- **Resource awareness** - Don't spawn too many parallel agents (max 5)
- **Status tracking is persistent** - All progress is stored in `docs/plan-outputs/<plan-name>/status.json`

## Structured Progress Output

For TUI integration and programmatic use, the command outputs structured progress that can be parsed:

### Status Updates via status.json

All execution progress is tracked in `docs/plan-outputs/<plan-name>/status.json`. The TUI monitors this file for real-time updates:

```json
{
  "tasks": [
    {"id": "1.1", "status": "in_progress", "startedAt": "2024-12-24T10:00:00Z"},
    {"id": "1.2", "status": "completed", "completedAt": "2024-12-24T10:05:00Z"}
  ],
  "runs": [
    {"runId": "run_001", "startedAt": "...", "tasksCompleted": 3, "tasksFailed": 1}
  ],
  "summary": {
    "totalTasks": 10,
    "completed": 5,
    "pending": 4,
    "in_progress": 1,
    "failed": 0
  }
}
```

### Progress Markers in Output

During batch execution, emit progress markers that can be parsed:

```
[BATCH] started tasks=5 phases=2
[PROGRESS] task=1.1 status=started agent=parallel
[PROGRESS] task=1.2 status=started agent=parallel
[PROGRESS] task=1.1 status=completed duration=45s
[PROGRESS] task=1.2 status=completed duration=32s
[BATCH] phase=1 complete succeeded=2 failed=0
[BATCH] complete succeeded=5 failed=1 skipped=0 duration=3m45s
```

These markers help the TUI track batch progress in real-time, including parallel execution state.

## Autonomous Mode Reference

The `--autonomous` flag enables non-interactive batch execution for orchestrator integration.

**Usage:**
```bash
/plan:batch 1.1 1.2 1.3 --autonomous
/plan:batch phase:1 --autonomous
/plan:batch all --autonomous
```

**Behavior changes in autonomous mode:**

| Step | Interactive Mode | Autonomous Mode |
|------|-----------------|-----------------|
| 1.1. Branch validation | Prompt for switch/continue | Auto-switch to correct branch |
| 3. Batch selection | AskUserQuestion UI | Skipped (IDs required as args) |
| 5. Execution preview | Show + confirm | Show (no confirmation) |
| 6-7. Execution | Normal | Normal |
| 8. Error handling | Prompt for recovery action | Auto-continue with remaining |
| 9-10. Completion | Normal | Normal |

**Error behavior in autonomous mode:**
- Failed tasks are marked with `markTaskFailed()`
- Dependent tasks are marked as skipped
- Execution continues with remaining independent tasks
- Final summary still reports all failures

**Requirements:**
- Task IDs MUST be provided as arguments (no fallback to interactive selection)
- Cannot be combined with empty arguments (will error)

**Example orchestrator usage:**
```
Run: /plan:batch 1.1 1.2 1.3 --autonomous

Execute these tasks. On failure, continue with remaining tasks.
Report final status when complete.
```

## Branch Validation Flag Reference

The `--no-branch-check` flag disables git branch validation for advanced use cases.

**Usage:**
```bash
/plan:batch 1.1 1.2 --no-branch-check           # Skip branch check
/plan:batch all --autonomous --no-branch-check  # Combined with autonomous
```

**When to use `--no-branch-check`:**
- Running tasks from a different plan on purpose (cross-plan work)
- CI/CD environments where branch management is handled externally
- Debugging or testing scenarios
- When working with worktrees where branch detection may be inconsistent

**Example:**
```
⚠ Branch validation skipped (--no-branch-check)
Proceeding with batch execution on current branch: main
```

**Note:** Using `--no-branch-check` may result in commits being made to the wrong branch. Use with caution.
