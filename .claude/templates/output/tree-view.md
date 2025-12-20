# Tree View Template

A standardized template for displaying hierarchical data in tree format.

## Template Variables

- `{{title}}` - Tree section title (optional)
- `{{items}}` - Array of tree items (recursive structure)
- `{{depth_limit}}` - Maximum depth to display (default: unlimited)
- `{{show_icons}}` - Include file/folder icons (default: true)
- `{{highlight}}` - Items to highlight (array of paths)
- `{{collapsed}}` - Items to show as collapsed (array of paths)

## Item Structure

```typescript
interface TreeItem {
  name: string;              // Display name
  type: 'file' | 'folder' | 'task' | 'phase';
  path?: string;             // Full path for files
  status?: 'pending' | 'in_progress' | 'completed' | 'failed';
  children?: TreeItem[];     // Nested items
  metadata?: {
    size?: string;           // File size
    modified?: string;       // Last modified
    count?: number;          // Item count for folders
  };
}
```

## Tree Characters

| Symbol | Unicode | Usage |
|--------|---------|-------|
| `│` | U+2502 | Vertical continuation line |
| `├──` | U+251C + U+2500 | Branch (not last) |
| `└──` | U+2514 + U+2500 | Branch (last item) |
| `│   ` | Padding | Indent for nested items |
| `    ` | Spaces | Indent when no continuation |

## Template Formats

### Basic File Tree

```
{{#if title}}{{title}}
{{/if}}
{{#each items}}
{{#if @last}}└── {{else}}├── {{/if}}{{#if (eq type "folder")}}📁 {{else}}📄 {{/if}}{{name}}
{{#if children}}{{> treeRecursive children=children prefix=(if @last "    " "│   ")}}{{/if}}
{{/each}}
```

### Tree with Status

```
{{#each items}}
{{#if @last}}└──{{else}}├──{{/if}} {{statusSymbol status}} {{name}}
{{#if children}}
{{#each children}}
{{../prefix}}{{#if @last}}└──{{else}}├──{{/if}} {{statusSymbol status}} {{name}}
{{/each}}
{{/if}}
{{/each}}
```

## Usage Examples

### Example 1: File Tree

```
src/
├── lib/
│   ├── websocket-connection.ts
│   ├── websocket-manager.ts
│   └── orchestrator.ts
├── stores/
│   ├── phase-session-store.ts
│   └── preferences-store.ts
└── components/
    ├── chat/
    │   ├── chat-container.tsx
    │   └── chat-message.tsx
    └── modals/
        └── base-modal.tsx
```

### Example 2: File Tree with Icons

```
📁 src/
├── 📁 lib/
│   ├── 📄 websocket-connection.ts
│   ├── 📄 websocket-manager.ts
│   └── 📄 orchestrator.ts
├── 📁 stores/
│   ├── 📄 phase-session-store.ts
│   └── 📄 preferences-store.ts
└── 📁 components/
    └── 📁 chat/
        ├── 📄 chat-container.tsx
        └── 📄 chat-message.tsx
```

### Example 3: Task Tree with Status

```
Plan: claude-commands-enhancement.md
├── ✓ Phase 0: Infrastructure Setup
│   ├── ✓ Create scripts directory
│   ├── ✓ Build shared utilities
│   └── ✓ Add dependencies
├── ✓ Phase 1: High-Impact Scripts
│   ├── ✓ scan-plans.js
│   ├── ✓ scan-prompts.js
│   └── ✓ parse-plan-structure.js
├── ⟳ Phase 2: Multi-Agent System
│   ├── ✓ Create agent templates
│   ├── ⟳ Build agent launcher
│   └── ◯ Implement caching
└── ◯ Phase 3: Templates
    ├── ◯ Question templates
    └── ◯ Output templates
```

### Example 4: Execution Flow Tree

```
Execution Flow:
│
├─► Phase 0 (Sequential)
│   │
│   ├─► 0.1 Update playwright.config.ts
│   │
│   └─► 0.2 Update vitest.config.ts
│
│       ↓ (Phase complete)
│
└─► Phase 1 (Parallel)
    │
    ├─┬─► 1.1 websocket-connection.test.ts
    │ │
    ├─┬─► 1.2 preferences-store.test.ts
    │ │
    └─┬─► 1.3 api-utils.test.ts
```

### Example 5: Collapsed Tree

```
📁 src/
├── 📁 lib/ (8 files)
│   └── ... (collapsed)
├── 📁 stores/ (3 files)
│   └── ... (collapsed)
├── 📁 components/ (15 files)
│   └── ... (collapsed)
└── 📁 hooks/ (4 files)
    └── ... (collapsed)
```

### Example 6: Highlighted Items

```
src/
├── lib/
│   ├── websocket-connection.ts  ← modified
│   ├── websocket-manager.ts
│   └── orchestrator.ts          ← modified
└── stores/
    └── phase-session-store.ts   ← new
```

### Example 7: Tree with Metadata

```
tests/
├── unit/                    (24 files, 156 tests)
│   ├── lib/                 (8 files, 67 tests)
│   │   └── websocket.test.ts    12 tests, 2.3s
│   └── stores/              (5 files, 45 tests)
│       └── session.test.ts      15 tests, 1.1s
└── integration/             (6 files, 28 tests)
    └── api.test.ts              8 tests, 5.2s
```

## Helper Functions

```typescript
interface TreeOptions {
  indent?: string;           // Indent string (default: "    ")
  showIcons?: boolean;       // Show file/folder icons
  showStatus?: boolean;      // Show status symbols
  maxDepth?: number;         // Maximum depth
  highlight?: string[];      // Paths to highlight
}

function renderTree(items: TreeItem[], options: TreeOptions = {}): string {
  const { indent = '    ', showIcons = true, maxDepth = Infinity } = options;

  function render(items: TreeItem[], prefix: string, depth: number): string {
    if (depth > maxDepth) return `${prefix}└── ... (${items.length} items)\n`;

    return items.map((item, i) => {
      const isLast = i === items.length - 1;
      const branch = isLast ? '└── ' : '├── ';
      const childPrefix = prefix + (isLast ? '    ' : '│   ');

      let icon = '';
      if (showIcons) {
        icon = item.type === 'folder' ? '📁 ' : '📄 ';
      }

      let line = `${prefix}${branch}${icon}${item.name}\n`;

      if (item.children && item.children.length > 0) {
        line += render(item.children, childPrefix, depth + 1);
      }

      return line;
    }).join('');
  }

  return render(items, '', 0);
}

function getStatusSymbol(status?: string): string {
  const symbols: Record<string, string> = {
    pending: '◯',
    in_progress: '⟳',
    completed: '✓',
    failed: '✗'
  };
  return status ? symbols[status] || '' : '';
}
```

## ASCII Fallback

For terminals without Unicode support:

```
src/
+-- lib/
|   +-- websocket-connection.ts
|   +-- websocket-manager.ts
|   `-- orchestrator.ts
`-- stores/
    +-- phase-session-store.ts
    `-- preferences-store.ts
```

| Unicode | ASCII |
|---------|-------|
| `├──` | `+--` |
| `└──` | `` `-- `` |
| `│` | `|` |
| `📁` | `[D]` |
| `📄` | `[F]` |

## Best Practices

1. **Consistent indentation** - Use 4 spaces or tab equivalent
2. **Limit depth** - Collapse or truncate very deep trees
3. **Show counts** - Include item counts for collapsed sections
4. **Highlight changes** - Mark modified/new items
5. **Use icons sparingly** - Only when they add value
6. **Sort consistently** - Folders first, then files alphabetically
7. **Truncate long names** - Keep tree readable
8. **Show metadata on hover/expand** - Don't clutter the main view

## See Also

- `.claude/templates/shared/status-symbols.md` - Status symbols
- `.claude/templates/shared/box-styles.md` - Border characters
- `.claude/templates/output/progress-display.md` - Progress display
