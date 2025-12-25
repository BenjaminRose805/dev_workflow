# Implementation Plan: Implement /review Command

## Overview
- **Goal:** Create a comprehensive code review command with 7 sub-commands for automated PR reviews, diff analysis, security audits, and quality checks
- **Priority:** P0 (pr, diff, file), P1 (commit, standards, security, performance)
- **Created:** 2025-12-22
- **Output:** `docs/plan-outputs/review-command/`

> Implement the /review command system that provides intelligent code review capabilities for pull requests, diffs, commits, and files. Supports automated bug detection, security analysis, performance optimization, and standards compliance checking. Generates structured artifacts including review comments, suggestions, summaries, and merge blockers.

### Sub-Command Priorities

| Sub-Command | Priority | Scope | Description |
|-------------|----------|-------|-------------|
| `review:pr` | P0 | MVP | Pull request review with bug/security/quality detection |
| `review:diff` | P0 | MVP | Git diff analysis for staged and unstaged changes |
| `review:file` | P0 | MVP | Deep single-file analysis with complexity and refactoring suggestions |
| `review:commit` | P1 | Core | Commit history and message quality analysis |
| `review:standards` | P1 | Core | Coding standards compliance checking against ESLint/Prettier |
| `review:security` | P1 | Core | Security-focused review with OWASP Top 10 and threat modeling |
| `review:performance` | P1 | Core | Performance bottleneck detection and optimization suggestions |

---

## Dependencies

### Upstream
- `/explore` - Uses codebase understanding for context-aware reviews
- `/analyze` - Consumes analysis findings to inform review comments
- Project coding standards (ESLint, Prettier configs)

### Downstream
- `/fix` - Generates fixes based on review suggestions
- `/implement` - Uses review feedback to guide implementation changes
- GitHub/GitLab PR integration (comment posting)

### External Tools
- `gh` CLI - GitHub PR interactions
- Git - Diff parsing, commit history
- ESLint/Prettier - Standards detection

---

## Command Boundaries

### Scope Definition
The `/review` command focuses on **AI-powered code review with subjective suggestions**. It interprets code quality and provides constructive improvement recommendations.

### Primary Focus
- **AI-powered review**: Intelligent interpretation of code patterns and practices
- **Subjective suggestions**: Refactoring recommendations, best practice guidance
- **Contextual feedback**: Consider project patterns, team conventions, and codebase context
- **PR/diff-centric**: Focused on changes rather than full codebase

### Relationship to Other Commands

| Command | Scope | Key Differentiator |
|---------|-------|-------------------|
| `/analyze` | Automated metrics and patterns | **Objective, tool-driven findings** - produces raw data |
| `/review` | AI-powered suggestions | **Subjective, improvement-focused** - interprets and suggests |
| `/audit` | Compliance verification | **Policy-driven, evidence-based** - validates against standards |

### Boundary Rules
1. `/review` **interprets and suggests**, `/analyze` **measures and detects**
2. `/review` uses AI reasoning for quality assessment, `/analyze` uses static tools
3. `/review` generates suggestions.json + review-comments.md, `/analyze` generates metrics.json
4. Security in `/review:security` is about code improvement; in `/audit:security` is about compliance

### When to Use /review vs /analyze vs /audit

| Scenario | Use This Command | Rationale |
|----------|------------------|-----------|
| "Is this PR ready to merge?" | `/review:pr` | Holistic assessment |
| "How can I improve this code?" | `/review:file` | Subjective suggestions |
| "What's my code complexity?" | `/analyze:quality` | Objective metrics |
| "Are we SOC2 compliant?" | `/audit:compliance` | Policy verification |
| "Review my security practices" | `/review:security` | Improvement suggestions |
| "Check for vulnerabilities" | `/analyze:security` | Pattern detection |

---

## Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Overly critical reviews | High - Developer frustration | Medium | Balance criticism with praise, use constructive tone |
| Missing context in diff reviews | Medium - Invalid suggestions | Medium | Expand context window, cross-reference related files |
| GitHub API rate limits | Medium - Interrupted workflows | Low | Implement caching, batch comment posting |
| Large PR performance | High - Timeouts on 500+ line PRs | Medium | Implement chunked analysis, depth parameter |
| False positive suggestions | Medium - User trust erosion | Medium | Add confidence levels, allow feedback loops |

---

## Phase 1: Core Infrastructure

**Tasks:**
- [ ] 1.1 Create base command YAML at `.claude/commands/review.md`
  - Set model to `sonnet`
  - Configure allowed tools: `Read`, `Write`, `Glob`, `Grep`, `Bash`
  - Define category as "Analysis & Quality"
  - Set up sub-command structure for 7 sub-commands
- [ ] 1.2 Implement comment formatting system
  - Create markdown template for line-by-line comments
  - Define severity levels: critical, high, medium, low, info
  - Define categories: Bug, Security, Performance, Maintainability, Style
  - Add code snippet formatting with syntax highlighting
  - Include suggestion formatting with before/after examples
- [ ] 1.3 Create base system prompt template
  - Define role as code review expert with focus on actionable feedback
  - Include context-aware analysis (project patterns, conventions)
  - Add guidelines for non-blocking vs. blocking issues
  - Include best practices for constructive feedback
  - Add code quality heuristics and patterns
- [ ] 1.4 Set up output directory structure
  - Create `docs/plan-outputs/review-command/` directory
  - Set up subdirectories: `artifacts/`, `findings/`, `verification/`
  - Initialize `status.json` tracking file
  - Create artifact output directory structure
- [ ] 1.5 Implement review context gathering
  - Extract project conventions from existing code patterns
  - Identify language-specific best practices
  - Detect existing linting rules and configurations
  - Parse code style guides if present
  - Gather historical review patterns from past PRs

**VERIFY Phase 1:**
- [ ] Base YAML structure is valid, comment formatting renders correctly, context gathering identifies project conventions

## Phase 2: P0 Sub-Commands (Core Review Features)

### 2.1 review:pr - Pull Request Review

**Tasks:**
- [ ] 2.1.1 Implement PR data fetching
  - Integrate with `gh pr view` command for PR metadata
  - Extract changed files list from PR
  - Fetch PR description and context
  - Identify base and head branches
  - Parse PR labels and assignees
- [ ] 2.1.2 Implement diff analysis engine
  - Parse git diff output for changed lines
  - Identify added, modified, deleted code blocks
  - Extract context lines for better understanding
  - Track file-level and line-level changes
  - Map changes to functions/classes
- [ ] 2.1.3 Implement bug detection logic
  - Check for null/undefined handling issues
  - Identify potential race conditions
  - Detect resource leaks (unclosed connections, files)
  - Find error handling gaps
  - Check for off-by-one errors
  - Identify logic errors in conditionals
- [ ] 2.1.4 Implement security scanning
  - Detect SQL injection vulnerabilities
  - Identify XSS vulnerabilities
  - Check for insecure deserialization
  - Find hardcoded credentials/secrets
  - Check for CSRF vulnerabilities
  - Identify path traversal risks
- [ ] 2.1.5 Implement quality checks
  - Check code complexity (cyclomatic, cognitive)
  - Identify code duplication
  - Check function/method length
  - Verify naming conventions
  - Check for proper documentation
  - Identify code smells
- [ ] 2.1.6 Add focus parameter support
  - Implement `security` focus (deep security analysis)
  - Implement `performance` focus (optimization opportunities)
  - Implement `maintainability` focus (code quality, patterns)
  - Implement `all` focus (comprehensive review)
  - Allow focus to filter analysis depth
- [ ] 2.1.7 Add depth parameter support
  - Implement `quick` depth (critical issues only, <2min)
  - Implement `standard` depth (typical review, <5min)
  - Implement `deep` depth (comprehensive analysis, <10min)
  - Adjust analysis scope based on depth

**VERIFY 2.1:**
- [ ] PR reviews identify real issues, focus parameter correctly filters, depth parameter controls analysis time

### 2.2 review:diff - Git Diff Review

**Tasks:**
- [ ] 2.2.1 Implement diff source handling
  - Support `ref` parameter for comparison against branch/commit
  - Support `--staged` flag for reviewing staged changes
  - Default to working directory changes
  - Handle merge conflicts gracefully
  - Support diff of specific file paths
- [ ] 2.2.2 Implement incremental change analysis
  - Focus on changed lines with context
  - Identify incomplete implementations
  - Check for debugging code (console.log, debugger)
  - Verify test coverage for changes
  - Check for TODO/FIXME comments
- [ ] 2.2.3 Create diff-specific comment format
  - Map comments to specific line ranges
  - Include file context in comments
  - Show before/after code snippets
  - Add change rationale assessment
  - Highlight potential breaking changes

**VERIFY 2.2:**
- [ ] Diff reviews accurately map to changed lines, staged flag works correctly, comments are actionable

### 2.3 review:file - Deep File Analysis

**Tasks:**
- [ ] 2.3.1 Implement single-file deep analysis
  - Analyze file structure and organization
  - Check adherence to design patterns
  - Identify refactoring opportunities
  - Assess testability of code
  - Check for proper separation of concerns
- [ ] 2.3.2 Implement complexity analysis
  - Calculate cyclomatic complexity
  - Calculate cognitive complexity
  - Identify deeply nested code
  - Find long parameter lists
  - Check for god classes/functions
- [ ] 2.3.3 Generate refactoring suggestions
  - Suggest extract method opportunities
  - Identify duplicate code blocks
  - Recommend design pattern applications
  - Suggest dependency injection improvements
  - Highlight tight coupling issues
- [ ] 2.3.4 Create file-analysis.md artifact format
  - Structure with sections: Overview, Complexity, Issues, Refactoring
  - Include metrics visualization
  - Add priority-ordered recommendations
  - Show code examples for suggestions
  - Include estimated effort for changes
- [ ] 2.3.5 Create refactoring-suggestions.json artifact
  - Define schema: id, type, location, description, code, effort
  - Include before/after code snippets
  - Add refactoring pattern references
  - Include risk assessment for each suggestion
- [ ] 2.3.6 Create complexity-report.json artifact
  - Include cyclomatic complexity per function
  - Include cognitive complexity scores
  - Add nesting depth metrics
  - Include maintainability index
  - Add trend data if available

**VERIFY 2.3:**
- [ ] File analysis provides actionable insights, complexity metrics are accurate, refactoring suggestions are valid

## Phase 3: P1 Sub-Commands (Advanced Features)

### 3.1 review:commit - Commit History Review

**Tasks:**
- [ ] 3.1.1 Implement commit range parsing
  - Support `range` parameter (e.g., "HEAD~5..HEAD")
  - Support `count` parameter for N recent commits
  - Default to last 10 commits
  - Handle merge commits appropriately
  - Support filtering by author/date
- [ ] 3.1.2 Implement commit message analysis
  - Check adherence to conventional commits
  - Verify message clarity and completeness
  - Check for ticket/issue references
  - Identify vague or unhelpful messages
  - Verify co-author attribution format
- [ ] 3.1.3 Implement commit content analysis
  - Check commit size (lines changed)
  - Identify commits mixing concerns
  - Find missing test commits for features
  - Verify atomic commit principles
  - Check for accidental file inclusions
- [ ] 3.1.4 Create commit-analysis.md artifact
  - Summarize commit quality metrics
  - List problematic commits with reasons
  - Provide commit message improvement suggestions
  - Include best practices guide
- [ ] 3.1.5 Create commit-quality-report.json artifact
  - Define schema with per-commit scoring
  - Include metrics: message quality, size, atomicity
  - Add recommendations per commit
  - Include trend analysis

**VERIFY 3.1:**
- [ ] Commit analysis identifies quality issues, recommendations improve commit practices

### 3.2 review:standards - Standards Compliance Review

**Tasks:**
- [ ] 3.2.1 Implement standards detection
  - Parse ESLint/TSLint configuration
  - Parse Prettier configuration
  - Identify project-specific style guides
  - Detect language-specific conventions (PEP8, PSR, etc.)
  - Read CONTRIBUTING.md or CODING_STANDARDS.md if present
- [ ] 3.2.2 Implement compliance checking
  - Verify naming conventions (camelCase, PascalCase, snake_case)
  - Check file organization standards
  - Verify import/export conventions
  - Check documentation requirements
  - Verify test file naming patterns
- [ ] 3.2.3 Add scope parameter support
  - Implement `changed` scope (only changed files)
  - Implement `branch` scope (all files in current branch)
  - Implement `all` scope (entire codebase)
  - Optimize performance for large scopes
- [ ] 3.2.4 Add strict mode support
  - Normal mode: Report violations as warnings
  - Strict mode: Report violations as errors
  - Adjust severity thresholds based on mode
  - Support strict mode in CI/CD pipelines
- [ ] 3.2.5 Create compliance-report.md artifact
  - Summarize violations by category
  - List violations with file/line references
  - Include fix examples for common violations
  - Add statistics and trends
- [ ] 3.2.6 Create violations.json artifact
  - Define schema: id, rule, severity, location, fix
  - Include auto_fixable flag
  - Add rule documentation links
  - Include violation frequency data
- [ ] 3.2.7 Create standards-summary.md artifact
  - High-level compliance metrics
  - Pass/fail status per standard
  - Top violations list
  - Improvement recommendations

**VERIFY 3.2:**
- [ ] Standards compliance accurately reflects configured rules, violations are correct and fixable

### 3.3 review:security - Security-Focused Review

**Tasks:**
- [ ] 3.3.1 Implement OWASP Top 10 checks
  - A01: Broken Access Control
  - A02: Cryptographic Failures
  - A03: Injection
  - A04: Insecure Design
  - A05: Security Misconfiguration
  - A06: Vulnerable and Outdated Components
  - A07: Identification and Authentication Failures
  - A08: Software and Data Integrity Failures
  - A09: Security Logging and Monitoring Failures
  - A10: Server-Side Request Forgery (SSRF)
- [ ] 3.3.2 Implement vulnerability detection
  - Hardcoded secrets (API keys, passwords, tokens)
  - Insecure cryptography (weak algorithms, hardcoded keys)
  - Input validation gaps
  - Output encoding issues
  - Unsafe deserialization
  - XML external entity (XXE) vulnerabilities
  - Insecure dependencies (parse package-lock.json)
- [ ] 3.3.3 Implement threat modeling
  - Identify attack surface areas
  - Map data flow for sensitive data
  - Identify trust boundaries
  - List potential attack vectors
  - Assess impact of vulnerabilities
- [ ] 3.3.4 Add severity_threshold parameter
  - Filter findings by minimum severity
  - Support: critical, high, medium, low
  - Adjust reporting based on threshold
  - Use in CI/CD for build gates
- [ ] 3.3.5 Create security-report.md artifact
  - Executive summary with risk level
  - Categorized vulnerability list
  - Remediation steps with code examples
  - Compliance mapping (OWASP, CWE)
  - Priority-ordered action plan
- [ ] 3.3.6 Create vulnerabilities.json artifact
  - Define schema with CVE/CWE references
  - Include CVSS scores where applicable
  - Add exploitability assessment
  - Include fix recommendations
  - Add references to security advisories
- [ ] 3.3.7 Create threat-model.md artifact
  - Document trust boundaries
  - List attack vectors
  - Include data flow diagrams (text-based)
  - Add mitigation strategies
  - Include security requirements

**VERIFY 3.3:**
- [ ] Security analysis identifies real vulnerabilities, severity assessment is accurate, remediation guidance is actionable

### 3.4 review:performance - Performance Analysis

**Tasks:**
- [ ] 3.4.1 Implement algorithmic complexity analysis
  - Identify O(n²) or worse algorithms
  - Find nested loops with potential issues
  - Detect recursive algorithms without memoization
  - Check for unnecessary computations in loops
  - Identify synchronous operations in async contexts
- [ ] 3.4.2 Implement memory analysis
  - Detect memory leaks (event listeners, closures)
  - Find unnecessary object creation
  - Identify large array operations
  - Check for circular references
  - Detect inefficient data structures
- [ ] 3.4.3 Implement I/O optimization checks
  - Find N+1 query problems
  - Identify missing database indexes
  - Check for sequential I/O in loops
  - Detect missing pagination
  - Find inefficient file operations
- [ ] 3.4.4 Implement network optimization checks
  - Identify excessive API calls
  - Find missing request batching
  - Check for missing caching headers
  - Detect unnecessary data transfers
  - Find missing compression
- [ ] 3.4.5 Add focus parameter support
  - Support `memory` focus
  - Support `cpu` focus
  - Support `network` focus
  - Support `database` focus
  - Support array for multiple focuses
- [ ] 3.4.6 Create performance-report.md artifact
  - Summarize bottlenecks by category
  - List performance issues with impact assessment
  - Include optimization recommendations with code
  - Add expected impact metrics
  - Include profiling suggestions
- [ ] 3.4.7 Create optimizations.json artifact
  - Define schema: id, type, impact, effort, code
  - Include before/after performance estimates
  - Add complexity reduction metrics
  - Include implementation priority
- [ ] 3.4.8 Create benchmarks.md artifact
  - Suggest benchmark test cases
  - Include performance targets
  - Add measurement methodologies
  - Include profiling tool recommendations

**VERIFY 3.4:**
- [ ] Performance analysis identifies real bottlenecks, optimization suggestions are valid and impactful

## Phase 4: Artifact Generation System

**Tasks:**
- [ ] 4.1 Implement review-comments.md generator
  - Create schema with YAML frontmatter
  - Group comments by file
  - Sort by severity within each file
  - Include summary statistics
  - Format code snippets with syntax highlighting
  - Add line number references
  - Include category badges (Bug, Security, etc.)
  - Add suggestion sections with code examples
- [ ] 4.2 Implement suggestions.json generator
  - Define JSON schema v1.0
  - Include summary section with counts by severity/category
  - Create suggestion objects with: id, file, line_start, line_end, severity, category, title, current_code, suggested_code, rationale, auto_fixable, estimated_effort
  - Generate unique IDs for each suggestion
  - Validate against schema before writing
  - Add version metadata for schema evolution
- [ ] 4.3 Implement review-summary.md generator
  - Create executive summary with key metrics
  - Include overall assessment (Approve, Request Changes, Comment)
  - Add statistics: files reviewed, issues found, suggestions made
  - Include severity breakdown
  - Add top 3-5 critical issues
  - Include reviewer confidence score
  - Add time spent on review
  - Include next steps and recommendations
- [ ] 4.4 Implement blockers.md generator
  - Filter for critical and high severity issues
  - Group by category (Security, Bug, Performance)
  - Include detailed descriptions
  - Add required fix code examples
  - Include verification steps
  - Add impact assessment
  - Set clear merge blocking criteria
  - Include escalation path if needed
- [ ] 4.5 Add artifact validation system
  - Validate JSON against schemas
  - Check markdown formatting
  - Verify required fields are present
  - Ensure file paths are valid
  - Check line number references
  - Validate code snippets syntax
  - Add schema version compatibility checks
- [ ] 4.6 Implement artifact cross-referencing
  - Link suggestions in JSON to comments in MD
  - Reference blockers from summary
  - Add consistent ID scheme across artifacts
  - Enable artifact-to-code traceability

**VERIFY Phase 4:**
- [ ] All artifacts validate against schemas, contain accurate data, cross-references work correctly

## Phase 5: GitHub Integration & Git Hooks

**Tasks:**
- [ ] 5.1 Implement GitHub PR comment posting
  - Use `gh pr comment` to post review-comments.md
  - Format comments for GitHub markdown rendering
  - Support inline comments at specific lines (if gh supports)
  - Add reaction emojis for severity
  - Include links to full artifacts
  - Handle character limits gracefully
- [ ] 5.2 Implement PR review status integration
  - Post review-summary.md as PR review
  - Set review status (APPROVE, REQUEST_CHANGES, COMMENT)
  - Map severity levels to review decision
  - Block merges if blockers.md has critical issues
  - Add review metadata (time, scope, focus)
- [ ] 5.3 Implement CI/CD integration
  - Create exit code strategy (0=pass, 1=blockers found)
  - Support environment variable configuration
  - Generate machine-readable output for CI
  - Add quiet mode for CI environments
  - Support multiple output formats (JSON, SARIF)
- [ ] 5.4 Create pre-commit hook template
  - Generate hook script for `review:diff --staged`
  - Add configuration for auto-fix suggestions
  - Support skip option for emergencies
  - Include performance optimization (< 10s)
  - Add colored output for terminal
- [ ] 5.5 Create pre-push hook template
  - Generate hook for full branch review
  - Check for blockers before push
  - Include remote branch comparison
  - Add confirmation prompt for warnings
  - Support force-push override
- [ ] 5.6 Create GitHub Actions workflow template
  - Create workflow for PR review automation
  - Include artifact upload to PR
  - Add status check integration
  - Support configuration via workflow inputs
  - Include caching for performance
- [ ] 5.7 Document GitHub integration patterns
  - Create setup guide for PR automation
  - Document webhook integration possibilities
  - Add troubleshooting section
  - Include example workflows
  - Add security best practices

**VERIFY Phase 5:**
- [ ] GitHub integration posts comments correctly, hooks trigger properly, CI/CD integration works in real pipelines

## Phase 6: Testing & CI/CD Integration

**Tasks:**
- [ ] 6.1 Create test suite for review logic
  - Unit tests for comment formatting
  - Unit tests for severity classification
  - Unit tests for category detection
  - Integration tests for PR review flow
  - Integration tests for diff parsing
  - Mock GitHub API responses
  - Test artifact generation with fixtures
- [ ] 6.2 Create test fixtures
  - Sample PR data (JSON)
  - Sample git diffs (various languages)
  - Sample files with known issues
  - Expected output artifacts
  - Edge cases (empty diffs, large PRs, binary files)
- [ ] 6.3 Test with real-world repositories
  - Test on TypeScript project
  - Test on Python project
  - Test on Go project
  - Test on JavaScript project
  - Test on multi-language monorepo
  - Verify issue detection accuracy
  - Validate artifact correctness
- [ ] 6.4 Performance testing
  - Measure review time for small PRs (<100 lines)
  - Measure review time for medium PRs (100-500 lines)
  - Measure review time for large PRs (500+ lines)
  - Test with 50+ file PRs
  - Optimize slow paths
  - Set performance SLOs
- [ ] 6.5 Create CI/CD pipeline for review command
  - Add linting for command YAML
  - Add schema validation tests
  - Add integration tests in CI
  - Add performance regression tests
  - Generate test coverage reports
  - Add automated artifact validation
- [ ] 6.6 Add regression test suite
  - Capture known issues as test cases
  - Test false positive prevention
  - Test false negative detection
  - Include edge cases from production
  - Version test expectations

**VERIFY Phase 6:**
- [ ] All tests pass, performance meets SLOs, real-world testing shows accurate results

## Phase 7: Documentation & Examples

**Tasks:**
- [ ] 7.1 Create comprehensive command documentation
  - Document /review base command
  - Document all 7 sub-commands with examples
  - Document parameters (pr_number, focus, depth, ref, staged, etc.)
  - Document output artifacts for each sub-command
  - Add quick reference guide
  - Include common workflows
- [ ] 7.2 Create workflow guides
  - PR review workflow guide
  - Pre-commit review workflow
  - Security audit workflow
  - Performance optimization workflow
  - Standards compliance workflow
  - CI/CD integration guide
- [ ] 7.3 Create example artifacts
  - Sample review-comments.md
  - Sample suggestions.json
  - Sample review-summary.md
  - Sample blockers.md
  - Sample security-report.md
  - Sample performance-report.md
  - Include for multiple languages/scenarios
- [ ] 7.4 Create troubleshooting guide
  - Common issues and solutions
  - GitHub API rate limiting
  - Large PR handling
  - Binary file handling
  - Multi-language project considerations
  - Performance tuning
  - False positive reduction
- [ ] 7.5 Create best practices guide
  - When to use each sub-command
  - How to configure focus and depth
  - Integrating with existing review processes
  - Customizing severity thresholds
  - Setting up automated reviews
  - Review checklist integration
- [ ] 7.6 Create migration guide
  - Migrating from manual reviews
  - Integrating with existing tools (SonarQube, CodeClimate)
  - Customizing for team conventions
  - Training team on using artifacts
  - Measuring review effectiveness

**VERIFY Phase 7:**
- [ ] Documentation is complete, examples work as shown, guides are clear and actionable

## Success Criteria

- [ ] Base /review command YAML is valid and registers all 7 sub-commands
- [ ] review:pr successfully reviews PRs with accurate bug/security/quality detection
- [ ] review:diff correctly analyzes staged and unstaged changes
- [ ] review:file provides deep analysis with complexity metrics and refactoring suggestions
- [ ] review:commit analyzes commit history and message quality
- [ ] review:standards checks compliance against detected coding standards
- [ ] review:security identifies real vulnerabilities with OWASP/CWE references
- [ ] review:performance detects algorithmic, memory, I/O, and network bottlenecks
- [ ] All artifacts (review-comments.md, suggestions.json, review-summary.md, blockers.md) validate against schemas
- [ ] Artifacts contain accurate, actionable information with proper formatting
- [ ] GitHub integration successfully posts comments and reviews to PRs
- [ ] Git hooks (pre-commit, pre-push) work correctly and complete in <10s
- [ ] CI/CD integration properly blocks merges when blockers are found
- [ ] Command accurately identifies issues across TypeScript, JavaScript, Python, and Go codebases
- [ ] Performance meets SLOs: <30s for small PRs, <2min for medium PRs, <5min for large PRs
- [ ] False positive rate is <10% based on manual verification of 50+ reviews
- [ ] Documentation covers all features with working examples and troubleshooting guides
- [ ] Test coverage is >85% for core review logic
- [ ] Integration tests validate end-to-end workflows for each sub-command
