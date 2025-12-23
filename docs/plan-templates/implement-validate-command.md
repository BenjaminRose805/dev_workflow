# Implementation Plan: Implement /validate Command

## Overview
- **Goal:** Create a systematic validation framework that verifies specifications, schemas, requirements, contracts, and code quality with actionable feedback and progressive validation capabilities
- **Priority:** P0
- **Created:** {{date}}
- **Output:** `docs/plan-outputs/{{plan_filename}}/`

> Implement the /validate command with 8 sub-commands (validate:spec, validate:schema, validate:requirements, validate:contracts, validate:types, validate:build, validate:accessibility, validate:security) that provide systematic verification with severity-based findings (CRITICAL/MAJOR/MINOR/INFORMATIONAL), traceability matrices, and quality gate enforcement for CI/CD integration.

## Phase 1: Core Command Infrastructure

- [ ] 1.1 Create skill YAML at `.claude/commands/validate.md` with model (claude-sonnet-4-5 for standard, claude-opus-4-5 for complex), allowed-tools (Read, Grep, Glob, Bash), and category (Analysis & Quality)
- [ ] 1.2 Implement base validation prompt template with severity level system (CRITICAL, MAJOR, MINOR, INFORMATIONAL) and exit code mapping (0=passed, 1=critical issues, 2=process error, 3=threshold exceeded, 10=warnings only)
- [ ] 1.3 Create validation context loader that identifies project type, reads configuration files, and establishes baseline validation rules
- [ ] 1.4 Implement severity classification engine with configurable thresholds and filtering capabilities
- [ ] **VERIFY 1:** Basic /validate command responds with structured output and correct exit codes for each severity level

## Phase 2: Validation Engine Core

- [ ] 2.1 Build validation check executor that runs individual validation rules and captures findings with location/line numbers
- [ ] 2.2 Implement result aggregation system that combines findings from multiple checks and calculates summary statistics
- [ ] 2.3 Create deviation detector that compares expected vs actual states and categorizes discrepancies
- [ ] 2.4 Build remediation suggestion engine that provides actionable fix recommendations for each finding
- [ ] 2.5 Implement exit code logic with threshold support (fail on N critical issues, warn on M major issues)
- [ ] **VERIFY 2:** Validation engine correctly aggregates findings, assigns severities, and returns appropriate exit codes based on thresholds

## Phase 3: Sub-Command - validate:spec

- [ ] 3.1 Implement specification parser that reads design docs, API specs, and architectural decision records
- [ ] 3.2 Create specification completeness checker (required sections, clarity, consistency)
- [ ] 3.3 Build specification-to-implementation mapper that traces spec requirements to code
- [ ] 3.4 Implement specification deviation detector that identifies unimplemented or divergent features
- [ ] **VERIFY 3:** validate:spec identifies missing spec sections, finds spec-to-code deviations, and generates actionable remediation steps

## Phase 4: Sub-Command - validate:schema

- [ ] 4.1 Implement JSON Schema validator with $schema version detection and validation
- [ ] 4.2 Create OpenAPI/Swagger schema validator with version support (2.0, 3.0, 3.1)
- [ ] 4.3 Build GraphQL schema validator with SDL parsing and type system validation
- [ ] 4.4 Implement schema cross-reference checker that validates relationships and dependencies
- [ ] 4.5 Create schema evolution validator that detects breaking changes between versions
- [ ] **VERIFY 4:** validate:schema correctly validates JSON Schema, OpenAPI, and GraphQL schemas with detailed error messages and line numbers

## Phase 5: Sub-Command - validate:requirements

- [ ] 5.1 Create requirements parser that extracts requirements from docs, tickets, and user stories
- [ ] 5.2 Implement traceability matrix generator that maps requirements to implementation and tests
- [ ] 5.3 Build requirements coverage analyzer that identifies untested or unimplemented requirements
- [ ] 5.4 Create requirements consistency checker that detects conflicts and ambiguities
- [ ] 5.5 Implement acceptance criteria validator that verifies completeness and testability
- [ ] **VERIFY 5:** validate:requirements generates complete traceability matrix with requirement coverage percentages and identifies gaps

## Phase 6: Sub-Command - validate:contracts

- [ ] 6.1 Implement API contract validator for REST endpoints (request/response validation)
- [ ] 6.2 Create contract testing framework integration (Pact, Spring Cloud Contract support)
- [ ] 6.3 Build interface contract validator that checks method signatures and type contracts
- [ ] 6.4 Implement consumer-driven contract verification across service boundaries
- [ ] 6.5 Create contract versioning validator that detects breaking changes
- [ ] **VERIFY 6:** validate:contracts verifies API contracts, detects breaking changes, and validates consumer-provider compatibility

## Phase 7: Sub-Command - validate:types

- [ ] 7.1 Implement TypeScript type checker integration (tsc --noEmit with error parsing)
- [ ] 7.2 Create Python type checker integration (mypy with configurable strictness)
- [ ] 7.3 Build Go type checker integration (go vet with type safety checks)
- [ ] 7.4 Implement Java type checker integration (javac with annotation processing)
- [ ] 7.5 Create type coverage analyzer that reports percentage of typed code
- [ ] 7.6 Build type error severity classifier (unsafe any usage, missing annotations, type mismatches)
- [ ] **VERIFY 7:** validate:types runs appropriate type checker for detected language, reports coverage percentage, and categorizes type errors by severity

## Phase 8: Sub-Command - validate:build

- [ ] 8.1 Implement build system detector (npm, gradle, maven, make, cargo, go build)
- [ ] 8.2 Create clean build validator that runs build from scratch and captures errors
- [ ] 8.3 Build dependency validator that checks for version conflicts and security vulnerabilities
- [ ] 8.4 Implement build reproducibility checker that validates deterministic builds
- [ ] 8.5 Create build performance analyzer that identifies slow build steps
- [ ] **VERIFY 8:** validate:build executes appropriate build command, categorizes build errors by severity, and validates dependency integrity

## Phase 9: Sub-Command - validate:accessibility

- [ ] 9.1 Implement HTML accessibility checker (ARIA roles, semantic HTML, alt text)
- [ ] 9.2 Create WCAG compliance validator with level support (A, AA, AAA)
- [ ] 9.3 Build keyboard navigation validator for interactive elements
- [ ] 9.4 Implement color contrast analyzer with WCAG ratio calculations
- [ ] 9.5 Create screen reader compatibility checker for dynamic content
- [ ] **VERIFY 9:** validate:accessibility identifies WCAG violations, assigns severity levels, and provides specific remediation guidance

## Phase 10: Sub-Command - validate:security

- [ ] 10.1 Implement dependency vulnerability scanner (npm audit, safety, cargo audit integration)
- [ ] 10.2 Create secrets detection validator (API keys, tokens, credentials in code)
- [ ] 10.3 Build security header validator for web applications (CSP, HSTS, X-Frame-Options)
- [ ] 10.4 Implement input validation checker that detects injection vulnerabilities
- [ ] 10.5 Create authentication/authorization validator for protected endpoints
- [ ] 10.6 Build security best practices checker (password hashing, encryption usage)
- [ ] **VERIFY 10:** validate:security detects vulnerabilities, assigns CVE-based severity, and provides upgrade/fix recommendations

## Phase 11: Artifact Generation - validation-report.md

- [ ] 11.1 Create validation report template with status (PASSED/FAILED/WARNINGS) and summary section
- [ ] 11.2 Implement summary statistics generator (total checks, findings by severity, pass rate)
- [ ] 11.3 Build critical findings formatter with severity/location/expected/actual/remediation structure
- [ ] 11.4 Create findings grouping logic (by severity, by category, by file)
- [ ] 11.5 Implement markdown table generator for structured findings presentation
- [ ] **VERIFY 11:** validation-report.md artifact contains complete summary, categorized findings, and actionable remediation steps

## Phase 12: Artifact Generation - deviations.json

- [ ] 12.1 Create deviations.json schema with metadata (validation_type, timestamp, project_info)
- [ ] 12.2 Implement summary section generator (total_deviations, by_severity, by_category)
- [ ] 12.3 Build deviations array formatter with severity/category/requirement_id/specification/implementation/remediation fields
- [ ] 12.4 Create JSON serializer with pretty-printing and schema validation
- [ ] 12.5 Implement deviation prioritization logic for remediation planning
- [ ] **VERIFY 12:** deviations.json artifact is valid JSON with complete metadata, summary, and structured deviation records

## Phase 13: Artifact Generation - traceability-matrix.md

- [ ] 13.1 Create traceability matrix template with summary section (total requirements, coverage percentage)
- [ ] 13.2 Implement requirement ID extractor from multiple sources (docs, code comments, tickets)
- [ ] 13.3 Build implementation mapper that links requirements to source files and line numbers
- [ ] 13.4 Create test coverage mapper that links requirements to test cases
- [ ] 13.5 Implement status calculator (IMPLEMENTED/PARTIAL/MISSING/NOT_TESTED)
- [ ] 13.6 Build matrix table generator with Req ID | Description | Status | Implementation | Tests columns
- [ ] **VERIFY 13:** traceability-matrix.md artifact shows complete requirement-to-implementation-to-test mappings with accurate status

## Phase 14: Schema Validation Support

- [ ] 14.1 Implement JSON Schema validator with draft support (draft-04, draft-07, 2019-09, 2020-12)
- [ ] 14.2 Create OpenAPI 2.0 (Swagger) validator with path, parameter, and response validation
- [ ] 14.3 Build OpenAPI 3.0/3.1 validator with component reuse and callback validation
- [ ] 14.4 Implement GraphQL SDL parser with custom scalar and directive support
- [ ] 14.5 Create AsyncAPI schema validator for event-driven architectures
- [ ] 14.6 Build Protobuf schema validator for gRPC services
- [ ] **VERIFY 14:** Schema validators support major formats (JSON Schema, OpenAPI, GraphQL, AsyncAPI, Protobuf) with detailed error reporting

## Phase 15: Type System Support

- [ ] 15.1 Implement TypeScript integration with tsconfig.json parsing and compiler API usage
- [ ] 15.2 Create Python mypy integration with mypy.ini/pyproject.toml configuration support
- [ ] 15.3 Build Flow type checker integration for JavaScript projects
- [ ] 15.4 Implement Java type annotation processor for nullability and generics
- [ ] 15.5 Create Rust type checker integration via cargo check
- [ ] 15.6 Build type coverage reporting across all supported languages
- [ ] **VERIFY 15:** Type validation works across TypeScript, Python, Flow, Java, and Rust with unified reporting format

## Phase 16: Quality Gates & Thresholds

- [ ] 16.1 Create quality gate configuration schema (.claude/validate-thresholds.yaml)
- [ ] 16.2 Implement threshold checker for severity levels (max_critical: 0, max_major: 5, max_minor: 20)
- [ ] 16.3 Build quality gate evaluator that determines pass/fail based on thresholds
- [ ] 16.4 Create quality gate reporter that explains which threshold was exceeded
- [ ] 16.5 Implement override mechanism for emergency situations (with audit logging)
- [ ] **VERIFY 16:** Quality gates correctly enforce thresholds and return appropriate exit codes (3 for threshold exceeded)

## Phase 17: CI/CD Integration

- [ ] 17.1 Create GitHub Actions workflow template for /validate integration
- [ ] 17.2 Build GitLab CI pipeline template with validation stages
- [ ] 17.3 Implement Jenkins pipeline integration with validation reporting
- [ ] 17.4 Create pre-commit hook template for local validation
- [ ] 17.5 Build pull request comment integration that posts validation results
- [ ] 17.6 Implement validation status badge generation for README files
- [ ] **VERIFY 17:** CI/CD templates successfully run validation, enforce quality gates, and report results in PR comments

## Phase 18: Progressive Validation

- [ ] 18.1 Implement incremental validation that only checks changed files
- [ ] 18.2 Create baseline validation system that saves known issues and tracks new ones
- [ ] 18.3 Build validation history tracker that shows trend over time (improving/degrading)
- [ ] 18.4 Implement selective validation that runs only specified sub-commands
- [ ] 18.5 Create validation profile system (strict, balanced, permissive) with preset thresholds
- [ ] **VERIFY 18:** Progressive validation correctly identifies new issues vs baseline and supports incremental checking

## Phase 19: Error Reporting & UX

- [ ] 19.1 Implement color-coded console output (red=CRITICAL, yellow=MAJOR, blue=MINOR, gray=INFO)
- [ ] 19.2 Create progress indicator for long-running validations
- [ ] 19.3 Build interactive mode that allows filtering findings by severity/category
- [ ] 19.4 Implement verbose mode that shows detailed check execution logs
- [ ] 19.5 Create summary-only mode for quick status checks
- [ ] 19.6 Build JSON output mode for programmatic consumption
- [ ] **VERIFY 19:** Validation output is clear, actionable, and supports multiple formats (console, JSON, markdown)

## Phase 20: Testing & Documentation

- [ ] 20.1 Create test suite for each sub-command with fixture projects (passing and failing cases)
- [ ] 20.2 Implement integration tests for full validation workflows with quality gates
- [ ] 20.3 Build test coverage for all severity levels and exit codes
- [ ] 20.4 Create validation engine unit tests for edge cases (empty projects, malformed configs)
- [ ] 20.5 Write comprehensive usage documentation with examples for all 8 sub-commands
- [ ] 20.6 Create troubleshooting guide for common validation failures
- [ ] 20.7 Build example projects demonstrating validation best practices
- [ ] **VERIFY 20:** All tests pass, documentation covers all sub-commands with examples, and troubleshooting guide addresses common issues

## Success Criteria

- [ ] /validate command supports all 8 sub-commands: validate:spec, validate:schema, validate:requirements, validate:contracts, validate:types, validate:build, validate:accessibility, validate:security
- [ ] Validation findings are categorized by severity (CRITICAL, MAJOR, MINOR, INFORMATIONAL) with consistent classification
- [ ] Exit codes correctly reflect validation status: 0=passed, 1=critical issues, 2=process error, 3=threshold exceeded, 10=warnings only
- [ ] Three artifacts are generated: validation-report.md, deviations.json, traceability-matrix.md with complete information
- [ ] Schema validation supports JSON Schema, OpenAPI 2.0/3.0/3.1, GraphQL, AsyncAPI, and Protobuf
- [ ] Type validation supports TypeScript, Python (mypy), Flow, Java, and Rust with coverage reporting
- [ ] Quality gates enforce configurable thresholds and integrate with CI/CD pipelines
- [ ] Progressive validation supports incremental checking, baseline tracking, and trend analysis
- [ ] Validation reports provide actionable remediation guidance with file locations and line numbers
- [ ] CI/CD integration templates work with GitHub Actions, GitLab CI, and Jenkins
- [ ] Test coverage exceeds 85% for validation engine and all sub-commands
- [ ] Documentation includes usage examples, troubleshooting guide, and best practices for all 8 sub-commands
