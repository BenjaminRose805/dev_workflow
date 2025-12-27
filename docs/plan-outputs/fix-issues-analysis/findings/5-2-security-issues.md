# Finding: Security Issues

## Summary

Security scan of the dev_workflow codebase revealed **4 potential security issues** of varying severity. The most significant finding is a shell injection vulnerability in test code. No hardcoded credentials, SQL injection, or path traversal vulnerabilities were found in production code. The codebase follows generally good security practices with proper use of subprocess arrays and secure file permissions.

## Issues Found

| Location | Vulnerability Type | Issue | Severity | Repro Steps |
|----------|-------------------|-------|----------|-------------|
| `scripts/tests/test-orchestrator-e2e.py:37-39` | Shell Injection | `subprocess.run(cmd, shell=True)` with string command | Medium | If `cmd` contained user-controlled input, attacker could inject commands via `; rm -rf /` |
| `docs/plan-outputs/archive/analyze-git-workflow/findings/6.5-pre-commit-hooks.md:447-448` | Shell Injection (Documentation) | Example code shows `await exec('npx eslint --fix ' + files.join(' '))` with unsafe string concatenation | Low (Documentation only) | Example code could lead developers to write unsafe patterns |
| `docs/plan-outputs/archive/analyze-git-workflow/findings/2.5-branch-lifecycle.md:547` | Shell Injection (Documentation) | Example code shows `` await exec(`git branch -D ${branchName}`) `` with template string interpolation | Low (Documentation only) | Example code could lead developers to write unsafe patterns |
| `scripts/lib/git-queue.js:158` | Weak Random ID | Uses `Math.random()` for generating commit IDs | Low | Predictable IDs could theoretically be exploited in race conditions |
| `scripts/lib/agent-pool.js:196` | Weak Random ID | Uses `Math.random()` for generating task IDs | Low | Predictable IDs could theoretically be exploited in race conditions |
| `scripts/plan_orchestrator.py:1269` | Insecure umask | `os.umask(0)` in daemon creation resets file creation mask | Info | Part of standard daemon double-fork pattern - files created would be world-readable |

## Root Cause Analysis

### 1. Shell Injection in Test Code (Medium Severity)

The `run_cmd()` function in `test-orchestrator-e2e.py` uses `shell=True`:

```python
def run_cmd(cmd, check=True, capture=True):
    result = subprocess.run(
        cmd,
        shell=True,  # VULNERABLE
        capture_output=capture,
        text=True,
        timeout=30
    )
```

While this is test code and the `cmd` parameter comes from static strings within the test file rather than user input, using `shell=True` is a dangerous pattern that:
- Could be copied to production code
- Is unnecessary since commands can be passed as arrays
- Creates potential for future vulnerabilities if the test is modified

### 2. Insecure Code Examples in Documentation (Low Severity)

Two documentation files contain example code demonstrating shell command execution with string interpolation:

```javascript
// 6.5-pre-commit-hooks.md
await exec('npx eslint --fix ' + files.join(' '));

// 2.5-branch-lifecycle.md
await exec(`git branch -D ${branchName}`);
```

These patterns are vulnerable to shell injection if the `files` array or `branchName` contains shell metacharacters.

### 3. Weak Random Number Generation (Low Severity)

Two modules use `Math.random()` for generating IDs:

```javascript
// git-queue.js
return `commit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// agent-pool.js
id = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
```

`Math.random()` is not cryptographically secure. While these IDs are used internally and not for security purposes, predictable IDs could theoretically enable race condition attacks.

### 4. Positive Security Observations

The codebase demonstrates several good security practices:

- **Most subprocess calls use arrays**: Production code in `plan_orchestrator.py`, `panels.py`, `task_actions.py`, etc. correctly uses `subprocess.run(['cmd', 'arg1', 'arg2'])` format
- **No hardcoded secrets**: No API keys, passwords, or tokens found in code
- **No SQL injection**: No raw SQL with string interpolation found
- **Proper socket permissions**: `orchestrator_ipc.py:196` correctly sets `os.chmod(self.socket_path, 0o600)` for owner-only access
- **No path traversal**: File paths are constructed using `path.join()` or `Path` objects without user input injection points
- **No XSS vulnerabilities**: No `innerHTML`, `dangerouslySetInnerHTML`, or similar patterns found in the codebase
- **SHA-1 usage is appropriate**: The SHA-1 in `api-server.js:904` is for WebSocket handshake (RFC 6455 requirement), not for security purposes

## Recommended Fixes

### 1. Fix Shell Injection in Test Code

```python
# Before (vulnerable)
def run_cmd(cmd, check=True, capture=True):
    result = subprocess.run(cmd, shell=True, ...)

# After (safe)
def run_cmd(cmd, check=True, capture=True):
    if isinstance(cmd, str):
        import shlex
        cmd = shlex.split(cmd)
    result = subprocess.run(cmd, shell=False, ...)
```

Or, refactor callers to pass arrays directly.

### 2. Update Documentation Examples

Update the code examples in documentation to use safe patterns:

```javascript
// Instead of string concatenation:
// await exec('npx eslint --fix ' + files.join(' '));

// Use spawn with array arguments:
const { spawn } = require('child_process');
spawn('npx', ['eslint', '--fix', ...files]);

// Or use execFile:
const { execFile } = require('child_process');
execFile('git', ['branch', '-D', branchName]);
```

### 3. Consider Using crypto.randomUUID() for IDs

```javascript
// Instead of:
return `commit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Use:
const crypto = require('crypto');
return `commit-${Date.now()}-${crypto.randomUUID().slice(0, 9)}`;
```

### 4. Document umask(0) Reasoning

Add a comment explaining the security implications of `umask(0)` in the daemon fork:

```python
# umask(0) is standard for daemonization but means files created by the daemon
# will use the default permissions (typically 666 for files, 777 for directories).
# Ensure sensitive files are explicitly created with restrictive permissions.
os.umask(0)
```

## Regression Tests Needed

1. **Shell injection test**: Create a test that verifies command arguments with shell metacharacters (`;`, `|`, `$()`, etc.) are handled safely
2. **ID uniqueness test**: Verify that generated IDs remain unique under high concurrency
3. **File permission test**: Verify that sensitive files (status.json, socket files) have correct permissions after creation
4. **Input validation test**: Create tests that pass malicious file paths and verify they are rejected or sanitized

## Files Scanned

- **Python files**: 15 files scanned (plan_orchestrator.py, orchestrator_server.py, TUI modules, etc.)
- **JavaScript files**: 25+ files scanned (status-cli.js, plan-status.js, api-server.js, tests, etc.)
- **TypeScript files**: 3 files scanned (api-client.ts, api-types.ts, generated types)
- **Documentation**: 50+ markdown files scanned for code examples

## Scan Summary

| Category | Status | Details |
|----------|--------|---------|
| Hardcoded Secrets | Clean | No API keys, passwords, or tokens found |
| Shell Injection | 1 Issue | Test code uses shell=True |
| SQL Injection | Clean | No database code or raw SQL found |
| Path Traversal | Clean | File paths properly constructed |
| XSS Vulnerabilities | Clean | No innerHTML or similar patterns |
| Insecure File Ops | Clean | Proper chmod usage found |
| Insecure Crypto | Minor | Math.random() for non-security IDs |
| eval/exec Usage | Clean | Only regex.exec() for pattern matching (safe) |
