# Implementation Plan: /document Command

## Overview
- **Goal:** Implement the /document command with 8 sub-commands for comprehensive documentation generation
- **Priority:** P2 (Documentation & Communication phase)
- **Created:** {{date}}
- **Output:** `docs/plan-outputs/implement-document-command/`
- **Model:** Claude Sonnet 4.5 (code analysis, documentation synthesis)
- **Category:** Implementation & Documentation

> The /document command provides comprehensive documentation generation capabilities across multiple documentation types and audiences. It transforms code, design artifacts, and architectural decisions into clear, well-structured documentation following the Diátaxis framework.

---

## Phase 1: Core Command Setup

**Objective:** Establish base /document command with YAML configuration and core prompt structure

- [ ] 1.1 Create `/document` command file at `.claude/commands/document.md`
- [ ] 1.2 Add YAML frontmatter with configuration:
  - name: document
  - description: Generate comprehensive documentation for APIs, users, developers, and architecture. Synthesizes code, designs, and artifacts into audience-specific docs.
  - category: documentation
  - model: claude-sonnet-4-5
  - allowed-tools: Read, Write, Grep, Glob, Bash, AskUserQuestion
  - argument-hint: [scope-or-type]
- [ ] 1.3 Write base command prompt with sections:
  - Your Task (documentation type, audience, scope)
  - Instructions (4-phase documentation workflow)
  - Quality standards (Diátaxis framework, audience-appropriate language)
  - Output format specifications
- [ ] 1.4 Define default parameters:
  - type: auto-detect or user-specified
  - audience: developer | user | operator | all
  - scope: component | module | system | full-project
  - format: markdown | mdx | jsdoc
- [ ] 1.5 Create output directory structure: `docs/`

**VERIFY 1:** Base /document command runs successfully, analyzes codebase, and produces structured output

---

## Phase 2: Documentation Workflow Implementation

**Objective:** Implement systematic documentation workflow with codebase analysis

- [ ] 2.1 Implement Documentation Parameters phase:
  - Use AskUserQuestion to gather doc type, audience, format
  - Auto-detect project type (Node.js, Python, etc.)
  - Identify existing documentation to update vs create
- [ ] 2.2 Implement Codebase Analysis phase:
  - Scan for public APIs and exported functions
  - Parse JSDoc/docstrings for existing documentation
  - Identify undocumented public interfaces
  - Find existing architecture.md, design specs
- [ ] 2.3 Implement Artifact Consumption phase:
  - Read existing architecture.md from /architect
  - Read design-spec.md from /design
  - Read openapi.yaml from /spec:api
  - Extract information from Git history for changelog
- [ ] 2.4 Implement Documentation Generation phase:
  - Synthesize information into audience-appropriate docs
  - Apply Diátaxis framework categorization
  - Generate consistent formatting and structure
- [ ] 2.5 Implement Update vs Create Logic:
  - Detect existing documentation files
  - Merge new content into existing structure
  - Preserve custom sections users have added

**VERIFY 2:** Documentation workflow produces comprehensive, well-structured documentation

---

## Phase 3: Sub-Command Implementation (P0)

**Objective:** Create 3 P0 sub-commands for core documentation needs

### 3.1 API Documentation Sub-Command
- [ ] 3.1.1 Create `/document:api` command file
  - YAML: model: claude-sonnet-4-5, argument-hint: <api-path | openapi-spec>
- [ ] 3.1.2 Implement API documentation generation:
  - Parse Express/Fastify/Hono routes
  - Extract from OpenAPI/Swagger specs
  - Document request/response schemas
  - Include authentication requirements
  - Generate code examples per endpoint
- [ ] 3.1.3 Generate specialized artifacts:
  - `docs/api/reference.md` (comprehensive reference)
  - `docs/api/examples.md` (usage examples)
  - JSDoc comments in source files
- [ ] 3.1.4 Support multiple formats:
  - Markdown reference docs
  - OpenAPI 3.0 spec generation
  - Postman collection export

### 3.2 User Guide Sub-Command
- [ ] 3.2.1 Create `/document:user` command file
  - YAML: model: claude-sonnet-4-5, argument-hint: <feature | --full>
- [ ] 3.2.2 Implement user guide generation:
  - Getting started guide
  - Feature walkthroughs
  - Common use cases and examples
  - Troubleshooting section
- [ ] 3.2.3 Generate specialized artifacts:
  - `docs/guides/getting-started.md`
  - `docs/guides/user-guide.md`
  - `docs/guides/tutorials/` (step-by-step tutorials)
- [ ] 3.2.4 Apply Diátaxis framework:
  - Tutorials (learning-oriented)
  - How-to guides (problem-oriented)

### 3.3 Developer Documentation Sub-Command
- [ ] 3.3.1 Create `/document:developer` command file
  - YAML: model: claude-sonnet-4-5, argument-hint: <--readme | --contributing | --full>
- [ ] 3.3.2 Implement developer documentation:
  - README.md generation and updates
  - CONTRIBUTING.md with contribution guidelines
  - Development environment setup
  - Testing instructions
  - Architecture overview for developers
- [ ] 3.3.3 Generate specialized artifacts:
  - `README.md` (project root)
  - `CONTRIBUTING.md`
  - `docs/development/setup.md`
  - `docs/development/testing.md`
- [ ] 3.3.4 Include project metadata:
  - Badges (build status, coverage, npm)
  - License information
  - Links to other documentation

**VERIFY 3:** All P0 sub-commands produce valid, audience-appropriate documentation

---

## Phase 4: Sub-Command Implementation (P1)

**Objective:** Create 3 P1 sub-commands for extended documentation needs

### 4.1 Architecture Documentation Sub-Command
- [ ] 4.1.1 Create `/document:architecture` command file
  - YAML: model: claude-sonnet-4-5, argument-hint: <system | --adr>
- [ ] 4.1.2 Implement architecture documentation:
  - High-level system overview
  - Component diagrams (Mermaid)
  - Data flow documentation
  - Technology stack explanation
- [ ] 4.1.3 Generate specialized artifacts:
  - `ARCHITECTURE.md` (root level)
  - `docs/architecture/overview.md`
  - `docs/architecture/decisions/` (ADRs)
- [ ] 4.1.4 Consume upstream artifacts:
  - architecture.md from /architect
  - design-spec.md from /design
  - ADRs from /architect:adr

### 4.2 Changelog Generation Sub-Command
- [ ] 4.2.1 Create `/document:changelog` command file
  - YAML: model: claude-sonnet-4-5, argument-hint: <version | --since tag>
- [ ] 4.2.2 Implement changelog generation:
  - Parse Git history with conventional commits
  - Group by type (Added, Changed, Fixed, etc.)
  - Detect breaking changes
  - Link to PRs and issues
- [ ] 4.2.3 Generate specialized artifacts:
  - `CHANGELOG.md` (Keep a Changelog format)
  - Release notes for specific version
- [ ] 4.2.4 Support versioning schemes:
  - Semantic versioning
  - Date-based versions
  - Custom version patterns

### 4.3 Inline Documentation Sub-Command
- [ ] 4.3.1 Create `/document:inline` command file
  - YAML: model: claude-sonnet-4-5, argument-hint: <file-path | --all>
- [ ] 4.3.2 Implement inline documentation:
  - Add JSDoc/docstrings to functions
  - Add type annotations where missing
  - Document complex logic with comments
  - Add @example tags with usage
- [ ] 4.3.3 Generate updates to source files:
  - Use Edit tool for targeted additions
  - Preserve existing documentation
  - Follow project's documentation style
- [ ] 4.3.4 Support multiple languages:
  - TypeScript/JavaScript (JSDoc)
  - Python (docstrings)
  - Go (godoc comments)

**VERIFY 4:** All P1 sub-commands produce valid, well-formatted documentation

---

## Phase 5: Sub-Command Implementation (P2)

**Objective:** Create 2 P2 sub-commands for advanced documentation needs

### 5.1 Diagrams Documentation Sub-Command
- [ ] 5.1.1 Create `/document:diagrams` command file
  - YAML: model: claude-sonnet-4-5, argument-hint: <type> [--scope path]
- [ ] 5.1.2 Implement diagram generation:
  - System architecture diagrams
  - Sequence diagrams for key flows
  - Entity relationship diagrams
  - Component dependency diagrams
  - Class diagrams for OOP codebases
- [ ] 5.1.3 Generate Mermaid diagrams:
  - Embed in markdown files
  - Create standalone diagram files
  - Add diagram captions and descriptions
- [ ] 5.1.4 Support diagram types:
  - flowchart (system overview)
  - sequenceDiagram (workflows)
  - erDiagram (data models)
  - classDiagram (OOP structure)
  - stateDiagram (state machines)

### 5.2 Runbook Documentation Sub-Command
- [ ] 5.2.1 Create `/document:runbook` command file
  - YAML: model: claude-sonnet-4-5, argument-hint: <operation | --deployment | --incident>
- [ ] 5.2.2 Implement runbook generation:
  - Deployment procedures
  - Rollback procedures
  - Incident response playbooks
  - Maintenance procedures
  - Monitoring and alerting guides
- [ ] 5.2.3 Generate specialized artifacts:
  - `docs/runbooks/deployment.md`
  - `docs/runbooks/rollback.md`
  - `docs/runbooks/incidents/`
  - `docs/runbooks/maintenance.md`
- [ ] 5.2.4 Include operational details:
  - Environment variables required
  - Dependencies and prerequisites
  - Health check commands
  - Common troubleshooting steps

**VERIFY 5:** All P2 sub-commands produce valid operational documentation

---

## Phase 6: Artifact Schemas & Quality Standards

**Objective:** Implement structured artifact generation with quality validation

### 6.1 Primary Artifacts
- [ ] 6.1.1 Implement README.md artifact schema:
  - YAML frontmatter:
    - artifact_type: readme-documentation
    - command: document:developer
  - Standard sections: Overview, Quick Start, Features, Documentation, Development, Contributing, License
- [ ] 6.1.2 Implement api-reference.md artifact schema:
  - YAML frontmatter:
    - artifact_type: api-reference-documentation
    - command: document:api
    - api_version, base_url
  - Endpoint documentation with parameters, examples, errors
- [ ] 6.1.3 Implement CHANGELOG.md artifact schema:
  - Keep a Changelog format
  - Sections: Added, Changed, Deprecated, Removed, Fixed, Security
  - Version links at bottom

### 6.2 Quality Standards
- [ ] 6.2.1 Implement completeness validation:
  - All public APIs documented
  - Installation instructions present
  - Quick start guide available
  - Examples for common use cases
- [ ] 6.2.2 Implement accuracy validation:
  - Code examples tested/testable
  - Version numbers current
  - Links verified
- [ ] 6.2.3 Implement quality checks:
  - Clear writing for target audience
  - Consistent terminology
  - Proper markdown formatting
  - Metadata frontmatter present

### 6.3 Diátaxis Framework Compliance
- [ ] 6.3.1 Categorize documentation types:
  - Tutorials (learning-oriented) → document:user
  - How-to Guides (problem-oriented) → document:user
  - Reference (information-oriented) → document:api
  - Explanation (understanding-oriented) → document:architecture
- [ ] 6.3.2 Validate audience appropriateness:
  - User docs avoid implementation details
  - Developer docs include technical depth
  - API docs are precise and complete
  - Architecture docs explain "why"

**VERIFY 6:** Artifacts meet quality standards and Diátaxis framework principles

---

## Phase 7: Workflow Integration

**Objective:** Ensure /document integrates with upstream and downstream commands

### 7.1 Upstream Integration
- [ ] 7.1.1 Define artifact consumption:
  - `architecture.md` from /architect
  - `design-spec.md` from /design
  - `openapi.yaml` from /spec:api
  - Source code from /implement
  - Git history for changelog
- [ ] 7.1.2 Implement artifact discovery:
  - Auto-detect existing design documents
  - Find related specifications
  - Parse existing documentation for updates

### 7.2 Downstream Integration
- [ ] 7.2.1 Define artifact production:
  - README.md → GitHub, developers
  - api-reference.md → /test, developers
  - user-guide.md → End users
  - CHANGELOG.md → /release
- [ ] 7.2.2 Add artifact cross-referencing:
  - Include related_artifacts in metadata
  - Link to source specifications
  - Reference generated from timestamps

### 7.3 Common Workflows
- [ ] 7.3.1 API-First Documentation workflow:
  - /design:api → /spec:api → /document:api → /test
- [ ] 7.3.2 Feature Documentation workflow:
  - /clarify → /design → /implement → /document:user
  - /clarify → /design → /implement → /document:developer
- [ ] 7.3.3 Release Documentation workflow:
  - /implement → /test → /document:changelog → /release

**VERIFY 7:** Documentation workflows produce consistent, linked documentation sets

---

## Phase 8: Testing & Validation

**Objective:** Comprehensive testing of documentation quality and accuracy

### 8.1 Sub-Command Testing
- [ ] 8.1.1 Test /document:api:
  - Test with Express, Fastify, Hono APIs
  - Test with existing OpenAPI specs
  - Verify endpoint coverage
  - Validate example accuracy
- [ ] 8.1.2 Test /document:user:
  - Test getting started guide generation
  - Test tutorial generation
  - Verify audience-appropriate language
- [ ] 8.1.3 Test /document:developer:
  - Test README generation
  - Test CONTRIBUTING generation
  - Verify technical accuracy

### 8.2 Quality Testing
- [ ] 8.2.1 Test completeness (all public APIs documented)
- [ ] 8.2.2 Test accuracy (examples work)
- [ ] 8.2.3 Test formatting (valid markdown)
- [ ] 8.2.4 Test links (no broken links)

### 8.3 Update Testing
- [ ] 8.3.1 Test updating existing README
- [ ] 8.3.2 Test merging changelog entries
- [ ] 8.3.3 Test preserving custom sections

### 8.4 Edge Cases
- [ ] 8.4.1 Test with no existing documentation
- [ ] 8.4.2 Test with extensive existing documentation
- [ ] 8.4.3 Test with undocumented codebase
- [ ] 8.4.4 Test with multiple documentation formats

**VERIFY 8:** All test cases pass, documentation quality is consistently high

---

## Phase 9: Documentation & Polish

**Objective:** Create comprehensive documentation and refine user experience

- [ ] 9.1 Create command documentation:
  - Usage examples for each sub-command
  - Audience selection guidance
  - Format options explanation
  - Common documentation workflows
- [ ] 9.2 Document documentation methodology:
  - How content is synthesized
  - How existing docs are preserved
  - How Diátaxis framework is applied
  - Output location conventions
- [ ] 9.3 Create user guides:
  - "Documenting a new API"
  - "Creating user guides"
  - "Maintaining a changelog"
  - "Architecture documentation best practices"
- [ ] 9.4 Add inline help:
  - Argument hints in YAML frontmatter
  - Error messages with suggestions
  - Progress indicators during generation
- [ ] 9.5 Polish output formatting:
  - Consistent headers and sections
  - Proper code block syntax highlighting
  - Clean table formatting
  - Helpful cross-references
- [ ] 9.6 Create example outputs:
  - Example README.md
  - Example api-reference.md
  - Example CHANGELOG.md

**VERIFY 9:** Documentation is complete, clear, and helpful; output quality is polished

---

## Success Criteria

### Functional Requirements
- [ ] Base /document command analyzes codebase and generates README.md
- [ ] All 8 sub-commands (api, user, developer, architecture, changelog, inline, diagrams, runbook) work correctly
- [ ] Documentation is audience-appropriate (user vs developer vs operator)
- [ ] Existing documentation is updated, not overwritten
- [ ] All documentation includes proper metadata frontmatter

### Quality Requirements
- [ ] Follows Diátaxis framework principles
- [ ] Clear, concise writing appropriate to audience
- [ ] Consistent terminology throughout
- [ ] Proper markdown formatting
- [ ] Working code examples

### Usability Requirements
- [ ] Clear progress indicators during generation
- [ ] Helpful error messages for edge cases
- [ ] Preview of changes before applying
- [ ] Support for dry-run mode

### Integration Requirements
- [ ] Consumes artifacts from /architect, /design, /spec, /implement
- [ ] Produces artifacts consumable by /test, /release
- [ ] Metadata includes related_artifacts cross-references
- [ ] Works seamlessly in documentation workflows

### Testing Requirements
- [ ] All sub-commands tested with various project types
- [ ] Update logic tested (merge vs create)
- [ ] Edge cases handled gracefully
- [ ] Documentation quality validated across different codebases
