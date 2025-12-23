# Commands Scan - CLI Workflow System

**Scan Date:** 2025-12-20
**Location:** `.claude/commands/`
**Total Commands Found:** 11 commands (all under `plan` namespace)

---

## Command Organization

The system currently has one command namespace:

- **`plan/`** - Project planning and workflow management commands

All commands are structured as markdown documentation files that define Claude's behavior when invoked.

---

## Command Inventory

### 1. plan:explain

**File:** `.claude/commands/plan/explain.md`

**Purpose:** Explain what task(s) involve without implementing them

**Description:**
Provides detailed explanations of plan tasks without executing them. This is a read-only operation that helps users understand what a task entails before committing to implementation.

**Key Features:**
- Loads active plan and presents incomplete tasks for selection
- Multi-select interface with status indicators (pending/in_progress/completed/failed/skipped)
- For each task, provides:
  - Summary (1-2 sentence overview)
  - Context (why it exists, what problem it solves)
  - Scope (files affected, complexity estimate)
  - Approach (high-level implementation steps)
  - Dependencies (prerequisites and external dependencies)
  - Verification (how to confirm completion)
  - Current status (if status tracking exists)
  - Existing findings (preview of recorded analysis)
- Integrates with status-manager for enhanced explanations
- Offers to implement tasks after explanation

**Integration:**
- Uses `getStatus()`, `getTaskStatus()`, `readFindings()` from status-manager
- Works with both markdown-based and status.json-tracked plans

---

### 2. plan:templates

**File:** `.claude/commands/plan/templates.md`

**Purpose:** Display available plan templates with their purpose and required variables

**Description:**
Lists all available plan templates from the `docs/plan-templates/` directory with metadata and usage information.

**Key Features:**
- Scans template directory for `.md` files
- Extracts template metadata:
  - Title and purpose
  - Required variables
  - Phase count
- Displays formatted table of templates
- Optional detailed view for specific template
- Shows example usage and sample plan names

**Output Modes:**
- **Default:** Summary table of all templates
- **With argument:** Detailed view of specific template (e.g., `/plan:templates analysis`)

---

### 3. plan:status

**File:** `.claude/commands/plan/status.md`

**Purpose:** Show progress summary for the active plan

**Description:**
Displays comprehensive status overview of the current plan with progress tracking, phase breakdown, and suggested next actions.

**Key Features:**
- Loads active plan and checks for status tracking
- Two modes:
  - **With status.json:** Enhanced display with run history, timing, execution details
  - **Without status.json:** Fallback to parsing markdown checkboxes
- Progress visualization with progress bars
- Phase-by-phase breakdown with completion percentages
- Success criteria tracking (if present in plan)
- Recent activity log
- Next action suggestions based on current state

---

### 4. plan:batch

**File:** `.claude/commands/plan/batch.md`

**Purpose:** Select multiple tasks for batch/parallel execution with detailed preview and progress tracking

**Description:**
Enables efficient execution of multiple plan tasks with intelligent parallelization and dependency management.

**Key Features:**
- Multi-select interface with quick-select options
- Intelligent execution planning (groups by phase, detects dependencies)
- Execution preview with visual diagram
- Real-time progress tracking during execution
- **Read-only agent pattern:** Agents return content; main conversation writes files
- Continuous progress saving
- Failure handling with skip/continue/abort options
- Final summary with timing statistics

---

### 5. plan:split

**File:** `.claude/commands/plan/split.md`

**Purpose:** Break a large task into smaller, more manageable subtasks

**Key Features:**
- Identifies splittable tasks (CRITICAL, large scope)
- Analyzes task content to propose logical subtask breakdown
- Uses nested numbering (e.g., 1.1 → 1.1.1, 1.1.2, 1.1.3)
- Updates plan file with subtasks

---

### 6. plan:implement

**File:** `.claude/commands/plan/implement.md`

**Purpose:** Implement one or more tasks from the active plan

**Key Features:**
- Multi-select task interface
- Template variable detection and substitution
- Intelligent execution strategy (parallel/sequential)
- Run tracking with status management
- Findings recording for analysis tasks

---

### 7. plan:verify

**File:** `.claude/commands/plan/verify.md`

**Purpose:** Check if task(s) are still needed, already done, blocked, or obsolete

**Key Features:**
- Batch file verification using `scripts/check-file-status.js`
- Four verification statuses: ALREADY DONE, NEEDED, BLOCKED, OBSOLETE
- Template success criteria verification
- Auto-mark options to update status.json

---

### 8. plan:archive

**File:** `.claude/commands/plan/archive.md`

**Purpose:** View and manage archived plans in `docs/completed plans/`

**Key Features:**
- Scans completed plans directory
- Displays archive summary with completion percentages
- Optional migration to output-separated format
- Non-destructive operations

---

### 9. plan:set

**File:** `.claude/commands/plan/set.md`

**Purpose:** Set the current working plan file for subsequent `/plan:*` commands

**Key Features:**
- Scans available plans
- Writes selection to `.claude/current-plan.txt`
- Initializes status tracking structure
- Shows plan summary with phases and progress

---

### 10. plan:migrate

**File:** `.claude/commands/plan/migrate.md`

**Purpose:** Migrate an old plan with inline checkmarks to the new output-separated format

**Key Features:**
- Parses markdown to extract completed/pending tasks
- Initializes status tracking structure
- Marks completed tasks in status.json
- Optional plan file cleanup
- Batch migration support

---

### 11. plan:create

**File:** `.claude/commands/plan/create.md`

**Purpose:** Create a new plan file from a template with variable substitution

**Key Features:**
- Scans templates for available options
- Interactive template selection
- Variable value collection with auto-fill support
- Auto-activation as current plan
- Output directory initialization

---

## Summary Statistics

- **Total Commands:** 11
- **Command Namespaces:** 1 (plan)
- **Status Manager Integration:** 8 commands
- **Read Operations:** 3 (explain, templates, status)
- **Write Operations:** 6 (implement, batch, split, verify, migrate, create)
- **Management Operations:** 2 (set, archive)

---

## Architecture Insights

### Separation of Concerns

- **Plan creation/management:** create, set, archive
- **Plan analysis:** explain, status, verify, templates
- **Plan execution:** implement, batch
- **Plan modification:** split, migrate

### Workflow Integration

1. **Create:** `plan:templates` → `plan:create`
2. **Activate:** `plan:set` (auto-initializes status tracking)
3. **Analyze:** `plan:status` → `plan:explain` → `plan:verify`
4. **Execute:** `plan:implement` or `plan:batch`
5. **Manage:** `plan:migrate`, `plan:split`, `plan:archive`
