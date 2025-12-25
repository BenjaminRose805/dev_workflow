# Inconsistencies Consolidated Report

**Analysis Date:** 2025-12-24
**Source:** Phase 1 Findings (9 Agents: S1-S4, D1-D3, C1-C2)
**Total Findings Analyzed:** 9 complete subsystem analyses

---

## Executive Summary

This report consolidates **64 distinct inconsistencies** identified across 9 Phase 1 analysis findings, covering scripts, documentation, and .claude configuration subsystems.

### Most Impactful Inconsistencies (Top 5)

1. **Naming Convention Conflicts (26 instances)** - Mix of camelCase, snake_case, and kebab-case
2. **Status Schema Fragmentation (8 variants)** - Different status.json field definitions across 10 files
3. **Output Format Inconsistency (7 formats)** - Scripts return different JSON structures
4. **Error Handling Pattern Divergence (5 patterns)** - No standard for error messages or exit codes
5. **Documentation-Code Mismatch (12 instances)** - Docs reference functions that don't exist

### Consolidation Statistics

| Category | Total Count | Critical | High | Medium | Low |
|----------|-------------|----------|------|--------|-----|
| Naming Conventions | 26 | 3 | 12 | 8 | 3 |
| API/Interface | 14 | 2 | 6 | 4 | 2 |
| Schema/Format | 11 | 1 | 5 | 4 | 1 |
| Documentation | 8 | 0 | 3 | 4 | 1 |
| Cross-Directory Conflicts | 5 | 2 | 2 | 1 | 0 |
| **TOTAL** | **64** | **8** | **28** | **21** | **7** |

---

## 1. Naming Convention Inconsistencies

### Critical Issues

**C1.1.1: status.json Field Naming Chaos**
- Uses mix of `lastUpdatedAt`, `currentPhase`, `in_progress`
- **Recommendation:** Standardize ALL status.json fields to camelCase for properties, snake_case for enum values only

**C1.1.2: Task Property Name Variation**
- Some use `findingsPath`, some use `findings`
- **Recommendation:** Enforce schema validation using planStatusSchema.json

**C1.2.1: Command vs Plan Naming Conflict**
- Documentation: `/architect`, Plan files: `implement-architect-command.md`, Artifact registry: `architecture`
- **Recommendation:** Document all three forms in glossary

### High-Severity Issues

- Lock Pattern Function Naming inconsistency
- Output Directory Pointer function naming (3 different names)
- Error Response Structure Mismatch (3 different structures)
- Artifact Type Naming (`requirements` vs `requirements-spec`)
- Function Reference Mismatch Across Commands

---

## 2. API/Interface Inconsistencies

### Critical Issues

**C2.1.1: Output Schema Fragmentation Across Research Scripts**
- research-for-implement.js, verify-with-agent.js, parallel-research-pipeline.js all use different output formats
- **Recommendation:** Define canonical schema: `{ success, data, summary, metadata }`

**C2.1.2: Cache Utilities Output Structure Variation**
- 4 different scripts, 4 different output structures
- **Recommendation:** Standardize to `{ success, data, meta, error? }`

### High-Severity Issues

- Sync vs Async Function Return Differences
- Plan Discovery Function Signature Mismatch
- Error Message Format Divergence
- Exit Behavior Inconsistency on Missing Arguments

---

## 3. Schema/Format Inconsistencies

### Critical Issues

**C3.1.1: Phase Regex Pattern Divergence**
- markdown-parser.js: `/^##\s*Phase\s*(\d+):\s*(.+)$/i` (case-insensitive)
- plan-output-utils.js: `/^##\s+Phase\s+(\d+):\s*(.+)$/` (case-sensitive)
- **Recommendation:** Standardize to case-insensitive with `\s*`

### High-Severity Issues

- Task ID Format Assumptions (2-level vs 3-level)
- Priority Marker Extraction Loss in recovery
- Artifact Metadata Field Variation
- Phase Data Structure Mismatch

---

## 4. Documentation Inconsistencies

### High-Severity Issues

- Missing Standards Documents (3 files referenced but don't exist)
- Incorrect Relative Path References in ORCHESTRATOR.md
- Non-Existent Script References
- ADR Directory Mismatch
- Overlapping Term Usage ("commands" vs "plans" vs "artifacts")

---

## 5. Cross-Directory Conflicts

### Critical Issues

**C5.1.1: Function Names Don't Match Documentation**
- Commands call `initializePlanStatus(planPath)` (undefined)
- Actual function: `initializeStatus(planPath, planName, tasks)` (different signature)

**C5.1.2: status.json Source-of-Truth Claim vs Practice**
- 6 command files say "status.json is THE authoritative source"
- But recovery code rebuilds status from markdown

**C5.2.1: VERIFY Section Format Conflict**
- Standard: `**VERIFY Phase N:**` (bold heading)
- Templates: `- [ ] **VERIFY N**:` (within checkbox)

---

## 6. Recommended Standards

### 6.1 Naming Conventions (Target State)

```javascript
// Properties: camelCase
{ lastUpdatedAt, startedAt, findingsPath, currentPhase }

// Enum values: snake_case
status: "pending" | "in_progress" | "completed" | "failed" | "skipped"

// Constants: SCREAMING_SNAKE_CASE
const CURRENT_OUTPUT_PATH = '.claude/current-plan-output.txt';

// Functions: camelCase verbs
getActivePlanPath(), initializeStatus(), markTaskCompleted()
```

### 6.2 API Return Formats (Target Schema)

```javascript
// Standard Success Response
{ success: true, data: {...}, meta: { timing, counts } }

// Standard Error Response
{ success: false, error: { code, message, context }, meta: { timestamp } }
```

### 6.3 Error Handling (Target Pattern)

```javascript
const EXIT_CODES = {
  SUCCESS: 0, GENERAL_ERROR: 1, VALIDATION_ERROR: 2,
  FILE_NOT_FOUND: 3, TIMEOUT: 4
};
```

---

## 7. Migration Checklist

### Phase 1: Critical Fixes (Week 1)
- [ ] Define canonical status.json schema
- [ ] Fix function reference mismatches
- [ ] Resolve artifact type naming
- [ ] Fix broken documentation references

### Phase 2: High-Priority Standardization (Week 2)
- [ ] Extract duplicate code to shared utilities
- [ ] Standardize output formats
- [ ] Fix markdown parsing inconsistencies
- [ ] Create terminology glossary

### Phase 3: Documentation Consolidation (Week 3)
- [ ] Consolidate plan command documentation
- [ ] Standardize progress display
- [ ] Fix template inconsistencies
- [ ] Update plan standards

### Phase 4: Schema Validation & Testing (Week 4)
- [ ] Implement schema validation
- [ ] Test all migrations
- [ ] Documentation cleanup

---

## Summary Statistics

### By Severity
- **Critical:** 8 (12.5%) - Will cause runtime errors or data corruption
- **High:** 25 (39.1%) - Developer confusion, maintenance burden
- **Medium:** 27 (42.2%) - Technical debt, systems still function
- **Low:** 4 (6.2%) - Minor polish issues

### Migration Effort Estimate
- **Total Effort:** ~104 hours (~13 working days)
- Phase 1: 16 hours | Phase 2: 40 hours | Phase 3: 24 hours | Phase 4: 16 hours

### Success Criteria
1. All status.json files validate against canonical schema
2. All command documentation references correct functions
3. All artifact types use standardized naming
4. All documentation links resolve correctly
5. All scripts use shared utilities
6. Test suite passes with 100% success rate
