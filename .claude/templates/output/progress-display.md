# Progress Display Template

A reusable template for showing real-time progress during batch operations.

## Template Variables

- `{{title}}` - Progress section title
- `{{current}}` - Current item number
- `{{total}}` - Total item count
- `{{percentage}}` - Completion percentage (0-100)
- `{{elapsed}}` - Elapsed time (e.g., "2m 34s")
- `{{remaining}}` - Estimated remaining time
- `{{current_task}}` - Current task description
- `{{items}}` - Array of progress items

## Item Structure

```typescript
interface ProgressItem {
  id: string;              // Task ID (e.g., "1.1", "0.3")
  name: string;            // Task name/description
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  duration?: string;       // Completion time (e.g., "12s")
  message?: string;        // Additional status message
}
```

## Template Formats

### Simple Progress Line

```
⟳ Task {{current}}/{{total}}: {{current_task}}...
```

Example:
```
⟳ Task 2/5: Implementing feature X...
```

### Progress with Percentage

```
⟳ Progress: {{current}}/{{total}} ({{percentage}}%) - {{current_task}}
```

Example:
```
⟳ Progress: 3/10 (30%) - Creating unit tests
```

### Progress with Time

```
⟳ {{current}}/{{total}} | Elapsed: {{elapsed}} | Est. remaining: {{remaining}}
```

Example:
```
⟳ 4/8 | Elapsed: 2m 15s | Est. remaining: 2m 30s
```

### Progress Bar

```
[████████░░░░░░░░░░░░] {{percentage}}% ({{current}}/{{total}})
```

Example:
```
[████████░░░░░░░░░░░░] 40% (4/10)
```

### Full Progress Display

```
═══ {{title}} ═══

{{#each items}}
{{#if (eq status "completed")}}  ✓ {{id}} {{name}} ({{duration}})
{{else if (eq status "in_progress")}}  ⟳ {{id}} {{name}} (in progress...)
{{else if (eq status "failed")}}  ✗ {{id}} {{name}} - FAILED
{{else if (eq status "skipped")}}  ⊘ {{id}} {{name}} - skipped
{{else}}  ◯ {{id}} {{name}}
{{/if}}
{{/each}}

Completed: {{current}}/{{total}} ({{percentage}}%) • Elapsed: {{elapsed}}{{#if remaining}} • Est. remaining: {{remaining}}{{/if}}
```

## Usage Examples

### Example 1: Batch Execution Started

```
═══ Batch Execution Started ═══

Phase 0: Test Directory Restructure
  ◯ 0.3 Update playwright.config.ts
  ◯ 0.4 Update vitest.config.ts

Phase 1: Critical Unit Tests
  ◯ 1.1 websocket-connection.test.ts
  ◯ 1.2 preferences-store.test.ts
  ◯ 1.3 api-utils.test.ts
```

### Example 2: In-Progress Update

```
Phase 0: Test Directory Restructure
  ✓ 0.3 Update playwright.config.ts (12s)
  ⟳ 0.4 Update vitest.config.ts (in progress...)

Phase 1: Critical Unit Tests
  ◯ 1.1 websocket-connection.test.ts
  ◯ 1.2 preferences-store.test.ts
  ◯ 1.3 api-utils.test.ts

Completed: 1/5 (20%) • Elapsed: 14s
```

### Example 3: Parallel Execution

```
═══ Parallel Execution Group ═══

Launching 3 agents:
  ⟳ Agent 1: 1.1 websocket-connection.test.ts
  ⟳ Agent 2: 1.2 preferences-store.test.ts
  ⟳ Agent 3: 1.3 api-utils.test.ts

Waiting for all agents to complete...
```

### Example 4: Agent Progress Updates

```
Parallel Group Progress:
  ✓ Agent 1: 1.1 websocket-connection.test.ts (45s)
  ⟳ Agent 2: 1.2 preferences-store.test.ts (32s elapsed...)
  ✓ Agent 3: 1.3 api-utils.test.ts (28s)

Completed: 2/3 • Elapsed: 47s
```

### Example 5: With Failures

```
Phase 1: Critical Unit Tests
  ✓ 1.1 websocket-connection.test.ts (45s)
  ✗ 1.2 preferences-store.test.ts - FAILED
      Error: Test file created but 3 tests failing
  ⊘ 1.3 api-utils.test.ts - skipped (dependency)

Completed: 1/3 • Failed: 1 • Skipped: 1
```

### Example 6: Compact Progress

```
⟳ Researching 5 tasks...
  ✓ Task 1.1 - websocket-connection tests (850ms)
  ✓ Task 1.2 - preferences-store tests (720ms)
  ⟳ Task 1.3 - api-utils tests...
  ◯ Task 2.1 - pending
  ◯ Task 2.2 - pending

Completed: 2/5 (40%) • Elapsed: 2.3s • Est. remaining: 3.1s
```

## Helper Functions

```typescript
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}m ${secs}s`;
}

function createProgressBar(percentage: number, width: number = 20): string {
  const filled = Math.round(width * (percentage / 100));
  const empty = width - filled;
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
}

function getStatusSymbol(status: string): string {
  const symbols: Record<string, string> = {
    pending: '◯',
    in_progress: '⟳',
    completed: '✓',
    failed: '✗',
    skipped: '⊘'
  };
  return symbols[status] || '◯';
}

function calculateETA(elapsed: number, current: number, total: number): string {
  if (current === 0) return 'calculating...';
  const perItem = elapsed / current;
  const remaining = perItem * (total - current);
  return formatDuration(remaining);
}
```

## Update Patterns

### Sequential Updates

Update the display after each task completes:

```
[Before]
  ⟳ 1.1 websocket-connection.test.ts (in progress...)
  ◯ 1.2 preferences-store.test.ts

[After]
  ✓ 1.1 websocket-connection.test.ts (45s)
  ⟳ 1.2 preferences-store.test.ts (in progress...)
```

### Parallel Updates

Update when any agent in the group completes:

```
[Start]
  ⟳ Agent 1: 1.1 (running)
  ⟳ Agent 2: 1.2 (running)
  ⟳ Agent 3: 1.3 (running)

[Agent 3 completes first]
  ⟳ Agent 1: 1.1 (running)
  ⟳ Agent 2: 1.2 (running)
  ✓ Agent 3: 1.3 (28s)

[All complete]
  ✓ Agent 1: 1.1 (45s)
  ✓ Agent 2: 1.2 (38s)
  ✓ Agent 3: 1.3 (28s)
```

## Best Practices

1. **Update frequently** - Show progress after each significant step
2. **Show elapsed time** - Helps users understand duration
3. **Include ETA** - Reduces uncertainty for long operations
4. **Mark failures immediately** - Don't wait until the end
5. **Group by phase** - Maintains context for batch operations
6. **Use consistent symbols** - Reference status-symbols.md
7. **Show completion counts** - "2/5" is clearer than just percentage

## See Also

- `.claude/templates/shared/status-symbols.md` - Status symbols
- `.claude/templates/output/execution-summary.md` - Final summary
- `.claude/templates/questions/execution-confirm.md` - Pre-execution preview
