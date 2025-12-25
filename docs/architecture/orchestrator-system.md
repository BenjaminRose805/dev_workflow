# Orchestrator System Architecture

This document describes the architecture and data flow of the Plan Orchestrator system.

## System Overview

```
                              ┌─────────────────────────────────────────────────────────────┐
                              │                    PLAN ORCHESTRATOR                         │
                              └────────────────────────────┬────────────────────────────────┘
                                                           │
                                                           ▼
           ┌─────────────────────────────────────────────────────────────────────────────────┐
           │                                 ENTRY POINTS                                     │
           ├─────────────────────────────────────────────────────────────────────────────────┤
           │                                                                                  │
           │   ┌─────────────────────────┐        ┌─────────────────────────┐                │
           │   │   Claude Code Commands   │        │   Python TUI Orchestrator │               │
           │   │   (.claude/commands/)    │        │   (plan_orchestrator.py)  │               │
           │   │                          │        │                            │               │
           │   │  /plan:implement         │        │  - Rich TUI display        │               │
           │   │  /plan:batch             │        │  - Activity tracking       │               │
           │   │  /plan:verify            │        │  - Status monitoring       │               │
           │   │  /plan:orchestrate       │        │  - Retry logic             │               │
           │   │  /plan:status            │        │                            │               │
           │   └──────────┬───────────────┘        └──────────┬─────────────────┘               │
           │              │                                   │                                │
           └──────────────┼───────────────────────────────────┼────────────────────────────────┘
                          │                                   │
                          ▼                                   ▼
           ┌─────────────────────────────────────────────────────────────────────────────────┐
           │                               STATUS CLI                                         │
           │                          (scripts/status-cli.js)                                 │
           ├─────────────────────────────────────────────────────────────────────────────────┤
           │                                                                                  │
           │   Commands:                                                                      │
           │   ├── status                 Show current plan status                            │
           │   ├── mark-started <id>      Mark task as in_progress                           │
           │   ├── mark-complete <id>     Mark task as completed                             │
           │   ├── mark-failed <id>       Mark task as failed                                │
           │   ├── mark-skipped <id>      Mark task as skipped                               │
           │   ├── next [count]           Get next recommended tasks                          │
           │   ├── progress               Show formatted progress bar                         │
           │   ├── validate               Validate and repair status.json                    │
           │   ├── sync-check             Compare markdown vs status.json                    │
           │   ├── write-findings <id>    Write task findings                                │
           │   ├── start-run              Start execution run                                 │
           │   ├── complete-run <id>      Complete execution run                             │
           │   ├── retryable              Get retryable failed tasks                         │
           │   └── detect-stuck           Detect and mark stuck tasks                        │
           │                                                                                  │
           └──────────────────────────────────────────┬───────────────────────────────────────┘
                                                      │
                                                      ▼
           ┌─────────────────────────────────────────────────────────────────────────────────┐
           │                             PLAN STATUS API                                      │
           │                        (scripts/lib/plan-status.js)                              │
           ├─────────────────────────────────────────────────────────────────────────────────┤
           │                                                                                  │
           │   Path Resolution:                                                               │
           │   ├── getActivePlanPath()               Get current active plan                  │
           │   ├── getOutputDir(planPath)            Get output directory path                │
           │   └── getStatusPath(planPath)           Get status.json path                     │
           │                                                                                  │
           │   Core I/O:                                                                      │
           │   ├── loadStatus(planPath)              Load status.json with validation        │
           │   ├── saveStatus(planPath, status)      Atomic save with locking                │
           │   └── initializePlanStatus(planPath)    Create status.json from markdown        │
           │                                                                                  │
           │   Task Updates:                                                                  │
           │   ├── markTaskStarted(planPath, id)     Mark task as in_progress                │
           │   ├── markTaskCompleted(planPath, id)   Mark task as completed                  │
           │   ├── markTaskFailed(planPath, id)      Mark task as failed                     │
           │   └── markTaskSkipped(planPath, id)     Mark task as skipped                    │
           │                                                                                  │
           │   Queries:                                                                       │
           │   ├── getNextTasks(planPath, count)     Get pending tasks                        │
           │   ├── getProgress(planPath)             Get progress summary                     │
           │   └── getStatusSummary(planPath)        Get full status                          │
           │                                                                                  │
           │   Findings & Runs:                                                               │
           │   ├── writeFindings(planPath, id, ...)  Write task findings                      │
           │   ├── readFindings(planPath, id)        Read task findings                       │
           │   ├── startRun(planPath)                Start execution run                      │
           │   └── completeRun(planPath, runId, ...) Complete execution run                   │
           │                                                                                  │
           └──────────────────────────────────────────┬───────────────────────────────────────┘
                                                      │
                          ┌───────────────────────────┴───────────────────────────┐
                          │                                                       │
                          ▼                                                       ▼
           ┌────────────────────────────────────┐          ┌────────────────────────────────────┐
           │          FILE UTILITIES             │          │         PROPER-LOCKFILE            │
           │    (scripts/lib/file-utils.js)      │          │         (npm package)              │
           ├────────────────────────────────────┤          ├────────────────────────────────────┤
           │                                    │          │                                    │
           │  writeFileAtomic(path, content)    │          │  - Cross-platform file locking     │
           │  - Temp file + rename pattern      │          │  - Exponential backoff retry       │
           │  - Prevents partial writes         │          │  - Stale lock detection            │
           │  - Crash-safe                      │          │  - Configurable timeouts           │
           │                                    │          │                                    │
           └────────────────────────────────────┘          └────────────────────────────────────┘
                          │                                                       │
                          └───────────────────────────┬───────────────────────────┘
                                                      │
                                                      ▼
           ┌─────────────────────────────────────────────────────────────────────────────────┐
           │                              FILE SYSTEM                                         │
           ├─────────────────────────────────────────────────────────────────────────────────┤
           │                                                                                  │
           │   Plan Files (Read-Only Reference):                                             │
           │   └── docs/plans/<plan-name>.md                                                 │
           │       - Task definitions                                                        │
           │       - Phase structure                                                         │
           │       - NOT modified during execution                                           │
           │                                                                                  │
           │   Output Directory (The Source of Truth):                                       │
           │   └── docs/plan-outputs/<plan-name>/                                            │
           │       ├── status.json       Task execution state                               │
           │       ├── status.json.bak   Backup for recovery                                │
           │       ├── status.json.lock  Lock file (during writes)                          │
           │       ├── findings/         Task output artifacts                              │
           │       │   └── <task-id>.md                                                     │
           │       └── timestamps/       Execution timing data                              │
           │                                                                                  │
           │   Pointer Files:                                                                │
           │   └── .claude/current-plan.txt        Active plan path                          │
           │       (Output directory derived from plan name: plan-outputs/{plan-name}/)      │
           │                                                                                  │
           └─────────────────────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Task Execution Flow

```
User runs /plan:implement 1.1
            │
            ▼
┌───────────────────────────────┐
│  1. Load Active Plan          │
│     Read .claude/current-plan.txt
│     Load status.json          │
└───────────────────────────────┘
            │
            ▼
┌───────────────────────────────┐
│  2. Mark Task Started         │
│     status-cli.js mark-started │
│     Updates status.json        │
│     Records startedAt timestamp│
└───────────────────────────────┘
            │
            ▼
┌───────────────────────────────┐
│  3. Execute Task              │
│     Read plan for details     │
│     Make code changes         │
│     Run tests if needed       │
└───────────────────────────────┘
            │
            ├─── Success ───────┐
            │                   ▼
            │    ┌───────────────────────────────┐
            │    │  4a. Mark Complete            │
            │    │     status-cli.js mark-complete│
            │    │     Updates status.json        │
            │    │     Records completedAt        │
            │    │     Optionally writes findings │
            │    └───────────────────────────────┘
            │
            └─── Failure ───────┐
                                ▼
                 ┌───────────────────────────────┐
                 │  4b. Mark Failed              │
                 │     status-cli.js mark-failed  │
                 │     Updates status.json        │
                 │     Increments retryCount      │
                 │     Records lastError          │
                 └───────────────────────────────┘
```

### Concurrent Write Protection

```
Process A                              Process B
    │                                      │
    ▼                                      ▼
┌─────────────┐                    ┌─────────────┐
│ acquireLock │                    │ acquireLock │
│  (status.json)                   │  (status.json)
└──────┬──────┘                    └──────┬──────┘
       │                                  │
       ▼                                  │
   Lock Acquired                          │  (waiting with
       │                                  │   exponential
       ▼                                  │   backoff)
┌─────────────┐                           │
│ Read status │                           │
│ Modify task │                           │
│ Write atomic│                           │
└──────┬──────┘                           │
       │                                  │
       ▼                                  │
   Release Lock ──────────────────────────┤
       │                                  │
       ▼                                  ▼
     Done                           Lock Acquired
                                         │
                                         ▼
                                   ┌─────────────┐
                                   │ Read status │
                                   │ (sees A's   │
                                   │  changes)   │
                                   │ Modify task │
                                   │ Write atomic│
                                   └─────────────┘
```

### Recovery Flow

```
┌─────────────────────────────────────────────────────┐
│                  loadStatus(planPath)                │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
                ┌───────────────┐
                │ Parse status  │
                │    .json      │
                └───────┬───────┘
                        │
         ┌──── Success ─┼──── Parse Error ────┐
         │              │                      │
         ▼              │                      ▼
    Return status       │           ┌───────────────────┐
                        │           │ Try .json.bak     │
                        │           │ (backup file)     │
                        │           └─────────┬─────────┘
                        │                     │
                        │      ┌──── Success ─┼──── Fail ────┐
                        │      │              │              │
                        │      ▼              │              ▼
                        │  Restore backup     │   ┌───────────────────┐
                        │  Return status      │   │ Rebuild from      │
                        │                     │   │ markdown plan     │
                        │                     │   │ (all tasks reset  │
                        │                     │   │  to pending)      │
                        │                     │   └─────────┬─────────┘
                        │                     │             │
                        │                     │             ▼
                        │                     │      Return rebuilt
                        │                     │         status
                        │                     │
                        └─────────────────────┴─────────────────────────
```

## Status.json Schema

```json
{
  "_comment": "Authoritative source of truth for task execution state",

  "planPath": "docs/plans/example.md",
  "planName": "Example Plan",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "lastUpdatedAt": "2025-01-01T12:00:00.000Z",
  "currentPhase": "Phase 1: Implementation",

  "tasks": [
    {
      "id": "1.1",
      "phase": "Phase 1: Implementation",
      "description": "Implement feature X",
      "status": "completed",          // pending | in_progress | completed | failed | skipped
      "startedAt": "2025-01-01T10:00:00.000Z",
      "completedAt": "2025-01-01T10:30:00.000Z",
      "duration": 1800000,            // milliseconds
      "notes": "Implemented with caching",

      // Failure tracking (if failed)
      "lastError": "Build failed",
      "lastErrorAt": "2025-01-01T10:15:00.000Z",
      "retryCount": 1,
      "stuckDetected": false
    }
  ],

  "runs": [
    {
      "runId": "run-1704067200000",
      "startedAt": "2025-01-01T10:00:00.000Z",
      "completedAt": "2025-01-01T11:00:00.000Z",
      "tasksCompleted": 5,
      "tasksFailed": 1
    }
  ],

  "summary": {
    "totalTasks": 10,
    "completed": 5,
    "pending": 3,
    "in_progress": 1,
    "failed": 1,
    "skipped": 0
  }
}
```

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

---

## Configuration

### Lock Settings

| Constant | Value | Description |
|----------|-------|-------------|
| `LOCK_TIMEOUT_MS` | 10000 | Max time to wait for lock acquisition |
| `STALE_LOCK_MS` | 60000 | Lock age threshold for staleness |
| `MAX_RETRIES` | 2 | Maximum task retry attempts |
| `STUCK_TASK_THRESHOLD_MS` | 1800000 | 30 minutes until task marked stuck |

### Retry Backoff Settings

| Constant | Value | Description |
|----------|-------|-------------|
| `retries` | 10 | Number of lock acquisition retries |
| `factor` | 1.5 | Exponential backoff factor |
| `minTimeout` | 100 | Minimum wait between retries (ms) |
| `maxTimeout` | 2000 | Maximum wait between retries (ms) |
| `randomize` | true | Add jitter to prevent thundering herd |

### Orchestrator Settings (plan_orchestrator.py)

| Setting | Default | Description |
|---------|---------|-------------|
| `DEFAULT_MAX_ITERATIONS` | 50 | Maximum Claude invocations |
| `DEFAULT_TIMEOUT` | 600 | Seconds per session |
| `DEFAULT_BATCH_SIZE` | 5 | Tasks per iteration hint |
| `STATUS_CHECK_INTERVAL` | 2 | Seconds between status checks |

## Component Responsibilities

| Component | Responsibility |
|-----------|---------------|
| **status-cli.js** | CLI interface for all status operations; the preferred way to update status |
| **plan-status.js** | Unified API: path resolution, status I/O, task updates, queries, findings, runs |
| **plan-output-utils.js** | Low-level status operations; file locking; atomic writes; recovery |
| **file-utils.js** | Low-level file operations; atomic write implementation |
| **proper-lockfile** | Cross-platform file locking with retry logic |
| **plan_orchestrator.py** | Autonomous execution with TUI; retry orchestration; streaming output parsing |

## See Also

- [Plan Commands](../../.claude/commands/plan/) - Claude Code command documentation
- [Plan Templates](../plan-templates/) - Creating new plans
- [Architecture Overview](../ARCHITECTURE.md) - System design documentation
