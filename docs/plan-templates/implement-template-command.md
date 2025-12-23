# Implementation Plan: /template Command

## Overview

**Goal:** Implement the `/template` command suite for comprehensive template management for reusable artifacts across plans, commands, workflows, and documentation. This command enables teams to create, apply, validate, and share standardized templates that accelerate development while maintaining consistency.

**Priority:** P1 (Core meta-command)

**Created:** {{date}}

**Output:** `docs/plan-outputs/implement-template-command/`

## Phase 1: Core Command Infrastructure

### 1.1 Command File Setup

**Tasks:**
- 1.1.1 Create `/src/commands/template.ts` with base command structure
- 1.1.2 Define command metadata (name, description, usage examples)
- 1.1.3 Set up shared types and interfaces for template operations
- 1.1.4 Implement base error handling and logging utilities
- 1.1.5 Create output directory structure for template artifacts
- 1.1.6 Create `.claude/templates/` directory structure

**VERIFY:**
- [ ] Command file exists and exports proper structure
- [ ] Base types are defined for template context, variables, and artifacts
- [ ] Error handling covers common failure scenarios
- [ ] Output directory structure is created on command initialization
- [ ] `.claude/templates/` directory structure matches specification

### 1.2 Template Directory Infrastructure

**Tasks:**
- 1.2.1 Create `plans/` subdirectory for plan templates
- 1.2.2 Create `commands/` subdirectory for command templates
- 1.2.3 Create `artifacts/` subdirectory for artifact templates
- 1.2.4 Create `workflows/` subdirectory for workflow templates
- 1.2.5 Create `documentation/` subdirectory for documentation templates
- 1.2.6 Create `custom/` subdirectory for user-created templates

**VERIFY:**
- [ ] All subdirectories are created with proper structure
- [ ] Directory structure matches documented specification
- [ ] Permissions are correctly set for read/write
- [ ] Template manifest can track templates across directories

### 1.3 Variable Substitution Engine

**Tasks:**
- 1.3.1 Implement `{{variable_name}}` basic substitution
- 1.3.2 Build filter support (`{{name | slugify}}`, `{{text | uppercase}}`)
- 1.3.3 Create conditional support (`{{#if variable}}...{{/if}}`)
- 1.3.4 Implement system variables (`{{date}}`, `{{git.user.name}}`, `{{project.name}}`)
- 1.3.5 Build variable validation against template schema
- 1.3.6 Add escape sequences for literal `{{` and `}}`

**VERIFY:**
- [ ] Basic variable substitution works correctly
- [ ] All documented filters are implemented
- [ ] Conditionals correctly include/exclude content
- [ ] System variables are auto-populated
- [ ] Invalid variables are caught with helpful errors

## Phase 2: Primary Sub-commands (P0)

### 2.1 template:list Implementation

**Tasks:**
- 2.1.1 Create `/src/commands/template/list.ts` sub-command handler
- 2.1.2 Implement template discovery across all subdirectories
- 2.1.3 Build template metadata extraction (name, category, variables)
- 2.1.4 Create categorized display with counts
- 2.1.5 Implement filtering by category and tags
- 2.1.6 Add template search functionality

**Model:** Claude Haiku (simple listing)

**VERIFY:**
- [ ] All templates are discovered across directories
- [ ] Metadata is correctly extracted and displayed
- [ ] Categories show accurate counts
- [ ] Filtering works correctly
- [ ] Search finds relevant templates

### 2.2 template:create Implementation

**Tasks:**
- 2.2.1 Create `/src/commands/template/create.ts` sub-command handler
- 2.2.2 Implement artifact analysis for variable detection
- 2.2.3 Build interactive variable definition wizard
- 2.2.4 Create YAML frontmatter generator
- 2.2.5 Implement template file generator
- 2.2.6 Add template manifest update

**Model:** Claude Sonnet

**VERIFY:**
- [ ] Variables are correctly detected from source artifact
- [ ] Variable wizard captures all necessary metadata
- [ ] Frontmatter is correctly generated
- [ ] Template file is properly formatted
- [ ] Manifest is updated with new template

### 2.3 template:apply Implementation

**Tasks:**
- 2.3.1 Create `/src/commands/template/apply.ts` sub-command handler
- 2.3.2 Implement template selection (by name or interactive)
- 2.3.3 Build variable value collection (interactive prompts)
- 2.3.4 Create variable substitution execution
- 2.3.5 Implement output file generation with path templating
- 2.3.6 Add post-application validation

**Model:** Claude Sonnet

**VERIFY:**
- [ ] Template selection works by name and interactively
- [ ] Variable prompts show defaults and validation
- [ ] Substitution produces correct output
- [ ] Output files are created at correct paths
- [ ] Validation catches substitution errors

## Phase 3: Secondary Sub-commands (P1)

### 3.1 template:edit Implementation

**Tasks:**
- 3.1.1 Create `/src/commands/template/edit.ts` sub-command handler
- 3.1.2 Implement template loading for editing
- 3.1.3 Build variable definition editor
- 3.1.4 Create content editor integration
- 3.1.5 Implement version bumping on edit
- 3.1.6 Add template validation after edit

**Model:** Claude Sonnet

**VERIFY:**
- [ ] Templates are correctly loaded for editing
- [ ] Variable definitions can be modified
- [ ] Content can be edited in place
- [ ] Version is bumped appropriately
- [ ] Validation catches issues before save

### 3.2 template:validate Implementation

**Tasks:**
- 3.2.1 Create `/src/commands/template/validate.ts` sub-command handler
- 3.2.2 Implement YAML frontmatter validation
- 3.2.3 Build variable definition validation
- 3.2.4 Create content variable usage validation
- 3.2.5 Implement dependency validation
- 3.2.6 Generate validation report

**Model:** Claude Sonnet

**VERIFY:**
- [ ] Frontmatter syntax is validated
- [ ] Variable definitions are complete and valid
- [ ] All content variables have definitions
- [ ] Dependencies are found and valid
- [ ] Report clearly shows issues and warnings

## Phase 4: Remaining Sub-commands (P2)

### 4.1 template:import Implementation

**Tasks:**
- 4.1.1 Create `/src/commands/template/import.ts` sub-command handler
- 4.1.2 Implement URL import (GitHub gists, raw files)
- 4.1.3 Build local file import
- 4.1.4 Create import validation
- 4.1.5 Implement conflict resolution for existing templates
- 4.1.6 Add import logging and manifest update

**Model:** Claude Sonnet

**VERIFY:**
- [ ] URL import works for common sources
- [ ] Local file import works correctly
- [ ] Imported templates are validated
- [ ] Conflicts are handled gracefully
- [ ] Manifest is updated after import

### 4.2 template:export Implementation

**Tasks:**
- 4.2.1 Create `/src/commands/template/export.ts` sub-command handler
- 4.2.2 Implement template bundle creation
- 4.2.3 Build dependency inclusion
- 4.2.4 Create export format options (zip, tar, single file)
- 4.2.5 Implement shareable link generation (optional)
- 4.2.6 Add export metadata

**Model:** Claude Sonnet

**VERIFY:**
- [ ] Template bundles are correctly created
- [ ] Dependencies are included
- [ ] Export formats work correctly
- [ ] Shareable links work when enabled
- [ ] Metadata is preserved in export

### 4.3 template:delete Implementation

**Tasks:**
- 4.3.1 Create `/src/commands/template/delete.ts` sub-command handler
- 4.3.2 Implement template selection for deletion
- 4.3.3 Build confirmation prompt
- 4.3.4 Create dependency check (warn if other templates depend on it)
- 4.3.5 Implement safe deletion with backup
- 4.3.6 Add manifest update after deletion

**Model:** Claude Haiku (simple deletion)

**VERIFY:**
- [ ] Template selection works correctly
- [ ] Confirmation prevents accidental deletion
- [ ] Dependency warnings are shown
- [ ] Deletion creates backup
- [ ] Manifest is updated after deletion

## Phase 5: Template Categories

### 5.1 Plan Templates

**Tasks:**
- 5.1.1 Create plan template schema
- 5.1.2 Implement plan-specific variable types (phases, tasks)
- 5.1.3 Build plan structure validation
- 5.1.4 Create plan template examples (analysis, validation, test-creation)
- 5.1.5 Implement plan template integration with /plan:create
- 5.1.6 Add plan template documentation

**VERIFY:**
- [ ] Plan template schema is complete
- [ ] Plan variables work correctly
- [ ] Structure validation catches issues
- [ ] Examples are useful and valid
- [ ] Integration with /plan:create works

### 5.2 Command Templates

**Tasks:**
- 5.2.1 Create command template schema
- 5.2.2 Implement command-specific frontmatter variables
- 5.2.3 Build command structure validation
- 5.2.4 Create command template examples
- 5.2.5 Implement command template integration
- 5.2.6 Add command template documentation

**VERIFY:**
- [ ] Command template schema is complete
- [ ] Frontmatter variables are correctly handled
- [ ] Structure validation catches issues
- [ ] Examples are useful and valid
- [ ] Integration works correctly

### 5.3 Artifact Templates

**Tasks:**
- 5.3.1 Create artifact template schema (specs, requirements, reports)
- 5.3.2 Implement artifact-specific variable types
- 5.3.3 Build artifact structure validation
- 5.3.4 Create artifact template examples
- 5.3.5 Implement artifact template integration with various commands
- 5.3.6 Add artifact template documentation

**VERIFY:**
- [ ] Artifact template schema is complete
- [ ] Artifact variables work correctly
- [ ] Structure validation catches issues
- [ ] Examples cover common artifact types
- [ ] Integration works with relevant commands

### 5.4 Workflow Templates

**Tasks:**
- 5.4.1 Create workflow template schema
- 5.4.2 Implement workflow-specific variable types (steps, conditions)
- 5.4.3 Build workflow structure validation
- 5.4.4 Create workflow template examples (TDD, release, etc.)
- 5.4.5 Implement workflow template integration with /workflow:create
- 5.4.6 Add workflow template documentation

**VERIFY:**
- [ ] Workflow template schema is complete
- [ ] Workflow variables work correctly
- [ ] Structure validation catches issues
- [ ] Examples cover common workflows
- [ ] Integration with /workflow:create works

### 5.5 Documentation Templates

**Tasks:**
- 5.5.1 Create documentation template schema
- 5.5.2 Implement doc-specific variable types (sections, references)
- 5.5.3 Build documentation structure validation
- 5.5.4 Create documentation template examples (API, architecture, user guide)
- 5.5.5 Implement documentation template integration with /document
- 5.5.6 Add documentation template documentation

**VERIFY:**
- [ ] Documentation template schema is complete
- [ ] Doc variables work correctly
- [ ] Structure validation catches issues
- [ ] Examples cover common doc types
- [ ] Integration with /document works

## Phase 6: Artifact Generation

### 6.1 Template Manifest Generation

**Tasks:**
- 6.1.1 Create `template-manifest.json` schema
- 6.1.2 Implement manifest auto-generation from templates
- 6.1.3 Build template metadata extraction
- 6.1.4 Create category aggregation
- 6.1.5 Implement manifest validation
- 6.1.6 Add manifest update triggers

**VERIFY:**
- [ ] Manifest schema is complete and valid
- [ ] Auto-generation captures all templates
- [ ] Metadata is correctly extracted
- [ ] Categories are accurately counted
- [ ] Manifest stays in sync with templates

### 6.2 Validation Report Generation

**Tasks:**
- 6.2.1 Create `validation-report.md` template
- 6.2.2 Implement validation summary section
- 6.2.3 Build variable validation table
- 6.2.4 Generate issues and warnings section
- 6.2.5 Create recommendations section
- 6.2.6 Add fix suggestions

**VERIFY:**
- [ ] Validation reports are comprehensive
- [ ] Summary accurately reflects validation status
- [ ] Variable table shows all validations
- [ ] Issues are clearly explained
- [ ] Recommendations are actionable

### 6.3 Template Config Generation

**Tasks:**
- 6.3.1 Create `template-config.json` schema
- 6.3.2 Implement default values configuration
- 6.3.3 Build system variable configuration
- 6.3.4 Create filter configuration
- 6.3.5 Implement directory structure configuration
- 6.3.6 Add user preference storage

**VERIFY:**
- [ ] Config schema is complete
- [ ] Default values work correctly
- [ ] System variables are configurable
- [ ] Filters can be customized
- [ ] User preferences persist

## Phase 7: Integration & Testing

### 7.1 Command Integration

**Tasks:**
- 7.1.1 Register `/template` command in main command registry
- 7.1.2 Implement command router for all sub-commands
- 7.1.3 Add command help text and usage examples
- 7.1.4 Create command completion suggestions
- 7.1.5 Implement command aliases and shortcuts
- 7.1.6 Add command analytics and telemetry

**VERIFY:**
- [ ] All sub-commands are accessible via CLI
- [ ] Help text is accurate and comprehensive
- [ ] Command routing works correctly for all sub-commands
- [ ] Aliases and shortcuts function as expected
- [ ] Telemetry captures usage patterns

### 7.2 End-to-End Testing

**Tasks:**
- 7.2.1 Create test suite for each sub-command with real scenarios
- 7.2.2 Implement integration tests for variable substitution
- 7.2.3 Build validation tests for template categories
- 7.2.4 Create performance tests for large template libraries
- 7.2.5 Add regression tests for existing functionality
- 7.2.6 Implement error handling tests for failure scenarios

**VERIFY:**
- [ ] All sub-commands pass their test suites
- [ ] Variable substitution works correctly in all scenarios
- [ ] Category-specific validation works
- [ ] Performance is acceptable for large libraries
- [ ] Error handling is robust and informative

### 7.3 Documentation

**Tasks:**
- 7.3.1 Create user guide for `/template` command with examples
- 7.3.2 Document each sub-command with use cases
- 7.3.3 Write template authoring guide
- 7.3.4 Create variable reference documentation
- 7.3.5 Add troubleshooting guide for common issues
- 7.3.6 Generate architecture documentation for developers

**VERIFY:**
- [ ] User guide covers all common template scenarios
- [ ] Sub-command documentation is complete and accurate
- [ ] Authoring guide enables template creation
- [ ] Variable reference is comprehensive
- [ ] Troubleshooting guide addresses known issues

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
