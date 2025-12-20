# Error Report Template

A standardized template for displaying errors with context, stack traces, and recovery options.

## Template Variables

- `{{error_type}}` - Error category (e.g., "TASK_FAILED", "DEPENDENCY_ERROR")
- `{{title}}` - Error title/summary
- `{{message}}` - Error message
- `{{context}}` - Context object with relevant details
- `{{stack}}` - Stack trace (optional)
- `{{suggestions}}` - Array of suggested fixes
- `{{options}}` - Recovery options for user

## Error Context Structure

```typescript
interface ErrorContext {
  task_id?: string;           // Task that failed
  task_name?: string;         // Task description
  file?: string;              // File involved
  line?: number;              // Line number
  command?: string;           // Command that failed
  exit_code?: number;         // Process exit code
  duration?: string;          // Time before failure
  dependencies?: string[];    // Related dependencies
}

interface RecoveryOption {
  label: string;              // Option text
  description?: string;       // Additional detail
  action: string;             // Action to take
}
```

## Template Formats

### Standard Error Box

```
╔═══════════════════════════════════════════════════════╗
║                     {{error_type}}                    ║
╠═══════════════════════════════════════════════════════╣
║  {{message}}                                          ║
╚═══════════════════════════════════════════════════════╝
```

### Error with Context

```
✗ {{title}}

Error: {{message}}

Context:
  • Task: {{context.task_id}} {{context.task_name}}
  • File: {{context.file}}{{#if context.line}}:{{context.line}}{{/if}}
  • Duration: {{context.duration}}

{{#if suggestions}}
Suggested fixes:
{{#each suggestions}}
  → {{this}}
{{/each}}
{{/if}}
```

### Error with Stack Trace

```
✗ {{title}}

Error: {{message}}

Stack trace:
{{stack}}

{{#if suggestions}}
Suggested fixes:
{{#each suggestions}}
  → {{this}}
{{/each}}
{{/if}}
```

### Error with Recovery Options

```
✗ {{title}}

Error: {{message}}

Options:
{{#each options}}
○ {{label}}{{#if description}} - {{description}}{{/if}}
{{/each}}
```

## Usage Examples

### Example 1: Task Failure

```
✗ Task 1.2 Failed

Error: Test file created but 3 tests failing

Context:
  • Task: 1.2 preferences-store.test.ts
  • File: tests/unit/stores/preferences-store.test.ts
  • Duration: 1m 12s

Suggested fixes:
  → Check test assertions match expected behavior
  → Verify mock setup is correct
  → Run tests locally: npm test -- preferences-store

Options:
○ Continue with remaining tasks
○ Pause and fix this task
○ Abort batch execution
```

### Example 2: Dependency Failure

```
✗ Dependency Failed

Error: Task 2.2 cannot run because task 2.1 failed

Context:
  • Blocked task: 2.2 orchestrator.integration.test.ts
  • Failed dependency: 2.1 mock-claude-cli.ts
  • Dependency error: Module export not found

Affected tasks:
  ⊘ 2.2 orchestrator.integration.test.ts - will be skipped
  ⊘ 2.3 e2e-claude-flow.test.ts - will be skipped

Options:
○ Continue (skip affected tasks)
○ Retry failed dependency
○ Abort batch execution
```

### Example 3: Command Error

```
✗ Command Failed

Error: npm test exited with code 1

Context:
  • Command: npm test -- websocket-connection
  • Exit code: 1
  • Duration: 45s

Output:
  FAIL  tests/unit/lib/websocket-connection.test.ts
    ✗ should connect to WebSocket server (45ms)
      Expected: "connected"
      Received: "error"

Suggested fixes:
  → Verify WebSocket server is accessible
  → Check test environment configuration
  → Review mock WebSocket setup
```

### Example 4: File Not Found

```
✗ File Not Found

Error: Expected file does not exist

Context:
  • Expected: src/lib/websocket-connection.ts
  • Task: 1.1 Create websocket-connection.ts

Suggested fixes:
  → Check if file was created in a different location
  → Verify the path in the task description
  → Create the file manually before retrying

Options:
○ Search for file in codebase
○ Create file now
○ Skip this task
```

### Example 5: Timeout Error

```
✗ Operation Timed Out

Error: Agent exceeded maximum execution time (60s)

Context:
  • Task: 1.3 api-utils.test.ts
  • Agent: verify-agent
  • Timeout: 60s
  • Last activity: Reading src/lib/api-utils.ts

Suggested fixes:
  → Increase timeout limit
  → Break task into smaller subtasks
  → Verify file is not excessively large

Options:
○ Retry with extended timeout (120s)
○ Skip this task
○ Abort batch execution
```

### Example 6: Validation Error

```
✗ Schema Validation Failed

Error: Agent output does not match expected schema

Context:
  • Agent: research-agent
  • Task: 1.2 Analyze preferences-store

Expected format:
  {
    "task_id": "string",
    "status": "DONE" | "NEEDED",
    "confidence": "number",
    "evidence": "string[]"
  }

Received:
  {
    "result": "done",
    "notes": "File exists"
  }

Suggested fixes:
  → Check agent prompt template
  → Verify schema definition
  → Retry with explicit output format
```

## Error Severity Levels

| Level | Symbol | Usage |
|-------|--------|-------|
| Error | `✗` | Task/operation failed |
| Warning | `⚠` | Non-fatal issue |
| Info | `ℹ` | Informational note |
| Blocked | `⊘` | Blocked by dependency |

## Helper Functions

```typescript
function formatError(error: Error, context?: ErrorContext): string {
  let output = `✗ ${error.name}\n\nError: ${error.message}`;

  if (context) {
    output += '\n\nContext:';
    if (context.task_id) output += `\n  • Task: ${context.task_id}`;
    if (context.file) output += `\n  • File: ${context.file}`;
    if (context.duration) output += `\n  • Duration: ${context.duration}`;
  }

  return output;
}

function generateSuggestions(errorType: string): string[] {
  const suggestionMap: Record<string, string[]> = {
    MODULE_NOT_FOUND: [
      'Check import path is correct',
      'Verify module is installed: npm install',
      'Check tsconfig.json path aliases'
    ],
    TEST_FAILED: [
      'Run test locally to debug',
      'Check test assertions',
      'Verify mock configuration'
    ],
    TIMEOUT: [
      'Increase timeout limit',
      'Break into smaller tasks',
      'Check for infinite loops'
    ]
  };
  return suggestionMap[errorType] || ['Check logs for details'];
}
```

## Best Practices

1. **Clear error type** - Categorize errors for quick understanding
2. **Actionable message** - Explain what went wrong specifically
3. **Provide context** - Include task, file, timing information
4. **Suggest fixes** - Give concrete next steps
5. **Offer options** - Let user choose how to proceed
6. **Show affected items** - List dependent tasks that will be impacted
7. **Include output** - Show relevant command output if available
8. **Truncate long traces** - Show first/last lines with `... (N lines hidden)`

## See Also

- `.claude/templates/shared/status-symbols.md` - Status symbols
- `.claude/templates/questions/error-recovery.md` - Recovery options
- `.claude/templates/output/execution-summary.md` - Summary template
