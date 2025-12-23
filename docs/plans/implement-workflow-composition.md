# Implementation Plan: Workflow Composition

## Overview
- **Goal:** Implement workflow composition patterns enabling complex workflows built from simpler building blocks
- **Priority:** P2
- **Created:** 2025-12-22
- **Output:** `docs/plan-outputs/implement-workflow-composition/`

> Enable building complex workflows by composing simpler templates through sequential pipelines, parallel fan-out, conditional routing, loop-based iteration, and nested sub-workflows. Implement artifact handoff between composed workflows, scoping rules for variable isolation, and error handling across composition boundaries.

## Phase 1: Workflow Reference System

- [ ] 1.1 Design `workflow_ref` step type schema for referencing external workflow templates
- [ ] 1.2 Implement workflow loader to resolve and parse referenced workflow files
- [ ] 1.3 Create workflow registry to cache loaded workflow definitions
- [ ] 1.4 Implement workflow version resolution (explicit version vs latest)
- [ ] 1.5 Add circular reference detection to prevent infinite composition loops
- [ ] 1.6 Create workflow input/output binding validation between parent and child
- [ ] 1.7 Implement workflow path resolution (relative, absolute, registry-based)
- [ ] 1.8 Add workflow metadata extraction (name, version, inputs, outputs)
- [ ] **VERIFY 1**: Unit tests pass for workflow reference resolution. Can load `workflow: discovery-clarification` and validate input/output compatibility. Circular reference detected and rejected.

## Phase 2: Sequential Composition (Pipelines)

- [ ] 2.1 Implement sequential workflow chaining with `depends_on` between workflow refs
- [ ] 2.2 Create output-to-input binding syntax: `${steps.discover.outputs.requirements}`
- [ ] 2.3 Implement execution engine changes to wait for workflow completion before next step
- [ ] 2.4 Add status propagation from child workflow to parent step
- [ ] 2.5 Create progress tracking for sequential pipeline (current step, total steps)
- [ ] 2.6 Implement artifact path resolution for cross-workflow references
- [ ] 2.7 Add pipeline visualization showing workflow chain
- [ ] 2.8 Create checkpoint support for resuming failed pipelines
- [ ] **VERIFY 2**: Test pipeline: discovery → design → implement executes sequentially. Output from discovery feeds into design inputs. Pipeline resumes from checkpoint after failure.

## Phase 3: Parallel Composition (Fan-Out)

- [ ] 3.1 Implement `type: parallel` step containing multiple sub-workflows
- [ ] 3.2 Create parallel execution engine launching N workflows concurrently
- [ ] 3.3 Add configurable max concurrent workflows (default: 5)
- [ ] 3.4 Implement output collection from parallel branches
- [ ] 3.5 Create `${steps.parallel_step.outputs[*]}` syntax for collecting all outputs
- [ ] 3.6 Implement waiting strategies: `all`, `any`, `threshold(N)`
- [ ] 3.7 Add partial success handling with configurable minimum success rate
- [ ] 3.8 Create branch isolation ensuring parallel workflows don't share state
- [ ] 3.9 Implement progress reporting for parallel execution (N of M complete)
- [ ] 3.10 Add timeout handling for slow parallel branches
- [ ] **VERIFY 3**: Three validation workflows run in parallel. All must complete before aggregation step. One failure with `threshold(2)` still proceeds. Progress shows "2 of 3 complete".

## Phase 4: Conditional Composition

- [ ] 4.1 Implement condition expression on workflow ref steps
- [ ] 4.2 Add `condition: ${steps.assess.scope == 'minor'}` evaluation before execution
- [ ] 4.3 Create mutually exclusive branch detection and validation
- [ ] 4.4 Implement step skipping with status `skipped` (not `failed`)
- [ ] 4.5 Add `else` workflow support for if-then-else patterns
- [ ] 4.6 Create condition evaluation logging for debugging
- [ ] 4.7 Implement fallback chain pattern (try A, if fail try B, etc.)
- [ ] 4.8 Add condition coverage validation (ensure all paths handled)
- [ ] **VERIFY 4**: Conditional workflow routes to `simple-release` when scope=minor, `comprehensive-release` when scope=major. Skipped branch shows status `skipped`. Fallback chain tries 3 alternatives.

## Phase 5: Loop Composition

- [ ] 5.1 Implement `type: loop` step referencing a workflow to iterate
- [ ] 5.2 Create loop configuration: `max_iterations`, `exit_condition`
- [ ] 5.3 Add loop context variables: `loop.index`, `loop.iteration`, `loop.previous_output`
- [ ] 5.4 Implement exit condition evaluation after each iteration
- [ ] 5.5 Create loop state tracking (current iteration, outputs history)
- [ ] 5.6 Implement break on condition (`break_on_success`, `break_on_failure`)
- [ ] 5.7 Add loop output aggregation (collect all iteration results)
- [ ] 5.8 Create safety limit enforcement (max_iterations required)
- [ ] 5.9 Implement loop progress reporting
- [ ] **VERIFY 5**: Refinement loop executes until quality_score >= 0.85 or max 5 iterations. Loop context accessible in child workflow. Outputs from all iterations collected.

## Phase 6: Nested Composition

- [ ] 6.1 Implement nested parallel blocks within workflows
- [ ] 6.2 Create scope isolation for nested workflows (can't access sibling scope)
- [ ] 6.3 Add variable shadowing support (inner can override outer scope)
- [ ] 6.4 Implement depth limit for nesting (default: 5 levels)
- [ ] 6.5 Create scope chain visualization for debugging
- [ ] 6.6 Add output promotion from nested to parent scope
- [ ] 6.7 Implement nested error propagation rules
- [ ] 6.8 Create nested execution graph visualization
- [ ] **VERIFY 6**: Three-level nested workflow executes correctly. Inner workflow cannot access sibling's steps. Variable shadowing works (inner `version` overrides outer). Depth limit enforced.

## Phase 7: Artifact Handoff

- [ ] 7.1 Implement explicit artifact binding: `inputs: { architecture: ${steps.design.outputs.architecture} }`
- [ ] 7.2 Create artifact transformation support for type conversion
- [ ] 7.3 Implement shared read-only artifact pattern for parallel branches
- [ ] 7.4 Add artifact compatibility validation (type, version checking)
- [ ] 7.5 Create artifact snapshot mechanism for immutable handoff
- [ ] 7.6 Implement artifact versioning for composition tracking
- [ ] 7.7 Add artifact provenance tracking (which workflow created it)
- [ ] 7.8 Create artifact merge strategies for fan-in scenarios
- [ ] **VERIFY 7**: Artifact flows from design to implementation workflow. Parallel branches read same artifact without conflict. Artifact version mismatch detected and reported.

## Phase 8: Scoping Rules

- [ ] 8.1 Implement global scope (inputs, env, config) accessible to all workflows
- [ ] 8.2 Create workflow scope containing steps and outputs
- [ ] 8.3 Implement sub-workflow scope with own inputs/steps/outputs
- [ ] 8.4 Add scope isolation (parallel workflows cannot reference each other)
- [ ] 8.5 Create explicit output declaration requirement for cross-boundary access
- [ ] 8.6 Implement variable shadowing rules (inner shadows outer)
- [ ] 8.7 Add scope validation at composition time (not runtime)
- [ ] 8.8 Create scope debugging tools (show variable resolution chain)
- [ ] **VERIFY 8**: Variable from global scope accessible in sub-workflow. Parallel workflow A cannot access workflow B's steps. Explicit output crossing scope boundary works.

## Phase 9: Error Handling

- [ ] 9.1 Implement error propagation from child workflow to parent
- [ ] 9.2 Create `on_error: continue` for optional workflow steps
- [ ] 9.3 Implement `on_error: fallback` with fallback workflow definition
- [ ] 9.4 Add `on_error: recover` with recovery workflow steps
- [ ] 9.5 Create error context variables: `error.code`, `error.message`, `error.step`
- [ ] 9.6 Implement error configuration for different composition types:
  - `on_error_in_parallel: fail_fast | wait_for_all | partial`
  - `on_error_in_sequential: stop | skip | continue`
  - `on_error_in_loop: break | skip_iteration | retry`
- [ ] 9.7 Add error boundary isolation (error in sub-workflow doesn't crash parent)
- [ ] 9.8 Create error aggregation for parallel composition failures
- [ ] **VERIFY 9**: Error in sub-workflow captured by parent. `on_error: continue` proceeds despite failure. Parallel with `fail_fast` stops on first error. Error context accessible in recovery workflow.

## Phase 10: Integration and Documentation

- [ ] 10.1 Update workflow schema with all composition constructs
- [ ] 10.2 Create JSON schema validation for composition patterns
- [ ] 10.3 Implement composition-aware plan parser
- [ ] 10.4 Add execution engine support for all composition types
- [ ] 10.5 Create status output format showing composition hierarchy
- [ ] 10.6 Implement execution visualization for composed workflows
- [ ] 10.7 Add plan validation for composition anti-patterns
- [ ] 10.8 Create example plans demonstrating each composition pattern
- [ ] 10.9 Write user documentation for composition syntax
- [ ] 10.10 Document performance considerations (nesting depth, parallel limits)
- [ ] **VERIFY 10**: All composition patterns validate against schema. Complex workflow combining pipeline, parallel, conditional, and loop executes correctly. Status shows full composition hierarchy.

## Phase 11: Feature Development Workflow Template

- [ ] 11.1 Create `feature-complete` template using all composition patterns
- [ ] 11.2 Implement discovery phase as sequential workflow
- [ ] 11.3 Add parallel implementation phase (backend, frontend, docs, deploy prep)
- [ ] 11.4 Create validation phase with conditional release
- [ ] 11.5 Implement error handling with recovery workflows
- [ ] 11.6 Add approval gates at critical composition points
- [ ] 11.7 Create end-to-end test for feature development workflow
- [ ] **VERIFY 11**: Feature development workflow executes: discovery → design → parallel(implement, document, deploy-prep) → validation → conditional(release). All patterns working together.

## Success Criteria

- [ ] Sequential composition (pipelines) executes workflows in order with artifact handoff
- [ ] Parallel composition (fan-out) runs N workflows concurrently with configurable limits
- [ ] Conditional composition routes to correct workflow based on expression evaluation
- [ ] Loop composition iterates until exit condition with safety limits
- [ ] Nested composition supports 5 levels deep with proper scope isolation
- [ ] Artifact handoff validates compatibility and supports transformation
- [ ] Scoping rules isolate parallel workflows and allow explicit output crossing
- [ ] Error handling supports continue, fallback, and recover patterns
- [ ] Schema validates all composition patterns
- [ ] Feature development template demonstrates real-world composition
- [ ] Documentation covers syntax, patterns, and anti-patterns
- [ ] Test suite covers all composition scenarios with >90% coverage
