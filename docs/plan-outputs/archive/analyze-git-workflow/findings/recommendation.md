# Final Recommendation: Git Workflow for Plan Orchestration

## Executive Summary

After comprehensive analysis across 6 phases evaluating branching strategies, commit granularity, merge approaches, implementation touchpoints, and edge cases, the recommended git workflow for the plan orchestration system is:

**Branch-Per-Plan + Commit-Per-Task + Squash Merge (Hybrid A)**

**Overall Score:** 85/100 | **Recommended for:** 90% of plans

---

## Primary Recommendation

### The Hybrid A Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                    RECOMMENDED WORKFLOW                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  BRANCHING:    Branch-Per-Plan                              │
│  COMMITS:      Commit-Per-Task (automatic)                  │
│  MERGE:        Squash Merge (default)                       │
│  HISTORY:      Archive tags preserve granular history       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Why This Combination?

| Component | Score | Key Benefit |
|-----------|-------|-------------|
| Branch-Per-Plan | 90/100 | Complete isolation, zero-risk rollback |
| Commit-Per-Task | 83/100 | Granular checkpoints, surgical rollback |
| Squash Merge | 82/100 | Clean main history, simple plan rollback |
| **Combined** | **85/100** | Best balance of safety, clarity, simplicity |

### Core Workflow

1. **Plan Start:** `git checkout -b plan/{plan-name}`
2. **Task Execution:** Automatic commit after each task
3. **Plan Completion:** Archive tag → squash merge → delete branch
4. **Rollback:** Per-task during execution, per-plan after merge

---

## Scoring Summary

### Requirements Coverage

| Requirement | Priority | Coverage |
|-------------|----------|----------|
| Per-task rollback | CRITICAL | ✅ Full (on branch) |
| Per-phase rollback | HIGH | ✅ Good (via tags) |
| Per-plan rollback | CRITICAL | ✅ Full (delete/revert) |
| Clean main history | HIGH | ✅ Full (squash) |
| Granular debugging | HIGH | ✅ Good (archive tags) |
| Team PR workflow | HIGH | ✅ Full (1:1 mapping) |
| Solo simplicity | MEDIUM | ✅ Good |
| OSS contribution | MEDIUM | ✅ Good |
| Automation feasibility | CRITICAL | ✅ Full |

### Dimension Scores

| Dimension | Score | Assessment |
|-----------|-------|------------|
| Flexibility | 9/10 | Handles all scenarios |
| Simplicity | 8/10 | Clear mental model |
| Safety | 9/10 | Comprehensive protection |

---

## Alternatives

### Alternative A: Merge Commit (Audit-Heavy)

**Use When:** Regulatory compliance, intensive debugging

| Aspect | Primary | Alt A |
|--------|---------|-------|
| Main history | 1 commit/plan | All commits visible |
| Task rollback after merge | Via archive tag | Direct on main |
| Score | 85/100 | 83/100 |

**Command:** `/plan:complete --merge commit`

### Alternative B: Branch-Per-Phase (Heavy Verification)

**Use When:** Phase verification >10 min, failure rate >20%

| Aspect | Primary | Alt B |
|--------|---------|-------|
| Branch hierarchy | 2 levels | 3 levels |
| Phase isolation | Tags | Full branches |
| Score | 85/100 | 79/100 |

**Use for:** <10% of plans with expensive verification

### Alternative C: Simplified (Solo Experimental)

**Use When:** Solo developer, <5 task plans, rapid experimentation

| Aspect | Primary | Alt C |
|--------|---------|-------|
| Branching | Required | Optional |
| Commits | Enforced | Optional |
| Score | 85/100 | N/A |

---

## Implementation Roadmap

### Phase 1: Core Branching (1-2 weeks)
- Branch creation in `/plan:set`
- Commit enforcement in `/plan:implement`
- Branch validation utilities

### Phase 2: Automated Completion (1-2 weeks)
- `/plan:complete` command
- Archive tagging
- Merge strategy options

### Phase 3: Safety & Rollback (1-2 weeks)
- `/plan:rollback` command (task, phase, plan)
- `/plan:abandon` command
- Uncommitted changes handling

### Phase 4: Advanced Features (2-3 weeks)
- PR creation integration
- Remote sync
- Configuration system
- Cleanup utilities

**Total Effort:** 5-9 weeks

---

## Key Trade-offs Accepted

### Accepted
1. **Branch management overhead** - Mitigated by automation
2. **Archive tag management** - Automated cleanup after retention
3. **Task rollback after merge** - Available via archive tags

### Rejected
1. **Trunk-based development** - No rollback mechanism
2. **Commit-per-phase** - Loses task-level granularity
3. **Rebase workflow** - Unsafe for automation

---

## Decision Rationale

### Why Not Trunk-Based?

- Feature flags solve **runtime toggles**, not **version control rollback**
- Orchestrator needs to **undo code changes**, not toggle features
- 2-3 week infrastructure build for wrong problem

### Why Not Branch-Per-Phase?

- 80% more implementation effort
- 3-level hierarchy too complex for most plans
- Reserved for specialized scenarios only

### Why Squash Over Merge Commit?

- Clean main history (industry standard)
- Simple plan-level rollback
- Granular history preserved via archive tags
- Matches GitHub/GitLab "Squash and merge"

---

## Success Criteria

### MVP (Phase 1-2)
- [ ] Every task creates one commit
- [ ] Every plan executes on isolated branch
- [ ] Completed plans show as single commit on main
- [ ] Archive tags provide granular access

### Full Implementation (Phase 3-4)
- [ ] All rollback levels work (task, phase, plan)
- [ ] Zero data loss in any scenario
- [ ] PR workflow integrated
- [ ] Configuration system available

---

## Conclusion

The **Hybrid A workflow (Branch-Per-Plan + Commit-Per-Task + Squash Merge)** provides the optimal balance of:

1. **Safety:** Automatic checkpoints, comprehensive rollback
2. **Clarity:** Clean main history, organized branch structure
3. **Flexibility:** Works for solo, team, and OSS scenarios
4. **Simplicity:** Clear mental model, easy automation

This strategy resolves all identified pain points from Phase 0 analysis:
- ✅ Automatic commits (no lost work)
- ✅ Branch isolation (safe experimentation)
- ✅ Structured rollback (task, phase, plan levels)
- ✅ Clean history (professional main branch)

**Recommendation:** Proceed with implementation following the 4-phase roadmap outlined in Task 7.5.

---

## References

| Document | Description |
|----------|-------------|
| 7.1-strategy-scoring.md | Detailed scoring of all strategies |
| 7.2-decision-matrix.md | Flexibility vs simplicity vs safety analysis |
| 7.3-recommended-workflow.md | Full workflow documentation |
| 7.4-workflow-diagram.md | Visual diagrams and command reference |
| 7.5-implementation-plan.md | Phased implementation roadmap |
