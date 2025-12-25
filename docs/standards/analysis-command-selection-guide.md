# Analysis Command Selection Guide

This guide helps users select the appropriate analysis command for their needs.

## Command Overview

| Command | Primary Focus | Output Type |
|---------|--------------|-------------|
| `/analyze` | Automated static analysis, metrics, patterns | Objective data (metrics.json, findings.json) |
| `/review` | AI-powered code review, suggestions | Subjective recommendations (suggestions.json) |
| `/audit` | Compliance verification, policy enforcement | Evidence-based reports (compliance-report.md) |

## Decision Matrix

### Security Analysis

| Need | Command | Rationale |
|------|---------|-----------|
| Detect vulnerabilities | `/analyze:security` | Pattern-based detection |
| OWASP Top 10 compliance | `/audit:security` | Framework mapping with attestation |
| Security code review | `/review:security` | AI improvement suggestions |
| Secrets exposure check | `/audit:secrets` | Policy enforcement with evidence |
| CVE dependency scan | `/analyze:dependencies` | Automated vulnerability detection |

### Code Quality

| Need | Command | Rationale |
|------|---------|-----------|
| Complexity metrics | `/analyze:quality` | Objective measurement |
| Improvement suggestions | `/review:file` | Subjective recommendations |
| Standards compliance | `/review:standards` | Linting rule validation |
| Architecture violations | `/analyze:architecture` | Pattern detection |

### Compliance & Policy

| Need | Command | Rationale |
|------|---------|-----------|
| SOC2 compliance | `/audit:compliance` | Framework-specific checks |
| GDPR requirements | `/audit:privacy` | Privacy control assessment |
| License compliance | `/audit:licenses` | SBOM and compatibility |
| PCI-DSS audit | `/audit:compliance` | Regulatory mapping |

### Code Review

| Need | Command | Rationale |
|------|---------|-----------|
| PR readiness | `/review:pr` | Holistic assessment |
| Diff analysis | `/review:diff` | Change-focused review |
| Commit quality | `/review:commit` | Message and atomic commit checks |
| Performance review | `/review:performance` | Optimization suggestions |

## Workflow Integration

### Pre-Commit
1. `/analyze:security` - Quick vulnerability check
2. `/review:diff --staged` - Review staged changes

### Pre-Merge (PR)
1. `/review:pr` - Holistic PR review
2. `/analyze:quality` - Complexity metrics
3. `/audit:secrets` - Secrets exposure check

### Pre-Release
1. `/audit:security` - Full OWASP compliance
2. `/audit:licenses` - License compatibility
3. `/audit:compliance` - Regulatory requirements

### Periodic Audits
1. `/audit:compliance` - Quarterly SOC2/GDPR
2. `/analyze:dependencies` - Weekly CVE scan
3. `/audit:secrets` - Weekly secrets scan

## Key Differentiators

1. **Objective vs Subjective**
   - `/analyze` provides objective, measurable data
   - `/review` provides subjective, improvement-focused suggestions

2. **Detection vs Compliance**
   - `/analyze` detects patterns and measures metrics
   - `/audit` validates against standards and produces attestation

3. **Change-Focused vs Full Analysis**
   - `/review` focuses on changes (PR, diff, commits)
   - `/analyze` and `/audit` can analyze full codebase

4. **Output Purpose**
   - `/analyze` outputs for developers (metrics, findings)
   - `/review` outputs for reviewers (suggestions, comments)
   - `/audit` outputs for auditors (compliance reports, evidence)
