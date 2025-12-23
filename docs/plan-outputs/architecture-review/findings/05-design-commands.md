# Phase 5: Design & Architecture Commands - Summary

**Date:** 2025-12-20
**Phase:** 5 - Command Design - Design & Architecture
**Status:** COMPLETE

---

## Overview

Phase 5 designed the Design & Architecture command category - the second category in the proposed action-based command taxonomy. These commands transform discovery outputs (from Phase 4) into structured designs, specifications, and data models ready for implementation.

**Tasks Completed:**
- 5.1 Design `/architect` command (system architecture)
- 5.2 Design `/design` command (component design)
- 5.3 Design `/spec` command (formal specifications)
- 5.4 Design `/model` command (data modeling)
- 5.5 Define sub-commands for each
- 5.6 Define artifact schemas for each

**Detailed Findings:** See individual task files in this directory.

---

## Executive Summary

Four Design & Architecture commands were designed with a total of **24 sub-commands** producing **28 distinct artifact types**. The commands form a comprehensive toolkit for transforming requirements into implementation-ready specifications:

| Command | Purpose | Sub-Commands | Primary Artifacts |
|---------|---------|--------------|-------------------|
| `/architect` | System-level architecture | 6 | architecture.md, components.json, ADRs |
| `/design` | Component-level design | 6 | design-spec.md, interfaces.md |
| `/spec` | Formal specifications | 5 | openapi.yaml, schema.json, graphql |
| `/model` | Data modeling | 7 | entities.json, schema.sql, prisma |

---

## Command Summary

### /architect

**Purpose:** System-level and high-level architecture design. Operates at C4 Levels 1-3 (Context, Container, Component) to define system boundaries, component relationships, and cross-cutting concerns.

**Key Characteristics:**
- Uses C4 Model methodology
- Produces Architectural Decision Records (ADRs)
- Generates Mermaid diagrams for visualization
- Interactive design via AskUserQuestion
- Model: Sonnet (balanced capability)

**Sub-Commands:**
- `architect:system` - C4 Context/Container design
- `architect:components` - Component decomposition
- `architect:data` - Data architecture
- `architect:deployment` - Infrastructure design
- `architect:adr` - Decision records
- `architect:security` - Security architecture

**Key Differentiator:** System-level "big picture" design, contrasts with `/design` (component internals).

---

### /design

**Purpose:** Component-level and feature-level detailed design. Bridges architecture to implementation with interface specifications, state management, and interaction patterns.

**Key Characteristics:**
- Implementation-ready specifications
- Interface and contract definitions
- State machine design
- Sequence diagram generation
- Model: Sonnet (balanced capability)

**Sub-Commands:**
- `design:component` - Component internals
- `design:api` - API interface design
- `design:data` - Data structure design
- `design:interactions` - Interaction patterns
- `design:state` - State management
- `design:ui` - UI component design

**Key Differentiator:** Component internals and implementation guidance, contrasts with `/architect` (system-level).

---

### /spec

**Purpose:** Create formal, machine-readable specifications. Focuses on contract-first development with OpenAPI, JSON Schema, AsyncAPI, and GraphQL SDL.

**Key Characteristics:**
- Machine-readable, validatable output
- Standard format compliance (OpenAPI 3.1, JSON Schema 2020-12)
- WebSearch for standard references
- Contract-first philosophy
- Model: Sonnet (precision for specifications)

**Sub-Commands:**
- `spec:api` - OpenAPI specifications
- `spec:schema` - JSON Schema definitions
- `spec:graphql` - GraphQL SDL
- `spec:events` - AsyncAPI for events
- `spec:data` - Data model specs

**Key Differentiator:** Formal, machine-readable contracts, contrasts with `/design` (human-readable).

---

### /model

**Purpose:** Data modeling and schema design. Creates entity-relationship diagrams, database schemas, and ORM configurations.

**Key Characteristics:**
- Multi-database support (PostgreSQL, MySQL, SQLite, MongoDB)
- ORM framework support (Prisma, Drizzle, TypeORM)
- Domain-Driven Design (DDD) patterns
- Migration generation
- Model: Sonnet (precision for schemas)

**Sub-Commands:**
- `model:erd` - Entity-relationship diagrams
- `model:schema` - Database schema generation
- `model:domain` - DDD domain models
- `model:migration` - Migration files
- `model:normalize` - Normalization analysis
- `model:orm` - ORM schema generation
- `model:validate` - Schema validation

**Key Differentiator:** Data layer focus, contrasts with `/design` (component behavior).

---

## Design Patterns Identified

### 1. Model Selection

All Design & Architecture commands use **Sonnet**:

| Reason | Justification |
|--------|---------------|
| Precision | Specifications require accurate, structured output |
| Complexity | Architectural reasoning needs balanced capability |
| Cost-Efficiency | More cost-effective than Opus |
| Context | Sufficient for large specifications |

### 2. Tool Access Patterns

| Pattern | Commands | Tools |
|---------|----------|-------|
| Read-Only | Base commands | Read, Grep, Glob |
| Write-Enabled | Most commands | + Write |
| Interactive | architect, design | + AskUserQuestion |
| Web-Enhanced | spec:* | + WebSearch |
| Build-Enabled | model:schema/migration/orm | + Bash |

### 3. Sub-Command Naming

- **Scope-based:** `architect:system`, `architect:components`
- **Format-based:** `spec:api`, `spec:graphql`
- **Purpose-based:** `model:erd`, `model:migration`

### 4. Artifact Organization

```
docs/
├── architecture/       # /architect output
│   ├── architecture.md
│   ├── components.json
│   └── adr/
├── design/            # /design output
│   └── [component]/
│       ├── design-spec.md
│       └── interfaces.md
├── specs/             # /spec output
│   ├── api/v1/openapi.yaml
│   └── schemas/
└── models/            # /model output
    ├── entities.json
    └── schema.sql
```

---

## Workflow Integration

### Command Flow Patterns

```
Discovery Phase (Phase 4):
/clarify -> requirements.json
/explore -> codebase-map.json
/research -> options-analysis.md
/brainstorm -> ideas.md

        ↓

Design & Architecture Phase (Phase 5):
/architect:system -> architecture.md, components.json
    ↓
/design:component -> design-spec.md, interfaces.md
    ↓
/spec:api -> openapi.yaml
    ↓
/model:erd -> entities.json -> /model:schema -> schema.sql

        ↓

Implementation Phase (Phase 7):
/implement -> code files
/test -> test files
```

### Cross-Command Artifact Flow

| Artifact | Produced By | Consumed By |
|----------|-------------|-------------|
| architecture.md | /architect | /design, /implement |
| components.json | /architect:components | /design:component |
| design-spec.md | /design | /implement, /test |
| interfaces.md | /design | /spec:api, /implement |
| openapi.yaml | /spec:api | /implement, /test, /document |
| schema.json | /spec:schema | /validate, /implement |
| entities.json | /model:erd | /model:schema, /model:orm |
| schema.sql | /model:schema | /migrate |

---

## Implementation Recommendations

### Priority Order

**P0 - Implement First (8 sub-commands):**
- `/architect:system`, `/architect:components`
- `/design:component`, `/design:api`, `/design:data`
- `/spec:api`, `/spec:schema`
- `/model:erd`, `/model:schema`

**P1 - Implement Second (12 sub-commands):**
- `/architect:data`, `/architect:deployment`, `/architect:adr`
- `/design:interactions`, `/design:state`
- `/spec:graphql`, `/spec:events`
- `/model:domain`, `/model:migration`, `/model:normalize`, `/model:orm`

**P2 - Implement Third (4 sub-commands):**
- `/architect:security`
- `/design:ui`
- `/spec:data`
- `/model:validate`

### Directory Structure

```
.claude/commands/
├── architect/
│   ├── architect.md           # Primary command
│   ├── system.md
│   ├── components.md
│   ├── data.md
│   ├── deployment.md
│   ├── adr.md
│   └── security.md
├── design/
│   ├── design.md
│   ├── component.md
│   ├── api.md
│   ├── data.md
│   ├── interactions.md
│   ├── state.md
│   └── ui.md
├── spec/
│   ├── spec.md
│   ├── api.md
│   ├── schema.md
│   ├── graphql.md
│   ├── events.md
│   └── data.md
└── model/
    ├── model.md
    ├── erd.md
    ├── schema.md
    ├── domain.md
    ├── migration.md
    ├── normalize.md
    └── orm.md
```

---

## Verification Checklist

- [x] All 4 primary commands designed with YAML frontmatter
- [x] 24 sub-commands defined with purpose and outputs
- [x] 28 artifact types specified
- [x] Model selection rationale documented (Sonnet for all)
- [x] Tool access patterns established
- [x] Workflow integration patterns identified
- [x] Implementation priority defined (P0/P1/P2)
- [x] Directory structure specified
- [x] JSON schemas defined for machine-readable artifacts
- [x] Mermaid diagram conventions established

---

## Statistics

| Metric | Count |
|--------|-------|
| Primary Commands | 4 |
| Sub-Commands | 24 |
| Unique Artifacts | 28 |
| JSON Schemas | 12 |
| P0 Priority Items | 8 |
| P1 Priority Items | 12 |
| P2 Priority Items | 4 |

---

## Findings Cross-References

| Task | Document | Key Topics |
|------|----------|------------|
| 5.1 | [5-1-architect-command.md](5-1-architect-command.md) | System architecture, C4 model, ADRs |
| 5.2 | [5-2-design-command.md](5-2-design-command.md) | Component design, interfaces, state |
| 5.3 | [5-3-spec-command.md](5-3-spec-command.md) | OpenAPI, JSON Schema, GraphQL |
| 5.4 | [5-4-model-command.md](5-4-model-command.md) | ERD, database schemas, ORM |
| 5.5 | [5-5-subcommands-catalog.md](5-5-subcommands-catalog.md) | Complete sub-command registry |
| 5.6 | [5-6-artifact-schemas.md](5-6-artifact-schemas.md) | JSON schemas, templates |

---

## Comparison with Phase 4

| Aspect | Phase 4 (Discovery) | Phase 5 (Design) |
|--------|---------------------|------------------|
| Focus | Understanding & ideas | Specifications & contracts |
| Output | Reports, maps, ideas | Schemas, specs, diagrams |
| Model Mix | Haiku/Sonnet/Opus | Sonnet only |
| Interaction | High (clarify) | Medium (design decisions) |
| Web Access | Research only | Spec standards only |
| File Writes | All commands | All commands |

---

## Next Steps

Phase 6 (Command Design - Analysis & Quality) should design:
- `/analyze` - Code analysis (security, performance, quality)
- `/audit` - Compliance and security auditing
- `/review` - Code review
- `/test` - Test creation (unit, integration, e2e)
- `/validate` - Validation and verification
- `/debug` - Debugging assistance

These commands will:
1. Consume artifacts from Phase 5 (design specs, schemas)
2. Provide quality assurance before implementation
3. Support iterative refinement loops
4. Generate test cases from specifications

---

**Phase 5 Status: COMPLETE**
