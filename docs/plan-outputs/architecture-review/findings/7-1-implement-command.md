# /implement Command Design Specification

**Task:** 7.1 Design `/implement` command (code generation from specs/designs)
**Category:** Implementation & Code Generation
**Priority:** CRITICAL
**Date:** 2025-12-20

---

## Executive Summary

The `/implement` command transforms design artifacts, specifications, and requirements into working code. It bridges the gap between design/architecture and production-ready implementation by generating code that adheres to specifications, follows project patterns, and includes proper error handling, logging, and testing hooks.

**Key Differentiator:** `/implement` focuses on **code generation from formal specifications** (OpenAPI, JSON Schema, design docs), whereas `/design` creates specifications and `/refactor` modifies existing code. It's the primary command for bringing designs to life.

**Core Philosophy:**
- **Spec-driven development:** Generate code from OpenAPI, JSON Schema, AsyncAPI, etc.
- **Pattern consistency:** Follow existing codebase conventions and patterns
- **Production-ready:** Include error handling, logging, validation, and testing hooks
- **Incremental implementation:** Support partial implementation and iterative refinement

---

## Command Structure

### Primary Command: `/implement`

**Base invocation** (without sub-command):
```
/implement [component-or-feature-name]
```

Analyzes context (design docs, specs, plan tasks) and intelligently routes to appropriate sub-command.

### Sub-Commands

| Sub-command | Purpose | Input Artifacts | Output | Priority |
|-------------|---------|-----------------|--------|----------|
| `implement:feature` | Implement complete feature from design | `design-spec.md`, `requirements.json` | Feature code, tests | P0 |
| `implement:component` | Implement component from specification | `component-spec.md`, `interfaces.md` | Component code | P0 |
| `implement:api` | Generate API from OpenAPI spec | `openapi.yaml` | API routes, handlers, validators | P0 |
| `implement:schema` | Generate code from JSON Schema | `schema.json` | Types, validators, builders | P1 |
| `implement:graphql` | Generate GraphQL resolvers from SDL | `schema.graphql` | Resolvers, type definitions | P1 |
| `implement:events` | Generate event handlers from AsyncAPI | `asyncapi.yaml` | Publishers, subscribers, schemas | P1 |
| `implement:data` | Generate data layer from models | `entities.json`, `schema.sql` | Repositories, migrations, ORM models | P1 |
| `implement:ui` | Generate UI components from spec | `ui-spec.md`, `component-tree.json` | React/Vue components | P2 |

---

## YAML Frontmatter Specification

### Primary Command: `.claude/commands/implement.md`

```yaml
---
name: implement
description: Generate production-ready code from specifications, designs, and requirements. Use after design/spec phase to create working implementations.
model: sonnet
allowed-tools: Read, Write, Grep, Glob, Bash, AskUserQuestion
argument-hint: [component-or-feature-name]
category: implementation
output_artifacts:
  - source-code
  - test-files
  - implementation-notes.md
---
```

---

## Model Configuration Rationale

**Model:** `sonnet` (Claude Sonnet 4.5)
- Strong code generation capabilities
- Excellent at pattern recognition and consistency
- Cost-effective for implementation tasks
- Sufficient for most code generation scenarios

**Consider Upgrade to Opus for:**
- Complex business logic with many edge cases
- High-criticality security-sensitive code
- Novel algorithm implementation
- Large-scale refactoring during implementation

**Allowed Tools:**
- `Read/Grep/Glob`: Analyze existing patterns, conventions, and related code
- `Write`: Generate new code files
- `Bash`: Run linters, formatters, tests to verify implementation
- `AskUserQuestion`: Clarify ambiguous requirements or implementation choices

---

## Implementation Strategy

### 1. Context Analysis Phase

Before generating code, analyze:

**Required Inputs:**
1. **Specifications:** OpenAPI, JSON Schema, AsyncAPI, GraphQL SDL
2. **Design Documents:** design-spec.md, interfaces.md, architecture.md
3. **Requirements:** requirements.json, acceptance-criteria.md
4. **Existing Patterns:** Similar implementations in codebase

### 2. Code Generation Phase

**Layered Generation Approach:**

1. **Type Definitions First** - Generate interfaces, types, enums from schemas
2. **Core Logic** - Implement business logic according to design-spec.md
3. **Error Handling** - Wrap operations in try-catch or Result types
4. **Logging & Observability** - Add structured logging at key points
5. **Tests** - Generate unit tests for each public method

### 3. Verification Phase

After generation, verify:

```bash
# Type checking
npx tsc --noEmit

# Linting
npx eslint src/**/*.ts

# Tests
npx vitest run
```

---

## Output Artifacts

### implementation-notes.md Template

```markdown
---
artifact_type: implementation-notes
command: implement:[subcommand]
feature: [feature-name]
version: 1.0.0
created_at: [ISO-8601]
status: complete | partial | needs-review
---

# Implementation Notes: [Feature/Component Name]

## Overview
**Implemented:** [Date]
**Specification Source:** [Path to design-spec.md or openapi.yaml]
**Status:** ✅ Complete | 🔄 Partial | ⚠️ Needs Review

## Files Generated

### Source Code
- `src/[path]/[file].ts` - [Description]
- `src/[path]/[file].types.ts` - Type definitions

### Tests
- `tests/unit/[path]/[file].test.ts` - Unit tests

## Implementation Decisions
[Document key choices made during implementation]

## Verification Checklist
- [x] Code compiles without errors
- [x] All tests pass
- [x] Linter passes
- [x] Type definitions complete
```

---

## Workflow Integration

### Upstream Commands (Inputs)

| Artifact | Source Command | Usage |
|----------|----------------|-------|
| `design-spec.md` | `/design` | Component structure, interfaces, algorithms |
| `openapi.yaml` | `/spec:api` | API contract for implementation |
| `requirements.json` | `/clarify:requirements` | Feature requirements |
| `architecture.md` | `/architect` | System context and patterns |

### Downstream Commands (Outputs)

| Artifact | Consumed By | Purpose |
|----------|-------------|---------|
| Source code | `/test`, `/review` | Testing and review |
| `implementation-notes.md` | `/document` | Documentation generation |
| Test files | `/test:run`, `/validate:coverage` | Verification |

### Workflow Sequences

**Contract-First API Development:**
```
/spec:api -> /implement:api -> /test:api -> /validate:api -> /document:api
```

**Feature Development:**
```
/clarify -> /design -> /implement:feature -> /test:unit -> /test:integration -> /review
```

---

## Example Usage Scenarios

### Example 1: API Implementation from OpenAPI

```
User: /implement:api user-management

Claude: I'll implement the user management API from the OpenAPI specification.

Found: docs/specs/api/v1/user-api.yaml (12 endpoints)

Generated:
→ src/api/routes/users.routes.ts
→ src/api/handlers/users.handlers.ts
→ src/api/validators/users.validators.ts
→ tests/integration/api/users.api.test.ts

Verification:
✅ TypeScript compilation successful
✅ All 32 tests passing
```

### Example 2: Component Implementation from Design

```
User: /implement:component shopping-cart

Claude: Implementing shopping-cart from design specification...

Found: docs/design/shopping-cart/design-spec.md

Generated:
→ src/features/cart/cart.slice.ts
→ src/features/cart/cart.types.ts
→ tests/unit/features/cart/cart.slice.test.ts (18 test cases)

Verification:
✅ Tests: 26/26 passing (95% coverage)
```

---

## Differentiation from Related Commands

### vs `/design`
- **Design:** Creates specifications and interfaces (what to build)
- **Implement:** Writes actual code from specifications (building it)

### vs `/refactor`
- **Implement:** Creates new code from specifications
- **Refactor:** Improves existing code structure

### vs `/scaffold`
- **Implement:** Full implementation with logic, tests, error handling
- **Scaffold:** Boilerplate/skeleton code only

---

## Implementation Priority

### P0 (Must Have)
- `/implement` - General implementation
- `/implement:feature` - Feature implementation
- `/implement:component` - Component implementation
- `/implement:api` - API from OpenAPI

### P1 (Should Have)
- `/implement:schema` - Types from JSON Schema
- `/implement:data` - Data layer generation
- `/implement:graphql` - GraphQL resolvers

### P2 (Nice to Have)
- `/implement:ui` - UI component generation

---

**Phase 7 Task 7.1 Status: COMPLETE**
