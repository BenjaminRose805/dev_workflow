# Implementation Plan: /brainstorm Command

## Overview
- **Goal:** Implement the /brainstorm command with 6 sub-commands for creative idea generation and solution exploration
- **Priority:** P1 (MEDIUM - Discovery & Ideation phase)
- **Created:** {{date}}
- **Output:** `docs/plan-outputs/implement-brainstorm-command/`
- **Model:** Claude Opus 4.5 (creative ideation benefits from most capable model)
- **Temperature:** 0.9 (higher temperature for creative, diverse outputs)
- **Category:** Discovery & Ideation

> The /brainstorm command generates creative ideas and explores solution spaces before committing to an approach. It uses specialized prompting techniques (constraint relaxation, perspective shifting, analogical thinking) to encourage divergent thinking and produce diverse alternatives with structured comparison.

---

## Phase 1: Core Command Setup

**Objective:** Establish base /brainstorm command with YAML configuration and creative prompting structure

- [ ] 1.1 Create `/brainstorm` command file at `.claude/commands/brainstorm.md`
- [ ] 1.2 Add YAML frontmatter with configuration:
  - name: brainstorm
  - description: Generate ideas and alternatives for creative problem-solving
  - category: discovery-ideation
  - model: claude-opus-4-5-20251101
  - temperature: 0.9
  - allowed-tools: Read, Grep, Glob, WebSearch, WebFetch
  - interaction_mode: interactive
  - output_artifacts: ideas.md, alternatives.md, comparison-matrix.md, decision-record.md
- [ ] 1.3 Write base command prompt with:
  - Interactive session introduction
  - Sub-command selection menu
  - Creative thinking encouragement
  - Divergent thinking instructions
- [ ] 1.4 Define session parameters:
  - topic: user-specified problem or opportunity
  - constraints: optional (to relax or consider)
  - perspectives: optional (viewpoints to explore)
- [ ] 1.5 Create output directory structure: `docs/brainstorm/`

**VERIFY 1:** Base /brainstorm command presents interactive menu and accepts user input

---

## Phase 2: Creative Prompting Techniques

**Objective:** Implement specialized prompting techniques to encourage divergent thinking

- [ ] 2.1 Implement Constraint Relaxation technique:
  - Prompt to set aside practical constraints
  - Explore "ideal solution" without limitations
  - Gradually reintroduce constraints to refine ideas
  - Example prompt structure for constraint relaxation
- [ ] 2.2 Implement Perspective Shifting technique:
  - User perspective: What do users truly need?
  - Developer perspective: What would be maintainable?
  - Business perspective: What drives value?
  - Security perspective: What keeps us safe?
  - Operations perspective: What's easy to deploy/monitor?
- [ ] 2.3 Implement Analogical Thinking technique:
  - How have similar problems been solved in other domains?
  - Cross-industry pattern application
  - Technology transfer concepts
- [ ] 2.4 Implement Reverse Thinking technique:
  - What if we did the opposite?
  - What would the worst solution look like? (then invert)
  - Challenge assumptions
- [ ] 2.5 Implement SCAMPER Framework:
  - Substitute: Replace components/approaches?
  - Combine: Merge existing solutions?
  - Adapt: Borrow from other contexts?
  - Modify: Alter existing patterns?
  - Put to other use: Repurpose existing code?
  - Eliminate: Remove constraints/features?
  - Reverse: Flip the approach?
- [ ] 2.6 Create technique selection logic:
  - Match technique to problem type
  - Allow user to request specific techniques
  - Combine techniques for richer ideation

**VERIFY 2:** Creative prompting techniques produce diverse, non-obvious ideas

---

## Phase 3: Sub-Command Implementation

**Objective:** Create 6 specialized sub-commands for different brainstorming focuses

### 3.1 Solutions Sub-Command
- [ ] 3.1.1 Create `/brainstorm:solutions` command file
  - YAML: model: claude-opus-4-5-20251101, temperature: 0.9, argument-hint: [problem-description]
- [ ] 3.1.2 Implement solution generation framework:
  - The Conservative Approach (minimal change, proven patterns)
  - The Innovative Approach (novel techniques, cutting-edge)
  - The Pragmatic Approach (balanced trade-offs)
  - The Simple Approach (radical simplification)
  - The Scalable Approach (built for growth)
  - Optional: The Fast Approach (quickest implementation)
- [ ] 3.1.3 Generate artifacts:
  - `ideas.md` (all generated solutions)
  - `comparison-matrix.md` (feature/aspect comparison)
- [ ] 3.1.4 Include per-solution analysis:
  - Core concept description
  - Pros and cons
  - Effort estimate (S/M/L/XL)
  - Risk level (Low/Medium/High)

### 3.2 Architecture Sub-Command
- [ ] 3.2.1 Create `/brainstorm:architecture` command file
  - YAML: model: claude-opus-4-5-20251101, temperature: 0.9
- [ ] 3.2.2 Implement architecture exploration:
  - Monolithic options
  - Microservices options
  - Modular Monolith options
  - Event-Driven options
  - Serverless options
  - Hybrid approaches
- [ ] 3.2.3 Generate artifacts:
  - `architecture-options.md` (architectural alternatives)
- [ ] 3.2.4 Include for each option:
  - Description and rationale
  - Pros, cons, when to use
  - Evolution path from current architecture
  - Technology implications

### 3.3 Names Sub-Command
- [ ] 3.3.1 Create `/brainstorm:names` command file
  - YAML: model: claude-opus-4-5-20251101, temperature: 0.9
  - Allowed-tools: Read, Grep, Glob (no web tools - naming is internal)
- [ ] 3.3.2 Implement naming categories:
  - Descriptive names (clear, describes function)
  - Creative/memorable names (unique, metaphorical)
  - Convention-following names (team/industry standards)
- [ ] 3.3.3 Generate artifacts:
  - `naming-options.md` (categorized name suggestions)
- [ ] 3.3.4 Include context awareness:
  - Analyze existing naming conventions in codebase
  - Suggest names that fit project style
  - Consider length, searchability, pronunciation

### 3.4 Features Sub-Command
- [ ] 3.4.1 Create `/brainstorm:features` command file
  - YAML: model: claude-opus-4-5-20251101, temperature: 0.9
- [ ] 3.4.2 Implement feature ideation:
  - Core features (must-have)
  - Enhancement features (nice-to-have)
  - Differentiator features (competitive advantage)
  - Future features (roadmap items)
- [ ] 3.4.3 Generate artifacts:
  - `feature-ideas.md` (categorized feature list)
- [ ] 3.4.4 Include for each feature:
  - Description and user benefit
  - Complexity estimate
  - Dependencies
  - Priority suggestion

### 3.5 APIs Sub-Command
- [ ] 3.5.1 Create `/brainstorm:apis` command file
  - YAML: model: claude-opus-4-5-20251101, temperature: 0.9
  - Allowed-tools: Read, Grep, Glob (API design is internal)
- [ ] 3.5.2 Implement API design ideation:
  - REST design options
  - GraphQL design options
  - RPC/gRPC design options
  - Event-based API options
- [ ] 3.5.3 Generate artifacts:
  - `api-designs.md` (alternative API designs)
- [ ] 3.5.4 Include for each design:
  - Endpoint structure
  - Request/response examples
  - Pros and cons
  - Client experience implications

### 3.6 Approaches Sub-Command
- [ ] 3.6.1 Create `/brainstorm:approaches` command file
  - YAML: model: claude-opus-4-5-20251101, temperature: 0.9
- [ ] 3.6.2 Implement approach comparison:
  - Implementation strategy alternatives
  - Technology choice implications
  - Team/resource considerations
  - Timeline implications
- [ ] 3.6.3 Generate artifacts:
  - `approaches.md` (implementation strategy options)
- [ ] 3.6.4 Include decision framework:
  - Decision criteria identification
  - Weighted scoring if applicable
  - Recommendation with reasoning

**VERIFY 3:** All sub-commands produce diverse, creative outputs with structured analysis

---

## Phase 4: Artifact Generation

**Objective:** Implement structured artifact generation for brainstorming outputs

### 4.1 Ideas Artifact (ideas.md)
- [ ] 4.1.1 Define ideas.md schema:
  - YAML frontmatter: type, topic, date, approach (technique used), ideas_count, temperature
  - Context section (problem/opportunity description)
  - Ideas Generated section (numbered ideas with standard format)
  - Synthesis section (patterns, hybrid possibilities)
- [ ] 4.1.2 Implement idea format:
  - Name/title
  - Category (Conservative/Innovative/Pragmatic/Simple/Scalable)
  - Description
  - Why It Could Work
  - Challenges
  - Effort Estimate (S/M/L/XL)
  - Risk Level (Low/Medium/High)
  - Next Step (how to explore further)

### 4.2 Alternatives Artifact (alternatives.md)
- [ ] 4.2.1 Define alternatives.md schema:
  - YAML frontmatter: type, topic, options_count
  - Problem Statement
  - Alternative Solutions (structured per alternative)
  - Comparison Matrix
  - Decision Factors
  - Recommendation (if requested)
  - Hybrid Approaches
- [ ] 4.2.2 Implement alternative format:
  - Name and approach type
  - Core concept
  - Pros, cons
  - Key implementation considerations
  - When to choose this option

### 4.3 Comparison Matrix Artifact
- [ ] 4.3.1 Implement comparison-matrix.md:
  - Markdown table comparing all options
  - Rows: aspects/features
  - Columns: alternatives
  - Scoring or qualitative assessment per cell
- [ ] 4.3.2 Add weighted scoring option:
  - User-defined weights for criteria
  - Calculated scores per option
  - Clear winner identification

### 4.4 Decision Record Artifact
- [ ] 4.4.1 Implement decision-record.md (optional):
  - Generated when user makes a choice
  - Records selected option and reasoning
  - Documents rejected alternatives
  - Notes for future reference

**VERIFY 4:** All artifacts are well-structured, consistent, and actionable

---

## Phase 5: Interactive Session Flow

**Objective:** Implement engaging interactive brainstorming sessions

- [ ] 5.1 Implement session initialization:
  - Present welcoming introduction
  - Explain brainstorming philosophy
  - Offer sub-command selection or freestyle input
- [ ] 5.2 Implement context gathering:
  - Use AskUserQuestion for structured input
  - Gather problem description
  - Identify constraints to consider/relax
  - Determine success criteria
- [ ] 5.3 Implement iterative refinement:
  - Generate initial ideas
  - Allow user to request more ideas
  - Support "explore this idea further" requests
  - Enable combination of ideas
- [ ] 5.4 Implement synthesis phase:
  - Cluster related ideas
  - Identify hybrid possibilities
  - Surface "dark horse" alternatives
  - Highlight quick wins
- [ ] 5.5 Implement session conclusion:
  - Summarize top ideas
  - Offer decision framework
  - Generate artifacts
  - Suggest next steps (link to /architect, /design, /implement)

**VERIFY 5:** Interactive sessions are engaging, productive, and produce actionable outputs

---

## Phase 6: Read-Only Constraint Implementation

**Objective:** Ensure brainstorming respects read-only constraint (no file modifications)

- [ ] 6.1 Implement tool restrictions:
  - Allow: Read, Grep, Glob (codebase analysis)
  - Allow: WebSearch, WebFetch (research)
  - Disallow: Write, Edit (no direct file changes)
- [ ] 6.2 Implement artifact output flow:
  - Brainstorming generates content
  - User reviews ideas
  - User explicitly requests artifact save
  - Artifact write triggered only on user confirmation
- [ ] 6.3 Add codebase context without modification:
  - Read existing code patterns
  - Analyze current architecture
  - Identify relevant examples
  - Inform ideas with codebase knowledge
- [ ] 6.4 Document read-only philosophy:
  - Brainstorming is exploratory
  - No commitment until explicit save
  - Ideas can be discarded freely

**VERIFY 6:** Brainstorming respects read-only constraint while still being informed by codebase

---

## Phase 7: Command Integration & Workflows

**Objective:** Ensure /brainstorm integrates with other commands in the workflow

- [ ] 7.1 Define integration points:
  - `/clarify` → `/brainstorm` (clarify requirements → brainstorm solutions)
  - `/research` → `/brainstorm` (parallel: research while brainstorming)
  - `/brainstorm` → `/architect` (brainstorm → formalize architecture)
  - `/brainstorm` → `/design` (brainstorm → detailed design)
  - `/brainstorm` → `/implement` (brainstorm → implementation)
- [ ] 7.2 Add artifact cross-referencing:
  - Include related_artifacts in metadata
  - Reference upstream requirements/research
  - Link to downstream design artifacts
- [ ] 7.3 Implement workflow continuity:
  - Brainstorm artifacts inform architecture decisions
  - Selected ideas become design inputs
  - Decision records provide implementation context
- [ ] 7.4 Test common workflows:
  - Greenfield project: /clarify → /brainstorm:solutions → /architect
  - Feature design: /clarify → /brainstorm:features → /design
  - API development: /brainstorm:apis → /spec:api → /implement
  - Naming decision: /brainstorm:names → manual selection → codebase update

**VERIFY 7:** Command integration works smoothly, artifacts flow between commands correctly

---

## Phase 8: Testing & Validation

**Objective:** Comprehensive testing of brainstorming quality and creativity

### 8.1 Creativity Testing
- [ ] 8.1.1 Test idea diversity (generate distinct approaches, not variations)
- [ ] 8.1.2 Test non-obviousness (ideas beyond first-thought solutions)
- [ ] 8.1.3 Test creative technique effectiveness (each technique produces different outputs)
- [ ] 8.1.4 Test temperature impact (0.9 produces more varied results than default)

### 8.2 Sub-Command Testing
- [ ] 8.2.1 Test /brainstorm:solutions with common problems:
  - State management approach
  - Error handling strategy
  - Caching architecture
  - Authentication system
- [ ] 8.2.2 Test /brainstorm:architecture with different contexts:
  - New project architecture
  - Refactoring legacy system
  - Scaling existing service
- [ ] 8.2.3 Test /brainstorm:names for:
  - Function naming
  - Component naming
  - Project naming
  - Variable naming
- [ ] 8.2.4 Test /brainstorm:features for:
  - New product features
  - Enhancement ideas
  - MVP feature set
- [ ] 8.2.5 Test /brainstorm:apis for:
  - REST API design
  - GraphQL schema
  - Event contracts
- [ ] 8.2.6 Test /brainstorm:approaches for:
  - Implementation strategies
  - Technology choices
  - Migration paths

### 8.3 Quality Testing
- [ ] 8.3.1 Test idea completeness (all have pros, cons, effort, risk)
- [ ] 8.3.2 Test comparison matrix accuracy
- [ ] 8.3.3 Test recommendation quality (justified, context-aware)
- [ ] 8.3.4 Test artifact formatting consistency

### 8.4 Interactive Testing
- [ ] 8.4.1 Test session flow (smooth, engaging)
- [ ] 8.4.2 Test iterative refinement (responds to user direction)
- [ ] 8.4.3 Test context gathering (appropriate questions asked)
- [ ] 8.4.4 Test artifact generation timing (user controls when)

**VERIFY 8:** All test cases pass, brainstorming produces consistently creative, valuable outputs

---

## Phase 9: Documentation & Polish

**Objective:** Create comprehensive documentation and refine user experience

- [ ] 9.1 Create command documentation:
  - Usage examples for each sub-command
  - When to use /brainstorm vs /research
  - Creative technique explanations
  - Common brainstorming workflows
- [ ] 9.2 Document brainstorming philosophy:
  - Divergent thinking principles
  - How to use brainstorming effectively
  - When brainstorming is most valuable
  - Anti-patterns to avoid
- [ ] 9.3 Create user guides:
  - "Effective solution brainstorming"
  - "Architecture brainstorming guide"
  - "Naming best practices"
  - "From brainstorm to implementation"
- [ ] 9.4 Add inline help:
  - Argument hints in YAML frontmatter
  - Creative technique descriptions
  - Example invocations
- [ ] 9.5 Polish output formatting:
  - Engaging session introduction
  - Clear idea presentation
  - Scannable comparison tables
  - Encouraging conclusion
- [ ] 9.6 Create example outputs:
  - Example solutions brainstorm
  - Example architecture brainstorm
  - Example naming session
  - Example feature ideation

**VERIFY 9:** Documentation is complete, clear, and inspiring; user experience is engaging

---

## Success Criteria

### Functional Requirements
- [ ] Base /brainstorm command presents interactive menu and accepts input
- [ ] All 6 sub-commands (solutions, architecture, names, features, apis, approaches) work correctly
- [ ] Creative prompting techniques produce diverse, non-obvious ideas
- [ ] Temperature 0.9 produces more varied outputs than default
- [ ] Read-only constraint is respected (no automatic file writes)

### Quality Requirements
- [ ] Minimum 4-6 distinct ideas per brainstorming session
- [ ] Ideas are genuinely different approaches, not variations
- [ ] All ideas include pros, cons, effort estimate, and risk level
- [ ] Comparison matrices enable informed decision-making
- [ ] Recommendations (when provided) are justified

### Usability Requirements
- [ ] Interactive sessions are engaging and productive
- [ ] Users can iterate and refine ideas
- [ ] Artifact generation is controlled by user
- [ ] Clear integration path to downstream commands

### Integration Requirements
- [ ] Artifacts can be consumed by /architect, /design, /implement
- [ ] Metadata includes related_artifacts cross-references
- [ ] Works seamlessly in common workflows (greenfield design, feature development)

### Testing Requirements
- [ ] All sub-commands tested with representative scenarios
- [ ] Creative technique effectiveness validated
- [ ] Idea diversity confirmed
- [ ] Interactive flow tested end-to-end
