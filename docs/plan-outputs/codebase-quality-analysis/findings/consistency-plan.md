# Codebase Consistency Standardization Plan

**Plan Date:** 2025-12-24
**Based On:** Inconsistencies Consolidated Report (64 findings)
**Target Completion:** 4 weeks (104 hours estimated)
**Status:** Ready for Implementation

---

## Executive Summary

This plan addresses **64 distinct inconsistencies** across the dev_workflow codebase, focusing on naming conventions, API interfaces, schemas, documentation, and cross-directory conflicts.

### Key Standardization Targets

1. **Unified Naming Convention**: camelCase for properties, snake_case for enum values
2. **Standard API Response Format**: `{ success, data, meta, error? }`
3. **Canonical status.json Schema**: Enforce single source of truth
4. **Consistent Error Handling**: Standardized exit codes and error messages
5. **Documentation Alignment**: Fix all broken references and mismatches

### Impact Summary

| Category | Total Count | Critical | High | Medium | Low |
|----------|-------------|----------|------|--------|-----|
| Naming Conventions | 26 | 3 | 12 | 8 | 3 |
| API/Interface | 14 | 2 | 6 | 4 | 2 |
| Schema/Format | 11 | 1 | 5 | 4 | 1 |
| Documentation | 8 | 0 | 3 | 4 | 1 |
| Cross-Directory | 5 | 2 | 2 | 1 | 0 |
| **TOTAL** | **64** | **8** | **28** | **21** | **7** |

---

## 1. Naming Convention Standards

### Target Conventions

#### JavaScript Properties: camelCase
```javascript
{
  lastUpdatedAt: "2025-12-24T10:00:00Z",
  currentPhase: "phase-1",
  findingsPath: "docs/findings/output.md"
}
```

#### Enum Values: snake_case
```javascript
status: "pending" | "in_progress" | "completed" | "failed" | "skipped"
```

#### Constants: SCREAMING_SNAKE_CASE
```javascript
const CURRENT_OUTPUT_PATH = '.claude/current-plan.txt';
const MAX_RETRY_ATTEMPTS = 3;
```

#### Functions: camelCase verbs
```javascript
function getActivePlanPath() { }
function initializeStatus(planPath, planName, tasks) { }
function markTaskCompleted(taskId) { }
```

### Migration Checklist

- [ ] **NC-1**: Create naming convention reference guide
- [ ] **NC-2**: Update planStatusSchema.json to camelCase
- [ ] **NC-3**: Fix status.json field naming across all plans
- [ ] **NC-4**: Standardize function names in status-utils.js
- [ ] **NC-5**: Update all script imports and function calls
- [ ] **NC-6**: Fix artifact type naming in registry

---

## 2. API Return Format Standards

### Target Schema

#### Success Response
```javascript
{
  success: true,
  data: { result: "...", items: [...] },
  meta: { timestamp: "...", timing: { durationMs: 150 } }
}
```

#### Error Response
```javascript
{
  success: false,
  error: { code: "VALIDATION_ERROR", message: "...", context: {...} },
  meta: { timestamp: "..." }
}
```

### Migration Checklist

- [ ] **API-1**: Create shared response builder utility
- [ ] **API-2**: Update research-for-implement.js
- [ ] **API-3**: Standardize cache utilities (4 files)
- [ ] **API-4**: Update verify-with-agent.js
- [ ] **API-5**: Fix plan discovery function signatures
- [ ] **API-6**: Standardize error message formats

---

## 3. Error Handling Standards

### Target Exit Codes
```javascript
const EXIT_CODES = {
  SUCCESS: 0,
  GENERAL_ERROR: 1,
  VALIDATION_ERROR: 2,
  FILE_NOT_FOUND: 3,
  TIMEOUT: 4,
  NETWORK_ERROR: 5,
  PERMISSION_DENIED: 6
};
```

### Migration Checklist

- [ ] **ERR-1**: Create exit-codes.js utility
- [ ] **ERR-2**: Create error-handler.js utility
- [ ] **ERR-3**: Update all plan command scripts
- [ ] **ERR-4**: Standardize async error handling
- [ ] **ERR-5**: Fix lock pattern error messages

---

## 4. Schema/Format Standards

### Canonical Phase Regex
```javascript
const PATTERNS = {
  PHASE_HEADING: /^##\s*Phase\s*(\d+):\s*(.+)$/i,
  TASK_ID: /^phase-(\d+)\.task-(\d+)(?:\.subtask-(\d+))?$/,
  PRIORITY: /\*\*Priority:\s*(Critical|High|Medium|Low)\*\*/i
};
```

### Migration Checklist

- [ ] **SCH-1**: Create regex-patterns.js utility
- [ ] **SCH-2**: Update markdown-parser.js to use shared patterns
- [ ] **SCH-3**: Update plan-output-utils.js to match
- [ ] **SCH-4**: Fix task ID format validation
- [ ] **SCH-5**: Preserve priority markers in recovery
- [ ] **SCH-6**: Standardize artifact metadata
- [ ] **SCH-7**: Finalize planStatusSchema.json

---

## 5. Documentation Standards

### Migration Checklist

- [ ] **DOC-1**: Create missing standards documents (3 files)
- [ ] **DOC-2**: Fix broken references in ORCHESTRATOR.md
- [ ] **DOC-3**: Create terminology glossary
- [ ] **DOC-4**: Fix function reference mismatches
- [ ] **DOC-5**: Correct ADR directory references
- [ ] **DOC-6**: Remove non-existent script references
- [ ] **DOC-7**: Standardize VERIFY section format
- [ ] **DOC-8**: Update plan command documentation

---

## 6. Cross-Directory Conflict Resolution

### Critical Conflicts

#### Function Signature Mismatch
- **Issue:** Commands call `initializePlanStatus(planPath)` but actual function is `initializeStatus(planPath, planName, tasks)`
- **Resolution:** Update all callers and documentation

#### status.json Source of Truth
- **Issue:** Documentation claims status.json is authoritative, but recovery code rebuilds from markdown
- **Resolution:** Document markdown as true source, status.json as cache

#### VERIFY Section Format
- **Issue:** Standard shows `**VERIFY Phase N:**` but templates use checkbox format
- **Resolution:** Standardize on bold heading format

### Migration Checklist

- [ ] **XD-1**: Update status-utils.js documentation
- [ ] **XD-2**: Fix all plan-commands/*.js files
- [ ] **XD-3**: Update PLAN-COMMANDS.md
- [ ] **XD-4**: Create data flow architecture document
- [ ] **XD-5**: Update status.json documentation
- [ ] **XD-6**: Add comments to recovery code
- [ ] **XD-7**: Audit existing plan files for VERIFY format
- [ ] **XD-8**: Choose canonical VERIFY format
- [ ] **XD-9**: Update all plan templates
- [ ] **XD-10**: Update plan standards documentation

---

## 7. Implementation Timeline

### Phase 1: Critical Fixes (Week 1)
- **Effort:** 24 hours
- **Tasks:** NC-2 through NC-5, API-1, ERR-1, SCH-1-3, XD-1-2

### Phase 2: High-Priority Standardization (Week 2)
- **Effort:** 42 hours
- **Tasks:** NC-6, API-2-6, ERR-2-5, SCH-4-6

### Phase 3: Documentation Consolidation (Week 3)
- **Effort:** 22 hours
- **Tasks:** DOC-1-8, XD-7-10

### Phase 4: Schema Validation & Testing (Week 4)
- **Effort:** 16 hours
- **Tasks:** SCH-7, full validation, integration testing

---

## 8. Success Criteria

- [ ] All status.json files validate against canonical schema
- [ ] All command documentation references correct functions
- [ ] All artifact types use standardized naming
- [ ] All documentation links resolve correctly
- [ ] All scripts use shared utilities
- [ ] Test suite passes with 100% success rate

---

**Plan Author:** Claude Code Analysis Agent
**Review Status:** Ready for Implementation
**Total Effort:** 104 hours (~13 working days)
