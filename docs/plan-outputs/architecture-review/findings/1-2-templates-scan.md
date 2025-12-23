# Template Categorization Analysis

**Analysis Date:** 2025-12-20
**Directory Analyzed:** `docs/plan-templates/`
**Total Templates Found:** 6

## Executive Summary

The plan template system provides structured workflows for common development tasks. Templates are organized into five operational categories plus one meta-template, using a consistent phase-based structure with checkboxes, verification steps, and success criteria.

## Template Categories

### 1. Meta-Templates

#### TEMPLATE.md
- **Category:** Documentation/Reference
- **Purpose:** Format specification and usage guide for all plan templates
- **Use Case:** Reference for creating new templates

**Key Sections:**
- Template variable syntax and common variables
- Standard template structure format
- Checkbox and status indicator conventions
- Severity levels for analysis findings

---

### 2. Analysis & Investigation

#### analysis.md
- **Category:** Analysis
- **Purpose:** Systematic code/system analysis workflow
- **Use Case:** Security reviews, performance analysis, architecture reviews

**Key Sections:**
1. Phase 1: Discovery - Scan and understand structure
2. Phase 2: Deep Analysis - Component-level analysis
3. Phase 3: Synthesis - Prioritization and solutions
4. Phase 4: Verification - Accuracy review

**Required Inputs:**
- `{{analysis_name}}`, `{{target_path}}`, `{{focus_area}}`, `{{analysis_type}}`

---

### 3. Quality Assurance

#### validation.md
- **Category:** Validation/QA
- **Purpose:** Systematic verification workflow
- **Use Case:** Pre-deployment checks, post-refactor validation

**Key Sections:**
1. Pre-Validation Checklist
2. Phase 1: Static Validation
3. Phase 2: Behavioral Validation
4. Phase 3: Integration Validation
5. Phase 4: Sign-off

**Required Inputs:**
- `{{validation_name}}`, `{{target_path}}`, `{{validation_type}}`

---

### 4. Testing & Coverage

#### test-creation.md
- **Category:** Testing
- **Purpose:** Structured test development workflow
- **Use Case:** Improving test coverage, creating test suites

**Key Sections:**
1. Phase 1: Coverage Analysis
2. Phase 2: Test Design
3. Phase 3: Implementation
4. Phase 4: Validation

**Required Inputs:**
- `{{test_name}}`, `{{target_path}}`, `{{test_type}}`, `{{test_framework}}`

---

### 5. Documentation

#### documentation.md
- **Category:** Documentation
- **Purpose:** Structured documentation creation workflow
- **Use Case:** API docs, architecture docs, user guides

**Key Sections:**
1. Phase 1: Discovery
2. Phase 2: Information Gathering
3. Phase 3: Writing
4. Phase 4: Review & Polish

**Required Inputs:**
- `{{doc_name}}`, `{{target_path}}`, `{{doc_type}}`

---

### 6. Planning & Meta-Work

#### create-plan.md
- **Category:** Planning/Meta
- **Purpose:** Structured workflow for creating new custom plans
- **Use Case:** Unique objectives not covered by existing templates

**Key Sections:**
1. Phase 1: Requirements Gathering
2. Phase 2: Research & Analysis
3. Phase 3: Plan Design
4. Phase 4: Plan Writing
5. Phase 5: Plan Review

**Required Inputs:**
- `{{plan_name}}`, `{{objective}}`, `{{scope}}`

---

## Common Template Patterns

### Structural Elements
- Overview section with key metadata
- Phase-based structure (3-5 phases)
- Checkbox tasks for actionable items
- Verification checkpoints (`**VERIFY N**`)
- Success criteria section

### Variable System
- Common: `{{date}}`, `{{target_path}}`, `{{plan_filename}}`
- Template-specific custom variables
- Substitution syntax: `{{variable_name}}`

### Output Organization
All templates write to:
```
docs/plan-outputs/{{plan_filename}}/findings/
```

---

## Template Selection Guide

| Need | Template | Best For |
|------|----------|----------|
| Code review/audit | analysis.md | Finding issues, security/performance |
| Pre-deploy checks | validation.md | Readiness, regression prevention |
| Adding tests | test-creation.md | Coverage improvement |
| Writing docs | documentation.md | API reference, guides |
| Custom workflow | create-plan.md | Unique objectives |

---

## Potential Template Gaps

Consider templates for:
- **Implementation/Development** - Feature development workflow
- **Refactoring** - Code improvement workflow
- **Debugging** - Bug investigation and resolution
- **Performance Optimization** - Specific performance workflow
- **Migration** - Data/code migration workflow
