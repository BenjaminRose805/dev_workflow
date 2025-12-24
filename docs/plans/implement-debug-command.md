# Implementation Plan: /debug Command

## Overview
- **Goal:** Implement the /debug command with 8 sub-commands for systematic, hypothesis-driven debugging across error analysis, performance, behavior, testing, memory, network, concurrency, and data issues
- **Priority:** P0 (CRITICAL - Analysis & Quality phase)
- **Created:** 2025-12-22
- **Output:** `docs/plan-outputs/debug-command/`
- **Model:** Sonnet 4.5 (6 sub-commands), Opus 4.5 (memory, concurrency - complex reasoning)
- **Category:** Analysis & Quality

> The /debug command provides systematic debugging assistance with a hypothesis-driven approach. It generates ranked debugging hypotheses, conducts systematic investigation, identifies root causes, and proposes fixes with risk assessment. Supports error/exception analysis, performance debugging, unexpected behavior, test failures, memory leaks, network issues, race conditions, and data corruption.

---

## Dependencies

### Upstream
- `/explore` - uses exploration data to understand affected code areas
- `/analyze` - leverages analysis results for pattern detection and metrics

### Downstream
- `/fix` - consumes fix-suggestion.md artifacts for automated fixing
- `/test` - debugging sessions may generate test recommendations
- `/validate` - verification of fixes triggers validation

### External Tools
- Git - for change history analysis (recent commits affecting area)
- Test runners (Jest/Vitest/pytest) - for running tests during debugging
- Profilers (optional) - for performance debugging flamegraphs

---

## Phase 1: Core Command Infrastructure

**Objective:** Establish base /debug command with YAML configuration, hypothesis framework, and investigation logging system

**Tasks:**
- [ ] 1.1 Create base command YAML at `.claude/commands/debug.md`
  - Set model to `sonnet` (default for most sub-commands)
  - Configure allowed-tools: `Read`, `Grep`, `Glob`, `Bash`
  - Define category as "Analysis & Quality"
  - Set permission_mode to interactive (requires user confirmation for fixes)
  - Set up sub-command structure for 8 sub-commands
- [ ] 1.2 Create base system prompt template with debugging methodology:
  - Define role as systematic debugging expert with hypothesis-driven approach
  - Include 6-phase workflow: Gather context → Generate hypotheses → Systematic investigation → Root cause → Propose fixes → Document
  - Add guidelines for hypothesis ranking (by likelihood: High/Medium/Low)
  - Include root cause identification best practices
  - Define risk assessment framework (Low/Medium/High risk)
- [ ] 1.3 Implement debugging session management:
  - Generate unique session-id for each debugging session
  - Create session context holder (problem statement, environment, reproducibility)
  - Initialize investigation timeline tracker
  - Set up hypothesis testing workflow
- [ ] 1.4 Create output directory structure:
  - `docs/plan-outputs/debug-command/` base directory
  - Subdirectories: `artifacts/`, `sessions/`, `findings/`, `verification/`
  - Initialize `status.json` tracking file
- [ ] 1.5 Implement hypothesis generation framework:
  - Create hypothesis ranking algorithm (evidence-based probability)
  - Build hypothesis template with: description, supporting evidence, testing approach, files to examine, expected findings
  - Add hypothesis testing result tracker (✓ Confirmed | ✗ Eliminated | ⊙ Partial)

**VERIFY Phase 1:**
- [ ] Base /debug command generates session ID, accepts problem description, produces initial hypothesis list with rankings

---

## Phase 2: Investigation & Logging Engine

**Objective:** Build systematic investigation tools with chronological logging and evidence tracking

**Tasks:**
- [ ] 2.1 Implement investigation timeline logger:
  - Create timestamped entry system ([HH:MM] format)
  - Build hypothesis testing tracker (hypothesis → actions → findings → result)
  - Add evidence collection system (stack traces, logs, code snippets)
  - Implement progress indicator for multi-hypothesis investigations
- [ ] 2.2 Create context gathering system:
  - Stack trace parser (file paths, line numbers, function names)
  - Error message analyzer (error type, error message, context)
  - Environment detector (OS, runtime version, dependencies)
  - Reproducibility classifier (Always | Intermittent | Specific conditions)
- [ ] 2.3 Build systematic investigation workflow:
  - Hypothesis selection logic (highest probability first)
  - Testing approach executor (read files, run tests, check logs)
  - Evidence evaluator (confirms/eliminates hypothesis)
  - Next-hypothesis selector (if eliminated, move to next)
- [ ] 2.4 Implement file analysis tools:
  - Smart file reader (reads files mentioned in stack traces)
  - Code flow tracer (follows execution paths)
  - Dependency analyzer (identifies related files)
  - Change history analyzer (recent commits affecting area)
- [ ] 2.5 Create investigation termination logic:
  - Root cause confirmation detector
  - Exhausted hypotheses handler (generate new hypotheses if needed)
  - Time limit enforcement (with graceful summary)
  - Partial findings reporter (if investigation incomplete)

**VERIFY Phase 2:**
- [ ] Investigation engine systematically tests hypotheses, logs findings chronologically, and terminates appropriately

---

## Phase 3: P0 Sub-Commands Implementation

**Objective:** Implement critical P0 sub-commands: debug:error, debug:performance, debug:behavior

### 3.1 debug:error - Error & Exception Analysis

**Tasks:**
- [ ] 3.1.1 Create `debug:error` command file at `.claude/commands/debug-error.md`
  - YAML: model: sonnet, interactive: true
  - argument-hint: [error-message-or-stack-trace]
  - outputs: debug-log.md, root-cause.md, fix-suggestion.md
- [ ] 3.1.2 Implement stack trace parser:
  - Extract file paths, line numbers, function names
  - Identify error type and message
  - Detect framework-specific error patterns
  - Parse call stack hierarchy
- [ ] 3.1.3 Build error-specific hypothesis generator:
  - Null/undefined reference hypotheses
  - Type mismatch hypotheses
  - API contract violation hypotheses
  - Exception handling gaps hypotheses
  - Configuration error hypotheses
- [ ] 3.1.4 Implement systematic error investigation:
  - Read files from stack trace (top to bottom)
  - Analyze code at error location
  - Check for common error patterns
  - Trace data flow to error point
  - Verify assumptions in code
- [ ] 3.1.5 Create error-specific fix generator:
  - Null check additions
  - Type guard implementations
  - Error handling improvements
  - API contract fixes
  - Configuration corrections

### 3.2 debug:performance - Performance Debugging

**Tasks:**
- [ ] 3.2.1 Create `debug:performance` command file
  - YAML: model: sonnet, interactive: true
  - argument-hint: [performance-issue-description]
  - outputs: debug-log.md, performance-analysis.md, optimization-plan.md
- [ ] 3.2.2 Implement performance analysis tools:
  - Profiling data parser (flamegraphs, CPU profiles)
  - Algorithmic complexity analyzer (Big O detection)
  - N+1 query detector (database/API patterns)
  - Blocking I/O identifier
  - Memory allocation pattern analyzer
- [ ] 3.2.3 Build performance hypothesis generator:
  - Algorithm inefficiency hypotheses (O(n²) loops, nested iterations)
  - Database query hypotheses (N+1, missing indexes, large result sets)
  - Resource leak hypotheses (unclosed connections, memory retention)
  - Blocking operation hypotheses (synchronous I/O, lock contention)
  - Caching opportunity hypotheses
- [ ] 3.2.4 Create bottleneck identification system:
  - Hot path analyzer (most-called functions)
  - Slowest operation identifier
  - Resource usage profiler
  - Execution time tracer
- [ ] 3.2.5 Implement optimization plan generator:
  - Prioritized optimization list (impact vs effort)
  - Algorithm improvement suggestions
  - Caching strategy recommendations
  - Database optimization suggestions
  - Code examples for each optimization

### 3.3 debug:behavior - Unexpected Behavior

**Tasks:**
- [ ] 3.3.1 Create `debug:behavior` command file
  - YAML: model: sonnet, interactive: true
  - argument-hint: [expected-behavior] [actual-behavior]
  - outputs: debug-log.md, hypothesis.md, behavior-analysis.md, fix-suggestion.md
- [ ] 3.3.2 Implement behavior analysis framework:
  - Expected vs actual behavior comparator
  - Control flow tracer
  - State change tracker
  - Edge case identifier
  - Assumption validator
- [ ] 3.3.3 Build behavior-specific hypothesis generator:
  - Logic error hypotheses (incorrect conditionals, off-by-one)
  - State inconsistency hypotheses (race conditions, stale state)
  - Input validation hypotheses (edge cases not handled)
  - Side effect hypotheses (unexpected mutations)
  - Timing issue hypotheses (async/await problems)
- [ ] 3.3.4 Create behavior tracing system:
  - Input-to-output flow tracer
  - State mutation tracker
  - Conditional branch analyzer
  - Variable value tracker (expected vs actual at each step)
- [ ] 3.3.5 Implement behavior fix generator:
  - Logic corrections
  - State management improvements
  - Input validation additions
  - Edge case handling
  - Timing/async fixes

**VERIFY Phase 3:**
- [ ] All P0 sub-commands (error, performance, behavior) generate appropriate hypotheses, conduct systematic investigation, and produce actionable fixes

---

## Phase 4: P1 Sub-Commands Implementation

**Objective:** Implement P1 sub-commands: debug:test, debug:memory, debug:network, debug:concurrency

### 4.1 debug:test - Test Failure Debugging

**Tasks:**
- [ ] 4.1.1 Create `debug:test` command file
  - YAML: model: sonnet, interactive: true
  - argument-hint: [test-name-or-failure-output]
  - outputs: debug-log.md, test-analysis.md, fix-suggestion.md
- [ ] 4.1.2 Implement test failure classifier:
  - Assertion failure detector
  - Exception during test identifier
  - Timeout/hang detector
  - Flaky/intermittent test identifier
- [ ] 4.1.3 Build test-specific hypothesis generator:
  - Test setup issue hypotheses (missing fixtures, wrong mocks)
  - Assertion logic error hypotheses (incorrect expected value)
  - Test isolation hypotheses (shared state, order dependency)
  - Timing hypotheses (async race conditions in tests)
  - Environment hypotheses (test env differs from production)
- [ ] 4.1.4 Create flakiness analyzer:
  - Shared state detector
  - Non-deterministic operation identifier
  - Timing dependency analyzer
  - External dependency detector
- [ ] 4.1.5 Implement test fix generator:
  - Test isolation improvements
  - Mock/stub corrections
  - Assertion fixes
  - Async handling improvements
  - Flakiness elimination strategies

### 4.2 debug:memory - Memory Debugging

**Tasks:**
- [ ] 4.2.1 Create `debug:memory` command file
  - YAML: model: opus (complex object lifecycle reasoning requires advanced reasoning)
  - argument-hint: [memory-issue-description]
  - outputs: debug-log.md, memory-analysis.md, leak-report.md, fix-suggestion.md
- [ ] 4.2.2 Implement memory leak pattern detectors:
  - Event listener leak detector (not removed on cleanup)
  - Timer/interval leak detector (not cleared)
  - Cache without eviction detector
  - Closure capturing large context detector
  - Unclosed resource detector (files, connections, streams)
- [ ] 4.2.3 Build object lifecycle analyzer:
  - Object creation tracker
  - Reference retention analyzer
  - Cleanup/dispose pattern checker
  - Garbage collection barrier identifier
- [ ] 4.2.4 Create memory usage pattern analyzer:
  - Large object allocation detector
  - Excessive object creation identifier
  - Memory growth trend analyzer
  - Heap snapshot comparator (if available)
- [ ] 4.2.5 Implement memory fix generator:
  - Cleanup/dispose implementations
  - WeakMap/WeakSet suggestions
  - Event listener removal
  - Timer cleanup
  - Resource pooling recommendations

### 4.3 debug:network - Network/API Debugging

**Tasks:**
- [ ] 4.3.1 Create `debug:network` command file
  - YAML: model: sonnet, interactive: true
  - argument-hint: [network-issue-description]
  - outputs: debug-log.md, network-analysis.md, fix-suggestion.md
- [ ] 4.3.2 Implement network issue classifier:
  - Connectivity issue detector
  - Timeout issue detector
  - Error response analyzer (4xx, 5xx)
  - Data format issue detector (parsing errors)
- [ ] 4.3.3 Build network-specific hypothesis generator:
  - URL/endpoint hypotheses (incorrect URL, missing parameters)
  - Authentication hypotheses (missing/invalid tokens)
  - Header hypotheses (missing/incorrect headers)
  - Payload hypotheses (malformed request body)
  - Network configuration hypotheses (proxy, firewall, DNS)
- [ ] 4.3.4 Create API contract analyzer:
  - Request format validator
  - Response format validator
  - Status code analyzer
  - Header analyzer
- [ ] 4.3.5 Implement network fix generator:
  - Request corrections
  - Retry logic additions
  - Timeout configuration
  - Error handling improvements
  - API contract alignment

### 4.4 debug:concurrency - Race Condition Debugging

**Tasks:**
- [ ] 4.4.1 Create `debug:concurrency` command file
  - YAML: model: opus (complex thread interaction analysis requires advanced reasoning)
  - argument-hint: [concurrency-issue-description]
  - outputs: debug-log.md, concurrency-analysis.md, fix-suggestion.md
- [ ] 4.4.2 Implement concurrency issue classifier:
  - Race condition detector
  - Deadlock detector
  - Livelock detector
  - Thread starvation detector
- [ ] 4.4.3 Build concurrency-specific hypothesis generator:
  - Shared state hypotheses (unprotected access)
  - Lock ordering hypotheses (circular dependency)
  - Timing hypotheses (TOCTOU - time-of-check-time-of-use)
  - Async operation hypotheses (missing await, Promise.all issues)
- [ ] 4.4.4 Create thread interaction analyzer:
  - Shared resource identifier
  - Lock acquisition pattern analyzer
  - Event ordering analyzer
  - Happens-before relationship checker
- [ ] 4.4.5 Implement concurrency fix generator:
  - Synchronization additions (locks, mutexes, semaphores)
  - Lock-free algorithm suggestions
  - Async/await corrections
  - Thread-safe data structure recommendations
  - Deadlock prevention strategies

**VERIFY Phase 4:**
- [ ] All P1 sub-commands (test, memory, network, concurrency) handle complex scenarios, use appropriate models (Opus for memory/concurrency), and generate specialized analyses

---

## Phase 5: P2 Sub-Commands Implementation

**Objective:** Implement P2 sub-command: debug:data

### 5.1 debug:data - Data Corruption Debugging

**Tasks:**
- [ ] 5.1.1 Create `debug:data` command file
  - YAML: model: sonnet, interactive: true
  - argument-hint: [data-corruption-description]
  - outputs: debug-log.md, data-analysis.md, fix-suggestion.md
- [ ] 5.1.2 Implement data corruption detector:
  - Data validation failure analyzer
  - Schema mismatch detector
  - Encoding issue detector (UTF-8, base64)
  - Truncation/overflow detector
  - Serialization/deserialization issue detector
- [ ] 5.1.3 Build data-specific hypothesis generator:
  - Input validation hypotheses (missing sanitization)
  - Transformation hypotheses (incorrect mapping, lost precision)
  - Storage hypotheses (database constraint violations)
  - Encoding hypotheses (character encoding issues)
  - Concurrency hypotheses (write conflicts)
- [ ] 5.1.4 Create data flow tracer:
  - Input source identifier
  - Transformation step tracker
  - Storage layer analyzer
  - Output format validator
- [ ] 5.1.5 Implement data fix generator:
  - Input validation additions
  - Data transformation corrections
  - Schema alignment fixes
  - Encoding handling improvements
  - Transaction isolation recommendations

**VERIFY Phase 5:**
- [ ] debug:data sub-command identifies data corruption sources, traces data flow, and provides data integrity fixes

---

## Phase 6: Artifact Generation & Schemas

**Objective:** Implement all 4 artifact types with validated schemas and consistent formatting

### 6.1 debug-log.md Artifact

**Tasks:**
- [ ] 6.1.1 Create debug-log.md template with YAML frontmatter:
  - artifact_type: debug-log
  - session-id: [unique-id]
  - command: [debug:error | debug:performance | etc.]
  - timestamp: [ISO-8601]
- [ ] 6.1.2 Implement log structure generator:
  - Problem Statement section
  - Initial Context section (Symptoms, Environment, Reproducibility)
  - Investigation Timeline section (chronological entries)
  - Conclusion section (final outcome)
- [ ] 6.1.3 Build timeline entry formatter:
  - [HH:MM] timestamp prefix
  - Hypothesis number and description
  - Evidence for/against
  - Testing approach
  - Actions taken (bulleted list)
  - Findings
  - Result (✓ Confirmed | ✗ Eliminated | ⊙ Partial)
- [ ] 6.1.4 Add navigation helpers:
  - Table of contents for long investigations
  - Hypothesis quick reference
  - Key findings summary

### 6.2 hypothesis.md Artifact

**Tasks:**
- [ ] 6.2.1 Create hypothesis.md template with YAML frontmatter:
  - artifact_type: hypothesis
  - hypothesis-count: [number]
  - session-id: [unique-id]
- [ ] 6.2.2 Implement hypothesis ranking system:
  - Likelihood assessment (High/Medium/Low Probability)
  - Evidence strength scoring
  - Priority ordering
- [ ] 6.2.3 Build hypothesis entry formatter:
  - Hypothesis number and name
  - Probability level (High | Medium | Low)
  - Description (what might be wrong)
  - Supporting Evidence (bullet points)
  - Testing Approach (actionable steps with checkboxes)
  - Files to Examine (with relevance explanation)
  - Expected Findings If Confirmed (success criteria)
- [ ] 6.2.4 Add hypothesis status tracker:
  - Pending (not yet tested)
  - Testing (in progress)
  - Confirmed (root cause found)
  - Eliminated (ruled out)
  - Partial (contributes but not root cause)

### 6.3 root-cause.md Artifact

**Tasks:**
- [ ] 6.3.1 Create root-cause.md template with YAML frontmatter:
  - artifact_type: root-cause
  - severity: [critical | high | medium | low]
  - confirmed: [yes | no | partial]
  - session-id: [unique-id]
- [ ] 6.3.2 Implement root cause structure:
  - Root Cause section (definitive statement)
  - Supporting Evidence section (numbered list with source/finding)
  - Why This Happened section (underlying factors)
  - Prevention Insights section (future prevention strategies)
- [ ] 6.3.3 Build evidence formatter:
  - Evidence type classification (Stack trace, Log entry, Code analysis, Test result)
  - Source citation (file, line number, log timestamp)
  - Finding description
  - Relevance explanation
- [ ] 6.3.4 Add severity classification logic:
  - Critical: System down, data loss, security breach
  - High: Major functionality broken, significant performance degradation
  - Medium: Feature not working, moderate impact
  - Low: Minor issue, cosmetic problem

### 6.4 fix-suggestion.md Artifact

**Tasks:**
- [ ] 6.4.1 Create fix-suggestion.md template with YAML frontmatter:
  - artifact_type: fix-suggestion
  - confidence: [high | medium | low]
  - risk-level: [low | medium | high]
  - session-id: [unique-id]
- [ ] 6.4.2 Implement fix structure:
  - Root Cause Summary section (brief recap)
  - Proposed Fix section (code changes with explanations)
  - Why This Works section (mechanism explanation)
  - Risk Assessment section (risk level, potential risks)
  - Testing Strategy section (verification steps)
  - Rollback Plan section (if high risk)
- [ ] 6.4.3 Build code change formatter:
  - File path with language hint
  - Before/after code blocks
  - Line number references
  - Change explanation
  - Alternative approaches (if applicable)
- [ ] 6.4.4 Add risk assessment framework:
  - Risk level determination (Low/Medium/High)
  - Potential risks enumeration
  - Mitigation strategies
  - Affected components list
  - Testing requirements

### 6.5 Specialized Artifacts

**Tasks:**
- [ ] 6.5.1 Implement performance-analysis.md (for debug:performance):
  - Bottleneck identification section
  - Current vs target metrics
  - Hot path analysis
  - Resource usage breakdown
- [ ] 6.5.2 Implement optimization-plan.md (for debug:performance):
  - Prioritized optimization list (impact × effort matrix)
  - Quick wins section (low effort, high impact)
  - Long-term improvements section
  - Measurement plan
- [ ] 6.5.3 Implement memory-analysis.md (for debug:memory):
  - Object lifecycle analysis
  - Leak pattern identification
  - Memory growth trend
  - Garbage collection insights
- [ ] 6.5.4 Implement leak-report.md (for debug:memory):
  - Confirmed leaks list
  - Leak severity classification
  - Object retention graph (if available)
  - Cleanup recommendations
- [ ] 6.5.5 Implement concurrency-analysis.md (for debug:concurrency):
  - Thread interaction diagram
  - Lock acquisition patterns
  - Race condition identification
  - Deadlock cycle detection
- [ ] 6.5.6 Implement behavior-analysis.md (for debug:behavior):
  - Expected behavior description
  - Actual behavior description
  - Divergence point identification
  - State comparison
- [ ] 6.5.7 Implement test-analysis.md (for debug:test):
  - Test failure classification
  - Flakiness assessment
  - Test isolation analysis
  - Coverage impact
- [ ] 6.5.8 Implement network-analysis.md (for debug:network):
  - Request/response analysis
  - API contract comparison
  - Network path analysis
  - Timing breakdown
- [ ] 6.5.9 Implement data-analysis.md (for debug:data):
  - Data flow trace
  - Corruption point identification
  - Schema comparison
  - Validation failures

**VERIFY Phase 6:**
- [ ] All artifacts validate against schemas, contain complete information, and follow consistent formatting

---

## Phase 7: Integration with /fix Command

**Objective:** Enable seamless workflow from debugging to automated fixing

**Tasks:**
- [ ] 7.1 Design /debug → /fix workflow:
  - debug generates fix-suggestion.md artifact
  - /fix command can consume fix-suggestion.md
  - Metadata links debugging session to fix implementation
  - Cross-reference between artifacts
- [ ] 7.2 Create fix artifact consumption interface:
  - Parse fix-suggestion.md frontmatter and content
  - Extract code changes (file path, before/after)
  - Load risk assessment and testing strategy
  - Prepare fix execution plan
- [ ] 7.3 Implement fix confidence passing:
  - Pass confidence level from debug to fix
  - Adjust fix behavior based on confidence (high = auto-apply, low = review required)
  - Include original debugging context in fix metadata
- [ ] 7.4 Build verification workflow:
  - After fix applied, reference testing strategy from fix-suggestion.md
  - Run suggested tests
  - Compare results to expected outcomes
  - Document fix verification in debug session
- [ ] 7.5 Create rollback integration:
  - If fix fails, use rollback plan from fix-suggestion.md
  - Re-open debugging session with new findings
  - Generate updated hypothesis based on fix failure
- [ ] 7.6 Add workflow documentation:
  - Document /debug → /fix → /test workflow
  - Create examples for each debug sub-command
  - Include decision tree (when to auto-fix vs manual review)
  - Add troubleshooting for workflow issues

**VERIFY Phase 7:**
- [ ] /debug artifacts successfully consumed by /fix command, workflow produces working fixes with proper verification

---

## Phase 8: Testing & Validation

**Objective:** Comprehensive testing across all sub-commands and debugging scenarios

### 8.1 Unit Testing

**Tasks:**
- [ ] 8.1.1 Test hypothesis generation for each sub-command
- [ ] 8.1.2 Test investigation timeline logging
- [ ] 8.1.3 Test root cause identification logic
- [ ] 8.1.4 Test fix suggestion generation
- [ ] 8.1.5 Test artifact schema validation
- [ ] 8.1.6 Test session management (ID generation, context preservation)

### 8.2 Sub-Command Testing

**Tasks:**
- [ ] 8.2.1 Test debug:error with various error types:
  - JavaScript TypeError, ReferenceError, SyntaxError
  - Python exceptions (ValueError, AttributeError, KeyError)
  - Java exceptions (NullPointerException, ClassCastException)
  - API errors (4xx, 5xx responses)
- [ ] 8.2.2 Test debug:performance with various bottlenecks:
  - O(n²) algorithm inefficiencies
  - N+1 database queries
  - Blocking I/O operations
  - Memory allocation issues
- [ ] 8.2.3 Test debug:behavior with logic errors:
  - Off-by-one errors
  - Incorrect conditionals
  - State inconsistencies
  - Edge case failures
- [ ] 8.2.4 Test debug:test with test failures:
  - Assertion failures
  - Flaky tests
  - Test isolation issues
  - Async test problems
- [ ] 8.2.5 Test debug:memory with leak patterns:
  - Event listener leaks
  - Timer leaks
  - Closure leaks
  - Resource leaks
- [ ] 8.2.6 Test debug:network with API issues:
  - Timeout errors
  - Authentication failures
  - Malformed requests
  - Response parsing errors
- [ ] 8.2.7 Test debug:concurrency with threading issues:
  - Race conditions
  - Deadlocks
  - Async/await problems
  - Promise chain errors
- [ ] 8.2.8 Test debug:data with corruption scenarios:
  - Encoding issues
  - Schema mismatches
  - Validation failures
  - Truncation/overflow

### 8.3 Integration Testing

**Tasks:**
- [ ] 8.3.1 Test complete debugging workflow (problem → hypotheses → investigation → root cause → fix)
- [ ] 8.3.2 Test /debug → /fix integration
- [ ] 8.3.3 Test artifact generation and consumption
- [ ] 8.3.4 Test model switching (Sonnet vs Opus) for appropriate sub-commands
- [ ] 8.3.5 Test interactive mode (user confirmation for invasive debugging steps)

### 8.4 Cross-Language Testing

**Tasks:**
- [ ] 8.4.1 Test debugging TypeScript/JavaScript projects
- [ ] 8.4.2 Test debugging Python projects
- [ ] 8.4.3 Test debugging Java projects
- [ ] 8.4.4 Test debugging Go projects
- [ ] 8.4.5 Test debugging multi-language projects

### 8.5 Edge Case Testing

**Tasks:**
- [ ] 8.5.1 Test with incomplete error information
- [ ] 8.5.2 Test with intermittent issues (cannot reproduce)
- [ ] 8.5.3 Test with multiple potential root causes
- [ ] 8.5.4 Test with no clear hypothesis (generate exploratory approach)
- [ ] 8.5.5 Test with very large stack traces (>1000 lines)
- [ ] 8.5.6 Test with obfuscated/minified code

**VERIFY Phase 8:**
- [ ] All test cases pass, command handles edge cases gracefully, artifacts are accurate and complete

---

## Phase 9: Documentation & Polish

**Objective:** Create comprehensive documentation and refine user experience

**Tasks:**
- [ ] 9.1 Create command documentation:
  - Overview of debugging philosophy (hypothesis-driven)
  - Usage examples for each sub-command
  - Decision tree (which sub-command for which scenario)
  - Common workflows and patterns
  - Integration with /fix command
- [ ] 9.2 Document artifact schemas:
  - JSON/YAML schema definitions
  - Field descriptions and constraints
  - Example artifacts for each type
  - Version compatibility notes
- [ ] 9.3 Create debugging best practices guide:
  - "How to write a good problem statement"
  - "Interpreting hypothesis rankings"
  - "When to use Sonnet vs Opus sub-commands"
  - "Reading investigation timelines"
  - "Evaluating fix suggestions (risk assessment)"
- [ ] 9.4 Add inline help and guidance:
  - Argument hints in YAML frontmatter
  - Error messages with debugging suggestions
  - Progress indicators during investigation
  - Hypothesis testing status updates
- [ ] 9.5 Create troubleshooting documentation:
  - "Debug session not finding root cause" → generate new hypotheses
  - "Fix suggestion too risky" → use manual review workflow
  - "Intermittent issue cannot reproduce" → use debug:behavior with state analysis
  - "Multiple root causes identified" → prioritize by severity
- [ ] 9.6 Polish output formatting:
  - Clear section headers with emoji/icons
  - Syntax highlighting for code snippets
  - Collapsible sections for long investigations
  - Summary boxes for key findings
  - Clickable file paths (where supported)
  - Color-coded severity levels
- [ ] 9.7 Create example debugging sessions:
  - Example: Debugging a TypeError in Node.js
  - Example: Debugging a performance bottleneck in Python
  - Example: Debugging a flaky test in Jest
  - Example: Debugging a memory leak in React
  - Example: Debugging an API timeout
  - Example: Debugging a race condition
- [ ] 9.8 Add interactive tutorial:
  - Guided debugging session walkthrough
  - Practice scenarios with solutions
  - Self-assessment checklist

**VERIFY Phase 9:**
- [ ] Documentation is comprehensive, examples are accurate and helpful, user experience is polished and intuitive

---

## Success Criteria

### Functional Requirements
- [ ] Base /debug command supports all 8 sub-commands: error, performance, behavior, test, memory, network, concurrency, data
- [ ] Hypothesis-driven workflow generates 3-5 ranked hypotheses for each debugging session
- [ ] Investigation timeline chronologically logs all actions, findings, and results
- [ ] Root cause identification confirms issues with supporting evidence
- [ ] Fix suggestions include code changes, risk assessment, and testing strategy
- [ ] All 4 primary artifacts (debug-log.md, hypothesis.md, root-cause.md, fix-suggestion.md) generated correctly
- [ ] All 8 specialized artifacts generated for appropriate sub-commands
- [ ] Artifacts validate against defined schemas

### Model Requirements
- [ ] sonnet used for: debug:error, debug:performance, debug:behavior, debug:test, debug:network, debug:data (standard debugging tasks)
- [ ] opus used for: debug:memory (object lifecycle reasoning), debug:concurrency (thread interaction analysis - complex reasoning required)
- [ ] Model selection automatic based on sub-command
- [ ] Complex scenarios trigger appropriate model upgrade

### Quality Requirements
- [ ] Hypothesis probability ranking accuracy > 70% (highest-ranked hypothesis is root cause in 70%+ of cases)
- [ ] Root cause identification success rate > 80% for reproducible issues
- [ ] Fix suggestion confidence "high" results in working fix > 90% of time
- [ ] Investigation completes within reasonable time (< 5 minutes for standard debugging sessions)
- [ ] Artifacts are human-readable and actionable

### Usability Requirements
- [ ] Clear progress indicators during investigation ("Testing hypothesis 2/5...")
- [ ] Helpful error messages when debugging cannot proceed
- [ ] Interactive mode requests user confirmation for risky operations
- [ ] Hypothesis testing approach provides actionable steps
- [ ] Fix suggestions include risk assessment and rollback plans

### Integration Requirements
- [ ] /debug artifacts successfully consumed by /fix command
- [ ] Metadata includes session-id for tracking across commands
- [ ] fix-suggestion.md format compatible with /fix parser
- [ ] Debugging sessions can be resumed if interrupted
- [ ] Cross-referencing between related artifacts

### Testing Requirements
- [ ] All unit tests pass (hypothesis generation, investigation logging, root cause logic)
- [ ] All sub-commands tested with representative scenarios
- [ ] Tested across TypeScript, Python, Java, and Go projects
- [ ] Edge cases handled gracefully (incomplete info, intermittent issues, multiple causes)
- [ ] Integration with /fix command tested end-to-end

### Documentation Requirements
- [ ] Command reference documents all 8 sub-commands with examples
- [ ] Debugging best practices guide explains methodology
- [ ] Artifact schemas fully documented with examples
- [ ] Troubleshooting guide addresses common issues
- [ ] Example debugging sessions demonstrate workflows

---

## Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Incorrect root cause identification | High | Medium | Use hypothesis ranking, require evidence confirmation |
| Fix suggestions introduce new bugs | High | Medium | Include risk assessment, require testing strategy |
| Investigation times out before completion | Medium | Medium | Implement graceful termination, save partial findings |
| Intermittent issues cannot be reproduced | Medium | High | Add state analysis, track timing conditions |
| Memory/concurrency debugging complexity | High | Medium | Use Opus model, implement specialized analysis tools |
| Hypothesis generation misses root cause | Medium | Medium | Allow hypothesis regeneration, support user input |
| Investigation alters system state | Medium | Low | Use read-only tools by default, require confirmation for changes |
