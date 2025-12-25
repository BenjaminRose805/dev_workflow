# Implementation Plan: /template Command

## Overview
- **Goal:** Implement the `/template` command suite for comprehensive template management for reusable artifacts across plans, commands, workflows, and documentation. This command enables teams to create, apply, validate, and share standardized templates that accelerate development while maintaining consistency.
- **Priority:** P1 (Core meta-command)
- **Created:** 2025-12-22
- **Output:** `docs/plan-outputs/template-command/`

> The /template command provides comprehensive template management for reusable artifacts across plans, commands, workflows, and documentation. It enables teams to create, apply, validate, and share standardized templates that accelerate development while maintaining consistency.

### Sub-Command Priorities

| Sub-Command | Priority | Scope | Description |
|-------------|----------|-------|-------------|
| `template:list` | P0 | MVP | Discover and list available templates with filtering and search |
| `template:create` | P0 | MVP | Create new templates from existing artifacts with variable detection |
| `template:apply` | P0 | MVP | Apply templates with variable substitution to generate artifacts |
| `template:edit` | P1 | Core | Edit template definitions and variable configurations |
| `template:validate` | P1 | Core | Validate template syntax, variables, and dependencies |
| `template:import` | P2 | Enhancement | Import templates from URLs or local files |
| `template:export` | P2 | Enhancement | Export templates as shareable bundles |
| `template:delete` | P2 | Enhancement | Safely delete templates with dependency checking |

---


---

## Dependencies

### Upstream
- None (this is a utility/meta-command)

### Downstream
- `/plan:create` - Uses plan templates
- `/workflow:create` - Uses workflow templates
- `/document` - Uses documentation templates

### External Tools
- None (template system is self-contained)

---

## Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Template corruption on edit | Medium | Low | Backup before edit, validation after |
| Variable substitution errors | Medium | Medium | Comprehensive validation, clear error messages |
| Import of malicious templates | Low | Low | Validate imported templates, sandboxed execution |
| Template versioning conflicts | Low | Medium | Version tracking, conflict detection |
## Phase 1: Core Command Infrastructure

### 1.1 Command File Setup

**Tasks:**
- [ ] 1.1.1 Create `/src/commands/template.ts` with base command structure
- [ ] 1.1.2 Define command metadata (name, description, usage examples)
- [ ] 1.1.3 Set up shared types and interfaces for template operations
- [ ] 1.1.4 Implement base error handling and logging utilities
- [ ] 1.1.5 Create output directory structure for template artifacts
- [ ] 1.1.6 Create `.claude/templates/` directory structure

**VERIFY 1.1:**
- [ ] Command file exists and exports proper structure
- [ ] Base types are defined for template context, variables, and artifacts
- [ ] Error handling covers common failure scenarios

### 1.2 Template Directory Infrastructure

**Tasks:**
- [ ] 1.2.1 Create `plans/` subdirectory for plan templates
- [ ] 1.2.2 Create `commands/` subdirectory for command templates
- [ ] 1.2.3 Create `artifacts/` subdirectory for artifact templates
- [ ] 1.2.4 Create `workflows/` subdirectory for workflow templates
- [ ] 1.2.5 Create `documentation/` subdirectory for documentation templates
- [ ] 1.2.6 Create `custom/` subdirectory for user-created templates

**VERIFY 1.2:**
- [ ] All subdirectories are created with proper structure
- [ ] Directory structure matches documented specification
- [ ] Template manifest can track templates across directories

### 1.3 Variable Substitution Engine

**Tasks:**
- [ ] 1.3.1 Implement `{{variable_name}}` basic substitution
- [ ] 1.3.2 Build filter support (`{{name | slugify}}`, `{{text | uppercase}}`)
- [ ] 1.3.3 Create conditional support (`{{#if variable}}...{{/if}}`)
- [ ] 1.3.4 Implement system variables (`{{date}}`, `{{git.user.name}}`, `{{project.name}}`)
- [ ] 1.3.5 Build variable validation against template schema
- [ ] 1.3.6 Add escape sequences for literal `{{` and `}}`

**VERIFY 1.3:**
- [ ] Basic variable substitution works correctly
- [ ] All documented filters are implemented
- [ ] Invalid variables are caught with helpful errors

**VERIFY Phase 1:**
- [ ] Core command infrastructure is complete
- [ ] Template directory structure is created
- [ ] Variable substitution engine works correctly

## Phase 2: Primary Sub-commands (P0)

### 2.1 template:list Implementation

**Tasks:**
- [ ] 2.1.1 Create `/src/commands/template/list.ts` sub-command handler
- [ ] 2.1.2 Implement template discovery across all subdirectories
- [ ] 2.1.3 Build template metadata extraction (name, category, variables)
- [ ] 2.1.4 Create categorized display with counts
- [ ] 2.1.5 Implement filtering by category and tags
- [ ] 2.1.6 Add template search functionality

**Model:** haiku (simple listing)

**VERIFY 2.1:**
- [ ] All templates are discovered across directories
- [ ] Metadata is correctly extracted and displayed
- [ ] Search finds relevant templates

### 2.2 template:create Implementation

**Tasks:**
- [ ] 2.2.1 Create `/src/commands/template/create.ts` sub-command handler
- [ ] 2.2.2 Implement artifact analysis for variable detection
- [ ] 2.2.3 Build interactive variable definition wizard
- [ ] 2.2.4 Create YAML frontmatter generator
- [ ] 2.2.5 Implement template file generator
- [ ] 2.2.6 Add template manifest update

**Model:** sonnet

**VERIFY 2.2:**
- [ ] Variables are correctly detected from source artifact
- [ ] Frontmatter is correctly generated
- [ ] Manifest is updated with new template

### 2.3 template:apply Implementation

**Tasks:**
- [ ] 2.3.1 Create `/src/commands/template/apply.ts` sub-command handler
- [ ] 2.3.2 Implement template selection (by name or interactive)
- [ ] 2.3.3 Build variable value collection (interactive prompts)
- [ ] 2.3.4 Create variable substitution execution
- [ ] 2.3.5 Implement output file generation with path templating
- [ ] 2.3.6 Add post-application validation

**Model:** sonnet

**VERIFY 2.3:**
- [ ] Template selection works by name and interactively
- [ ] Substitution produces correct output
- [ ] Output files are created at correct paths

**VERIFY Phase 2:**
- [ ] All primary sub-commands work correctly
- [ ] Template discovery finds all templates
- [ ] Template creation and application work end-to-end

## Phase 3: Secondary Sub-commands (P1)

### 3.1 template:edit Implementation

**Tasks:**
- [ ] 3.1.1 Create `/src/commands/template/edit.ts` sub-command handler
- [ ] 3.1.2 Implement template loading for editing
- [ ] 3.1.3 Build variable definition editor
- [ ] 3.1.4 Create content editor integration
- [ ] 3.1.5 Implement version bumping on edit
- [ ] 3.1.6 Add template validation after edit

**Model:** sonnet

**VERIFY 3.1:**
- [ ] Templates are correctly loaded for editing
- [ ] Variable definitions can be modified
- [ ] Validation catches issues before save

### 3.2 template:validate Implementation

**Tasks:**
- [ ] 3.2.1 Create `/src/commands/template/validate.ts` sub-command handler
- [ ] 3.2.2 Implement YAML frontmatter validation
- [ ] 3.2.3 Build variable definition validation
- [ ] 3.2.4 Create content variable usage validation
- [ ] 3.2.5 Implement dependency validation
- [ ] 3.2.6 Generate validation report

**Model:** sonnet

**VERIFY 3.2:**
- [ ] Frontmatter syntax is validated
- [ ] Variable definitions are complete and valid
- [ ] Report clearly shows issues and warnings

**VERIFY Phase 3:**
- [ ] Secondary sub-commands work correctly
- [ ] Template editing preserves formatting
- [ ] Validation catches common issues

## Phase 4: Remaining Sub-commands (P2)

### 4.1 template:import Implementation

**Tasks:**
- [ ] 4.1.1 Create `/src/commands/template/import.ts` sub-command handler
- [ ] 4.1.2 Implement URL import (GitHub gists, raw files)
- [ ] 4.1.3 Build local file import
- [ ] 4.1.4 Create import validation
- [ ] 4.1.5 Implement conflict resolution for existing templates
- [ ] 4.1.6 Add import logging and manifest update

**Model:** sonnet

**VERIFY 4.1:**
- [ ] URL import works for common sources
- [ ] Local file import works correctly
- [ ] Manifest is updated after import

### 4.2 template:export Implementation

**Tasks:**
- [ ] 4.2.1 Create `/src/commands/template/export.ts` sub-command handler
- [ ] 4.2.2 Implement template bundle creation
- [ ] 4.2.3 Build dependency inclusion
- [ ] 4.2.4 Create export format options (zip, tar, single file)
- [ ] 4.2.5 Implement shareable link generation (optional)
- [ ] 4.2.6 Add export metadata

**Model:** sonnet

**VERIFY 4.2:**
- [ ] Template bundles are correctly created
- [ ] Dependencies are included
- [ ] Metadata is preserved in export

### 4.3 template:delete Implementation

**Tasks:**
- [ ] 4.3.1 Create `/src/commands/template/delete.ts` sub-command handler
- [ ] 4.3.2 Implement template selection for deletion
- [ ] 4.3.3 Build confirmation prompt
- [ ] 4.3.4 Create dependency check (warn if other templates depend on it)
- [ ] 4.3.5 Implement safe deletion with backup
- [ ] 4.3.6 Add manifest update after deletion

**Model:** haiku (simple deletion)

**VERIFY 4.3:**
- [ ] Template selection works correctly
- [ ] Confirmation prevents accidental deletion
- [ ] Manifest is updated after deletion

**VERIFY Phase 4:**
- [ ] All remaining sub-commands work correctly
- [ ] Import/export preserve template integrity
- [ ] Deletion is safe and reversible

## Phase 5: Template Categories

### 5.1 Plan Templates

**Tasks:**
- [ ] 5.1.1 Create plan template schema
- [ ] 5.1.2 Implement plan-specific variable types (phases, tasks)
- [ ] 5.1.3 Build plan structure validation
- [ ] 5.1.4 Create plan template examples (analysis, validation, test-creation)
- [ ] 5.1.5 Implement plan template integration with /plan:create
- [ ] 5.1.6 Add plan template documentation

**VERIFY 5.1:**
- [ ] Plan template schema is complete
- [ ] Plan variables work correctly
- [ ] Integration with /plan:create works

### 5.2 Command Templates

**Tasks:**
- [ ] 5.2.1 Create command template schema
- [ ] 5.2.2 Implement command-specific frontmatter variables
- [ ] 5.2.3 Build command structure validation
- [ ] 5.2.4 Create command template examples
- [ ] 5.2.5 Implement command template integration
- [ ] 5.2.6 Add command template documentation

**VERIFY 5.2:**
- [ ] Command template schema is complete
- [ ] Frontmatter variables are correctly handled
- [ ] Integration works correctly

### 5.3 Artifact Templates

**Tasks:**
- [ ] 5.3.1 Create artifact template schema (specs, requirements, reports)
- [ ] 5.3.2 Implement artifact-specific variable types
- [ ] 5.3.3 Build artifact structure validation
- [ ] 5.3.4 Create artifact template examples
- [ ] 5.3.5 Implement artifact template integration with various commands
- [ ] 5.3.6 Add artifact template documentation

**VERIFY 5.3:**
- [ ] Artifact template schema is complete
- [ ] Artifact variables work correctly
- [ ] Integration works with relevant commands

### 5.4 Workflow Templates

**Tasks:**
- [ ] 5.4.1 Create workflow template schema
- [ ] 5.4.2 Implement workflow-specific variable types (steps, conditions)
- [ ] 5.4.3 Build workflow structure validation
- [ ] 5.4.4 Create workflow template examples (TDD, release, etc.)
- [ ] 5.4.5 Implement workflow template integration with /workflow:create
- [ ] 5.4.6 Add workflow template documentation

**VERIFY 5.4:**
- [ ] Workflow template schema is complete
- [ ] Workflow variables work correctly
- [ ] Integration with /workflow:create works

### 5.5 Documentation Templates

**Tasks:**
- [ ] 5.5.1 Create documentation template schema
- [ ] 5.5.2 Implement doc-specific variable types (sections, references)
- [ ] 5.5.3 Build documentation structure validation
- [ ] 5.5.4 Create documentation template examples (API, architecture, user guide)
- [ ] 5.5.5 Implement documentation template integration with /document
- [ ] 5.5.6 Add documentation template documentation

**VERIFY 5.5:**
- [ ] Documentation template schema is complete
- [ ] Doc variables work correctly
- [ ] Integration with /document works

**VERIFY Phase 5:**
- [ ] All template categories are implemented
- [ ] Schema validation works for each category
- [ ] Integration with relevant commands works

## Phase 6: Artifact Generation

### 6.1 Template Manifest Generation

**Tasks:**
- [ ] 6.1.1 Create `template-manifest.json` schema
- [ ] 6.1.2 Implement manifest auto-generation from templates
- [ ] 6.1.3 Build template metadata extraction
- [ ] 6.1.4 Create category aggregation
- [ ] 6.1.5 Implement manifest validation
- [ ] 6.1.6 Add manifest update triggers

**VERIFY 6.1:**
- [ ] Manifest schema is complete and valid
- [ ] Auto-generation captures all templates
- [ ] Manifest stays in sync with templates

### 6.2 Validation Report Generation

**Tasks:**
- [ ] 6.2.1 Create `validation-report.md` template
- [ ] 6.2.2 Implement validation summary section
- [ ] 6.2.3 Build variable validation table
- [ ] 6.2.4 Generate issues and warnings section
- [ ] 6.2.5 Create recommendations section
- [ ] 6.2.6 Add fix suggestions

**VERIFY 6.2:**
- [ ] Validation reports are comprehensive
- [ ] Issues are clearly explained
- [ ] Recommendations are actionable

### 6.3 Template Config Generation

**Tasks:**
- [ ] 6.3.1 Create `template-config.json` schema
- [ ] 6.3.2 Implement default values configuration
- [ ] 6.3.3 Build system variable configuration
- [ ] 6.3.4 Create filter configuration
- [ ] 6.3.5 Implement directory structure configuration
- [ ] 6.3.6 Add user preference storage

**VERIFY 6.3:**
- [ ] Config schema is complete
- [ ] Default values work correctly
- [ ] User preferences persist

**VERIFY Phase 6:**
- [ ] All artifact generation works correctly
- [ ] Manifest accurately tracks templates
- [ ] Config enables customization

## Phase 7: Integration & Testing

### 7.1 Command Integration

**Tasks:**
- [ ] 7.1.1 Register `/template` command in main command registry
- [ ] 7.1.2 Implement command router for all sub-commands
- [ ] 7.1.3 Add command help text and usage examples
- [ ] 7.1.4 Create command completion suggestions
- [ ] 7.1.5 Implement command aliases and shortcuts
- [ ] 7.1.6 Add command analytics and telemetry

**VERIFY 7.1:**
- [ ] All sub-commands are accessible via CLI
- [ ] Help text is accurate and comprehensive
- [ ] Command routing works correctly

### 7.2 End-to-End Testing

**Tasks:**
- [ ] 7.2.1 Create test suite for each sub-command with real scenarios
- [ ] 7.2.2 Implement integration tests for variable substitution
- [ ] 7.2.3 Build validation tests for template categories
- [ ] 7.2.4 Create performance tests for large template libraries
- [ ] 7.2.5 Add regression tests for existing functionality
- [ ] 7.2.6 Implement error handling tests for failure scenarios

**VERIFY 7.2:**
- [ ] All sub-commands pass their test suites
- [ ] Variable substitution works correctly
- [ ] Error handling is robust and informative

### 7.3 Documentation

**Tasks:**
- [ ] 7.3.1 Create user guide for `/template` command with examples
- [ ] 7.3.2 Document each sub-command with use cases
- [ ] 7.3.3 Write template authoring guide
- [ ] 7.3.4 Create variable reference documentation
- [ ] 7.3.5 Add troubleshooting guide for common issues
- [ ] 7.3.6 Generate architecture documentation for developers

**VERIFY 7.3:**
- [ ] User guide covers all common scenarios
- [ ] Sub-command documentation is complete
- [ ] Troubleshooting guide addresses known issues

**VERIFY Phase 7:**
- [ ] All integration tests pass
- [ ] Documentation is complete and accurate
- [ ] End-to-end testing validates full workflow

## Success Criteria

### Functional Requirements
- [ ] All 7 sub-commands (list, create, apply, edit, validate, import, export, delete) are implemented and functional
- [ ] Variable substitution works for basic, filters, conditionals, and system variables
- [ ] All 5 template categories (plans, commands, artifacts, workflows, documentation) are supported
- [ ] Template manifest tracks all templates with accurate metadata
- [ ] Template validation catches common issues
- [ ] Import/export enables template sharing

### Quality Requirements
- [ ] All unit tests pass with >90% coverage
- [ ] Integration tests validate end-to-end workflows
- [ ] Performance meets targets (template listing <1s, application <5s)
- [ ] Generated artifacts follow conventions and are well-formatted
- [ ] Error messages are clear and actionable
- [ ] Variable substitution is accurate and complete

### Artifact Requirements
- [ ] template-manifest.json contains accurate template registry
- [ ] validation-report.md provides clear validation feedback
- [ ] template-config.json enables customization
- [ ] All artifacts are properly formatted and human-readable
- [ ] Template files follow documented schema

### Integration Requirements
- [ ] Command is registered and accessible via CLI
- [ ] Help text and examples are complete and accurate
- [ ] Templates integrate with /plan:create, /workflow:create, /document
- [ ] Telemetry captures usage for improvement
- [ ] Documentation enables users to create and use templates

### User Experience Requirements
- [ ] Command provides clear feedback during template operations
- [ ] Interactive template creation guides users step-by-step
- [ ] Variable prompts show defaults and validation rules
- [ ] Template discovery is intuitive with filtering and search
- [ ] Import/export enables easy template sharing

---

