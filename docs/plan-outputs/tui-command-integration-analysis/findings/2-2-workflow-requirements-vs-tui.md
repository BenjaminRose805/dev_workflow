# Task 2.2: Implement-* Workflow Requirements vs TUI Support

## Overview

This analysis examines the workflow patterns used in implement-* plans and identifies gaps in TUI support for these patterns.

---

## Workflow Composition Patterns

### 1. Sequential (Phase-Gated)

**Pattern:**
```
Phase 1 → Phase 2 → Phase 3 → ... → Final
```

**Usage:** Most implement-* plans (~95%) follow strict phase ordering.

**TUI Support:**
- ✓ Shows current phase name in header
- ✓ Shows task completion count
- ✗ Does NOT show phase-by-phase completion percentages
- ✗ Does NOT visualize phase transitions
- ✗ Does NOT show VERIFY tasks as phase gates

**Gap Severity:** GAP - Users cannot see how close each phase is to completion or identify blocking VERIFY tasks.

---

### 2. Parallel (Fan-Out)

**Pattern:**
```
Dispatch →┬→ Agent 1 ─┬→ Collect → Report
          ├→ Agent 2 ─┤
          └→ Agent 3 ─┘
```

**Usage:**
- `implement-fan-in-fan-out.md` (explicit)
- `plan-orchestrator.py` batch execution (implicit)
- `/plan:batch` with parallel Task agents

**TUI Support:**
- ✓ Shows "Task: description" in activity panel for spawned agents
- ✓ Shows agent count in footer stats
- ✗ Does NOT show which tasks are running in parallel
- ✗ Does NOT visualize fan-out/fan-in structure
- ✗ Does NOT show parallel agent results correlation

**Gap Severity:** BLOCKER for complex parallel workflows - Users cannot see agent relationships.

---

### 3. Branching (Conditional)

**Pattern:**
```
Analyze →┬→ [if large] → Split → Parallel
         └→ [if small] → Direct → Complete
```

**Usage:**
- `implement-workflow-branching.md`
- `/plan:split` when task is too large
- Conditional execution based on analysis

**TUI Support:**
- ✗ No support for visualizing decision points
- ✗ No indication of which branch was taken
- ✗ No way to show split subtasks (1.1.1, 1.1.2, 1.1.3) grouped under parent

**Gap Severity:** GAP - Subtask relationships not visible.

---

### 4. Looping (Iteration)

**Pattern:**
```
while (not_done) {
  Execute → Check → [continue/break]
}
```

**Usage:**
- `implement-workflow-loops.md`
- Retry logic in orchestrator (retryable tasks)
- Iteration counter in main loop

**TUI Support:**
- ✓ Shows iteration counter (e.g., "Iteration 3/50")
- ✓ Shows retry attempts in footer (though not per-task)
- ✗ Does NOT show per-task retry count
- ✗ Does NOT show loop iteration state for workflow loops
- ✗ Does NOT distinguish "retry due to failure" from "intentional iteration"

**Gap Severity:** GAP - Retry progress unclear.

---

### 5. Composition (Nested Workflows)

**Pattern:**
```
Parent Workflow
├→ Child Workflow 1 (reusable)
├→ Child Workflow 2 (reusable)
└→ Custom Steps
```

**Usage:**
- `implement-workflow-composition.md`
- Nested plan execution (not currently supported)
- Calling other commands from within a command

**TUI Support:**
- ✗ No support for nested plan tracking
- ✗ No support for showing parent-child workflow relationships
- ✗ No aggregation of child workflow progress

**Gap Severity:** GAP - No nested workflow support currently exists.

---

## Artifact Lifecycle Tracking

### Artifact Types in Implement-* Plans

| Type | Example Plans | TUI Display |
|------|---------------|-------------|
| Findings | All analysis plans | ✗ Not shown |
| Metrics | analyze, test, validate | ✗ Not shown |
| Reports | All plans | ✗ Not shown |
| Diagrams | architect, model, design | ✗ Not shown |
| Code | implement, refactor, fix | ✗ Not shown |
| Tests | test, implement | ✗ Not shown |
| Configs | deploy, workflow | ✗ Not shown |

**TUI Support:**
- ✗ No artifact browser panel
- ✗ No indication of artifact generation during task
- ✗ No way to view artifact content
- ✗ No artifact versioning visibility

**Gap Severity:** GAP - Users cannot see what artifacts are being created.

---

### Artifact Lifecycle States

1. **Generated** - Created by command/agent
2. **Stored** - Persisted by artifact-storage-hook
3. **Indexed** - Registered in artifact registry
4. **Versioned** - Tracked across runs
5. **Archived** - Moved to completed plans

**TUI Support:** None. All artifact lifecycle transitions happen invisibly.

**Gap Severity:** GAP

---

## Dependency Visualization

### Current Status

The TUI has **NO** dependency visualization. This affects:

1. **Task Dependencies** - Cannot see which tasks block others
2. **Phase Dependencies** - Cannot see phase prerequisite chains
3. **Parallel Groups** - Cannot see which tasks can run concurrently
4. **Critical Path** - Cannot identify bottleneck tasks

### Evidence from Code

From `plan-orchestrator.js:278-289`:
```javascript
// Check if this phase can be worked on (all previous phases substantially complete)
const previousPhases = plan.phases.filter(p => p.number < phase.number);
const previousIncomplete = previousPhases.some(p =>
    p.tasks.some(t => t.status === 'pending' || t.status === 'in_progress')
);
```

The system calculates dependencies, but does not expose them to the TUI.

**Gap Severity:** BLOCKER - Users cannot understand blocking relationships.

---

## Summary of Workflow-Related Gaps

| Workflow Pattern | TUI Support Level | Gap Severity |
|------------------|-------------------|--------------|
| Sequential/Phase-Gated | Partial (name only) | GAP |
| Parallel/Fan-Out | Minimal (agent count) | BLOCKER |
| Branching/Conditional | None | GAP |
| Looping/Iteration | Partial (iteration count) | GAP |
| Composition/Nested | None | GAP |
| Artifact Tracking | None | GAP |
| Dependency Visualization | None | BLOCKER |

---

## Recommendations

### High Priority (BLOCKER)

1. **Dependency Graph Panel** - Show task dependencies as a tree/graph
2. **Parallel Agent Tracking** - Show which agents are running concurrently with relationships

### Medium Priority (GAP)

3. **Phase Progress Detail** - Show all phases with individual progress bars
4. **Artifact Browser** - List artifacts in `findings/` with preview capability
5. **Subtask Grouping** - Show 1.1.1, 1.1.2 grouped under 1.1

### Lower Priority (ENHANCEMENT)

6. **Retry History** - Show per-task retry counts and error history
7. **Workflow Type Indicator** - Show if current execution is sequential/parallel/etc.
