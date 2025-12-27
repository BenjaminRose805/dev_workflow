# Deep Analysis: Web App UI vs Orchestrator/Event-Bus Issues

**Generated:** 2025-12-27
**Analysis Method:** Multi-agent parallel exploration (6 agents)
**Scope:** Orchestrator system, API servers (Python/JS), Event Bus, TUI, Dashboard plans

---

## Executive Summary

This analysis identified **27 distinct issues** between the web-app-ui components (TUI and planned Next.js dashboard) and the orchestrator/event-bus system. The issues fall into 5 categories:

| Category | Critical | High | Medium | Low |
|----------|----------|------|--------|-----|
| API Contract Mismatches | 3 | 2 | 2 | 0 |
| Event Bus Gaps | 1 | 3 | 2 | 0 |
| Type System Failures | 2 | 1 | 0 | 0 |
| Implementation Gaps | 1 | 4 | 3 | 0 |
| Data Flow Disconnects | 0 | 2 | 1 | 0 |

**Key Finding:** The OpenAPI specification and implementation plans describe **fundamentally different API structures** - one uses plan-centric paths (`/api/plans/{name}/*`) while the other uses orchestrator-centric paths (`/api/orchestrators/{id}/*`). This is a **blocking issue** for dashboard development.

---

## Issue Catalog

### Category 1: API Contract Mismatches

#### ISSUE-01: Endpoint Path Structure Conflict (CRITICAL)
**Severity:** CRITICAL | **Impact:** Dashboard non-functional

**Description:**
The OpenAPI spec uses plan-centric paths while the API Server implementation plan uses orchestrator-centric paths:

| Operation | OpenAPI Path | Implementation Path |
|-----------|--------------|---------------------|
| Start | `POST /api/plans/{name}/start` | (not directly mapped) |
| Stop | `POST /api/plans/{name}/stop` | `POST /api/orchestrators/{id}/shutdown` |
| Pause | (not defined) | `POST /api/orchestrators/{id}/pause` |
| Resume | (not defined) | `POST /api/orchestrators/{id}/resume` |

**Files Affected:**
- `docs/api/openapi.yaml`
- `scripts/orchestrator_server.py`
- `docs/plans/archive/orchestrator-api-server.md`

**Resolution Required:** Unify endpoint paths before dashboard development

---

#### ISSUE-02: Missing Endpoints in OpenAPI (HIGH)
**Severity:** HIGH | **Impact:** Incomplete API documentation

**Description:**
The OpenAPI specification is missing several endpoints defined in implementation:

| Missing Endpoint | Planned In | Purpose |
|------------------|-----------|---------|
| `/api/orchestrators` | API Server Plan | List all orchestrator instances |
| `/api/orchestrators/{id}/pause` | API Server Plan | Pause execution |
| `/api/orchestrators/{id}/resume` | API Server Plan | Resume execution |
| `/api/orchestrators/{id}/skip-task` | API Server Plan | Skip task |
| `/api/plans/{name}/tasks` | API Server Plan | List tasks |
| `/api/plans/{name}/findings` | API Server Plan | List findings |

**Files Affected:**
- `docs/api/openapi.yaml`

---

#### ISSUE-03: WebSocket Schema Undefined (CRITICAL)
**Severity:** CRITICAL | **Impact:** Real-time updates won't work

**Description:**
OpenAPI references WebSocket support in documentation but provides no formal schema:
- No WebSocket message types defined
- No event payload schemas
- References "WebSocket message format documentation" that doesn't exist

**API Server Plan Defines:**
```python
class WebSocketEvent(BaseModel):
    type: str  # status_update, tool_started, tool_completed, task_changed
    timestamp: datetime
    instance_id: str
    data: dict
```

**Files Affected:**
- `docs/api/openapi.yaml` (missing schemas)
- `scripts/orchestrator_server.py` (has implementation)

---

#### ISSUE-04: Field Naming Inconsistency (MEDIUM)
**Severity:** MEDIUM | **Impact:** Frontend parsing errors

**Description:**
Mixed naming conventions between OpenAPI and implementation:

| Field | OpenAPI | Implementation |
|-------|---------|----------------|
| Timestamps | `startedAt`, `lastUpdatedAt` (camelCase) | `started_at`, `last_updated_at` (snake_case) |
| Status | `running: boolean` | `status: enum` with 4 states |

---

#### ISSUE-05: Missing Response Codes (MEDIUM)
**Severity:** MEDIUM | **Impact:** Incomplete error handling

**Description:**
- OpenAPI: Defines 200, 404, 409, 500
- Implementation: Uses 503 for IPC timeout (not in OpenAPI)

---

#### ISSUE-06: Authentication Not Implemented (CRITICAL)
**Severity:** CRITICAL | **Impact:** Security vulnerability

**Description:**
OpenAPI documents Bearer token authentication, but:
- No implementation in orchestrator_server.py
- No validation logic in api-server.js
- Only CORS mentioned in implementation plan

---

#### ISSUE-07: OrchestratorStatus Model Mismatch (HIGH)
**Severity:** HIGH | **Impact:** Dashboard displays wrong data

**Description:**
OpenAPI `OrchestratorInfo`:
```yaml
running: boolean
pid: integer
mode: enum [batch, continuous]
```

Implementation `OrchestratorStatus`:
```python
status: Literal["running", "paused", "stopping", "stopped"]
progress_percent: float
completed_tasks: int
total_tasks: int
pending_tasks: int
failed_tasks: int
current_phase: str
```

Much richer data in implementation not exposed via OpenAPI contract.

---

### Category 2: Event Bus Gaps

#### ISSUE-08: No Agent Lifecycle Events (CRITICAL)
**Severity:** CRITICAL | **Impact:** Can't track parallel agents

**Description:**
When Claude spawns Task tool agents, no events are emitted:
- TUI can't display parallel agent status
- Dashboard can't show agent count
- No visibility into agent completion

**Current Flow:**
```
Claude spawns Task → No event → TUI doesn't know
```

**Needed Flow:**
```
Claude spawns Task → Emit agent.spawn → TUI tracks
```

---

#### ISSUE-09: Missing Constraint Events (HIGH)
**Severity:** HIGH | **Impact:** No visibility into sequential filtering

**Description:**
`_filter_sequential_tasks()` applies constraints but emits no events:
- TUI can't show why tasks were held back
- Dashboard can't display constraint reasoning

**Location:** `scripts/plan_orchestrator.py`

---

#### ISSUE-10: Missing Phase Transition Events (HIGH)
**Severity:** HIGH | **Impact:** No phase completion notifications

**Description:**
Phase changes detected via polling but no explicit events:
- `PHASE_CHANGED` event exists but not reliably emitted
- 80% threshold milestones not surfaced

---

#### ISSUE-11: Missing IPC Command Events (HIGH)
**Severity:** HIGH | **Impact:** TUI doesn't reflect commands

**Description:**
When pause/resume/shutdown commands received via IPC:
- No event emitted
- TUI status message not updated
- Dashboard can't reflect command execution

**Location:** `scripts/lib/orchestrator_ipc.py`

---

#### ISSUE-12: Git Commit Detection Missing (MEDIUM)
**Severity:** MEDIUM | **Impact:** No commit notifications

**Description:**
Orchestrator doesn't watch for git commits:
- No `.git/logs` watching
- No commit event emission
- Dashboard can't show commit activity

---

#### ISSUE-13: Batch Composition Rationale Not Exposed (MEDIUM)
**Severity:** MEDIUM | **Impact:** Opaque task selection

**Description:**
`get_next_tasks()` returns tasks but not reasoning:
- Why were these tasks selected?
- Why were others skipped?
- No transparency for debugging

---

### Category 3: Type System Failures

#### ISSUE-14: None Handling in keyboard.py (CRITICAL)
**Severity:** CRITICAL | **Impact:** Runtime crashes

**Description:**
42 type errors in mypy analysis, primarily None handling:

```python
# scripts/tui/keyboard.py - Lines 373-377, 427, 433
self._fd = None  # Type: Optional[int]
...
old_settings = termios.tcgetattr(self._fd)  # ERROR: fd could be None
```

**Files Affected:**
- `scripts/tui/keyboard.py` (10+ None issues)

---

#### ISSUE-15: List Type Mismatch in panels.py (CRITICAL)
**Severity:** CRITICAL | **Impact:** Runtime type error

**Description:**
```python
# scripts/tui/panels.py
panel_content: list[Table] = []
panel_content.append(Text("..."))  # ERROR: Text is not Table
```

---

#### ISSUE-16: Literal Type Mismatch (HIGH)
**Severity:** HIGH | **Impact:** Type validation failures

**Description:**
Literal types in orchestrator_server.py don't match all cases:
- Status enum has gaps
- Some states not handled

---

### Category 4: Implementation Gaps

#### ISSUE-17: TUI Missing Execution Controls (CRITICAL)
**Severity:** CRITICAL | **Impact:** Can't control orchestrator from TUI

**Description:**
TUI lacks:
- Pause/Resume/Stop modal
- Stuck detection panel
- Retry tracking badges
- Error detail modals

IPC infrastructure exists but no UI.

**Location:** `scripts/tui/`

---

#### ISSUE-18: WebSocket Heartbeat Incomplete (HIGH)
**Severity:** HIGH | **Impact:** Connection drops undetected

**Description:**
- Ping/pong heartbeat partially implemented
- No automatic reconnection logic
- Stale connection cleanup may leak memory

**Location:** `scripts/orchestrator_server.py`

---

#### ISSUE-19: WebSocket Backpressure Missing (HIGH)
**Severity:** HIGH | **Impact:** Client buffer overflow

**Description:**
Fast events could overwhelm slow clients:
- No buffering strategy
- No throttling
- No dropped event handling

---

#### ISSUE-20: --api-server Flag Not Implemented (HIGH)
**Severity:** HIGH | **Impact:** Can't run API alongside orchestrator

**Description:**
Plan specifies `--api-server` flag in plan_orchestrator.py but:
- Flag not implemented
- API server only runs standalone
- Can't embed in orchestrator process

---

#### ISSUE-21: E2E Tests Failing (HIGH)
**Severity:** HIGH | **Impact:** Can't verify changes

**Description:**
- `test-orchestrator-e2e.py` has 4 failing tests
- `plan-orchestrator.js status` returns no output
- `npm test` not configured

---

#### ISSUE-22: Duplicate TUI Module (MEDIUM)
**Severity:** MEDIUM | **Impact:** Import confusion

**Description:**
Two modules named `tui`:
- `scripts/tui/` (directory)
- `scripts/lib/tui.py` (file)

Causes import path confusion.

---

#### ISSUE-23: Next.js Dashboard Not Started (MEDIUM)
**Severity:** MEDIUM | **Impact:** No web UI

**Description:**
`orchestrator-dashboard-nextjs.md` plan exists but:
- No code written
- No repository created
- Blocked on API stabilization

---

#### ISSUE-24: Event Filtering by Instance ID Untested (MEDIUM)
**Severity:** MEDIUM | **Impact:** Wrong events to clients

**Description:**
WebSocket endpoint accepts instance_id but:
- Filtering logic not tested
- Multi-tenant scenarios undefined

---

### Category 5: Data Flow Disconnects

#### ISSUE-25: Status File vs API Field Names (HIGH)
**Severity:** HIGH | **Impact:** Parsing errors

**Description:**
```json
// status.json
{"totalTasks": 10, "completed": 5}

// API Response
{"total_tasks": 10, "completed_tasks": 5}
```

Field name transformation not documented.

---

#### ISSUE-26: Task Actions Missing Orchestrator Integration (HIGH)
**Severity:** HIGH | **Impact:** Can't act on tasks from UI

**Description:**
TUI can run `/plan:explain` but can't:
- Skip task (requires status-cli.js)
- Retry task (requires state reset)
- Mark failed with reason
- Extend stuck threshold

---

#### ISSUE-27: No Optimistic Updates (MEDIUM)
**Severity:** MEDIUM | **Impact:** Slow perceived performance

**Description:**
- TUI uses direct state mutation
- No optimistic update pattern
- No rollback on failure
- State can diverge from server

---

## Priority Matrix

### Immediate (Blocking)
1. **ISSUE-01:** Endpoint path structure conflict
2. **ISSUE-03:** WebSocket schema undefined
3. **ISSUE-06:** Authentication not implemented
4. **ISSUE-08:** No agent lifecycle events
5. **ISSUE-14:** None handling in keyboard.py
6. **ISSUE-15:** List type mismatch in panels.py
7. **ISSUE-17:** TUI missing execution controls

### Short-term (Next Sprint)
8. **ISSUE-02:** Missing endpoints in OpenAPI
9. **ISSUE-07:** OrchestratorStatus model mismatch
10. **ISSUE-09:** Missing constraint events
11. **ISSUE-10:** Missing phase transition events
12. **ISSUE-11:** Missing IPC command events
13. **ISSUE-18:** WebSocket heartbeat incomplete
14. **ISSUE-19:** WebSocket backpressure missing
15. **ISSUE-20:** --api-server flag not implemented
16. **ISSUE-21:** E2E tests failing
17. **ISSUE-25:** Status file vs API field names
18. **ISSUE-26:** Task actions missing orchestrator integration

### Medium-term (Backlog)
19. **ISSUE-04:** Field naming inconsistency
20. **ISSUE-05:** Missing response codes
21. **ISSUE-12:** Git commit detection missing
22. **ISSUE-13:** Batch composition rationale not exposed
23. **ISSUE-16:** Literal type mismatch
24. **ISSUE-22:** Duplicate TUI module
25. **ISSUE-23:** Next.js dashboard not started
26. **ISSUE-24:** Event filtering by instance ID untested
27. **ISSUE-27:** No optimistic updates

---

## Recommendations

### 1. Unify API Contract (Week 1)
- Choose plan-centric OR orchestrator-centric paths
- Update OpenAPI to match implementation
- Add WebSocket message schemas
- Define authentication requirements

### 2. Fix Type System (Week 1)
- Run mypy strict mode on TUI
- Add None guards in keyboard.py
- Fix list type in panels.py
- Resolve module naming conflict

### 3. Implement Missing Events (Week 2)
- Add agent.spawn/agent.complete events
- Emit constraint.applied events
- Surface IPC commands as events
- Add phase milestone events

### 4. Complete TUI Controls (Week 2-3)
- Implement pause/resume/stop modal
- Add stuck detection panel
- Integrate with IPC
- Test end-to-end

### 5. Stabilize WebSocket (Week 3)
- Implement proper heartbeat
- Add backpressure handling
- Test multi-client scenarios
- Document reconnection pattern

### 6. Start Dashboard (Week 4+)
- Create Next.js project
- Implement Phase 1 (orchestrator list)
- Connect to stabilized API
- Add WebSocket integration

---

## Files Requiring Changes

| File | Issues |
|------|--------|
| `docs/api/openapi.yaml` | 01, 02, 03, 04, 05, 07 |
| `scripts/orchestrator_server.py` | 01, 06, 07, 18, 19, 20 |
| `scripts/api-server.js` | 01, 06, 25 |
| `scripts/plan_orchestrator.py` | 08, 09, 10, 20 |
| `scripts/lib/orchestrator_ipc.py` | 11 |
| `scripts/lib/event_bus.py` | 08, 09, 10, 11 |
| `scripts/tui/keyboard.py` | 14 |
| `scripts/tui/panels.py` | 15, 17 |
| `scripts/tui/__init__.py` | 17, 22 |
| `scripts/lib/tui.py` | 22 |

---

## Conclusion

The orchestrator system has a solid architectural foundation with good separation of concerns (event bus, IPC, registry). However, significant gaps exist between:
1. The documented API contracts (OpenAPI)
2. The planned implementations (markdown plans)
3. The actual code (Python/JS)

The critical path to a working web dashboard requires:
1. API contract unification
2. Type system fixes
3. Event streaming completion
4. TUI control implementation

Without addressing the API path mismatch (ISSUE-01), the dashboard cannot be developed.
