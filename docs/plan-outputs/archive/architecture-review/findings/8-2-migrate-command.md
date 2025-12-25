# /migrate Command Design Specification

**Task:** 8.2 Design `/migrate` command (migrations)
**Category:** Operations & Deployment
**Priority:** HIGH
**Date:** 2025-12-20

---

## Executive Summary

The `/migrate` command family provides comprehensive migration capabilities across databases, data transformations, API versions, configurations, and code modernization. It enables safe, trackable, and reversible transitions between system states with built-in validation, rollback mechanisms, and audit trails.

**Core Philosophy:**
- **Safety-first:** Pre-migration validation, rollback capability
- **Incremental execution:** Step-by-step migration with checkpoints
- **Zero-downtime:** Support for blue-green and rolling migrations
- **Auditability:** Complete migration history and change tracking
- **Testability:** Dry-run mode for all migrations

**Key Differentiators:**
- `/refactor` restructures code → `/migrate` transforms data/systems
- `/deploy` pushes code → `/migrate` transitions state
- `/fix` corrects bugs → `/migrate` evolves schemas/APIs

---

## Command Structure

### Primary Command: `/migrate`

**Base invocation** (without sub-command):
```
/migrate [optional-migration-target]
```

Starts intelligent migration planning session with context-aware routing to appropriate sub-command.

### Sub-Commands Table

| Sub-command | Purpose | Priority |
|-------------|---------|----------|
| `migrate:schema` | Database schema migrations (DDL changes) | P0 |
| `migrate:data` | Data transformation and migration (DML) | P0 |
| `migrate:api` | API version migration (v1→v2) | P1 |
| `migrate:config` | Configuration migration between environments/versions | P1 |
| `migrate:code` | Code migration (deprecated APIs, library upgrades) | P1 |
| `migrate:env` | Environment migration (dev→staging→prod) | P2 |
| `migrate:platform` | Platform migration (AWS→GCP, monolith→microservices) | P2 |

---

## YAML Frontmatter Specification

### Primary Command: `.claude/commands/migrate.md`

```yaml
---
name: migrate
description: Comprehensive migration capabilities for schemas, data, APIs, configurations, and code with safety checks and rollback support
model: sonnet
allowed-tools: Read, Write, Edit, Grep, Glob, Bash, AskUserQuestion
argument-hint: [migration-target]
category: operations
output_artifacts:
  - migration-plan.md
  - migration-scripts/
  - rollback-plan.md
  - validation-report.md
---
```

---

## Model Configuration Rationale

| Sub-command | Model | Rationale |
|-------------|-------|-----------|
| `migrate:schema` | **Opus 4.5** | Critical: data integrity, complex dependency analysis |
| `migrate:data` | **Opus 4.5** | Critical: data transformation accuracy |
| `migrate:api` | **Opus 4.5** | Complex: breaking change analysis |
| `migrate:config` | Sonnet 4.5 | Medium complexity: format conversion |
| `migrate:code` | **Opus 4.5** | Complex: AST manipulation |
| `migrate:env` | Sonnet 4.5 | Medium complexity |
| `migrate:platform` | **Opus 4.5** | Critical: architectural decisions |

---

## Migration Strategy Framework

### Pre-Migration Phase
1. Impact Analysis
2. Validation Checks
3. Backup Strategy
4. Dry Run

### Migration Execution Phase
1. Pre-flight Checks
2. Checkpoint-based Execution
3. Real-time Monitoring

### Post-Migration Phase
1. Validation
2. Rollback Decision Point
3. Finalization

### Rollback Strategy
- Automatic triggers for data integrity violations
- Rollback time targets (schema: <5 min, data: <30 min, platform: <2 hours)

---

## Output Artifacts

### migration-plan.md Template
Includes overview, current/target state, migration strategy, impact analysis, validation strategy, rollback plan, risk assessment, and execution checklist.

### Migration Script Structure
SQL migration scripts with pre-migration validation, backup, migration steps, post-migration validation, and rollback scripts.

---

## Workflow Integration

### Upstream Commands (Inputs)
- `/architect` - Understand system dependencies
- `/model` - Schema design for migrations
- `/spec:api` - API version compatibility analysis

### Downstream Commands (Outputs)
- `/deploy`, `/validate` - Deployment execution, validation
- `/audit`, `/document` - Compliance, documentation

---

## Example Usage Scenarios

### Example 1: Database Schema Migration
Add user roles and permissions with validation and rollback support.

### Example 2: API Version Migration (v1→v2)
Breaking change detection, adapter generation, parallel run strategy.

### Example 3: Code Migration (React Class → Hooks)
Automated transformations with manual review for complex cases.

---

## Differentiation from Related Commands

| Command | Focus | Example |
|---------|-------|---------|
| `/refactor` | Restructures code (internal) | Extract methods |
| `/migrate` | Transforms data/systems (external) | Schema upgrade |
| `/deploy` | Pushes code to environments | Update application |
| `/fix` | Corrects bugs | Fix API bug |

---

## Priority Classification

### P0 - Critical
- `migrate:schema` - Database schema evolution
- `migrate:data` - Data transformation

### P1 - High Priority
- `migrate:api` - API version management
- `migrate:config` - Configuration evolution
- `migrate:code` - Code modernization

### P2 - Medium Priority
- `migrate:env` - Environment transitions
- `migrate:platform` - Platform migrations

---

**Phase 8 Task 8.2 Status: COMPLETE**
