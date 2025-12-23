# Implementation Plan: Implement /clarify Command

## Overview
- **Goal:** Build interactive requirements gathering system using Socratic questioning
- **Priority:** P0
- **Created:** {{date}}
- **Output:** `docs/plan-outputs/{{plan_filename}}/`

> Implement the /clarify command to enable systematic requirements discovery through guided questioning. The command uses a 3-phase approach (Understanding Context → Deep Dive → Synthesis) to extract functional requirements, scope boundaries, constraints, and acceptance criteria before transitioning to architecture/design phases.

## Phase 1: Core Command Infrastructure
- [ ] 1.1 Create YAML configuration at `.claude/commands/clarify.md` with base metadata
- [ ] 1.2 Define allowed tools: Read, Write, Grep, Glob, AskUserQuestion
- [ ] 1.3 Set command category as "Discovery & Ideation" with CRITICAL priority
- [ ] 1.4 Create base prompt template with 3-phase questioning framework
- [ ] 1.5 Implement context detection logic to identify existing project artifacts
- [ ] **VERIFY 1:** Command is discoverable via skill system and loads successfully

## Phase 2: Questioning Engine
- [ ] 2.1 Design Socratic questioning algorithm with follow-up logic
- [ ] 2.2 Implement Phase 1 (Understanding Context) question set
- [ ] 2.3 Implement Phase 2 (Deep Dive) question set with branching logic
- [ ] 2.4 Implement Phase 3 (Synthesis) validation and clarification questions
- [ ] 2.5 Create question templates for functional vs non-functional requirements
- [ ] 2.6 Add dynamic question generation based on user responses
- [ ] **VERIFY 2:** Questioning flow progresses logically through all 3 phases

## Phase 3: Sub-Command Implementation - Requirements & Scope (P0)
- [ ] 3.1 Implement `clarify:requirements` sub-command logic
- [ ] 3.2 Build functional requirements extraction module
- [ ] 3.3 Build non-functional requirements extraction module
- [ ] 3.4 Implement `clarify:scope` sub-command logic
- [ ] 3.5 Create scope boundary detection (In/Out of Scope)
- [ ] 3.6 Build scope creep risk identification system
- [ ] **VERIFY 3:** Requirements and scope sub-commands produce valid outputs

## Phase 4: Sub-Command Implementation - Constraints & Acceptance (P1)
- [ ] 4.1 Implement `clarify:constraints` sub-command logic
- [ ] 4.2 Create constraint categorization (technical, business, resource, timeline)
- [ ] 4.3 Implement `clarify:acceptance` sub-command logic
- [ ] 4.4 Build acceptance criteria template generator
- [ ] 4.5 Add testability validation for acceptance criteria
- [ ] **VERIFY 4:** Constraints and acceptance sub-commands produce valid outputs

## Phase 5: Sub-Command Implementation - Stakeholders (P2)
- [ ] 5.1 Implement `clarify:stakeholders` sub-command logic
- [ ] 5.2 Create stakeholder mapping and role identification
- [ ] 5.3 Build decision-maker and approval chain detection
- [ ] 5.4 Add communication plan suggestion generator
- [ ] **VERIFY 5:** Stakeholders sub-command identifies key project participants

## Phase 6: Artifact Generation System
- [ ] 6.1 Create `requirements.json` schema and generator
- [ ] 6.2 Implement metadata generation (timestamp, version, author)
- [ ] 6.3 Create functional_requirements[] array builder
- [ ] 6.4 Create non_functional_requirements[] array builder
- [ ] 6.5 Build constraints[] and assumptions[] array generators
- [ ] 6.6 Implement open_questions[] tracker for unresolved items
- [ ] 6.7 Create `scope.md` generator with Must/Should Have sections
- [ ] 6.8 Build Boundaries table generator (System/User/Integration/Data)
- [ ] 6.9 Create `constraints.json` schema and generator
- [ ] 6.10 Create `acceptance-criteria.md` generator with testable criteria
- [ ] **VERIFY 6:** All artifact schemas validate and files are written to `docs/clarify/{subcommand}/`

## Phase 7: Output Directory Management
- [ ] 7.1 Create directory structure generator for `docs/clarify/`
- [ ] 7.2 Implement sub-command-specific output folders (requirements/, scope/, etc.)
- [ ] 7.3 Add file versioning system for iterative clarification sessions
- [ ] 7.4 Create index file to track all clarification artifacts
- [ ] 7.5 Implement artifact validation on write
- [ ] **VERIFY 7:** Output directory structure matches specification and artifacts are organized correctly

## Phase 8: Workflow Integration
- [ ] 8.1 Create transition logic to `/architect` command after requirements complete
- [ ] 8.2 Implement handoff to `/design` command with clarification artifacts
- [ ] 8.3 Build integration with `/plan:create` to generate implementation plans
- [ ] 8.4 Add artifact export format for downstream commands
- [ ] 8.5 Create workflow suggestion engine based on clarification results
- [ ] **VERIFY 8:** Clarification artifacts are consumable by downstream commands

## Phase 9: Error Handling & Edge Cases
- [ ] 9.1 Handle incomplete user responses gracefully
- [ ] 9.2 Implement timeout/abandonment recovery for long sessions
- [ ] 9.3 Add validation for contradictory requirements
- [ ] 9.4 Create conflict resolution prompts for scope ambiguities
- [ ] 9.5 Handle missing context when no project files exist
- [ ] **VERIFY 9:** Error scenarios are handled without command failure

## Phase 10: Testing & Validation
- [ ] 10.1 Test full clarification flow with sample project (simple CRUD app)
- [ ] 10.2 Test full clarification flow with complex project (distributed system)
- [ ] 10.3 Validate all artifact schemas with JSON/Markdown linters
- [ ] 10.4 Test each sub-command independently
- [ ] 10.5 Test workflow transitions to /architect, /design, /plan:create
- [ ] 10.6 Verify question quality produces actionable requirements
- [ ] **VERIFY 10:** All test scenarios pass and produce high-quality outputs

## Phase 11: Documentation
- [ ] 11.1 Create usage guide in `docs/commands/clarify.md`
- [ ] 11.2 Document each sub-command with examples
- [ ] 11.3 Add artifact schema reference documentation
- [ ] 11.4 Create workflow diagram showing clarify → architect → design flow
- [ ] 11.5 Write best practices guide for effective requirement gathering
- [ ] 11.6 Add troubleshooting section for common issues
- [ ] **VERIFY 11:** Documentation is complete and examples are tested

## Success Criteria
- [ ] Command executes successfully via `/clarify` and all 5 sub-commands
- [ ] 3-phase questioning framework produces comprehensive requirements
- [ ] All artifact schemas (requirements.json, scope.md, constraints.json, acceptance-criteria.md) validate
- [ ] Artifacts are written to correct output locations (`docs/clarify/{subcommand}/`)
- [ ] Workflow transitions to /architect, /design, /plan:create work seamlessly
- [ ] Command handles edge cases (incomplete responses, contradictions, missing context)
- [ ] Documentation enables users to run clarification sessions independently
- [ ] Test scenarios demonstrate high-quality requirements extraction

## Dependencies
- Skill system must support sub-commands (`:` notation)
- AskUserQuestion tool must be available for interactive questioning
- File I/O tools (Read, Write) must support JSON and Markdown formats
- Workflow system must support command chaining with artifact passing
