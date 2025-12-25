# Task 1.4: TUI-to-Command Integration Points

## Overview

This document maps the integration points between the TUI (`plan_orchestrator.py`) and the plan commands (`status-cli.js`, `plan-orchestrator.js`).

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     plan_orchestrator.py (TUI)                  │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │RichTUIManager│  │StatusMonitor │  │StreamingClaudeRunner│   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                  │                  │                  │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│plan-runner.sh   │  │status.json      │  │Claude CLI       │
│                 │  │(file watch)     │  │(stream-json)    │
└────────┬────────┘  └─────────────────┘  └─────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                     plan-orchestrator.js                         │
│                                                                 │
│  Commands: status, next, check, phases                          │
└────────┬────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                       status-cli.js                              │
│                                                                 │
│  Commands: mark-started, mark-complete, mark-failed, progress   │
│            retryable, exhausted, detect-stuck, validate         │
└────────┬────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    plan-output-utils.js                          │
│                                                                 │
│  Functions: loadStatus, saveStatus, updateTaskStatus, etc.      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Integration Point Details

### 1. Status Query (TUI → plan-orchestrator.js)

**Location:** `PlanOrchestrator.get_status()` (line 815-835)

**Command:**
```bash
./scripts/plan-runner.sh status
→ node scripts/plan-orchestrator.js status
```

**Response:**
```json
{
  "planPath": "docs/plans/example.md",
  "planName": "Example Plan",
  "total": 30,
  "completed": 10,
  "inProgress": 2,
  "pending": 18,
  "failed": 0,
  "skipped": 0,
  "percentage": 33,
  "currentPhase": "Phase 1: Discovery"
}
```

**Used For:**
- Initial status check
- Main loop status updates
- Completion detection
- Block detection

---

### 2. Next Tasks Query (TUI → plan-orchestrator.js)

**Location:** `PlanOrchestrator.get_next_tasks()` (line 840-856)

**Command:**
```bash
./scripts/plan-runner.sh next 5
→ node scripts/plan-orchestrator.js next 5
```

**Response:**
```json
{
  "count": 3,
  "tasks": [
    {"id": "1.1", "description": "...", "phase": 1, "status": "pending", "reason": "pending - ready to implement"},
    ...
  ]
}
```

**Used For:**
- Building Claude prompt
- Displaying upcoming tasks (though not shown in TUI currently)

---

### 3. Retryable Tasks Query (TUI → status-cli.js)

**Location:** `PlanOrchestrator.get_retryable_tasks()` (line 858-875)

**Command:**
```bash
node scripts/status-cli.js retryable
```

**Response:**
```json
{
  "count": 2,
  "tasks": [
    {"id": "1.3", "retryCount": 1, ...},
    ...
  ]
}
```

**Used For:**
- Recovery from blocked state
- Retry logic in main loop

---

### 4. Retry Increment (TUI → status-cli.js)

**Location:** `PlanOrchestrator.increment_retry()` (line 877-892)

**Command:**
```bash
node scripts/status-cli.js increment-retry TASK_ID --error "message"
```

**Response:**
```json
{
  "taskId": "1.3",
  "newRetryCount": 2,
  "canRetry": true
}
```

**Used For:**
- Tracking retry attempts
- Determining if task is exhausted

---

### 5. Task Reset for Retry (TUI → status-cli.js)

**Location:** `PlanOrchestrator.reset_task_for_retry()` (line 894-905)

**Command:**
```bash
node scripts/status-cli.js mark-started TASK_ID
```

**Response:**
```json
{
  "success": true,
  "taskId": "1.3",
  "status": "in_progress"
}
```

**Used For:**
- Resetting failed tasks to retry

---

### 6. Stuck Task Detection (TUI → status-cli.js)

**Location:** `PlanOrchestrator.detect_stuck_tasks()` (line 907-923)

**Command:**
```bash
node scripts/status-cli.js detect-stuck
```

**Response:**
```json
{
  "thresholdMinutes": 30,
  "stuckCount": 1,
  "stuckTasks": [
    {"id": "1.5", "elapsedMinutes": 45, ...}
  ]
}
```

**Used For:**
- Automatic recovery from stuck in_progress tasks
- Marking stuck tasks as failed

---

### 7. Status File Monitoring (TUI ↔ status.json)

**Location:** `StatusMonitor` class (line 354-445)

**File Watched:** `docs/plan-outputs/{plan-name}/status.json`

**Update Mechanism:**
- Polling every 500ms (fallback)
- inotify instant updates (Linux, if available)

**Callback Chain:**
```python
_check_status()
    → read status.json
    → _on_status_update(status_data)
        → tui.set_progress(...)
        → tui.set_phase(...)
        → tui.update_tasks(...)
```

---

### 8. Claude Session Streaming (TUI ↔ Claude CLI)

**Location:** `StreamingClaudeRunner` class (line 189-348)

**Command:**
```bash
claude -p "prompt" --dangerously-skip-permissions --output-format stream-json --verbose
```

**Event Parsing:**
```python
for line in process.stdout:
    data = json.loads(line)
    if data['type'] == 'assistant':
        for content in data['message']['content']:
            if content['type'] == 'tool_use':
                on_tool_start(...)
    elif data['type'] == 'user':
        for content in data['message']['content']:
            if content['type'] == 'tool_result':
                on_tool_end(...)
```

**Callback Chain:**
```python
on_tool_start(tool_name, details)
    → tui.add_activity(tool_name, details)
        → activity_tracker.tool_started(...)
        → refresh()

on_tool_end(tool_name, tool_id, duration)
    → tui.complete_activity(tool_id, duration)
        → activity_tracker.tool_completed(...)
        → refresh()
```

---

### 9. Prompt Generation (TUI → Claude)

**Location:** `PlanOrchestrator._build_prompt()` (line 1251-1310)

**Prompt Structure:**
```
Execute these tasks from the plan:
  - {task_id}: {description}
  ...

Plan: {plan_path}
Progress: {percentage}% ({completed}/{total} tasks)

## How to Implement Each Task
1. Mark task started: node scripts/status-cli.js mark-started TASK_ID
2. Read the plan file...
3. Implement the task...
4. Mark task complete: node scripts/status-cli.js mark-complete TASK_ID --notes "..."

## If a Task Fails
node scripts/status-cli.js mark-failed TASK_ID --error "..."
```

---

## Data Flow Summary

### Status Updates (Read Path)

```
status.json
    ↓ (StatusMonitor watches file)
_on_status_update(status_data)
    ├→ tui.set_progress(completed, total, pending, failed, in_progress)
    ├→ tui.set_phase(currentPhase)
    └→ tui.update_tasks(in_progress_tasks, recent_completions)
```

### Task Execution (Write Path)

```
Claude Session
    ↓ (executes task)
node scripts/status-cli.js mark-started TASK_ID
    ↓
status.json updated
    ↓ (StatusMonitor detects change)
TUI reflects new in_progress task
    ↓
node scripts/status-cli.js mark-complete TASK_ID
    ↓
status.json updated
    ↓
TUI reflects completion
```

### Error Recovery (Recovery Path)

```
TUI Main Loop
    ↓ (detects is_blocked)
get_retryable_tasks()
    ↓ (found retryable)
reset_task_for_retry(task_id)
    ↓
Continue loop with fresh status
```

---

## Integration Gaps Identified

### 1. No Direct Command Invocation

The TUI cannot invoke slash commands like `/plan:split` or `/plan:verify`.
It only:
- Queries status via CLI scripts
- Monitors status.json changes
- Launches Claude sessions with prompts

### 2. Limited Keyboard Navigation

No current support for:
- Task selection via keyboard
- Phase navigation
- Command palette

### 3. No Findings Browser

The TUI doesn't display:
- Contents of `findings/` directory
- Artifact generation status
- Run history details

### 4. Dependency Visualization Missing

No display of:
- Task dependencies
- Blocking relationships
- Parallel execution groups

---

## Integration Points by Script

### plan-runner.sh

| Command | TUI Usage | Integration Type |
|---------|-----------|------------------|
| `status` | `get_status()` | Subprocess call |
| `next` | `get_next_tasks()` | Subprocess call |
| `check` | Not used | - |
| `phases` | Not used | - |

### status-cli.js

| Command | TUI Usage | Integration Type |
|---------|-----------|------------------|
| `status` | Not directly (via plan-runner.sh) | - |
| `mark-started` | `reset_task_for_retry()` | Subprocess call |
| `mark-complete` | Not used (Claude executes) | - |
| `mark-failed` | Not used (Claude executes) | - |
| `progress` | Not used | - |
| `retryable` | `get_retryable_tasks()` | Subprocess call |
| `exhausted` | Not used | - |
| `increment-retry` | `increment_retry()` | Subprocess call |
| `detect-stuck` | `detect_stuck_tasks()` | Subprocess call |
| `validate` | Not used | - |

### plan-orchestrator.js

| Command | TUI Usage | Integration Type |
|---------|-----------|------------------|
| `status` | Via plan-runner.sh | Indirect |
| `next` | Via plan-runner.sh | Indirect |
| `check` | Not used | - |
| `phases` | Not used | - |

---

## Recommendations for Expansion

1. **Add command invocation capability** - Allow TUI to invoke `/plan:*` commands directly
2. **Implement keyboard shortcuts** - Map common actions to hotkeys
3. **Add findings panel** - Browse task findings inline
4. **Show dependency graph** - Visualize task relationships
5. **Add phase navigation** - Jump between phases in TUI
6. **Integrate with more status-cli commands** - Use `validate`, `exhausted`, etc.
