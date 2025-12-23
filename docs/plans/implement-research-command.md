# Implementation Plan: /research Command

## Overview
- **Goal:** Implement the /research command with 4 sub-commands for systematic technology and pattern research
- **Priority:** P0 (HIGH - Discovery & Ideation phase)
- **Created:** 2025-12-22
- **Output:** `docs/plan-outputs/implement-research-command/`
- **Model:** Claude Sonnet 4.5 (web research, analysis, synthesis)
- **Category:** Discovery & Ideation

> The /research command helps developers make informed decisions by systematically researching technologies, patterns, architectures, and best practices. It uses web search, documentation fetching, and codebase analysis to gather information, compare options, and provide data-driven recommendations.

---

## Phase 1: Core Command Setup

**Objective:** Establish base /research command with YAML configuration and core prompt structure

- [ ] 1.1 Create `/research` command file at `.claude/commands/research.md`
- [ ] 1.2 Add YAML frontmatter with configuration:
  - name: research
  - description: Research technologies, patterns, and best practices - comparing options and gathering information for decision-making
  - category: discovery-ideation
  - model: claude-sonnet-4-5
  - allowed-tools: WebSearch, WebFetch, Read, Grep, Glob, Bash, Write
  - permission_mode: default
- [ ] 1.3 Write base command prompt with sections:
  - Your Task (research topic, scope, options to compare)
  - Instructions (5-phase research workflow)
  - Quality standards (authoritative sources, recent data, balanced perspective)
  - Output format specifications
- [ ] 1.4 Define default parameters:
  - topic: user-specified research topic
  - scope: quick (5 min) | standard (10 min) | deep (20 min)
  - options: optional list of specific options to compare
  - context: project type or technology stack
- [ ] 1.5 Create output directory structure: `docs/research/`

**VERIFY 1:** Base /research command runs successfully, performs web research, and produces structured output

---

## Phase 2: Research Workflow Implementation

**Objective:** Implement systematic research workflow with web search and analysis

- [ ] 2.1 Implement Research Parameters phase:
  - Use AskUserQuestion to gather topic, scope, context
  - Identify focus areas (performance, security, DX, cost, etc.)
  - Determine if comparing options or general research
- [ ] 2.2 Implement Project Context Analysis phase:
  - Check package.json for existing dependencies
  - Search for related code patterns in codebase
  - Identify current architecture and conventions
  - Note team conventions that may influence recommendations
- [ ] 2.3 Implement Web Research phase:
  - WebSearch with current year (2025) in queries
  - Target authoritative sources (official docs, reputable blogs)
  - Gather comparison articles and benchmark data
  - Find community discussions and real-world case studies
- [ ] 2.4 Implement Documentation Fetching:
  - WebFetch official documentation for each option
  - Extract key features, limitations, and requirements
  - Gather code examples and usage patterns
- [ ] 2.5 Implement Analysis & Synthesis:
  - Structure findings into coherent sections
  - Identify patterns across sources
  - Note areas of consensus and disagreement
  - Formulate context-specific recommendations

**VERIFY 2:** Research workflow produces comprehensive, well-sourced findings with clear recommendations

---

## Phase 3: Sub-Command Implementation

**Objective:** Create 4 specialized sub-commands for different research focuses

### 3.1 Technology Research Sub-Command
- [ ] 3.1.1 Create `/research:technology` command file
  - YAML: model: claude-sonnet-4-5, argument-hint: <technology-area> [--options lib1,lib2,lib3]
- [ ] 3.1.2 Implement technology comparison logic:
  - Library/framework feature comparison
  - Bundle size and performance metrics
  - TypeScript support quality
  - Community activity (GitHub stars, npm downloads, issue response time)
  - Learning curve and documentation quality
  - Migration complexity from current stack
- [ ] 3.1.3 Generate specialized artifacts:
  - `technology-research.md` (detailed analysis)
  - `comparison-matrix.md` (feature matrix)
- [ ] 3.1.4 Add decision criteria scoring:
  - Score each option against user priorities
  - Generate weighted comparison scorecard

### 3.2 Patterns Research Sub-Command
- [ ] 3.2.1 Create `/research:patterns` command file
  - YAML: model: claude-sonnet-4-5, argument-hint: <pattern-name> [--context project-type]
- [ ] 3.2.2 Implement pattern research logic:
  - Pattern definition and variants
  - When to use / when not to use
  - Implementation complexity
  - Common pitfalls and anti-patterns
  - Real-world examples and case studies
- [ ] 3.2.3 Generate specialized artifacts:
  - `pattern-research.md` (pattern deep-dive)
  - `implementation-examples.md` (code examples in relevant languages)
- [ ] 3.2.4 Include context-specific guidance:
  - How pattern applies to user's technology stack
  - Existing pattern usage in codebase
  - Integration recommendations

### 3.3 Security Research Sub-Command
- [ ] 3.3.1 Create `/research:security` command file
  - YAML: model: claude-sonnet-4-5, argument-hint: <topic> [--context technology]
- [ ] 3.3.2 Implement security research logic:
  - OWASP guidance and best practices
  - Known vulnerabilities and CVEs
  - Security configuration recommendations
  - Authentication/authorization patterns
  - Data protection considerations
- [ ] 3.3.3 Generate specialized artifacts:
  - `security-research.md` (comprehensive security analysis)
  - `vulnerability-assessment.md` (risk analysis and mitigations)
- [ ] 3.3.4 Add compliance considerations:
  - GDPR, HIPAA, SOC2 implications
  - Industry-specific requirements

### 3.4 Performance Research Sub-Command
- [ ] 3.4.1 Create `/research:performance` command file
  - YAML: model: claude-sonnet-4-5, argument-hint: <area> [--context technology]
- [ ] 3.4.2 Implement performance research logic:
  - Benchmark data and comparisons
  - Optimization techniques
  - Memory and CPU considerations
  - Network and I/O optimization
  - Caching strategies
  - Scaling patterns
- [ ] 3.4.3 Generate specialized artifacts:
  - `performance-research.md` (optimization techniques)
  - `benchmarks.md` (collected benchmark data with sources)
- [ ] 3.4.4 Include measurement guidance:
  - How to measure performance improvements
  - Profiling tool recommendations
  - KPIs and targets

**VERIFY 3:** All sub-commands produce valid, specialized artifacts relevant to their focus area

---

## Phase 4: Artifact Generation & Quality Standards

**Objective:** Implement structured artifact generation with quality validation

### 4.1 Primary Artifacts
- [ ] 4.1.1 Implement `research-notes.md` generation:
  - YAML frontmatter with metadata:
    - type: research-notes
    - topic, date, researcher (Claude Sonnet 4.5)
    - scope (quick|standard|deep)
    - sources-count
  - Summary (2-3 paragraph overview)
  - Key Findings (numbered, with evidence/source for each)
  - Sources section (grouped by type: official docs, articles, discussions)
  - Open Questions (unresolved issues for follow-up)
  - Next Steps (actionable recommendations)
- [ ] 4.1.2 Implement `options-analysis.md` generation:
  - YAML frontmatter:
    - type: options-analysis
    - topic, options-evaluated, recommendation, confidence
  - Comparison Matrix (feature table)
  - Detailed Analysis (per-option breakdown)
  - Score Card (weighted scoring if criteria provided)
  - Recommendation (with reasoning)
  - Implementation Guidance (next steps for chosen option)

### 4.2 Quality Standards
- [ ] 4.2.1 Implement source validation:
  - Minimum 5 authoritative sources
  - Prefer recent publications (2024-2025)
  - Require evidence for all claims
- [ ] 4.2.2 Implement balance checking:
  - Ensure pros AND cons for each option
  - Note when sources disagree
  - Avoid vendor bias
- [ ] 4.2.3 Implement recommendation validation:
  - Recommendation must link to evidence
  - Context-specific justification required
  - Clear next steps provided

### 4.3 Source Citation
- [ ] 4.3.1 Implement source tracking:
  - Track all URLs consulted
  - Note publication dates
  - Rate source authority (official docs > well-known blogs > forums)
- [ ] 4.3.2 Add inline citations:
  - Link findings to specific sources
  - Use markdown hyperlinks
- [ ] 4.3.3 Generate Sources section:
  - Categorize by source type
  - Include access date

**VERIFY 4:** Artifacts meet quality standards, sources are well-cited, recommendations are justified

---

## Phase 5: Web Research Integration

**Objective:** Optimize web search and fetch operations for research quality

- [ ] 5.1 Implement effective search strategies:
  - Always include year (2025) in queries for recent results
  - Use comparison keywords: "vs", "comparison", "benchmark"
  - Target specific sources: site:github.com, site:dev.to, site:medium.com
  - Search for negative feedback: "problems with", "issues", "downsides"
- [ ] 5.2 Implement WebFetch optimization:
  - Prioritize official documentation URLs
  - Extract relevant sections, not full pages
  - Handle redirect responses appropriately
  - Cache results for multi-query research
- [ ] 5.3 Implement source quality assessment:
  - Identify and prioritize authoritative sources
  - Flag outdated information (pre-2023)
  - Note when sources conflict
- [ ] 5.4 Add rate limiting and error handling:
  - Graceful fallback if web search unavailable
  - Use cached results when possible
  - Inform user of research limitations
- [ ] 5.5 Implement search result synthesis:
  - Combine information from multiple sources
  - Identify consensus views
  - Note areas of disagreement

**VERIFY 5:** Web research produces high-quality, diverse, recent, and authoritative sources

---

## Phase 6: Command Integration & Workflows

**Objective:** Ensure /research integrates with other Discovery & Ideation commands

- [ ] 6.1 Define integration points:
  - `/clarify` → `/research` (clarify requirements → research solutions)
  - `/research` → `/explore` (research → explore existing patterns)
  - `/research` → `/architect` (research → architecture design)
  - `/research` → `/plan:create` (research → implementation planning)
- [ ] 6.2 Add artifact cross-referencing:
  - Include related_artifacts in metadata
  - Reference upstream clarification documents
  - Link to downstream design artifacts
- [ ] 6.3 Implement artifact consumption:
  - Make artifacts machine-readable for downstream commands
  - Include structured data for automated processing
  - Document artifact usage patterns
- [ ] 6.4 Test common workflows:
  - Technology selection: /clarify → /research:technology → /architect
  - Security review: /research:security → /analyze → /fix
  - Performance optimization: /research:performance → /analyze → /refactor
  - Architecture planning: /research:patterns → /architect

**VERIFY 6:** Command integration works smoothly, artifacts flow between commands correctly

---

## Phase 7: Testing & Validation

**Objective:** Comprehensive testing of research quality and accuracy

### 7.1 Research Quality Testing
- [ ] 7.1.1 Test source quality (authoritative, recent, relevant)
- [ ] 7.1.2 Test recommendation quality (justified, context-aware)
- [ ] 7.1.3 Test balance (pros AND cons for all options)
- [ ] 7.1.4 Test citation accuracy (links work, sources quoted correctly)

### 7.2 Sub-Command Testing
- [ ] 7.2.1 Test /research:technology with common comparisons:
  - State management: zustand vs jotai vs redux
  - Testing: vitest vs jest
  - Bundlers: vite vs webpack vs turbopack
- [ ] 7.2.2 Test /research:patterns with common patterns:
  - Repository pattern
  - Event sourcing
  - CQRS
  - Micro-frontends
- [ ] 7.2.3 Test /research:security with common topics:
  - JWT authentication
  - API rate limiting
  - SQL injection prevention
- [ ] 7.2.4 Test /research:performance with common areas:
  - Bundle optimization
  - Database queries
  - React rendering

### 7.3 Edge Case Testing
- [ ] 7.3.1 Test with obscure/niche technologies
- [ ] 7.3.2 Test with no web access (graceful degradation)
- [ ] 7.3.3 Test with conflicting sources
- [ ] 7.3.4 Test with outdated topic (handle gracefully)

### 7.4 Workflow Testing
- [ ] 7.4.1 Test research → architecture workflow
- [ ] 7.4.2 Test research → implementation workflow
- [ ] 7.4.3 Test multi-research comparison workflow

**VERIFY 7:** All test cases pass, research quality is consistently high

---

## Phase 8: Documentation & Polish

**Objective:** Create comprehensive documentation and refine user experience

- [ ] 8.1 Create command documentation:
  - Usage examples for each sub-command
  - Scope selection guidance (quick vs standard vs deep)
  - When to use /research vs direct questions
  - Common research workflows
- [ ] 8.2 Document research methodology:
  - How sources are selected and evaluated
  - How recommendations are formed
  - Confidence level interpretations
  - Limitations and caveats
- [ ] 8.3 Create user guides:
  - "Researching technology choices"
  - "Security research best practices"
  - "Performance optimization research"
  - "Pattern selection guidance"
- [ ] 8.4 Add inline help:
  - Argument hints in YAML frontmatter
  - Error messages with suggestions
  - Progress indicators during web research
- [ ] 8.5 Polish output formatting:
  - Clear section headers
  - Consistent citation format
  - Scannable comparison tables
  - Actionable recommendations
- [ ] 8.6 Create example outputs:
  - Example technology comparison
  - Example pattern research
  - Example security assessment

**VERIFY 8:** Documentation is complete, clear, and helpful; output quality is polished

---

## Success Criteria

### Functional Requirements
- [ ] Base /research command performs web research and generates research-notes.md
- [ ] All 4 sub-commands (technology, patterns, security, performance) work correctly
- [ ] Three scope levels (quick, standard, deep) produce proportional depth
- [ ] All artifacts include proper citations and sources
- [ ] Recommendations are justified with evidence

### Quality Requirements
- [ ] Minimum 5 authoritative sources per research
- [ ] All claims backed by evidence
- [ ] Publication dates noted for all sources
- [ ] Balanced perspective (pros and cons)
- [ ] Context-specific recommendations

### Usability Requirements
- [ ] Clear progress indicators during web research
- [ ] Helpful error messages if web search fails
- [ ] Sources section includes working hyperlinks
- [ ] Recommendations are actionable

### Integration Requirements
- [ ] Artifacts can be consumed by downstream commands (/architect, /design, /implement)
- [ ] Metadata includes related_artifacts cross-references
- [ ] Works seamlessly in common workflows (technology selection, architecture planning)

### Testing Requirements
- [ ] All sub-commands tested with representative topics
- [ ] Edge cases (obscure topics, no web access) handled gracefully
- [ ] Research quality validated across different domains
