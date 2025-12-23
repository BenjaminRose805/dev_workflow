# Implementation Plan: Debug Agent

## Overview
- **Goal:** Implement a custom Debug Agent with hypothesis-driven debugging methodology, specialized tool configuration (includes Write and AskUser), and intelligent model selection (Sonnet default, Opus for complex cases)
- **Priority:** P0 (CRITICAL - Analysis & Quality phase)
- **Created:** 2025-12-22
- **Output:** `docs/plan-outputs/implement-debug-agent/`
- **Model:** Sonnet 4.5 (default), Opus 4.5 (memory/concurrency debugging)
- **Category:** Analysis & Quality

> The Debug Agent provides systematic, hypothesis-driven debugging capabilities with specialized tool access including interactive debugging (AskUser) and fix application (Write). Supports integration with /debug command for error analysis, performance optimization, memory leaks, concurrency issues, and more. Generates structured debug artifacts for root cause documentation and reproducible investigations.

---

## Phase 1: Agent Configuration File Setup

**Objective:** Create base Debug Agent configuration at `.claude/agents/debug.md` with proper YAML frontmatter and tool configuration

- [ ] 1.1 Create `.claude/agents/` directory if not exists
  - Verify directory structure follows conventions
  - Set appropriate permissions
  - Initialize .gitkeep if needed
- [ ] 1.2 Create `debug.md` agent file at `.claude/agents/debug.md`
  - YAML frontmatter with agent metadata
  - Agent description and purpose
  - Tool configuration section
  - Model selection logic
- [ ] 1.3 Configure YAML frontmatter:
  - name: debug
  - description: "Hypothesis-driven systematic debugging with root cause analysis"
  - model: claude-sonnet-4-5 (default)
  - category: "Analysis & Quality"
  - permission_mode: interactive (requires user confirmation for fixes)
  - proactive: true (auto-invoked on debugging task patterns)
- [ ] 1.4 Configure allowed tools:
  - Read: For reading source files and stack traces
  - Grep: For searching codebase patterns
  - Glob: For finding related files
  - Bash: For running tests and diagnostic commands
  - Write: For writing debug artifacts and applying fixes
  - AskUser: For interactive hypothesis validation
  - NO Edit: Prevent direct code editing (fixes go through Write)
  - NO WebFetch/WebSearch: Debugging is codebase-focused
- [ ] 1.5 Add model upgrade conditions:
  - Define memory debugging → Opus upgrade trigger
  - Define concurrency debugging → Opus upgrade trigger
  - Define complex object lifecycle → Opus upgrade trigger
  - Keep Sonnet for standard error/performance/behavior debugging
- [ ] 1.6 Create output directory structure:
  - `docs/debug/` for debug session artifacts
  - `docs/debug/sessions/` for session-specific logs
  - `docs/debug/root-causes/` for root cause analyses
  - `docs/debug/fixes/` for fix suggestions
- [ ] **VERIFY 1:** Agent configuration file is valid YAML, tools are correctly restricted, model upgrade logic is defined

---

## Phase 2: System Prompt - Hypothesis-Driven Framework

**Objective:** Design specialized system prompt for hypothesis-driven debugging methodology

- [ ] 2.1 Write agent role definition:
  - "You are a systematic debugging expert specializing in hypothesis-driven root cause analysis"
  - Emphasize evidence-based reasoning over guessing
  - Highlight reproducibility and documentation requirements
  - Define interactive debugging approach
- [ ] 2.2 Define debugging methodology (6-phase workflow):
  - **Phase 1: Gather Context** - Parse errors, stack traces, symptoms, environment, reproducibility
  - **Phase 2: Generate Hypotheses** - Create 3-5 ranked hypotheses (High/Medium/Low probability)
  - **Phase 3: Systematic Investigation** - Test hypotheses in priority order
  - **Phase 4: Identify Root Cause** - Confirm root cause with supporting evidence
  - **Phase 5: Propose Fixes** - Generate fix with risk assessment (Low/Medium/High)
  - **Phase 6: Document Findings** - Create debug-log.md, root-cause.md, fix-suggestion.md
- [ ] 2.3 Add hypothesis generation guidelines:
  - Rank hypotheses by likelihood based on available evidence
  - Support each hypothesis with concrete observations
  - Define testing approach with checkboxes
  - List relevant files to examine with justification
  - State expected findings if hypothesis is confirmed
- [ ] 2.4 Add hypothesis testing workflow:
  - Test highest probability hypothesis first
  - Document actions taken and findings
  - Mark result: ✓ Confirmed | ✗ Eliminated | ⊙ Partial
  - If eliminated, move to next hypothesis
  - If confirmed, proceed to root cause documentation
- [ ] 2.5 Add root cause identification best practices:
  - Require supporting evidence from multiple sources
  - Distinguish immediate cause vs underlying factors
  - Classify severity: critical | high | medium | low
  - Include prevention insights for future issues
- [ ] 2.6 Define risk assessment framework:
  - **Low Risk:** Isolated change, well-tested pattern, easy rollback
  - **Medium Risk:** Affects multiple components, requires testing, documented rollback
  - **High Risk:** Core system change, breaking change potential, staged rollback required
- [ ] 2.7 Add interactive debugging guidelines:
  - Use AskUser to confirm hypotheses with user before deep investigation
  - Request additional context when symptoms are unclear
  - Confirm fix approach before applying (if Write is used)
  - Ask for reproduction steps if issue is not reproducible
- [ ] **VERIFY 2:** System prompt clearly defines methodology, provides actionable guidance, supports interactive workflow

---

## Phase 3: Debug Session Management

**Objective:** Implement session tracking, context preservation, and investigation timeline logging

- [ ] 3.1 Design session identifier generation:
  - Format: `debug-{YYYYMMDD}-{HHMMSS}-{short-hash}`
  - Example: `debug-20251222-143022-a7c3f`
  - Use consistent timestamp format (ISO-8601)
  - Include short hash for uniqueness
- [ ] 3.2 Create session context schema:
  - problem_statement: User-provided issue description
  - symptoms: Observable behaviors (error messages, performance metrics, etc.)
  - environment: OS, runtime version, framework, dependencies
  - reproducibility: always | intermittent | specific_conditions
  - stack_trace: Parsed stack trace (if applicable)
  - affected_files: List of files involved
- [ ] 3.3 Implement investigation timeline tracker:
  - Chronological log format: `[HH:MM] Action/Finding`
  - Track hypothesis testing sequence
  - Document evidence collection
  - Record tools used and results
  - Include progress indicators (e.g., "Testing hypothesis 2/5...")
- [ ] 3.4 Add hypothesis testing result tracker:
  - Hypothesis ID and description
  - Testing approach (steps taken)
  - Evidence found (file paths, line numbers, observations)
  - Conclusion: ✓ Confirmed | ✗ Eliminated | ⊙ Partial
  - Confidence level: high | medium | low
- [ ] 3.5 Create session metadata:
  - session_id: Unique identifier
  - started_at: ISO-8601 timestamp
  - completed_at: ISO-8601 timestamp
  - duration_seconds: Total investigation time
  - hypotheses_tested: Number of hypotheses tested
  - root_cause_found: boolean
  - fix_applied: boolean
- [ ] **VERIFY 3:** Session management creates unique IDs, preserves context, tracks investigation progress chronologically

---

## Phase 4: Hypothesis Generation Engine

**Objective:** Build intelligent hypothesis generator with ranking, evidence mapping, and testing approach

- [ ] 4.1 Implement hypothesis data structure:
  - hypothesis_id: Sequential number (1, 2, 3...)
  - hypothesis_name: Short descriptive name
  - probability: high | medium | low
  - description: What might be wrong and why
  - supporting_evidence: Bullet points with observations
  - testing_approach: Actionable steps (with checkboxes)
  - files_to_examine: List with relevance explanation
  - expected_findings: Success criteria if confirmed
  - result: pending | testing | confirmed | eliminated | partial
- [ ] 4.2 Create error-specific hypothesis patterns:
  - **TypeError/NullPointerException:** Null/undefined checks, type mismatches, API contracts
  - **Performance issues:** O(n²) algorithms, N+1 queries, blocking I/O, memory allocation
  - **Behavioral bugs:** Logic errors, off-by-one, incorrect conditionals, state inconsistencies
  - **Test failures:** Flaky tests, missing mocks, assertion logic, test isolation
  - **Memory leaks:** Event listeners, timers, closures, unclosed resources
  - **Network errors:** Timeouts, auth failures, malformed requests, API contracts
  - **Concurrency:** Race conditions, deadlocks, unprotected shared state, TOCTOU
  - **Data corruption:** Validation failures, encoding issues, schema mismatches, truncation
- [ ] 4.3 Implement ranking algorithm:
  - Weight by evidence strength (stack trace > log entry > code pattern)
  - Weight by commonality (common errors rank higher initially)
  - Weight by context relevance (recent changes, affected modules)
  - Normalize to probability: high (>60%), medium (30-60%), low (<30%)
- [ ] 4.4 Add evidence collection system:
  - Parse stack traces for file paths, line numbers, function names
  - Extract error messages and error types
  - Identify recent code changes (git log if available)
  - Detect framework-specific patterns
  - Analyze dependency versions
- [ ] 4.5 Create testing approach generator:
  - Define actionable steps for each hypothesis
  - Include specific files to read
  - Suggest commands to run (tests, profiling, logs)
  - Provide expected vs actual outcomes
  - Add time estimates for investigation
- [ ] 4.6 Implement hypothesis template:
  - Clear markdown format for hypothesis.md artifact
  - Support for multiple hypotheses in single document
  - Status tracking (pending → testing → confirmed/eliminated)
  - Cross-reference to debug-log.md timeline
- [ ] **VERIFY 4:** Hypothesis generator creates 3-5 ranked hypotheses, includes testing approaches, maps evidence correctly

---

## Phase 5: Investigation & Artifact Generation

**Objective:** Implement systematic investigation workflow and structured artifact generation

### 5.1 Debug Log Artifact (debug-log.md)
- [ ] 5.1.1 Create debug-log.md template with YAML frontmatter:
  - artifact-type: debug-log
  - session-id: {unique-id}
  - command: {debug:error | debug:performance | etc.}
  - timestamp: {ISO-8601}
  - root_cause_found: {boolean}
- [ ] 5.1.2 Implement log structure sections:
  - **Problem Statement:** User-provided issue description
  - **Initial Context:** Symptoms, Environment, Reproducibility
  - **Investigation Timeline:** Chronological entries with timestamps
  - **Conclusion:** Final outcome (root cause found, partial findings, or exhausted hypotheses)
- [ ] 5.1.3 Create timeline entry formatter:
  - `[HH:MM] Hypothesis N: {description}`
  - Evidence for/against
  - Testing approach (bullet points)
  - Actions taken (with tool invocations)
  - Findings (observations and data)
  - Result: ✓ Confirmed | ✗ Eliminated | ⊙ Partial
- [ ] 5.1.4 Add navigation helpers:
  - Table of contents for sessions with >5 hypotheses
  - Hypothesis quick reference table
  - Key findings summary box

### 5.2 Root Cause Artifact (root-cause.md)
- [ ] 5.2.1 Create root-cause.md template with YAML frontmatter:
  - artifact-type: root-cause
  - severity: {critical | high | medium | low}
  - confirmed: {yes | no | partial}
  - session-id: {unique-id}
  - affected_files: [list]
- [ ] 5.2.2 Implement root cause structure:
  - **Root Cause:** Definitive statement of what went wrong
  - **Supporting Evidence:** Numbered list with source, finding, relevance
  - **Why This Happened:** Underlying factors and contributing conditions
  - **Prevention Insights:** Strategies to prevent similar issues in future
- [ ] 5.2.3 Build evidence formatter:
  - Evidence type: Stack trace | Log entry | Code analysis | Test result | Profiling data
  - Source citation: file:line or log timestamp
  - Finding description: What was observed
  - Relevance: Why this confirms root cause
- [ ] 5.2.4 Add severity classification logic:
  - **Critical:** System down, data loss, security breach, complete feature failure
  - **High:** Major functionality broken, significant performance degradation (>50%)
  - **Medium:** Feature not working as expected, moderate performance impact
  - **Low:** Minor issue, cosmetic problem, edge case failure

### 5.3 Fix Suggestion Artifact (fix-suggestion.md)
- [ ] 5.3.1 Create fix-suggestion.md template with YAML frontmatter:
  - artifact-type: fix-suggestion
  - confidence: {high | medium | low}
  - risk-level: {low | medium | high}
  - session-id: {unique-id}
  - requires_testing: {boolean}
- [ ] 5.3.2 Implement fix structure:
  - **Root Cause Summary:** Brief recap from root-cause.md
  - **Proposed Fix:** Code changes with before/after blocks
  - **Why This Works:** Mechanism explanation
  - **Risk Assessment:** Risk level, potential risks, mitigation strategies
  - **Testing Strategy:** Verification steps with expected outcomes
  - **Rollback Plan:** Steps to undo fix (if medium/high risk)
- [ ] 5.3.3 Build code change formatter:
  - File path with language syntax highlighting hint
  - Line number references
  - Before/after code blocks (if applicable)
  - Change explanation (why this fixes the issue)
  - Alternative approaches (if multiple solutions exist)
- [ ] 5.3.4 Add risk assessment framework:
  - Determine risk level based on scope, complexity, blast radius
  - Enumerate potential risks (breaking changes, performance impact, etc.)
  - Provide mitigation strategies
  - List affected components/modules
  - Define testing requirements (unit, integration, manual)

### 5.4 Hypothesis Artifact (hypothesis.md)
- [ ] 5.4.1 Create hypothesis.md template with YAML frontmatter:
  - artifact-type: hypothesis
  - hypothesis-count: {number}
  - session-id: {unique-id}
  - highest_probability: {hypothesis-id}
- [ ] 5.4.2 Implement hypothesis ranking display:
  - Sort by probability (High → Medium → Low)
  - Number sequentially (1, 2, 3...)
  - Show probability level with visual indicator
  - Include status badge (Pending/Testing/Confirmed/Eliminated)
- [ ] 5.4.3 Build hypothesis entry format:
  - Hypothesis number and name (bold header)
  - Probability level: High | Medium | Low
  - Description: What might be wrong
  - Supporting Evidence: Bullet points with observations
  - Testing Approach: Actionable steps with checkboxes
  - Files to Examine: Paths with relevance explanation
  - Expected Findings If Confirmed: Success criteria
- [ ] 5.4.4 Add hypothesis status tracker:
  - Pending: Not yet tested
  - Testing: Currently investigating
  - Confirmed: Root cause found
  - Eliminated: Ruled out
  - Partial: Contributes but not root cause

- [ ] **VERIFY 5:** All four artifacts (debug-log.md, root-cause.md, fix-suggestion.md, hypothesis.md) generate correctly with valid YAML and complete information

---

## Phase 6: Model Selection Logic

**Objective:** Implement intelligent model selection (Sonnet vs Opus) based on debugging scenario complexity

- [ ] 6.1 Define model selection criteria:
  - **Sonnet (default):** Error analysis, performance debugging, behavioral issues, test failures, network issues, data corruption
  - **Opus (upgrade):** Memory debugging (object lifecycle reasoning), concurrency debugging (thread interaction analysis), complex state management
- [ ] 6.2 Implement memory debugging detection:
  - Keywords: "memory leak", "heap", "garbage collection", "out of memory", "OOM"
  - Patterns: Event listeners, timers, closures, resource cleanup
  - Trigger: Upgrade to Opus for deep object lifecycle analysis
- [ ] 6.3 Implement concurrency debugging detection:
  - Keywords: "race condition", "deadlock", "thread", "concurrent", "mutex", "lock"
  - Patterns: Shared state, async/await, Promise.all, thread pools
  - Trigger: Upgrade to Opus for complex thread interaction analysis
- [ ] 6.4 Add model upgrade metadata:
  - Log model selection in session metadata
  - Document reason for model upgrade in debug-log.md
  - Allow manual model override via command argument
  - Include model info in artifact frontmatter
- [ ] 6.5 Create model selection prompt additions:
  - For Opus (memory): "Perform deep object lifecycle analysis, trace reference chains, identify garbage collection barriers"
  - For Opus (concurrency): "Analyze thread interactions, detect race conditions, identify lock acquisition patterns, check happens-before relationships"
  - For Sonnet (standard): "Systematic hypothesis testing, evidence-based debugging, root cause identification"
- [ ] **VERIFY 6:** Model selection correctly identifies memory/concurrency cases for Opus upgrade, defaults to Sonnet appropriately

---

## Phase 7: Integration with /debug Command

**Objective:** Ensure seamless integration between Debug Agent and /debug command system

- [ ] 7.1 Define agent invocation points:
  - `/debug` base command invokes Debug Agent
  - All 8 sub-commands (error, performance, behavior, test, memory, network, concurrency, data) delegate to agent
  - Agent receives sub-command context for specialized analysis
- [ ] 7.2 Create argument passing interface:
  - Pass problem description from user
  - Pass sub-command type (for specialized hypothesis generation)
  - Pass optional: stack trace, error message, file paths, reproduction steps
  - Pass depth level: quick | standard | deep
- [ ] 7.3 Implement sub-command specialization:
  - debug:error → Focus on stack trace parsing, error type classification
  - debug:performance → Focus on profiling data, algorithmic complexity, bottleneck identification
  - debug:behavior → Focus on control flow tracing, state analysis, expected vs actual
  - debug:test → Focus on flakiness detection, test isolation, assertion logic
  - debug:memory → Focus on object lifecycle, leak patterns, cleanup verification + Opus model
  - debug:network → Focus on API contracts, request/response analysis, timeout patterns
  - debug:concurrency → Focus on race conditions, lock patterns, thread safety + Opus model
  - debug:data → Focus on data flow tracing, validation, encoding, schema alignment
- [ ] 7.4 Add artifact consumption interface:
  - Debug Agent generates artifacts in `docs/debug/`
  - /fix command can consume fix-suggestion.md
  - /test command can consume testing-strategy from fix-suggestion.md
  - Metadata includes session-id for cross-referencing
- [ ] 7.5 Create workflow integration:
  - /debug → Debug Agent → Artifacts → /fix (optional)
  - /debug → Debug Agent → Artifacts → /test (optional)
  - Support resuming interrupted debug sessions via session-id
- [ ] 7.6 Add proactive invocation triggers:
  - User mentions: "debug", "error", "bug", "broken", "failing"
  - User provides stack traces in message
  - User asks "why is X happening?"
  - Suggest Debug Agent when appropriate (don't auto-invoke without confirmation)
- [ ] **VERIFY 7:** Debug Agent integrates with all 8 /debug sub-commands, artifacts flow to downstream commands, proactive suggestions work

---

## Phase 8: Interactive Debugging Workflow

**Objective:** Implement AskUser-based interactive debugging for hypothesis validation and context gathering

- [ ] 8.1 Define interactive hypothesis validation:
  - After generating hypotheses, ask user: "I've identified 3 potential causes. Should I investigate Hypothesis 1 (most likely) first?"
  - Confirm user can reproduce issue: "Can you reliably reproduce this issue? If so, what are the exact steps?"
  - Request additional context: "What changed recently in {affected_module}?"
  - Validate assumptions: "I assume {assumption}. Is this correct?"
- [ ] 8.2 Implement fix confirmation workflow:
  - Present fix approach before applying: "I recommend {fix_summary}. Risk level: {risk}. Apply this fix?"
  - If high risk: "This fix affects {components}. I recommend manual review. Should I generate the fix file for you to review?"
  - If medium risk: "This fix requires testing {test_cases}. Proceed with fix?"
  - If low risk: "This is a low-risk fix. Apply immediately?"
- [ ] 8.3 Add clarification requests:
  - If problem statement is vague: "Can you provide more details about {aspect}?"
  - If reproducibility unclear: "Does this happen every time, or only under specific conditions?"
  - If environment missing: "What version of {runtime/framework} are you using?"
  - If multiple potential areas: "Is the issue in {area_A} or {area_B}?"
- [ ] 8.4 Create progressive investigation mode:
  - Start with highest probability hypothesis
  - If hypothesis eliminated, ask: "Hypothesis 1 eliminated. Investigate Hypothesis 2 next?"
  - If partial confirmation: "Hypothesis 1 partially explains the issue. Should I continue investigating contributing factors?"
  - If all hypotheses eliminated: "All initial hypotheses eliminated. Should I generate new hypotheses based on findings?"
- [ ] 8.5 Add investigation depth control:
  - Quick mode: Only test highest probability hypothesis
  - Standard mode: Test top 3 hypotheses
  - Deep mode: Test all hypotheses, generate new ones if needed
  - Allow user to control depth: "Continue deeper investigation or stop here?"
- [ ] **VERIFY 8:** Interactive workflow requests user input at appropriate points, confirms actions, provides investigation control

---

## Phase 9: Testing & Validation

**Objective:** Comprehensive testing across debugging scenarios, languages, and edge cases

### 9.1 Unit Testing
- [ ] 9.1.1 Test session ID generation (uniqueness, format)
- [ ] 9.1.2 Test hypothesis ranking algorithm (evidence weighting)
- [ ] 9.1.3 Test artifact generation (all 4 artifact types validate)
- [ ] 9.1.4 Test model selection logic (Sonnet vs Opus triggers)
- [ ] 9.1.5 Test risk assessment classification
- [ ] 9.1.6 Test severity classification logic

### 9.2 Debugging Scenario Testing
- [ ] 9.2.1 Test error debugging with TypeError in JavaScript
  - Provide stack trace
  - Verify hypothesis generation
  - Check root cause identification
  - Validate fix suggestion
- [ ] 9.2.2 Test performance debugging with N+1 query in Python
  - Provide slow endpoint
  - Verify bottleneck identification
  - Check optimization plan
  - Validate impact estimation
- [ ] 9.2.3 Test behavior debugging with off-by-one error
  - Provide expected vs actual behavior
  - Verify logic error detection
  - Check control flow tracing
  - Validate fix correctness
- [ ] 9.2.4 Test flaky test debugging
  - Provide intermittent test failure
  - Verify flakiness root cause detection
  - Check test isolation analysis
  - Validate fix for determinism
- [ ] 9.2.5 Test memory leak debugging (Opus model)
  - Provide memory growth symptoms
  - Verify Opus model selection
  - Check object lifecycle analysis
  - Validate cleanup recommendations
- [ ] 9.2.6 Test race condition debugging (Opus model)
  - Provide concurrency issue symptoms
  - Verify Opus model selection
  - Check thread interaction analysis
  - Validate synchronization fix

### 9.3 Cross-Language Testing
- [ ] 9.3.1 Test debugging TypeScript/JavaScript projects
- [ ] 9.3.2 Test debugging Python projects
- [ ] 9.3.3 Test debugging Java projects
- [ ] 9.3.4 Test debugging Go projects
- [ ] 9.3.5 Test debugging Rust projects

### 9.4 Integration Testing
- [ ] 9.4.1 Test /debug → Debug Agent invocation
- [ ] 9.4.2 Test Debug Agent → artifact generation
- [ ] 9.4.3 Test fix-suggestion.md → /fix command consumption
- [ ] 9.4.4 Test session resumption (interrupted debugging)
- [ ] 9.4.5 Test proactive agent suggestions

### 9.5 Edge Case Testing
- [ ] 9.5.1 Test with incomplete stack traces
- [ ] 9.5.2 Test with intermittent issues (cannot reliably reproduce)
- [ ] 9.5.3 Test with multiple potential root causes
- [ ] 9.5.4 Test with obfuscated/minified code
- [ ] 9.5.5 Test with very large stack traces (>1000 lines)
- [ ] 9.5.6 Test when all hypotheses are eliminated (needs new hypotheses)

- [ ] **VERIFY 9:** All test cases pass, Debug Agent handles edge cases gracefully, artifacts are accurate and actionable

---

## Phase 10: Documentation & Polish

**Objective:** Create comprehensive documentation and refine debugging experience

- [ ] 10.1 Create agent documentation at `docs/agents/debug.md`:
  - Overview of Debug Agent purpose and capabilities
  - Hypothesis-driven debugging methodology explanation
  - When to use Debug Agent vs manual debugging
  - Integration with /debug command
  - Tool access explanation (why Write and AskUser are included)
  - Model selection criteria (Sonnet vs Opus)
- [ ] 10.2 Document debugging workflow:
  - Step-by-step workflow from problem to fix
  - Hypothesis generation and ranking
  - Investigation timeline tracking
  - Root cause documentation
  - Fix application process
- [ ] 10.3 Create artifact schema documentation:
  - JSON schemas for each artifact type
  - Field descriptions and constraints
  - Example artifacts for each debugging scenario
  - Cross-referencing between artifacts
- [ ] 10.4 Add debugging best practices guide:
  - "How to write a good problem statement"
  - "Providing useful reproduction steps"
  - "When to use which /debug sub-command"
  - "Interpreting hypothesis probability rankings"
  - "Evaluating fix risk levels"
  - "When to apply fixes vs manual review"
- [ ] 10.5 Create example debugging sessions:
  - Example: Debugging a NullPointerException
  - Example: Debugging a performance bottleneck
  - Example: Debugging a flaky test
  - Example: Debugging a memory leak (Opus)
  - Example: Debugging a race condition (Opus)
  - Include full artifacts for each example
- [ ] 10.6 Add inline help and error messages:
  - Clear progress indicators: "Testing hypothesis 2/5..."
  - Helpful error messages: "Cannot reproduce issue. Please provide reproduction steps."
  - Guidance on next steps: "Hypothesis eliminated. Investigating next hypothesis..."
  - Artifact generation confirmation: "Generated debug-log.md, root-cause.md, fix-suggestion.md"
- [ ] 10.7 Polish artifact formatting:
  - Consistent markdown formatting
  - Syntax highlighting for code blocks
  - Clear section headers with visual hierarchy
  - Collapsible sections for long investigations (if supported)
  - Clickable file paths (where supported)
  - Color-coded severity levels (if supported)
- [ ] 10.8 Create troubleshooting guide:
  - "Debug session not finding root cause" → Generate new hypotheses, increase depth
  - "Fix suggestion too risky" → Use manual review workflow
  - "Cannot reproduce issue" → Use debug:behavior with state analysis
  - "Multiple root causes" → Prioritize by severity, fix highest impact first
  - "Agent stuck in investigation" → Timeout handling, graceful summary

- [ ] **VERIFY 10:** Documentation is comprehensive and clear, examples are accurate and helpful, user experience is polished

---

## Success Criteria

### Functional Requirements
- [ ] Debug Agent configuration file exists at `.claude/agents/debug.md` with valid YAML
- [ ] Agent supports all required tools: Read, Grep, Glob, Bash, Write, AskUser
- [ ] Agent generates all 4 primary artifacts: debug-log.md, root-cause.md, fix-suggestion.md, hypothesis.md
- [ ] Hypothesis generation produces 3-5 ranked hypotheses with testing approaches
- [ ] Investigation timeline logs actions chronologically with timestamps
- [ ] Root cause identification includes supporting evidence and severity classification
- [ ] Fix suggestions include code changes, risk assessment, and testing strategy
- [ ] All artifacts validate against defined schemas (YAML frontmatter is valid)

### Model Requirements
- [ ] Sonnet 4.5 is default model for standard debugging scenarios
- [ ] Opus 4.5 is used for memory debugging (object lifecycle analysis)
- [ ] Opus 4.5 is used for concurrency debugging (thread interaction analysis)
- [ ] Model selection is automatic based on debugging scenario keywords
- [ ] Model upgrade is logged in session metadata and debug artifacts

### Quality Requirements
- [ ] Hypothesis probability ranking accuracy > 70% (highest-ranked hypothesis is root cause in 70%+ cases)
- [ ] Root cause identification success rate > 80% for reproducible issues
- [ ] Fix suggestion confidence "high" results in working fix > 90% of time
- [ ] Investigation completes within reasonable time (< 5 minutes for standard scenarios)
- [ ] Artifacts are human-readable, well-formatted, and actionable

### Usability Requirements
- [ ] Clear progress indicators during investigation ("Testing hypothesis 2/5...")
- [ ] Interactive prompts request user confirmation at appropriate points
- [ ] Helpful error messages when debugging cannot proceed
- [ ] Risk assessment clearly communicates fix safety level
- [ ] Hypothesis testing approach provides actionable, specific steps

### Integration Requirements
- [ ] Debug Agent integrates with all 8 /debug sub-commands
- [ ] Artifacts include session-id for cross-referencing
- [ ] fix-suggestion.md format is consumable by /fix command
- [ ] Proactive agent suggestions trigger on appropriate user input patterns
- [ ] Session resumption works for interrupted debugging sessions

### Testing Requirements
- [ ] All unit tests pass (session management, hypothesis ranking, artifact generation)
- [ ] All debugging scenarios tested (error, performance, behavior, test, memory, network, concurrency, data)
- [ ] Tested across TypeScript, Python, Java, Go, and Rust projects
- [ ] Edge cases handled gracefully (incomplete info, intermittent issues, multiple causes, eliminated hypotheses)
- [ ] Integration with /debug command and /fix command tested end-to-end

### Documentation Requirements
- [ ] Agent documentation explains methodology and capabilities
- [ ] Debugging workflow documented with step-by-step guide
- [ ] Artifact schemas fully documented with examples
- [ ] Best practices guide provides actionable advice
- [ ] Example debugging sessions demonstrate common scenarios
- [ ] Troubleshooting guide addresses common issues
