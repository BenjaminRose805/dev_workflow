# Implementation Plan: Fix Implementation Plan Inconsistencies

## Overview

**Goal:** Systematically fix all 35 identified inconsistencies and issues across the 37 implementation plan files in `docs/plans/implement-*.md` to establish a consistent, well-structured, and maintainable plan library.

**Priority:** P0 (Foundation for all other implementation work)

**Created:** 2025-12-23

**Output:** `docs/plan-outputs/fix-implementation-plan-inconsistencies/`

**Issue Categories:**
| Category | Count | Impact |
|----------|-------|--------|
| Structural Inconsistencies | 4 | High - Template adherence |
| Dependency Issues | 4 | High - Implementation order |
| Naming Inconsistencies | 4 | Medium - Automation/discovery |
| Cross-Reference Errors | 3 | High - Missing plans |
| Priority/Ordering Issues | 3 | Medium - Sequencing |
| Missing Information | 4 | Medium - Incomplete specs |
| Overlapping Scope | 4 | High - Duplicate work |
| Technical Inconsistencies | 6 | Medium - Integration issues |
| Additional Issues | 3 | Low - Quality standards |

---

## Context: Command System Architecture

### What Are Implementation Plans?

The files in `docs/plans/implement-*.md` are **implementation plans** that describe how to build new command groups for the dev workflow system. Each plan's deliverable is a set of command files in `.claude/commands/`.

### Current Command Structure

```
.claude/
├── commands/
│   └── plan/                    # Currently the only command group
│       ├── create.md           # /plan:create - Create plan from template
│       ├── implement.md        # /plan:implement - Implement plan tasks
│       ├── status.md           # /plan:status - Show plan progress
│       ├── verify.md           # /plan:verify - Verify task completion
│       ├── batch.md            # /plan:batch - Batch task execution
│       └── ...
├── templates/
│   ├── agents/                 # Agent prompt templates
│   ├── output/                 # Output format templates
│   ├── questions/              # AskUserQuestion templates
│   └── shared/                 # Shared components (status symbols, etc.)
└── current-plan.txt            # Active plan pointer
```

### Command File Format

Each command is a markdown file with structured instructions for Claude:

```markdown
# Command Title

Brief description.

## Instructions

### 1. First Step
- What to do
- How to do it

### 2. Second Step
...

## Error Handling
...

## Example Usage
...
```

Commands reference:
- **Templates** from `.claude/templates/` for consistent output formatting
- **Scripts** from `scripts/` for helper functions (status-manager, file-utils, etc.)
- **Status tracking** via `status.json` in plan output directories

### What Each Implementation Plan Should Produce

When `implement-{command}-command.md` is executed via `/plan:implement`, it should create:

```
.claude/commands/{command}/
├── {subcommand1}.md           # First sub-command
├── {subcommand2}.md           # Second sub-command
└── ...
```

For example, `implement-explore-command.md` should produce:
```
.claude/commands/explore/
├── quick.md                   # /explore:quick
├── deep.md                    # /explore:deep
└── targeted.md                # /explore:targeted
```

### Key Patterns from Existing Commands

1. **Load Active Plan** - Commands that work with plans start by reading `.claude/current-plan.txt`
2. **Status Tracking** - Use `scripts/lib/status-manager.js` for progress tracking
3. **Template References** - Use templates for consistent UI (task selection, progress display, etc.)
4. **AskUserQuestion** - For user interaction and choices
5. **Read-Only Agents** - Task tool agents return content; main conversation writes files
6. **VERIFY Sections** - Checkpoints for validation

---

## Phase 1: Create Master Template & Standards Document

### 1.1 Analyze Best Existing Plans

**Tasks:**
- 1.1.1 Review all 37 plans and identify which ones are most complete/consistent
- 1.1.2 Extract common structural patterns from well-structured plans
- 1.1.3 Document all section types used across plans (phases, verify, success criteria, etc.)
- 1.1.4 Identify mandatory vs optional sections

**VERIFY 1.1:**
- [x] List of exemplary plans documented
- [x] All section types cataloged with frequency counts
- [x] Clear distinction between required and optional sections

### 1.2 Create Canonical Plan Template

**Tasks:**
- 1.2.1 Create `docs/plan-templates/CANONICAL-COMMAND-TEMPLATE.md` with standardized structure
- 1.2.2 Define mandatory sections: Overview, Dependencies, Phases, Success Criteria, Risks
- 1.2.3 Standardize phase naming: "Phase N: [Name]" with optional "N.M" subsections
- 1.2.4 Standardize VERIFY format: "**VERIFY Phase N:**" with checkbox list
- 1.2.5 Define artifact output directory convention: `docs/plan-outputs/{plan-name}/`
- 1.2.6 Add template variables with `{{variable}}` syntax

**VERIFY 1.2:**
- [x] Template covers all necessary sections
- [x] Phase and subsection naming is unambiguous
- [x] VERIFY sections have consistent format
- [x] Output directory convention is clear

### 1.3 Create Standards Document

**Tasks:**
- 1.3.1 Create `docs/standards/implementation-plan-standards.md`
- 1.3.2 Document naming conventions for:
  - Sub-commands (colon notation: `/command:subcommand`)
  - Model identifiers (short form: `sonnet`, `opus`, `haiku`)
  - Artifact types (kebab-case: `validation-report`)
  - Severity levels (lowercase: `critical`, `high`, `medium`, `low`, `info`)
- 1.3.3 Define priority levels: P0 (critical path), P1 (important), P2 (enhancement)
- 1.3.4 Document quality targets: test coverage (>85%), performance baselines
- 1.3.5 Create artifact schema reference section
- 1.3.6 Add decision log template for ADRs

**VERIFY 1.3:**
- [x] All naming conventions documented with examples
- [x] Priority level definitions are clear
- [x] Quality targets are consistent and measurable
- [x] Standards document is comprehensive

---

## Phase 2: Create Missing Plans

### 2.1 Create implement-command.md

**Tasks:**
- 2.1.1 Create `docs/plans/implement-implement-command.md` using canonical template
- 2.1.2 Define `/implement` command scope: code generation from specs/designs
- 2.1.3 Document sub-commands: `implement:component`, `implement:feature`, `implement:fix`
- 2.1.4 Specify artifact consumption from `/design`, `/spec`, `/architect`
- 2.1.5 Define output artifacts: implementation files, change summary
- 2.1.6 Add integration points with `/test`, `/validate`, `/review`

**VERIFY 2.1:**
- [x] Plan follows canonical template exactly
- [x] Dependencies on upstream commands documented
- [x] All sub-commands have clear scope
- [x] Integration points are explicit

### 2.2 Create implement-migrate-command.md (if missing)

**Tasks:**
- 2.2.1 Create `docs/plans/implement-migrate-command.md` using canonical template
- 2.2.2 Define `/migrate` command scope: codebase migrations, upgrades
- 2.2.3 Document sub-commands: `migrate:dependency`, `migrate:framework`, `migrate:api`
- 2.2.4 Specify artifact consumption and production
- 2.2.5 Define rollback and verification strategies
- 2.2.6 Add integration with `/validate`, `/test`

**VERIFY 2.2:**
- [x] Plan follows canonical template
- [x] Migration scope is well-defined
- [x] Rollback strategies documented
- [x] Integration points explicit

### 2.3 Create implement-release-command.md (if missing)

**Tasks:**
- 2.3.1 Create `docs/plans/implement-release-command.md` using canonical template
- 2.3.2 Define `/release` command scope: versioning, changelog, publishing
- 2.3.3 Document sub-commands: `release:prepare`, `release:publish`, `release:rollback`
- 2.3.4 Specify integration with git, npm, changelog generation
- 2.3.5 Define artifact outputs: CHANGELOG.md updates, version bumps
- 2.3.6 Add integration with `/validate`, `/deploy`

**VERIFY 2.3:**
- [x] Plan follows canonical template
- [x] Release workflow is complete
- [x] All sub-commands documented
- [x] Integration points explicit

---

## Phase 3: Fix Structural Inconsistencies

### 3.1 Standardize Phase Structure

**Tasks:**
- 3.1.1 Update all plans to use "Phase N: [Descriptive Name]" format
- 3.1.2 Standardize subsection format to "N.M [Subsection Name]" where needed
- 3.1.3 Ensure all phases have Tasks and VERIFY sections
- 3.1.4 Remove inconsistent phase naming (e.g., "Phase 1.1" at top level)

**Subtasks:**
- [x] 3.1.A Core development commands: implement-explore-command.md, implement-clarify-command.md, implement-fix-command.md, implement-refactor-command.md, implement-debug-command.md
- [x] 3.1.B Quality & analysis commands: implement-analyze-command.md, implement-review-command.md, implement-audit-command.md, implement-validate-command.md, implement-test-command.md
- [x] 3.1.C Architecture & docs commands: implement-architect-command.md, implement-design-command.md, implement-spec-command.md, implement-document-command.md, implement-explain-command.md
- [x] 3.1.D Planning & creation commands: implement-research-command.md, implement-brainstorm-command.md, implement-model-command.md, implement-implement-command.md, implement-template-command.md
- [x] 3.1.E Workflow commands: implement-workflow-command.md, implement-workflow-loops.md, implement-workflow-branching.md, implement-workflow-composition.md, implement-fan-in-fan-out.md
- [x] 3.1.F Deploy & infrastructure: implement-deploy-command.md, implement-migrate-command.md, implement-release-command.md, implement-artifact-registry.md, implement-error-recovery-hooks.md
- [x] 3.1.G Agent implementations: implement-explore-agent.md, implement-analyze-agent.md, implement-review-agent.md, implement-debug-agent.md
- [x] 3.1.H Deploy agent & hooks: implement-deploy-agent.md, implement-context-loading-hook.md, implement-artifact-storage-hook.md, implement-notification-hooks.md

**VERIFY 3.1:**
- [ ] All plans use consistent phase naming
- [ ] Subsections use consistent numbering
- [ ] Every phase has Tasks and VERIFY sections

### 3.2 Add Missing Required Sections

**Tasks:**
- 3.2.1 Add "Dependencies" section to plans missing it
- 3.2.2 Add "Risks" section to plans missing it
- 3.2.3 Add "Success Criteria" section to plans missing it (already complete - 0 plans missing)
- 3.2.4 Ensure all plans have Overview with Priority, Created, Output fields

**Subtasks:**
- [x] 3.2.A Core development commands: implement-explore-command.md, implement-fix-command.md, implement-refactor-command.md, implement-debug-command.md (add Dependencies & Risks)
- [x] 3.2.B Quality & analysis commands: implement-analyze-command.md, implement-review-command.md, implement-audit-command.md, implement-validate-command.md, implement-test-command.md (add Dependencies & Risks)
- [x] 3.2.C Architecture & docs commands: implement-architect-command.md, implement-design-command.md, implement-spec-command.md, implement-document-command.md, implement-explain-command.md (add Dependencies & Risks)
- [x] 3.2.D Remaining commands with partial sections: implement-clarify-command.md (add Risks only - Dependencies exists)
- [x] 3.2.E Verify Overview completeness across all 38 plans (Priority, Created, Output fields)
- [x] 3.2.F Standardize Overview format in 6 plans to use bullet-point style (implement-deploy-command.md, implement-fix-command.md, implement-migrate-command.md, implement-refactor-command.md, implement-release-command.md, implement-template-command.md)

**Files to update (12 missing Dependencies, 15 missing Risks):**
- Core: implement-explore-command.md, implement-fix-command.md, implement-refactor-command.md, implement-debug-command.md
- Quality: implement-analyze-command.md, implement-review-command.md, implement-audit-command.md, implement-validate-command.md, implement-test-command.md
- Arch/Docs: implement-architect-command.md, implement-design-command.md, implement-spec-command.md, implement-document-command.md, implement-explain-command.md
- Risks only: implement-clarify-command.md

**VERIFY 3.2:**
- [ ] All plans have Dependencies section
- [ ] All plans have Risks section
- [ ] All plans have Success Criteria
- [ ] All plans have complete Overview

### 3.3 Standardize VERIFY Sections

**Tasks:**
- 3.3.1 Update all VERIFY sections to use format: "**VERIFY Phase N:**"
- 3.3.2 Convert all verification items to checkbox format: "- [ ] Description"
- 3.3.3 Ensure VERIFY items are specific and measurable
- 3.3.4 Remove inconsistent formats (inline VERIFY, numbered VERIFY, etc.)

**VERIFY 3.3:**
- [ ] All VERIFY sections use consistent format
- [ ] All items are checkboxes
- [ ] Items are specific and testable

### 3.4 Standardize Output Directory Specifications

**Tasks:**
- 3.4.1 Add/update Output field in all plans to use `docs/plan-outputs/{plan-name}/`
- 3.4.2 Ensure artifact paths are consistent with output directory
- 3.4.3 Document subdirectory structure where applicable

**VERIFY 3.4:**
- [ ] All plans specify output directory
- [ ] Output paths follow convention
- [ ] Artifact paths are relative to output directory

---

## Phase 4: Fix Naming Inconsistencies

### 4.1 Standardize Sub-Command Naming

**Tasks:**
- 4.1.1 Update all sub-command references to use colon notation: `/command:subcommand`
- 4.1.2 Remove space-separated sub-command references
- 4.1.3 Create sub-command naming reference table
- 4.1.4 Verify consistency across all 37 plans

**VERIFY 4.1:**
- [ ] All sub-commands use colon notation
- [ ] No space-separated sub-commands remain
- [ ] Reference table created

### 4.2 Standardize Model Identifiers

**Tasks:**
- 4.2.1 Update all model references to use short form: `sonnet`, `opus`, `haiku`
- 4.2.2 Remove full model IDs (e.g., `claude-opus-4-5-20251101`)
- 4.2.3 Add model selection rationale comments where helpful
- 4.2.4 Document model selection guidelines in standards

**VERIFY 4.2:**
- [ ] All model references use short form
- [ ] No full model IDs remain
- [ ] Model selection rationale documented

### 4.3 Standardize Artifact Type Names

**Tasks:**
- 4.3.1 Update all artifact types to use kebab-case: `validation-report`, `architecture-document`
- 4.3.2 Remove snake_case artifact types
- 4.3.3 Create artifact type registry/reference
- 4.3.4 Ensure consistency in YAML frontmatter references

**VERIFY 4.3:**
- [ ] All artifact types use kebab-case
- [ ] No snake_case artifact types remain
- [ ] Artifact type registry created

### 4.4 Standardize Severity Classifications

**Tasks:**
- 4.4.1 Define canonical severity levels: `critical`, `high`, `medium`, `low`, `info`
- 4.4.2 Update implement-analyze-command.md to use standard levels
- 4.4.3 Update implement-audit-command.md to use standard levels
- 4.4.4 Update implement-validate-command.md to use standard levels
- 4.4.5 Update implement-review-command.md to use standard levels
- 4.4.6 Add severity level definitions to standards document

**VERIFY 4.4:**
- [ ] All plans use same severity levels
- [ ] Severity definitions documented
- [ ] Mapping between old/new levels documented

---

## Phase 5: Fix Dependency & Cross-Reference Issues

### 5.1 Create Dependency Graph

**Tasks:**
- 5.1.1 Create `docs/architecture/command-dependency-graph.md`
- 5.1.2 Map all upstream dependencies for each command
- 5.1.3 Map all downstream consumers for each command
- 5.1.4 Identify and document circular dependency concerns
- 5.1.5 Create Mermaid diagram showing dependency relationships
- 5.1.6 Define implementation order based on dependencies

**VERIFY 5.1:**
- [ ] Dependency graph covers all 37 plans
- [ ] Circular dependencies identified
- [ ] Implementation order is clear
- [ ] Mermaid diagram renders correctly

### 5.2 Add Dependency Sections to All Plans

**Tasks:**
- 5.2.1 Add explicit Dependencies section to all plans
- 5.2.2 List upstream command dependencies (what this command consumes)
- 5.2.3 List downstream command dependencies (what consumes this command's output)
- 5.2.4 List external tool dependencies (redocly, AJV, etc.)
- 5.2.5 Add version requirements where applicable

**VERIFY 5.2:**
- [ ] All plans have Dependencies section
- [ ] Upstream dependencies listed
- [ ] Downstream dependencies listed
- [ ] External tools documented with versions

### 5.3 Fix Cross-Command Artifact References

**Tasks:**
- 5.3.1 Create artifact compatibility matrix
- 5.3.2 Ensure `/architect` output format matches `/design` expected input
- 5.3.3 Ensure `/design` output format matches `/spec` expected input
- 5.3.4 Ensure `/spec` output format matches `/implement` expected input
- 5.3.5 Document artifact schemas in each producing command's plan
- 5.3.6 Add artifact consumption notes in each consuming command's plan

**VERIFY 5.3:**
- [ ] Artifact formats are compatible across command chain
- [ ] Schemas documented in producer plans
- [ ] Consumption documented in consumer plans

### 5.4 Fix Invalid Plan References

**Tasks:**
- 5.4.1 Audit all cross-plan references in each plan
- 5.4.2 Update references to non-existent plans (now created in Phase 2)
- 5.4.3 Fix incorrect file paths in references
- 5.4.4 Add ADR references where decisions need documentation
- 5.4.5 Verify all linked plans exist

**VERIFY 5.4:**
- [ ] All plan references point to existing files
- [ ] File paths are correct
- [ ] ADR references added where needed

---

## Phase 6: Fix Priority & Ordering Issues

### 6.1 Review and Align Priority Assignments

**Tasks:**
- 6.1.1 Create priority assignment matrix based on dependencies
- 6.1.2 Ensure foundation commands are P0 (artifact-registry, error-recovery-hooks)
- 6.1.3 Ensure dependent commands have >= priority of their dependencies
- 6.1.4 Resolve conflicts (e.g., P0 depending on P1)
- 6.1.5 Document priority rationale

**Current conflicts to resolve:**
- `/artifact-registry` (P0) needs `/error-recovery-hooks` (P1)
- `/workflow-branching` (P0) references `/workflow-loops` (P1)
- `/validate` (P0) requires `/analyze` (P0) - no clear ordering

**VERIFY 6.1:**
- [ ] No P0 commands depend on P1+ commands
- [ ] Dependencies have lower or equal priority numbers
- [ ] Priority rationale documented

### 6.2 Define Implementation Phases

**Tasks:**
- 6.2.1 Create `docs/architecture/implementation-roadmap.md`
- 6.2.2 Define Wave 1: Foundation (artifact-registry, error-recovery-hooks)
- 6.2.3 Define Wave 2: Core Commands (explore, clarify, analyze)
- 6.2.4 Define Wave 3: Workflow Commands (design, architect, spec)
- 6.2.5 Define Wave 4: Execution Commands (implement, test, validate)
- 6.2.6 Define Wave 5: Advanced Features (workflows, agents, hooks)

**VERIFY 6.2:**
- [ ] All 37 plans assigned to a wave
- [ ] Wave ordering respects dependencies
- [ ] Roadmap is actionable

### 6.3 Standardize Sub-Command Priorities

**Tasks:**
- 6.3.1 Add explicit priority to all sub-commands within each plan
- 6.3.2 Ensure sub-command priorities respect internal dependencies
- 6.3.3 Document which sub-commands are MVP vs enhancement

**VERIFY 6.3:**
- [ ] All sub-commands have explicit priority
- [ ] Internal dependencies respected
- [ ] MVP scope is clear

---

## Phase 7: Resolve Overlapping Scope

### 7.1 Clarify Analysis Command Boundaries

**Tasks:**
- 7.1.1 Define `/analyze` scope: automated static analysis, metrics, patterns
- 7.1.2 Define `/review` scope: AI-powered code review, suggestions
- 7.1.3 Define `/audit` scope: compliance, security policy, regulatory
- 7.1.4 Update implement-analyze-command.md with clear boundaries
- 7.1.5 Update implement-review-command.md with clear boundaries
- 7.1.6 Update implement-audit-command.md with clear boundaries
- 7.1.7 Create command selection guide for users

**Proposed boundaries:**
| Command | Primary Focus | OWASP Handling |
|---------|--------------|----------------|
| /analyze | Metrics, patterns, static analysis | Basic security metrics |
| /review | Code quality, suggestions, best practices | Security review suggestions |
| /audit | Compliance, policy enforcement | Full OWASP audit with compliance mapping |

**VERIFY 7.1:**
- [ ] Clear non-overlapping boundaries defined
- [ ] OWASP responsibility assigned to one command
- [ ] Selection guide created
- [ ] All three plans updated

### 7.2 Clarify Architecture Command Boundaries

**Tasks:**
- 7.2.1 Define `/refactor` scope: code-level structural changes
- 7.2.2 Define `/design` scope: component-level design decisions
- 7.2.3 Define `/architect` scope: system-level architecture
- 7.2.4 Update plans with clear boundaries and handoff points
- 7.2.5 Document when to use each command

**Proposed boundaries:**
| Command | Scope | Artifacts |
|---------|-------|-----------|
| /refactor | Function/class level | Refactoring plan, before/after |
| /design | Component/module level | Component specs, interfaces |
| /architect | System/service level | Architecture docs, C4 diagrams |

**VERIFY 7.2:**
- [ ] Clear scope hierarchy defined
- [ ] Handoff points documented
- [ ] Usage guide created

### 7.3 Clarify Documentation Command Boundaries

**Tasks:**
- 7.3.1 Define `/document` scope: comprehensive documentation generation
- 7.3.2 Define `/explain` scope: focused explanations for understanding
- 7.3.3 Define `/architect` documentation output: architecture-specific docs only
- 7.3.4 Update plans with clear boundaries
- 7.3.5 Document source-of-truth for each doc type

**VERIFY 7.3:**
- [ ] Documentation responsibilities clear
- [ ] No duplicate generation
- [ ] Source-of-truth defined for each artifact type

### 7.4 Clarify Quality Verification Boundaries

**Tasks:**
- 7.4.1 Define `/test` scope: test generation and execution
- 7.4.2 Define `/validate` scope: build, type, lint verification
- 7.4.3 Define `/review` quality checks: subjective quality assessment
- 7.4.4 Define `/audit` quality checks: policy compliance only
- 7.4.5 Update all four plans with clear boundaries

**VERIFY 7.4:**
- [ ] Quality check responsibilities assigned
- [ ] No duplicate checks
- [ ] Clear escalation path between commands

---

## Phase 8: Fix Technical Inconsistencies

### 8.1 Standardize Artifact Discovery

**Tasks:**
- 8.1.1 Define canonical artifact discovery pattern
- 8.1.2 Update `/architect` artifact discovery to use pattern
- 8.1.3 Update `/design` artifact discovery to use pattern
- 8.1.4 Update `/document` artifact discovery to use pattern
- 8.1.5 Document discovery pattern in standards

**VERIFY 8.1:**
- [ ] All commands use same discovery pattern
- [ ] Pattern is documented
- [ ] Edge cases handled consistently

### 8.2 Standardize Diagram Generation

**Tasks:**
- 8.2.1 Define Mermaid diagram style guide
- 8.2.2 Standardize C4 diagram syntax for architecture
- 8.2.3 Standardize flow diagram syntax for processes
- 8.2.4 Update all diagram-generating commands
- 8.2.5 Create diagram template library

**VERIFY 8.2:**
- [ ] Diagram style guide created
- [ ] All commands use consistent syntax
- [ ] Templates available for common diagrams

### 8.3 Standardize Input Validation

**Tasks:**
- 8.3.1 Define input validation strategy (AskUserQuestion vs context analysis)
- 8.3.2 Update `/clarify` to use standard approach
- 8.3.3 Update `/brainstorm` to use standard approach
- 8.3.4 Update `/design` to use standard approach
- 8.3.5 Document validation strategy in standards

**VERIFY 8.3:**
- [ ] Input validation strategy documented
- [ ] All interactive commands use consistent approach
- [ ] User experience is consistent

### 8.4 Standardize Model Selection

**Tasks:**
- 8.4.1 Define model selection criteria (capability vs cost vs speed)
- 8.4.2 Create model selection guide:
  - Opus: complex reasoning, creative tasks
  - Sonnet: balanced capability/cost (default)
  - Haiku: simple tasks, listings, formatting
- 8.4.3 Review and update model assignments in all plans
- 8.4.4 Document rationale for non-default model choices

**VERIFY 8.4:**
- [ ] Model selection criteria documented
- [ ] All plans have appropriate model assignments
- [ ] Rationale documented for Opus usage

### 8.5 Standardize Quality Gates

**Tasks:**
- 8.5.1 Define quality gate schema:
  ```yaml
  gates:
    critical: 0
    high: 5
    medium: 20
    coverage: 85
  ```
- 8.5.2 Update `/validate` to use standard schema
- 8.5.3 Update `/audit` to use standard schema
- 8.5.4 Update `/artifact-registry` integrity checks
- 8.5.5 Document quality gate configuration

**VERIFY 8.5:**
- [ ] Quality gate schema defined
- [ ] All commands use same schema
- [ ] Configuration is documented

### 8.6 Standardize Performance Targets

**Tasks:**
- 8.6.1 Define performance target categories:
  - Quick: <30s (simple operations)
  - Standard: <2min (typical operations)
  - Deep: <10min (comprehensive analysis)
- 8.6.2 Update all plans with consistent targets
- 8.6.3 Add performance target to each sub-command
- 8.6.4 Document performance expectations

**VERIFY 8.6:**
- [ ] Performance categories defined
- [ ] All plans use consistent categories
- [ ] Sub-commands have performance targets

---

## Phase 9: Fix Additional Issues

### 9.1 Standardize Test Coverage Targets

**Tasks:**
- 9.1.1 Define standard test coverage target: >85%
- 9.1.2 Update all plans to use consistent target
- 9.1.3 Document exceptions with rationale (e.g., higher for critical components)

**VERIFY 9.1:**
- [ ] Standard coverage target documented
- [ ] All plans updated
- [ ] Exceptions documented

### 9.2 Complete Artifact Schemas

**Tasks:**
- 9.2.1 Create `docs/schemas/` directory for formal JSON schemas
- 9.2.2 Create schema for `requirements.json` (from /clarify)
- 9.2.3 Create schema for `components.json` (from /architect)
- 9.2.4 Create schema for `validation-report.json` (from /validate)
- 9.2.5 Create schema for `analysis-report.json` (from /analyze)
- 9.2.6 Reference schemas in producing command plans

**VERIFY 9.2:**
- [ ] Schemas directory created
- [ ] Core artifact schemas defined
- [ ] Schemas referenced in plans

### 9.3 Complete Configuration Specifications

**Tasks:**
- 9.3.1 Create `.claude/config-schema.json` for command configuration
- 9.3.2 Define configuration schema for each command type
- 9.3.3 Update plans to reference configuration schemas
- 9.3.4 Document configuration options

**VERIFY 9.3:**
- [ ] Config schema created
- [ ] All commands have config documentation
- [ ] Schemas are valid and complete

---

## Phase 10: Validation & Documentation

### 10.1 Validate All Plans

**Tasks:**
- 10.1.1 Create validation script to check plan format compliance
- 10.1.2 Run validation against all 37 plans
- 10.1.3 Fix any remaining format issues
- 10.1.4 Verify all cross-references are valid
- 10.1.5 Verify all dependencies are documented

**VERIFY 10.1:**
- [ ] Validation script created
- [ ] All plans pass validation
- [ ] No broken references
- [ ] All dependencies documented

### 10.2 Create Summary Documentation

**Tasks:**
- 10.2.1 Update `docs/plans/README.md` with plan index
- 10.2.2 Create command quick-reference table
- 10.2.3 Document plan template usage
- 10.2.4 Add troubleshooting guide for common issues

**VERIFY 10.2:**
- [ ] README updated
- [ ] Quick reference complete
- [ ] Template usage documented

### 10.3 Archive Analysis Findings

**Tasks:**
- 10.3.1 Save original analysis to `docs/plan-outputs/fix-implementation-plan-inconsistencies/original-analysis.md`
- 10.3.2 Document all changes made
- 10.3.3 Create before/after comparison
- 10.3.4 Document lessons learned

**VERIFY 10.3:**
- [ ] Analysis archived
- [ ] Changes documented
- [ ] Lessons learned captured

---

## Success Criteria

### Structural Consistency
- [ ] All 37+ plans follow canonical template
- [ ] All plans have required sections: Overview, Dependencies, Phases, Success Criteria, Risks
- [ ] All VERIFY sections use consistent format
- [ ] All output directories follow convention

### Naming Consistency
- [ ] All sub-commands use colon notation
- [ ] All model references use short form
- [ ] All artifact types use kebab-case
- [ ] All severity levels use standard definitions

### Dependency Clarity
- [ ] Dependency graph complete and accurate
- [ ] All plans have explicit Dependencies section
- [ ] No circular dependencies
- [ ] Implementation order is clear

### Scope Clarity
- [ ] No overlapping responsibilities between commands
- [ ] Clear boundaries documented for each command
- [ ] User selection guides available

### Technical Consistency
- [ ] Artifact discovery uses standard pattern
- [ ] Diagram generation uses standard styles
- [ ] Model selection follows documented criteria
- [ ] Quality gates use standard schema
- [ ] Performance targets use standard categories

### Documentation Completeness
- [ ] Standards document complete
- [ ] Dependency graph complete
- [ ] Implementation roadmap complete
- [ ] All artifact schemas defined

---

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Scope creep during updates | High | Focus on consistency, not content improvement |
| Breaking existing workflows | Medium | Document all changes, maintain backwards compatibility |
| Missed inconsistencies | Medium | Use automated validation script |
| Disagreement on standards | Medium | Document rationale, allow for exceptions with justification |

---

## Dependencies

### Upstream
- None (this is a cleanup task)

### Downstream
- All implementation plans depend on this cleanup being complete
- Future plan creation will use the canonical template
- Automation tools will depend on consistent format

### External Tools
- Markdown linter for validation
- Grep/sed for bulk updates (with manual review)

---

## Notes

This plan addresses all 35 issues identified in the analysis:
- 4 structural inconsistencies
- 4 dependency issues
- 4 naming inconsistencies
- 3 cross-reference errors
- 3 priority/ordering issues
- 4 missing information issues
- 4 overlapping scope issues
- 6 technical inconsistencies
- 3 additional issues

The phases are ordered to build upon each other:
1. First establish standards (Phases 1)
2. Then create missing plans (Phase 2)
3. Then apply standards to existing plans (Phases 3-9)
4. Finally validate everything (Phase 10)
