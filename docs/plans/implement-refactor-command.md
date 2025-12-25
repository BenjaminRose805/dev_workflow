# Implementation Plan: /refactor Command

## Overview
- **Goal:** Implement the `/refactor` command with intelligent code refactoring, safety analysis, impact assessment, and automated verification across multiple sub-commands.
- **Priority:** P0 (Core sub-commands), P1 (Advanced sub-commands), P2 (Specialized sub-commands)
- **Created:** 2025-12-22
- **Output:** `docs/plan-outputs/refactor-command/`

> The /refactor command provides intelligent, safe code refactoring with automated impact analysis, safety protocols, and verification. It supports extraction, renaming, simplification, pattern application, modernization, and security hardening with built-in rollback capabilities.

### Sub-Command Priorities

| Sub-Command | Priority | Scope | Description |
|-------------|----------|-------|-------------|
| `refactor:extract` | P0 | MVP | Extract methods, components, and modules with dependency resolution |
| `refactor:rename` | P0 | MVP | Rename symbols across codebase with import/export updates |
| `refactor:simplify` | P0 | MVP | Reduce complexity through early returns, guard clauses, and deduplication |
| `refactor:patterns` | P1 | Core | Apply design patterns and remediate anti-patterns (Opus model) |
| `refactor:modernize` | P1 | Core | Update to modern syntax and migrate deprecated APIs |
| `refactor:organize` | P1 | Core | Reorganize file structure and optimize imports |
| `refactor:types` | P1 | Core | Add type annotations and improve type safety |
| `refactor:security` | P1 | Core | Detect vulnerabilities and apply security hardening (Opus model) |
| `refactor:performance` | P2 | Enhancement | Optimize bottlenecks with memoization and efficiency improvements |
| `refactor:test` | P2 | Enhancement | Refactor test structure and reduce test duplication |

---

## Dependencies

### Upstream
- `/explore` - uses exploration data for understanding codebase structure
- `/analyze` - leverages analysis results for complexity metrics and pattern detection
- `/design` - may consume design artifacts for pattern application

### Downstream
- `/test` - refactored code requires test validation
- `/validate` - refactoring triggers type/lint/build validation
- `/review` - significant refactoring may require code review
- `/document` - refactoring may require documentation updates

### External Tools
- TypeScript compiler (`tsc`) - for type checking during refactoring
- ESLint - for code quality validation
- Git - for automatic stashing/branching and rollback
- Test runners (Jest/Vitest) - for automated testing after refactors

---

## Phase 1: Core Infrastructure

### 1.1 Create command structure

**Tasks:**
- [ ] 1.1.1 Create `src/skills/refactor.ts` with base command handler
- [ ] 1.1.2 Define core types and interfaces for refactoring operations
- [ ] 1.1.3 Implement safety protocols framework (pre-flight checks, rollback capability)
- [ ] 1.1.4 Create refactoring context manager (state tracking, change validation)

### 1.2 Build impact analysis engine

**Tasks:**
- [ ] 1.2.1 Implement static analysis for dependency tracking
- [ ] 1.2.2 Create scope calculation (files, functions, references affected)
- [ ] 1.2.3 Build risk assessment scoring system
- [ ] 1.2.4 Implement metrics collection (complexity, coverage, performance baselines)

### 1.3 Implement safety mechanisms

**Tasks:**
- [ ] 1.3.1 Create git integration for automatic stashing/branching
- [ ] 1.3.2 Implement change validation (syntax, type checking, linting)
- [ ] 1.3.3 Build rollback system with checkpoint management
- [ ] 1.3.4 Create backup/restore functionality for safe refactoring

### 1.4 Set up artifact infrastructure

**Tasks:**
- [ ] 1.4.1 Create artifact generator base class
- [ ] 1.4.2 Implement output directory management for refactor operations
- [ ] 1.4.3 Build template system for consistent artifact formatting
- [ ] 1.4.4 Create metadata tracking for refactoring sessions

**VERIFY Phase 1:**
- [ ] Command file exists with proper structure
- [ ] Safety protocols prevent destructive operations
- [ ] Impact analysis correctly identifies affected code
- [ ] Rollback mechanism successfully restores previous state
- [ ] Artifact infrastructure creates organized output

## Phase 2: P0 Sub-commands (Critical Refactoring)

### 2.1 Implement `refactor:extract`

**Tasks:**
- [ ] 2.1.1 Create method extraction with intelligent boundary detection
- [ ] 2.1.2 Implement component extraction for UI frameworks (React, Vue, etc.)
- [ ] 2.1.3 Build module extraction with dependency resolution
- [ ] 2.1.4 Add parameter inference and signature optimization
- [ ] 2.1.5 Implement extract validation (ensures no behavioral changes)

### 2.2 Implement `refactor:rename`

**Tasks:**
- [ ] 2.2.1 Build symbol resolution across entire codebase
- [ ] 2.2.2 Implement cross-file rename with import/export updates
- [ ] 2.2.3 Create scope-aware renaming (local vs global)
- [ ] 2.2.4 Add conflict detection (naming collisions, shadowing)
- [ ] 2.2.5 Implement preview mode showing all affected locations

### 2.3 Implement `refactor:simplify`

**Tasks:**
- [ ] 2.3.1 Create complexity analysis (cyclomatic, cognitive complexity)
- [ ] 2.3.2 Implement simplification strategies (early returns, guard clauses)
- [ ] 2.3.3 Build nested condition flattening
- [ ] 2.3.4 Add duplicate code detection and extraction
- [ ] 2.3.5 Implement simplification validation (logic equivalence checking)

### 2.4 Build verification system for P0 commands

**Tasks:**
- [ ] 2.4.1 Implement automated testing after each refactor
- [ ] 2.4.2 Create before/after comparison reports
- [ ] 2.4.3 Build regression detection
- [ ] 2.4.4 Add performance impact measurement

**VERIFY Phase 2:**
- [ ] `refactor:extract` successfully extracts methods/components/modules
- [ ] `refactor:rename` safely renames across entire codebase
- [ ] `refactor:simplify` reduces complexity while preserving behavior
- [ ] All P0 commands pass automated verification
- [ ] Existing tests still pass after refactoring

## Phase 3: P1 Sub-commands (Advanced Refactoring)

### 3.1 Implement `refactor:patterns` (Opus)

**Tasks:**
- [ ] 3.1.1 Create design pattern detection system
- [ ] 3.1.2 Implement pattern application (Strategy, Factory, Observer, etc.)
- [ ] 3.1.3 Build anti-pattern detection and remediation
- [ ] 3.1.4 Add pattern validation (ensures correct implementation)
- [ ] 3.1.5 Create pattern documentation generator

### 3.2 Implement `refactor:modernize`

**Tasks:**
- [ ] 3.2.1 Build syntax version detection
- [ ] 3.2.2 Implement modern syntax transformations (arrow functions, destructuring, etc.)
- [ ] 3.2.3 Create API migration (deprecated → modern alternatives)
- [ ] 3.2.4 Add framework-specific modernization (React class → hooks, etc.)
- [ ] 3.2.5 Implement compatibility checking

### 3.3 Implement `refactor:organize`

**Tasks:**
- [ ] 3.3.1 Create file/folder structure analysis
- [ ] 3.3.2 Implement intelligent module organization (feature-based, layer-based)
- [ ] 3.3.3 Build import path optimization
- [ ] 3.3.4 Add circular dependency detection and resolution
- [ ] 3.3.5 Create organization strategy recommendations

### 3.4 Implement `refactor:types`

**Tasks:**
- [ ] 3.4.1 Build type inference system
- [ ] 3.4.2 Implement type annotation addition (TypeScript, JSDoc, Python)
- [ ] 3.4.3 Create type safety improvement (any → specific types)
- [ ] 3.4.4 Add generic type optimization
- [ ] 3.4.5 Implement type validation and error detection

### 3.5 Implement `refactor:security` (Opus)

**Tasks:**
- [ ] 3.5.1 Create security vulnerability detection
- [ ] 3.5.2 Implement hardening transformations (input validation, sanitization)
- [ ] 3.5.3 Build secure pattern replacement (eval → safer alternatives)
- [ ] 3.5.4 Add secrets detection and remediation
- [ ] 3.5.5 Create security report generation

**VERIFY Phase 3:**
- [ ] `refactor:patterns` correctly applies design patterns (Opus)
- [ ] `refactor:modernize` updates code to modern syntax
- [ ] `refactor:organize` improves project structure
- [ ] `refactor:types` adds/improves type safety
- [ ] `refactor:security` identifies and fixes vulnerabilities (Opus)
- [ ] All P1 commands maintain code functionality

## Phase 4: P2 Sub-commands (Specialized Refactoring)

### 4.1 Implement `refactor:performance`

**Tasks:**
- [ ] 4.1.1 Create performance bottleneck detection
- [ ] 4.1.2 Implement optimization strategies (memoization, lazy loading, etc.)
- [ ] 4.1.3 Build algorithm efficiency improvements
- [ ] 4.1.4 Add bundle size optimization
- [ ] 4.1.5 Create performance benchmark comparison

### 4.2 Implement `refactor:test`

**Tasks:**
- [ ] 4.2.1 Build test structure analysis
- [ ] 4.2.2 Implement test organization (AAA pattern, descriptive names)
- [ ] 4.2.3 Create test duplication reduction
- [ ] 4.2.4 Add test coverage gap identification
- [ ] 4.2.5 Implement test refactoring (better assertions, setup/teardown)

**VERIFY Phase 4:**
- [ ] `refactor:performance` successfully optimizes code
- [ ] Performance improvements measurable via benchmarks
- [ ] `refactor:test` improves test quality and structure
- [ ] All P2 commands preserve existing functionality

## Phase 5: Artifact Generation

### 5.1 Implement refactoring-plan.md generation

**Tasks:**
- [ ] 5.1.1 Create strategy documentation (approach, reasoning)
- [ ] 5.1.2 Add metrics section (complexity before/after, lines changed)
- [ ] 5.1.3 Implement impact analysis summary
- [ ] 5.1.4 Add timeline and effort estimation
- [ ] 5.1.5 Create risk mitigation strategies

### 5.2 Implement impact-analysis.json generation

**Tasks:**
- [ ] 5.2.1 Create structured scope analysis (files, functions, dependencies)
- [ ] 5.2.2 Add risk assessment scores (low/medium/high with reasoning)
- [ ] 5.2.3 Implement metrics comparison (before/after)
- [ ] 5.2.4 Add affected test suites identification
- [ ] 5.2.5 Create breaking change detection

### 5.3 Implement refactored-code.md generation

**Tasks:**
- [ ] 5.3.1 Create comprehensive change documentation
- [ ] 5.3.2 Add before/after code comparisons
- [ ] 5.3.3 Implement change rationale explanations
- [ ] 5.3.4 Add migration guide for affected code
- [ ] 5.3.5 Create code review checklist

### 5.4 Implement refactoring-log.md generation

**Tasks:**
- [ ] 5.4.1 Create timestamped execution log
- [ ] 5.4.2 Add step-by-step transformation record
- [ ] 5.4.3 Implement error/warning tracking
- [ ] 5.4.4 Add validation results (tests, linting, type checking)
- [ ] 5.4.5 Create rollback instructions if needed

**VERIFY Phase 5:**
- [ ] refactoring-plan.md contains complete strategy and metrics
- [ ] impact-analysis.json has accurate scope and risk data
- [ ] refactored-code.md documents all changes clearly
- [ ] refactoring-log.md provides complete execution history
- [ ] All artifacts saved to correct output directory

## Phase 6: Integration & Testing

### 6.1 Command integration

**Tasks:**
- [ ] 6.1.1 Register `/refactor` command with all sub-commands
- [ ] 6.1.2 Implement help documentation for each sub-command
- [ ] 6.1.3 Add command validation and error handling
- [ ] 6.1.4 Create interactive mode for refactoring confirmation
- [ ] 6.1.5 Implement dry-run mode for safe previewing

### 6.2 End-to-end testing

**Tasks:**
- [ ] 6.2.1 Create test suite for each sub-command
- [ ] 6.2.2 Test safety mechanisms (rollback, validation)
- [ ] 6.2.3 Verify artifact generation for all commands
- [ ] 6.2.4 Test cross-language support (JavaScript, TypeScript, Python, etc.)
- [ ] 6.2.5 Validate integration with existing test suites

### 6.3 Documentation

**Tasks:**
- [ ] 6.3.1 Create comprehensive command documentation
- [ ] 6.3.2 Add usage examples for each sub-command
- [ ] 6.3.3 Document safety protocols and best practices
- [ ] 6.3.4 Create troubleshooting guide
- [ ] 6.3.5 Add refactoring patterns cookbook

### 6.4 Performance optimization

**Tasks:**
- [ ] 6.4.1 Optimize analysis for large codebases
- [ ] 6.4.2 Implement caching for repeated operations
- [ ] 6.4.3 Add progress indicators for long-running refactors
- [ ] 6.4.4 Optimize artifact generation
- [ ] 6.4.5 Test scalability with large projects

**VERIFY Phase 6:**
- [ ] All sub-commands accessible via `/refactor`
- [ ] Help documentation complete and accurate
- [ ] End-to-end tests passing for all scenarios
- [ ] Safety mechanisms prevent data loss
- [ ] Documentation covers all features and edge cases
- [ ] Performance acceptable for large codebases

## Success Criteria

### Functionality
- [ ] All P0 sub-commands (extract, rename, simplify) fully functional
- [ ] All P1 sub-commands (patterns, modernize, organize, types, security) implemented
- [ ] All P2 sub-commands (performance, test) operational
- [ ] All 4 artifact types generated correctly

### Safety & Reliability
- [ ] Safety protocols prevent destructive operations without confirmation
- [ ] Rollback mechanism successfully restores previous state
- [ ] Impact analysis accurately predicts scope of changes
- [ ] All refactorings preserve code functionality (tests pass)

### Quality
- [ ] Code follows project standards and conventions
- [ ] Comprehensive test coverage (>80%) for refactor command
- [ ] Documentation complete with examples
- [ ] Error messages clear and actionable

### Performance
- [ ] Refactoring operations complete in reasonable time (<5min for typical projects)
- [ ] Impact analysis efficient for large codebases (>10k files)
- [ ] Artifact generation fast (<10s)

### Integration
- [ ] Seamless integration with existing workflow commands
- [ ] Works with multiple languages/frameworks
- [ ] Compatible with popular development tools (git, npm, pytest, etc.)
- [ ] Artifacts integrate with project documentation structure

### User Experience
- [ ] Interactive confirmation for destructive operations
- [ ] Clear progress indicators for long operations
- [ ] Helpful error messages with recovery suggestions
- [ ] Dry-run mode allows safe exploration
- [ ] Preview mode shows changes before applying

---

## Command Boundaries

### Scope Definition
The `/refactor` command focuses on **code-level structural changes** within existing modules. It modifies implementation details while preserving behavior and interfaces.

### Primary Focus
- **Function/class level**: Extract methods, rename symbols, simplify complexity
- **Implementation restructuring**: Early returns, guard clauses, deduplication
- **Code modernization**: Modern syntax, deprecated API migration
- **Type improvements**: Add annotations, improve type safety

### Scope Hierarchy

| Command | Scope Level | Focus | Artifacts |
|---------|-------------|-------|-----------|
| `/refactor` | Function/Class | Implementation structure | refactoring-plan.md, impact-analysis.json |
| `/design` | Component/Module | Interfaces and contracts | design-spec.md, interfaces.md |
| `/architect` | System/Service | Architecture decisions | architecture.md, components.json |

### Boundary Rules
1. `/refactor` changes **how code works**, `/design` defines **what code does**
2. `/refactor` preserves interfaces, `/design` defines interfaces
3. `/refactor` produces code changes, `/design` produces specifications
4. `/architect` sets constraints that `/design` must follow, which `/refactor` implements

### When to Use /refactor vs /design vs /architect

| Scenario | Use This Command | Rationale |
|----------|------------------|-----------|
| "Extract this method" | `/refactor:extract` | Code-level change |
| "Rename this class" | `/refactor:rename` | Symbol renaming |
| "Reduce complexity" | `/refactor:simplify` | Implementation optimization |
| "Design component interface" | `/design:component` | Interface specification |
| "Define API contracts" | `/design:api` | Contract definition |
| "Plan system architecture" | `/architect:system` | High-level design |
| "Document architecture decisions" | `/architect:adr` | Decision records |
| "Modernize syntax" | `/refactor:modernize` | Implementation update |
| "Design data model" | `/design:data` | Schema specification |
| "Define deployment topology" | `/architect:deployment` | Infrastructure design |

### Handoff Points

**Architect → Design:**
- architecture.md provides component boundaries for design-spec.md
- components.json defines what /design needs to detail

**Design → Refactor:**
- design-spec.md guides pattern application in refactor:patterns
- interfaces.md informs refactor:types for type improvements

**Refactor → Validate:**
- refactored code triggers /validate:types and /validate:build

---

## Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Refactoring breaks existing functionality | High | Medium | Run full test suite, require all tests pass before commit |
| Cross-file rename misses references | High | Medium | Use static analysis, validate all imports/exports |
| Pattern application introduces bugs | Medium | Medium | Use Opus model for complex patterns, require review |
| Rollback fails mid-refactoring | High | Low | Create checkpoints, validate backup before each step |
| Security refactoring introduces vulnerabilities | High | Low | Use Opus for security, mandate security review |
| Performance impact on large codebases | Medium | Medium | Implement caching, optimize analysis algorithms |
| Incorrect complexity reduction | Medium | Medium | Verify logic equivalence, add unit tests for edge cases |
