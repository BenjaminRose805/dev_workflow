# Plan Orchestrator System

A comprehensive system for autonomous plan execution with real-time status tracking, retry logic, and recovery mechanisms.

---

## Table of Contents

1. [Overview](#overview)
2. [Components](#components)
3. [Status CLI Commands](#status-cli-commands)
4. [status.json Format](#statusjson-format)
5. [Source of Truth](#source-of-truth)
6. [Troubleshooting](#troubleshooting)

---

## Overview

The Plan Orchestrator system enables autonomous execution of implementation plans by Claude Code. It handles:

- **Status Tracking**: Persistent task state in `status.json`
- **Race Condition Prevention**: File locking with exponential backoff
- **Retry Logic**: Automatic retry of failed tasks (up to 2 attempts)
- **Stuck Task Detection**: Auto-fail tasks in_progress for >30 minutes
- **Recovery**: Backup/restore and rebuild from markdown

### Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Plan Orchestrator System                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────┐    ┌──────────────────┐                       │
│  │  plan_orchestrator.py │    │  plan-runner.sh  │                   │
│  │  (Python TUI)         │    │  (Shell wrapper) │                   │
│  └──────────┬───────────┘    └────────┬─────────┘                   │
│             │                          │                             │
│             ▼                          ▼                             │
│  ┌────────────────────────────────────────────────────┐             │
│  │                 status-cli.js                       │             │
│  │  (CLI for managing plan execution status)           │             │
│  └────────────────────┬───────────────────────────────┘             │
│                       │                                              │
│                       ▼                                              │
│  ┌────────────────────────────────────────────────────┐             │
│  │              plan-output-utils.js                   │             │
│  │  (Low-level status operations + file locking)       │             │
│  └────────────────────┬───────────────────────────────┘             │
│                       │                                              │
│                       ▼                                              │
│  ┌────────────────────────────────────────────────────┐             │
│  │              docs/plan-outputs/<plan>/              │             │
│  │  ├── status.json      (task execution state)        │             │
│  │  ├── status.json.bak  (backup for recovery)         │             │
│  │  └── findings/        (task output artifacts)       │             │
│  └────────────────────────────────────────────────────┘             │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Components

### scripts/status-cli.js

Command-line interface for managing plan execution status. This is the primary way Claude should update task status during autonomous execution.

**Usage**: `node scripts/status-cli.js <command> [options]`

### scripts/plan_orchestrator.py

Python TUI orchestrator that repeatedly invokes Claude Code until a plan is complete. Features:

- Rich TUI with live activity tracking
- Status monitoring with inotify (Linux) or polling
- Streaming JSON output parsing
- Retry logic for failed tasks
- Stuck task detection

**Usage**: `python scripts/plan_orchestrator.py [options]`

Options:
- `--plan PATH`: Path to plan file (uses active plan if not specified)
- `--max-iterations N`: Maximum Claude invocations (default: 50)
- `--batch-size N`: Tasks per iteration (default: 5)
- `--timeout SECONDS`: Timeout per session (default: 600)
- `--dry-run`: Show what would be done without executing
- `--no-tui`: Disable Rich TUI (plain text output)

### scripts/lib/plan-output-utils.js

Low-level utilities for plan output management:

- File locking with `proper-lockfile`
- Atomic writes (temp file + rename)
- Summary recalculation
- Backup and recovery
- Retry tracking

### scripts/lib/file-utils.js

Common file operations:

- `readFile()` / `writeFile()`
- `writeFileAtomic()` - Crash-safe writes
- `glob()` / `globSync()` - File pattern matching
- Caching with mtime invalidation

---

## Status CLI Commands

### Task Status Management

```bash
# Show current plan status (JSON output)
node scripts/status-cli.js status

# Mark task as in_progress
node scripts/status-cli.js mark-started 1.1

# Mark task as completed with notes
node scripts/status-cli.js mark-complete 1.1 --notes "Implemented auth middleware"

# Mark task as failed with error message
node scripts/status-cli.js mark-failed 1.1 --error "Build failed: missing dependency"

# Mark task as skipped with reason
node scripts/status-cli.js mark-skipped 1.1 --reason "Not applicable to current config"
```

### Progress and Navigation

```bash
# Get next N recommended tasks (JSON)
node scripts/status-cli.js next 5

# Show formatted progress bar
node scripts/status-cli.js progress

# Validate and repair status.json
node scripts/status-cli.js validate

# Compare markdown vs status.json (read-only check)
node scripts/status-cli.js sync-check
```

### Findings Management

```bash
# Write findings from file
node scripts/status-cli.js write-findings 1.1 --file /path/to/findings.md

# Write findings from stdin
echo "## Results\nAll tests passed" | node scripts/status-cli.js write-findings 1.1 --stdin

# Write findings directly
node scripts/status-cli.js write-findings 1.1 --content "## Summary\nTask completed successfully"

# Read findings for a task
node scripts/status-cli.js read-findings 1.1
```

### Run Management

```bash
# Start a new execution run (outputs run ID)
node scripts/status-cli.js start-run

# Complete an execution run
node scripts/status-cli.js complete-run run-1234567890 --completed 5 --failed 1
```

### Retry and Recovery

```bash
# Get failed tasks that can be retried
node scripts/status-cli.js retryable

# Get failed tasks with no retries left
node scripts/status-cli.js exhausted

# Increment retry count for a task
node scripts/status-cli.js increment-retry 1.1 --error "Second attempt failed"

# Detect and mark stuck tasks as failed
node scripts/status-cli.js detect-stuck
```

---

## status.json Format

The `status.json` file is stored at `docs/plan-outputs/<plan-name>/status.json`:

```json
{
  "_comment": "This file is the authoritative source of truth...",
  "planPath": "docs/plans/my-plan.md",
  "planName": "My Implementation Plan",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "lastUpdatedAt": "2025-01-01T12:00:00.000Z",
  "currentPhase": "Phase 1: Setup",
  "tasks": [
    {
      "id": "1.1",
      "phase": "Phase 1: Setup",
      "description": "Initialize project structure",
      "status": "completed",
      "startedAt": "2025-01-01T10:00:00.000Z",
      "completedAt": "2025-01-01T10:05:00.000Z",
      "duration": 300000,
      "notes": "Created src/ and tests/ directories"
    },
    {
      "id": "1.2",
      "phase": "Phase 1: Setup",
      "description": "Add dependencies",
      "status": "failed",
      "startedAt": "2025-01-01T10:05:00.000Z",
      "completedAt": "2025-01-01T10:10:00.000Z",
      "lastError": "npm install failed",
      "lastErrorAt": "2025-01-01T10:10:00.000Z",
      "retryCount": 1
    },
    {
      "id": "1.3",
      "phase": "Phase 1: Setup",
      "description": "Configure TypeScript",
      "status": "pending"
    }
  ],
  "runs": [
    {
      "runId": "run-1704067200000",
      "startedAt": "2025-01-01T10:00:00.000Z",
      "completedAt": "2025-01-01T10:15:00.000Z",
      "tasksCompleted": 1,
      "tasksFailed": 1
    }
  ],
  "summary": {
    "totalTasks": 3,
    "completed": 1,
    "pending": 1,
    "in_progress": 0,
    "failed": 1,
    "skipped": 0
  }
}
```

### Task Status Values

| Status | Description |
|--------|-------------|
| `pending` | Task not yet started |
| `in_progress` | Task currently being worked on |
| `completed` | Task finished successfully |
| `failed` | Task failed (may be retryable) |
| `skipped` | Task intentionally skipped |

### Task Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Task identifier (e.g., "1.1", "2.3") |
| `phase` | string | Phase name |
| `description` | string | Task description |
| `status` | string | Current status |
| `startedAt` | string | ISO timestamp when started |
| `completedAt` | string | ISO timestamp when finished |
| `duration` | number | Duration in milliseconds |
| `notes` | string | Completion notes |
| `lastError` | string | Most recent error message |
| `lastErrorAt` | string | ISO timestamp of last error |
| `retryCount` | number | Number of retry attempts |
| `stuckDetected` | boolean | True if auto-failed due to timeout |

---

## Source of Truth

### The Two-File System

1. **Markdown Plan File** (`docs/plans/<plan>.md`)
   - Human-readable reference documentation
   - Describes WHAT needs to be done
   - **Read-only during execution**
   - Contains task descriptions and checkboxes (for reference only)

2. **status.json** (`docs/plan-outputs/<plan>/status.json`)
   - Machine-readable execution state
   - Tracks which tasks are done, in progress, or failed
   - **The authoritative source of truth**
   - Updated by status-cli.js commands

### Important Rules

1. **NEVER modify markdown checkboxes** (`- [x]`) during execution
2. **ALWAYS use status-cli.js** to update task status
3. **Read task state from status.json**, not markdown
4. The `sync-check` command can detect discrepancies

### Why Two Files?

| Markdown | status.json |
|----------|-------------|
| Easy to read/review | Easy to parse programmatically |
| Version control friendly | Atomic updates via locking |
| Describes the plan | Tracks execution state |
| Can be re-executed | Fresh status for each execution |

---

## Troubleshooting

### Common Issues

#### "No active plan set"

Set the active plan first:
```bash
# Using the plan:set command
/plan:set

# Or manually
echo "docs/plans/my-plan.md" > .claude/current-plan.txt
```

#### "Failed to acquire lock"

Another process may be writing to status.json. The lock system uses:
- 10 second timeout for lock acquisition
- 60 second stale lock detection
- Automatic stale lock cleanup

If stuck, manually remove the lock:
```bash
rm docs/plan-outputs/<plan>/status.json.lock
```

#### "Summary mismatch detected"

The summary counts don't match actual task counts. This is auto-fixed on load, but you can force validation:
```bash
node scripts/status-cli.js validate
```

#### "Stuck task detected"

Tasks in_progress for >30 minutes are auto-marked as failed. This prevents infinite loops. Check the error message for details.

#### Corrupt status.json

Recovery attempts in order:
1. Restore from `status.json.bak` (automatic backup)
2. Rebuild from markdown (all tasks reset to pending)

Force rebuild:
```bash
rm docs/plan-outputs/<plan>/status.json
# Next status-cli command will rebuild from markdown
```

### Debug Commands

```bash
# Check what status-cli sees
node scripts/status-cli.js status | jq .

# Verify summary matches actual counts
node scripts/status-cli.js validate

# Compare markdown vs status.json
node scripts/status-cli.js sync-check

# Check for stuck tasks
node scripts/status-cli.js detect-stuck

# View task that can be retried
node scripts/status-cli.js retryable
```

### Log Analysis

When using the Python orchestrator with `--verbose`:
- Check for "Lock timeout" messages
- Look for "Summary drift" warnings
- Monitor "Stuck task" detections

---

## Configuration

### Lock Settings (plan-output-utils.js)

| Setting | Default | Description |
|---------|---------|-------------|
| `LOCK_TIMEOUT_MS` | 10000 | Max wait for lock acquisition |
| `STALE_LOCK_MS` | 60000 | Age at which lock is considered stale |
| `MAX_RETRIES` | 2 | Maximum task retry attempts |
| `STUCK_TASK_THRESHOLD_MS` | 1800000 | 30 minutes until task marked stuck |

### Orchestrator Settings (plan_orchestrator.py)

| Setting | Default | Description |
|---------|---------|-------------|
| `DEFAULT_MAX_ITERATIONS` | 50 | Maximum Claude invocations |
| `DEFAULT_TIMEOUT` | 600 | Seconds per session |
| `DEFAULT_BATCH_SIZE` | 5 | Tasks per iteration hint |
| `STATUS_CHECK_INTERVAL` | 2 | Seconds between status checks |

---

## Related Documentation

- [Plan Commands](../docs/claude-commands/) - `/plan:*` command reference
- [Plan Templates](../docs/plan-templates/) - Creating new plans
- [Architecture](../docs/architecture/) - System design documentation
