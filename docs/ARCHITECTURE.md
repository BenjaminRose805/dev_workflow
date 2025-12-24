# dev_workflow Architecture

> Plan-driven development workflow system for Claude Code

---

## Overview

dev_workflow is a **task planning and execution framework** that extends Claude Code with structured plan management capabilities. It enables breaking down complex work into trackable phases and tasks with status tracking, verification, and batch execution.

## Core Components

### 1. Plan System

- **Plans** (`docs/plans/*.md`) - Structured task documents with phases and checkboxes
- **Plan Outputs** (`docs/plan-outputs/<plan-name>/`) - Artifacts and findings from execution
- **Status Tracking** (`status.json`) - Real-time task state (pending/in_progress/completed/failed)

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

### 3. Scripts (`scripts/`)

| Script | Purpose |
|--------|---------|
| `status-cli.js` | CLI for marking tasks started/completed/failed |
| `plan-orchestrator.js` | Automated task execution engine |
| `verify-with-agent.js` | Agent-based verification |
| `scan-plans.js` | Plan discovery and listing |

### 4. Shared Libraries (`scripts/lib/`)

- `markdown-parser.js` - Parse plan markdown structure
- `plan-output-utils.js` - Output file management with locking
- `status-manager.js` - Status.json read/write operations

## Directory Structure

```
dev_workflow/
├── .claude/
│   ├── commands/plan/      # Slash commands (/plan:*)
│   └── templates/          # Agent and output templates
├── docs/
│   ├── plans/              # Active plan documents
│   ├── plan-outputs/       # Execution artifacts
│   ├── plan-templates/     # Plan creation templates
│   └── archive/            # Completed/archived plans
└── scripts/
    ├── lib/                # Shared utilities
    └── *.js                # CLI tools
```

## Workflow

1. **Create Plan** - Use `/plan:create` or write markdown manually
2. **Set Active** - Use `/plan:set <plan-name>` to activate
3. **Execute Tasks** - Use `/plan:implement`, `/plan:batch`, or `/plan:orchestrate`
4. **Track Progress** - Status updates via `status-cli.js`
5. **Verify** - Run `/plan:verify` to validate completed work
6. **Archive** - Move completed plan to archive

---

*TODO: Expand with detailed component documentation*
