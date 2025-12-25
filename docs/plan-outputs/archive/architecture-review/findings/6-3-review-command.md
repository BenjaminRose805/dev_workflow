# Phase 6: Analysis & Quality - `/review` Command Design

## Command Overview

The `/review` command provides automated code review capabilities for pull requests, diffs, commits, and files. It leverages Claude's understanding of code quality, best practices, and project-specific conventions to provide actionable feedback.

**Primary Use Cases:**
- Pre-merge PR reviews
- Diff analysis during development
- Deep file analysis for refactoring
- Commit history review
- Standards compliance checking

**Design Principles:**
- Non-blocking by default (informational)
- Actionable feedback with specific suggestions
- Context-aware (understands project patterns)
- Structured output for automation integration

---

## Sub-Command Specifications

### 1. `review:pr` - Pull Request Review

```yaml
---
name: review:pr
description: Comprehensive PR review with bug detection, security, and quality
model: claude-sonnet-4-5
allowed-tools: [Read, Grep, Glob, Bash]
artifacts:
  - review-comments.md
  - suggestions.json
  - review-summary.md
  - blockers.md
parameters:
  pr_number: { type: string, required: false }
  focus: { type: string, enum: [security, performance, maintainability, all] }
  depth: { type: string, enum: [quick, standard, deep] }
---
```

---

### 2. `review:diff` - Git Diff Review

```yaml
---
name: review:diff
description: Review specific git diffs for quality and correctness
model: claude-sonnet-4-5
allowed-tools: [Read, Grep, Bash]
artifacts:
  - diff-review.md
  - suggestions.json
parameters:
  ref: { type: string, description: "Git ref to diff against" }
  staged: { type: boolean, default: false }
---
```

---

### 3. `review:file` - Deep File Analysis

```yaml
---
name: review:file
description: Single-file deep review for refactoring
model: claude-sonnet-4-5
allowed-tools: [Read, Grep, Glob]
artifacts:
  - file-analysis.md
  - refactoring-suggestions.json
  - complexity-report.json
parameters:
  file_path: { type: string, required: true }
  aspects: { type: array, default: [all] }
---
```

---

### 4. `review:commit` - Commit History Review

```yaml
---
name: review:commit
description: Analyze commit history for patterns and quality
model: claude-sonnet-4-5
allowed-tools: [Bash, Read, Grep]
artifacts:
  - commit-analysis.md
  - commit-quality-report.json
parameters:
  range: { type: string, description: "Commit range" }
  count: { type: integer, default: 10 }
---
```

---

### 5. `review:standards` - Standards Compliance Review

```yaml
---
name: review:standards
description: Check compliance against project conventions
model: claude-sonnet-4-5
allowed-tools: [Read, Grep, Glob, Bash]
artifacts:
  - compliance-report.md
  - violations.json
  - standards-summary.md
parameters:
  scope: { type: string, enum: [changed, branch, all] }
  strict: { type: boolean, default: false }
---
```

---

### 6. `review:security` - Security-Focused Review

```yaml
---
name: review:security
description: Deep security analysis for vulnerabilities
model: claude-sonnet-4-5
allowed-tools: [Read, Grep, Glob, Bash]
artifacts:
  - security-report.md
  - vulnerabilities.json
  - threat-model.md
parameters:
  scope: { type: string, enum: [changed, branch, all] }
  severity_threshold: { type: string, enum: [critical, high, medium, low] }
---
```

---

### 7. `review:performance` - Performance Analysis

```yaml
---
name: review:performance
description: Identify performance bottlenecks
model: claude-sonnet-4-5
allowed-tools: [Read, Grep, Glob, Bash]
artifacts:
  - performance-report.md
  - optimizations.json
  - benchmarks.md
parameters:
  scope: { type: string, enum: [changed, branch, all] }
  focus: { type: array, description: "memory, cpu, network, database" }
---
```

---

## Artifact Schemas

### review-comments.md

```markdown
# Review Comments

Generated: [timestamp]
Scope: [PR number / diff / file path]

## Summary
- Files changed: X
- Comments: Y
- Blockers: Z
- Suggestions: W

## File: [path/to/file.ext]

### Line 42-45
**Severity:** High
**Category:** Bug

[Comment describing the issue]

**Suggestion:**
\`\`\`language
[suggested code]
\`\`\`
```

### suggestions.json

```json
{
  "version": "1.0",
  "summary": {
    "total_suggestions": 10,
    "by_severity": { "critical": 1, "high": 3, "medium": 4, "low": 2 },
    "by_category": { "bug": 2, "security": 3, "performance": 2, "style": 3 }
  },
  "suggestions": [{
    "id": "unique-id",
    "file": "path/to/file.ext",
    "line_start": 42,
    "severity": "high",
    "category": "bug",
    "title": "Brief description",
    "current_code": "...",
    "suggested_code": "...",
    "rationale": "...",
    "auto_fixable": true
  }]
}
```

### blockers.md

```markdown
# Merge Blockers

## Critical Issues: X

### 1. [Issue Title]
**File:** `path/to/file.ext:42-45`
**Severity:** Critical
**Category:** Security

#### Description
[Why this blocks merge]

#### Required Fix
\`\`\`language
[Fix code]
\`\`\`
```

---

## Workflow Integration

### GitHub Integration

```bash
# Post review comments
gh pr comment [PR_NUMBER] --body-file review-comments.md

# CI/CD integration
if [ -f blockers.md ] && [ -s blockers.md ]; then
  exit 1
fi
```

### Git Hooks

```bash
#!/bin/bash
# .git/hooks/pre-commit
claude /review:diff --staged
```

---

## Statistics

| Metric | Count |
|--------|-------|
| Sub-Commands | 7 |
| Unique Artifacts | 12 |
| Categories | 5 (bug, security, performance, maintainability, style) |

**Phase 6 Task 6.3 Status: COMPLETE**
