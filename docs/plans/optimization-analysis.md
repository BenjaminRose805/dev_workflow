# Analysis Plan: Code Optimization

## Overview

- **Objective:** Identify DRY violations, over-complexity, missing tests, and performance issues
- **Type:** Analysis → Generates `optimization-implementation.md` plan
- **Created:** 2025-12-27
- **Output:** `docs/plan-outputs/optimization-analysis/`

> **Scope Boundary:** This plan focuses ONLY on improving EXISTING code quality. It does not cover:
> - Removing unused code (see: cleanup-analysis)
> - Fixing bugs (see: fix-issues-analysis)
> - Adding new features (see: missing-features-analysis)

---

## Phase 1: DRY Violations

**Objective:** Find duplicated code that should be consolidated.

- [ ] 1.1 Identify duplicated code blocks
  - Scan for similar code patterns across files (>10 lines repeated)
  - Find copy-pasted functions with minor variations
  - Identify repeated logic that could be extracted to utilities
  - Document in finding: `findings/1-1-duplicated-code.md`

- [ ] 1.2 Identify duplicated constants and configuration
  - Find magic numbers/strings repeated across files
  - Check for duplicated regex patterns
  - Find repeated file paths or URLs
  - Document in finding: `findings/1-2-duplicated-constants.md`

- [ ] 1.3 Identify duplicated data structures
  - Find similar dataclasses/models that could be unified
  - Check for repeated type definitions
  - Find similar error handling patterns
  - Document in finding: `findings/1-3-duplicated-structures.md`

**VERIFY 1:** All DRY violations documented with consolidation recommendations

---

## Phase 2: Over-Complexity

**Objective:** Find code that is unnecessarily complex.

- [ ] 2.1 Identify overly complex functions
  - Find functions >50 lines that should be split
  - Find functions with >5 parameters
  - Find deeply nested code (>4 levels)
  - Calculate cyclomatic complexity where possible
  - Document in finding: `findings/2-1-complex-functions.md`

- [ ] 2.2 Identify overly complex classes
  - Find classes with >10 methods (god classes)
  - Find classes mixing multiple responsibilities
  - Check for overly deep inheritance hierarchies
  - Document in finding: `findings/2-2-complex-classes.md`

- [ ] 2.3 Identify over-engineered abstractions
  - Find abstractions used only once
  - Find unnecessary wrapper classes
  - Check for premature optimization patterns
  - Document in finding: `findings/2-3-over-engineering.md`

**VERIFY 2:** Complexity issues documented with simplification strategies

---

## Phase 3: Missing Tests

**Objective:** Find code lacking test coverage.

- [ ] 3.1 Identify untested modules
  - List all Python modules without corresponding test files
  - List all JavaScript files without test coverage
  - Check for critical paths with no tests
  - Document in finding: `findings/3-1-untested-modules.md`

- [ ] 3.2 Identify untested functions and branches
  - Find public functions with no test calls
  - Identify error handling paths never tested
  - Find edge cases not covered by existing tests
  - Document in finding: `findings/3-2-untested-functions.md`

- [ ] 3.3 Assess test quality
  - Find tests with no assertions
  - Find tests that don't test edge cases
  - Check for flaky or slow tests
  - Document in finding: `findings/3-3-test-quality.md`

**VERIFY 3:** Test coverage gaps documented with priority recommendations

---

## Phase 4: Performance Issues

**Objective:** Find code with performance problems.

- [ ] 4.1 Identify inefficient algorithms
  - Find O(n²) or worse loops that could be optimized
  - Check for repeated expensive operations in loops
  - Find synchronous operations that should be async
  - Document in finding: `findings/4-1-inefficient-algorithms.md`

- [ ] 4.2 Identify resource inefficiencies
  - Find file handles or connections not properly closed
  - Check for memory leaks (large objects held unnecessarily)
  - Find repeated I/O that could be cached
  - Document in finding: `findings/4-2-resource-issues.md`

- [ ] 4.3 Identify startup and initialization issues
  - Find slow imports or module load times
  - Check for eager loading that could be lazy
  - Find blocking operations during initialization
  - Document in finding: `findings/4-3-startup-issues.md`

**VERIFY 4:** Performance issues documented with optimization strategies

---

## Phase 5: Generate Optimization Plan

**Objective:** Create implementation plan from analysis findings.

- [ ] 5.1 Generate `optimization-implementation.md` plan
  - Read all findings from Phase 1-4
  - Group by effort (quick wins, medium, large refactors)
  - Prioritize by impact (critical paths first)
  - Create tasks for each optimization
  - Include test requirements for each change
  - Write to `docs/plans/optimization-implementation.md`
  - Initialize status tracking for the new plan

**VERIFY 5:** Optimization implementation plan is valid and can be run by orchestrator

---

## Success Criteria

- [ ] All analysis phases complete with documented findings
- [ ] Each finding includes: location, issue, impact, suggested fix
- [ ] Generated plan prioritizes high-impact, low-effort items
- [ ] No overlap with other analysis plans

---

## Findings Template

```markdown
# Finding: [Category] - [Title]

## Summary
Brief description of the optimization opportunity.

## Issues Found

| Location | Issue | Impact | Effort | Priority |
|----------|-------|--------|--------|----------|
| file.py:123 | Duplicated validation | Medium | Low | High |
| module.js | No tests | High | Medium | High |

## Recommended Fixes
1. Extract common validation to `utils/validators.py`
2. Add test file `tests/test_module.js`

## Metrics (if applicable)
- Current: 150ms response time
- Target: <50ms response time
```
