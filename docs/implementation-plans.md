# Implementation Plans

**Based on:** Architecture Review (docs/plan-outputs/architecture-review/findings/)

---

## P0 - MVP (Implement First)

### Infrastructure

| Plan | Purpose |
|------|---------|
| `implement-artifact-registry` | Centralized artifact discovery (`docs/artifacts/`) |
| `implement-workflow-branching` | IF/THEN/ELSE and error handlers for workflows |

### Commands

| Plan | Purpose | Key Sub-commands |
|------|---------|------------------|
| `implement-explore-command` | Codebase exploration | architecture, patterns, dependencies, quick, deep |
| `implement-clarify-command` | Interactive requirements gathering | requirements, scope, constraints, acceptance |
| `implement-test-command` | Test creation and execution | unit, integration, e2e, coverage, run |
| `implement-validate-command` | Spec verification | spec, schema, requirements, contracts, types |

---

## P1 - High Value

### Commands

| Plan | Purpose | Key Sub-commands |
|------|---------|------------------|
| `implement-fix-command` | Bug fixing with regression tests | bug, type-error, security, performance, test |
| `implement-refactor-command` | Code restructuring | extract, rename, simplify, patterns, modernize |
| `implement-analyze-command` | Code analysis | security, performance, quality, dependencies |
| `implement-review-command` | Automated code review | pr, diff, file, commit, standards |
| `implement-debug-command` | Debugging assistance | error, performance, behavior, memory, network |

### Infrastructure

| Plan | Purpose |
|------|---------|
| `implement-workflow-loops` | LOOP/UNTIL and convergence detection |
| `implement-error-recovery-hooks` | Retry, checkpoint/resume, rollback |

---

## P2 - Important

### Design Commands

| Plan | Purpose | Key Sub-commands |
|------|---------|------------------|
| `implement-architect-command` | System architecture (C4 Model) | system, components, data, deployment, adr |
| `implement-design-command` | Component design | component, api, data, interactions, state |
| `implement-spec-command` | Formal specs (OpenAPI, JSON Schema) | api, schema, graphql, events |
| `implement-research-command` | Technology research | technology, patterns, security, performance |
| `implement-brainstorm-command` | Creative ideation | solutions, architecture, names, features |
| `implement-model-command` | Data modeling | erd, schema, domain, migration, orm |

### Documentation Commands

| Plan | Purpose | Key Sub-commands |
|------|---------|------------------|
| `implement-document-command` | Documentation generation | api, user, developer, changelog, diagrams |
| `implement-explain-command` | Code explanation | code, architecture, pattern, decision, flow |
| `implement-audit-command` | Compliance auditing | security, compliance, secrets, licenses |

### Infrastructure

| Plan | Purpose |
|------|---------|
| `implement-workflow-composition` | Nested workflows, variable scope |
| `implement-fan-in-fan-out` | Parallel workflow patterns |

---

## P3 - Later

### Operations Commands

| Plan | Purpose | Key Sub-commands |
|------|---------|------------------|
| `implement-deploy-command` | Deployment automation | app, rollback, verify, preview, canary |
| `implement-migrate-command` | Migration tasks | schema, data, api, config, code |
| `implement-release-command` | Release preparation | prepare, notes, tag, changelog, version |
| `implement-workflow-command` | Workflow orchestration | create, run, status, visualize, resume |
| `implement-template-command` | Template management | list, create, apply, edit, validate |

---

## Agents

| Plan | Purpose | Model |
|------|---------|-------|
| `implement-explore-agent` | Enhance existing Explore agent | Haiku |
| `implement-analyze-agent` | Security/quality analysis | Sonnet |
| `implement-review-agent` | Proactive code review | Sonnet |
| `implement-debug-agent` | Hypothesis-driven debugging | Opus |
| `implement-deploy-agent` | Safe deployment | Sonnet |

---

## Hooks

| Plan | Purpose |
|------|---------|
| `implement-context-loading-hook` | Pre-command artifact/status loading |
| `implement-artifact-storage-hook` | Post-command registry and versioning |
| `implement-notification-hooks` | Terminal, webhooks, OS notifications |

---

## Quick Wins

| Plan | Purpose |
|------|---------|
| `implement-subcommand-aliases` | Add `:*` pattern to existing commands |
| `implement-artifact-registry-skeleton` | Create `docs/artifacts/` structure |

---

## Usage

```
/plan:create <plan-name>
```

Example:
```
/plan:create implement-explore-command
```

---

## References

- Executive Summary: `findings/12-3-executive-summary.md`
- Command Designs: `findings/04-*.md` through `findings/08-*.md`
- Workflow Patterns: `findings/09-workflows.md`
- Agent/Hook Design: `findings/10-agents-hooks.md`
