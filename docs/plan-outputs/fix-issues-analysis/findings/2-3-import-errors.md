# Finding: Import and Module Errors

## Summary

Analysis of imports across Python and JavaScript files reveals that all imports work correctly when the proper environment is set up. The main issues are:

1. Python scripts require `PYTHONPATH=.` or running from project root
2. Some optional dependencies (uvicorn, inotify) are not installed but handled gracefully
3. No JavaScript import errors - all modules load successfully

## Python Import Analysis

### Structural Design

The Python codebase uses absolute imports from the project root (e.g., `from scripts.lib.tui import ...`). This requires:
- Running scripts from the project root directory
- Setting `PYTHONPATH=.` when running outside the project root
- The `scripts/` directory being in the Python path

**This is not a bug** - it's a design decision that works correctly when scripts are run as intended.

### Optional Dependencies (Not Installed)

| Module | Location | Severity | Handling |
|--------|----------|----------|----------|
| uvicorn | scripts/run_api_server.py:88,116 | Low | Check in `check_dependencies()` with helpful error message |
| uvicorn | scripts/plan_orchestrator.py:756,826 | Low | Used only for API server integration |
| uvicorn | scripts/orchestrator_server.py:1574 | Low | Main server entry point |
| inotify | scripts/lib/status_monitor.py:56,91,92 | Low | Falls back to polling if not available |

### Cross-Module Imports (Working)

All these imports work correctly with `PYTHONPATH=.`:

| Import Pattern | Files Using It | Status |
|----------------|----------------|--------|
| `from scripts.lib.tui import ...` | plan_orchestrator.py, lib/tui.py | OK |
| `from scripts.lib.claude_runner import ...` | plan_orchestrator.py | OK |
| `from scripts.lib.status_monitor import ...` | plan_orchestrator.py | OK |
| `from scripts.lib.event_bus import ...` | orchestrator_server.py, plan_orchestrator.py | OK |
| `from scripts.tui.keyboard import ...` | lib/tui.py | OK |
| `from scripts.tui.* import ...` | tui/__init__.py, tui/overlays.py | OK |

## JavaScript Import Analysis

All JavaScript modules load successfully:
- `scripts/status-cli.js` - Main CLI tool
- `scripts/lib/plan-status.js` - Plan status library
- `scripts/lib/plan-output-utils.js` - Output utilities

### JavaScript Module Structure

```
scripts/
├── lib/
│   ├── plan-status.js        (exports functions)
│   ├── plan-output-utils.js  (exports functions)
│   └── ...
├── status-cli.js             (CLI entry point)
├── plan-orchestrator.js      (orchestrator CLI)
└── api-server.js             (API server)
```

All use CommonJS `require()` with relative paths - no issues detected.

## Issues Found

| Location | Issue | Severity | Impact |
|----------|-------|----------|--------|
| Python scripts | Require PYTHONPATH=. when run from outside project root | Low | Expected behavior, documented in scripts |
| scripts/lib/status_monitor.py | Imports `event_bus` without `scripts.` prefix | Medium | May fail if module path changes |
| scripts/lib/claude_runner.py | Imports `event_bus` without `scripts.` prefix | Medium | Same issue |

### Internal Import Inconsistency

In `scripts/lib/status_monitor.py` and `scripts/lib/claude_runner.py`:
```python
# Current (potentially fragile):
from event_bus import EventType

# Should be:
from scripts.lib.event_bus import EventType
```

However, this works because when running from the project root, both `scripts/lib/` and `scripts/` are effectively in the path.

## Root Cause Analysis

### No Circular Imports Found
Searched for circular import patterns - none detected.

### Missing Dependencies
The following are optional/development dependencies:
- `uvicorn`, `fastapi` - Required only for API server mode
- `inotify` - Linux-only, optional for faster file watching

## Recommended Fixes

### Low Priority

1. **Standardize Python imports**: Change internal imports to use full paths:
   ```python
   # In scripts/lib/status_monitor.py
   from scripts.lib.event_bus import EventType, EventBus
   ```

2. **Add requirements.txt for optional dependencies**:
   ```
   # requirements-server.txt
   uvicorn>=0.23.0
   fastapi>=0.100.0
   websockets>=11.0

   # requirements-dev.txt (optional)
   inotify>=0.2.10
   ```

3. **Document PYTHONPATH requirement** in README or script headers

## Regression Tests Needed

- Test all Python scripts can be imported with `PYTHONPATH=.`
- Test that optional dependencies degrade gracefully when missing
