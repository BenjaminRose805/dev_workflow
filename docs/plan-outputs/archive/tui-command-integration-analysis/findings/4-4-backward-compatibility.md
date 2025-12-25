# Task 4.4: Backward Compatibility Analysis

## Overview

This document analyzes the backward compatibility impact of the proposed TUI enhancements, verifying that existing scripts and workflows continue to work without modification.

---

## Executive Summary

| Area | Verdict | Risk Level | Mitigation Required |
|------|---------|------------|---------------------|
| CLI Interface | **COMPATIBLE** | None | No |
| JSON Output | **COMPATIBLE** | Low | Yes (minor) |
| TUI Modes | **COMPATIBLE** | None | No |
| Terminal Size | **NEEDS_MITIGATION** | Medium | Yes |
| Configuration | **COMPATIBLE** | Low | Yes |
| Migration Path | **COMPATIBLE** | None | No |

**Overall Assessment: HIGH COMPATIBILITY** - All proposed changes are additive and non-breaking. Minor mitigations needed for terminal size and configuration defaults.

---

## 1. CLI Interface Compatibility

### Current State

**status-cli.js commands:**
```bash
node scripts/status-cli.js status
node scripts/status-cli.js mark-started TASK_ID
node scripts/status-cli.js mark-complete TASK_ID
node scripts/status-cli.js next [count]
node scripts/status-cli.js progress
# ... 12 more commands
```

**plan-orchestrator.js commands:**
```bash
node scripts/plan-orchestrator.js status
node scripts/plan-orchestrator.js next [count]
node scripts/plan-orchestrator.js check TASK_ID
node scripts/plan-orchestrator.js phases
```

### Proposed Changes

**New commands (additive):**
```bash
node scripts/status-cli.js dependencies TASK_ID
node scripts/status-cli.js findings TASK_ID
node scripts/status-cli.js runs
```

**Modified commands:**
None - all existing commands retain exact same interface

### Verdict: **COMPATIBLE**

**Reasoning:**
- All new commands are additions, not modifications
- Existing command signatures unchanged
- No positional argument changes
- No removed commands
- No renamed commands

**Evidence from current code:**
```javascript
// status-cli.js:688 - Command dispatcher
switch (command) {
    case 'status':
        cmdStatus(planPath);
        break;
    case 'mark-started':
        cmdMarkStarted(planPath, positional[0]);
        break;
    // ...existing commands remain unchanged
```

**Impact:** Zero - scripts using current commands will continue to work

**Test Case:**
```bash
# Before: Works
node scripts/status-cli.js status | jq '.summary.completed'

# After proposal: Still works identically
node scripts/status-cli.js status | jq '.summary.completed'

# New feature (additive):
node scripts/status-cli.js dependencies 2.1
```

---

## 2. JSON Output Compatibility

### Current Output Schemas

**status-cli.js status:**
```json
{
  "planPath": "...",
  "planName": "...",
  "currentPhase": "...",
  "lastUpdatedAt": "...",
  "summary": {
    "totalTasks": 30,
    "completed": 12,
    "pending": 15,
    "in_progress": 1,
    "failed": 2,
    "skipped": 0
  },
  "tasks": [
    {
      "id": "1.1",
      "phase": "Phase 1: ...",
      "description": "...",
      "status": "completed"
    }
  ]
}
```

### Proposed Enhancements

**Enhanced status output (from 3-2-command-tui-data-contracts.md):**
```json
{
  "planPath": "...",
  "planName": "...",
  "currentPhase": "...",
  "lastUpdatedAt": "...",
  "summary": {
    "totalTasks": 30,
    "completed": 12,
    "pending": 15,
    "in_progress": 1,
    "failed": 2,
    "skipped": 0
  },
  "tasks": [...],

  "phases": [              // NEW - additive
    {
      "number": 1,
      "title": "Discovery",
      "total": 5,
      "completed": 5,
      "percentage": 100,
      "status": "completed",
      "hasVerify": true,
      "verifyStatus": "completed"
    }
  ],

  "currentRun": {          // NEW - additive
    "runId": "run-001",
    "startedAt": "...",
    "tasksCompletedThisRun": 3,
    "tasksFailedThisRun": 0,
    "elapsedSeconds": 120
  }
}
```

**Enhanced task output:**
```json
{
  "id": "2.1",
  "phase": "Phase 2: Analysis",
  "phaseNumber": 2,
  "description": "...",
  "status": "in_progress",
  "startedAt": "...",

  "retryCount": 1,         // NEW - additive
  "maxRetries": 3,         // NEW - additive
  "retryErrors": [         // NEW - additive
    {
      "attempt": 1,
      "error": "Timeout",
      "timestamp": "..."
    }
  ],

  "blockedBy": ["1.5"],    // NEW - additive
  "blocks": ["3.1"],       // NEW - additive
  "canStart": false,       // NEW - additive

  "hasFinding": true,      // NEW - additive
  "findingPath": "..."     // NEW - additive
}
```

### Verdict: **COMPATIBLE**

**Reasoning:**
- All new fields are **additive only**
- No existing fields removed
- No existing field types changed
- Existing parsers will ignore unknown fields (JSON standard behavior)

**Compatibility Matrix:**

| Parser Type | Behavior | Compatible? |
|-------------|----------|-------------|
| `jq '.summary.completed'` | Extracts existing field | ✅ Yes |
| `JSON.parse()` + access | Ignores new fields | ✅ Yes |
| `jq '.tasks[] \| select(.status == "pending")'` | Works unchanged | ✅ Yes |
| `jq '.phases[]'` | New field, existing scripts won't use | ✅ Yes |

**Potential Issue: Non-strict parsers expecting exact schema**

If any scripts use strict schema validation:
```javascript
// This WOULD break if validating strictly
const schema = {
  required: ['planPath', 'planName', 'summary', 'tasks'],
  additionalProperties: false  // ❌ This would fail
};
```

**Mitigation:**
- Document that parsers should use `additionalProperties: true`
- Add version field to output for schema-aware parsers:
  ```json
  {
    "schemaVersion": "1.1",  // NEW
    "planPath": "...",
    ...
  }
  ```

**Risk Level:** Low - most JSON parsers are permissive by default

---

## 3. TUI Mode Compatibility

### Current TUI Behavior

**From plan_orchestrator.py:**
```python
# Line 1389: --no-tui flag
parser.add_argument(
    "--no-tui",
    action="store_true",
    help="Disable Rich TUI (use plain text output)",
)

# Line 795: use_tui parameter
self.use_tui = use_tui and RICH_AVAILABLE

# Lines 1089-1090: Fallback to plain mode
if not self.use_tui:
    self.print_header(status)
```

**Current modes:**
1. **TUI mode** (`--no-tui` not set) - Rich interactive display
2. **Plain mode** (`--no-tui` set) - Text output with progress bars

### Proposed Changes

**New interaction modes (from 3-3-keyboard-navigation-command-palette.md):**
1. **TUI with keyboard** - Interactive navigation, command palette
2. **TUI read-only** - Existing behavior (no keyboard input)
3. **Plain mode** - Unchanged

**Keyboard handler activation (proposed):**
```python
# New optional flag
parser.add_argument(
    "--interactive",
    action="store_true",
    help="Enable keyboard navigation (TUI mode only)",
)

# In TUI initialization
if self.use_tui and args.interactive:
    self.keyboard = TUIKeyboardController(self.tui, self)
    self.keyboard.start()
```

### Verdict: **COMPATIBLE**

**Reasoning:**
- Keyboard input is **opt-in** via new `--interactive` flag
- Default behavior unchanged: TUI is read-only (display-only)
- `--no-tui` flag continues to work exactly as before
- No changes to plain text output mode

**Behavior Matrix:**

| Flags | Current Behavior | Proposed Behavior | Compatible? |
|-------|------------------|-------------------|-------------|
| (none) | TUI display-only | TUI display-only | ✅ Yes |
| `--no-tui` | Plain text | Plain text | ✅ Yes |
| `--interactive` | N/A | TUI with keyboard | ✅ Yes (new) |
| `--no-tui --interactive` | N/A | Ignored (conflict) | ✅ Yes |

**Alternative: Auto-detect TTY**
Could enable keyboard automatically when interactive terminal detected:
```python
if self.use_tui and sys.stdin.isatty():
    self.keyboard = TUIKeyboardController(...)
```

**Risk:** May break automation that expects no input prompts

**Recommendation:** Use explicit `--interactive` flag for safety

---

## 4. Terminal Size Compatibility

### Current Minimum Terminal Size

**From plan_orchestrator.py layout:**
```python
# Line 499-505: Current layout
layout.split(
    Layout(name="header", size=5),
    Layout(name="progress", size=3),
    Layout(name="activity", size=10),
    Layout(name="tasks", size=8),
    Layout(name="footer", size=2)
)
# Total: 5 + 3 + 10 + 8 + 2 = 28 rows
```

**Minimum usable:** 30 rows x 80 columns (standard terminal)

### Proposed Extended Layout

**From 3-1-tui-panel-extensions-design.md:**
```
header (4 rows)
progress + phase_detail (4 rows)
activity (8 rows) | dependency_graph (8 rows)
in_progress (6 rows) | upcoming (6 rows)
completions (5 rows) | run_history (5 rows)
footer (2 rows)
Total: ~38 rows
```

**Minimum required:** 40+ rows x 80+ columns

### Verdict: **NEEDS_MITIGATION**

**Reasoning:**
- Standard terminal is 24 rows x 80 columns (80x24)
- Many terminals default to 80x24 or 80x30
- Proposed layout requires 40 rows minimum
- Current layout works at 30 rows

**Impact:**
- Users on small terminals will see truncated/broken layout
- CI/CD environments often use 24-row terminals
- SSH sessions may default to 80x24

### Mitigation Strategy

**Implement responsive layouts (from 3-1-tui-panel-extensions-design.md):**

```python
def _detect_layout_mode(self) -> str:
    """Detect appropriate layout based on terminal size."""
    rows, cols = shutil.get_terminal_size()

    if rows >= 50:
        return "extended"      # All panels visible
    elif rows >= 35:
        return "standard"      # Current layout + some new panels
    elif rows >= 24:
        return "compact"       # Minimal panels, vertical stacking
    else:
        return "minimal"       # Plain text fallback
```

**Compact mode (24-35 rows):**
```
header (3 rows)
progress (2 rows)
activity (8 rows)           # Full width
in_progress (5 rows)        # Full width
upcoming (4 rows)           # Full width
footer (1 row)
Total: 23 rows (fits 24-row terminal)
```

**Minimal mode (<24 rows):**
- Auto-enable `--no-tui` for plain text
- Print warning: "Terminal too small for TUI, using plain mode"

**Configuration:**
```python
# Allow users to override
export PLAN_ORCHESTRATOR_TUI_MODE=compact
```

**Backward Compatibility:**
- Default mode detects terminal size
- Existing terminals (80x30+) see current layout
- Smaller terminals get compact mode (not broken layout)
- Users can force plain mode with `--no-tui`

---

## 5. Configuration Compatibility

### Current Configuration

**No persistent TUI configuration exists:**
- All settings are command-line flags
- No config files
- No state persistence across runs

### Proposed Configuration

**From 3-1-tui-panel-extensions-design.md:**
```json
// ~/.config/claude-code/tui-panels.json
{
  "panels": {
    "dependency_graph": true,
    "phase_detail": true,
    "upcoming": true,
    "run_history": false,
    "retry_info": true
  },
  "layout_mode": "auto",
  "keyboard_enabled": false
}
```

### Verdict: **COMPATIBLE**

**Reasoning:**
- New config file does not exist currently
- Creation is entirely additive
- If file doesn't exist, use sensible defaults
- No migration needed (no existing config to migrate)

**Default Behavior:**
```python
def load_tui_config() -> dict:
    """Load TUI configuration with backward-compatible defaults."""
    config_path = Path.home() / ".config" / "claude-code" / "tui-panels.json"

    defaults = {
        "panels": {
            "dependency_graph": True,
            "phase_detail": True,
            "upcoming": True,
            "run_history": False,  # Off by default (new)
            "retry_info": True
        },
        "layout_mode": "auto",
        "keyboard_enabled": False  # Backward compatible
    }

    if not config_path.exists():
        return defaults  # First run - use defaults

    try:
        with open(config_path) as f:
            user_config = json.load(f)
        # Merge with defaults (user config overrides)
        return {**defaults, **user_config}
    except Exception:
        return defaults  # Corrupt config - use defaults
```

**Configuration Migration:**
None needed - no existing config to migrate

**Risk Level:** Low - entirely opt-in configuration

---

## 6. Migration Path

### Scenario 1: Existing Automation Scripts

**Example automation:**
```bash
#!/bin/bash
# Existing CI/CD script
node scripts/status-cli.js status > status.json
COMPLETED=$(jq -r '.summary.completed' status.json)
TOTAL=$(jq -r '.summary.totalTasks' status.json)
echo "Progress: $COMPLETED/$TOTAL"
```

**After upgrade:**
```bash
# Exact same script works unchanged
node scripts/status-cli.js status > status.json
COMPLETED=$(jq -r '.summary.completed' status.json)
TOTAL=$(jq -r '.summary.totalTasks' status.json)
echo "Progress: $COMPLETED/$TOTAL"

# Can optionally use new fields:
PHASES=$(jq -r '.phases | length' status.json)  # NEW
```

**Verdict:** ✅ No migration needed

---

### Scenario 2: Orchestrator Invocation

**Current usage:**
```bash
# Manual orchestration
python scripts/plan_orchestrator.py --max-iterations 50

# CI/CD non-interactive
python scripts/plan_orchestrator.py --no-tui --max-iterations 10
```

**After upgrade:**
```bash
# Manual - unchanged
python scripts/plan_orchestrator.py --max-iterations 50

# CI/CD - unchanged
python scripts/plan_orchestrator.py --no-tui --max-iterations 10

# New interactive mode (opt-in)
python scripts/plan_orchestrator.py --interactive --max-iterations 50
```

**Verdict:** ✅ No migration needed

---

### Scenario 3: External Tools Parsing JSON

**Example: Custom monitoring script**
```python
import json
import subprocess

result = subprocess.run(
    ["node", "scripts/status-cli.js", "status"],
    capture_output=True,
    text=True
)
data = json.loads(result.stdout)

# Current fields work
print(f"Completed: {data['summary']['completed']}")
print(f"Failed: {data['summary']['failed']}")

# New fields are optional
if 'phases' in data:
    for phase in data['phases']:
        print(f"  {phase['title']}: {phase['percentage']}%")
```

**Verdict:** ✅ No migration needed (graceful degradation)

---

### Scenario 4: Custom TUI Wrappers

**Potential issue:** If someone built a wrapper around the TUI

**Example:**
```python
# Hypothetical wrapper
from plan_orchestrator import RichTUIManager

# This would break if RichTUIManager signature changes
tui = RichTUIManager("my-plan")
tui.start()
```

**Mitigation:**
- Keep RichTUIManager constructor signature unchanged
- Add new parameters with defaults:
  ```python
  def __init__(
      self,
      plan_name: str,
      keyboard_enabled: bool = False,  # NEW - default False
      layout_mode: str = "auto"        # NEW - default "auto"
  ):
  ```

**Verdict:** ✅ Compatible if defaults used

---

## 7. Breaking Change Analysis

### Potential Breaking Changes Identified

| Change | Breaking? | Reason | Mitigation |
|--------|-----------|--------|------------|
| New JSON fields | No | Additive only | None needed |
| New commands | No | Additive only | None needed |
| Keyboard handler | No | Opt-in flag | None needed |
| Layout expansion | **Maybe** | Requires larger terminal | Responsive layouts |
| Config file | No | Doesn't exist yet | None needed |
| RichTUIManager signature | **Maybe** | If API changed | Keep defaults |

### Non-Breaking Confirmed

1. **Command-line interface** - All existing commands work unchanged
2. **JSON schemas** - All existing fields preserved
3. **Plain text mode** - `--no-tui` works identically
4. **Automation scripts** - No changes required
5. **status.json format** - File format unchanged

### Mitigated Risks

1. **Terminal size** - Responsive layouts handle all sizes
2. **TUI API** - Default parameters preserve compatibility

---

## 8. Compatibility Test Plan

### Test Suite 1: CLI Compatibility

```bash
# Test existing commands produce expected output
node scripts/status-cli.js status | jq '.summary.completed' # Should work
node scripts/status-cli.js next 5 | jq '.tasks | length'    # Should work
node scripts/status-cli.js progress                         # Should work

# Test new commands are additive
node scripts/status-cli.js dependencies 2.1                 # New, optional
node scripts/status-cli.js findings 2.1                     # New, optional
```

### Test Suite 2: JSON Parsing

```python
import json
import subprocess

# Test parser compatibility
result = subprocess.run(
    ["node", "scripts/status-cli.js", "status"],
    capture_output=True, text=True
)
data = json.loads(result.stdout)

# Existing fields must exist
assert 'summary' in data
assert 'completed' in data['summary']
assert 'tasks' in data

# New fields are optional but present
assert 'phases' in data  # NEW
assert 'currentRun' in data  # NEW
```

### Test Suite 3: TUI Mode Compatibility

```bash
# Test TUI modes
python scripts/plan_orchestrator.py --dry-run               # Default TUI
python scripts/plan_orchestrator.py --dry-run --no-tui      # Plain mode
python scripts/plan_orchestrator.py --dry-run --interactive # New mode

# Test terminal size handling
export COLUMNS=80 LINES=24
python scripts/plan_orchestrator.py --dry-run               # Should use compact mode

export COLUMNS=80 LINES=50
python scripts/plan_orchestrator.py --dry-run               # Should use extended mode
```

### Test Suite 4: Automation Scripts

```bash
# Run existing automation scripts
./scripts/ci-status-check.sh    # Must work unchanged
./scripts/run-orchestrator.sh   # Must work unchanged
```

---

## 9. Migration Documentation

### For Users

**No action required** - All changes are backward compatible

**Optional upgrades:**
1. Resize terminal to 40+ rows for full panel view
2. Add `--interactive` flag for keyboard navigation
3. Customize panels via `~/.config/claude-code/tui-panels.json`

### For Developers

**Updating scripts to use new features:**

```bash
# Before: Basic status
node scripts/status-cli.js status

# After: Enhanced status with phases
node scripts/status-cli.js status | jq '.phases[] | "\(.title): \(.percentage)%"'

# Before: No dependency info
# After: Query dependencies
node scripts/status-cli.js dependencies 2.1
```

**Updating Python code:**

```python
# Before
orchestrator = PlanOrchestrator(
    max_iterations=50,
    use_tui=True
)

# After (backward compatible)
orchestrator = PlanOrchestrator(
    max_iterations=50,
    use_tui=True,
    interactive=False  # NEW - default False for compatibility
)
```

---

## 10. Rollback Strategy

If issues arise, rollback is simple:

### Version Tagging

```bash
# Tag current version before upgrade
git tag v1.0-stable

# After upgrade, if issues found
git checkout v1.0-stable
```

### Feature Flags

```python
# Disable new features via environment variable
export PLAN_ORCHESTRATOR_LEGACY_MODE=1

# In code:
if os.getenv('PLAN_ORCHESTRATOR_LEGACY_MODE'):
    use_legacy_layout = True
    keyboard_enabled = False
```

### Gradual Rollout

1. **Phase 1:** Deploy CLI enhancements (new commands) - low risk
2. **Phase 2:** Deploy JSON enhancements (additive fields) - low risk
3. **Phase 3:** Deploy TUI panels (responsive) - medium risk
4. **Phase 4:** Deploy keyboard navigation (opt-in) - low risk

Each phase can be rolled back independently.

---

## Summary

### Compatibility Verdicts

| Component | Verdict | Risk | Notes |
|-----------|---------|------|-------|
| **CLI Interface** | ✅ COMPATIBLE | None | Additive commands only |
| **JSON Output** | ✅ COMPATIBLE | Low | Additive fields, version field recommended |
| **TUI Modes** | ✅ COMPATIBLE | None | Keyboard is opt-in |
| **Terminal Size** | ⚠️ NEEDS_MITIGATION | Medium | Implement responsive layouts |
| **Configuration** | ✅ COMPATIBLE | Low | New file with sensible defaults |
| **Migration** | ✅ COMPATIBLE | None | No breaking changes |

### Required Mitigations

1. **Responsive Layouts** - Detect terminal size and adjust layout
   - Priority: HIGH
   - Implementation: Layout mode detection
   - Fallback: Auto-enable `--no-tui` for tiny terminals

2. **Schema Version Field** - Add `schemaVersion` to JSON output
   - Priority: MEDIUM
   - Implementation: Add `"schemaVersion": "1.1"` to all responses
   - Purpose: Future-proof schema validation

3. **Default Configuration** - Provide sensible defaults
   - Priority: LOW
   - Implementation: Defaults in code, optional config file
   - Purpose: Zero-configuration setup

### Overall Assessment

**✅ HIGH BACKWARD COMPATIBILITY**

All proposed changes are **additive and non-breaking**. Existing scripts, automation, and workflows will continue to work without modification. The only requirement is responsive layout handling for different terminal sizes, which is a standard best practice for TUI applications.

### Recommendation

**Proceed with implementation** following these guidelines:
1. Implement responsive layouts first (addresses main risk)
2. Add schema version to JSON output
3. Use opt-in flags for new features (`--interactive`)
4. Provide clear upgrade documentation
5. Tag releases for easy rollback if needed

No migration guide needed for users - changes are transparent.
