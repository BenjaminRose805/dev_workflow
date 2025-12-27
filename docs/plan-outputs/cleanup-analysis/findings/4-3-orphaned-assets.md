# Finding: Orphaned Assets and Resources

## Summary

Audit of images, templates, data files, test fixtures, and backup files. Found 2 backup files from a previous refactor, 1 orphaned test fixture file, mock data files tied to an active plan, and no orphaned images or templates. The git hook `.sample` files are standard git scaffolding.

## Backup Files

| File | Size | Location | Notes |
|------|------|----------|-------|
| `plan-status.js.backup` | 32KB | `docs/plan-outputs/parallel-execution-foundation/backups/` | Backup from refactor |
| `status-cli.js.backup` | 31KB | `docs/plan-outputs/parallel-execution-foundation/backups/` | Backup from refactor |

**Assessment:** These backups were created during the parallel-execution-foundation implementation. The original files were successfully refactored, so backups can be safely removed.

## Test Fixtures

### Active Test Fixtures

| Directory | Contents | Status |
|-----------|----------|--------|
| `docs/plan-outputs/test-dependency-patterns/fixtures/` | `fixture-helpers.js`, `sample-data.json` | Active - part of test plan |

**Assessment:** The `test-dependency-patterns` plan is still active. Its fixtures are needed for testing DAG-aware scheduling. Not safe to remove while plan is active.

### Orphaned Test Fixtures

| File | Location | Status |
|------|----------|--------|
| `shared-state.txt` | `tests/fixtures/` | Orphaned - no references found |

**Details:**
- Contains only `state=complete`
- Created Dec 25, never modified
- No script or test references this file
- Parent `tests/fixtures/` directory contains only this file

## Mock Data

### Active Mock Data (Keep)

| Directory | Contents | Plan |
|-----------|----------|------|
| `docs/plan-outputs/git-workflow-phase5-worktrees/mock-data/` | 9 files (JSON + README) | `git-workflow-phase5-worktrees` (active) |

**Files in mock-data:**
- `README.md` - Documentation for mock data
- `conflicts.json` - Mock conflict data
- `orchestrator-logs.json` - Mock log data
- `plan-detail.json` - Mock plan details
- `plans.json` - Mock plans list
- `resources.json` - Mock resource data
- `websocket-messages.json` - Mock WebSocket messages
- `worktrees.json` - Mock worktree data

**Assessment:** These mock files are documentation/examples for the worktrees plan. Keep while plan is active.

## Template Files

| Pattern Searched | Results |
|------------------|---------|
| `*.template`, `*.tpl`, `*.tmpl` | None found (outside node_modules) |

## Image Files

| Pattern Searched | Results |
|------------------|---------|
| `*.png`, `*.jpg`, `*.jpeg`, `*.gif`, `*.svg`, `*.ico` | None found (outside node_modules) |

## Data Files

### API Specification

| File | Size | Status |
|------|------|--------|
| `docs/api/openapi.yaml` | 20KB | Active - referenced by 30+ documentation files |
| `docs/api/plan-management-api.md` | 14KB | Active - API documentation |

**Assessment:** The OpenAPI spec is actively referenced in architecture docs, plans, and templates. Keep.

### Miscellaneous Data Files

| File | Location | Status |
|------|----------|--------|
| `test-output.txt` | `docs/plan-outputs/archive/orchestrator-test/` | Archived - can stay in archive |

**Assessment:** This is properly in the archive directory with its corresponding status.json.

## Git Hook Samples

| Count | Status |
|-------|--------|
| 14 `.sample` files | Standard git scaffolding |

**Assessment:** These are default git hook templates created by `git init`. They're not orphaned - they're standard git infrastructure. Do not remove.

## Items for Removal

### Priority 1: Safe to Delete

| Item | Action | Reason | Risk |
|------|--------|--------|------|
| `docs/plan-outputs/parallel-execution-foundation/backups/plan-status.js.backup` | Delete | Refactor complete, original works | Safe |
| `docs/plan-outputs/parallel-execution-foundation/backups/status-cli.js.backup` | Delete | Refactor complete, original works | Safe |
| `tests/fixtures/shared-state.txt` | Delete | No references, contains only test state | Safe |
| `tests/fixtures/` (directory) | Delete if empty after above | Only contains orphaned file | Safe |

### Priority 2: Requires Plan Completion

| Item | Action | Reason | Risk |
|------|--------|--------|------|
| `docs/plan-outputs/test-dependency-patterns/fixtures/` | Review after plan complete | Part of active test plan | Wait |
| `docs/plan-outputs/git-workflow-phase5-worktrees/mock-data/` | Review after plan complete | Part of active worktrees plan | Wait |

### Not Orphaned (Keep)

| Item | Reason |
|------|--------|
| `docs/api/openapi.yaml` | Actively referenced in 30+ files |
| `docs/api/plan-management-api.md` | Active API documentation |
| `.git/hooks/*.sample` | Standard git scaffolding |

## Recommendations

### Immediate Actions

1. **Delete backup files** (63KB total)
   ```bash
   rm docs/plan-outputs/parallel-execution-foundation/backups/*.backup
   rmdir docs/plan-outputs/parallel-execution-foundation/backups/
   ```

2. **Delete orphaned test fixture**
   ```bash
   rm tests/fixtures/shared-state.txt
   rmdir tests/fixtures/
   ```

### Future Actions (After Plans Complete)

1. When `test-dependency-patterns` plan is archived:
   - Review whether fixtures should be kept for future testing
   - If not, remove `docs/plan-outputs/test-dependency-patterns/fixtures/`

2. When `git-workflow-phase5-worktrees` plan is archived:
   - Mock data may be useful as examples
   - Consider keeping README.md, archiving or removing JSON files

## Summary Statistics

| Category | Count | Size | Status |
|----------|-------|------|--------|
| Backup files to remove | 2 | ~63KB | Safe |
| Orphaned fixtures to remove | 1 | <1KB | Safe |
| Active mock data (keep) | 9 files | Variable | Active plan |
| Active API specs (keep) | 2 files | ~34KB | Referenced |
| Git sample hooks (keep) | 14 | Standard | Git scaffolding |

**Total removable now:** 3 files (~64KB)
