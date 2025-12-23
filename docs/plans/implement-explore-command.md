# Implementation Plan: /explore Command

## Overview
- **Goal:** Implement the /explore command with 6 sub-commands for automated codebase exploration and mapping
- **Priority:** P0 (CRITICAL - Discovery & Ideation phase)
- **Created:** 2025-12-22
- **Output:** `docs/plan-outputs/implement-explore-command/`
- **Model:** Haiku (fast exploration), Sonnet (deep analysis)
- **Category:** Discovery & Ideation

> The /explore command is a specialized codebase exploration tool that helps developers understand unfamiliar code through automated analysis, progressive depth exploration (quick/standard/deep), and structured artifact generation. It wraps the existing Explore agent while adding specialized sub-commands for architecture, patterns, dependencies, and data flow analysis.

---

## Phase 1: Core Command Setup

**Objective:** Establish base /explore command with YAML configuration and core prompt structure

- [ ] 1.1 Create `/explore` command file at `.claude/commands/explore.md`
- [ ] 1.2 Add YAML frontmatter with configuration:
  - name: explore
  - description: Explore and understand codebases through automated analysis
  - category: discovery
  - model: haiku
  - allowed-tools: Read, Grep, Glob, Bash
  - permission_mode: default
- [ ] 1.3 Write base command prompt with sections:
  - Your Task (target scope, depth, focus areas)
  - Instructions (4-phase workflow)
  - Output format specifications
- [ ] 1.4 Define default parameters:
  - target_path: current directory or user-specified
  - depth: standard (2 minutes)
  - focus_areas: optional user hints
- [ ] 1.5 Create output directory structure: `docs/artifacts/discovery/exploration/`

**VERIFY 1:** Base /explore command runs successfully with standard depth, produces structured output

---

## Phase 2: Exploration Engine Implementation

**Objective:** Implement multi-level exploration logic with time-bounded analysis

- [ ] 2.1 Implement Initial Assessment phase (5 seconds):
  - File counting by type using Glob
  - Language detection from extensions
  - Configuration file discovery
  - Framework indicator identification
- [ ] 2.2 Implement Structure Analysis phase:
  - Directory tree mapping
  - Entry point identification
  - Organizational pattern detection
- [ ] 2.3 Implement depth-specific exploration logic:
  - **Quick depth** (30s max): 5-10 key files, headers/exports only
  - **Standard depth** (2min max): 15-25 files, interfaces, major flows
  - **Deep depth** (5min max): 30-50+ files, execution paths, design decisions
- [ ] 2.4 Add time limiting and progress tracking:
  - Graceful timeout handling
  - Progress indicators for long operations
  - Depth auto-adjustment if timeout imminent
- [ ] 2.5 Implement intelligent file selection:
  - Prioritize entry points, config files
  - Sample representative files per directory
  - Skip generated code, build artifacts

**VERIFY 2:** All three depth levels complete within time limits and produce proportional output quality

---

## Phase 3: Sub-Command Implementation

**Objective:** Create 6 specialized sub-commands with unique analysis focuses

### 3.1 Quick & Deep Modifiers
- [ ] 3.1.1 Create `/explore:quick` command file
  - YAML: depth: shallow, model: haiku
  - Quick summary only, 30-second limit
  - Output: `quick-summary.md`
- [ ] 3.1.2 Create `/explore:deep` command file
  - YAML: depth: deep, model: sonnet (upgrade for complexity)
  - Comprehensive analysis, 5-minute limit
  - Output: `comprehensive-report.md`, `full-map.json`

### 3.2 Architecture Sub-Command
- [ ] 3.2.1 Create `/explore:architecture` command file
  - YAML: depth: deep, model: haiku
  - argument-hint: [target-path]
- [ ] 3.2.2 Implement specialized analysis:
  - Component identification and classification
  - Dependency graph construction
  - Layer/tier detection
  - Communication pattern analysis
- [ ] 3.2.3 Generate specialized artifacts:
  - `architecture-map.json` (structured graph)
  - `component-graph.md` (Mermaid diagrams)

### 3.3 Patterns Sub-Command
- [ ] 3.3.1 Create `/explore:patterns` command file
  - YAML: depth: standard, model: haiku
- [ ] 3.3.2 Implement pattern detection:
  - Naming conventions (files, components, functions)
  - Design pattern usage (Factory, Observer, etc.)
  - Anti-patterns and code smells
  - Framework-specific conventions
- [ ] 3.3.3 Generate artifacts:
  - `patterns-report.md` (detailed findings)
  - `conventions.json` (machine-readable rules)

### 3.4 Dependencies Sub-Command
- [ ] 3.4.1 Create `/explore:dependencies` command file
  - YAML: depth: deep, model: haiku
- [ ] 3.4.2 Implement dependency analysis:
  - External package dependencies (package.json, requirements.txt)
  - Internal module dependencies (import/require analysis)
  - Circular dependency detection
  - Impact analysis (what breaks if X changes)
- [ ] 3.4.3 Generate artifacts:
  - `dependency-graph.json` (nodes + edges)
  - `impact-analysis.md` (change impact reports)

### 3.5 Flow Sub-Command
- [ ] 3.5.1 Create `/explore:flow` command file
  - YAML: depth: deep, model: haiku
- [ ] 3.5.2 Implement flow tracing:
  - Request/response flows
  - Event propagation paths
  - State transitions
  - Data transformation pipelines
- [ ] 3.5.3 Generate artifacts:
  - `flow-diagram.md` (Mermaid sequence diagrams)
  - `execution-paths.json` (structured paths)

**VERIFY 3:** All sub-commands produce valid, specialized artifacts unique to their focus area

---

## Phase 4: Artifact Generation & Schemas

**Objective:** Implement structured artifact generation with validated schemas

### 4.1 Primary Artifacts
- [ ] 4.1.1 Implement `exploration-report.md` generation:
  - Metadata: target, date, depth, confidence, coverage
  - Summary (2-3 paragraphs)
  - Architecture Overview (stack, structure, entry points)
  - Key Components (location, purpose, dependencies, complexity)
  - Code Patterns & Conventions
  - Recommendations (for new devs, for refactoring)
  - Confidence & Completeness scores
- [ ] 4.1.2 Implement `codebase-map.json` generation:
  - metadata: target, generated_at, depth, version
  - overview: total_files, languages, framework
  - structure: entry_points, directories[]
  - components: [{id, name, path, type, complexity}]
  - patterns: {naming, state_management}

### 4.2 Specialized Artifacts
- [ ] 4.2.1 Implement `architecture-map.json` schema:
  - architecture_style enum
  - layers[], components[], relationships[]
  - component types: service, module, library, database, external-api
  - relationship types: depends-on, calls, publishes, subscribes, extends
- [ ] 4.2.2 Implement `dependency-graph.json` schema:
  - nodes: [{id, type, version}]
  - edges: [{from, to, type}]
  - circular_dependencies[]
  - impact_analysis{}
- [ ] 4.2.3 Implement `conventions.json` schema:
  - naming: {files, components, functions}
  - error_handling: patterns
  - testing: conventions
  - documentation: standards

### 4.3 Schema Validation
- [ ] 4.3.1 Define JSON schemas for all .json artifacts
- [ ] 4.3.2 Add schema validation before artifact write
- [ ] 4.3.3 Add schema $ref URLs in artifact metadata
- [ ] 4.3.4 Create schema documentation in `docs/schemas/`

**VERIFY 4:** All artifacts validate against schemas, metadata is complete and accurate

---

## Phase 5: Agent Integration

**Objective:** Integrate with existing Explore agent and ensure proper delegation

- [ ] 5.1 Review existing Explore agent implementation:
  - Understand current Haiku agent capabilities
  - Document read-only tool restrictions
  - Identify agent invocation patterns
- [ ] 5.2 Implement agent delegation flow:
  - Main thread: Parse arguments, determine scope
  - Explore agent: Scan files, gather data
  - Main thread: Structure findings, generate artifacts
- [ ] 5.3 Add agent context passing:
  - Pass target_path, depth, focus_areas to agent
  - Receive raw exploration data
  - Transform into structured artifacts
- [ ] 5.4 Implement error handling:
  - Agent timeout handling
  - Partial result handling if agent times out
  - Graceful degradation (quick → standard → deep)
- [ ] 5.5 Add progress indicators:
  - "Exploring src/lib..."
  - "Analyzed: X files, Y lines"
  - "Generating artifacts..."

**VERIFY 5:** Agent integration is seamless, delegation works correctly, error cases handled gracefully

---

## Phase 6: Command Integration & Workflows

**Objective:** Ensure /explore integrates with other Discovery & Ideation commands

- [ ] 6.1 Define integration points:
  - `/clarify` → `/explore` (clarify then explore relevant code)
  - `/explore` → `/analyze` (explore then deep-dive specific areas)
  - `/explore` → `/refactor` (exploration-based refactoring planning)
  - `/explore` → `/document` (generate docs from exploration)
- [ ] 6.2 Add artifact cross-referencing:
  - Include related_artifacts in metadata
  - Reference upstream clarification documents
  - Link to downstream analysis plans
- [ ] 6.3 Implement artifact consumption:
  - Make artifacts machine-readable for downstream commands
  - Document artifact usage patterns
  - Create artifact query helpers
- [ ] 6.4 Test common workflows:
  - Onboarding workflow: /explore → /document
  - Refactoring workflow: /explore → /analyze → /refactor
  - Architecture review: /explore:architecture → /analyze

**VERIFY 6:** Command integration works smoothly, artifacts flow between commands correctly

---

## Phase 7: Testing & Validation

**Objective:** Comprehensive testing across codebases, languages, and sizes

### 7.1 Unit Testing
- [ ] 7.1.1 Test depth level logic (quick vs standard vs deep)
- [ ] 7.1.2 Test time limiting and timeout handling
- [ ] 7.1.3 Test file selection algorithms
- [ ] 7.1.4 Test artifact generation functions
- [ ] 7.1.5 Test schema validation

### 7.2 Integration Testing
- [ ] 7.2.1 Test on small codebase (<100 files)
- [ ] 7.2.2 Test on medium codebase (100-500 files)
- [ ] 7.2.3 Test on large codebase (500+ files)

### 7.3 Cross-Language Testing
- [ ] 7.3.1 Test on TypeScript/JavaScript projects
- [ ] 7.3.2 Test on Python projects
- [ ] 7.3.3 Test on Go projects
- [ ] 7.3.4 Test on Java projects
- [ ] 7.3.5 Test on multi-language projects

### 7.4 Sub-Command Testing
- [ ] 7.4.1 Test each sub-command independently
- [ ] 7.4.2 Verify specialized artifacts are unique and valuable
- [ ] 7.4.3 Compare sub-command output to base explore output
- [ ] 7.4.4 Test sub-command argument handling

**VERIFY 7:** All test cases pass, command works reliably across diverse codebases

---

## Phase 8: Documentation & Polish

**Objective:** Create comprehensive documentation and refine user experience

- [ ] 8.1 Create command documentation:
  - Usage examples for each variant
  - Depth selection guidance
  - Sub-command decision tree
  - Common workflow patterns
- [ ] 8.2 Document artifact schemas:
  - JSON schema definitions
  - Field descriptions and constraints
  - Version compatibility notes
  - Example artifacts
- [ ] 8.3 Create user guides:
  - "When to use /explore vs /analyze"
  - "Choosing the right depth level"
  - "Interpreting exploration artifacts"
  - "Building on exploration results"
- [ ] 8.4 Add inline help:
  - Argument hints in YAML frontmatter
  - Error messages with suggestions
  - Progress indicators with context
- [ ] 8.5 Create example workflows:
  - Onboarding to unfamiliar codebase
  - Pre-refactoring exploration
  - Architecture documentation generation
  - Dependency audit workflow
- [ ] 8.6 Polish output formatting:
  - Clear section headers
  - Consistent markdown formatting
  - Helpful artifact summaries
  - Clickable file paths (where supported)

**VERIFY 8:** Documentation is complete, clear, and helpful; user experience is polished

---

## Success Criteria

### Functional Requirements
- [ ] Base /explore command generates valid exploration-report.md and codebase-map.json
- [ ] All 6 sub-commands (architecture, patterns, dependencies, flow, quick, deep) work correctly
- [ ] Three depth levels (quick, standard, deep) respect time limits and produce proportional detail
- [ ] All artifacts validate against defined JSON schemas
- [ ] Command integrates properly with existing Explore agent

### Quality Requirements
- [ ] Confidence score > 70% for standard depth explorations
- [ ] Coverage > 50% for standard depth, > 80% for deep depth
- [ ] Quick depth completes in < 30 seconds
- [ ] Standard depth completes in < 2 minutes
- [ ] Deep depth completes in < 5 minutes

### Usability Requirements
- [ ] Clear progress indicators during long operations
- [ ] Helpful error messages with recovery suggestions
- [ ] Artifacts are human-readable and actionable
- [ ] Documentation explains when to use each variant

### Integration Requirements
- [ ] Artifacts can be consumed by downstream commands (/analyze, /refactor, /document)
- [ ] Metadata includes related_artifacts cross-references
- [ ] Works seamlessly in common workflows (onboarding, refactoring, documentation)

### Testing Requirements
- [ ] All unit tests pass
- [ ] Tested on small, medium, and large codebases
- [ ] Tested on TypeScript, Python, Go, and Java projects
- [ ] All sub-commands tested independently
