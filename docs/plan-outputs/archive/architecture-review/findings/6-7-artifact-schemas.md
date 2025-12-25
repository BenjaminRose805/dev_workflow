# Phase 6: Analysis & Quality - Artifact Schemas Catalog

**Date:** 2025-12-20
**Phase:** 6 - Command Design - Analysis & Quality
**Task:** 6.7 - Define artifact schemas for each

---

## Overview

This document catalogs all artifact schemas defined across the Phase 6 Analysis & Quality commands. The commands share common patterns while each producing domain-specific artifacts.

## Common Schema Patterns

### 1. Report Artifacts (Markdown)

All commands produce human-readable markdown reports with YAML frontmatter:

```yaml
---
artifact-type: [type-name]
command: [command:subcommand]
timestamp: [ISO-8601]
status: [passed | failed | warnings]
---
```

### 2. Findings Artifacts (JSON)

Machine-readable structured data with consistent format:

```json
{
  "metadata": {
    "command": "string",
    "timestamp": "ISO-8601",
    "scope": "string"
  },
  "summary": {
    "total_findings": "number",
    "by_severity": { "critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0 }
  },
  "findings": [{ /* finding objects */ }]
}
```

### 3. Severity Levels

Consistent severity classification across all commands:

| Level | Description | Action Required |
|-------|-------------|-----------------|
| **Critical** | Immediate security/functionality risk | Block merge/deploy |
| **High** | Significant issue, high impact | Fix in current sprint |
| **Medium** | Notable issue, moderate impact | Plan for next sprint |
| **Low** | Minor issue, low impact | Backlog |
| **Info** | Suggestion, no risk | Optional enhancement |

---

## Artifacts by Command

### /analyze Command Artifacts

| Artifact | Format | Purpose |
|----------|--------|---------|
| `findings.json` | JSON | Universal finding format with CVSS, CWE references |
| `metrics.json` | JSON | Quantitative metrics (complexity, coverage, duplication) |
| `analysis-report.md` | Markdown | Human-readable comprehensive report |
| `recommendations.md` | Markdown | Prioritized action plan |

**findings.json Schema:**
```json
{
  "findings": [{
    "id": "SEC-001",
    "severity": "critical",
    "category": "injection",
    "title": "string",
    "location": { "file": "string", "line": "number", "column": "number" },
    "impact": "string",
    "cwe_id": "CWE-XXX",
    "owasp_category": "string",
    "cvss_score": "number",
    "recommendation": { "summary": "string", "code_example": "string" },
    "references": ["url"]
  }]
}
```

**metrics.json Schema:**
```json
{
  "complexity": { "average_cyclomatic": 0, "max_cyclomatic": 0, "cognitive_complexity": { "average": 0, "max": 0 } },
  "duplication": { "percentage": 0, "duplicated_lines": 0, "duplicated_blocks": 0 },
  "test_coverage": { "line_coverage": 0, "branch_coverage": 0, "statement_coverage": 0 },
  "maintainability_index": 0,
  "technical_debt_hours": 0
}
```

---

### /audit Command Artifacts

| Artifact | Format | Purpose |
|----------|--------|---------|
| `security-audit-report.md` | Markdown | Formal audit report with executive summary |
| `vulnerabilities.json` | JSON | CVE/CWE-referenced vulnerabilities |
| `compliance-checklist.md` | Markdown | Control verification with pass/fail |
| `control-mapping.json` | JSON | Code-to-control mapping |
| `remediation-plan.md` | Markdown | Prioritized remediation steps |
| `license-inventory.json` | JSON | Dependency license inventory |
| `sbom.json` | JSON | Software Bill of Materials (SPDX/CycloneDX) |
| `exposed-secrets.json` | JSON | Detected secrets (SENSITIVE) |

**vulnerabilities.json Schema:**
```json
{
  "audit_metadata": { "audit_type": "string", "timestamp": "ISO-8601" },
  "vulnerabilities": [{
    "id": "string",
    "severity": "critical|high|medium|low|info",
    "cvss_score": "number",
    "cvss_vector": "string",
    "cwe": "CWE-XXX",
    "cve": "CVE-YYYY-XXXXX",
    "owasp": "string",
    "exploitability": "high|moderate|difficult",
    "remediation": { "priority": "number", "effort": "low|medium|high", "example_code": "string" }
  }]
}
```

**compliance-checklist.md Format:**
```markdown
## [Control Category]
- [x] **[CHECK-ID]** [Requirement] - ✅ PASS
- [ ] **[CHECK-ID]** [Requirement] - ❌ FAIL
  - **Issue:** [description]
  - **Fix:** [remediation]
```

---

### /review Command Artifacts

| Artifact | Format | Purpose |
|----------|--------|---------|
| `review-comments.md` | Markdown | Line-by-line review comments |
| `suggestions.json` | JSON | Structured code suggestions |
| `review-summary.md` | Markdown | Executive review summary |
| `blockers.md` | Markdown | Critical merge blockers |
| `compliance-report.md` | Markdown | Standards compliance |
| `violations.json` | JSON | Standards violations |

**suggestions.json Schema:**
```json
{
  "version": "1.0",
  "summary": {
    "total_suggestions": 0,
    "by_severity": { "critical": 0, "high": 0, "medium": 0, "low": 0 },
    "by_category": { "bug": 0, "security": 0, "performance": 0, "style": 0 }
  },
  "suggestions": [{
    "id": "string",
    "file": "string",
    "line_start": "number",
    "line_end": "number",
    "severity": "string",
    "category": "string",
    "title": "string",
    "current_code": "string",
    "suggested_code": "string",
    "rationale": "string",
    "auto_fixable": "boolean",
    "estimated_effort": "small|medium|large"
  }]
}
```

---

### /test Command Artifacts

| Artifact | Format | Purpose |
|----------|--------|---------|
| `test-plan.md` | Markdown | Comprehensive test plan |
| `test-matrix.json` | JSON | Structured test case matrix |
| `coverage-report.md` | Markdown | Coverage analysis |
| `coverage-gaps.json` | JSON | Untested code paths |
| `test-results.md` | Markdown | Test execution results |
| `*.test.ts` | TypeScript | Generated test files |
| `fixtures/*.json` | JSON | Test fixtures |

**test-matrix.json Schema:**
```json
{
  "metadata": { "version": "1.0", "feature": "string", "totalTests": 0 },
  "testCases": [{
    "id": "TC-001",
    "title": "string",
    "type": "unit|integration|e2e",
    "priority": "high|medium|low",
    "status": "pending|implemented|passed|failed",
    "preconditions": ["string"],
    "steps": [{ "step": 0, "action": "string", "expected": "string" }],
    "automationStatus": "automated|manual|not-automated",
    "relatedRequirements": ["REQ-001"]
  }],
  "coverage": {
    "requirements": { "total": 0, "covered": 0, "percentage": 0 }
  }
}
```

**coverage-gaps.json Schema:**
```json
{
  "metadata": { "overallCoverage": { "statements": 0, "branches": 0, "functions": 0 } },
  "gaps": [{
    "file": "string",
    "priority": "high|medium|low",
    "coverage": { "statements": 0, "branches": 0 },
    "uncoveredRanges": [{ "start": 0, "end": 0, "type": "string", "complexity": 0 }],
    "recommendations": [{ "type": "unit-test", "description": "string", "effort": "string" }]
  }],
  "summary": { "totalGaps": 0, "estimatedEffort": "string" }
}
```

---

### /validate Command Artifacts

| Artifact | Format | Purpose |
|----------|--------|---------|
| `validation-report.md` | Markdown | Validation results summary |
| `deviations.json` | JSON | Spec deviations |
| `checklist.md` | Markdown | Verification checklist |
| `traceability-matrix.md` | Markdown | Requirements traceability |
| `schema-violations.json` | JSON | Schema validation errors |
| `breaking-changes.md` | Markdown | Contract breaking changes |
| `quality-gates.md` | Markdown | Gate pass/fail status |

**deviations.json Schema:**
```json
{
  "metadata": { "validation_type": "spec|schema|requirements|contracts", "timestamp": "ISO-8601" },
  "summary": { "total_requirements": 0, "deviations_found": 0, "severity_breakdown": {} },
  "deviations": [{
    "id": "DEV-001",
    "severity": "critical|major|minor|informational",
    "category": "missing|mismatch|extra|incorrect",
    "requirement_id": "REQ-XXX",
    "specification": { "section": "string", "requirement": "string", "file": "string", "line": 0 },
    "implementation": { "status": "missing|partial|incorrect", "description": "string", "location": "string" },
    "remediation": { "description": "string", "effort": "low|medium|high", "suggested_code": "string" }
  }],
  "pass_fail_criteria": { "max_critical": 0, "status": "passed|failed" }
}
```

---

### /debug Command Artifacts

| Artifact | Format | Purpose |
|----------|--------|---------|
| `debug-log.md` | Markdown | Investigation chronology |
| `hypothesis.md` | Markdown | Debugging hypotheses |
| `root-cause.md` | Markdown | Confirmed root cause |
| `fix-suggestion.md` | Markdown | Proposed fix with code |
| `performance-analysis.md` | Markdown | Bottleneck analysis |
| `optimization-plan.md` | Markdown | Prioritized optimizations |
| `memory-analysis.md` | Markdown | Memory usage patterns |
| `concurrency-analysis.md` | Markdown | Thread interaction analysis |

**debug-log.md YAML Frontmatter:**
```yaml
---
artifact-type: debug-log
session-id: [unique-id]
command: [debug:error]
timestamp: [ISO-8601]
---
```

**hypothesis.md Structure:**
```markdown
### 1. [Hypothesis Name] - [High|Medium|Low] Probability
**Description:** [What might be wrong]
**Supporting Evidence:** [Evidence points]
**Testing Approach:** [Steps to test]
**Files to Examine:** [Relevant files]
**Expected Findings If Confirmed:** [What to look for]
```

---

## Shared Artifact Schemas

### Status Symbols

Used across all command artifacts:

| Symbol | Meaning |
|--------|---------|
| ✅ / ✓ | Passed / Completed |
| ❌ / ✗ | Failed |
| ⚠️ | Warning |
| ◯ | Pending |
| ⟳ | In Progress |
| ⊘ | Skipped |
| ℹ️ | Informational |

### Common Report Header

```markdown
# [Report Type] Report

**Generated:** [ISO-8601 timestamp]
**Scope:** [What was analyzed]
**Status:** ✅ PASSED | ❌ FAILED | ⚠️ WARNINGS

## Summary
- **Total [Items]:** [count]
- **Passed:** [count] ✅
- **Failed:** [count] ❌
- **Warnings:** [count] ⚠️
```

### Quality Gate Schema

```markdown
## Quality Gates

| Gate | Threshold | Actual | Status |
|------|-----------|--------|--------|
| [Gate name] | [threshold] | [actual] | ✅/❌ |
```

---

## Artifact Statistics

### By Command

| Command | Unique Artifacts | JSON | Markdown |
|---------|------------------|------|----------|
| /analyze | 18 | 8 | 10 |
| /audit | 20 | 8 | 12 |
| /review | 12 | 4 | 8 |
| /test | 15 | 5 | 10 |
| /validate | 18 | 6 | 12 |
| /debug | 12 | 0 | 12 |
| **Total** | **95** | **31** | **64** |

### By Type

| Type | Count | Purpose |
|------|-------|---------|
| Analysis Reports | 24 | Human-readable findings |
| Findings/Violations | 18 | Machine-readable issues |
| Plans/Roadmaps | 12 | Prioritized actions |
| Checklists | 8 | Verification tracking |
| Metrics | 8 | Quantitative data |
| Test Artifacts | 15 | Test-related files |
| Debug Logs | 10 | Investigation records |

---

## Schema Versioning

All JSON schemas include version field:

```json
{
  "version": "1.0",
  "schema_version": "2025-12-20",
  ...
}
```

**Backward Compatibility:**
- Minor version: Additive changes only
- Major version: Breaking changes require migration

---

**Phase 6 Task 6.7 Status: COMPLETE**
