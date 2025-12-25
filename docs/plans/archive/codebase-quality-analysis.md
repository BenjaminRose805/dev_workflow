# Implementation Plan: Codebase Quality Analysis

## Overview

- **Goal:** Comprehensive multi-agent analysis for DRY violations, inconsistencies, bugs, and unused code
- **Priority:** P1
- **Created:** 2025-12-23
- **Output:** `docs/plan-outputs/codebase-quality-analysis/`

## Description

A reusable, parallelized codebase analysis system that deploys specialized sub-agents to analyze different functional areas and concern types. The plan uses a hybrid matrix strategy:

1. **Phase 1**: Directory-scoped functional analysis (maximum parallelism)
2. **Phase 2**: Cross-cutting concern synthesis (consolidation)
3. **Phase 3**: Actionable recommendations generation

This design enables 9+ concurrent agents while minimizing overlap and maximizing coverage.

---

## Dependencies

### Upstream
- None (standalone analysis)

### Downstream
- Refactoring plans consume analysis findings
- DRY consolidation plans consume duplication reports
- Bug fix plans consume bug reports

### External Tools
- Claude Code CLI (for sub-agent spawning)

---

## Agent Partitioning Strategy

### Matrix Design

```
                    │ scripts/    │ docs/       │ .claude/
────────────────────┼─────────────┼─────────────┼─────────────
Status/Orchestration│ Agent S1    │      -      │      -
Research/Verification│ Agent S2   │      -      │      -
Plan Management     │ Agent S3    │      -      │      -
Caching/Utils       │ Agent S4    │      -      │      -
────────────────────┼─────────────┼─────────────┼─────────────
Core Documentation  │      -      │ Agent D1    │      -
Standards/Templates │      -      │ Agent D2    │      -
Plans & Outputs     │      -      │ Agent D3    │      -
────────────────────┼─────────────┼─────────────┼─────────────
Commands            │      -      │      -      │ Agent C1
Templates/Shared    │      -      │      -      │ Agent C2
────────────────────┴─────────────┴─────────────┴─────────────
```

### Agent Spawn Groups

**Group A - Scripts (4 agents, parallel)**
- S1: status-cli.js, plan-orchestrator.js, plan-output-utils.js, status-manager.js, timestamp-utils.js
- S2: research-for-implement.js, verify-with-agent.js, agent-launcher.js, agent-pool.js, agent-cache.js, parallel-agents.js
- S3: scan-plans.js, parse-plan-structure.js, migrate-completed-plan.js, markdown-parser.js, frontmatter-parser.js
- S4: cache-clear.js, cache-stats.js, check-file-status.js, file-utils.js, substitute-variables.js, benchmark.js, index.js

**Group B - Docs (3 agents, parallel)**
- D1: ARCHITECTURE.md, ORCHESTRATOR.md, implementation-plans.md, architecture/, claude-commands/
- D2: standards/*.md, plan-templates/*.md
- D3: plans/*.md, plan-outputs/*, plan-system/*, completed plans/

**Group C - .claude (2 agents, parallel)**
- C1: commands/plan/*.md (all 12 command files)
- C2: templates/agents/*.md, templates/shared/*.md, templates/questions/*.md, templates/output/*.md

---

## Phase 1: Functional Group Analysis

**Objective:** Deploy 9 parallel agents to analyze functional groups within each directory.

**Tasks:**
- [ ] 1.1 Run Agent S1: Analyze scripts Status & Orchestration subsystem (status-cli.js, plan-orchestrator.js, plan-output-utils.js, status-manager.js, timestamp-utils.js) for DRY violations, race conditions, inconsistent error handling, unused exports, lock management issues
- [ ] 1.2 Run Agent S2: Analyze scripts Research & Verification subsystem (research-for-implement.js, verify-with-agent.js, parallel-research-pipeline.js, agent-launcher.js, agent-pool.js, agent-cache.js, parallel-agents.js) for duplicated agent invocation, cache key consistency, resource leaks, JSON schema inconsistencies, uncaught promises
- [ ] 1.3 Run Agent S3: Analyze scripts Plan Management subsystem (scan-plans.js, parse-plan-structure.js, migrate-completed-plan.js, scan-completed-plans.js, markdown-parser.js, frontmatter-parser.js) for duplicated parsing logic, markdown extraction consistency, task ID handling, frontmatter edge cases, unused utilities
- [ ] 1.4 Run Agent S4: Analyze scripts Caching & Utilities subsystem (cache-clear.js, cache-stats.js, check-file-status.js, substitute-variables.js, benchmark.js, index.js, file-utils.js) for duplicated CLI parsing (11+ copies known), duplicated helpers, file I/O consistency, unused functions, path handling issues
- [ ] 1.5 Run Agent D1: Analyze docs Core Documentation (ARCHITECTURE.md, ORCHESTRATOR.md, implementation-plans.md, architecture/, claude-commands/) for outdated content, broken links, content duplication, terminology inconsistencies, orphaned docs
- [ ] 1.6 Run Agent D2: Analyze docs Standards & Templates (standards/*.md, plan-templates/*.md) for duplicated standards content, broken references, template-standards consistency, conflicting conventions, unused templates
- [ ] 1.7 Run Agent D3: Analyze docs Plans & Outputs (plans/*.md, plan-outputs/, plan-system/, completed plans/) for duplicated plan sections, inconsistent structures, orphaned outputs, status.json consistency, abandoned plans
- [ ] 1.8 Run Agent C1: Analyze .claude Commands (commands/plan/*.md - all 12 files) for duplicated instruction sections (Load Active Plan in 11 files, argument parsing in 6 files, status.json integration in 9 files), inconsistent structures, broken references, error handling gaps, unused commands
- [ ] 1.9 Run Agent C2: Analyze .claude Templates (templates/agents/*.md, templates/shared/*.md, templates/questions/*.md, templates/output/*.md) for duplicated constraint sections, repeated status symbols, invalid Handlebars syntax, template variable consistency, unused templates

**VERIFY Phase 1:**
- [ ] 1.10 Verify all 9 agents completed successfully
- [ ] 1.11 Verify each agent produced structured findings report
- [ ] 1.12 Save findings to docs/plan-outputs/codebase-quality-analysis/findings/

---

## Phase 2: Cross-Cutting Concern Synthesis

**Objective:** Consolidate Phase 1 findings into concern-specific reports.

**Tasks:**
- [ ] 2.1 Synthesize DRY Violations: Aggregate from all Phase 1 agents, identify cross-directory duplications, prioritize by extraction value, generate recommendations → findings/dry-violations-consolidated.md
- [ ] 2.2 Synthesize Bugs & Issues: Aggregate from all Phase 1 agents, categorize by severity, identify patterns across directories, generate prioritized fix list → findings/bugs-consolidated.md
- [ ] 2.3 Synthesize Inconsistencies: Aggregate from all Phase 1 agents, identify conflicting conventions, propose standardization approach, generate recommendations → findings/inconsistencies-consolidated.md
- [ ] 2.4 Synthesize Unused Code: Aggregate from all Phase 1 agents, verify cross-references, categorize by removal safety, generate cleanup recommendations → findings/unused-code-consolidated.md

**VERIFY Phase 2:**
- [ ] 2.5 Verify all 4 consolidated reports generated
- [ ] 2.6 Verify cross-directory patterns identified
- [ ] 2.7 Verify prioritization is consistent

---

## Phase 3: Recommendations & Action Items

**Objective:** Generate actionable improvement recommendations.

**Tasks:**
- [ ] 3.1 Generate Extraction Candidates: List shared utility extractions, estimate LOC saved, identify dependencies and order, create implementation stubs → findings/extraction-candidates.md
- [ ] 3.2 Generate Bug Fix Plan: Create prioritized list, estimate complexity, identify test needs, generate implementation notes → findings/bug-fix-plan.md
- [ ] 3.3 Generate Consistency Plan: Define target conventions, list files requiring updates, estimate migration effort, create checklist → findings/consistency-plan.md
- [ ] 3.4 Generate Cleanup Plan: List safe-to-remove code, identify deprecation candidates, create removal order, generate cleanup scripts → findings/cleanup-plan.md
- [ ] 3.5 Generate Executive Summary: Summarize key findings, calculate technical debt metrics, prioritize top 10 action items, create final report → findings/executive-summary.md

**VERIFY Phase 3:**
- [ ] 3.6 Verify all 5 output documents generated
- [ ] 3.7 Verify action items are specific and actionable
- [ ] 3.8 Verify prioritization aligns with impact

---

## Agent Prompt Templates

### Agent S1 Prompt (Status & Orchestration)
```
Analyze the status and orchestration subsystem in scripts/.

Files to analyze:
- scripts/status-cli.js
- scripts/plan-orchestrator.js
- scripts/lib/plan-output-utils.js
- scripts/lib/status-manager.js
- scripts/lib/timestamp-utils.js

Check for:
1. DRY VIOLATIONS: Duplicate functions, repeated patterns, copy-pasted code
2. BUGS: Race conditions, null checks, exception handling, lock issues
3. INCONSISTENCIES: Naming conventions, return patterns, error formats
4. UNUSED CODE: Dead functions, unreferenced exports, orphaned code

Output format: Group findings by category with file:line references.
```

### Agent S2 Prompt (Research & Verification)
```
Analyze the research and verification subsystem in scripts/.

Files to analyze:
- scripts/research-for-implement.js
- scripts/verify-with-agent.js
- scripts/parallel-research-pipeline.js
- scripts/lib/agent-launcher.js
- scripts/lib/agent-pool.js
- scripts/lib/agent-cache.js
- scripts/lib/parallel-agents.js

Check for:
1. DRY VIOLATIONS: Duplicate agent launch logic, repeated parsing
2. BUGS: Promise handling, resource cleanup, timeout handling
3. INCONSISTENCIES: Output schemas, caching strategies, error propagation
4. UNUSED CODE: Orphaned functions, dead code paths

Output format: Group findings by category with file:line references.
```

### Agent S3 Prompt (Plan Management)
```
Analyze the plan management subsystem in scripts/.

Files to analyze:
- scripts/scan-plans.js
- scripts/parse-plan-structure.js
- scripts/migrate-completed-plan.js
- scripts/scan-completed-plans.js
- scripts/lib/markdown-parser.js
- scripts/lib/frontmatter-parser.js

Check for:
1. DRY VIOLATIONS: Duplicate parsing, repeated plan discovery logic
2. BUGS: Regex edge cases, null handling, malformed input handling
3. INCONSISTENCIES: Task ID formats, phase numbering, output structures
4. UNUSED CODE: Orphaned parsing functions, dead code

Output format: Group findings by category with file:line references.
```

### Agent S4 Prompt (Caching & Utilities)
```
Analyze the caching and utilities subsystem in scripts/.

Files to analyze:
- scripts/cache-clear.js
- scripts/cache-stats.js
- scripts/check-file-status.js
- scripts/substitute-variables.js
- scripts/benchmark.js
- scripts/index.js
- scripts/lib/file-utils.js

Check for:
1. DRY VIOLATIONS: Duplicate parseArgs(), verbose(), exitWithError() functions
2. BUGS: Path handling, file existence checks, input validation
3. INCONSISTENCIES: CLI interfaces, output formats, error messages
4. UNUSED CODE: Dead utility functions, unreachable code

Output format: Group findings by category with file:line references.
```

### Agent D1 Prompt (Core Documentation)
```
Analyze the core documentation in docs/.

Files to analyze:
- docs/ARCHITECTURE.md
- docs/ORCHESTRATOR.md
- docs/implementation-plans.md
- docs/architecture/*.md
- docs/claude-commands/*.md

Check for:
1. DRY VIOLATIONS: Duplicated content, repeated explanations
2. BUGS/ISSUES: Broken links, outdated information, incorrect examples
3. INCONSISTENCIES: Terminology, formatting, structure
4. UNUSED/ORPHANED: Docs for removed features, unreferenced docs

Output format: Group findings by category with file:line references.
```

### Agent D2 Prompt (Standards & Templates)
```
Analyze the standards and templates in docs/.

Files to analyze:
- docs/standards/implementation-plan-standards.md
- docs/standards/artifact-type-registry.md
- docs/standards/subcommand-naming-reference.md
- docs/plan-templates/*.md

Check for:
1. DRY VIOLATIONS: Duplicated naming conventions, repeated content
2. BUGS/ISSUES: Broken references, missing referenced files
3. INCONSISTENCIES: Conflicting standards, format variations
4. UNUSED: Templates never used, orphaned conventions

Output format: Group findings by category with file:line references.
```

### Agent D3 Prompt (Plans & Outputs)
```
Analyze the plans and outputs in docs/.

Directories to analyze:
- docs/plans/*.md (sample 10-15 representative plans)
- docs/plan-outputs/ (check structure consistency)
- docs/plan-system/*.md
- docs/completed plans/

Check for:
1. DRY VIOLATIONS: Repeated plan sections, duplicated dependency lists
2. BUGS/ISSUES: Missing required sections, invalid task IDs
3. INCONSISTENCIES: Plan structures, status.json formats, naming
4. UNUSED/ORPHANED: Plans without outputs, outputs without plans

Output format: Group findings by category with file:line references.
```

### Agent C1 Prompt (Commands)
```
Analyze the plan commands in .claude/commands/plan/.

Files to analyze (all 12):
- archive.md, batch.md, create.md, explain.md
- implement.md, migrate.md, orchestrate.md, set.md
- split.md, status.md, templates.md, verify.md

Check for:
1. DRY VIOLATIONS:
   - Duplicated "Load Active Plan" sections (appears in 11 files)
   - Duplicated argument parsing patterns (appears in 6 files)
   - Duplicated status.json integration sections (appears in 9 files)
   - Duplicated progress formatting (appears in 6 files)
2. BUGS/ISSUES: Invalid template syntax, undefined function references
3. INCONSISTENCIES: Section ordering, instruction formats, error messages
4. UNUSED: Commands never invoked, orphaned instructions

Output format: Identify EXACT duplicated sections with line numbers, recommend extraction candidates.
```

### Agent C2 Prompt (Templates)
```
Analyze the templates in .claude/templates/.

Files to analyze:
- .claude/templates/agents/*.md (4 files)
- .claude/templates/shared/*.md (2 files)
- .claude/templates/questions/*.md (4 files)
- .claude/templates/output/*.md (4 files)

Check for:
1. DRY VIOLATIONS:
   - Duplicated "YOU MUST NEVER" constraint sections
   - Repeated getStatusSymbol() function definitions
   - Duplicated progress bar rendering logic
2. BUGS/ISSUES:
   - Invalid Handlebars syntax ({{#each}}, {{#if}}) in markdown
   - Undefined function references
3. INCONSISTENCIES: Template variable naming, format specifications
4. UNUSED: Templates not referenced by any command

Output format: Group findings by category with file:line references.
```

---

## Execution Instructions

### Running Phase 1 (Maximum Parallelism)

Spawn all 9 agents in parallel using a single message with multiple Task tool calls:

```
Task(S1): "Analyze scripts status/orchestration subsystem..."
Task(S2): "Analyze scripts research/verification subsystem..."
Task(S3): "Analyze scripts plan management subsystem..."
Task(S4): "Analyze scripts caching/utilities subsystem..."
Task(D1): "Analyze docs core documentation..."
Task(D2): "Analyze docs standards/templates..."
Task(D3): "Analyze docs plans/outputs..."
Task(C1): "Analyze .claude commands..."
Task(C2): "Analyze .claude templates..."
```

Use `run_in_background: true` for all agents, then collect with `TaskOutput`.

### Running Phase 2 (After Phase 1 Completes)

Run 4 synthesis agents sequentially or in parallel:

```
Task(DRY): "Synthesize DRY violations from Phase 1 findings..."
Task(BUGS): "Synthesize bugs from Phase 1 findings..."
Task(INCONSISTENCIES): "Synthesize inconsistencies from Phase 1 findings..."
Task(UNUSED): "Synthesize unused code from Phase 1 findings..."
```

### Running Phase 3 (After Phase 2 Completes)

Run 5 recommendation agents to generate final outputs.

---

## Success Criteria

### Functional Requirements
- [ ] All 9 Phase 1 agents complete with findings
- [ ] All 4 Phase 2 synthesis reports generated
- [ ] All 5 Phase 3 recommendation documents created
- [ ] Executive summary captures key insights

### Quality Requirements
- [ ] Findings include file:line references
- [ ] Recommendations are specific and actionable
- [ ] No false positives in unused code detection
- [ ] Cross-directory patterns identified

### Coverage Requirements
- [ ] All 29 scripts/*.js files analyzed
- [ ] All 12 .claude/commands/plan/*.md files analyzed
- [ ] All 14 .claude/templates/**/*.md files analyzed
- [ ] Key docs analyzed (standards, core architecture)

---

## Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Agent timeout on large files | Medium | Low | Use file limits, chunk large files |
| False positives in unused code | High | Medium | Cross-reference verification in Phase 2 |
| Missing cross-directory DRY violations | High | Medium | Explicit cross-cutting synthesis in Phase 2 |
| Inconsistent finding formats | Medium | Low | Standardized prompt templates |

---

## Notes

- This plan is designed to be re-run periodically as the codebase evolves
- Phase 1 agents can be run independently for focused analysis
- The agent prompt templates can be customized for different analysis depths
- Consider running with `model: "haiku"` for faster analysis of well-defined tasks

---

## Quick Start

To run the full analysis:

```
/plan:set codebase-quality-analysis
/plan:batch phase:1
# Wait for Phase 1 to complete
/plan:batch phase:2
# Wait for Phase 2 to complete
/plan:batch phase:3
```

Or run specific tasks:
```
/plan:implement 1.1 1.2 1.3 1.4  # All scripts agents
/plan:implement 1.5 1.6 1.7      # All docs agents
/plan:implement 1.8 1.9          # All .claude agents
```
