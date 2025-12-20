# Validation Plan: {{validation_name}}

## Overview
- **Target:** {{target_path}}
- **Validation Type:** {{validation_type}}
- **Created:** {{date}}
- **Output:** `docs/plan-outputs/{{plan_filename}}/`

> Validation results are written to the `findings/` subdirectory. Use `/plan:status` to view progress.

## Pre-Validation Checklist
- [ ] 0.1 Target exists and is accessible
- [ ] 0.2 Dependencies are available
- [ ] 0.3 Environment is properly configured

## Phase 1: Static Validation
- [ ] 1.1 Check file structure and organization
- [ ] 1.2 Validate syntax (lint, type-check)
- [ ] 1.3 Review against coding standards
- [ ] **VERIFY 1**: Static validation complete

## Phase 2: Behavioral Validation
- [ ] 2.1 Run existing tests
- [ ] 2.2 Verify expected behaviors
- [ ] 2.3 Test edge cases
- [ ] **VERIFY 2**: All test suites executed

## Phase 3: Integration Validation
- [ ] 3.1 Verify component interactions
- [ ] 3.2 Check API contracts
- [ ] 3.3 Validate data flow
- [ ] **VERIFY 3**: Integration checks complete

## Phase 4: Sign-off
- [ ] 4.1 All critical checks pass
- [ ] 4.2 Issues documented in findings
- [ ] 4.3 Remediation plan created (if needed)
- [ ] **VERIFY 4**: Final sign-off complete

## Success Criteria
- [ ] All validation phases complete
- [ ] Results documented in `findings/`
- [ ] Any blockers have remediation plans
