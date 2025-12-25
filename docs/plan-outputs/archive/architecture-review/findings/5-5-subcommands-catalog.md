# Task 5.5: Design & Architecture Sub-Commands Catalog

**Phase:** 5 - Command Design - Design & Architecture
**Status:** Complete
**Date:** 2025-12-20

---

## Executive Summary

This document catalogs all sub-commands for the Design & Architecture command category. Phase 5 defines **4 primary commands** with a total of **24 sub-commands**, producing **28 distinct artifact types**.

---

## Sub-Command Registry

### /architect Sub-Commands (6)

| Sub-command | Purpose | Output Artifacts | Priority |
|-------------|---------|------------------|----------|
| `architect:system` | System-level C4 Context/Container design | `architecture.md`, `system-diagram.md` | P0 |
| `architect:components` | Component decomposition and relationships | `components.json`, `component-diagram.md` | P0 |
| `architect:data` | Data architecture and flows | `data-architecture.md`, `data-flow.md` | P1 |
| `architect:deployment` | Deployment and infrastructure topology | `deployment.md`, `infrastructure.md` | P1 |
| `architect:adr` | Architectural Decision Records | `adr/NNNN-decision.md` | P1 |
| `architect:security` | Security architecture and controls | `security-architecture.md` | P2 |

### /design Sub-Commands (6)

| Sub-command | Purpose | Output Artifacts | Priority |
|-------------|---------|------------------|----------|
| `design:component` | Component internals and structure | `component-spec.md`, `interfaces.md` | P0 |
| `design:api` | API endpoint and interface design | `api-spec.md`, `openapi.yaml` | P0 |
| `design:data` | Data structure and schema design | `data-model.md`, `schemas.json` | P0 |
| `design:interactions` | Component interaction patterns | `interactions.md`, `sequence-diagrams.md` | P1 |
| `design:state` | State management design | `state-model.md`, `state-machine.json` | P1 |
| `design:ui` | UI component design | `ui-spec.md`, `component-tree.json` | P2 |

### /spec Sub-Commands (5)

| Sub-command | Purpose | Output Artifacts | Priority |
|-------------|---------|------------------|----------|
| `spec:api` | OpenAPI 3.1 specifications | `api-spec.yaml`, `openapi.json` | P0 |
| `spec:schema` | JSON Schema definitions | `schema.json`, `types.json` | P0 |
| `spec:graphql` | GraphQL SDL schemas | `schema.graphql`, `resolvers-spec.json` | P1 |
| `spec:events` | AsyncAPI event specifications | `events-spec.yaml`, `channels.yaml` | P1 |
| `spec:data` | Data model specifications | `data-model.json`, `erd.json` | P2 |

### /model Sub-Commands (7)

| Sub-command | Purpose | Output Artifacts | Priority |
|-------------|---------|------------------|----------|
| `model:erd` | Entity-relationship diagram design | `erd-diagram.md`, `entities.json` | P0 |
| `model:schema` | Database schema generation | `schema.sql`, `migrations/*.sql` | P0 |
| `model:domain` | Domain model design (DDD) | `domain-model.md`, `aggregates.json` | P1 |
| `model:migration` | Migration file generation | `migrations/*.sql`, `rollback.sql` | P1 |
| `model:normalize` | Schema normalization analysis | `normalization-report.md`, `normalized-schema.sql` | P1 |
| `model:orm` | ORM schema generation | `schema.prisma`, `schema.ts` | P1 |
| `model:validate` | Schema validation | `validation-report.md` | P2 |

---

## YAML Frontmatter Specifications

### /architect Commands

```yaml
# .claude/commands/architect/system.md
---
name: architect:system
description: Design system-level architecture with C4 Context and Container diagrams
model: sonnet
allowed-tools: Read, Write, Grep, Glob, Bash, AskUserQuestion
argument-hint: [system-name]
---

# .claude/commands/architect/components.md
---
name: architect:components
description: Decompose system into components and define their relationships
model: sonnet
allowed-tools: Read, Write, Grep, Glob, Bash
argument-hint: [system-or-layer]
---

# .claude/commands/architect/data.md
---
name: architect:data
description: Design data architecture, storage patterns, and data flows
model: sonnet
allowed-tools: Read, Write, Grep, Glob, Bash
argument-hint: [scope]
---

# .claude/commands/architect/deployment.md
---
name: architect:deployment
description: Design deployment architecture and infrastructure topology
model: sonnet
allowed-tools: Read, Write, Grep, Glob, Bash, AskUserQuestion
argument-hint: [environment]
---

# .claude/commands/architect/adr.md
---
name: architect:adr
description: Create Architectural Decision Record documenting key decisions
model: sonnet
allowed-tools: Read, Write, Grep, Glob
argument-hint: [decision-topic]
---

# .claude/commands/architect/security.md
---
name: architect:security
description: Design security architecture, threat model, and security controls
model: sonnet
allowed-tools: Read, Write, Grep, Glob, Bash, AskUserQuestion
argument-hint: [scope]
---
```

### /design Commands

```yaml
# .claude/commands/design/component.md
---
name: design:component
description: Design component internals including responsibilities, dependencies, interfaces
model: sonnet
allowed-tools: Read, Grep, Glob, Write, AskUserQuestion
argument-hint: [component-name]
---

# .claude/commands/design/api.md
---
name: design:api
description: Design API endpoints, interfaces, request/response formats, and contracts
model: sonnet
allowed-tools: Read, Grep, Glob, Write, AskUserQuestion
argument-hint: [api-name]
---

# .claude/commands/design/data.md
---
name: design:data
description: Design data structures, schemas, relationships, and validation rules
model: sonnet
allowed-tools: Read, Grep, Glob, Write, AskUserQuestion
argument-hint: [model-or-schema-name]
---

# .claude/commands/design/interactions.md
---
name: design:interactions
description: Design component interactions, message flows, and integration patterns
model: sonnet
allowed-tools: Read, Grep, Glob, Write, AskUserQuestion
argument-hint: [interaction-scope]
---

# .claude/commands/design/state.md
---
name: design:state
description: Design state management including state shape, transitions, and persistence
model: sonnet
allowed-tools: Read, Grep, Glob, Write, AskUserQuestion
argument-hint: [feature-or-component]
---

# .claude/commands/design/ui.md
---
name: design:ui
description: Design UI component hierarchy, props, events, and styling approach
model: sonnet
allowed-tools: Read, Grep, Glob, Write, AskUserQuestion
argument-hint: [ui-component-name]
---
```

### /spec Commands

```yaml
# .claude/commands/spec/api.md
---
name: spec:api
description: Generate OpenAPI 3.1 specifications for REST APIs
model: sonnet
allowed-tools: Read, Grep, Glob, Write, WebSearch
argument-hint: [api-name]
---

# .claude/commands/spec/schema.md
---
name: spec:schema
description: Generate JSON Schema (draft 2020-12) definitions for data structures
model: sonnet
allowed-tools: Read, Grep, Glob, Write, WebSearch
argument-hint: [schema-name]
---

# .claude/commands/spec/graphql.md
---
name: spec:graphql
description: Generate GraphQL SDL schemas with types, queries, mutations
model: sonnet
allowed-tools: Read, Grep, Glob, Write, WebSearch
argument-hint: [schema-name]
---

# .claude/commands/spec/events.md
---
name: spec:events
description: Generate AsyncAPI specifications for event-driven architectures
model: sonnet
allowed-tools: Read, Grep, Glob, Write, WebSearch
argument-hint: [service-name]
---

# .claude/commands/spec/data.md
---
name: spec:data
description: Generate data model specifications with entity relationships
model: sonnet
allowed-tools: Read, Grep, Glob, Write, WebSearch
argument-hint: [model-name]
---
```

### /model Commands

```yaml
# .claude/commands/model/erd.md
---
name: model:erd
description: Design entity-relationship diagrams with Mermaid syntax
model: sonnet
allowed-tools: Read, Grep, Glob, Write
argument-hint: [domain-name]
---

# .claude/commands/model/schema.md
---
name: model:schema
description: Generate database schema for PostgreSQL, MySQL, or SQLite
model: sonnet
allowed-tools: Read, Grep, Glob, Write, Bash
argument-hint: [entity-names]
---

# .claude/commands/model/domain.md
---
name: model:domain
description: Design domain models following DDD principles with aggregates and value objects
model: sonnet
allowed-tools: Read, Grep, Glob, Write, AskUserQuestion
argument-hint: [domain-name]
---

# .claude/commands/model/migration.md
---
name: model:migration
description: Generate database migration files with up/down scripts
model: sonnet
allowed-tools: Read, Grep, Glob, Write, Bash
argument-hint: [migration-name]
---

# .claude/commands/model/normalize.md
---
name: model:normalize
description: Analyze schema for normalization and recommend improvements
model: sonnet
allowed-tools: Read, Grep, Glob, Write
argument-hint: [schema-path]
---

# .claude/commands/model/orm.md
---
name: model:orm
description: Generate ORM schema for Prisma, Drizzle, or TypeORM
model: sonnet
allowed-tools: Read, Grep, Glob, Write, Bash
argument-hint: [orm-framework]
---
```

---

## Command Directory Structure

```
.claude/commands/
├── architect/
│   ├── architect.md           # Primary /architect command
│   ├── system.md              # architect:system
│   ├── components.md          # architect:components
│   ├── data.md                # architect:data
│   ├── deployment.md          # architect:deployment
│   ├── adr.md                 # architect:adr
│   └── security.md            # architect:security
├── design/
│   ├── design.md              # Primary /design command
│   ├── component.md           # design:component
│   ├── api.md                 # design:api
│   ├── data.md                # design:data
│   ├── interactions.md        # design:interactions
│   ├── state.md               # design:state
│   └── ui.md                  # design:ui
├── spec/
│   ├── spec.md                # Primary /spec command
│   ├── api.md                 # spec:api
│   ├── schema.md              # spec:schema
│   ├── graphql.md             # spec:graphql
│   ├── events.md              # spec:events
│   └── data.md                # spec:data
└── model/
    ├── model.md               # Primary /model command
    ├── erd.md                 # model:erd
    ├── schema.md              # model:schema
    ├── domain.md              # model:domain
    ├── migration.md           # model:migration
    ├── normalize.md           # model:normalize
    └── orm.md                 # model:orm
```

---

## Tool Access Patterns

### Pattern 1: Read-Only Analysis
**Tools:** Read, Grep, Glob
**Commands:** Base exploration, normalization analysis
**Use Case:** Analyze existing code without modification

### Pattern 2: Write-Enabled Design
**Tools:** Read, Grep, Glob, Write
**Commands:** Most design commands
**Use Case:** Create new design artifacts

### Pattern 3: Interactive Design
**Tools:** Read, Grep, Glob, Write, AskUserQuestion
**Commands:** architect:system, architect:deployment, design:*, model:domain
**Use Case:** Gather requirements and validate decisions

### Pattern 4: Web-Enhanced Specification
**Tools:** Read, Grep, Glob, Write, WebSearch
**Commands:** spec:*
**Use Case:** Reference standards and best practices

### Pattern 5: Build-Enabled
**Tools:** Read, Grep, Glob, Write, Bash
**Commands:** model:schema, model:migration, model:orm
**Use Case:** Run database tools, validate schemas

---

## Model Selection Rationale

All Design & Architecture commands use **Sonnet** model:

| Reason | Justification |
|--------|---------------|
| Precision | Design/spec work requires accurate, structured output |
| Complexity | Architectural reasoning needs balanced capability |
| Cost | More cost-effective than Opus for design work |
| Context | Sufficient context for large specifications |

**Exceptions (none in Phase 5):**
- Opus would be used for creative brainstorming (Phase 4)
- Haiku would be used for quick exploration (Phase 4)

---

## Priority Distribution

### P0 - Must Implement First (8 sub-commands)
- `architect:system`, `architect:components`
- `design:component`, `design:api`, `design:data`
- `spec:api`, `spec:schema`
- `model:erd`, `model:schema`

### P1 - Should Implement (12 sub-commands)
- `architect:data`, `architect:deployment`, `architect:adr`
- `design:interactions`, `design:state`
- `spec:graphql`, `spec:events`
- `model:domain`, `model:migration`, `model:normalize`, `model:orm`

### P2 - Nice to Have (4 sub-commands)
- `architect:security`
- `design:ui`
- `spec:data`
- `model:validate`

---

## Cross-Command Relationships

### Shared Artifacts

| Artifact | Produced By | Consumed By |
|----------|-------------|-------------|
| `architecture.md` | `architect:system` | `design:*`, `implement` |
| `components.json` | `architect:components` | `design:component`, `implement` |
| `design-spec.md` | `design:component` | `spec:*`, `implement`, `test` |
| `interfaces.md` | `design:component`, `design:api` | `spec:api`, `implement` |
| `api-spec.yaml` | `design:api` | `spec:api` (formalization) |
| `openapi.yaml` | `spec:api` | `implement`, `test`, `document` |
| `schema.json` | `spec:schema` | `implement`, `validate` |
| `entities.json` | `model:erd` | `model:schema`, `model:orm` |
| `schema.sql` | `model:schema` | `model:migration`, `migrate` |
| `schema.prisma` | `model:orm` | Prisma CLI |

### Workflow Chains

**Architecture-First:**
```
architect:system -> architect:components -> design:component -> implement
```

**API-First:**
```
design:api -> spec:api -> implement -> test
```

**Data-First:**
```
model:erd -> model:schema -> model:orm -> implement
```

**Contract-First:**
```
spec:api -> design:api -> implement -> validate
```

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| Primary Commands | 4 |
| Sub-Commands | 24 |
| Unique Artifacts | 28 |
| P0 Priority | 8 |
| P1 Priority | 12 |
| P2 Priority | 4 |
| Interactive Commands | 10 |
| Web-Enabled Commands | 5 |
| Build-Enabled Commands | 5 |
