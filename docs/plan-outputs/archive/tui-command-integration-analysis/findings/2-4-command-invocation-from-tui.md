# Task 2.4: Command Invocation from TUI

## Overview

This analysis examines whether and how the TUI can invoke plan commands like `/plan:split`, `/plan:verify`, `/plan:batch`, and what keyboard shortcuts and interactive selection capabilities exist.

---

## Current Command Invocation Architecture

### How TUI Currently Works

From `plan_orchestrator.py`, the TUI:

1. **Queries Status** via subprocess calls to `plan-runner.sh` and `status-cli.js`
2. **Monitors** `status.json` for changes
3. **Streams** Claude CLI output for activity tracking
4. **Does NOT** invoke slash commands directly

### Evidence: TUI-to-Script Integration

From `plan_orchestrator.py:815-839`:
```python
def get_status(self) -> Optional[PlanStatus]:
    """Get current plan status from plan-runner.sh."""
    result = subprocess.run(
        [PLAN_RUNNER_SCRIPT, "status"],
        capture_output=True,
        ...
    )
```

The TUI uses **subprocess calls** to CLI scripts, not slash command invocation.

---

## Can TUI Invoke Slash Commands?

### Answer: NO (Currently)

The TUI cannot invoke `/plan:split`, `/plan:verify`, `/plan:batch` or any other slash commands because:

1. **Slash commands are Claude prompt syntax** - They require a Claude session to interpret
2. **TUI runs externally** - It's a Python process that spawns Claude sessions
3. **No command palette** - No mechanism to select and run slash commands

### How Claude Sessions Are Spawned

From `plan_orchestrator.py:1203-1210`:
```python
if self.use_tui and self.streaming_runner:
    # Use streaming runner for real-time activity tracking in TUI
    success, output = self.streaming_runner.run(prompt)
else:
    success, output = self.run_claude_session(prompt)
```

The TUI builds a **static prompt** (`_build_prompt()`) and passes it to Claude. It cannot dynamically invoke slash commands.

---

## Available CLI Scripts as Alternatives

The TUI could theoretically invoke these scripts directly (but doesn't):

| Slash Command | CLI Alternative | TUI Integration |
|---------------|-----------------|-----------------|
| `/plan:status` | `node scripts/status-cli.js progress` | Used for display |
| `/plan:implement TASK` | `node scripts/status-cli.js mark-started/complete` | Indirect (Claude does it) |
| `/plan:verify` | None (requires Claude reasoning) | NOT AVAILABLE |
| `/plan:split` | None (requires Claude reasoning) | NOT AVAILABLE |
| `/plan:batch` | None (builds parallel prompts) | NOT AVAILABLE |
| `/plan:explain` | None (requires Claude reasoning) | NOT AVAILABLE |

**Key Insight:** Commands that require Claude's reasoning (verify, split, explain, batch) have no CLI-only alternative.

---

## Keyboard Navigation

### Current State: NONE

From `plan_orchestrator.py`:
- No `keyboard` or `input` handling code
- Rich's `Live` display is read-only
- No event loop for keypresses

### Evidence

The TUI uses `Live` context which doesn't support keyboard input:
```python
self.live = Live(
    self.layout,
    console=self.console,
    refresh_per_second=4,
    screen=False  # Not using fullscreen mode
)
```

There is no:
- `blessed` / `curses` keyboard handling
- `prompt_toolkit` integration
- `click` CLI with interactive mode
- `rich.prompt` for user input

---

## Interactive Task Selection

### Current State: NONE

The TUI has no mechanism to:

1. **Select a task** - No cursor/highlight movement
2. **Trigger action on task** - No hotkeys for explain/implement/verify
3. **Multi-select tasks** - No checkbox or toggle interface
4. **Filter tasks** - No search/filter input

### How Tasks Are Selected

From `plan_orchestrator.py:1190-1191`:
```python
next_tasks = self.get_next_tasks(self.batch_size)
task_ids = [t.get("id", "?") for t in next_tasks]
```

Tasks are selected **programmatically** by `getNextTasks()`, not by user input.

---

## What Would Be Needed for Command Invocation

### Option 1: Command Palette (High Complexity)

Add a modal command selector:
1. Press `Ctrl+P` or `:`
2. Fuzzy search command list
3. Select command → spawn Claude session with that slash command

**Requirements:**
- Rich modal/overlay
- Keyboard input handling
- Claude session management

### Option 2: Task Context Menu (Medium Complexity)

Add per-task action menu:
1. Navigate to task with arrow keys
2. Press `Enter` to open actions
3. Choose: Explain, Implement, Verify, Split

**Requirements:**
- Cursor/selection tracking
- Task panel interactivity
- Action dispatch to Claude

### Option 3: Hotkey Actions (Low-Medium Complexity)

Direct hotkeys for common actions:
- `e` - Explain selected/next task
- `i` - Implement selected/next task
- `v` - Verify completed tasks
- `s` - Split large task
- `b` - Batch execute phase

**Requirements:**
- Keyboard event handler
- Task selection state
- Claude session spawn with command

---

## Keyboard Shortcuts Mapping (Proposed)

| Key | Action | Implementation |
|-----|--------|----------------|
| `q` | Quit TUI | Stop loop, cleanup |
| `r` | Refresh status | Force `get_status()` call |
| `p` | Pause/Resume | Toggle Claude sessions |
| `↑/↓` | Navigate tasks | Track selected task |
| `Enter` | Action menu | Show explain/implement/verify options |
| `e` | Explain task | Spawn `/plan:explain TASK` session |
| `i` | Implement task | Spawn `/plan:implement TASK` session |
| `v` | Verify all | Spawn `/plan:verify all` session |
| `s` | Split task | Spawn `/plan:split TASK` session |
| `Space` | Toggle select | Multi-select for batch |
| `b` | Batch selected | Spawn `/plan:batch TASKS` session |
| `?` | Help | Show keybindings |

---

## Gaps Summary

| Feature | Current State | Gap Severity |
|---------|---------------|--------------|
| Slash command invocation | Not possible | BLOCKER |
| Keyboard navigation | None | BLOCKER |
| Task selection | Programmatic only | BLOCKER |
| Command palette | None | GAP |
| Hotkey actions | None | GAP |
| Multi-select | None | ENHANCEMENT |

---

## Implementation Recommendations

### Phase 1: Keyboard Foundation (BLOCKER)

1. Add keyboard event handler (using `rich.prompt` or `blessed`)
2. Implement basic navigation (quit, refresh)
3. Track "selected task" state

### Phase 2: Basic Actions (GAP)

1. Per-task actions via Enter key
2. Explain, Implement, Verify actions
3. Claude session spawning with command prefix

### Phase 3: Advanced Interaction (ENHANCEMENT)

1. Multi-select for batch operations
2. Command palette with fuzzy search
3. Custom keybinding configuration

---

## Technical Constraints

### Rich Library Limitations

Rich's `Live` display is primarily for output, not input. For keyboard input, would need:

1. **Threading** - Input thread + display thread
2. **Alternative library** - `blessed`, `prompt_toolkit`, or `urwid`
3. **Mixed mode** - Exit Live for prompts, re-enter after

### Claude Session Constraints

When invoking slash commands:
1. Each command spawns a new Claude session
2. Session context is not preserved
3. Concurrent sessions have independent state

---

## Evidence Summary

From Task 1.4 findings, "Integration Gaps Identified":
> "No Direct Command Invocation - The TUI cannot invoke slash commands like `/plan:split` or `/plan:verify`"

> "Limited Keyboard Navigation - No current support for: Task selection via keyboard, Phase navigation, Command palette"
