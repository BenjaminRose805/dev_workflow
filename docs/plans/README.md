# Implementation Plans Index

This directory contains implementation plans for the Claude Code command library. Each plan describes how to build a new command or feature for the dev workflow system.

**Total Plans:** 38
**Last Updated:** 2025-12-24

---

## Quick Reference

### Command Categories

| Category | Commands | Description |
|----------|----------|-------------|
| **Exploration & Analysis** | explore, analyze, clarify, research | Understanding codebases and requirements |
| **Design & Architecture** | architect, design, spec, model | System and component design |
| **Implementation** | implement, fix, refactor, debug | Code creation and modification |
| **Quality & Testing** | test, validate, review, audit | Code quality and verification |
| **Documentation** | document, explain | Code and system documentation |
| **Deployment & Release** | deploy, migrate, release | Production deployment |
| **Workflow & Automation** | workflow, brainstorm, template | Process automation |
| **Infrastructure** | artifact-registry, hooks | Supporting infrastructure |

---

## Plan Index by Priority

### P0 - Critical Path (Foundation)

These plans implement core infrastructure and commands that other commands depend on.

| Plan | Command | Description |
|------|---------|-------------|
| [implement-artifact-registry](implement-artifact-registry.md) | Infrastructure | Central artifact storage and discovery |
| [implement-error-recovery-hooks](implement-error-recovery-hooks.md) | Infrastructure | Error handling and recovery mechanisms |
| [implement-context-loading-hook](implement-context-loading-hook.md) | Infrastructure | Context loading for commands |
| [implement-artifact-storage-hook](implement-artifact-storage-hook.md) | Infrastructure | Artifact persistence hooks |
| [implement-explore-command](implement-explore-command.md) | `/explore` | Codebase exploration and mapping |
| [implement-clarify-command](implement-clarify-command.md) | `/clarify` | Requirements clarification |
| [implement-analyze-command](implement-analyze-command.md) | `/analyze` | Code analysis and metrics |
| [implement-validate-command](implement-validate-command.md) | `/validate` | Build/type/lint verification |
| [implement-test-command](implement-test-command.md) | `/test` | Test generation and execution |
| [implement-review-command](implement-review-command.md) | `/review` | AI-powered code review |
| [implement-fix-command](implement-fix-command.md) | `/fix` | Automated bug fixing |
| [implement-debug-command](implement-debug-command.md) | `/debug` | Debugging assistance |
| [implement-refactor-command](implement-refactor-command.md) | `/refactor` | Code refactoring |
| [implement-implement-command](implement-implement-command.md) | `/implement` | Spec-driven code generation |
| [implement-deploy-command](implement-deploy-command.md) | `/deploy` | Deployment automation |
| [implement-migrate-command](implement-migrate-command.md) | `/migrate` | Codebase migrations |
| [implement-release-command](implement-release-command.md) | `/release` | Release management |
| [implement-research-command](implement-research-command.md) | `/research` | Technical research |
| [implement-workflow-command](implement-workflow-command.md) | `/workflow` | Workflow orchestration |
| [implement-workflow-loops](implement-workflow-loops.md) | Workflow | Iteration patterns |

### P1 - Important (Core Functionality)

| Plan | Command | Description |
|------|---------|-------------|
| [implement-architect-command](implement-architect-command.md) | `/architect` | System architecture design |
| [implement-design-command](implement-design-command.md) | `/design` | Component-level design |
| [implement-spec-command](implement-spec-command.md) | `/spec` | Formal specification generation |
| [implement-audit-command](implement-audit-command.md) | `/audit` | Compliance and security auditing |
| [implement-brainstorm-command](implement-brainstorm-command.md) | `/brainstorm` | Ideation and exploration |
| [implement-model-command](implement-model-command.md) | `/model` | Domain modeling |
| [implement-template-command](implement-template-command.md) | `/template` | Template management |
| [implement-workflow-branching](implement-workflow-branching.md) | Workflow | Conditional workflow logic |

### P2 - Enhancement (Nice-to-Have)

| Plan | Command | Description |
|------|---------|-------------|
| [implement-document-command](implement-document-command.md) | `/document` | Documentation generation |
| [implement-explain-command](implement-explain-command.md) | `/explain` | Code explanation |
| [implement-workflow-composition](implement-workflow-composition.md) | Workflow | Workflow composition |
| [implement-fan-in-fan-out](implement-fan-in-fan-out.md) | Workflow | Parallel workflow patterns |
| [implement-notification-hooks](implement-notification-hooks.md) | Infrastructure | Notification system |

### Agent Implementations

| Plan | Agent | Description |
|------|-------|-------------|
| [implement-explore-agent](implement-explore-agent.md) | Explore Agent | Autonomous exploration |
| [implement-analyze-agent](implement-analyze-agent.md) | Analyze Agent | Autonomous analysis |
| [implement-review-agent](implement-review-agent.md) | Review Agent | Autonomous code review |
| [implement-debug-agent](implement-debug-agent.md) | Debug Agent | Autonomous debugging |
| [implement-deploy-agent](implement-deploy-agent.md) | Deploy Agent | Autonomous deployment |

---

## Command Quick Reference

### Exploration & Understanding

```
/explore:quick      - Fast codebase overview
/explore:deep       - Comprehensive exploration
/clarify:gather     - Collect requirements
/clarify:validate   - Validate requirements
/research:web       - Web-based research
/research:codebase  - Code pattern research
```

### Design & Architecture

```
/architect:system   - System architecture
/architect:component - Component architecture
/design:component   - Component design
/design:api         - API design
/spec:api           - OpenAPI generation
/spec:schema        - JSON Schema generation
/model:domain       - Domain modeling
```

### Implementation

```
/implement:feature  - Feature implementation
/implement:component - Component generation
/implement:api      - API implementation
/fix:bug            - Bug fixing
/fix:issue          - Issue resolution
/refactor:extract   - Extract refactoring
/refactor:rename    - Rename refactoring
```

### Quality & Testing

```
/test:unit          - Unit test generation
/test:integration   - Integration tests
/validate:types     - Type checking
/validate:lint      - Linting
/review:code        - Code review
/review:pr          - PR review
/audit:security     - Security audit
/audit:compliance   - Compliance audit
```

### Documentation

```
/document:api       - API documentation
/document:code      - Code documentation
/explain:function   - Function explanation
/explain:codebase   - Codebase overview
```

### Deployment

```
/deploy:preview     - Preview deployment
/deploy:production  - Production deployment
/migrate:dependency - Dependency migration
/release:prepare    - Prepare release
/release:publish    - Publish release
```

---

## Plan Template

All implementation plans follow the canonical template structure:

```markdown
# Implementation Plan: [Command Name]

## Overview
- **Goal:** [One-sentence goal]
- **Priority:** P0 | P1 | P2
- **Created:** YYYY-MM-DD
- **Output:** `docs/plan-outputs/{plan-name}/`

## Dependencies
### Upstream
- [Commands this consumes from]
### Downstream
- [Commands that consume this]
### External Tools
- [Required external tools]

## Phase N: [Phase Title]
**Objective:** [Phase goal]
- [ ] N.1 [Task description]
- [ ] N.2 [Task description]

**VERIFY Phase N:**
- [ ] [Verification criterion]

## Success Criteria
- [ ] [Measurable criterion]

## Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| ... | ... | ... |
```

See `docs/plan-templates/` for complete templates.

---

## Using Plans

### Setting the Active Plan

```bash
# Interactive selection
/plan:set

# Direct selection
/plan:set implement-explore-command
```

### Implementing Plan Tasks

```bash
# Interactive task selection
/plan:implement

# Specific tasks
/plan:implement 1.1 1.2 1.3

# Entire phase
/plan:implement phase:1

# Autonomous mode (for orchestration)
/plan:implement 1.1 1.2 --autonomous
```

### Checking Progress

```bash
# View progress
/plan:status

# CLI alternative
node scripts/status-cli.js progress
```

### Verifying Completion

```bash
# Verify specific tasks
/plan:verify 1.1 1.2

# Verify entire phase
/plan:verify phase:1
```

---

## Troubleshooting

### Common Issues

**Plan not found**
```
Error: No active plan set
```
Solution: Run `/plan:set` to select a plan first.

**Task ID not found**
```
Error: Task ID 'X.X' not found in plan
```
Solution: Check the plan file for correct task IDs. Use `/plan:status` to see available tasks.

**Dependencies missing**
```
Warning: Task depends on incomplete tasks
```
Solution: Complete dependent tasks first or use `/plan:implement phase:N` to implement in order.

**Status not updating**
```
Warning: Could not update status
```
Solution: Check that `docs/plan-outputs/{plan-name}/status.json` exists and is writable.

### Validation

Run the validation script to check plan format:

```bash
node scripts/validate-plan-format.js --report
```

This checks:
- Required sections (Overview, Dependencies, Success Criteria, Risks)
- Required fields (Goal, Priority, Created, Output)
- Dependencies subsections (Upstream, Downstream, External Tools)
- Phase and VERIFY format consistency
- Naming conventions

---

## Related Documentation

- [Implementation Plan Standards](../standards/implementation-plan-standards.md)
- [Command Dependency Graph](../architecture/command-dependency-graph.md)
- [Implementation Roadmap](../architecture/implementation-roadmap.md)
- [Plan Templates](../plan-templates/)
- [Artifact Compatibility Matrix](../architecture/artifact-compatibility-matrix.md)

---

## Validation Status

All 38 implementation plans pass format validation:
- Required sections present
- Dependencies properly structured
- VERIFY sections in place
- Naming conventions followed

Run `node scripts/validate-plan-format.js` to verify.
