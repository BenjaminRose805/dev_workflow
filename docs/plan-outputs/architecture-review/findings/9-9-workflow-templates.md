# 9.9 Common Workflow Templates

**Task:** Identify common workflow templates (TDD, traditional, exploratory)
**Date:** 2025-12-20
**Status:** Complete

---

## Executive Summary

Development workflows follow recognizable patterns that differ in philosophy, sequencing, and decision points. This analysis identifies six canonical workflow templates that cover the primary development methodologies: Test-Driven Development (TDD), Traditional Waterfall-style development, Exploratory Research, Bug Fixes, Refactoring, and Feature Development. Each template is expressed as a reusable YAML definition with clear phases, artifacts, hooks for customization, and conditional logic. Templates enable users to leverage proven methodologies while maintaining flexibility for project-specific variations.

---

## 1. Workflow Template Architecture

### 1.1 Template Structure

All workflow templates follow a common structure:

```yaml
name: {template-name}
description: {purpose}
version: 1.0.0
category: {category}

meta:
  aliases: [{alternative-names}]
  suited_for: [{project types}]
  complexity: {low|medium|high}
  estimated_duration: {hours}

inputs:
  - name: {param}
    type: {string|number|boolean|path}
    required: {true|false}
    default: {default-value}
    description: {explanation}

config:
  max_retries: {number}
  timeout_minutes: {number}
  parallel_limit: {number}

hooks:
  before_phase: [{phase-name}]  # Pre-execution customization
  after_phase: [{phase-name}]   # Post-execution customization
  on_failure: {policy}          # Error handling strategy

steps:
  # See step definition in sections below

outputs:
  {artifact-name}: ${steps.{step-id}.outputs.{field}}
```

### 1.2 Template Extension Mechanism

Templates support customization through:

1. **Parameter Override** - Accept inputs for common variations
2. **Hook Functions** - Custom code before/after phases
3. **Conditional Steps** - Branch based on inputs or runtime values
4. **Step Replacement** - Substitute commands for specific phases
5. **Artifact Redirection** - Map outputs to custom paths

Example customization:

```yaml
# Base template
/workflow:run tdd-feature --template tdd-feature

# Override parameters
--input feature_name=auth --input test_framework=jest --input coverage_target=90

# Use custom hook
--before-phase implement "run /architect:review"

# Substitute step
--replace-step implement --command "/implement:ai-assisted"
```

### 1.3 Common Workflow Artifacts

All templates produce consistent artifact types:

| Artifact Type | Format | Purpose |
|---------------|--------|---------|
| `requirements.json` | JSON schema | Clarified scope, acceptance criteria |
| `design.json` | JSON schema | Architecture, component designs, data models |
| `test-plan.json` | JSON schema | Test cases, coverage targets, test data |
| `implementation-report.json` | JSON | Code files, dependencies, build artifacts |
| `validation-results.json` | JSON | Test results, coverage, issues found |
| `completion-summary.md` | Markdown | Executive summary with timeline and decisions |

---

## 2. TDD Workflow Template

**Philosophy:** Test-first development where tests drive design and implementation.

**Suitable for:** Feature development with clear requirements, quality-critical components, greenfield projects.

**Complexity:** Medium | **Estimated Duration:** 4-8 hours per feature

### 2.1 TDD Phase Sequence

```
1. CLARIFY      → Gather requirements, acceptance criteria
2. TEST DESIGN  → Plan test cases, define test structure
3. IMPLEMENT    → Write code to pass tests
4. VALIDATE     → Verify all tests pass, check coverage
5. REFACTOR     → Clean code, improve design
6. DOCUMENT     → Create docs, examples, release notes
```

### 2.2 TDD YAML Template

```yaml
name: tdd-feature
description: Test-Driven Development for new features
version: 1.0.0
category: development
meta:
  aliases: [tdd, test-first]
  suited_for: [feature, component, library]
  complexity: medium
  estimated_duration: 6

inputs:
  - name: feature_name
    type: string
    required: true
    description: Name of feature being developed

  - name: test_framework
    type: string
    required: false
    default: vitest
    description: Test framework to use (vitest, jest, mocha)

  - name: coverage_target
    type: number
    required: false
    default: 80
    description: Minimum code coverage percentage

config:
  max_retries: 3
  timeout_minutes: 120
  parallel_limit: 2

hooks:
  before_phase:
    clarify: |
      Check if acceptance criteria document already exists
      Load previous feature requirements for context
    implement: |
      Verify all test cases passing before implementation
      Generate test output summary
  after_phase:
    validate: |
      Generate coverage report
      Flag any coverage gaps vs target
    refactor: |
      Run linter to check code style
      Verify no performance regression

steps:
  - id: clarify
    name: Clarify Requirements
    command: /clarify
    args: --for feature --input ${inputs.feature_name}
    outputs:
      requirements: docs/requirements/${inputs.feature_name}/requirements.json
      acceptance_criteria: docs/requirements/${inputs.feature_name}/acceptance.json

  - id: test_design
    name: Design Test Cases
    command: /test:plan
    depends_on: [clarify]
    inputs:
      requirements: ${steps.clarify.outputs.requirements}
      acceptance_criteria: ${steps.clarify.outputs.acceptance_criteria}
    outputs:
      test_plan: docs/test-plans/${inputs.feature_name}/test-plan.json
      test_fixtures: docs/test-plans/${inputs.feature_name}/fixtures/

  - id: implement
    name: Implement Feature
    command: /implement:feature
    depends_on: [test_design]
    args: |
      --feature ${inputs.feature_name}
      --test-framework ${inputs.test_framework}
      --test-plan ${steps.test_design.outputs.test_plan}
    outputs:
      source_code: src/features/${inputs.feature_name}/
      test_files: src/features/${inputs.feature_name}/__tests__/

  - id: validate
    name: Run Tests & Check Coverage
    command: /test:run
    depends_on: [implement]
    args: |
      --path src/features/${inputs.feature_name}/
      --coverage ${inputs.coverage_target}
    outputs:
      test_results: docs/test-results/${inputs.feature_name}/results.json
      coverage_report: docs/test-results/${inputs.feature_name}/coverage.json

  - id: validate_coverage
    name: Validate Coverage Target
    type: gate
    depends_on: [validate]
    condition: ${steps.validate.outputs.coverage_report.overall >= inputs.coverage_target}
    on_failure: [retry_implement, manual_review]

  - id: retry_implement
    name: Fix Coverage Gaps
    command: /implement:tests
    depends_on: [validate_coverage]
    condition: ${steps.validate_coverage.exit_code != 0}
    args: |
      --focus-gaps
      --test-results ${steps.validate.outputs.test_results}
      --coverage-report ${steps.validate.outputs.coverage_report}

  - id: refactor
    name: Refactor for Quality
    command: /refactor:code
    depends_on: [validate]
    args: |
      --path src/features/${inputs.feature_name}/
      --check-lint
      --check-types
    outputs:
      refactored_code: src/features/${inputs.feature_name}/
      refactor_summary: docs/refactoring/${inputs.feature_name}/summary.md

  - id: document
    name: Generate Documentation
    command: /document:feature
    depends_on: [refactor]
    args: |
      --feature ${inputs.feature_name}
      --source src/features/${inputs.feature_name}/
      --output docs/features/${inputs.feature_name}/
    outputs:
      documentation: docs/features/${inputs.feature_name}/README.md
      examples: docs/features/${inputs.feature_name}/examples/

  - id: manual_review
    name: Manual Review
    type: gate
    depends_on: [validate_coverage]
    condition: ${steps.validate_coverage.exit_code != 0}
    description: "Coverage target not met. Manual review required."

outputs:
  feature_source: ${steps.implement.outputs.source_code}
  test_files: ${steps.implement.outputs.test_files}
  documentation: ${steps.document.outputs.documentation}
  test_results: ${steps.validate.outputs.test_results}
  coverage_report: ${steps.validate.outputs.coverage_report}
  completion_summary: docs/tdd-summary/${inputs.feature_name}/summary.md

decision_points:
  - after: test_design
    question: "Proceed with implementation using this test plan?"
    options:
      - label: "Yes, implement"
        action: continue
      - label: "Revise test plan"
        action: restart_from[test_design]

  - after: validate
    question: "Coverage meets target. Proceed to refactoring?"
    options:
      - label: "Yes, continue"
        action: continue
      - label: "Improve coverage first"
        action: restart_from[implement]
```

### 2.3 TDD Key Characteristics

**Sequential Phases:**
1. Requirements → Test Design → Implementation → Validation → Refactoring → Documentation
2. Backward loops when tests fail or coverage is insufficient
3. No parallel execution (tests depend on implementation)

**Artifacts Produced:**
- Test specifications and fixtures
- Implementation with passing test suite
- Coverage metrics and reports
- Refactored code and quality metrics
- User and API documentation

**Decision Points:**
- After test design: Approve test plan before implementing
- After validation: Coverage meets target or needs improvement
- After refactoring: Ready for documentation and release

**Customization Points:**
- Test framework selection
- Coverage target threshold
- Code style/linting rules
- Documentation format (JSDoc, Markdown, etc.)

---

## 3. Traditional Workflow Template

**Philosophy:** Design-first approach with phases: specify requirements, design solution, implement, validate.

**Suitable for:** Enterprise projects, regulated industries, well-defined requirements, team projects.

**Complexity:** Medium-High | **Estimated Duration:** 8-16 hours per feature

### 3.1 Traditional Phase Sequence

```
1. CLARIFY      → Detailed requirements, user stories, acceptance criteria
2. DESIGN       → Architecture, data models, API specs, UI wireframes
3. IMPLEMENT    → Code following design, build dependencies
4. VALIDATE     → Integration testing, user acceptance, documentation
5. DOCUMENT     → API docs, user guide, deployment procedure
6. DEPLOY       → Release to production
```

### 3.2 Traditional YAML Template

```yaml
name: traditional-feature
description: Traditional waterfall-style feature development
version: 1.0.0
category: development
meta:
  aliases: [waterfall, design-first]
  suited_for: [enterprise, regulated, team-project]
  complexity: high
  estimated_duration: 12

inputs:
  - name: feature_name
    type: string
    required: true

  - name: team_lead
    type: string
    required: false
    description: Approval required from team lead

  - name: require_api_review
    type: boolean
    required: false
    default: true
    description: Require API review before implementation

config:
  max_retries: 2
  timeout_minutes: 180
  parallel_limit: 3

hooks:
  before_phase:
    design: |
      Load existing architecture documentation
      Check for related design documents
    implement: |
      Verify design approval signed off
      Setup CI/CD pipeline for branch
  after_phase:
    validate: |
      Generate test report
      Update project tracking system
    deploy: |
      Create release notes
      Update version numbers

steps:
  - id: clarify
    name: Clarify Requirements
    command: /clarify
    args: --feature ${inputs.feature_name} --detailed
    outputs:
      requirements: docs/requirements/${inputs.feature_name}/requirements.json
      user_stories: docs/requirements/${inputs.feature_name}/stories.md
      acceptance_criteria: docs/requirements/${inputs.feature_name}/acceptance.json

  - id: design
    name: Design Architecture & API
    command: /architect
    depends_on: [clarify]
    inputs:
      requirements: ${steps.clarify.outputs.requirements}
    outputs:
      architecture: docs/design/${inputs.feature_name}/architecture.json
      api_spec: docs/design/${inputs.feature_name}/api.openapi.yaml
      data_model: docs/design/${inputs.feature_name}/data-model.json
      ui_wireframes: docs/design/${inputs.feature_name}/wireframes/

  - id: design_review
    name: Design Review Gate
    type: gate
    depends_on: [design]
    description: "Design must be approved before implementation"
    approvers:
      - ${inputs.team_lead}
    condition: ${inputs.require_api_review}

  - id: implement
    name: Implement Feature
    command: /implement:feature
    depends_on: [design_review]
    args: |
      --feature ${inputs.feature_name}
      --design ${steps.design.outputs.architecture}
      --api-spec ${steps.design.outputs.api_spec}
    outputs:
      source_code: src/features/${inputs.feature_name}/
      dependencies: package.json

  - id: validate_integration
    name: Integration Testing
    command: /test:integration
    depends_on: [implement]
    args: |
      --feature ${inputs.feature_name}
      --api-spec ${steps.design.outputs.api_spec}
    outputs:
      integration_results: docs/testing/${inputs.feature_name}/integration-results.json
      test_report: docs/testing/${inputs.feature_name}/report.md

  - id: validate_uat
    name: User Acceptance Testing
    type: gate
    depends_on: [validate_integration]
    description: "Feature ready for UAT approval"
    approvers: [stakeholder]
    condition: ${steps.validate_integration.exit_code == 0}

  - id: document
    name: Generate Documentation
    command: /document:feature
    depends_on: [validate_uat]
    args: |
      --feature ${inputs.feature_name}
      --api-spec ${steps.design.outputs.api_spec}
      --include-examples
    outputs:
      user_guide: docs/user-guide/${inputs.feature_name}.md
      api_docs: docs/api/${inputs.feature_name}/
      deployment_guide: docs/deployment/${inputs.feature_name}.md

  - id: deploy_staging
    name: Deploy to Staging
    command: /deploy:staging
    depends_on: [document]
    args: --feature ${inputs.feature_name}
    outputs:
      deployment_log: docs/deployment/${inputs.feature_name}/staging-log.md
      staging_url: docs/deployment/${inputs.feature_name}/staging-url.txt

  - id: deploy_production
    name: Deploy to Production
    command: /deploy:production
    depends_on: [deploy_staging]
    type: gate
    approvers: [release-manager]
    description: "Ready for production deployment"

outputs:
  feature_source: ${steps.implement.outputs.source_code}
  architecture: ${steps.design.outputs.architecture}
  api_spec: ${steps.design.outputs.api_spec}
  test_results: ${steps.validate_integration.outputs.integration_results}
  documentation: ${steps.document.outputs.user_guide}

decision_points:
  - after: design
    question: "Design approved for implementation?"
    options:
      - label: "Yes, proceed to implementation"
        action: continue
      - label: "Request design revisions"
        action: restart_from[design]

  - after: validate_integration
    question: "Ready for user acceptance testing?"
    options:
      - label: "Yes, ready for UAT"
        action: continue
      - label: "Fix issues first"
        action: restart_from[implement]
```

### 3.3 Traditional Key Characteristics

**Distinct Phases:**
- Clear handoff points between phases
- Each phase depends on previous completion
- Design must be approved before implementation
- Integration testing spans implement and validate
- Multiple approval gates

**Artifacts Produced:**
- Detailed requirements and user stories
- Architecture and API specifications
- Data models and UI wireframes
- Implementation code and dependencies
- Integration test results
- Comprehensive documentation
- Deployment procedures

**Decision Points:**
- After design: Approval required before implementation
- After integration testing: UAT approval before deployment
- Before production: Release manager approval

**Customization Points:**
- Approval workflow and stakeholders
- Design documentation format
- Test scope and criteria
- Deployment environment configuration

---

## 4. Exploratory Workflow Template

**Philosophy:** Research-driven development with iterative discovery, prototyping, and refinement.

**Suitable for:** R&D projects, prototype development, proof-of-concepts, technology evaluation.

**Complexity:** Low-Medium | **Estimated Duration:** 6-12 hours per exploration cycle

### 4.1 Exploratory Phase Sequence

```
1. RESEARCH     → Investigate options, gather context
2. PROTOTYPE    → Build quick proofs of concept
3. EVALUATE     → Compare approaches, test feasibility
4. ITERATE      → Refine based on findings
5. DOCUMENT     → Capture learning and recommendations
6. DECIDE       → Make go/no-go decision
```

### 4.2 Exploratory YAML Template

```yaml
name: exploratory-analysis
description: Research and exploratory development workflow
version: 1.0.0
category: research
meta:
  aliases: [exploration, research, poc]
  suited_for: [research, prototype, poc, evaluation]
  complexity: low
  estimated_duration: 8

inputs:
  - name: research_topic
    type: string
    required: true
    description: Topic or technology to explore

  - name: exploration_scope
    type: string
    required: false
    default: medium
    description: Scope of exploration (narrow, medium, broad)

  - name: prototype_type
    type: string
    required: false
    default: code
    description: Type of prototype (code, sketch, document, simulation)

  - name: max_iterations
    type: number
    required: false
    default: 3
    description: Maximum refinement cycles

config:
  max_retries: 2
  timeout_minutes: 240  # Longer for exploratory work
  parallel_limit: 2

hooks:
  before_phase:
    research: |
      Gather existing exploration notes
      Check knowledge base for similar research
    evaluate: |
      Summarize findings so far
      Prepare comparison matrix
  after_phase:
    iterate: |
      Check if insights warrant further iteration
      Document learning so far

steps:
  - id: research
    name: Research & Gather Context
    command: /explore:research
    args: |
      --topic ${inputs.research_topic}
      --scope ${inputs.exploration_scope}
    outputs:
      research_notes: docs/exploration/${inputs.research_topic}/research.md
      options_analysis: docs/exploration/${inputs.research_topic}/options.json
      context_summary: docs/exploration/${inputs.research_topic}/context.md

  - id: prototype_planning
    name: Plan Prototypes
    command: /architect:prototype
    depends_on: [research]
    args: |
      --topic ${inputs.research_topic}
      --type ${inputs.prototype_type}
      --options ${steps.research.outputs.options_analysis}
    outputs:
      prototype_plan: docs/exploration/${inputs.research_topic}/prototype-plan.json
      prototype_specs: docs/exploration/${inputs.research_topic}/specs/

  - id: prototype
    name: Build Prototype
    command: /implement:prototype
    depends_on: [prototype_planning]
    args: |
      --topic ${inputs.research_topic}
      --plan ${steps.prototype_planning.outputs.prototype_plan}
      --type ${inputs.prototype_type}
    outputs:
      prototype_code: prototypes/${inputs.research_topic}/
      prototype_doc: docs/exploration/${inputs.research_topic}/prototype.md

  - id: evaluate
    name: Evaluate & Compare
    command: /validate:exploration
    depends_on: [prototype]
    args: |
      --prototype ${steps.prototype.outputs.prototype_code}
      --options ${steps.research.outputs.options_analysis}
    outputs:
      evaluation: docs/exploration/${inputs.research_topic}/evaluation.json
      comparison_matrix: docs/exploration/${inputs.research_topic}/comparison.md
      findings: docs/exploration/${inputs.research_topic}/findings.md

  - id: check_iterate
    name: Should Iterate?
    type: gate
    depends_on: [evaluate]
    description: "Review findings. Iterate for more insights or proceed to conclusion?"
    options:
      - label: "Iterate further"
        action: continue_to[refine]
      - label: "Sufficient findings"
        action: continue_to[document]

  - id: refine
    name: Refine Approach & Test
    command: /implement:iterate
    depends_on: [check_iterate]
    condition: ${steps.check_iterate.selected_option == 0}
    args: |
      --prototype ${steps.prototype.outputs.prototype_code}
      --findings ${steps.evaluate.outputs.findings}
      --iteration ${workflow.iteration_count}
    outputs:
      refined_prototype: prototypes/${inputs.research_topic}/
      refinement_log: docs/exploration/${inputs.research_topic}/iteration-${workflow.iteration_count}.md

  - id: reevaluate
    name: Re-evaluate Refined Prototype
    command: /validate:exploration
    depends_on: [refine]
    condition: ${steps.check_iterate.selected_option == 0}
    args: |
      --prototype ${steps.refine.outputs.refined_prototype}
    outputs:
      reevaluation: docs/exploration/${inputs.research_topic}/evaluation-${workflow.iteration_count}.json

  - id: check_loop
    name: Loop or Conclude?
    type: gate
    depends_on: [reevaluate]
    condition: ${workflow.iteration_count < inputs.max_iterations}
    description: "Continue iterating or document conclusions?"
    options:
      - label: "Another iteration"
        action: jump_to[refine]
      - label: "Done exploring"
        action: continue_to[document]

  - id: document
    name: Document Findings & Recommendations
    command: /document:exploration
    depends_on: [evaluate, check_iterate]
    args: |
      --topic ${inputs.research_topic}
      --findings ${steps.evaluate.outputs.findings}
      --prototype ${steps.prototype.outputs.prototype_code}
    outputs:
      final_report: docs/exploration/${inputs.research_topic}/final-report.md
      recommendations: docs/exploration/${inputs.research_topic}/recommendations.json
      learning_summary: docs/exploration/${inputs.research_topic}/learning-summary.md

  - id: decision
    name: Make Go/No-Go Decision
    type: gate
    depends_on: [document]
    description: "Based on exploration findings, decide on next steps"
    options:
      - label: "Proceed with implementation"
        value: proceed
      - label: "Explore alternative approach"
        value: explore_alternative
      - label: "Not feasible, archive exploration"
        value: archive

outputs:
  research_summary: ${steps.research.outputs.research_notes}
  prototype_code: ${steps.prototype.outputs.prototype_code}
  evaluation: ${steps.evaluate.outputs.evaluation}
  final_report: ${steps.document.outputs.final_report}
  recommendations: ${steps.document.outputs.recommendations}

decision_points:
  - after: evaluate
    question: "Findings sufficient or iterate further?"
    options:
      - label: "Iterate"
        action: jump_to[refine]
      - label: "Document findings"
        action: continue_to[document]

  - after: document
    question: "Based on exploration, what's next?"
    options:
      - label: "Proceed to implementation"
        action: trigger[/workflow:run traditional-feature]
      - label: "Archive, revisit later"
        action: end
```

### 4.3 Exploratory Key Characteristics

**Iterative Phases:**
- Non-linear flow with loops back to refinement
- Flexible decision points to adjust direction
- Iteration count can expand or contract based on findings
- Research informs prototype direction

**Artifacts Produced:**
- Research notes and context documentation
- Options analysis and comparison matrices
- Prototype code or proofs-of-concept
- Evaluation findings and recommendations
- Learning summary for future reference
- Go/no-go decision document

**Decision Points:**
- After evaluation: Iterate or document findings
- During loop: Continue another iteration or conclude
- After documentation: Proceed to implementation or archive

**Customization Points:**
- Research scope and depth
- Prototype type and technology
- Maximum iteration count
- Evaluation criteria

---

## 5. Bug Fix Workflow Template

**Philosophy:** Systematic approach to reproducing, debugging, fixing, and verifying bug resolutions.

**Suitable for:** Bug resolution, incident response, production hotfixes.

**Complexity:** Low-Medium | **Estimated Duration:** 1-4 hours per bug

### 5.1 Bug Fix Phase Sequence

```
1. REPRODUCE    → Verify bug exists, document steps
2. ANALYZE      → Root cause analysis, impact assessment
3. DEBUG        → Identify source code location, mechanism
4. FIX          → Implement fix with minimal change
5. VERIFY       → Test fix, verify no regression
6. DEPLOY       → Release fix to production
```

### 5.2 Bug Fix YAML Template

```yaml
name: bug-fix
description: Systematic bug reproduction, debugging, and fixing workflow
version: 1.0.0
category: maintenance
meta:
  aliases: [bugfix, hotfix, incident]
  suited_for: [bug-fix, incident-response, regression]
  complexity: low
  estimated_duration: 2

inputs:
  - name: bug_id
    type: string
    required: true
    description: Bug ticket ID (JIRA, GitHub, etc.)

  - name: bug_title
    type: string
    required: true
    description: Brief description of bug

  - name: severity
    type: string
    required: false
    default: medium
    description: Bug severity (critical, high, medium, low)

  - name: is_production
    type: boolean
    required: false
    default: false
    description: Is this a production bug?

config:
  max_retries: 2
  timeout_minutes: 120
  parallel_limit: 2

hooks:
  before_phase:
    debug: |
      Setup debug environment
      Prepare debugging tools
    verify: |
      Check test coverage impact
      Run full regression test suite
  after_phase:
    fix: |
      Create test case for regression prevention
      Document fix for future reference

steps:
  - id: understand_bug
    name: Understand Bug Report
    command: /clarify
    args: |
      --type bug
      --id ${inputs.bug_id}
      --title "${inputs.bug_title}"
    outputs:
      bug_report: docs/bugs/${inputs.bug_id}/report.json
      impact_assessment: docs/bugs/${inputs.bug_id}/impact.md

  - id: reproduce
    name: Reproduce Bug
    command: /test:reproduce
    depends_on: [understand_bug]
    args: |
      --bug-id ${inputs.bug_id}
      --steps "${steps.understand_bug.outputs.bug_report.reproduction_steps}"
    outputs:
      reproduction_log: docs/bugs/${inputs.bug_id}/reproduction.md
      repro_test_case: docs/bugs/${inputs.bug_id}/test-case.js
      reproduction_artifacts: docs/bugs/${inputs.bug_id}/artifacts/

  - id: can_reproduce
    name: Bug Reproduced?
    type: gate
    depends_on: [reproduce]
    condition: ${steps.reproduce.exit_code == 0}
    description: "Verify bug was successfully reproduced"
    on_failure: [need_more_info]

  - id: need_more_info
    name: Request More Information
    type: gate
    depends_on: [can_reproduce]
    condition: ${steps.can_reproduce.exit_code != 0}
    description: "Cannot reproduce with given info. Contact reporter."
    options:
      - label: "Retry with more info"
        action: restart_from[understand_bug]
      - label: "Mark as cannot-reproduce"
        action: end

  - id: analyze
    name: Analyze Root Cause
    command: /architect:debug
    depends_on: [can_reproduce]
    args: |
      --bug-id ${inputs.bug_id}
      --reproduction-log ${steps.reproduce.outputs.reproduction_log}
    outputs:
      root_cause_analysis: docs/bugs/${inputs.bug_id}/root-cause.md
      affected_components: docs/bugs/${inputs.bug_id}/components.json
      impact_scope: docs/bugs/${inputs.bug_id}/impact-scope.md

  - id: debug
    name: Debug & Locate Issue
    command: /debug:code
    depends_on: [analyze]
    args: |
      --bug-id ${inputs.bug_id}
      --affected-files ${steps.analyze.outputs.affected_components}
      --test-case ${steps.reproduce.outputs.repro_test_case}
    outputs:
      debug_log: docs/bugs/${inputs.bug_id}/debug.md
      root_cause_code: docs/bugs/${inputs.bug_id}/root-cause-code.txt
      fix_recommendation: docs/bugs/${inputs.bug_id}/fix-recommendation.md

  - id: implement_fix
    name: Implement Fix
    command: /implement:fix
    depends_on: [debug]
    args: |
      --bug-id ${inputs.bug_id}
      --recommendation ${steps.debug.outputs.fix_recommendation}
      --minimal-change
    outputs:
      fixed_code: src/
      fix_diff: docs/bugs/${inputs.bug_id}/fix.diff
      fix_summary: docs/bugs/${inputs.bug_id}/fix-summary.md

  - id: test_fix
    name: Test Fix & Verify No Regression
    command: /test:run
    depends_on: [implement_fix]
    args: |
      --include ${steps.reproduce.outputs.repro_test_case}
      --full-suite
    outputs:
      test_results: docs/bugs/${inputs.bug_id}/test-results.json
      regression_check: docs/bugs/${inputs.bug_id}/regression-check.md

  - id: verify_fix
    name: Verify Fix Works
    type: gate
    depends_on: [test_fix]
    condition: ${steps.test_fix.exit_code == 0 && steps.reproduce.outputs.repro_test_case.passes}
    description: "Reproduce test case passes and no regressions detected"

  - id: deploy
    name: Deploy Fix
    command: /deploy:hotfix
    depends_on: [verify_fix]
    condition: ${inputs.is_production}
    args: |
      --bug-id ${inputs.bug_id}
      --severity ${inputs.severity}
    outputs:
      deployment_log: docs/bugs/${inputs.bug_id}/deployment.md

outputs:
  bug_report: ${steps.understand_bug.outputs.bug_report}
  reproduction_steps: ${steps.reproduce.outputs.reproduction_log}
  root_cause: ${steps.analyze.outputs.root_cause_analysis}
  fix_code: ${steps.implement_fix.outputs.fixed_code}
  test_results: ${steps.test_fix.outputs.test_results}
  completion_summary: docs/bugs/${inputs.bug_id}/completion.md

decision_points:
  - after: reproduce
    question: "Successfully reproduced bug?"
    options:
      - label: "Yes, proceed to analysis"
        action: continue
      - label: "Need more reproduction info"
        action: restart_from[understand_bug]

  - after: test_fix
    question: "Fix verified and no regressions?"
    options:
      - label: "Yes, deploy"
        action: continue
      - label: "Issues found, revise fix"
        action: restart_from[implement_fix]
```

### 5.3 Bug Fix Key Characteristics

**Focused Phases:**
- Reproduction is critical first step
- Root cause analysis guides implementation
- Minimal fixes to reduce regression risk
- Regression testing is mandatory

**Artifacts Produced:**
- Reproduction steps and test case
- Root cause analysis documentation
- Fix implementation and diff
- Test results and regression check
- Deployment record

**Decision Points:**
- After reproduction: Verify bug exists or request more info
- After fix: Verify no regressions before deploy
- Conditional deploy based on severity/environment

**Customization Points:**
- Severity level and response time SLA
- Environment (dev/staging/production)
- Regression test scope
- Deployment strategy

---

## 6. Refactoring Workflow Template

**Philosophy:** Safe, systematic code improvement with validation at each step.

**Suitable for:** Code quality improvement, technical debt reduction, performance optimization.

**Complexity:** Medium-High | **Estimated Duration:** 4-8 hours per module

### 6.1 Refactoring Phase Sequence

```
1. ANALYZE      → Identify refactoring opportunities, measure metrics
2. PLAN         → Design refactoring approach, impact analysis
3. REFACTOR     → Apply changes, maintain test coverage
4. VALIDATE     → Verify behavior unchanged, metrics improved
5. DOCUMENT     → Record changes and lessons learned
```

### 6.2 Refactoring YAML Template

```yaml
name: refactoring-workflow
description: Safe, systematic code refactoring with validation
version: 1.0.0
category: maintenance
meta:
  aliases: [refactor, tech-debt, quality]
  suited_for: [refactoring, technical-debt, performance, optimization]
  complexity: high
  estimated_duration: 6

inputs:
  - name: target_module
    type: path
    required: true
    description: Module/file to refactor

  - name: refactoring_type
    type: string
    required: true
    description: Type of refactoring (simplify, extract, consolidate, optimize)

  - name: goals
    type: string
    required: true
    description: Specific goals (e.g., reduce complexity, improve performance)

  - name: allow_api_changes
    type: boolean
    required: false
    default: false
    description: Allow breaking API changes?

config:
  max_retries: 3
  timeout_minutes: 180
  parallel_limit: 2

hooks:
  before_phase:
    refactor: |
      Create feature branch
      Ensure all tests passing before changes
    validate: |
      Compare metrics before/after
      Check for breaking changes
  after_phase:
    document: |
      Update module documentation
      Update architecture diagrams

steps:
  - id: baseline
    name: Establish Baseline Metrics
    command: /analyze:code
    args: |
      --target ${inputs.target_module}
      --metrics [complexity, coverage, performance]
      --baseline
    outputs:
      baseline_metrics: docs/refactoring/${inputs.target_module}/baseline.json
      complexity_report: docs/refactoring/${inputs.target_module}/complexity.md
      test_coverage: docs/refactoring/${inputs.target_module}/coverage-baseline.json

  - id: analyze
    name: Analyze Refactoring Opportunities
    command: /analyze:code
    depends_on: [baseline]
    args: |
      --target ${inputs.target_module}
      --refactoring-type ${inputs.refactoring_type}
      --goals "${inputs.goals}"
    outputs:
      analysis_report: docs/refactoring/${inputs.target_module}/analysis.md
      opportunities: docs/refactoring/${inputs.target_module}/opportunities.json
      risk_assessment: docs/refactoring/${inputs.target_module}/risk-assessment.md

  - id: plan
    name: Plan Refactoring Approach
    command: /architect:refactor
    depends_on: [analyze]
    args: |
      --target ${inputs.target_module}
      --opportunities ${steps.analyze.outputs.opportunities}
      --api-changes ${inputs.allow_api_changes}
    outputs:
      refactoring_plan: docs/refactoring/${inputs.target_module}/plan.md
      change_checklist: docs/refactoring/${inputs.target_module}/checklist.json
      rollback_plan: docs/refactoring/${inputs.target_module}/rollback.md

  - id: approval
    name: Refactoring Plan Approval
    type: gate
    depends_on: [plan]
    description: "Review and approve refactoring plan"
    condition: ${steps.plan.exit_code == 0}
    approvers: [code-reviewer]

  - id: refactor
    name: Apply Refactoring Changes
    command: /refactor:code
    depends_on: [approval]
    args: |
      --target ${inputs.target_module}
      --plan ${steps.plan.outputs.refactoring_plan}
      --preserve-tests
    outputs:
      refactored_code: src/
      refactor_log: docs/refactoring/${inputs.target_module}/refactor-log.md
      changes_summary: docs/refactoring/${inputs.target_module}/changes.md

  - id: validate_tests
    name: Validate All Tests Still Pass
    command: /test:run
    depends_on: [refactor]
    args: |
      --path ${inputs.target_module}
      --full-suite
    outputs:
      test_results: docs/refactoring/${inputs.target_module}/test-results.json
      coverage_report: docs/refactoring/${inputs.target_module}/coverage-after.json

  - id: behavior_preserved
    name: Behavior Preserved?
    type: gate
    depends_on: [validate_tests]
    condition: ${steps.validate_tests.exit_code == 0}
    description: "All tests pass - behavior preserved"

  - id: measure_improvements
    name: Measure Quality Improvements
    command: /analyze:code
    depends_on: [behavior_preserved]
    args: |
      --target ${inputs.target_module}
      --compare-baseline ${steps.baseline.outputs.baseline_metrics}
      --metrics [complexity, coverage, performance]
    outputs:
      after_metrics: docs/refactoring/${inputs.target_module}/after-metrics.json
      improvements: docs/refactoring/${inputs.target_module}/improvements.md
      metric_comparison: docs/refactoring/${inputs.target_module}/comparison.md

  - id: analyze_impact
    name: Analyze Impact & Breaking Changes
    command: /architect:impact
    depends_on: [measure_improvements]
    condition: ${inputs.allow_api_changes == false}
    args: |
      --target ${inputs.target_module}
      --original ${steps.baseline.outputs.baseline_metrics}
      --refactored ${steps.refactor.outputs.refactored_code}
    outputs:
      impact_report: docs/refactoring/${inputs.target_module}/impact-analysis.md
      breaking_changes: docs/refactoring/${inputs.target_module}/breaking-changes.json

  - id: document
    name: Document Refactoring & Lessons
    command: /document:refactoring
    depends_on: [measure_improvements]
    args: |
      --target ${inputs.target_module}
      --changes ${steps.refactor.outputs.changes_summary}
      --improvements ${steps.measure_improvements.outputs.improvements}
    outputs:
      refactoring_doc: docs/refactoring/${inputs.target_module}/README.md
      before_after: docs/refactoring/${inputs.target_module}/before-after.md
      lessons_learned: docs/refactoring/${inputs.target_module}/lessons-learned.md

outputs:
  baseline_metrics: ${steps.baseline.outputs.baseline_metrics}
  analysis: ${steps.analyze.outputs.analysis_report}
  refactored_code: ${steps.refactor.outputs.refactored_code}
  test_results: ${steps.validate_tests.outputs.test_results}
  improvements: ${steps.measure_improvements.outputs.improvements}
  documentation: ${steps.document.outputs.refactoring_doc}

decision_points:
  - after: plan
    question: "Approve refactoring plan?"
    options:
      - label: "Approved, proceed"
        action: continue
      - label: "Revise plan"
        action: restart_from[plan]

  - after: measure_improvements
    question: "Improvements acceptable?"
    options:
      - label: "Yes, document and complete"
        action: continue
      - label: "Needs more work"
        action: restart_from[refactor]
```

### 6.3 Refactoring Key Characteristics

**Validation-Heavy Phases:**
- Baseline metrics before changes
- Comprehensive test validation after changes
- Metrics comparison to verify improvements
- Impact analysis for breaking changes

**Artifacts Produced:**
- Baseline and after metrics reports
- Analysis and opportunities identification
- Refactoring plan with risk assessment
- Test results confirming behavior preserved
- Improvement metrics and comparison
- Documentation of changes and lessons learned

**Decision Points:**
- After plan: Approve approach before starting
- After tests: Verify all tests pass before measuring improvements
- After improvements: Validate improvements meet goals

**Customization Points:**
- Types of refactoring allowed
- Breaking API changes allowed
- Metrics to optimize
- Required test coverage threshold

---

## 7. Feature Development Workflow Template

**Philosophy:** Complete end-to-end feature delivery from clarification through deployment.

**Suitable for:** Standard feature development, product feature work.

**Complexity:** High | **Estimated Duration:** 8-16 hours per feature

### 7.1 Feature Phase Sequence

```
1. CLARIFY      → Requirements, acceptance criteria, prioritization
2. DESIGN       → Architecture, API, data model, UI design
3. IMPLEMENT    → Code implementation, testing during development
4. VALIDATE     → Quality gates, integration, acceptance testing
5. DEPLOY       → Release to production with monitoring
6. DOCUMENT     → User guide, API docs, runbooks
```

### 7.2 Feature Development YAML Template

```yaml
name: feature-workflow
description: End-to-end feature development with all gates
version: 1.0.0
category: development
meta:
  aliases: [feature, feature-dev, feature-delivery]
  suited_for: [feature, product-work]
  complexity: high
  estimated_duration: 12

inputs:
  - name: feature_name
    type: string
    required: true
    description: Feature name/identifier

  - name: story_points
    type: number
    required: false
    description: Story point estimate

  - name: target_release
    type: string
    required: false
    description: Target release version

  - name: require_design_review
    type: boolean
    required: false
    default: true

  - name: require_security_review
    type: boolean
    required: false
    default: true

config:
  max_retries: 2
  timeout_minutes: 240
  parallel_limit: 4

steps:
  - id: clarify_requirements
    name: Clarify Requirements
    command: /clarify
    args: --feature ${inputs.feature_name}
    outputs:
      requirements: docs/features/${inputs.feature_name}/requirements.json
      acceptance_criteria: docs/features/${inputs.feature_name}/acceptance.md

  - id: design_solution
    name: Design Solution
    command: /architect
    depends_on: [clarify_requirements]
    args: |
      --feature ${inputs.feature_name}
      --requirements ${steps.clarify_requirements.outputs.requirements}
    outputs:
      architecture: docs/features/${inputs.feature_name}/architecture.json
      api_spec: docs/features/${inputs.feature_name}/api.yaml

  - id: review_design
    name: Review Design
    type: gate
    depends_on: [design_solution]
    condition: ${inputs.require_design_review}
    description: "Design review approval required"

  - id: implement
    name: Implement Feature
    command: /implement:feature
    depends_on: [review_design]
    args: |
      --feature ${inputs.feature_name}
      --design ${steps.design_solution.outputs.architecture}
    outputs:
      source_code: src/features/${inputs.feature_name}/
      tests: src/features/${inputs.feature_name}/__tests__/

  - id: validate_quality
    name: Validate Quality & Tests
    command: /test:run
    depends_on: [implement]
    args: |
      --path src/features/${inputs.feature_name}/
      --check-coverage
    outputs:
      test_results: docs/features/${inputs.feature_name}/test-results.json

  - id: security_review
    name: Security Review
    command: /analyze:security
    depends_on: [implement]
    condition: ${inputs.require_security_review}
    outputs:
      security_report: docs/features/${inputs.feature_name}/security.md

  - id: deploy_staging
    name: Deploy to Staging
    command: /deploy:staging
    depends_on: [validate_quality, security_review]
    outputs:
      staging_log: docs/features/${inputs.feature_name}/staging-deployment.md

  - id: deploy_production
    name: Deploy to Production
    command: /deploy:production
    depends_on: [deploy_staging]
    type: gate
    description: "Ready for production deployment"

  - id: document
    name: Create Documentation
    command: /document:feature
    depends_on: [deploy_production]
    args: |
      --feature ${inputs.feature_name}
      --api-spec ${steps.design_solution.outputs.api_spec}
    outputs:
      user_guide: docs/features/${inputs.feature_name}/user-guide.md
      api_docs: docs/features/${inputs.feature_name}/api/

outputs:
  requirements: ${steps.clarify_requirements.outputs.requirements}
  architecture: ${steps.design_solution.outputs.architecture}
  implementation: ${steps.implement.outputs.source_code}
  test_results: ${steps.validate_quality.outputs.test_results}
  documentation: ${steps.document.outputs.user_guide}
```

---

## 8. Template Extension & Customization Hooks

All templates support these extension points:

### 8.1 Phase Hooks

```yaml
hooks:
  before_phase:
    {phase-name}: |
      Custom code to run before phase starts
      Can check preconditions, setup environment, load context

  after_phase:
    {phase-name}: |
      Custom code to run after phase completes
      Can cleanup, record metrics, trigger downstream systems
```

### 8.2 Step Hooks

```yaml
steps:
  - id: my_step
    command: /some:command
    on_success: |
      Log success metrics
      Trigger notifications
    on_failure: |
      Cleanup temporary files
      Send error notifications
```

### 8.3 Conditional Step Skip/Replacement

```yaml
steps:
  - id: security_review
    command: /analyze:security
    condition: ${inputs.require_security == true}
    on_skip: "Skipping security review per input"
```

### 8.4 Input-Driven Customization

```yaml
steps:
  - id: implement
    command: ${inputs.impl_command || '/implement:feature'}
    # Use custom command if provided, otherwise default
```

### 8.5 Artifact Path Templating

```yaml
outputs:
  feature_code: ${steps.implement.outputs.${inputs.artifact_location || 'source_code'}}
  # Flexible artifact location based on input
```

---

## 9. Comparison Matrix

| Aspect | TDD | Traditional | Exploratory | Bug Fix | Refactoring | Feature |
|--------|-----|-------------|-------------|---------|-------------|---------|
| **Sequential** | Yes | Yes | No (iterative) | Yes | Yes | Yes |
| **Parallel steps** | 2 | 3 | 2 | 2 | 2 | 4 |
| **Decision points** | 2-3 | 3-4 | 4-5 | 2-3 | 2-3 | 4-5 |
| **Typical duration** | 4-8h | 8-16h | 6-12h | 1-4h | 4-8h | 8-16h |
| **Test coverage** | Required | High | Medium | Critical | Full | High |
| **Design phase** | Minimal | Detailed | Iterative | N/A | Existing | Detailed |
| **Approval gates** | 2 | 3+ | 1 | 1 | 2 | 3+ |
| **Customization** | Medium | High | Low | Low | High | High |

---

## 10. Usage Examples

### Example 1: Using TDD Workflow

```bash
/workflow:run tdd-feature \
  --input feature_name=payment-processing \
  --input test_framework=vitest \
  --input coverage_target=90
```

Output:
```
✅ clarify: Gathered requirements
✅ test_design: Created test plan with 24 test cases
✅ implement: Implemented payment-processing
⚠️ validate: 2 tests failed
🔄 retry_implement: Fixed failing tests
✅ validate: All 24 tests passed, 92% coverage
✅ refactor: Code quality improved
✅ document: Created API docs and user guide
⏱️ Total time: 2h 34m
```

### Example 2: Customizing Traditional Workflow

```bash
/workflow:run traditional-feature \
  --input feature_name=auth-provider \
  --input team_lead=alice@company.com \
  --before-phase design "run /analyze:existing-auth-systems"
```

### Example 3: Using Exploratory Workflow with Iteration

```bash
/workflow:run exploratory-analysis \
  --input research_topic=rust-vs-go \
  --input exploration_scope=broad \
  --input max_iterations=3
```

### Example 4: Quick Bug Fix

```bash
/workflow:run bug-fix \
  --input bug_id=JIRA-1234 \
  --input bug_title="Auth token expires prematurely" \
  --input is_production=true
```

---

## 11. Key Design Principles

1. **Reusability**: Templates encode proven methodologies, reducing decision fatigue
2. **Flexibility**: Inputs, hooks, and conditions allow customization without forking
3. **Visibility**: Each phase produces clear artifacts and decision records
4. **Automation**: Workflows handle coordination and artifact discovery
5. **Scalability**: Templates work for small features or large initiatives
6. **Safety**: Validation gates and rollback mechanisms prevent errors
7. **Learning**: Artifacts create institutional knowledge and enable retrospectives

---

## 12. Related Analysis

- **9.1**: Artifact Discovery - How workflows find inputs
- **9.2**: Artifact Compatibility - Type checking and schema validation
- **9.3**: State Tracking - Workflow execution state persistence
- **9.4**: Parallel Execution - Running steps concurrently
- **9.5**: Conditional Branching - If/then/else logic patterns

---

**Analysis Complete** - 2025-12-20
