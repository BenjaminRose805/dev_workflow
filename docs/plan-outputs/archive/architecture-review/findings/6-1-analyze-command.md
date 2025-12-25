# Phase 6: Analysis & Quality - `/analyze` Command Design

## Command Overview

The `/analyze` command family provides comprehensive static and dynamic code analysis capabilities for security, performance, quality, and architectural concerns. These commands leverage Claude's reasoning abilities to go beyond traditional linters, offering contextual insights and prioritized recommendations.

**Design Philosophy:**
- **Context-aware analysis:** Understand code intent, not just syntax patterns
- **Prioritized findings:** Severity-based ranking with business impact context
- **Actionable outputs:** Concrete recommendations with code examples
- **Tool integration:** Complement existing analysis tools (ESLint, SonarQube, etc.)
- **Progressive depth:** Quick scans to deep architecture reviews

---

## Sub-Command Specifications

### 1. `/analyze:security` - Security Vulnerability Detection

```yaml
---
name: analyze:security
description: Security analysis including OWASP Top 10, CWE patterns, credential exposure
model: claude-sonnet-4-5
temperature: 0.0
allowed-tools: [Read, Glob, Grep, Bash]
artifacts:
  - security-findings.json
  - security-report.md
  - threat-model.md
  - remediation-plan.md
---
```

**Key Analysis Areas:**
- Injection vulnerabilities (SQL, NoSQL, command, XSS, XXE)
- Authentication/Authorization issues
- Data exposure and logging
- Cryptographic weaknesses
- Configuration vulnerabilities
- Dependency CVEs

---

### 2. `/analyze:performance` - Performance Bottleneck Identification

```yaml
---
name: analyze:performance
description: Performance analysis for bottlenecks, inefficient algorithms, resource issues
model: claude-sonnet-4-5
temperature: 0.0
allowed-tools: [Read, Glob, Grep, Bash]
artifacts:
  - performance-findings.json
  - performance-report.md
  - bottlenecks.md
  - optimization-plan.md
---
```

**Key Analysis Areas:**
- Algorithmic complexity (Big O)
- N+1 query problems
- Database query efficiency
- Unnecessary re-renders (React, Vue)
- Bundle size and code splitting
- Memory leaks and resource cleanup

---

### 3. `/analyze:quality` - Code Quality Metrics & Analysis

```yaml
---
name: analyze:quality
description: Code quality including complexity, duplication, smells, maintainability
model: claude-sonnet-4-5
temperature: 0.0
allowed-tools: [Read, Glob, Grep, Bash]
artifacts:
  - quality-metrics.json
  - quality-report.md
  - code-smells.md
  - refactoring-candidates.md
  - tech-debt-assessment.md
---
```

**Key Analysis Areas:**
- Cyclomatic/cognitive complexity
- Code duplication detection
- Code smells (long methods, god classes, etc.)
- Test coverage and quality
- Naming and readability
- Maintainability index

---

### 4. `/analyze:dependencies` - Dependency Analysis

```yaml
---
name: analyze:dependencies
description: Dependency security, licensing, outdated packages, supply chain risks
model: claude-sonnet-4-5
temperature: 0.0
allowed-tools: [Read, Glob, Grep, Bash]
artifacts:
  - dependency-report.json
  - dependency-analysis.md
  - vulnerabilities.json
  - upgrade-plan.md
  - license-report.md
---
```

**Key Analysis Areas:**
- Known vulnerabilities (CVEs)
- Outdated packages
- Unused dependencies
- License compatibility
- Supply chain risks

---

### 5. `/analyze:architecture` - Architecture Conformance Analysis

```yaml
---
name: analyze:architecture
description: Architecture conformance, layer violations, circular dependencies
model: claude-sonnet-4-5
temperature: 0.0
allowed-tools: [Read, Glob, Grep, Bash]
artifacts:
  - architecture-analysis.md
  - violations.json
  - dependency-graph.json
  - architecture-score.json
  - improvement-roadmap.md
---
```

**Key Analysis Areas:**
- Layer violations
- Circular dependencies
- SOLID principle adherence
- Coupling and cohesion metrics
- Component boundaries

---

### 6. `/analyze:accessibility` - Accessibility Analysis

```yaml
---
name: analyze:accessibility
description: WCAG 2.1 compliance, ARIA usage, keyboard navigation, color contrast
model: claude-sonnet-4-5
temperature: 0.0
allowed-tools: [Read, Glob, Grep, Bash]
artifacts:
  - accessibility-report.md
  - violations.json
  - wcag-checklist.md
  - remediation-guide.md
---
```

---

### 7. `/analyze:test` - Test Quality Analysis

```yaml
---
name: analyze:test
description: Test suite quality, coverage gaps, test smells, flaky tests
model: claude-sonnet-4-5
temperature: 0.0
allowed-tools: [Read, Glob, Grep, Bash]
artifacts:
  - test-analysis.md
  - coverage-gaps.json
  - test-smells.md
  - flaky-tests.json
  - test-improvement-plan.md
---
```

---

## Artifact Schemas

### findings.json (Universal Format)

```json
{
  "metadata": {
    "command": "analyze:security",
    "timestamp": "ISO-8601",
    "scope": "/src/**/*.js"
  },
  "summary": {
    "total_findings": 23,
    "by_severity": { "critical": 2, "high": 5, "medium": 8, "low": 6, "info": 2 }
  },
  "findings": [{
    "id": "SEC-001",
    "severity": "critical",
    "category": "injection",
    "title": "SQL Injection vulnerability",
    "location": { "file": "/src/database/users.js", "line": 42 },
    "impact": "Attacker can execute arbitrary SQL",
    "cwe_id": "CWE-89",
    "recommendation": { "summary": "Use parameterized queries", "code_example": "..." }
  }]
}
```

### metrics.json

```json
{
  "complexity": { "average_cyclomatic": 4.2, "max_cyclomatic": 28 },
  "duplication": { "percentage": 8.5, "duplicated_lines": 1058 },
  "test_coverage": { "line_coverage": 78.5, "branch_coverage": 65.2 },
  "maintainability_index": 68.5,
  "technical_debt_hours": 45.2
}
```

---

## Workflow Integration

### CI/CD Integration

```yaml
name: Code Analysis
on: [pull_request]
jobs:
  analyze:
    steps:
      - run: claude analyze:security --scope=changed-files --format=github-annotations
      - run: claude analyze:quality --fail-on=critical,high --baseline=main
```

### Depth Levels
- **Quick (~30s):** Pattern matching, critical issues only
- **Standard (~2-5min):** Comprehensive analysis
- **Deep (~10-30min):** Cross-file analysis, architectural patterns

### Baseline Comparison
All commands support `--baseline` for trend analysis and delta reporting.

---

## Statistics

| Metric | Count |
|--------|-------|
| Sub-Commands | 7 |
| Unique Artifacts | 18 |
| Severity Levels | 5 |

**Phase 6 Task 6.1 Status: COMPLETE**
