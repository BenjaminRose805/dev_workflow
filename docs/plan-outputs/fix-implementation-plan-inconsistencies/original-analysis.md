# Original Analysis: Implementation Plan Inconsistencies

**Analyzed:** 2025-12-23

**Files Analyzed:** 37 implementation plans in `docs/plans/implement-*.md`

**Total Issues Found:** 35

---

## Summary Statistics

| Category | Count |
|----------|-------|
| Structural Inconsistencies | 4 |
| Dependency Issues | 4 |
| Naming Inconsistencies | 4 |
| Cross-Reference Errors | 3 |
| Priority/Ordering Issues | 3 |
| Missing Information | 4 |
| Overlapping Scope | 4 |
| Technical Inconsistencies | 6 |
| Additional Issues | 3 |

---

## 1. Structural Inconsistencies

### Issue 1.1: Inconsistent Phase Structure
- **Files affected:** Nearly all files
- **Problem:** Plans use different phase naming conventions:
  - Some use numbered phases: "Phase 1: Core Command Setup" (e.g., `/explore`, `/clarify`)
  - Others use descriptive phases: "Phase 1: Core Command Infrastructure" (e.g., `/fix`, `/refactor`)
  - Some mix both: "Phase 1: Core Command Setup" vs "Phase 1.1: Command File Setup" with subsections
- **Example:** `/explore-command.md` uses "Phase 1: Core Command Setup" while `/fix-command.md` breaks it into "Phase 1.1" through "Phase 1.5"
- **Impact:** Inconsistent template makes it harder to follow documentation; no standard format for navigating plans

### Issue 1.2: Missing Required Sections
- **Files affected:** `/test-command.md`, `/validate-command.md`, `/workflow-loops.md`
- **Problem:** Some plans missing "Success Criteria" or "Dependencies" sections that others have
- **Example:** `/workflow-loops.md` has "Dependencies" and "Risks" sections, but `/test-command.md` has only "Success Criteria" without explicit "Dependencies"
- **Impact:** Incomplete specification documentation; missing critical implementation information

### Issue 1.3: Inconsistent Verification Checkpoint Naming
- **Files affected:** All files
- **Problem:** VERIFY sections use inconsistent formats:
  - Some say: "**VERIFY 1:** Command runs successfully..."
  - Others say: "- [ ] **VERIFY 1**: Unit tests pass for..."
  - Some say: "**VERIFY Phase 1:** Registry file created..."
- **Impact:** Inconsistent checkpoints make automation and status tracking difficult

### Issue 1.4: Missing Output Directory Specifications
- **Files affected:** `/implement-command.md`, `/release-command.md`, `/migrate-command.md` (not found - only referenced)
- **Problem:** Some plans don't specify output directory structure; inconsistent paths when they do:
  - `/clarify-command.md`: `docs/clarify/{subcommand}/`
  - `/explore-command.md`: `docs/artifacts/discovery/exploration/`
  - `/architect-command.md`: `docs/architecture/`
  - Different naming conventions for same type of content
- **Impact:** Inconsistent artifact storage makes discovery and organization difficult

---

## 2. Dependency Issues

### Issue 2.1: Missing Dependency Documentation
- **Files affected:** `/test-command.md`, `/validate-command.md`, `/review-command.md`, `/refactor-command.md`
- **Problem:** Plans don't document upstream dependencies on `/clarify` or `/explore`
- **Example:** `/test-command.md` (line 87-96) references framework detection but doesn't mention dependency on existing codebase analysis
- **Impact:** Implementation order unclear; potential for implementing commands in wrong order

### Issue 2.2: Circular Dependency Concerns
- **Files affected:** `/workflow-composition.md`, `/workflow-branching.md`, `/workflow-loops.md`
- **Problem:** These workflow infrastructure plans reference command execution, but individual commands haven't documented how they'll support these features
- **Example:** `/workflow-composition.md` (line 27-43) mentions "workflow_ref step type" but no command plans document how they'll output artifacts compatible with workflow composition
- **Impact:** Risk of circular dependencies between workflow engine and commands

### Issue 2.3: Cross-Command Artifact Compatibility
- **Files affected:** `/design-command.md`, `/architect-command.md`, `/spec-command.md`, `/implement-command.md` (referenced but not found)
- **Problem:** Plans assume artifacts from upstream commands will be compatible, but artifact schemas aren't coordinated:
  - `/architect-command.md` (line 288-293) produces `components.json` with specific schema
  - `/design-command.md` (line 94) expects to consume this but format unclear
  - `/spec-command.md` (line 205) also consumes same artifact but may expect different format
- **Example:** `/artifact-registry.md` (line 104-111) defines extended metadata schema but no command plans explicitly reference this schema
- **Impact:** Artifacts may be incompatible when commands are implemented

### Issue 2.4: Missing Validation Tool Dependencies
- **Files affected:** `/validate-command.md` (14-15, 13-17 various phases), `/spec-command.md` (145-158 validation phase)
- **Problem:** Plans reference external tools not documented as dependencies:
  - Line 145: "redocly CLI" for OpenAPI validation
  - Line 147: "AJV" for JSON Schema validation
  - Line 147: "graphql-schema-linter"
- **Impact:** Implementation may fail due to missing dependencies; no guidance on tool versions or installation

---

## 3. Naming Inconsistencies

### Issue 3.1: Inconsistent Sub-Command Naming
- **Files affected:** Nearly all command files
- **Problem:** Sub-command naming varies by file:
  - Colon notation vs spaces: `/explore:quick` vs `/explore quick`
  - Some plans use colons consistently (`/test:unit`, `/test:integration`)
  - Some plans use spaces implicitly in documentation
- **Example:** `/explore-command.md` (line 76-84) uses `/explore:quick` and `/explore:deep` colon notation
- **Impact:** Unclear command invocation syntax; inconsistent with existing Claude Code skill system

### Issue 3.2: Inconsistent Model/Temperature Parameter Names
- **Files affected:** `/brainstorm-command.md`, `/research-command.md`, others
- **Problem:** YAML frontmatter varies:
  - Some use `model: sonnet`
  - Some use `model: claude-sonnet-4-5`
  - Some use `model: claude-sonnet-4-5-20251101` (full version)
  - Some use `temperature: 0.9` (specified), others don't specify (use default)
- **Example:** `/brainstorm-command.md` (line 25) uses full model ID `claude-opus-4-5-20251101` but `/clarify-command.md` doesn't specify model at all
- **Impact:** Inconsistent model selection; unclear which models are actually used in production

### Issue 3.3: Inconsistent Artifact Type Names
- **Files affected:** All plan files with artifact generation
- **Problem:** Artifact type names in YAML frontmatter vary:
  - `artifact_type: architecture-document` vs `artifact-type: readme-documentation`
  - Some use snake_case, some use kebab-case
  - `/clarify-command.md` (line 53) produces `requirements.json` but `/artifact-registry.md` (line 94) refers to different schema
- **Example:** `/validate-command.md` (line 206, 213) uses `artifact_type: validation-report` but `/review-command.md` (line 350) uses different naming
- **Impact:** Artifact registry and discovery will fail; inconsistent schema validation

### Issue 3.4: Inconsistent Function/Method Names in Descriptions
- **Files affected:** `/artifact-registry.md`, `/debug-command.md`, `/explain-command.md`
- **Problem:** Different naming conventions for similar functionality:
  - `/artifact-registry.md` (line 55) mentions `query()` method
  - `/debug-command.md` (line 352) mentions similar functionality with no consistent naming
  - `/explain-command.md` (line 75-80) doesn't specify concrete method names
- **Impact:** Implementation inconsistency; similar operations will have different APIs

---

## 4. Cross-Reference Errors

### Issue 4.1: References to Non-Existent Plans
- **Files affected:** Multiple plans reference other plans
- **Problem:** Some referenced files aren't in the plan directory:
  - `/test-command.md` (line 94) mentions plan outputs but `/test-command.md` output is `docs/plan-outputs/implement-test-command/`
  - `/implement-command.md` is referenced in multiple files but the file doesn't exist
  - `/migrate-command.md` is referenced but file doesn't exist
  - `/release-command.md` is referenced but file doesn't exist
- **Impact:** Incomplete implementation roadmap; missing critical commands

### Issue 4.2: Invalid Cross-Command Workflow References
- **Files affected:** `/explore-command.md`, `/clarify-command.md`, `/design-command.md`
- **Problem:** Workflow diagrams reference non-existent command sequences:
  - `/clarify-command.md` (line 76): "clarify -> architect -> design flow" - no explicit integration points documented
  - `/design-command.md` (line 233): mentions `/implement:` command but `/implement-command.md` doesn't exist
  - `/architect-command.md` (line 440-456) documents workflows but some reference `/model:` and `/spec:` which haven't documented their upstream dependencies
- **Impact:** Workflows won't work as documented; unclear execution order

### Issue 4.3: Missing ADR References
- **Files affected:** All command plans
- **Problem:** Plans assume decisions documented in ADRs but don't reference specific ADRs:
  - `/architect-command.md` (line 765-767) references "Source: docs/plan-outputs/architecture-review/findings/..." files that don't exist in the provided plans
- **Impact:** Design rationale not documented; future developers won't understand decisions

---

## 5. Priority/Ordering Issues

### Issue 5.1: Conflicting Priority Assignments
- **Files affected:** Multiple files with different priority schemes
- **Problem:** Priority schemes vary and sometimes conflict:
  - `/artifact-registry.md`: Priority P0 (lines 5)
  - `/error-recovery-hooks.md`: Priority P1 (lines 5)
  - But `/error-recovery-hooks.md` is needed for `/artifact-registry.md` to work in production
  - `/workflow-branching.md`: Priority P0 (line 5) but references `/workflow-loops.md` which is P1
- **Example:** `/validate-command.md` (line 5) is P0 but requires `/analyze-command.md` (line 5 also P0) - no clear ordering
- **Impact:** Unclear implementation sequence; risk of building features in wrong order

### Issue 5.2: Phase Ordering Conflicts
- **Files affected:** `/brainstorm-command.md`, `/research-command.md`, `/clarify-command.md`
- **Problem:** Plans have different numbers of phases with different structures:
  - `/clarify-command.md`: 11 phases total (line 11-106)
  - `/brainstorm-command.md`: 9 phases total (line 14-427)
  - `/research-command.md`: 8 phases total (line 14-342)
  - No clear guidance on which should be implemented first when P-level is same
- **Impact:** Unclear which features provide foundation for others

### Issue 5.3: Sub-Command Priority Inconsistency
- **Files affected:** Nearly all multi-sub-command plans
- **Problem:** P0/P1/P2 assignments for sub-commands sometimes contradict workflow dependencies:
  - `/test-command.md` (line 70-72): All sub-commands listed without priority
  - `/design-command.md` (line 31-39): Sub-commands have implicit ordering but no priority
  - `/debug-command.md` (line 172-175): `debug:memory` and `debug:concurrency` are P1 but depend on P0 error handling
- **Impact:** Unclear which sub-commands are critical path

---

## 6. Missing Information

### Issue 6.1: Placeholder and TODO Markers
- **Files affected:** `/implement-command.md` (referenced but not found, indicating incompleteness)
- **Problem:** Several plans reference commands that weren't created yet, suggesting placeholders:
  - `/workflow-loops.md` (line 214): Note says "May need UI component for manual gate approval" - incomplete design
  - `/artifact-registry.md` (line 37): "decide based on use case" - open decision, not resolved
  - Multiple plans say "VERIFY Phase X" but don't explain what verification means exactly
- **Impact:** Incomplete specifications; unclear acceptance criteria

### Issue 6.2: Incomplete Error Handling Specifications
- **Files affected:** `/explore-command.md`, `/design-command.md`, `/spec-command.md`
- **Problem:** Plans mention error scenarios but don't specify recovery:
  - `/explore-command.md` (line 204): "Partial result handling if agent times out" - how exactly?
  - `/design-command.md` (line 300-310): "handle incomplete inputs gracefully" but no specifics
  - `/spec-command.md` (line 244-249): "Handle edge cases gracefully" - vague requirement
- **Impact:** Implementation will need to guess at error handling strategy

### Issue 6.3: Missing Configuration Specifications
- **Files affected:** `/explore-command.md`, `/debug-command.md`, `/test-command.md`, others
- **Problem:** Plans mention configuration files but don't specify complete schema:
  - `/artifact-registry.md` (line 211-231): `.claude/discovery-config.yml` specified but no schema provided
  - `/explore-command.md` (line 31-36): "default parameters" listed but no schema
  - `/validate-command.md` (line 150-156): Quality gate configuration mentioned but incomplete
- **Impact:** Implementations will have different configuration approaches

### Issue 6.4: Incomplete Artifact Schemas
- **Files affected:** Most command plans
- **Problem:** Artifact schemas specified in YAML frontmatter but full JSON Schema not defined:
  - `/clarify-command.md` (line 52-62): Says "Create `requirements.json` schema" but doesn't show actual schema
  - `/design-command.md` (line 246-262): Artifact schema described narratively, not formally
  - `/validate-command.md` (line 101-128): Formal artifact schemas mentioned but not provided in full
- **Impact:** Artifact generation implementations will diverge; incompatibility issues

---

## 7. Duplicate/Overlapping Scope

### Issue 7.1: Overlapping Analysis Commands
- **Files affected:** `/analyze-command.md`, `/review-command.md`, `/audit-command.md`
- **Problem:** Three analysis commands have overlapping responsibilities:
  - `/analyze-command.md` (line 52): `analyze:security` checks OWASP Top 10
  - `/review-command.md` (line 229): `review:security` also checks OWASP Top 10
  - `/audit-command.md` (line 79-104): `audit:security` ALSO checks OWASP Top 10
  - Different phases, different outputs, but same analysis
- **Impact:** Duplicate security checking; potential for different findings from same code

### Issue 7.2: Overlapping Refactoring Commands
- **Files affected:** `/refactor-command.md`, `/design-command.md`, `/architect-command.md`
- **Problem:** Multiple commands deal with structural improvements:
  - `/refactor-command.md` (line 48-68): Redesign code structures
  - `/design-command.md` (line 92-99): Design component structures
  - `/architect-command.md` (line 241-357): Design system architecture
  - Overlap in responsibility for component-level changes
- **Impact:** Unclear which command to use for what; potentially conflicting recommendations

### Issue 7.3: Overlapping Documentation Commands
- **Files affected:** `/document-command.md`, `/explain-command.md`, `/architect-command.md`
- **Problem:** Three commands generate architecture documentation:
  - `/architect-command.md` (line 240-250): Generates architecture documentation
  - `/document-command.md` (line 140-155): Generates architecture documentation
  - `/explain-command.md` (line 100-120): Generates architecture explanation
  - Unclear which creates primary documentation vs supplementary
- **Impact:** Duplicate documentation generation; unclear source of truth

### Issue 7.4: Overlapping Testing Concerns
- **Files affected:** `/test-command.md`, `/validate-command.md`, `/review-command.md`
- **Problem:** Multiple commands check code quality:
  - `/test-command.md` (line 70-122): Generates tests
  - `/validate-command.md` (line 200-212): Validates build and types
  - `/review-command.md` (line 200-350): Reviews code quality
  - `/audit-command.md` (line 190-208): Audits compliance
  - Overlapping scope on quality verification
- **Impact:** Unclear which command runs what checks; potential duplication

---

## 8. Technical Inconsistencies

### Issue 8.1: Different Approaches to Artifact Discovery
- **Files affected:** `/architect-command.md`, `/design-command.md`, `/document-command.md`
- **Problem:** Each plan uses different discovery mechanisms:
  - `/architect-command.md` (line 413-430): Explicit artifact discovery from `/clarify`, `/explore`, `/research`
  - `/design-command.md` (line 413-428): Similar discovery but slightly different approach
  - `/document-command.md` (line 298-319): Artifact discovery from different commands
  - Different search patterns, different handling of not found
- **Impact:** Inconsistent artifact discovery; some commands may not find upstream artifacts

### Issue 8.2: Different Approaches to Diagram Generation
- **Files affected:** `/architect-command.md`, `/explain-command.md`, `/design-command.md`, `/analyze-command.md`
- **Problem:** Multiple commands generate Mermaid diagrams but use different approaches:
  - `/architect-command.md` (line 299-360): C4 model diagrams with specific Mermaid syntax
  - `/explain-command.md` (line 176-185): Flow diagrams without specific syntax
  - `/design-command.md` (line 87-100): Interaction diagrams with specific syntax
  - `/analyze-command.md` uses only text, no diagrams
  - Inconsistent diagram generation philosophy
- **Impact:** Diagram styles won't be consistent across documentation

### Issue 8.3: Different Severity Classification Schemes
- **Files affected:** `/analyze-command.md`, `/audit-command.md`, `/validate-command.md`, `/review-command.md`
- **Problem:** Different severity classifications used:
  - `/analyze-command.md` (line 50-53): critical, high, medium, low, info
  - `/audit-command.md` (line 309-317): Critical, High, Medium, Low, Info (capitalized)
  - `/validate-command.md` (line 14-15): CRITICAL, MAJOR, MINOR, INFORMATIONAL (different names)
  - `/review-command.md` (line 20-21): Critical, High, Medium, Low, Info
  - Inconsistent severity scales make it harder to aggregate findings
- **Impact:** Severity mappings between commands unclear; reporting inconsistency

### Issue 8.4: Different Approaches to Input Validation
- **Files affected:** Multiple commands with interactive input
- **Problem:** Different validation strategies:
  - `/clarify-command.md`: Uses AskUserQuestion for input
  - `/brainstorm-command.md`: Uses interactive session flow
  - `/design-command.md`: Mentions AskUserQuestion but also has context analysis
  - Different input handling philosophies
- **Impact:** User experience varies between commands

### Issue 8.5: Model Selection Inconsistencies
- **Files affected:** Nearly all command plans
- **Problem:** Model selection varies by command without clear rationale:
  - `/brainstorm-command.md` (line 25): Opus 4.5 (creative work, highest capability)
  - `/test-command.md` (line 14): Sonnet 4.5 (test generation)
  - `/debug-command.md` (line 208, 266): Opus for memory/concurrency, Sonnet for others
  - `/spec-command.md` (line 18): Sonnet (specification generation)
  - Why is brainstorming Opus but spec generation Sonnet? No clear decision framework
- **Impact:** Cost optimization unclear; model selection seems arbitrary

### Issue 8.6: Different Quality Gate Approaches
- **Files affected:** `/validate-command.md`, `/audit-command.md`, `/artifact-registry.md`
- **Problem:** Different quality gate definitions:
  - `/validate-command.md` (line 150-156): Configurable thresholds (max_critical, max_major, max_minor)
  - `/artifact-registry.md` (line 368): "Registry validates integrity" - no specific gates mentioned
  - `/audit-command.md` (line 390-403): CI/CD integration with quality gates but different format
  - Different gate definition formats
- **Impact:** Quality gates won't integrate consistently across commands

---

## 9. Additional Findings

### Issue 9.1: Incomplete Migration Path Documentation
- **Files affected:** `/refactor-command.md`, `/migrate-command.md` (doesn't exist)
- **Problem:** Plans mention migration but don't document path:
  - `/refactor-command.md` (line 6, 247-248): References "/plan:batch" and migration but unclear
  - No `/migrate-command.md` found despite multiple references
  - Migration concerns not systematically addressed
- **Impact:** Large refactoring support incomplete

### Issue 9.2: Incomplete Test Coverage Specifications
- **Files affected:** Nearly all plans with test sections
- **Problem:** Test coverage targets vary:
  - `/artifact-registry.md` (line 539): ">80%" coverage target
  - `/validate-command.md` (line 210): ">85%" coverage target
  - `/debug-command.md` (line 180): ">85%" coverage target
  - `/fix-command.md` (line 288): ">90%" coverage target
  - Different targets for different commands
- **Impact:** Inconsistent quality standards

### Issue 9.3: Performance Requirements Inconsistency
- **Files affected:** `/test-command.md`, `/analyze-command.md`, `/explore-command.md`, `/debug-command.md`
- **Problem:** Different performance targets:
  - `/explore-command.md` (line 323-325): Quick (<30s), Standard (<2min), Deep (<5min)
  - `/test-command.md` (line 269): "Performance acceptable (<5s typical, <10s complex)"
  - `/debug-command.md` (line 676): "<5 minutes for standard debugging sessions"
  - `/analyze-command.md` (line 495): "Quick <30s, Standard <5min, Deep <30min"
  - Different absolute times, different depth level definitions
- **Impact:** Performance expectations unclear; hard to plan resource allocation

---

## Recommendations

1. **Create a Master Template** - Establish a single standard template for all implementation plans with consistent sections, naming, and formatting

2. **Define Artifact Standards** - Specify formal JSON schemas for all artifact types with version metadata

3. **Establish Command Architecture** - Document clear boundaries between overlapping commands (analyze vs review vs audit, refactor vs design vs architect)

4. **Create Dependency Graph** - Map all inter-command dependencies and establish clear implementation order

5. **Standardize Naming** - Define naming conventions for sub-commands, YAML parameters, artifact types, and severity classifications

6. **Complete Missing Plans** - Create missing plans for `/implement-command.md`, `/migrate-command.md`, `/release-command.md`

7. **Document Design Decisions** - Create ADRs for major architectural choices (model selection, severity classifications, etc.)

8. **Establish Quality Standards** - Define consistent test coverage targets, performance requirements, and quality gates across all commands
