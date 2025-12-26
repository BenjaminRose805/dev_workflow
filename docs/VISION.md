# Dev Workflow Vision

## Philosophy

An AI-powered development command system that augments human judgment throughout the software lifecycle. Commands are tools, not prescriptions—use them when needed, not because a plan says to.

## Core Principle: Analyze → Implement → Verify

Instead of pre-defined implementation plans for every feature, follow this pattern:

```
1. ANALYZE    → Understand what's needed, explore options
2. IMPLEMENT  → Build it with appropriate tooling
3. VERIFY     → Confirm it works, meets requirements
```

Each cycle is self-contained. The system provides commands to support each phase, but you decide when and how to use them.

## Command Categories

### Discovery & Understanding
| Command | Purpose |
|---------|---------|
| `/clarify` | Interactive requirements gathering via Socratic questioning |
| `/explore` | Codebase analysis (quick/standard/deep) |
| `/research` | Technology, pattern, and security research |
| `/explain` | Educational explanations of code and architecture |

### Design & Architecture
| Command | Purpose |
|---------|---------|
| `/architect` | System-level design, C4 diagrams, ADRs |
| `/design` | Component-level design, interfaces, state machines |
| `/spec` | Formal specifications (OpenAPI, JSON Schema) |

### Quality & Analysis
| Command | Purpose |
|---------|---------|
| `/analyze` | Metrics-driven analysis (security, performance, quality) |
| `/review` | Subjective code review with suggestions |
| `/audit` | Compliance verification (OWASP, SOC2, GDPR) |
| `/validate` | Schema and specification conformance |
| `/test` | Test generation, execution, coverage |

### Implementation & Fixing
| Command | Purpose |
|---------|---------|
| `/implement` | Code generation guided by design |
| `/fix` | Bug fixing with regression tests |
| `/refactor` | Code improvement with impact analysis |
| `/debug` | Hypothesis-driven root cause analysis |

### Documentation & Operations
| Command | Purpose |
|---------|---------|
| `/document` | Generate docs (API, guides, changelogs) |
| `/deploy` | Deployment with health checks, rollback |
| `/release` | Release management and versioning |

## Workflow Examples

### Adding a Feature
```
/clarify        → What exactly do we need?
/explore        → Where does this fit in the codebase?
/design         → How should it be structured?
  ... implement ...
/test           → Generate tests
/review         → Check the implementation
/document       → Update docs
```

### Fixing a Bug
```
/debug          → Find root cause
/fix            → Apply fix with regression test
/test:run       → Verify fix works
/review:diff    → Review changes
```

### Understanding Code
```
/explore:quick  → Get overview
/explain        → Understand specific parts
```

### Performance Work
```
/analyze:performance  → Find bottlenecks
/debug:performance    → Investigate
  ... fix ...
/test:run            → Verify improvement
```

## Key Design Decisions

### 1. Commands Have Clear Boundaries
- `/analyze` produces metrics; `/review` interprets them
- `/validate` checks specs; `/test` runs code
- `/architect` designs systems; `/design` details components

### 2. Artifacts Flow Between Commands
Commands produce structured outputs that other commands can consume:
- `requirements.json` → `/architect` → `architecture.md` → `/design`
- `findings.json` → `/fix` → code changes → `/test`

### 3. Progressive Depth
Most commands support depth levels:
- **Quick** (30s-2min): Essential insights
- **Standard** (2-5min): Comprehensive
- **Deep** (5-30min): Exhaustive

### 4. On-Demand, Not Prescriptive
Don't pre-plan every command sequence. Use what you need when you need it. The system supports you; it doesn't constrain you.

## What This Replaces

Previously: 30+ detailed implementation plans (`implement-*.md`) pre-defining how to build each command.

Now: This vision document + on-demand analysis when ready to build a specific feature.

When you want to implement a command:
1. Read this vision to understand where it fits
2. Run an analysis to design the specific implementation
3. Implement and verify
4. Move on

The detailed plans served their purpose (defining scope and boundaries). They're archived in `docs/plans/archive/` for reference.

## Infrastructure

### Plan System
- `/plan:create` → Generate implementation plans
- `/plan:implement` → Execute tasks with status tracking
- `/plan:orchestrate` → Automated multi-session execution

### Hooks (Planned)
- Error recovery
- Artifact storage
- Context loading
- Notifications

### Git Workflow Integration

The plan system integrates deeply with git for branch isolation, commit tracking, and team collaboration.

**Branch Management:**
- `/plan:set` creates/switches to `plan/{plan-name}` branch
- `/plan:complete` merges back to main with configurable strategy
- `/plan:cleanup` removes stale branches with optional archiving

**Automatic Commits:**
- Each completed task creates a commit: `[plan-name] task {id}: {description}`
- Phase completion creates git tags: `plan/{plan-name}/phase-{N}`
- Archive tags preserve history before squash merges

**Remote Sync (Optional):**
- `sync_remote: true` enables automatic push after commits
- `--pr` flag creates GitHub pull requests from `/plan:complete`
- Phase tags can be pushed with `--push-tags`

**Configuration:**
All options in `.claude/git-workflow.json` with sensible defaults:
- `strategy`: `branch-per-plan` or `branch-per-phase`
- `merge_strategy`: `squash`, `commit`, or `ff`
- `enforce_branch`: Require correct plan branch (default: true)
- `auto_commit`: Commit after each task (default: true)

**Safety Features:**
- Pre-merge conflict detection with resolution options
- Uncommitted changes protection before switching plans
- Branch enforcement prevents accidental work on wrong branch

## Success Metrics

The system succeeds when:
- Developers reach for commands naturally during work
- Quality improves without slowing velocity
- Context switches between tasks are seamless
- Knowledge is captured automatically (docs, tests, artifacts)

## Next Steps

1. Implement core commands (P0: `/clarify`, `/explore`, `/analyze`, `/test`, `/fix`, `/debug`, `/deploy`)
2. Build infrastructure (hooks, artifact registry)
3. Add remaining commands based on need
4. Refine based on usage patterns

---

*This document captures the vision. Implementation details emerge through analyze → implement → verify cycles as each feature is built.*
