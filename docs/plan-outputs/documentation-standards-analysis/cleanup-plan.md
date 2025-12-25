# Documentation Cleanup Action Plan

**Generated:** 2025-12-25
**Source:** Documentation Standards Analysis Plan - Phase 4, Task 4.1
**Based on:** Findings from Phase 1 (Inventory), Phase 2 (Obsolescence), and Phase 3 (Standards Authority)

---

## Executive Summary

This action plan compiles all findings from the documentation standards analysis into actionable cleanup tasks. The analysis reviewed 100+ documentation files across docs/, scripts/lib/schemas/, and .claude/commands/, identifying:

- **49 backup files** to DELETE (status.json.bak files)
- **1 empty directory** to DELETE (docs/completed plans/)
- **3 files** requiring content MERGE (orchestrator documentation)
- **4 files** to ARCHIVE (theoretical command selection guides)
- **8 files** requiring content UPDATE (outdated references)
- **38 templates** for potential CONSOLIDATION (reduce boilerplate)

**Total estimated cleanup:** ~11,000 lines of duplicate/obsolete content

---

## Files to DELETE

### 1. Backup Files (49 files)

**Location:** `docs/plan-outputs/archive/*/status.json.bak`

**Rationale:** Redundant backup copies of status.json created during plan execution. The main status.json files contain complete information.

**Action:**
```bash
find docs/plan-outputs/archive -name "status.json.bak" -delete
```

**Impact:** Removes ~50KB of redundant data across 49 files

---

### 2. Empty Directory

**Location:** `docs/completed plans/`

**Rationale:** Legacy directory that was replaced by `docs/plans/archive/`. Currently empty and serves no purpose.

**Action:**
```bash
rmdir "docs/completed plans"
```

**Impact:** Removes directory clutter, eliminates naming confusion

---

## Files to ARCHIVE

### 1. Command Selection Guides (4 files)

These files document commands that haven't been implemented yet. They should be archived until their respective commands are built.

| File | Current Location | Archive To | Rationale |
|------|-----------------|------------|-----------|
| analysis-command-selection-guide.md | docs/standards/ | docs/standards/archive/ | Commands (/analyze, /review, /audit) not implemented |
| architecture-command-selection-guide.md | docs/standards/ | docs/standards/archive/ | Commands (/architect, /design, /refactor) not implemented |
| documentation-command-selection-guide.md | docs/standards/ | docs/standards/archive/ | /document and /explain not implemented |
| quality-verification-command-selection-guide.md | docs/standards/ | docs/standards/archive/ | Commands (/test, /validate, /audit) not implemented |

**Action:**
```bash
mkdir -p docs/standards/archive
mv docs/standards/analysis-command-selection-guide.md docs/standards/archive/
mv docs/standards/architecture-command-selection-guide.md docs/standards/archive/
mv docs/standards/documentation-command-selection-guide.md docs/standards/archive/
mv docs/standards/quality-verification-command-selection-guide.md docs/standards/archive/
```

**Impact:** Removes theoretical documentation from active standards directory; preserves for future reference

---

## Files to MERGE

### 1. Orchestrator Documentation Consolidation (HIGH PRIORITY)

**Problem:** Three files document the same orchestrator system with 85% content overlap.

| Source File | Lines | Merge Status |
|-------------|-------|--------------|
| docs/ORCHESTRATOR.md | 424 | SOURCE - provides troubleshooting, quick commands |
| docs/ARCHITECTURE.md (orchestrator section) | ~40 | SOURCE - provides design decisions, key principles |
| docs/architecture/orchestrator-system.md | 341 | TARGET - will become single authoritative source |

**Merge Plan:**

1. **Target file:** `docs/architecture/orchestrator-system.md` (becomes authoritative source)

2. **Content to merge FROM ORCHESTRATOR.md:**
   - Troubleshooting section (lines 320-424)
   - Quick command reference (lines 162-178)
   - Common error patterns and solutions

3. **Content to merge FROM ARCHITECTURE.md:**
   - Design decisions section (lines 173-194)
   - Key principles (lines 20-25)

4. **After merge:**
   - Replace `docs/ORCHESTRATOR.md` with redirect file pointing to new location
   - Remove orchestrator section from `docs/ARCHITECTURE.md`
   - Update all references to point to `docs/architecture/orchestrator-system.md`

**Redirect file content (docs/ORCHESTRATOR.md):**
```markdown
# Orchestrator Documentation

This documentation has been consolidated.

See: [docs/architecture/orchestrator-system.md](architecture/orchestrator-system.md)

For quick reference:
- Architecture: [orchestrator-system.md](architecture/orchestrator-system.md#architecture)
- Status CLI: [orchestrator-system.md](architecture/orchestrator-system.md#status-cli)
- Troubleshooting: [orchestrator-system.md](architecture/orchestrator-system.md#troubleshooting)
```

**Impact:** Eliminates ~400 duplicate lines, creates single source of truth

---

### 2. Plan Migration Documentation Cross-References (MEDIUM PRIORITY)

**Problem:** 40% overlap between migration-related files.

| File | Purpose | Action |
|------|---------|--------|
| docs/plan-system/MIGRATION-GUIDE.md | HOW to migrate | Keep as-is, add cross-reference |
| docs/plan-system/COMPLETED-PLANS.md | WHAT/WHEN/WHY to migrate | Keep as-is, add cross-reference, remove duplicate commands |

**Merge Plan:**

1. **Add to top of COMPLETED-PLANS.md:**
   ```markdown
   > **See also:** [MIGRATION-GUIDE.md](MIGRATION-GUIDE.md) for step-by-step migration commands
   ```

2. **Add to top of MIGRATION-GUIDE.md:**
   ```markdown
   > **See also:** [COMPLETED-PLANS.md](COMPLETED-PLANS.md) for understanding when and why to archive plans
   ```

3. **Remove from COMPLETED-PLANS.md:**
   - Duplicate command examples (lines 44-68)
   - Keep reference: "See MIGRATION-GUIDE.md for complete commands"

**Impact:** Reduces ~80 duplicate lines, improves navigation

---

## Files to UPDATE

### 1. Critical Updates (Outdated References to Deleted Files)

| File | Line(s) | Issue | Fix |
|------|---------|-------|-----|
| docs/ORCHESTRATOR.md | 36 | References `plan-runner.sh` in diagram | Remove from diagram, update to show Python TUI → status-cli.js |
| docs/ORCHESTRATOR.md | Various | Architecture shows 3-layer system with plan-orchestrator.js | Update to 2-layer (plan_orchestrator.py → status-cli.js → plan-status.js) |
| docs/ARCHITECTURE.md | Various | References `plan-runner.sh` as shell wrapper | Remove reference |
| docs/architecture/orchestrator-system.md | 122-124 | References `current-plan-output.txt` | Remove outdated pointer file reference |
| .claude/commands/plan/migrate.md | 233 | `cat .claude/current-plan-output.txt` verification step | Remove step (file doesn't exist) |
| .claude/commands/plan/migrate.md | 237 | References getOutputDir from plan-output-utils.js | Correct import to plan-status.js |
| docs/claude-commands/ARCHITECTURE.md | 48 | Lists status-manager.js in library layer | Remove, update to show plan-status.js as unified API |

**Files Verified as Deleted (referenced in docs but no longer exist):**
- scripts/plan-orchestrator.js
- scripts/plan-runner.sh
- scripts/lib/status-manager.js
- scripts/lib/plan-pointer.js
- .claude/current-plan-output.txt

---

### 2. Low Priority Updates (Naming Consistency)

| File | Issue | Fix |
|------|-------|-----|
| docs/plan-system/MIGRATION-GUIDE.md | References "docs/completed plans/" | Standardize to "docs/plans/archive/" |
| docs/ARCHITECTURE.md | References both directories | Prefer "docs/plans/archive/" as primary archive location |

---

## Template CONSOLIDATION (Future Enhancement)

### Command Implementation Templates (38 files, ~14,000 lines)

**Problem:** 95%+ structural similarity across 38 implement-*-command.md templates with massive boilerplate duplication.

**Identical sections across all templates:**
- Phase 1: Command Infrastructure (95% identical)
- Phase 5: Testing & Validation (100% identical)
- Phase 6: Documentation & Integration (100% identical)
- Success Criteria format (100% identical)
- Risks table format (100% identical format)
- Template Variables Reference (100% identical)

**Recommendation:**

1. **Update CANONICAL-COMMAND-TEMPLATE.md** with complete boilerplate sections
2. **Reduce individual templates** from 200+ lines to ~100-150 lines each
3. **Add reference** at top of each: "See CANONICAL-COMMAND-TEMPLATE.md for complete structure"
4. **Remove from individual files:**
   - Duplicate Success Criteria section
   - Duplicate Testing phase
   - Duplicate Documentation phase
   - Duplicate Risks table
   - Duplicate Template Variables Reference

**Estimated savings:** ~10,000 lines (68% reduction)

**Priority:** Low - This is a maintenance improvement, not urgent

---

## Implementation Checklist

### Phase 1: Quick Wins (Immediate)

- [ ] Delete 49 backup files: `find docs/plan-outputs/archive -name "status.json.bak" -delete`
- [ ] Delete empty directory: `rmdir "docs/completed plans"`
- [ ] Create docs/standards/archive/ directory
- [ ] Move 4 command selection guides to archive

### Phase 2: Content Updates (High Impact)

- [ ] Update docs/ORCHESTRATOR.md - remove deleted file references
- [ ] Update docs/ARCHITECTURE.md - remove deleted file references
- [ ] Update docs/architecture/orchestrator-system.md - remove current-plan-output.txt reference
- [ ] Update .claude/commands/plan/migrate.md - fix verification steps
- [ ] Update docs/claude-commands/ARCHITECTURE.md - fix library list

### Phase 3: Consolidation (Medium Effort)

- [ ] Merge orchestrator documentation into single file
- [ ] Add cross-references between migration docs
- [ ] Remove duplicate command examples from COMPLETED-PLANS.md

### Phase 4: Template Optimization (Future)

- [ ] Audit CANONICAL-COMMAND-TEMPLATE.md completeness
- [ ] Create plan for template reduction
- [ ] Reduce 38 command templates to core-only content

---

## Verification Criteria

After cleanup is complete, verify:

1. **No dead references:** `grep -r "plan-runner.sh\|plan-orchestrator.js\|status-manager.js\|current-plan-output.txt" docs/` returns no matches
2. **Single orchestrator source:** Only `docs/architecture/orchestrator-system.md` contains detailed orchestrator documentation
3. **No backup files:** `find docs/plan-outputs -name "*.bak"` returns empty
4. **Archive created:** `ls docs/standards/archive/` shows 4 archived guides
5. **Cross-references added:** Migration docs contain mutual references

---

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Breaking internal references | High | Medium | Search for file references before deleting; update references first |
| Losing historical context | Medium | Low | Archive rather than delete for theoretical docs |
| Incomplete merge | Medium | Medium | Verify all content transferred before removing sources |
| Template consolidation breaks tooling | Low | Low | Test template parsing after changes |

---

## Notes

1. **Prioritize orchestrator merge** - This eliminates the most confusion and maintenance burden
2. **Archive before delete** - Use archive directory for theoretical docs that may be needed later
3. **Update references first** - Before deleting files, update all documents that reference them
4. **Verify after each phase** - Run grep searches to confirm changes are complete

---

**Next Steps:** Execute Phase 1 cleanup tasks immediately. Plan Phase 2-3 as a follow-up implementation plan or add to existing maintenance backlog.
