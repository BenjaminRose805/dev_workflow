# Finding: Broken APIs - API Audit

## Summary
Analysis of three API servers and associated IPC interfaces reveals several issues related to response format inconsistencies, status codes, error handling, and potential schema mismatches between the documented OpenAPI specification and actual implementations.

## Issues Found

| Location | Issue | Severity | Repro Steps |
|----------|-------|----------|-------------|
| scripts/api-server.js:182-190 | Response format mismatch: Uses `data` wrapper for list, but OpenAPI schema uses `plans` key | Medium | GET /api/plans - response has `{data: [...]}` but schema expects `{plans: [...]}` |
| scripts/api-server.js:280-307 | Response format mismatch: Uses `data` wrapper for plan detail, but OpenAPI expects direct object | Medium | GET /api/plans/:name - response wrapped in `{data: {...}}` but schema expects unwrapped |
| scripts/api-server.js:386 | Start endpoint returns 200 on success, should return 201 Created | Low | POST /api/plans/:name/start - returns 200 instead of 201 for resource creation |
| scripts/orchestrator_server.py:350-353 | StatusResponse model uses `status` enum but StatusSummary uses different enum ("running"/"paused"/"stopping"/"stopped") vs ("pending"/"in_progress"/"completed"/"failed") | Medium | GET /api/orchestrators/:id/status - status field can have values not in client expectations |
| scripts/api-server.js:687-705 | handleGetPlanStatus response missing `data` wrapper but uses inconsistent format vs handleGetPlan | Low | GET /api/plans/:name/status - no wrapper while other endpoints use `{data: ...}` |
| scripts/orchestrator_server.py:517-518 | Missing error response when status.json exists but has invalid JSON | Medium | GET /api/plans/:name/status with corrupted status.json - returns 404 instead of 500 |
| scripts/api-server.js:268-269 | Activity sorting by timestamp may fail if timestamps are null/undefined | Low | GET /api/plans/:name with tasks missing timestamps - potential crash or incorrect sort |
| scripts/orchestrator_server.py:645-646 | Finding content read error returns 500 but message lacks context about which file failed | Low | GET /api/plans/:name/findings/:task_id with permission error |
| scripts/lib/orchestrator_ipc.py:268-269 | Server silently catches all exceptions in _handle_client - masks errors | Medium | Any IPC command with handler error - client receives no error info |
| scripts/api-server.js:529 | Logs endpoint returns 404 but should return 204 No Content for empty log file | Low | GET /api/plans/:name/logs with empty log file |
| scripts/orchestrator_server.py:381 | Health endpoint uses UTC time with manual "Z" suffix instead of timezone-aware datetime | Low | GET /health - timestamp format may not parse correctly in some clients |
| scripts/api-server.js:1055-1059 | startPlanWatcher creates watcher but may leave orphan if status.json doesn't exist | Low | WS /ws/plans/:name for plan without status.json - watcher not created but no error sent |
| scripts/api-server.js:776 | WorktreesListResponse uses `worktrees` key matching schema, but other list endpoints use `data` - inconsistent | Low | Comparing GET /api/worktrees vs GET /api/plans - different response envelope keys |
| scripts/orchestrator_server.py:1166-1167 | WebSocket close with custom code 4004 - not standard WebSocket close code | Low | Connect to WS for non-existent orchestrator - client may not handle custom code |
| scripts/api-server.js:420-423 | No validation that plan file exists in stop endpoint before checking registry | Low | POST /api/plans/:name/stop for deleted plan - misleading error message |

## Root Cause Analysis

The issues stem from three main causes:

1. **Dual API Implementation**: There are two separate API servers (Node.js `api-server.js` and Python `orchestrator_server.py`) with overlapping but not identical functionality. This creates inconsistency in response formats and status handling.

2. **Schema-Implementation Drift**: The OpenAPI specification (`docs/api/openapi.yaml`) documents one response format (e.g., using `plans` as the array key) but the actual implementation uses different keys (e.g., `data`). This indicates the spec was written before implementation or not updated after changes.

3. **Inconsistent Error Handling Patterns**: The IPC layer (`orchestrator_ipc.py`) silently swallows errors, while the HTTP APIs have varied approaches to error propagation - some return detailed error objects, others return generic 500 responses.

## Recommended Fixes

1. **Align Response Envelopes**: Choose one consistent pattern (either always wrap in `{data: ...}` or use semantic keys like `plans`, `worktrees`) and update both OpenAPI spec and implementations to match.

2. **Fix Status Code Semantics**:
   - POST /api/plans/:name/start should return 201 Created on success
   - Empty log file should return 204 No Content, not 404
   - Invalid JSON in status.json should return 500, not 404

3. **Add IPC Error Propagation**: Modify `orchestrator_ipc.py` to log and return meaningful error messages instead of silently swallowing exceptions in `_handle_client`.

4. **Standardize Status Enums**: The Python server's `StatusResponse` and `StatusSummary` should use consistent status values, or clearly document the different status types (orchestrator status vs task status).

5. **Add Input Validation**: Add null checks before sorting by timestamp in `handleGetPlan` to prevent potential runtime errors.

6. **Use Standard WebSocket Close Codes**: Replace custom 4004 code with standard 4000-4999 range code that clients are more likely to handle correctly, or use standard 1008 (Policy Violation).

## Regression Tests Needed

- Test GET /api/plans response has correct envelope key matching OpenAPI spec
- Test GET /api/plans/:name response format matches documentation
- Test POST /api/plans/:name/start returns 201 status code
- Test GET /api/plans/:name/logs with empty log file returns 204
- Test GET /api/plans/:name/status with corrupted status.json returns 500
- Test IPC error handling returns meaningful error to client
- Test WebSocket connection to non-existent orchestrator closes with valid code
- Test sorting of activities with missing timestamps doesn't crash
- Test all list endpoints return consistent response envelope format
- Test health endpoint timestamp is parseable ISO 8601
