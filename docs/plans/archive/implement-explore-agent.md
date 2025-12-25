# Implementation Plan: Explore Agent

## Overview

- **Goal:** Implement the Explore Agent for fast, read-only codebase exploration and understanding
- **Priority:** P0 (Core agent for codebase navigation and understanding)
- **Created:** 2025-12-22
- **Output:** `docs/plan-outputs/explore-agent/`
- **Model:** haiku (default for speed), sonnet for deep exploration mode
- **Category:** Agent Implementation

---

## Dependencies

### Upstream
- None (foundational agent)

### Downstream
- `/analyze` command (consumes exploration context)
- `/architect` command (uses codebase structure insights)
- `/document` command (uses codebase map)

### External Tools
- None

---

## Phase 1: Agent Configuration Setup

**Objective:** Create base Explore Agent configuration with proper YAML frontmatter and tool restrictions

**Tasks:**
- [ ] 1.1 Create `.claude/agents/explore.md` agent configuration file
- [ ] 1.2 Define agent metadata (name, description, version)
- [ ] 1.3 Configure model selection (haiku default, sonnet for deep mode)
- [ ] 1.4 Set up tool access restrictions (Read, Grep, Glob, Bash read-only)
- [ ] 1.5 Define exploration depth levels (quick, standard, deep)
- [ ] 1.6 Configure output artifact paths (exploration-report.md, codebase-map.json)

**VERIFY Phase 1:**
- [ ] Agent configuration file is valid Markdown with proper frontmatter
- [ ] Model selection logic supports both haiku and sonnet
- [ ] Tool restrictions enforce read-only operations
- [ ] All three exploration levels are properly defined

---

## Phase 2: System Prompt Design

**Objective:** Design specialized system prompt for exploration behavior and strategies

**Tasks:**
- [ ] 2.1 Create core system prompt for exploration behavior
- [ ] 2.2 Define exploration strategies (breadth-first vs depth-first)
- [ ] 2.3 Add prompts for specialized exploration modes:
  - Architecture exploration (structure, patterns, layers)
  - Pattern detection (design patterns, anti-patterns)
  - Dependency analysis (imports, exports, relationships)
  - Flow analysis (data flow, control flow)
- [ ] 2.4 Include read-only operation constraints in prompt
- [ ] 2.5 Add output format specifications (Markdown reports, JSON maps)
- [ ] 2.6 Define prompt variations for different depth levels

**VERIFY Phase 2:**
- [ ] System prompt clearly defines exploration objectives
- [ ] All specialized exploration modes are covered
- [ ] Read-only constraints are explicit and enforceable
- [ ] Output format requirements are well-specified

---

## Phase 3: Tool Restriction Implementation

**Objective:** Implement read-only tool restrictions to ensure safe exploration

**Tasks:**
- [ ] 3.1 Implement read-only Bash tool wrapper
- [ ] 3.2 Create tool access validation logic
- [ ] 3.3 Block write operations (Write, Edit, NotebookEdit)
- [ ] 3.4 Allow safe read operations (Read, Grep, Glob)
- [ ] 3.5 Implement Bash command filtering (allow ls, cat, find, grep; block rm, mv, etc.)
- [ ] 3.6 Add error handling for blocked operations
- [ ] 3.7 Create tool usage logging for debugging

**VERIFY Phase 3:**
- [ ] Write operations are blocked with clear error messages
- [ ] Read operations function normally
- [ ] Bash commands are properly filtered for safety
- [ ] Tool restrictions don't break legitimate exploration tasks

---

## Phase 4: Exploration Logic Implementation

**Objective:** Implement exploration modes at different depth levels

**Tasks:**
- [ ] 4.1 Implement quick exploration mode (surface-level scan)
  - Directory structure mapping
  - File count and type analysis
  - High-level architecture detection
- [ ] 4.2 Implement standard exploration mode (moderate depth)
  - Code organization analysis
  - Key file identification
  - Dependency mapping
- [ ] 4.3 Implement deep exploration mode (comprehensive analysis)
  - Detailed code analysis
  - Pattern and anti-pattern detection
  - Complete dependency graph
  - Architecture documentation
- [ ] 4.4 Create exploration state tracking
- [ ] 4.5 Implement progress reporting

**VERIFY Phase 4:**
- [ ] Each exploration mode produces appropriate level of detail
- [ ] Quick mode completes in < 30 seconds for medium codebases
- [ ] Standard mode provides actionable insights
- [ ] Deep mode produces comprehensive documentation

---

## Phase 5: Specialized Exploration Sub-Commands

**Objective:** Implement focused exploration sub-commands for specific analysis types

**Tasks:**
- [ ] 5.1 Implement `explore:architecture` sub-command
  - Layer detection (presentation, business, data)
  - Component identification
  - Architectural pattern recognition
- [ ] 5.2 Implement `explore:patterns` sub-command
  - Design pattern detection
  - Code smell identification
  - Best practice analysis
- [ ] 5.3 Implement `explore:dependencies` sub-command
  - Import/export mapping
  - Circular dependency detection
  - External dependency analysis
- [ ] 5.4 Implement `explore:flow` sub-command
  - Data flow tracing
  - Control flow analysis
  - Entry point identification

**VERIFY Phase 5:**
- [ ] Each sub-command produces focused, relevant output
- [ ] Architecture sub-command correctly identifies layers
- [ ] Pattern detection catches common patterns
- [ ] Dependency analysis is accurate and complete
- [ ] Flow analysis traces execution paths correctly

---

## Phase 6: Output Artifact Generation

**Objective:** Implement structured artifact generation for exploration outputs

**Tasks:**
- [ ] 6.1 Implement `exploration-report.md` generation
  - Executive summary section
  - Directory structure visualization
  - Key findings and insights
  - Recommendations section
  - Timestamp and metadata
- [ ] 6.2 Implement `codebase-map.json` generation
  - File tree structure
  - Dependency graph
  - Component metadata
  - Statistics and metrics
- [ ] 6.3 Create artifact storage strategy (.claude/artifacts/explore/)
- [ ] 6.4 Implement artifact versioning (timestamped outputs)
- [ ] 6.5 Add artifact cleanup policies (retain last N explorations)

**VERIFY Phase 6:**
- [ ] Exploration reports are well-formatted and readable
- [ ] Codebase maps are valid JSON with complete data
- [ ] Artifacts are stored in consistent locations
- [ ] Versioning prevents overwriting previous explorations
- [ ] Cleanup policies prevent artifact buildup

---

## Phase 7: Command Integration

**Objective:** Integrate Explore Agent with /explore command system

**Tasks:**
- [ ] 7.1 Create `/explore` command handler
- [ ] 7.2 Implement command argument parsing (depth level, target path)
- [ ] 7.3 Add sub-command routing (architecture, patterns, dependencies, flow)
- [ ] 7.4 Integrate agent invocation from command
- [ ] 7.5 Implement model selection based on depth:
  - haiku for quick and standard modes
  - sonnet for deep mode
- [ ] 7.6 Add progress indicators and status updates
- [ ] 7.7 Create command help text and usage examples

**VERIFY Phase 7:**
- [ ] `/explore` command executes successfully
- [ ] All sub-commands are accessible and functional
- [ ] Model selection works correctly for each depth level
- [ ] Help text provides clear usage guidance
- [ ] Command works from any directory in the codebase

---

## Phase 8: Proactive Invocation & Testing

**Objective:** Implement proactive invocation patterns and comprehensive testing

**Tasks:**
- [ ] 8.1 Define task patterns that trigger proactive exploration:
  - "Where is..." queries
  - "How does... work?" questions
  - "Show me the architecture" requests
  - New codebase onboarding scenarios
- [ ] 8.2 Implement pattern detection in main agent
- [ ] 8.3 Create automatic explore agent delegation
- [ ] 8.4 Build comprehensive test suite:
  - Test read-only enforcement
  - Test each exploration depth level
  - Test all sub-commands
  - Test artifact generation
  - Test model selection
- [ ] 8.5 Perform integration testing with real codebases
- [ ] 8.6 Create example outputs for documentation

**VERIFY Phase 8:**
- [ ] Proactive invocation triggers appropriately
- [ ] All tests pass successfully
- [ ] Read-only restrictions are never violated
- [ ] Agent performs well on various codebase types
- [ ] Generated artifacts are useful and accurate

---

## Success Criteria

- [ ] Explore agent configuration file exists and is valid
- [ ] Agent enforces read-only operations strictly
- [ ] All three depth levels (quick, standard, deep) work correctly
- [ ] All four sub-commands (architecture, patterns, dependencies, flow) function properly
- [ ] Both output artifacts (exploration-report.md, codebase-map.json) generate correctly
- [ ] Model selection switches between haiku and sonnet appropriately
- [ ] `/explore` command integrates seamlessly with the CLI
- [ ] Proactive invocation works for relevant task patterns
- [ ] Test suite covers all functionality with 100% pass rate
- [ ] Agent completes quick explorations in < 30 seconds for medium codebases
- [ ] Deep explorations provide comprehensive, actionable insights
- [ ] Documentation includes usage examples and sample outputs

---

## Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Read-only enforcement bypassed | High | Low | Implement strict tool whitelist and command filtering |
| Performance issues on large codebases | Medium | Medium | Implement pagination and depth limits |
| Inaccurate architecture detection | Medium | Medium | Use multiple heuristics and confidence scoring |
| Missing file permissions | Low | Low | Graceful error handling with informative messages |

---

## Notes

- The Explore Agent should NEVER modify any files - it is strictly read-only
- haiku model provides speed for quick scans; sonnet for deep analysis
- Consider caching exploration results to avoid redundant scans
- Exploration artifacts can serve as input for other agents (Analyze, Architect, etc.)
- The agent should gracefully handle permission errors and missing files
- Consider adding exploration templates for common project types (React, Python, etc.)
