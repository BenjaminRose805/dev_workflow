# Phase 6: Analysis & Quality Commands - Summary

**Date:** 2025-12-20
**Phase:** 6 - Command Design - Analysis & Quality
**Status:** COMPLETE

---

## Overview

Phase 6 designed the Analysis & Quality command category - the third category in the proposed action-based command taxonomy. These commands provide comprehensive code analysis, auditing, review, testing, validation, and debugging capabilities.

**Tasks Completed:**
- 6.1 Design `/analyze` command (security, performance, quality)
- 6.2 Design `/audit` command (compliance auditing)
- 6.3 Design `/review` command (code review)
- 6.4 Design `/test` command (unit, integration, e2e)
- 6.5 Design `/validate` command (verification)
- 6.6 Design `/debug` command (debugging assistance)
- 6.7 Define artifact schemas for each

**Detailed Findings:** See individual task files in this directory.

---

## Executive Summary

Six Analysis & Quality commands were designed with a total of **48 sub-commands** producing **95 distinct artifact types**. The commands form a comprehensive quality assurance toolkit:

| Command | Purpose | Sub-Commands | Primary Artifacts |
|---------|---------|--------------|-------------------|
| `/analyze` | Static/dynamic code analysis | 7 | findings.json, metrics.json, reports |
| `/audit` | Compliance & security auditing | 8 | audit-report.md, vulnerabilities.json, SBOM |
| `/review` | Automated code review | 7 | review-comments.md, suggestions.json |
| `/test` | Test creation & execution | 10 | test-plan.md, *.test.ts, coverage |
| `/validate` | Specification verification | 8 | validation-report.md, deviations.json |
| `/debug` | Debugging assistance | 8 | debug-log.md, root-cause.md, fix-suggestion.md |

---

## Command Summary

### /analyze

**Purpose:** Comprehensive static and dynamic code analysis for security, performance, quality, dependencies, and architecture.

**Key Characteristics:**
- Context-aware analysis beyond pattern matching
- Prioritized findings with CVSS/CWE references
- Progressive depth levels (quick/standard/deep)
- Baseline comparison for trend analysis
- Model: Sonnet 4.5

**Sub-Commands:**
- `analyze:security` - OWASP Top 10, CWE patterns
- `analyze:performance` - Bottlenecks, complexity
- `analyze:quality` - Code smells, duplication, metrics
- `analyze:dependencies` - CVEs, licensing, outdated
- `analyze:architecture` - Conformance, SOLID
- `analyze:accessibility` - WCAG compliance
- `analyze:test` - Test quality, flakiness

---

### /audit

**Purpose:** Formal compliance auditing, security posture assessment, and regulatory verification.

**Key Characteristics:**
- Framework-aligned (SOC2, GDPR, HIPAA, PCI-DSS)
- Evidence-based with source references
- Risk-prioritized remediation
- SBOM generation (SPDX/CycloneDX)
- Model: Sonnet 4.5

**Sub-Commands:**
- `audit:security` - OWASP/CWE security posture
- `audit:compliance` - Regulatory frameworks
- `audit:access` - RBAC/ABAC, permissions
- `audit:secrets` - Credential detection
- `audit:licenses` - License compliance
- `audit:privacy` - PII/PHI handling
- `audit:dependencies` - Supply chain security
- `audit:infrastructure` - IaC, containers

---

### /review

**Purpose:** Automated code review for PRs, diffs, commits, and files with actionable suggestions.

**Key Characteristics:**
- GitHub/Git integration
- Structured suggestions with auto-fix support
- Standards compliance checking
- Severity classification
- Model: Sonnet 4.5

**Sub-Commands:**
- `review:pr` - Pull request review
- `review:diff` - Git diff review
- `review:file` - Deep file analysis
- `review:commit` - Commit history review
- `review:standards` - Convention compliance
- `review:security` - Security-focused review
- `review:performance` - Performance analysis

---

### /test

**Purpose:** Test creation, planning, coverage analysis, and execution across testing paradigms.

**Key Characteristics:**
- Multi-framework support (Jest, Vitest, Playwright, Cypress)
- Intelligent test generation from specs
- Coverage gap identification
- TDD/BDD workflow support
- Model: Sonnet 4.5

**Sub-Commands:**
- `test:unit` - Unit test generation
- `test:integration` - Integration tests
- `test:e2e` - End-to-end tests
- `test:plan` - Test plan creation
- `test:coverage` - Coverage analysis
- `test:run` - Test execution
- `test:fixture` - Fixture generation
- `test:snapshot` - Snapshot tests
- `test:contract` - Contract tests
- `test:mutation` - Mutation testing

---

### /validate

**Purpose:** Systematic validation of implementations against specifications, schemas, and requirements.

**Key Characteristics:**
- Traceability matrix generation
- Schema validation (JSON Schema, OpenAPI, GraphQL)
- Breaking change detection
- Quality gate enforcement
- Model: Sonnet/Opus 4.5

**Sub-Commands:**
- `validate:spec` - Specification validation
- `validate:schema` - Schema validation
- `validate:requirements` - Requirements traceability
- `validate:contracts` - API contract validation
- `validate:types` - Type safety validation
- `validate:build` - Build validation
- `validate:accessibility` - WCAG validation
- `validate:security` - Security validation

---

### /debug

**Purpose:** Systematic debugging assistance with hypothesis-driven investigation.

**Key Characteristics:**
- Hypothesis-driven approach
- Interactive debugging support
- Documented investigation logs
- Cross-domain debugging (error, performance, memory, etc.)
- Model: Sonnet/Opus 4.5

**Sub-Commands:**
- `debug:error` - Error/exception analysis
- `debug:performance` - Performance debugging
- `debug:behavior` - Unexpected behavior investigation
- `debug:test` - Test failure debugging
- `debug:memory` - Memory leak debugging
- `debug:network` - Network/API debugging
- `debug:concurrency` - Race condition debugging
- `debug:data` - Data corruption debugging

---

## Design Patterns Identified

### 1. Model Selection Strategy

| Task Complexity | Model | Use Cases |
|-----------------|-------|-----------|
| Standard analysis | Sonnet 4.5 | Most analysis, review, test tasks |
| Complex reasoning | Opus 4.5 | Memory analysis, concurrency, contracts |

### 2. Tool Access Patterns

| Pattern | Commands | Tools |
|---------|----------|-------|
| Read-Only | analyze, review:* | Read, Grep, Glob |
| Write-Enabled | test:*, validate:* | + Write |
| Bash-Enabled | audit:*, test:run | + Bash |
| Interactive | debug:* | + AskUserQuestion |

### 3. Artifact Patterns

| Pattern | Count | Purpose |
|---------|-------|---------|
| Report (Markdown) | 64 | Human-readable analysis |
| Data (JSON) | 31 | Machine-readable, automation |
| Checklists | 8 | Verification tracking |
| Code (*.test.ts) | Variable | Generated tests |

### 4. Severity Classification

Standard severity levels across all commands:
- **Critical:** Immediate action required
- **High:** Address in current sprint
- **Medium:** Plan for next sprint
- **Low:** Backlog items
- **Info:** Suggestions only

---

## Workflow Integration

### Command Flow Patterns

```
Design Phase (Phase 5):
/spec -> specifications
/design -> design-spec.md

        ↓

Analysis & Quality Phase (Phase 6):
/analyze:security -> security findings
/audit:compliance -> compliance status
/review:pr -> review comments
/validate:spec -> deviations
/test:plan -> test matrix

        ↓

Implementation Phase (Phase 7):
/implement -> code files
/debug:error -> root-cause + fix

        ↓

Iteration Loop:
/validate -> issues -> /debug -> fixes -> /validate
```

### Cross-Command Artifact Flow

| Artifact | Produced By | Consumed By |
|----------|-------------|-------------|
| findings.json | /analyze:* | /fix, /plan:create |
| vulnerabilities.json | /audit:security | /remediation, /review |
| suggestions.json | /review:* | /implement, /fix |
| coverage-gaps.json | /test:coverage | /test:unit, /test:integration |
| deviations.json | /validate:spec | /fix, /implement |
| root-cause.md | /debug:* | /fix, /implement |

---

## Implementation Recommendations

### Priority Order

**P0 - Implement First (16 sub-commands):**
- `/analyze:security`, `/analyze:quality`, `/analyze:dependencies`
- `/audit:security`, `/audit:secrets`
- `/review:pr`, `/review:diff`
- `/test:unit`, `/test:integration`, `/test:coverage`, `/test:run`
- `/validate:spec`, `/validate:schema`, `/validate:build`
- `/debug:error`, `/debug:test`

**P1 - Implement Second (20 sub-commands):**
- `/analyze:performance`, `/analyze:architecture`
- `/audit:compliance`, `/audit:licenses`, `/audit:dependencies`
- `/review:file`, `/review:standards`, `/review:security`
- `/test:e2e`, `/test:plan`, `/test:fixture`
- `/validate:requirements`, `/validate:contracts`, `/validate:types`
- `/debug:performance`, `/debug:behavior`, `/debug:network`

**P2 - Implement Third (12 sub-commands):**
- `/analyze:accessibility`, `/analyze:test`
- `/audit:access`, `/audit:privacy`, `/audit:infrastructure`
- `/review:commit`, `/review:performance`
- `/test:snapshot`, `/test:contract`, `/test:mutation`
- `/validate:accessibility`, `/validate:security`
- `/debug:memory`, `/debug:concurrency`, `/debug:data`

### Directory Structure

```
.claude/commands/
├── analyze/
│   ├── analyze.md
│   ├── security.md
│   ├── performance.md
│   ├── quality.md
│   ├── dependencies.md
│   ├── architecture.md
│   ├── accessibility.md
│   └── test.md
├── audit/
│   ├── audit.md
│   ├── security.md
│   ├── compliance.md
│   ├── access.md
│   ├── secrets.md
│   ├── licenses.md
│   ├── privacy.md
│   ├── dependencies.md
│   └── infrastructure.md
├── review/
│   ├── review.md
│   ├── pr.md
│   ├── diff.md
│   ├── file.md
│   ├── commit.md
│   ├── standards.md
│   ├── security.md
│   └── performance.md
├── test/
│   ├── test.md
│   ├── unit.md
│   ├── integration.md
│   ├── e2e.md
│   ├── plan.md
│   ├── coverage.md
│   ├── run.md
│   ├── fixture.md
│   ├── snapshot.md
│   ├── contract.md
│   └── mutation.md
├── validate/
│   ├── validate.md
│   ├── spec.md
│   ├── schema.md
│   ├── requirements.md
│   ├── contracts.md
│   ├── types.md
│   ├── build.md
│   ├── accessibility.md
│   └── security.md
└── debug/
    ├── debug.md
    ├── error.md
    ├── performance.md
    ├── behavior.md
    ├── test.md
    ├── memory.md
    ├── network.md
    ├── concurrency.md
    └── data.md
```

---

## Verification Checklist

- [x] All 6 primary commands designed with YAML frontmatter
- [x] 48 sub-commands defined with purpose and outputs
- [x] 95 artifact types specified (31 JSON, 64 Markdown)
- [x] Model selection rationale documented
- [x] Tool access patterns established
- [x] Workflow integration patterns identified
- [x] Implementation priority defined (P0/P1/P2)
- [x] Directory structure specified
- [x] JSON schemas defined for machine-readable artifacts
- [x] Severity classification standardized

---

## Statistics

| Metric | Count |
|--------|-------|
| Primary Commands | 6 |
| Sub-Commands | 48 |
| Unique Artifacts | 95 |
| JSON Schemas | 31 |
| Markdown Reports | 64 |
| P0 Priority Items | 16 |
| P1 Priority Items | 20 |
| P2 Priority Items | 12 |

---

## Comparison with Previous Phases

| Aspect | Phase 4 (Discovery) | Phase 5 (Design) | Phase 6 (Analysis) |
|--------|---------------------|------------------|--------------------|
| Focus | Understanding | Specifications | Quality assurance |
| Primary Output | Ideas, maps | Schemas, specs | Reports, findings |
| Commands | 4 | 4 | 6 |
| Sub-Commands | 21 | 24 | 48 |
| Model Mix | Haiku/Sonnet/Opus | Sonnet only | Sonnet + Opus |
| Interaction | High (clarify) | Medium | Low (automated) |
| Write Access | Limited | All commands | Selective |

---

## Findings Cross-References

| Task | Document | Key Topics |
|------|----------|------------|
| 6.1 | [6-1-analyze-command.md](6-1-analyze-command.md) | Security, performance, quality analysis |
| 6.2 | [6-2-audit-command.md](6-2-audit-command.md) | Compliance, security posture, licenses |
| 6.3 | [6-3-review-command.md](6-3-review-command.md) | PR review, diff analysis, standards |
| 6.4 | [6-4-test-command.md](6-4-test-command.md) | Test generation, coverage, execution |
| 6.5 | [6-5-validate-command.md](6-5-validate-command.md) | Spec validation, traceability, contracts |
| 6.6 | [6-6-debug-command.md](6-6-debug-command.md) | Error analysis, performance, debugging |
| 6.7 | [6-7-artifact-schemas.md](6-7-artifact-schemas.md) | JSON schemas, artifact patterns |

---

## Next Steps

Phase 7 (Command Design - Implementation & Documentation) should design:
- `/implement` - Code generation from specs
- `/refactor` - Code refactoring
- `/fix` - Bug fixing
- `/document` - Documentation generation
- `/explain` - Code explanation

These commands will:
1. Consume artifacts from Phase 6 (findings, suggestions, fixes)
2. Generate implementation from designs
3. Apply fixes from debugging sessions
4. Create documentation from code

---

**Phase 6 Status: COMPLETE**
