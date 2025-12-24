# Task 1.1: Plan Commands and CLI Interfaces Documentation

## Overview

This document catalogs all 13 plan commands (slash commands) and their associated CLI interfaces.
The plan system consists of:
- **13 slash commands** (`.claude/commands/plan/*.md`)
- **2 CLI scripts** with multiple subcommands
- **1 shell wrapper** for orchestration

---

## Plan Commands (Slash Commands)

### 1. /plan:set
**Purpose:** Set the active plan for subsequent operations

**Arguments:**
| Format | Example | Behavior |
|--------|---------|----------|
| (none) | `/plan:set` | Interactive selection |

**Outputs:**
- Writes plan path to `.claude/current-plan.txt`
- Initializes status tracking in `docs/plan-outputs/{plan-name}/`
- Displays plan summary with phase breakdown

**Exit Behavior:**
- Success: Shows plan summary and progress bar
- Error: "No plans found" or file read errors

---

### 2. /plan:status
**Purpose:** Show progress summary for the active plan

**Arguments:**
| Format | Example | Behavior |
|--------|---------|----------|
| (none) | `/plan:status` | Full status display |
| `--compact` or `-c` | `/plan:status -c` | Minimal output |

**Outputs:**
- Overall progress percentage with visual bar
- Phase breakdown with task counts
- Success criteria status (if present)
- Recent activity (if status.json exists)

**Exit Behavior:**
- Success: Displays formatted status
- Error: "No active plan set"

---

### 3. /plan:explain
**Purpose:** Explain what task(s) involve without implementing

**Arguments:**
| Format | Example | Behavior |
|--------|---------|----------|
| Single task ID | `/plan:explain 1.1` | Explain task 1.1 only |
| Multiple task IDs | `/plan:explain 1.1 1.2` | Explain listed tasks |
| Phase selector | `/plan:explain phase:1` | All tasks in Phase 1 |
| All tasks | `/plan:explain all` | All tasks in plan |
| No arguments | `/plan:explain` | Interactive selection |
| Search string | `/plan:explain websocket` | Find matching tasks |

**Outputs:**
- Summary, context, scope, approach for each task
- Dependencies and verification criteria
- Current status and existing findings (if available)

**Exit Behavior:**
- Read-only operation, no file modifications
- Offers next steps: implement, explain more, or nothing

---

### 4. /plan:implement
**Purpose:** Implement one or more tasks from the active plan

**Arguments:**
| Format | Example | Behavior |
|--------|---------|----------|
| Single task ID | `/plan:implement 1.1` | Implement task 1.1 |
| Multiple task IDs | `/plan:implement 1.1 1.2 1.3` | Implement sequentially |
| Phase selector | `/plan:implement phase:2` | All pending in Phase 2 |
| All pending | `/plan:implement all` | All pending (with confirmation) |
| No arguments | `/plan:implement` | Interactive selection |
| Search string | `/plan:implement websocket` | Find matching tasks |

**Outputs:**
- Marks tasks started via `status-cli.js mark-started`
- Creates/modifies files as needed
- Marks tasks complete via `status-cli.js mark-complete`
- Writes findings to `findings/` directory

**Exit Behavior:**
- Success: Progress summary with completion counts
- Failure: Error logged, task marked failed, continues with others

---

### 5. /plan:batch
**Purpose:** Select multiple tasks for batch/parallel execution

**Arguments:**
| Format | Example | Behavior |
|--------|---------|----------|
| Single task ID | `/plan:batch 1.1` | Execute task 1.1 only |
| Multiple task IDs | `/plan:batch 1.1 1.2 1.3` | Execute listed tasks |
| Phase selector | `/plan:batch phase:1` | All pending in Phase 1 |
| All pending | `/plan:batch all` | All pending (with confirmation) |
| No arguments | `/plan:batch` | Interactive multi-select |

**Outputs:**
- Execution preview with parallel/sequential grouping
- Real-time progress display with status symbols
- Timing information and parallelization savings

**Exit Behavior:**
- Supports parallel execution via Task agents
- Handles failures gracefully, continues with others

---

### 6. /plan:verify
**Purpose:** Check if tasks are done, needed, blocked, or obsolete

**Arguments:**
| Format | Example | Behavior |
|--------|---------|----------|
| Single task ID | `/plan:verify 1.1` | Verify task 1.1 |
| Multiple task IDs | `/plan:verify 1.1 1.2` | Verify listed tasks |
| Phase selector | `/plan:verify phase:1` | All tasks in Phase 1 |
| All tasks | `/plan:verify all` | All tasks (pending and completed) |
| No arguments | `/plan:verify` | Interactive selection |

**Outputs:**
- Status classification: ALREADY DONE, NEEDED, BLOCKED, OBSOLETE
- Verification report grouped by status
- Option to auto-mark tasks in status.json

**Exit Behavior:**
- Read-only by default
- Optional: updates status.json if user confirms

---

### 7. /plan:split
**Purpose:** Break a large task into smaller subtasks

**Arguments:**
| Format | Example | Behavior |
|--------|---------|----------|
| Single task ID | `/plan:split 1.1` | Split task 1.1 |
| No arguments | `/plan:split` | Interactive selection |
| Search string | `/plan:split websocket` | Find matching task |

**Outputs:**
- Proposed subtasks (e.g., 1.1.1, 1.1.2, 1.1.3)
- Updated plan markdown with nested checklist

**Exit Behavior:**
- Modifies plan file to add subtask structure
- Preserves original parent task

---

### 8. /plan:orchestrate
**Purpose:** Autonomously execute a plan from start to finish

**Arguments:**
| Format | Example | Behavior |
|--------|---------|----------|
| (none) | `/plan:orchestrate` | Run full orchestration |
| `--phase:N` | `/plan:orchestrate --phase:1` | Only Phase N tasks |
| `--max-tasks:N` | `/plan:orchestrate --max-tasks:10` | Stop after N tasks |
| `--dry-run` | `/plan:orchestrate --dry-run` | Show plan without running |

**Outputs:**
- Continuous progress updates after each batch
- Parallel Task agent execution (3-5 at a time)
- Completion summary when done or blocked

**Exit Behavior:**
- Runs until 100% complete or all tasks blocked
- Does NOT ask for confirmation between tasks

---

### 9. /plan:templates
**Purpose:** Display available plan templates

**Arguments:**
| Format | Example | Behavior |
|--------|---------|----------|
| (none) | `/plan:templates` | Summary table of all templates |
| Template name | `/plan:templates analysis` | Detailed view of specific template |

**Outputs:**
- Template filename, purpose, phase count
- Required variables for each template

**Exit Behavior:**
- Read-only, displays template information

---

### 10. /plan:create
**Purpose:** Create a new plan from a template

**Arguments:**
| Format | Example | Behavior |
|--------|---------|----------|
| (none) | `/plan:create` | Interactive template selection |

**Outputs:**
- New plan file in `docs/plans/{filename}.md`
- Initialized status.json in `docs/plan-outputs/{plan-name}/`
- Plan set as active

**Exit Behavior:**
- Creates files, initializes tracking
- Confirms with variable substitution summary

---

### 11. /plan:migrate
**Purpose:** Migrate old plans from inline checkmarks to output-separated format

**Arguments:**
| Format | Example | Behavior |
|--------|---------|----------|
| (none) | `/plan:migrate` | Migrate active plan |
| `--all` | `/plan:migrate --all` | Migrate all plans in docs/plans/ |
| `--include-completed` | `/plan:migrate --include-completed` | Include archived plans |

**Outputs:**
- Creates `docs/plan-outputs/{plan-name}/status.json`
- Marks completed tasks based on markdown checkboxes
- Optional: removes checkmarks from plan file

**Exit Behavior:**
- Non-destructive (preserves original files)
- Reports migration summary

---

### 12. /plan:archive
**Purpose:** View and manage archived plans

**Arguments:**
| Format | Example | Behavior |
|--------|---------|----------|
| (none) | `/plan:archive` | Show archive summary |

**Outputs:**
- List of archived plans in `docs/completed plans/`
- Option to migrate archived plans

**Exit Behavior:**
- Read-only display by default
- Optional migration if user confirms

---

### 13. /plan:_common:status-tracking
**Purpose:** Shared status tracking instructions (included by other commands)

**Type:** Internal template, not user-invocable

**Provides:**
- Status functions reference
- Progress display format
- Status symbols guide

---

## CLI Scripts

### status-cli.js

**Location:** `scripts/status-cli.js`

**Usage:** `node scripts/status-cli.js <command> [options]`

#### Commands:

| Command | Arguments | Description | Output |
|---------|-----------|-------------|--------|
| `status` | (none) | Current plan status | JSON |
| `mark-started` | `<task-id>` | Mark task in_progress | JSON |
| `mark-complete` | `<task-id> [--notes "..."]` | Mark task completed | JSON |
| `mark-failed` | `<task-id> [--error "..."]` | Mark task failed | JSON |
| `mark-skipped` | `<task-id> [--reason "..."]` | Mark task skipped | JSON |
| `write-findings` | `<task-id> --file\|--stdin\|--content` | Write findings file | JSON |
| `read-findings` | `<task-id>` | Read findings content | Raw text |
| `start-run` | (none) | Start execution run | JSON with runId |
| `complete-run` | `<run-id> --completed N --failed N` | Complete run | JSON |
| `next` | `[count]` | Get next N recommended tasks | JSON |
| `progress` | (none) | Formatted progress bar | Text |
| `validate` | (none) | Validate and repair status.json | JSON |
| `sync-check` | (none) | Compare markdown vs status.json | JSON |
| `retryable` | (none) | Get failed tasks that can retry | JSON |
| `exhausted` | (none) | Get failed tasks with no retries | JSON |
| `increment-retry` | `<task-id> [--error "..."]` | Increment retry count | JSON |
| `detect-stuck` | (none) | Detect and mark stuck tasks | JSON |

#### Exit Codes:
- `0`: Success
- `1`: Error (with message to stderr)

---

### scan-plans.js

**Location:** `scripts/scan-plans.js`

**Usage:** `node scripts/scan-plans.js`

**Output:** JSON object with:
```json
{
  "currentPlan": "docs/plans/example.md",
  "plans": [
    {
      "path": "/absolute/path/to/plan.md",
      "title": "Plan Title",
      "incomplete": 42,
      "complete": 13,
      "phases": [...],
      "hasStatusTracking": true,
      "outputDir": "docs/plan-outputs/plan-name",
      "statusSummary": {...},
      "lastUpdated": "ISO timestamp",
      "runCount": 5
    }
  ]
}
```

**Exit Codes:**
- `0`: Success with JSON output
- Non-zero: Error (fallback to manual scanning in commands)

---

### plan-runner.sh

**Location:** `scripts/plan-runner.sh`

**Usage:** `./scripts/plan-runner.sh <command> [args]`

#### Commands:

| Command | Arguments | Description |
|---------|-----------|-------------|
| `status` | (none) | Call `plan-orchestrator.js status` |
| `next` | `[count]` | Get next N tasks (default: 1) |
| `check` | `<task-id>` | Check task status |
| `phases` | (none) | List all phases |
| `explain` | `<task-id>` | Print: "Run: /plan:explain <id>" |
| `implement` | `<task-id>` | Print: "Run: /plan:implement <id>" |
| `verify` | `<task-id>` | Print: "Run: /plan:verify <id>" |
| `split` | `<task-id>` | Print: "Run: /plan:split <id>" |
| `run` | `<task-id>` | Full cycle: explain, implement, verify |
| `phase` | `N` | Show tasks in phase N |

**Exit Codes:**
- `0`: Success
- `1`: Error (e.g., missing task ID)

---

## Status Symbols Reference

| Symbol | Status | Description |
|--------|--------|-------------|
| `◯` | pending | Task not yet started |
| `⟳` | in_progress | Currently being worked on |
| `✓` | completed | Successfully finished |
| `✗` | failed | Could not be completed |
| `⊘` | skipped | Skipped (dependency failure or other reason) |

---

## Data Flow Summary

```
.claude/current-plan.txt          → Active plan path
.claude/current-plan-output.txt   → Active output directory path

docs/plans/{plan}.md              → Plan definition (read-only during execution)
docs/plan-outputs/{plan}/
├── status.json                   → Authoritative task status (source of truth)
├── findings/                     → Task findings/outputs
└── timestamps/                   → Execution timestamps
```

---

## Integration Points

1. **slash commands** → invoke **status-cli.js** for status tracking
2. **plan-orchestrator.js** → used by **plan-runner.sh** for TUI mode
3. **scan-plans.js** → provides plan discovery for /plan:set
4. All commands read from `.claude/current-plan.txt` for active plan
