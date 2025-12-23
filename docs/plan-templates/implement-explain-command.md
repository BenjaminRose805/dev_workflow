# Implementation Plan: /explain Command

## Overview
- **Goal:** Implement the /explain command with 7 sub-commands for intelligent code and concept explanation
- **Priority:** P2 (Documentation & Knowledge Transfer)
- **Created:** {{date}}
- **Output:** `docs/plan-outputs/implement-explain-command/`
- **Model:** Claude Sonnet 4.5 (code analysis, knowledge synthesis)
- **Category:** Implementation & Documentation

> The /explain command provides intelligent code and concept explanation capabilities for onboarding, documentation, code review, and knowledge transfer. Unlike `plan:explain` which explains plan tasks, /explain focuses on explaining existing code, architecture patterns, design decisions, and technical concepts within a codebase.

---

## Phase 1: Core Command Setup

**Objective:** Establish base /explain command with YAML configuration and core prompt structure

- [ ] 1.1 Create `/explain` command file at `.claude/commands/explain.md`
- [ ] 1.2 Add YAML frontmatter with configuration:
  - name: explain
  - description: Intelligent code and concept explanation for onboarding, documentation, and knowledge transfer. Use when understanding existing code, not planning tasks.
  - category: documentation
  - model: claude-sonnet-4-5
  - allowed-tools: Read, Grep, Glob, Write, Bash, AskUserQuestion
  - argument-hint: [file-path | concept | pattern]
- [ ] 1.3 Write base command prompt with sections:
  - Your Task (target code, concept, or pattern to explain)
  - Instructions (5-phase explanation workflow)
  - Explanation principles (Why → What → How → Context → Gotchas)
  - Output format specifications
- [ ] 1.4 Define default parameters:
  - target: file path, symbol name, or concept
  - depth: quick | standard | deep
  - audience: junior | senior | external
  - focus: architecture | implementation | usage | all
- [ ] 1.5 Create output directory structure: `docs/explanations/`

**VERIFY 1:** Base /explain command runs successfully, analyzes code, and produces structured explanations

---

## Phase 2: Explanation Workflow Implementation

**Objective:** Implement systematic explanation workflow with code analysis

- [ ] 2.1 Implement Explanation Parameters phase:
  - Use AskUserQuestion to gather target, depth, audience
  - Auto-detect target type (file, function, class, module)
  - Identify explanation focus areas
- [ ] 2.2 Implement Context Discovery phase:
  - Find related files (imports, exports, tests)
  - Search for documentation (ADRs, READMEs, comments)
  - Identify design patterns in use
  - Trace dependencies and consumers
- [ ] 2.3 Implement Code Analysis phase:
  - Parse function signatures and types
  - Identify key algorithms and data structures
  - Note complexity hotspots
  - Find error handling patterns
- [ ] 2.4 Implement Knowledge Synthesis phase:
  - Structure explanation following Why → What → How
  - Generate diagrams where helpful (Mermaid)
  - Extract usage examples from tests
  - Identify common gotchas and best practices
- [ ] 2.5 Implement Audience Adaptation:
  - Junior: More context, simpler language, more examples
  - Senior: Focus on design decisions, trade-offs, nuances
  - External: API-focused, usage-oriented, less internals

**VERIFY 2:** Explanation workflow produces comprehensive, audience-appropriate explanations

---

## Phase 3: Sub-Command Implementation (P0)

**Objective:** Create 2 P0 sub-commands for core explanation needs

### 3.1 Code Explanation Sub-Command
- [ ] 3.1.1 Create `/explain:code` command file
  - YAML: model: claude-sonnet-4-5, argument-hint: <file-path | symbol>
- [ ] 3.1.2 Implement code explanation logic:
  - Parse target file/function/class
  - Identify purpose and responsibilities
  - Document key interfaces and types
  - Explain implementation patterns used
  - Extract usage examples from tests/consumers
- [ ] 3.1.3 Generate specialized artifacts:
  - `docs/explanations/code/<component>-<date>.md`
- [ ] 3.1.4 Include explanation sections:
  - Quick Summary (2-3 sentences)
  - Purpose & Motivation
  - Core Concepts & Responsibilities
  - Implementation Details
  - Usage Examples
  - Integration & Dependencies
  - Gotchas & Best Practices
  - Related Documentation

### 3.2 Architecture Explanation Sub-Command
- [ ] 3.2.1 Create `/explain:architecture` command file
  - YAML: model: claude-sonnet-4-5, argument-hint: <system | layer | component>
- [ ] 3.2.2 Implement architecture explanation:
  - Map system components and boundaries
  - Identify architectural patterns (MVC, hexagonal, microservices)
  - Document data flow and control flow
  - Explain technology choices and rationale
  - Note scaling and performance considerations
- [ ] 3.2.3 Generate specialized artifacts:
  - `docs/explanations/architecture/<topic>-<date>.md`
  - Include Mermaid diagrams (component, sequence)
- [ ] 3.2.4 Include architecture sections:
  - System Overview
  - Key Components
  - Data Flow
  - Integration Points
  - Design Decisions
  - Trade-offs & Constraints

**VERIFY 3:** P0 sub-commands produce valid, educational explanations

---

## Phase 4: Sub-Command Implementation (P1)

**Objective:** Create 3 P1 sub-commands for extended explanation needs

### 4.1 Pattern Explanation Sub-Command
- [ ] 4.1.1 Create `/explain:pattern` command file
  - YAML: model: claude-sonnet-4-5, argument-hint: <pattern-name | --discover>
- [ ] 4.1.2 Implement pattern explanation:
  - Identify patterns in codebase
  - Explain pattern intent and structure
  - Show concrete examples from code
  - Document when to use / when not to use
  - List common variations and alternatives
- [ ] 4.1.3 Generate specialized artifacts:
  - `docs/explanations/patterns/<pattern>-<date>.md`
- [ ] 4.1.4 Include pattern sections:
  - Pattern Overview
  - Problem It Solves
  - Structure (with diagram)
  - Codebase Examples
  - When to Use
  - When Not to Use
  - Related Patterns

### 4.2 Decision Explanation Sub-Command
- [ ] 4.2.1 Create `/explain:decision` command file
  - YAML: model: claude-sonnet-4-5, argument-hint: <topic | "why X">
- [ ] 4.2.2 Implement decision explanation:
  - Search for ADRs and design docs
  - Analyze Git history for context
  - Infer decisions from code structure
  - Document options considered
  - Explain rationale and trade-offs
- [ ] 4.2.3 Generate specialized artifacts:
  - `docs/explanations/decisions/<topic>-<date>.md`
- [ ] 4.2.4 Include decision sections:
  - Context & Problem
  - Decision Made
  - Options Considered
  - Rationale
  - Consequences (positive & negative)
  - Related Decisions/ADRs

### 4.3 Flow Explanation Sub-Command
- [ ] 4.3.1 Create `/explain:flow` command file
  - YAML: model: claude-sonnet-4-5, argument-hint: <feature | flow-name>
- [ ] 4.3.2 Implement flow explanation:
  - Trace execution path through code
  - Map data transformations
  - Identify entry points and exit points
  - Document error handling paths
  - Note performance characteristics
- [ ] 4.3.3 Generate specialized artifacts:
  - `docs/explanations/flows/<flow>-<date>.md`
  - Include sequence diagrams (Mermaid)
- [ ] 4.3.4 Include flow sections:
  - Quick Summary
  - High-Level Diagram
  - Step-by-Step Walkthrough
  - Error Handling
  - Performance Characteristics
  - Edge Cases

**VERIFY 4:** P1 sub-commands produce valid, detailed explanations

---

## Phase 5: Sub-Command Implementation (P2)

**Objective:** Create 2 P2 sub-commands for advanced explanation needs

### 5.1 API Explanation Sub-Command
- [ ] 5.1.1 Create `/explain:api` command file
  - YAML: model: claude-sonnet-4-5, argument-hint: <endpoint | module>
- [ ] 5.1.2 Implement API explanation:
  - Document API contracts and types
  - Explain authentication/authorization
  - Show request/response examples
  - Note rate limiting and quotas
  - Document error responses
- [ ] 5.1.3 Generate specialized artifacts:
  - `docs/explanations/api/<api>-<date>.md`
- [ ] 5.1.4 Include API sections:
  - API Overview
  - Authentication
  - Endpoints (with examples)
  - Error Handling
  - Best Practices
  - Common Use Cases

### 5.2 Diff Explanation Sub-Command
- [ ] 5.2.1 Create `/explain:diff` command file
  - YAML: model: claude-sonnet-4-5, argument-hint: <commit | PR | branch>
- [ ] 5.2.2 Implement diff explanation:
  - Parse Git diff or PR changes
  - Summarize changes by category
  - Explain motivation for changes
  - Identify potential impacts
  - Note testing considerations
- [ ] 5.2.3 Generate specialized artifacts:
  - `docs/explanations/diff/<ref>-<date>.md`
  - Inline PR comments (optional)
- [ ] 5.2.4 Include diff sections:
  - Change Summary
  - Files Changed
  - Key Changes Explained
  - Impact Analysis
  - Testing Recommendations
  - Review Considerations

**VERIFY 5:** P2 sub-commands produce valid, contextual explanations

---

## Phase 6: Artifact Schemas & Quality Standards

**Objective:** Implement structured artifact generation with quality validation

### 6.1 Primary Artifacts
- [ ] 6.1.1 Implement code-explanation.md artifact schema:
  - YAML frontmatter:
    - type: code-explanation
    - command: explain:code
    - target: file path or symbol
    - created: ISO-8601
    - tags: component categories
- [ ] 6.1.2 Implement flow-explanation.md artifact schema:
  - YAML frontmatter:
    - type: flow-explanation
    - command: explain:flow
    - feature: feature name
    - created: ISO-8601
- [ ] 6.1.3 Implement decision-explanation.md artifact schema:
  - YAML frontmatter:
    - type: decision-explanation
    - command: explain:decision
    - decision: topic
    - status: active | superseded

### 6.2 Quality Standards
- [ ] 6.2.1 Implement explanation principles:
  - Start with "Why" (motivation/purpose)
  - Explain "What" (responsibilities, boundaries)
  - Detail "How" (implementation, algorithms)
  - Provide context (history, dependencies)
  - Identify gotchas (pitfalls, edge cases)
- [ ] 6.2.2 Implement validation checks:
  - Code examples from actual codebase
  - Diagrams included where helpful
  - Related files and dependencies identified
  - Usage examples provided
  - Appropriate depth for audience
  - Technical accuracy verified

### 6.3 Audience Adaptation
- [ ] 6.3.1 Implement audience-specific content:
  - Junior developers: More explanation, simpler terms
  - Senior developers: Focus on decisions, trade-offs
  - External users: API-focused, usage examples
- [ ] 6.3.2 Adjust technical depth:
  - Quick: High-level overview only
  - Standard: Full explanation with examples
  - Deep: Include edge cases, performance, history

**VERIFY 6:** Artifacts meet quality standards and are audience-appropriate

---

## Phase 7: Workflow Integration

**Objective:** Ensure /explain integrates with other commands and workflows

### 7.1 Upstream Integration
- [ ] 7.1.1 Define artifact consumption:
  - Source code from repository
  - architecture.md from /architect
  - ADRs from /architect:adr
  - PR diffs from Git/GitHub
- [ ] 7.1.2 Implement context discovery:
  - Find related tests and documentation
  - Trace imports and exports
  - Identify consumers and dependencies

### 7.2 Downstream Integration
- [ ] 7.2.1 Define artifact production:
  - code-explanation.md → Onboarding docs
  - pattern-explanation.md → Code review guidance
  - flow-explanation.md → /debug, /test
- [ ] 7.2.2 Add artifact cross-referencing:
  - Link to related explanations
  - Reference source documentation
  - Include next steps for learning

### 7.3 Onboarding Workflow
- [ ] 7.3.1 Define onboarding sequence:
  - /explain:architecture [system] → System overview
  - /explain:pattern [common-patterns] → Pattern knowledge
  - /explain:code [core-components] → Component understanding
  - /explain:flow [critical-flows] → Flow understanding
- [ ] 7.3.2 Generate onboarding documentation:
  - Index of explanations
  - Suggested reading order
  - Knowledge checkpoints

### 7.4 Code Review Integration
- [ ] 7.4.1 Integrate with /explain:diff:
  - Explain PR changes in context
  - Identify related code to review
  - Suggest testing focus areas

**VERIFY 7:** Explanation workflows support onboarding and code review effectively

---

## Phase 8: Testing & Validation

**Objective:** Comprehensive testing of explanation quality and accuracy

### 8.1 Sub-Command Testing
- [ ] 8.1.1 Test /explain:code:
  - Test with functions, classes, modules
  - Test with different languages (TS, Python, Go)
  - Verify code examples are accurate
- [ ] 8.1.2 Test /explain:architecture:
  - Test with different architecture styles
  - Verify diagrams are accurate
  - Check component identification
- [ ] 8.1.3 Test /explain:pattern:
  - Test pattern discovery
  - Verify pattern explanations match code
  - Check example accuracy

### 8.2 Quality Testing
- [ ] 8.2.1 Test explanation principles (Why → What → How)
- [ ] 8.2.2 Test code example accuracy
- [ ] 8.2.3 Test diagram correctness
- [ ] 8.2.4 Test audience adaptation

### 8.3 Audience Testing
- [ ] 8.3.1 Test junior developer explanations
- [ ] 8.3.2 Test senior developer explanations
- [ ] 8.3.3 Test external user explanations

### 8.4 Edge Cases
- [ ] 8.4.1 Test with heavily documented code
- [ ] 8.4.2 Test with undocumented code
- [ ] 8.4.3 Test with complex nested code
- [ ] 8.4.4 Test with legacy code

**VERIFY 8:** All test cases pass, explanation quality is consistently high

---

## Phase 9: Documentation & Polish

**Objective:** Create comprehensive documentation and refine user experience

- [ ] 9.1 Create command documentation:
  - Usage examples for each sub-command
  - Audience selection guidance
  - Depth level explanation
  - Common explanation workflows
- [ ] 9.2 Document explanation methodology:
  - How context is gathered
  - How explanations are structured
  - How audience adaptation works
  - Quality validation process
- [ ] 9.3 Create user guides:
  - "Explaining code for onboarding"
  - "Understanding architecture decisions"
  - "Documenting patterns in your codebase"
  - "Explaining PR changes"
- [ ] 9.4 Add inline help:
  - Argument hints in YAML frontmatter
  - Error messages with suggestions
  - Progress indicators during analysis
- [ ] 9.5 Polish output formatting:
  - Clear section headers
  - Consistent diagram style
  - Helpful code annotations
  - Scannable structure
- [ ] 9.6 Create example outputs:
  - Example code explanation
  - Example architecture explanation
  - Example flow explanation

**VERIFY 9:** Documentation is complete, clear, and helpful; output quality is polished

---

## Success Criteria

### Functional Requirements
- [ ] Base /explain command analyzes code and generates code-explanation.md
- [ ] All 7 sub-commands (code, architecture, pattern, decision, flow, api, diff) work correctly
- [ ] Explanations follow Why → What → How → Context → Gotchas structure
- [ ] Code examples are from actual codebase, not hypothetical
- [ ] Diagrams included where helpful (Mermaid)

### Quality Requirements
- [ ] Explanations start with purpose/motivation
- [ ] Technical accuracy verified
- [ ] Appropriate depth for audience
- [ ] Related documentation linked
- [ ] Gotchas and best practices documented

### Usability Requirements
- [ ] Clear progress indicators during analysis
- [ ] Helpful error messages for edge cases
- [ ] Audience selection prompts
- [ ] Depth selection guidance

### Integration Requirements
- [ ] Consumes ADRs, architecture docs, source code
- [ ] Produces artifacts usable for onboarding
- [ ] Metadata includes related documentation links
- [ ] Works seamlessly in onboarding workflows

### Testing Requirements
- [ ] All sub-commands tested with various code types
- [ ] Audience adaptation tested
- [ ] Edge cases handled gracefully
- [ ] Explanation quality validated across different codebases

### Differentiation from Related Commands
- [ ] /explain (code understanding) distinct from plan:explain (task understanding)
- [ ] /explain (educational) distinct from /document (reference)
- [ ] /explain (deep dive) distinct from /explore (broad discovery)
