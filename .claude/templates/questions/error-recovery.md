# Error Recovery Template

A reusable template for presenting recovery options when errors occur during command execution.

## Template Variables

- `{{errorType}}` - Error classification (task_failed, dependency_failed, timeout, parse_error, validation_error, file_not_found, permission_error, crash, partial)
- `{{failedItem}}` - Name or description of what failed
- `{{errorMessage}}` - The actual error message or description
- `{{errorDetails}}` - Optional additional context (stack trace, partial output, etc.)
- `{{affectedItems}}` - Array of dependent items that will be impacted
- `{{recoveryOptions}}` - Array of recovery option objects
- `{{attemptNumber}}` - Current retry attempt (optional, for retry scenarios)
- `{{maxAttempts}}` - Maximum retry attempts allowed (optional)

## Recovery Option Structure

```typescript
interface RecoveryOption {
  type: "retry" | "skip" | "abort" | "fix" | "continue" | "retry_modified" | "accept_partial" | "resume";
  label: string;           // Display text for the option
  description?: string;    // Optional explanation of what this option does
}
```

## Template Variants

### Basic Error Recovery

```
✗ {{failedItem}} - FAILED
  Error: {{errorMessage}}

Options:
{{#each recoveryOptions}}
○ {{label}}
{{/each}}
```

**Example:**
```
✗ 1.2 preferences-store.test.ts - FAILED
  Error: Test file created but 3 tests failing

Options:
○ Continue with remaining tasks
○ Pause and fix this task
○ Abort batch execution
```

### Detailed Error Recovery

```
✗ {{failedItem}} - FAILED
  Error Type: {{errorType}}
  Error: {{errorMessage}}

{{#if errorDetails}}
Details:
{{errorDetails}}
{{/if}}

{{#if affectedItems}}
Affected dependent items:
{{#each affectedItems}}
  ⊘ {{this}} - SKIPPED (depends on {{../failedItem}})
{{/each}}
{{/if}}

Options:
{{#each recoveryOptions}}
○ {{label}}{{#if description}} - {{description}}{{/if}}
{{/each}}
```

**Example:**
```
✗ 2.1 mock-claude-cli.ts - FAILED
  Error Type: file_not_found
  Error: Could not find target file 'src/legacy.ts'

Details:
Referenced file does not exist. Check if file was moved or renamed.

Affected dependent items:
  ⊘ 2.2 orchestrator.integration.test.ts - SKIPPED (depends on 2.1)

Options:
○ Continue with remaining tasks - Skip 2.1 and 2.2, proceed to next phase
○ Retry with different parameters
○ Pause and fix this task manually
○ Abort batch execution
```

### Retry-Specific Recovery

```
✗ {{failedItem}} - FAILED (Attempt {{attemptNumber}}/{{maxAttempts}})
  Error: {{errorMessage}}

{{#if errorDetails}}
Details:
{{errorDetails}}
{{/if}}

Options:
{{#each recoveryOptions}}
○ {{label}}
{{/each}}

{{#if (gte attemptNumber maxAttempts)}}
⚠ Maximum retry attempts reached. Consider fixing manually.
{{/if}}
```

**Example:**
```
✗ identify-code-smells.md - FAILED (Attempt 2/2)
  Error: Agent exceeded 10 minute timeout

Details:
Partial output: Coverage scan started, found 15 files...

Options:
○ Continue with remaining prompts (skip this one)
○ Retry with extended timeout (10m → 20m)
○ Pause and investigate
○ Abort batch execution

⚠ Maximum retry attempts reached. Consider fixing manually.
```

### Dependency Failure Recovery

```
✗ {{failedItem}} - FAILED
  Error: {{errorMessage}}

Impact Assessment:
{{#if affectedItems}}
The following items depend on this and will be affected:
{{#each affectedItems}}
  ⊘ {{this}} - SKIPPED
{{/each}}

Total items impacted: {{affectedItems.length}}
{{else}}
No dependent items. This failure is isolated.
{{/if}}

Options:
{{#each recoveryOptions}}
○ {{label}}
{{/each}}
```

**Example:**
```
✗ 0.1 Move e2e/ → tests/e2e/ - FAILED
  Error: Permission denied when moving directory

Impact Assessment:
The following items depend on this and will be affected:
  ⊘ 0.2 Move fixtures to tests/fixtures/ - SKIPPED
  ⊘ 0.3 Update playwright.config.ts - SKIPPED
  ⊘ 0.4 Update vitest.config.ts - SKIPPED

Total items impacted: 3

Options:
○ Fix permissions and retry
○ Skip this phase entirely
○ Abort batch execution
```

### Partial Completion Recovery

```
✗ {{failedItem}} - PARTIAL COMPLETION
  Error: {{errorMessage}}

What was completed:
{{errorDetails}}

Options:
{{#each recoveryOptions}}
○ {{label}}
{{/each}}
```

**Example:**
```
✗ generate-unit-tests.md - PARTIAL COMPLETION
  Error: Agent completed 8/12 tests before timeout

What was completed:
- ✓ websocket-connection tests (4 tests)
- ✓ preferences-store tests (4 tests)
- ✗ api-validation tests (not started)
- ✗ orchestrator tests (not started)

Options:
○ Accept partial results (mark as done)
○ Continue from checkpoint (resume remaining 4 tests)
○ Retry entire prompt from scratch
○ Skip this prompt
```

## Status Symbols

Use these symbols consistently across error displays:

- `✓` - Completed successfully
- `✗` - Failed
- `⊘` - Skipped (due to failure or dependency)
- `◯` - Pending (not started)
- `⟳` - In progress
- `⚠` - Warning or attention needed

## Error Type Classification

| Error Type | Description | Common Recovery |
|------------|-------------|-----------------|
| `task_failed` | General task execution failure | Retry, Skip, Fix |
| `dependency_failed` | Required dependency is missing or failed | Fix dependency first |
| `timeout` | Operation exceeded time limit | Retry with longer timeout |
| `parse_error` | Failed to parse input/output | Fix input, Retry |
| `validation_error` | Input validation failed | Fix input |
| `file_not_found` | Required file missing | Create file, Update path |
| `permission_error` | Insufficient permissions | Fix permissions |
| `crash` | Process crashed or threw exception | Retry, Investigate |
| `partial` | Partially completed before failure | Accept partial, Resume |

## Standard Recovery Options

### Core Options

| Type | Label | When to Use |
|------|-------|-------------|
| `retry` | "Retry this [item]" | Transient failures, timeouts, network issues |
| `skip` | "Skip and continue" | Non-critical failure, can proceed without |
| `abort` | "Abort execution" | Critical failure, or user wants to stop |
| `fix` | "Pause and fix manually" | User intervention needed |
| `continue` | "Continue with remaining" | Can safely proceed despite failure |

### Advanced Options

| Type | Label | When to Use |
|------|-------|-------------|
| `retry_modified` | "Retry with different parameters" | Parameters can be adjusted |
| `accept_partial` | "Accept partial results" | Partial completion is valuable |
| `resume` | "Continue from checkpoint" | Operation supports resumption |

## Default Options by Error Type

### task_failed
```javascript
[
  { type: 'continue', label: 'Continue with remaining tasks' },
  { type: 'retry', label: 'Retry this task' },
  { type: 'fix', label: 'Pause and fix this task manually' },
  { type: 'abort', label: 'Abort batch execution' }
]
```

### timeout
```javascript
[
  { type: 'retry_modified', label: 'Retry with extended timeout' },
  { type: 'skip', label: 'Skip this item' },
  { type: 'abort', label: 'Abort execution' }
]
```

### dependency_failed
```javascript
[
  { type: 'fix', label: 'Fix dependency first' },
  { type: 'skip', label: 'Skip all dependent items' },
  { type: 'abort', label: 'Abort execution' }
]
```

### partial
```javascript
[
  { type: 'accept_partial', label: 'Accept partial results' },
  { type: 'resume', label: 'Continue from checkpoint' },
  { type: 'retry', label: 'Retry from scratch' },
  { type: 'skip', label: 'Skip this item' }
]
```

## Implementation Notes

1. **Present options as radio buttons** using `○` symbol
2. **Highlight recommended option** if applicable: `○ Continue with remaining tasks (recommended)`
3. **Show error context before options** to help user decide
4. **Track retry attempts** to prevent infinite loops
5. **Isolate failures** - one failure shouldn't cascade unless dependencies exist
6. **Preserve completed work** - mark successful tasks as done immediately
7. **Clear error messages** - avoid technical jargon when possible
8. **Actionable guidance** - each option should clearly state what happens next

## Integration Example

```javascript
function handleTaskFailure(task, error) {
  const affectedItems = getAffectedDependencies(task.id);
  const isRetryable = error.type !== 'validation_error';
  const attemptNumber = task.retryCount + 1;

  const recoveryOptions = [
    { type: 'continue', label: 'Continue with remaining tasks' },
    ...(isRetryable ? [{ type: 'retry', label: 'Retry this task' }] : []),
    { type: 'fix', label: 'Pause and fix this task manually' },
    { type: 'abort', label: 'Abort batch execution' }
  ];

  const prompt = renderTemplate('error-recovery.md', {
    errorType: error.type,
    failedItem: task.name,
    errorMessage: error.message,
    errorDetails: error.details,
    affectedItems: affectedItems,
    recoveryOptions: recoveryOptions,
    attemptNumber: attemptNumber,
    maxAttempts: 2
  });

  const decision = await askUserQuestion(prompt);
  return handleRecoveryDecision(decision, task);
}
```

## See Also

- `.claude/commands/plan/batch.md` - Batch task execution with error handling
- `.claude/commands/prompt/batch.md` - Batch prompt execution with retry logic
- `.claude/templates/questions/next-steps.md` - Post-completion options
