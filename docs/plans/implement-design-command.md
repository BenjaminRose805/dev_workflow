# Implementation Plan: Implement /design Command

## Overview
- **Goal:** Build component-level detailed design system with interface specifications and interaction patterns
- **Priority:** P1 (Design & Architecture)
- **Created:** 2025-12-22
- **Output:** `docs/plan-outputs/design-command/`
- **Model:** Sonnet
- **Category:** Design & Architecture

> Implement the /design command to enable detailed component-level design that bridges architecture and implementation. The command creates implementation-ready specifications with well-defined interfaces, data structures, interaction patterns, and error handling. It operates between high-level architecture (/architect) and code implementation (/implement), producing artifacts that guide developers with clear contracts and design decisions.

### Sub-Command Priorities

| Sub-Command | Priority | Scope | Description |
|-------------|----------|-------|-------------|
| `design:component` | P0 | MVP | Designs component internals with responsibilities, interfaces, and internal structure |
| `design:api` | P0 | MVP | Designs RESTful/GraphQL APIs with endpoints, DTOs, and validation rules |
| `design:data` | P0 | MVP | Designs data structures, schemas, validation rules, and relationships |
| `design:interactions` | P1 | Core | Designs component interaction patterns with sequence diagrams and message flows |
| `design:state` | P1 | Core | Designs state management with state machines and transition rules |
| `design:ui` | P2 | Enhancement | Designs UI component hierarchy with props, events, and styling approach |

---


---

## Dependencies

### Upstream
- `/architect` - Consumes system-level architecture decisions and component boundaries
- `/clarify` - Consumes requirements.json for requirements-driven design
- `/explore` - Uses exploration reports for codebase context

### Downstream
- `/implement` - Consumes design-spec.md, interfaces.md for code generation
- `/test` - Uses design specs for test generation
- `/spec` - Formalizes design into OpenAPI/JSON Schema
- `/document` - References design specifications for documentation

### External Tools
- Read, Grep, Glob tools for codebase analysis
- Write tool for artifact generation
- AskUserQuestion for interactive design sessions
- JSON and Markdown file format support
- Mermaid for diagram generation
- JSON Schema draft-07 or later for schema validation

### Artifact Compatibility
See `docs/architecture/artifact-compatibility-matrix.md` for detailed artifact schemas and producer-consumer relationships.

---

## Command Boundaries

### Scope Definition
The `/design` command focuses on **component-level design decisions** that bridge architecture and implementation. It defines interfaces, contracts, and internal structure.

### Primary Focus
- **Component/module level**: Interface definitions, internal structure, responsibilities
- **Contract specification**: API contracts, DTOs, error types, events
- **Interaction design**: Sequence diagrams, state machines, message flows
- **Implementation guidance**: Design decisions that guide code structure

### Scope Hierarchy

| Command | Scope Level | Focus | Artifacts |
|---------|-------------|-------|-----------|
| `/refactor` | Function/Class | Implementation structure | refactoring-plan.md, impact-analysis.json |
| `/design` | Component/Module | Interfaces and contracts | design-spec.md, interfaces.md |
| `/architect` | System/Service | Architecture decisions | architecture.md, components.json |

### Boundary Rules
1. `/design` defines **what code does**, `/refactor` changes **how code works**
2. `/design` operates within architecture constraints from `/architect`
3. `/design` produces specifications, `/refactor` produces code changes
4. `/design` defines interfaces, `/implement` realizes them

### When to Use /design vs /refactor vs /architect

| Scenario | Use This Command | Rationale |
|----------|------------------|-----------|
| "Design component interface" | `/design:component` | Interface specification |
| "Define API contracts" | `/design:api` | Contract definition |
| "Design data model" | `/design:data` | Schema specification |
| "Design state management" | `/design:state` | State machine definition |
| "Plan system architecture" | `/architect:system` | High-level design |
| "Define deployment topology" | `/architect:deployment` | Infrastructure design |
| "Extract this method" | `/refactor:extract` | Code-level change |
| "Reduce complexity" | `/refactor:simplify` | Implementation optimization |

### Handoff Points

**Architect → Design:**
- architecture.md Section 3 (Container Architecture) → design-spec.md component context
- components.json → design-spec.md "Dependencies" section
- architecture.md Section 9 (Technology Choices) → interfaces.md language parameter

**Design → Implement:**
- design-spec.md → implementation guidance for /implement
- interfaces.md → TypeScript/Python interfaces to implement
- interaction-diagrams.md → integration test scenarios

**Design → Refactor:**
- design-spec.md → refactor:patterns pattern selection
- interfaces.md → refactor:types type annotations

---

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Design-implementation divergence | High | Generate implementation-ready artifacts, include code examples that compile |
| Over-specification | Medium | Focus on essential interfaces and contracts, avoid premature optimization |
| Missing upstream context | High | Validate architecture.md exists before detailed design, prompt for missing context |
| Interface instability | High | Version interfaces, document breaking change process |
| State machine complexity | Medium | Limit state count, provide visual diagrams, validate with stakeholders |
| Pattern misapplication | Medium | Provide pattern selection guidance, include anti-pattern warnings |
| Cross-component inconsistency | High | Share type definitions, validate interface compatibility across components |

---

## Phase 1: Core Command Setup

**Objective:** Establish base /design command infrastructure with YAML frontmatter and output directory structure

**Tasks:**
- [ ] 1.1 Create YAML configuration at `.claude/commands/design.md` with base metadata
- [ ] 1.2 Configure model as `sonnet` for balanced design capability and cost-effectiveness
- [ ] 1.3 Define allowed tools: Read, Grep, Glob, Write, AskUserQuestion (no WebSearch/Bash)
- [ ] 1.4 Set argument-hint to `[component-or-feature-name]` for component targeting
- [ ] 1.5 Set command category as "design-architecture" with CRITICAL priority
- [ ] 1.6 Define output_artifacts: design-spec.md, interfaces.md, interaction-diagrams.md
- [ ] 1.7 Create base prompt template with design methodology framework
- [ ] 1.8 Implement output directory structure: `docs/design/[component-name]/`

**VERIFY Phase 1:**
- [ ] Command loads successfully, directory structure is created, YAML frontmatter validates

---

## Phase 2: Sub-Command Infrastructure (6 Sub-Commands)

**Objective:** Create all 6 sub-command files with proper YAML frontmatter and categorization

**Tasks:**
- [ ] 2.1 Create `.claude/commands/design/component.md` (P0) - Component internals design
- [ ] 2.2 Create `.claude/commands/design/api.md` (P0) - API endpoint/interface design
- [ ] 2.3 Create `.claude/commands/design/data.md` (P0) - Data structure and schema design
- [ ] 2.4 Create `.claude/commands/design/interactions.md` (P1) - Component interaction patterns
- [ ] 2.5 Create `.claude/commands/design/state.md` (P1) - State management design
- [ ] 2.6 Create `.claude/commands/design/ui.md` (P2) - UI component design
- [ ] 2.7 Configure all sub-commands with `sonnet` model and appropriate tools
- [ ] 2.8 Set argument-hints specific to each sub-command's purpose

**VERIFY Phase 2:**
- [ ] All 6 sub-commands are discoverable via skill system, each loads with correct configuration

---

## Phase 3: Artifact Schema Implementation - design-spec.md

**Objective:** Implement comprehensive design specification artifact generator

**Tasks:**
- [ ] 3.1 Create YAML frontmatter schema with artifact_type, component, version, status
- [ ] 3.2 Implement "Overview" section generator (Purpose, Scope, Context)
- [ ] 3.3 Build "Responsibilities" section with Primary/Secondary/Non-Responsibilities
- [ ] 3.4 Create "Public Interface" section with function signatures and contracts
- [ ] 3.5 Implement "Internal Structure" section (Data Structures, Key Algorithms)
- [ ] 3.6 Build "Dependencies" section (External and Internal dependencies)
- [ ] 3.7 Create "Integration Points" section (Upstream/Downstream, Events)
- [ ] 3.8 Implement "Error Handling" section with error types and strategies
- [ ] 3.9 Build "State Management" section with state shape and transitions
- [ ] 3.10 Add "Performance Considerations" section with load expectations
- [ ] 3.11 Add "Security Considerations" section (Auth, Authorization, Validation)
- [ ] 3.12 Create "Testing Strategy" section (Unit, Integration test guidance)
- [ ] 3.13 Implement "Implementation Guidance" section with recommended order
- [ ] 3.14 Add metadata tracking: related_artifacts links to architecture.md, requirements.json

**VERIFY Phase 3:**
- [ ] design-spec.md validates against schema, all sections are populated with relevant content

---

## Phase 4: Artifact Schema Implementation - interfaces.md

**Objective:** Create TypeScript-based interface definition artifact with DTOs and events

**Tasks:**
- [ ] 4.1 Create YAML frontmatter with artifact_type: interface-definitions
- [ ] 4.2 Implement "Public Interfaces" section with TypeScript interface syntax
- [ ] 4.3 Add JSDoc comments to interfaces with @param, @returns, @throws annotations
- [ ] 4.4 Build "Data Transfer Objects" section with Request/Response DTOs
- [ ] 4.5 Add validation rules for each DTO field (required, length, format)
- [ ] 4.6 Create "Error Types" section with custom error class definitions
- [ ] 4.7 Implement "Events" section with Published/Consumed event interfaces
- [ ] 4.8 Add "Configuration Interface" section for component config
- [ ] 4.9 Support language parameter in frontmatter (typescript, python, go, rust)
- [ ] 4.10 Generate language-appropriate syntax based on language parameter

**VERIFY Phase 4:**
- [ ] interfaces.md validates, TypeScript syntax is correct, interfaces are implementation-ready

---

## Phase 5: Artifact Schema Implementation - Interaction Diagrams

**Objective:** Generate Mermaid-based sequence and state diagrams for component interactions

**Tasks:**
- [ ] 5.1 Create interaction-diagrams.md with artifact_type: interaction-diagrams
- [ ] 5.2 Implement "Happy Path Flow" section with Mermaid sequence diagrams
- [ ] 5.3 Build multi-participant sequence diagrams (Client, Component, Dependencies)
- [ ] 5.4 Add "Error Scenarios" section with failure case diagrams
- [ ] 5.5 Create "State Transition Diagram" section with stateDiagram-v2 syntax
- [ ] 5.6 Implement automatic diagram generation from design-spec state transitions
- [ ] 5.7 Add validation and edge case flow diagrams
- [ ] 5.8 Support multiple diagram types (sequence, state, flowchart)

**VERIFY Phase 5:**
- [ ] Mermaid diagrams render correctly, diagrams accurately represent design specification

---

## Phase 6: Artifact Schema Implementation - state-machine.json

**Objective:** Create machine-readable state machine definition for state-driven components

**Tasks:**
- [ ] 6.1 Create JSON schema for state-machine-definition artifact type
- [ ] 6.2 Implement metadata object with artifact_type, component, version
- [ ] 6.3 Build "states" array with id, name, type (initial/normal/final/error)
- [ ] 6.4 Add on_enter and on_exit action arrays to state objects
- [ ] 6.5 Create "transitions" array with from, to, event, guard, actions
- [ ] 6.6 Implement "events" array with event name and payload schema
- [ ] 6.7 Add initial_state field to define entry point
- [ ] 6.8 Validate JSON schema compliance for all generated state machines
- [ ] 6.9 Create generator to convert state-machine.json to Mermaid diagrams

**VERIFY Phase 6:**
- [ ] state-machine.json validates against JSON schema, can be consumed by state libraries

---

## Phase 7: Sub-Command Implementation - design:component (P0)

**Objective:** Implement component internal design with responsibilities and structure

**Tasks:**
- [ ] 7.1 Build codebase analysis logic to find existing component patterns
- [ ] 7.2 Implement responsibility extraction from requirements/architecture
- [ ] 7.3 Create interface design logic with minimal, cohesive contracts
- [ ] 7.4 Build dependency identification from architecture.md and components.json
- [ ] 7.5 Generate internal data structure specifications
- [ ] 7.6 Create error handling strategy based on component type
- [ ] 7.7 Produce design-spec.md and interfaces.md artifacts
- [ ] 7.8 Add implementation-notes.md for critical design decisions

**VERIFY Phase 7:**
- [ ] design:component produces complete, implementation-ready specifications

---

## Phase 8: Sub-Command Implementation - design:api (P0)

**Objective:** Design RESTful/GraphQL APIs with OpenAPI and interface definitions

**Tasks:**
- [ ] 8.1 Implement REST endpoint design logic (GET, POST, PUT, DELETE, PATCH)
- [ ] 8.2 Build request/response DTO generation with validation rules
- [ ] 8.3 Create error code and HTTP status mapping
- [ ] 8.4 Add idempotency requirements for non-GET endpoints
- [ ] 8.5 Implement rate limiting and pagination design
- [ ] 8.6 Build authentication/authorization requirements per endpoint
- [ ] 8.7 Generate api-spec.md with endpoint documentation
- [ ] 8.8 Create openapi.yaml skeleton for /spec:api formalization
- [ ] 8.9 Add API versioning strategy (URL, header, or media type)

**VERIFY Phase 8:**
- [ ] design:api produces RESTful API design ready for implementation and OpenAPI spec

---

## Phase 9: Sub-Command Implementation - design:data (P0)

**Objective:** Design data structures, schemas, and validation rules

**Tasks:**
- [ ] 9.1 Analyze existing data models from model:erd or architecture
- [ ] 9.2 Create entity/type definitions with field types and constraints
- [ ] 9.3 Define validation rules (required, unique, length, format, range)
- [ ] 9.4 Build relationship definitions (one-to-one, one-to-many, many-to-many)
- [ ] 9.5 Add data invariants and business rules
- [ ] 9.6 Create data-model.md artifact with comprehensive schemas
- [ ] 9.7 Generate schemas.json with JSON Schema format
- [ ] 9.8 Add migration strategy for evolving data structures

**VERIFY Phase 9:**
- [ ] design:data produces data models ready for database/ORM implementation

---

## Phase 10: Sub-Command Implementation - design:interactions (P1)

**Objective:** Design component interaction patterns with sequence diagrams

**Tasks:**
- [ ] 10.1 Identify component communication patterns from architecture
- [ ] 10.2 Create happy path interaction flows
- [ ] 10.3 Design error scenario interaction flows
- [ ] 10.4 Build retry and recovery interaction patterns
- [ ] 10.5 Add timeout and circuit breaker patterns where applicable
- [ ] 10.6 Generate interactions.md with detailed message flows
- [ ] 10.7 Create sequence-diagrams.md with Mermaid visualizations
- [ ] 10.8 Document integration point contracts

**VERIFY Phase 10:**
- [ ] design:interactions produces clear interaction patterns for implementation

---

## Phase 11: Sub-Command Implementation - design:state (P1)

**Objective:** Design state management with state machines and transitions

**Tasks:**
- [ ] 11.1 Analyze stateful component requirements
- [ ] 11.2 Define state shape and structure
- [ ] 11.3 Create state transition rules and guards
- [ ] 11.4 Add state persistence requirements (memory, localStorage, database)
- [ ] 11.5 Build state synchronization strategy for distributed components
- [ ] 11.6 Generate state-model.md with state documentation
- [ ] 11.7 Create state-machine.json with formal state machine definition
- [ ] 11.8 Add state visualization with Mermaid state diagrams

**VERIFY Phase 11:**
- [ ] design:state produces state management design ready for implementation

---

## Phase 12: Sub-Command Implementation - design:ui (P2)

**Objective:** Design UI component hierarchy with props, events, and styling

**Tasks:**
- [ ] 12.1 Create UI component tree structure
- [ ] 12.2 Define component props interfaces with types and validation
- [ ] 12.3 Design event handlers and callback patterns
- [ ] 12.4 Add styling approach (CSS-in-JS, modules, Tailwind, etc.)
- [ ] 12.5 Define responsive design breakpoints and behavior
- [ ] 12.6 Create accessibility requirements (ARIA, keyboard nav)
- [ ] 12.7 Generate ui-spec.md with component specifications
- [ ] 12.8 Create component-tree.json with hierarchy and relationships

**VERIFY Phase 12:**
- [ ] design:ui produces UI design ready for React/Vue/Svelte implementation

---

## Phase 13: Context Analysis and Artifact Consumption

**Objective:** Integrate with upstream artifacts from /architect, /clarify, /research

**Tasks:**
- [ ] 13.1 Implement architecture.md parser to extract component context
- [ ] 13.2 Build components.json reader to understand system structure
- [ ] 13.3 Create requirements.json parser for functional requirements
- [ ] 13.4 Add constraints.json reader for design constraints
- [ ] 13.5 Implement codebase-map.json analyzer for existing patterns
- [ ] 13.6 Build options-analysis.md reader for technology choices
- [ ] 13.7 Add related_artifacts tracking in all generated artifacts
- [ ] 13.8 Create artifact dependency graph for traceability

**VERIFY Phase 13:**
- [ ] Design command successfully consumes and references upstream artifacts

---

## Phase 14: Workflow Integration with Downstream Commands

**Objective:** Enable smooth transitions to /implement, /test, /spec

**Tasks:**
- [ ] 14.1 Create design-to-implementation handoff format
- [ ] 14.2 Implement artifact export for /implement consumption
- [ ] 14.3 Build design-to-spec transition for /spec:api formalization
- [ ] 14.4 Add design-to-test integration for /test:unit test generation
- [ ] 14.5 Create workflow suggestion engine ("Run /implement next")
- [ ] 14.6 Implement artifact validation before handoff
- [ ] 14.7 Add completeness checker for design artifacts

**VERIFY Phase 14:**
- [ ] Design artifacts are consumable by /implement, /test, and /spec commands

---

## Phase 15: Design Quality Validation

**Objective:** Implement automated quality checks for design artifacts

**Tasks:**
- [ ] 15.1 Create design completeness checker (all sections present)
- [ ] 15.2 Implement interface cohesion analyzer (single responsibility check)
- [ ] 15.3 Build dependency cycle detector
- [ ] 15.4 Add error handling coverage check (all operations have error cases)
- [ ] 15.5 Create performance consideration validator
- [ ] 15.6 Implement security checklist validator
- [ ] 15.7 Build testing strategy completeness check
- [ ] 15.8 Add implementation guidance validator
- [ ] 15.9 Create Mermaid diagram syntax validator
- [ ] 15.10 Generate design quality report with checklist

**VERIFY Phase 15:**
- [ ] Quality validator identifies incomplete or problematic designs

---

## Phase 16: Interactive Design Session

**Objective:** Use AskUserQuestion for clarification and validation

**Tasks:**
- [ ] 16.1 Implement design clarification question generator
- [ ] 16.2 Add interface design validation prompts
- [ ] 16.3 Create error handling strategy confirmation flow
- [ ] 16.4 Build performance requirement clarification
- [ ] 16.5 Add security consideration validation questions
- [ ] 16.6 Implement design trade-off discussion prompts
- [ ] 16.7 Create design review confirmation step
- [ ] 16.8 Add iterative refinement loop for design improvements

**VERIFY Phase 16:**
- [ ] Interactive session produces validated, user-approved designs

---

## Phase 17: Design Pattern Recognition

**Objective:** Identify and apply common design patterns automatically

**Tasks:**
- [ ] 17.1 Build pattern library (Repository, Factory, Observer, Strategy, etc.)
- [ ] 17.2 Implement pattern detection from requirements and architecture
- [ ] 17.3 Create pattern recommendation engine
- [ ] 17.4 Add pattern-specific template generators
- [ ] 17.5 Build anti-pattern detector and warnings
- [ ] 17.6 Implement pattern documentation in design artifacts
- [ ] 17.7 Create pattern catalog reference in implementation guidance

**VERIFY Phase 17:**
- [ ] Design command recommends and applies appropriate patterns

---

## Phase 18: Error Handling and Edge Cases

**Objective:** Handle incomplete inputs, conflicts, and validation failures

**Tasks:**
- [ ] 18.1 Handle missing architecture.md gracefully (prompt user or create minimal)
- [ ] 18.2 Detect and warn about conflicting requirements
- [ ] 18.3 Handle incomplete component definitions
- [ ] 18.4 Validate interface contracts for consistency
- [ ] 18.5 Detect circular dependencies and suggest refactoring
- [ ] 18.6 Handle ambiguous state transitions
- [ ] 18.7 Validate error type coverage across all operations
- [ ] 18.8 Add recovery suggestions for validation failures

**VERIFY Phase 18:**
- [ ] Error scenarios are handled gracefully with helpful feedback

---

## Phase 19: Testing and Validation

**Objective:** Comprehensive testing of all sub-commands and artifact generation

**Tasks:**
- [ ] 19.1 Test /design with simple component (UserService)
- [ ] 19.2 Test /design with complex component (PaymentProcessor with state machine)
- [ ] 19.3 Test design:api with RESTful API (CRUD operations)
- [ ] 19.4 Test design:data with relational data model (User-Profile-Order)
- [ ] 19.5 Test design:interactions with multi-component flow
- [ ] 19.6 Test design:state with complex state machine (Order fulfillment)
- [ ] 19.7 Test design:ui with component hierarchy (Form with validation)
- [ ] 19.8 Validate all artifacts against JSON/Markdown schemas
- [ ] 19.9 Test integration with /architect upstream artifacts
- [ ] 19.10 Test handoff to /implement downstream
- [ ] 19.11 Test Mermaid diagram rendering in common viewers
- [ ] 19.12 Verify TypeScript interfaces compile without errors

**VERIFY Phase 19:**
- [ ] All test scenarios pass, artifacts are valid and implementation-ready

---

## Phase 20: Documentation and Examples

**Objective:** Create comprehensive documentation for /design command usage

**Tasks:**
- [ ] 20.1 Create main usage guide in `docs/commands/design.md`
- [ ] 20.2 Document all 6 sub-commands with purpose and examples
- [ ] 20.3 Add artifact schema reference documentation
- [ ] 20.4 Create example: designing authentication component
- [ ] 20.5 Create example: designing RESTful API
- [ ] 20.6 Create example: designing state machine for workflow
- [ ] 20.7 Document workflow: clarify -> architect -> design -> implement
- [ ] 20.8 Add best practices guide for effective component design
- [ ] 20.9 Create troubleshooting section for common issues
- [ ] 20.10 Add comparison guide: /architect vs /design vs /spec
- [ ] 20.11 Document integration patterns with other commands
- [ ] 20.12 Create video/tutorial-style walkthrough (as markdown)

**VERIFY Phase 20:**
- [ ] Documentation is complete, examples are tested and functional

---

## Success Criteria

### Command Functionality
- [ ] Base /design command executes successfully with component name argument
- [ ] All 6 sub-commands (component, api, data, interactions, state, ui) are functional
- [ ] Commands use Sonnet model as configured in YAML frontmatter
- [ ] All allowed tools (Read, Grep, Glob, Write, AskUserQuestion) work correctly

### Artifact Generation
- [ ] design-spec.md validates against schema with all 13 sections
- [ ] interfaces.md generates valid TypeScript (or configured language) interfaces
- [ ] interaction-diagrams.md produces valid Mermaid diagrams that render
- [ ] state-machine.json validates against JSON schema
- [ ] All artifacts include proper YAML frontmatter with metadata

### Output Organization
- [ ] Artifacts written to `docs/design/[component-name]/` directory structure
- [ ] Related artifacts are properly linked in frontmatter
- [ ] Versioning is tracked correctly
- [ ] Output directory structure is clean and navigable

### Integration and Workflow
- [ ] Successfully consumes architecture.md, components.json, requirements.json
- [ ] Artifacts are consumable by /implement, /test, /spec commands
- [ ] Workflow transitions work seamlessly (architect -> design -> implement)
- [ ] related_artifacts references are valid and traceable

### Quality and Validation
- [ ] Design quality checklist validates completeness
- [ ] Interface cohesion and dependency checks pass
- [ ] Error handling coverage is complete
- [ ] Performance and security considerations are addressed
- [ ] Mermaid diagrams are syntactically correct

### User Experience
- [ ] Interactive sessions guide users through design decisions
- [ ] AskUserQuestion clarifies ambiguities effectively
- [ ] Error messages are helpful and actionable
- [ ] Design pattern recommendations improve design quality

### Documentation
- [ ] Usage guide enables independent use of /design command
- [ ] All 6 sub-commands are documented with examples
- [ ] Artifact schemas are fully documented
- [ ] Best practices guide improves design outcomes
- [ ] Examples demonstrate real-world usage patterns

### Testing
- [ ] Simple component design test passes (e.g., UserService)
- [ ] Complex component design test passes (e.g., PaymentProcessor)
- [ ] API design test produces valid REST specifications
- [ ] State machine design produces valid state definitions
- [ ] All artifacts validate against schemas
- [ ] Integration tests with upstream/downstream commands pass

---

