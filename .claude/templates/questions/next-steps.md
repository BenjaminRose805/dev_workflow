# Next Steps Template

A reusable template for presenting contextual follow-up options after command execution.

## Template Variables

- `{{context}}` - The type of action completed (e.g., "implementation", "verification", "batch execution")
- `{{context_title}}` - Display title (e.g., "Implementation Complete!")
- `{{itemType}}` - Type of items (e.g., "tasks", "prompts", "operations")
- `{{completedCount}}` - Number of items completed
- `{{totalCount}}` - Total number of items in the operation
- `{{completedItems}}` - Array of completed item objects
- `{{remainingCount}}` - Number of items remaining in the plan
- `{{suggestedNext}}` - Suggested next action description
- `{{options}}` - Array of contextual option objects

## Item Structure

```typescript
interface CompletedItem {
  id: string;          // Item identifier (e.g., "1.1", "0.3")
  description: string; // Item description
  details?: string;    // Optional details (e.g., "Created tests/unit/lib/websocket-connection.test.ts")
  duration?: string;   // Optional duration (e.g., "12s", "2m 34s")
}

interface NextStepOption {
  label: string;       // Display text
  command?: string;    // Optional command to execute (e.g., "/plan:implement")
  params?: object;     // Optional parameters for the command
}
```

## Template Format

### Standard Completion

```
{{context_title}}

{{#each completedItems}}
✓ {{id}} {{description}}{{#if details}} - {{details}}{{/if}}{{#if duration}} ({{duration}}){{/if}}
{{/each}}

{{completedCount}}/{{totalCount}} {{itemType}} completed successfully.

{{#if remainingCount}}
Remaining in plan: {{remainingCount}} {{itemType}}
{{#if suggestedNext}}
Next suggested: {{suggestedNext}}
{{/if}}
{{/if}}

What would you like to do next?
{{#each options}}
○ {{label}}
{{/each}}
```

## Context Types

### Implementation Context

```
context: "implementation"
context_title: "Implementation Complete!"
itemType: "tasks"
```

### Verification Context

```
context: "verification"
context_title: "Verification Complete!"
itemType: "tasks"
```

### Batch Execution Context

```
context: "batch execution"
context_title: "Batch Execution Complete!"
itemType: "tasks"
```

### Explanation Context

```
context: "explanation"
context_title: "Explanation Complete!"
itemType: "tasks"
```

### Prompt Execution Context

```
context: "prompt execution"
context_title: "Prompt Execution Complete!"
itemType: "prompts"
```

## Usage Examples

### Example 1: After /plan:implement

```
Implementation Complete!

✓ 1.1 websocket-connection.test.ts - Created tests/unit/lib/websocket-connection.test.ts
✓ 1.2 preferences-store.test.ts - Created tests/unit/stores/preferences-store.test.ts
✓ 1.3 api-utils.test.ts - Created tests/unit/lib/api-utils.test.ts

3/3 tasks completed successfully.

Remaining in plan: 15 tasks
Next suggested: Phase 1 has 2 more tasks remaining

What would you like to do next?
○ Implement remaining Phase 1 tasks
○ Run /plan:verify to check status
○ View detailed results
○ Done
```

### Example 2: After /plan:explain

```
Explanation Complete!

✓ 1.1 websocket-connection.test.ts - Explained context and approach
✓ 1.2 preferences-store.test.ts - Explained context and approach

2/2 tasks explained.

What would you like to do next?
○ Implement these tasks
○ Explain more tasks
○ View implementation plan
○ Done
```

### Example 3: After /plan:verify

```
Verification Complete!

Tasks verified: 8
  ✓ Already done: 3 tasks
  ⏳ Still needed: 4 tasks
  🚫 Blocked: 1 task

Remaining in plan: 12 tasks
Next suggested: Mark 3 completed tasks as done

What would you like to do next?
○ Mark completed tasks as done
○ Implement needed tasks
○ Review blocked tasks
○ Done
```

### Example 4: After /plan:batch

```
Batch Execution Complete!

✓ 0.3 Update playwright.config.ts (12s)
✓ 0.4 Update vitest.config.ts (8s)
✓ 1.1 websocket-connection.test.ts (2m 34s)
✓ 1.2 preferences-store.test.ts (1m 12s)
✓ 1.3 api-utils.test.ts (45s)
✓ 2.1 mock-claude-cli.ts (1m 56s)

6/7 tasks completed successfully.

Failed tasks: 1
Remaining in plan: 6 tasks
Next suggested: Review failed task 2.2

What would you like to do next?
○ Review failed tasks
○ Continue batch execution with remaining tasks
○ Run /plan:verify to check status
○ Done
```

### Example 5: After /prompt:run

```
Prompt Execution Complete!

✓ generate-unit-tests.md - Created 15 test cases

1/1 prompts completed successfully.

What would you like to do next?
○ Run another prompt
○ View generated output
○ Done
```

## Contextual Options Guide

### After Implementation

**Default options:**
- Implement remaining tasks in current phase
- Run /plan:verify to check status
- View detailed results
- Done

**If phase complete:**
- Move to next phase
- Run tests on implemented code
- Review all changes
- Done

**If all tasks complete:**
- Run full test suite
- Review project status
- Create pull request
- Done

### After Explanation

**Default options:**
- Implement these tasks (pre-select explained tasks)
- Explain more tasks
- View implementation plan
- Done

### After Verification

**If completed tasks found:**
- Mark completed tasks as done
- Implement needed tasks
- Review blocked tasks
- Done

**If obsolete tasks found:**
- Remove obsolete tasks from plan
- Implement needed tasks
- Done

**If all verified:**
- Implement needed tasks
- View updated plan
- Done

### After Batch Execution

**If failures occurred:**
- Review failed tasks
- Retry failed tasks
- Continue with remaining tasks
- Done

**If all succeeded:**
- Run tests on implemented code
- Continue batch execution with remaining tasks
- Review all changes
- Done

## Status Symbols

- `✓` - Completed successfully
- `✗` - Failed
- `⏳` - Needed / Pending
- `🚫` - Blocked
- `⊘` - Skipped

## Best Practices

1. **Show completion summary first** - Users want to know what was accomplished
2. **Include item details** - File paths, durations help users understand results
3. **Dynamic options** - Generate options based on current state
4. **Command links** - Options can include executable commands
5. **Context awareness** - Tailor suggestions to what just happened
6. **Progressive disclosure** - Show most relevant options first
7. **Escape hatch** - Always include "Done" as final option
8. **Remaining count** - Help users understand what's left

## AskUserQuestion Integration

```typescript
{
  multiSelect: false,
  options: [
    {
      label: "Implement remaining Phase 1 tasks",
      description: "Continue with 2 remaining tasks in Phase 1"
    },
    {
      label: "Run /plan:verify to check status",
      description: "Verify completion status of all tasks"
    },
    {
      label: "View detailed results",
      description: "See full output from each completed task"
    },
    {
      label: "Done",
      description: "Exit without further action"
    }
  ]
}
```

## See Also

- `.claude/commands/plan/implement.md` - Task implementation
- `.claude/commands/plan/verify.md` - Task verification
- `.claude/commands/plan/batch.md` - Batch execution
- `.claude/templates/questions/error-recovery.md` - Error handling
