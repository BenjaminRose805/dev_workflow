# Sub-Command Naming Reference

## Standard Format

All sub-commands MUST use the colon notation format:

```
/command:subcommand
```

Examples:
- `/explore:quick` - Quick exploration mode
- `/analyze:security` - Security analysis
- `/review:pr` - Pull request review
- `/debug:performance` - Performance debugging

## Complete Sub-Command Listing

This document lists all sub-commands defined across the 37 implementation plans in `docs/plans/implement-*.md`.

### /analyze Command

| Sub-Command | Purpose |
|------------|---------|
| `/analyze:security` | Security vulnerability detection (OWASP Top 10, CWE patterns) |
| `/analyze:performance` | Performance bottleneck identification and algorithmic complexity analysis |
| `/analyze:quality` | Code quality metrics, complexity analysis, code smell detection |
| `/analyze:dependencies` | Dependency analysis, CVE detection, license compliance |
| `/analyze:architecture` | Architecture conformance, layer violations, SOLID principles |
| `/analyze:accessibility` | WCAG 2.1 compliance checking, ARIA usage validation |
| `/analyze:test` | Test quality assessment, coverage gap identification, flaky test detection |

### /architect Command

| Sub-Command | Purpose |
|------------|---------|
| `/architect:system` | System-level architecture design with C4 system context diagrams |
| `/architect:components` | Component-level architecture with C4 component diagrams |
| `/architect:data` | Data architecture design (storage, caching, message queues) |
| `/architect:deployment` | Deployment architecture (infrastructure, scaling, CI/CD) |
| `/architect:adr` | Architectural Decision Records (ADRs) creation |
| `/architect:security` | Security architecture design (authentication, authorization, encryption) |

### /audit Command

| Sub-Command | Purpose |
|------------|---------|
| `/audit:security` | Security posture audit with OWASP/CWE framework alignment |
| `/audit:secrets` | Credential exposure and secrets management audit |
| `/audit:dependencies` | Dependency security audit with CVE scanning |
| `/audit:compliance` | Regulatory compliance verification (GDPR, HIPAA, SOC2, PCI-DSS) |
| `/audit:access` | Access control and authorization audit |
| `/audit:privacy` | Privacy controls and data handling audit |
| `/audit:infrastructure` | Infrastructure security audit (containers, cloud config) |
| `/audit:licenses` | License compliance and obligation tracking |

### /brainstorm Command

| Sub-Command | Purpose |
|------------|---------|
| `/brainstorm:solutions` | Generate creative solution alternatives |
| `/brainstorm:architecture` | Explore architectural approaches and patterns |
| `/brainstorm:names` | Generate naming options for projects, features, variables |
| `/brainstorm:features` | Feature ideation and prioritization |
| `/brainstorm:apis` | API design alternatives and approaches |
| `/brainstorm:approaches` | Technical approach exploration for implementation |

### /debug Command

| Sub-Command | Purpose |
|------------|---------|
| `/debug:error` | Error and exception analysis with stack trace parsing |
| `/debug:performance` | Performance debugging with profiling and bottleneck identification |
| `/debug:behavior` | Unexpected behavior debugging with control flow analysis |
| `/debug:test` | Test failure debugging and flakiness detection |
| `/debug:memory` | Memory leak detection and object lifecycle analysis |
| `/debug:network` | Network/API debugging with request/response analysis |
| `/debug:concurrency` | Race condition and thread safety debugging |
| `/debug:data` | Data corruption debugging and data flow tracing |

### /deploy Command

| Sub-Command | Purpose |
|------------|---------|
| `/deploy:app` | Application deployment with pre-flight checks |
| `/deploy:preview` | Preview/staging environment deployment |
| `/deploy:promote` | Promote deployment from one environment to another |
| `/deploy:rollback` | Rollback deployment to previous version |
| `/deploy:verify` | Post-deployment verification and health checks |
| `/deploy:status` | Deployment status monitoring |
| `/deploy:config` | Configuration deployment and management |
| `/deploy:blue-green` | Blue-green deployment strategy |
| `/deploy:canary` | Canary deployment with gradual rollout |

### /design Command

| Sub-Command | Purpose |
|------------|---------|
| `/design:component` | Component-level design specification |
| `/design:api` | RESTful API design with endpoint specifications |
| `/design:ui` | User interface design and interaction patterns |
| `/design:data` | Data structure and schema design |
| `/design:state` | State management design |
| `/design:interactions` | User interaction flow design |

### /document Command

| Sub-Command | Purpose |
|------------|---------|
| `/document:api` | API reference documentation generation |
| `/document:user` | User-facing documentation (tutorials, guides) |
| `/document:developer` | Developer documentation (architecture, patterns) |
| `/document:architecture` | Architecture documentation with diagrams |
| `/document:changelog` | Changelog generation from commit history |
| `/document:inline` | Inline code documentation (JSDoc, docstrings) |
| `/document:diagrams` | Technical diagram generation |
| `/document:runbook` | Operational runbook creation |

### /explain Command

| Sub-Command | Purpose |
|------------|---------|
| `/explain:code` | Code explanation with context and examples |
| `/explain:architecture` | System architecture explanation |
| `/explain:pattern` | Design pattern explanation and usage |
| `/explain:decision` | Decision rationale and trade-offs explanation |
| `/explain:flow` | Data and control flow explanation |
| `/explain:api` | API contract and usage explanation |
| `/explain:diff` | Code diff explanation and change impact analysis |

### /explore Command

| Sub-Command | Purpose |
|------------|---------|
| `/explore:quick` | Quick exploration (30s, 5-10 key files, headers only) |
| `/explore:deep` | Deep exploration (comprehensive, full analysis) |
| `/explore:architecture` | Architecture and layer detection |
| `/explore:patterns` | Pattern and idiom identification |
| `/explore:dependencies` | Dependency graph and module analysis |
| `/explore:flow` | Data flow and request/response flow mapping |

### /fix Command

| Sub-Command | Purpose |
|------------|---------|
| `/fix:bug` | Bug fix generation with test coverage |
| `/fix:security` | Security vulnerability remediation |
| `/fix:performance` | Performance optimization with benchmarking |
| `/fix:test` | Test fix generation for failing tests |
| `/fix:data` | Data corruption and validation fixes |
| `/fix:lint` | Linting error fixes |
| `/fix:type-error` | Type error resolution |
| `/fix:dependency` | Dependency issue resolution |

### /implement Command

| Sub-Command | Purpose |
|------------|---------|
| `/implement:component` | Component implementation from specifications |
| `/implement:api` | API implementation from OpenAPI specifications |
| `/implement:schema` | Schema implementation with type generation |
| `/implement:data` | Data layer implementation (repositories, migrations) |
| `/implement:feature` | Feature implementation from requirements |
| `/implement:ui` | UI component implementation |
| `/implement:graphql` | GraphQL schema and resolver implementation |
| `/implement:events` | Event-driven architecture implementation |

### /migrate Command

| Sub-Command | Purpose |
|------------|---------|
| `/migrate:schema` | Database schema migration generation |
| `/migrate:api` | API version migration with breaking change detection |
| `/migrate:code` | Code migration for language/framework updates |
| `/migrate:config` | Configuration migration between formats |
| `/migrate:data` | Data migration with transformation |
| `/migrate:platform` | Platform migration (cloud provider, runtime) |
| `/migrate:env` | Environment variable migration |

### /model Command

| Sub-Command | Purpose |
|------------|---------|
| `/model:erd` | Entity-Relationship Diagram generation |
| `/model:schema` | Database schema design (PostgreSQL, MySQL, MongoDB) |
| `/model:domain` | Domain model creation |
| `/model:orm` | ORM configuration (Prisma, Drizzle, TypeORM) |
| `/model:migration` | Database migration script generation |
| `/model:normalize` | Database normalization analysis |
| `/model:validate` | Model validation and integrity checking |

### /refactor Command

| Sub-Command | Purpose |
|------------|---------|
| `/refactor:extract` | Extract method/component/module |
| `/refactor:rename` | Safe rename across codebase with import updates |
| `/refactor:patterns` | Apply design patterns to existing code |
| `/refactor:types` | Add/improve type safety |
| `/refactor:security` | Security-focused refactoring |
| `/refactor:performance` | Performance optimization refactoring |
| `/refactor:test` | Test quality improvement |
| `/refactor:organize` | Code organization and structure improvement |
| `/refactor:simplify` | Code simplification and complexity reduction |
| `/refactor:modernize` | Modernize code to current standards |

### /release Command

| Sub-Command | Purpose |
|------------|---------|
| `/release:prepare` | Release preparation with validation |
| `/release:notes` | Release notes generation |
| `/release:changelog` | Changelog generation and formatting |
| `/release:version` | Version number management (semantic versioning) |
| `/release:tag` | Git tag creation for releases |
| `/release:validate` | Release validation and quality gates |
| `/release:publish` | Package publishing to registries |
| `/release:rollback` | Release rollback procedures |
| `/release:schedule` | Release scheduling and planning |
| `/release:compare` | Release comparison and diff analysis |

### /research Command

| Sub-Command | Purpose |
|------------|---------|
| `/research:technology` | Technology comparison and evaluation |
| `/research:patterns` | Pattern and best practice research |
| `/research:security` | Security topic research (authentication, encryption) |
| `/research:performance` | Performance optimization research |

### /review Command

| Sub-Command | Purpose |
|------------|---------|
| `/review:pr` | Pull request review with bug/security/quality detection |
| `/review:diff` | Git diff review (staged/unstaged changes) |
| `/review:file` | Deep single-file analysis |
| `/review:commit` | Commit history and message quality review |
| `/review:standards` | Coding standards compliance review |
| `/review:security` | Security-focused code review |
| `/review:performance` | Performance-focused code review |

### /spec Command

| Sub-Command | Purpose |
|------------|---------|
| `/spec:api` | OpenAPI 3.1 specification generation |
| `/spec:schema` | JSON Schema specification creation |
| `/spec:graphql` | GraphQL SDL specification |
| `/spec:events` | AsyncAPI event specification |
| `/spec:data` | Data specification and contracts |

### /test Command

| Sub-Command | Purpose |
|------------|---------|
| `/test:unit` | Unit test generation |
| `/test:integration` | Integration test generation |
| `/test:e2e` | End-to-end test generation |
| `/test:plan` | Test plan creation |
| `/test:coverage` | Coverage analysis and gap identification |
| `/test:snapshot` | Snapshot test generation |
| `/test:contract` | Contract test generation (Pact) |
| `/test:run` | Test execution and reporting |
| `/test:fixture` | Test fixture and mock data generation |
| `/test:mutation` | Mutation testing |

### /validate Command

| Sub-Command | Purpose |
|------------|---------|
| `/validate:spec` | Specification validation (OpenAPI, AsyncAPI) |
| `/validate:schema` | Schema validation (JSON Schema, GraphQL) |
| `/validate:requirements` | Requirements traceability validation |
| `/validate:contracts` | API contract validation |
| `/validate:types` | Type checking and coverage validation |
| `/validate:build` | Build validation and dependency integrity |
| `/validate:accessibility` | Accessibility compliance validation (WCAG) |
| `/validate:security` | Security validation with vulnerability scanning |

### /workflow Command

| Sub-Command | Purpose |
|------------|---------|
| `/workflow:create` | Create workflow from template |
| `/workflow:run` | Execute workflow with branching/looping support |

## Naming Conventions

1. **Format**: Always use `/command:subcommand` with a colon separator
2. **Case**: Use lowercase for both command and sub-command
3. **Separators**: Use hyphens for multi-word sub-commands (e.g., `/deploy:blue-green`)
4. **Consistency**: Sub-command names should be consistent across related commands
   - Example: All commands use `security` (not `sec` or `security-scan`)
   - Example: All commands use `performance` (not `perf` or `performance-analysis`)

## Common Sub-Command Patterns

### Analysis-Related
- `security` - Security-focused analysis
- `performance` - Performance-focused analysis
- `quality` - Code quality analysis

### Workflow-Related
- `prepare` - Preparation phase
- `validate` - Validation phase
- `rollback` - Rollback/revert operation

### Depth/Scope-Related
- `quick` - Fast, surface-level analysis
- `deep` - Comprehensive, in-depth analysis

### Artifact Type-Related
- `api` - API-related operations
- `schema` - Schema-related operations
- `component` - Component-related operations

## Related Documentation

- Command implementation plans: `docs/plans/implement-*.md`
- Plan templates: `docs/plan-templates/`
- Standards: `docs/standards/`

---

Last Updated: 2025-12-23
Total Commands: 15
Total Sub-Commands: 193
