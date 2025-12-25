# Before/After Comparison: Implementation Plan Fixes

This document provides a comparison of the implementation plan state before and after the inconsistency fix effort.

---

## Summary Statistics

| Metric | Before | After |
|--------|--------|-------|
| Total plans | 37 | 38 |
| Plans with all required sections | ~20 | 38 |
| Plans with Dependencies subsections | ~25 | 38 |
| Plans with Risks section | ~22 | 38 |
| Plans with Sub-Command Priority Tables | 0 | 24 |
| Plans with Command Boundaries | 0 | 12 |
| Standards documents | 1 | 7 |
| Selection guides | 0 | 4 |
| Artifact schemas | 0 | 5 |
| Validation script | None | 1 |
| README index | None | Complete |

---

## Structural Changes

### Dependencies Section

**Before:**
```markdown
## Dependencies
- Skill system must support sub-commands
- WebSearch tool must be available
- File I/O tools must support YAML/JSON
- Upstream: /clarify, /design
- Downstream: /implement, /test
```

**After:**
```markdown
## Dependencies

### Upstream
- `/clarify` - Consumes requirements for guidance
- `/design` - Consumes design-spec.md

### Downstream
- `/implement` - Generates code from specs
- `/test` - Generates tests from schemas

### External Tools
- WebSearch for standards lookup
- File I/O for YAML/JSON formats
```

### Risks Section

**Before (some plans):**
```markdown
## Risks and Mitigations

- **Risk:** Generated code doesn't follow conventions
  - **Mitigation:** Implement pattern analyzer
```

**After (all plans):**
```markdown
## Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Generated code doesn't follow conventions | High | Medium | Implement pattern analyzer |
```

### VERIFY Sections

**Before (inconsistent):**
```markdown
**VERIFY 1:** Command runs successfully
VERIFY 1.1: Tests pass
- [ ] **VERIFY Phase 1**: Registry created
```

**After (standardized):**
```markdown
**VERIFY Phase 1:**
- [ ] Command runs successfully
- [ ] Tests pass
- [ ] Registry created
```

---

## New Content Added

### Sub-Command Priority Tables

**Added to all 24 command plans:**
```markdown
### Sub-Command Priorities

| Sub-Command | Priority | Scope | Description |
|-------------|----------|-------|-------------|
| `analyze:security` | P0 | MVP | Security analysis |
| `analyze:performance` | P0 | MVP | Performance analysis |
| `analyze:dependencies` | P1 | Core | Dependency analysis |
```

### Command Boundaries

**Added to 12 related command plans:**
```markdown
## Command Boundaries

### Scope Definition
The `/analyze` command focuses on automated static analysis...

### When to Use /analyze vs /review vs /audit
| Scenario | Use This Command | Rationale |
|----------|------------------|-----------|
| "Find unused code" | `/analyze:quality` | Static analysis task |
| "Review my PR" | `/review:code` | Subjective review |
```

### Artifact Compatibility References

**Added to producer/consumer commands:**
```markdown
### Artifact Compatibility
See `docs/architecture/artifact-compatibility-matrix.md` for detailed
artifact schemas and producer-consumer relationships.
```

---

## Documentation Created

### Standards Documents

| Document | Purpose |
|----------|---------|
| `implementation-plan-standards.md` | Canonical reference for all standards |
| `priority-assignment-matrix.md` | Priority criteria and rules |
| `command-configuration-guide.md` | Configuration options |

### Selection Guides

| Guide | Commands Covered |
|-------|-----------------|
| `analysis-command-selection-guide.md` | /analyze, /review, /audit |
| `architecture-command-selection-guide.md` | /refactor, /design, /architect |
| `documentation-command-selection-guide.md` | /document, /explain |
| `quality-verification-command-selection-guide.md` | /test, /validate |

### Artifact Schemas

| Schema | Purpose |
|--------|---------|
| `artifact-metadata.json` | Base metadata fields |
| `requirements-spec.json` | /clarify output |
| `components-catalog.json` | /architect output |
| `validation-report.json` | /validate output |
| `analysis-report.json` | /analyze output |

---

## Missing Plans Created

| Plan | Priority | Description |
|------|----------|-------------|
| `implement-implement-command.md` | P0 | Spec-driven code generation |
| `implement-migrate-command.md` | P0 | Codebase migrations |
| `implement-release-command.md` | P0 | Release management |

---

## Validation Comparison

### Before (Manual)
- No automated validation
- Inconsistencies discovered ad-hoc
- No enforcement mechanism

### After (Automated)
```bash
$ node scripts/validate-plan-format.js

📋 Validating 38 implementation plans...

📊 Validation Summary:
   ✓ Valid: 38 plans
   ⚠ Warnings: 0 plans
   ✗ Errors: 0 plans
   Total: 38 plans
```

### Validation Checks

| Check | Before | After |
|-------|--------|-------|
| Required sections | Not checked | ✓ |
| Overview fields | Not checked | ✓ |
| Dependencies subsections | Not checked | ✓ |
| Phase format | Not checked | ✓ |
| VERIFY format | Not checked | ✓ |
| Naming conventions | Not checked | ✓ |
| Cross-references | Not checked | ✓ |

---

## Index/Navigation

### Before
- No index of plans
- No categorization
- No quick reference

### After

**docs/plans/README.md:**
- Plan index by priority (P0/P1/P2)
- Command categories
- Quick reference table
- Template documentation
- Troubleshooting guide

---

## Sample Plan Comparison

### implement-spec-command.md

**Dependencies Before:**
```markdown
## Dependencies
- Skill system must support sub-commands (`:` notation)
- WebSearch tool must be available for standards lookup
- File I/O tools (Read, Write) must support YAML and JSON formats
- Bash tool access for running validation CLI tools (redocly, ajv, asyncapi)
- Upstream commands: /clarify, /design, /architect, /model
- Downstream commands: /implement, /test, /document, /validate
```

**Dependencies After:**
```markdown
## Dependencies

### Upstream
- `/clarify` - Consumes requirements for API design guidance
- `/design` - Consumes design-spec.md for interface definitions
- `/architect` - Consumes architecture decisions for system boundaries
- `/model` - Consumes domain models for schema generation

### Downstream
- `/implement` - Generates code from OpenAPI/AsyncAPI specs
- `/test` - Generates tests from schema examples
- `/document` - Uses specs for API documentation
- `/validate` - Uses schemas for validation

### External Tools
- Skill system with sub-command support (`:` notation)
- WebSearch tool for standards lookup
- File I/O tools (Read, Write) for YAML and JSON formats
- Bash tool for validation CLI tools (redocly, ajv, asyncapi)
```

---

## Key Improvements

1. **Consistency**: All 38 plans now follow the same structure
2. **Completeness**: All required sections present in every plan
3. **Clarity**: Clear scope boundaries between related commands
4. **Automation**: Validation script ensures ongoing compliance
5. **Discoverability**: README index enables easy navigation
6. **Standards**: Comprehensive standards document for reference
7. **Schemas**: Formal JSON schemas for key artifacts
