# Task 2.1: Command Output Formats vs TUI Display Capabilities

## Overview

This analysis identifies gaps between what plan commands output and what the TUI can display.

---

## Commands Producing Output TUI Can't Display

### 1. `/plan:explain` - Detailed Task Explanations

**Command Output:**
- Summary, context, scope, approach for each task
- Dependencies and verification criteria
- Current status and existing findings
- Multi-paragraph markdown content

**TUI Gap:** The TUI has no panel for displaying detailed task explanations. The "In Progress" and "Completions" panels only show task ID and a 30-35 character truncated description.

**Severity:** GAP

---

### 2. `/plan:verify` - Verification Results

**Command Output:**
- Status classification: ALREADY DONE, NEEDED, BLOCKED, OBSOLETE
- Verification report grouped by status
- Reasoning for each classification

**TUI Gap:** No panel exists to display verification results. The TUI only shows status from `status.json` (pending, in_progress, completed, failed, skipped) - it cannot represent "BLOCKED", "OBSOLETE", or "ALREADY DONE" classifications.

**Severity:** GAP

---

### 3. `status-cli.js sync-check` - Markdown vs status.json Comparison

**Command Output:**
```json
{
  "discrepancies": [...],
  "onlyInStatusJson": [...],
  "onlyInMarkdown": [...],
  "summary": {...}
}
```

**TUI Gap:** No panel to display sync state or discrepancies. This would be useful for debugging plan execution issues.

**Severity:** ENHANCEMENT

---

### 4. `plan-orchestrator.js phases` - Phase Summary

**Command Output:**
```json
{
  "phases": [
    { "number": 1, "title": "Discovery", "total": 5, "completed": 3, "percentage": 60, "status": "in_progress" },
    ...
  ]
}
```

**TUI Gap:** The TUI shows only the **current phase name** in the header panel. There's no breakdown showing all phases with their individual completion percentages. Users cannot see upcoming phases or how much work remains in future phases.

**Severity:** GAP

---

### 5. `status-cli.js validate` - Validation Results

**Command Output:**
```json
{
  "valid": boolean,
  "issuesFound": N,
  "issuesFixed": N,
  "issues": ["..."],
  "summary": {...}
}
```

**TUI Gap:** No panel to show status.json validation state or issues. Validation runs silently.

**Severity:** ENHANCEMENT

---

### 6. Findings Content (`status-cli.js read-findings`)

**Command Output:**
- Raw markdown content of task findings
- Multi-line, formatted content

**TUI Gap:** The TUI displays recent completions but does NOT show the findings content. Users cannot review what was discovered/documented for completed tasks without leaving TUI.

**Severity:** GAP

---

### 7. `status-cli.js retryable` / `exhausted` - Retry Status

**Command Output:**
```json
{
  "count": N,
  "tasks": [{ "id": "...", "retryCount": N, ... }]
}
```

**TUI Gap:** The TUI shows failed task count in the progress bar, but doesn't distinguish between retryable failures and exhausted (no-retries-left) failures. The `increment_retry` and retry logic runs invisibly.

**Severity:** GAP

---

## TUI Panels with No Command to Populate Them

### 1. Activity Panel - Claude Streaming Events

**Current Data Source:** Direct callback from `StreamingClaudeRunner` parsing Claude CLI stream-json output.

**No Command Available:** There's no CLI command to query historical tool call data. The activity tracker is purely in-memory during the session.

**Gap:** Cannot persist or restore activity history across TUI restarts.

**Severity:** ENHANCEMENT

---

### 2. Footer Stats (Tools, Agents, Edits)

**Current Data Source:** `ActivityTracker.stats` - incremented in real-time during Claude session.

**No Command Available:** No command outputs aggregated tool statistics. These are lost when TUI exits.

**Gap:** Cannot review tool usage statistics after the fact.

**Severity:** ENHANCEMENT

---

### 3. Upcoming Tasks Panel (Missing)

**Current Panels:** "In Progress" shows actual `in_progress` tasks, "Completions" shows completed tasks.

**Gap:** There's no "Upcoming" or "Next" panel showing pending tasks that will be worked on next. The `getNextTasks()` data is used internally for prompt building but not displayed.

**Severity:** GAP

---

## Summary Table

| Command / Feature | Output Type | TUI Support | Severity |
|-------------------|-------------|-------------|----------|
| `/plan:explain` | Multi-paragraph MD | None | GAP |
| `/plan:verify` | Classification report | None | GAP |
| `sync-check` | Discrepancy list | None | ENHANCEMENT |
| `phases` | Phase breakdown | Partial (name only) | GAP |
| `validate` | Issue list | None | ENHANCEMENT |
| `read-findings` | Task findings MD | None | GAP |
| `retryable/exhausted` | Retry status | None | GAP |
| Activity history | Real-time events | Memory only | ENHANCEMENT |
| Tool statistics | Aggregated counts | Memory only | ENHANCEMENT |
| Upcoming tasks | Next N tasks | None | GAP |

---

## Recommendations

1. **Phase Progress Panel** - Add a panel showing all phases with individual progress bars (HIGH PRIORITY)

2. **Findings Browser** - Add modal/panel to view task findings inline (MEDIUM PRIORITY)

3. **Retry Status Display** - Distinguish retryable vs exhausted in failed task display (MEDIUM PRIORITY)

4. **Upcoming Tasks Panel** - Show next N pending tasks (MEDIUM PRIORITY)

5. **Persist Activity Log** - Write tool calls to file for post-session review (LOW PRIORITY)

6. **Explain Mode** - Add hotkey to show `/plan:explain` output for selected task (LOW PRIORITY)
