# Phase 7 Verification: Implementation & Documentation Commands

**Phase:** 7 - Command Design - Implementation & Documentation
**Status:** ✅ COMPLETE
**Date:** 2025-12-20

---

## Phase Overview

Phase 7 designed the Implementation & Documentation command family, covering the core commands that generate code, fix issues, and create documentation.

---

## Tasks Completed

| Task ID | Description | Status | Findings |
|---------|-------------|--------|----------|
| 7.1 | Design `/implement` command | ✅ Complete | 7-1-implement-command.md |
| 7.2 | Design `/refactor` command | ✅ Complete | 7-2-refactor-command.md |
| 7.3 | Design `/fix` command | ✅ Complete | 7-3-fix-command.md |
| 7.4 | Design `/document` command and sub-commands | ✅ Complete | 7-4-document-command.md |
| 7.5 | Design `/explain` command | ✅ Complete | 7-5-explain-command.md |
| 7.6 | Define artifact schemas for each | ✅ Complete | 7-6-artifact-schemas.md |
| 7.7 | **VERIFY 7**: Implementation commands designed | ✅ Complete | This document |

---

## Commands Designed

### 1. `/implement` Command
**Purpose:** Generate production-ready code from specifications

**Sub-commands (8):**
- `implement:feature` - Complete feature implementation
- `implement:component` - Component implementation
- `implement:api` - API from OpenAPI spec
- `implement:schema` - Types from JSON Schema
- `implement:graphql` - GraphQL resolvers from SDL
- `implement:events` - Event handlers from AsyncAPI
- `implement:data` - Data layer from models
- `implement:ui` - UI components from spec

**Key Artifacts:**
- `implementation-notes.md`
- `generated-code-manifest.json`

---

### 2. `/refactor` Command
**Purpose:** Safe, systematic code restructuring

**Sub-commands (10):**
- `refactor:extract` - Extract methods/components/modules
- `refactor:rename` - Safe renaming across codebase
- `refactor:simplify` - Reduce complexity
- `refactor:patterns` - Apply design patterns
- `refactor:modernize` - Update to modern syntax
- `refactor:organize` - File/module organization
- `refactor:types` - Add/improve type safety
- `refactor:performance` - Performance refactoring
- `refactor:security` - Security hardening
- `refactor:test` - Improve test structure

**Key Artifacts:**
- `refactoring-plan.md`
- `impact-analysis.json`
- `refactoring-log.md`

---

### 3. `/fix` Command
**Purpose:** Systematic bug fixing with regression tests

**Sub-commands (8):**
- `fix:bug` - Runtime bug fixes
- `fix:type-error` - Type safety fixes
- `fix:security` - Security vulnerability remediation
- `fix:performance` - Performance issue fixes
- `fix:test` - Test failure fixes
- `fix:lint` - Linting/style fixes
- `fix:dependency` - Dependency issues
- `fix:data` - Data validation fixes

**Key Artifacts:**
- `fix-report.md`
- `regression-test.ts`
- `fix-notes.md`

---

### 4. `/document` Command
**Purpose:** Comprehensive documentation generation

**Sub-commands (8):**
- `document:api` - API reference documentation
- `document:user` - End-user guides and tutorials
- `document:developer` - README, CONTRIBUTING, setup guides
- `document:architecture` - Architecture docs and ADRs
- `document:changelog` - CHANGELOG from git history
- `document:inline` - Inline code comments/docstrings
- `document:diagrams` - Visual documentation (Mermaid)
- `document:runbook` - Operational runbooks

**Key Artifacts:**
- `README.md`
- `api-reference.md`
- `user-guide.md`
- `CHANGELOG.md`

---

### 5. `/explain` Command
**Purpose:** Code and concept explanation for knowledge transfer

**Sub-commands (7):**
- `explain:code` - Explain code files, functions, classes
- `explain:architecture` - Explain system architecture
- `explain:pattern` - Identify and explain patterns
- `explain:decision` - Explain architectural decisions
- `explain:flow` - Explain execution and data flow
- `explain:api` - Explain API design
- `explain:diff` - Explain changes in PR context

**Key Artifacts:**
- `code-explanation.md`
- `architecture-explanation.md`
- `pattern-explanation.md`
- `decision-explanation.md`
- `flow-explanation.md`

---

## Statistics

| Metric | Count |
|--------|-------|
| Commands Designed | 5 |
| Total Sub-commands | 41 |
| Artifact Schemas | 14 |
| Findings Documents | 7 |

### Sub-command Breakdown by Command

| Command | Sub-commands | Priority P0 | Priority P1 | Priority P2 |
|---------|--------------|-------------|-------------|-------------|
| `/implement` | 8 | 3 | 4 | 1 |
| `/refactor` | 10 | 3 | 5 | 2 |
| `/fix` | 8 | 3 | 3 | 2 |
| `/document` | 8 | 3 | 3 | 2 |
| `/explain` | 7 | 2 | 3 | 2 |
| **Total** | **41** | **14** | **18** | **9** |

---

## Model Configuration Summary

| Command | Default Model | Special Cases |
|---------|---------------|---------------|
| `/implement` | Sonnet 4.5 | - |
| `/refactor` | Sonnet 4.5 | Opus for patterns, security |
| `/fix` | Sonnet 4.5 | Opus for security, Haiku for lint |
| `/document` | Sonnet 4.5 | - |
| `/explain` | Sonnet 4.5 | Opus for complex architecture |

---

## Workflow Integration

### Upstream → Implementation Commands

```
/clarify → /design → /implement → /test → /validate
                   ↘
/analyze → /refactor → /validate
         ↘
/debug → /fix → /test → /validate
```

### Implementation Commands → Downstream

```
/implement → /document → /release
          ↘ /test
          ↘ /review

/refactor → /validate
         ↘ /test

/fix → /test
    ↘ /validate
    ↘ /document:changelog
```

---

## Key Design Decisions

### 1. Clear Command Boundaries

| If you want to... | Use... | Not... |
|-------------------|--------|--------|
| Create new code from spec | `/implement` | `/refactor` |
| Improve existing code structure | `/refactor` | `/fix` |
| Correct a bug | `/fix` | `/refactor` |
| Create reference docs | `/document` | `/explain` |
| Understand existing code | `/explain` | `/document` |

### 2. Safety-First Approach

All commands that modify code include:
- Pre-execution analysis
- Impact assessment
- Rollback plans
- Verification steps
- Regression tests (for `/fix`)

### 3. Artifact Consistency

All artifacts follow consistent patterns:
- YAML frontmatter with metadata
- Structured markdown sections
- Machine-readable JSON for tooling
- Timestamp and versioning

---

## Verification Checklist

- [x] All 5 primary commands designed
- [x] 41 sub-commands specified
- [x] YAML frontmatter for each command
- [x] Model configuration documented
- [x] Input/output artifacts defined
- [x] Workflow integration mapped
- [x] Example usage scenarios provided
- [x] Differentiation from related commands clear
- [x] Quality gates specified
- [x] Artifact schemas documented (14 schemas)

---

## Files Generated

```
docs/plan-outputs/architecture-review/findings/
├── 7-1-implement-command.md    # /implement design
├── 7-2-refactor-command.md     # /refactor design
├── 7-3-fix-command.md          # /fix design
├── 7-4-document-command.md     # /document design
├── 7-5-explain-command.md      # /explain design
├── 7-6-artifact-schemas.md     # All artifact schemas
└── 07-impl-commands.md         # This verification document
```

---

## Next Phase

**Phase 8: Command Design - Operations & Meta** will cover:
- `/deploy` - Deployment workflows
- `/migrate` - Migration tasks
- `/release` - Release management
- `/plan` - Plan management (keep existing)
- `/workflow` - Workflow orchestration
- `/template` - Template management

---

**Phase 7 Status: ✅ COMPLETE**
**Verified:** 2025-12-20
