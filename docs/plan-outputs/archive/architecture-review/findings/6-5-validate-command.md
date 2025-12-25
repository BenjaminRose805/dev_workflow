# Phase 6: Analysis & Quality - `/validate` Command Design

## Command Overview

The `/validate` command family provides comprehensive validation and verification capabilities across specifications, schemas, types, contracts, and build artifacts. These commands ensure implementations match their specifications.

**Command Philosophy:**
- **Systematic verification:** Structured approach to validation
- **Traceability:** Clear mapping between requirements and implementations
- **Actionable feedback:** Severity-ranked findings with remediation
- **Progressive validation:** Support for incremental validation

---

## Sub-Command Specifications

### 1. `validate:spec` - Specification Validation

```yaml
---
name: validate:spec
description: Validate implementation against specification
model: claude-sonnet-4-5
allowed-tools: [Read, Grep, Glob, Bash]
artifacts:
  - validation-report.md
  - deviations.json
  - checklist.md
---
```

**Severity Levels:**
- CRITICAL: Core functionality missing/incorrect
- MAJOR: Significant deviation
- MINOR: Minor discrepancy
- INFORMATIONAL: Suggestions

---

### 2. `validate:schema` - Schema Validation

```yaml
---
name: validate:schema
description: Validate data/API against schemas (JSON Schema, OpenAPI, GraphQL)
model: claude-sonnet-4-5
allowed-tools: [Read, Grep, Glob, Bash]
artifacts:
  - validation-report.md
  - schema-violations.json
  - coverage-report.md
---
```

**Supported Formats:**
- JSON Schema
- OpenAPI
- GraphQL SDL
- Protocol Buffers

---

### 3. `validate:requirements` - Requirements Traceability

```yaml
---
name: validate:requirements
description: Validate requirements coverage and traceability
model: claude-sonnet-4-5
allowed-tools: [Read, Grep, Glob, Bash]
artifacts:
  - traceability-matrix.md
  - coverage-report.md
  - gaps.json
  - validation-report.md
---
```

**Traceability Mapping:**
- Forward: Requirement → Design → Implementation → Tests
- Backward: Tests → Implementation → Design → Requirement

---

### 4. `validate:contracts` - API Contract Validation

```yaml
---
name: validate:contracts
description: Validate API contracts and breaking changes
model: claude-opus-4-5
allowed-tools: [Read, Grep, Glob, Bash]
artifacts:
  - validation-report.md
  - breaking-changes.md
  - compatibility-matrix.md
  - migration-guide.md
---
```

**Breaking Change Detection:**
- Removed endpoints/methods
- Removed/renamed fields
- Changed field types
- New required parameters

---

### 5. `validate:types` - Type Safety Validation

```yaml
---
name: validate:types
description: Validate type safety across codebase
model: claude-opus-4-5
allowed-tools: [Read, Grep, Glob, Bash]
artifacts:
  - validation-report.md
  - type-errors.json
  - coverage-report.md
  - recommendations.md
---
```

**Language Support:**
- TypeScript: `tsc --noEmit --strict`
- Python: `mypy --strict`
- Rust: `cargo check && cargo clippy`
- Go: `go vet && staticcheck`

---

### 6. `validate:build` - Build Validation

```yaml
---
name: validate:build
description: Validate compilation, linting, and tests
model: claude-sonnet-4-5
allowed-tools: [Read, Grep, Glob, Bash]
artifacts:
  - validation-report.md
  - build-log.txt
  - test-results.json
  - lint-violations.json
  - quality-gates.md
---
```

**Validation Phases:**
1. COMPILATION - Clean build
2. LINTING - Style and quality
3. TESTING - Test execution
4. QUALITY GATES - Thresholds

---

### 7. `validate:accessibility` - WCAG Validation

```yaml
---
name: validate:accessibility
description: Validate WCAG 2.1/2.2 compliance
model: claude-sonnet-4-5
allowed-tools: [Read, Grep, Glob, Bash]
artifacts:
  - validation-report.md
  - wcag-compliance.json
  - remediation-guide.md
  - checklist.md
---
```

**Levels:** A, AA, AAA

---

### 8. `validate:security` - Security Validation

```yaml
---
name: validate:security
description: Validate security best practices
model: claude-sonnet-4-5
allowed-tools: [Read, Grep, Glob, Bash]
artifacts:
  - validation-report.md
  - vulnerabilities.json
  - remediation-plan.md
  - dependencies-report.md
---
```

---

## Artifact Schemas

### validation-report.md

```markdown
# Validation Report: [Type]

**Generated:** [Timestamp]
**Status:** ✅ PASSED | ❌ FAILED | ⚠️ WARNINGS

## Summary
- **Total Checks:** [count]
- **Passed:** [count] ✅
- **Failed:** [count] ❌
- **Warnings:** [count] ⚠️

## Critical Findings
### [CRITICAL-001] [Title]
**Severity:** Critical
**Location:** `file/path.ext:line`
**Expected:** [specification requirement]
**Actual:** [implementation]
**Remediation:** [steps to fix]
```

### deviations.json

```json
{
  "metadata": { "validation_type": "spec", "timestamp": "ISO-8601" },
  "summary": { "total_requirements": 45, "deviations_found": 8 },
  "deviations": [{
    "id": "DEV-001",
    "severity": "critical",
    "category": "missing",
    "requirement_id": "REQ-042",
    "specification": { "section": "3.2", "requirement": "..." },
    "implementation": { "status": "missing", "location": "src/auth/admin.ts" },
    "remediation": { "description": "...", "effort": "medium" }
  }]
}
```

### traceability-matrix.md

```markdown
# Requirements Traceability Matrix

## Summary
- **Total Requirements:** 45
- **Implemented:** 38 (84%)
- **Tested:** 35 (78%)

## Matrix
| Req ID | Description | Status | Implementation | Tests |
|--------|-------------|--------|----------------|-------|
| REQ-001 | User auth | ✅ | `src/auth/login.ts` | `tests/auth.test.ts` |
```

---

## Quality Gates

**Exit Codes:**
- 0: Passed
- 1: Critical issues
- 2: Process error
- 3: Threshold exceeded
- 10: Warnings only

---

## Statistics

| Metric | Count |
|--------|-------|
| Sub-Commands | 8 |
| Unique Artifacts | 18 |
| Severity Levels | 4 |

**Phase 6 Task 6.5 Status: COMPLETE**
