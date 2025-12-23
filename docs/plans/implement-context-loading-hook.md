# Implementation Plan: Context Loading Hook System

## Overview
- **Goal:** Implement pre-command context loading hook that automatically injects relevant artifacts, plan status, and environment metadata before command execution
- **Priority:** P1 (Infrastructure)
- **Created:** 2025-12-22
- **Output:** `docs/plan-outputs/implement-context-loading-hook/`
- **Category:** Hook Infrastructure

> The Context Loading Hook is a critical pre-command hook that runs on UserPromptSubmit and PreToolUse (Skill matcher) events. It intelligently loads relevant artifacts from the registry, injects active plan status, parses command arguments to identify dependencies, validates prerequisites before execution, and enriches the command context with environment metadata. This hook ensures commands have access to all necessary context without manual file path specification, blocks execution when critical dependencies are missing (exit code 2), and provides helpful suggestions for resolving issues.

---

## Phase 1: Core Artifact Loading Logic
**Objective:** Implement fundamental artifact discovery and loading mechanisms for context injection

- [ ] 1.1 Create context loader module structure with main `ContextLoadingHook` class
- [ ] 1.2 Implement artifact discovery interface that integrates with ArtifactRegistry
- [ ] 1.3 Create artifact type inference from command name (e.g., /architect requires requirements, /explore requires codebase-map)
- [ ] 1.4 Implement artifact loading pipeline that fetches artifacts by type and filters by status='active'
- [ ] 1.5 Add artifact content reader that loads file contents and validates format (JSON/Markdown)
- [ ] 1.6 Create artifact reference injection logic that adds artifact metadata to command context
- [ ] 1.7 Implement artifact validation to ensure loaded artifacts are not superseded or corrupted
- [ ] 1.8 Add artifact deduplication by content_hash to prevent loading duplicates
- [ ] 1.9 Create artifact loading cache with TTL (default: 60 seconds) for repeated lookups
- [ ] 1.10 Implement timeout mechanism for artifact loading (default: 3000-5000ms)
- [ ] 1.11 Add logging for all artifact loading operations with timings and outcomes

**VERIFY 1:** Context loading hook successfully discovers and loads artifacts for test commands (/clarify, /architect, /test), validates artifacts are active and not superseded, completes within timeout, and logs all operations. Verify cache reduces load time on repeated calls.

---

## Phase 2: Plan Status Injection
**Objective:** Integrate active plan status into command context for plan-aware execution

- [ ] 2.1 Create plan status reader that loads active plan from `.claude/current-plan.txt` and `.claude/current-plan-output.txt`
- [ ] 2.2 Implement plan status parser that extracts current task, completed tasks, pending tasks, and plan metadata
- [ ] 2.3 Add plan findings loader that reads task outputs from `docs/plan-outputs/{plan}/findings/` directory
- [ ] 2.4 Create plan context structure with fields: plan_id, active_task, completed_tasks, pending_tasks, findings, status_file_path
- [ ] 2.5 Implement plan status validation to ensure plan files are valid and not corrupted
- [ ] 2.6 Add plan status injection logic that adds plan context to command execution environment
- [ ] 2.7 Create plan-aware artifact filtering that prioritizes artifacts from current plan context
- [ ] 2.8 Implement plan status caching to avoid re-reading plan files on every command
- [ ] 2.9 Add plan status change detection to invalidate cache when plan files are modified
- [ ] 2.10 Create plan status summary formatter for display in command context

**VERIFY 2:** When a plan is active, context loading hook successfully loads plan status, extracts current task information, loads related findings, and injects plan context into command environment. Verify plan-aware artifact filtering returns artifacts from current plan first.

---

## Phase 3: Artifact Registry Integration
**Objective:** Connect context loader with artifact registry for hybrid discovery and intelligent filtering

- [ ] 3.1 Integrate DiscoveryCoordinator for hybrid artifact lookup (registry → convention → filesystem)
- [ ] 3.2 Implement command-to-artifact-type mapping configuration (e.g., /clarify consumes constraints, /architect consumes requirements)
- [ ] 3.3 Create compatibility checking that validates artifact versions are compatible with command requirements
- [ ] 3.4 Add artifact relationship traversal to load upstream dependencies when needed
- [ ] 3.5 Implement artifact tag-based filtering to match artifacts with command context (feature, component, project)
- [ ] 3.6 Create artifact recency preferences that favor newer artifacts when multiple matches exist
- [ ] 3.7 Add artifact confidence scoring that prioritizes high-confidence artifacts in loading order
- [ ] 3.8 Implement artifact registry query optimization using ArtifactIndex for fast lookups (<5ms)
- [ ] 3.9 Create fallback discovery strategies when registry lookup fails (convention-based, filesystem scan)
- [ ] 3.10 Add artifact loading strategy configuration: strict (registry only), fast (registry+convention), thorough (all layers)

**VERIFY 3:** Registry integration enables fast artifact discovery (<5ms for registry hits), correctly falls through discovery layers on cache miss, validates artifact compatibility with command requirements, and applies filtering based on tags, recency, and confidence scores.

---

## Phase 4: Command Argument Parsing
**Objective:** Parse command invocations and arguments to infer required artifacts and dependencies

- [ ] 4.1 Create command argument parser that extracts command name and arguments from user prompt
- [ ] 4.2 Implement argument type detection (artifact references, file paths, flags, free text)
- [ ] 4.3 Add artifact reference resolver that converts `@artifact-id` syntax to loaded artifacts
- [ ] 4.4 Create file path resolver that resolves relative paths to absolute paths based on project root
- [ ] 4.5 Implement implicit dependency inference (e.g., /test implies test files from /spec output)
- [ ] 4.6 Add explicit dependency extraction from command arguments (--requires, --input flags)
- [ ] 4.7 Create argument validation to ensure required arguments are present and valid
- [ ] 4.8 Implement argument enrichment that adds inferred context to parsed arguments
- [ ] 4.9 Add argument normalization to standardize formats across different command styles
- [ ] 4.10 Create parsed argument structure with fields: command, subcommand, explicit_deps, implicit_deps, flags, enriched_context

**VERIFY 4:** Command parser correctly extracts command name and arguments, resolves artifact references, infers implicit dependencies based on command type, validates required arguments, and produces enriched argument structure. Test with commands using @artifact-id references, file paths, and various flag combinations.

---

## Phase 5: Prerequisite Validation and Error Handling
**Objective:** Validate all prerequisites before command execution and provide actionable error messages

- [ ] 5.1 Create prerequisite validator that checks for required artifacts before command execution
- [ ] 5.2 Implement validation rules per command type (e.g., /architect requires requirements artifact)
- [ ] 5.3 Add missing artifact detector that identifies which prerequisites are absent
- [ ] 5.4 Create blocking error generator that returns exit code 2 when critical prerequisites missing
- [ ] 5.5 Implement suggestion engine that recommends commands to create missing artifacts (e.g., "Run /clarify to create requirements")
- [ ] 5.6 Add artifact version compatibility validator that warns on major version mismatches
- [ ] 5.7 Create prerequisite validation cache to avoid redundant checks within session
- [ ] 5.8 Implement validation bypass flags for advanced users (--skip-validation)
- [ ] 5.9 Add validation severity levels: error (blocking), warning (non-blocking), info (logged only)
- [ ] 5.10 Create detailed validation report with all checks, results, and recommendations
- [ ] 5.11 Implement validation timeout to prevent hook from blocking indefinitely

**VERIFY 5:** Prerequisite validation correctly identifies missing artifacts, blocks command execution with exit code 2 when critical dependencies absent, provides helpful suggestions for resolution, and completes validation within timeout. Test with missing requirements, superseded artifacts, and version incompatibilities.

---

## Phase 6: Environment Setup and Metadata Collection
**Objective:** Detect and inject project environment metadata into command context

- [ ] 6.1 Create git context detector that extracts branch, commit SHA, clean status, and remote info
- [ ] 6.2 Implement project metadata reader that parses package.json, pyproject.toml, or equivalent project files
- [ ] 6.3 Add session tracking that generates unique session ID and tracks start time
- [ ] 6.4 Create workspace detector that identifies project root directory and workspace structure
- [ ] 6.5 Implement environment variable loader that reads relevant env vars (.env files, process.env)
- [ ] 6.6 Add dependency manifest reader that extracts installed package versions
- [ ] 6.7 Create configuration file reader that loads .claude/settings.json and project-specific settings
- [ ] 6.8 Implement environment metadata structure with fields: git_context, project_metadata, session_info, workspace_info, config
- [ ] 6.9 Add environment validation to warn about potential issues (dirty git state, missing dependencies)
- [ ] 6.10 Create environment snapshot serialization for checkpoint/resume capability
- [ ] 6.11 Implement environment change detection to invalidate context when project state changes

**VERIFY 6:** Environment setup correctly detects git context (branch, commit, clean status), loads project metadata from package.json, generates unique session ID, identifies workspace root, and creates comprehensive environment snapshot. Verify warnings appear for dirty git state.

---

## Phase 7: Hook Configuration and Settings
**Objective:** Implement flexible configuration system for context loading behavior

- [ ] 7.1 Extend `.claude/settings.json` schema to include `context_loading` configuration section
- [ ] 7.2 Create configuration schema with fields: enabled, timeout_ms, discovery_mode, validation_level, cache_ttl, auto_load_plan_status
- [ ] 7.3 Implement per-command configuration overrides that customize behavior for specific commands
- [ ] 7.4 Add artifact loading rules configuration (which artifact types to load for each command)
- [ ] 7.5 Create hook trigger configuration (UserPromptSubmit, PreToolUse events)
- [ ] 7.6 Implement validation rules configuration (required artifacts, version constraints per command)
- [ ] 7.7 Add exclusion patterns configuration to skip context loading for certain commands (e.g., /help, /status)
- [ ] 7.8 Create configuration validation to ensure settings are valid and compatible
- [ ] 7.9 Implement configuration hot-reload that applies settings changes without restart
- [ ] 7.10 Add configuration documentation with examples for common use cases

**VERIFY 7:** Configuration system loads settings from `.claude/settings.json`, applies per-command overrides, respects timeout and validation level settings, excludes specified commands, and supports hot-reload. Test by modifying config and verifying behavior changes without restart.

---

## Phase 8: Hook Integration with Event System
**Objective:** Integrate context loading hook with UserPromptSubmit and PreToolUse event lifecycle

- [ ] 8.1 Create hook registration logic that registers context loader on UserPromptSubmit event
- [ ] 8.2 Implement PreToolUse hook integration for Skill tool matcher
- [ ] 8.3 Add hook execution wrapper that catches errors and converts to appropriate exit codes (0, 1, 2)
- [ ] 8.4 Create context injection interface that passes loaded context to command execution environment
- [ ] 8.5 Implement hook execution logging with start time, duration, artifacts loaded, and outcome
- [ ] 8.6 Add hook execution metrics collection (success rate, average duration, cache hit rate)
- [ ] 8.7 Create hook chaining support to allow multiple pre-command hooks in sequence
- [ ] 8.8 Implement hook short-circuit logic that stops execution on exit code 2 (blocking error)
- [ ] 8.9 Add hook timeout enforcement that kills hung hooks after configured timeout
- [ ] 8.10 Create hook execution context with fields: event_type, tool_name, arguments, timestamp, session_id
- [ ] 8.11 Implement hook result structure with fields: exit_code, artifacts_loaded, validation_results, suggestions, duration_ms

**VERIFY 8:** Hook successfully registers on UserPromptSubmit and PreToolUse events, executes before command runs, injects loaded context into execution environment, returns appropriate exit codes, respects timeout, and logs all execution metrics. Verify blocking errors (exit code 2) prevent command execution.

---

## Phase 9: Context Injection and Formatting
**Objective:** Format and inject loaded context into command prompts and execution environments

- [ ] 9.1 Create context formatter that converts loaded artifacts and metadata into structured format
- [ ] 9.2 Implement artifact reference injection that adds "Available artifacts:" section to command context
- [ ] 9.3 Add plan status injection that adds "Active plan:" section with current task and progress
- [ ] 9.4 Create environment context injection that adds "Project context:" section with git and metadata
- [ ] 9.5 Implement context template system for customizable formatting per command type
- [ ] 9.6 Add context size limiting to prevent overwhelming command with too much context (max 4000 tokens)
- [ ] 9.7 Create context prioritization that includes most relevant information when size limit exceeded
- [ ] 9.8 Implement artifact summary generation for large artifacts (show metadata instead of full content)
- [ ] 9.9 Add context rendering modes: full (all details), summary (key info only), minimal (IDs and paths)
- [ ] 9.10 Create context injection strategies: prepend (add to start of prompt), append (add to end), environment (pass as env vars)

**VERIFY 9:** Context formatter produces well-structured output, injection adds context sections to command prompts without breaking formatting, respects token limits, prioritizes relevant information, and supports different rendering modes. Test with large artifacts to verify summarization works.

---

## Phase 10: Performance Optimization and Caching
**Objective:** Optimize context loading performance for fast hook execution (<50ms typical case)

- [ ] 10.1 Implement multi-level caching: in-memory (60s TTL), session-level (until session ends)
- [ ] 10.2 Create cache key generation based on command, arguments, project state, and plan status
- [ ] 10.3 Add cache invalidation triggers: artifact registration, plan status change, git state change
- [ ] 10.4 Implement parallel artifact loading for independent artifacts (Promise.all)
- [ ] 10.5 Create lazy loading for non-critical artifacts (load in background after command starts)
- [ ] 10.6 Add artifact loading priority queue (critical artifacts first, optional artifacts later)
- [ ] 10.7 Implement streaming context injection for large artifacts (load and inject incrementally)
- [ ] 10.8 Create performance profiling hooks to measure time spent in each loading phase
- [ ] 10.9 Add performance budget enforcement (warn if loading exceeds 50ms, error if exceeds timeout)
- [ ] 10.10 Implement adaptive timeout that adjusts based on historical performance
- [ ] 10.11 Create performance metrics dashboard data: avg load time, cache hit rate, timeout rate

**VERIFY 10:** Performance optimization achieves <50ms load time for cached artifacts, <500ms for uncached registry lookups, cache hit rate >70% in typical workflows, parallel loading reduces total time by 30%+, and performance metrics are collected accurately. Benchmark with 10, 50, 100 artifacts in registry.

---

## Phase 11: Error Recovery and Degraded Mode
**Objective:** Implement graceful degradation when context loading encounters errors

- [ ] 11.1 Create error classification for context loading failures: timeout, missing artifact, invalid format, filesystem error
- [ ] 11.2 Implement graceful degradation mode that allows command execution with partial context
- [ ] 11.3 Add warning message generation for non-blocking errors (exit code 1)
- [ ] 11.4 Create blocking error message generation for critical failures (exit code 2)
- [ ] 11.5 Implement fallback strategies when primary artifact loading fails (use cached, use convention-based, use empty context)
- [ ] 11.6 Add retry logic for transient failures (network issues, file locking)
- [ ] 11.7 Create error context preservation for debugging (what was attempted, why it failed)
- [ ] 11.8 Implement error reporting to user with actionable suggestions
- [ ] 11.9 Add degraded mode indicators in injected context ("Warning: Partial context loaded")
- [ ] 11.10 Create error recovery suggestions based on failure type

**VERIFY 11:** Hook gracefully handles missing artifacts (warns but continues), invalid artifact format (skips and warns), filesystem errors (retries then fails), and timeouts (returns partial context). Verify exit codes match error severity and suggestions are helpful.

---

## Phase 12: Testing and Validation
**Objective:** Comprehensive testing of context loading hook across all scenarios

- [ ] 12.1 Create unit tests for artifact discovery and loading (30+ test cases)
- [ ] 12.2 Implement tests for plan status injection with various plan states
- [ ] 12.3 Add tests for artifact registry integration and discovery fallback
- [ ] 12.4 Create tests for command argument parsing with complex argument structures
- [ ] 12.5 Implement prerequisite validation tests covering all validation rules
- [ ] 12.6 Add tests for environment setup and metadata collection
- [ ] 12.7 Create configuration loading and override tests
- [ ] 12.8 Implement hook integration tests with UserPromptSubmit and PreToolUse events
- [ ] 12.9 Add performance tests to verify <50ms typical case and <5000ms timeout enforcement
- [ ] 12.10 Create error handling tests for all failure scenarios
- [ ] 12.11 Implement cache effectiveness tests (hit rate, invalidation)
- [ ] 12.12 Add end-to-end tests with real commands and full context loading
- [ ] 12.13 Create edge case tests: concurrent loading, missing files, circular dependencies
- [ ] 12.14 Implement regression tests for discovered bugs

**VERIFY 12:** All unit tests pass with 85%+ code coverage, integration tests verify hook works with event system, performance tests confirm timing requirements met, error handling tests cover all failure modes, and end-to-end tests demonstrate full functionality with real commands.

---

## Phase 13: Documentation and Examples
**Objective:** Create comprehensive documentation and practical examples for context loading hook

- [ ] 13.1 Write architecture documentation explaining context loading design and flow
- [ ] 13.2 Create configuration guide for `.claude/settings.json` context loading settings
- [ ] 13.3 Write user guide explaining how context loading works and what artifacts are loaded
- [ ] 13.4 Create troubleshooting guide for common context loading issues
- [ ] 13.5 Add example configurations for different use cases (strict validation, fast loading, thorough discovery)
- [ ] 13.6 Write artifact reference syntax guide (@artifact-id, implicit references)
- [ ] 13.7 Create performance tuning guide for optimizing context loading
- [ ] 13.8 Add API reference documentation for hook interfaces and data structures
- [ ] 13.9 Write migration guide for enabling context loading in existing projects
- [ ] 13.10 Create visual diagrams showing context loading flow and decision tree

**VERIFY 13:** Documentation is complete, accurate, and includes working examples. Configuration guide covers all settings, troubleshooting guide addresses common issues, and diagrams clearly illustrate context loading architecture and flow.

---

## Success Criteria
- [ ] Context loading hook successfully loads relevant artifacts for all command types using registry discovery
- [ ] Hook integrates with UserPromptSubmit and PreToolUse events and executes before command runs
- [ ] Artifact discovery completes within 3000-5000ms timeout with >70% cache hit rate
- [ ] Plan status injection correctly loads and injects active plan context when plan is active
- [ ] Command argument parsing extracts explicit and implicit dependencies accurately
- [ ] Prerequisite validation blocks execution (exit code 2) when critical artifacts missing and provides helpful suggestions
- [ ] Environment setup detects git context, project metadata, and session info correctly
- [ ] Configuration system loads settings from `.claude/settings.json` and supports per-command overrides
- [ ] Context injection formats and adds context to command prompts without breaking execution
- [ ] Performance optimization achieves <50ms load time for cached artifacts and <500ms for registry lookups
- [ ] Error handling gracefully degrades on non-critical failures and provides actionable error messages
- [ ] All components have 85%+ test coverage with passing unit, integration, and end-to-end tests
- [ ] Documentation provides clear guidance with working examples and architecture diagrams

---

## Dependencies
- Artifact Registry System (for artifact discovery and loading)
- Plan Execution System (for plan status loading)
- Hook Infrastructure (for UserPromptSubmit and PreToolUse integration)
- Configuration Management (`.claude/settings.json` parsing)
- Command Execution Framework (for context injection)

## Risks and Mitigations
- **Risk:** Context loading adds significant latency to command execution
  - **Mitigation:** Implement aggressive caching, parallel loading, lazy loading for non-critical artifacts, performance budgets
- **Risk:** Over-aggressive artifact loading overwhelms command context with irrelevant information
  - **Mitigation:** Implement smart filtering by command type, context size limits, artifact summarization, relevance scoring
- **Risk:** Prerequisite validation blocks legitimate use cases with false positives
  - **Mitigation:** Configurable validation severity levels, validation bypass flags, clear error messages with override instructions
- **Risk:** Hook failures cause commands to fail unexpectedly
  - **Mitigation:** Graceful degradation mode, comprehensive error handling, non-blocking warnings for recoverable errors
- **Risk:** Cache invalidation bugs cause stale context to be injected
  - **Mitigation:** Conservative invalidation strategy (invalidate on any artifact/plan change), cache TTL limits, cache validation checks

## Future Enhancements
- Machine learning-based artifact relevance prediction for smarter loading
- Distributed caching for multi-user/multi-machine setups
- Context loading analytics dashboard for monitoring performance and usage patterns
- Smart context compression that learns which information is most valuable per command type
- Integration with external context sources (API documentation, issue trackers, etc.)
- Predictive pre-loading based on command usage patterns
- Context diff visualization showing what changed since last command execution
- A/B testing framework for optimizing context loading strategies
