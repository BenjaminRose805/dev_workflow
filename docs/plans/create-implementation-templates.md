# Plan: Create Implementation Templates

## Overview
- **Goal:** Create plan templates for all architecture review implementations
- **Source:** `docs/plan-outputs/architecture-review/findings/`
- **Created:** 2025-12-22
- **Output:** `docs/plan-templates/`

> Each template enables `/plan:create` to instantiate implementation plans. Templates follow the format in `TEMPLATE.md`.

## Phase 1: P0 Templates (MVP)
- [ ] 1.1 Create `implement-artifact-registry.md` from `findings/9-1-artifact-discovery.md`, `findings/2-4-missing-artifacts.md`
- [ ] 1.2 Create `implement-workflow-branching.md` from `findings/9-5-conditional-branching.md`, `findings/2-5-workflow-limitations.md`
- [ ] 1.3 Create `implement-explore-command.md` from `findings/4-2-explore-command.md`, `findings/4-5-subcommands-catalog.md`, `findings/4-6-artifact-schemas.md`
- [ ] 1.4 Create `implement-clarify-command.md` from `findings/4-1-clarify-command.md`, `findings/4-5-subcommands-catalog.md`, `findings/4-6-artifact-schemas.md`
- [ ] 1.5 Create `implement-test-command.md` from `findings/6-4-test-command.md`, `findings/6-7-artifact-schemas.md`
- [ ] 1.6 Create `implement-validate-command.md` from `findings/6-5-validate-command.md`, `findings/6-7-artifact-schemas.md`
- [ ] **VERIFY 1**: All 6 P0 templates exist in `docs/plan-templates/`

## Phase 2: P1 Command Templates
- [ ] 2.1 Create `implement-fix-command.md` from `findings/7-3-fix-command.md`, `findings/7-6-artifact-schemas.md`
- [ ] 2.2 Create `implement-refactor-command.md` from `findings/7-2-refactor-command.md`, `findings/7-6-artifact-schemas.md`
- [ ] 2.3 Create `implement-analyze-command.md` from `findings/6-1-analyze-command.md`, `findings/6-7-artifact-schemas.md`
- [ ] 2.4 Create `implement-review-command.md` from `findings/6-3-review-command.md`, `findings/6-7-artifact-schemas.md`
- [ ] 2.5 Create `implement-debug-command.md` from `findings/6-6-debug-command.md`, `findings/6-7-artifact-schemas.md`
- [ ] **VERIFY 2**: All 5 P1 command templates exist

## Phase 3: P1 Infrastructure + P2 Design Commands
- [ ] 3.1 Create `implement-workflow-loops.md` from `findings/9-6-iterative-loops.md`
- [ ] 3.2 Create `implement-error-recovery-hooks.md` from `findings/10-5-error-recovery-hooks.md`, `findings/10-3-hook-integration.md`
- [ ] 3.3 Create `implement-architect-command.md` from `findings/5-1-architect-command.md`, `findings/5-5-subcommands-catalog.md`, `findings/5-6-artifact-schemas.md`
- [ ] 3.4 Create `implement-design-command.md` from `findings/5-2-design-command.md`, `findings/5-5-subcommands-catalog.md`, `findings/5-6-artifact-schemas.md`
- [ ] 3.5 Create `implement-spec-command.md` from `findings/5-3-spec-command.md`, `findings/5-5-subcommands-catalog.md`, `findings/5-6-artifact-schemas.md`
- [ ] **VERIFY 3**: All 5 templates (2 infra + 3 design) exist

## Phase 4: P2 Design + Documentation Commands
- [ ] 4.1 Create `implement-research-command.md` from `findings/4-3-research-command.md`, `findings/4-5-subcommands-catalog.md`, `findings/4-6-artifact-schemas.md`
- [ ] 4.2 Create `implement-brainstorm-command.md` from `findings/4-4-brainstorm-command.md`, `findings/4-5-subcommands-catalog.md`, `findings/4-6-artifact-schemas.md`
- [ ] 4.3 Create `implement-model-command.md` from `findings/5-4-model-command.md`, `findings/5-5-subcommands-catalog.md`, `findings/5-6-artifact-schemas.md`
- [ ] 4.4 Create `implement-document-command.md` from `findings/7-4-document-command.md`, `findings/7-6-artifact-schemas.md`
- [ ] 4.5 Create `implement-explain-command.md` from `findings/7-5-explain-command.md`, `findings/7-6-artifact-schemas.md`
- [ ] 4.6 Create `implement-audit-command.md` from `findings/6-2-audit-command.md`, `findings/6-7-artifact-schemas.md`
- [ ] **VERIFY 4**: All 6 templates (3 design + 3 docs) exist

## Phase 5: P2 Infrastructure + P3 Operations Commands
- [ ] 5.1 Create `implement-workflow-composition.md` from `findings/9-10-workflow-composition.md`
- [ ] 5.2 Create `implement-fan-in-fan-out.md` from `findings/9-7-fan-in-patterns.md`, `findings/9-8-fan-out-patterns.md`
- [ ] 5.3 Create `implement-deploy-command.md` from `findings/8-1-deploy-command.md`
- [ ] 5.4 Create `implement-migrate-command.md` from `findings/8-2-migrate-command.md`
- [ ] 5.5 Create `implement-release-command.md` from `findings/8-3-release-command.md`
- [ ] 5.6 Create `implement-workflow-command.md` from `findings/8-5-workflow-command.md`
- [ ] 5.7 Create `implement-template-command.md` from `findings/8-6-template-command.md`
- [ ] **VERIFY 5**: All 7 templates (2 infra + 5 ops) exist

## Phase 6: Agent Templates
- [ ] 6.1 Create `implement-explore-agent.md` from `findings/10-1-agent-command-mapping.md`, `findings/10-2-agent-configurations.md`, `findings/4-2-explore-command.md`
- [ ] 6.2 Create `implement-analyze-agent.md` from `findings/10-1-agent-command-mapping.md`, `findings/10-2-agent-configurations.md`, `findings/6-1-analyze-command.md`
- [ ] 6.3 Create `implement-review-agent.md` from `findings/10-1-agent-command-mapping.md`, `findings/10-2-agent-configurations.md`, `findings/6-3-review-command.md`
- [ ] 6.4 Create `implement-debug-agent.md` from `findings/10-1-agent-command-mapping.md`, `findings/10-2-agent-configurations.md`, `findings/6-6-debug-command.md`
- [ ] 6.5 Create `implement-deploy-agent.md` from `findings/10-1-agent-command-mapping.md`, `findings/10-2-agent-configurations.md`, `findings/8-1-deploy-command.md`
- [ ] **VERIFY 6**: All 5 agent templates exist

## Phase 7: Hook Templates + Implement Command
- [ ] 7.1 Create `implement-context-loading-hook.md` from `findings/10-3-hook-integration.md`
- [ ] 7.2 Create `implement-artifact-storage-hook.md` from `findings/10-3-hook-integration.md`
- [ ] 7.3 Create `implement-notification-hooks.md` from `findings/10-4-notification-hooks.md`
- [ ] 7.4 Create `implement-implement-command.md` from `findings/7-1-implement-command.md`, `findings/7-6-artifact-schemas.md`
- [ ] **VERIFY 7**: All 4 templates (3 hooks + 1 command) exist

## Success Criteria
- [ ] 40 templates created in `docs/plan-templates/`
- [ ] All templates follow format in `TEMPLATE.md`
- [ ] Each template has phases, tasks, and verification checkpoints
- [ ] Each template includes variables for customization
