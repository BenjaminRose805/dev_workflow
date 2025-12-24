# Implementation Plan: /architect Command

## Overview
- **Goal:** Implement system-level architecture design command with 6 sub-commands for comprehensive architecture documentation
- **Priority:** P1 (Design & Architecture)
- **Created:** 2025-12-22
- **Output:** `docs/plan-outputs/architect-command/`
- **Model:** Sonnet (precision for design work)
- **Category:** Design & Architecture

> The /architect command provides system-level and high-level architecture design capabilities. It helps developers create comprehensive architecture documentation including C4 diagrams, component specifications, and architectural decision records (ADRs). It operates at the system boundary level - defining how major components interact, data flows, deployment architecture, and cross-cutting concerns.

---


---

## Dependencies

### Upstream Dependencies
- /clarify command - Provides requirements.json with functional and non-functional requirements
- /research command - Provides technology research and evaluations
- /brainstorm command - Provides architecture alternatives and options
- /explore command - Provides existing codebase understanding via codebase-map.json

### Downstream Dependencies
- /design command - Consumes architecture.md and components.json for component-level design
- /implement command - Consumes architecture for implementation guidance
- /model command - Consumes data architecture for entity modeling
- /spec command - Consumes component interfaces for API specification

### External Tools
- Mermaid - Required for diagram rendering (C4, sequence, data flow)
- Git - Required for ADR version tracking

---

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Over-engineering architecture | High | Focus on MVP requirements, use YAGNI principle, validate with stakeholders |
| Architecture-reality mismatch | High | Regular validation against implementation, update docs when code diverges |
| ADR proliferation | Medium | Clear guidelines on when to create ADRs, focus on significant decisions only |
| Incomplete quality attribute coverage | Medium | Use checklist of common quality attributes (performance, security, scalability, etc.) |
| Diagram complexity | Medium | Follow C4 model guidelines, limit detail per diagram level |
| Technology lock-in from early decisions | High | Document technology exit strategies in ADRs, prefer abstractions |

---

## Phase 1: Core Command Setup

**Objective:** Establish base /architect command with YAML configuration and intelligent routing

**Tasks:**
- [ ] 1.1 Create `/architect` command file at `.claude/commands/architect.md`
- [ ] 1.2 Add YAML frontmatter with configuration:
  - name: architect
  - description: System-level architecture design and documentation
  - category: design
  - model: sonnet
  - allowed-tools: Read, Write, Grep, Glob, Bash, AskUserQuestion
  - argument-hint: [system-or-feature-name]
  - permission_mode: default
- [ ] 1.3 Write base command prompt with sections:
  - Your Task (system architecture design)
  - Context awareness (check for upstream artifacts)
  - Sub-command routing logic
  - Quality gates before completion
- [ ] 1.4 Define default parameters:
  - system_name: from argument or project context
  - scope: full-system (default) or feature-level
  - upstream_artifacts: requirements.json, constraints.json, research-notes.md
- [ ] 1.5 Create output directory structure: `docs/architecture/`
- [ ] 1.6 Implement artifact discovery logic:
  - Search for requirements from /clarify command
  - Search for research from /research command
  - Search for brainstorming from /brainstorm command
  - Display found artifacts and offer to use them

**VERIFY Phase 1:**
- [ ] Base /architect command runs successfully, discovers upstream artifacts, routes to appropriate workflow

---

## Phase 2: Sub-Command Implementation - Core (P0)

**Objective:** Implement highest-priority sub-commands for system and component architecture

### 2.1 System Sub-Command

**Tasks:**
- [ ] 2.1.1 Create `/architect:system` command file at `.claude/commands/architect/system.md`
  - YAML: model: sonnet, allowed-tools: Read, Write, Grep, Glob, Bash, AskUserQuestion
  - argument-hint: [system-name]
- [ ] 2.1.2 Implement interactive requirement gathering:
  - Ask about expected scale (users, requests/day)
  - Ask about existing systems to integrate with
  - Ask about deployment constraints (cloud provider, budget)
  - Ask about quality attribute priorities (performance, security, etc.)
- [ ] 2.1.3 Implement C4 Context diagram generation:
  - Identify system boundary
  - Map external actors (users, systems)
  - Define system purpose and scope
  - Generate Mermaid diagram
- [ ] 2.1.4 Implement C4 Container diagram generation:
  - Identify major containers (web app, API, database, etc.)
  - Map container technologies
  - Define container responsibilities
  - Map container communication protocols
  - Generate Mermaid diagram
- [ ] 2.1.5 Generate artifacts:
  - `architecture.md` (full architecture document with 12 sections)
  - `system-diagram.md` (C4 Context + Container diagrams)

### 2.2 Components Sub-Command

**Tasks:**
- [ ] 2.2.1 Create `/architect:components` command file at `.claude/commands/architect/components.md`
  - YAML: model: sonnet, allowed-tools: Read, Write, Grep, Glob, Bash
  - argument-hint: [system-or-layer]
- [ ] 2.2.2 Implement component decomposition logic:
  - Read architecture.md to understand containers
  - Break down each container into logical components
  - Classify component types (service, controller, repository, etc.)
  - Define component responsibilities
- [ ] 2.2.3 Implement relationship mapping:
  - Map component dependencies
  - Identify communication patterns (sync/async, protocol)
  - Detect circular dependencies and flag them
  - Map external dependencies
- [ ] 2.2.4 Implement interface definition:
  - Define interfaces provided by each component
  - Define interfaces consumed by each component
  - Specify API contracts (REST, GraphQL, events)
- [ ] 2.2.5 Generate artifacts:
  - `components.json` (structured component catalog)
  - `component-diagram.md` (Mermaid component diagrams)

**VERIFY Phase 2:**
- [ ] architect:system and architect:components produce valid, comprehensive artifacts with proper C4 diagrams

---

## Phase 3: Sub-Command Implementation - Data & Deployment (P1)

**Objective:** Implement data architecture and deployment sub-commands

### 3.1 Data Sub-Command

**Tasks:**
- [ ] 3.1.1 Create `/architect:data` command file at `.claude/commands/architect/data.md`
  - YAML: model: sonnet, allowed-tools: Read, Write, Grep, Glob, Bash
  - argument-hint: [scope]
- [ ] 3.1.2 Implement data store analysis:
  - Identify data storage needs (transactional, cache, files, etc.)
  - Recommend data store technologies
  - Define data ownership by component
  - Map read/write patterns
- [ ] 3.1.3 Implement data flow mapping:
  - Trace data through system (ingestion → processing → storage → retrieval)
  - Identify data transformation points
  - Map data synchronization needs
  - Detect data consistency requirements
- [ ] 3.1.4 Implement data governance design:
  - Define data retention policies
  - Define backup/recovery strategy
  - Define data privacy requirements
  - Define data access controls
- [ ] 3.1.5 Generate artifacts:
  - `data-architecture.md` (data stores, ownership, governance)
  - `data-flow.md` (Mermaid data flow diagrams)

### 3.2 Deployment Sub-Command

**Tasks:**
- [ ] 3.2.1 Create `/architect:deployment` command file at `.claude/commands/architect/deployment.md`
  - YAML: model: sonnet, allowed-tools: Read, Write, Grep, Glob, Bash, AskUserQuestion
  - argument-hint: [environment]
- [ ] 3.2.2 Implement infrastructure design:
  - Ask about cloud provider preferences
  - Ask about scale requirements
  - Recommend infrastructure topology (VMs, containers, serverless)
  - Define compute, storage, network resources
- [ ] 3.2.3 Implement deployment pipeline design:
  - Define CI/CD approach
  - Define environment strategy (dev, staging, prod)
  - Define deployment strategy (blue-green, canary, rolling)
  - Define rollback procedures
- [ ] 3.2.4 Implement operations design:
  - Define monitoring and alerting
  - Define logging aggregation
  - Define backup procedures
  - Define disaster recovery plan
- [ ] 3.2.5 Generate artifacts:
  - `deployment.md` (deployment topology and strategy)
  - `infrastructure.md` (infrastructure specifications with Mermaid diagrams)

**VERIFY Phase 3:**
- [ ] Data and deployment sub-commands produce actionable, detailed architecture artifacts

---

## Phase 4: Sub-Command Implementation - ADR System (P1)

**Objective:** Implement Architectural Decision Record creation and management

### 4.1 ADR Sub-Command

**Tasks:**
- [ ] 4.1.1 Create `/architect:adr` command file at `.claude/commands/architect/adr.md`
  - YAML: model: sonnet, allowed-tools: Read, Write, Grep, Glob
  - argument-hint: [decision-topic]
- [ ] 4.1.2 Implement ADR template initialization:
  - Create `docs/architecture/adr/template.md` if missing
  - Implement ADR numbering (auto-increment from existing ADRs)
  - Format: `NNNN-decision-name.md` (0001, 0002, etc.)
- [ ] 4.1.3 Implement decision capture workflow:
  - Prompt for decision context and problem statement
  - Prompt for decision drivers (requirements, constraints)
  - Prompt for options considered (at least 2-3 alternatives)
  - For each option: pros, cons, trade-offs
  - Prompt for chosen option and rationale
- [ ] 4.1.4 Implement consequences documentation:
  - Document positive consequences
  - Document negative consequences
  - Document neutral/unknown consequences
  - Document implementation notes
- [ ] 4.1.5 Implement ADR relationships:
  - Support supersedes: [NNNN] (replaces old decision)
  - Support superseded_by: [NNNN] (replaced by new decision)
  - Link related ADRs
- [ ] 4.1.6 Generate artifact:
  - `adr/NNNN-decision-name.md` (structured ADR with YAML frontmatter)
- [ ] 4.1.7 Update architecture.md:
  - Add reference to new ADR in Technology Choices section
  - Ensure consistency between ADRs and main architecture doc

**VERIFY Phase 4:**
- [ ] ADR sub-command creates properly numbered, well-structured ADRs with complete decision rationale

---

## Phase 5: Sub-Command Implementation - Security (P2)

**Objective:** Implement security architecture design sub-command

### 5.1 Security Sub-Command

**Tasks:**
- [ ] 5.1.1 Create `/architect:security` command file at `.claude/commands/architect/security.md`
  - YAML: model: sonnet, allowed-tools: Read, Write, Grep, Glob, Bash, AskUserQuestion
  - argument-hint: [scope]
- [ ] 5.1.2 Implement threat modeling:
  - Identify assets to protect (data, services, infrastructure)
  - Identify threat actors (external attackers, insiders, etc.)
  - Apply STRIDE methodology (Spoofing, Tampering, Repudiation, etc.)
  - Document threats by component
- [ ] 5.1.3 Implement security controls design:
  - Authentication strategy (JWT, OAuth, SAML, etc.)
  - Authorization model (RBAC, ABAC, ACL)
  - Data protection (encryption at rest, in transit)
  - Network security (firewalls, segmentation)
  - Input validation and sanitization
  - Security monitoring and incident response
- [ ] 5.1.4 Implement compliance mapping:
  - Identify applicable regulations (GDPR, HIPAA, SOC2, etc.)
  - Map security controls to compliance requirements
  - Document audit logging requirements
- [ ] 5.1.5 Generate artifact:
  - `security-architecture.md` (threat model, controls, compliance)

**VERIFY Phase 5:**
- [ ] Security sub-command produces comprehensive security architecture with threat model and controls

---

## Phase 6: Artifact Schema Implementation

**Objective:** Implement and validate all artifact schemas with proper metadata

### 6.1 Architecture Document Schema

**Tasks:**
- [ ] 6.1.1 Implement `architecture.md` template with YAML frontmatter:
  - artifact_type: architecture-document
  - system: [name]
  - version: semantic versioning
  - created_at, updated_at: ISO-8601 timestamps
  - status: draft | in-review | approved | deprecated
  - c4_levels: [context, container, component]
- [ ] 6.1.2 Implement 12 standard sections:
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

### 6.2 Components Catalog Schema

**Tasks:**
- [ ] 6.2.1 Implement `components.json` JSON schema:
  - metadata: {artifact_type, system, version, created_at}
  - containers[]: {id, name, technology, type, responsibility, components[]}
  - components[]: {id, name, type, responsibility, interfaces, dependencies}
  - relationships[]: {source, target, type, protocol, description}
  - external_dependencies[]: {id, name, type, protocol}
- [ ] 6.2.2 Implement JSON schema validation:
  - Validate required fields
  - Validate enum values for types
  - Validate relationship references exist
  - Validate no circular dependencies in critical paths

### 6.3 ADR Schema

**Tasks:**
- [ ] 6.3.1 Implement ADR template with YAML frontmatter:
  - artifact_type: architecture-decision-record
  - adr_number: NNNN
  - title: [Decision Title]
  - status: proposed | accepted | deprecated | superseded
  - date: YYYY-MM-DD
  - deciders: [list]
  - supersedes, superseded_by: [optional]
- [ ] 6.3.2 Implement standard ADR sections:
  - Status
  - Context
  - Decision Drivers
  - Options Considered (with pros/cons)
  - Decision (chosen option + rationale)
  - Consequences (positive, negative, neutral)
  - Implementation Notes
  - References

### 6.4 Common Metadata

**Tasks:**
- [ ] 6.4.1 Ensure all artifacts include:
  - Generating command reference
  - Creation and update timestamps
  - Version number (semantic versioning)
  - Status indicator
  - Related artifacts cross-references
- [ ] 6.4.2 Implement artifact linking:
  - Architecture artifacts reference upstream requirements
  - ADRs reference related architecture sections
  - Component catalog references architecture.md
  - All artifacts include navigation links
- [ ] 6.4.3 Document artifact consumption by downstream commands:
  - architecture.md consumed by: /design (component context), /implement (tech stack), /model (data entities), /spec (interfaces)
  - components.json consumed by: /design (component boundaries), /spec (interface extraction), /implement (file structure)
  - data-architecture.md consumed by: /model (entity relationships), /design:data (data structures), /spec:data (data model specs)
- [ ] 6.4.4 Document critical field mappings for downstream:
  - components[].responsibility → design-spec.md "Responsibilities" section
  - components[].interfaces.provided → interfaces.md "Public Interfaces" section
  - components[].dependencies → design-spec.md "Integration Points" section
  - architecture.md Section 9 (Technology Choices) → interfaces.md language parameter

**VERIFY Phase 6:**
- [ ] All artifacts validate against defined schemas, metadata is complete and consistent

---

## Phase 7: Mermaid Diagram Implementation

**Objective:** Implement high-quality Mermaid diagram generation for all architecture views

### 7.1 C4 Context Diagram

**Tasks:**
- [ ] 7.1.1 Implement C4 Context diagram generation:
  - Use Mermaid `graph TB` syntax
  - Box for system (bold border)
  - Boxes for external actors (users, systems)
  - Labeled arrows for relationships
  - Include relationship descriptions
- [ ] 7.1.2 Add diagram styling:
  - Use consistent colors (system: blue, users: green, external: gray)
  - Use icons/emojis for clarity (optional)
  - Add legend if needed

### 7.2 C4 Container Diagram

**Tasks:**
- [ ] 7.2.1 Implement C4 Container diagram generation:
  - Use Mermaid `graph TB` with subgraph for system boundary
  - Boxes for each container with technology label
  - Arrows with protocol labels (HTTPS, TCP, etc.)
  - Database symbols for data stores
- [ ] 7.2.2 Add container details:
  - Include technology stack in box
  - Show communication protocols
  - Indicate sync vs async communication

### 7.3 Component Diagram

**Tasks:**
- [ ] 7.3.1 Implement component diagram generation:
  - Use Mermaid `graph LR` for horizontal flow
  - Group components by container using subgraphs
  - Show component dependencies
  - Label interface types
- [ ] 7.3.2 Generate per-container component diagrams:
  - Separate diagram for each major container
  - Show internal component structure
  - Highlight external interfaces

### 7.4 Data Flow Diagram

**Tasks:**
- [ ] 7.4.1 Implement data flow diagram generation:
  - Use Mermaid `graph LR` or `flowchart`
  - Show data ingestion points
  - Show transformation steps
  - Show storage points
  - Show retrieval/output points
- [ ] 7.4.2 Add data flow annotations:
  - Label data formats (JSON, CSV, etc.)
  - Indicate data volume (high/medium/low)
  - Show synchronization points

### 7.5 Deployment Diagram

**Tasks:**
- [ ] 7.5.1 Implement deployment diagram generation:
  - Use Mermaid `graph TB` with nested subgraphs
  - Show infrastructure layers (network, compute, storage)
  - Show deployment units (containers, VMs, functions)
  - Show load balancers, gateways, firewalls
- [ ] 7.5.2 Add environment variations:
  - Support multiple environments (dev, staging, prod)
  - Show environment-specific differences
  - Indicate scaling configurations

**VERIFY Phase 7:**
- [ ] All Mermaid diagrams render correctly, are visually clear, and accurately represent architecture

---

## Phase 8: Quality Gates & Validation

**Objective:** Implement architecture completeness checks and validation

### 8.1 Quality Gate Implementation

**Tasks:**
- [ ] 8.1.1 Implement pre-completion checklist:
  - System context diagram exists (C4 Level 1)
  - Container diagram exists (C4 Level 2)
  - Component catalog in components.json
  - All quality attributes addressed (performance, security, scalability, etc.)
  - Cross-cutting concerns documented (logging, error handling, config)
  - At least 2 ADRs for major decisions
  - Technology choices justified in architecture.md
  - Risks identified with mitigations
  - Deployment approach outlined
  - Integration points documented
- [ ] 8.1.2 Implement validation warnings:
  - Warn if no ADRs created for major technology choices
  - Warn if quality attributes not quantified
  - Warn if no deployment strategy specified
  - Warn if security not addressed
- [ ] 8.1.3 Implement completeness scoring:
  - Calculate % of required sections completed
  - Calculate % of quality gates passed
  - Display score at end of execution

### 8.2 Consistency Validation

**Tasks:**
- [ ] 8.2.1 Implement cross-artifact consistency checks:
  - Verify components in components.json match architecture.md
  - Verify ADR decisions align with technology choices
  - Verify deployment architecture matches container architecture
  - Verify data architecture covers all components
- [ ] 8.2.2 Implement reference validation:
  - All component dependencies resolve to valid components
  - All external dependencies are documented
  - All related_artifacts references are valid paths
- [ ] 8.2.3 Implement diagram-text consistency:
  - Components in diagrams match components in JSON
  - Container names consistent across all artifacts
  - Technology names consistent (e.g., "PostgreSQL" not "Postgres" in one place)

**VERIFY Phase 8:**
- [ ] Quality gates prevent incomplete architectures, validation catches inconsistencies

---

## Phase 9: Workflow Integration

**Objective:** Integrate with upstream and downstream commands for seamless workflows

### 9.1 Upstream Integration

**Tasks:**
- [ ] 9.1.1 Implement artifact discovery from /clarify:
  - Search for `docs/clarify/requirements/*.json`
  - Parse functional and non-functional requirements
  - Display found requirements and ask if they should inform architecture
  - Extract quality attributes from requirements
- [ ] 9.1.2 Implement artifact discovery from /explore:
  - Search for `docs/artifacts/discovery/exploration/codebase-map.json`
  - Use existing architecture understanding
  - Identify components to preserve vs refactor
- [ ] 9.1.3 Implement artifact discovery from /research:
  - Search for `docs/research/technology-*.md`
  - Import technology evaluations
  - Use as basis for ADRs
- [ ] 9.1.4 Implement artifact discovery from /brainstorm:
  - Search for `docs/brainstorm/architecture-options.md`
  - Import architecture alternatives
  - Use as Options Considered in ADRs

### 9.2 Downstream Integration

**Tasks:**
- [ ] 9.2.1 Prepare artifacts for /design command:
  - Ensure components.json has sufficient detail
  - Document expected interfaces for each component
  - Provide design constraints from architecture
- [ ] 9.2.2 Prepare artifacts for /implement command:
  - Generate file structure recommendations
  - Document implementation order (dependencies first)
  - Provide technology stack setup instructions
- [ ] 9.2.3 Prepare artifacts for /model command:
  - Extract data entities from data architecture
  - Provide entity relationship hints
  - Document data constraints
- [ ] 9.2.4 Prepare artifacts for /spec command:
  - Extract API interfaces from components.json
  - Provide OpenAPI starting point from architecture
  - Document API versioning strategy

### 9.3 Workflow Documentation

**Tasks:**
- [ ] 9.3.1 Document common workflows:
  - New system: /clarify → /architect → /design → /implement
  - Greenfield: /brainstorm → /architect → /model → /spec
  - Refactoring: /explore → /architect → /plan → /refactor
  - API-first: /architect → /spec → /implement
- [ ] 9.3.2 Create workflow decision tree:
  - When to use architect:system vs architect:components
  - When to create ADRs (major decisions only)
  - When to use architect:security (if handling sensitive data)
  - When to skip to /design (small, well-understood features)

**VERIFY Phase 9:**
- [ ] Artifacts flow smoothly between commands, workflows are clear and documented

---

## Phase 10: Interactive Guidance & UX

**Objective:** Implement helpful interactive prompts and guidance for users

### 10.1 Intelligent Question Flow

**Tasks:**
- [ ] 10.1.1 Implement adaptive questioning:
  - Ask scale questions only if not in requirements
  - Ask about existing systems only if not in constraints
  - Skip questions if answers found in upstream artifacts
- [ ] 10.1.2 Implement sensible defaults:
  - Default to cloud-native if no constraints
  - Default to REST APIs if no protocol specified
  - Default to relational DB if data needs unclear
  - Always explain default choices
- [ ] 10.1.3 Implement progressive disclosure:
  - Ask high-level questions first (architecture style)
  - Then drill into details (specific technologies)
  - Offer to skip optional sections

### 10.2 Contextual Help

**Tasks:**
- [ ] 10.2.1 Implement examples in prompts:
  - "Expected scale: e.g., 1000 concurrent users, 100k requests/day"
  - "Technology constraints: e.g., Must use AWS, Team knows Python"
- [ ] 10.2.2 Implement explanation text:
  - Explain what C4 Context diagram shows
  - Explain difference between container and component
  - Explain when to create an ADR
- [ ] 10.2.3 Implement recommendations:
  - Suggest architecture patterns based on requirements (e.g., "Consider Event-Driven for high scalability")
  - Suggest technologies based on team context
  - Warn about common pitfalls

### 10.3 Progress Indicators

**Tasks:**
- [ ] 10.3.1 Implement phase indicators:
  - "Phase 1/4: Gathering requirements..."
  - "Phase 2/4: Designing container architecture..."
  - "Phase 3/4: Generating diagrams..."
  - "Phase 4/4: Creating artifacts..."
- [ ] 10.3.2 Implement completion indicators:
  - "Created architecture.md"
  - "Generated C4 diagrams"
  - "Created 3 ADRs"
  - "Quality gates: 8/10 passed"

**VERIFY Phase 10:**
- [ ] User experience is smooth, questions are helpful, progress is clear

---

## Phase 11: Testing & Validation

**Objective:** Comprehensive testing across project types and scenarios

### 11.1 Unit Testing

**Tasks:**
- [ ] 11.1.1 Test artifact generation functions:
  - architecture.md generation with all 12 sections
  - components.json generation with valid schema
  - ADR generation with proper numbering
- [ ] 11.1.2 Test diagram generation:
  - C4 Context diagram Mermaid syntax
  - C4 Container diagram Mermaid syntax
  - Component diagram Mermaid syntax
  - Data flow diagram Mermaid syntax
- [ ] 11.1.3 Test validation logic:
  - Schema validation for JSON artifacts
  - Quality gate checks
  - Consistency checks

### 11.2 Integration Testing

**Tasks:**
- [ ] 11.2.1 Test base /architect command:
  - With no upstream artifacts
  - With requirements from /clarify
  - With exploration from /explore
  - With research from /research
- [ ] 11.2.2 Test each sub-command independently:
  - architect:system creates valid architecture
  - architect:components creates valid component catalog
  - architect:data creates data architecture
  - architect:deployment creates deployment docs
  - architect:adr creates properly numbered ADRs
  - architect:security creates security architecture
- [ ] 11.2.3 Test sub-command sequencing:
  - system → components → data → deployment (common flow)
  - system → adr (document major decisions)
  - components → adr (document component choices)

### 11.3 Cross-Project Testing

**Tasks:**
- [ ] 11.3.1 Test on web application scenario:
  - Frontend + backend + database architecture
  - REST API design
  - Authentication/authorization
- [ ] 11.3.2 Test on microservices scenario:
  - Multiple services architecture
  - Event-driven communication
  - Service mesh considerations
- [ ] 11.3.3 Test on data pipeline scenario:
  - ETL architecture
  - Data lake/warehouse design
  - Streaming vs batch considerations
- [ ] 11.3.4 Test on mobile app scenario:
  - Mobile client + backend API
  - Offline-first considerations
  - Push notification architecture
- [ ] 11.3.5 Test on existing codebase refactoring:
  - Import existing architecture from /explore
  - Document current vs target architecture
  - Create migration ADRs

### 11.4 Artifact Quality Testing

**Tasks:**
- [ ] 11.4.1 Validate architecture.md completeness:
  - All 12 sections present
  - Quality attributes quantified
  - Technology choices justified
  - Risks documented with mitigations
- [ ] 11.4.2 Validate components.json correctness:
  - Valid JSON syntax
  - All relationships resolve
  - No circular dependencies (or flagged if intentional)
  - Interfaces complete for each component
- [ ] 11.4.3 Validate ADR quality:
  - At least 2-3 options considered
  - Pros and cons documented
  - Rationale is clear and compelling
  - Consequences fully explored
- [ ] 11.4.4 Validate diagram quality:
  - Mermaid syntax is valid (test rendering)
  - Diagrams are visually clear
  - All elements labeled
  - Consistent styling

**VERIFY Phase 11:**
- [ ] All tests pass, command works reliably across diverse scenarios and project types

---

## Phase 12: Documentation & Examples

**Objective:** Create comprehensive documentation with real-world examples

### 12.1 Command Documentation

**Tasks:**
- [ ] 12.1.1 Create main /architect documentation:
  - Overview and purpose
  - When to use /architect vs /design
  - Sub-command reference guide
  - Quality gates explanation
- [ ] 12.1.2 Create sub-command documentation:
  - Document each of 6 sub-commands
  - Explain when to use each
  - Show example invocations
  - Document expected outputs
- [ ] 12.1.3 Create workflow documentation:
  - Document 4-5 common workflows
  - Show command sequences
  - Explain artifact flow between commands
  - Provide workflow decision trees

### 12.2 Artifact Schema Documentation

**Tasks:**
- [ ] 12.2.1 Document architecture.md schema:
  - Explain each of 12 sections
  - Provide section templates
  - Show example content
- [ ] 12.2.2 Document components.json schema:
  - Document JSON structure
  - Explain each field
  - Provide validation rules
  - Show example component catalog
- [ ] 12.2.3 Document ADR schema:
  - Explain ADR structure
  - Document frontmatter fields
  - Show decision template
  - Provide 3-4 example ADRs

### 12.3 Real-World Examples

**Tasks:**
- [ ] 12.3.1 Create e-commerce platform example:
  - Full architecture.md
  - Complete components.json
  - 4-5 relevant ADRs
  - All C4 diagrams
- [ ] 12.3.2 Create SaaS application example:
  - Multi-tenant architecture
  - Subscription management
  - API-first design
- [ ] 12.3.3 Create microservices example:
  - 5-6 microservices
  - Event-driven architecture
  - Service mesh integration
- [ ] 12.3.4 Create data platform example:
  - Batch and streaming pipelines
  - Data lake architecture
  - Analytics and reporting

### 12.4 Best Practices Guide

**Tasks:**
- [ ] 12.4.1 Document C4 modeling best practices:
  - Keep Context diagram high-level (3-5 external systems max)
  - Container diagram shows deployment units
  - Component diagram shows logical groupings
  - Don't go too deep (stop at meaningful boundaries)
- [ ] 12.4.2 Document ADR best practices:
  - Create ADRs for significant decisions only
  - Document decisions when made, not after
  - Include at least 2 alternatives
  - Be honest about trade-offs
  - Update ADR status when superseded
- [ ] 12.4.3 Document architecture evolution:
  - Version architecture documents
  - Document migration paths
  - Keep old versions for reference
  - Update diagrams when architecture changes

### 12.5 Troubleshooting Guide

**Tasks:**
- [ ] 12.5.1 Document common issues:
  - "How do I decide between monolith and microservices?"
  - "How many components should I have?"
  - "When should I create an ADR?"
  - "How detailed should my architecture be?"
- [ ] 12.5.2 Provide decision frameworks:
  - Architecture style decision tree
  - Technology choice framework
  - Deployment pattern selection guide

**VERIFY Phase 12:**
- [ ] Documentation is comprehensive, examples are realistic and helpful, best practices are clear

---

## Success Criteria

### Functional Requirements
- [ ] Base /architect command routes to appropriate workflow based on context
- [ ] All 6 sub-commands work correctly (system, components, data, deployment, adr, security)
- [ ] Artifacts validate against defined schemas
- [ ] Mermaid diagrams render correctly in all contexts
- [ ] Quality gates prevent incomplete architectures

### Quality Requirements
- [ ] architecture.md includes all 12 required sections
- [ ] components.json includes all containers and components with relationships
- [ ] ADRs follow template with at least 2 options considered
- [ ] C4 diagrams accurately represent system at appropriate levels
- [ ] All artifacts include proper metadata and cross-references

### Usability Requirements
- [ ] Interactive questions are clear and contextual
- [ ] Progress indicators show current phase
- [ ] Artifacts are human-readable and actionable
- [ ] Documentation explains when to use each sub-command
- [ ] Examples cover common project types

### Integration Requirements
- [ ] Discovers and uses upstream artifacts (requirements, research, brainstorming)
- [ ] Produces artifacts consumable by downstream commands (/design, /implement, /model, /spec)
- [ ] Integrates into common workflows (new system, refactoring, API-first)
- [ ] Metadata includes related_artifacts cross-references

### Testing Requirements
- [ ] All unit tests pass for artifact generation and validation
- [ ] Tested on web app, microservices, data platform, mobile app scenarios
- [ ] All sub-commands tested independently and in sequence
- [ ] Artifacts validated for completeness and consistency
- [ ] Mermaid diagrams render correctly

### Performance Requirements
- [ ] architect:system completes in < 3 minutes for standard project
- [ ] architect:components completes in < 2 minutes for system with 10-20 components
- [ ] architect:adr completes in < 1 minute per decision
- [ ] Full architecture (all sub-commands) completes in < 10 minutes

---

## Notes

### Differentiation from Related Commands

**`/architect` vs `/design`:**
- `/architect`: System-wide, cross-component (C4 Levels 1-3)
- `/design`: Single component/feature (C4 Level 4)
- `/architect`: Focus on component relationships, system boundaries
- `/design`: Focus on class design, algorithms, data structures

**`/architect` vs `/explore`:**
- `/architect`: Design new architecture (prescriptive)
- `/explore`: Understand existing architecture (descriptive)
- `/architect`: What should be
- `/explore`: What is

**`/architect` vs `/model`:**
- `/architect`: System components and topology
- `/model`: Data structures and relationships
- `/architect`: Full system scope
- `/model`: Data layer scope

### Key Quality Principles

1. **Completeness**: All 10 quality gates must pass before architecture is complete
2. **Consistency**: Components, diagrams, and text must align across all artifacts
3. **Traceability**: ADRs must reference architecture, architecture must reference requirements
4. **Actionability**: Artifacts must provide clear guidance for downstream commands
5. **Evolvability**: Architecture must document future considerations and migration paths

### References

- C4 Model: https://c4model.com/
- ADR Template: https://github.com/joelparkerhenderson/architecture-decision-record
- Architecture Review Findings: docs/plan-outputs/architecture-review/findings/5-1-architect-command.md
- Sub-Commands Catalog: docs/plan-outputs/architecture-review/findings/5-5-subcommands-catalog.md
- Artifact Schemas: docs/plan-outputs/architecture-review/findings/5-6-artifact-schemas.md
