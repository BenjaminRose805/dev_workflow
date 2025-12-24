# Phase 3: Python Wrapper System Audit

**Date:** 2025-12-24
**Plan:** cleanup-deprecated-code

## Summary

All three Python wrapper scripts can be safely removed. None are actively used, and their only importers are each other (circular dependency within the deprecated system).

## Files Analyzed

### 1. `scripts/create-plans.py` (~150 lines)

**Purpose:** Batch creation of implementation plans via Claude CLI

**Git History:**
- Single commit: 29946d6 "updated commands and scripts"
- Last modified: Dec 22, 2025

**Dependencies:**
- Imports `run_claude` from `claude_wrapper.py`

**Usage Analysis:**
- No references in `.claude/` commands or skills
- Contains hardcoded plan names for unimplemented features (e.g., `implement-artifact-registry`, `implement-workflow-branching`)
- The referenced plans (p0, p1, p2, p3, agents, hooks) were never implemented

**Recommendation:** **REMOVE**
- This was a one-time setup script for a feature roadmap that was never executed
- The hardcoded SECTIONS dictionary references non-existent plan templates
- No active workflows depend on this script

---

### 2. `scripts/test_wrapper.py` (~100 lines)

**Purpose:** Unit tests for `claude_wrapper.py`

**Git History:**
- Single commit: 29946d6 "updated commands and scripts"
- Last modified: Dec 22, 2025

**Dependencies:**
- Imports `run_claude`, `run_commands` from `claude_wrapper.py`

**Usage Analysis:**
- Not referenced in any test configuration
- Not called by any CI/CD pipelines
- Only purpose is to test the wrapper itself

**Recommendation:** **REMOVE**
- Development test script with no ongoing use
- Will be removed along with the wrapper it tests

---

### 3. `scripts/claude_wrapper.py` (~255 lines)

**Purpose:** Python wrapper for invoking Claude CLI via subprocess

**Git History:**
- Single commit: 29946d6 "updated commands and scripts"
- Last modified: Dec 22, 2025

**Dependencies:**
- Standard library only (subprocess, json, os, sys)
- Optional: `rich` for formatted output

**Importers:**
| File | Import | Status |
|------|--------|--------|
| `scripts/create-plans.py` | `from claude_wrapper import run_claude` | DEPRECATED |
| `scripts/test_wrapper.py` | `from claude_wrapper import run_claude, run_commands` | DEPRECATED |
| `scripts/plan_orchestrator.py` | None | Does NOT use this |

**Usage Analysis:**
- All importers are themselves deprecated (see above)
- `plan_orchestrator.py` (the active Python orchestrator) does NOT import this
- The wrapper provides functionality that overlaps with Node.js agent-launcher.js

**Recommendation:** **REMOVE**
- No active importers
- Functionality duplicated in JavaScript layer
- `plan_orchestrator.py` is self-contained and does not need this

---

## Dependency Graph

```
claude_wrapper.py
    ├── create-plans.py (deprecated, REMOVE)
    └── test_wrapper.py (deprecated, REMOVE)

plan_orchestrator.py (KEEP - actively used)
    └── No dependencies on wrapper system
```

## Recommendations Summary

| File | Lines | Recommendation | Reason |
|------|-------|----------------|--------|
| `scripts/create-plans.py` | ~150 | REMOVE | Unused batch script for unimplemented features |
| `scripts/test_wrapper.py` | ~100 | REMOVE | Test script for deprecated wrapper |
| `scripts/claude_wrapper.py` | ~255 | REMOVE | No active importers, functionality duplicated |

**Total lines to remove:** ~505 lines

## Pre-Removal Checklist

Before proceeding to Phase 4:

- [x] Verified `plan_orchestrator.py` does NOT import `claude_wrapper.py`
- [x] Verified no `.claude/` commands reference these scripts
- [x] Verified no test configurations depend on `test_wrapper.py`
- [x] All three files have only development/setup history (single commit)

## Phase 4 Actions

Per this audit, proceed with Phase 4 to remove all three files:
1. Remove `scripts/test_wrapper.py`
2. Remove `scripts/create-plans.py`
3. Remove `scripts/claude_wrapper.py`
4. Clean up `scripts/__pycache__/` directory
5. Verify `python scripts/plan_orchestrator.py --help` still works
