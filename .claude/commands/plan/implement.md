# Implement Plan Task(s)

Implement one or more tasks from the active plan.

## Instructions

### 1. Load Active Plan and Initialize Status

**See:** `.claude/commands/plan/_common/status-tracking.md` for complete status tracking reference.

**Quick reference:**
1. Read `.claude/current-plan.txt` to get the active plan path
2. If no active plan: inform user "No active plan set. Use /plan:set to choose a plan first." and stop
3. Call `initializePlanStatus(planPath)` to ensure status.json exists
4. Read `.claude/current-plan-output.txt` to get the output directory path

### 1.5. Parse Arguments (if provided)

If arguments are passed to this skill, parse them to determine which tasks to implement:

**Argument formats supported:**

| Format | Example | Behavior |
|--------|---------|----------|
| Single task ID | `1.1` | Implement task 1.1 only |
| Multiple task IDs | `1.1 1.2 1.3` | Implement listed tasks in order |
| Phase selector | `phase:1` or `p:1` | All pending tasks in Phase 1 |
| All pending | `all` | All pending tasks (with confirmation) |
| No arguments | (empty) | Interactive selection (step 3) |

**Parsing logic:**

```
args = skill arguments (may be empty)

if args is empty:
    → Continue to step 3 (interactive selection)

if args == "all":
    → Select all pending tasks
    → Show confirmation: "Implement all N pending tasks?"
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
# Implement specific task
/plan:implement 1.1

# Implement multiple tasks
/plan:implement 1.1 1.2 1.3
/plan:implement 1.1, 1.2, 1.3

# Implement entire phase
/plan:implement phase:2
/plan:implement p:0

# Implement all pending
/plan:implement all

# Search by description
/plan:implement websocket
```

### 2. Parse Plan File

Read the plan file to understand task structure, but use status.json for execution state.

**Important: Source of Truth**
- status.json is THE authoritative source for task completion status
- Markdown checkboxes (`- [ ]` / `- [x]`) are reference documentation only
- NEVER modify markdown checkboxes during execution

**Phases:** Look for headers matching these patterns:
- `## Phase N: Title`
- `### Phase N: Title`

**Tasks:** Within each phase, identify tasks from:
- Checklist items: `- [ ] ID Description` (format only - checkbox state is ignored)
- Numbered sections: `### N.N Task Name` followed by content

**Task identification:**
- Extract task ID (e.g., "1.1", "2.3", "0.1")
- Extract task description/title
- Check status.json for actual completion state (not markdown checkbox)

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

4. **Analyze task complexity** - determine if single or multiple agents are needed (see Section 5.1)

5. **Execute with appropriate agent strategy** - spawn agents based on task requirements

6. **Collect and write outputs** - main conversation collects agent output, reviews, then writes files

7. **Mark complete or failed** after verification (see Section 6)

### 5.1. Agent Execution Strategy

Even a single task may require multiple agents working in parallel. Analyze each task to determine the optimal execution approach.

**When to use multiple agents for a single task:**

| Scenario | Agent Strategy |
|----------|----------------|
| Single file creation | 1 agent |
| Multiple independent files | Parallel agents (1 per file or file group) |
| Test file + implementation | Parallel agents (test agent + impl agent) |
| Refactoring across files | Parallel agents grouped by module |
| Analysis + code generation | Sequential (analysis first, then code agents) |

**Example: Task "1.1 Add user authentication" might spawn:**
```
Agent 1: Create auth middleware (src/middleware/auth.ts)
Agent 2: Create auth utilities (src/lib/auth-utils.ts)
Agent 3: Create auth tests (tests/unit/auth.test.ts)
Agent 4: Update route handlers (src/routes/*.ts)
```

### 5.2. Parallel Agent Execution Rules

**For parallel tasks, use the Task tool with multiple agents:**

```
Launching agents for task 1.1:
- Agent 1: auth middleware
- Agent 2: auth utilities
- Agent 3: auth tests

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
1. Launch all independent agents simultaneously using multiple Task tool calls in a single message
2. Wait for all agents to complete before proceeding
3. If one agent fails, continue others but note the failure
4. Collect all results (generated content) before writing any files
5. **Main conversation writes files** after collecting all agent outputs
6. Verify files were written correctly before marking task complete

**Resource awareness:**
- Maximum 5 parallel agents per task
- Balance load across agents (don't overload one agent with many files)
- Group related files to the same agent when they have interdependencies

### 5.3. Sequential vs Parallel Decision

**Run agents in parallel when:**
- Files are independent (no imports between them)
- Work can be divided by module/feature
- Tests and implementation don't share setup code

**Run agents sequentially when:**
- Later work depends on earlier output (e.g., generate types first, then use them)
- Files have circular dependencies that need coordinated changes
- A shared foundation must be established first

**Example sequential flow:**
```
Step 1: Agent generates shared types (src/types/auth.ts)
        ↓ (wait for completion)
Step 2: Parallel agents use those types:
        - Agent A: auth middleware
        - Agent B: auth utilities
        - Agent C: auth tests
```

### 5.4. Collecting and Writing Agent Output

After all agents complete:

1. **Review each agent's output** for completeness and correctness
2. **Check for conflicts** - ensure agents didn't generate conflicting code
3. **Write files in dependency order** - types/interfaces first, then implementations, then tests
4. **Run verification** if applicable (type check, lint, test)
5. **Handle failures** - if writing fails, report which files succeeded/failed

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
