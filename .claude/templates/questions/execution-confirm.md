# Execution Confirmation Template

A reusable template for showing execution previews and getting user confirmation before batch operations.

## Template Variables

- `{{title}}` - Header title (e.g., "EXECUTION PLAN", "BATCH PREVIEW")
- `{{strategy}}` - Execution strategy description (e.g., "Sequential", "Parallel", "Agent pooling")
- `{{agent_pool_size}}` - Number of parallel agents (optional)
- `{{total_items}}` - Total number of items selected
- `{{execution_flow_title}}` - Custom title for execution flow section
- `{{groups}}` - Array of execution group objects
- `{{summary}}` - Summary statistics object
- `{{options}}` - Array of option objects for user selection

## Group Structure

```typescript
interface ExecutionGroup {
  name?: string;           // Group name (e.g., "Phase 0", "Parallel Group 1")
  description?: string;    // Strategy description (e.g., "Sequential - file operations")
  parallel: boolean;       // Whether items run in parallel
  phase_separator?: string; // Transition text (e.g., "Phase 0 complete, proceed to Phase 1")
  items: ExecutionItem[];  // Items in this group
}

interface ExecutionItem {
  id: string;              // Item identifier (e.g., "0.3", "Agent 1:")
  name?: string;           // Item name
  description?: string;    // Additional details
}
```

## Summary Structure

```typescript
interface ExecutionSummary {
  total?: string;          // Total count (e.g., "7 tasks")
  phases?: number;         // Number of phases
  parallel?: string;       // Parallel task count (e.g., "3 tasks")
  sequential?: string;     // Sequential task count (e.g., "4 tasks")
  parallel_groups?: number; // Number of parallel execution groups
  time_estimate?: string;  // Estimated time (e.g., "~5 minutes")
  time_saved?: string;     // Speedup percentage (e.g., "47%")
  custom?: string[];       // Custom summary lines
}
```

## Template Format

### Standard Execution Preview

```
═══════════════════════════════════════════════════════
                {{title}}
═══════════════════════════════════════════════════════

{{#if strategy}}Strategy: {{strategy}}{{/if}}
{{#if agent_pool_size}}Agent Pool: {{agent_pool_size}} agents{{/if}}
{{#if total_items}}Items: {{total_items}} selected{{/if}}

{{#each groups}}
{{#if phase_separator}}
        ↓ {{phase_separator}}

{{/if}}
{{#if name}}{{name}}{{#if description}} ({{description}}){{/if}}:{{/if}}
{{#if parallel}}
│
{{#each items}}
├─┬─► {{id}}{{#if name}} {{name}}{{/if}}{{#if description}} - {{description}}{{/if}}
│ │
{{/each}}
│
└── (All {{items.length}} tasks run concurrently)
{{else}}
│
{{#each items}}
{{#if @last}}└{{else}}├{{/if}}─► {{id}}{{#if name}} {{name}}{{/if}}{{#if description}} - {{description}}{{/if}}
{{#unless @last}}│{{/unless}}
{{/each}}
{{/if}}

{{/each}}

═══════════════════════════════════════════════════════
Summary:{{#if summary.total}} {{summary.total}}{{/if}}{{#if summary.phases}} in {{summary.phases}} phases{{/if}}
{{#if summary.parallel}}  • {{summary.parallel}} will run in parallel{{/if}}
{{#if summary.sequential}}  • {{summary.sequential}} will run sequentially{{/if}}
{{#if summary.parallel_groups}}  • Estimated parallel groups: {{summary.parallel_groups}}{{/if}}
{{#if summary.time_estimate}}  • Estimated time: {{summary.time_estimate}}{{/if}}
{{#if summary.time_saved}}  • Estimated speedup: ~{{summary.time_saved}}{{/if}}
{{#each summary.custom}}
  • {{this}}
{{/each}}
═══════════════════════════════════════════════════════

Options:
{{#each options}}
○ {{label}}{{#if description}} - {{description}}{{/if}}
{{/each}}
```

## Usage Examples

### Example 1: Plan Batch Execution

**Configuration:**
```javascript
{
  title: "EXECUTION PLAN",
  groups: [
    {
      name: "Phase 0",
      description: "Sequential - file operations",
      parallel: false,
      items: [
        { id: "0.3", name: "Update playwright.config.ts" },
        { id: "0.4", name: "Update vitest.config.ts" }
      ]
    },
    {
      phase_separator: "(Phase 0 complete, proceed to Phase 1)",
      name: "Phase 1",
      description: "Parallel - independent test files",
      parallel: true,
      items: [
        { id: "1.1", name: "websocket-connection.test.ts" },
        { id: "1.2", name: "preferences-store.test.ts" },
        { id: "1.3", name: "api-utils.test.ts" }
      ]
    },
    {
      phase_separator: "(Phase 1 complete, proceed to Phase 2)",
      name: "Phase 2",
      description: "Sequential - 2.2 depends on 2.1",
      parallel: false,
      items: [
        { id: "2.1", name: "mock-claude-cli.ts" },
        { id: "2.2", name: "orchestrator.integration.test.ts" }
      ]
    }
  ],
  summary: {
    total: "7 tasks",
    phases: 3,
    parallel: "3 tasks",
    sequential: "4 tasks",
    parallel_groups: 5
  },
  options: [
    { label: "Execute this plan" },
    { label: "Modify selection" },
    { label: "Cancel" }
  ]
}
```

**Output:**
```
═══════════════════════════════════════════════════════
                EXECUTION PLAN
═══════════════════════════════════════════════════════

Phase 0 (Sequential - file operations):
│
├─► 0.3 Update playwright.config.ts
│
└─► 0.4 Update vitest.config.ts

        ↓ (Phase 0 complete, proceed to Phase 1)

Phase 1 (Parallel - independent test files):
│
├─┬─► 1.1 websocket-connection.test.ts
│ │
├─┬─► 1.2 preferences-store.test.ts
│ │
├─┬─► 1.3 api-utils.test.ts
│
└── (All 3 tasks run concurrently)

        ↓ (Phase 1 complete, proceed to Phase 2)

Phase 2 (Sequential - 2.2 depends on 2.1):
│
├─► 2.1 mock-claude-cli.ts
│
└─► 2.2 orchestrator.integration.test.ts

═══════════════════════════════════════════════════════
Summary: 7 tasks in 3 phases
  • 3 tasks will run in parallel
  • 4 tasks will run sequentially
  • Estimated parallel groups: 5
═══════════════════════════════════════════════════════

Options:
○ Execute this plan
○ Modify selection
○ Cancel
```

### Example 2: Prompt Batch with Agent Pooling

**Configuration:**
```javascript
{
  title: "EXECUTION PLAN",
  strategy: "Agent pooling",
  agent_pool_size: 3,
  total_items: 5,
  execution_flow_title: "Execution Flow:",
  groups: [
    {
      parallel: false,
      items: [
        { id: "Agent 1:", name: "generate-unit-tests.md" },
        { id: "Agent 2:", name: "generate-integration-tests.md" },
        { id: "Agent 3:", name: "identify-code-smells.md" },
        { id: "(queued):", name: "suggest-improvements.md" },
        { id: "(queued):", name: "analyze-coverage.md" }
      ]
    }
  ],
  summary: {
    custom: [
      "5 prompts queued",
      "3 agents in parallel",
      "Estimated speedup: ~2.5x"
    ]
  },
  options: [
    { label: "Execute" },
    { label: "Modify" },
    { label: "Cancel" }
  ]
}
```

**Output:**
```
═══════════════════════════════════════════════════════
                EXECUTION PLAN
═══════════════════════════════════════════════════════

Strategy: Agent pooling
Agent Pool: 3 agents
Items: 5 selected

Execution Flow:
│
├─► Agent 1: generate-unit-tests.md
│
├─► Agent 2: generate-integration-tests.md
│
├─► Agent 3: identify-code-smells.md
│
├─► (queued): suggest-improvements.md
│
└─► (queued): analyze-coverage.md

═══════════════════════════════════════════════════════
Summary:
  • 5 prompts queued
  • 3 agents in parallel
  • Estimated speedup: ~2.5x
═══════════════════════════════════════════════════════

Options:
○ Execute
○ Modify
○ Cancel
```

### Example 3: Simple Sequential Preview

**Configuration:**
```javascript
{
  title: "BATCH PREVIEW",
  strategy: "Sequential",
  total_items: 3,
  groups: [
    {
      parallel: false,
      items: [
        { id: "1.", description: "Generate documentation" },
        { id: "2.", description: "Run tests" },
        { id: "3.", description: "Build project" }
      ]
    }
  ],
  summary: {
    total: "3 operations",
    time_estimate: "~5 minutes"
  },
  options: [
    { label: "Execute", description: "Start batch execution" },
    { label: "Cancel", description: "Return to selection" }
  ]
}
```

**Output:**
```
═══════════════════════════════════════════════════════
                BATCH PREVIEW
═══════════════════════════════════════════════════════

Strategy: Sequential
Items: 3 selected

│
├─► 1. Generate documentation
│
├─► 2. Run tests
│
└─► 3. Build project

═══════════════════════════════════════════════════════
Summary: 3 operations
  • Estimated time: ~5 minutes
═══════════════════════════════════════════════════════

Options:
○ Execute - Start batch execution
○ Cancel - Return to selection
```

## Default Options

If no options are provided, use these defaults:

```javascript
options: [
  { label: "Execute this plan" },
  { label: "Modify selection" },
  { label: "Cancel" }
]
```

## Tree Drawing Characters

- `│` - Vertical line
- `├─►` - Branch with arrow (non-last item)
- `└─►` - End branch with arrow (last item)
- `├─┬─►` - Parallel branch indicator
- `↓` - Phase transition indicator
- `═` - Box border character

## Best Practices

1. **Show clear strategy** - Users should understand if items run sequentially or in parallel
2. **Include time estimates** when available
3. **Group by execution order** - Show phases in order they'll execute
4. **Indicate dependencies** - Note when items depend on others
5. **Always offer Cancel** - Users should be able to back out
6. **Show item counts** - Help users understand scope

## See Also

- `.claude/commands/plan/batch.md` - Batch task execution
- `.claude/commands/prompt/batch.md` - Batch prompt execution
- `.claude/templates/questions/task-selection.md` - Task selection template
