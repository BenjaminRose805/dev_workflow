# Task 2.2: Missing Commands - Detailed Gap Analysis

**Analysis Date:** 2025-12-20
**Basis:** Proposed taxonomy vs. current 11 commands in `plan:*` namespace

---

## Executive Summary

The current system has **11 commands** concentrated in plan management (87% coverage in Meta category). The proposed taxonomy includes **34 commands** across 8 categories. This analysis documents **27 missing commands** with detailed implementation requirements.

**Coverage Overview:**
- **Fully Covered:** 6.75 commands (20%)
- **Partially Covered:** 4 commands (templates exist but no dedicated commands)
- **Missing:** 23.25 commands (68%)

---

## Category 1: Discovery & Ideation (0% Coverage)

### /clarify - Interactive Requirements Gathering
- **Priority:** CRITICAL
- **Capability:** Socratic questioning to refine requirements
- **Use Cases:** Project scoping, feature definition
- **Complexity:** Medium-High (custom agent with questioning patterns)

### /explore - Codebase Exploration
- **Priority:** CRITICAL
- **Capability:** Automated codebase scanning and mapping
- **Use Cases:** Onboarding, legacy code investigation, pre-refactoring
- **Complexity:** High (multi-language parsing, dependency graphs)

### /research - Technology Research
- **Priority:** HIGH
- **Capability:** Technology comparison and evaluation
- **Use Cases:** Library selection, architecture decisions
- **Complexity:** Medium (web search integration)

### /brainstorm - Idea Generation
- **Priority:** MEDIUM
- **Capability:** Creative alternative generation
- **Use Cases:** Feature ideation, problem-solving
- **Complexity:** Medium-Low

---

## Category 2: Design & Architecture (0% Coverage)

### /architect - System Architecture
- **Priority:** CRITICAL
- **Capability:** High-level system design, ADRs
- **Use Cases:** New project, major refactoring
- **Complexity:** High (diagram generation, pattern library)

### /design - Component Design
- **Priority:** HIGH
- **Capability:** Detailed component and API design
- **Use Cases:** Feature design, interface contracts
- **Complexity:** Medium-High

### /spec - Formal Specifications
- **Priority:** HIGH
- **Capability:** OpenAPI, GraphQL schema generation
- **Use Cases:** API-first development
- **Complexity:** Medium

### /model - Data Modeling
- **Priority:** MEDIUM-HIGH
- **Capability:** ER design, schema generation
- **Use Cases:** Database design, migrations
- **Complexity:** Medium-High

---

## Category 3: Analysis (10% Coverage)

### /analyze - Multi-Purpose Analysis
- **Priority:** CRITICAL
- **Sub-commands:** security, performance, quality, architecture
- **Use Cases:** Pre-deployment checks, technical debt
- **Template:** `analysis.md` exists but no command
- **Complexity:** High (static analysis tools)

### /audit - Compliance Auditing
- **Priority:** HIGH
- **Capability:** License, security, accessibility compliance
- **Complexity:** High (compliance frameworks)

### /review - Code Review
- **Priority:** HIGH
- **Capability:** Automated review comments
- **Complexity:** Medium-High

---

## Category 4: Implementation (20% Coverage)

### /refactor - Code Refactoring
- **Priority:** CRITICAL
- **Capability:** Safe code restructuring
- **Use Cases:** Technical debt, pattern migration
- **Complexity:** High (AST manipulation)

### /fix - Bug Fixing
- **Priority:** CRITICAL
- **Capability:** Root cause analysis, fix implementation
- **Use Cases:** Bug reports, production hotfixes
- **Complexity:** Medium-High

### /optimize - Performance Optimization
- **Priority:** MEDIUM-HIGH
- **Capability:** Algorithm and query optimization
- **Complexity:** High

### /scaffold - Boilerplate Generation
- **Priority:** MEDIUM
- **Capability:** Project/component scaffolding
- **Complexity:** Medium

---

## Category 5: Quality & Testing (25% Coverage)

### /test - Test Creation & Execution
- **Priority:** CRITICAL
- **Sub-commands:** unit, integration, e2e, run
- **Template:** `test-creation.md` exists but no command
- **Complexity:** High (framework integration)

### /validate - Code/Feature Validation
- **Priority:** CRITICAL (different from plan:verify)
- **Capability:** Pre-deployment checks, feature acceptance
- **Template:** `validation.md` exists but no command
- **Complexity:** Medium

### /debug - Debugging Assistance
- **Priority:** HIGH
- **Capability:** Stack trace analysis, root cause hypothesis
- **Complexity:** High

### /coverage - Coverage Analysis
- **Priority:** MEDIUM
- **Capability:** Coverage gaps, trend tracking
- **Complexity:** Medium

---

## Category 6: Documentation (12.5% Coverage)

### /document - Documentation Generation
- **Priority:** HIGH
- **Sub-commands:** api, user, developer, architecture
- **Template:** `documentation.md` exists but no command
- **Complexity:** Medium-High

### /explain - Code Explanation (different from plan:explain)
- **Priority:** HIGH
- **Capability:** Code/algorithm explanation
- **Complexity:** Medium

### /diagram - Diagram Generation
- **Priority:** MEDIUM-HIGH
- **Capability:** Mermaid/PlantUML generation
- **Complexity:** Medium

### /changelog - Changelog Generation
- **Priority:** MEDIUM
- **Capability:** Conventional commit parsing
- **Complexity:** Medium-Low

---

## Category 7: Operations (6% Coverage)

### /deploy - Deployment Workflows
- **Priority:** HIGH
- **Capability:** Deployment automation, rollback
- **Complexity:** High (platform-specific)

### /migrate - Application Migrations
- **Priority:** HIGH (different from plan:migrate)
- **Capability:** Database, API version migrations
- **Complexity:** High

### /release - Release Management
- **Priority:** MEDIUM-HIGH
- **Capability:** Version bumping, release notes
- **Complexity:** Medium

### /ci - CI/CD Configuration
- **Priority:** MEDIUM
- **Capability:** Pipeline generation
- **Complexity:** Medium-High

---

## Priority Summary

| Priority | Count | Commands |
|----------|-------|----------|
| CRITICAL | 11 | /clarify, /explore, /architect, /refactor, /fix, /analyze, /test, /validate |
| HIGH | 10 | /research, /design, /spec, /audit, /review, /debug, /document, /explain, /deploy, /migrate |
| MEDIUM | 6 | /brainstorm, /model, /optimize, /diagram, /release, /template CRUD |

---

## Implementation Phases

### Phase 1: Foundation (Critical)
/clarify, /explore, /test, /validate

### Phase 2: Development Core (High Value)
/refactor, /fix, /analyze, /review

### Phase 3: Design & Architecture
/architect, /design, /research, /spec

### Phase 4: Documentation
/document, /explain, /diagram

### Phase 5: Operations
/deploy, /migrate, /release
