# dev_workflow Architecture

> Plan-driven development workflow system for Claude Code

---

## Overview

dev_workflow is a **task planning and execution framework** that extends Claude Code with structured plan management capabilities. It enables breaking down complex work into trackable phases and tasks with status tracking, verification, and batch execution.

## System Architecture

```
plan_orchestrator.py ─── Python TUI + main loop
       │
       └──► status-cli.js ─── Unified CLI (queries + updates)
                 │
                 └──► lib/plan-status.js ─── Single unified library
```

**Design Principles:**
- **Single Source of Truth**: `status.json` is the authoritative source for execution state
- **Path Derivation**: Output directory derived from plan name (`docs/plan-outputs/{plan-name}/`)
- **No Pointer Sync**: Single pointer file (`.claude/current-plan.txt`) for active plan
- **Unified API**: One library (`plan-status.js`) for all status operations

## Core Components

### 1. Plan System

- **Plans** (`docs/plans/*.md`) - Structured task documents with phases and checkboxes (read-only during execution)
- **Plan Outputs** (`docs/plan-outputs/<plan-name>/`) - Artifacts, findings, and execution state
- **Status Tracking** (`status.json`) - Real-time task state (pending/in_progress/completed/failed/skipped)
- **Findings** (`findings/*.md`) - Task-specific research and discovery output

### 2. Claude Commands

Located in `.claude/commands/plan/`:

| Command | Purpose |
|---------|---------|
| `set` | Activate a plan for execution |
| `status` | View current plan progress |
| `implement` | Execute specific tasks |
| `verify` | Run verification checks |
| `batch` | Execute multiple tasks |
| `orchestrate` | Automated multi-phase execution |
| `split` | Break tasks into subtasks |
| `create` | Create new plan from template |
| `archive` | Archive completed plans |
| `migrate` | Migrate plans to output-separated format |

### 3. Scripts (`scripts/`)

| Script | Purpose |
|--------|---------|
| `status-cli.js` | Unified CLI for status queries and task updates |
| `plan_orchestrator.py` | Python TUI for automated batch execution |
| `verify-with-agent.js` | Agent-based verification |
| `scan-plans.js` | Plan discovery and listing |

#### status-cli.js Commands

```bash
# Task Updates
node scripts/status-cli.js mark-started TASK_ID
node scripts/status-cli.js mark-complete TASK_ID --notes "Summary"
node scripts/status-cli.js mark-failed TASK_ID --error "Description"

# Queries
node scripts/status-cli.js progress          # Overall progress
node scripts/status-cli.js next [count]      # Next recommended tasks
node scripts/status-cli.js status            # Full status summary
node scripts/status-cli.js phases            # Phase breakdown
node scripts/status-cli.js check             # Validation check
```

### 4. Shared Libraries (`scripts/lib/`)

| Module | Purpose |
|--------|---------|
| `plan-status.js` | **Unified API** for path resolution, status I/O, task updates, queries, initialization, findings, and run management |
| `markdown-parser.js` | Parse plan markdown structure |
| `plan-output-utils.js` | Low-level output file operations with locking |
| `timestamp-utils.js` | ISO timestamp and duration utilities |
| `file-utils.js` | File reading with caching |

#### plan-status.js API Categories

```javascript
const planStatus = require('./lib/plan-status');

// Path Resolution
planStatus.getActivePlanPath()      // Get current active plan
planStatus.getOutputDir(planPath)   // Get output directory path
planStatus.getStatusPath(planPath)  // Get status.json path

// Core I/O
planStatus.loadStatus(planPath)     // Load status.json
planStatus.saveStatus(planPath, status)  // Save status.json

// Task Updates
planStatus.markTaskStarted(planPath, taskId)
planStatus.markTaskCompleted(planPath, taskId, { notes, findings })
planStatus.markTaskFailed(planPath, taskId, errorMessage)
planStatus.markTaskSkipped(planPath, taskId, reason)

// Queries
planStatus.getNextTasks(planPath, count)  // Get pending tasks
planStatus.getProgress(planPath)          // Get progress summary
planStatus.getStatusSummary(planPath)     // Get full status

// Initialization
planStatus.initializePlanStatus(planPath) // Create status.json
```

## Directory Structure

```
dev_workflow/
├── .claude/
│   ├── commands/plan/      # Slash commands (/plan:*)
│   ├── templates/          # Agent and output templates
│   └── current-plan.txt    # Active plan pointer (single source)
├── docs/
│   ├── plans/              # Active plan documents
│   ├── plan-outputs/       # Execution artifacts
│   │   └── {plan-name}/
│   │       ├── status.json # Task execution state
│   │       ├── findings/   # Task findings (*.md)
│   │       └── timestamps/ # Execution timing
│   ├── plan-templates/     # Plan creation templates
│   ├── plan-system/        # System documentation
│   └── completed plans/    # Archived legacy plans
└── scripts/
    ├── lib/                # Shared utilities
    │   ├── plan-status.js  # Unified status API
    │   └── ...
    ├── tests/              # Test suite
    └── *.js                # CLI tools
```

## Workflow

1. **Create Plan** - Use `/plan:create` or write markdown manually
2. **Set Active** - Use `/plan:set <plan-name>` to activate
3. **Execute Tasks** - Use `/plan:implement`, `/plan:batch`, or `/plan:orchestrate`
4. **Track Progress** - Status updates via `status-cli.js` (updates `status.json`)
5. **Verify** - Run `/plan:verify` to validate completed work
6. **Archive** - Move completed plan to archive

## Data Flow

```
User runs /plan:implement
       │
       ▼
status-cli.js mark-started TASK_ID
       │
       ▼
plan-status.js → updates status.json
       │
       ▼
Task execution (Claude Code)
       │
       ▼
status-cli.js mark-complete TASK_ID
       │
       ▼
plan-status.js → updates status.json + writes findings
```

## Key Design Decisions

### status.json is Source of Truth
- The markdown plan file is **read-only** during execution
- All task state lives in `status.json`
- No checkbox updates to plan files

### Derived Path Resolution
- Output path: `docs/plan-outputs/{basename(plan-file, '.md')}/`
- No separate output pointer file needed
- Single pointer: `.claude/current-plan.txt` → plan file path

### Atomic Writes
- All status updates use atomic write (temp file + rename)
- Prevents corruption from interrupted writes
- Safe for concurrent access

### Summary Auto-Fix
- Summary counts validated on load
- Mismatches auto-corrected from actual task counts
- Prevents summary drift over time
