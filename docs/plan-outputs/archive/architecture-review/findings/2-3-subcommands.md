# Task 2.3: Sub-command Pattern Analysis & Design

**Analysis Date:** 2025-12-20
**Context:** Proposed taxonomy requires sub-command structure for major categories

---

## Executive Summary

The proposed taxonomy introduces **7 primary action commands** that require sub-command structures. This document defines **50 sub-commands** across these commands, with inheritance patterns, shared parameters, and agent sharing strategies.

---

## Design Principles

1. **Consistent Grammar:** Use action:variant pattern (e.g., `/analyze:security`)
2. **Discoverability:** Similar commands get similar sub-commands
3. **Intuitive Naming:** Clear, unambiguous names
4. **Standard Flags:** Common flags work across all commands

---

## 1. /clarify - Requirements Gathering

| Sub-command | Purpose | Output | Priority |
|-------------|---------|--------|----------|
| clarify:requirements | Gather functional & non-functional requirements | requirements.md | P0 |
| clarify:scope | Define scope boundaries | scope.md | P0 |
| clarify:constraints | Identify constraints | constraints.md | P1 |
| clarify:acceptance | Define acceptance criteria | acceptance-criteria.md | P1 |
| clarify:stakeholders | Identify stakeholders | stakeholders.md | P2 |

**Common Parameters:** `--interactive`, `--template`, `--output`, `--format`

**Agent:** `clarify-agent` (shared across all variants)

---

## 2. /explore - Codebase Exploration

| Sub-command | Purpose | Output | Priority |
|-------------|---------|--------|----------|
| explore:architecture | Map system architecture | architecture-map.md | P0 |
| explore:dependencies | Trace dependency graph | dependencies.json | P0 |
| explore:patterns | Identify code patterns | patterns.md | P1 |
| explore:flows | Trace data/control flows | flows.md | P1 |
| explore:api | Document API surface | api-surface.md | P1 |
| explore:config | Analyze configuration | config-analysis.md | P2 |

**Common Parameters:** `--path`, `--depth`, `--output`, `--format`, `--exclude`

**Agent:** `exploration-agent` (for architecture, dependencies), `analysis-agent` (for patterns, flows)

---

## 3. /analyze - Code Analysis

| Sub-command | Purpose | Output | Priority |
|-------------|---------|--------|----------|
| analyze:security | Security vulnerability scan | security-report.md | P0 |
| analyze:performance | Performance bottleneck analysis | performance-report.md | P0 |
| analyze:quality | Code quality metrics | quality-report.md | P0 |
| analyze:architecture | Architecture compliance | architecture-report.md | P1 |
| analyze:complexity | Cyclomatic complexity | complexity-report.md | P1 |
| analyze:coverage | Test coverage gaps | coverage-report.md | P1 |
| analyze:dependencies | Dependency risk | dependency-report.md | P2 |
| analyze:accessibility | A11y compliance | a11y-report.md | P2 |

**Common Parameters:** `--path`, `--severity`, `--output`, `--format`, `--fix`, `--threshold`

**Agents:**
- `security-agent` (security)
- `performance-agent` (performance)
- `quality-agent` (quality, complexity)
- `test-agent` (coverage)

---

## 4. /test - Test Creation & Execution

| Sub-command | Purpose | Output | Priority |
|-------------|---------|--------|----------|
| test:unit | Create/run unit tests | unit-tests.md | P0 |
| test:integration | Create/run integration tests | integration-tests.md | P0 |
| test:e2e | Create/run end-to-end tests | e2e-tests.md | P0 |
| test:run | Run existing tests | test-results.json | P0 |
| test:watch | Run in watch mode | (terminal) | P1 |
| test:coverage | Generate coverage report | coverage-report.html | P1 |
| test:snapshot | Create snapshot tests | snapshot-tests.md | P2 |
| test:performance | Create benchmarks | benchmark-tests.md | P2 |

**Common Parameters:** `--path`, `--framework`, `--watch`, `--coverage`, `--output`, `--pattern`

**Agents:**
- `unit-test-agent` (unit, snapshot)
- `integration-test-agent` (integration)
- `e2e-test-agent` (e2e)
- `test-runner-agent` (run, watch, coverage)

---

## 5. /document - Documentation Generation

| Sub-command | Purpose | Output | Priority |
|-------------|---------|--------|----------|
| document:api | Generate API documentation | api-docs.md | P0 |
| document:user | Generate user guide | user-guide.md | P0 |
| document:developer | Developer documentation | dev-docs.md | P1 |
| document:architecture | Architecture docs | architecture.md | P1 |
| document:changelog | Changelog from commits | CHANGELOG.md | P1 |
| document:readme | Generate/update README | README.md | P1 |
| document:diagrams | Generate diagrams | diagrams/ | P2 |
| document:comments | Add code comments | (inline) | P2 |

**Common Parameters:** `--path`, `--output`, `--format`, `--template`, `--include-private`, `--diagrams`

**Agents:**
- `api-doc-agent` (api)
- `user-doc-agent` (user)
- `tech-doc-agent` (developer, architecture)
- `summary-agent` (changelog, readme)
- `visualization-agent` (diagrams)

---

## 6. /implement - Code Implementation

| Sub-command | Purpose | Output | Priority |
|-------------|---------|--------|----------|
| implement:feature | Implement new feature | Code files | P0 |
| implement:fix | Fix bug | Code changes | P0 |
| implement:refactor | Refactor code | Code changes | P0 |
| implement:api | Implement API | API code | P1 |
| implement:component | Implement UI component | Component files | P1 |
| implement:migration | Implement migration | Migration files | P1 |
| implement:scaffold | Generate boilerplate | Scaffolded files | P2 |
| implement:optimize | Performance optimization | Code changes | P2 |

**Common Parameters:** `--spec`, `--test-first`, `--dry-run`, `--output`, `--framework`, `--style-guide`

**Agents:**
- `feature-agent` (feature, component)
- `debug-agent` (fix)
- `quality-agent` (refactor, optimize)
- `api-agent` (api)
- `data-agent` (migration)
- `scaffold-agent` (scaffold)

---

## 7. /deploy - Deployment Operations

| Sub-command | Purpose | Output | Priority |
|-------------|---------|--------|----------|
| deploy:preview | Deploy to preview | Deployment log | P0 |
| deploy:staging | Deploy to staging | Deployment log | P0 |
| deploy:production | Deploy to production | Deployment log | P0 |
| deploy:rollback | Rollback deployment | Rollback log | P0 |
| deploy:status | Check deployment status | Status report | P1 |
| deploy:plan | Plan deployment (dry-run) | Deployment plan | P1 |
| deploy:canary | Canary deployment | Deployment log | P2 |
| deploy:blue-green | Blue-green deployment | Deployment log | P2 |

**Common Parameters:** `--environment`, `--version`, `--config`, `--dry-run`, `--skip-tests`, `--auto-approve`

**Agents:**
- `deploy-agent` (preview, staging, production)
- `rollback-agent` (rollback)
- `deploy-info-agent` (plan, status)
- `advanced-deploy-agent` (canary, blue-green)

---

## Cross-Cutting Patterns

### Standard Flags (All Commands)

```
--help, -h        # Show help
--verbose, -v     # Verbose output
--quiet, -q       # Minimal output
--json            # JSON output
--output DIR      # Output directory
--dry-run         # Preview without executing
--interactive, -i # Interactive mode
--yes, -y         # Auto-approve prompts
--config FILE     # Config file path
```

### Default Behavior

When called without sub-command, show available options:
```
$ /analyze
Available: security, performance, quality, architecture
Tip: /analyze:quality is most common. Run it now? [y/n]
```

### Short Aliases

| Full | Alias |
|------|-------|
| test:unit | test:u |
| test:integration | test:i |
| test:e2e | test:e |
| analyze:security | analyze:sec |
| document:api | doc:api |

---

## Priority Summary

- **P0 (MVP):** 21 sub-commands - Core workflow
- **P1 (High Value):** 17 sub-commands - Enhanced experience
- **P2 (Specialized):** 12 sub-commands - Advanced features

**Total: 50 sub-commands across 7 primary commands**
