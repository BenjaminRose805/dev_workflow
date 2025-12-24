# Implementation Plan: Implement Analyze Agent

## Overview

- **Goal:** Create a specialized read-only agent for structured code analysis with proactive invocation capabilities
- **Priority:** P0 (Critical - Core analysis agent)
- **Created:** 2025-12-22
- **Output:** `docs/plan-outputs/analyze-agent/`
- **Model:** sonnet
- **Category:** Agent Implementation

> Implement the Analyze Agent (.claude/agents/analyze.md) as a specialized read-only agent for comprehensive code analysis. The agent provides structured findings generation, severity classification, and integrates with the /analyze command family (security, performance, quality, dependencies, architecture, accessibility, test). Supports proactive invocation based on task patterns and generates standardized artifacts (findings.json, metrics.json, analysis reports).

---

## Dependencies

### Upstream
- Explore Agent (uses exploration context for scope determination)

### Downstream
- `/review` command (consumes analysis findings)
- `/fix` command (consumes findings for remediation)
- `/audit` command (uses analysis as baseline)

### External Tools
- None (uses Claude's built-in analysis capabilities)

---

## Phase 1: Agent Configuration & System Prompt

**Objective:** Create base Analyze Agent configuration with system prompt and tool restrictions

- [ ] 1.1 Create agent configuration file at `.claude/agents/analyze.md`
  - Set model to `sonnet` (analysis requires reasoning)
  - Configure temperature to `0.0` for deterministic, reproducible analysis
  - Set category as "Analysis & Quality"
  - Define agent description: "Read-only agent for comprehensive code analysis"
  - Include version metadata for future evolution
- [ ] 1.2 Implement strict read-only tool restrictions
  - Allow tools: `Read`, `Grep`, `Glob`, `Bash` (read-only operations only)
  - Explicitly deny: `Write`, `Edit`, `NotebookEdit` (no modifications)
  - Configure Bash tool restrictions: no destructive commands (rm, mv, chmod, etc.)
  - Add validation layer to prevent tool restriction bypass
  - Document tool restriction rationale in agent config
- [ ] 1.3 Create specialized system prompt for analysis
  - Define role as analysis expert with security/performance/quality knowledge
  - Include OWASP Top 10 security pattern knowledge
  - Include CWE (Common Weakness Enumeration) pattern database
  - Add performance bottleneck detection heuristics
  - Include code smell and quality metric definitions
  - Add architectural pattern recognition guidelines
  - Include WCAG 2.1 accessibility compliance knowledge
- [ ] 1.4 Implement severity classification guidelines
  - Define critical: Security vulnerabilities with exploit potential, data exposure
  - Define high: Performance bottlenecks with user impact, broken functionality
  - Define medium: Code quality issues affecting maintainability, technical debt
  - Define low: Minor improvements, style inconsistencies, suggestions
  - Define info: Educational findings, best practice recommendations
  - Add context-based severity adjustment rules
  - Include business impact assessment guidelines
- [ ] 1.5 Configure structured output requirements
  - Define findings.json schema (metadata, summary, findings array)
  - Define metrics.json schema (complexity, duplication, coverage, maintainability)
  - Add artifact validation requirements (schema version, required fields)
  - Include artifact cross-referencing guidelines
  - Configure artifact storage location conventions
  - Add metadata enrichment rules (timestamps, scope, context)
- [ ] 1.6 Add evidence-based analysis guidelines
  - Require specific file/line references for all findings
  - Include code snippet extraction for context
  - Add impact assessment requirements
  - Require concrete examples in recommendations
  - Include false positive reduction strategies
  - Add confidence scoring guidelines
**VERIFY Phase 1:**
- [ ] Agent config validates
- [ ] Tool restrictions work correctly
- [ ] System prompt loads
- [ ] Severity classification guidelines are clear

## Phase 2: Proactive Invocation System

- [ ] 2.1 Define task pattern detection rules
  - Create pattern: "analyze", "check", "review", "audit", "scan" keywords
  - Create pattern: Security-related terms (vulnerability, exploit, injection, XSS)
  - Create pattern: Performance terms (slow, bottleneck, optimize, memory leak)
  - Create pattern: Quality terms (code smell, complexity, duplication, technical debt)
  - Create pattern: Architecture terms (layer violation, circular dependency, coupling)
  - Add pattern priority scoring (security > performance > quality)
  - Include context-aware pattern matching (file types, project structure)
- [ ] 2.2 Implement automatic agent invocation triggers
  - Trigger on explicit analysis requests (user mentions "analyze code")
  - Trigger on security audit requests (user mentions "security issues")
  - Trigger on performance investigation (user mentions "performance problems")
  - Trigger on quality assessment (user mentions "code quality")
  - Add confidence threshold for automatic invocation (>70%)
  - Include user confirmation for ambiguous cases
  - Add invocation logging for debugging
- [ ] 2.3 Configure invocation context passing
  - Pass user's original request to agent
  - Pass current directory and git context
  - Pass identified code scope (files, directories, patterns)
  - Pass requested analysis depth (quick/standard/deep)
  - Pass focus area if detected (security/performance/quality)
  - Include baseline comparison context if available
  - Add workspace metadata (language, framework, dependencies)
- [ ] 2.4 Implement invocation decision logging
  - Log why agent was invoked (pattern match, confidence score)
  - Log what context was passed to agent
  - Log invocation timestamp and duration
  - Add success/failure metrics tracking
  - Include user feedback collection
  - Create invocation analytics dashboard data
- [ ] 2.5 Add manual invocation support
  - Support explicit agent calls via /analyze command
  - Support agent selection via command parameters
  - Add agent capability query support
  - Include agent status and availability checks
  - Support agent version selection if needed
**VERIFY Phase 2:**
- [ ] Proactive invocation triggers correctly
- [ ] Pattern detection has <15% false positives
- [ ] Context passing is complete

## Phase 3: Integration with /analyze Command Family

- [ ] 3.1 Create bidirectional command-agent integration
  - Map `/analyze:security` command to agent with security focus
  - Map `/analyze:performance` command to agent with performance focus
  - Map `/analyze:quality` command to agent with quality focus
  - Map `/analyze:dependencies` command to agent with dependency focus
  - Map `/analyze:architecture` command to agent with architecture focus
  - Map `/analyze:accessibility` command to agent with accessibility focus
  - Map `/analyze:test` command to agent with test analysis focus
  - Add parameter passing from command to agent context
- [ ] 3.2 Implement sub-command parameter handling
  - Support `scope` parameter (file patterns, directories, changed-files)
  - Support `depth` parameter (quick ~30s, standard ~2-5min, deep ~10-30min)
  - Support `focus` parameter (specific analysis area within sub-command)
  - Support `severity_threshold` parameter (minimum severity to report)
  - Support `baseline` parameter (comparison target for delta analysis)
  - Support `format` parameter (json, markdown, github-annotations, sarif)
  - Add parameter validation and sensible defaults
- [ ] 3.3 Configure analysis scope controls
  - Implement file pattern filtering (*.js, src/**/*.ts, etc.)
  - Implement directory-based scoping (/src, /lib, etc.)
  - Implement git-based scoping (changed-files, branch-diff, commit-range)
  - Add intelligent scope detection (analyze only relevant files)
  - Include scope expansion for dependency analysis
  - Add scope limitation for performance (max files per run)
  - Support exclude patterns (.gitignore, node_modules, etc.)
- [ ] 3.4 Implement depth level execution strategies
  - Quick mode: Pattern-based detection, critical issues only, timeout 30s
  - Standard mode: Comprehensive single-file analysis, timeout 5min
  - Deep mode: Cross-file analysis, architectural patterns, timeout 30min
  - Add progressive timeout warnings (80%, 90%, 95%)
  - Implement graceful degradation on timeout
  - Add depth-appropriate artifact generation
  - Include depth level performance metrics
- [ ] 3.5 Add command result aggregation
  - Collect findings from agent execution
  - Aggregate metrics across analyzed files
  - Generate summary statistics
  - Combine with existing artifacts if incremental
  - Add deduplication logic for repeated findings
  - Include trend analysis if baseline exists
**VERIFY Phase 3:**
- [ ] All 7 sub-commands invoke agent correctly
- [ ] Parameters pass through
- [ ] Depth levels control scope appropriately

## Phase 4: Findings Artifact Generation

- [ ] 4.1 Implement findings.json schema v1.0
  - Define metadata section: command, timestamp, scope, depth, agent_version
  - Define summary section: total_findings, by_severity, by_category counts
  - Define findings array schema (see schema below)
  - Add schema version field for future evolution
  - Include validation rules for required fields
  - Add extensibility for custom fields per analysis type
- [ ] 4.2 Create finding object structure
  - Field: `id` (unique identifier, e.g., "SEC-001", "PERF-042")
  - Field: `severity` (critical/high/medium/low/info)
  - Field: `category` (injection, bottleneck, code-smell, violation, etc.)
  - Field: `title` (concise description, <100 chars)
  - Field: `description` (detailed explanation with context)
  - Field: `location` (file, line_start, line_end, column, function/class)
  - Field: `code_snippet` (relevant code with context lines)
  - Field: `impact` (business/technical impact description)
  - Field: `recommendation` (summary and code_example for fix)
  - Field: `references` (CWE, OWASP, CVE, documentation links)
  - Field: `confidence` (0.0-1.0 score for finding accuracy)
  - Field: `effort` (estimated fix effort: low/medium/high/critical)
- [ ] 4.3 Add specialized finding fields per analysis type
  - Security: cwe_id, owasp_category, cvss_score, attack_vector, exploitability
  - Performance: complexity_class (O(n²), O(2ⁿ)), estimated_impact_ms, optimization_potential
  - Quality: cyclomatic_complexity, cognitive_complexity, duplication_group_id
  - Dependencies: package_name, current_version, latest_version, cve_ids, license
  - Architecture: violation_type, affected_layers, coupling_score, suggested_pattern
  - Accessibility: wcag_level (A/AA/AAA), wcag_criteria, user_impact
  - Test: test_smell_type, coverage_impact, flakiness_score
- [ ] 4.4 Implement finding ID generation
  - Generate prefix based on category (SEC, PERF, QUAL, DEP, ARCH, A11Y, TEST)
  - Generate sequential number within analysis run
  - Add checksum for finding uniqueness across runs
  - Support stable IDs for baseline comparison
  - Add ID collision detection and resolution
- [ ] 4.5 Create findings validation logic
  - Validate all required fields are present
  - Validate severity levels are valid enum values
  - Validate file paths exist and are within scope
  - Validate line numbers are within file bounds
  - Validate code snippets match actual file content
  - Validate references are well-formed URLs or identifiers
  - Add schema version compatibility checks
- [ ] 4.6 Implement findings deduplication
  - Detect duplicate findings by location + title hash
  - Merge similar findings (same issue, different locations)
  - Group related findings (same root cause)
  - Preserve highest severity when deduplicating
  - Add deduplication metadata for transparency
**VERIFY Phase 4:**
- [ ] findings.json validates against schema
- [ ] All required fields present
- [ ] IDs are unique and stable

## Phase 5: Metrics Artifact Generation

- [ ] 5.1 Implement metrics.json schema v1.0
  - Define metadata section: timestamp, scope, baseline_comparison
  - Define complexity metrics section
  - Define duplication metrics section
  - Define coverage metrics section
  - Define maintainability metrics section
  - Add per-file breakdown section
  - Include trend indicators (vs baseline)
- [ ] 5.2 Calculate complexity metrics
  - Calculate cyclomatic complexity per function (McCabe metric)
  - Calculate cognitive complexity per function (nested control flow)
  - Calculate average complexity per file
  - Calculate maximum complexity in codebase
  - Identify functions exceeding thresholds (>10 warning, >20 critical)
  - Add complexity distribution histogram
  - Include complexity vs bug density correlation
- [ ] 5.3 Calculate duplication metrics
  - Detect exact code duplicates (copy-paste)
  - Detect structural duplicates (similar patterns)
  - Calculate duplication percentage (duplicated lines / total lines)
  - Count duplicated blocks and group by similarity
  - Identify largest duplication clusters
  - Add duplication savings potential (lines that could be abstracted)
- [ ] 5.4 Calculate coverage metrics (if available)
  - Parse coverage reports (lcov, istanbul, c8, coverage.py, etc.)
  - Calculate line coverage percentage
  - Calculate branch coverage percentage
  - Calculate statement coverage percentage
  - Calculate function coverage percentage
  - Identify uncovered critical paths
  - Add risk-weighted coverage metric
- [ ] 5.5 Calculate maintainability index
  - Calculate Halstead Volume (vocabulary and length)
  - Calculate Maintainability Index (0-100 scale)
  - Classify files: Good (>65), Moderate (20-65), Difficult (<20)
  - Correlate with complexity and duplication metrics
  - Add per-file maintainability scores
  - Include trend analysis vs baseline
- [ ] 5.6 Calculate technical debt estimation
  - Estimate remediation time per finding (based on effort field)
  - Calculate total technical debt hours
  - Classify debt type: design, defect, documentation, test, performance
  - Prioritize debt by interest rate (impact × probability of growth)
  - Add debt paydown recommendations
  - Include ROI estimates for debt reduction
- [ ] 5.7 Add baseline comparison logic
  - Compare current metrics vs baseline metrics
  - Calculate delta for all metric categories
  - Identify regressions (worse metrics)
  - Identify improvements (better metrics)
  - Add statistical significance indicators
  - Generate trend summary (improving/stable/degrading)
**VERIFY Phase 5:**
- [ ] Metrics calculations are accurate
- [ ] Baseline comparison works
- [ ] Technical debt estimates are realistic

## Phase 6: Severity Classification System

- [ ] 6.1 Implement context-aware severity rules
  - Rule: SQL injection in authentication → critical
  - Rule: XSS in user-generated content → critical
  - Rule: Hardcoded production credentials → critical
  - Rule: O(n²) in request handler → high
  - Rule: Missing authentication check → high
  - Rule: Memory leak in long-running process → high
  - Rule: Cyclomatic complexity >20 → medium
  - Rule: Code duplication >10% → medium
  - Rule: Missing error handling → medium
  - Rule: Style violations → low
  - Rule: Missing documentation → low
  - Rule: Optimization opportunities → info
- [ ] 6.2 Add severity adjustment based on context
  - Adjust up if finding is in critical path (auth, payment, data handling)
  - Adjust up if finding has public exposure (API, web UI)
  - Adjust down if finding is in test/dev code only
  - Adjust down if finding has compensating controls
  - Add severity boost for findings with known exploits
  - Add severity reduction for false positive indicators
- [ ] 6.3 Implement impact assessment scoring
  - Score confidentiality impact (data exposure risk)
  - Score integrity impact (data corruption risk)
  - Score availability impact (service disruption risk)
  - Score business impact (revenue, reputation, compliance)
  - Combine scores for overall impact rating
  - Map impact rating to severity level
- [ ] 6.4 Add exploitability assessment
  - Assess attack surface (public/internal/local)
  - Assess attack complexity (trivial/moderate/high)
  - Assess required privileges (none/low/high)
  - Assess user interaction required (yes/no)
  - Calculate exploitability score (CVSS-like)
  - Boost severity for high exploitability
- [ ] 6.5 Create severity override mechanism
  - Support user-defined severity rules
  - Support per-project severity configurations
  - Add severity override comments in code
  - Include severity justification logging
  - Add severity appeal process documentation
**VERIFY Phase 6:**
- [ ] Severity classification is consistent
- [ ] Context adjustments work correctly
- [ ] Impact scoring is accurate

## Phase 7: CI/CD Integration Hooks

- [ ] 7.1 Implement exit code strategy
  - Exit 0: No findings above threshold
  - Exit 1: Findings above threshold (blocking)
  - Exit 2: Analysis failed (error)
  - Exit 3: Analysis timeout
  - Add configurable exit code mapping
  - Support soft-fail mode (warnings only)
- [ ] 7.2 Add fail-on threshold configuration
  - Support `--fail-on=critical` (block on critical only)
  - Support `--fail-on=critical,high` (block on critical+high)
  - Support `--fail-on-regression` (block on new issues vs baseline)
  - Support `--fail-on-metric-threshold` (e.g., complexity >15)
  - Add threshold configuration file support
  - Include threshold documentation in artifacts
- [ ] 7.3 Implement GitHub annotations format
  - Generate GitHub Actions annotation format output
  - Map severity to annotation levels (error, warning, notice)
  - Include file path and line number for inline comments
  - Add title and message from finding
  - Include remediation suggestions in annotation details
  - Support batch annotation output (avoid rate limits)
- [ ] 7.4 Implement SARIF format output
  - Generate SARIF v2.1.0 format for security findings
  - Include tool metadata (name, version, rules)
  - Map findings to SARIF results structure
  - Add rule definitions with descriptions
  - Include CWE/OWASP taxonomy references
  - Support SARIF upload to GitHub Security tab
- [ ] 7.5 Implement JUnit XML format
  - Generate JUnit XML for test integration tools
  - Map findings to test cases (one per finding)
  - Include severity in test case name
  - Add finding details in test case message
  - Support CI tool consumption (Jenkins, CircleCI, etc.)
- [ ] 7.6 Add CI/CD environment detection
  - Detect GitHub Actions environment
  - Detect GitLab CI environment
  - Detect Jenkins environment
  - Detect CircleCI environment
  - Auto-configure output format based on CI environment
  - Add CI-specific optimizations (caching, parallelization)
- [ ] 7.7 Create pre-commit hook integration
  - Generate pre-commit hook script template
  - Run quick analysis on staged files only
  - Block commit if critical findings detected
  - Add hook bypass mechanism (for emergencies)
  - Include hook installation instructions
  - Optimize for <10s execution time
- [ ] 7.8 Create pull request workflow template
  - Create GitHub Actions workflow example
  - Run analysis on changed files only
  - Post findings as PR comments
  - Add status check integration
  - Block PR merge if blockers found
  - Include artifact upload to PR
**VERIFY Phase 7:**
- [ ] Exit codes work in CI/CD
- [ ] GitHub annotations render correctly
- [ ] SARIF uploads to Security tab

## Phase 8: Proactive Invocation Testing

- [ ] 8.1 Create test suite for pattern detection
  - Test security keyword detection ("find vulnerabilities", "security audit")
  - Test performance keyword detection ("performance issues", "slow queries")
  - Test quality keyword detection ("code quality", "technical debt")
  - Test architecture keyword detection ("layer violations", "circular dependencies")
  - Test negative cases (non-analysis requests)
  - Measure false positive rate (<15% target)
  - Measure false negative rate (<5% target)
- [ ] 8.2 Test invocation confidence scoring
  - Test high-confidence cases (>90%)
  - Test medium-confidence cases (70-90%)
  - Test low-confidence cases (<70%)
  - Verify automatic invocation only for high confidence
  - Verify user confirmation for medium confidence
  - Verify no invocation for low confidence
- [ ] 8.3 Test context passing accuracy
  - Verify user request is preserved
  - Verify git context is accurate
  - Verify scope detection is correct
  - Verify depth level is appropriate
  - Verify focus area is detected correctly
  - Test edge cases (ambiguous requests, multi-focus)
- [ ] 8.4 Test agent invocation logging
  - Verify invocation reason is logged
  - Verify context passed is logged
  - Verify timestamps are accurate
  - Verify success/failure is tracked
  - Test log rotation and cleanup
- [ ] 8.5 Create proactive invocation benchmarks
  - Measure invocation decision time (<100ms target)
  - Measure end-to-end latency (user request → agent start)
  - Measure overhead vs manual invocation
  - Test concurrent invocation handling
  - Optimize slow paths
**VERIFY Phase 8:**
- [ ] Pattern detection is accurate
- [ ] Confidence scoring works
- [ ] Context passing is complete
- [ ] Logging is comprehensive

## Phase 9: Real-World Validation

- [ ] 9.1 Test agent on diverse codebases
  - Test on TypeScript/JavaScript project (React/Node.js)
  - Test on Python project (Django/Flask)
  - Test on Go project (web service)
  - Test on Java project (Spring Boot)
  - Test on multi-language monorepo
  - Verify findings are accurate and relevant
  - Measure false positive rate per language
- [ ] 9.2 Validate security analysis accuracy
  - Test on OWASP WebGoat (known vulnerabilities)
  - Test on Damn Vulnerable Web Application (DVWA)
  - Test on production codebases with past CVEs
  - Verify all known issues are detected
  - Verify CWE/OWASP mappings are correct
  - Measure detection recall (true positives / all vulnerabilities)
- [ ] 9.3 Validate performance analysis accuracy
  - Test on projects with known N+1 queries
  - Test on projects with algorithmic bottlenecks
  - Test on projects with memory leaks
  - Verify all known issues are detected
  - Verify Big O estimates are correct
  - Verify optimization recommendations are valid
- [ ] 9.4 Validate quality metrics calculation
  - Test cyclomatic complexity against manual calculation
  - Test duplication detection against clone detection tools
  - Test maintainability index against published benchmarks
  - Verify metrics match known reference values
  - Test edge cases (empty files, generated code, minified code)
- [ ] 9.5 Validate baseline comparison
  - Create baseline from clean codebase state
  - Introduce known regressions (security, performance, quality)
  - Verify all regressions are detected
  - Verify improvements are recognized
  - Test trend analysis accuracy
  - Verify delta calculations are correct
- [ ] 9.6 Validate CI/CD integration
  - Test GitHub Actions workflow end-to-end
  - Test GitLab CI pipeline integration
  - Test Jenkins pipeline integration
  - Verify exit codes trigger correct build status
  - Verify annotations appear in PR UI
  - Verify SARIF uploads to Security tab
- [ ] 9.7 Performance and scalability testing
  - Test on small projects (<100 files)
  - Test on medium projects (100-1000 files)
  - Test on large projects (1000+ files)
  - Measure analysis time per depth level
  - Verify timeout handling works correctly
  - Test memory consumption (should not exceed 2GB)
**VERIFY Phase 9:**
- [ ] All analysis types are accurate on real codebases
- [ ] CI/CD integration works
- [ ] Performance is acceptable

## Phase 10: Documentation & Examples

- [ ] 10.1 Create agent documentation
  - Document agent purpose and capabilities
  - Document tool restrictions and rationale
  - Document proactive invocation patterns
  - Document integration with /analyze commands
  - Document artifact schemas with examples
  - Document severity classification rules
  - Include troubleshooting section
- [ ] 10.2 Create proactive invocation guide
  - Document how pattern detection works
  - List keywords that trigger invocation
  - Explain confidence scoring
  - Document how to verify agent was invoked
  - Include examples of good/bad invocation requests
  - Add debugging tips for invocation issues
- [ ] 10.3 Create CI/CD integration guide
  - Document GitHub Actions integration
  - Document GitLab CI integration
  - Document Jenkins integration
  - Document exit code strategy
  - Document fail-on threshold configuration
  - Include complete workflow examples
  - Add troubleshooting for CI environments
- [ ] 10.4 Create artifact schema documentation
  - Document findings.json schema v1.0 with all fields
  - Document metrics.json schema v1.0 with all fields
  - Include example artifacts for each analysis type
  - Document schema evolution and versioning
  - Add validation tool usage instructions
  - Include artifact consumption examples (parsing, visualization)
- [ ] 10.5 Create severity classification guide
  - Document severity levels and definitions
  - List context adjustment rules
  - Explain impact and exploitability scoring
  - Include severity override mechanism
  - Add examples of severity decisions
  - Document appeals process
- [ ] 10.6 Create best practices guide
  - When to use quick vs standard vs deep analysis
  - How to configure scope effectively
  - How to set up baseline comparison
  - How to integrate with existing tools (ESLint, SonarQube)
  - How to reduce false positives
  - How to prioritize findings remediation
  - Performance optimization tips
- [ ] 10.7 Create example artifacts
  - Generate example findings.json for each analysis type
  - Generate example metrics.json with all sections
  - Generate example security-report.md
  - Generate example performance-report.md
  - Generate example quality-report.md
  - Include baseline comparison examples
  - Add multi-language examples
**VERIFY Phase 10:**
- [ ] Documentation is complete and clear
- [ ] Examples are accurate and helpful
- [ ] Guides are actionable

## Success Criteria

- [ ] Agent configuration file (.claude/agents/analyze.md) is valid and loads correctly
- [ ] Tool restrictions enforce read-only mode, prevent Write/Edit operations
- [ ] System prompt includes OWASP/CWE/quality/architecture knowledge
- [ ] Severity classification produces consistent, context-aware results
- [ ] Proactive invocation triggers on analysis-related requests with >85% accuracy
- [ ] Pattern detection false positive rate is <15%
- [ ] All 7 /analyze sub-commands invoke agent correctly with proper context
- [ ] Scope, depth, focus, and threshold parameters work as documented
- [ ] findings.json validates against schema v1.0, includes all required fields
- [ ] Finding IDs are unique and stable for baseline comparison
- [ ] metrics.json includes accurate complexity, duplication, coverage, maintainability calculations
- [ ] Technical debt estimation provides realistic hour estimates
- [ ] Baseline comparison accurately detects regressions and improvements
- [ ] Severity classification matches manual expert review in >90% of cases
- [ ] CI/CD integration works in GitHub Actions, GitLab CI, and Jenkins
- [ ] Exit codes trigger correct build status (pass/fail)
- [ ] GitHub annotations render inline in PR UI
- [ ] SARIF format uploads successfully to GitHub Security tab
- [ ] Agent detects real vulnerabilities in OWASP WebGoat with >95% recall
- [ ] Performance analysis identifies known bottlenecks with >90% accuracy
- [ ] Quality metrics match reference tools (ESLint, SonarQube) within 10%
- [ ] Analysis completes within depth level timeouts (quick <30s, standard <5min, deep <30min)
- [ ] Memory consumption stays below 2GB for large projects (1000+ files)
- [ ] Documentation covers all features with working examples
- [ ] Troubleshooting guide addresses common issues
- [ ] Example artifacts are valid and representative

---

## Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| High false positive rate | Medium | Medium | Implement confidence scoring and context-aware filtering |
| Performance issues on large codebases | High | Medium | Implement scope limits and depth level timeouts |
| Inconsistent severity classification | Medium | Low | Define clear severity rules with examples |
| CI/CD integration failures | Medium | Low | Comprehensive testing across CI environments |
| Metrics calculation inaccuracy | Low | Medium | Validate against reference tools (ESLint, SonarQube)

---

## Notes

- The Analyze Agent should NEVER modify any files - it is strictly read-only
- Analysis results should be reproducible with the same input
- Consider caching analysis results for unchanged files
- Analysis artifacts can serve as input for other agents (Review, Fix, Audit)
- Support for multiple output formats (JSON, Markdown, SARIF) is essential for CI/CD integration
