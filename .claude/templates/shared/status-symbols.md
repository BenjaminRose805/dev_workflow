# Status Symbols Template

A standardized set of symbols for consistent status indication across all commands.

## Template Variables

- `{{status}}` - The status to display (pending, in_progress, completed, failed, skipped, warning)

## Standard Status Symbols

| Status | Symbol | Unicode | Description |
|--------|--------|---------|-------------|
| Pending | `◯` | U+25EF | Task not yet started |
| In Progress | `⟳` | U+27F3 | Currently working on |
| Completed | `✓` | U+2713 | Task finished successfully |
| Failed | `✗` | U+2717 | Task failed with error |
| Skipped | `⊘` | U+2298 | Task skipped (dependency failed) |
| Warning | `⚠` | U+26A0 | Completed with warnings |

## Selection Symbols

| Type | Empty | Selected | Unicode |
|------|-------|----------|---------|
| Checkbox (multi) | `☐` | `☑` | U+2610 / U+2611 |
| Radio (single) | `○` | `●` | U+25CB / U+25CF |

## Tree/Structure Symbols

| Symbol | Unicode | Usage |
|--------|---------|-------|
| `│` | U+2502 | Vertical line |
| `├──` | U+251C + U+2500 | Branch (non-last item) |
| `└──` | U+2514 + U+2500 | End branch (last item) |
| `├─►` | U+251C + U+25BA | Branch with arrow |
| `└─►` | U+2514 + U+25BA | End branch with arrow |
| `├─┬─►` | Complex | Parallel branch |
| `↓` | U+2193 | Transition/flow indicator |

## Usage Examples

### Example 1: Task Progress Display

```
Phase 1: Critical Unit Tests
  ✓ 1.1 websocket-connection.test.ts (12s)
  ✓ 1.2 preferences-store.test.ts (8s)
  ⟳ 1.3 api-utils.test.ts (in progress...)
  ◯ 1.4 phases.test.ts
  ◯ 1.5 advance/route.test.ts
```

### Example 2: Batch Execution Results

```
Results:
  ✓ Completed: 6 tasks
  ✗ Failed: 1 task
  ⊘ Skipped: 2 tasks
  ⚠ Warnings: 1 task
```

### Example 3: Task Selection (Multi-Select)

```
Select task(s) to implement:

☐ All incomplete tasks (12 tasks)
☐ All Phase 0 tasks (5 tasks)

Phase 0:
☐ 0.1 Move e2e/ → tests/e2e/
☑ 0.2 Update config files
☐ 0.3 Delete empty directory
```

### Example 4: Task Selection (Single-Select)

```
Select task to review:

○ 0.1 Move e2e/ → tests/e2e/
● 0.2 Update config files (selected)
○ 0.3 Delete empty directory
```

### Example 5: Execution Flow Tree

```
Phase 0 (Sequential):
│
├─► 0.1 Update playwright.config.ts
│
└─► 0.2 Update vitest.config.ts

        ↓ (Phase 0 complete)

Phase 1 (Parallel):
│
├─┬─► 1.1 websocket-connection.test.ts
│ │
├─┬─► 1.2 preferences-store.test.ts
│ │
└─┬─► 1.3 api-utils.test.ts
```

## Symbol Mapping Function

```typescript
function getStatusSymbol(status: string): string {
  const symbols: Record<string, string> = {
    pending: '◯',
    in_progress: '⟳',
    completed: '✓',
    failed: '✗',
    skipped: '⊘',
    warning: '⚠'
  };
  return symbols[status] || '◯';
}

function getSelectionSymbol(type: 'checkbox' | 'radio', selected: boolean): string {
  if (type === 'checkbox') {
    return selected ? '☑' : '☐';
  }
  return selected ? '●' : '○';
}
```

## Color Recommendations

When color is available (terminal with ANSI support):

| Status | Color | ANSI Code |
|--------|-------|-----------|
| Pending | Gray | `\x1b[90m` |
| In Progress | Yellow | `\x1b[33m` |
| Completed | Green | `\x1b[32m` |
| Failed | Red | `\x1b[31m` |
| Skipped | Gray | `\x1b[90m` |
| Warning | Yellow | `\x1b[33m` |

## ASCII Fallbacks

For environments that don't support Unicode:

| Status | Unicode | ASCII Fallback |
|--------|---------|----------------|
| Pending | `◯` | `[ ]` |
| In Progress | `⟳` | `[~]` |
| Completed | `✓` | `[x]` |
| Failed | `✗` | `[!]` |
| Skipped | `⊘` | `[-]` |
| Warning | `⚠` | `[?]` |

## Best Practices

1. **Consistency** - Always use the same symbol for the same status across all commands
2. **Alignment** - Pad symbols to ensure visual alignment in lists
3. **Context** - Include timing or additional info after the symbol when relevant
4. **Color** - Add color when available to improve scanability
5. **Fallback** - Support ASCII fallbacks for limited terminals

## See Also

- `.claude/templates/shared/box-styles.md` - Box and border styles
- `.claude/templates/output/progress-display.md` - Progress display template
- `.claude/templates/output/execution-summary.md` - Summary template
