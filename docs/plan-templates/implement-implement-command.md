# Implementation Plan: /implement Command

## Overview
- **Goal:** Implement /implement command for spec-driven code generation
- **Priority:** P0 (Critical)
- **Created:** {{date}}
- **Output:** `docs/plan-outputs/implement-implement-command/`
- **Category:** Implementation Commands

> The `/implement` command transforms design artifacts, specifications, and requirements into production-ready code. It bridges the gap between design/architecture and working implementation by supporting spec-driven development, pattern consistency, and incremental refinement.

---

## Core Philosophy

- **Spec-driven development**: Generate code from OpenAPI, JSON Schema, AsyncAPI, and other formal specifications
- **Pattern consistency**: Analyze and follow existing codebase conventions and patterns
- **Production-ready**: Include error handling, logging, validation, and testing hooks
- **Incremental implementation**: Support partial implementation and iterative refinement

---

## Phase 1: Command Infrastructure and Routing

**Objective**: Set up the base /implement command infrastructure with sub-command routing.

- [ ] 1.1 Create `src/commands/implement/index.ts` with command registration and router
- [ ] 1.2 Implement sub-command discovery and loading mechanism
- [ ] 1.3 Create `src/commands/implement/types.ts` with shared types and interfaces
- [ ] 1.4 Define `ImplementContext` interface for passing state between phases
- [ ] 1.5 Create `src/commands/implement/utils/pattern-analyzer.ts` for detecting codebase patterns
- [ ] 1.6 Implement argument parsing for `[component-or-feature-name]` with validation
- [ ] 1.7 Create `src/commands/implement/config.ts` for command configuration defaults
- [ ] 1.8 Add command registration to main command registry
- [ ] 1.9 Implement basic help text and usage documentation
- [ ] 1.10 Create unit tests for command infrastructure and routing

**VERIFY 1:** Command loads successfully, routes to sub-commands, help text displays correctly

---

## Phase 2: implement:feature Sub-Command (P0)

**Objective**: Implement the feature-level code generation sub-command.

- [ ] 2.1 Create `src/commands/implement/subcommands/feature.ts` with feature implementation logic
- [ ] 2.2 Implement design artifact discovery (search for design-spec.md, requirements.json)
- [ ] 2.3 Create feature scope analyzer to parse requirements and identify components
- [ ] 2.4 Implement file structure generator based on feature scope and project conventions
- [ ] 2.5 Create code template engine for feature scaffolding (controllers, services, models)
- [ ] 2.6 Implement dependency injection and integration point detection
- [ ] 2.7 Create error handling and validation layer generator
- [ ] 2.8 Implement logging instrumentation insertion
- [ ] 2.9 Generate feature tests based on requirements and acceptance criteria
- [ ] 2.10 Create feature implementation report in implementation-notes.md

**VERIFY 2:** Can generate complete feature from design-spec.md with all layers

---

## Phase 3: implement:component Sub-Command (P0)

**Objective**: Implement component-level code generation from specifications.

- [ ] 3.1 Create `src/commands/implement/subcommands/component.ts` with component logic
- [ ] 3.2 Implement component specification parser (support JSON Schema, TypeScript interfaces)
- [ ] 3.3 Create component template selector based on component type (class, function, hook)
- [ ] 3.4 Implement props/parameters validation code generator
- [ ] 3.5 Create state management integration (detect Redux, MobX, Context patterns)
- [ ] 3.6 Implement lifecycle hooks and side effects generation
- [ ] 3.7 Generate component-level error boundaries and error handling
- [ ] 3.8 Create component test suite generator (unit tests, integration tests)
- [ ] 3.9 Implement story/documentation file generation for UI components
- [ ] 3.10 Generate component manifest with dependencies and exports

**VERIFY 3:** Can generate components with props, state, tests, and documentation

---

## Phase 4: implement:api Sub-Command (P0)

**Objective**: Generate API implementation from OpenAPI specifications.

- [ ] 4.1 Create `src/commands/implement/subcommands/api.ts` with API generation logic
- [ ] 4.2 Implement OpenAPI 3.x parser and validator
- [ ] 4.3 Create route/endpoint generator with HTTP method handlers
- [ ] 4.4 Implement request validation middleware from schema definitions
- [ ] 4.5 Generate response serializers and error response formatters
- [ ] 4.6 Create authentication/authorization middleware from security schemes
- [ ] 4.7 Implement API client SDK generator for documented endpoints
- [ ] 4.8 Generate API integration tests from example requests/responses
- [ ] 4.9 Create API documentation merger (combine spec with implementation notes)
- [ ] 4.10 Generate API versioning structure if versions detected in spec

**VERIFY 4:** Can generate complete API from openapi.yaml with validation and tests

---

## Phase 5: implement:schema Sub-Command (P1)

**Objective**: Generate data models and validators from JSON Schema definitions.

- [ ] 5.1 Create `src/commands/implement/subcommands/schema.ts` with schema generation
- [ ] 5.2 Implement JSON Schema parser with draft-07 and draft-2020-12 support
- [ ] 5.3 Create type definition generator (TypeScript interfaces, Zod schemas)
- [ ] 5.4 Implement runtime validator generator (Ajv, Zod, Joi based on project)
- [ ] 5.5 Generate serialization/deserialization functions for complex types
- [ ] 5.6 Create schema-to-database migration generator for persistence
- [ ] 5.7 Implement schema documentation generator with examples
- [ ] 5.8 Generate schema evolution utilities (migration, versioning)
- [ ] 5.9 Create schema test suite with valid/invalid data examples
- [ ] 5.10 Generate schema registry integration for distributed systems

**VERIFY 5:** Can generate types, validators, and docs from JSON Schema files

---

## Phase 6: implement:data Sub-Command (P1)

**Objective**: Generate data access layer from data models and specifications.

- [ ] 6.1 Create `src/commands/implement/subcommands/data.ts` with data layer logic
- [ ] 6.2 Implement data model parser (support multiple ORM formats)
- [ ] 6.3 Create repository pattern generator with CRUD operations
- [ ] 6.4 Implement query builder integration based on detected ORM (TypeORM, Prisma, Sequelize)
- [ ] 6.5 Generate database migration files from model definitions
- [ ] 6.6 Create data validation layer with schema integration
- [ ] 6.7 Implement transaction management and connection pooling setup
- [ ] 6.8 Generate data access tests with fixtures and mock data
- [ ] 6.9 Create caching layer integration for frequently accessed data
- [ ] 6.10 Generate data layer documentation with usage examples

**VERIFY 6:** Can generate complete data layer with repositories, migrations, tests

---

## Phase 7: Artifact Output Generation

**Objective**: Implement standardized artifact output for implementation tracking.

- [ ] 7.1 Create `src/commands/implement/artifacts/implementation-notes.ts` generator
- [ ] 7.2 Implement implementation-notes.md template with sections: decisions, files, verification
- [ ] 7.3 Create `src/commands/implement/artifacts/code-manifest.ts` generator
- [ ] 7.4 Implement generated-code-manifest.json schema with file metadata
- [ ] 7.5 Create artifact file metadata collector (LOC, dependencies, test coverage)
- [ ] 7.6 Implement implementation decisions documentation formatter
- [ ] 7.7 Create verification status tracker (type-check, lint, test results)
- [ ] 7.8 Implement artifact versioning and changelog generation
- [ ] 7.9 Create artifact cross-referencing to link generated files with specs
- [ ] 7.10 Generate artifact summary report with statistics and metrics

**VERIFY 7:** All sub-commands generate implementation-notes.md and manifest.json

---

## Phase 8: Verification Integration

**Objective**: Integrate automated verification for generated code quality.

- [ ] 8.1 Create `src/commands/implement/verification/index.ts` with verification orchestrator
- [ ] 8.2 Implement type checking integration (TypeScript tsc, Flow)
- [ ] 8.3 Create linting integration with auto-fix for generated code
- [ ] 8.4 Implement test execution and coverage reporting
- [ ] 8.5 Create build verification to ensure generated code compiles
- [ ] 8.6 Implement import/dependency validation against manifest
- [ ] 8.7 Create code style consistency checker against existing patterns
- [ ] 8.8 Implement security scan for generated code (detect hardcoded secrets, SQL injection)
- [ ] 8.9 Create verification report generator with pass/fail status
- [ ] 8.10 Implement verification failure recovery suggestions

**VERIFY 8:** Verification runs automatically and reports issues with suggestions

---

## Phase 9: Workflow Integration

**Objective**: Integrate /implement with upstream and downstream workflow commands.

- [ ] 9.1 Create `src/commands/implement/integration/upstream.ts` for input artifact discovery
- [ ] 9.2 Implement design-spec.md parser from /design command output
- [ ] 9.3 Create openapi.yaml parser from /spec:api command output
- [ ] 9.4 Implement requirements.json parser from /clarify command output
- [ ] 9.5 Create artifact dependency graph builder for traceability
- [ ] 9.6 Implement /test command integration for generated test execution
- [ ] 9.7 Create /review command integration to trigger code review
- [ ] 9.8 Implement /document command integration for API docs generation
- [ ] 9.9 Create workflow state persistence for resuming partial implementations
- [ ] 9.10 Implement workflow reporting showing full design-to-implementation pipeline

**VERIFY 9:** Can chain /design -> /implement -> /test -> /review successfully

---

## Phase 10: Testing and Validation

**Objective**: Comprehensive testing of /implement command functionality.

- [ ] 10.1 Create integration test suite for all P0 sub-commands
- [ ] 10.2 Implement test fixtures with sample specs (OpenAPI, JSON Schema, design docs)
- [ ] 10.3 Create golden file tests comparing generated output with expected results
- [ ] 10.4 Implement regression tests for pattern detection and code generation
- [ ] 10.5 Create performance tests for large specification processing
- [ ] 10.6 Implement error handling tests for malformed inputs
- [ ] 10.7 Create cross-platform tests (different project types, languages)
- [ ] 10.8 Implement user acceptance tests with real-world scenarios
- [ ] 10.9 Create documentation review and validation
- [ ] 10.10 Perform end-to-end workflow testing with /design, /test, /review

**VERIFY 10:** All tests pass, documentation complete, ready for production use

---

## Success Criteria

- [ ] /implement command registered and accessible via CLI
- [ ] implement:feature generates complete features from design-spec.md
- [ ] implement:component generates components with tests and docs
- [ ] implement:api generates API from OpenAPI with validation
- [ ] implement:schema generates types and validators from JSON Schema
- [ ] implement:data generates data layer with repositories and migrations
- [ ] All sub-commands generate implementation-notes.md and manifest.json
- [ ] Verification runs automatically (type-check, lint, test)
- [ ] Workflow integration with /design, /test, /review commands
- [ ] Comprehensive test coverage (>80%) for all functionality
- [ ] Documentation complete with examples for each sub-command

---

## Dependencies

**Required Before Starting:**
- Core command infrastructure (`src/commands/`)
- Artifact registry system for input/output tracking
- Pattern analysis utilities for codebase convention detection
- Template engine for code generation

**Integrations:**
- /design command for design-spec.md input
- /spec command for OpenAPI/AsyncAPI input
- /clarify command for requirements.json input
- /test command for test execution
- /review command for code review
- /document command for documentation generation

---

## Risks and Mitigations

- **Risk:** Generated code doesn't follow project conventions
  - **Mitigation:** Implement robust pattern analyzer that learns from existing code

- **Risk:** Specifications are incomplete or ambiguous
  - **Mitigation:** Implement validation and prompt user for missing information

- **Risk:** Generated code has runtime errors or bugs
  - **Mitigation:** Comprehensive verification phase with type-checking, linting, testing

- **Risk:** Performance issues with large specifications
  - **Mitigation:** Implement incremental processing and caching strategies

- **Risk:** Breaking changes in external spec formats (OpenAPI, JSON Schema)
  - **Mitigation:** Support multiple versions, implement version detection

- **Risk:** Integration conflicts with existing codebase
  - **Mitigation:** Dry-run mode, conflict detection, merge strategy options

---

## Output Artifacts

**Per Implementation:**
- `implementation-notes.md` - Human-readable implementation documentation
- `generated-code-manifest.json` - Machine-readable file manifest with metadata
- Generated source files (components, APIs, models, etc.)
- Generated test files (unit tests, integration tests)
- Verification reports (type-check, lint, test results)

**Workflow Artifacts:**
- `workflow-trace.json` - End-to-end traceability from design to implementation
- `verification-summary.md` - Aggregated verification results across all generated code

---

## Related Commands

- `/design` - Creates design-spec.md consumed by /implement
- `/spec:api` - Creates OpenAPI specs for implement:api
- `/clarify` - Creates requirements.json for implement:feature
- `/test` - Executes tests generated by /implement
- `/review` - Reviews code generated by /implement
- `/document` - Documents APIs and components generated by /implement

---

## Future Enhancements

- Plugin architecture for custom code generators
- Support for additional languages beyond TypeScript/JavaScript
- AI-assisted code completion for complex logic
- Interactive mode for step-by-step generation with user feedback
- Integration with external code quality tools
- Template marketplace for community-contributed generators
- implement:graphql sub-command for GraphQL resolver generation
- implement:events sub-command for AsyncAPI event handler generation
- implement:ui sub-command for UI component generation from specs
