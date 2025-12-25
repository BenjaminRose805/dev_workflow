# REMINDER - PLEASE MAKE SURE THAT THERE IS A GIT REPO ONLY WITH THE .CLAUDE/ DOCS/ SCRIPTS/ - IF THAT DOES NOT EXIST AND IS NOT IN USE, STOP EXECUTION

# Execution Strategy: Architecture Review Plan

## Dependency Analysis

```
Phase 1 (Discovery) ─────────────────────────────────────┐
    │                                                    │
    ▼                                                    │
Phase 2 (Gap Analysis) ◄─────────────────────────────────┤
    │                                                    │
    ├──────────┬──────────┬──────────┬──────────┐        │
    ▼          ▼          ▼          ▼          ▼        │
Phase 4    Phase 5    Phase 6    Phase 7    Phase 8      │
(Discovery (Design)   (Analysis) (Impl)    (Ops)        │
 Commands)                                               │
    │          │          │          │          │        │
    └──────────┴──────────┴──────────┴──────────┘        │
                          │                              │
    ┌─────────────────────┼─────────────────────┐        │
    ▼                     ▼                     ▼        │
Phase 3              Phase 9               Phase 10      │
(Features Review)    (Workflows)           (Agents/Hooks)│
    │                     │                     │        │
    └─────────────────────┴─────────────────────┘        │
                          │                              │
                          ▼                              │
                    Phase 11 (Roadmap) ◄─────────────────┘
                          │
                          ▼
                    Phase 12 (Final Review)
```

## Recommended Execution Strategy

### Wave 1: Foundation (Sequential)
Run in a single session:
- **Phase 1** → **Phase 2** (must be sequential)

### Wave 2: Parallel Deep Dives (5 parallel sessions)
After Wave 1 completes, launch these simultaneously:

| Session | Phases | Focus |
|---------|--------|-------|
| A | Phase 3 | Claude Code features research |
| B | Phase 4 + 5 | Discovery & Design commands |
| C | Phase 6 | Analysis & Quality commands |
| D | Phase 7 | Implementation & Documentation commands |
| E | Phase 8 + 9 | Operations commands + Workflow analysis |

### Wave 3: Integration (2 parallel sessions)
After Wave 2:

| Session | Phase | Focus |
|---------|-------|-------|
| F | Phase 10 | Agent & Hook design (needs command designs) |
| G | Phase 11 | Implementation roadmap (synthesizes all) |

### Wave 4: Finalization (Sequential)
- **Phase 12** - Final review (single session)

## Practical Commands

```bash
# Wave 1 - Start here
claude --resume  # or new session
# Run /plan:implement for Phase 1, then Phase 2

# Wave 2 - Open 5 terminals
# Terminal A:
claude "Execute Phase 3 of the architecture-review plan - Claude Code features review"

# Terminal B:
claude "Execute Phases 4 and 5 of the architecture-review plan - Discovery and Design commands"

# Terminal C:
claude "Execute Phase 6 of the architecture-review plan - Analysis and Quality commands"

# Terminal D:
claude "Execute Phase 7 of the architecture-review plan - Implementation and Documentation commands"

# Terminal E:
claude "Execute Phases 8 and 9 of the architecture-review plan - Operations commands and Workflow analysis"
```

## Key Considerations

1. **Shared context**: Each parallel session should read `findings/01-discovery.md` and `findings/02-gaps.md` before starting

2. **Artifact coordination**: All sessions write to the same `findings/` directory - file naming prevents conflicts

3. **Cross-pollination**: Phase 9 (workflows) benefits from seeing command designs emerge, so pairing it with Phase 8 lets it iterate

4. **Status tracking**: Run `/plan:status` periodically to see aggregate progress

## Alternative: Fully Sequential (Simpler)

If parallel coordination feels complex, run sequentially in one session:
- Phases 1-3 first (foundation + features research)
- Phases 4-8 (all command designs)
- Phases 9-10 (workflows + agents)
- Phases 11-12 (roadmap + review)

This takes longer but maintains full context in one session.

## Quick Reference

| Wave | Sessions | Phases | Prerequisites |
|------|----------|--------|---------------|
| 1 | 1 | 1, 2 | None |
| 2 | 5 | 3, 4-5, 6, 7, 8-9 | Wave 1 complete |
| 3 | 2 | 10, 11 | Wave 2 complete |
| 4 | 1 | 12 | Wave 3 complete |

**Total parallel sessions needed**: 5 (Wave 2)
**Critical path**: Phase 1 → 2 → (any command design) → 11 → 12
