# Priority Assignment Matrix

**Created:** 2025-12-24
**Purpose:** Document priority assignments for all implementation plans with dependency-based rationale

---

## Priority Level Definitions

| Priority | Name | Criteria |
|----------|------|----------|
| P0 | Critical | Foundation infrastructure OR core user-facing commands with no alternatives |
| P1 | Important | Significant functionality that enhances workflows but isn't blocking |
| P2 | Enhancement | Nice-to-have features, optimizations, or specialized use cases |

**Key Rule:** A command MUST have priority >= all its upstream dependencies.

---

## Conflict Resolution Summary

### Resolved Conflicts

| Issue | Before | After | Rationale |
|-------|--------|-------|-----------|
| error-recovery-hooks | P1 | P0 | artifact-registry (P0) depends on it |
| workflow-branching | P0 | P1 | Same tier as workflow-loops; both extend workflow-command |
| workflow-loops | P1 | P1 | No change needed; already correct |

### Additional Standardizations

| Command | Before | After | Rationale |
|---------|--------|-------|-----------|
| refactor-command | Mixed P0/P1/P2 | P1 | Standard single-priority; depends on analyze (P0) |
| review-command | Mixed P0/P1 | P0 | Core quality gate with P0 sub-commands (pr, diff, file) |

---

## Priority Matrix by Wave

### Wave 1: Foundation Infrastructure (P0)

| Command | Priority | Dependencies | Rationale |
|---------|----------|--------------|-----------|
| error-recovery-hooks | P0 | None | Foundation - all commands need error handling |
| artifact-registry | P0 | error-recovery-hooks | Core infrastructure for artifact tracking |
| artifact-storage-hook | P0 | artifact-registry | Essential for artifact persistence |
| context-loading-hook | P0 | artifact-registry | Essential for artifact consumption |

### Wave 2: Discovery & Ideation (P0)

| Command | Priority | Dependencies | Rationale |
|---------|----------|--------------|-----------|
| explore-command | P0 | None | Entry point for codebase understanding |
| explore-agent | P0 | explore-command | Core agent for navigation |
| clarify-command | P0 | None | Entry point for requirements gathering |
| research-command | P0 | None | Entry point for technology research |
| brainstorm-command | P1 | None | Valuable but not blocking |

### Wave 3: Design & Architecture (P1)

| Command | Priority | Dependencies | Rationale |
|---------|----------|--------------|-----------|
| architect-command | P1 | clarify, research, explore | Design phase command |
| design-command | P1 | architect, clarify | Component-level design |
| spec-command | P1 | design, architect, clarify | Formal specifications |
| model-command | P1 | architect, clarify | Data modeling |

### Wave 4: Core Implementation (P0)

| Command | Priority | Dependencies | Rationale |
|---------|----------|--------------|-----------|
| implement-command | P0 | design, spec, clarify | Core code generation |
| test-command | P0 | implement, spec | Core quality verification |
| validate-command | P0 | spec, architect, analyze | Core validation |
| analyze-command | P0 | explore, test | Core static analysis |
| debug-command | P0 | explore, analyze | Core debugging |
| fix-command | P0 | test, analyze, debug | Core bug fixing |

### Wave 5: Quality & Review (P0/P1)

| Command | Priority | Dependencies | Rationale |
|---------|----------|--------------|-----------|
| review-command | P0 | explore, analyze | Core quality gate |
| review-agent | P0 | review-command | Core agent for reviews |
| analyze-agent | P0 | analyze-command | Core agent for analysis |
| debug-agent | P0 | analyze-command, test-command | Core agent for debugging |
| audit-command | P1 | analyze, spec, architect | Compliance (not blocking) |
| refactor-command | P1 | explore, analyze, review | Enhancement (not blocking) |

### Wave 6: Documentation & Deployment (P0/P1/P2)

| Command | Priority | Dependencies | Rationale |
|---------|----------|--------------|-----------|
| deploy-command | P0 | validate, test | Core deployment |
| deploy-agent | P0 | deploy-command | Core agent for deployment |
| migrate-command | P0 | model, validate | Core migrations |
| release-command | P0 | validate, test, audit | Core release management |
| document-command | P2 | architect, design, spec, explore | Documentation (not blocking) |
| explain-command | P2 | explore, architect, design | Documentation (not blocking) |

### Wave 7: Workflow Orchestration (P0/P1/P2)

| Command | Priority | Dependencies | Rationale |
|---------|----------|--------------|-----------|
| workflow-command | P0 | artifact-registry, error-recovery | Core workflow orchestration |
| template-command | P1 | None | Meta-command for templates |
| workflow-loops | P1 | workflow-command | Workflow extension |
| workflow-branching | P1 | workflow-command | Workflow extension |
| workflow-composition | P2 | workflow-loops, workflow-branching | Advanced composition |
| fan-in-fan-out | P2 | workflow-command | Advanced parallel execution |

### Wave 8: Advanced Hooks (P2)

| Command | Priority | Dependencies | Rationale |
|---------|----------|--------------|-----------|
| notification-hooks | P2 | None | Nice-to-have notifications |

---

## Changes Required

### Plans Needing Priority Updates

1. **implement-error-recovery-hooks.md** - Change P1 → P0
2. **implement-workflow-branching.md** - Change P0 → P1
3. **implement-refactor-command.md** - Change mixed → P1
4. **implement-artifact-storage-hook.md** - Change P1 → P0
5. **implement-context-loading-hook.md** - Change P1 → P0

---

## Dependency Validation Rules

1. **No P0 command should depend on P1+ commands**
   - Validated: ✓ (after fixes)

2. **P1 commands may depend on P0 commands**
   - This is expected and correct

3. **P2 commands may depend on P0 or P1 commands**
   - This is expected and correct

4. **Commands at same tier should not have blocking dependencies between them**
   - Use clear ordering within the tier based on the dependency graph

---

## Version History

- **v1.0** (2025-12-24): Initial priority matrix creation
