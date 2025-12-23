# Implementation Plan: Implement Review Agent

## Overview
- **Goal:** Create a specialized Review Agent that provides proactive, context-aware code review with structured feedback for PRs, diffs, and commits
- **Priority:** P0 (CRITICAL - Core agent for automated code quality enforcement)
- **Created:** {{date}}
- **Output:** `docs/plan-outputs/implement-review-agent/`
- **Model:** Sonnet 4.5 (balanced code review capabilities)
- **Category:** Agents & Automation

> Implement a custom agent (subagent) that acts as a specialized code reviewer, proactively analyzing code changes for quality, security, performance, and maintainability. The agent operates with read-only tools, generates structured artifacts (review-comments.md, suggestions.json), and integrates seamlessly with the /review command system for comprehensive code review workflows.

---

## Phase 1: Agent Configuration & Infrastructure

**Objective:** Establish the Review Agent configuration file, system prompt foundation, and output structure

- [ ] 1.1 Create agent configuration file at `.claude/agents/review.md`
  - Set name to `review` (lowercase, hyphen-separated)
  - Write description: "Expert code review specialist for PRs, diffs, and commits. Proactively reviews code for quality, security, performance, and maintainability. Use after code changes, before commits, or when opening PRs."
  - Configure tools (read-only): `Read, Grep, Glob, Bash`
  - Set model to `sonnet` (balanced capability for code review)
  - Set permissionMode to `default` (read-only operations)
- [ ] 1.2 Design base system prompt structure
  - Define role: "You are a senior code reviewer with expertise in software quality, security, and best practices"
  - Include automatic workflow trigger: "When invoked, immediately begin code review process"
  - Add 4-phase workflow: Context Gathering → Analysis → Feedback Generation → Artifact Creation
  - Include instruction: "Always generate review-comments.md and suggestions.json artifacts"
  - Add constraints: "Read-only analysis, non-blocking feedback by default"
- [ ] 1.3 Implement context gathering instructions
  - Auto-detect review scope (PR number, diff ref, or file path)
  - Run `git diff` to identify changed files
  - Parse changed file list and focus review on modifications
  - Extract project conventions from existing codebase patterns
  - Identify language-specific standards (linting configs, style guides)
- [ ] 1.4 Set up output directory structure
  - Create `docs/plan-outputs/implement-review-agent/` directory
  - Set up subdirectories: `artifacts/`, `findings/`, `verification/`, `sessions/`
  - Initialize `status.json` tracking file
  - Create artifact schema documentation
- [ ] 1.5 Define agent invocation triggers
  - Proactive triggers: "review my changes", "check this code", "PR review needed"
  - Explicit triggers: "Use the review agent", "Have the reviewer check this"
  - Context-based triggers: After git operations, before commits
  - Integration triggers: Called by /review command
- [ ] **VERIFY 1:** Agent configuration validates, system prompt triggers automatic review workflow, output directories created

---

## Phase 2: Code Analysis Framework

**Objective:** Implement systematic code analysis capabilities with category-specific detectors

- [ ] 2.1 Build bug detection system
  - Null/undefined reference checks (missing null guards, optional chaining)
  - Type mismatch detection (incorrect type usage, missing type guards)
  - Logic errors (off-by-one, incorrect conditionals, unreachable code)
  - Error handling gaps (missing try-catch, unhandled promises, silent failures)
  - API contract violations (incorrect parameter usage, missing required fields)
- [ ] 2.2 Build security analysis system
  - Credential exposure detection (hardcoded passwords, API keys, tokens)
  - Injection vulnerability detection (SQL injection, XSS, command injection)
  - Authentication/authorization checks (missing access controls, weak auth)
  - Insecure cryptography (weak algorithms, hardcoded keys, improper IV)
  - Input validation gaps (missing sanitization, unsafe deserialization)
  - Reference OWASP Top 10 in findings
- [ ] 2.3 Build performance analysis system
  - Algorithmic complexity detection (O(n²) loops, nested iterations)
  - N+1 query detection (database queries in loops, missing eager loading)
  - Memory leak patterns (unclosed resources, event listener leaks, circular refs)
  - Blocking operations (synchronous I/O in async contexts, missing await)
  - Caching opportunities (repeated computations, redundant API calls)
- [ ] 2.4 Build maintainability analysis system
  - Code complexity metrics (cyclomatic complexity >10, cognitive complexity >15)
  - Code duplication detection (copy-paste code, similar patterns)
  - Naming convention checks (unclear names, inconsistent patterns)
  - Function/method length checks (>50 lines warning, >100 lines critical)
  - Documentation gaps (missing docstrings, unclear comments)
- [ ] 2.5 Build style compliance system
  - Detect linting configuration files (ESLint, Prettier, TSLint, Pylint)
  - Parse project-specific style guides (CONTRIBUTING.md, CODING_STANDARDS.md)
  - Check naming conventions (camelCase, PascalCase, snake_case consistency)
  - Verify import/export patterns
  - Check indentation and formatting consistency
- [ ] 2.6 Implement severity classification logic
  - Critical: Security vulnerabilities, data loss risks, system breaking bugs
  - High: Major functionality broken, significant performance issues
  - Medium: Feature degradation, moderate quality issues
  - Low: Style violations, minor improvements
  - Info: Suggestions, best practice recommendations
- [ ] **VERIFY 2:** All detection systems identify real issues in test code, severity classification is accurate and consistent

---

## Phase 3: Feedback Generation System

**Objective:** Generate structured, actionable feedback with code suggestions and prioritization

- [ ] 3.1 Implement comment structure generator
  - Group comments by file (organize by path)
  - Sort by severity within each file (Critical → Info)
  - Include line number ranges for each comment
  - Add category badges (Bug, Security, Performance, Maintainability, Style)
  - Format code snippets with syntax highlighting
  - Include "Why this matters" explanations
- [ ] 3.2 Implement suggestion generator
  - Generate before/after code examples
  - Include rationale for each suggestion
  - Add auto_fixable flag (true if /fix can apply automatically)
  - Estimate effort (trivial, small, medium, large)
  - Provide alternative approaches when applicable
  - Link to documentation/best practices
- [ ] 3.3 Implement blocker detection logic
  - Filter Critical and High severity issues
  - Classify as blockers: security vulnerabilities, breaking bugs, data loss
  - Non-blockers: performance issues, maintainability, style
  - Generate clear blocking criteria
  - Include verification steps for fixes
  - Add escalation guidance for edge cases
- [ ] 3.4 Implement context-aware feedback
  - Adapt to project patterns (if project uses pattern X, recommend X)
  - Reference project-specific conventions
  - Consider language idioms (TypeScript vs JavaScript, Python 2 vs 3)
  - Adjust strictness based on file type (production vs test vs scripts)
  - Respect existing architectural decisions
- [ ] 3.5 Build priority ranking system
  - Rank by: severity × impact × likelihood
  - Separate "must fix" from "should fix" from "nice to have"
  - Create top 3-5 critical issues summary
  - Identify quick wins (low effort, high impact)
  - Estimate total remediation time
- [ ] **VERIFY 3:** Feedback is actionable, code suggestions are valid, prioritization makes sense, context-awareness works

---

## Phase 4: Artifact Generation System

**Objective:** Generate structured artifacts that integrate with /review command and CI/CD pipelines

### 4.1 review-comments.md Artifact

- [ ] 4.1.1 Create markdown template with YAML frontmatter
  - artifact-type: review-comments
  - scope: [PR number | diff ref | file path]
  - timestamp: ISO-8601 format
  - reviewer: review-agent
  - model: claude-sonnet-4-5
- [ ] 4.1.2 Implement summary section generator
  - Files changed count
  - Total comments count
  - Breakdown by severity (Critical: X, High: Y, ...)
  - Breakdown by category (Bug: X, Security: Y, ...)
  - Blockers count
  - Overall assessment (Approve | Request Changes | Comment)
- [ ] 4.1.3 Implement file-by-file comment generator
  - File path as header (with language hint)
  - Line ranges for each issue
  - Severity and category badges
  - Issue description with context
  - Code snippets (current code)
  - Suggested fix (code example)
  - Rationale (why the suggestion improves code)
- [ ] 4.1.4 Add navigation helpers
  - Table of contents for files reviewed
  - Quick links to blockers
  - Summary statistics at top
  - Markdown checkboxes for tracking fixes

### 4.2 suggestions.json Artifact

- [ ] 4.2.1 Define JSON schema v1.0
  - version: "1.0"
  - summary: { total, by_severity{}, by_category{} }
  - suggestions: [{ id, file, line_start, line_end, severity, category, title, current_code, suggested_code, rationale, auto_fixable, estimated_effort }]
- [ ] 4.2.2 Implement suggestion ID generation
  - Format: `{file-hash}-{line}-{category}-{index}`
  - Ensure uniqueness across review session
  - Enable cross-referencing with review-comments.md
  - Support tracking fixes across iterations
- [ ] 4.2.3 Implement auto_fixable classification
  - Simple replacements: auto_fixable = true
  - Requires context/logic changes: auto_fixable = false
  - Add fix_approach field (replace, insert, delete, refactor)
  - Include confidence level (high, medium, low)
- [ ] 4.2.4 Add schema validation
  - Validate against JSON Schema before writing
  - Check required fields present
  - Verify severity/category enums valid
  - Ensure line numbers are positive integers
  - Validate file paths exist

### 4.3 blockers.md Artifact (Optional - only if blockers found)

- [ ] 4.3.1 Create blockers template with frontmatter
  - artifact-type: blockers
  - blocker-count: X
  - severity-threshold: critical,high
  - merge-recommendation: BLOCK
- [ ] 4.3.2 Implement blocker listing
  - Number each blocker (1, 2, 3, ...)
  - Include file path and line range
  - Severity and category
  - Description of why it blocks merge
  - Required fix with code example
  - Verification steps
  - Impact if not fixed
- [ ] 4.3.3 Add merge gate integration
  - CI/CD exit code guidance
  - GitHub status check format
  - Clear pass/fail criteria
  - Override instructions (if emergency merge needed)

### 4.4 Artifact Cross-Referencing

- [ ] 4.4.1 Implement consistent ID scheme
  - Use same IDs across review-comments.md and suggestions.json
  - Link blockers.md items to detailed comments
  - Enable artifact-to-code traceability
- [ ] 4.4.2 Add metadata consistency
  - Same timestamp across artifacts
  - Same scope/PR number references
  - Same session identifier
  - Version compatibility markers

- [ ] **VERIFY 4:** All artifacts validate against schemas, cross-references work, artifacts contain complete information

---

## Phase 5: Integration with /review Command

**Objective:** Seamless integration between Review Agent and /review command system

- [ ] 5.1 Define agent-to-command workflow
  - Agent generates artifacts in standard format
  - /review command can consume agent-generated artifacts
  - Agent can be invoked by /review sub-commands
  - Shared artifact schemas ensure compatibility
- [ ] 5.2 Implement /review command invocation
  - /review:pr invokes Review Agent for PR analysis
  - /review:diff invokes Review Agent for diff analysis
  - /review:file invokes Review Agent for single-file review
  - Agent receives parameters from command (pr_number, ref, file_path)
  - Agent returns artifacts to command for post-processing
- [ ] 5.3 Create artifact consumption interface
  - /review commands can parse agent-generated JSON
  - /review commands can format markdown for display
  - /review commands can post artifacts to GitHub (via gh CLI)
  - /review commands can generate summary reports
- [ ] 5.4 Implement proactive invocation patterns
  - Agent auto-triggers on git operations (commit, push, PR creation)
  - Agent suggests review when large code changes detected
  - Agent offers to run specific review types (security, performance)
  - Claude delegates review tasks to agent automatically
- [ ] 5.5 Add session management
  - Generate unique session ID for each review
  - Store session context (scope, parameters, timestamp)
  - Enable review continuation/updates
  - Track review iterations (v1, v2, v3)
- [ ] **VERIFY 5:** Agent integrates with /review commands, proactive invocation works, session tracking functions

---

## Phase 6: GitHub Integration & CI/CD

**Objective:** Enable automated PR reviews and merge blocking via GitHub and CI/CD pipelines

- [ ] 6.1 Implement GitHub PR comment posting
  - Parse review-comments.md for posting
  - Use `gh pr comment` to post review
  - Format for GitHub markdown rendering
  - Include links to full artifacts (if stored)
  - Add review metadata (agent version, timestamp)
- [ ] 6.2 Implement GitHub PR review status
  - Map severity levels to review decision (APPROVE, REQUEST_CHANGES, COMMENT)
  - Use `gh pr review` to set status
  - Block merges when blockers.md exists and has critical issues
  - Post review summary as PR review comment
  - Update status checks
- [ ] 6.3 Create GitHub Actions workflow template
  - Trigger on PR open/update events
  - Run Review Agent on PR changes
  - Post artifacts as PR comments
  - Set review status
  - Upload artifacts as workflow artifacts
  - Add status check integration
- [ ] 6.4 Implement CI/CD exit codes
  - Exit 0: No blockers (approve/comment)
  - Exit 1: Blockers found (request changes)
  - Exit 2: Review error/incomplete
  - Support --fail-on severity threshold
  - Generate machine-readable output for CI
- [ ] 6.5 Create pre-commit hook template
  - Run Review Agent on staged changes (`--staged`)
  - Quick mode (<10s) for pre-commit
  - Display critical issues only
  - Allow skip with SKIP_REVIEW env var
  - Colorized terminal output
- [ ] 6.6 Create pre-push hook template
  - Run Review Agent on branch changes
  - Compare against origin/main
  - Block push if critical issues found
  - Show summary of issues
  - Confirmation prompt for warnings
- [ ] **VERIFY 6:** GitHub integration posts comments correctly, CI/CD pipelines work, hooks trigger appropriately

---

## Phase 7: System Prompt Refinement

**Objective:** Create comprehensive, effective system prompt for optimal agent behavior

- [ ] 7.1 Write opening role definition
  - "You are a senior code reviewer specializing in software quality, security, and maintainability"
  - "Your goal is to provide actionable, constructive feedback that improves code quality"
  - "You operate with read-only tools and generate structured artifacts"
- [ ] 7.2 Define automatic workflow
  - "When invoked, immediately begin the code review process:"
  - "1. Context Gathering: Run git diff to identify changed files"
  - "2. Scope Detection: Determine PR number, diff ref, or file path from context"
  - "3. Analysis: Review code for bugs, security, performance, maintainability, style"
  - "4. Feedback: Generate structured comments with severity, category, suggestions"
  - "5. Artifacts: Create review-comments.md and suggestions.json"
- [ ] 7.3 Add review checklist
  - Code clarity and readability
  - Proper naming conventions
  - No code duplication
  - Appropriate error handling
  - No exposed secrets or credentials
  - Input validation and sanitization
  - Performance considerations
  - Test coverage adequacy
  - Documentation quality
  - Adherence to project conventions
- [ ] 7.4 Define feedback organization
  - "Organize feedback by priority: Critical → High → Medium → Low → Info"
  - "Group comments by file for clarity"
  - "Provide specific code examples for all suggestions"
  - "Explain the 'why' behind each recommendation"
  - "Be constructive and educational, not just critical"
- [ ] 7.5 Add artifact generation instructions
  - "Always generate review-comments.md with complete summary and file-by-file comments"
  - "Always generate suggestions.json with structured, machine-readable suggestions"
  - "Generate blockers.md only if critical or high severity issues found"
  - "Ensure all artifacts use consistent IDs and cross-reference correctly"
  - "Validate JSON artifacts against schema before writing"
- [ ] 7.6 Include context-awareness guidance
  - "Adapt to project-specific patterns and conventions"
  - "Respect existing architectural decisions"
  - "Reference detected linting rules and style guides"
  - "Consider language-specific idioms and best practices"
  - "Adjust strictness based on file type (production vs test)"
- [ ] 7.7 Add constraints and best practices
  - "Use only read-only tools (Read, Grep, Glob, Bash)"
  - "Do not modify files - only analyze and suggest"
  - "Non-blocking feedback by default (informational)"
  - "Focus on changed lines, but consider surrounding context"
  - "Limit review to reasonable scope (avoid reviewing entire codebase)"
  - "If scope is too large (>50 files), suggest focusing on critical areas"
- [ ] **VERIFY 7:** System prompt is comprehensive, clear workflow defined, constraints are explicit

---

## Phase 8: Testing & Validation

**Objective:** Comprehensive testing across languages, frameworks, and review scenarios

### 8.1 Unit Testing

- [ ] 8.1.1 Test agent configuration loading
  - Verify .claude/agents/review.md loads correctly
  - Validate YAML frontmatter parsing
  - Check tool restrictions applied
  - Confirm model selection (sonnet)
- [ ] 8.1.2 Test context gathering
  - Mock git diff output
  - Verify changed file detection
  - Test convention extraction
  - Validate scope determination

### 8.2 Scenario Testing

- [ ] 8.2.1 Test PR review scenario
  - Create test PR with various issues
  - Invoke agent with PR number
  - Verify all issue categories detected
  - Check artifacts generated correctly
  - Validate severity classification
- [ ] 8.2.2 Test diff review scenario
  - Create git diff with staged changes
  - Invoke agent with --staged flag
  - Verify only changed lines reviewed
  - Check context understanding
  - Validate suggestions map to diff
- [ ] 8.2.3 Test file review scenario
  - Provide single file with multiple issues
  - Invoke agent with file path
  - Verify deep analysis performed
  - Check complexity metrics included
  - Validate refactoring suggestions
- [ ] 8.2.4 Test security focus scenario
  - Code with SQL injection, XSS, credential exposure
  - Invoke agent with security focus
  - Verify all vulnerabilities detected
  - Check OWASP references included
  - Validate severity is critical/high

### 8.3 Cross-Language Testing

- [ ] 8.3.1 Test TypeScript/JavaScript review
  - Test with React, Node.js code
  - Verify TypeScript type issues detected
  - Check async/await patterns reviewed
  - Validate npm package security
- [ ] 8.3.2 Test Python review
  - Test with Django, Flask code
  - Verify PEP8 compliance checked
  - Check type hints reviewed
  - Validate SQL injection detection
- [ ] 8.3.3 Test Go review
  - Test with standard Go patterns
  - Verify error handling reviewed
  - Check goroutine safety
  - Validate interface usage
- [ ] 8.3.4 Test Java review
  - Test with Spring Boot code
  - Verify exception handling
  - Check resource management
  - Validate thread safety

### 8.4 Integration Testing

- [ ] 8.4.1 Test agent invocation from /review command
  - /review:pr calls agent correctly
  - Parameters passed properly
  - Artifacts returned to command
  - Command can post-process artifacts
- [ ] 8.4.2 Test proactive invocation
  - Agent triggers on "review my changes"
  - Agent activates on "check this code"
  - Agent delegates automatically when appropriate
  - Agent does not over-trigger
- [ ] 8.4.3 Test GitHub integration
  - gh pr comment posts correctly
  - gh pr review sets status correctly
  - Artifacts render properly in GitHub
  - Links and formatting work
- [ ] 8.4.4 Test CI/CD integration
  - GitHub Actions workflow runs
  - Exit codes correct
  - Status checks update
  - Artifacts uploaded

### 8.5 Edge Case Testing

- [ ] 8.5.1 Test with very large PRs (>100 files)
  - Agent handles gracefully
  - Suggests focusing scope
  - Performance acceptable (<5min)
- [ ] 8.5.2 Test with no issues found
  - Agent generates positive feedback
  - Artifacts still created (empty suggestions)
  - No false positives
- [ ] 8.5.3 Test with binary files in diff
  - Agent skips binary files
  - No errors generated
  - Reports files skipped
- [ ] 8.5.4 Test with obfuscated/minified code
  - Agent identifies as minified
  - Skips detailed review
  - Suggests reviewing source

- [ ] **VERIFY 8:** All tests pass, edge cases handled, cross-language support works, integrations function

---

## Phase 9: Documentation & Polish

**Objective:** Create comprehensive documentation and refine user experience

- [ ] 9.1 Create agent usage documentation
  - Overview of Review Agent capabilities
  - When the agent is invoked (triggers)
  - How to use with /review command
  - How to use standalone (natural language)
  - Integration with GitHub and CI/CD
- [ ] 9.2 Document artifact schemas
  - review-comments.md format with examples
  - suggestions.json schema with examples
  - blockers.md format with examples
  - Schema versioning and compatibility
- [ ] 9.3 Create best practices guide
  - "When to use Review Agent vs manual review"
  - "Interpreting severity levels"
  - "Acting on suggestions"
  - "Customizing review focus"
  - "Integrating with team workflow"
- [ ] 9.4 Add troubleshooting section
  - "Agent not triggering proactively" → use explicit invocation
  - "Too many false positives" → adjust severity threshold
  - "Review taking too long" → reduce scope
  - "GitHub integration not working" → check gh CLI auth
- [ ] 9.5 Create example review sessions
  - Example 1: TypeScript React PR review
  - Example 2: Python security-focused review
  - Example 3: Go performance review
  - Example 4: Pre-commit hook review
  - Include sample artifacts for each
- [ ] 9.6 Polish agent configuration file
  - Clear, concise description
  - Well-structured system prompt
  - Inline comments explaining sections
  - Version metadata
- [ ] 9.7 Add inline help and guidance
  - Progress indicators during review
  - Clear status messages
  - Helpful error messages
  - Suggestions for next steps
- [ ] **VERIFY 9:** Documentation complete, examples work, troubleshooting covers common issues, user experience polished

---

## Success Criteria

### Functional Requirements
- [ ] Review Agent configuration file (`.claude/agents/review.md`) is valid and loads correctly
- [ ] Agent has read-only tool access (Read, Grep, Glob, Bash)
- [ ] Agent uses Sonnet model for balanced performance
- [ ] Agent automatically detects review scope (PR, diff, or file)
- [ ] Agent analyzes code for 5 categories: Bug, Security, Performance, Maintainability, Style
- [ ] Agent classifies findings by severity: Critical, High, Medium, Low, Info
- [ ] Agent generates review-comments.md with structured feedback
- [ ] Agent generates suggestions.json with machine-readable suggestions
- [ ] Agent generates blockers.md when critical/high issues found
- [ ] Artifacts validate against defined schemas

### Integration Requirements
- [ ] Agent integrates with /review command system
- [ ] /review:pr, /review:diff, /review:file can invoke agent
- [ ] Agent can be invoked proactively via natural language
- [ ] Agent triggers automatically on appropriate tasks
- [ ] Agent posts comments to GitHub PRs via gh CLI
- [ ] Agent sets PR review status (APPROVE, REQUEST_CHANGES, COMMENT)
- [ ] GitHub Actions workflow template works end-to-end
- [ ] Pre-commit and pre-push hooks function correctly

### Quality Requirements
- [ ] Bug detection accuracy >80% (few false positives)
- [ ] Security vulnerability detection covers OWASP Top 10
- [ ] Performance issue detection identifies common bottlenecks
- [ ] Severity classification is consistent and accurate
- [ ] Code suggestions are valid and actionable
- [ ] auto_fixable flag is accurate (>90% of marked suggestions can be auto-fixed)
- [ ] Review completes in reasonable time (<2min for typical PRs)
- [ ] Context-awareness adapts to project conventions

### Usability Requirements
- [ ] Clear progress indicators during review
- [ ] Feedback is constructive and educational
- [ ] Suggestions include code examples
- [ ] Rationales explain "why" behind recommendations
- [ ] Artifacts are human-readable and well-formatted
- [ ] Documentation covers all features with examples
- [ ] Troubleshooting guide addresses common issues

### Testing Requirements
- [ ] All unit tests pass (configuration, context gathering)
- [ ] Scenario tests pass (PR, diff, file, security focus)
- [ ] Cross-language tests pass (TypeScript, Python, Go, Java)
- [ ] Integration tests pass (command, GitHub, CI/CD)
- [ ] Edge case tests pass (large PRs, no issues, binary files)
- [ ] No regressions in existing /review command functionality

### Documentation Requirements
- [ ] Agent usage documentation complete with examples
- [ ] Artifact schemas documented with sample outputs
- [ ] Best practices guide explains workflows
- [ ] Troubleshooting section covers common issues
- [ ] Example review sessions demonstrate capabilities
- [ ] Configuration file includes inline comments
