# Task 2.5: Severity Categorization of Findings

## Overview

This document categorizes all findings from Phase 2 analysis by severity level, using the defined hierarchy:

**BREAKING > BLOCKER > GAP > ENHANCEMENT**

---

## Severity Definitions

| Level | Definition | Criteria |
|-------|------------|----------|
| **BREAKING** | Functionality is broken | System crashes, data loss, incorrect behavior |
| **BLOCKER** | Cannot achieve goal | Missing critical capability, no workaround |
| **GAP** | Significantly impaired | Feature missing, manual workaround exists |
| **ENHANCEMENT** | Nice to have | Would improve UX but not blocking |

---

## BREAKING Issues

**Count: 0**

No breaking issues were identified. The TUI functions correctly within its current scope.

---

## BLOCKER Issues

**Count: 4**

### B1: Task Dependencies Visualization

**Source:** Task 2.3 (Missing TUI Features)

**Description:** Users cannot see task dependencies, blocking relationships, or parallel execution groups. Without this, complex plans with interdependencies are opaque.

**Impact:**
- Cannot understand why a task is blocked
- Cannot identify critical path
- Cannot see which tasks can run in parallel

**Evidence:** The dependency logic exists in `plan-orchestrator.js:278-289` but is not exposed to TUI.

---

### B2: Parallel Agent Tracking

**Source:** Task 2.2 (Workflow Requirements)

**Description:** When multiple Task agents run in parallel, users cannot see their relationships or which tasks they're executing. The activity panel shows tool calls but not agent groupings.

**Impact:**
- Cannot correlate parallel agent outputs
- Cannot see fan-out/fan-in structure
- Cannot identify agent failures in context

**Evidence:** TUI shows agent count in footer but not per-agent tracking.

---

### B3: Slash Command Invocation from TUI

**Source:** Task 2.4 (Command Invocation)

**Description:** The TUI cannot invoke slash commands like `/plan:split`, `/plan:verify`, `/plan:batch`. Users must exit TUI to run these commands.

**Impact:**
- Cannot interactively split large tasks
- Cannot verify task completion from TUI
- Cannot selectively batch tasks
- Workflow is broken for interactive use

**Evidence:** TUI uses subprocess calls to CLI scripts; slash commands require Claude session.

---

### B4: Keyboard Navigation and Task Selection

**Source:** Task 2.4 (Command Invocation)

**Description:** No keyboard input handling exists. Users cannot navigate tasks, select tasks, or trigger actions via keyboard.

**Impact:**
- Cannot select specific tasks for action
- Cannot navigate between phases
- TUI is display-only, not interactive

**Evidence:** Rich's `Live` display is read-only; no keyboard event handler exists.

---

## GAP Issues

**Count: 10**

### G1: Phase Progress Details

**Source:** Tasks 2.1, 2.3

**Description:** TUI shows only current phase name, not per-phase completion percentages or all phases overview.

**Impact:** Cannot see how close each phase is to completion or plan ahead.

**Data Available:** `plan-orchestrator.js phases` returns full phase breakdown.

---

### G2: Findings Browser

**Source:** Tasks 2.1, 2.3

**Description:** Findings are written to `findings/` directory but cannot be viewed in TUI.

**Impact:** Must leave TUI to review task outputs.

**Data Available:** `status-cli.js read-findings` can retrieve content.

---

### G3: Retry History Display

**Source:** Tasks 2.1, 2.3

**Description:** Per-task retry counts and error history not shown. Only aggregate failed count visible.

**Impact:** Cannot see retry progress for specific tasks.

**Data Available:** Task objects have `retryCount`, `retryErrors` fields.

---

### G4: Explain/Verify Results Display

**Source:** Task 2.1

**Description:** Output from `/plan:explain` and `/plan:verify` cannot be displayed in TUI.

**Impact:** Rich context about tasks unavailable in TUI.

---

### G5: Upcoming Tasks Panel

**Source:** Task 2.1

**Description:** No panel showing next N pending tasks. In Progress and Completions exist, but not "Upcoming".

**Impact:** Cannot see what's coming next without checking status manually.

**Data Available:** `getNextTasks()` data used internally but not displayed.

---

### G6: Subtask Grouping (Branching Visualization)

**Source:** Task 2.2

**Description:** When tasks are split (1.1 → 1.1.1, 1.1.2, 1.1.3), subtasks are not visually grouped under parent.

**Impact:** Relationship between parent and subtasks unclear.

---

### G7: Artifact Lifecycle Tracking

**Source:** Task 2.2

**Description:** No visibility into artifact creation, storage, or indexing. All artifact operations invisible.

**Impact:** Cannot see what outputs are being generated.

---

### G8: Command Palette

**Source:** Task 2.4

**Description:** No searchable command interface for running slash commands.

**Impact:** Users cannot discover or invoke commands from TUI.

---

### G9: Hotkey Actions

**Source:** Task 2.4

**Description:** No hotkeys for common actions (explain, implement, verify, split).

**Impact:** Every action requires exiting TUI.

---

### G10: Nested Workflow Support

**Source:** Task 2.2

**Description:** No support for tracking parent-child workflow relationships or composed workflows.

**Impact:** Cannot visualize or track nested plan execution.

---

## ENHANCEMENT Issues

**Count: 6**

### E1: Sync Check Display

**Source:** Task 2.1

**Description:** `sync-check` results (markdown vs status.json discrepancies) not displayable.

**Priority:** Low - rarely needed, debugging use case.

---

### E2: Validation Results Display

**Source:** Task 2.1

**Description:** `validate` command results not shown in TUI.

**Priority:** Low - validation runs automatically.

---

### E3: Activity History Persistence

**Source:** Task 2.1

**Description:** Tool call history lost when TUI exits.

**Priority:** Low - useful for post-session analysis.

---

### E4: Tool Statistics Persistence

**Source:** Task 2.1

**Description:** Footer stats (tools, agents, edits) lost on exit.

**Priority:** Low - same as above.

---

### E5: Run Statistics Panel

**Source:** Task 2.3

**Description:** Historical run data stored but not displayed.

**Priority:** Medium - useful for trend analysis.

---

### E6: Task Execution Timeline

**Source:** Task 2.3

**Description:** Tool-level timeline exists; task-level timeline missing.

**Priority:** Medium - would help identify slow tasks.

---

## Summary Matrix

| Severity | Count | IDs |
|----------|-------|-----|
| BREAKING | 0 | - |
| BLOCKER | 4 | B1, B2, B3, B4 |
| GAP | 10 | G1-G10 |
| ENHANCEMENT | 6 | E1-E6 |
| **Total** | **20** | |

---

## Priority Implementation Order

### Critical Path (Address First)

1. **B4: Keyboard Navigation** - Foundation for all interactive features
2. **B3: Slash Command Invocation** - Enables TUI to be the primary interface
3. **B1: Task Dependencies** - Essential for understanding complex plans
4. **B2: Parallel Agent Tracking** - Required for parallel execution visibility

### High Priority

5. **G1: Phase Progress Details** - Low effort, high value
6. **G2: Findings Browser** - Data available, needs display
7. **G5: Upcoming Tasks Panel** - Data available, needs display
8. **G3: Retry History** - Data available, needs display

### Medium Priority

9. **G8: Command Palette** - Enables command discovery
10. **G9: Hotkey Actions** - Quick access to commands
11. **G6: Subtask Grouping** - Visual clarity
12. **G4: Explain/Verify Display** - Contextual information

### Lower Priority

13. **G7: Artifact Tracking** - Requires artifact system first
14. **G10: Nested Workflows** - Requires workflow composition first
15. **E5: Run Statistics** - Trend analysis
16. **E6: Task Timeline** - Performance analysis
17. **E1-E4: Persistence features** - Post-session use cases

---

## Dependencies Between Fixes

```
B4 (Keyboard Navigation)
 └── B3 (Slash Commands)
      ├── G8 (Command Palette)
      └── G9 (Hotkeys)

B1 (Dependencies)
 └── B2 (Parallel Agents)
      └── G6 (Subtask Grouping)

G1 (Phase Progress)
 └── G5 (Upcoming Tasks)

G2 (Findings Browser)
 └── G3 (Retry History)
      └── G4 (Explain/Verify)
```

---

## Effort Estimates

| ID | Feature | Effort | Notes |
|----|---------|--------|-------|
| B4 | Keyboard Navigation | HIGH | Requires input library integration |
| B3 | Slash Commands | MEDIUM | Build on B4 |
| B1 | Dependencies | HIGH | Graph visualization is complex |
| B2 | Parallel Agents | MEDIUM | Track agent-to-task mapping |
| G1 | Phase Progress | LOW | Data available, simple panel |
| G2 | Findings Browser | MEDIUM | Markdown rendering, modal |
| G5 | Upcoming Tasks | LOW | Similar to Completions panel |
| G3 | Retry History | LOW | Data available |
