# Task Selection Template

A reusable template for presenting tasks to users in a consistent, scannable format.

## Template Variables

- `{{action}}` - Action verb (e.g., "implement", "verify", "select")
- `{{multiSelect}}` - Enable multi-selection (true/false)
- `{{showBulkOptions}}` - Show quick select options (true/false)
- `{{groupBy}}` - Grouping strategy: "phase", "priority", "none"
- `{{showPriority}}` - Display priority markers (true/false)
- `{{showCounts}}` - Show task counts in options (true/false)
- `{{dividerStyle}}` - "simple" or "fancy" (fancy uses ═══)
- `{{limitPerGroup}}` - Max tasks shown per group (default: 10, 0 = unlimited)

## Default Template Format

### Basic (No Bulk Options)

```
Select task(s) to {{action}}:

Phase 0: Test Directory Restructure
☐ 0.1 Move e2e/ → tests/e2e/
☐ 0.2 Move e2e/fixtures/test-project.ts → tests/fixtures/
☐ 0.3 Update playwright.config.ts testDir
☐ 0.4 Update vitest.config.ts exclusion path
☐ 0.5 Delete empty e2e/ directory

Phase 1: Critical Unit Tests
☐ 1.1 websocket-connection.test.ts
☐ 1.2 preferences-store.test.ts
☐ 1.3 api-utils.test.ts
...
```

### With Bulk Options (Quick Select)

```
Select task(s) to {{action}}:

Quick Select:
☐ All incomplete tasks (12 tasks)
☐ All tasks in Phase 0 (5 tasks)
☐ All tasks in Phase 1 (5 tasks)
☐ All tasks in Phase 2 (2 tasks)

Phase 0: Test Directory Restructure
☐ 0.1 Move e2e/ → tests/e2e/
☐ 0.2 Move e2e/fixtures/test-project.ts → tests/fixtures/
☐ 0.3 Update playwright.config.ts testDir
☐ 0.4 Update vitest.config.ts exclusion path
☐ 0.5 Delete empty e2e/ directory

Phase 1: Critical Unit Tests
☐ 1.1 websocket-connection.test.ts
☐ 1.2 preferences-store.test.ts
☐ 1.3 api-utils.test.ts
...
```

### With Priority Markers

```
Select task(s) to {{action}}:

Phase 0: Test Directory Restructure (5 tasks)
☐ 0.1 Move e2e/ → tests/e2e/
☐ 0.2 Move e2e/fixtures/test-project.ts → tests/fixtures/
☐ 0.3 Update playwright.config.ts testDir
☐ 0.4 Update vitest.config.ts exclusion path
☐ 0.5 Delete empty e2e/ directory

Phase 1: Critical Unit Tests (5 tasks)
☐ 1.1 websocket-connection.test.ts (CRITICAL)
☐ 1.2 preferences-store.test.ts (HIGH)
☐ 1.3 api-utils.test.ts (HIGH)
☐ 1.4 phases.test.ts (MEDIUM)
☐ 1.5 advance/route.test.ts (HIGH)
```

### Fancy Dividers (Batch Mode)

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

## Usage Examples

### Example 1: plan:implement

**Configuration:**
```
action: "implement"
multiSelect: true
showBulkOptions: true
groupBy: "phase"
showPriority: false
showCounts: true
dividerStyle: "simple"
limitPerGroup: 7
```

**Output:**
```
Select task(s) to implement:

Quick Select:
☐ All tasks in Phase 0 (5 tasks)
☐ All tasks in Phase 1 (7 tasks)

Phase 0: Test Directory Restructure (5 tasks)
☐ 0.1 Move e2e/ → tests/e2e/
☐ 0.2 Move e2e/fixtures/test-project.ts → tests/fixtures/
☐ 0.3 Update playwright.config.ts testDir
☐ 0.4 Update vitest.config.ts exclusion path
☐ 0.5 Delete empty e2e/ directory

Phase 1: Critical Unit Tests (7 tasks)
☐ 1.1 websocket-connection.test.ts
☐ 1.2 preferences-store.test.ts
☐ 1.3 api-utils.test.ts
☐ 1.4 phases.test.ts
☐ 1.5 advance/route.test.ts
☐ 1.6 create/route.test.ts
☐ 1.7 start/route.test.ts
```

### Example 2: plan:verify

**Configuration:**
```
action: "verify"
multiSelect: true
showBulkOptions: true
groupBy: "phase"
showPriority: false
showCounts: false
dividerStyle: "simple"
limitPerGroup: 0
```

**Output:**
```
Select task(s) to verify:

Quick Select:
☐ All incomplete tasks
☐ All tasks in Phase 0
☐ All tasks in Phase 1

Phase 0: Test Directory Restructure
☐ 0.1 Move e2e/ → tests/e2e/
☐ 0.2 Move fixtures to tests/fixtures/
...

Phase 1: Critical Unit Tests
☐ 1.1 websocket-connection.test.ts
☐ 1.2 preferences-store.test.ts
...
```

### Example 3: plan:batch

**Configuration:**
```
action: "select for batch execution"
multiSelect: true
showBulkOptions: true
groupBy: "phase"
showPriority: true
showCounts: true
dividerStyle: "fancy"
limitPerGroup: 0
```

### Example 4: Simple Single-Select

**Configuration:**
```
action: "review"
multiSelect: false
showBulkOptions: false
groupBy: "none"
showPriority: false
showCounts: false
dividerStyle: "simple"
limitPerGroup: 0
```

**Output:**
```
Select task to review:

○ 0.1 Move e2e/ → tests/e2e/
○ 0.2 Move e2e/fixtures/test-project.ts → tests/fixtures/
○ 0.3 Update playwright.config.ts testDir
○ 1.1 websocket-connection.test.ts
○ 1.2 preferences-store.test.ts
```

### Example 5: Priority-Grouped

**Configuration:**
```
action: "prioritize"
multiSelect: true
showBulkOptions: true
groupBy: "priority"
showPriority: true
showCounts: true
dividerStyle: "simple"
limitPerGroup: 0
```

**Output:**
```
Select task(s) to prioritize:

Quick Select:
☐ All CRITICAL tasks (2 tasks)
☐ All HIGH tasks (4 tasks)
☐ All MEDIUM tasks (3 tasks)

CRITICAL Priority (2 tasks)
☐ 1.1 websocket-connection.test.ts (CRITICAL)
☐ 3.2 security-audit.test.ts (CRITICAL)

HIGH Priority (4 tasks)
☐ 1.2 preferences-store.test.ts (HIGH)
☐ 1.3 api-utils.test.ts (HIGH)
☐ 1.5 advance/route.test.ts (HIGH)
☐ 2.3 integration-suite.test.ts (HIGH)

MEDIUM Priority (3 tasks)
☐ 1.4 phases.test.ts (MEDIUM)
☐ 2.1 mock-claude-cli.ts (MEDIUM)
☐ 4.1 documentation-updates.md (MEDIUM)
```

## Implementation Guidelines

### 1. Task Parsing

When implementing this template, extract tasks from plan files using these patterns:

**Checklist items:**
```markdown
- [ ] 1.1 Task description
```

**Numbered sections:**
```markdown
### 1.1 Task Name
Content...
```

### 2. Phase Detection

Match headers:
```markdown
## Phase N: Title
### Phase N: Title
```

### 3. Priority Detection

Look for markers in task descriptions:
```
(CRITICAL)
(HIGH)
(MEDIUM)
(LOW)
```

### 4. Task ID Format

Support these ID patterns:
- `0.1` - Phase 0, Task 1
- `1.2` - Phase 1, Task 2
- `N.M` - Phase N, Task M

### 5. Limit Handling

When `limitPerGroup > 0` and tasks exceed limit:
```
Phase 1: Critical Unit Tests (12 tasks)
☐ 1.1 websocket-connection.test.ts
☐ 1.2 preferences-store.test.ts
☐ 1.3 api-utils.test.ts
☐ 1.4 phases.test.ts
☐ 1.5 advance/route.test.ts
☐ 1.6 create/route.test.ts
☐ 1.7 start/route.test.ts
  ... and 5 more tasks (select phase to see all)
```

## AskUserQuestion Integration

Use these settings when calling AskUserQuestion:

```typescript
// Multi-select mode
{
  multiSelect: true,
  options: [
    // Bulk options first (if showBulkOptions)
    "All incomplete tasks (12 tasks)",
    "All tasks in Phase 0 (5 tasks)",
    // Individual tasks
    "0.1 Move e2e/ → tests/e2e/",
    "0.2 Move fixtures to tests/fixtures/",
    ...
  ]
}

// Single-select mode
{
  multiSelect: false,
  options: [
    "0.1 Move e2e/ → tests/e2e/",
    "0.2 Move fixtures to tests/fixtures/",
    ...
  ]
}
```

## Checkbox Symbols

- Multi-select: `☐` (empty) / `☑` (selected)
- Single-select: `○` (empty) / `●` (selected)

## Best Practices

1. **Keep task descriptions concise** - One line per task
2. **Use consistent task IDs** - Phase.TaskNumber format
3. **Group logically** - By phase for sequential work, by priority for triage
4. **Show counts** - Helps users understand scope
5. **Limit large lists** - Use limitPerGroup to avoid overwhelming users
6. **Provide bulk options** - Speeds up selection for common patterns
7. **Visual hierarchy** - Use dividers to separate sections clearly

## Error Handling

**No tasks available:**
```
No incomplete tasks found in the active plan.

All tasks are complete!
```

**Empty phase:**
```
Phase 1: Critical Unit Tests (0 tasks)
  No incomplete tasks in this phase.
```
