# Phase 4: Discovery & Ideation Commands - Summary

**Date:** 2025-12-20
**Phase:** 4 - Command Design - Discovery & Ideation
**Status:** COMPLETE

---

## Overview

Phase 4 designed the Discovery & Ideation command category - the first phase of the proposed action-based command taxonomy. These commands support early-stage development workflows when requirements are unclear, codebases are unfamiliar, or creative exploration is needed.

**Tasks Completed:**
- 4.1 Design `/clarify` command (interactive requirements gathering)
- 4.2 Design `/explore` command (codebase exploration)
- 4.3 Design `/research` command (technology/approach research)
- 4.4 Design `/brainstorm` command (idea generation)
- 4.5 Define sub-commands for each
- 4.6 Define artifact schemas for each

**Detailed Findings:** See individual task files in this directory.

---

## Executive Summary

Four Discovery & Ideation commands were designed with a total of **21 sub-commands** producing **22 distinct artifact types**. The commands form a coherent toolkit for early-stage development workflows:

| Command | Purpose | Sub-Commands | Primary Artifacts |
|---------|---------|--------------|-------------------|
| `/clarify` | Interactive requirements gathering | 5 | requirements.json, scope.md, constraints.json |
| `/explore` | Codebase exploration | 6 | codebase-map.json, exploration-report.md |
| `/research` | Technology/pattern research | 4 | research-notes.md, options-analysis.md |
| `/brainstorm` | Creative ideation | 6 | ideas.md, alternatives.md |

---

## Command Summary

### /clarify

**Purpose:** Interactive discovery when an idea isn't fully formed. Uses Socratic questioning to help developers refine vague ideas into structured requirements.

**Key Characteristics:**
- Interactive via `AskUserQuestion` tool
- Produces machine-readable JSON artifacts
- Operates early in workflow before design
- Model: inherit (Sonnet 4.5)

**Sub-Commands:**
- `clarify:requirements` - Functional and non-functional requirements
- `clarify:scope` - Scope boundaries and exclusions
- `clarify:constraints` - Technical, business, resource constraints
- `clarify:acceptance` - Acceptance criteria and success metrics
- `clarify:stakeholders` - Stakeholder analysis

**Key Differentiator:** Only command with `AskUserQuestion` tool access for interactive discovery.

---

### /explore

**Purpose:** Codebase exploration and understanding. Helps developers navigate unfamiliar code, build mental models, and identify patterns.

**Key Characteristics:**
- Leverages existing Explore subagent
- Multi-depth exploration (quick/standard/deep)
- Read-only operation (safe for any codebase)
- Model: Haiku (fast), upgrades to Sonnet for deep analysis

**Sub-Commands:**
- `explore:architecture` - Component relationships and layers
- `explore:patterns` - Code conventions and idioms
- `explore:dependencies` - Dependency analysis and impact mapping
- `explore:flow` - Data/control flow tracing
- `explore:quick` - 30-second surface scan
- `explore:deep` - 5+ minute comprehensive analysis

**Key Differentiator:** Only command with depth modifiers (quick/standard/deep).

---

### /research

**Purpose:** Research technologies, patterns, and best practices. Helps developers make informed decisions through systematic comparison.

**Key Characteristics:**
- Web-enabled via WebSearch/WebFetch
- Produces comparison matrices and recommendations
- Evidence-based with source citations
- Model: Sonnet 4.5

**Sub-Commands:**
- `research:technology` - Library/framework comparison
- `research:patterns` - Architectural pattern investigation
- `research:security` - Security implications and best practices
- `research:performance` - Performance optimization research

**Key Differentiator:** Only Discovery command with web research capability.

---

### /brainstorm

**Purpose:** Generate creative ideas and explore solution spaces. Encourages divergent thinking before committing to an approach.

**Key Characteristics:**
- Uses Opus 4.5 for maximum creativity
- High temperature (0.9) for diverse outputs
- Uses SCAMPER and other creative techniques
- Read-only (no file writes during ideation)

**Sub-Commands:**
- `brainstorm:solutions` - Multiple solution approaches
- `brainstorm:architecture` - Architectural alternatives
- `brainstorm:names` - Creative naming options
- `brainstorm:features` - Feature ideation
- `brainstorm:apis` - API interface designs
- `brainstorm:approaches` - Implementation strategies

**Key Differentiator:** Uses highest-capability model (Opus) with elevated temperature.

---

## Design Patterns Identified

### 1. Model Selection by Task Type

| Task Type | Model | Rationale |
|-----------|-------|-----------|
| Interactive | inherit (Sonnet) | Balanced capability for dialogue |
| Fast exploration | Haiku | Speed for read-heavy operations |
| Research | Sonnet | Web access and synthesis |
| Creative | Opus @ 0.9 temp | Maximum capability and diversity |

### 2. Tool Access Patterns

| Pattern | Commands | Tools |
|---------|----------|-------|
| Read-Only | /explore, /brainstorm | Read, Grep, Glob |
| Write-Enabled | /clarify, /research | + Write |
| Web-Enabled | /research, /brainstorm | + WebSearch, WebFetch |
| Interactive | /clarify | + AskUserQuestion |

### 3. Sub-Command Naming

- **Domain-based:** `clarify:requirements`, `explore:architecture`
- **Depth modifiers:** `explore:quick`, `explore:deep`
- **Topic specialization:** `research:security`, `brainstorm:apis`

### 4. Artifact Organization

```
docs/
├── clarify/           # Requirements, scope, constraints
├── explore/           # Codebase maps, reports
├── research/          # Research notes, analyses
└── brainstorm/        # Ideas, alternatives
```

---

## Artifact Schema Highlights

### Machine-Readable Artifacts (JSON)

| Artifact | Schema | Purpose |
|----------|--------|---------|
| `requirements.json` | FR-###, NFR-### IDs | Structured requirements |
| `constraints.json` | By type: technical/business/resource | Constraint tracking |
| `codebase-map.json` | Components, patterns, dependencies | Machine-parseable exploration |
| `architecture-map.json` | Layers, relationships | Architecture documentation |
| `dependency-graph.json` | Nodes, edges, cycles | Dependency analysis |

### Document Artifacts (Markdown + YAML Frontmatter)

All markdown artifacts include:
- `artifact_type` - Type identifier
- `command` - Generating command
- `version` - Semantic version
- `created_at` - ISO-8601 timestamp
- `status` - draft/in-review/approved/deprecated

---

## Workflow Integration

### Command Flow Patterns

```
User has vague idea:
/clarify → requirements.json
    ↓
/explore:patterns → Find existing patterns
    ↓
/research:technology → Compare options
    ↓
/brainstorm:solutions → Generate alternatives
    ↓
[Design phase: /architect, /design]
```

### Cross-Command Artifact Flow

| Artifact | Produced By | Consumed By |
|----------|-------------|-------------|
| requirements.json | /clarify:requirements | /architect, /design, /test |
| scope.md | /clarify:scope | /plan:create |
| codebase-map.json | /explore | /refactor, /document |
| options-analysis.md | /research:technology | /architect |
| ideas.md | /brainstorm:solutions | /design, /implement |

---

## Implementation Recommendations

### Priority Order

1. **P0 - Implement first:**
   - `/clarify:requirements` and `/clarify:scope` (foundation)
   - `/explore` with standard depth (most common use)
   - `/research:technology` (decision support)
   - `/brainstorm:solutions` (creative exploration)

2. **P1 - Implement second:**
   - Remaining /clarify sub-commands
   - `/explore:architecture` and `/explore:dependencies`
   - `/research:patterns` and `/research:security`
   - `/brainstorm:architecture`

3. **P2 - Implement third:**
   - Specialized /explore variants (flow, patterns)
   - `/brainstorm:names`, `/brainstorm:apis`
   - Performance research

### Directory Structure

```
.claude/commands/
├── clarify/
│   ├── clarify.md           # Parent command
│   ├── requirements.md
│   ├── scope.md
│   ├── constraints.md
│   ├── acceptance.md
│   └── stakeholders.md
├── explore/
│   ├── explore.md
│   ├── architecture.md
│   ├── patterns.md
│   ├── dependencies.md
│   ├── flow.md
│   ├── quick.md
│   └── deep.md
├── research/
│   ├── research.md
│   ├── technology.md
│   ├── patterns.md
│   ├── security.md
│   └── performance.md
└── brainstorm/
    ├── brainstorm.md
    ├── solutions.md
    ├── architecture.md
    ├── names.md
    ├── features.md
    ├── apis.md
    └── approaches.md
```

---

## Verification Checklist

- [x] All 4 commands designed with YAML frontmatter specifications
- [x] 21 sub-commands defined with purpose and outputs
- [x] 22 artifact schemas specified (8 JSON, 14 Markdown)
- [x] Model selection rationale documented
- [x] Tool access patterns established
- [x] Workflow integration patterns identified
- [x] Implementation priority defined
- [x] Directory structure specified

---

## Findings Cross-References

| Task | Document | Key Topics |
|------|----------|------------|
| 4.1 | [4-1-clarify-command.md](4-1-clarify-command.md) | /clarify design, interactive patterns, requirements schemas |
| 4.2 | [4-2-explore-command.md](4-2-explore-command.md) | /explore design, depth levels, codebase mapping |
| 4.3 | [4-3-research-command.md](4-3-research-command.md) | /research design, web research, comparison matrices |
| 4.4 | [4-4-brainstorm-command.md](4-4-brainstorm-command.md) | /brainstorm design, creative techniques, idea generation |
| 4.5 | [4-5-subcommands-catalog.md](4-5-subcommands-catalog.md) | Complete sub-command registry, YAML specs |
| 4.6 | [4-6-artifact-schemas.md](4-6-artifact-schemas.md) | JSON schemas, markdown templates, versioning |

---

## Next Steps

Phase 5 (Command Design - Design & Architecture) should design:
- `/architect` - System architecture design
- `/design` - Component/feature design
- `/spec` - Formal specifications
- `/model` - Data modeling

These commands will consume artifacts from Phase 4 Discovery commands and produce inputs for Phase 6 (Analysis & Quality) and Phase 7 (Implementation & Documentation).

---

**Phase 4 Status: COMPLETE**
