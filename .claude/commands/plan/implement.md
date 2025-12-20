# Implement Plan Task(s)

Implement one or more tasks from the active plan.

## Instructions

### 1. Load Active Plan

Read `.claude/current-plan.txt` to get the active plan path.

**If no active plan:**
- Inform the user: "No active plan set. Use /plan:set to choose a plan first."
- Stop execution

**Initialize status tracking:**
- Call `initializePlanStatus(planPath)` to ensure output directory and status.json exist
- Read `.claude/current-plan-output.txt` to get the output directory path
- If initialization fails, warn the user but continue (status tracking is optional)

### 2. Parse Plan File

Read the plan file and extract:

**Phases:** Look for headers matching these patterns:
- `## Phase N: Title`
- `### Phase N: Title`

**Tasks:** Within each phase, find incomplete tasks:
- Checklist items: `- [ ] Task description`
- Numbered sections: `### N.N Task Name` followed by content

**Task identification:**
- Extract task ID (e.g., "1.1", "2.3", "0.1")
- Extract task description/title
- Note the line number for later marking complete

### 2.1. Handle Template Variables

If the plan was created from a template, it may contain `{{variable}}` placeholders.

**Detect unsubstituted variables:**
```regex
\{\{([a-z_]+)\}\}
```

**If variables are found:**

1. **Check if variables affect current tasks**
   - Scan each task description for `{{...}}` patterns
   - Tasks with unsubstituted variables cannot be implemented directly

2. **Prompt for variable values:**
   ```
   This plan contains unsubstituted template variables:

   Found in task descriptions:
   - {{target_path}} - appears in 3 tasks
   - {{test_framework}} - appears in 2 tasks

   Would you like to:
   ○ Provide values now (recommended)
   ○ Skip tasks with variables
   ○ Cancel and edit plan manually
   ```

3. **Substitute variables if user provides values:**
   - Use Edit tool to replace all `{{variable}}` with provided value
   - Update the plan file before proceeding with implementation
   - Confirm: "Variables substituted. Proceeding with implementation."

4. **Handle common template variables:**
   | Variable | How to determine value |
   |----------|----------------------|
   | `{{date}}` | Auto-fill with current date |
   | `{{target_path}}` | Ask user or infer from context |
   | `{{test_framework}}` | Check package.json for vitest/jest |
   | `{{analysis_type}}` | Ask user |

**Example flow:**
```
Plan contains template variables:
- {{target_path}}: src/lib/orchestrator.ts

Substituting variables...
✓ Replaced 5 occurrences of {{target_path}}

Proceeding with task selection...
```

### 3. Present Tasks Using AskUserQuestion

**Use the task-selection template** (`.claude/templates/questions/task-selection.md`) with these parameters:

```
action: "implement"
multiSelect: true
showBulkOptions: true
groupBy: "phase"
showCounts: true
dividerStyle: "simple"
limitPerGroup: 7
```

**Expected output format** (generated from template):

```
Select task(s) to implement:

Quick Select:
☐ All tasks in Phase 0 (5 tasks)
☐ All tasks in Phase 1 (5 tasks)

Phase 0: Test Directory Restructure (5 tasks)
☐ 0.1 Move e2e/ → tests/e2e/
☐ 0.2 Move e2e/fixtures/test-project.ts → tests/fixtures/
☐ 0.3 Update playwright.config.ts testDir
☐ 0.4 Update vitest.config.ts exclusion path
☐ 0.5 Delete empty e2e/ directory

Phase 1: Critical Unit Tests (5 tasks)
☐ 1.1 websocket-connection.test.ts
☐ 1.2 preferences-store.test.ts
...
```

**Template configuration notes:**
- `multiSelect: true` enables multi-selection in AskUserQuestion
- `showBulkOptions: true` adds "All tasks in Phase X" quick select options
- `limitPerGroup: 7` shows max 7 tasks per phase (add "... and N more" if exceeded)
- See template documentation for full configuration options

### 4. Plan Execution Strategy

After user selects tasks:

**Group by phase for execution:**
- Tasks within the SAME phase can run in parallel (use Task tool with multiple agents)
- Tasks in DIFFERENT phases must run sequentially (phase order matters)

**Show execution preview:**
```
Execution Plan:
├── Sequential Group 1 (Phase 0):
│   └── 0.3 Update playwright.config.ts
├── Parallel Group 2 (Phase 1):
│   ├── 1.1 websocket-connection.test.ts
│   ├── 1.2 preferences-store.test.ts
│   └── 1.3 api-utils.test.ts
```

**Confirm before executing** if more than 3 tasks selected.

### 4.1. Start Execution Run

Before implementing tasks:

1. **Start a new run record:**
   - Call `startRun(planPath)` to create a new run record in status.json
   - Save the returned `runId` for later completion tracking
   - The run tracks: start time, tasks completed, tasks failed

2. **Example:**
   ```javascript
   const runId = startRun(planPath);
   console.log(`Started execution run: ${runId}`);
   ```

### 5. Implement Each Task

For each selected task:

1. **Mark task as started:**
   - Call `markTaskStarted(planPath, taskId)` to update status to `in_progress`
   - This updates the status.json file with current timestamp

2. **Read the task details** from the plan file (the section content, not just the checklist item)

3. **Understand the context** - what files need to be created/modified

4. **Generate the implementation** - analyze requirements and produce the code/content

5. **Return content as output** - DO NOT write files directly; return all generated code/content

6. **Main conversation writes files** - after reviewing agent output, write files and verify

7. **Mark complete or failed** after verification (see Section 6)

**IMPORTANT - Read-Only Agent Pattern:**
When using the Task tool to spawn agents for implementation:
- Instruct agents to RETURN content, not write files
- Agents should output: file path + complete file content
- Main conversation collects output, reviews, then writes files
- This ensures a checkpoint before changes are committed

Example agent prompt addition:
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

### 6. Mark Tasks Complete

After implementing each task successfully:

**Update status tracking:**
- Call `markTaskCompleted(planPath, taskId, findingsContent)` to mark the task as completed
- If the task generated analysis or findings, pass them as `findingsContent`
- The findings will be written to `docs/plan-outputs/<plan-name>/findings/<taskId>.md`
- Status is updated in status.json with completion timestamp

**DO NOT modify markdown checkboxes** - the status-manager handles all tracking.

**Example:**
```javascript
// Task with findings/analysis
const findings = `
## Analysis Results

- Created websocket-connection.test.ts with 15 test cases
- All tests passing
- Coverage: 92%
`;
markTaskCompleted(planPath, taskId, findings);

// Simple task without findings
markTaskCompleted(planPath, taskId);
```

### 7. Report Progress

After all tasks complete:

1. **Complete the execution run:**
   - Call `completeRun(planPath, runId, completedCount, failedCount)`
   - This records the final counts and completion timestamp

2. **Show summary using status symbols** from `.claude/templates/shared/status-symbols.md`:

```
Implementation Complete!

✓ 1.1 websocket-connection.test.ts - Created tests/unit/lib/websocket-connection.test.ts
✓ 1.2 preferences-store.test.ts - Created tests/unit/stores/preferences-store.test.ts
✓ 1.3 api-utils.test.ts - Created tests/unit/lib/api-utils.test.ts

3/3 tasks completed successfully.
```

3. **Display progress from status.json:**
   - Use `formatProgress(planPath)` to show a formatted progress display
   - This includes: completion percentage, task counts, current phase, last update time

**Example output:**
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

## Error Handling

**If a task fails:**
- Call `markTaskFailed(planPath, taskId, errorMessage)` instead of marking complete
- The error message is stored in status.json
- Report the error clearly to the user
- Continue with other selected tasks (unless they depend on the failed one)
- Summarize failures at the end

**Example:**
```javascript
try {
  // Attempt task implementation
} catch (error) {
  markTaskFailed(planPath, taskId, error.message);
  console.error(`✗ ${taskId} failed: ${error.message}`);
}
```

**If task is blocked:**
- Explain what's blocking it
- Suggest prerequisites
- Offer to implement prerequisites first
- Optionally use `markTaskSkipped(planPath, taskId, reason)` if skipping is appropriate

**Status tracking failures:**
- If status-manager functions fail, log the error but continue execution
- Status tracking is helpful but not critical to task implementation
- Warn the user that progress tracking may be incomplete

## Parallel Execution Rules

1. **Same phase = parallel OK** - Tasks in the same phase typically don't depend on each other
2. **Different phases = sequential** - Later phases often depend on earlier ones
3. **Explicit dependencies** - If task B mentions task A, run A first
4. **Shared files** - If two tasks modify the same file, run sequentially
