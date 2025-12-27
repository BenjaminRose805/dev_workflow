# Finding: Type Errors and Mismatches

## Summary

Running mypy type checker on the Python codebase revealed 42 type errors across 7 files. The errors fall into several categories: None handling issues, type annotation mismatches, duplicate module names, and missing type annotations.

## Type Checker Configuration Issue

```
scripts/tui/__init__.py: error: Duplicate module named "tui" (also at "scripts/lib/tui.py")
```

There are two `tui` modules which causes mypy confusion. This is a structural issue.

## Issues Found

### Critical: None Handling Issues

| Location | Issue | Severity |
|----------|-------|----------|
| scripts/tui/keyboard.py:373-377 | Variables initialized as `None` then used without guard | High |
| scripts/tui/keyboard.py:427,433 | `read()` called on potentially `None` file descriptor | High |
| scripts/lib/tui.py:1117-1118 | Accessing attributes on potentially `None` object | Medium |
| scripts/lib/status_monitor.py:154,171,188 | `emit_sync` called on `EventBus | None` | Medium |
| scripts/lib/claude_runner.py:94,104 | Iterating/reading `IO[str] | None` without guard | Medium |
| scripts/lib/claude_runner.py:242,270 | `emit_sync` called on `EventBus | None` | Medium |
| scripts/plan_orchestrator.py:947-1116 | Multiple TUI method calls on `RichTUIManager | None` | Medium |

### High: Type Annotation Mismatches

| Location | Issue | Severity |
|----------|-------|----------|
| scripts/tui/panels.py:1919 | Appending `Text` to `list[Table]` | High |
| scripts/orchestrator_server.py:296 | `str` passed where `Literal['running','stopping','stopped','crashed']` expected | High |
| scripts/orchestrator_server.py:354 | `str` passed where `Literal['running','paused','stopping','stopped']` expected | High |
| scripts/plan_orchestrator.py:864 | `float` assigned to variable typed as `None` | Medium |

### Medium: Missing Type Annotations

| Location | Issue | Severity |
|----------|-------|----------|
| scripts/lib/tui.py:706 | `RichTUIManager` missing `_render_in_progress` attribute | Medium |
| scripts/lib/tui.py:933-934 | Cannot determine type of `_blocker_cache` | Medium |
| scripts/lib/claude_runner.py:91 | Missing type annotation for `output_parts` | Low |
| scripts/orchestrator_server.py:473 | Missing type annotation for `plans` | Low |

### Low: Unchecked Function Bodies

Multiple untyped functions in:
- scripts/lib/event_bus.py:121-131
- scripts/tui/command_runner.py:104-106
- scripts/orchestrator_server.py:994-1216

## Root Cause Analysis

### 1. Optional Object Access Pattern
Many errors stem from optional objects (`TUIManager | None`, `EventBus | None`) being accessed without null checks:
```python
self.tui.set_status(...)  # tui could be None
```

### 2. Type Narrowing Not Recognized
The code often checks for `None` in a way mypy doesn't recognize:
```python
if self.tui:
    self.tui.method()  # mypy still sees self.tui as potentially None
```

### 3. Literal Type Mismatches
Using string variables where Literal types are expected:
```python
status = "running"  # Type: str
OrchestratorInfo(status=status)  # Expects Literal['running',...]
```

## Recommended Fixes

### High Priority

1. **Fix Literal type mismatches** (scripts/orchestrator_server.py:296,354):
   ```python
   # Use type assertion or cast
   from typing import cast, Literal
   StatusType = Literal['running', 'stopping', 'stopped', 'crashed']
   status: StatusType = 'running'
   ```

2. **Fix list type mismatch** (scripts/tui/panels.py:1919):
   ```python
   # Change list type or use Union type
   tables: list[Table | Text] = []
   ```

3. **Fix None handling in keyboard.py**:
   ```python
   # Add proper guards
   if self._fd is not None:
       old_settings = termios.tcgetattr(self._fd)
   ```

### Medium Priority

4. **Add None guards for optional objects**:
   ```python
   # In plan_orchestrator.py
   if self.tui is not None:
       self.tui.set_status(...)
   ```

5. **Fix EventBus None handling**:
   ```python
   if self.event_bus is not None:
       self.event_bus.emit_sync(...)
   ```

### Low Priority

6. **Add missing type annotations** for function parameters and return types
7. **Resolve duplicate module issue** by renaming one of the tui modules

## Regression Tests Needed

- Test keyboard input handling with None file descriptor
- Test TUI manager operations when disabled
- Test event bus operations when not configured
