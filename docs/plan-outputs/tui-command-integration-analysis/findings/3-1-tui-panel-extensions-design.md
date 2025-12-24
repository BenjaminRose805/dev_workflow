# Task 3.1: TUI Panel Extensions Design

## Overview

This document designs new TUI panels to address the gaps identified in Phase 2 analysis.

---

## Current Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│ header (5 rows)                                         │
├─────────────────────────────────────────────────────────┤
│ progress (3 rows)                                       │
├─────────────────────────────────────────────────────────┤
│ activity (10 rows)                                      │
├───────────────────────────┬─────────────────────────────┤
│ in_progress (8 rows)      │ completions (8 rows)        │
├───────────────────────────┴─────────────────────────────┤
│ footer (2 rows)                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Proposed Extended Layout

```
┌─────────────────────────────────────────────────────────┐
│ header (4 rows) - Condensed                             │
├─────────────────────────────────────────────────────────┤
│ progress + phase_detail (4 rows)                        │
├─────────────────────────────┬───────────────────────────┤
│ activity (8 rows)           │ dependency_graph (8 rows) │
├─────────────────────────────┼───────────────────────────┤
│ in_progress (6 rows)        │ upcoming (6 rows)         │
├─────────────────────────────┼───────────────────────────┤
│ completions (5 rows)        │ run_history (5 rows)      │
├─────────────────────────────┴───────────────────────────┤
│ footer (2 rows)                                         │
└─────────────────────────────────────────────────────────┘
```

**Total rows:** ~38 (fits 40+ row terminal)

---

## New Panel Designs

### 1. Dependency Graph Panel

**Purpose:** Visualize task dependencies and blocking relationships (addresses B1)

**Location:** Right side of activity panel

**Size:** 8 rows x 50% width

**Data Source:**
- `plan-orchestrator.js check TASK_ID` for blockers
- `status.json` task statuses

**Visual Design:**
```
┌ Dependency Graph ────────────────────┐
│ 1.1 ✓ ─┬─► 2.1 ● ─┬─► 2.6 ◯        │
│        │          └─► 2.7 ◯        │
│        └─► 2.2 ✓ ─┬─► 2.3 ●        │
│                   └─► 2.4 ◯        │
│ 1.2 ✓ ──► 2.5 ●                    │
│                                     │
│ Legend: ✓ complete ● in_progress ◯ │
└─────────────────────────────────────┘
```

**Legend:**
- `✓` - Completed task (green)
- `●` - In progress (yellow)
- `◯` - Pending (dim)
- `✗` - Failed (red)
- `─►` - Dependency arrow

**Implementation Notes:**
- Use Rich's box-drawing characters
- Show current phase tasks only (avoid overwhelming)
- Highlight selected task's dependencies
- Scroll for larger graphs

**Complexity:** HIGH - Requires graph layout algorithm

---

### 2. Phase Detail Panel

**Purpose:** Show all phases with individual progress (addresses G1)

**Location:** Merged with progress bar row

**Size:** 4 rows

**Data Source:**
- `plan-orchestrator.js phases`

**Visual Design:**
```
┌ Phase Progress ─────────────────────────────────────────┐
│ [████████████████████████████████░░░░░░░░] 80% 24/30    │
│                                                         │
│ P1 ████████ 100%  P2 ██████░░ 75%  P3 ░░░░░░░░ 0%      │
│ Discovery         Analysis         Synthesis            │
└─────────────────────────────────────────────────────────┘
```

**Features:**
- Main progress bar (current behavior)
- Per-phase mini progress bars
- Current phase highlighted
- VERIFY tasks indicated with marker

**Implementation Notes:**
- Query `phases` command on startup and status change
- Cache phase data, update on task completion
- Highlight current phase with color

**Complexity:** LOW - Simple Rich Progress bars

---

### 3. Upcoming Tasks Panel

**Purpose:** Show next N pending tasks (addresses G5)

**Location:** Right side of in_progress panel

**Size:** 6 rows x 50% width

**Data Source:**
- `plan-orchestrator.js next N`
- Already used internally for prompts

**Visual Design:**
```
┌ Upcoming ────────────────────────────┐
│ [1] 2.3 Define data contracts...     │
│ [2] 2.4 Design keyboard nav...       │
│ [3] 2.5 Plan workflow support...     │
│ [4] 2.6 VERIFY: All gaps doc...      │
│     ──────────────────               │
│     Press [i] to implement selected  │
└──────────────────────────────────────┘
```

**Features:**
- Numbered list for keyboard selection
- Truncated descriptions
- VERIFY tasks highlighted
- Selection indicator for keyboard nav

**Implementation Notes:**
- Reuse existing `get_next_tasks()` call
- Add selection cursor state
- Update on status change

**Complexity:** LOW - Similar to existing panels

---

### 4. Run History Panel

**Purpose:** Show historical run data (addresses E5)

**Location:** Right side of completions panel

**Size:** 5 rows x 50% width

**Data Source:**
- `status.json.runs` array
- `status.json.runCount`

**Visual Design:**
```
┌ Run History ─────────────────────────┐
│ Run  Started     Duration   Tasks    │
│ ─────────────────────────────────────│
│ #3   Today 14:30   1h 23m   +8 ✓ 1✗ │
│ #2   Today 10:15   45m      +5 ✓ 0✗ │
│ #1   Yest  16:00   2h 10m   +12 ✓ 2✗│
└──────────────────────────────────────┘
```

**Features:**
- Run number, start time, duration
- Tasks completed/failed in that run
- Current run highlighted
- Scrollable for many runs

**Implementation Notes:**
- Read `runs` array from status.json
- Calculate duration from start/complete timestamps
- Track tasks completed per run

**Complexity:** LOW - Data already stored

---

### 5. Findings Browser (Modal)

**Purpose:** View task findings inline (addresses G2)

**Trigger:** Press `f` on selected task

**Size:** Full screen overlay (modal)

**Data Source:**
- `status-cli.js read-findings TASK_ID`
- Direct file read: `findings/{task-id}-*.md`

**Visual Design:**
```
┌──────────────────────────────────────────────────────────┐
│ Findings: 2.5 Severity Categorization                    │
│ ────────────────────────────────────────────────────────│
│                                                          │
│ ## Overview                                              │
│                                                          │
│ This document categorizes all findings from Phase 2      │
│ analysis by severity level...                            │
│                                                          │
│ | Severity | Count |                                     │
│ |----------|-------|                                     │
│ | BLOCKER  | 4     |                                     │
│ | GAP      | 10    |                                     │
│ ...                                                      │
│                                                          │
│ [↑/↓ Scroll] [q Close] [n Next Finding] [p Prev Finding]│
└──────────────────────────────────────────────────────────┘
```

**Features:**
- Markdown rendering via Rich
- Scroll with arrow keys
- Navigate between findings with n/p
- Close with q/Esc

**Implementation Notes:**
- Use Rich Markdown component
- Create modal overlay class
- Glob findings directory for task files

**Complexity:** MEDIUM - Modal + markdown rendering

---

### 6. Retry History Indicator

**Purpose:** Show per-task retry information (addresses G3)

**Location:** Integrated into in_progress and completions panels

**Data Source:**
- `task.retryCount` from status.json
- `task.retryErrors` array

**Visual Design:**
```
┌ In Progress ─────────────────────────┐
│ [▶] 2.3 Define data contracts...     │
│ [▶] 2.4 Design keyboard [Retry 2/3] │
│     └─ Last error: Timeout after... │
└──────────────────────────────────────┘
```

**Features:**
- `[Retry N/3]` suffix for retried tasks
- Expandable error message on selection
- Color-code based on retry count (yellow→red)

**Implementation Notes:**
- Extend `_render_tasks_in_progress()`
- Check `retryCount` field in task objects
- Truncate error messages to 40 chars

**Complexity:** LOW - Minor panel modification

---

## Layout Modes

### Standard Mode (Default)
- All panels visible
- Optimized for 80x40 terminal

### Compact Mode (Small Terminal)
- Hide run_history, dependency_graph
- Stack panels vertically
- Optimized for 80x24 terminal

### Focus Mode (Keyboard Toggle: `F`)
- Maximize selected panel
- Other panels hidden
- Good for dependency graph or findings

---

## Panel Visibility Configuration

Allow toggling panels with keyboard:

| Key | Panel | Default |
|-----|-------|---------|
| `1` | dependency_graph | ON |
| `2` | phase_detail | ON |
| `3` | upcoming | ON |
| `4` | run_history | OFF |
| `5` | retry_info | ON |

Configuration stored in `~/.config/claude-code/tui-panels.json`

---

## Implementation Priority

| Panel | Addresses | Complexity | Priority |
|-------|-----------|------------|----------|
| Phase Detail | G1 | LOW | 1 |
| Upcoming Tasks | G5 | LOW | 2 |
| Retry Indicator | G3 | LOW | 3 |
| Run History | E5 | LOW | 4 |
| Findings Browser | G2 | MEDIUM | 5 |
| Dependency Graph | B1 | HIGH | 6 |

---

## Technical Considerations

### Rich Library Usage

```python
# New panel rendering method example
def _render_phase_detail(self) -> Panel:
    """Render phase progress bars."""
    content = Table.grid(expand=True)

    for phase in self.phases:
        bar = ProgressBar(
            completed=phase['completed'],
            total=phase['total'],
            width=8
        )
        content.add_row(
            f"P{phase['number']}",
            bar,
            f"{phase['percentage']}%"
        )

    return Panel(content, title="Phase Progress", border_style="dim")
```

### Layout Modification

```python
# Extended layout structure
layout = Layout()
layout.split(
    Layout(name="header", size=4),
    Layout(name="progress", size=4),
    Layout(name="middle", size=14),
    Layout(name="lower", size=11),
    Layout(name="footer", size=2)
)

layout["middle"].split_row(
    Layout(name="activity"),
    Layout(name="dependency_graph")
)

layout["lower"].split_row(
    Layout(name="left"),
    Layout(name="right")
)

layout["lower"]["left"].split(
    Layout(name="in_progress"),
    Layout(name="completions")
)

layout["lower"]["right"].split(
    Layout(name="upcoming"),
    Layout(name="run_history")
)
```

---

## Summary

| New Panel | Purpose | Gap Addressed | Priority |
|-----------|---------|---------------|----------|
| Dependency Graph | Show task relationships | B1 | HIGH (complex) |
| Phase Detail | Per-phase progress | G1 | HIGH (easy win) |
| Upcoming Tasks | Next N tasks | G5 | HIGH (easy win) |
| Run History | Session statistics | E5 | MEDIUM |
| Findings Browser | View task outputs | G2 | MEDIUM |
| Retry Indicator | Per-task retry info | G3 | HIGH (easy win) |

Total new panels: 6 (5 permanent + 1 modal)
