# Split Task into Subtasks

Break a large task into smaller, more manageable subtasks.

## Instructions

### 1. Load Active Plan

Read `.claude/current-plan.txt` to get the active plan path.

**If no active plan:**
- Inform the user: "No active plan set. Use /plan:set to choose a plan first."
- Stop execution

### 2. Parse Plan and Identify Splittable Tasks

Read the plan file and find tasks that could benefit from splitting:

**Prioritize for splitting:**
1. Tasks with detailed descriptions (lots of "Missing coverage" bullets)
2. Tasks marked as "CRITICAL" or "Large"
3. Top-level tasks (1.1, 2.1) over subtasks (1.1.1, 1.1.2)
4. Tasks with multiple distinct components mentioned

**Deprioritize:**
- Already-split tasks (those with subtasks)
- Simple/atomic tasks
- Tasks already marked complete

### 3. Present Tasks for Single Selection

Use AskUserQuestion (single-select) to let user choose one task:

```
Select a task to split:

Phase 1: Critical Unit Tests
○ 1.1 WebSocketConnection (CRITICAL) - 7 coverage items listed
○ 1.2 Preferences Store (HIGH) - 6 coverage items listed
○ 1.3 API Utils (HIGH) - 2 coverage items listed
○ 1.4 Phase Constants (MEDIUM) - 4 coverage items listed
○ 1.5 Phase Advance Route (HIGH) - 5 coverage items listed

Phase 2: Mock CLI & Integration
○ 2.1 mock-claude-cli.ts - Multiple behaviors to implement
○ 2.2 orchestrator.integration.test.ts - 8 coverage items listed
```

### 4. Analyze Task and Propose Subtasks

After user selects a task:

1. **Read the full task section** from the plan
2. **Identify distinct components** that could be separate subtasks
3. **Generate subtask IDs** using nested numbering (e.g., 1.1 → 1.1.1, 1.1.2, 1.1.3)
4. **Write clear subtask descriptions** that are actionable and specific

**Sources for subtask identification:**
- "Missing coverage" bullet points
- Distinct features or behaviors mentioned
- Logical groupings of related functionality
- Natural test boundaries

**Example analysis for task 1.1 WebSocketConnection:**

```
Analyzing task 1.1: WebSocketConnection

Found 7 coverage items in task description:
- Connection lifecycle (connect, disconnect, reconnect)
- React Strict Mode handling (connection reuse, delayed cleanup)
- Message queueing when disconnected
- Queue flushing on reconnect
- Status and message listener management
- Server event handling for all message types
- Module-level connection tracking maps

Proposed subtasks:
```

### 5. Present Proposed Subtasks for Confirmation

Show the proposed split and ask for confirmation:

```
Proposed subtasks for 1.1 WebSocketConnection:

  1.1.1 Test connection lifecycle (connect, disconnect, reconnect)
  1.1.2 Test React Strict Mode handling
  1.1.3 Test message queueing when disconnected
  1.1.4 Test queue flushing on reconnect
  1.1.5 Test listener management (status and message)
  1.1.6 Test server event handling
  1.1.7 Test module-level connection tracking

Options:
○ Accept and update plan
○ Modify subtasks (I'll ask what to change)
○ Cancel
```

### 6. Handle User Response

**If "Accept":**
- Proceed to update the plan file

**If "Modify":**
- Ask what changes they want:
  ```
  What would you like to modify?
  ○ Combine some subtasks (fewer, larger tasks)
  ○ Split further (more granular tasks)
  ○ Rename subtasks
  ○ Remove some subtasks
  ○ Add additional subtasks
  ```
- Apply modifications and show updated list
- Confirm again

**If "Cancel":**
- Exit without changes

### 7. Update Plan File

Insert subtasks into the plan in the appropriate location.

**Option A: Add as checklist under existing task**

Before:
```markdown
### 1.1 WebSocketConnection (CRITICAL)

**File:** `src/lib/websocket-connection.ts`
**Status:** No direct tests

**Missing coverage:**
- Connection lifecycle...
```

After:
```markdown
### 1.1 WebSocketConnection (CRITICAL)

**File:** `src/lib/websocket-connection.ts`
**Status:** No direct tests

**Subtasks:**
- [ ] 1.1.1 Test connection lifecycle (connect, disconnect, reconnect)
- [ ] 1.1.2 Test React Strict Mode handling
- [ ] 1.1.3 Test message queueing when disconnected
- [ ] 1.1.4 Test queue flushing on reconnect
- [ ] 1.1.5 Test listener management (status and message)
- [ ] 1.1.6 Test server event handling
- [ ] 1.1.7 Test module-level connection tracking

**Missing coverage:**
- Connection lifecycle...
```

**Option B: Update Implementation Checklist**

If the plan has an "Implementation Checklist" section, also update it:

Before:
```markdown
### Phase 1: Critical Unit Tests
- [ ] `tests/unit/lib/websocket-connection.test.ts`
```

After:
```markdown
### Phase 1: Critical Unit Tests
- [ ] `tests/unit/lib/websocket-connection.test.ts`
  - [ ] 1.1.1 Test connection lifecycle
  - [ ] 1.1.2 Test React Strict Mode handling
  - [ ] 1.1.3 Test message queueing
  - [ ] 1.1.4 Test queue flushing
  - [ ] 1.1.5 Test listener management
  - [ ] 1.1.6 Test server events
  - [ ] 1.1.7 Test connection tracking
```

### 8. Confirm Changes

```
Task 1.1 has been split into 7 subtasks.

Updated locations in plan:
- Added "Subtasks:" section under ### 1.1 WebSocketConnection
- Updated Implementation Checklist with nested items

You can now use /plan:implement to work on individual subtasks.
```

## Subtask Naming Guidelines

**Good subtask names:**
- Start with action verb: "Test...", "Add...", "Create...", "Implement..."
- Are specific and scoped: "Test connection lifecycle" not "Test connections"
- Are completable in one session: ~30 min to 2 hours of work
- Are independently verifiable: Can confirm done without other subtasks

**Bad subtask names:**
- Too vague: "Handle edge cases"
- Too broad: "Write all tests"
- Dependent: "Finish remaining work"

## Important Notes

- **Preserve original task** - Don't delete the parent task; subtasks are additions
- **Maintain numbering** - Use consistent nested numbering (1.1.1, 1.1.2, etc.)
- **Keep subtasks atomic** - Each should be completable independently
- **3-7 subtasks ideal** - Too few defeats the purpose; too many is overwhelming
