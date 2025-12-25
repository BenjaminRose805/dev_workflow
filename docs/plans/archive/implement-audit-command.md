# Implementation Plan: /audit Command

## Overview
- **Goal:** Implement the /audit command with 8 sub-commands for comprehensive compliance, security, and quality auditing
- **Priority:** P1 (Analysis & Quality phase)
- **Created:** 2025-12-22
- **Output:** `docs/plan-outputs/audit-command/`
- **Model:** sonnet (security analysis and compliance verification)
- **Category:** Analysis & Quality

> The /audit command suite provides comprehensive compliance, security, and quality auditing capabilities. It enables systematic verification of security posture, regulatory compliance, access controls, credential management, and license obligations with evidence-based findings and framework-aligned reporting.

### Sub-Command Priorities

| Sub-Command | Priority | Scope | Description |
|-------------|----------|-------|-------------|
| `audit:security` | P0 | MVP | OWASP Top 10 and CWE pattern detection with CVSS scoring |
| `audit:secrets` | P0 | MVP | Detect exposed credentials, API keys, and secrets with entropy analysis |
| `audit:dependencies` | P0 | MVP | Vulnerability scanning for packages with CVE database checks and supply chain assessment |
| `audit:compliance` | P1 | Core | Framework-specific checks for SOC2, GDPR, HIPAA, PCI-DSS, ISO27001 |
| `audit:access` | P1 | Core | RBAC/ABAC policy review with privilege escalation detection |
| `audit:licenses` | P1 | Core | License detection, compatibility analysis, and SBOM generation |
| `audit:privacy` | P2 | Enhancement | PII/PHI detection with data flow mapping and privacy control assessment |
| `audit:infrastructure` | P2 | Enhancement | IaC security scanning for Terraform, Kubernetes, Docker, and cloud configurations |

## Dependencies

### Upstream
- `/analyze` - Provides security and quality analysis as audit input
- `/explore` - Uses codebase structure for audit scoping
- Compliance frameworks (OWASP, SOC2, GDPR, HIPAA, PCI-DSS, ISO27001)

### Downstream
- `/fix` - Generates remediation for audit findings
- `/validate` - Uses audit results for compliance validation
- CI/CD pipelines - Quality gate enforcement

### External Tools
- CVE/NVD databases - Vulnerability references
- License databases - SPDX license identification
- Secret scanning tools (trufflehog patterns)
- SBOM generators (CycloneDX, SPDX)

---

## Command Boundaries

### Scope Definition
The `/audit` command focuses on **compliance verification and policy enforcement**. It validates adherence to security frameworks, regulatory requirements, and organizational policies with evidence-based findings.

### Primary Focus
- **Compliance verification**: SOC2, GDPR, HIPAA, PCI-DSS, ISO27001 framework alignment
- **Policy enforcement**: Security policies, access controls, data governance rules
- **Evidence-based findings**: Full OWASP audit with control mapping, CVSS scoring
- **Regulatory reporting**: Audit-ready documentation and attestation artifacts

### Relationship to Other Commands

| Command | Scope | Key Differentiator |
|---------|-------|-------------------|
| `/analyze` | Automated metrics and patterns | **Objective, tool-driven findings** - produces raw data |
| `/review` | AI-powered suggestions | **Subjective, improvement-focused** - interprets and suggests |
| `/audit` | Compliance verification | **Policy-driven, evidence-based** - validates against standards |

### Boundary Rules
1. `/audit` **validates against standards**, `/analyze` **detects patterns**
2. `/audit` produces compliance reports with attestation, `/analyze` produces metrics
3. Security in `/audit:security` maps to OWASP/CWE/CVSS frameworks, in `/analyze:security` detects patterns
4. `/audit` is for regulatory/compliance, `/analyze` is for quality metrics

### When to Use /audit vs /analyze vs /review

| Scenario | Use This Command | Rationale |
|----------|------------------|-----------|
| "Are we SOC2 compliant?" | `/audit:compliance` | Policy verification |
| "Are we OWASP Top 10 compliant?" | `/audit:security` | Compliance mapping |
| "Any security vulnerabilities?" | `/analyze:security` | Pattern detection |
| "Check for secrets exposure" | `/audit:secrets` | Policy enforcement |
| "What's my code complexity?" | `/analyze:quality` | Objective metrics |
| "Is this PR ready to merge?" | `/review:pr` | Holistic assessment |
| "Review for PCI compliance" | `/audit:compliance` | Regulatory requirements |
| "License compliance check" | `/audit:licenses` | Legal/policy verification |

---

## Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Compliance framework complexity | High - Incomplete audits | Medium | Focus on core controls, allow framework customization |
| Secrets detection false positives | Medium - Alert fatigue | Medium | Implement entropy thresholds, allow whitelisting |
| Outdated CVE data | High - Missed vulnerabilities | Low | Use multiple data sources, version dependencies |
| License compliance ambiguity | Medium - Legal uncertainty | Medium | Flag ambiguous licenses for legal review |
| Audit scope creep | Medium - Timeouts | Medium | Clear scoping parameters, incremental audits |

---

## Phase 1: Core Command Setup

**Objective:** Establish base /audit command with YAML configuration and core prompt structure

**Tasks:**
- [ ] 1.1 Create `/audit` command file at `.claude/commands/audit.md`
- [ ] 1.2 Add YAML frontmatter with configuration:
  - name: audit
  - description: Comprehensive compliance, security, and quality auditing with evidence-based findings and remediation guidance
  - category: analysis-quality
  - model: sonnet
  - allowed-tools: Read, Glob, Grep, Bash
  - argument-hint: [audit-type | --full]
- [ ] 1.3 Write base command prompt with sections:
  - Your Task (audit type, scope, compliance framework)
  - Instructions (4-phase audit workflow)
  - Quality standards (evidence-based, framework-aligned)
  - Output format specifications
- [ ] 1.4 Define default parameters:
  - type: security | compliance | access | secrets | licenses | privacy | dependencies | infrastructure
  - scope: full | module | file
  - framework: OWASP | SOC2 | GDPR | HIPAA | PCI-DSS | ISO27001
  - severity-threshold: critical | high | medium | low | info
- [ ] 1.5 Create output directory structure: `docs/audits/`

**VERIFY Phase 1:**
- [ ] Base /audit command runs successfully, analyzes codebase, and produces structured findings

---

## Phase 2: Audit Workflow Implementation

**Objective:** Implement systematic audit workflow with evidence collection

**Tasks:**
- [ ] 2.1 Implement Audit Parameters phase:
  - Use AskUserQuestion to gather audit type, scope, framework
  - Identify compliance requirements
  - Determine severity thresholds
- [ ] 2.2 Implement Evidence Collection phase:
  - Scan code for security patterns
  - Search for configuration files
  - Identify sensitive data handling
  - Map authentication/authorization flows
- [ ] 2.3 Implement Analysis phase:
  - Apply framework-specific checks
  - Map findings to CWE/OWASP/CVE
  - Calculate CVSS scores where applicable
  - Assess exploitability and impact
- [ ] 2.4 Implement Reporting phase:
  - Generate executive summary
  - Produce detailed findings
  - Create remediation plan
  - Generate machine-readable JSON
- [ ] 2.5 Implement Risk Prioritization:
  - Rank findings by severity and exploitability
  - Identify quick wins vs complex fixes
  - Estimate remediation effort

**VERIFY Phase 2:**
- [ ] Audit workflow produces comprehensive, evidence-based findings

---

## Phase 3: Sub-Command Implementation (Security)

**Objective:** Create security-focused audit sub-commands

### 3.1 Security Audit Sub-Command

**Tasks:**
- [ ] 3.1.1 Create `/audit:security` command file
  - YAML: model: sonnet, argument-hint: <scope | --owasp | --cwe>
- [ ] 3.1.2 Implement OWASP Top 10 checks:
  - A01: Broken Access Control
  - A02: Cryptographic Failures
  - A03: Injection (SQL, Command, XSS)
  - A04: Insecure Design
  - A05: Security Misconfiguration
  - A06: Vulnerable Components
  - A07: Authentication Failures
  - A08: Data Integrity Failures
  - A09: Logging Failures
  - A10: SSRF
- [ ] 3.1.3 Implement CWE pattern detection:
  - CWE-89: SQL Injection
  - CWE-79: XSS
  - CWE-78: Command Injection
  - CWE-22: Path Traversal
  - CWE-352: CSRF
  - CWE-798: Hardcoded Credentials
- [ ] 3.1.4 Generate specialized artifacts:
  - `security-audit-report.md` (formal report)
  - `vulnerabilities.json` (machine-readable)
  - `security-remediation-plan.md` (prioritized fixes)

### 3.2 Secrets Audit Sub-Command

**Tasks:**
- [ ] 3.2.1 Create `/audit:secrets` command file
  - YAML: model: sonnet, argument-hint: <path | --all>
- [ ] 3.2.2 Implement secret detection:
  - AWS credentials (AKIA*, access keys)
  - Azure credentials (subscription keys, connection strings)
  - GCP credentials (service accounts, API keys)
  - Database connection strings
  - API keys (Stripe, GitHub, Slack, etc.)
  - Private keys (SSH, PGP, TLS certificates)
  - High-entropy strings (potential secrets)
- [ ] 3.2.3 Implement secret management assessment:
  - Environment variable usage
  - Secret storage mechanisms
  - Key rotation practices
  - Access control for secrets
- [ ] 3.2.4 Generate specialized artifacts:
  - `secrets-audit-report.md`
  - `exposed-secrets.json` (SENSITIVE - exclude from commits)
  - `secret-management-assessment.md`
  - `secret-remediation.md`

### 3.3 Dependencies Audit Sub-Command

**Tasks:**
- [ ] 3.3.1 Create `/audit:dependencies` command file
  - YAML: model: sonnet, argument-hint: <package-manager | --all>
- [ ] 3.3.2 Implement vulnerability scanning:
  - Parse package.json, package-lock.json
  - Parse requirements.txt, Pipfile.lock
  - Check against known CVE databases
  - Identify outdated packages
- [ ] 3.3.3 Implement supply chain assessment:
  - Maintainer reputation
  - Package age and activity
  - Download statistics
  - Typosquatting detection
- [ ] 3.3.4 Generate specialized artifacts:
  - `dependency-audit-report.md`
  - `vulnerabilities.json`
  - `dependency-health.md`
  - `update-plan.md`

**VERIFY Phase 3:**
- [ ] Security audit sub-commands detect vulnerabilities with evidence

---

## Phase 4: Sub-Command Implementation (Compliance)

**Objective:** Create compliance-focused audit sub-commands

### 4.1 Compliance Audit Sub-Command

**Tasks:**
- [ ] 4.1.1 Create `/audit:compliance` command file
  - YAML: model: sonnet, argument-hint: <framework: soc2|gdpr|hipaa|pci-dss|iso27001>
- [ ] 4.1.2 Implement SOC2 Type II checks:
  - CC1: Control Environment
  - CC2: Communication and Information
  - CC3: Risk Assessment
  - CC4: Monitoring Activities
  - CC5: Control Activities
  - CC6: Logical and Physical Access
  - CC7: System Operations
  - CC8: Change Management
  - CC9: Risk Mitigation
- [ ] 4.1.3 Implement GDPR checks:
  - Data minimization
  - Purpose limitation
  - Storage limitation
  - Consent management
  - Data subject rights
  - Privacy by design
- [ ] 4.1.4 Implement HIPAA checks:
  - Administrative safeguards
  - Physical safeguards
  - Technical safeguards
  - PHI handling
- [ ] 4.1.5 Implement PCI-DSS checks:
  - Cardholder data protection
  - Access control measures
  - Network security
  - Encryption requirements
- [ ] 4.1.6 Generate specialized artifacts:
  - `compliance-audit-report.md`
  - `compliance-checklist.md`
  - `control-mapping.json`
  - `compliance-gaps.md`

### 4.2 Access Control Audit Sub-Command

**Tasks:**
- [ ] 4.2.1 Create `/audit:access` command file
  - YAML: model: sonnet, argument-hint: <--rbac | --abac | --all>
- [ ] 4.2.2 Implement access control analysis:
  - RBAC policy review
  - ABAC attribute mapping
  - Permission matrix generation
  - Least privilege verification
- [ ] 4.2.3 Implement privilege escalation detection:
  - Admin bypass patterns
  - Implicit permissions
  - Missing authorization checks
  - Cross-tenant access
- [ ] 4.2.4 Generate specialized artifacts:
  - `access-audit-report.md`
  - `permission-matrix.md`
  - `access-violations.json`
  - `access-remediation.md`

### 4.3 Privacy Audit Sub-Command

**Tasks:**
- [ ] 4.3.1 Create `/audit:privacy` command file
  - YAML: model: sonnet, argument-hint: <--pii | --phi | --all>
- [ ] 4.3.2 Implement PII/PHI detection:
  - Personal identifiers (name, email, SSN)
  - Health information (PHI)
  - Financial data
  - Location data
  - Biometric data
- [ ] 4.3.3 Implement privacy control assessment:
  - Data flow mapping
  - Encryption at rest/transit
  - Access logging
  - Retention policies
  - Anonymization techniques
- [ ] 4.3.4 Generate specialized artifacts:
  - `privacy-audit-report.md`
  - `pii-inventory.json`
  - `privacy-controls.md`
  - `data-flow-map.md`

**VERIFY Phase 4:**
- [ ] Compliance audit sub-commands verify framework adherence with evidence

---

## Phase 5: Sub-Command Implementation (Infrastructure)

**Objective:** Create infrastructure-focused audit sub-commands

### 5.1 Infrastructure Audit Sub-Command

**Tasks:**
- [ ] 5.1.1 Create `/audit:infrastructure` command file
  - YAML: model: sonnet, argument-hint: <--iac | --containers | --cloud>
- [ ] 5.1.2 Implement IaC security scanning:
  - Terraform misconfigurations
  - CloudFormation vulnerabilities
  - Kubernetes YAML issues
  - Docker security best practices
- [ ] 5.1.3 Implement container security:
  - Base image vulnerabilities
  - Privileged containers
  - Secret exposure in images
  - Network policies
- [ ] 5.1.4 Implement cloud configuration:
  - Public S3 buckets
  - Open security groups
  - IAM misconfigurations
  - Encryption settings
- [ ] 5.1.5 Generate specialized artifacts:
  - `infrastructure-audit-report.md`
  - `iac-violations.json`
  - `container-security.md`
  - `infrastructure-remediation.md`

### 5.2 License Audit Sub-Command

**Tasks:**
- [ ] 5.2.1 Create `/audit:licenses` command file
  - YAML: model: sonnet, argument-hint: <--sbom | --attribution>
- [ ] 5.2.2 Implement license detection:
  - Direct dependency licenses
  - Transitive dependency licenses
  - License type classification (permissive, copyleft, proprietary)
  - License compatibility analysis
- [ ] 5.2.3 Implement compliance verification:
  - License obligation tracking
  - Attribution requirements
  - Source disclosure requirements
  - Commercial use restrictions
- [ ] 5.2.4 Generate specialized artifacts:
  - `license-audit-report.md`
  - `license-inventory.json`
  - `license-violations.md`
  - `attribution.md`
  - `sbom.json` (SPDX/CycloneDX format)

**VERIFY Phase 5:**
- [ ] Infrastructure audit sub-commands assess IaC, containers, and licenses

---

## Phase 6: Artifact Schemas & Quality Standards

**Objective:** Implement structured artifact generation with quality validation

### 6.1 Report Artifacts

**Tasks:**
- [ ] 6.1.1 Implement security-audit-report.md schema:
  - YAML frontmatter:
    - artifact_type: security-audit-report
    - command: audit:security
    - timestamp: ISO-8601
    - status: passed | failed | warnings
  - Sections: Executive Summary, Findings Summary, Detailed Findings, Remediation Plan
- [ ] 6.1.2 Implement compliance-audit-report.md schema:
  - Control-by-control assessment
  - Evidence references
  - Gap analysis
  - Remediation timeline
- [ ] 6.1.3 Implement vulnerability JSON schema:
  - Finding ID, severity, CVSS score
  - CWE/CVE/OWASP references
  - Location (file, line, column)
  - Evidence and reproduction steps
  - Remediation with code examples

### 6.2 Severity Standards

**Tasks:**
- [ ] 6.2.1 Implement severity classification:
  - critical: Immediate security/functionality risk, block merge/deploy
  - high: Significant issue, fix in current sprint
  - medium: Notable issue, plan for next sprint
  - low: Minor issue, backlog
  - info: Suggestion, optional enhancement
- [ ] 6.2.2 Implement CVSS scoring:
  - Attack vector (Network, Adjacent, Local, Physical)
  - Attack complexity (low, high)
  - Privileges required (none, low, high)
  - User interaction (None, Required)
  - Impact (Confidentiality, Integrity, Availability)

### 6.3 Evidence Standards

**Tasks:**
- [ ] 6.3.1 Require evidence for all findings:
  - File path and line numbers
  - Code snippets showing vulnerability
  - Reproduction steps where applicable
  - External references (CVE, CWE, OWASP)
- [ ] 6.3.2 Implement source citations:
  - Link to framework documentation
  - Reference specific control requirements
  - Include version information

**VERIFY Phase 6:**
- [ ] Artifacts meet quality standards with proper evidence and severity

---

## Phase 7: Remediation Guidance

**Objective:** Provide actionable remediation for all findings

### 7.1 Remediation Plan Generation

**Tasks:**
- [ ] 7.1.1 Implement prioritized remediation:
  - Order by severity and exploitability
  - Group related findings
  - Identify quick wins
  - Estimate effort for each fix
- [ ] 7.1.2 Provide code examples:
  - Before/after code snippets
  - Secure implementation patterns
  - Library recommendations
- [ ] 7.1.3 Include prevention guidance:
  - Linting rules to add
  - Pre-commit hooks
  - CI/CD checks
  - Training recommendations

### 7.2 Automated Fix Suggestions

**Tasks:**
- [ ] 7.2.1 Integrate with /fix command:
  - Generate fix tasks from findings
  - Provide /fix invocation commands
  - Track fix status
- [ ] 7.2.2 Support bulk remediation:
  - Group similar issues
  - Provide batch fix scripts
  - Validate fixes don't introduce regressions

**VERIFY Phase 7:**
- [ ] Remediation guidance is actionable and includes code examples

---

## Phase 8: Audit Cadence & Automation

**Objective:** Support recurring audits and CI/CD integration

### 8.1 Recommended Cadence

**Tasks:**
- [ ] 8.1.1 Document audit frequency:
  - audit:security: Quarterly + pre-release
  - audit:compliance: Annually + pre-certification
  - audit:secrets: Weekly (automated)
  - audit:dependencies: Weekly (automated)
  - audit:licenses: Monthly
- [ ] 8.1.2 Define trigger events:
  - Major code changes
  - New dependencies
  - Framework updates
  - Pre-deployment

### 8.2 CI/CD Integration

**Tasks:**
- [ ] 8.2.1 Generate CI/CD snippets:
  - GitHub Actions workflow
  - GitLab CI configuration
  - Jenkins pipeline
- [ ] 8.2.2 Support quality gates:
  - Fail on critical findings
  - Warn on high findings
  - Track metrics over time
- [ ] 8.2.3 Produce machine-readable output:
  - SARIF format for GitHub
  - JUnit XML for CI systems
  - JSON for custom integrations

**VERIFY Phase 8:**
- [ ] Audit can run in CI/CD with appropriate quality gates

---

## Phase 9: Testing & Validation

**Objective:** Comprehensive testing of audit accuracy and coverage

### 9.1 Sub-Command Testing

**Tasks:**
- [ ] 9.1.1 Test /audit:security:
  - Test with known vulnerable code patterns
  - Verify OWASP Top 10 detection
  - Check CWE mapping accuracy
- [ ] 9.1.2 Test /audit:compliance:
  - Test with SOC2 control requirements
  - Test with GDPR data patterns
  - Verify control mapping
- [ ] 9.1.3 Test /audit:secrets:
  - Test with various credential formats
  - Verify no false positives on non-secrets
  - Check detection rate

### 9.2 Accuracy Testing

**Tasks:**
- [ ] 9.2.1 Test false positive rate (target <10%)
- [ ] 9.2.2 Test false negative rate (target <5% for critical)
- [ ] 9.2.3 Verify severity classifications
- [ ] 9.2.4 Validate remediation accuracy

### 9.3 Coverage Testing

**Tasks:**
- [ ] 9.3.1 Test framework coverage (OWASP, SOC2, etc.)
- [ ] 9.3.2 Test language coverage (JS, TS, Python, Go)
- [ ] 9.3.3 Test IaC coverage (Terraform, K8s, Docker)

### 9.4 Edge Cases

**Tasks:**
- [ ] 9.4.1 Test with clean codebase (no findings)
- [ ] 9.4.2 Test with heavily vulnerable codebase
- [ ] 9.4.3 Test with mixed language project
- [ ] 9.4.4 Test with large monorepo

**VERIFY Phase 9:**
- [ ] All test cases pass, audit accuracy meets targets

---

## Phase 10: Documentation & Polish

**Objective:** Create comprehensive documentation and refine user experience

**Tasks:**
- [ ] 10.1 Create command documentation:
  - Usage examples for each sub-command
  - Framework selection guidance
  - Severity interpretation
  - Remediation workflow
- [ ] 10.2 Document audit methodology:
  - How findings are detected
  - How severity is calculated
  - How evidence is gathered
  - Limitations and caveats
- [ ] 10.3 Create user guides:
  - "Preparing for SOC2 audit"
  - "Security assessment best practices"
  - "Dependency management guide"
  - "License compliance workflow"
- [ ] 10.4 Add inline help:
  - Argument hints in YAML frontmatter
  - Error messages with suggestions
  - Progress indicators during scanning
- [ ] 10.5 Polish output formatting:
  - Executive summary formatting
  - Finding detail cards
  - Remediation code blocks
  - Visual severity indicators
- [ ] 10.6 Create example outputs:
  - Example security audit report
  - Example compliance checklist
  - Example SBOM

**VERIFY Phase 10:**
- [ ] Documentation is complete, clear, and helpful; output quality is polished

---

## Success Criteria

### Functional Requirements
- [ ] Base /audit command performs security scan and generates security-audit-report.md
- [ ] All 8 sub-commands (security, compliance, access, secrets, licenses, privacy, dependencies, infrastructure) work correctly
- [ ] All findings include evidence and remediation guidance
- [ ] Machine-readable JSON output for automation
- [ ] Support for major compliance frameworks (OWASP, SOC2, GDPR, HIPAA, PCI-DSS)

### Quality Requirements
- [ ] Evidence-based findings with file:line references
- [ ] CVSS scoring for security findings
- [ ] CWE/CVE/OWASP mapping where applicable
- [ ] Actionable remediation with code examples
- [ ] Risk-prioritized output

### Accuracy Requirements
- [ ] False positive rate <10%
- [ ] False negative rate <5% for critical findings
- [ ] Correct severity classification
- [ ] Accurate framework mapping

### Usability Requirements
- [ ] Clear progress indicators during scanning
- [ ] Helpful error messages for edge cases
- [ ] Executive summary for stakeholders
- [ ] Technical detail for developers

### Integration Requirements
- [ ] CI/CD integration support (SARIF, JUnit)
- [ ] Quality gate configuration
- [ ] Integration with /fix command for remediation
- [ ] Machine-readable output for automation

### Testing Requirements
- [ ] All sub-commands tested with representative codebases
- [ ] Accuracy validated against known vulnerabilities
- [ ] Edge cases handled gracefully
- [ ] Framework coverage validated
