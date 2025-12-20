# Box Styles Template

Standardized box and border styles for consistent output formatting across commands.

## Template Variables

- `{{style}}` - Box style: "double", "single", "simple", "minimal"
- `{{width}}` - Box width (default: 55 characters)
- `{{title}}` - Optional centered title
- `{{content}}` - Box content

## Border Characters

### Double Border (═══)

Primary style for major sections and headers.

| Element | Character | Unicode |
|---------|-----------|---------|
| Horizontal | `═` | U+2550 |
| Vertical | `║` | U+2551 |
| Top-left | `╔` | U+2554 |
| Top-right | `╗` | U+2557 |
| Bottom-left | `╚` | U+255A |
| Bottom-right | `╝` | U+255D |
| T-junction (top) | `╦` | U+2566 |
| T-junction (bottom) | `╩` | U+2569 |
| T-junction (left) | `╠` | U+2560 |
| T-junction (right) | `╣` | U+2563 |
| Cross | `╬` | U+256C |

### Single Border (───)

Secondary style for subsections and separators.

| Element | Character | Unicode |
|---------|-----------|---------|
| Horizontal | `─` | U+2500 |
| Vertical | `│` | U+2502 |
| Top-left | `┌` | U+250C |
| Top-right | `┐` | U+2510 |
| Bottom-left | `└` | U+2514 |
| Bottom-right | `┘` | U+2518 |
| T-junction (top) | `┬` | U+252C |
| T-junction (bottom) | `┴` | U+2534 |
| T-junction (left) | `├` | U+251C |
| T-junction (right) | `┤` | U+2524 |
| Cross | `┼` | U+253C |

### Simple Style (---)

ASCII-compatible for maximum compatibility.

| Element | Character |
|---------|-----------|
| Horizontal | `-` |
| Vertical | `|` |
| Corner | `+` |

## Box Templates

### Double Box with Title

```
═══════════════════════════════════════════════════════
                    {{title}}
═══════════════════════════════════════════════════════

{{content}}

═══════════════════════════════════════════════════════
```

### Single Box with Title

```
───────────────────────────────────────────────────────
                    {{title}}
───────────────────────────────────────────────────────

{{content}}

───────────────────────────────────────────────────────
```

### Section Divider (Double)

```
═══ {{title}} ═══
```

### Section Divider (Single)

```
─── {{title}} ───
```

### Simple Divider

```
--- {{title}} ---
```

### Minimal (Just Lines)

```
════════════════════════════════════════════════════════
{{content}}
════════════════════════════════════════════════════════
```

## Usage Examples

### Example 1: Execution Plan Header

```
═══════════════════════════════════════════════════════
                    EXECUTION PLAN
═══════════════════════════════════════════════════════
```

### Example 2: Section Headers in Selection

```
═══ Quick Select ═══
☐ All incomplete tasks (12 tasks)

═══ Phase 0: Test Directory ═══
☐ 0.1 Move e2e/ → tests/e2e/

═══ Phase 1: Unit Tests ═══
☐ 1.1 websocket-connection.test.ts
```

### Example 3: Summary Box

```
═══════════════════════════════════════════════════════
Summary: 7 tasks in 3 phases
  • 3 tasks will run in parallel
  • 4 tasks will run sequentially
  • Estimated parallel groups: 5
═══════════════════════════════════════════════════════
```

### Example 4: Nested Sections

```
═══════════════════════════════════════════════════════
                 BATCH EXECUTION COMPLETE
═══════════════════════════════════════════════════════

─── Completed Tasks ───
  ✓ 0.3 Update playwright.config.ts (12s)
  ✓ 0.4 Update vitest.config.ts (8s)

─── Failed Tasks ───
  ✗ 2.2 orchestrator.integration.test.ts
    Error: Could not import fixture

═══════════════════════════════════════════════════════
```

### Example 5: Error Box

```
╔═══════════════════════════════════════════════════════╗
║                        ERROR                          ║
╠═══════════════════════════════════════════════════════╣
║  Task 1.2 failed with error:                          ║
║  TypeError: Cannot read property 'x' of undefined     ║
╚═══════════════════════════════════════════════════════╝
```

## Width Helpers

```typescript
function createDivider(char: string, width: number = 55): string {
  return char.repeat(width);
}

function centerText(text: string, width: number = 55): string {
  const padding = Math.max(0, Math.floor((width - text.length) / 2));
  return ' '.repeat(padding) + text;
}

function createSectionHeader(title: string, char: string = '═'): string {
  return `${char.repeat(3)} ${title} ${char.repeat(3)}`;
}

function createBox(title: string, content: string, width: number = 55): string {
  const divider = '═'.repeat(width);
  return `${divider}\n${centerText(title, width)}\n${divider}\n\n${content}\n\n${divider}`;
}
```

## ASCII Fallbacks

For environments without Unicode support:

| Unicode | ASCII |
|---------|-------|
| `═` | `=` |
| `─` | `-` |
| `│` | `|` |
| `╔╗╚╝` | `+` |
| `┌┐└┘` | `+` |

## Best Practices

1. **Use Double (═══)** for major section boundaries (start/end of output)
2. **Use Single (───)** for subsections and internal divisions
3. **Use Section Headers** (`═══ Title ═══`) for grouping related items
4. **Keep consistent width** (55 characters recommended for terminal)
5. **Center important titles** for visual emphasis
6. **Include blank lines** after headers for readability
7. **Avoid overuse** - too many boxes reduce impact

## See Also

- `.claude/templates/shared/status-symbols.md` - Status symbols
- `.claude/templates/output/execution-summary.md` - Summary template
- `.claude/templates/questions/execution-confirm.md` - Execution preview
