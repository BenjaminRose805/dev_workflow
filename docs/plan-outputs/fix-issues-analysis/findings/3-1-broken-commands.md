# Finding: Broken Commands - CLI Audit

## Summary
Analysis of 8 CLI tools/scripts found 3 issues requiring attention. The main problems are: (1) orchestrator_server.py requires PYTHONPATH to be set manually when run directly, (2) uvicorn dependency is missing preventing API server functionality, and (3) validate-plan-format.js has an outdated file pattern that matches no current plans.

## Issues Found

| Location | Issue | Severity | Repro Steps |
|----------|-------|----------|-------------|
| scripts/orchestrator_server.py:35 | Import fails when run directly without PYTHONPATH set | High | Run `python3 scripts/orchestrator_server.py --help` - fails with `ModuleNotFoundError: No module named 'scripts'` |
| scripts/orchestrator_server.py:1574 | Missing uvicorn dependency prevents running API server | High | Run `PYTHONPATH=. python3 scripts/orchestrator_server.py --help` - fails with `ModuleNotFoundError: No module named 'uvicorn'` |
| scripts/orchestrator_server.py:1554-1561 | Uses deprecated FastAPI on_event() decorator | Low | Warning shown: "on_event is deprecated, use lifespan event handlers instead" |
| scripts/validate-plan-format.js:199-200 | Only validates files matching `implement-*.md` pattern | Medium | Run `node scripts/validate-plan-format.js` - reports "Validating 0 implementation plans" because no files match pattern. Actual plans use different naming (e.g., `cleanup-analysis.md`, `fix-issues-analysis.md`) |
| scripts/scan-plans.js output | Misleading markdown counts vs status.json counts | Low | `scan-plans.js` output shows `incomplete: 16` from markdown checkboxes even when `statusSummary.pending: 0` for completed plans. The `incomplete`/`complete` fields reflect markdown state, not actual execution status |

## Root Cause Analysis

1. **orchestrator_server.py PYTHONPATH issue**: The script uses absolute imports (`from scripts.lib.event_bus import ...`) which require the project root to be in PYTHONPATH. Unlike other Python scripts in the project (e.g., plan_orchestrator.py, multi_plan_monitor.py, run_api_server.py), this file does NOT add the project root to sys.path before imports.

2. **Missing uvicorn**: The uvicorn package is required to run the API server but is not installed. run_api_server.py correctly checks for this dependency and provides a helpful error message, but orchestrator_server.py does not have this check.

3. **FastAPI deprecation**: The script uses `@app.on_event("startup")` and `@app.on_event("shutdown")` decorators which are deprecated in FastAPI in favor of lifespan event handlers.

4. **validate-plan-format.js file pattern**: The script filters for files matching `implement-*.md` pattern (line 200), but the actual plan files in the project use different naming conventions like `cleanup-analysis.md`, `fix-issues-analysis.md`, etc. This makes the validator ineffective.

5. **scan-plans.js data representation**: The script provides both markdown-parsed counts (`incomplete`/`complete` from checkbox analysis) and `statusSummary` from status.json. These can diverge because the system intentionally does not modify markdown checkboxes during execution - status.json is the source of truth. This is by design but can be confusing.

## Recommended Fixes

1. **Add sys.path modification to orchestrator_server.py** (similar to run_api_server.py lines 44-48):
   ```python
   _script_dir = Path(__file__).parent
   _project_root = _script_dir.parent
   if str(_project_root) not in sys.path:
       sys.path.insert(0, str(_project_root))
   ```

2. **Install missing uvicorn dependency**:
   ```bash
   pip install uvicorn websockets
   ```

3. **Update FastAPI lifecycle handlers** to use lifespan context manager instead of deprecated on_event decorators.

4. **Update validate-plan-format.js file pattern** to match current plan naming conventions:
   - Change from: `f.startsWith('implement-') && f.endsWith('.md')`
   - Change to: `f.endsWith('.md') && !['README.md', 'EXECUTION-ORDER.md'].includes(f)`
   - Or add command-line argument to specify which files to validate

5. **Document scan-plans.js output fields** to clarify that `incomplete`/`complete` refer to markdown checkbox state, while `statusSummary` reflects actual execution status from status.json.

## Regression Tests Needed

- Test orchestrator_server.py can be run directly without setting PYTHONPATH
- Test run_api_server.py starts successfully when dependencies are installed
- Test validate-plan-format.js finds and validates current plan files
- Test scan-plans.js output correctly represents both markdown and status.json states
- Verify FastAPI server starts without deprecation warnings after lifecycle handler update
