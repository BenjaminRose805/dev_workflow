# Analysis Plan: Orchestrator UI Decoupling

## Overview

- **Goal:** Decouple the orchestration engine from UI rendering so multiple interfaces (TUI, web, streaming viewer) can plug in
- **Priority:** P1
- **Created:** 2024-12-25
- **Type:** Architecture Analysis + Implementation Plan
- **Output:** docs/plan-outputs/orchestrator-ui-decoupling/

> Task findings are written to the `findings/` subdirectory. Use `/plan:status` to view progress.

## Problem Statement

Currently, `scripts/plan_orchestrator.py` has tight coupling between:
1. **Orchestration logic** (running Claude, tracking status, deciding next steps)
2. **UI rendering** (Rich TUI panels, print statements, progress bars)

This prevents:
- Using a web interface to monitor orchestration
- Running a dedicated "viewer" that streams status without control
- Building alternative UIs (simpler TUI, GUI, mobile)
- Headless/daemon mode with external status queries

## Current Architecture Analysis

```
┌─────────────────────────────────────────────────────────────┐
│                    plan_orchestrator.py                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐  │
│  │ Orchestration   │──│ Direct TUI      │──│ print()     │  │
│  │ Logic           │  │ Calls           │  │ statements  │  │
│  └─────────────────┘  └─────────────────┘  └─────────────┘  │
│           │                    │                    │        │
│           ▼                    ▼                    ▼        │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              RichTUIManager (or stdout)                 ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Coupling Points Identified

| Location | Type | Description |
|----------|------|-------------|
| `PlanOrchestrator.__init__` | Direct ref | `self.tui: Optional[RichTUIManager]` |
| `print_header()` | Print | Direct stdout for non-TUI mode |
| `print_progress()` | Print | Direct stdout for non-TUI mode |
| `print_completion()` | Print | Direct stdout for non-TUI mode |
| `on_tool_started()` | TUI call | `self.tui.add_activity()` |
| `on_tool_completed()` | TUI call | `self.tui.complete_activity()` |
| `run()` loop | TUI calls | `self.tui.set_progress()`, `set_status()` |
| `_update_status_display()` | TUI call | `self.tui.update_tasks()` |

---

## Phase 0: Define Event Protocol

- [ ] 0.1 Define the event types the orchestration engine emits
  - Document each event with payload schema
  - Events should be serializable (JSON-compatible)
  - Consider: `orchestration_started`, `orchestration_completed`, `iteration_started`, `iteration_completed`, `tool_started`, `tool_completed`, `status_changed`, `error_occurred`
  - Write findings to `docs/plan-outputs/orchestrator-ui-decoupling/findings/0.1-event-types.md`

- [ ] 0.2 Define the control commands the engine accepts
  - Commands: `pause`, `resume`, `cancel`, `skip_task`, `retry_task`
  - Define command payloads and responses
  - Write findings to `docs/plan-outputs/orchestrator-ui-decoupling/findings/0.2-control-commands.md`

- [ ] 0.3 Create event/command JSON schema
  - Create `scripts/lib/schemas/orchestrator-protocol.json` with JSON Schema definitions
  - Include version field for protocol evolution
  - Document wire format (newline-delimited JSON for streaming)

---

## Phase 1: Create Abstract UI Interface

- [ ] 1.1 Define `OrchestratorUIAdapter` abstract base class
  - Create `scripts/lib/ui_adapter.py`
  - Define abstract methods for each event type
  - Include lifecycle methods: `start()`, `stop()`, `is_active()`
  - Support both sync and async adapters

- [ ] 1.2 Define event dataclasses
  - Create `scripts/lib/events.py`
  - Define typed dataclasses for each event (not just dicts)
  - Include `to_json()` and `from_json()` methods
  - Add timestamp field to all events

- [ ] 1.3 Create `NullAdapter` implementation
  - No-op adapter for headless/daemon mode
  - Useful for testing and background runs
  - Logs events to file optionally

---

## Phase 2: Extract Core Engine

- [ ] 2.1 Create `OrchestrationEngine` class
  - Create `scripts/lib/orchestration_engine.py`
  - Move pure orchestration logic from `PlanOrchestrator`
  - No UI imports, no print statements
  - Accept `ui_adapter: OrchestratorUIAdapter` in constructor
  - Emit events via adapter methods

- [ ] 2.2 Implement event emission
  - Replace all `self.tui.*` calls with `self.adapter.on_*()` calls
  - Replace all `print()` with `self.adapter.on_log()` or similar
  - Ensure all state changes emit events

- [ ] 2.3 Add control command handling
  - Implement `pause()`, `resume()`, `cancel()` methods
  - Check for pause/cancel between iterations
  - Emit `paused`, `resumed`, `cancelled` events

---

## Phase 3: Create UI Adapters

- [ ] 3.1 Create `RichTUIAdapter`
  - Create `scripts/lib/adapters/rich_tui.py`
  - Wraps existing `RichTUIManager`
  - Implements `OrchestratorUIAdapter` interface
  - Translates events to TUI updates

- [ ] 3.2 Create `PlainTextAdapter`
  - Create `scripts/lib/adapters/plain_text.py`
  - Implements the print-based output currently in non-TUI mode
  - Simple, no dependencies beyond stdlib

- [ ] 3.3 Create `JSONStreamAdapter`
  - Create `scripts/lib/adapters/json_stream.py`
  - Outputs newline-delimited JSON events to stdout or file
  - Enables external consumers (web servers, other processes)
  - Add `--output-events <file>` flag to orchestrator

---

## Phase 4: External UI Support

- [ ] 4.1 Create Unix socket server adapter
  - Create `scripts/lib/adapters/socket_server.py`
  - Listens on Unix socket (e.g., `/tmp/orchestrator-{pid}.sock`)
  - Accepts multiple viewer connections
  - Broadcasts events to all connected clients
  - Accepts control commands from clients

- [ ] 4.2 Create socket client library
  - Create `scripts/lib/orchestrator_client.py`
  - Connect to running orchestrator via socket
  - Receive event stream
  - Send control commands
  - Reconnection handling

- [ ] 4.3 Create standalone viewer script
  - Create `scripts/orchestrator_viewer.py`
  - Connects to running orchestrator socket
  - Displays status using Rich TUI (read-only)
  - No control capabilities (view-only mode)
  - Add `--socket <path>` to specify which orchestrator to connect to

---

## Phase 5: Web Interface Foundation

- [ ] 5.1 Create HTTP/WebSocket server adapter
  - Create `scripts/lib/adapters/web_server.py`
  - Serve simple status page at `http://localhost:PORT`
  - WebSocket endpoint for real-time updates
  - REST endpoints for status queries: `GET /status`, `GET /tasks`
  - Control endpoints: `POST /pause`, `POST /resume`, `POST /cancel`

- [ ] 5.2 Create minimal web UI
  - Create `scripts/web/index.html` (single file, no build)
  - Display current plan, progress, active tools
  - WebSocket connection for live updates
  - Basic styling with inline CSS

- [ ] 5.3 Add web server CLI options
  - `--web` flag to enable web server
  - `--web-port PORT` to specify port (default: 8765)
  - `--web-host HOST` to specify bind address (default: localhost)

---

## Phase 6: Refactor plan_orchestrator.py

- [ ] 6.1 Update `plan_orchestrator.py` to use new architecture
  - Import `OrchestrationEngine` instead of containing logic
  - Select adapter based on CLI flags (`--tui`, `--plain`, `--json`, `--web`, `--socket`)
  - Keep backwards compatibility (default to TUI if available)

- [ ] 6.2 Update CLI argument parsing
  - Add `--adapter` flag with choices: `tui`, `plain`, `json`, `socket`, `web`
  - Add adapter-specific options
  - Update help text with examples

- [ ] 6.3 Deprecation and migration
  - Keep `--no-tui` working (maps to `--adapter plain`)
  - Add deprecation warning for old flags
  - Document migration path

---

## Phase 7: Testing

- [ ] 7.1 Unit tests for event protocol
  - Test event serialization/deserialization
  - Test all event types have correct fields
  - Test protocol version handling

- [ ] 7.2 Unit tests for adapters
  - Test each adapter receives and handles events correctly
  - Mock the underlying output (stdout, socket, etc.)
  - Test adapter lifecycle (start/stop)

- [ ] 7.3 Integration tests
  - Test full orchestration with each adapter type
  - Test socket client connecting to socket server
  - Test web UI receiving WebSocket events

---

## Phase 8: Documentation

- [ ] 8.1 Document the event protocol
  - Create `docs/orchestrator-protocol.md`
  - List all events with payload examples
  - List all commands with examples
  - Include sequence diagrams

- [ ] 8.2 Document adapter development
  - How to create a custom adapter
  - Interface requirements
  - Example: creating a Slack notification adapter

- [ ] 8.3 Update README with new options
  - Document all new CLI flags
  - Show examples for each adapter type
  - Explain when to use which adapter

---

## Proposed Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          plan_orchestrator.py                            │
│                         (CLI entry point only)                           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         OrchestrationEngine                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐  │
│  │ Status Monitor  │  │ Claude Runner   │  │ Task Scheduler          │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────┘  │
│                                    │                                     │
│                          emit(Event)                                     │
└────────────────────────────────────┼────────────────────────────────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
                    ▼                ▼                ▼
        ┌───────────────┐  ┌───────────────┐  ┌───────────────┐
        │ RichTUIAdapter│  │SocketAdapter  │  │ WebAdapter    │
        │               │  │               │  │               │
        │ ┌───────────┐ │  │ ┌───────────┐ │  │ ┌───────────┐ │
        │ │ TUIManager│ │  │ │Unix Socket│ │  │ │HTTP/WS Srv│ │
        │ └───────────┘ │  │ └───────────┘ │  │ └───────────┘ │
        └───────────────┘  └───────┬───────┘  └───────┬───────┘
                                   │                  │
                           ┌───────┴───────┐          │
                           │               │          │
                           ▼               ▼          ▼
                    ┌───────────┐   ┌───────────┐  ┌───────────┐
                    │ Viewer TUI│   │ Viewer TUI│  │ Web Browser│
                    │ (local)   │   │ (remote)  │  │           │
                    └───────────┘   └───────────┘  └───────────┘
```

---

## Success Criteria

- Orchestration runs identically regardless of adapter choice
- Multiple viewers can connect to a single orchestration session
- Web interface shows real-time updates via WebSocket
- New adapters can be created without modifying engine code
- All existing functionality preserved (backwards compatible)
- Event protocol is documented and versioned

## Risks

- **Performance:** Event emission overhead (mitigate: async emit, batching)
- **Complexity:** More files and abstractions (mitigate: clear interfaces)
- **Socket security:** Local socket permissions (mitigate: user-only perms)
- **Web security:** Open port on localhost (mitigate: localhost-only bind, optional auth)

## Dependencies

### Upstream
- None (this is foundational)

### Downstream
- `git-workflow-phase4-advanced` Phase 10 (completion prompt) - will use the adapter interface

### External Tools
- **Rich** - For TUI adapter (already used)
- **aiohttp** or **Flask** - For web adapter (new dependency, optional)
- **websockets** - For WebSocket support (new dependency, optional)
