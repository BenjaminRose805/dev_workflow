# Finding: Python Dependencies Audit

## Summary

Audit of Python dependencies used across the codebase. Since this project has no `requirements.txt` or `pyproject.toml`, dependencies are implicitly required when running the Python scripts. Analysis identifies which third-party packages are actually used and which might be unnecessary.

## Current State

**No dependency manifest files found:**
- No `requirements.txt`
- No `pyproject.toml`
- No `setup.py`
- No `.python-version`

This means dependencies must be manually installed by users, which is a usability issue.

## Third-Party Dependencies in Use

| Package | Files Using It | Usage | Required |
|---------|----------------|-------|----------|
| `rich` | `scripts/lib/tui.py` | TUI rendering (panels, tables, colors) | Optional (graceful fallback) |
| `fastapi` | `scripts/orchestrator_server.py` | API server framework | Required for API server |
| `pydantic` | `scripts/orchestrator_server.py` | Data validation/serialization | Required for API server |
| `requests` | `scripts/orchestrator_server.py` | HTTP client | Required for API server proxy |

## Standard Library Dependencies (All Safe)

All other imports are from Python's standard library:
- `json`, `os`, `sys`, `re` - Core utilities
- `pathlib` - Path handling
- `datetime`, `time` - Time utilities
- `threading`, `asyncio`, `queue` - Concurrency
- `subprocess` - Process management
- `argparse`, `logging` - CLI/logging
- `dataclasses`, `enum`, `typing` - Type definitions
- `collections`, `contextlib`, `functools` - Utilities
- `socket`, `fcntl`, `select`, `termios`, `tty` - Low-level I/O

## Items for Removal

| File/Item | Reason | Risk | Notes |
|-----------|--------|------|-------|
| N/A | No unused packages to remove | N/A | All imports are in active use |

## Items to Add (Missing Infrastructure)

| Item | Reason | Priority |
|------|--------|----------|
| `requirements.txt` | Document runtime dependencies | High |
| `requirements-dev.txt` | Document development dependencies | Medium |

## Recommended `requirements.txt`

```txt
# Core dependencies (required for API server)
fastapi>=0.100.0
pydantic>=2.0
uvicorn>=0.23.0
requests>=2.28.0

# Optional dependencies (graceful fallback if missing)
# rich>=13.0  # For enhanced TUI - optional
```

## Recommended `requirements-dev.txt`

```txt
# Development dependencies
pytest>=7.0
black>=23.0
mypy>=1.0
```

## Analysis Notes

1. **Optional Dependencies Pattern**: The `rich` library uses a good pattern with try/except import and `RICH_AVAILABLE` flag for graceful fallback.

2. **API Server Dependencies**: `fastapi`, `pydantic`, and `requests` are required ONLY for `orchestrator_server.py`. The TUI and orchestrator can run without them.

3. **No Circular or Conflicting Dependencies**: Import graph is clean.

4. **Version Pinning**: No versions are specified anywhere, which could lead to compatibility issues.

## Recommendations

### Priority 1: Create requirements.txt
- **Action:** Create `/requirements.txt` with pinned versions
- **Rationale:** Enable reproducible installations

### Priority 2: Document Optional vs Required
- **Action:** Add comments distinguishing core vs optional deps
- **Rationale:** Users need to know minimum requirements

### Priority 3: Add Development Dependencies
- **Action:** Create `/requirements-dev.txt` for testing/linting tools
- **Rationale:** Support consistent development environment

## Summary Statistics

| Category | Count |
|----------|-------|
| Third-party packages used | 4 |
| Optional packages | 1 (rich) |
| Required packages | 3 (fastapi, pydantic, requests) |
| Unused packages | 0 |
| Missing manifest files | 2 (requirements.txt, pyproject.toml) |
