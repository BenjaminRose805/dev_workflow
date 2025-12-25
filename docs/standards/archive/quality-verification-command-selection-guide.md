# Quality Verification Command Selection Guide

This guide helps users select the appropriate quality verification command for their needs.

## Command Overview

| Command | Focus | Runtime | Standards |
|---------|-------|---------|-----------|
| `/test` | Behavior verification | Executes code | Code correctness |
| `/validate` | Specification compliance | Static analysis | Project specs |
| `/analyze` | Code metrics & patterns | Static analysis | Quality metrics |
| `/audit` | Policy compliance | Static + policy | External standards |

## Quick Decision Matrix

### "I want to check..."

| Check | Command | Sub-Command |
|-------|---------|-------------|
| Code correctness | `/test` | test:run, test:unit |
| Type safety | `/validate` | validate:types |
| API spec validity | `/validate` | validate:schema |
| Build integrity | `/validate` | validate:build |
| Requirements coverage | `/validate` | validate:requirements |
| Test coverage | `/test` | test:coverage |
| Code complexity | `/analyze` | analyze:quality |
| Security vulnerabilities | `/analyze` | analyze:security |
| OWASP compliance | `/audit` | audit:security |
| SOC2 compliance | `/audit` | audit:compliance |
| License compliance | `/audit` | audit:licenses |
| Accessibility | `/validate` | validate:accessibility |

## Key Differentiators

### Runtime vs Static

| Command | Executes Code? | Analysis Type |
|---------|----------------|---------------|
| `/test` | Yes | Dynamic (runtime behavior) |
| `/validate` | No | Static (specification conformance) |
| `/analyze` | No | Static (metrics and patterns) |
| `/audit` | No | Static + Policy (compliance) |

### Internal vs External Standards

| Command | Standard Source | Examples |
|---------|-----------------|----------|
| `/test` | Test assertions | Unit tests, E2E tests |
| `/validate` | Project specifications | TypeScript types, JSON Schema, OpenAPI |
| `/analyze` | Quality metrics | Complexity thresholds, coverage targets |
| `/audit` | External frameworks | OWASP, SOC2, GDPR, PCI-DSS |

### Failure Modes

| Command | Failure Type | Example |
|---------|--------------|---------|
| `/test` | Test failure | "5 tests failed" |
| `/validate` | Validation error | "Type error at line 42" |
| `/analyze` | Threshold exceeded | "Complexity exceeds limit" |
| `/audit` | Compliance gap | "Missing SOC2 control AC-1" |

## Workflow Examples

### Pre-Commit Quality Gate

```
1. /validate:types     → Type check
2. /validate:build     → Build verification
3. /test:unit          → Run unit tests
4. /analyze:security   → Quick security scan
```

### Pre-Merge (PR) Quality Gate

```
1. /validate:types     → Full type check
2. /validate:schema    → API spec validation
3. /test:run           → Full test suite
4. /test:coverage      → Coverage analysis
5. /analyze:quality    → Quality metrics
```

### Pre-Release Quality Gate

```
1. /validate:requirements → Requirements traceability
2. /test:e2e              → End-to-end tests
3. /audit:security        → Security compliance
4. /audit:licenses        → License compliance
5. /audit:compliance      → Regulatory compliance
```

### Continuous Quality Monitoring

```
Daily:
- /test:run               → Test suite health
- /validate:build         → Build reproducibility

Weekly:
- /analyze:quality        → Quality trends
- /analyze:dependencies   → CVE scanning
- /audit:secrets          → Secrets exposure

Monthly:
- /audit:compliance       → Compliance status
- /test:mutation          → Test effectiveness
```

## Command Relationships

### Test ↔ Validate

| Relationship | Direction | Example |
|--------------|-----------|---------|
| Type safety enables testing | Validate → Test | validate:types passes → test:run safely |
| Schema validation informs tests | Validate → Test | validate:schema → test:contract |
| Test coverage validates requirements | Test → Validate | test:coverage → validate:requirements |

### Analyze ↔ Test/Validate

| Relationship | Direction | Example |
|--------------|-----------|---------|
| Metrics inform test priorities | Analyze → Test | High complexity → more unit tests |
| Coverage gaps guide testing | Analyze → Test | analyze:coverage → test:generate |
| Quality metrics set thresholds | Analyze → Validate | Complexity limits in validate |

### Audit ↔ Others

| Relationship | Direction | Example |
|--------------|-----------|---------|
| Compliance requires validation | Audit → Validate | SOC2 → validate:security |
| Compliance requires testing | Audit → Test | OWASP → test:security |
| Analysis feeds audit | Analyze → Audit | analyze:security → audit:security |

## Exit Codes

### /test Exit Codes
- `0`: All tests passed
- `1`: Some tests failed
- `2`: Test execution error

### /validate Exit Codes
- `0`: Validation passed
- `1`: Critical issues found
- `2`: Process error
- `3`: Threshold exceeded
- `10`: Warnings only

### /analyze Exit Codes
- `0`: Analysis complete (results in artifacts)
- `1`: Analysis error
- `2`: Threshold exceeded (optional)

### /audit Exit Codes
- `0`: Compliant
- `1`: Non-compliant (critical)
- `2`: Non-compliant (major)
- `3`: Partial compliance

## Summary Table

| Aspect | /test | /validate | /analyze | /audit |
|--------|-------|-----------|----------|--------|
| Purpose | Verify behavior | Check specs | Measure quality | Verify compliance |
| Runtime | Dynamic | Static | Static | Static |
| Standards | Assertions | Specs | Metrics | Frameworks |
| Output | Results | Report | Metrics | Compliance |
| Gate type | Pass/fail | Errors | Thresholds | Compliance |
| Artifacts | coverage.json | deviations.json | metrics.json | compliance.md |
