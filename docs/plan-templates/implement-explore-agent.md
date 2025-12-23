# Implementation Plan: Explore Agent

**Date:** {{date}}

## Overview

**Goal:** Implement the Explore Agent for fast, read-only codebase exploration and understanding

**Priority:** HIGH - Core agent for codebase navigation and understanding

**Output Path:** `/home/benjamin/tools/dev_workflow/.claude/agents/explore.md`

**Model:** Haiku (default for speed), Sonnet for deep exploration mode

**Category:** Agent Implementation

**Estimated Effort:** 6-8 hours

---

## Phase 1: Agent Configuration Setup

**Tasks:**
- [ ] Create `.claude/agents/explore.md` agent configuration file
- [ ] Define agent metadata (name, description, version)
- [ ] Configure model selection (Haiku default, Sonnet for deep mode)
- [ ] Set up tool access restrictions (Read, Grep, Glob, Bash read-only)
- [ ] Define exploration depth levels (quick, standard, deep)
- [ ] Configure output artifact paths (exploration-report.md, codebase-map.json)

**VERIFY:**
- [ ] Agent configuration file is valid Markdown with proper frontmatter
- [ ] Model selection logic supports both Haiku and Sonnet
- [ ] Tool restrictions enforce read-only operations
- [ ] All three exploration levels are properly defined

---

## Phase 2: System Prompt Design

**Tasks:**
- [ ] Create core system prompt for exploration behavior
- [ ] Define exploration strategies (breadth-first vs depth-first)
- [ ] Add prompts for specialized exploration modes:
  - [ ] Architecture exploration (structure, patterns, layers)
  - [ ] Pattern detection (design patterns, anti-patterns)
  - [ ] Dependency analysis (imports, exports, relationships)
  - [ ] Flow analysis (data flow, control flow)
- [ ] Include read-only operation constraints in prompt
- [ ] Add output format specifications (Markdown reports, JSON maps)
- [ ] Define prompt variations for different depth levels

**VERIFY:**
- [ ] System prompt clearly defines exploration objectives
- [ ] All specialized exploration modes are covered
- [ ] Read-only constraints are explicit and enforceable
- [ ] Output format requirements are well-specified

---

## Phase 3: Tool Restriction Implementation

**Tasks:**
- [ ] Implement read-only Bash tool wrapper
- [ ] Create tool access validation logic
- [ ] Block write operations (Write, Edit, NotebookEdit)
- [ ] Allow safe read operations (Read, Grep, Glob)
- [ ] Implement Bash command filtering (allow ls, cat, find, grep; block rm, mv, etc.)
- [ ] Add error handling for blocked operations
- [ ] Create tool usage logging for debugging

**VERIFY:**
- [ ] Write operations are blocked with clear error messages
- [ ] Read operations function normally
- [ ] Bash commands are properly filtered for safety
- [ ] Tool restrictions don't break legitimate exploration tasks

---

## Phase 4: Exploration Logic Implementation

**Tasks:**
- [ ] Implement quick exploration mode (surface-level scan)
  - [ ] Directory structure mapping
  - [ ] File count and type analysis
  - [ ] High-level architecture detection
- [ ] Implement standard exploration mode (moderate depth)
  - [ ] Code organization analysis
  - [ ] Key file identification
  - [ ] Dependency mapping
- [ ] Implement deep exploration mode (comprehensive analysis)
  - [ ] Detailed code analysis
  - [ ] Pattern and anti-pattern detection
  - [ ] Complete dependency graph
  - [ ] Architecture documentation
- [ ] Create exploration state tracking
- [ ] Implement progress reporting

**VERIFY:**
- [ ] Each exploration mode produces appropriate level of detail
- [ ] Quick mode completes in < 30 seconds for medium codebases
- [ ] Standard mode provides actionable insights
- [ ] Deep mode produces comprehensive documentation

---

## Phase 5: Specialized Exploration Sub-Commands

**Tasks:**
- [ ] Implement `explore:architecture` sub-command
  - [ ] Layer detection (presentation, business, data)
  - [ ] Component identification
  - [ ] Architectural pattern recognition
- [ ] Implement `explore:patterns` sub-command
  - [ ] Design pattern detection
  - [ ] Code smell identification
  - [ ] Best practice analysis
- [ ] Implement `explore:dependencies` sub-command
  - [ ] Import/export mapping
  - [ ] Circular dependency detection
  - [ ] External dependency analysis
- [ ] Implement `explore:flow` sub-command
  - [ ] Data flow tracing
  - [ ] Control flow analysis
  - [ ] Entry point identification

**VERIFY:**
- [ ] Each sub-command produces focused, relevant output
- [ ] Architecture sub-command correctly identifies layers
- [ ] Pattern detection catches common patterns
- [ ] Dependency analysis is accurate and complete
- [ ] Flow analysis traces execution paths correctly

---

## Phase 6: Output Artifact Generation

**Tasks:**
- [ ] Implement `exploration-report.md` generation
  - [ ] Executive summary section
  - [ ] Directory structure visualization
  - [ ] Key findings and insights
  - [ ] Recommendations section
  - [ ] Timestamp and metadata
- [ ] Implement `codebase-map.json` generation
  - [ ] File tree structure
  - [ ] Dependency graph
  - [ ] Component metadata
  - [ ] Statistics and metrics
- [ ] Create artifact storage strategy (.claude/artifacts/explore/)
- [ ] Implement artifact versioning (timestamped outputs)
- [ ] Add artifact cleanup policies (retain last N explorations)

**VERIFY:**
- [ ] Exploration reports are well-formatted and readable
- [ ] Codebase maps are valid JSON with complete data
- [ ] Artifacts are stored in consistent locations
- [ ] Versioning prevents overwriting previous explorations
- [ ] Cleanup policies prevent artifact buildup

---

## Phase 7: Command Integration

**Tasks:**
- [ ] Create `/explore` command handler
- [ ] Implement command argument parsing (depth level, target path)
- [ ] Add sub-command routing (architecture, patterns, dependencies, flow)
- [ ] Integrate agent invocation from command
- [ ] Implement model selection based on depth:
  - [ ] Haiku for quick and standard modes
  - [ ] Sonnet for deep mode
- [ ] Add progress indicators and status updates
- [ ] Create command help text and usage examples

**VERIFY:**
- [ ] `/explore` command executes successfully
- [ ] All sub-commands are accessible and functional
- [ ] Model selection works correctly for each depth level
- [ ] Help text provides clear usage guidance
- [ ] Command works from any directory in the codebase

---

## Phase 8: Proactive Invocation & Testing

**Tasks:**
- [ ] Define task patterns that trigger proactive exploration:
  - [ ] "Where is..." queries
  - [ ] "How does... work?" questions
  - [ ] "Show me the architecture" requests
  - [ ] New codebase onboarding scenarios
- [ ] Implement pattern detection in main agent
- [ ] Create automatic explore agent delegation
- [ ] Build comprehensive test suite:
  - [ ] Test read-only enforcement
  - [ ] Test each exploration depth level
  - [ ] Test all sub-commands
  - [ ] Test artifact generation
  - [ ] Test model selection
- [ ] Perform integration testing with real codebases
- [ ] Create example outputs for documentation

**VERIFY:**
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
- [ ] Model selection switches between Haiku and Sonnet appropriately
- [ ] `/explore` command integrates seamlessly with the CLI
- [ ] Proactive invocation works for relevant task patterns
- [ ] Test suite covers all functionality with 100% pass rate
- [ ] Agent completes quick explorations in < 30 seconds for medium codebases
- [ ] Deep explorations provide comprehensive, actionable insights
- [ ] Documentation includes usage examples and sample outputs

---

## Notes

- The Explore Agent should NEVER modify any files - it is strictly read-only
- Haiku model provides speed for quick scans; Sonnet for deep analysis
- Consider caching exploration results to avoid redundant scans
- Exploration artifacts can serve as input for other agents (Analyze, Architect, etc.)
- The agent should gracefully handle permission errors and missing files
- Consider adding exploration templates for common project types (React, Python, etc.)
