# Task 2.3: Missing TUI Features from Orchestrator Exploration

## Overview

This analysis examines the specific TUI features identified as missing during the Phase 1 orchestrator exploration, with detailed assessment of current state and requirements.

---

## 1. Task Dependencies Visualization

### Current State

**From `plan_orchestrator.py`:**
- Dependencies are calculated in `plan-orchestrator.js:278-289` (80% phase completion rule)
- `getNextTasks()` respects dependencies when recommending tasks
- `checkTask()` returns `blockers` array for a specific task

**TUI Display:** None. The dependency logic runs server-side but results are not visualized.

### What's Missing

1. **Dependency Graph/Tree** - Visual representation of task→task dependencies
2. **Blocker Indicators** - Show which tasks are blocking a pending task
3. **Blocked-By Display** - Show why a task cannot start
4. **Critical Path Highlight** - Identify the longest dependency chain

### Implementation Complexity

| Feature | Complexity | Notes |
|---------|------------|-------|
| Dependency graph | HIGH | Rich doesn't have native graph support; would need ASCII/box drawing |
| Blocker indicators | MEDIUM | Add icon/suffix to pending tasks |
| Blocked-by list | MEDIUM | Modal or tooltip showing blockers |
| Critical path | HIGH | Requires topological analysis |

### Evidence

From Task 1.4 findings, "Integration Gaps Identified":
> "No display of: Task dependencies, Blocking relationships, Parallel execution groups"

**Gap Severity:** BLOCKER

---

## 2. Phase Progress Details

### Current State

**From `plan_orchestrator.py:521-524`:**
```python
header_text.append(f"Phase: ", style="dim")
header_text.append(f"{self.current_phase}", style="yellow")
```

The TUI shows only the current phase name, not progress within each phase.

**Data Available:**
- `plan-orchestrator.js phases` returns all phases with `{ number, title, total, completed, percentage, status }`
- This data is never queried by the TUI

### What's Missing

1. **All-Phases Overview** - See all phases with completion %
2. **Phase Progress Bars** - Individual progress bar per phase
3. **Phase Transition Alerts** - Notification when moving to next phase
4. **VERIFY Task Highlighting** - Emphasize phase-gating tasks

### Implementation Complexity

| Feature | Complexity | Notes |
|---------|------------|-------|
| All-phases overview | LOW | Query `phases` command, display in new panel |
| Phase progress bars | LOW | Rich Progress class supports multiple bars |
| Phase transitions | LOW | Detect phase change in status update callback |
| VERIFY highlighting | LOW | Filter tasks by ID pattern "VERIFY" |

### Evidence

From Task 1.2 findings:
> "Phase: RichTUIManager.current_phase - Updated via set_phase() from status.json"

Only the phase name is tracked, not per-phase metrics.

**Gap Severity:** GAP

---

## 3. Findings Directory Browser

### Current State

**From `plan_orchestrator.py`:**
- Findings are written via `status-cli.js write-findings`
- Findings are stored in `docs/plan-outputs/{plan}/findings/{task-id}.md`
- `status-cli.js read-findings <task-id>` can retrieve content

**TUI Display:** None. Completions panel shows task ID/description but not findings content.

### What's Missing

1. **Findings List** - Show available findings files
2. **Findings Preview** - Inline preview of finding content
3. **Findings Browser Modal** - Full-screen view of findings
4. **Findings Search** - Filter/search within findings

### Implementation Complexity

| Feature | Complexity | Notes |
|---------|------------|-------|
| Findings list | LOW | Glob `findings/*.md`, display in panel |
| Findings preview | MEDIUM | Rich Markdown renderer, truncation needed |
| Browser modal | MEDIUM | Rich modal/screen overlay |
| Search | HIGH | Full-text search implementation |

### Evidence

From Task 1.4 findings:
> "The TUI doesn't display: Contents of findings/ directory"

**Gap Severity:** GAP

---

## 4. Retry History Display

### Current State

**From `plan_orchestrator.py:893-905`:**
```python
def reset_task_for_retry(self, task_id: str) -> bool:
    """Reset a failed task to pending for retry."""
```

**Data Available:**
- `status-cli.js retryable` - returns tasks with `retryCount < 2`
- `status-cli.js increment-retry` - returns `{ taskId, newRetryCount, canRetry }`
- Task objects in status.json have `retryCount`, `retryErrors` fields

**TUI Display:**
- Footer shows total failed count
- No per-task retry information

### What's Missing

1. **Per-Task Retry Count** - Show retry attempt number (e.g., "1.3 [Retry 2/3]")
2. **Retry Error History** - Show previous error messages
3. **Retry vs Exhausted** - Distinguish retryable from permanently failed
4. **Retry Progress** - Show "Retrying 3 tasks..." during recovery

### Implementation Complexity

| Feature | Complexity | Notes |
|---------|------------|-------|
| Per-task retry count | LOW | Add to task display in panels |
| Error history | MEDIUM | Modal/expandable view per task |
| Retry vs exhausted | LOW | Color code or icon difference |
| Retry progress | LOW | Status message already used |

### Evidence

From `plan_orchestrator.py:1167-1170`:
```python
if self.use_tui:
    self.tui.set_status(f"Retry #{retry_count} for task {task_id}")
```

Retry info is in status bar but not in task panels.

**Gap Severity:** GAP

---

## 5. Run Statistics Across Sessions

### Current State

**From `status.json` schema:**
```json
{
  "runs": [
    {
      "runId": "run_...",
      "startedAt": "...",
      "completedAt": "...",
      "tasksCompleted": N,
      "tasksFailed": N
    }
  ],
  "runCount": N
}
```

**Data Available:**
- Run history stored in status.json
- `start-run` / `complete-run` CLI commands

**TUI Display:** None. The run history is written but never displayed.

### What's Missing

1. **Run History Panel** - List of previous runs with stats
2. **Session Comparison** - Compare current vs previous run
3. **Total Stats** - Aggregate stats across all runs
4. **Duration Trends** - Task completion times over runs

### Implementation Complexity

| Feature | Complexity | Notes |
|---------|------------|-------|
| Run history list | LOW | Read runs array from status.json |
| Session comparison | MEDIUM | Delta calculation between runs |
| Total stats | LOW | Sum/aggregate run stats |
| Duration trends | HIGH | Time series visualization |

### Evidence

From Task 1.4 findings:
> "No display of: Run history details"

**Gap Severity:** ENHANCEMENT

---

## 6. Task Execution Timeline

### Current State

**From `plan_orchestrator.py:576-611`:**
The Activity panel shows recent tool calls with timestamps and durations.

**Data Available:**
- Tool call timestamps from streaming
- Task start/complete times in status.json

**TUI Display:**
- Tool-level timeline (last 8 tools)
- No task-level timeline

### What's Missing

1. **Task Timeline** - Show task start→complete with duration
2. **Gantt-Style View** - Visualize parallel task execution
3. **Duration Estimates** - Show expected vs actual duration
4. **Bottleneck Detection** - Highlight unusually slow tasks

### Implementation Complexity

| Feature | Complexity | Notes |
|---------|------------|-------|
| Task timeline | MEDIUM | Vertical timeline panel |
| Gantt view | HIGH | ASCII gantt chart, requires width |
| Duration estimates | HIGH | Needs historical data analysis |
| Bottleneck detection | MEDIUM | Compare to average duration |

### Evidence

From Task 1.2 findings:
> "Activity panel shows recent tool calls with timestamps and durations"

Tool timeline exists but task timeline does not.

**Gap Severity:** ENHANCEMENT

---

## Summary Table

| Missing Feature | Current State | What's Missing | Severity |
|-----------------|---------------|----------------|----------|
| Task Dependencies | Calculated, not shown | Graph/tree view | BLOCKER |
| Phase Progress | Name only | Per-phase metrics | GAP |
| Findings Browser | Written to disk | Display/preview | GAP |
| Retry History | Count in status.json | Per-task display | GAP |
| Run Statistics | Stored in runs[] | History panel | ENHANCEMENT |
| Task Timeline | Tool-level only | Task-level view | ENHANCEMENT |

---

## Priority Ranking

### Critical (BLOCKER)
1. **Task Dependencies Visualization** - Without this, users cannot understand execution order or blockers

### High (GAP)
2. **Phase Progress Details** - Essential for multi-phase plan tracking
3. **Findings Browser** - Users need to see outputs without leaving TUI
4. **Retry History** - Important for debugging failures

### Medium (ENHANCEMENT)
5. **Run Statistics** - Useful for trend analysis but not blocking
6. **Task Timeline** - Nice to have for performance analysis
