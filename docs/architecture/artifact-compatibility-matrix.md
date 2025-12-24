# Artifact Compatibility Matrix

## Overview

This document maps the producer-consumer relationships between commands in the artifact chain, ensuring format compatibility and proper information flow.

**Last Updated:** 2025-12-23
**Status:** Active Reference Document

---

## Command Chain Overview

The primary artifact producer-consumer chain follows this workflow:

```
/architect → /design → /spec → /implement
```

Each command produces artifacts that are consumed by downstream commands. This matrix ensures compatibility across the chain.

---

## Artifact Flow Diagram

```mermaid
graph LR
    A[/architect] -->|architecture.md| B[/design]
    A -->|components.json| B
    B -->|design-spec.md| C[/spec]
    B -->|interfaces.md| C
    C -->|openapi.yaml| D[/implement]
    C -->|schema.json| D
    B -->|design-spec.md| D
```

---

## 1. /architect Command

### Produces

#### 1.1 architecture.md

**Artifact Type:** `architecture-document`

**Format:** Markdown with YAML frontmatter

**YAML Frontmatter Schema:**
```yaml
artifact_type: architecture-document
system: [system-name]
version: [semantic-version]
created_at: [ISO-8601-timestamp]
updated_at: [ISO-8601-timestamp]
status: draft | in-review | approved | deprecated
c4_levels: [context, container, component]
```

**Content Structure (12 Required Sections):**
1. Context & Goals
2. System Overview
3. Container Architecture
4. Component Architecture
5. Data Architecture
6. Cross-Cutting Concerns
7. Deployment Architecture
8. Quality Attributes Analysis
9. Technology Choices
10. Constraints & Trade-offs
11. Risks & Mitigations
12. Future Considerations

**Consumed By:**
- `/design` - Extracts component context, responsibilities, dependencies
- `/implement` - Provides implementation guidance and technology stack
- `/model` - Extracts data entities from Data Architecture section
- `/spec` - Extracts component interfaces and API patterns

**Critical Fields for Downstream:**
- Component responsibilities (Section 4)
- Technology choices (Section 9)
- Data architecture (Section 5)
- Quality attributes (Section 8)

---

#### 1.2 components.json

**Artifact Type:** `component-catalog`

**Format:** JSON

**JSON Schema:**
```json
{
  "metadata": {
    "artifact_type": "component-catalog",
    "system": "string",
    "version": "string",
    "created_at": "ISO-8601"
  },
  "containers": [
    {
      "id": "string",
      "name": "string",
      "technology": "string",
      "type": "string",
      "responsibility": "string",
      "components": ["component-id"]
    }
  ],
  "components": [
    {
      "id": "string",
      "name": "string",
      "type": "string",
      "responsibility": "string",
      "interfaces": {
        "provided": ["interface-spec"],
        "consumed": ["interface-spec"]
      },
      "dependencies": ["component-id"]
    }
  ],
  "relationships": [
    {
      "source": "component-id",
      "target": "component-id",
      "type": "string",
      "protocol": "string",
      "description": "string"
    }
  ],
  "external_dependencies": [
    {
      "id": "string",
      "name": "string",
      "type": "string",
      "protocol": "string"
    }
  ]
}
```

**Consumed By:**
- `/design` - Understands component boundaries and dependencies
- `/spec` - Extracts interface definitions for API specifications
- `/implement` - Guides file structure and component organization

**Critical Fields for Downstream:**
- `components[].interfaces` - Consumed by /design and /spec
- `components[].dependencies` - Consumed by /design for integration points
- `relationships[]` - Consumed by /design for interaction patterns
- `components[].type` - Consumed by /implement for template selection

---

#### 1.3 data-architecture.md

**Artifact Type:** `data-architecture`

**Format:** Markdown with YAML frontmatter

**YAML Frontmatter Schema:**
```yaml
artifact_type: data-architecture
system: [system-name]
version: [semantic-version]
created_at: [ISO-8601-timestamp]
```

**Content Structure:**
- Data stores (types, technologies, ownership)
- Data flow diagrams (Mermaid)
- Data governance policies
- Backup/recovery strategy
- Data privacy requirements

**Consumed By:**
- `/model` - Extracts entity relationships and data store requirements
- `/design:data` - Provides data structure specifications
- `/spec:data` - Generates data model specifications

---

#### 1.4 ADRs (Architectural Decision Records)

**Artifact Type:** `architecture-decision-record`

**Format:** Markdown with YAML frontmatter

**Location:** `docs/architecture/adr/NNNN-decision-name.md`

**YAML Frontmatter Schema:**
```yaml
artifact_type: architecture-decision-record
adr_number: NNNN
title: [Decision Title]
status: proposed | accepted | deprecated | superseded
date: YYYY-MM-DD
deciders: [list]
supersedes: [optional-NNNN]
superseded_by: [optional-NNNN]
```

**Content Sections:**
- Status
- Context
- Decision Drivers
- Options Considered (with pros/cons)
- Decision (chosen option + rationale)
- Consequences (positive, negative, neutral)
- Implementation Notes
- References

**Consumed By:**
- `/design` - Informs technology and pattern choices
- `/implement` - Guides implementation decisions

---

## 2. /design Command

### Consumes

#### 2.1 From /architect

**Required Artifacts:**
- `architecture.md` - Component context, responsibilities, technology stack
- `components.json` - Component boundaries, interfaces, dependencies

**Expected Fields:**
- Component responsibilities → Used for design-spec.md "Responsibilities" section
- Component interfaces → Used for interfaces.md generation
- Component dependencies → Used for "Integration Points" section
- Technology choices → Used for language-specific interface generation

**Handling Missing Artifacts:**
- If `architecture.md` missing: Prompt user or create minimal component specification
- If `components.json` missing: Warn and proceed with single-component scope

---

### Produces

#### 2.1 design-spec.md

**Artifact Type:** `design-specification`

**Format:** Markdown with YAML frontmatter

**YAML Frontmatter Schema:**
```yaml
artifact_type: design-specification
component: [component-name]
version: [semantic-version]
status: draft | in-review | approved
created_at: [ISO-8601-timestamp]
updated_at: [ISO-8601-timestamp]
related_artifacts:
  - architecture.md
  - requirements.json
  - components.json
```

**Content Structure (13 Required Sections):**
1. Overview (Purpose, Scope, Context)
2. Responsibilities (Primary, Secondary, Non-Responsibilities)
3. Public Interface (function signatures, contracts)
4. Internal Structure (data structures, key algorithms)
5. Dependencies (external and internal)
6. Integration Points (upstream/downstream, events)
7. Error Handling (error types, strategies)
8. State Management (state shape, transitions)
9. Performance Considerations (load expectations)
10. Security Considerations (auth, authorization, validation)
11. Testing Strategy (unit, integration guidance)
12. Implementation Guidance (recommended order)
13. Metadata (related artifacts)

**Consumed By:**
- `/spec` - Extracts API endpoints, data schemas, event specifications
- `/implement` - Generates code from design specifications

**Critical Fields for Downstream:**
- Public Interface section → Used by /spec for API generation
- Data structures → Used by /spec:schema for JSON Schema generation
- Error Handling → Used by /implement for error handling code
- State Management → Used by /implement for state management integration

---

#### 2.2 interfaces.md

**Artifact Type:** `interface-definitions`

**Format:** Markdown with TypeScript/language-specific code blocks

**YAML Frontmatter Schema:**
```yaml
artifact_type: interface-definitions
component: [component-name]
language: typescript | python | go | rust
version: [semantic-version]
created_at: [ISO-8601-timestamp]
```

**Content Structure:**
- Public Interfaces (with JSDoc/annotations)
- Data Transfer Objects (Request/Response DTOs with validation)
- Error Types (custom error classes)
- Events (Published/Consumed event interfaces)
- Configuration Interface

**Consumed By:**
- `/spec:api` - Converts to OpenAPI schemas
- `/spec:schema` - Generates JSON Schema definitions
- `/implement` - Generates type definitions and validators

**Critical Fields for Downstream:**
- Interface signatures → Used by /spec for API endpoint definitions
- DTOs with validation rules → Used by /spec for schema generation
- Event interfaces → Used by /spec:events for AsyncAPI generation

**Format Compatibility:**
- TypeScript interfaces → Directly consumable by /spec (TypeScript AST parsing)
- Validation annotations → Converted to JSON Schema constraints by /spec
- JSDoc comments → Converted to OpenAPI descriptions by /spec

---

#### 2.3 interaction-diagrams.md

**Artifact Type:** `interaction-diagrams`

**Format:** Markdown with Mermaid sequence and state diagrams

**YAML Frontmatter Schema:**
```yaml
artifact_type: interaction-diagrams
component: [component-name]
version: [semantic-version]
created_at: [ISO-8601-timestamp]
```

**Content Structure:**
- Happy Path Flow (Mermaid sequence diagrams)
- Error Scenarios (failure case diagrams)
- State Transition Diagram (Mermaid stateDiagram-v2)

**Consumed By:**
- `/implement` - Guides implementation of interaction logic
- `/test` - Generates integration test scenarios

---

#### 2.4 state-machine.json

**Artifact Type:** `state-machine-definition`

**Format:** JSON

**JSON Schema:**
```json
{
  "metadata": {
    "artifact_type": "state-machine-definition",
    "component": "string",
    "version": "string"
  },
  "states": [
    {
      "id": "string",
      "name": "string",
      "type": "initial | normal | final | error",
      "on_enter": ["action"],
      "on_exit": ["action"]
    }
  ],
  "transitions": [
    {
      "from": "state-id",
      "to": "state-id",
      "event": "string",
      "guard": "string",
      "actions": ["action"]
    }
  ],
  "events": [
    {
      "name": "string",
      "payload": {}
    }
  ],
  "initial_state": "state-id"
}
```

**Consumed By:**
- `/implement` - Generates state machine implementation
- `/test` - Generates state transition tests

---

## 3. /spec Command

### Consumes

#### 3.1 From /design

**Required Artifacts:**
- `design-spec.md` - API endpoints, data structures, requirements
- `interfaces.md` - Type definitions, DTOs, validation rules

**Expected Fields:**
- Public Interface section → Converted to OpenAPI paths or GraphQL types
- DTOs with validation → Converted to JSON Schema or OpenAPI schemas
- Error types → Converted to error response schemas
- Events → Converted to AsyncAPI message definitions

**Handling Missing Artifacts:**
- If `design-spec.md` missing: Fall back to code analysis
- If `interfaces.md` missing: Generate schemas from code inspection

---

#### 3.2 From /architect

**Optional Artifacts:**
- `architecture.md` - Technology choices, API patterns
- `components.json` - Component interfaces

**Usage:**
- Technology choices → Guide spec format selection (REST vs GraphQL)
- Component interfaces → Validate design interfaces match architecture

---

### Produces

#### 3.1 openapi.yaml

**Artifact Type:** `openapi-specification`

**Format:** YAML (OpenAPI 3.1)

**Schema:** OpenAPI 3.1.0 specification

**Key Sections:**
- `info` (version, title, description)
- `servers` (dev, staging, production)
- `paths` (endpoints with operations)
- `components/schemas` (reusable data models)
- `components/parameters` (reusable parameters)
- `components/responses` (reusable responses)
- `components/securitySchemes` (auth schemes)
- `tags` (endpoint grouping)

**Consumed By:**
- `/implement:api` - Generates API implementation
- `/test:api` - Generates API tests
- `/document:api` - Generates API documentation

**Critical Fields for Downstream:**
- `paths` → Used by /implement to generate route handlers
- `components/schemas` → Used by /implement for request/response validation
- `security` → Used by /implement for auth middleware
- `examples` → Used by /test for test data generation

---

#### 3.2 schema.json (JSON Schema)

**Artifact Type:** `json-schema`

**Format:** JSON (JSON Schema draft 2020-12)

**Schema Structure:**
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://example.com/schemas/[name].json",
  "type": "object",
  "properties": {
    "field": {
      "type": "string",
      "format": "email",
      "minLength": 1,
      "description": "Field description"
    }
  },
  "required": ["field"],
  "additionalProperties": false,
  "$defs": {}
}
```

**Consumed By:**
- `/implement:schema` - Generates type definitions and validators
- `/test` - Generates validation tests
- `/validate` - Runtime validation

**Critical Fields for Downstream:**
- `properties` with constraints → Used by /implement for validator generation
- `required` array → Used by /implement for validation logic
- `$defs` → Used by /implement for reusable type definitions

---

#### 3.3 asyncapi.yaml (Event Specifications)

**Artifact Type:** `asyncapi-specification`

**Format:** YAML (AsyncAPI 2.6)

**Key Sections:**
- `info` (title, version)
- `servers` (Kafka, RabbitMQ config)
- `channels` (topics/queues)
- `components/messages` (event schemas)
- `components/schemas` (payload schemas)

**Consumed By:**
- `/implement:events` - Generates event handlers
- `/test:events` - Generates event tests

---

#### 3.4 schema.graphql (GraphQL SDL)

**Artifact Type:** `graphql-schema`

**Format:** GraphQL SDL

**Key Sections:**
- Type definitions (Query, Mutation, Subscription)
- Custom scalars
- Input types
- Enums
- Directives

**Consumed By:**
- `/implement:graphql` - Generates resolvers
- `/test:graphql` - Generates GraphQL tests

---

## 4. /implement Command

### Consumes

#### 4.1 From /spec

**Preferred Artifacts (spec-driven approach):**
- `openapi.yaml` - For API implementation
- `schema.json` - For data validation
- `asyncapi.yaml` - For event handlers
- `schema.graphql` - For GraphQL resolvers

**Expected Usage:**
- OpenAPI paths → Generate route handlers
- OpenAPI schemas → Generate request/response validators
- JSON Schema → Generate type definitions (TypeScript interfaces, Zod schemas)
- AsyncAPI messages → Generate event publishers/subscribers

---

#### 4.2 From /design

**Fallback Artifacts (design-driven approach):**
- `design-spec.md` - For feature implementation
- `interfaces.md` - For component implementation

**Expected Usage:**
- Design spec sections → Generate component code
- Interface definitions → Generate type definitions
- State machine → Generate state management code

---

#### 4.3 From /architect

**Context Artifacts:**
- `architecture.md` - Technology stack guidance
- `components.json` - Component structure

---

### Produces

#### 4.1 implementation-notes.md

**Artifact Type:** `implementation-notes`

**Format:** Markdown with YAML frontmatter

**YAML Frontmatter Schema:**
```yaml
artifact_type: implementation-notes
component: [component-name]
version: [semantic-version]
created_at: [ISO-8601-timestamp]
generated_from:
  - openapi.yaml
  - design-spec.md
```

**Content Structure:**
- Implementation decisions
- Generated files list
- Verification status (type-check, lint, test)

**Consumed By:**
- `/review` - Code review context
- `/document` - Implementation documentation

---

#### 4.2 generated-code-manifest.json

**Artifact Type:** `code-manifest`

**Format:** JSON

**JSON Schema:**
```json
{
  "metadata": {
    "artifact_type": "code-manifest",
    "version": "string",
    "created_at": "ISO-8601"
  },
  "files": [
    {
      "path": "string",
      "type": "component | test | schema | config",
      "loc": "number",
      "dependencies": ["string"],
      "test_coverage": "number"
    }
  ],
  "verification": {
    "type_check": "pass | fail",
    "lint": "pass | fail",
    "tests": "pass | fail"
  }
}
```

**Consumed By:**
- `/test` - Test execution
- `/review` - Code review automation

---

## Compatibility Analysis

### Format Mismatches Identified

#### NONE FOUND

The artifact chain is well-designed with compatible formats:

1. **architecture.md → design-spec.md**
   - ✓ Component responsibilities map directly to design responsibilities
   - ✓ Component interfaces map to public interface definitions
   - ✓ Technology choices guide language selection

2. **components.json → interfaces.md**
   - ✓ Component interfaces schema matches interface definitions structure
   - ✓ Both use similar dependency representation

3. **design-spec.md + interfaces.md → openapi.yaml**
   - ✓ Public Interface section maps to OpenAPI paths
   - ✓ DTOs map to OpenAPI components/schemas
   - ✓ Validation rules convert to JSON Schema constraints
   - ✓ Error types map to error response schemas

4. **interfaces.md → schema.json**
   - ✓ TypeScript interfaces convert directly to JSON Schema
   - ✓ Validation annotations map to schema constraints

5. **openapi.yaml → implementation**
   - ✓ Well-established OpenAPI code generation patterns
   - ✓ Standard tooling available (openapi-generator)

---

## Recommendations

### 1. Add Artifact Schema Documentation to Each Plan

**Architect Plan Additions:**
- Add detailed schema for `architecture.md` frontmatter (already present in Phase 6)
- Add detailed schema for `components.json` (already present in Phase 6)
- Add consumption notes: "Consumed by /design (component context), /implement (tech stack), /model (data entities), /spec (interfaces)"

**Design Plan Additions:**
- Add detailed schema for `design-spec.md` frontmatter (already present in Phase 3)
- Add detailed schema for `interfaces.md` frontmatter (already present in Phase 4)
- Add consumption notes: "design-spec.md consumed by /spec (API/schema generation), /implement (feature implementation)"
- Add production notes: "Ensure Public Interface section format matches /spec:api expectations"

**Spec Plan Additions:**
- Add production notes: "Ensure openapi.yaml includes operationId for all operations (required by /implement)"
- Add production notes: "Ensure all schemas have examples (used by /test for test data)"
- Add consumption notes: "Consumes design-spec.md Public Interface section for path generation"

**Implement Plan Additions:**
- Add consumption notes: "Prefers openapi.yaml (spec-driven), falls back to design-spec.md (design-driven)"
- Add artifact validation: "Validate consumed specs before code generation"

---

### 2. Critical Field Mappings

Document these specific field mappings in each plan:

**architect → design:**
```yaml
# components.json
components[].responsibility → design-spec.md "Responsibilities"
components[].interfaces.provided → interfaces.md "Public Interfaces"
components[].dependencies → design-spec.md "Integration Points"
```

**design → spec:**
```yaml
# design-spec.md
"Public Interface" section → openapi.yaml paths
"Error Handling" section → openapi.yaml components/responses

# interfaces.md
DTOs with validation → openapi.yaml components/schemas
Event interfaces → asyncapi.yaml components/messages
```

**spec → implement:**
```yaml
# openapi.yaml
paths[].{method} → route handlers
components/schemas → validation middleware
security → auth middleware
examples → test data
```

---

### 3. Version Compatibility

All artifacts should include semantic versioning:
- Breaking changes to artifact schemas require major version bump
- Track schema versions independently from command versions
- Document schema migration guides for major version changes

---

## Matrix Summary

| Producer Command | Artifact | Consumer Command(s) | Format | Status |
|------------------|----------|---------------------|--------|--------|
| /architect | architecture.md | /design, /implement, /model, /spec | Markdown + YAML | ✓ Compatible |
| /architect | components.json | /design, /spec, /implement | JSON | ✓ Compatible |
| /architect | data-architecture.md | /model, /design:data, /spec:data | Markdown + YAML | ✓ Compatible |
| /architect | adr/*.md | /design, /implement | Markdown + YAML | ✓ Compatible |
| /design | design-spec.md | /spec, /implement | Markdown + YAML | ✓ Compatible |
| /design | interfaces.md | /spec, /implement | Markdown + Code | ✓ Compatible |
| /design | interaction-diagrams.md | /implement, /test | Markdown + Mermaid | ✓ Compatible |
| /design | state-machine.json | /implement, /test | JSON | ✓ Compatible |
| /spec | openapi.yaml | /implement:api, /test, /document | YAML (OAS 3.1) | ✓ Compatible |
| /spec | schema.json | /implement:schema, /test, /validate | JSON (2020-12) | ✓ Compatible |
| /spec | asyncapi.yaml | /implement:events, /test | YAML (AsyncAPI 2.6) | ✓ Compatible |
| /spec | schema.graphql | /implement:graphql, /test | GraphQL SDL | ✓ Compatible |
| /implement | implementation-notes.md | /review, /document | Markdown + YAML | ✓ Compatible |
| /implement | generated-code-manifest.json | /test, /review | JSON | ✓ Compatible |

---

## Validation Checklist

When implementing artifact production:

### For Producers
- [ ] Include complete YAML frontmatter with all required fields
- [ ] Include `artifact_type` field in frontmatter
- [ ] Include semantic version in frontmatter
- [ ] Include `created_at` and `updated_at` timestamps
- [ ] Include `related_artifacts` array linking to upstream artifacts
- [ ] Validate artifact against schema before writing
- [ ] Include examples where applicable
- [ ] Document any deviations from schema in artifact notes

### For Consumers
- [ ] Validate artifact exists before consuming
- [ ] Validate artifact schema version compatibility
- [ ] Handle missing optional fields gracefully
- [ ] Validate required fields are present
- [ ] Parse YAML frontmatter correctly
- [ ] Reference source artifact in generated artifacts
- [ ] Validate cross-references resolve correctly
- [ ] Provide clear error messages for schema mismatches

---

## Future Enhancements

1. **Schema Registry**: Centralized artifact schema registry with validation
2. **Migration Tools**: Automated artifact schema migration between versions
3. **Validation Library**: Shared validation library for artifact schemas
4. **Artifact Linting**: Pre-commit hooks to validate artifact schemas
5. **Visual Artifact Browser**: Web UI to visualize artifact relationships
6. **Artifact Diffing**: Tool to compare artifact versions and detect breaking changes

---

## References

- Implementation Plan: /architect - `/home/benjamin/tools/dev_workflow/docs/plans/implement-architect-command.md`
- Implementation Plan: /design - `/home/benjamin/tools/dev_workflow/docs/plans/implement-design-command.md`
- Implementation Plan: /spec - `/home/benjamin/tools/dev_workflow/docs/plans/implement-spec-command.md`
- Implementation Plan: /implement - `/home/benjamin/tools/dev_workflow/docs/plans/implement-implement-command.md`
- Standards Document - `/home/benjamin/tools/dev_workflow/docs/standards/implementation-plan-standards.md`
- Artifact Type Registry - `/home/benjamin/tools/dev_workflow/docs/standards/artifact-type-registry.md`
