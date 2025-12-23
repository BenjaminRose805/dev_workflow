# Phase 6: Analysis & Quality - `/test` Command Design

## Command Overview

The `/test` command suite provides comprehensive test creation, planning, and quality assurance capabilities. It supports multiple testing paradigms (unit, integration, e2e) and frameworks (Jest, Vitest, Playwright, Cypress).

**Core Capabilities:**
- Generate test files from source code and specifications
- Create comprehensive test plans from requirements
- Analyze test coverage and identify gaps
- Execute test suites and interpret results
- Support multiple testing frameworks and patterns

**Design Principles:**
- Framework-agnostic with smart detection
- Generate readable, maintainable test code
- Integrate with existing test infrastructure
- Support TDD/BDD workflows

---

## Sub-Command Specifications

### 1. `test:unit` - Unit Test Generation

```yaml
---
name: test:unit
description: Generate unit tests for functions, classes, or modules
model: claude-sonnet-4-5
allowed-tools: [Read, Write, Glob, Grep, Bash]
artifact-types: ["*.test.ts", "*.test.js", "*.spec.ts"]
framework-support: [jest, vitest, mocha, tap]
---
```

---

### 2. `test:integration` - Integration Test Generation

```yaml
---
name: test:integration
description: Generate integration tests for APIs and services
model: claude-sonnet-4-5
allowed-tools: [Read, Write, Glob, Grep, Bash]
artifact-types: ["*.integration.test.ts", "*.api.test.ts"]
framework-support: [jest, vitest, supertest, testing-library]
---
```

---

### 3. `test:e2e` - End-to-End Test Generation

```yaml
---
name: test:e2e
description: Generate E2E tests for user workflows
model: claude-sonnet-4-5
allowed-tools: [Read, Write, Glob, Grep, Bash]
artifact-types: ["*.e2e.ts", "*.playwright.ts", "*.cy.ts"]
framework-support: [playwright, cypress, puppeteer]
---
```

---

### 4. `test:plan` - Test Plan Generation

```yaml
---
name: test:plan
description: Create test plans from specifications
model: claude-sonnet-4-5
allowed-tools: [Read, Write, Glob, Grep]
artifact-types: [test-plan.md, test-strategy.md, test-matrix.json]
---
```

---

### 5. `test:coverage` - Coverage Analysis

```yaml
---
name: test:coverage
description: Analyze coverage and identify gaps
model: claude-sonnet-4-5
allowed-tools: [Read, Bash, Glob, Grep, Write]
artifact-types: [coverage-report.md, coverage-gaps.json]
---
```

---

### 6. `test:run` - Test Execution

```yaml
---
name: test:run
description: Execute tests and analyze results
model: claude-sonnet-4-5
allowed-tools: [Bash, Read, Write, Grep]
artifact-types: [test-results.md, test-output.json]
---
```

---

### 7. `test:fixture` - Fixture Generation

```yaml
---
name: test:fixture
description: Generate test fixtures and mock data
model: claude-sonnet-4-5
allowed-tools: [Read, Write, Glob, Grep]
artifact-types: ["fixtures/*.json", "fixtures/*.ts", "mocks/*.ts"]
---
```

---

### 8. `test:snapshot` - Snapshot Tests

```yaml
---
name: test:snapshot
description: Generate snapshot tests for components
model: claude-sonnet-4-5
allowed-tools: [Read, Write, Bash, Glob]
artifact-types: ["*.snapshot.test.ts", "__snapshots__/*"]
---
```

---

### 9. `test:contract` - Contract Tests

```yaml
---
name: test:contract
description: Generate API contract tests
model: claude-sonnet-4-5
allowed-tools: [Read, Write, Glob, Grep]
artifact-types: ["*.contract.test.ts", "contracts/*.pact.json"]
framework-support: [pact, spring-cloud-contract, openapi]
---
```

---

### 10. `test:mutation` - Mutation Testing

```yaml
---
name: test:mutation
description: Run mutation testing to verify test quality
model: claude-sonnet-4-5
allowed-tools: [Bash, Read, Write, Grep]
artifact-types: [mutation-report.md, mutation-score.json]
framework-support: [stryker, mutmut]
---
```

---

## Artifact Schemas

### test-plan.md

```markdown
# Test Plan: [Feature Name]

## Overview
- **Version:** 1.0
- **Status:** Draft

## Scope
### In Scope
- [Features to test]
### Out of Scope
- [Excluded items]

## Test Strategy
### Unit Testing
- **Framework:** Jest/Vitest
- **Coverage Target:** X%

### Integration Testing
- **Focus Areas:** API, Database, Services

### E2E Testing
- **Framework:** Playwright/Cypress
- **Scenarios:** [User workflows]

## Test Matrix
| ID | Test Case | Type | Priority | Status |
|----|-----------|------|----------|--------|
| TC-001 | [Description] | Unit | High | Pending |

## Entry/Exit Criteria
### Entry
- [ ] Requirements finalized
### Exit
- [ ] All high-priority tests pass
- [ ] Coverage meets threshold
```

### test-matrix.json

```json
{
  "metadata": { "version": "1.0", "feature": "Feature name", "totalTests": 25 },
  "testCases": [{
    "id": "TC-001",
    "title": "Test case title",
    "type": "unit",
    "priority": "high",
    "status": "pending",
    "preconditions": ["User is authenticated"],
    "steps": [{ "step": 1, "action": "Navigate to page", "expected": "Page loads" }],
    "automationStatus": "automated"
  }],
  "coverage": { "requirements": { "total": 10, "covered": 8, "percentage": 80 } }
}
```

### coverage-gaps.json

```json
{
  "metadata": { "overallCoverage": { "statements": 75.5, "branches": 68.2 } },
  "gaps": [{
    "file": "src/utils/validator.ts",
    "priority": "high",
    "coverage": { "statements": 60, "branches": 50 },
    "uncoveredRanges": [{ "start": 45, "end": 60, "type": "error-handling" }],
    "recommendations": [{
      "type": "unit-test",
      "description": "Add tests for validation edge cases",
      "effort": "2 hours"
    }]
  }],
  "summary": { "totalGaps": 15, "estimatedEffort": "16 hours" }
}
```

---

## Workflow Integration

### TDD Workflow
```bash
/test:unit src/feature --empty  # Generate empty test file
# Write failing tests manually
# Implement feature
/test:run --watch
```

### Coverage-Driven
```bash
/test:coverage src/
/test:unit [uncovered-file]
/test:run
/test:coverage --verify
```

### Framework Detection
1. Check package.json (jest, vitest, @playwright/test, cypress)
2. Check config files (jest.config.js, vitest.config.ts)
3. Check existing test patterns

---

## Statistics

| Metric | Count |
|--------|-------|
| Sub-Commands | 10 |
| Unique Artifacts | 15 |
| Frameworks Supported | 8 |

**Phase 6 Task 6.4 Status: COMPLETE**
