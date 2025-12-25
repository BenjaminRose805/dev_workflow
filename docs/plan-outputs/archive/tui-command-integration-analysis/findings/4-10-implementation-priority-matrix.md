# Success Criteria 4.10: Implementation Priority Matrix Created

## Status: COMPLETE

This document provides the implementation priority matrix for TUI-Command integration.

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

| Level | Definition | Estimate |
|-------|------------|----------|
| **XS** | Trivial change | < 2 hours |
| **S** | Small feature | 2-8 hours |
| **M** | Medium feature | 1-3 days |
| **L** | Large feature | 3-7 days |
| **XL** | Major subsystem | 1-2 weeks |

---

## Priority Matrix Quadrants

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

## All Features Ranked

### Quadrant 1: High Impact, Low Effort (DO FIRST)

| ID | Feature | Gap | Impact | Effort | Score |
|----|---------|-----|--------|--------|-------|
| P1 | Phase Progress Bars | G1 | HIGH | XS | 10 |
| P3 | Retry History Indicator | G3 | HIGH | XS | 10 |
| P2 | Upcoming Tasks Panel | G5 | HIGH | S | 9 |
| P4 | Inline Blockers Display | B1 partial | HIGH | S | 9 |
| P5 | Run History Panel | E5 | MEDIUM | S | 7 |
| P15 | Panel Toggle Keys | Enhancement | MEDIUM | XS | 6 |

**Implementation Note:** These are quick wins that demonstrate immediate value with minimal effort.

---

### Quadrant 2: High Impact, High Effort (PLAN CAREFULLY)

| ID | Feature | Gap | Impact | Effort | Score |
|----|---------|-----|--------|--------|-------|
| P6 | Keyboard Handler | B4 | CRITICAL | M | 8 |
| P7 | Task Navigation | B4 | CRITICAL | M | 8 |
| P8 | Command Palette | G8, B3 | HIGH | L | 7 |
| P11 | Task Picker Modal | B3 | HIGH | M | 7 |
| P9 | Dependency Graph | B1 | HIGH | L | 6 |
| P10 | Parallel Agent Tracking | B2 | HIGH | L | 6 |

**Implementation Note:** These are foundation features that enable everything else. Requires careful planning.

---

### Quadrant 3: Low Impact, Low Effort (FILL IN)

| ID | Feature | Gap | Impact | Effort | Score |
|----|---------|-----|--------|--------|-------|
| P12 | Help Overlay | Enhancement | LOW | XS | 5 |
| P13 | Validation Display | E2 | LOW | XS | 4 |
| P14 | Sync Check Display | E1 | LOW | XS | 4 |

**Implementation Note:** Easy additions during development. Include opportunistically.

---

### Quadrant 4: Low Impact, High Effort (DEPRIORITIZE)

| ID | Feature | Gap | Impact | Effort | Score |
|----|---------|-----|--------|--------|-------|
| P18 | Task Execution Timeline | E6 | MEDIUM | L | 4 |
| P17 | Activity Persistence | E3, E4 | LOW | M | 3 |
| P19 | Full Graph Layout Algorithm | B1 | MEDIUM | XL | 3 |
| P16 | Nested Workflow Support | G10 | LOW | XL | 2 |

**Implementation Note:** Defer until core features are stable.

---

## Implementation Phases

### Phase A: Foundation (1 week)

**Goal:** Enable keyboard-driven TUI interaction

| Order | Feature | ID | Effort | Dependencies |
|-------|---------|-----|--------|--------------|
| A.1 | Keyboard Handler | P6 | M | None |
| A.2 | Task Navigation | P7 | M | P6 |
| A.3 | Help Overlay | P12 | XS | P6 |

**Deliverable:** Users can navigate TUI with keyboard

---

### Phase B: Quick Wins (3 days)

**Goal:** Add high-value, low-effort panels

| Order | Feature | ID | Effort | Dependencies |
|-------|---------|-----|--------|--------------|
| B.1 | Phase Progress Bars | P1 | XS | None |
| B.2 | Upcoming Tasks Panel | P2 | S | None |
| B.3 | Retry History Indicator | P3 | XS | None |
| B.4 | Inline Blockers Display | P4 | S | None |
| B.5 | Run History Panel | P5 | S | None |
| B.6 | Panel Toggle Keys | P15 | XS | P6 |

**Deliverable:** TUI shows much more useful information

---

### Phase C: Command Integration (1 week)

**Goal:** Enable slash command execution from TUI

| Order | Feature | ID | Effort | Dependencies |
|-------|---------|-----|--------|--------------|
| C.1 | Command Palette | P8 | L | P6 |
| C.2 | Task Picker Modal | P11 | M | P6 |
| C.3 | Task Action Keys | - | M | P8 |

**Deliverable:** Users can run /plan:* commands without leaving TUI

---

### Phase D: Advanced Visualization (1-2 weeks)

**Goal:** Rich workflow visualization

| Order | Feature | ID | Effort | Dependencies |
|-------|---------|-----|--------|--------------|
| D.1 | Dependency Graph (simple) | P9 | L | P4 |
| D.2 | Parallel Agent Tracking | P10 | L | None |
| D.3 | Subtask Tree View | G6 | M | None |
| D.4 | Findings Browser Modal | G2 | M | P6 |
| D.5 | Artifact Browser | G7 | M | None |

**Deliverable:** Complete workflow visibility

---

### Phase E: Polish & Future (Varies)

**Goal:** Production quality

| Order | Feature | ID | Effort | Dependencies |
|-------|---------|-----|--------|--------------|
| E.1 | Search Mode | Enhancement | M | P6 |
| E.2 | Activity Persistence | P17 | M | None |
| E.3 | Task Execution Timeline | P18 | L | None |
| E.4 | Nested Workflow Support | P16 | XL | Many |
| E.5 | Full Graph Algorithm | P19 | XL | P9 |

**Deliverable:** Production-quality TUI

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

## Resource Estimates

### Minimum Viable Enhancement (Phases A+B)

| Metric | Value |
|--------|-------|
| Effort | ~1.5 weeks |
| Features | Keyboard nav + all quick wins |
| Value Delivered | 60% |

### Full Command Integration (Phases A+B+C)

| Metric | Value |
|--------|-------|
| Effort | ~2.5 weeks |
| Features | Above + command palette |
| Value Delivered | 80% |

### Complete Visualization (All Phases)

| Metric | Value |
|--------|-------|
| Effort | ~5-6 weeks |
| Features | Everything |
| Value Delivered | 100% |

---

## Cumulative Value Chart

```
Phase   Features                    Effort     Cumulative Value
───────────────────────────────────────────────────────────────
  A     Keyboard foundation         1 week            30%
  B     Quick win panels            3 days            60%
  C     Command integration         1 week            80%
  D     Advanced viz                1-2 weeks         95%
  E     Polish                      Varies           100%
───────────────────────────────────────────────────────────────
```

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

### Week 1: Foundation + Quick Wins

1. **Day 1-2:** Implement KeyboardHandler with threading
2. **Day 2-3:** Add navigation (j/k, Tab, arrows)
3. **Day 3-4:** Add selection state, phase progress bars
4. **Day 4-5:** Add upcoming panel, retry indicators
5. **Day 5:** Add help overlay, test integration

### Week 2: Command Integration

1. **Day 1-2:** Implement command palette modal
2. **Day 3:** Add task picker
3. **Day 4-5:** Add task action keys, stream output

**This provides maximum value with manageable complexity.**

---

## Priority Summary Table

| Rank | ID | Feature | Impact | Effort | Phase |
|------|-----|---------|--------|--------|-------|
| 1 | P1 | Phase Progress Bars | HIGH | XS | B |
| 2 | P3 | Retry History | HIGH | XS | B |
| 3 | P2 | Upcoming Tasks | HIGH | S | B |
| 4 | P4 | Inline Blockers | HIGH | S | B |
| 5 | P5 | Run History | MEDIUM | S | B |
| 6 | P6 | Keyboard Handler | CRITICAL | M | A |
| 7 | P7 | Task Navigation | CRITICAL | M | A |
| 8 | P15 | Panel Toggles | MEDIUM | XS | B |
| 9 | P12 | Help Overlay | LOW | XS | A |
| 10 | P8 | Command Palette | HIGH | L | C |
| 11 | P11 | Task Picker | HIGH | M | C |
| 12 | P9 | Dependency Graph | HIGH | L | D |
| 13 | P10 | Agent Tracking | HIGH | L | D |
| 14 | P13 | Validation Display | LOW | XS | E |
| 15 | P14 | Sync Check | LOW | XS | E |
| 16 | P17 | Activity Persistence | LOW | M | E |
| 17 | P18 | Task Timeline | MEDIUM | L | E |
| 18 | P19 | Full Graph | MEDIUM | XL | E |
| 19 | P16 | Nested Workflows | LOW | XL | E |

---

## Verification

- [x] All features ranked by impact and effort
- [x] Priority matrix quadrants defined
- [x] Implementation phases created
- [x] Dependencies mapped
- [x] Resource estimates provided
- [x] Cumulative value chart created
- [x] Risk assessment included
- [x] Recommended starting point defined

**Implementation priority matrix is complete.**
