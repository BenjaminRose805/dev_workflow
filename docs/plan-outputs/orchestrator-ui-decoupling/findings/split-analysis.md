# Analysis: Splitting orchestrator-ui-decoupling Plan

## Executive Summary

The `orchestrator-ui-decoupling` plan should be split into 4 focused plans. This analysis assumes all preceding plans are complete, providing significant infrastructure that changes the implementation approach.

---

## Available Infrastructure (From Completed Plans)

### From parallel-execution-foundation
- `--plan` argument for all CLI commands
- File conflict detection between tasks
- Serial git commit queue
- `[PARALLEL]` phase annotation
- Progress output formats (`--format=json`, `--format=markers`, `--watch`)

### From git-workflow-phase1/2/3
- Branch-per-plan workflow
- Commit-per-task with format `[plan-name] Task X.Y: <description>`
- `/plan:complete` with squash merge
- Archive tags, rollback, abandon

### From git-workflow-phase4-advanced
- **Configuration system** at `.claude/git-workflow.json` - extend for adapter config
- PR creation workflow
- Phase tags
- `/plan:cleanup` command
- **Orchestrator completion prompt** - integration point for adapters

### From git-workflow-phase5-worktrees
- **REST API** at `scripts/api-server.js` with `/api/plans/*` endpoints
- **WebSocket support** for real-time updates (`/ws/plans/:name`)
- **Multi-orchestrator process management** with `--daemon` mode
- Worktree context system
- Aggregate status view (`--all-plans`)
- **Multi-plan TUI interface** - patterns for multi-adapter TUI

### From parallel-execution-dependencies
- `(depends: X.Y)` syntax parsed and stored
- Dependency graph in status.json
- DAG-aware task selection
- `deps` command with visualization

### From tui-expansion-analysis + tui-integration-implementation
- **Keyboard navigation** patterns
- **Command palette** infrastructure
- **Real-time panel updates** patterns
- Dependency graph visualization
- Parallel agent tracking panels
- Configuration persistence at `~/.config/claude-code/`

---

## Impact on Original Plan

The completed infrastructure **significantly reduces** the scope of orchestrator-ui-decoupling:

| Original Phase | Status | Notes |
|----------------|--------|-------|
| Phase 0: Event Protocol | Still needed | Core abstraction |
| Phase 1: Abstract UI Interface | Still needed | Core abstraction |
| Phase 2: Extract Core Engine | Still needed | Core refactoring |
| Phase 3: Core Adapters | Still needed | But can leverage TUI patterns |
| Phase 4: Socket Support | **Reduced** | Multi-orchestrator IPC exists |
| Phase 5: Web Support | **Reduced** | REST API + WebSocket exists |
| Phase 6: Integration | Still needed | Wire it all together |
| Phase 7: Testing | Still needed | But patterns exist |
| Phase 8: Documentation | Still needed | |

---

## Proposed Split

### Plan 1: orchestrator-event-protocol
**Goal:** Define the event protocol and abstract adapter interface

**Tasks:** 12 | **Estimated Iterations:** 3

#### Phase 1: Event Types Definition
- [ ] 1.1 Define event type enum with all orchestration events
  - `orchestration_started`, `orchestration_completed`
  - `iteration_started`, `iteration_completed`
  - `claude_session_started`, `claude_session_completed`
  - `tool_started`, `tool_completed`
  - `progress_updated`, `phase_changed`
  - `task_started`, `task_completed`, `task_failed`
  - `status_changed`, `error_occurred`
  - Write schema to `scripts/lib/schemas/orchestrator-events.json`

- [ ] 1.2 Define event payload dataclasses in `scripts/lib/events.py`
  - Create dataclass for each event type
  - Include `timestamp`, `event_type`, `payload` fields
  - Implement `to_dict()`, `from_dict()`, `to_json()` methods
  - Add `ProgressInfo`, `TaskInfo` helper types

- [ ] 1.3 Define control command types
  - Commands: `pause`, `resume`, `cancel`, `skip_task`, `retry_task`
  - Create command request/response dataclasses
  - Include validation for state transitions
  - Write schema to `scripts/lib/schemas/orchestrator-commands.json`

#### Phase 2: Abstract Adapter Interface
- [ ] 2.1 Create `OrchestratorUIAdapter` abstract base class in `scripts/lib/ui_adapter.py`
  - Lifecycle methods: `start()`, `stop()`, `is_active()`
  - Event handler methods: `on_<event_type>()` for each event
  - Command methods: `send_command()`, `receive_command()`
  - Support both sync and async implementations

- [ ] 2.2 Create `NullAdapter` implementation
  - No-op adapter for headless/daemon mode
  - Optional file logging (append events to JSONL file)
  - Useful for testing and background runs

- [ ] 2.3 Add adapter configuration to `.claude/git-workflow.json`
  - New `adapters` section with per-adapter config
  - Default adapter selection based on environment
  - Enable/disable specific adapters

#### Phase 3: Verification
- [ ] 3.1 Unit tests for event serialization/deserialization
- [ ] 3.2 Unit tests for adapter interface contract
- [ ] 3.3 Integration test: NullAdapter with mock orchestrator

**Success Criteria:**
- Event types fully specified with JSON schemas
- Adapter interface defined and documented
- NullAdapter works for headless mode

---

### Plan 2: orchestrator-engine-extraction
**Goal:** Extract pure orchestration logic from plan_orchestrator.py

**Tasks:** 15 | **Estimated Iterations:** 4

#### Phase 1: Analysis and Preparation
- [ ] 1.1 Document all TUI coupling points in `scripts/plan_orchestrator.py`
  - List all `self.tui.*` calls
  - List all `print()` statements
  - Identify state that needs to emit events

- [ ] 1.2 Create `scripts/lib/orchestration_engine.py` skeleton
  - Define `OrchestrationEngine` class signature
  - Accept `ui_adapter: OrchestratorUIAdapter` in constructor
  - Define public API methods

#### Phase 2: Logic Extraction
- [ ] 2.1 Extract status monitoring logic
  - Move status polling to engine
  - Emit `progress_updated` events on changes
  - Emit `phase_changed` events on phase transitions

- [ ] 2.2 Extract Claude session management
  - Move Claude spawning logic to engine
  - Emit `claude_session_started/completed` events
  - Emit `tool_started/completed` from stream parsing

- [ ] 2.3 Extract iteration loop logic
  - Move main loop to engine
  - Emit `iteration_started/completed` events
  - Check for control commands between iterations

- [ ] 2.4 Extract task selection logic
  - Move `next` task selection to engine
  - Emit `task_started/completed/failed` events
  - Integrate with DAG-aware selection from parallel-execution-dependencies

#### Phase 3: Control Commands
- [ ] 3.1 Implement `pause()` method
  - Set pause flag checked between iterations
  - Emit `status_changed` with paused state
  - Allow current Claude session to complete

- [ ] 3.2 Implement `resume()` method
  - Clear pause flag
  - Emit `status_changed` with running state
  - Trigger next iteration

- [ ] 3.3 Implement `cancel()` method
  - Set cancel flag
  - Emit `orchestration_completed` with cancelled reason
  - Clean up resources

- [ ] 3.4 Implement `skip_task()` and `retry_task()` methods
  - Delegate to status-cli.js
  - Emit appropriate task events

#### Phase 4: Verification
- [ ] 4.1 Unit tests for OrchestrationEngine with NullAdapter
- [ ] 4.2 Integration test: engine drives orchestration correctly
- [ ] 4.3 Verify no TUI/print calls in engine code

**Success Criteria:**
- OrchestrationEngine has no UI dependencies
- All state changes emit events
- Control commands work correctly

---

### Plan 3: orchestrator-core-adapters
**Goal:** Create essential adapters and integrate with plan_orchestrator.py

**Tasks:** 18 | **Estimated Iterations:** 5

#### Phase 1: RichTUI Adapter
- [ ] 1.1 Create `scripts/lib/adapters/rich_tui.py`
  - Wrap existing `RichTUIManager` from `scripts/lib/tui.py`
  - Implement all `OrchestratorUIAdapter` methods
  - Map events to existing TUI update methods

- [ ] 1.2 Translate events to TUI updates
  - `progress_updated` → `set_progress()`
  - `phase_changed` → `set_phase()`
  - `tool_started` → `add_activity()`
  - `tool_completed` → `complete_activity()`
  - `status_changed` → `set_status()`

- [ ] 1.3 Integrate with keyboard handler from tui-integration-implementation
  - Handle pause/resume commands from keyboard
  - Forward to engine control methods

#### Phase 2: PlainText Adapter
- [ ] 2.1 Create `scripts/lib/adapters/plain_text.py`
  - Implement print-based output matching current `--no-tui` behavior
  - Format events as human-readable log lines
  - No external dependencies

- [ ] 2.2 Add progress formatting
  - Progress bar using ASCII characters
  - Phase and task status lines
  - Error and warning formatting

#### Phase 3: JSON Stream Adapter
- [ ] 3.1 Create `scripts/lib/adapters/json_stream.py`
  - Output newline-delimited JSON events
  - Support stdout or file output
  - Include all event fields

- [ ] 3.2 Add `--output-events <file>` flag to plan_orchestrator.py
  - Enable JSON adapter alongside primary adapter
  - Write events to specified file

#### Phase 4: Integration
- [ ] 4.1 Update `scripts/plan_orchestrator.py` to use OrchestrationEngine
  - Import engine and adapters
  - Create adapter based on CLI flags
  - Pass adapter to engine constructor

- [ ] 4.2 Add adapter selection CLI flags
  - `--adapter <tui|plain|json>` flag
  - Keep `--no-tui` as alias for `--adapter plain`
  - Auto-detect TUI capability

- [ ] 4.3 Verify backwards compatibility
  - Existing CLI usage unchanged
  - TUI behavior identical
  - All tests pass

#### Phase 5: Verification
- [ ] 5.1 Unit tests for RichTUIAdapter
- [ ] 5.2 Unit tests for PlainTextAdapter
- [ ] 5.3 Unit tests for JSONStreamAdapter
- [ ] 5.4 Integration test: full orchestration with each adapter

**Success Criteria:**
- All three adapters work correctly
- Backwards compatibility maintained
- `--adapter` flag functional

---

### Plan 4: orchestrator-external-adapters
**Goal:** Enable external connections via socket and web (leveraging existing infrastructure)

**Tasks:** 16 | **Estimated Iterations:** 4

**Note:** This plan leverages the REST API and WebSocket infrastructure from git-workflow-phase5-worktrees.

#### Phase 1: Socket Adapter (Multi-Viewer Support)
- [ ] 1.1 Create `scripts/lib/adapters/socket_server.py`
  - Integrate with multi-orchestrator process management from phase5
  - Use Unix socket at `/tmp/orchestrator-{plan-name}.sock`
  - Broadcast events to connected clients

- [ ] 1.2 Create `scripts/lib/orchestrator_client.py`
  - Connect to orchestrator socket
  - Receive event stream
  - Send control commands

- [ ] 1.3 Create `scripts/orchestrator_viewer.py`
  - Connect using OrchestratorClient
  - Display status using RichTUIManager (read-only)
  - Support `--socket <path>` argument

#### Phase 2: Web Adapter (Extend Existing API)
- [ ] 2.1 Extend `scripts/api-server.js` with orchestration endpoints
  - Add `/api/orchestration/events` SSE endpoint
  - Add `/api/orchestration/control` for commands
  - Integrate with existing `/api/plans/*` endpoints

- [ ] 2.2 Create `scripts/lib/adapters/web_server.py`
  - Python adapter that connects to api-server.js
  - Forward events via HTTP POST
  - Receive commands via polling or callback

- [ ] 2.3 Extend web UI from phase5 with orchestration panels
  - Add real-time event display
  - Add control buttons (pause/resume/cancel)
  - Integrate with existing plan dashboard

#### Phase 3: CLI Integration
- [ ] 3.1 Add `--socket` flag to plan_orchestrator.py
  - Enable socket adapter alongside primary adapter
  - Combine: `--adapter tui --socket`

- [ ] 3.2 Add `--web` flag integration
  - Connect to api-server.js if running
  - Start api-server.js if not running and `--web` specified

- [ ] 3.3 Document socket and web usage

#### Phase 4: Verification
- [ ] 4.1 Test socket client connecting to orchestrator
- [ ] 4.2 Test viewer displaying live status
- [ ] 4.3 Test web dashboard with orchestration events
- [ ] 4.4 Test control commands from web interface

**Success Criteria:**
- Multiple viewers can connect simultaneously
- Web dashboard shows real-time updates
- Control commands work from all interfaces

---

## Dependency Graph

```
orchestrator-event-protocol
           │
           ▼
orchestrator-engine-extraction
           │
           ▼
orchestrator-core-adapters
           │
           ▼
orchestrator-external-adapters
```

All plans are sequential - each depends on the previous.

---

## Task Count Summary

| Plan | Tasks | Est. Iterations |
|------|-------|-----------------|
| orchestrator-event-protocol | 12 | 3 |
| orchestrator-engine-extraction | 15 | 4 |
| orchestrator-core-adapters | 18 | 5 |
| orchestrator-external-adapters | 16 | 4 |
| **Total** | **61** | **~16** |

vs. Original: 27 tasks, ~7 iterations

The split adds tasks because:
1. Original tasks were too high-level
2. More specific tasks reduce implementation risk
3. Leveraging existing infrastructure requires integration work
4. Better test coverage

---

## Integration Points with Existing Infrastructure

### Configuration
Extend `.claude/git-workflow.json`:
```json
{
  "adapters": {
    "default": "tui",
    "fallback": "plain",
    "socket": {
      "enabled": false,
      "path": "/tmp/orchestrator-{plan}.sock"
    },
    "web": {
      "enabled": false,
      "api_server": "http://localhost:3100"
    }
  }
}
```

### REST API Extension
Add to existing `scripts/api-server.js`:
- `GET /api/orchestration/status` - Current orchestration state
- `GET /api/orchestration/events` - SSE event stream
- `POST /api/orchestration/control` - Send control command

### TUI Integration
Leverage from tui-integration-implementation:
- Keyboard handler for pause/resume
- Panel infrastructure for adapter status
- Command palette for adapter switching

---

## Recommendations

1. **Execute in order** - Each plan depends on the previous
2. **Start with event-protocol** - Defines contracts for everything else
3. **Core adapters before external** - Get basic functionality working first
4. **Leverage existing code** - Don't duplicate api-server.js or TUI patterns

---

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| API server integration complexity | MEDIUM | Clear interface boundaries |
| Socket security | LOW | Unix socket with user perms |
| Performance overhead | LOW | Async event emission |
| Breaking existing orchestrator | HIGH | Comprehensive backwards compat testing |
