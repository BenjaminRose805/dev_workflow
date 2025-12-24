# Implementation Plan: Artifact Registry System

## Overview

- **Goal:** Build hybrid artifact discovery system with registry, indexing, and lifecycle management
- **Priority:** P0
- **Created:** 2025-12-22
- **Output:** `docs/plan-outputs/artifact-registry/`

## Description

Implement a comprehensive artifact registry system that enables fast discovery, versioning, lifecycle management, and dependency tracking across all command outputs. The system uses a hybrid approach: registry lookup → convention-based discovery → filesystem scan fallback.

---

## Dependencies

### Upstream
- Core command infrastructure (`src/commands/`)
- File system utilities for artifact storage
- JSON schema validation (AJV or similar)

### Downstream
- All commands that produce artifacts
- `/plan:batch` for task dependency tracking
- Workflow orchestration for artifact consumption

### External Tools
- Node.js >= 18.x for async operations
- JSON Schema Draft-07 for validation

---

## Phase 1: Core Registry Implementation

**Objective:** Implement the core registry schema, storage, and CRUD operations.

### 1.1 Registry Schema & Storage
- [ ] 1.1.1 Create registry schema at `docs/.artifact-registry.json`
  - artifact_id (unique identifier: `{type}-{name}-{hash}`)
  - type (enum: requirements, codebase-map, architecture-design, etc.)
  - command/subcommand (producer: /clarify, /explore, /architect)
  - path (relative path to artifact file)
  - created_at, created_by, status (draft/active/superseded/archived)
  - version (semantic versioning: MAJOR.MINOR.PATCH)
  - tags (array for filtering: feature names, priorities)
  - consumed_by (array of consumer commands)
  - depends_on (array of upstream artifact IDs)
  - project_context (project, feature, component)
  - content_hash (SHA256 for deduplication)
  - metadata (command-specific metadata)

- [ ] 1.1.2 Define JSON schema for registry validation
  - Use JSON Schema Draft-07
  - Required fields: artifact_id, type, path, created_at
  - Enum constraints for type, status fields
  - Array validation for tags, consumed_by, depends_on

- [ ] 1.1.3 Create registry initialization logic
  - Check if registry exists, create if missing
  - Initialize with empty array structure
  - Add registry to .gitignore or commit (decide based on use case)

### 1.2 ArtifactRegistry Class (CRUD Operations)
- [ ] 1.2.1 Implement `ArtifactRegistry.constructor()`
  - Load registry from `docs/.artifact-registry.json`
  - Handle file not found (initialize empty)
  - Parse JSON and validate structure

- [ ] 1.2.2 Implement `register(artifact, metadata)` method
  - Generate unique artifact_id from type + name + timestamp
  - Extract metadata from artifact (type, command, version)
  - Calculate content_hash (SHA256 of artifact content)
  - Add entry to registry array
  - Save registry to disk
  - Return artifact_id

- [ ] 1.2.3 Implement `query(type, filters)` method
  - Filter by type (exact match)
  - Filter by status (default: 'active')
  - Filter by tags (all must match if provided)
  - Filter by command/subcommand
  - Filter by date range (since/until)
  - Sort by created_at (newest first)
  - Return array of matching entries

- [ ] 1.2.4 Implement `queryById(artifactId)` method
  - Find entry by artifact_id (exact match)
  - Return single entry or null

- [ ] 1.2.5 Implement `update(artifactId, updates)` method
  - Find entry by ID
  - Merge updates (status, tags, metadata)
  - Validate updated entry against schema
  - Save registry

- [ ] 1.2.6 Implement `markSuperseded(oldId, newId)` method
  - Set old entry status to 'superseded'
  - Add superseded_by field to old entry
  - Add supersedes field to new entry
  - Save registry

- [ ] 1.2.7 Implement `delete(artifactId)` method
  - Set status to 'deleted' (soft delete)
  - Optionally remove file from filesystem
  - Save registry

- [ ] 1.2.8 Implement `save()` private method
  - Write registry to JSON file
  - Format with 2-space indentation
  - Handle write errors gracefully


### 1.3 Artifact Metadata Standards
- [ ] 1.3.1 Define core metadata schema for all artifacts
  - artifact_type (REQUIRED)
  - command, subcommand (REQUIRED)
  - version (REQUIRED - semantic versioning)
  - created_at, updated_at (ISO-8601 timestamps)
  - created_by (model identifier)
  - status (draft/in-review/approved/active/deprecated)
  - generated_by (Claude model ID)

- [ ] 1.3.2 Define extended metadata schema
  - context.project, context.feature, context.component
  - related_artifacts array (with relationship types)
  - tags array (for filtering/categorization)
  - confidence score (0.0-1.0)
  - completeness score (0.0-1.0)
  - consumable_by array (consumer commands)
  - dependencies array (prerequisite artifact IDs)
  - lifecycle.superseded_by, lifecycle.archived_at

- [ ] 1.3.3 Create metadata validation helper
  - Validate required fields present
  - Validate field types and formats
  - Validate enum values (status, relationship types)
  - Return validation errors array

- [ ] 1.3.4 Update existing artifact producers to include metadata
  - Add metadata to /clarify outputs (requirements, constraints)
  - Add metadata to /explore outputs (codebase-map, exploration-report)
  - Add metadata to /architect outputs (architecture-design, component-spec)

**VERIFY Phase 1:**
- [ ] Registry file created and schema validates correctly
- [ ] Empty registry initializes properly
- [ ] All CRUD operations work correctly
- [ ] Registry persists correctly and IDs are unique
- [ ] Metadata schema documented and validation works
- [ ] Existing artifacts updated with metadata

---

## Phase 2: Discovery Pipeline

**Objective:** Implement the multi-layer discovery pipeline with convention-based and filesystem fallback.

### 2.1 Convention-Based Discovery
- [ ] 2.1.1 Define standard path conventions
  - Primary: `docs/{command}/{subcommand}/{name}-{date}.{ext}`
  - Generic: `docs/artifacts/{category}/{type}/{name}-{date}.{ext}`
  - Latest pointer: `docs/{command}/{subcommand}/{name}-latest.{ext}`
  - Plan findings: `docs/plan-outputs/{plan}/findings/{task-id}.md`

- [ ] 2.1.2 Implement `ConventionResolver.resolve(type, context)` method
  - Build ordered list of path patterns (most specific first)
  - Use glob to find matches for each pattern
  - Filter matches by file existence
  - Validate each match against artifact schema
  - Return most recent valid match

- [ ] 2.1.3 Add support for latest pointers
  - Check for `{name}-latest.{ext}` symlinks/copies
  - Fall back to timestamped files if no latest pointer
  - Update latest pointer when new artifact registered

- [ ] 2.1.4 Implement date parsing from filenames
  - Extract YYYY-MM-DD from filename
  - Parse to Date object for sorting
  - Handle invalid/missing dates gracefully


### 2.2 Filesystem Scanner (Fallback)
- [ ] 2.2.1 Implement `FilesystemScanner.scan(type, context)` method
  - Build glob patterns: `docs/**/*{type}*.{json,md}`
  - Execute glob with recursion
  - Read each candidate file
  - Parse and validate against schema
  - Extract metadata from file content
  - Sort by metadata.created_at

- [ ] 2.2.2 Add performance optimizations
  - Limit scan depth (default: 5 levels)
  - Exclude node_modules, .git, build directories
  - Set timeout for long scans (default: 500ms)
  - Return partial results if timeout exceeded

- [ ] 2.2.3 Implement validation during scan
  - Check file is valid JSON/Markdown
  - Validate artifact_type in metadata
  - Verify required metadata fields present
  - Log validation failures (don't fail entire scan)


### 2.3 Discovery Coordinator (Hybrid Strategy)
- [ ] 2.3.1 Implement `DiscoveryCoordinator` main class
  - Initialize with config (layers, timeouts, caching)
  - Instantiate ArtifactRegistry, ConventionResolver, FilesystemScanner
  - Manage layer fallthrough logic

- [ ] 2.3.2 Implement `discover(type, context, options)` method
  - **Layer 1:** Query registry (fast, 1-5ms)
    - Call `registry.query(type, filters)`
    - If found and status='active', return immediately
  - **Layer 2:** Check conventions (moderate, 10-50ms)
    - Call `conventionResolver.resolve(type, context)`
    - Validate result, register in registry if found
    - If found, return
  - **Layer 3:** Filesystem scan (slow, 100-500ms)
    - Call `filesystemScanner.scan(type, context)`
    - Validate result, register in registry if found
    - If found, return
  - If all layers fail, return null with suggestions

- [ ] 2.3.3 Implement error handling and suggestions
  - Collect what was tried (registry, X paths, Y files scanned)
  - Generate helpful error message
  - Suggest commands to create missing artifact
  - Suggest checking directory paths
  - Return structured error object

- [ ] 2.3.4 Add discovery options
  - `mode`: 'strict' (registry only), 'fast' (registry+convention), 'thorough' (all layers)
  - `includeSuperseded`: include superseded artifacts (default: false)
  - `limit`: max results to return
  - `validate`: validate artifacts before returning (default: true)


### 2.4 Discovery Configuration
- [ ] 2.4.1 Create `.claude/discovery-config.yml`
  - Default mode: hybrid
  - Layer configuration (enabled, timeout_ms)
  - Path patterns for conventions
  - Caching settings (TTL, strategies)
  - Validation requirements

- [ ] 2.4.2 Implement config loader
  - Read YAML configuration file
  - Merge with defaults
  - Validate configuration structure
  - Export as typed config object

- [ ] 2.4.3 Make discovery coordinator config-driven
  - Load config on initialization
  - Respect layer enable/disable flags
  - Apply timeouts per layer
  - Use configured path patterns

**VERIFY Phase 2:**
- [ ] Convention-based discovery finds artifacts correctly
- [ ] Respects latest pointers and validates before returning
- [ ] Filesystem scan finds artifacts in unexpected locations
- [ ] Validates correctly and respects timeouts
- [ ] Hybrid discovery works and falls through layers correctly
- [ ] Returns helpful error messages
- [ ] Config file loads and coordinator respects settings
- [ ] Can toggle layers on/off

---

## Phase 3: Indexing System

**Objective:** Implement in-memory indexing, query API, and caching layer for fast artifact discovery.

### 3.1 In-Memory Index
- [ ] 3.1.1 Implement `ArtifactIndex` class structure
  - `byType`: Map<string, Entry[]> (indexed by artifact_type)
  - `byCommand`: Map<string, Entry[]> (indexed by command)
  - `byId`: Map<string, Entry> (indexed by artifact_id)
  - `byTag`: Map<string, Entry[]> (indexed by individual tags)
  - `byTimestamp`: Entry[] (sorted by created_at DESC)
  - `lastUpdated`: timestamp for cache invalidation

- [ ] 3.1.2 Implement `build()` method
  - Load registry entries
  - Clear existing indexes
  - For each entry:
    - Add to byType map
    - Add to byCommand map
    - Add to byId map
    - Add to byTag map for each tag
  - Sort byTimestamp array
  - Set lastUpdated to now

- [ ] 3.1.3 Implement `query(filters)` method
  - Start with byTimestamp (all entries)
  - If `type` filter: use byType map
  - If `command` filter: intersect with byCommand results
  - If `tags` filter: intersect with byTag results
  - If `status` filter: filter by status field
  - If `since` filter: filter by created_at > since
  - Apply limit (default: 10)
  - Return sorted results

- [ ] 3.1.4 Implement `refresh(maxAgeSecs)` method
  - Check if lastUpdated + maxAgeSecs < now
  - If stale, rebuild index
  - Otherwise, use cached index

- [ ] 3.1.5 Add index to ArtifactRegistry
  - Instantiate index on registry construction
  - Build index on first query
  - Rebuild index after register/update/delete operations
  - Expose `registry.index.query(filters)` for fast queries


### 3.2 Query API
- [ ] 3.2.1 Implement query helpers on ArtifactRegistry
  - `getLatest(type, filters)`: return most recent artifact of type
  - `getByTag(tag, filters)`: return all artifacts with tag
  - `getByCommand(command, filters)`: return all artifacts from command
  - `getActive(type)`: return all active artifacts of type
  - `getSuperseded(type)`: return superseded artifacts

- [ ] 3.2.2 Implement relationship queries
  - `getDependencies(artifactId)`: return all depends_on artifacts
  - `getConsumers(artifactId)`: return artifacts that depend on this
  - `getGraph()`: build full dependency graph
  - `getUpstream(artifactId)`: recursive dependencies
  - `getDownstream(artifactId)`: recursive consumers

- [ ] 3.2.3 Add advanced filtering
  - Date range: `since`, `until`
  - Confidence/completeness: `minConfidence`, `minCompleteness`
  - Project context: `project`, `feature`, `component`
  - Lifecycle: `includeSuperseded`, `includeArchived`


### 3.3 Caching Layer
- [ ] 3.3.1 Implement `DiscoveryCache` class
  - `cache`: Map<string, {value, expires}>
  - `ttl`: TTL in milliseconds (default: 300000 = 5 min)
  - `set(key, value)`: store with expiration
  - `get(key)`: return value if not expired, null otherwise
  - `invalidate(pattern)`: clear entries matching pattern
  - `clear()`: clear entire cache

- [ ] 3.3.2 Integrate cache into DiscoveryCoordinator
  - Generate cache key from query parameters
  - Check cache before running discovery layers
  - Store successful results in cache
  - Invalidate cache on artifact registration

- [ ] 3.3.3 Add cache statistics
  - Track hits, misses, invalidations
  - Calculate hit rate
  - Expose `cache.stats()` method
  - Log cache performance metrics

**VERIFY Phase 3:**
- [ ] Index builds correctly and queries are fast (<5ms)
- [ ] Refreshes when stale
- [ ] Query helpers work correctly
- [ ] Relationship queries return correct results
- [ ] Advanced filters are functional
- [ ] Cache reduces discovery time
- [ ] Invalidates correctly and statistics are accurate

---

## Phase 4: Versioning & Lifecycle

**Objective:** Implement semantic versioning, lifecycle state management, and archival capabilities.

### 4.1 Semantic Versioning
- [ ] 4.1.1 Implement version parsing and comparison
  - Parse version string (MAJOR.MINOR.PATCH)
  - Compare versions (>, <, =, ~, ^)
  - Validate version format
  - Increment version parts (major, minor, patch)

- [ ] 4.1.2 Add version rules to artifacts
  - MAJOR: breaking changes to artifact structure
  - MINOR: backward-compatible additions
  - PATCH: clarifications, non-structural fixes
  - Document version rules in artifact schemas

- [ ] 4.1.3 Implement version compatibility checks
  - Check if consumer can use artifact version
  - Validate dependencies have compatible versions
  - Warn on major version mismatches


### 4.2 Lifecycle State Management
- [ ] 4.2.1 Define lifecycle state machine
  - States: draft → in-review → approved → active → superseded → archived → deleted
  - Allowed transitions (e.g., draft can't go directly to superseded)
  - Validation rules for each state

- [ ] 4.2.2 Implement state transition methods
  - `promote(artifactId)`: move to next lifecycle state
  - `archive(artifactId)`: move to archived state
  - `restore(artifactId)`: restore from archived
  - Validate transitions before applying
  - Record transition timestamps

- [ ] 4.2.3 Add lifecycle metadata tracking
  - `lifecycle.created_at`: initial creation
  - `lifecycle.approved_at`: when approved
  - `lifecycle.superseded_by`: replacement artifact ID
  - `lifecycle.superseded_at`: when superseded
  - `lifecycle.archived_at`: when archived
  - `lifecycle.retention_policy`: permanent|annual|short-term


### 4.3 Supersession Management
- [ ] 4.3.1 Implement `supersede(oldId, newArtifactData)` method
  - Register new artifact
  - Mark old artifact as superseded
  - Link old → new (superseded_by)
  - Link new → old (supersedes)
  - Preserve old artifact metadata
  - Return new artifact_id

- [ ] 4.3.2 Implement supersession chains
  - `getSupersessionChain(artifactId)`: return version history
  - `getLatestInChain(artifactId)`: find current active version
  - `getPreviousVersion(artifactId)`: get superseded artifact

- [ ] 4.3.3 Add supersession warnings
  - Warn consumers when using superseded artifacts
  - Suggest upgrading to latest version
  - Show what changed (diff if available)


### 4.4 Archival & Retention
- [ ] 4.4.1 Implement archival policies
  - `permanent`: never delete (requirements, designs)
  - `annual`: keep for 1 year (exploration reports)
  - `short-term`: keep for 30 days (debug logs)
  - Apply policy on archive

- [ ] 4.4.2 Implement archival process
  - Mark artifact as archived
  - Optionally move file to archive directory
  - Update registry status
  - Preserve in index but exclude from default queries

- [ ] 4.4.3 Add retention enforcement
  - Periodic cleanup job (checks archived artifacts)
  - Delete files past retention period
  - Update registry (mark as deleted)
  - Generate cleanup report

**VERIFY Phase 4:**
- [ ] Version parsing works correctly
- [ ] Comparison and compatibility checks are functional
- [ ] State transitions are validated
- [ ] Lifecycle metadata is tracked
- [ ] Illegal transitions are rejected
- [ ] Supersession works and chains are tracked
- [ ] Warnings displayed for superseded artifacts
- [ ] Archival works and retention policies are enforced
- [ ] Cleanup runs correctly

---

## Phase 5: Integration

**Objective:** Integrate the artifact registry with commands, CLI tools, and workflows.

### 5.1 Command Integration
- [ ] 5.1.1 Add registry to command execution context
  - Initialize ArtifactRegistry in command base class
  - Make available to all commands via `this.registry`
  - Auto-register outputs after command completion

- [ ] 5.1.2 Implement artifact registration hooks
  - `beforeRegister(artifact, metadata)`: validate before registering
  - `afterRegister(artifactId)`: post-registration actions
  - `onSupersede(oldId, newId)`: handle supersession events

- [ ] 5.1.3 Update command templates to use discovery
  - Replace manual file lookups with `this.registry.discover(type, context)`
  - Use `this.registry.getLatest(type)` for latest artifacts
  - Use `this.registry.query(filters)` for complex lookups

- [ ] 5.1.4 Add auto-registration on command completion
  - Detect command outputs (new files created)
  - Extract metadata from outputs
  - Register in artifact registry
  - Display artifact_id to user


### 5.2 CLI Tools
- [ ] 5.2.1 Create `artifact-registry` CLI tool
  - `list [type]`: list all artifacts or filter by type
  - `show <artifact-id>`: show full details of artifact
  - `query --type X --tag Y`: query with filters
  - `dependencies <artifact-id>`: show dependency graph
  - `supersede <old-id> <new-id>`: mark supersession
  - `archive <artifact-id>`: archive artifact
  - `validate`: validate registry integrity

- [ ] 5.2.2 Implement `list` command
  - Display table of artifacts (ID, type, status, created_at)
  - Support filtering by type, status, tag
  - Support sorting by created_at, type
  - Format output as table or JSON

- [ ] 5.2.3 Implement `show` command
  - Display full artifact entry from registry
  - Show metadata, dependencies, consumers
  - Show file path and size
  - Optionally display file content

- [ ] 5.2.4 Implement `query` command
  - Accept filters: --type, --tag, --command, --status, --since
  - Support multiple tags (AND logic)
  - Output as table or JSON
  - Support --limit and --offset

- [ ] 5.2.5 Implement `dependencies` command
  - Build dependency tree for artifact
  - Show upstream dependencies (depends_on)
  - Show downstream consumers (consumed_by)
  - Visualize as ASCII tree or graph

- [ ] 5.2.6 Implement `validate` command
  - Check registry schema validity
  - Verify all referenced files exist
  - Check for orphaned entries (files deleted but in registry)
  - Validate dependency references
  - Report integrity issues


### 5.3 Workflow Integration
- [ ] 5.3.1 Update /plan:batch to use registry
  - Discover inputs from previous tasks using registry
  - Pass artifact IDs instead of file paths
  - Track task dependencies via artifact dependencies
  - Validate inputs exist and not superseded

- [ ] 5.3.2 Add artifact tracking to status.json
  - Record artifact_id for each task output
  - Track input artifacts used by each task
  - Store artifact dependencies in task metadata
  - Enable artifact-based workflow graphs

- [ ] 5.3.3 Implement cross-session artifact references
  - Allow plans to reference artifacts from other sessions
  - Validate artifact still exists and active
  - Warn if artifact superseded since plan creation
  - Track cross-session dependencies


### 5.4 Documentation & Examples
- [ ] 5.4.1 Document artifact registry architecture
  - System overview diagram (layers, components)
  - Discovery flow diagram (layer fallthrough)
  - Lifecycle state machine diagram
  - Dependency graph examples

- [ ] 5.4.2 Create usage guide for commands
  - How to discover artifacts in commands
  - How to register outputs
  - How to handle versioning
  - How to use advanced queries

- [ ] 5.4.3 Document metadata schemas
  - Core metadata fields (all artifacts)
  - Extended metadata fields (optional)
  - Artifact-specific metadata (per type)
  - Validation rules and examples

- [ ] 5.4.4 Create examples for common patterns
  - Discovering latest requirements
  - Querying artifacts by tag
  - Building dependency graphs
  - Superseding artifacts
  - Archival workflows

**VERIFY Phase 5:**
- [ ] Commands use registry and outputs auto-register
- [ ] Discovery replaces manual lookups
- [ ] CLI tools functional and output formatted correctly
- [ ] All commands work as expected
- [ ] Batch workflows use registry
- [ ] Status tracks artifacts and cross-session refs work
- [ ] Documentation complete and examples functional

---

## Phase 6: Testing & Validation

**Objective:** Ensure comprehensive testing and performance benchmarking.

### 6.1 Unit Tests
- [ ] 6.1.1 Test ArtifactRegistry CRUD operations
- [ ] 6.1.2 Test ConventionResolver
- [ ] 6.1.3 Test FilesystemScanner
- [ ] 6.1.4 Test DiscoveryCoordinator
- [ ] 6.1.5 Test ArtifactIndex
- [ ] 6.1.6 Test versioning and lifecycle

### 6.2 Integration Tests

**Tasks:**
- [ ] 6.2.1 Test end-to-end artifact lifecycle
- [ ] 6.2.2 Test cross-command workflows
- [ ] 6.2.3 Test error scenarios

### 6.3 Performance Testing

**Tasks:**
- [ ] 6.3.1 Benchmark discovery operations (registry <5ms, convention <50ms, scan <500ms)
- [ ] 6.3.2 Test with large registries (100, 1000, 10000 artifacts)
- [ ] 6.3.3 Test cache effectiveness (target >70% hit rate)

**VERIFY Phase 6:**
- [ ] All unit tests pass with coverage > 80%
- [ ] Integration tests pass and workflows are functional
- [ ] Errors are handled correctly
- [ ] Performance meets targets
- [ ] Scales to 1000+ artifacts

---

## Success Criteria
- [ ] ArtifactRegistry implements all CRUD operations correctly
- [ ] Hybrid discovery (registry → convention → filesystem) functional
- [ ] In-memory index provides <5ms queries
- [ ] Versioning (semantic) and lifecycle states (draft → deleted) work
- [ ] Commands auto-register outputs and use discovery
- [ ] CLI tools (list, show, query, dependencies, validate) functional
- [ ] /plan:batch integrates with registry for task dependencies
- [ ] Documentation complete with architecture diagrams and examples
- [ ] Unit test coverage > 80%, all integration tests pass
- [ ] Performance benchmarks met (registry <5ms, convention <50ms, scan <500ms)
- [ ] Cache hit rate > 70% in typical workflows
- [ ] Registry validates integrity (no orphaned entries, valid dependencies)

---

## Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Registry corruption | High | Low | JSON validation, backup before write, atomic operations |
| Performance degradation with large registries | Medium | Medium | In-memory indexing, caching, pagination |
| Orphaned artifacts | Medium | Medium | Integrity validation, cleanup job, lifecycle tracking |
| Discovery false positives | Medium | Low | Schema validation, multiple verification layers |
| Cache invalidation issues | Medium | Medium | Event-based invalidation, TTL limits, manual refresh |
