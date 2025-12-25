# /refactor Command Design Specification

**Task:** 7.2 Design `/refactor` command (code refactoring)
**Category:** Implementation & Code Improvement
**Priority:** HIGH
**Date:** 2025-12-20

---

## Executive Summary

The `/refactor` command family provides intelligent code refactoring capabilities guided by analysis insights, code smells, and architectural improvements. It bridges analysis and implementation by proposing and executing safe, systematic code transformations.

**Core Philosophy:**
- **Safety-first:** Always analyze impact before changes
- **Incremental transformations:** Small, testable steps
- **Evidence-based:** Driven by analysis findings
- **Preservation:** Maintain behavior, improve structure
- **Automated testing:** Verify refactorings don't break functionality

**Key Differentiators:**
- `/analyze` identifies problems → `/refactor` fixes them
- `/design` creates new components → `/refactor` restructures existing ones
- `/fix` corrects bugs → `/refactor` improves structure without changing behavior

---

## Sub-Command Specifications

| Sub-command | Purpose | Priority |
|-------------|---------|----------|
| `refactor:extract` | Extract methods/components/modules from large code units | P0 |
| `refactor:rename` | Safe renaming across codebase | P0 |
| `refactor:simplify` | Reduce complexity, improve readability | P0 |
| `refactor:patterns` | Apply design patterns (Strategy, Factory, etc.) | P1 |
| `refactor:modernize` | Update to modern syntax/standards | P1 |
| `refactor:organize` | File/module organization | P1 |
| `refactor:types` | Add/improve type safety | P1 |
| `refactor:performance` | Performance refactoring | P2 |
| `refactor:security` | Security hardening refactoring | P1 |
| `refactor:test` | Improve test structure | P2 |

---

## YAML Frontmatter Specification

### Primary Command: `.claude/commands/refactor.md`

```yaml
---
name: refactor
description: Intelligent code refactoring with safety analysis, impact assessment, and automated verification. Bridges analysis findings to code improvements.
model: sonnet
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
argument-hint: [file-or-pattern]
category: implementation
output_artifacts:
  - refactoring-plan.md
  - impact-analysis.json
  - refactored-code.md
  - refactoring-log.md
---
```

---

## Model Configuration

| Sub-command | Model | Rationale |
|-------------|-------|-----------|
| `refactor:extract` | Sonnet 4.5 | Balance of speed and accuracy |
| `refactor:rename` | Sonnet 4.5 | Fast, precise for scope analysis |
| `refactor:simplify` | Sonnet 4.5 | Good at code transformation |
| `refactor:patterns` | **Opus 4.5** | Complex architectural reasoning |
| `refactor:security` | **Opus 4.5** | Critical security reasoning |

**Temperature:** 0.0 (deterministic output for safe refactoring)

---

## Output Artifacts

### refactoring-plan.md

```markdown
---
artifact-type: refactoring-plan
command: refactor:[subcommand]
target: [file/module/function]
timestamp: [ISO-8601]
status: pending
---

# Refactoring Plan: [Name]

## Overview
**Type:** [Extract Method | Simplify | Rename | etc.]
**Target:** `[file/module path]`
**Risk Level:** [Low | Medium | High]

## Current State Analysis
- Cyclomatic Complexity: X
- Lines of Code: Y
- Nesting Depth: Z

## Refactoring Strategy
### Steps
1. **[Step 1 name]** - [Action, files affected, risk]
2. **[Step 2 name]** - [Action, files affected, risk]

## Expected Outcome
- Complexity: X → Y (improvement: Z%)
- Test Coverage: E% → F%

## Rollback Plan
[Steps to revert if issues arise]
```

### impact-analysis.json

```json
{
  "metadata": {
    "refactoring_type": "extract-method",
    "target": "src/services/user-service.ts",
    "timestamp": "ISO-8601"
  },
  "scope": {
    "files_affected": 8,
    "lines_changed": 234,
    "tests_affected": 12
  },
  "risk_assessment": {
    "overall_risk": "medium",
    "factors": [...]
  },
  "metrics": {
    "before": { "cyclomatic_complexity": 15 },
    "after": { "cyclomatic_complexity": 8 },
    "improvement": { "complexity_reduction": "47%" }
  }
}
```

---

## Workflow Integration

### Upstream Commands (Inputs)

| Artifact | Source Command | Usage |
|----------|----------------|-------|
| `quality-report.md` | `/analyze:quality` | Identifies code smells to refactor |
| `performance-report.md` | `/analyze:performance` | Performance bottlenecks |
| `security-report.md` | `/analyze:security` | Security issues |
| `review-comments.md` | `/review` | Review feedback to address |

### Downstream Commands (Outputs)

| Artifact | Consumed By | Purpose |
|----------|-------------|---------|
| `refactoring-plan.md` | Human review, `/implement` | Execution plan |
| `refactored-code.md` | `/review`, `/document` | Code changes documentation |
| `refactoring-log.md` | Audit trail | Change history |

---

## Safety Protocols

### Pre-Refactoring Checklist
- [ ] Analyze code thoroughly before changes
- [ ] Generate detailed refactoring plan
- [ ] Identify all affected files and dependencies
- [ ] Verify test coverage exists (≥70% recommended)
- [ ] Create baseline test run
- [ ] Document rollback procedure

### During Refactoring
- [ ] Make incremental changes
- [ ] Run tests after each significant change
- [ ] Maintain behavior equivalence

### Post-Refactoring Validation
- [ ] All tests pass
- [ ] No new linter errors
- [ ] Type checking passes
- [ ] Code metrics improved

---

## Example Usage Scenarios

### Example 1: Extract Method

```
User: /refactor:extract src/services/user-service.ts --function=processUserRegistration

Claude: Analyzing for extraction opportunities...

Found: Cyclomatic complexity of 18 (threshold: 10)
Identified 3 extraction candidates:
1. Email validation logic (lines 42-58)
2. Password hashing (lines 60-67)
3. Database transaction (lines 70-95)

Plan: Extract 3 methods: validateEmail, hashPassword, saveUserTransaction
Risk: LOW (high test coverage)

Proceed? yes

✅ Extracted 3 methods
✅ All tests passing (45/45)
Complexity reduced: 18 → 6 (67% improvement)
```

### Example 2: Apply Repository Pattern

```
User: /refactor:patterns src/database/ --pattern=Repository

Claude: Analyzing for Repository pattern application...

Current structure:
- Direct database queries scattered across service layer
- No clear data access abstraction

Repository pattern will:
1. Create repository interfaces
2. Implement concrete repositories
3. Update services to use repositories
4. Enable dependency injection

Affected files: 12 services, 8 models
Risk: MEDIUM

Review plan?
```

---

## Differentiation from Related Commands

### vs `/implement`
- **Refactor:** Restructures existing code, preserves behavior
- **Implement:** Creates new code from specifications

### vs `/fix`
- **Refactor:** Improves structure, no behavior change
- **Fix:** Corrects bugs, changes behavior

### vs `/analyze:quality`
- **Analyze:** Identifies problems (what's wrong)
- **Refactor:** Solves problems (how to fix)

---

**Phase 7 Task 7.2 Status: COMPLETE**
