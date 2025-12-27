# Implementation Plan: TUI Workflow Expansion

## Overview

- **Objective:** Add orchestrator control, event streaming, parallel execution dashboard, and multi-plan support to TUI
- **Priority:** P1 (High Value, requires infrastructure)
- **Created:** 2025-12-26
- **Output:** `docs/plan-outputs/tui-workflow-expansion/`
- **Analysis Reference:** `docs/plan-outputs/tui-expansion-analysis/`

> This plan implements the architectural features identified in the TUI Expansion Analysis. These features require new infrastructure (IPC, EventBus) and cannot be added as simple amendments to the existing TUI plan.

---

## Dependencies

### Upstream (Required)
- `tui-integration-implementation.md` - Phases 1-3 must be complete
  - Keyboard foundation
  - Panel toggle system
  - Basic command integration

### External Tools
- Python 3.8+
- Rich library (existing)
- Node.js for status-cli.js integration

---

## Phase 1: IPC Infrastructure

**Objective:** Enable bidirectional communication between TUI and orchestrator

**Effort:** ~16 hours | **Value:** Foundation for control features

- [ ] 1.1 Design IPC Protocol in `scripts/lib/ipc_protocol.py`
  - [ ] 1.1.1 Define `IPCCommand` dataclass with command, payload, id, timestamp
  - [ ] 1.1.2 Define `IPCResponse` dataclass with success, data, error fields
  - [ ] 1.1.3 Define command types enum (STATUS, PAUSE, RESUME, SET_BATCH_SIZE, RETRY, SKIP)
  - [ ] 1.1.4 Document protocol in `docs/standards/IPC-PROTOCOL.md`

- [ ] 1.2 Implement IPC Client in `scripts/lib/ipc_client.py`
  - [ ] 1.2.1 Create `IPCClient` class with file-based IPC
  - [ ] 1.2.2 Implement `send()` method with timeout handling
  - [ ] 1.2.3 Implement `is_connected()` health check
  - [ ] 1.2.4 Add cleanup for orphaned command/response files

- [ ] 1.3 Add IPC Server to Orchestrator in `scripts/plan_orchestrator.py`
  - [ ] 1.3.1 Create `IPCServer` class with command file watcher
  - [ ] 1.3.2 Implement command dispatcher to handler methods
  - [ ] 1.3.3 Add response file writer
  - [ ] 1.3.4 Integrate server start/stop with orchestrator lifecycle

- [ ] 1.4 Implement IPC Command Handlers in `scripts/plan_orchestrator.py`
  - [ ] 1.4.1 Implement STATUS handler - return current state
  - [ ] 1.4.2 Implement PAUSE handler - set pause flag, wait for current tasks
  - [ ] 1.4.3 Implement RESUME handler - clear pause flag
  - [ ] 1.4.4 Implement SET_BATCH_SIZE handler - update batch_size config
  - [ ] 1.4.5 Implement RETRY_TASK handler - reset task status
  - [ ] 1.4.6 Implement SKIP_TASK handler - mark task skipped

- [ ] **VERIFY 1:** IPC round-trip <100ms, all commands work, orchestrator responds

---

## Phase 2: Orchestrator Control Panel

**Objective:** Full runtime control of orchestrator from TUI

**Effort:** ~36 hours | **Value:** Production-essential

**Execution Note:** Tasks 2.1-2.7 are [SEQUENTIAL] - all modify control panel and require previous task state

- [ ] 2.1 Create Control Panel Class in `scripts/tui/control_panel.py`
  - [ ] 2.1.1 Create `OrchestratorControlPanel` class
  - [ ] 2.1.2 Add `OrchestratorState` enum (RUNNING, PAUSED, PAUSING, STOPPED)
  - [ ] 2.1.3 Inject IPCClient dependency
  - [ ] 2.1.4 Add expanded/collapsed state toggle

- [ ] 2.2 Implement Collapsed Control Bar in `scripts/tui/control_panel.py`
  - [ ] 2.2.1 Render single-line status (● RUNNING │ Iter: 12/50 │ Batch: 5)
  - [ ] 2.2.2 Show state with color-coded symbol
  - [ ] 2.2.3 Show keyboard hints ([P]ause [R]esume [+/-]Size)

- [ ] 2.3 Implement Execution State Section in `scripts/tui/control_panel.py`
  - [ ] 2.3.1 Create state section panel
  - [ ] 2.3.2 Display current state, iteration, elapsed time
  - [ ] 2.3.3 List active tasks with IDs
  - [ ] 2.3.4 Add pause/resume/quit controls

- [ ] 2.4 Implement Batch Size Control in `scripts/tui/control_panel.py`
  - [ ] 2.4.1 Create batch size section panel
  - [ ] 2.4.2 Render visual slider (1-10 range)
  - [ ] 2.4.3 Add +/- key handlers
  - [ ] 2.4.4 Send SET_BATCH_SIZE on change

- [ ] 2.5 Implement Failed Task Actions in `scripts/tui/control_panel.py`
  - [ ] 2.5.1 Create failed tasks section panel
  - [ ] 2.5.2 List failed tasks with retry count
  - [ ] 2.5.3 Add retry (r), skip (s), error detail (e) actions
  - [ ] 2.5.4 Send RETRY_TASK or SKIP_TASK via IPC

- [ ] 2.6 Implement Stuck Detection Section in `scripts/tui/control_panel.py`
  - [ ] 2.6.1 Create stuck detection panel
  - [ ] 2.6.2 Display stuck task with time info
  - [ ] 2.6.3 Add extend (x), skip (k), retry (r) actions
  - [ ] 2.6.4 Show auto-action countdown

- [ ] 2.7 Integrate Control Panel with TUI in `scripts/lib/tui.py`
  - [ ] 2.7.1 Add control panel to layout
  - [ ] 2.7.2 Add `Ctrl+O` toggle keybinding
  - [ ] 2.7.3 Connect keyboard events to control panel
  - [ ] 2.7.4 Refresh control panel state each cycle

- [ ] **VERIFY 2:** Pause/resume works, batch size changes, retry/skip from TUI

---

## Phase 3: Event Bus Infrastructure

**Objective:** Create event bus for real-time updates

**Effort:** ~18 hours | **Value:** Foundation for event streaming

- [ ] 3.1 Create EventBus Class in `scripts/lib/event_bus.py`
  - [ ] 3.1.1 Create `EventBus` class with thread-safe history
  - [ ] 3.1.2 Implement `emit()` method with subscriber notification
  - [ ] 3.1.3 Implement `subscribe()` and `unsubscribe()` methods
  - [ ] 3.1.4 Add circular buffer for history (max 1000 events)

- [ ] 3.2 Define Event Types in `scripts/lib/event_types.py`
  - [ ] 3.2.1 Create `EventType` enum (task.*, git.*, agent.*, phase.*, etc.)
  - [ ] 3.2.2 Create `Event` dataclass with type, timestamp, data, id
  - [ ] 3.2.3 Define event data schemas for each type
  - [ ] 3.2.4 Document event types in `docs/standards/EVENT-TYPES.md`

- [ ] 3.3 Integrate Event Emission in Orchestrator in `scripts/plan_orchestrator.py`
  - [ ] 3.3.1 Add EventBus instance to orchestrator
  - [ ] 3.3.2 Emit task.started, task.completed, task.failed events
  - [ ] 3.3.3 Emit phase.completed events
  - [ ] 3.3.4 Emit iteration.start, iteration.complete events

- [ ] 3.4 Integrate Event Emission in Claude Runner in `scripts/lib/claude_runner.py`
  - [ ] 3.4.1 Emit agent.spawn, agent.complete events
  - [ ] 3.4.2 Emit tool.start, tool.end events (throttled)
  - [ ] 3.4.3 Pass EventBus through callback chain

- [ ] 3.5 Add Event Persistence in `scripts/lib/event_persistence.py`
  - [ ] 3.5.1 Create `EventPersistence` class with file append
  - [ ] 3.5.2 Implement `load_recent()` for TUI startup
  - [ ] 3.5.3 Add rotation for large event files

- [ ] **VERIFY 3:** Events emitted, history accessible, persistence works

---

## Phase 4: Real-time Event Stream Panel

**Objective:** Real-time event visualization in TUI

**Effort:** ~34 hours | **Value:** Monitoring and debugging

**Execution Note:** Tasks 4.1-4.6 are [SEQUENTIAL] - all modify event stream panel incrementally

- [ ] 4.1 Create Event Stream Panel Class in `scripts/tui/event_stream.py`
  - [ ] 4.1.1 Create `EventStreamPanel` class
  - [ ] 4.1.2 Subscribe to EventBus for real-time updates
  - [ ] 4.1.3 Add expanded/collapsed state toggle
  - [ ] 4.1.4 Add paused state for freezing stream

- [ ] 4.2 Implement Collapsed Stream View in `scripts/tui/event_stream.py`
  - [ ] 4.2.1 Render compact 8-line event list
  - [ ] 4.2.2 Format events with timestamp, icon, message
  - [ ] 4.2.3 Show (paused) indicator when frozen

- [ ] 4.3 Implement Expanded View with Cards in `scripts/tui/event_stream.py`
  - [ ] 4.3.1 Render full event cards with details
  - [ ] 4.3.2 Add selection highlighting
  - [ ] 4.3.3 Add scroll with j/k navigation
  - [ ] 4.3.4 Show event-specific details

- [ ] 4.4 Implement Event Type Cards in `scripts/tui/event_stream.py`
  - [ ] 4.4.1 Design task.started card
  - [ ] 4.4.2 Design task.completed card with duration
  - [ ] 4.4.3 Design task.failed card with error
  - [ ] 4.4.4 Design git.commit card
  - [ ] 4.4.5 Design agent.spawn/complete cards
  - [ ] 4.4.6 Design constraint.applied card
  - [ ] 4.4.7 Design phase.completed card

- [ ] 4.5 Implement Filter Bar in `scripts/tui/event_stream.py`
  - [ ] 4.5.1 Add filter toggles for event categories
  - [ ] 4.5.2 Implement `f` key to cycle filters
  - [ ] 4.5.3 Show active filter state

- [ ] 4.6 Integrate Event Stream with TUI in `scripts/lib/tui.py`
  - [ ] 4.6.1 Add event stream panel to layout
  - [ ] 4.6.2 Add `Ctrl+E` toggle keybinding
  - [ ] 4.6.3 Add `p` key for pause/resume stream
  - [ ] 4.6.4 Add `c` key for clear history

- [ ] **VERIFY 4:** Events stream in real-time, filters work, cards render correctly

---

## Phase 5: Parallel Execution Dashboard

**Objective:** Comprehensive parallel execution visibility

**Effort:** ~20 hours | **Value:** Key for parallel plan management

- [ ] 5.1 Create Parallel Dashboard Class in `scripts/tui/parallel_dashboard.py`
  - [ ] 5.1.1 Create `ParallelExecutionDashboard` class
  - [ ] 5.1.2 Add expanded/collapsed state toggle
  - [ ] 5.1.3 Implement data refresh with caching

- [ ] 5.2 Implement Active Sessions Section in `scripts/tui/parallel_dashboard.py`
  - [ ] 5.2.1 Show task/agent count bars
  - [ ] 5.2.2 List running tasks with elapsed time
  - [ ] 5.2.3 Track peak concurrency

- [ ] 5.3 Implement Constraints Section in `scripts/tui/parallel_dashboard.py`
  - [ ] 5.3.1 Show [PARALLEL]/[SEQUENTIAL] mode
  - [ ] 5.3.2 Display sequential chains
  - [ ] 5.3.3 Display file conflicts

- [ ] 5.4 Implement Commit Queue Section in `scripts/tui/parallel_dashboard.py`
  - [ ] 5.4.1 Show queue status (processing, pending)
  - [ ] 5.4.2 List pending commits
  - [ ] 5.4.3 Show commit stats

- [ ] 5.5 Integrate Dashboard with TUI in `scripts/lib/tui.py`
  - [ ] 5.5.1 Add dashboard to layout
  - [ ] 5.5.2 Add `Shift+P` key toggle
  - [ ] 5.5.3 Refresh on each cycle

- [ ] **VERIFY 5:** Dashboard shows all parallel state, updates correctly

---

## Phase 6: Multi-Plan View

**Objective:** Manage multiple plans from single TUI

**Effort:** ~33 hours | **Value:** Power user feature

- [ ] 6.1 Create Plan Registry Class in `scripts/lib/plan_registry.py`
  - [ ] 6.1.1 Create `PlanRegistry` class
  - [ ] 6.1.2 Scan for active plans in docs/plans/
  - [ ] 6.1.3 Load status.json for each plan
  - [ ] 6.1.4 Track plan metadata (branch, worktree)

- [ ] 6.2 Create Multi-Plan View Class in `scripts/tui/multi_plan_view.py`
  - [ ] 6.2.1 Create `MultiPlanView` class
  - [ ] 6.2.2 Add plan list with progress summary
  - [ ] 6.2.3 Add plan selection highlighting

- [ ] 6.3 Implement Plan Selector Modal in `scripts/tui/multi_plan_view.py`
  - [ ] 6.3.1 Create plan picker popup
  - [ ] 6.3.2 Show plan name, progress, branch
  - [ ] 6.3.3 Navigate with j/k, select with Enter

- [ ] 6.4 Implement Dashboard View in `scripts/tui/multi_plan_view.py`
  - [ ] 6.4.1 Create side-by-side progress view
  - [ ] 6.4.2 Show active task for each plan
  - [ ] 6.4.3 Color-code by health (green/yellow/red)

- [ ] 6.5 Implement Plan Switching in `scripts/lib/tui.py`
  - [ ] 6.5.1 Update current-plan.txt on switch
  - [ ] 6.5.2 Reload all panels with new plan context
  - [ ] 6.5.3 Show switch confirmation

- [ ] 6.6 Integrate Multi-Plan View with TUI in `scripts/lib/tui.py`
  - [ ] 6.6.1 Add `Ctrl+P` to open plan selector
  - [ ] 6.6.2 Add multi-plan dashboard as optional panel
  - [ ] 6.6.3 Show current plan in header

- [ ] **VERIFY 6:** Plan switching works, dashboard shows all plans, no data cross-contamination

---

## Success Criteria

### Functional Requirements
- [ ] Pause/resume orchestrator from TUI
- [ ] Adjust batch size during execution
- [ ] Retry/skip failed tasks from TUI
- [ ] Real-time event stream visible
- [ ] Multiple plans manageable from single TUI
- [ ] Parallel execution state fully visible

### Quality Requirements
- [ ] IPC round-trip <100ms
- [ ] Event display latency <200ms
- [ ] No memory leaks from event history
- [ ] TUI refresh <100ms with all panels

### Compatibility Requirements
- [ ] Works on Linux, macOS, WSL2
- [ ] Graceful degradation if orchestrator unreachable
- [ ] Backward compatible with non-orchestrated usage

---

## Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| IPC complexity | HIGH | HIGH | Start with file-based IPC |
| Event volume overwhelming | MEDIUM | MEDIUM | Throttle, filter, limit display |
| Race conditions in IPC | HIGH | LOW | Timeouts, atomic operations |
| Memory growth | MEDIUM | MEDIUM | Circular buffers, max sizes |
| Multi-plan state confusion | MEDIUM | LOW | Clear current plan indicators |

---

## Related Documents

- Analysis: `docs/plan-outputs/tui-expansion-analysis/findings/`
- Architecture: `findings/11.5-architectural-considerations.md`
- Roadmap: `findings/11.4-implementation-roadmap.md`
- Integration: `findings/11.3-integration-points.md`
- Existing TUI Plan: `docs/plans/tui-integration-implementation.md`
