# Finding: Unhandled Exceptions

## Summary

Analysis of exception handling patterns across the codebase reveals several instances of bare `except:` clauses and empty `catch {}` blocks. Most are intentional (cleanup operations, optional features) but some could mask real errors.

## Issues Found

### Python: Bare `except:` Clauses

| Location | Issue | Severity | Context |
|----------|-------|----------|---------|
| scripts/tests/test-orchestrator-e2e.py:61 | Bare `except:` on file read | Low | Falls back to empty string - acceptable for optional config |
| scripts/tests/test-orchestrator-e2e.py:129 | Bare `except:` with `pass` | Low | Cleanup - ignores missing file on cleanup |
| scripts/tests/test-orchestrator-e2e.py:133 | Bare `except:` with `pass` | Low | Cleanup - ignores missing directory on cleanup |
| scripts/tests/test-orchestrator-e2e.py:200 | Bare `except:` for JSON parse | Medium | Catches all errors including unexpected ones |
| scripts/tests/test-orchestrator-e2e.py:217 | Bare `except:` for JSON parse | Medium | Same issue - could mask non-JSON errors |
| scripts/tests/test-orchestrator-e2e.py:243 | Bare `except:` for JSON parse | Medium | Same issue |
| scripts/tests/test-orchestrator-e2e.py:271 | Bare `except:` for JSON parse | Medium | Same issue |
| scripts/lib/status_monitor.py:55-59 | `except ImportError: pass` | Low | Optional inotify support - falls back to polling |
| scripts/lib/status_monitor.py:83 | `except Exception: pass` | Medium | Silently swallows all errors in poll loop |
| scripts/lib/status_monitor.py:113 | `except Exception:` | Low | Falls back to polling on inotify failure |
| scripts/lib/status_monitor.py:141 | `except (FileNotFoundError, json.JSONDecodeError, OSError):` | Low | Properly specific exceptions |
| scripts/lib/tui.py:26-35 | `except ImportError:` | Low | Optional rich library - sets RICH_AVAILABLE flag |

### JavaScript: Empty `catch {}` Blocks

| Location | Issue | Severity | Context |
|----------|-------|----------|---------|
| scripts/tests/test-lib-modules.js:83 | Empty `catch (e) {}` | Low | Cleanup - ignores file deletion failure |
| scripts/tests/test-lib-modules.js:86 | Empty `catch (e) {}` | Low | Cleanup - ignores directory removal failure |
| scripts/tests/test-constraint-parsing.js:94 | Empty `catch (e) {}` | Low | Cleanup |
| scripts/tests/test-parallel-phases.js:182 | Empty `catch (e) {}` | Low | Cleanup |
| scripts/tests/test-parallel-phases.js:188 | Empty `catch (e) {}` | Low | Cleanup |
| scripts/status-cli.js:1943 | `catch (e) { /* ignore */ }` | Low | Expected scenario with comment |
| scripts/status-cli.js:1948 | `catch (e) { /* ignore */ }` | Low | Expected scenario with comment |
| scripts/lib/plan-output-utils.js:604-605 | `catch (e) { /* Lock released */ }` | Low | Lock cleanup with comment |
| scripts/lib/plan-output-utils.js:772-773 | `catch (e) { /* Lock released */ }` | Low | Lock cleanup with comment |
| scripts/lib/plan-output-utils.js:883-884 | `catch (e) { /* Lock released */ }` | Low | Lock cleanup with comment |
| scripts/api-server.js:440-441 | `catch (e) { /* Cleanup */ }` | Low | Cleanup with comment |
| scripts/api-server.js:479-480 | `catch (e) { /* Ignore */ }` | Low | Expected scenario |
| scripts/api-server.js:493-494 | `catch (e) { /* Cleanup */ }` | Low | Cleanup |
| scripts/api-server.js:924-925 | `catch (e) { this.close(); }` | Medium | Error triggers connection close |
| scripts/api-server.js:937-938 | `catch (e) { /* Close */ }` | Low | Close operation errors |
| scripts/api-server.js:964-965 | `catch (e) { /* Invalid frame */ }` | Low | Protocol error handling |

## Root Cause Analysis

### Intentional Patterns (Low Severity)
1. **Cleanup operations**: Empty catches during teardown are acceptable - if cleanup fails, there's usually nothing to do
2. **Optional dependencies**: Catching ImportError to fall back to alternative implementations is a valid pattern
3. **Lock release**: Locks may already be released by another process - safe to ignore

### Concerning Patterns (Medium Severity)
1. **Bare `except:` for JSON parsing**: Should use `except (json.JSONDecodeError, ValueError):` to avoid catching unrelated errors like KeyboardInterrupt
2. **Silently swallowing in loops**: `scripts/lib/status_monitor.py:83` could mask real bugs in the monitoring code

## Recommended Fixes

### High Priority
1. **scripts/tests/test-orchestrator-e2e.py**: Replace bare `except:` with specific exceptions:
   ```python
   # Instead of:
   except:
       log("  ✗ Invalid response")

   # Use:
   except (json.JSONDecodeError, ValueError) as e:
       log(f"  ✗ Invalid response: {e}")
   ```

2. **scripts/lib/status_monitor.py:83**: Log errors instead of silently passing:
   ```python
   except Exception as e:
       logging.debug(f"Status check error: {e}")  # or at least log once
   ```

### Low Priority
- Empty catches in cleanup code are acceptable but could add comments explaining intent

## Regression Tests Needed
- Test that status_monitor handles corrupt JSON gracefully
- Test that e2e tests report specific parse errors
