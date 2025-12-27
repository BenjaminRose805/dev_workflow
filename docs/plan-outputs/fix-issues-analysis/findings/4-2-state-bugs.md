# Finding: State Bugs - State Management Audit

## Summary
Analysis of state management across status.json, orchestrator registry, and worktree state tracking reveals several bugs related to race conditions, orphaned state after errors, and state synchronization issues. The codebase has partial locking mechanisms but inconsistent usage patterns lead to potential data corruption and stale state.

## Issues Found

| Location | Issue | Severity | Repro Steps |
|----------|-------|----------|-------------|
| scripts/lib/plan-status.js:379-413 | loadStatus() auto-fixes summary and saves without lock, causing TOCTOU race | High | Run two status updates simultaneously on same plan - summary counts may drift |
| scripts/lib/plan-status.js:449-498 | updateTaskStatus() uses loadStatus+saveStatus pattern without locking | High | Concurrent task completions can overwrite each other's changes |
| scripts/lib/plan-output-utils.js:658-705 | updateTaskStatus() (sync version) has same race condition as plan-status.js version | High | Multiple orchestrators updating same plan concurrently |
| scripts/lib/orchestrator_registry.py:205-207 | Lock released before operation complete if FileNotFoundError caught | Medium | Race if lock file deleted mid-operation, operation proceeds unlocked |
| scripts/lib/worktree-utils.js:560-592 | initializeWorktreeStatus() changes cwd globally, not thread-safe | Medium | Concurrent worktree creations can interfere with each other's cwd |
| scripts/lib/plan-status.js:833-855 | initializePlanStatus() can save status without lock while another process reads | Medium | Init during active execution may corrupt in-flight updates |
| scripts/status-cli.js:467-475 | cmdStatus() auto-initializes without checking if initialization in progress | Medium | Concurrent status checks during init can create duplicate status.json |
| scripts/lib/orchestrator_registry.py:218-243 | register() removes stale entries then adds - no atomic check-and-set | Medium | Two orchestrators starting same plan in tight window both pass duplicate check |
| scripts/lib/worktree-utils.js:1660-1680 | getAbandonedWorktrees() reads status.json without lock | Low | May read partial/corrupted status during active update |
| scripts/status-cli.js:1114-1189 | cmdProgressWatch() polls loadStatus repeatedly, may see inconsistent states | Low | Watch mode can display transient invalid summary counts |
| .claude/orchestrator-registry.json | Current registry shows instance running but no cleanup if orchestrator crashes | Low | Inspect registry after SIGKILL - stale entry remains until heartbeat timeout |
| scripts/lib/plan-output-utils.js:475-486 | loadStatusWithLock() returns empty release function if file doesn't exist | Low | Caller may think it has lock when no lock was acquired |

## Root Cause Analysis

### 1. Inconsistent Locking Strategy
The codebase has two parallel implementations:
- `plan-status.js`: Uses atomic file writes but NO file locking for read-modify-write
- `plan-output-utils.js`: Has `proper-lockfile` based locking but sync methods don't use it

The sync versions (`updateTaskStatus`, `loadStatus`, `saveStatus`) in both files perform non-atomic read-modify-write operations. Only the async versions in `plan-output-utils.js` (`updateTaskStatusWithLock`, `loadStatusWithLock`) properly acquire locks.

### 2. Auto-Fix on Load Creates Hidden Writes
`loadStatus()` in `plan-status.js` (lines 379-413) recalculates summary and calls `saveStatus()` if there's drift. This:
- Performs a write during what appears to be a read operation
- Has no locking, so concurrent loads can stomp on each other's fixes
- Can corrupt state if another process is mid-write

### 3. Process.cwd() Mutation
`initializeWorktreeStatus()` in `worktree-utils.js` (lines 566-573) does:
```javascript
process.chdir(worktreePath);
// ... operations ...
process.chdir(originalCwd);
```
This mutates global state and is not safe if Node.js has concurrent async operations or if the script is interrupted between chdir calls.

### 4. Registry Lock Gap
In `orchestrator_registry.py`, the `_with_lock()` method (lines 181-207) has a fallback:
```python
except FileNotFoundError:
    # Lock file doesn't exist, proceed without locking
    return operation()
```
This creates a race window where multiple processes can proceed unlocked if the lock file is deleted between attempts.

### 5. No Cleanup on Abrupt Exit
When `exitWithError()` is called (30+ locations in status-cli.js), or process crashes:
- No cleanup of partial status.json writes
- No removal of in_progress task states
- No registry unregistration
- Orphaned .lock files may remain

## Recommended Fixes

1. **Unify on async locking pattern**: Deprecate sync `updateTaskStatus()` in favor of `updateTaskStatusWithLock()` everywhere. Make CLI commands async.

2. **Separate read from auto-fix**: Split `loadStatus()` into `loadStatusReadOnly()` (never writes) and `loadStatusAndRepair()` (acquires lock first). Default to read-only.

3. **Atomic read-modify-write wrapper**: Create a `withStatus(planPath, callback)` pattern:
```javascript
async function withStatus(planPath, callback) {
    const result = await loadStatusWithLock(planPath);
    try {
        const modified = callback(result.status);
        if (modified) await saveStatus(planPath, result.status);
    } finally {
        await result.release();
    }
}
```

4. **Fix process.chdir issue**: Pass worktree path to `plan-status` functions instead of changing cwd, or use worker threads.

5. **Add crash recovery**:
   - On startup, scan for orphaned .lock files and clear them
   - Add `in_progress` task timeout - if task in_progress for >2 hours without update, mark as failed
   - Registry: add crash detection based on PID + heartbeat, not just heartbeat

6. **Fix registry race**: Use compare-and-swap pattern for duplicate plan check:
```python
def register(self, instance):
    def _register():
        data = self._load()
        # Re-check after acquiring lock
        for existing in data["instances"]:
            if inst.plan_path == instance.plan_path and inst.is_alive():
                raise DuplicatePlanError(...)
        data["instances"].append(instance.to_dict())
        self._save(data)
    self._with_lock(_register)
```
(This is already done correctly - the check is inside the lock)

7. **Add graceful shutdown handler**:
```javascript
process.on('SIGINT', async () => {
    await registry.unregister(instanceId);
    // Mark any in_progress tasks as interrupted
    process.exit(0);
});
```

## Regression Tests Needed

- Test: Two processes call `updateTaskStatus()` simultaneously on same task - verify no data loss
- Test: Kill orchestrator with SIGKILL, verify registry cleans up on next operation
- Test: Start two orchestrators for same plan within 100ms - verify only one succeeds
- Test: Call `loadStatus()` while `saveStatus()` is mid-write - verify no corruption
- Test: Concurrent worktree creation - verify no cwd interference
- Test: Interrupt `initializePlanStatus()` mid-execution - verify clean recovery
- Test: Lock file deleted while waiting for lock - verify graceful fallback
- Test: Summary auto-fix during concurrent updates - verify counts stay consistent
- Test: `progress-watch` during rapid status updates - verify no transient invalid states
- Test: Orphaned in_progress tasks after 24 hours - verify cleanup mechanism exists
