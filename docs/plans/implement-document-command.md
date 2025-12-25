# Implementation Plan: /document Command

## Overview
- **Goal:** Implement the /document command with 8 sub-commands for comprehensive documentation generation
- **Priority:** P2 (Documentation & Communication phase)
- **Created:** 2025-12-22
- **Output:** `docs/plan-outputs/document-command/`
- **Model:** sonnet (code analysis and documentation synthesis)
- **Category:** Implementation & Documentation

> The /document command provides comprehensive documentation generation capabilities across multiple documentation types and audiences. It transforms code, design artifacts, and architectural decisions into clear, well-structured documentation following the Diátaxis framework.

### Sub-Command Priorities

| Sub-Command | Priority | Scope | Description |
|-------------|----------|-------|-------------|
| `document:api` | P0 | MVP | Generate API reference documentation from routes/OpenAPI specs with examples |
| `document:user` | P0 | MVP | Create user guides, tutorials, and getting started documentation |
| `document:developer` | P0 | MVP | Generate README, CONTRIBUTING, and development setup docs |
| `document:architecture` | P1 | Core | Document system architecture, components, and ADRs with diagrams |
| `document:changelog` | P1 | Core | Generate CHANGELOG.md from Git history using conventional commits |
| `document:inline` | P1 | Core | Add JSDoc/docstrings and type annotations to source code |
| `document:diagrams` | P2 | Enhancement | Generate Mermaid diagrams for architecture and workflows |
| `document:runbook` | P2 | Enhancement | Create operational runbooks for deployment and incident response |

---


---

## Dependencies

### Upstream Dependencies
- /architect command - Provides architecture.md for architecture documentation
- /design command - Provides design-spec.md for technical documentation
- /spec command - Provides openapi.yaml for API documentation
- /implement command - Provides source code for inline documentation
- Git - Required for changelog generation from commit history

### Downstream Dependencies
- /test command - May use api-reference.md for test generation
- /release command - Uses CHANGELOG.md for release notes

### External Tools
- Git - Required for changelog generation and history analysis
- Mermaid - Required for diagram generation in docs

---

## Command Boundaries

### Scope Definition
The `/document` command focuses on **generating reference documentation** for external consumption. It produces structured, persistent documentation artifacts.

### Primary Focus
- **Reference documentation**: API docs, READMEs, CONTRIBUTING, changelogs
- **Structured artifacts**: Follows Diátaxis framework (tutorials, how-to, reference, explanation)
- **Audience-specific**: User guides, developer docs, operator runbooks
- **Persistent output**: Files meant to be committed and maintained

### Related Commands

| Command | Purpose | Output | Audience |
|---------|---------|--------|----------|
| `/document` | Generate reference docs | README.md, api-reference.md, CHANGELOG.md | End users, developers |
| `/explain` | Educational understanding | code-explanation.md, flow-explanation.md | Team members learning codebase |
| `/explore` | Discovery and navigation | codebase-overview.md (ephemeral) | Developers navigating code |
| `plan:explain` | Task understanding | Task explanations in conversation | Plan implementers |

### Boundary Rules
1. `/document` generates **persistent reference docs**, `/explain` generates **educational content**
2. `/document` is for **external audiences**, `/explain` is for **internal understanding**
3. `/document` follows Diátaxis framework, `/explain` follows Why→What→How→Context→Gotchas
4. `/explore` discovers, `/explain` teaches, `/document` references

### When to Use /document vs /explain vs /explore

| Scenario | Use This Command | Rationale |
|----------|------------------|-----------|
| "Generate API documentation" | `/document:api` | Reference documentation |
| "Create README for project" | `/document:developer` | Persistent reference |
| "Generate changelog" | `/document:changelog` | Release documentation |
| "Explain how this code works" | `/explain:code` | Educational content |
| "How does authentication work?" | `/explain:architecture` | Understanding patterns |
| "What patterns are used?" | `/explain:pattern` | Learning codebase |
| "Find where errors are handled" | `/explore` | Codebase discovery |
| "What does this plan task mean?" | `plan:explain` | Task clarification |
| "Create user guide" | `/document:user` | Tutorial documentation |
| "Document this function inline" | `/document:inline` | JSDoc/docstrings |

### Diátaxis Framework Alignment

| Diátaxis Category | Command | Sub-Command |
|-------------------|---------|-------------|
| Tutorials (learning-oriented) | `/document` | document:user |
| How-to guides (problem-oriented) | `/document` | document:user |
| Reference (information-oriented) | `/document` | document:api, document:developer |
| Explanation (understanding-oriented) | `/explain` | explain:code, explain:architecture |

### Handoff Points

**Architect/Design → Document:**
- architecture.md → document:architecture (architecture documentation)
- design-spec.md → document:api (API reference)
- openapi.yaml → document:api (API examples)

**Implement → Document:**
- Source code → document:inline (JSDoc/docstrings)
- Git history → document:changelog (release notes)

**Explain → Document:**
- explain:architecture → document:architecture (promote to reference)
- explain:code → document:inline (add docstrings)

---

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Documentation-code drift | High | Regenerate docs regularly, integrate into CI, timestamp docs |
| Overwriting custom content | High | Implement section preservation, detect user-added sections |
| Inconsistent documentation style | Medium | Apply Diátaxis framework consistently, use templates |
| Stale examples | High | Extract examples from tests where possible, validate examples run |
| Missing public API coverage | Medium | Scan for undocumented exports, report coverage metrics |
| Changelog generation errors | Medium | Validate conventional commit format, handle malformed commits gracefully |
| Audience mismatch | Medium | Clear audience selection prompts, validate language complexity |

---

## Phase 1: Core Command Setup

**Objective:** Establish base /document command with YAML configuration and core prompt structure

**Tasks:**
- [ ] 1.1 Create `/document` command file at `.claude/commands/document.md`
- [ ] 1.2 Add YAML frontmatter with configuration:
  - name: document
  - description: Generate comprehensive documentation for APIs, users, developers, and architecture. Synthesizes code, designs, and artifacts into audience-specific docs.
  - category: documentation
  - model: sonnet
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

**VERIFY Phase 1:**
- [ ] Base /document command runs successfully, analyzes codebase, and produces structured output

---

## Phase 2: Documentation Workflow Implementation

**Objective:** Implement systematic documentation workflow with codebase analysis

**Tasks:**
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

**VERIFY Phase 2:**
- [ ] Documentation workflow produces comprehensive, well-structured documentation

---

## Phase 3: Sub-Command Implementation (P0)

**Objective:** Create 3 P0 sub-commands for core documentation needs

### 3.1 API Documentation Sub-Command

**Tasks:**
- [ ] 3.1.1 Create `/document:api` command file
  - YAML: model: sonnet, argument-hint: <api-path | openapi-spec>
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

**Tasks:**
- [ ] 3.2.1 Create `/document:user` command file
  - YAML: model: sonnet, argument-hint: <feature | --full>
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

**Tasks:**
- [ ] 3.3.1 Create `/document:developer` command file
  - YAML: model: sonnet, argument-hint: <--readme | --contributing | --full>
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

**VERIFY Phase 3:**
- [ ] All P0 sub-commands produce valid, audience-appropriate documentation

---

## Phase 4: Sub-Command Implementation (P1)

**Objective:** Create 3 P1 sub-commands for extended documentation needs

### 4.1 Architecture Documentation Sub-Command

**Tasks:**
- [ ] 4.1.1 Create `/document:architecture` command file
  - YAML: model: sonnet, argument-hint: <system | --adr>
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

**Tasks:**
- [ ] 4.2.1 Create `/document:changelog` command file
  - YAML: model: sonnet, argument-hint: <version | --since tag>
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

**Tasks:**
- [ ] 4.3.1 Create `/document:inline` command file
  - YAML: model: sonnet, argument-hint: <file-path | --all>
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

**VERIFY Phase 4:**
- [ ] All P1 sub-commands produce valid, well-formatted documentation

---

## Phase 5: Sub-Command Implementation (P2)

**Objective:** Create 2 P2 sub-commands for advanced documentation needs

### 5.1 Diagrams Documentation Sub-Command

**Tasks:**
- [ ] 5.1.1 Create `/document:diagrams` command file
  - YAML: model: sonnet, argument-hint: <type> [--scope path]
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

**Tasks:**
- [ ] 5.2.1 Create `/document:runbook` command file
  - YAML: model: sonnet, argument-hint: <operation | --deployment | --incident>
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

**VERIFY Phase 5:**
- [ ] All P2 sub-commands produce valid operational documentation

---

## Phase 6: Artifact Schemas & Quality Standards

**Objective:** Implement structured artifact generation with quality validation

### 6.1 Primary Artifacts

**Tasks:**
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

**Tasks:**
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

**Tasks:**
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

**VERIFY Phase 6:**
- [ ] Artifacts meet quality standards and Diátaxis framework principles

---

## Phase 7: Workflow Integration

**Objective:** Ensure /document integrates with upstream and downstream commands

### 7.1 Upstream Integration

**Tasks:**
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

**Tasks:**
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

**Tasks:**
- [ ] 7.3.1 API-First Documentation workflow:
  - /design:api → /spec:api → /document:api → /test
- [ ] 7.3.2 Feature Documentation workflow:
  - /clarify → /design → /implement → /document:user
  - /clarify → /design → /implement → /document:developer
- [ ] 7.3.3 Release Documentation workflow:
  - /implement → /test → /document:changelog → /release

**VERIFY Phase 7:**
- [ ] Documentation workflows produce consistent, linked documentation sets

---

## Phase 8: Testing & Validation

**Objective:** Comprehensive testing of documentation quality and accuracy

### 8.1 Sub-Command Testing

**Tasks:**
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

**Tasks:**
- [ ] 8.2.1 Test completeness (all public APIs documented)
- [ ] 8.2.2 Test accuracy (examples work)
- [ ] 8.2.3 Test formatting (valid markdown)
- [ ] 8.2.4 Test links (no broken links)

### 8.3 Update Testing

**Tasks:**
- [ ] 8.3.1 Test updating existing README
- [ ] 8.3.2 Test merging changelog entries
- [ ] 8.3.3 Test preserving custom sections

### 8.4 Edge Cases

**Tasks:**
- [ ] 8.4.1 Test with no existing documentation
- [ ] 8.4.2 Test with extensive existing documentation
- [ ] 8.4.3 Test with undocumented codebase
- [ ] 8.4.4 Test with multiple documentation formats

**VERIFY Phase 8:**
- [ ] All test cases pass, documentation quality is consistently high

---

## Phase 9: Documentation & Polish

**Objective:** Create comprehensive documentation and refine user experience

**Tasks:**
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

**VERIFY Phase 9:**
- [ ] Documentation is complete, clear, and helpful; output quality is polished

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

---

