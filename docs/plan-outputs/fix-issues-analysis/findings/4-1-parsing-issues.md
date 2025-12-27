# Finding: Parsing Issues - JSON/Data Audit

## Summary
The codebase has good atomic write patterns in core modules (file-utils.js, plan-status.js), but several issues exist: inconsistent error handling across modules, missing JSON validation before use, race conditions in non-locked operations, and the orchestrator registry using non-atomic writes. The api-server.js file has the most critical issues with registry file corruption potential.

## Issues Found

| Location | Issue | Severity | Repro Steps |
|----------|-------|----------|-------------|
| scripts/api-server.js:437-439 | Non-atomic write to orchestrator-registry.json. Uses `fs.writeFileSync` directly instead of atomic write (temp+rename). Concurrent API calls could corrupt the registry. | Critical | Run two parallel `POST /api/plans/:name/stop` requests simultaneously |
| scripts/api-server.js:486-491 | Same non-atomic write issue in registry cleanup path. | Critical | Same as above |
| scripts/api-server.js:58 | JSON.parse without try-catch wrapper for git-workflow.json. Module load could crash if file is corrupted. | High | Corrupt .claude/git-workflow.json file |
| scripts/api-server.js:119,216,334,415,437,486,663 | Multiple JSON.parse calls on orchestrator-registry.json without unified error handling. Each location handles errors differently or not at all. | High | Corrupt registry.json in any active operation |
| scripts/lib/timestamp-utils.js:112,127,225 | Uses `writeFile` (non-atomic) instead of `writeFileAtomic` from file-utils.js. Could cause data loss on crash. | Medium | Kill process during timestamp write |
| scripts/lib/agent-cache.js:230 | Uses `fs.writeFileSync` directly, no atomic write pattern. Cache entries could be corrupted. | Medium | Kill process while writing cache |
| scripts/lib/worktree-utils.js:540 | Uses `fs.writeFileSync` for current-plan.txt pointer file. Non-atomic. | Low | Power failure during plan pointer write |
| scripts/lib/worktree-utils.js:1669 | JSON.parse on status.json without try-catch. Could crash worktree operations on corrupt status. | Medium | Corrupt status.json in worktree |
| scripts/lib/worktree-utils.js:1271 | JSON.parse on git-workflow.json in loadGitWorkflowConfig without try-catch (outer catch exists but generic) | Low | Malformed config file |
| scripts/lib/plan-status.js:378-413 | loadStatus() calls saveStatus() within the same function when fixing summary. If two processes load simultaneously, race condition could occur despite proper-lockfile in plan-output-utils.js (plan-status.js has its own implementation without locking). | High | Two agents call loadStatus() on same plan simultaneously |
| scripts/lib/plan-status.js:303-318 | writeFileAtomic() implementation is duplicated from file-utils.js. Also lacks fsync before rename which means data could be in OS buffer, not on disk. | Medium | Power failure after rename but before disk flush |
| scripts/status-cli.js:1942-1947 | JSON.parse in worktree-context command without unified try-catch wrapper | Low | Corrupt status.json in worktree context |
| scripts/check-file-status.js:132 | JSON.parse without error handling visible in context | Low | Malformed input |
| scripts/lib/plan-output-utils.js:481 | JSON.parse in loadStatusWithLock() without recovery mechanism when lock acquisition succeeds but file is corrupt | Medium | Corrupt file with valid lock |

## Root Cause Analysis

1. **Code Duplication**: `writeFileAtomic()` is implemented in both `scripts/lib/file-utils.js` (lines 53-83) and `scripts/lib/plan-status.js` (lines 303-318). These should share a single implementation.

2. **Inconsistent Error Handling**: Each module handles JSON.parse errors differently:
   - `plan-status.js`: Logs error, attempts backup recovery, then markdown rebuild
   - `plan-output-utils.js`: Logs error, attempts backup recovery, then markdown rebuild
   - `api-server.js`: Just catches with `// Registry not available` comment
   - `timestamp-utils.js`: Silently returns null
   - `agent-cache.js`: Silently returns null (cache miss)

3. **Missing Validation**: No JSON schema validation exists. Parsed JSON is used directly without checking for required fields like `tasks`, `summary`, etc. The only validation is summary count checks in loadStatus().

4. **Locking Inconsistency**: `plan-output-utils.js` uses `proper-lockfile` for status.json operations, but `plan-status.js` has its own implementation that does NOT use locking. Since both modules export similar functions (loadStatus, saveStatus), consumers might use the non-locked version unintentionally.

5. **Non-Atomic Registry Writes**: The orchestrator registry file is written with `fs.writeFileSync` directly in multiple locations without atomic patterns, despite being modified by concurrent API requests.

## Recommended Fixes

1. **Consolidate atomic write implementation**: Use a single `writeFileAtomic` from `file-utils.js` throughout. Add `fsync` before rename:
   ```javascript
   const fd = fs.openSync(tempPath, 'w');
   fs.writeSync(fd, content);
   fs.fsyncSync(fd);  // Ensure data is on disk
   fs.closeSync(fd);
   fs.renameSync(tempPath, filePath);
   ```

2. **Add registry atomic write wrapper in api-server.js**: Create a `writeRegistryAtomic()` function and use it consistently.

3. **Unify plan-status.js and plan-output-utils.js**: These modules have significant overlap. Either merge them or clearly separate concerns with plan-status.js using plan-output-utils.js for I/O.

4. **Add JSON schema validation**: Implement lightweight validation for critical JSON structures (status.json, registry.json) after parsing:
   ```javascript
   function validateStatusJson(status) {
     if (!status || typeof status !== 'object') return false;
     if (!Array.isArray(status.tasks)) return false;
     if (!status.summary || typeof status.summary !== 'object') return false;
     return true;
   }
   ```

5. **Wrap all JSON.parse calls in try-catch**: Especially in api-server.js where crashes are visible to users.

6. **Use timestamp-utils.js with atomic writes**: Change from `writeFile` to `writeFileAtomic`.

## Regression Tests Needed

- Test concurrent API calls to `/api/plans/:name/stop` to verify registry integrity
- Test JSON recovery when status.json is corrupted mid-write (truncated JSON)
- Test behavior when orchestrator-registry.json is corrupted
- Test plan-status.js loadStatus() under concurrent access from multiple processes
- Test power failure simulation during write (can use fs.writeSync without fsync to create vulnerability window)
- Test behavior when status.json has missing required fields (tasks, summary, planPath)
- Test agent-cache behavior with corrupted cache entries
- Test timestamp-utils writes under crash conditions
