# 9.1 Artifact Discovery Mechanisms

**Analysis Date:** 2025-12-20
**Task:** 9.1 - Analyze artifact discovery mechanisms (how commands find available inputs)
**Status:** Completed

---

## Executive Summary

Artifact discovery—how commands locate and access outputs from upstream commands—is critical for building a cohesive command ecosystem. This analysis examines discovery mechanisms across three primary approaches: **file system discovery**, **registry/manifest discovery**, and **convention-based discovery**. The command system must balance discoverability, performance, and flexibility to enable both automated workflows and manual exploration.

---

## 1. Current Artifact Landscape

### 1.1 Artifact Types Across System

From the architecture review, the system produces artifacts in these categories:

**Plan Execution Artifacts:**
- Plan files (`docs/plans/*.md`) - immutable definitions
- Status tracking (`docs/plan-outputs/{plan}/status.json`)
- Findings documents (`docs/plan-outputs/{plan}/findings/*.md`)
- Timestamp records (`docs/plan-outputs/{plan}/timestamps/*.json`)

**Command Output Artifacts:**
- JSON schemas (requirements, constraints, codebase-maps, architecture-maps)
- Markdown reports (exploration reports, research notes, options analysis)
- Metadata documents (with YAML frontmatter for version, command, status)

**Cross-Session Artifacts:**
- Session state pointers (`.claude/current-plan.txt`, `.claude/current-plan-output.txt`)
- Cache entries (`.claude/cache/` with TTL-based expiration)
- Agent templates (`.claude/templates/agents/`)

### 1.2 Discovery Challenge

Commands need to locate artifacts from:
1. **Previous commands in same workflow** (e.g., /architect needs /explore output)
2. **Different workflows/sessions** (e.g., /implement needs /architect from earlier session)
3. **Optional or alternative inputs** (e.g., /validate can use /test or /review outputs)
4. **Versioned artifacts** (e.g., multiple exploration reports from iterative refinement)

---

## 2. Discovery Mechanism Approaches

### 2.1 File System Discovery

**Pattern:** Scan filesystem directories for artifacts matching conventions.

**How It Works:**
```
/explore command completes
  ↓
Writes: docs/artifacts/discovery/exploration/codebase-map.json
        docs/artifacts/discovery/exploration/architecture-map.json
  ↓
/architect command executes
  ↓
Scans: docs/artifacts/discovery/exploration/
  ↓
Discovers and loads available maps
```

**Advantages:**
- No explicit registration required
- Works across sessions without state
- Natural for filesystem-based projects
- Easy to inspect/debug (just browse directories)
- Supports versioning via timestamped filenames

**Disadvantages:**
- Scanning is inefficient for large codebases (discovery latency)
- No type guarantees without schema validation
- Ambiguous when multiple versions exist (which one to use?)
- Fragile—moving/renaming breaks discovery
- No metadata about artifact relationships
- Requires conventions to prevent collisions

**Implementation Pattern:**
```javascript
// Pseudo-code
async function discoverArtifacts(artifactType) {
  const pattern = `docs/artifacts/*/${artifactType}/**/*.json`;
  const files = glob(pattern);
  const artifacts = [];

  for (const file of files) {
    try {
      const content = JSON.parse(readFileSync(file));
      if (validateSchema(content, artifactType)) {
        artifacts.push({
          path: file,
          timestamp: getMetadata(content).created_at,
          version: getMetadata(content).version,
          ...content
        });
      }
    } catch (e) {
      // Log validation error, continue
    }
  }

  // Return most recent valid artifact
  return artifacts.sort((a, b) =>
    new Date(b.timestamp) - new Date(a.timestamp)
  )[0];
}
```

**Best For:**
- Exploratory workflows where users browse available artifacts
- Integration with IDE/editor file trees
- Simple workflows with few artifact types
- Cross-platform compatibility (no database needed)

### 2.2 Registry/Manifest Discovery

**Pattern:** Maintain explicit registry of all available artifacts with metadata.

**How It Works:**
```
Artifact Producer (e.g., /clarify)
  ↓
Creates: docs/clarify/requirements/feature-x-2025-12-20.json
  ↓
Registers in manifest: docs/.artifact-registry.json
  {
    "artifact_id": "req-feature-x-001",
    "type": "requirements",
    "command": "/clarify:requirements",
    "path": "docs/clarify/requirements/feature-x-2025-12-20.json",
    "created_at": "2025-12-20T10:30:00Z",
    "status": "active",
    "tags": ["feature-x", "p0"],
    "produces_for": ["/architect", "/design"],
    "version": "1.0.0",
    "metadata": {...}
  }
  ↓
Consumer (e.g., /architect)
  ↓
Queries registry: "Give me all 'requirements' artifacts tagged 'feature-x'"
  ↓
Gets list of candidates with full metadata
```

**Registry Schema:**
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Artifact Registry",
  "type": "array",
  "items": {
    "type": "object",
    "required": ["artifact_id", "type", "path", "created_at"],
    "properties": {
      "artifact_id": {
        "type": "string",
        "description": "Unique ID: {type}-{name}-{timestamp-hash}"
      },
      "type": {
        "type": "string",
        "enum": [
          "requirements", "constraints", "scope",
          "exploration-report", "codebase-map", "architecture-map",
          "research-notes", "options-analysis",
          "architecture-design", "component-spec",
          "test-plan", "validation-report"
        ]
      },
      "command": {
        "type": "string",
        "description": "Command that created this: /clarify, /explore, /architect"
      },
      "subcommand": {
        "type": "string",
        "description": "Optional: /clarify:requirements, /explore:dependencies"
      },
      "path": {
        "type": "string",
        "description": "Relative path to artifact file"
      },
      "created_at": {
        "type": "string",
        "format": "date-time"
      },
      "created_by": {
        "type": "string",
        "description": "Command/user that created artifact"
      },
      "status": {
        "type": "string",
        "enum": ["draft", "active", "superseded", "archived"],
        "description": "Lifecycle status"
      },
      "version": {
        "type": "string",
        "description": "Semantic version of artifact type"
      },
      "tags": {
        "type": "array",
        "items": { "type": "string" },
        "description": "For filtering: feature names, priority levels, etc."
      },
      "consumed_by": {
        "type": "array",
        "items": { "type": "string" },
        "description": "Commands that can consume this: ['/architect', '/design']"
      },
      "depends_on": {
        "type": "array",
        "items": { "type": "string" },
        "description": "Upstream artifact IDs required for this artifact"
      },
      "project_context": {
        "type": "object",
        "properties": {
          "project_name": { "type": "string" },
          "feature": { "type": "string" },
          "component": { "type": "string" }
        }
      },
      "content_hash": {
        "type": "string",
        "description": "SHA256 hash of artifact content for deduplication"
      },
      "storage_size_bytes": {
        "type": "integer"
      },
      "metadata": {
        "type": "object",
        "description": "Command-specific metadata (copy of artifact's metadata field)"
      }
    }
  }
}
```

**Advantages:**
- O(1) lookup by artifact ID
- Rich metadata enables smart selection (filtering, sorting, deduplication)
- Automatic dependency tracking
- Lifecycle management (active, superseded, archived)
- Query language support ("latest requirements for feature-x")
- Cross-session artifact linking
- Performance: registry load once, not scan every time

**Disadvantages:**
- Requires maintaining registry consistency (delete file → update registry)
- More complexity in command implementations
- Registry can become stale if not updated
- Centralized bottleneck (but lightweight)
- Requires discipline in registry discipline

**Implementation Pattern:**
```javascript
// Pseudo-code
class ArtifactRegistry {
  constructor() {
    this.registryPath = 'docs/.artifact-registry.json';
    this.registry = this.load();
  }

  register(artifact, metadata) {
    const entry = {
      artifact_id: this.generateId(artifact),
      type: artifact.metadata.artifact_type,
      command: artifact.metadata.command,
      path: artifact.path,
      created_at: new Date().toISOString(),
      status: 'active',
      version: artifact.metadata.version,
      tags: metadata.tags || [],
      consumed_by: metadata.consumed_by || [],
      depends_on: metadata.depends_on || [],
      content_hash: hashContent(artifact)
    };

    this.registry.push(entry);
    this.save();
    return entry.artifact_id;
  }

  query(type, filters = {}) {
    return this.registry
      .filter(e => e.type === type && e.status === 'active')
      .filter(e => !filters.tags ||
        filters.tags.every(t => e.tags.includes(t)))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  queryById(artifactId) {
    return this.registry.find(e => e.artifact_id === artifactId);
  }

  markSuperseded(oldId, newId) {
    this.registry.find(e => e.artifact_id === oldId).status = 'superseded';
    this.registry.find(e => e.artifact_id === newId).supersedes = oldId;
    this.save();
  }

  getGraph() {
    // Build dependency graph for visualization
    return buildDependencyGraph(this.registry);
  }
}
```

**Best For:**
- Production systems requiring reliability
- Workflows with many interdependent artifacts
- Systems requiring artifact versioning and lifecycle
- Integration with higher-level tools (workflow engines, DAGs)
- Cross-project artifact sharing

### 2.3 Convention-Based Discovery

**Pattern:** Use predictable file paths based on command/context conventions.

**How It Works:**
```
Conventions:
1. {command}/{subcommand}/{project-name}-{date}.{ext}
2. docs/artifacts/{category}/{type}/{name}.{ext}
3. docs/plan-outputs/{plan-name}/findings/{task-id}.md

Example flow:
/architect needs requirements from /clarify
  ↓
Looks for: docs/clarify/requirements/*-*.json
          (ordered by date, most recent first)
  ↓
Falls back to: docs/artifacts/requirements/*-*.json
  ↓
Falls back to: {current-plan}/findings/*requirements*.md
```

**Naming Conventions:**
```
{command}/{subcommand}/
├── {feature-name}-{YYYY-MM-DD}.json    (timestamped)
├── {feature-name}-latest.json          (symlink or copy)
└── {feature-name}-v{version}.json      (versioned)

docs/artifacts/
├── {type}/
│   ├── {context}/
│   │   ├── latest/                     (pointer to latest)
│   │   ├── {name}-{timestamp}.json
│   │   └── {name}-{timestamp}.json
```

**Advantages:**
- No registry to maintain
- Self-documenting (path tells you what it is)
- Works offline/locally
- Minimal code overhead
- Natural for developers (familiar directory structure)

**Disadvantages:**
- Ambiguous when multiple versions exist
- Harder to express dependencies
- No metadata without parsing file
- Requires strict naming discipline
- Not suitable for queries ("give me all requirements for feature X")

**Implementation Pattern:**
```javascript
// Pseudo-code
async function discoverByConvention(command, subcommand, context = {}) {
  const paths = [
    // Most specific first
    `docs/${command}/${subcommand}/${context.feature}-latest.json`,
    `docs/${command}/${subcommand}/${context.feature}-*.json`,
    // Generic fallback
    `docs/artifacts/${subcommand}/${context.feature}-*.json`,
    `docs/artifacts/${subcommand}/*-latest.json`,
  ];

  for (const pattern of paths) {
    const matches = glob(pattern).sort().reverse(); // newest first
    if (matches.length > 0) {
      const artifact = JSON.parse(readFileSync(matches[0]));
      if (validateSchema(artifact)) {
        return { path: matches[0], ...artifact };
      }
    }
  }

  throw new Error(`No artifact found for ${command}/${subcommand}`);
}
```

**Best For:**
- Simple workflows (few artifact types)
- Development/prototype systems
- Scenarios where developers inspect artifacts manually
- Single-session workflows

---

## 3. Hybrid Discovery Strategy

The most robust system combines all three approaches in a layered discovery stack:

### 3.1 Discovery Pipeline

```
Query: "Give me requirements for feature-x"

Layer 1: REGISTRY LOOKUP (Fast, explicit)
  if artifact_registry.json exists:
    query by (type='requirements', tag='feature-x')
    ↓
    Found? → Return with full metadata
    ↓
    Not found? → Continue

Layer 2: CONVENTION-BASED (Moderate speed)
  Try standard paths in order:
    docs/clarify/requirements/feature-x-latest.json
    docs/clarify/requirements/feature-x-*.json
    docs/artifacts/requirements/feature-x-*.json
  ↓
  Found valid? → Return
  ↓
  Not found? → Continue

Layer 3: FILESYSTEM SCAN (Slow, fallback)
  glob: docs/**/*requirements*.json
  validate & sort by timestamp
  ↓
  Found valid? → Return
  ↓
  Return: null (with helpful error message)
```

### 3.2 Discovery Configuration

```json
{
  "artifact_discovery": {
    "default_mode": "hybrid",
    "modes": {
      "strict": {
        "layers": ["registry"],
        "fail_if_not_found": true
      },
      "fast": {
        "layers": ["registry", "convention"],
        "cache_registry": true,
        "cache_ttl_seconds": 300
      },
      "thorough": {
        "layers": ["registry", "convention", "filesystem"],
        "validate_all": true,
        "return_all_matches": true
      },
      "hybrid": {
        "layers": ["registry", "convention"],
        "fallback_to_filesystem": true,
        "cache_registry": true
      }
    },
    "conventions": {
      "path_patterns": {
        "clarify": "docs/clarify/{subcommand}/{name}-{date}.json",
        "explore": "docs/artifacts/discovery/{type}/{name}-{date}.json",
        "architect": "docs/artifacts/design/{type}/{name}-{date}.json"
      },
      "latest_link": true,
      "date_format": "YYYY-MM-DD"
    }
  }
}
```

---

## 4. Artifact Metadata for Discoverability

All artifacts should include standardized metadata enabling discovery:

### 4.1 Core Metadata Schema

```json
{
  "metadata": {
    "artifact_type": "string (REQUIRED)",
    "command": "string (REQUIRED) - /clarify, /explore, etc.",
    "subcommand": "string (OPTIONAL) - /clarify:requirements",
    "version": "string (REQUIRED) - semantic version",
    "created_at": "ISO-8601 timestamp (REQUIRED)",
    "updated_at": "ISO-8601 timestamp (OPTIONAL)",
    "created_by": "string - model identifier or user",
    "status": "enum: draft|in-review|approved|active|deprecated",
    "generated_by": "string - Claude model ID",

    "context": {
      "project": "string",
      "feature": "string",
      "component": "string",
      "workflow_id": "string"
    },

    "related_artifacts": [
      {
        "artifact_type": "requirements",
        "relationship": "prerequisite|produces|consumes|supersedes",
        "artifact_id": "req-feature-x-001",
        "path": "docs/clarify/requirements/feature-x-2025-12-20.json"
      }
    ],

    "tags": ["feature-x", "p0", "backend"],
    "confidence": 0.85,
    "completeness": 0.90,

    "consumable_by": ["/architect", "/design", "/implement"],
    "dependencies": ["req-feature-x-001"],

    "lifecycle": {
      "created_at": "ISO timestamp",
      "superseded_by": "artifact-id",
      "archived_at": "ISO timestamp",
      "retention_policy": "permanent|annual"
    }
  }
}
```

### 4.2 Discoverable by These Fields

**Metadata enables queries like:**
- "Give me latest `requirements` artifact"
- "Get all artifacts for `feature-x`"
- "Show artifacts produced by `/clarify` subcommand"
- "List artifacts that can feed `/architect`"
- "Find superseded requirements"
- "Search by confidence > 0.8"
- "Get artifacts created in last 7 days"

---

## 5. Indexing Strategy

### 5.1 In-Memory Index

For interactive commands that need fast discovery:

```javascript
class ArtifactIndex {
  constructor() {
    this.byType = new Map();        // artifact_type → [entries]
    this.byCommand = new Map();     // command → [entries]
    this.byId = new Map();          // artifact_id → entry
    this.byTag = new Map();         // tag → [entries]
    this.byTimestamp = [];          // sorted by timestamp
    this.lastUpdated = null;
  }

  build() {
    const registry = this.loadRegistry();

    for (const entry of registry) {
      // Index by type
      if (!this.byType.has(entry.type)) {
        this.byType.set(entry.type, []);
      }
      this.byType.get(entry.type).push(entry);

      // Index by command
      if (!this.byCommand.has(entry.command)) {
        this.byCommand.set(entry.command, []);
      }
      this.byCommand.get(entry.command).push(entry);

      // Index by ID
      this.byId.set(entry.artifact_id, entry);

      // Index by tags
      for (const tag of entry.tags) {
        if (!this.byTag.has(tag)) {
          this.byTag.set(tag, []);
        }
        this.byTag.get(tag).push(entry);
      }
    }

    // Sort by timestamp for range queries
    this.byTimestamp = Array.from(this.byId.values())
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    this.lastUpdated = Date.now();
  }

  query(filters) {
    let results = this.byTimestamp;

    if (filters.type) {
      results = this.byType.get(filters.type) || [];
    }

    if (filters.command) {
      results = results.filter(e => e.command === filters.command);
    }

    if (filters.tags && filters.tags.length > 0) {
      results = results.filter(e =>
        filters.tags.every(t => e.tags.includes(t))
      );
    }

    if (filters.status) {
      results = results.filter(e => e.status === filters.status);
    }

    if (filters.since) {
      const since = new Date(filters.since);
      results = results.filter(e => new Date(e.created_at) > since);
    }

    return results.slice(0, filters.limit || 10);
  }

  refresh(maxAgeSecs = 60) {
    if (!this.lastUpdated ||
        Date.now() - this.lastUpdated > maxAgeSecs * 1000) {
      this.build();
    }
  }
}
```

### 5.2 Query Patterns

```javascript
// Latest requirement
index.query({ type: 'requirements', limit: 1 });

// All artifacts for feature-x
index.query({ tags: ['feature-x'] });

// Artifacts that /architect consumes
index.query({ consumed_by: '/architect', status: 'active' });

// Recent changes (last 24 hours)
index.query({
  since: new Date(Date.now() - 24 * 3600 * 1000).toISOString()
});

// Multiple constraints
index.query({
  type: 'architecture-design',
  tags: ['feature-x'],
  status: 'active',
  limit: 5
});
```

---

## 6. Versioning & Artifact Lifecycle

### 6.1 Version Management

**Artifact Versions:**
- **MAJOR:** Breaking changes to artifact structure/format
- **MINOR:** Backward-compatible additions
- **PATCH:** Clarifications and non-structural fixes

**Supersession Rules:**
```json
{
  "old_artifact": {
    "artifact_id": "req-feature-x-v1.0.0",
    "status": "superseded",
    "superseded_by": "req-feature-x-v1.1.0"
  },
  "new_artifact": {
    "artifact_id": "req-feature-x-v1.1.0",
    "status": "active",
    "supersedes": "req-feature-x-v1.0.0"
  }
}
```

### 6.2 Artifact Lifecycle States

```
Draft
  ↓
In-Review (waiting for approval)
  ↓
Approved
  ↓
Active (currently in use)
  ↓
Superseded (replaced by newer version)
  ↓
Archived (kept for history, not recommended)
  ↓
Deleted (removed entirely)
```

### 6.3 Cross-Session Artifact References

For artifacts used across sessions:

```json
{
  "session_reference": {
    "session_id": "session-20251220-clarify-001",
    "artifact_id": "req-feature-x-v1.0.0",
    "reference_path": "docs/clarify/requirements/feature-x-2025-12-20.json",
    "imported_at": "2025-12-20T14:30:00Z",
    "last_verified": "2025-12-20T14:30:00Z",
    "confidence": "verified"
  }
}
```

---

## 7. Discovery Use Cases

### 7.1 Interactive Command: /architect

```
User runs: /architect build-auth-system

Discovery sequence:
1. Query registry: "What requirements exist for build-auth-system?"
2. If multiple: Present choices (latest version, active status, etc.)
3. Load: docs/clarify/requirements/build-auth-system-v1.0.0.json
4. Also query: "What exploration exists for this feature?"
5. Load: docs/explore/exploration-report/build-auth-system-2025-12-20.json
6. Build conversation context from loaded artifacts
7. Start /architect command with this context
```

### 7.2 Batch Workflow: /plan:batch

```
Plan specifies:
- Task 4.1: /clarify:requirements for feature-x
- Task 4.2: /explore:codebase given feature-x requirements
- Task 5.1: /architect:design using requirements + exploration

Discovery for Task 5.1:
1. Look up artifact_id from Task 4.1 output
2. Verify artifact still exists and not superseded
3. Look up artifact_id from Task 4.2 output
4. Pass both to /architect as inputs
5. Record dependencies in status.json:
   - task 5.1 depends on tasks 4.1, 4.2
   - if 4.1 superseded, flag for review
```

### 7.3 Conditional Workflow

```
If /validate produces errors:
  Run /fix on high-severity errors
  Re-run /validate
Else:
  Proceed to /release

Discovery for conditional:
1. Query /validate output for error list
2. Check error.severity field
3. If severity in ['critical', 'high']:
   - Discover error artifacts
   - Pass to /fix
   - Continue loop
4. Else:
   - Discover latest /release-ready artifact
   - Feed to /release
```

### 7.4 Manual Exploration

```
User wants to understand project:
  /explore [project-path]
    → discover existing exploration reports
    → show summary of codebase structure
    → offer option to drill into components

User asks: "Show me architecture diagram"
    → query registry for "architecture-design" artifacts
    → filter by same project
    → display most recent approved version
```

---

## 8. Error Handling & Fallback

### 8.1 Discovery Failures

```javascript
async function discoverWithFallback(type, context) {
  const strategies = [
    () => queryRegistry(type, context),
    () => discoverByConvention(type, context),
    () => filesystemScan(type, context)
  ];

  for (const strategy of strategies) {
    try {
      const result = await strategy();
      if (result && validateSchema(result, type)) {
        return result;
      }
    } catch (e) {
      logWarning(`Discovery strategy failed: ${e.message}`);
      continue;
    }
  }

  // All strategies exhausted
  return {
    found: false,
    tried: [
      "Registry lookup - no matching entries",
      "Convention paths - files not found",
      "Filesystem scan - no valid artifacts"
    ],
    suggestions: [
      `Run: /clarify:${type}`,
      `Check docs/${type}/ directory`,
      `Verify artifact wasn't archived`
    ]
  };
}
```

### 8.2 Validation & Integrity

```javascript
function validateArtifactIntegrity(artifact) {
  const issues = [];

  // Check metadata completeness
  if (!artifact.metadata.artifact_type) {
    issues.push("Missing artifact_type");
  }
  if (!artifact.metadata.created_at) {
    issues.push("Missing created_at");
  }

  // Validate against schema
  const schema = getSchema(artifact.metadata.artifact_type);
  if (!ajv.validate(schema, artifact)) {
    issues.push(`Schema validation failed: ${ajv.errorsText()}`);
  }

  // Check dependency integrity
  for (const dep of artifact.metadata.dependencies || []) {
    const depArtifact = registry.queryById(dep);
    if (!depArtifact) {
      issues.push(`Dependency not found: ${dep}`);
    } else if (depArtifact.status === 'superseded') {
      issues.push(`Dependency superseded: ${dep}`);
    }
  }

  return {
    valid: issues.length === 0,
    issues
  };
}
```

---

## 9. Performance Considerations

### 9.1 Caching Strategy

```javascript
class DiscoveryCache {
  constructor(ttlSeconds = 300) {
    this.cache = new Map();
    this.ttl = ttlSeconds * 1000;
  }

  set(key, value) {
    this.cache.set(key, {
      value,
      expires: Date.now() + this.ttl
    });
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  invalidate(pattern) {
    // Invalidate entries matching pattern (e.g., "requirements:*")
    for (const [key] of this.cache) {
      if (key.match(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}

// Usage
const discoveryCache = new DiscoveryCache(300); // 5 min TTL

async function discoverCached(type, context) {
  const cacheKey = `${type}:${JSON.stringify(context)}`;

  const cached = discoveryCache.get(cacheKey);
  if (cached) return cached;

  const result = await discover(type, context);
  discoveryCache.set(cacheKey, result);
  return result;
}
```

### 9.2 Performance Benchmarks

**Expected performance (with caching):**
- Registry lookup: ~1-5ms
- Convention discovery: ~10-50ms
- Filesystem scan: ~100-500ms (depending on tree size)
- Index query: ~1ms

**Optimization:**
- Lazy load registry (parse on first query, cache)
- Use glob patterns efficiently (avoid recursive scans)
- Implement LRU cache for top-N queries
- Pre-build index at workflow start time

---

## 10. Recommended Hybrid Implementation

### 10.1 Architecture Diagram

```
Command requests artifact
    ↓
┌─────────────────────────────────────┐
│   Discovery Coordinator             │
└─────────────────────────────────────┘
    ↓
    ├→ Layer 1: Registry Query
    │    └→ ArtifactRegistry.query()
    │       └→ ArtifactIndex.query()
    │           └→ In-memory index
    │
    ├→ Layer 2: Convention Check
    │    └→ ConventionResolver.resolve()
    │       └→ Standard paths (feature-latest, timestamped)
    │
    └→ Layer 3: Filesystem Scan
         └→ FilesystemScanner.scan()
            └→ Glob patterns + validation

Result:
  ├─ Found: Return artifact + metadata
  └─ Not found: Error with suggestions
```

### 10.2 Key Components

**ArtifactRegistry**
- Loads `.artifact-registry.json` once
- Provides query API
- Maintains consistency

**ConventionResolver**
- Scans standard paths
- Respects naming conventions
- Returns most recent valid match

**FilesystemScanner**
- Fallback for unexpected locations
- Validates schema before returning
- Logs what it finds

**DiscoveryCache**
- Caches results with TTL
- Invalidated on new artifact registration
- Significantly improves performance

**ArtifactIndex**
- In-memory index for fast queries
- Refreshes when registry updates
- Supports rich query syntax

### 10.3 Configuration Example

```yaml
# .claude/discovery-config.yml

discovery:
  mode: hybrid

  layers:
    - name: registry
      enabled: true
      timeout_ms: 50

    - name: convention
      enabled: true
      patterns:
        - "docs/{command}/{subcommand}/{name}-latest.{ext}"
        - "docs/{command}/{subcommand}/{name}-*.{ext}"
        - "docs/artifacts/{category}/{type}/{name}-*.{ext}"
      timeout_ms: 100

    - name: filesystem
      enabled: true
      fallback_only: true
      patterns:
        - "docs/**/*{type}*.json"
        - "docs/**/*{type}*.md"
      timeout_ms: 500

  caching:
    enabled: true
    ttl_seconds: 300
    strategies:
      - lru_size: 1000
      - by_query_frequency

  validation:
    require_schema: true
    require_metadata: true
    required_fields:
      - artifact_type
      - created_at
      - metadata.version

  versioning:
    use_latest_by_default: true
    allow_superseded: false
    allow_deprecated: false
```

---

## 11. Implementation Roadmap

### Phase 1: Foundation (2-3 days)
1. Define artifact metadata schema (all artifact types)
2. Implement ArtifactRegistry + Registry query API
3. Implement ConventionResolver with standard paths
4. Add metadata to existing artifact producers

### Phase 2: Integration (3-4 days)
1. Build DiscoveryCoordinator with layer fallthrough
2. Integrate registry into command execution context
3. Implement DiscoveryCache
4. Add discovery helpers to command templates

### Phase 3: Enhancement (2-3 days)
1. Build ArtifactIndex for fast queries
2. Implement dependency tracking in registry
3. Add lifecycle management (supersede, archive)
4. Build artifact discovery CLI tools

### Phase 4: Operations (1-2 days)
1. Implement registry maintenance tools (cleanup, verify)
2. Add monitoring for discovery failures
3. Document discovery patterns
4. Create discovery debugging tools

---

## 12. Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Primary Method** | Hybrid (registry + convention + filesystem) | Balanced performance, reliability, flexibility |
| **Registry Location** | `docs/.artifact-registry.json` | Centralized, version-controlled, discoverable |
| **Metadata in Artifacts** | Yes (all artifacts include metadata) | Self-describing, schema validation, discoverability |
| **Versioning Strategy** | Semantic versioning | Standard, well-understood |
| **Caching Strategy** | TTL-based with invalidation on register | Fast queries, eventual consistency |
| **Failure Handling** | Fail with suggestions, not silently | Better developer experience, easier debugging |
| **Dependencies** | Registry tracks relationships | Enables workflow DAGs, impact analysis |
| **Lifecycle** | 5 states (draft → active → superseded → archived → deleted) | Clear artifact evolution, auditability |

---

## 13. Conclusion

A well-designed artifact discovery system is foundational for an effective command ecosystem. The recommended hybrid approach:

1. **Provides fast, reliable discovery** via registry lookups
2. **Maintains simplicity** through naming conventions
3. **Offers flexibility** with filesystem fallback
4. **Enables rich features** like versioning and dependency tracking
5. **Scales** from simple workflows to complex multi-phase systems

The key is **convention + explicit metadata + indexed lookup**, which together enable commands to discover and compose artifacts efficiently while maintaining clarity and reliability.

---

## Appendix: Related Artifact Types

**Discovery Mechanisms Relevant To:**
- Task 9.2: Artifact compatibility patterns (what feeds what)
- Task 9.3: Workflow state tracking (registry enables cross-session state)
- Task 9.4-9.10: Workflow patterns (discovery enables all of them)
- Task 10: Agent design (agents need to discover inputs)
- Task 11: Implementation roadmap (discovery is foundational)
