# Task 1.2: TUI Panels to Data Sources Mapping

## Overview

The TUI is implemented in `scripts/plan_orchestrator.py` using the Rich library.
This document maps each TUI panel to its data sources.

---

## TUI Layout Structure

The TUI uses a `Layout` with 5 sections:

```python
layout.split(
    Layout(name="header", size=5),
    Layout(name="progress", size=3),
    Layout(name="activity", size=10),
    Layout(name="tasks", size=8),      # Split into two columns
    Layout(name="footer", size=2)
)

layout["tasks"].split_row(
    Layout(name="in_progress"),
    Layout(name="completions")
)
```

---

## Panel Data Source Mapping

### 1. Header Panel (`_render_header`)

**Visual Elements:**
- Plan name
- Current phase
- Iteration counter

**Data Sources:**
| Field | Source | Update Trigger |
|-------|--------|----------------|
| `plan_name` | `RichTUIManager.plan_name` | Set at initialization from `PlanStatus.plan_name` |
| `current_phase` | `RichTUIManager.current_phase` | Updated via `set_phase()` from `status.json` |
| `iteration` | `RichTUIManager.iteration` | Updated via `set_iteration()` in main loop |
| `max_iterations` | `RichTUIManager.max_iterations` | Set at initialization, updated via `set_iteration()` |

**Data Flow:**
```
plan-orchestrator.js status → PlanStatus → RichTUIManager
status.json (via StatusMonitor) → _on_status_update → set_phase()
Main loop → set_iteration()
```

---

### 2. Progress Panel (`_render_progress`)

**Visual Elements:**
- Progress bar (█░)
- Percentage complete
- Heartbeat indicator (Claude running spinner)
- Task counts (completed, pending, working, failed)
- Elapsed time

**Data Sources:**
| Field | Source | Update Trigger |
|-------|--------|----------------|
| `completed_tasks` | `RichTUIManager.completed_tasks` | `set_progress()` from status.json |
| `total_tasks` | `RichTUIManager.total_tasks` | `set_progress()` from status.json |
| `pending_tasks` | `RichTUIManager.pending_tasks` | `set_progress()` from status.json |
| `in_progress_count` | `RichTUIManager.in_progress_count` | `set_progress()` from status.json |
| `failed_tasks` | `RichTUIManager.failed_tasks` | `set_progress()` from status.json |
| `percentage` | Calculated in `_render_progress` | `(completed / total) * 100` |
| `claude_running` | `RichTUIManager.claude_running` | `set_claude_running()` around Claude sessions |
| `start_time` | `RichTUIManager.start_time` | Set at initialization |
| `last_activity_time` | `RichTUIManager.last_activity_time` | Updated on tool activity |

**Data Flow:**
```
status.json → StatusMonitor._check_status() → _on_status_update() → set_progress()
                            ↓
                    summary.completed
                    summary.totalTasks
                    summary.pending
                    summary.failed
                    summary.in_progress
```

---

### 3. Activity Panel (`_render_activity`)

**Visual Elements:**
- Recent tool calls table
- Timestamp, tool description, duration
- Status icon ([OK] or ...)

**Data Sources:**
| Field | Source | Update Trigger |
|-------|--------|----------------|
| Recent activities | `ActivityTracker.get_recent(8)` | Tool callbacks from streaming |
| Tool name | `Activity.tool_name` | From `StreamingClaudeRunner` events |
| Description | `Activity.description` | Formatted by `_format_description()` |
| Duration | `Activity.duration_seconds` | Calculated on tool completion |
| Status | `Activity.status` | started/completed |

**Data Flow:**
```
Claude CLI stream-json output
    ↓
StreamingClaudeRunner._parse_json_line()
    ↓
on_tool_start callback → RichTUIManager.add_activity() → ActivityTracker.tool_started()
on_tool_end callback → RichTUIManager.complete_activity() → ActivityTracker.tool_completed()
```

**Tool Description Formatting:**
```python
Read: truncated_path
Edit: truncated_path
Write: truncated_path
Bash: command[:35]...
Task: description
Grep: pattern[:20]
Glob: pattern[:20]
```

---

### 4. Tasks In Progress Panel (`_render_tasks_in_progress`)

**Visual Elements:**
- List of currently in_progress tasks
- Task ID and description (truncated)

**Data Sources:**
| Field | Source | Update Trigger |
|-------|--------|----------------|
| `tasks_in_progress` | `RichTUIManager.tasks_in_progress` | `update_tasks()` from status.json |
| Task ID | `task.id` | From status.json tasks array |
| Description | `task.description[:35]` | From status.json tasks array |

**Data Flow:**
```
status.json.tasks
    ↓ (filter status == 'in_progress')
_on_status_update() → update_tasks(in_progress, completions)
```

**Note:** This panel shows tasks from `status.json` with `status: "in_progress"`, NOT the result of `getNextTasks()`.

---

### 5. Completions Panel (`_render_completions`)

**Visual Elements:**
- List of recently completed tasks
- [OK] prefix with task ID and description

**Data Sources:**
| Field | Source | Update Trigger |
|-------|--------|----------------|
| `recent_completions` | `RichTUIManager.recent_completions` | `update_tasks()` from status.json |
| Task ID | `task.id` | From status.json tasks array |
| Description | `task.description[:30]` | From status.json tasks array |

**Data Flow:**
```
status.json.tasks
    ↓ (filter status == 'completed', take last 5, reverse)
_on_status_update() → update_tasks(in_progress, completions)
```

---

### 6. Footer Panel (`_render_footer`)

**Visual Elements:**
- Status message
- Tool statistics (total, agents, edits)

**Data Sources:**
| Field | Source | Update Trigger |
|-------|--------|----------------|
| `status_message` | `RichTUIManager.status_message` | `set_status()` throughout orchestration |
| `stats['total_tools']` | `ActivityTracker.stats` | Incremented on each tool call |
| `stats['agents_spawned']` | `ActivityTracker.stats` | Incremented on Task tool calls |
| `stats['edits']` | `ActivityTracker.stats` | Incremented on Edit tool calls |

---

## Background Processes

### StatusMonitor

**Purpose:** Watch `status.json` for changes and trigger TUI updates

**Location:** `scripts/plan_orchestrator.py:354-445`

**Configuration:**
- `interval`: 0.5 seconds (polling fallback)
- Uses `inotify` on Linux for instant updates (if available)

**Data Watched:**
- `docs/plan-outputs/{plan-name}/status.json`

**Callback:** `_on_status_update(status_data: Dict)`

---

### StreamingClaudeRunner

**Purpose:** Parse Claude CLI streaming JSON and extract tool events

**Location:** `scripts/plan_orchestrator.py:189-348`

**Event Types Parsed:**
- `type: "assistant"` with `content[].type: "tool_use"` → tool started
- `type: "user"` with `content[].type: "tool_result"` → tool completed
- `type: "assistant"` with `content[].type: "text"` → text output
- `type: "result"` → session complete

**Callbacks:**
- `on_tool_start(tool_name, details)` → `add_activity()`
- `on_tool_end(tool_name, tool_id, duration)` → `complete_activity()`
- `on_text(text)` → (not currently used for TUI)

---

## Data Update Frequencies

| Panel | Update Source | Frequency |
|-------|---------------|-----------|
| Header | status.json | 500ms polling or inotify instant |
| Progress | status.json | 500ms polling or inotify instant |
| Activity | Claude streaming | Real-time per tool call |
| In Progress | status.json | 500ms polling or inotify instant |
| Completions | status.json | 500ms polling or inotify instant |
| Footer | Internal state | On any activity |

**TUI Refresh Rate:** 4 FPS (`refresh_per_second=4`)

---

## status.json Schema (Used by TUI)

```json
{
  "planPath": "docs/plans/example.md",
  "planName": "Example Plan",
  "currentPhase": "Phase 1: Discovery",
  "lastUpdatedAt": "2025-12-24T10:00:00.000Z",
  "summary": {
    "totalTasks": 30,
    "completed": 10,
    "pending": 18,
    "in_progress": 2,
    "failed": 0,
    "skipped": 0
  },
  "tasks": [
    {
      "id": "1.1",
      "phase": "Phase 1: Discovery",
      "description": "Task description",
      "status": "completed",
      "startedAt": "...",
      "completedAt": "..."
    }
  ]
}
```

---

## Key Files

| File | Purpose |
|------|---------|
| `scripts/plan_orchestrator.py` | TUI implementation (RichTUIManager) |
| `scripts/plan-orchestrator.js` | Status query script |
| `scripts/status-cli.js` | Status update CLI |
| `scripts/lib/plan-output-utils.js` | status.json management |
| `docs/plan-outputs/{plan}/status.json` | Authoritative task status |
