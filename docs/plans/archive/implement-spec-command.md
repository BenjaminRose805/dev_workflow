# Implementation Plan: Implement /spec Command

## Overview
- **Goal:** Build formal specification generation system for contract-first development
- **Priority:** P1 (Design & Architecture)
- **Created:** 2025-12-22
- **Output:** `docs/plan-outputs/spec-command/`
- **Model:** Sonnet
- **Category:** Design & Architecture

> Implement the /spec command to generate formal, machine-readable specifications (OpenAPI, JSON Schema, AsyncAPI, GraphQL SDL) that serve as the source of truth for implementation, testing, and documentation. The command focuses on contract-first development by creating validatable specification artifacts that can drive code generation and runtime validation.

### Sub-Command Priorities

| Sub-Command | Priority | Scope | Description |
|-------------|----------|-------|-------------|
| `spec:api` | P0 | MVP | Generates OpenAPI 3.1 specifications for REST APIs with complete endpoint definitions |
| `spec:schema` | P0 | MVP | Generates JSON Schema (draft 2020-12) definitions for data structures and validation |
| `spec:graphql` | P1 | Core | Generates GraphQL Schema Definition Language for query/mutation/subscription APIs |
| `spec:events` | P1 | Core | Generates AsyncAPI specifications for event-driven architectures and message brokers |
| `spec:data` | P1 | Core | Generates data model specifications with entity relationships and database mappings |

---


---

## Dependencies

### Upstream
- `/clarify` - Consumes requirements for API design guidance
- `/design` - Consumes design-spec.md for interface definitions
- `/architect` - Consumes architecture decisions for system boundaries
- `/model` - Consumes domain models for schema generation

### Downstream
- `/implement` - Generates code from OpenAPI/AsyncAPI specs
- `/test` - Generates tests from schema examples
- `/document` - Uses specs for API documentation
- `/validate` - Uses schemas for validation

### External Tools
- Skill system with sub-command support (`:` notation)
- WebSearch tool for standards lookup
- File I/O tools (Read, Write) for YAML and JSON formats
- Bash tool for validation CLI tools (redocly, ajv, asyncapi)

### Artifact Compatibility
See `docs/architecture/artifact-compatibility-matrix.md` for detailed artifact schemas and producer-consumer relationships.

---

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Spec-implementation drift | High | Integrate validation into CI/CD, generate code from specs where possible |
| Validation tool unavailability | Medium | Graceful fallback when CLI tools missing, document installation requirements |
| Breaking changes undetected | High | Implement breaking change detection, version specs properly |
| Circular $ref references | Medium | Implement cycle detection, provide clear error messages |
| Schema complexity explosion | Medium | Encourage $defs reuse, limit nesting depth, warn on complex schemas |
| Inconsistent error responses | Medium | Generate standard error schemas, validate error response coverage |
| Version migration challenges | High | Provide migration guides between spec versions, support dual output |

---

## Phase 1: Core Command Setup

**Objective:** Establish base /spec command infrastructure with routing logic

**Tasks:**
- [ ] 1.1 Create primary command file at `.claude/commands/spec.md`
- [ ] 1.2 Configure YAML frontmatter with model: sonnet, allowed-tools: Read, Grep, Glob, Write, WebSearch
- [ ] 1.3 Set command category as "Design & Architecture" with P1 priority
- [ ] 1.4 Implement context detection logic to analyze project type (REST, GraphQL, event-driven)
- [ ] 1.5 Create technology stack detector (read package.json, analyze imports)
- [ ] 1.6 Build routing logic to select appropriate sub-command based on context
- [ ] 1.7 Add input artifact reader for design docs (design-spec.md, interfaces.md)
- [ ] 1.8 Create base output directory structure `docs/specs/`

**VERIFY Phase 1:**
- [ ] Command loads successfully and routes to correct sub-command based on project type

---

## Phase 2: OpenAPI 3.1 Specification Generation (spec:api)

**Objective:** Implement REST API specification generation with OpenAPI 3.1

**Tasks:**
- [ ] 2.1 Create sub-command file at `.claude/commands/spec/api.md`
- [ ] 2.2 Configure YAML frontmatter with argument-hint: [api-name]
- [ ] 2.3 Implement design document parser to extract endpoints from design-spec.md
- [ ] 2.4 Build OpenAPI 3.1 template generator with info, servers, tags sections
- [ ] 2.5 Create path definition generator from endpoint specifications
- [ ] 2.6 Implement component schema generator for request/response bodies
- [ ] 2.7 Build reusable parameter generator ($ref to components/parameters)
- [ ] 2.8 Create reusable response generator ($ref to components/responses)
- [ ] 2.9 Implement security scheme definitions (bearerAuth, OAuth2, API Key)
- [ ] 2.10 Add example generator for all request/response schemas
- [ ] 2.11 Build tag grouping logic for related operations
- [ ] 2.12 Implement operationId generator for all endpoints
- [ ] 2.13 Create server definitions (dev, staging, production)
- [ ] 2.14 Add WebSearch integration for OpenAPI 3.1 best practices
- [ ] 2.15 Implement version detection and semver handling

**VERIFY Phase 2:**
- [ ] spec:api generates valid OpenAPI 3.1 YAML that passes linting

---

## Phase 3: JSON Schema Generation (spec:schema)

**Objective:** Generate JSON Schema (draft 2020-12) definitions for data structures

**Tasks:**
- [ ] 3.1 Create sub-command file at `.claude/commands/spec/schema.md`
- [ ] 3.2 Configure YAML frontmatter with argument-hint: [schema-name]
- [ ] 3.3 Implement TypeScript type parser to extract interfaces and types
- [ ] 3.4 Build schema analyzer to read existing code structures
- [ ] 3.5 Create JSON Schema 2020-12 template generator with $schema and $id
- [ ] 3.6 Implement property type mapper (string, number, boolean, object, array)
- [ ] 3.7 Build format validator generator (email, uuid, date-time, uri)
- [ ] 3.8 Create constraint generator (minLength, maxLength, pattern, min, max)
- [ ] 3.9 Implement enum detection and generation
- [ ] 3.10 Add required fields detector and generator
- [ ] 3.11 Build nested schema handler with $ref support
- [ ] 3.12 Create additionalProperties policy generator
- [ ] 3.13 Implement example value generator for schemas
- [ ] 3.14 Add description generator from code comments
- [ ] 3.15 Build $defs section for reusable internal definitions

**VERIFY Phase 3:**
- [ ] spec:schema generates valid JSON Schema that validates with AJV

---

## Phase 4: GraphQL SDL Generation (spec:graphql)

**Objective:** Generate GraphQL Schema Definition Language specifications

**Tasks:**
- [ ] 4.1 Create sub-command file at `.claude/commands/spec/graphql.md`
- [ ] 4.2 Configure YAML frontmatter with argument-hint: [schema-name]
- [ ] 4.3 Implement GraphQL type detector from design documents
- [ ] 4.4 Build schema definition generator (Query, Mutation, Subscription)
- [ ] 4.5 Create custom scalar definitions (DateTime, UUID, Email, JSON)
- [ ] 4.6 Implement object type generator with field definitions
- [ ] 4.7 Build input type generator for mutations
- [ ] 4.8 Create enum type definitions
- [ ] 4.9 Implement interface and union type support
- [ ] 4.10 Add directive definitions (@auth, @deprecated, @constraint)
- [ ] 4.11 Build pagination type generator (Connection, Edge, PageInfo)
- [ ] 4.12 Create resolver specification JSON generator (resolvers-spec.json)
- [ ] 4.13 Implement field documentation from comments
- [ ] 4.14 Add deprecation reason support
- [ ] 4.15 Build schema stitching hints for microservices

**VERIFY Phase 4:**
- [ ] spec:graphql generates valid GraphQL SDL that passes schema linter

---

## Phase 5: AsyncAPI Event Specification (spec:events)

**Objective:** Generate AsyncAPI specifications for event-driven architectures

**Tasks:**
- [ ] 5.1 Create sub-command file at `.claude/commands/spec/events.md`
- [ ] 5.2 Configure YAML frontmatter with argument-hint: [service-name]
- [ ] 5.3 Implement event catalog parser from design documents
- [ ] 5.4 Build AsyncAPI 2.6 template generator with info and servers
- [ ] 5.5 Create channel definition generator for topics/queues
- [ ] 5.6 Implement message schema generator for event payloads
- [ ] 5.7 Build operation definitions (publish, subscribe)
- [ ] 5.8 Create protocol binding generator (Kafka, RabbitMQ, MQTT, WebSocket)
- [ ] 5.9 Implement server configuration (Kafka cluster, AMQP broker)
- [ ] 5.10 Add message trait definitions (headers, correlation ID)
- [ ] 5.11 Build event versioning strategy generator
- [ ] 5.12 Create schema registry integration hints
- [ ] 5.13 Implement dead letter queue configuration
- [ ] 5.14 Add retry policy specifications
- [ ] 5.15 Build event flow documentation generator

**VERIFY Phase 5:**
- [ ] spec:events generates valid AsyncAPI YAML that passes validation

---

## Phase 6: Data Model Specification (spec:data)

**Objective:** Generate data model specifications with entity relationships

**Tasks:**
- [ ] 6.1 Create sub-command file at `.claude/commands/spec/data.md`
- [ ] 6.2 Configure YAML frontmatter with argument-hint: [model-name]
- [ ] 6.3 Implement entity relationship parser from ERD diagrams
- [ ] 6.4 Build data model JSON schema generator
- [ ] 6.5 Create entity definition generator with attributes
- [ ] 6.6 Implement relationship mapper (one-to-one, one-to-many, many-to-many)
- [ ] 6.7 Add constraint definitions (unique, nullable, default)
- [ ] 6.8 Build index specification generator
- [ ] 6.9 Create foreign key relationship definitions
- [ ] 6.10 Implement cascade behavior specifications (ON DELETE, ON UPDATE)
- [ ] 6.11 Add data type mapping for target database (PostgreSQL, MySQL, MongoDB)

**VERIFY Phase 6:**
- [ ] spec:data generates valid data model JSON with all relationships

---

## Phase 7: Validation Integration

**Objective:** Integrate validation tools for post-generation quality checks

**Tasks:**
- [ ] 7.1 Implement OpenAPI validator using Redocly CLI
- [ ] 7.2 Add Swagger CLI validation for OpenAPI specs
- [ ] 7.3 Integrate AJV for JSON Schema validation
- [ ] 7.4 Implement GraphQL schema linter integration
- [ ] 7.5 Add AsyncAPI CLI validation
- [ ] 7.6 Create validation report generator
- [ ] 7.7 Build auto-fix suggestions for common validation errors
- [ ] 7.8 Implement $ref resolution validator
- [ ] 7.9 Add example validation against schemas
- [ ] 7.10 Create completeness checker (required sections, fields)
- [ ] 7.11 Build quality checklist validator for each spec type

**VERIFY Phase 7:**
- [ ] All generated specifications pass validation with standard tools

---

## Phase 8: Artifact Output Management

**Objective:** Standardize output locations and versioning for specifications

**Tasks:**
- [ ] 8.1 Create directory structure generator for `docs/specs/`
- [ ] 8.2 Implement versioned output folders (api/v1, api/v2)
- [ ] 8.3 Build sub-directory creators (schemas/, graphql/, events/, data/)
- [ ] 8.4 Create artifact metadata generator (timestamp, version, author)
- [ ] 8.5 Implement file naming conventions (openapi.yaml, schema.json)
- [ ] 8.6 Add version detection from existing specs
- [ ] 8.7 Build version bump logic (major, minor, patch)
- [ ] 8.8 Create changelog generator for spec versions
- [ ] 8.9 Implement artifact index file generator
- [ ] 8.10 Add validation stamp to artifact metadata

**VERIFY Phase 8:**
- [ ] Output directory structure matches specification and files are versioned correctly

---

## Phase 9: WebSearch Integration for Standards

**Objective:** Use WebSearch to reference latest standards and best practices

**Tasks:**
- [ ] 9.1 Implement OpenAPI 3.1 specification fetcher
- [ ] 9.2 Add JSON Schema 2020-12 specification reference
- [ ] 9.3 Build GraphQL specification fetcher for latest SDL syntax
- [ ] 9.4 Create AsyncAPI specification reference integration
- [ ] 9.5 Implement best practices searcher for each spec type
- [ ] 9.6 Add common pattern library fetcher (pagination, error handling)
- [ ] 9.7 Build security scheme best practices retriever
- [ ] 9.8 Create example repository searcher for reference implementations
- [ ] 9.9 Implement breaking change detector for spec versions
- [ ] 9.10 Add deprecation warning generator based on standards

**VERIFY Phase 9:**
- [ ] WebSearch provides accurate, up-to-date standard references

---

## Phase 10: Workflow Integration

**Objective:** Enable seamless handoff between upstream and downstream commands

**Tasks:**
- [ ] 10.1 Implement requirements.json parser from /clarify command
- [ ] 10.2 Add design-spec.md reader from /design command
- [ ] 10.3 Build architecture.md parser from /architect command
- [ ] 10.4 Create interface extractor from interfaces.md
- [ ] 10.5 Implement entity reader from entities.json (/model command)
- [ ] 10.6 Add output format for /implement command consumption
- [ ] 10.7 Build test data hint generator for /test command
- [ ] 10.8 Create documentation seed for /document:api command
- [ ] 10.9 Implement validation rule extractor for /validate command
- [ ] 10.10 Add workflow suggestion engine based on spec type
- [ ] 10.11 Build artifact relationship tracker (upstream/downstream)

**VERIFY Phase 10:**
- [ ] Specifications are consumable by /implement, /test, /document, /validate commands

---

## Phase 11: Quality Checklist System

**Objective:** Implement automated quality checks for generated specifications

**Tasks:**
- [ ] 11.1 Create OpenAPI quality checklist validator
- [ ] 11.2 Build JSON Schema quality checklist validator
- [ ] 11.3 Implement GraphQL quality checklist validator
- [ ] 11.4 Add AsyncAPI quality checklist validator
- [ ] 11.5 Create reusability detector (components usage vs duplication)
- [ ] 11.6 Build security definition completeness checker
- [ ] 11.7 Implement error response coverage analyzer
- [ ] 11.8 Add documentation completeness checker (descriptions)
- [ ] 11.9 Create example coverage analyzer
- [ ] 11.10 Build breaking change detector for version updates

**VERIFY Phase 11:**
- [ ] Quality checklists produce actionable improvement suggestions

---

## Phase 12: Error Handling & Edge Cases

**Objective:** Handle edge cases and error scenarios gracefully

**Tasks:**
- [ ] 12.1 Handle missing design documents gracefully
- [ ] 12.2 Implement fallback when no existing specs found
- [ ] 12.3 Add conflict resolution for contradictory interface definitions
- [ ] 12.4 Create schema complexity warning system
- [ ] 12.5 Implement circular reference detector and handler
- [ ] 12.6 Add invalid type mapping error handler
- [ ] 12.7 Build validation failure recovery logic
- [ ] 12.8 Create manual intervention prompts for ambiguous cases
- [ ] 12.9 Implement rollback for failed spec generation
- [ ] 12.10 Add partial spec save on interruption

**VERIFY Phase 12:**
- [ ] Error scenarios are handled without command failure

---

## Phase 13: Testing Across API Types

**Objective:** Validate spec generation for diverse API architectures

**Tasks:**
- [ ] 13.1 Test OpenAPI generation for simple CRUD REST API
- [ ] 13.2 Test OpenAPI generation for complex REST API (nested resources, batch operations)
- [ ] 13.3 Test JSON Schema generation for flat data structures
- [ ] 13.4 Test JSON Schema generation for deeply nested objects
- [ ] 13.5 Test GraphQL generation for query-only schema
- [ ] 13.6 Test GraphQL generation for full schema (Query, Mutation, Subscription)
- [ ] 13.7 Test AsyncAPI generation for Kafka-based event system
- [ ] 13.8 Test AsyncAPI generation for RabbitMQ/AMQP system
- [ ] 13.9 Test data model generation for relational database
- [ ] 13.10 Test data model generation for document database (MongoDB)
- [ ] 13.11 Validate all generated specs with standard tools
- [ ] 13.12 Test version upgrade scenarios (v1 -> v2 with breaking changes)

**VERIFY Phase 13:**
- [ ] All test scenarios produce valid, high-quality specifications

---

## Phase 14: Documentation

**Objective:** Create comprehensive usage documentation

**Tasks:**
- [ ] 14.1 Create main usage guide at `docs/commands/spec.md`
- [ ] 14.2 Document spec:api sub-command with OpenAPI examples
- [ ] 14.3 Document spec:schema sub-command with JSON Schema examples
- [ ] 14.4 Document spec:graphql sub-command with GraphQL SDL examples
- [ ] 14.5 Document spec:events sub-command with AsyncAPI examples
- [ ] 14.6 Document spec:data sub-command with data model examples
- [ ] 14.7 Create artifact schema reference documentation
- [ ] 14.8 Add workflow diagrams (clarify -> design -> spec -> implement)
- [ ] 14.9 Write best practices guide for contract-first development
- [ ] 14.10 Create validation guide with tool setup instructions
- [ ] 14.11 Add troubleshooting section for common validation errors
- [ ] 14.12 Document integration with code generation tools (openapi-generator, GraphQL codegen)

**VERIFY Phase 14:**
- [ ] Documentation is complete and examples are tested

---

## Success Criteria
- [ ] Command executes successfully via `/spec` and all 5 sub-commands
- [ ] OpenAPI 3.1 specifications pass Redocly and Swagger validation
- [ ] JSON Schema (2020-12) specifications validate with AJV
- [ ] GraphQL SDL specifications pass graphql-schema-linter
- [ ] AsyncAPI 2.6 specifications pass AsyncAPI CLI validation
- [ ] All specifications include required metadata (version, timestamp, status)
- [ ] Specifications are written to correct versioned directories
- [ ] WebSearch integration provides accurate standard references
- [ ] Workflow integration enables seamless command chaining
- [ ] Quality checklists identify completeness and best practice gaps
- [ ] All test scenarios (REST, GraphQL, events, data) produce valid specs
- [ ] Documentation enables independent usage with clear examples
- [ ] Generated specifications can drive implementation and testing

---

## References
- OpenAPI Specification 3.1: https://spec.openapis.org/oas/v3.1.0.html
- JSON Schema 2020-12: https://json-schema.org/draft/2020-12/json-schema-core.html
- AsyncAPI Specification: https://www.asyncapi.com/docs/reference/specification/latest
- GraphQL SDL: https://graphql.org/learn/schema/
- Source: docs/plan-outputs/architecture-review/findings/5-3-spec-command.md
- Source: docs/plan-outputs/architecture-review/findings/5-5-subcommands-catalog.md
- Source: docs/plan-outputs/architecture-review/findings/5-6-artifact-schemas.md
