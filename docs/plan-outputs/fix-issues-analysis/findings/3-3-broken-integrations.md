# Finding: Broken Integrations - Integration Audit

## Summary
The integration audit of Git operations, file system operations, Claude API integrations, and inter-process communication reveals multiple potential issues including missing null/undefined checks, insufficient error handling for edge cases, potential race conditions in file operations, and silent failure modes that could mask integration problems.

## Issues Found

| Location | Issue | Severity | Repro Steps |
|----------|-------|----------|-------------|
| worktree-utils.js:161 | `execSync` with unquoted branch name in `branchExists()` | Medium | Pass branch name with special characters like spaces |
| worktree-utils.js:395 | `execSync` git worktree add command uses string concatenation without proper escaping | Medium | Create plan with name containing shell metacharacters |
| worktree-utils.js:1028 | `removeWorktree()` builds command with string concatenation - injection possible | Medium | Call with plan name containing shell metacharacters |
| worktree-utils.js:1386 | `df` command uses shell pipe without validation of path | Low | Pass path with shell metacharacters |
| claude_runner.py:80-88 | Missing timeout on subprocess.Popen stdout iteration - can hang indefinitely | High | Claude CLI hangs or produces no output |
| claude_runner.py:100 | `process.wait(timeout=self.timeout)` called after iterating stdout - timeout already expired | High | Long-running Claude session exceeds timeout |
| claude_runner.py:208-209 | Silent catch of JSONDecodeError - malformed output is silently ignored | Medium | Claude CLI outputs malformed JSON |
| orchestrator_ipc.py:117-119 | Incomplete socket recv can return partial length prefix | Medium | Network interruption during IPC communication |
| orchestrator_ipc.py:268-269 | Exception in `_handle_client` silently passed - errors not logged | Medium | Malformed IPC request causes silent failure |
| plan-status.js:310-312 | Atomic write uses temp file but no cleanup on failure | Low | Disk full during atomic write leaves temp file |
| plan-status.js:387-391 | Silent JSON parse error in `loadStatus()` returns null | Medium | Corrupted status.json - no recovery hint given |
| status-cli.js:203 | `execSync` git rev-list command uses shell interpolation with `baseBranch` | Low | Modified baseBranch variable could inject commands |
| git-queue.js:169 | `execSync` with array-to-string join - no escaping for file paths with spaces | Medium | Commit files with spaces in path names |
| git-queue.js:280-287 | Lock timeout check uses Date comparison but doesn't account for clock skew | Low | System clock changed during processing |
| conflict-detector.js:116-117 | Shell command with pipe and `head -1` - potential output parsing issues | Low | Git log with unusual format output |
| worktree-utils.js:566-593 | `initializeWorktreeStatus()` uses `process.chdir()` which affects global state | High | Concurrent worktree operations corrupt working directory |
| worktree-utils.js:326-343 | `fs.rmSync` with force flag may delete unrelated files if path is wrong | Medium | Corrupted worktree path resolution |
| orchestrator_ipc.py:182-186 | Stale socket file removal uses `os.unlink` without checking if socket is in use | Medium | Race condition when restarting orchestrator quickly |

## Root Cause Analysis

1. **Shell Command Injection Risk**: Multiple locations use string concatenation or interpolation to build shell commands with user-provided input (branch names, file paths, plan names). While the code validates plan names with a regex at some points, not all entry points are protected.

2. **Missing Timeout Handling**: The `StreamingClaudeRunner` iterates over stdout line-by-line before calling `process.wait(timeout)`. If Claude CLI hangs without producing output, the iteration never completes and the timeout is never checked.

3. **Silent Error Handling**: Several catch blocks either pass silently or log to stderr without providing recovery paths. This makes debugging integration failures difficult and can mask underlying issues.

4. **Race Conditions in File Operations**:
   - `writeFileAtomic()` creates temp files that may not be cleaned up on failure
   - `initializeWorktreeStatus()` uses `process.chdir()` which affects the global process state during concurrent operations
   - Socket file removal in IPC doesn't lock before deletion

5. **Incomplete Socket Handling**: The IPC socket code assumes 4 bytes will always be received for the length prefix. Partial reads (due to network issues or interruption) are not properly handled.

6. **Clock-Dependent Logic**: Lock timeout comparisons use `Date.now()` which can be affected by system clock changes during execution.

## Recommended Fixes

1. **Shell Command Safety**: Use array-based arguments with `spawn` or proper shell escaping instead of string concatenation for all git commands. Example in worktree-utils.js:
   ```javascript
   // Instead of: execSync(`git rev-parse --verify "${branchName}"`)
   // Use: spawnSync('git', ['rev-parse', '--verify', branchName])
   ```

2. **Fix Claude Runner Timeout**: Implement a thread or async timeout wrapper around the stdout iteration:
   ```python
   import threading
   def read_with_timeout():
       for line in self.process.stdout:
           # process line
       return

   reader_thread = threading.Thread(target=read_with_timeout)
   reader_thread.start()
   reader_thread.join(timeout=self.timeout)
   if reader_thread.is_alive():
       self.process.kill()
   ```

3. **Add Error Logging**: Replace silent `pass` in catch blocks with proper error logging that includes context for debugging.

4. **Fix Concurrent cwd Issue**: Remove `process.chdir()` calls in favor of passing `cwd` option to child processes:
   ```javascript
   // Instead of: process.chdir(worktreePath); result = planStatus.initializePlanStatus(planPath);
   // Refactor initializePlanStatus to accept cwd parameter
   ```

5. **Socket Read Validation**: Add loop to ensure complete length prefix is read:
   ```python
   length_data = b""
   while len(length_data) < 4:
       chunk = sock.recv(4 - len(length_data))
       if not chunk:
           raise IPCError("Connection closed during length read")
       length_data += chunk
   ```

6. **Temp File Cleanup**: Add try/finally to clean up temp files:
   ```javascript
   try {
       fs.writeFileSync(tempPath, content, 'utf8');
       fs.renameSync(tempPath, filePath);
   } finally {
       if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
   }
   ```

## Regression Tests Needed

- Test git operations with plan names containing spaces, quotes, backticks, and shell metacharacters
- Test Claude runner with a mock CLI that hangs indefinitely without output
- Test IPC communication with partial data and interrupted connections
- Test concurrent worktree operations to verify no working directory conflicts
- Test status.json corruption recovery (invalid JSON, truncated file)
- Test socket file handling when restarting orchestrator rapidly
- Test file operations when target paths contain special characters
- Test atomic write behavior when disk is full or permissions are denied
- Test lock timeout behavior with simulated clock skew
- Test git-queue with file paths containing spaces and special characters
