# IMPORTANT REMINDER!!! - PLEASE MAKE SURE THAT THERE IS A GIT REPO ONLY WITH THE .CLAUDE/ DOCS/ SCRIPTS/ - IF THAT DOES NOT EXIST AND IS NOT IN USE, STOP EXECUTION AND REMIND USER TO IMPLEMENT THAT FIRST. THE GIT REPO THAT IS BEING USED TO CAPTURE THE NEXTJS SOFWARE DOES NOT COUNT. A SEPARATE REPO MUST EXIST AND BE IN USE.

# Analysis Plan: Architecture Review

## Overview
- **Target:** `.claude/`, `docs/`, `scripts/`
- **Focus:** Command structure and workflow optimization - analyzing how `plan:*` commands should be restructured into action-based commands (analyze, document, test, validate) with sub-commands for specific variants
- **Created:** 2025-12-19
- **Output:** `docs/plan-outputs/architecture-review/`

> Task findings are written to the `findings/` subdirectory. Use `/plan:status` to view progress.

## Context

The current command system uses `plan:*` namespace for all operations. The hypothesis is that commands should be organized by **action type** (what you're doing) rather than artifact type (plan).

This analysis will explore optimal command organization, how different components (commands, artifacts, agents, hooks, scripts) can work together, and how workflows can chain from one artifact to another.

## Proposed Command Taxonomy

### Discovery & Ideation Commands
| Command | Purpose | Artifact(s) |
|---------|---------|-------------|
| `/clarify` | Interactive discovery when idea isn't fully formed - asks questions, explores requirements | `requirements.json`, `questions.md`, `scope.md` |
| `/explore` | Codebase exploration and understanding | `exploration-report.md`, `codebase-map.json` |
| `/research` | Research approaches, technologies, patterns | `research-notes.md`, `options-analysis.md` |
| `/brainstorm` | Generate ideas and alternatives | `ideas.md`, `alternatives.md` |

### Design & Architecture Commands
| Command | Purpose | Artifact(s) |
|---------|---------|-------------|
| `/architect` | System/high-level architecture design | `architecture.md`, `system-diagram.md`, `components.json` |
| `/design` | Component/feature detailed design | `design-spec.md`, `interfaces.md` |
| `/spec` | Write formal specifications | `spec.md`, `api-spec.yaml` |
| `/model` | Data modeling and schema design | `data-model.md`, `schema.sql`, `entities.json` |

### Analysis Commands
| Command | Purpose | Artifact(s) |
|---------|---------|-------------|
| `/analyze` | Code analysis (security, performance, quality) | `analysis-report.md`, `findings.json` |
| `/audit` | Compliance/security audit | `audit-report.md`, `vulnerabilities.json` |
| `/review` | Code review | `review-comments.md`, `suggestions.json` |
| `/profile` | Performance profiling | `profile-report.md`, `bottlenecks.json` |
| `/compare` | Compare implementations/approaches | `comparison.md`, `tradeoffs.md` |

### Implementation Commands
| Command | Purpose | Artifact(s) |
|---------|---------|-------------|
| `/implement` | Code implementation from spec/design | Code files, `implementation-notes.md` |
| `/refactor` | Code refactoring | Refactored code, `refactor-summary.md` |
| `/fix` | Bug fixing | Fix + `regression-test.ts`, `fix-notes.md` |
| `/optimize` | Performance optimization | Optimized code, `optimization-report.md` |
| `/scaffold` | Generate boilerplate/structure | Scaffold files, `scaffold-manifest.json` |

### Quality & Testing Commands
| Command | Purpose | Artifact(s) |
|---------|---------|-------------|
| `/test` | Test creation | Test files, `test-plan.md` |
| `/validate` | Validation/verification | `validation-report.md`, `checklist.md` |
| `/debug` | Debugging assistance | `debug-log.md`, `root-cause.md` |
| `/coverage` | Coverage analysis | `coverage-report.md`, `gaps.json` |

### Documentation Commands
| Command | Purpose | Artifact(s) |
|---------|---------|-------------|
| `/document` | Documentation generation | `README.md`, API docs, guides |
| `/explain` | Code/concept explanation | `explanation.md` |
| `/diagram` | Generate diagrams | Mermaid/PlantUML diagrams |
| `/changelog` | Generate changelog | `CHANGELOG.md` |

### Operations Commands
| Command | Purpose | Artifact(s) |
|---------|---------|-------------|
| `/deploy` | Deployment workflows | Deployment config, `deploy-notes.md` |
| `/migrate` | Migration tasks | `migration-plan.md`, migration scripts |
| `/release` | Release preparation | `release-notes.md`, version bumps |
| `/ci` | CI/CD configuration | Workflow files, `ci-config.md` |

### Meta/Management Commands
| Command | Purpose | Artifact(s) |
|---------|---------|-------------|
| `/plan` | Plan management (status, list, switch, create) | Plan files, status tracking |
| `/workflow` | Workflow orchestration (chain commands) | `workflow.yaml`, execution logs |
| `/template` | Template management | Template files |
| `/config` | Configuration management | Settings files |

## Sub-command Patterns

Each primary command can have sub-commands for variants:

```
/clarify:requirements  - Focus on requirements gathering
/clarify:scope        - Focus on scope definition
/clarify:constraints  - Focus on constraints and limitations

/analyze:security     - Security-focused analysis
/analyze:performance  - Performance-focused analysis
/analyze:architecture - Architecture-focused analysis
/analyze:quality      - Code quality analysis

/test:unit           - Unit test creation
/test:integration    - Integration test creation
/test:e2e            - End-to-end test creation
/test:run            - Run existing tests

/document:api        - API documentation
/document:user       - User guide
/document:developer  - Developer documentation
/document:architecture - Architecture docs
```

## Workflow Chains (Dynamic)

**Key Principle:** Workflows are dynamic graphs, not static pipelines. Any artifact can be used as input to any compatible command. The user chooses the path based on their needs.

**Example patterns to analyze:**

```
# TDD Flow (tests before implementation)
/clarify → requirements.json
    ↓
/test:design → test-spec.md
    ↓
/implement → code files (guided by tests)

# Traditional Flow (implementation before tests)
/clarify → requirements.json
    ↓
/implement → code files
    ↓
/test:create → test files

# Parallel Flows (multiple outputs feed multiple commands)
/clarify → requirements.json
    ├──→ /architect → architecture.md
    ├──→ /test:design → test-spec.md
    └──→ /document:spec → spec.md

# Iterative Flows (loop back based on findings)
/implement → code files
    ↓
/validate → issues found
    ↓
/fix → updated code (loops back to validate)

# Fan-in (multiple inputs to single command)
architecture.md ─┬──→ /implement
design-spec.md ──┘
```

**Questions to analyze:**
- How do commands discover available artifacts?
- How does artifact compatibility work (what can feed what)?
- How are workflow states tracked across sessions?
- How do parallel/concurrent command executions work?
- How do conditional branches work (if validation fails, do X)?

## Integration Points

### Custom Agents
- `/clarify` → Socratic questioning agent
- `/architect` → System design agent
- `/review` → Code review agent
- `/debug` → Debugging agent

### Hooks
- Pre-command: Validation, context loading
- Post-command: Artifact storage, notifications
- On-error: Logging, recovery suggestions

### Scripts
- Status tracking (`scripts/lib/status-manager.js`)
- Markdown parsing (`scripts/lib/markdown-parser.js`)
- Plan scanning (`scripts/scan-plans.js`)

## Phase 1: Discovery - Current State
- [ ] 1.1 Scan `.claude/commands/` and document all current commands with descriptions
- [ ] 1.2 Scan `docs/plan-templates/` and categorize template types
- [ ] 1.3 Scan `scripts/` and identify script capabilities
- [ ] 1.4 Review `docs/plans/` for existing plan patterns
- [ ] 1.5 Document current artifact types being created
- [ ] 1.6 Map current commands to proposed taxonomy categories
- [ ] **VERIFY 1**: Discovery findings documented in `findings/01-discovery.md`

## Phase 2: Gap Analysis
- [ ] 2.1 Compare current commands against proposed taxonomy
- [ ] 2.2 Identify missing commands in each category (Discovery, Design, Analysis, etc.)
- [ ] 2.3 Identify missing sub-commands for existing categories
- [ ] 2.4 Identify missing artifact types
- [ ] 2.5 Analyze current workflow limitations
- [ ] **VERIFY 2**: Gap analysis documented in `findings/02-gaps.md`

## Phase 3: Claude Code Features Review
- [ ] 3.1 Review custom slash commands capabilities and limitations
- [ ] 3.2 Review custom agents (`allowed_tools`, `model`, etc.)
- [ ] 3.3 Review hooks system (pre/post command, notification patterns)
- [ ] 3.4 Review MCP server integration possibilities
- [ ] 3.5 Research agent-to-agent communication patterns
- [ ] 3.6 Document best practices for each feature type
- [ ] **VERIFY 3**: Features review documented in `findings/03-features.md`

## Phase 4: Command Design - Discovery & Ideation
- [ ] 4.1 Design `/clarify` command (interactive requirements gathering)
- [ ] 4.2 Design `/explore` command (codebase exploration)
- [ ] 4.3 Design `/research` command (technology/approach research)
- [ ] 4.4 Design `/brainstorm` command (idea generation)
- [ ] 4.5 Define sub-commands for each
- [ ] 4.6 Define artifact schemas for each
- [ ] **VERIFY 4**: Discovery commands designed in `findings/04-discovery-commands.md`

## Phase 5: Command Design - Design & Architecture
- [ ] 5.1 Design `/architect` command (system architecture)
- [ ] 5.2 Design `/design` command (component design)
- [ ] 5.3 Design `/spec` command (specifications)
- [ ] 5.4 Design `/model` command (data modeling)
- [ ] 5.5 Define sub-commands for each
- [ ] 5.6 Define artifact schemas for each
- [ ] **VERIFY 5**: Design commands designed in `findings/05-design-commands.md`

## Phase 6: Command Design - Analysis & Quality
- [ ] 6.1 Design `/analyze` command and sub-commands (security, performance, quality)
- [ ] 6.2 Design `/audit` command (compliance auditing)
- [ ] 6.3 Design `/review` command (code review)
- [ ] 6.4 Design `/test` command and sub-commands (unit, integration, e2e)
- [ ] 6.5 Design `/validate` command (verification)
- [ ] 6.6 Design `/debug` command (debugging assistance)
- [ ] 6.7 Define artifact schemas for each
- [ ] **VERIFY 6**: Analysis commands designed in `findings/06-analysis-commands.md`

## Phase 7: Command Design - Implementation & Documentation
- [ ] 7.1 Design `/implement` command (code generation)
- [ ] 7.2 Design `/refactor` command (refactoring)
- [ ] 7.3 Design `/fix` command (bug fixing)
- [ ] 7.4 Design `/document` command and sub-commands (api, user, dev)
- [ ] 7.5 Design `/explain` command (code explanation)
- [ ] 7.6 Define artifact schemas for each
- [ ] **VERIFY 7**: Implementation commands designed in `findings/07-impl-commands.md`

## Phase 8: Command Design - Operations & Meta
- [ ] 8.1 Design `/deploy` command (deployment)
- [ ] 8.2 Design `/migrate` command (migrations)
- [ ] 8.3 Design `/release` command (release management)
- [ ] 8.4 Design `/plan` command (plan management - keep existing)
- [ ] 8.5 Design `/workflow` command (workflow orchestration)
- [ ] 8.6 Design `/template` command (template management)
- [ ] **VERIFY 8**: Operations commands designed in `findings/08-ops-commands.md`

## Phase 9: Dynamic Workflow Analysis
- [ ] 9.1 Analyze artifact discovery mechanisms (how commands find available inputs)
- [ ] 9.2 Analyze artifact compatibility patterns (what can feed what)
- [ ] 9.3 Analyze workflow state tracking approaches (across sessions, branches)
- [ ] 9.4 Analyze parallel/concurrent execution patterns
- [ ] 9.5 Analyze conditional branching patterns (if X fails, do Y)
- [ ] 9.6 Analyze iterative/loop patterns (validate → fix → validate)
- [ ] 9.7 Analyze fan-in patterns (multiple inputs → single command)
- [ ] 9.8 Analyze fan-out patterns (single output → multiple commands)
- [ ] 9.9 Identify common workflow templates (TDD, traditional, exploratory)
- [ ] 9.10 Analyze workflow composition (combining templates)
- [ ] **VERIFY 9**: Dynamic workflow analysis in `findings/09-workflows.md`

## Phase 10: Agent & Hook Design
- [ ] 10.1 Identify which commands benefit from custom agents
- [ ] 10.2 Design agent configurations for key commands
- [ ] 10.3 Design hook integration points (pre/post command)
- [ ] 10.4 Design notification hooks
- [ ] 10.5 Design error recovery hooks
- [ ] **VERIFY 10**: Agent/hook design in `findings/10-agents-hooks.md`

## Phase 11: Implementation Roadmap
- [ ] 11.1 Prioritize commands by value/effort
- [ ] 11.2 Define implementation phases
- [ ] 11.3 Create migration plan from current to new structure
- [ ] 11.4 Define backward compatibility strategy
- [ ] 11.5 Create detailed implementation tasks
- [ ] **VERIFY 11**: Roadmap documented in `findings/11-roadmap.md`

## Phase 12: Final Review
- [ ] 12.1 Review all findings for completeness
- [ ] 12.2 Validate against real-world use cases
- [ ] 12.3 Create executive summary
- [ ] 12.4 Compile final recommendations
- [ ] **VERIFY 12**: Final review complete

## Success Criteria
- [ ] All 12 phases completed
- [ ] Findings documented with evidence in `findings/`
- [ ] Complete command taxonomy with 30+ commands defined
- [ ] Sub-command patterns established for all major commands
- [ ] Artifact schemas defined for all command outputs
- [ ] Workflow chains documented with state transitions
- [ ] Agent configurations designed for key commands
- [ ] Hook integration points documented
- [ ] Implementation roadmap with priorities
- [ ] Migration path from current system defined
