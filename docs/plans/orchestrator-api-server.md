# Implementation Plan: Orchestrator API Server

## Overview

- **Objective:** Create a FastAPI-based HTTP/WebSocket server that exposes orchestrator state and commands for a Next.js frontend
- **Priority:** P1 (New Feature)
- **Created:** 2025-12-27
- **Output:** `docs/plan-outputs/orchestrator-api-server/`

> This plan implements a decoupled API layer so the plan orchestrator can be controlled from a web frontend instead of (or alongside) the terminal TUI.

---

## Dependencies

### Upstream
- Existing `scripts/plan_orchestrator.py` - core orchestration logic
- Existing `scripts/lib/orchestrator_ipc.py` - IPC protocol
- Existing `scripts/lib/orchestrator_registry.py` - instance tracking
- Existing `scripts/lib/status_monitor.py` - file watching

### New Dependencies (Python packages)
- `fastapi` - async web framework
- `uvicorn` - ASGI server
- `websockets` - WebSocket support (included with fastapi)
- `pydantic` - data validation (included with fastapi)

---

## Phase 1: Event Bus Foundation

**Objective:** Create an event bus that decouples event producers from consumers.

- [ ] 1.1 Create `scripts/lib/event_bus.py` with async event bus implementation
  - Define `EventType` enum: `STATUS_UPDATED`, `TOOL_STARTED`, `TOOL_COMPLETED`, `TASK_CHANGED`, `PHASE_CHANGED`, `ORCHESTRATOR_STATE`
  - Implement `EventBus` class with `subscribe(event_type, callback)`, `unsubscribe()`, `emit(event_type, data)`
  - Support both sync and async callbacks
  - Add thread-safe event queue for cross-thread publishing
  - Include event filtering by orchestrator instance ID

- [ ] 1.2 Integrate event bus into `StatusMonitor` in `scripts/lib/status_monitor.py`
  - Add optional `event_bus` parameter to `StatusMonitor.__init__()`
  - On status.json change, emit `STATUS_UPDATED` event with full status data
  - Emit `TASK_CHANGED` for individual task status transitions
  - Emit `PHASE_CHANGED` when currentPhase changes
  - Maintain backward compatibility (existing callbacks still work)

- [ ] 1.3 Integrate event bus into `StreamingClaudeRunner` in `scripts/lib/claude_runner.py`
  - Add optional `event_bus` parameter
  - Emit `TOOL_STARTED` when tool call begins (with tool name, ID, input summary)
  - Emit `TOOL_COMPLETED` when tool call ends (with duration, success/failure)
  - Include orchestrator instance ID in all events

**VERIFY 1:** Write test script that subscribes to event bus, runs a mock status update, confirms events received

---

## Phase 2: FastAPI Server Core

**Objective:** Create the HTTP server with REST endpoints for querying state.

- [ ] 2.1 Create `scripts/orchestrator_server.py` with FastAPI application
  - Set up FastAPI app with CORS middleware (allow Next.js origins)
  - Add `/health` endpoint for liveness checks
  - Add `/api/orchestrators` GET endpoint - list all registered instances from registry
  - Add `/api/orchestrators/{instance_id}/status` GET endpoint - return full status including tasks, progress, phase
  - Add Pydantic models for all response types: `OrchestratorInfo`, `TaskInfo`, `StatusResponse`
  - Read from `status.json` and registry for current state

- [ ] 2.2 Add command endpoints that proxy to existing IPC
  - Add `/api/orchestrators/{instance_id}/pause` POST - send pause command via IPC
  - Add `/api/orchestrators/{instance_id}/resume` POST - send resume command via IPC
  - Add `/api/orchestrators/{instance_id}/shutdown` POST - send shutdown command via IPC
  - Add `/api/orchestrators/{instance_id}/skip-task` POST - call status-cli.js to skip task
  - Add `/api/orchestrators/{instance_id}/retry-task` POST - reset task for retry
  - Return appropriate HTTP status codes (200 OK, 404 Not Found, 503 Unavailable)

- [ ] 2.3 Add plan and task query endpoints
  - Add `/api/plans` GET - list available plans from `docs/plans/`
  - Add `/api/plans/{plan_name}/status` GET - get status.json for a specific plan
  - Add `/api/plans/{plan_name}/tasks` GET - list all tasks with their status
  - Add `/api/plans/{plan_name}/findings` GET - list findings files for a plan
  - Add `/api/plans/{plan_name}/findings/{task_id}` GET - get finding content

**VERIFY 2:** Start server with `uvicorn`, curl endpoints, confirm JSON responses match expected schema

---

## Phase 3: WebSocket Real-time Streaming

**Objective:** Add WebSocket endpoint for real-time event streaming to frontend.

- [ ] 3.1 Implement WebSocket endpoint with event bus subscription
  - Add `/api/orchestrators/{instance_id}/events` WebSocket endpoint
  - On connection: subscribe to event bus for that instance ID
  - On event: serialize and send to WebSocket client as JSON
  - On disconnect: unsubscribe from event bus
  - Handle multiple concurrent WebSocket clients
  - Add connection heartbeat/ping to detect stale connections

- [ ] 3.2 Implement activity stream endpoint
  - Add `/api/orchestrators/{instance_id}/activity` WebSocket endpoint (tool calls only)
  - Filter to only `TOOL_STARTED` and `TOOL_COMPLETED` events
  - Include tool name, duration, input summary in each message
  - Support backpressure if client falls behind

- [ ] 3.3 Add Server-Sent Events (SSE) alternative
  - Add `/api/orchestrators/{instance_id}/events-sse` GET endpoint
  - Same event data as WebSocket but via SSE (simpler for some clients)
  - Useful for environments where WebSocket is problematic

**VERIFY 3:** Connect to WebSocket from browser console, trigger orchestrator activity, confirm events stream in real-time

---

## Phase 4: Orchestrator Integration

**Objective:** Wire the API server to run alongside or instead of TUI.

- [ ] 4.1 Add API server mode to `plan_orchestrator.py`
  - Add `--api-server` flag to enable HTTP server alongside orchestration
  - Add `--api-port` flag (default 8000)
  - Add `--api-only` flag to run server without starting orchestration (monitor mode)
  - Create event bus instance and pass to StatusMonitor and StreamingClaudeRunner
  - Start uvicorn in background thread when API mode enabled
  - Ensure graceful shutdown stops both orchestrator and API server

- [ ] 4.2 Create standalone server runner script
  - Create `scripts/run_api_server.py` for running API server independently
  - Can monitor multiple orchestrator instances
  - Useful for dashboard that shows all running plans
  - Add `--host` and `--port` configuration
  - Add `--reload` flag for development

**VERIFY 4:** Run `python scripts/plan_orchestrator.py --api-server`, confirm both TUI and API work simultaneously

---

## Phase 5: Documentation and TypeScript Types

**Objective:** Generate API documentation and TypeScript types for Next.js.

- [ ] 5.1 Generate OpenAPI spec and TypeScript types
  - FastAPI auto-generates OpenAPI at `/docs` and `/openapi.json`
  - Use `openapi-typescript` to generate TypeScript types from OpenAPI spec
  - Create `api-types.ts` file for Next.js project consumption
  - Document all endpoints with examples in docstrings
  - Add README section on API usage

**VERIFY 5:** Access `/docs` in browser, see interactive API documentation. Generate TypeScript types successfully.

---

## Success Criteria

### Functional Requirements
- [ ] `GET /api/orchestrators` returns list of running instances
- [ ] `GET /api/orchestrators/{id}/status` returns current progress and tasks
- [ ] `POST /api/orchestrators/{id}/pause` pauses execution
- [ ] `POST /api/orchestrators/{id}/resume` resumes execution
- [ ] `POST /api/orchestrators/{id}/shutdown` stops orchestrator
- [ ] WebSocket streams events in real-time (<100ms latency)
- [ ] Multiple WebSocket clients can connect simultaneously
- [ ] API server can run standalone or alongside orchestrator

### Quality Requirements
- [ ] All endpoints return proper JSON with Pydantic validation
- [ ] Errors return appropriate HTTP status codes
- [ ] CORS configured for frontend origins
- [ ] No memory leaks from WebSocket connections
- [ ] Graceful handling of orchestrator disconnect

---

## API Response Models

```python
# For reference - actual implementation in orchestrator_server.py

class TaskInfo(BaseModel):
    id: str
    description: str
    status: Literal["pending", "in_progress", "completed", "failed", "skipped"]
    phase: str
    retry_count: int = 0
    last_error: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

class OrchestratorStatus(BaseModel):
    instance_id: str
    plan_path: str
    plan_name: str
    status: Literal["running", "paused", "stopping", "stopped"]
    progress_percent: float
    completed_tasks: int
    total_tasks: int
    pending_tasks: int
    failed_tasks: int
    current_phase: str
    iteration: int
    max_iterations: int
    started_at: datetime

class WebSocketEvent(BaseModel):
    type: str  # status_update, tool_started, tool_completed, task_changed
    timestamp: datetime
    instance_id: str
    data: dict
```

---

## File Structure

```
scripts/
├── lib/
│   ├── event_bus.py          # NEW - async event bus
│   ├── status_monitor.py     # MODIFY - add event bus integration
│   └── claude_runner.py      # MODIFY - add event bus integration
├── orchestrator_server.py    # NEW - FastAPI application
├── run_api_server.py         # NEW - standalone server runner
└── plan_orchestrator.py      # MODIFY - add --api-server flag
```

---

## Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| WebSocket memory leaks | HIGH | MEDIUM | Connection timeout, proper cleanup on disconnect |
| Event bus thread safety | HIGH | LOW | Use asyncio.Queue, proper locking |
| IPC timeout during command | MEDIUM | MEDIUM | Reasonable timeout, return 503 on failure |
| Large status.json parsing | LOW | LOW | Lazy loading, pagination for task lists |
