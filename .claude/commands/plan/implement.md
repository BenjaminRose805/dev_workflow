# Implement Plan Task(s)

Implement one or more tasks from the active plan.

## Instructions

### 1. Load Active Plan and Initialize Status

**See:** `.claude/commands/plan/_common/status-tracking.md` for complete status tracking reference.

**Quick reference:**
1. Read `.claude/current-plan.txt` to get the active plan path
2. If no active plan: inform user "No active plan set. Use /plan:set to choose a plan first." and stop
3. Call `initializePlanStatus(planPath)` to ensure status.json exists
4. Output directory is derived from plan name: `docs/plan-outputs/{plan-name}/`

### 1.1. Git Branch Validation

After loading the active plan, validate that you're on the correct git branch:

**Step 1: Check git availability**
```bash
git --version 2>/dev/null
```
- If command fails: Set `GIT_AVAILABLE=false` and skip all git operations in this section
- If command succeeds: Continue with branch validation

**Step 2: Get current branch and expected branch**
```bash
# Get current branch
CURRENT_BRANCH=$(git branch --show-current)

# Load configuration for branch naming
CONFIG_FILE=".claude/git-workflow.json"
BRANCH_PREFIX="plan/"
STRATEGY="branch-per-plan"

if [ -f "$CONFIG_FILE" ]; then
  BRANCH_PREFIX=$(cat "$CONFIG_FILE" | grep -o '"branch_prefix":\s*"[^"]*"' | grep -o '"[^"]*"$' | tr -d '"')
  BRANCH_PREFIX=${BRANCH_PREFIX:-plan/}
  STRATEGY=$(cat "$CONFIG_FILE" | grep -o '"strategy":\s*"[^"]*"' | grep -o '"[^"]*"$' | tr -d '"')
  STRATEGY=${STRATEGY:-branch-per-plan}
  # Load enforce_branch setting (default: true)
  ENFORCE_BRANCH=$(grep -o '"enforce_branch":\s*false' "$CONFIG_FILE" >/dev/null && echo false || echo true)
else
  ENFORCE_BRANCH=true
fi

# Derive expected branch from plan name
PLAN_NAME=$(basename "$PLAN_PATH" .md)

if [ "$STRATEGY" = "branch-per-phase" ]; then
  # For branch-per-phase, check current phase from task context
  # Expected branch format: {prefix}{plan}/phase-{N}
  EXPECTED_BRANCH_PATTERN="${BRANCH_PREFIX}${PLAN_NAME}/phase-"
else
  EXPECTED_BRANCH="${BRANCH_PREFIX}${PLAN_NAME}"
fi
```

**Step 3: Validate branch and take action**

| Current Branch | Action |
|----------------|--------|
| `{prefix}{plan-name}` (correct for branch-per-plan) | Continue normally |
| `{prefix}{plan-name}/phase-N` (correct for branch-per-phase) | Continue normally |
| `{prefix}{other-plan}` (wrong plan branch) | Log warning, auto-switch |
| Non-plan branch (e.g., `master`, `feature/x`) | Fail if `enforce_branch: true` (default), warn if `enforce_branch: false` |
| No branch (detached HEAD) | Warn but continue |

**Branch switching logic:**
```bash
# Check if on a plan branch (with configured prefix)
if [[ "$CURRENT_BRANCH" == ${BRANCH_PREFIX}* ]]; then
    if [ "$STRATEGY" = "branch-per-phase" ]; then
        # For branch-per-phase, verify we're on the correct plan's phase branch
        if [[ ! "$CURRENT_BRANCH" == ${EXPECTED_BRANCH_PATTERN}* ]]; then
            echo "Warning: On branch '$CURRENT_BRANCH' but plan expects '${EXPECTED_BRANCH_PATTERN}N'"
            # Don't auto-switch for branch-per-phase - user needs to complete current phase first
            echo "  Complete current phase or run /plan:set to switch plans."
        fi
    else
        # For branch-per-plan, verify exact branch match
        if [[ "$CURRENT_BRANCH" != "$EXPECTED_BRANCH" ]]; then
            echo "Warning: On branch '$CURRENT_BRANCH' but plan expects '$EXPECTED_BRANCH'"
            git checkout "$EXPECTED_BRANCH" 2>/dev/null || git checkout -b "$EXPECTED_BRANCH"
            echo "Switched to branch '$EXPECTED_BRANCH'"
        fi
    fi
fi
```

**Non-plan branch handling:**
```bash
# If on a non-plan branch (doesn't match configured prefix)
if [[ ! "$CURRENT_BRANCH" == ${BRANCH_PREFIX}* ]]; then
    if [ "$ENFORCE_BRANCH" = true ]; then
        # enforce_branch: true (default) - fail with clear error
        echo "✗ Error: Not on a plan branch (currently on '$CURRENT_BRANCH')."
        echo "  This plan requires being on branch '${BRANCH_PREFIX}$PLAN_NAME'."
        echo ""
        echo "  To fix: Run /plan:set to switch to the correct plan branch."
        echo "  To disable: Set \"enforce_branch\": false in .claude/git-workflow.json"
        exit 1  # Stop execution
    else
        # enforce_branch: false - warn but continue (backwards compatibility)
        echo "⚠ Warning: Not on a plan branch (currently on '$CURRENT_BRANCH')."
        echo "  Run /plan:set to switch to the plan branch '${BRANCH_PREFIX}$PLAN_NAME'."
        echo "  Continuing with task implementation..."
    fi
fi
```

**Example output (correct branch):**
```
Git branch: plan/my-plan ✓
```

**Example output (wrong plan branch - auto-switched):**
```
⚠ On wrong plan branch: plan/other-plan
  Switching to: plan/my-plan
  Switched to branch 'plan/my-plan'
```

**Example output (non-plan branch - enforce_branch: true):**
```
✗ Error: Not on a plan branch (currently on 'master').
  This plan requires being on branch 'plan/my-plan'.

  To fix: Run /plan:set to switch to the correct plan branch.
  To disable: Set "enforce_branch": false in .claude/git-workflow.json
```

**Example output (non-plan branch - enforce_branch: false):**
```
⚠ Warning: Not on a plan branch (currently on 'master').
  Run /plan:set to switch to the plan branch 'plan/my-plan'.
  Continuing with task implementation...
```

**Skip branch validation if:**
- Git is not available
- Running in a non-git directory
- The `--no-git` flag is passed (future feature)

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
| `--autonomous` | `1.1 1.2 --autonomous` | Skip all interactive prompts |
| `--push` | `1.1 --push` | Push commits to remote after each task |
| `--force` | `1.1 --force` | Skip dependency checking |
| `--strict-deps` | `1.1 --strict-deps` | Fail if task has unmet dependencies |

**Autonomous Mode:**

When `--autonomous` flag is present:
- Skip all AskUserQuestion prompts
- Skip execution preview confirmation (step 4)
- Skip "Confirm before executing" check for >3 tasks
- Proceed directly with implementation
- Still report progress and errors normally

**Detecting flags:**
```
args = skill arguments
autonomous = args contains "--autonomous"
push_enabled = args contains "--push"
force_deps = args contains "--force"
strict_deps = args contains "--strict-deps"
args = args with all flags removed (for further parsing)
```

**Parsing logic:**

```
args = skill arguments (may be empty)
autonomous = args contains "--autonomous"
push_enabled = args contains "--push"
force_deps = args contains "--force"
strict_deps = args contains "--strict-deps"
args = args with all flags removed

if args is empty:
    if autonomous:
        → ERROR: "Autonomous mode requires task IDs. Usage: /plan:implement 1.1 1.2 --autonomous"
        → Stop execution
    else:
        → Continue to step 3 (interactive selection)

if args == "all":
    → Select all pending tasks
    if not autonomous:
        → Show confirmation: "Implement all N pending tasks?"
        → If confirmed, skip to step 4
    else:
        → Skip directly to step 4 (no confirmation)

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
    if autonomous:
        → ERROR: "Autonomous mode requires explicit task IDs, not search strings"
        → Stop execution
    else:
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

# Search by description (interactive only)
/plan:implement websocket

# Autonomous mode - specific tasks (no prompts)
/plan:implement 1.1 1.2 1.3 --autonomous

# Autonomous mode - entire phase (no prompts)
/plan:implement phase:1 --autonomous

# Autonomous mode - all pending (no prompts)
/plan:implement all --autonomous

# ERROR: Autonomous mode without task IDs
/plan:implement --autonomous  # Will error - task IDs required

# Push commits to remote after each task
/plan:implement 1.1 1.2 --push

# Combine with autonomous mode
/plan:implement phase:1 --autonomous --push
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

**Execution constraints:** Look for `**Execution Note:**` blocks after phase headers:
- Pattern: `**Execution Note:** Tasks X.Y-X.Z are [SEQUENTIAL] - reason`
- Extract task ID ranges from annotations (e.g., "3.1-3.4" → tasks 3.1, 3.2, 3.3, 3.4)
- Store constraints for use in Step 4 execution planning

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

**Skip this step entirely if `--autonomous` mode is enabled.** In autonomous mode, task IDs MUST be provided as arguments - there is no fallback to interactive selection.

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

**CRITICAL: Check for Execution Constraints**

Before grouping tasks, scan the phase section for execution notes:

1. **Look for `[SEQUENTIAL]` annotation** in the phase:
   ```markdown
   **Execution Note:** Tasks 3.1-3.4 are [SEQUENTIAL] - all modify same file
   ```

2. **Parse the constraint:**
   - Extract task ID range (e.g., "3.1-3.4" → tasks 3.1, 3.2, 3.3, 3.4)
   - Mark these tasks as requiring sequential execution

3. **Detect file conflicts** (even without annotation):
   - If multiple selected tasks mention the same file path, treat as sequential
   - Example: Tasks both mentioning "orchestrator-system.md" → sequential

**Group by phase for execution (respecting constraints):**
- Tasks in DIFFERENT phases: Always sequential (phase order matters)
- Tasks in SAME phase with `[SEQUENTIAL]`: Run one at a time
- Tasks in SAME phase with file conflicts: Run one at a time
- Tasks in SAME phase, independent: Can run in parallel

**Show execution preview:**
```
Execution Plan:
├── Sequential Group 1 (Phase 0):
│   └── 0.3 Update playwright.config.ts
├── Parallel Group 2 (Phase 1):
│   ├── 1.1 websocket-connection.test.ts
│   ├── 1.2 preferences-store.test.ts
│   └── 1.3 api-utils.test.ts
├── Sequential Group 3 (Phase 3) [SEQUENTIAL]:
│   ├── 3.1 Merge ORCHESTRATOR.md content
│   ├── 3.2 Merge ARCHITECTURE.md content
│   ├── 3.3 Create redirect file
│   └── 3.4 Remove duplicate section
```

**Confirm before executing** if more than 3 tasks selected (skip in `--autonomous` mode).

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

### 4.2. Check for Unmet Dependencies

**Before implementing each task, check if it has unmet dependencies.**

Tasks may declare dependencies using the `(depends: X.Y, X.Z)` syntax in their description.
A task with unmet dependencies should not normally be implemented, as it may fail or produce incorrect results.

**Check dependencies using status-cli.js:**
```bash
# Get task dependency info
node scripts/status-cli.js deps --task 2.1
```

**Or check via status.json:**
```javascript
const status = loadStatus(planPath);
const task = status.tasks.find(t => t.id === taskId);
const dependencies = task.dependencies || [];

// Check each dependency
const unmetDeps = [];
for (const depId of dependencies) {
  const depTask = status.tasks.find(t => t.id === depId);
  if (depTask && depTask.status !== 'completed' && depTask.status !== 'skipped') {
    unmetDeps.push({ id: depId, status: depTask.status });
  }
}
```

**Behavior when unmet dependencies exist:**

| Mode | Behavior |
|------|----------|
| Interactive | Show warning and ask for confirmation |
| Autonomous | Show warning but continue unless `--strict-deps` is passed |
| With `--force` | Skip dependency check entirely |
| With `--strict-deps` | Fail immediately if any dependencies are unmet |

**Warning message format:**
```
⚠ Task 2.1 has unmet dependencies:
  - 1.3 (pending) - Create authentication service
  - 1.4 (in_progress) - Set up database schema

Implementing a task with unmet dependencies may cause:
  - Missing types or interfaces that haven't been created yet
  - References to functions that don't exist
  - Integration issues with incomplete features

Options:
  ○ Continue anyway (may require fixes later)
  ○ Implement dependencies first (recommended)
  ○ Skip this task
```

**In autonomous mode:**
```
⚠ Task 2.1 has unmet dependencies: 1.3 (pending), 1.4 (in_progress)
  Continuing anyway (autonomous mode)...
```

**With `--strict-deps` flag (for CI/orchestrator):**
```
✗ Task 2.1 blocked by unmet dependencies: 1.3, 1.4
  Use --force to override or implement dependencies first.
```

**Example flags:**
```bash
# Interactive mode - will prompt for confirmation
/plan:implement 2.1

# Autonomous mode - warns but continues
/plan:implement 2.1 --autonomous

# Skip dependency checking entirely
/plan:implement 2.1 --force

# Strict mode - fail on unmet dependencies (for CI)
/plan:implement 2.1 --strict-deps

# Autonomous with strict deps (orchestrator use)
/plan:implement 2.1 --autonomous --strict-deps
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

### 6.1. Commit Changes After Task Completion

After marking a task complete (or failed), commit the changes to git.

**Check auto_commit configuration:**
```bash
# Load auto_commit setting (default: true)
CONFIG_FILE=".claude/git-workflow.json"
AUTO_COMMIT=true

if [ -f "$CONFIG_FILE" ]; then
  # Check if auto_commit is explicitly set to false
  if cat "$CONFIG_FILE" | grep -q '"auto_commit":\s*false'; then
    AUTO_COMMIT=false
  fi
fi

if [ "$AUTO_COMMIT" = false ]; then
  echo "⚠ Auto-commit disabled (auto_commit: false in config)"
  echo "  Changes remain uncommitted. Commit manually when ready."
  # Skip commit workflow, continue to next task
  return 0
fi
```

**Commit workflow (when auto_commit is enabled):**

1. **Check for uncommitted changes:**
   ```bash
   git status --porcelain
   ```
   - If no changes, skip commit (task may have been analysis-only)

2. **Stage all changes:**
   ```bash
   git add -A
   ```

3. **Create commit with enhanced format:**

   **Commit message format:** `[plan-name] task {id}: {description}`

   The commit includes a multi-line body with plan metadata:
   ```
   [plan-name] task {id}: {description}

   Plan: {plan-name}
   Phase: {phase-number} - {phase-name}
   Task: {task-id}
   ```

   **Use a heredoc for proper formatting:**
   ```bash
   # Get plan name from plan path
   PLAN_NAME=$(basename "$PLAN_PATH" .md)

   # Get phase info (extract from task context)
   PHASE_NUM="2"
   PHASE_NAME="Branch Validation in /plan:implement"

   git commit -m "$(cat <<EOF
   [$PLAN_NAME] task $TASK_ID: $BRIEF_DESCRIPTION

   Plan: $PLAN_NAME
   Phase: $PHASE_NUM - $PHASE_NAME
   Task: $TASK_ID
   EOF
   )"
   ```

4. **Handle commit failures gracefully:**
   - If commit fails (e.g., nothing to commit, hooks reject), log warning but continue
   - Don't fail the task just because the commit failed

**Example:**
```bash
# After completing task 1.1 in "implement-authentication" plan
git add -A
git commit -m "$(cat <<EOF
[implement-authentication] task 1.1: Create auth middleware

Plan: implement-authentication
Phase: 1 - Core Implementation
Task: 1.1
EOF
)"
```

**Resulting commit message:**
```
[implement-authentication] task 1.1: Create auth middleware

Plan: implement-authentication
Phase: 1 - Core Implementation
Task: 1.1
```

**Skip commits when:**
- Task was analysis-only (no file changes)
- Running in `--dry-run` mode (if implemented)
- Git is not available or not a repository

**Note:** This creates granular commits per task. For cleaner history, consider squashing when merging feature branches (see git workflow analysis plan).

### 6.2. Push Changes to Remote (if sync_remote enabled)

After committing changes, optionally push to remote:

**Check sync_remote configuration:**
```bash
# Check if .claude/git-workflow.json exists and has sync_remote: true
SYNC_REMOTE=$(cat .claude/git-workflow.json 2>/dev/null | grep -o '"sync_remote":\s*true' || echo "")
```

**If sync_remote is enabled OR `--push` flag was passed:**

1. **Check if remote exists:**
   ```bash
   git remote get-url origin 2>/dev/null
   ```
   - If no remote configured, log warning and skip push
   - If remote exists, continue with push

2. **Push the commit:**
   ```bash
   git push 2>&1
   ```

3. **Handle push result:**
   - **Success:** Log `Pushed commit to remote`
   - **Failure:** Log warning but DON'T fail the task (graceful degradation)
     ```
     ⚠ Failed to push to remote: {error message}
       Task completed locally. Push manually with: git push
     ```

**Example output (success):**
```
✓ 1.1 websocket-connection.test.ts - Created tests/unit/lib/websocket-connection.test.ts
  Committed: [plan-name] task 1.1: Create websocket tests
  Pushed commit to remote
```

**Example output (push failed - graceful):**
```
✓ 1.1 websocket-connection.test.ts - Created tests/unit/lib/websocket-connection.test.ts
  Committed: [plan-name] task 1.1: Create websocket tests
  ⚠ Failed to push to remote: Permission denied
    Task completed locally. Push manually with: git push
```

**Skip push if:**
- `sync_remote` is false/not set AND `--push` flag not passed
- Git is not available
- No remote repository configured
- No commit was created (analysis-only task)
- Running in `--dry-run` mode (if implemented)

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

1. **`[SEQUENTIAL]` annotation** - Tasks marked with `[SEQUENTIAL]` in **Execution Note:** blocks MUST run one at a time, in order
2. **File conflicts** - If multiple tasks mention the same file path, treat as sequential (even without annotation)
3. **Same phase = parallel OK** - Tasks in the same phase typically don't depend on each other (unless rules 1-2 apply)
4. **Different phases = sequential** - Later phases often depend on earlier ones
5. **Explicit dependencies** - If task B mentions task A, run A first

**Example with [SEQUENTIAL]:**
```
Phase 3 has: **Execution Note:** Tasks 3.1-3.4 are [SEQUENTIAL] - all modify same file

Execution:
├── 3.1 (wait for completion)
├── 3.2 (wait for completion)
├── 3.3 (wait for completion)
└── 3.4 (final task in sequence)
```

## Structured Progress Output

For TUI integration and programmatic use, the command outputs structured progress that can be parsed:

### Status Updates via status.json

All progress is tracked in `docs/plan-outputs/<plan-name>/status.json`. The TUI monitors this file for real-time updates:

```json
{
  "tasks": [
    {"id": "1.1", "status": "in_progress", "startedAt": "2024-12-24T10:00:00Z"},
    {"id": "1.2", "status": "completed", "completedAt": "2024-12-24T10:05:00Z"}
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

During execution, emit progress markers that can be parsed:

```
[PROGRESS] task=1.1 status=started
[PROGRESS] task=1.1 status=completed duration=45s
[PROGRESS] summary completed=3 pending=7 failed=0
```

These markers are optional but help the TUI track progress when status.json monitoring has latency.

## Autonomous Mode Reference

The `--autonomous` flag enables non-interactive execution for orchestrator integration.

**Usage:**
```bash
/plan:implement 1.1 1.2 1.3 --autonomous
/plan:implement phase:1 --autonomous
/plan:implement all --autonomous
```

**Behavior changes in autonomous mode:**

| Step | Interactive Mode | Autonomous Mode |
|------|-----------------|-----------------|
| 3. Task selection | AskUserQuestion UI | Skipped (IDs required as args) |
| 4. Execution preview | Show + confirm if >3 tasks | Show (no confirmation) |
| Template variables | Prompt for values | Auto-fill or error |
| Execution | Normal | Normal |
| Error handling | Report to user | Log + continue |
| Progress reporting | Normal | Normal |

**Requirements:**
- Task IDs MUST be provided as arguments (no fallback to interactive selection)
- Cannot be combined with empty arguments (will error)

**Example orchestrator usage:**
```
Run: /plan:implement 1.1 1.2 1.3 --autonomous

Execute these tasks from the plan. Do not ask for confirmation.
Stop if you encounter an unrecoverable error.
```
