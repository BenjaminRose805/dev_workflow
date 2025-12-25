# /fix Command Design Specification

**Task:** 7.3 Design `/fix` command (bug fixing)
**Category:** Implementation & Remediation
**Priority:** HIGH
**Date:** 2025-12-20

---

## Executive Summary

The `/fix` command suite provides systematic bug fixing and error resolution capabilities across multiple domains: runtime errors, type errors, security vulnerabilities, performance issues, and test failures. It bridges debugging (root cause analysis) with implementation (applying solutions).

**Core Philosophy:**
- **Solution-oriented:** Focus on applying fixes, not just finding issues
- **Safety-first:** All fixes include risk assessment and rollback options
- **Test-driven:** Generate regression tests alongside fixes
- **Traceable:** Link fixes to original issues with evidence

**Position in Workflow:**
```
/debug → /fix → /test → /validate
  ↓        ↓       ↓        ↓
Root    Apply   Verify  Ensure
Cause   Fix     Fix     Quality
```

---

## Sub-Command Specifications

| Sub-command | Purpose | Model | Priority |
|-------------|---------|-------|----------|
| `fix:bug` | Runtime bug fixes with regression tests | Sonnet | P0 |
| `fix:type-error` | Type safety fixes (TypeScript, etc.) | Sonnet | P0 |
| `fix:security` | Security vulnerability remediation | **Opus** | P0 |
| `fix:performance` | Performance bottleneck fixes | Sonnet | P1 |
| `fix:test` | Test failure fixes (implementation or test code) | Sonnet | P1 |
| `fix:lint` | Linting/style fixes | **Haiku** | P2 |
| `fix:dependency` | Dependency conflicts and vulnerabilities | Sonnet | P1 |
| `fix:data` | Data validation and corruption fixes | Sonnet | P2 |

---

## YAML Frontmatter Specification

### Primary Command: `.claude/commands/fix.md`

```yaml
---
name: fix
description: Systematic bug fixing with regression test generation, risk assessment, and rollback planning. Bridges debugging to remediation.
model: sonnet
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
argument-hint: [issue-or-file]
category: implementation
output_artifacts:
  - fix-report.md
  - regression-test.ts
  - fix-notes.md
---
```

---

## Output Artifacts

### fix-report.md Template

```markdown
---
artifact-type: fix-report
fix-type: [bug | type-error | security | performance | test | lint]
severity: [critical | high | medium | low]
timestamp: [ISO-8601]
issue-id: [original-issue-reference]
---

# Fix Report: [Issue Title]

## Issue Summary
**Type:** [Bug/Security/Performance/etc.]
**Severity:** [Critical/High/Medium/Low]
**Affected Components:** [List]

## Root Cause
[Brief explanation of what caused the issue]

## Solution Applied

### Changes Made
- `src/path/to/file.ts` - [Description of change]

### Code Changes
```typescript
// Before:
function buggyCode() { /* problematic */ }

// After:
function fixedCode() { /* corrected */ }
```

## Risk Assessment
**Risk Level:** [Low | Medium | High]
**Rollback Plan:** [Steps to revert if issues arise]

## Testing
- Regression test added: `test/regression/issue-123.test.ts`
- All tests passing (45/45)

## Verification Steps
1. Review code changes
2. Run test suite: `npm test`
3. Verify fix addresses root cause
```

### regression-test.ts Template

```typescript
/**
 * Regression test for: [Issue Title]
 * Issue ID: [ID]
 * Fixed: [Date]
 */
import { describe, it, expect } from 'vitest';

describe('Regression: [Issue ID] - [Brief Title]', () => {
  it('should [expected behavior that was failing]', () => {
    // Arrange - Setup that triggers the original bug
    const input = /* reproduction case */;

    // Act - Execute the fixed code
    const result = componentUnderTest(input);

    // Assert - Verify the fix
    expect(result).toBe(/* expected value */);
  });
});
```

---

## Workflow Integration

### Upstream Commands (Inputs)

| Artifact | Source Command | Usage in /fix |
|----------|----------------|---------------|
| `debug-log.md` | `/debug:error` | Root cause context |
| `root-cause.md` | `/debug:behavior` | Confirmed diagnosis |
| `vulnerabilities.json` | `/audit:security` | Security issues |
| `type-errors.json` | `/validate:types` | Type violations |

### Downstream Commands (Outputs)

| Artifact | Consumed By | Purpose |
|----------|-------------|---------|
| `fix-report.md` | `/review`, Human | Document changes |
| `regression-test.ts` | `/test:run` | Prevent regression |
| Modified source files | `/validate`, `/test` | Verification |

### Command Chains

**Bug Fix Workflow:**
```
/debug:error → /fix:bug → /test:run → /validate:spec
```

**Security Fix Workflow:**
```
/audit:security → /fix:security → /test:run → /audit:security --verify
```

---

## Safety Mechanisms

### Pre-Fix Validation
1. Git status clean check
2. Read all related files before changes
3. Impact analysis
4. Risk assessment

### Fix Application
1. Apply smallest possible change
2. Track all changes for rollback
3. Generate regression test
4. Document fix rationale

### Post-Fix Verification
1. Run full test suite
2. Verify type safety (`tsc --noEmit`)
3. Ensure linting passes
4. Confirm successful build

---

## Example Usage Scenarios

### Example 1: Fix Runtime Bug

```
User: /fix:bug

Claude: Found recent debug session for null pointer error.

Issue: TypeError - Cannot read property 'id' of null
Root Cause: User object not checked before access
File: src/auth/session.ts:45

Proposed Fix:
1. Add null check before user.id access
2. Return early with error if user is null
3. Add regression test

Apply? yes

✅ Fix applied
✅ All 124 tests passing
✅ Regression test added

Commit: fix: handle null user in session
```

### Example 2: Fix Security Vulnerability

```
User: /fix:security --input docs/audit/vulnerabilities.json

Claude: Found 3 vulnerabilities:
🔴 CRITICAL: SQL Injection (CWE-89)
🟠 HIGH: XSS vulnerability (CWE-79)
🟡 MEDIUM: Weak password hashing (CWE-916)

Starting with CRITICAL: SQL Injection
Location: src/api/users/search.ts:23
Issue: User input directly concatenated into SQL query

Fix: Replace with parameterized query + input validation

✅ SQL Injection fixed
✅ Security test added
✅ Tests passing

Continue with next vulnerability? [Y/n]
```

---

## Quality Gates

Before marking a fix complete, verify:

- ✅ Root cause identified and documented
- ✅ Fix addresses root cause (not just symptoms)
- ✅ Regression test added
- ✅ All existing tests still pass
- ✅ Type check passes
- ✅ Linting passes
- ✅ Build succeeds
- ✅ Risk assessment documented
- ✅ Rollback plan documented

For security fixes:
- ✅ Security test demonstrates vulnerability is fixed
- ✅ No new vulnerabilities introduced
- ✅ Remediation evidence documented

---

## Differentiation from Related Commands

### `/fix` vs `/debug`
| Aspect | `/debug` | `/fix` |
|--------|----------|--------|
| **Goal** | Find root cause | Apply solution |
| **Output** | Analysis | Code changes + tests |

### `/fix` vs `/implement`
| Aspect | `/fix` | `/implement` |
|--------|--------|--------------|
| **Purpose** | Fix existing code | Create new code |
| **Scope** | Minimal change | Complete feature |

### `/fix` vs `/refactor`
| Aspect | `/fix` | `/refactor` |
|--------|--------|------------|
| **Goal** | Correct bugs | Improve structure |
| **Behavior Change** | Fix incorrect behavior | Preserve correct behavior |

---

**Phase 7 Task 7.3 Status: COMPLETE**
