# Task 3.5: Integration Priority Matrix

## Overview

This document prioritizes all identified TUI integration work items by impact and effort, creating an actionable implementation roadmap.

---

## Priority Framework

### Impact Levels

| Level | Definition | Criteria |
|-------|------------|----------|
| **CRITICAL** | Blocks TUI adoption | Without this, TUI cannot be primary interface |
| **HIGH** | Major UX improvement | Significantly improves productivity |
| **MEDIUM** | Notable improvement | Reduces friction, adds useful features |
| **LOW** | Nice to have | Polish, convenience, edge cases |

### Effort Levels

| Level | Definition | Time Estimate |
|-------|------------|---------------|
| **XS** | Trivial change | < 2 hours |
| **S** | Small feature | 2-8 hours |
| **M** | Medium feature | 1-3 days |
| **L** | Large feature | 3-7 days |
| **XL** | Major subsystem | 1-2 weeks |

---

## Priority Matrix

### Quadrant 1: High Impact, Low Effort (DO FIRST)

| ID | Feature | Gap | Impact | Effort | Priority Score |
|----|---------|-----|--------|--------|----------------|
| P1 | Phase Progress Bars | G1 | HIGH | XS | 10 |
| P2 | Upcoming Tasks Panel | G5 | HIGH | S | 9 |
| P3 | Retry History Indicator | G3 | HIGH | XS | 10 |
| P4 | Inline Blockers Display | B1 partial | HIGH | S | 9 |
| P5 | Run History Panel | E5 | MEDIUM | S | 7 |

**Quick wins that demonstrate immediate value.**

---

### Quadrant 2: High Impact, High Effort (PLAN CAREFULLY)

| ID | Feature | Gap | Impact | Effort | Priority Score |
|----|---------|-----|--------|--------|----------------|
| P6 | Keyboard Handler | B4 | CRITICAL | M | 8 |
| P7 | Task Navigation | B4 | CRITICAL | M | 8 |
| P8 | Command Palette | G8, B3 | HIGH | L | 7 |
| P9 | Dependency Graph | B1 | HIGH | L | 6 |
| P10 | Parallel Agent Tracking | B2 | HIGH | L | 6 |
| P11 | Task Picker Modal | B3 | HIGH | M | 7 |

**Foundation features that enable everything else.**

---

### Quadrant 3: Low Impact, Low Effort (FILL IN)

| ID | Feature | Gap | Impact | Effort | Priority Score |
|----|---------|-----|--------|--------|----------------|
| P12 | Help Overlay | Enhancement | LOW | XS | 5 |
| P13 | Validation Display | E2 | LOW | XS | 4 |
| P14 | Sync Check Display | E1 | LOW | XS | 4 |
| P15 | Panel Toggle Keys | Enhancement | MEDIUM | XS | 6 |

**Easy adds during development.**

---

### Quadrant 4: Low Impact, High Effort (DEPRIORITIZE)

| ID | Feature | Gap | Impact | Effort | Priority Score |
|----|---------|-----|--------|--------|----------------|
| P16 | Nested Workflow Support | G10 | LOW | XL | 2 |
| P17 | Activity Persistence | E3, E4 | LOW | M | 3 |
| P18 | Task Execution Timeline | E6 | MEDIUM | L | 4 |
| P19 | Full Graph Layout Algorithm | B1 | MEDIUM | XL | 3 |

**Defer until core features are stable.**

---

## Recommended Implementation Phases

### Phase A: Foundation (Effort: ~1 week)

Enable keyboard-driven TUI interaction.

| Order | Feature | ID | Effort | Dependencies |
|-------|---------|-----|--------|--------------|
| A.1 | Keyboard Handler | P6 | M | None |
| A.2 | Task Navigation | P7 | M | P6 |
| A.3 | Help Overlay | P12 | XS | P6 |

**Outcome:** Users can navigate TUI with keyboard.

---

### Phase B: Quick Wins (Effort: ~3 days)

Add high-value, low-effort panels.

| Order | Feature | ID | Effort | Dependencies |
|-------|---------|-----|--------|--------------|
| B.1 | Phase Progress Bars | P1 | XS | None |
| B.2 | Upcoming Tasks Panel | P2 | S | None |
| B.3 | Retry History Indicator | P3 | XS | None |
| B.4 | Inline Blockers Display | P4 | S | None |
| B.5 | Run History Panel | P5 | S | None |
| B.6 | Panel Toggle Keys | P15 | XS | P6 |

**Outcome:** TUI shows much more useful information.

---

### Phase C: Command Integration (Effort: ~1 week)

Enable slash command execution from TUI.

| Order | Feature | ID | Effort | Dependencies |
|-------|---------|-----|--------|--------------|
| C.1 | Command Palette | P8 | L | P6 |
| C.2 | Task Picker Modal | P11 | M | P6 |
| C.3 | Task Action Keys | Part of C.1 | M | P8 |

**Outcome:** Users can run /plan:* commands without leaving TUI.

---

### Phase D: Advanced Visualization (Effort: ~1-2 weeks)

Rich workflow visualization.

| Order | Feature | ID | Effort | Dependencies |
|-------|---------|-----|--------|--------------|
| D.1 | Dependency Graph (simple) | P9 | L | P4 |
| D.2 | Parallel Agent Tracking | P10 | L | None |
| D.3 | Subtask Tree View | G6 | M | None |
| D.4 | Findings Browser Modal | G2 | M | P6 |
| D.5 | Artifact Browser | G7 | M | None |

**Outcome:** Complete workflow visibility.

---

### Phase E: Polish & Future (Effort: Varies)

Lower priority items.

| Order | Feature | ID | Effort | Dependencies |
|-------|---------|-----|--------|--------------|
| E.1 | Search Mode | Enhancement | M | P6 |
| E.2 | Activity Persistence | P17 | M | None |
| E.3 | Task Execution Timeline | P18 | L | None |
| E.4 | Nested Workflow Support | P16 | XL | Many |
| E.5 | Full Graph Algorithm | P19 | XL | P9 |

**Outcome:** Production-quality TUI.

---

## Impact/Effort Visualization

```
                    EFFORT
           Low (XS/S)          High (M/L/XL)
        ┌────────────────────┬────────────────────┐
        │                    │                    │
 HIGH   │  P1  P2  P3        │  P6  P7  P8  P9   │
        │  P4  P5  P15       │  P10  P11         │
IMPACT  │                    │                    │
        │  [DO FIRST]        │  [PLAN CAREFULLY] │
        ├────────────────────┼────────────────────┤
        │                    │                    │
 LOW    │  P12  P13  P14     │  P16  P17  P18    │
        │                    │  P19              │
        │                    │                    │
        │  [FILL IN]         │  [DEPRIORITIZE]   │
        └────────────────────┴────────────────────┘
```

---

## Dependency Graph

```
P6 (Keyboard Handler)
 ├─► P7 (Task Navigation)
 ├─► P8 (Command Palette)
 │    └─► Task Action Keys
 ├─► P11 (Task Picker)
 ├─► P12 (Help Overlay)
 └─► P15 (Panel Toggles)

P4 (Inline Blockers)
 └─► P9 (Dependency Graph)
      └─► P19 (Full Graph)

P1-P5 (Quick Win Panels)
 └─► No dependencies (parallel)

P16 (Nested Workflows)
 └─► Requires: P9, P10, Artifact system
```

---

## Data Contract Dependencies

| Feature | Requires New/Enhanced Contract |
|---------|-------------------------------|
| P1 Phase Progress | PhasesResponse (existing) |
| P2 Upcoming Tasks | NextTasksResponse (enhanced) |
| P3 Retry Indicator | TasksResponse (enhanced) |
| P4 Inline Blockers | DependenciesResponse (new) |
| P5 Run History | RunsResponse (new) |
| P9 Dep Graph | DependenciesResponse (new) |
| P10 Agent Tracking | Real-time stream parsing |
| Findings Browser | FindingsResponse (new) |

**Contract Implementation Priority:**
1. Enhance TasksResponse (retryCount, blockedBy, canStart)
2. Create DependenciesResponse
3. Create FindingsResponse
4. Create RunsResponse
5. Enhance NextTasksResponse (parallelGroups)

---

## Resource Estimates

### Minimum Viable Enhancement (Phases A+B)

- **Effort:** ~1.5 weeks
- **Features:** Keyboard nav + all quick wins
- **Value:** 60% of total value

### Full Command Integration (Phases A+B+C)

- **Effort:** ~2.5 weeks
- **Features:** Above + command palette
- **Value:** 80% of total value

### Complete Visualization (All Phases)

- **Effort:** ~5-6 weeks
- **Features:** Everything
- **Value:** 100%

---

## Risk Assessment

| Feature | Risk | Mitigation |
|---------|------|------------|
| Keyboard Handler | Terminal compatibility | Test on Linux, Mac, WSL |
| Command Palette | Claude session management | Subprocess with PTY |
| Dependency Graph | Performance with large plans | Cache + lazy render |
| Parallel Agents | Stream parsing accuracy | Robust regex patterns |

---

## Recommended Starting Point

**Start with Phase A (Keyboard Foundation):**

1. Implement `KeyboardHandler` class with threading + stdin
2. Add basic navigation (j/k, arrows, Tab)
3. Add selection state to panels
4. Add help overlay (`?` key)

**Then Quick Wins (Phase B):**

5. Add phase progress bars (low effort, high visibility)
6. Add upcoming tasks panel
7. Add retry indicators to existing panels

**This provides maximum value with manageable complexity.**

---

## Summary

| Phase | Features | Effort | Cumulative Value |
|-------|----------|--------|------------------|
| A | Keyboard foundation | 1 week | 30% |
| B | Quick win panels | 3 days | 60% |
| C | Command integration | 1 week | 80% |
| D | Advanced viz | 1-2 weeks | 95% |
| E | Polish | Varies | 100% |

**Total implementation: ~5-6 weeks for complete TUI overhaul**

Priority order by ID: P1, P3, P2, P4, P5, P6, P7, P15, P12, P8, P11, P9, P10, others...
