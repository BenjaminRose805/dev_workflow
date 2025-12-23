# Phase 6: Analysis & Quality - `/audit` Command Design

## Command Overview

The `/audit` command suite provides comprehensive compliance, security, and quality auditing capabilities. It enables systematic verification of security posture, regulatory compliance, access controls, credential management, and license obligations.

**Primary Use Cases:**
- Pre-deployment security assessments
- Regulatory compliance verification (SOC2, GDPR, HIPAA, PCI-DSS)
- Third-party security audit preparation
- License compliance and attribution management

**Command Philosophy:**
- Evidence-based findings with source references
- Risk-prioritized remediation guidance
- Framework-aligned reporting (OWASP, CWE, NIST)
- Actionable recommendations over generic warnings

---

## Sub-Command Specifications

### 1. `audit:security` - Security Posture Audit

```yaml
---
name: audit:security
model: claude-sonnet-4-5
allowed-tools: [Read, Glob, Grep, Bash]
description: OWASP/CWE-aligned security posture audit
artifacts:
  - security-audit-report.md
  - vulnerabilities.json
  - security-remediation-plan.md
---
```

**Key Checks:**
- OWASP Top 10 patterns
- CWE-aligned code analysis
- Dependency vulnerabilities
- Cryptographic implementation
- Input validation audit

---

### 2. `audit:compliance` - Compliance Framework Verification

```yaml
---
name: audit:compliance
model: claude-sonnet-4-5
allowed-tools: [Read, Glob, Grep, Bash]
description: Verify SOC2, GDPR, HIPAA, PCI-DSS compliance
artifacts:
  - compliance-audit-report.md
  - compliance-checklist.md
  - control-mapping.json
  - compliance-gaps.md
---
```

**Supported Frameworks:**
- SOC2 Type II controls
- GDPR data protection
- HIPAA privacy/security
- PCI-DSS payment security
- ISO 27001

---

### 3. `audit:access` - Access Control & Permission Audit

```yaml
---
name: audit:access
model: claude-sonnet-4-5
allowed-tools: [Read, Glob, Grep]
description: RBAC/ABAC policies, privilege escalation, permission audit
artifacts:
  - access-audit-report.md
  - permission-matrix.md
  - access-violations.json
  - access-remediation.md
---
```

**Analysis Focus:**
- Role-based access control
- Least privilege adherence
- Privilege escalation vectors
- API key usage and scoping

---

### 4. `audit:secrets` - Secret & Credential Management Audit

```yaml
---
name: audit:secrets
model: claude-sonnet-4-5
allowed-tools: [Read, Glob, Grep, Bash]
description: Detect exposed secrets, audit credential management
artifacts:
  - secrets-audit-report.md
  - exposed-secrets.json
  - secret-management-assessment.md
  - secret-remediation.md
---
```

**Detection Capabilities:**
- AWS/Azure/GCP credentials
- Database connection strings
- API keys (Stripe, GitHub, Slack, etc.)
- Private keys (SSH, PGP, TLS)
- High-entropy strings

---

### 5. `audit:licenses` - License Compliance Verification

```yaml
---
name: audit:licenses
model: claude-sonnet-4-5
allowed-tools: [Read, Glob, Grep, Bash]
description: License compliance, SBOM generation, attribution
artifacts:
  - license-audit-report.md
  - license-inventory.json
  - license-violations.md
  - attribution.md
  - sbom.json
---
```

**Analysis Coverage:**
- Direct/transitive dependency licenses
- License compatibility conflicts
- Copyleft obligations
- Custom/proprietary licenses

---

### 6. `audit:privacy` - Data Privacy & PII Audit

```yaml
---
name: audit:privacy
model: claude-sonnet-4-5
allowed-tools: [Read, Glob, Grep]
description: PII/PHI handling, privacy controls, data flow mapping
artifacts:
  - privacy-audit-report.md
  - pii-inventory.json
  - privacy-controls.md
  - data-flow-map.md
---
```

---

### 7. `audit:dependencies` - Dependency Security Audit

```yaml
---
name: audit:dependencies
model: claude-sonnet-4-5
allowed-tools: [Read, Glob, Grep, Bash]
description: Dependency vulnerabilities, supply chain risk assessment
artifacts:
  - dependency-audit-report.md
  - vulnerabilities.json
  - dependency-health.md
  - update-plan.md
---
```

---

### 8. `audit:infrastructure` - Infrastructure Security Audit

```yaml
---
name: audit:infrastructure
model: claude-sonnet-4-5
allowed-tools: [Read, Glob, Grep, Bash]
description: IaC security, container vulnerabilities, cloud configuration
artifacts:
  - infrastructure-audit-report.md
  - iac-violations.json
  - container-security.md
  - infrastructure-remediation.md
---
```

---

## Artifact Schemas

### security-audit-report.md

```markdown
# Security Audit Report

**Project:** [Project Name]
**Audit Date:** [ISO 8601]
**Auditor:** Claude (audit:security)

## Executive Summary
**Overall Risk Level:** [Critical|High|Medium|Low]

## Findings Summary
- Critical: X findings
- High: X findings
- Medium: X findings
- Low: X findings

## Detailed Findings
### [F-001] [Finding Title]
**Severity:** Critical
**CWE:** CWE-XXX
**Location:** `/path/to/file:line`
**Remediation:** [Steps to fix]
```

### vulnerabilities.json

```json
{
  "audit_metadata": { "audit_type": "security", "timestamp": "ISO-8601" },
  "summary": { "total_findings": 42, "by_severity": { "critical": 2, "high": 8 } },
  "vulnerabilities": [{
    "id": "SEC-001",
    "severity": "critical",
    "cvss_score": 9.8,
    "cwe": "CWE-89",
    "owasp": "A03:2021-Injection",
    "location": { "file": "/src/database/queries.js", "line_start": 45 },
    "remediation": { "priority": 1, "effort": "low", "example_code": "..." }
  }]
}
```

---

## Recommended Audit Cadence

| Audit Type | Frequency | Trigger Events |
|------------|-----------|----------------|
| audit:security | Quarterly + Pre-release | Major code changes |
| audit:compliance | Annually + Pre-certification | Framework updates |
| audit:secrets | Weekly (automated) | All commits |
| audit:dependencies | Weekly (automated) | New CVEs |
| audit:licenses | Monthly | New dependencies |

---

## Statistics

| Metric | Count |
|--------|-------|
| Sub-Commands | 8 |
| Unique Artifacts | 20 |
| Compliance Frameworks | 5 |

**Phase 6 Task 6.2 Status: COMPLETE**
