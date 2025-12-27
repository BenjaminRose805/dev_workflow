# Dev Workflow System Guide

A comprehensive guide to the plan-driven development workflow system for Claude Code.

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Core Concepts](#core-concepts)
4. [Plan File Format](#plan-file-format)
5. [Commands Reference](#commands-reference)
6. [Status Tracking](#status-tracking)
7. [Git Workflow](#git-workflow)
8. [Parallel Execution with Worktrees](#parallel-execution-with-worktrees)
9. [Orchestrator](#orchestrator)
10. [Multi-Plan Monitoring](#multi-plan-monitoring)
11. [Configuration](#configuration)
12. [Troubleshooting](#troubleshooting)

---

## Overview

This system breaks down complex development work into trackable phases and tasks with:

- **Plan Files**: Markdown documents defining phases and tasks
- **Status Tracking**: JSON-based execution state (`status.json`)
- **Git Integration**: Branch-per-plan workflow with commit-per-task
- **Parallel Execution**: Git worktrees for running multiple plans simultaneously
- **Autonomous Orchestration**: TUI-based orchestrator for hands-off execution

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    User Interface Layer                      │
├─────────────────────────────────────────────────────────────┤
│  /plan:* commands     │  plan_orchestrator.py  │  TUI/CLI   │
│  (Claude Code skills) │  (Python orchestrator) │            │
├─────────────────────────────────────────────────────────────┤
│                     CLI Interface                            │
│                   status-cli.js                              │
├─────────────────────────────────────────────────────────────┤
│                    Core Library                              │
│                  plan-status.js                              │
│     (Path Resolution, Status I/O, Task Updates, Queries)     │
├─────────────────────────────────────────────────────────────┤
│                    Storage Layer                             │
│  docs/plans/*.md          │  docs/plan-outputs/*/status.json │
│  (Reference docs)         │  (Source of truth)               │
└─────────────────────────────────────────────────────────────┘
```

### Key Principle: Single Source of Truth

- **`status.json`** is the authoritative execution state
- Markdown plan files are **read-only reference documentation**
- Checkboxes (`- [ ]`) in markdown are never modified during execution

---

## Quick Start

### 1. Create a Plan

```bash
/plan:create my-feature
# Select a template and fill in details
```

Or create manually in `docs/plans/my-feature.md`.

### 2. Activate the Plan

```bash
/plan:set my-feature
# Creates branch plan/my-feature and initializes status.json
```

### 3. View Status

```bash
/plan:status
# Shows progress, phases, and next tasks
```

### 4. Implement Tasks

```bash
# Single task
/plan:implement 1.1

# Multiple tasks
/plan:implement 1.1 1.2 1.3

# All pending tasks in a phase
/plan:implement phase 2

# Autonomous mode (no prompts)
/plan:implement 1.1 --autonomous
```

### 5. Run Orchestrator (Fully Automated)

```bash
python scripts/plan_orchestrator.py
# Runs until all tasks complete or blocked
```

### 6. Complete the Plan

```bash
/plan:complete
# Merges to main, archives branch, updates status
```

---

## Core Concepts

### Plans

A plan is a markdown document that defines:
- **Goal**: What the plan accomplishes
- **Phases**: Logical groupings of related tasks
- **Tasks**: Individual work items with IDs (e.g., `1.1`, `2.3`)
- **Dependencies**: Task-level dependencies (`depends: 1.1, 1.2`)
- **Success Criteria**: Verification conditions

### Phases

Phases group related tasks and can have execution constraints:
- `[SEQUENTIAL]`: Tasks run one at a time
- `[PARALLEL]`: Tasks can run simultaneously (default)

### Tasks

Tasks are the atomic units of work:
- **ID Format**: `Phase.Task` (e.g., `1.1`, `2.3`, `0.1`)
- **Status**: `pending` → `in_progress` → `completed`/`failed`/`skipped`
- **Dependencies**: Can depend on tasks in any phase

### Status Tracking

Each plan has a corresponding output directory:
```
docs/plan-outputs/{plan-name}/
├── status.json      # Authoritative execution state
├── findings/        # Per-task detailed notes
│   ├── 1.1.md
│   └── 2.3.md
└── timestamps/      # Run history
```

---

## Plan File Format

### Basic Structure

```markdown
# Plan Title

## Overview

- **Goal:** Brief description of what this plan accomplishes
- **Priority:** P0|P1|P2
- **Created:** YYYY-MM-DD
- **Output:** `docs/plan-outputs/{plan-name}/`

## Dependencies

### Upstream
- **other-plan.md** - Must complete first

### Downstream
- **dependent-plan.md** - Depends on this plan

---

## Phase 1: Phase Title

**Objective:** What this phase accomplishes

**Execution Note:** Tasks 1.1-1.3 are [SEQUENTIAL] - all modify same file

- [ ] 1.1 First task description
  - Detailed steps
  - Files to modify: `src/file.ts`

- [ ] 1.2 Second task description (depends: 1.1)
  - More details here

- [ ] 1.3 Third task description (depends: 1.1, 1.2)

---

## Phase 2: Another Phase

- [ ] 2.1 Task in phase 2 (depends: 1.3)
- [ ] 2.2 Independent task in phase 2

---

## Success Criteria

- [ ] All tests pass
- [ ] Documentation updated
- [ ] No lint errors
```

### Task Dependencies

Declare dependencies inline:
```markdown
- [ ] 3.4 Final integration (depends: 3.2, 3.3)
```

Rules:
- Can depend on any task ID (including cross-phase)
- Cycles are detected and rejected at initialization
- Task is "ready" when all dependencies are completed or skipped

### Execution Constraints

Add to phase headers:
```markdown
**Execution Note:** Tasks 3.1-3.4 are [SEQUENTIAL] - all modify `config.ts`
```

### File References

Tasks can reference files (used for conflict detection):
```markdown
- [ ] 1.1 Update `src/auth.ts` with new middleware
- [ ] 1.2 Modify the config in src/config/settings.ts
```

---

## Commands Reference

### Plan Lifecycle

| Command | Purpose |
|---------|---------|
| `/plan:create` | Create new plan from template |
| `/plan:set <name>` | Activate plan and create branch |
| `/plan:status` | View current plan progress |
| `/plan:complete` | Merge to main and archive |
| `/plan:archive` | Move completed plan to archive |
| `/plan:abandon` | Discard plan and delete branch |

### Task Execution

| Command | Purpose |
|---------|---------|
| `/plan:implement <tasks>` | Execute specific tasks |
| `/plan:implement phase <N>` | Execute all pending tasks in phase |
| `/plan:implement --autonomous` | No confirmation prompts |
| `/plan:batch` | Select and execute multiple tasks |
| `/plan:orchestrate` | Fully autonomous execution loop |

### Verification & Analysis

| Command | Purpose |
|---------|---------|
| `/plan:verify` | Check task completion status |
| `/plan:verify <task-id>` | Verify specific task |
| `/plan:explain` | Show plan structure and metadata |

### Management

| Command | Purpose |
|---------|---------|
| `/plan:split <task-id>` | Break task into subtasks |
| `/plan:rollback task <id>` | Revert a task's commit |
| `/plan:rollback phase <N>` | Revert entire phase |
| `/plan:cleanup` | Remove stale branches |

### Worktrees (Parallel Execution)

| Command | Purpose |
|---------|---------|
| `/plan:worktree create <name>` | Create worktree for plan |
| `/plan:worktree list` | Show active worktrees |
| `/plan:worktree remove <name>` | Remove worktree |
| `/plan:worktree switch <name>` | Get switch instructions |

### CLI Tools

```bash
# Status queries
node scripts/status-cli.js status
node scripts/status-cli.js progress
node scripts/status-cli.js next 5

# Task updates
node scripts/status-cli.js mark-started 1.1
node scripts/status-cli.js mark-complete 1.1 --notes "Done"
node scripts/status-cli.js mark-failed 1.1 --error "Build failed"

# Dependencies
node scripts/status-cli.js deps --task 3.1
node scripts/status-cli.js deps --graph

# Plan argument (use with any command)
node scripts/status-cli.js status --plan docs/plans/my-plan.md
```

---

## Status Tracking

### status.json Schema

```json
{
  "_comment": "Authoritative source of truth",
  "planPath": "docs/plans/my-plan.md",
  "planName": "My Plan Title",
  "createdAt": "2025-12-25T21:28:26.761Z",
  "lastUpdatedAt": "2025-12-25T22:17:50.318Z",
  "currentPhase": "Phase 2: Implementation",
  "branch": "plan/my-plan",

  "tasks": [
    {
      "id": "1.1",
      "phase": "Phase 1: Setup",
      "description": "Create initial structure",
      "status": "completed",
      "startedAt": "2025-12-25T21:45:00.000Z",
      "completedAt": "2025-12-25T21:52:30.000Z",
      "duration": 450000,
      "notes": "Successfully created structure",
      "dependencies": [],
      "dependents": ["1.2", "2.1"]
    }
  ],

  "summary": {
    "totalTasks": 30,
    "completed": 18,
    "pending": 9,
    "in_progress": 1,
    "failed": 2,
    "skipped": 0
  },

  "runs": [
    {
      "id": "run-1734567890123",
      "startedAt": "2025-12-25T15:00:00.000Z",
      "completedAt": "2025-12-25T16:30:00.000Z",
      "tasksCompleted": 12,
      "tasksFailed": 1
    }
  ]
}
```

### Task States

```
pending
   ↓
in_progress (mark-started)
   ├→ completed (mark-complete)
   ├→ failed (mark-failed)
   └→ skipped (mark-skipped)
```

### Findings Files

Each task can have detailed notes in `docs/plan-outputs/{plan}/findings/{task-id}.md`:

```markdown
# Task 1.1: Create Initial Structure

## Summary
Successfully created the project structure.

## Changes Made
- Created `src/` directory
- Added `package.json`

## Notes
Used standard Node.js project layout.
```

---

## Git Workflow

### Branch Strategy

Default: **Branch-Per-Plan**

```
main
├── plan/feature-auth       # One branch per plan
│   ├── [task 1.1 commit]
│   ├── [task 1.2 commit]
│   └── [task 1.3 commit]
└── plan/api-refactor
    └── [task 2.1 commit]
```

### Commit Format

```
[plan-name] task X.Y: Brief description

Plan: plan-name
Phase: N - Phase Title
Task: X.Y
```

### Workflow Steps

1. **Activate Plan** → Creates/switches to `plan/{name}` branch
2. **Implement Tasks** → One commit per task
3. **Complete Plan** → Squash merge to main, archive tag, delete branch

### Merge Strategies

```bash
/plan:complete                    # Default: squash merge
/plan:complete --merge commit     # Preserve individual commits
/plan:complete --merge ff         # Fast-forward only
/plan:complete --pr               # Create GitHub PR instead
```

### Archive Tags

When completing a plan, an archive tag preserves the individual commits:
```
archive/plan-{name}  → Points to final commit before merge
```

---

## Parallel Execution with Worktrees

### Concept

Git worktrees allow multiple checkouts of the same repository, enabling parallel plan execution without conflicts.

### Directory Structure

```
dev_workflow/                     # Main repository
├── .claude/current-plan.txt     # Main repo active plan
├── worktrees/
│   ├── plan-auth/               # Worktree 1
│   │   ├── .claude-context/
│   │   │   └── current-plan.txt # Worktree-specific plan
│   │   └── [project files]
│   └── plan-api/                # Worktree 2
│       └── ...
```

### Create and Use Worktrees

```bash
# Create worktree for a plan
/plan:worktree create feature-auth
# Output: worktrees/plan-feature-auth/

# Switch to worktree
cd worktrees/plan-feature-auth

# Run Claude Code in worktree context
claude

# Or run orchestrator directly
python scripts/plan_orchestrator.py --worktree worktrees/plan-feature-auth
```

### Parallel Orchestrators

Run multiple orchestrators simultaneously:

```bash
# Terminal 1
cd worktrees/plan-auth
python scripts/plan_orchestrator.py

# Terminal 2
cd worktrees/plan-api
python scripts/plan_orchestrator.py

# Terminal 3: Monitor all
python scripts/multi_plan_monitor.py --layout split
```

### Cleanup

```bash
# After plan completion
/plan:worktree remove feature-auth
```

---

## Orchestrator

### Basic Usage

```bash
# Run with TUI (default)
python scripts/plan_orchestrator.py

# Plain text output
python scripts/plan_orchestrator.py --no-tui

# Specify plan explicitly
python scripts/plan_orchestrator.py --plan docs/plans/my-plan.md

# Run in worktree
python scripts/plan_orchestrator.py --worktree worktrees/plan-auth
```

### Options

| Option | Description |
|--------|-------------|
| `--plan PATH` | Specify plan file |
| `--worktree PATH` | Run in worktree context |
| `--max-iterations N` | Max Claude sessions (default: 50) |
| `--batch-size N` | Tasks per session hint (default: 5) |
| `--timeout SECONDS` | Per-session timeout (default: 600) |
| `--no-tui` | Plain text output |
| `--daemon` | Run in background |

### Daemon Mode

```bash
# Start in background
python scripts/plan_orchestrator.py --daemon

# List running orchestrators
python scripts/plan_orchestrator.py --list

# Check status
python scripts/plan_orchestrator.py --status <id>

# Stop specific orchestrator
python scripts/plan_orchestrator.py --stop <id>

# Stop all
python scripts/plan_orchestrator.py --shutdown-all
```

### Execution Flow

1. Load plan and build dependency graph
2. **Loop:**
   - Get next 5 ready tasks (DAG-aware)
   - Launch parallel Claude agents
   - Wait for completion
   - Update status
   - Repeat until done or blocked
3. Report final status

---

## Multi-Plan Monitoring

### Usage

```bash
# Auto-discover and monitor all active plans
python scripts/multi_plan_monitor.py

# Split layout (side-by-side)
python scripts/multi_plan_monitor.py --layout split

# Focus layout (one at a time)
python scripts/multi_plan_monitor.py --layout focus

# Faster refresh
python scripts/multi_plan_monitor.py --refresh 10

# Monitor specific plans
python scripts/multi_plan_monitor.py --plan docs/plans/my-plan.md
```

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Tab` | Cycle through plans |
| `1-9` | Jump to plan by number |
| `h/l` or `←/→` | Switch plans |
| `n` | Launch new plan |
| `s` | Stop a plan |
| `x` | Stop focused plan |
| `q` | Quit |

### Auto-Discovery

Monitors scans for active plans in:
1. Main repo: `.claude/current-plan.txt`
2. Worktrees: `worktrees/plan-*/.claude-context/current-plan.txt`
3. Registry: `.claude/orchestrator-registry.json`

---

## Configuration

### `.claude/git-workflow.json`

```json
{
  "strategy": "branch-per-plan",
  "branch_prefix": "plan/",
  "enforce_branch": true,
  "auto_commit": true,
  "sync_remote": false,
  "cleanup_age_days": 30,
  "archive_branches": true,
  "archive_retention_days": 90,
  "merge_strategy": "squash",

  "worktrees": {
    "enabled": true,
    "directory": "worktrees",
    "max_concurrent": 3,
    "auto_cleanup": true,
    "stale_days": 14
  }
}
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `strategy` | string | `branch-per-plan` | Branching strategy |
| `branch_prefix` | string | `plan/` | Branch name prefix |
| `enforce_branch` | boolean | `true` | Fail if not on plan branch |
| `auto_commit` | boolean | `true` | Commit after task completion |
| `sync_remote` | boolean | `false` | Push branches to remote |
| `merge_strategy` | string | `squash` | Default merge strategy |
| `cleanup_age_days` | number | `30` | Stale branch threshold |

### `.claude/current-plan.txt`

Contains path to active plan:
```
docs/plans/my-feature.md
```

### `.claude/orchestrator-registry.json`

Tracks running orchestrator instances:
```json
{
  "instances": [
    {
      "id": "orch-1234567890",
      "plan_path": "docs/plans/my-plan.md",
      "worktree": "/repo/worktrees/plan-auth",
      "pid": 12345,
      "status": "running"
    }
  ]
}
```

---

## Troubleshooting

### Common Issues

**"No active plan" error**
```bash
# Set a plan first
/plan:set my-plan
```

**Task stuck in `in_progress`**
```bash
# Mark it failed and retry
node scripts/status-cli.js mark-failed 1.1 --error "Manual reset"
```

**Branch conflicts**
```bash
# Check current branch
git branch --show-current

# Switch to plan branch
git checkout plan/my-plan
```

**Dependency cycle detected**
- Check plan file for circular dependencies
- Use `deps --graph` to visualize:
  ```bash
  node scripts/status-cli.js deps --graph
  ```

**Orchestrator won't start**
```bash
# Check if already running
python scripts/plan_orchestrator.py --list

# Force stop all
python scripts/plan_orchestrator.py --shutdown-all
```

**Status out of sync**
```bash
# Validate status.json
node scripts/status-cli.js validate

# Auto-fix issues
node scripts/status-cli.js validate --fix
```

### Debug Commands

```bash
# View raw status
node scripts/status-cli.js status --format json

# Check what's next
node scripts/status-cli.js next 10

# View blocked tasks
node scripts/status-cli.js deps --blocked

# Scan all plans
node scripts/scan-plans.js
```

### Log Files

Orchestrator logs are in:
```
docs/plan-outputs/{plan-name}/logs/
├── orchestrator.log
└── run-{timestamp}.log
```

---

## Summary

| Task | Command/Tool |
|------|--------------|
| Create plan | `/plan:create` |
| Start working | `/plan:set <name>` |
| Check progress | `/plan:status` |
| Do a task | `/plan:implement <id>` |
| Do many tasks | `/plan:batch` or `/plan:orchestrate` |
| Parallel execution | `/plan:worktree create` + orchestrator |
| Monitor multiple | `python scripts/multi_plan_monitor.py` |
| Finish plan | `/plan:complete` |
| Clean up | `/plan:cleanup` |

For more details on specific commands, use `/plan:explain` or read the command files in `.claude/commands/plan/`.
