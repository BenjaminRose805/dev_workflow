# Implementation Plan: Error Recovery Hooks

## Overview
- **Goal:** Implement comprehensive error recovery framework with automatic retry, checkpoint/resume, and rollback capabilities
- **Priority:** P1 (Infrastructure)
- **Created:** {{date}}
- **Output:** `docs/plan-outputs/implement-error-recovery-hooks/`
- **Category:** Hook Infrastructure

> Error recovery hooks provide a robust framework for handling failures in agent workflows. This system classifies errors, implements automatic retry strategies with exponential backoff, supports checkpoint/resume for long-running operations, enables rollback to previous states, and provides manual intervention prompts for user-recoverable errors. The infrastructure integrates with PostToolUse and PreToolUse hooks to intercept failures and apply appropriate recovery strategies.

---

## Phase 1: Error Classification System
**Objective:** Implement error categorization and context preservation for intelligent recovery decision-making

- [ ] 1.1 Create error classification types enum with five categories: recoverable_transient, recoverable_validation, partial_failure, non_recoverable, user_intervention
- [ ] 1.2 Implement error classifier function that analyzes error messages, exit codes, and tool types to assign categories
- [ ] 1.3 Design error context data structure with fields: error_id, timestamp, category, tool_name, error_message, stack_trace, context_snapshot, recovery_attempts, recovery_history
- [ ] 1.4 Create error context serialization to JSON format for persistence across recovery attempts
- [ ] 1.5 Implement error registry/store to track errors during workflow execution
- [ ] 1.6 Add error classification rules configuration file for customizing classification logic
- [ ] 1.7 Create unit tests for error classification across different error types and scenarios

**VERIFY 1:** Error classifier correctly categorizes at least 20 test cases covering all five error categories, and error context JSON structure contains all required fields with proper data types

---

## Phase 2: Automatic Retry with Exponential Backoff
**Objective:** Implement automatic retry mechanism for transient failures with configurable backoff strategies

- [ ] 2.1 Create retry configuration schema with fields: max_attempts, initial_delay_ms, max_delay_ms, backoff_multiplier, jitter_enabled
- [ ] 2.2 Implement exponential backoff calculator that computes delay based on attempt number and configuration
- [ ] 2.3 Add jitter randomization to prevent thundering herd problems in distributed scenarios
- [ ] 2.4 Create retry executor that wraps tool execution with automatic retry logic
- [ ] 2.5 Implement retry condition evaluator that determines if error is retry-eligible based on classification
- [ ] 2.6 Add retry tracking to error context to record all retry attempts with timestamps and outcomes
- [ ] 2.7 Create configurable retry policies per tool type (e.g., network operations vs. file operations)
- [ ] 2.8 Implement retry circuit breaker to prevent infinite retry loops when system is degraded
- [ ] 2.9 Add logging and telemetry for retry attempts with duration, outcome, and backoff delay
- [ ] 2.10 Create tests for retry logic including success after N attempts, max attempts exceeded, and backoff timing

**VERIFY 2:** Retry mechanism successfully recovers from simulated transient failures within configured max_attempts, exponential backoff delays are calculated correctly (verify timing), and circuit breaker prevents retries after threshold is exceeded

---

## Phase 3: Checkpoint and Resume Capability
**Objective:** Enable saving workflow progress and resuming from failure points for long-running operations

- [ ] 3.1 Design checkpoint data structure with fields: checkpoint_id, workflow_id, timestamp, completed_tasks, pending_tasks, state_snapshot, artifacts_created
- [ ] 3.2 Create checkpoint storage interface (file-based initially, extensible for other backends)
- [ ] 3.3 Implement checkpoint writer that serializes workflow state to disk at designated savepoints
- [ ] 3.4 Add automatic checkpoint creation after each successful tool execution in batch operations
- [ ] 3.5 Create checkpoint reader that deserializes saved state for resume operations
- [ ] 3.6 Implement resume logic that reconstructs workflow state and continues from last checkpoint
- [ ] 3.7 Add checkpoint cleanup mechanism to remove old checkpoints after successful completion
- [ ] 3.8 Create checkpoint validation to ensure integrity before resume (checksum verification)
- [ ] 3.9 Implement manual checkpoint triggers via hook configuration for critical operations
- [ ] 3.10 Add checkpoint metadata index for quick lookup and recovery point selection
- [ ] 3.11 Create tests for checkpoint save/restore cycle, partial completion resume, and corrupted checkpoint handling

**VERIFY 3:** Workflow with 10 sequential tasks can be interrupted at any point, then successfully resumed from the last checkpoint without re-executing completed tasks, and checkpoint files contain complete state information for accurate resume

---

## Phase 4: Rollback Mechanisms
**Objective:** Implement state rollback capabilities to undo partial changes when recovery is not possible

- [ ] 4.1 Design rollback transaction log structure with fields: operation_id, tool_name, action_type, original_state, new_state, rollback_script
- [ ] 4.2 Create transaction logger that records reversible operations during tool execution
- [ ] 4.3 Implement rollback generators for common operations: file edits, file creation, directory operations, git operations
- [ ] 4.4 Add rollback executor that applies inverse operations in reverse chronological order
- [ ] 4.5 Create rollback verification to confirm state has been restored to pre-operation condition
- [ ] 4.6 Implement partial rollback for operations that partially succeeded before failure
- [ ] 4.7 Add rollback safety checks to prevent data loss (e.g., confirm before deleting created files)
- [ ] 4.8 Create rollback strategy configuration to define which operations support automatic rollback
- [ ] 4.9 Implement rollback conflict detection when original state has changed since operation began
- [ ] 4.10 Add rollback reporting to show what was undone and final system state
- [ ] 4.11 Create tests for full rollback, partial rollback, and rollback failure scenarios

**VERIFY 4:** After a batch operation fails at task 5 of 10, rollback successfully reverses changes from tasks 1-4, restoring all modified files to original state (verify with file content comparison and git status)

---

## Phase 5: Manual Intervention Prompts
**Objective:** Create user intervention framework for errors requiring human decision-making or external fixes

- [ ] 5.1 Design intervention prompt data structure with fields: prompt_id, error_context, suggested_actions, user_options, timeout_behavior
- [ ] 5.2 Create intervention prompt generator that formats error information into user-friendly prompts
- [ ] 5.3 Implement intervention handler that displays prompt and waits for user input
- [ ] 5.4 Add pre-defined intervention templates for common scenarios: authentication failures, missing dependencies, permission errors, resource conflicts
- [ ] 5.5 Create user response parser that interprets intervention choices (retry, skip, abort, manual_fix_complete)
- [ ] 5.6 Implement intervention timeout mechanism with configurable default actions
- [ ] 5.7 Add intervention logging to track user decisions and outcomes for future learning
- [ ] 5.8 Create intervention approval gates for high-risk operations requiring explicit user consent
- [ ] 5.9 Implement intervention escalation when automated recovery fails after N attempts
- [ ] 5.10 Add intervention context preservation so users have full error history when making decisions
- [ ] 5.11 Create tests for intervention flow including user confirmation, timeout behavior, and retry after manual fix

**VERIFY 5:** When a permission error occurs, system displays clear intervention prompt with error details and action options, waits for user input (or times out after configured period), and correctly processes user's choice to continue workflow

---

## Phase 6: Hook Configuration and Integration
**Objective:** Integrate error recovery into PostToolUse and PreToolUse hooks with flexible configuration

- [ ] 6.1 Extend .claude/settings.json schema to include error_recovery section with global configuration
- [ ] 6.2 Create hook configuration options: recovery_enabled, auto_retry_enabled, checkpoint_enabled, rollback_enabled, intervention_enabled
- [ ] 6.3 Implement PostToolUse hook integration to intercept tool failures and trigger recovery logic
- [ ] 6.4 Add PreToolUse hook integration for pre-validation and environment setup before risky operations
- [ ] 6.5 Create per-tool recovery policy configuration to override global settings for specific tools
- [ ] 6.6 Implement hook exit code mapping: 0 (success, continue), 1 (non-blocking warning), 2 (blocking error, trigger recovery)
- [ ] 6.7 Add recovery strategy selection logic based on error category and configuration
- [ ] 6.8 Create dependency failure propagation handling for batch operations (fail-fast vs. continue-on-error)
- [ ] 6.9 Implement SessionStart hook integration to load previous checkpoints for session resume
- [ ] 6.10 Add SessionEnd hook integration to clean up recovery state and generate recovery reports
- [ ] 6.11 Create hook configuration validation to ensure recovery settings are valid and compatible
- [ ] 6.12 Implement recovery metrics collection for monitoring (recovery success rate, average retry count, checkpoint usage)
- [ ] 6.13 Create configuration migration tool to update existing .claude/settings.json files with recovery defaults

**VERIFY 6:** PostToolUse hook successfully intercepts a tool failure, applies configured recovery strategy (verify retry was attempted), and either recovers successfully or escalates to intervention. Configuration changes in .claude/settings.json correctly modify recovery behavior.

---

## Phase 7: Workflow Integration Patterns
**Objective:** Implement recovery patterns for complex workflows including batch operations and dependencies

- [ ] 7.1 Create batch operation recovery orchestrator that manages recovery for multiple sequential tasks
- [ ] 7.2 Implement dependency graph analysis to determine impact of task failures on downstream tasks
- [ ] 7.3 Add dependency failure propagation modes: fail_all_dependents, continue_independent, user_decide
- [ ] 7.4 Create parallel task recovery coordination to handle concurrent failures
- [ ] 7.5 Implement resume-from-failure-point logic for batch operations using checkpoints
- [ ] 7.6 Add task skipping capability when dependencies fail but downstream tasks can continue
- [ ] 7.7 Create recovery priority ordering for when multiple failures occur simultaneously
- [ ] 7.8 Implement cascading rollback for dependent task chains when parent task fails
- [ ] 7.9 Add workflow-level recovery policy configuration (aggressive retry vs. cautious intervention)
- [ ] 7.10 Create recovery report generator that summarizes all recovery actions taken during workflow
- [ ] 7.11 Implement tests for batch operation recovery, dependency failure scenarios, and complex workflows

**VERIFY 7:** In a workflow with 15 tasks where task 6 depends on tasks 3-5 and task 10 depends on task 6, when task 4 fails and recovers successfully, dependent tasks 6 and 10 execute correctly. When task 4 fails permanently, tasks 6 and 10 are properly skipped or aborted based on configured propagation mode.

---

## Phase 8: Advanced Recovery Patterns (P2)
**Objective:** Implement advanced recovery capabilities including circuit breaker and webhooks

- [ ] 8.1 Create circuit breaker state machine with states: closed, open, half_open
- [ ] 8.2 Implement circuit breaker failure threshold tracking (e.g., open after 5 failures in 60 seconds)
- [ ] 8.3 Add circuit breaker automatic recovery attempt after cooldown period (half_open state)
- [ ] 8.4 Create circuit breaker configuration per tool or system-wide
- [ ] 8.5 Implement webhook notification system for recovery events (failure, success, intervention_required)
- [ ] 8.6 Add webhook configuration schema with URL, auth, retry policy, event filters
- [ ] 8.7 Create webhook payload templates with error context and recovery status
- [ ] 8.8 Implement full workflow rollback that undoes all changes from workflow start to failure point
- [ ] 8.9 Add recovery command interfaces for manual triggering: /recover, /retry, /rollback, /resume
- [ ] 8.10 Create recovery dashboard data export for monitoring and analytics
- [ ] 8.11 Implement tests for circuit breaker state transitions, webhook delivery, and full rollback scenarios

**VERIFY 8:** Circuit breaker opens after 5 consecutive failures, prevents further attempts during cooldown, and automatically transitions to half_open for recovery attempt. Webhook successfully delivers recovery event notification to configured endpoint with complete error context.

---

## Phase 9: Testing and Validation
**Objective:** Comprehensive testing of error recovery infrastructure across all components

- [ ] 9.1 Create unit tests for error classifier with 30+ test cases covering all error categories
- [ ] 9.2 Implement integration tests for retry logic with simulated transient failures
- [ ] 9.3 Add checkpoint/resume integration tests with interrupted workflows of varying complexity
- [ ] 9.4 Create rollback integration tests for file operations, git operations, and multi-step transactions
- [ ] 9.5 Implement intervention prompt tests with automated user input simulation
- [ ] 9.6 Add hook integration tests verifying PostToolUse and PreToolUse recovery triggers
- [ ] 9.7 Create end-to-end workflow tests combining multiple recovery strategies
- [ ] 9.8 Implement failure injection framework for systematic chaos testing
- [ ] 9.9 Add performance tests to ensure recovery overhead is acceptable (< 50ms for classification)
- [ ] 9.10 Create edge case tests: concurrent failures, cascading failures, recovery during recovery
- [ ] 9.11 Implement configuration validation tests for all .claude/settings.json recovery options
- [ ] 9.12 Add regression tests for previously discovered recovery bugs
- [ ] 9.13 Create documentation tests to verify all examples in docs work correctly

**VERIFY 9:** All test suites pass with 100% success rate, code coverage for recovery modules exceeds 85%, and performance benchmarks show recovery classification and decision-making complete within 50ms. Chaos testing with random failure injection demonstrates successful recovery in 95%+ of scenarios.

---

## Phase 10: Documentation and Examples
**Objective:** Create comprehensive documentation and practical examples for error recovery usage

- [ ] 10.1 Write architecture documentation explaining error recovery design and components
- [ ] 10.2 Create configuration guide for .claude/settings.json recovery settings with all options explained
- [ ] 10.3 Write user guide for understanding recovery behavior and intervention prompts
- [ ] 10.4 Create recovery strategy selection guide (when to use retry vs. checkpoint vs. rollback)
- [ ] 10.5 Add example configurations for common scenarios: web scraping, file processing, API integration
- [ ] 10.6 Write troubleshooting guide for recovery issues with common problems and solutions
- [ ] 10.7 Create recovery metrics and monitoring guide for production usage
- [ ] 10.8 Add API reference documentation for recovery hooks and interfaces
- [ ] 10.9 Write migration guide for adding recovery to existing workflows
- [ ] 10.10 Create video/tutorial walkthrough of recovery features with real examples

**VERIFY 10:** Documentation is complete, accurate, and includes working examples that can be copy-pasted and executed successfully. At least 5 real-world scenario examples are provided with complete configuration files.

---

## Success Criteria
- [ ] Error classification system accurately categorizes errors into five defined categories with 95%+ accuracy on test dataset
- [ ] Automatic retry with exponential backoff successfully recovers from transient failures within configured attempts
- [ ] Checkpoint/resume capability enables long-running workflows to resume from failure point without re-executing completed tasks
- [ ] Rollback mechanism successfully reverses partial changes when recovery is not possible, verified through state comparison
- [ ] Manual intervention prompts appear for user_intervention category errors and correctly process user responses
- [ ] PostToolUse and PreToolUse hooks integrate seamlessly with recovery framework using configuration in .claude/settings.json
- [ ] Batch operations with dependencies correctly propagate failures and apply appropriate recovery strategies
- [ ] All recovery components have 85%+ test coverage with passing integration and end-to-end tests
- [ ] Recovery overhead adds less than 100ms latency to normal tool execution (when no errors occur)
- [ ] Documentation provides clear guidance for configuring and using all recovery features with working examples
- [ ] Circuit breaker prevents cascading failures and automatically recovers after cooldown period
- [ ] Recovery metrics and logging provide visibility into system behavior for monitoring and debugging

---

## Dependencies
- Hook system infrastructure (command lifecycle integration)
- Configuration management (.claude/settings.json parsing)
- Tool execution framework
- State persistence layer (checkpoints, transaction logs)
- User interaction/prompt system

## Risks and Mitigations
- **Risk:** Recovery logic introduces bugs that worsen failures
  - **Mitigation:** Comprehensive testing including chaos engineering, feature flags for gradual rollout
- **Risk:** Checkpoint files grow too large for complex workflows
  - **Mitigation:** Implement checkpoint compression, incremental checkpoints, configurable retention
- **Risk:** Rollback operations fail leaving system in inconsistent state
  - **Mitigation:** Rollback verification, transaction log integrity checks, dry-run mode for testing
- **Risk:** Automatic retry causes unintended side effects for non-idempotent operations
  - **Mitigation:** Per-tool retry policies, idempotency detection, user confirmation for risky operations

## Future Enhancements
- Machine learning-based error classification that improves over time
- Distributed recovery coordination for multi-agent workflows
- Recovery playbook templates for common failure scenarios
- Visual recovery dashboard for monitoring and manual intervention
- Integration with external monitoring systems (Datadog, Sentry, etc.)
- Smart retry that adapts backoff based on error patterns
- Recovery recommendation engine that suggests optimal strategies based on historical data
