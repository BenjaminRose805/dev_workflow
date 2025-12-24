# Explain Plan Task(s)

Explain what task(s) involve without implementing them.

## Instructions

### 1. Load Active Plan

Read `.claude/current-plan.txt` to get the active plan path.

**If no active plan:**
- Inform the user: "No active plan set. Use /plan:set to choose a plan first."
- Stop execution

**After loading plan:**
- Optionally load status tracking: Use `getStatus(planPath, false)` (don't initialize)
- This allows showing task completion status in explanations

### 1.5. Parse Arguments (if provided)

If arguments are passed to this skill, parse them to determine which tasks to explain:

**Argument formats supported:**

| Format | Example | Behavior |
|--------|---------|----------|
| Single task ID | `1.1` | Explain task 1.1 only |
| Multiple task IDs | `1.1 1.2 1.3` | Explain listed tasks |
| Phase selector | `phase:1` or `p:1` | All tasks in Phase 1 |
| All tasks | `all` | All tasks in the plan |
| No arguments | (empty) | Interactive selection (step 3) |

**Parsing logic:**

```
args = skill arguments (may be empty)

if args is empty:
    → Continue to step 3 (interactive selection)

if args == "all":
    → Select all tasks (pending and completed)
    → Skip to step 4

if args matches /^p(hase)?:\d+$/i:
    → Extract phase number
    → Select all tasks in that phase
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
    → If single match, proceed with that task
```

**Validation:**
- For each task ID, verify it exists in the parsed plan
- Include both pending and completed tasks (unlike implement)
- Report any invalid IDs before proceeding

**Examples:**

```bash
# Explain specific task
/plan:explain 1.1

# Explain multiple tasks
/plan:explain 1.1 1.2 1.3
/plan:explain 1.1, 1.2, 1.3

# Explain entire phase
/plan:explain phase:2
/plan:explain p:0

# Explain all tasks
/plan:explain all

# Search by description
/plan:explain websocket
```

### 2. Parse Plan File

Read the plan file to understand task structure. Use status.json for execution state.

**Important:** status.json is the authoritative source of truth for task status.
Markdown checkboxes are reference documentation only and may not reflect actual state.

**Find tasks:**
- Checklist items: `- [ ] ID Description` (format for parsing - checkbox state is ignored)
- Numbered sections: `### N.N Task Name` with content below

**For each task, gather:**
- Task ID (e.g., "1.1", "2.3")
- Task title/description
- Full section content (everything under the task header until next header)
- Parent phase name

**Use status.json as primary status source:**
- Load status using `getStatus(planPath, false)`
- For each task, add current status (pending/in_progress/completed/failed/skipped)
- Use `getTaskStatus(planPath, taskId)` to get individual task status
- Include completion timestamps and duration if available
- Note if findings exist for the task

### 3. Present Tasks for Selection

Use AskUserQuestion with multi-select to let user choose tasks to explain:

```
Select task(s) to explain:

Phase 1: Critical Unit Tests
☐ 1.1 WebSocketConnection [pending]
✓ 1.2 Preferences Store [completed]
◐ 1.3 API Utils [in_progress]
✗ 1.4 Phase Constants [failed]
☐ 1.5 Phase Advance Route [pending]

Phase 2: Mock CLI & Integration
☐ 2.1 mock-claude-cli.ts [pending]
☐ 2.2 orchestrator.integration.test.ts [pending]
...
```

**Status symbols:**
- `☐` - pending
- `◐` - in_progress
- `✓` - completed
- `✗` - failed
- `⊘` - skipped

### 4. For Each Selected Task, Provide Explanation

**DO NOT implement anything. Only explain.**

For each selected task, provide:

#### a) Summary
A 1-2 sentence overview of what this task accomplishes.

#### b) Context
- Why this task exists in the plan
- What problem it solves
- How it fits into the larger project

#### c) Scope
- What files will be created or modified
- What functionality will be added
- Estimated complexity (small/medium/large)

#### d) Approach
- High-level steps to implement
- Key decisions or patterns to use
- Potential challenges to watch for

#### e) Dependencies
- Prerequisites (other tasks that should be done first)
- External dependencies (packages, APIs, etc.)
- Files/modules this task depends on

#### f) Verification
- How to verify the task is complete
- Tests to run
- Expected outcomes

#### g) Current Status (if available)
If status tracking exists, include:
- Current status: pending/in_progress/completed/failed/skipped
- Completed timestamp and duration (if completed)
- Error message (if failed)
- Skip reason (if skipped)
- Use `getTaskStatus(planPath, taskId)` to retrieve this data

#### h) Existing Findings (if available)
If task has findings recorded:
- Mention findings exist
- Show path: `docs/plan-outputs/<plan-name>/findings/<task-id>.md`
- Use `readFindings(planPath, taskId)` to check for existing findings
- Optionally display a preview of findings content

### 5. Format Output

Present explanations clearly:

```
## Task 1.1: WebSocketConnection Tests

### Summary
Create comprehensive unit tests for the WebSocketConnection class that handles real-time communication.

### Context
This is marked as CRITICAL in the plan because WebSocketConnection is core infrastructure. Currently it has no direct tests - it's only mocked in hook tests, meaning bugs could go undetected.

### Scope
- **Create:** `tests/unit/lib/websocket-connection.test.ts`
- **Complexity:** Medium-Large (many behaviors to test)

### Approach
1. Test connection lifecycle (connect, disconnect, reconnect)
2. Test React Strict Mode handling (connection reuse, delayed cleanup)
3. Test message queueing when disconnected
4. Test queue flushing on reconnect
5. Test listener management (add, remove, notify)

### Dependencies
- Requires: Socket.IO client mock or test server
- No task dependencies (can be done independently)

### Verification
- Run: `npm test -- websocket-connection`
- All tests pass
- Coverage report shows >80% for websocket-connection.ts

### Current Status
Status: completed
Completed: 2024-12-17 10:23 AM
Duration: 2m 34s

### Existing Findings
This task has findings recorded at: docs/plan-outputs/test-coverage-plan/findings/1-1.md

Preview:
> All tests pass successfully. Added comprehensive coverage for:
> - Connection lifecycle and reconnection logic
> - React Strict Mode double-mount handling
> - Message queueing and flush on reconnect
> - Listener management and notification
>
> Coverage: 94% (exceeds 80% target)

---
```

### 6. Offer Next Steps

After explaining, offer options:

```
What would you like to do next?
○ Implement these tasks (runs /plan:implement with same selection)
○ Explain more tasks
○ Nothing for now
```

## Important Notes

- **Read-only operation** - Do not create files, modify code, or run commands
- **Status integration** - Use status-manager functions to enhance explanations with tracking data
- **Be thorough** - Read the full task section in the plan, not just the title
- **Check the codebase** - Look at existing related files to give accurate context
- **Show findings** - If findings exist, preview them to provide context on what was learned
- **Identify blockers** - Note if a task seems blocked or has unclear requirements
- **Status functions to use:**
  - `getStatus(planPath, false)` - Load status without initializing
  - `getTaskStatus(planPath, taskId)` - Get specific task status
  - `readFindings(planPath, taskId)` - Read existing findings for a task
