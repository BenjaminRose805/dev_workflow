# Cleanup Plan: Codebase Quality Analysis

**Generated:** 2025-12-24
**Based On:** unused-code-consolidated.md
**Status:** Ready for Implementation

---

## Executive Summary

This cleanup plan addresses **18 confirmed unused code items** identified across the dev_workflow codebase, representing approximately **1,364 lines of removable code**.

### Impact Metrics

| Metric | Value |
|--------|-------|
| **Total LOC Removable** | ~1,364 lines |
| **Additional LOC via Deduplication** | ~595 lines |
| **Total Potential Reduction** | ~1,959 lines |
| **Files Affected** | 15+ files |
| **Estimated Effort** | 8-12 hours |

### Priority Breakdown

- **Critical (898 LOC):** ARCHITECTURE.md from wrong project
- **High (82 LOC):** Dead code, broken references, undocumented commands
- **Medium (234 LOC):** Unused exports requiring verification
- **Low (150 LOC):** Deprecation candidates

---

## Phase 1: Safe Immediate Removal

**Timeline:** Day 1
**Risk Level:** Low
**Estimated LOC Removed:** ~15 lines

### 1.1 Unused Variables and Imports

**Location:** `scripts/lib/plan-output-utils.js:435-436`
```javascript
// Remove unused regex variables
const phaseRegex = /^## Phase \d+:/;
const taskRegex = /^### Task \d+\.\d+:/;
```

**Location:** `scripts/benchmark.js:46`
```javascript
// Remove unused fs import
const fs = require('fs');
```

### 1.2 Dead Code: Duplicate Logic

**Location:** `scripts/lib/plan-output-utils.js:395-401`
```javascript
// Remove duplicate summary check (already handled earlier)
if (!sections.summary) {
  return { success: false, error: 'Missing Summary section' };
}
```

### 1.3 Broken Documentation References

**Location:** `docs/artifact-type-registry.md:220-222`
- Remove references to non-existent standards files
- Or create placeholder files if planning to add standards

### Validation Steps

```bash
npm test
node -c scripts/lib/plan-output-utils.js
git diff --stat
```

---

## Phase 2: Items Requiring Verification

**Timeline:** Days 2-3
**Risk Level:** Medium
**Estimated LOC Removed:** ~150-950 lines

### 2.1 CRITICAL: ARCHITECTURE.md Ownership

**Location:** `docs/ARCHITECTURE.md`
**LOC:** 898 lines

**Verification Steps:**
```bash
git log --follow --oneline docs/ARCHITECTURE.md | head -20
grep -r "ARCHITECTURE.md" . --exclude-dir=.git
grep -r "Idea-to-Code" src/ docs/
```

**Decision:** Remove if wrong project, archive if uncertain.

### 2.2 Undocumented Status CLI Commands

**Location:** `scripts/status-cli.js`
**LOC:** 56 lines

**Commands:**
- `cmdRetryable()` (lines 566-587)
- `cmdExhausted()` (lines 591-602)
- `cmdIncrementRetry()` (lines 607-616)
- `cmdDetectStuck()` (lines 618-629)

**Decision:** Document if used, remove if deprecated.

### 2.3 Lock Utility Functions

**Location:** `scripts/lib/plan-output-utils.js`
**LOC:** ~50 lines

- `isLockStale()` - ~15 lines
- `cleanStaleLock()` - ~25 lines
- `isLocked()` - ~10 lines

### 2.4 Agent Pool Pause/Resume

**Location:** `scripts/lib/agent-pool.js`
**LOC:** 38 lines

- `pause()` (lines 494-510)
- `resume()` (lines 511-531)

### 2.5 Unused Exported Functions

| Function | File | LOC | Action |
|----------|------|-----|--------|
| `mergePlanWithStatus()` | plan-orchestrator.js | 22 | Remove (confirmed unused) |
| `getOutputDir()` | plan-orchestrator.js | 7 | Inline |
| `createErrorResponse()` | agent-launcher.js | 10 | Export for reuse? |
| `createSuccessResponse()` | agent-launcher.js | 6 | Export for reuse? |

---

## Phase 3: Deprecation Candidates

**Timeline:** Week 2
**Risk Level:** Low

### 3.1 Unused Configuration Options

**Location:** `scripts/lib/agent-pool.js:77-89`

Remove:
- `minConcurrent` - Never used
- `healthCheckInterval` - Not implemented
- `errorRateThreshold` - Not implemented

### 3.2 Plans Without Output Directories

Create directories or archive plans:
- `create-implementation-templates.md`
- `output-separation-implementation.md`
- `plan-system-analysis.md`

---

## Phase 4: Documentation Cleanup

**Timeline:** Week 2-3

### 4.1 Add Missing Plan Sections
- Add Dependencies/Risks sections to 4 plans

### 4.2 Template Inventory
- Generate inventory of all templates
- Mark deprecated templates

### 4.3 Fix Plan Metadata
- Ensure all plans have status, dates, owner fields

---

## Cleanup Script

```bash
#!/bin/bash
# cleanup-unused-code.sh

PHASE=${1:-"all"}
DRY_RUN=${2:-"--dry-run"}

if [[ "$DRY_RUN" == "--dry-run" ]]; then
  echo "DRY RUN MODE"
fi

# Phase 1: Safe removals
if [[ "$PHASE" == "1" || "$PHASE" == "all" ]]; then
  echo "--- Phase 1: Safe Immediate Removal ---"
  if [[ "$DRY_RUN" != "--dry-run" ]]; then
    sed -i '435,436d' scripts/lib/plan-output-utils.js
    sed -i '46d' scripts/benchmark.js
    sed -i '395,401d' scripts/lib/plan-output-utils.js
    sed -i '220,222d' docs/artifact-type-registry.md
    echo "Done"
  else
    echo "[DRY RUN] Would remove unused code"
  fi
fi
```

**Usage:**
```bash
./scripts/cleanup-unused-code.sh 1 --dry-run  # Preview
./scripts/cleanup-unused-code.sh 1 --execute  # Execute
```

---

## Validation Steps

### After Each Phase

```bash
# Run tests
npm test

# Check for broken imports
npm run lint

# Verify no runtime errors
npm run build

# Review changes
git diff --stat
```

### Success Metrics

- [ ] All 18 confirmed unused items removed or documented
- [ ] ~1,364+ lines of code removed
- [ ] Zero test failures
- [ ] Zero broken documentation links
- [ ] CHANGELOG.md updated

---

## Rollback Plan

```bash
# Quick rollback
git stash save "cleanup-rollback"

# Or reset to previous commit
git reset --hard HEAD~1

# Partial rollback
git checkout HEAD -- scripts/lib/plan-output-utils.js
```

---

## Timeline

### Week 1
- Day 1: Phase 1 (safe removals)
- Days 2-3: Phase 2 (verification)
- Days 4-5: Testing and validation

### Week 2
- Phase 3 (deprecation)
- Phase 4 (documentation)

### Week 3
- Final validation
- Code review
- Merge

---

**Document Owner:** Dev Team
**Last Updated:** 2025-12-24
**Status:** Ready for Implementation
