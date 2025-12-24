# Implementation Plan: /model Command

## Overview
- **Goal:** Implement the /model command with 7 sub-commands for data modeling and schema design
- **Priority:** P1 (MEDIUM-HIGH - Design & Architecture phase)
- **Created:** 2025-12-22
- **Output:** `docs/plan-outputs/model-command/`
- **Model:** sonnet (precision required for schema design)
- **Category:** Design & Architecture

> The /model command is a specialized tool for data modeling and schema design. It helps developers design entity-relationship models, database schemas, domain models, and ORM configurations. It bridges the gap between requirements and implementation by creating structured, validated data models that support multiple database systems (PostgreSQL, MySQL, SQLite, MongoDB) and ORM frameworks (Prisma, Drizzle, TypeORM).

---


---

## Dependencies

### Upstream
- `/clarify` - Requirements may inform entity modeling
- `/spec` - API specifications may drive data model
- `/architect` - Architecture decisions influence data modeling strategy
- `/design` - Component design informs data needs

### Downstream
- `/migrate` - Consumes model for migration generation
- `/implement` - Uses model for code generation
- `/test` - Uses model for integration tests
- `/document` - Generates technical documentation from model

### External Tools
- Database CLI tools (psql, mysql, sqlite3) - For schema validation
- ORM CLI tools (prisma, drizzle-kit) - For ORM schema validation

---

## Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Invalid SQL generated | High | Low | Comprehensive testing per database |
| ORM schema incompatible | Medium | Medium | Test with actual ORM tools |
| Complex relationships mismodeled | Medium | Medium | Detailed relationship validation |
| Migration conflicts | Medium | Low | Rollback generation, conflict detection |
## Phase 1: Core Command Setup

**Objective:** Establish base /model command with YAML configuration and data modeling structure

- [ ] 1.1 Create `/model` command file at `.claude/commands/model.md`
- [ ] 1.2 Add YAML frontmatter with configuration:
  - name: model
  - description: Design entity-relationship models, database schemas, and domain models
  - category: design-architecture
  - model: sonnet
  - allowed-tools: Read, Grep, Glob, Write, Bash
  - permission_mode: default
- [ ] 1.3 Write base command prompt with:
  - Context detection (auto-detect database type, existing ORM)
  - Interactive entity gathering
  - Schema generation instructions
  - Validation requirements
- [ ] 1.4 Define default parameters:
  - database_type: postgresql (default) | mysql | sqlite | mongodb
  - orm_framework: none | prisma | drizzle | typeorm
  - output_format: sql | orm-schema | both
- [ ] 1.5 Create output directory structure: `docs/models/`

**VERIFY Phase 1:**
- [ ] Base /model command detects project context
- [ ] Generates basic entity model
- [ ] Output directory structure is created

---

## Phase 2: Entity-Relationship Modeling

**Objective:** Implement ERD design with Mermaid diagram generation

- [ ] 2.1 Implement entity identification flow:
  - Use AskUserQuestion to gather entity names
  - Suggest entities based on requirements or existing code
  - Support iterative entity addition
- [ ] 2.2 Implement attribute design:
  - Primary key strategies (UUID, auto-increment, CUID)
  - Data type mapping for each database system
  - Nullable and default value handling
  - Constraints (unique, check, foreign key)
- [ ] 2.3 Implement relationship modeling:
  - One-to-one relationships
  - One-to-many relationships
  - Many-to-many relationships (with junction tables)
  - Self-referential relationships
- [ ] 2.4 Implement Mermaid ERD generation:
  - erDiagram syntax
  - Entity boxes with attributes
  - Relationship lines with cardinality
  - Primary key (PK) and foreign key (FK) markers
- [ ] 2.5 Add entity classification:
  - Core entities (main business objects)
  - Lookup entities (reference data)
  - Junction entities (many-to-many)
  - Audit entities (logging, history)

**VERIFY Phase 2:**
- [ ] ERD generation produces valid Mermaid diagrams
- [ ] All relationships are captured with correct cardinality
- [ ] Entity classification is accurate

---

## Phase 3: Sub-Command Implementation

**Objective:** Create 7 specialized sub-commands for different modeling needs

### 3.1 ERD Sub-Command
- [ ] 3.1.1 Create `/model:erd` command file
  - YAML: model: sonnet, argument-hint: [domain-name]
- [ ] 3.1.2 Implement ERD-focused workflow:
  - Visual-first entity design
  - Relationship emphasis
  - Cardinality specification
- [ ] 3.1.3 Generate artifacts:
  - `erd-diagram.md` (Mermaid ERD)
  - `entities.json` (structured entity definitions)

### 3.2 Schema Sub-Command
- [ ] 3.2.1 Create `/model:schema` command file
  - YAML: model: sonnet, allowed-tools: Read, Grep, Glob, Write, Bash, argument-hint: [entity-names]
- [ ] 3.2.2 Implement schema generation:
  - CREATE TABLE statements
  - Primary and foreign key constraints
  - Indexes (based on common query patterns)
  - Check constraints
  - Default values
- [ ] 3.2.3 Support multiple database systems:
  - PostgreSQL-specific features (gen_random_uuid(), JSONB, arrays)
  - MySQL-specific features (AUTO_INCREMENT, FULLTEXT)
  - SQLite-specific features (ROWID, type affinity)
- [ ] 3.2.4 Generate artifacts:
  - `schema.sql` (DDL statements)
  - `migrations/` directory structure

### 3.3 Domain Sub-Command (DDD)
- [ ] 3.3.1 Create `/model:domain` command file
  - YAML: model: sonnet, allowed-tools: Read, Grep, Glob, Write, AskUserQuestion, argument-hint: [domain-name]
- [ ] 3.3.2 Implement DDD modeling:
  - Aggregate identification
  - Aggregate root selection
  - Entity vs Value Object distinction
  - Domain events
  - Invariants and business rules
- [ ] 3.3.3 Generate artifacts:
  - `domain-model.md` (DDD documentation)
  - `aggregates.json` (aggregate definitions)

### 3.4 Migration Sub-Command
- [ ] 3.4.1 Create `/model:migration` command file
  - YAML: model: sonnet, allowed-tools: Read, Grep, Glob, Write, Bash, argument-hint: [migration-name]
- [ ] 3.4.2 Implement migration generation:
  - Up migration (changes)
  - Down migration (rollback)
  - Timestamp-based naming
  - Sequential ordering
- [ ] 3.4.3 Handle migration scenarios:
  - Add table
  - Add/modify/drop column
  - Add/drop index
  - Add/drop constraint
  - Data migration helpers
- [ ] 3.4.4 Generate artifacts:
  - `migrations/YYYYMMDD_HHMMSS_name.sql`
  - `rollback.sql` (consolidated rollback)

### 3.5 Normalize Sub-Command
- [ ] 3.5.1 Create `/model:normalize` command file
  - YAML: model: sonnet, argument-hint: [schema-path]
- [ ] 3.5.2 Implement normalization analysis:
  - 1NF analysis (atomic values, no repeating groups)
  - 2NF analysis (no partial dependencies)
  - 3NF analysis (no transitive dependencies)
  - BCNF analysis (if applicable)
- [ ] 3.5.3 Generate recommendations:
  - Normalization violations
  - Suggested schema changes
  - Trade-off analysis (normalize vs denormalize)
- [ ] 3.5.4 Generate artifacts:
  - `normalization-report.md` (analysis findings)
  - `normalized-schema.sql` (recommended schema)

### 3.6 ORM Sub-Command
- [ ] 3.6.1 Create `/model:orm` command file
  - YAML: model: sonnet, allowed-tools: Read, Grep, Glob, Write, Bash, argument-hint: [orm-framework]
- [ ] 3.6.2 Implement Prisma schema generation:
  - datasource and generator blocks
  - Model definitions with @map directives
  - Relation fields
  - Enum definitions
  - @@index and @@unique
- [ ] 3.6.3 Implement Drizzle schema generation:
  - pgTable/mysqlTable definitions
  - Column definitions with proper types
  - Relations definitions
  - Indexes and constraints
- [ ] 3.6.4 Implement TypeORM support:
  - Entity decorators
  - Column definitions
  - Relationship decorators
  - Index definitions
- [ ] 3.6.5 Generate artifacts:
  - `schema.prisma` (Prisma schema)
  - `schema.ts` (Drizzle schema)
  - `entities/*.ts` (TypeORM entities)

### 3.7 Validate Sub-Command
- [ ] 3.7.1 Create `/model:validate` command file
  - YAML: model: sonnet, argument-hint: [schema-path]
- [ ] 3.7.2 Implement validation checks:
  - Primary key presence
  - Foreign key integrity
  - Index coverage for foreign keys
  - Naming convention compliance
  - Data type appropriateness
- [ ] 3.7.3 Generate artifacts:
  - `validation-report.md` (findings and recommendations)

**VERIFY Phase 3:**
- [ ] All sub-commands produce valid artifacts
- [ ] Artifacts are useful for their focus area
- [ ] Sub-commands handle edge cases gracefully

---

## Phase 4: Database System Support

**Objective:** Implement comprehensive database-specific features

### 4.1 PostgreSQL Support
- [ ] 4.1.1 Implement PostgreSQL data types:
  - UUID with gen_random_uuid()
  - JSONB for structured data
  - TEXT[] for arrays
  - TIMESTAMP WITH TIME ZONE
  - DECIMAL for currency
  - ENUM types
- [ ] 4.1.2 Implement PostgreSQL features:
  - Partial indexes
  - GiN/GiST indexes for JSONB
  - Row-level security
  - Generated columns
  - Table partitioning
- [ ] 4.1.3 Generate PostgreSQL-specific SQL

### 4.2 MySQL Support
- [ ] 4.2.1 Implement MySQL data types:
  - INT AUTO_INCREMENT
  - VARCHAR with appropriate lengths
  - JSON (5.7+)
  - DATETIME
  - DECIMAL
  - ENUM
- [ ] 4.2.2 Implement MySQL features:
  - FULLTEXT indexes
  - InnoDB engine specification
  - Foreign key syntax differences
- [ ] 4.2.3 Generate MySQL-specific SQL

### 4.3 SQLite Support
- [ ] 4.3.1 Implement SQLite data types:
  - INTEGER PRIMARY KEY (ROWID alias)
  - TEXT for most strings
  - REAL for decimals
  - BLOB for binary
- [ ] 4.3.2 Handle SQLite limitations:
  - Limited ALTER TABLE support
  - Type affinity behavior
  - No native UUID/JSONB
- [ ] 4.3.3 Generate SQLite-specific SQL

### 4.4 MongoDB Support
- [ ] 4.4.1 Implement MongoDB schema validation:
  - JSON Schema validator
  - Required fields
  - Type constraints
  - Pattern validation
- [ ] 4.4.2 Implement MongoDB indexes:
  - Single field indexes
  - Compound indexes
  - Text indexes
  - Unique indexes
- [ ] 4.4.3 Generate MongoDB-specific output:
  - Collection creation with validator
  - Index creation commands

**VERIFY Phase 4:**
- [ ] All database systems produce valid schema definitions
- [ ] Schemas are runnable against target database
- [ ] Database-specific features are correctly implemented

---

## Phase 5: Artifact Generation & Schemas

**Objective:** Implement structured artifact generation with validated schemas

### 5.1 entities.json Schema
- [ ] 5.1.1 Define entities.json schema:
  - metadata: artifact_type, version, database_type, orm_framework
  - entities[]: name, table_name, type, description, attributes[], indexes[]
  - relationships[]: from, to, type, through, cardinality
- [ ] 5.1.2 Implement attribute schema:
  - name, type, primary_key, foreign_key, nullable, unique, default, check_constraint
- [ ] 5.1.3 Implement foreign_key nested schema:
  - references_table, references_column, on_delete, on_update

### 5.2 data-model.md Template
- [ ] 5.2.1 Define data-model.md structure:
  - YAML frontmatter: artifact_type, command, version, database_type, orm_framework, normalization_level
  - Overview section
  - Entity Catalog (per-entity documentation)
  - Relationships Summary (Mermaid ERD)
  - Normalization Analysis
  - Performance Considerations
  - Migration Strategy
- [ ] 5.2.2 Implement entity documentation format:
  - Purpose, Type (Core/Lookup/Junction/Audit)
  - Attributes table (Column, Type, Constraints, Description)
  - Relationships (1:N, M:N descriptions)
  - Indexes
  - Business Rules

### 5.3 aggregates.json Schema (DDD)
- [ ] 5.3.1 Define aggregates.json schema:
  - metadata: artifact_type, domain, version
  - aggregates[]: name, root, description, entities, value_objects, domain_events, invariants, commands
- [ ] 5.3.2 Implement invariant schema:
  - name, description, validation
- [ ] 5.3.3 Implement command schema:
  - name, parameters, emits (events)
- [ ] 5.3.4 Implement domain_events schema:
  - name, payload, produced_by

### 5.4 Validation
- [ ] 5.4.1 Implement JSON schema validation for all .json artifacts
- [ ] 5.4.2 Add schema $id URLs in artifact metadata
- [ ] 5.4.3 Create schema documentation in `docs/schemas/`

**VERIFY Phase 5:**
- [ ] All artifacts validate against defined schemas
- [ ] Metadata is complete and accurate
- [ ] JSON schema validation is working

---

## Phase 6: Naming Convention Support

**Objective:** Implement consistent, configurable naming conventions

- [ ] 6.1 Implement table naming conventions:
  - Plural nouns (users, orders)
  - snake_case for SQL
  - Auto-detect from existing tables
- [ ] 6.2 Implement column naming conventions:
  - snake_case for SQL
  - Descriptive names (user_id not uid)
  - Consistent timestamp naming (created_at, updated_at)
- [ ] 6.3 Implement index naming conventions:
  - idx_[table]_[column(s)]
  - Example: idx_users_email
- [ ] 6.4 Implement foreign key naming conventions:
  - fk_[table]_[column]_[references_table]
  - Example: fk_orders_user_id_users
- [ ] 6.5 Implement ORM mapping:
  - @map directives for Prisma
  - Column name mapping for Drizzle
  - @Column({ name: }) for TypeORM
- [ ] 6.6 Add convention configuration:
  - Allow override of default conventions
  - Support project-specific naming rules
  - Detect existing conventions from codebase

**VERIFY Phase 6:**
- [ ] Naming conventions are consistent
- [ ] Generated names match project style
- [ ] Convention configuration works correctly

---

## Phase 7: Command Integration & Workflows

**Objective:** Ensure /model integrates with other Design & Architecture commands

- [ ] 7.1 Define integration points:
  - `/clarify` → `/model` (requirements → entity modeling)
  - `/spec` → `/model` (API spec → data model alignment)
  - `/architect` → `/model` (architecture → data modeling strategy)
  - `/design` → `/model` (component design → data needs)
  - `/model` → `/migrate` (model → migration generation)
  - `/model` → `/implement` (model → code generation)
  - `/model` → `/test` (model → integration tests)
  - `/model` → `/document` (model → technical documentation)
- [ ] 7.2 Add artifact cross-referencing:
  - Include related_artifacts in metadata
  - Reference upstream requirements
  - Link to downstream implementation artifacts
- [ ] 7.3 Implement workflow chains:
  - Data-first: /model:erd → /model:schema → /model:orm → /implement
  - Architecture-first: /architect → /model → /design → /implement
  - API-first: /spec:api → /model → /implement
- [ ] 7.4 Test common workflows:
  - New database design: /clarify → /model:erd → /model:schema
  - Schema migration: /model:schema → /model:migration
  - ORM setup: /model:erd → /model:orm

**VERIFY Phase 7:**
- [ ] Command integration works smoothly
- [ ] Artifacts flow between commands correctly
- [ ] Workflow chains execute properly

---

## Phase 8: Testing & Validation

**Objective:** Comprehensive testing across database systems and modeling scenarios

### 8.1 Database System Testing
- [ ] 8.1.1 Test PostgreSQL schema generation
- [ ] 8.1.2 Test MySQL schema generation
- [ ] 8.1.3 Test SQLite schema generation
- [ ] 8.1.4 Test MongoDB schema generation

### 8.2 ORM Testing
- [ ] 8.2.1 Test Prisma schema generation
- [ ] 8.2.2 Test Drizzle schema generation
- [ ] 8.2.3 Test TypeORM entity generation
- [ ] 8.2.4 Validate ORM schemas are runnable

### 8.3 Modeling Scenario Testing
- [ ] 8.3.1 Test simple entity (single table, few columns)
- [ ] 8.3.2 Test complex relationships (1:N, M:N)
- [ ] 8.3.3 Test self-referential relationships
- [ ] 8.3.4 Test DDD aggregate modeling
- [ ] 8.3.5 Test normalization analysis

### 8.4 Migration Testing
- [ ] 8.4.1 Test add table migration
- [ ] 8.4.2 Test add column migration
- [ ] 8.4.3 Test modify column migration
- [ ] 8.4.4 Test add index migration
- [ ] 8.4.5 Test rollback generation

### 8.5 Sub-Command Testing
- [ ] 8.5.1 Test each sub-command independently
- [ ] 8.5.2 Verify artifact schemas are valid
- [ ] 8.5.3 Test argument handling
- [ ] 8.5.4 Test context detection

**VERIFY Phase 8:**
- [ ] All test cases pass
- [ ] Schemas are valid across all database systems
- [ ] ORM schemas pass validation tools

---

## Phase 9: Documentation & Polish

**Objective:** Create comprehensive documentation and refine user experience

- [ ] 9.1 Create command documentation:
  - Usage examples for each sub-command
  - Database system selection guidance
  - ORM framework comparison
  - Common modeling patterns
- [ ] 9.2 Document schema design best practices:
  - Primary key strategies
  - Normalization guidelines
  - Index optimization
  - Naming conventions
- [ ] 9.3 Create user guides:
  - "Designing your first data model"
  - "Database schema best practices"
  - "When to denormalize"
  - "From ERD to production"
- [ ] 9.4 Add inline help:
  - Argument hints in YAML frontmatter
  - Data type reference per database
  - Constraint syntax help
- [ ] 9.5 Create example outputs:
  - Example e-commerce schema
  - Example user management schema
  - Example audit logging schema
- [ ] 9.6 Polish output formatting:
  - Clear Mermaid diagrams
  - Well-commented SQL
  - Readable ORM schemas
  - Comprehensive artifact metadata

**VERIFY Phase 9:**
- [ ] Documentation is complete and clear
- [ ] Examples demonstrate all database systems
- [ ] Output quality is polished and consistent

---

## Success Criteria

### Functional Requirements
- [ ] Base /model command generates valid ERD and basic schema
- [ ] All 7 sub-commands (erd, schema, domain, migration, normalize, orm, validate) work correctly
- [ ] Supports PostgreSQL, MySQL, SQLite, and MongoDB
- [ ] Supports Prisma, Drizzle, and TypeORM schema generation
- [ ] Migration files include up and down scripts

### Quality Requirements
- [ ] Generated SQL is syntactically valid and runnable
- [ ] ERD diagrams render correctly in Mermaid
- [ ] ORM schemas pass their respective validation tools
- [ ] Naming conventions are consistent throughout
- [ ] Normalization analysis is accurate

### Usability Requirements
- [ ] Interactive entity gathering is intuitive
- [ ] Database type auto-detection works reliably
- [ ] Clear error messages for invalid input
- [ ] Comprehensive documentation for each sub-command

### Integration Requirements
- [ ] Artifacts can be consumed by /implement, /migrate, /document
- [ ] Metadata includes related_artifacts cross-references
- [ ] Works seamlessly in common workflows (design → schema → migration)
- [ ] ORM schemas integrate with project tooling

### Testing Requirements
- [ ] All database systems tested
- [ ] All ORM frameworks tested
- [ ] Complex relationship scenarios tested
- [ ] Migration generation tested end-to-end

---

