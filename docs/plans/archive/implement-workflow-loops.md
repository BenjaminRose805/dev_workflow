# Implementation Plan: Workflow Loops

## Overview

- **Goal:** Implement iterative loop patterns for workflows with robust termination conditions and infinite loop prevention
- **Priority:** P1 (Infrastructure)
- **Created:** 2025-12-22
- **Output:** `docs/plan-outputs/workflow-loops/`

## Description

Workflow loops enable iterative patterns like TDD cycles, validation-fix loops, coverage improvement, refinement iterations, and convergence loops. This infrastructure provides loop syntax, termination conditions, progress tracking, and safeguards against infinite loops.

---

## Dependencies

### Upstream
- `/workflow` command infrastructure (Phase 1)
- Workflow execution engine

### Downstream
- `/workflow:run` loop execution
- Workflow branching patterns
- TDD workflow templates

### External Tools
- None (uses built-in workflow engine)

---

## Phase 1: Core Loop Syntax & Execution

**Objective:** Implement basic loop constructs (while/until/for) with iteration counting and simple condition evaluation.

**Tasks:**
- [ ] 1.1 Design loop syntax schema in workflow YAML (while, until, for with max_iterations)
- [ ] 1.2 Implement loop parser to validate and normalize loop definitions
- [ ] 1.3 Create iteration counter to track current iteration number
- [ ] 1.4 Implement loop execution engine to run task blocks repeatedly
- [ ] 1.5 Add basic condition evaluation for loop continuation (boolean expressions)
- [ ] 1.6 Implement max_iterations hard limit for all loop types
- [ ] 1.7 Create iteration context variables (iteration_num, is_first, is_last)
- [ ] 1.8 Add loop state management (current iteration, loop started/completed flags)

**VERIFY Phase 1:**
- [ ] Simple while loop executes until condition becomes false
- [ ] Until loop executes until condition becomes true
- [ ] For loop with max_iterations stops after N iterations
- [ ] Iteration counter increments correctly
- [ ] Loop context variables accessible within loop body

---

## Phase 2: Loop Termination Conditions

**Objective:** Implement multiple termination condition types (exit code, metric-based, time-based, compound).

**Tasks:**
- [ ] 2.1 Implement exit code-based termination (stop on success/failure)
- [ ] 2.2 Add metric-based termination conditions (threshold comparisons)
- [ ] 2.3 Implement time-based termination (max_duration, deadline)
- [ ] 2.4 Create compound condition support (AND/OR combinations)
- [ ] 2.5 Add condition evaluation engine supporting multiple condition types
- [ ] 2.6 Implement early exit conditions (break on specific criteria)
- [ ] 2.7 Add termination reason tracking (why loop stopped)
- [ ] 2.8 Create termination condition validation at parse time

**VERIFY Phase 2:**
- [ ] Loop stops when task exit code matches termination criteria
- [ ] Metric-based conditions correctly evaluate thresholds
- [ ] Time-based limits enforced accurately
- [ ] Compound conditions (e.g., "max_iterations OR timeout") work correctly
- [ ] Termination reason captured and reported

---

## Phase 3: Infinite Loop Prevention

**Objective:** Implement safeguards including iteration budgets, progress metrics, circuit breaker, and change detection.

**Tasks:**
- [ ] 3.1 Create global iteration budget configuration (default and per-loop override)
- [ ] 3.2 Implement progress metric tracking (compare iteration N to N-1)
- [ ] 3.3 Add stall detection (no progress for X consecutive iterations)
- [ ] 3.4 Implement circuit breaker pattern (break after Y consecutive failures)
- [ ] 3.5 Create change detection mechanism (track state changes between iterations)
- [ ] 3.6 Add no-change termination (stop if nothing changed for X iterations)
- [ ] 3.7 Implement warning system for approaching limits
- [ ] 3.8 Create emergency brake for runaway loops (absolute hard limit)

**VERIFY Phase 3:**
- [ ] Loop terminates when iteration budget exhausted
- [ ] Stall detection triggers when no progress made
- [ ] Circuit breaker stops loop after consecutive failures
- [ ] Change detection identifies when state stops evolving
- [ ] Emergency brake prevents true infinite loops

---

## Phase 4: Progress Tracking & Checkpoints

**Objective:** Implement iteration state tracking, progress metrics, and checkpoint/resume capability.

**Tasks:**
- [ ] 4.1 Design iteration state schema (iteration history, metrics, outputs)
- [ ] 4.2 Implement iteration result storage (success/failure, outputs, metrics)
- [ ] 4.3 Create progress metric collection (custom and built-in metrics)
- [ ] 4.4 Add iteration comparison logic (delta calculations)
- [ ] 4.5 Implement checkpoint creation at configurable intervals
- [ ] 4.6 Add checkpoint persistence to disk
- [ ] 4.7 Create resume-from-checkpoint capability
- [ ] 4.8 Implement iteration summary reporting (all iterations overview)

**VERIFY Phase 4:**
- [ ] Iteration history preserved throughout loop execution
- [ ] Progress metrics calculated correctly between iterations
- [ ] Checkpoints created at specified intervals
- [ ] Loop can resume from checkpoint after interruption
- [ ] Iteration summary shows complete loop history

---

## Phase 5: Convergence Patterns

**Objective:** Implement convergence detection patterns (monotonic improvement, early exit, diminishing returns, manual gates).

**Tasks:**
- [ ] 5.1 Implement monotonic improvement tracking (metrics must improve each iteration)
- [ ] 5.2 Add early exit when target metric achieved
- [ ] 5.3 Create diminishing returns detection (improvement rate slowing)
- [ ] 5.4 Implement diminishing returns threshold configuration
- [ ] 5.5 Add manual gate pattern (require human approval to continue)
- [ ] 5.6 Create convergence criteria evaluation engine
- [ ] 5.7 Implement convergence state tracking (converging, diverging, oscillating)
- [ ] 5.8 Add convergence pattern reporting in results

**VERIFY Phase 5:**
- [ ] Monotonic improvement correctly identifies regression
- [ ] Early exit triggers when target achieved
- [ ] Diminishing returns detected when improvement slows
- [ ] Manual gate prompts for human approval
- [ ] Convergence state accurately reflects loop behavior

---

## Phase 6: Loop Pattern Templates

**Objective:** Create pre-built templates for common loop patterns (TDD, Validation-Fix, Coverage, Refinement, Convergence).

**Tasks:**
- [ ] 6.1 Create TDD Cycle loop template (write test, implement, verify)
- [ ] 6.2 Create Validation & Fix loop template (validate, fix issues, retry)
- [ ] 6.3 Create Coverage Improvement loop template (run tests, increase coverage, verify)
- [ ] 6.4 Create Refinement Loop template (implement, review, refine)
- [ ] 6.5 Create Convergence Loop template (optimize, measure, iterate until converged)
- [ ] 6.6 Add template instantiation from pattern name
- [ ] 6.7 Create template customization parameters
- [ ] 6.8 Document all loop pattern templates with examples

**VERIFY Phase 6:**
- [ ] Each pattern template creates correct loop structure
- [ ] Templates include appropriate termination conditions
- [ ] Pattern-specific metrics and checkpoints configured
- [ ] Template documentation clear and complete
- [ ] Templates instantiate with sensible defaults

---

## Phase 7: Integration & Error Handling

**Objective:** Integrate loops with existing workflow system, handle errors gracefully, and support nested loops.

**Tasks:**
- [ ] 7.1 Integrate loop execution with main workflow engine
- [ ] 7.2 Add loop support to workflow parser and validator
- [ ] 7.3 Implement nested loop support (loops within loops)
- [ ] 7.4 Add nested loop depth limits
- [ ] 7.5 Create loop error handling (task failures within loops)
- [ ] 7.6 Implement loop rollback on failure (if configured)
- [ ] 7.7 Add loop results aggregation (collect outputs from all iterations)
- [ ] 7.8 Create loop execution logging and debugging output

**VERIFY Phase 7:**
- [ ] Loops execute correctly within workflow context
- [ ] Nested loops work with proper scoping
- [ ] Errors within loop iterations handled appropriately
- [ ] Loop results properly aggregated and returned
- [ ] Loop execution can be debugged with detailed logging

---

## Phase 8: Testing & Validation

**Objective:** Comprehensive testing of all loop functionality with edge cases and performance validation.

**Tasks:**
- [ ] 8.1 Create unit tests for loop parser and validator
- [ ] 8.2 Add unit tests for condition evaluation engine
- [ ] 8.3 Create integration tests for each loop pattern
- [ ] 8.4 Add tests for all termination condition types
- [ ] 8.5 Create tests for infinite loop prevention mechanisms
- [ ] 8.6 Add tests for checkpoint and resume functionality
- [ ] 8.7 Create tests for convergence pattern detection
- [ ] 8.8 Add performance tests for loop overhead
- [ ] 8.9 Create end-to-end tests using real workflow examples
- [ ] 8.10 Add regression tests for edge cases (empty loops, single iteration, etc.)

**VERIFY Phase 8:**
- [ ] All unit tests pass with >90% coverage
- [ ] Integration tests validate each loop pattern works correctly
- [ ] Infinite loop prevention tests confirm safeguards work
- [ ] Checkpoint/resume tests verify state preservation
- [ ] Performance tests show acceptable overhead (<5% per iteration)
- [ ] Edge cases handled gracefully

---

## Success Criteria
- [ ] All loop syntax types (while, until, for) implemented and working
- [ ] All termination condition types (exit code, metric, time, compound) functional
- [ ] Infinite loop prevention mechanisms active and tested
- [ ] Progress tracking and checkpoints working with resume capability
- [ ] All convergence patterns implemented and validated
- [ ] All 5 loop pattern templates created and documented
- [ ] Nested loops supported with appropriate limits
- [ ] Comprehensive test suite passing with >90% coverage
- [ ] Loop execution overhead <5% per iteration
- [ ] Documentation complete with examples for each pattern
- [ ] Integration with existing workflow system seamless
- [ ] Error handling robust for all failure scenarios

---

## Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Performance overhead | Medium | Medium | Efficient state management and lazy evaluation |
| Complexity from nested loops | High | Medium | Thorough testing and depth limits |
| Infinite loops despite safeguards | High | Low | Multiple prevention layers and emergency brake |
| State management bloat | Medium | Medium | Configurable retention policies and cleanup |

---

## Notes

- Priority breakdown: P0 (Phase 1-2), P1 (Phase 3-5), P2 (Phase 6-8)
- Consider async loop execution for independent iterations
- May need UI component for manual gate approval
- Loop metrics should integrate with existing observability system
