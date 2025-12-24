# Task 3.3: Keyboard Navigation and Command Palette Design

## Overview

This document designs the keyboard navigation system and command palette for the TUI, addressing gaps B3 (Slash Command Invocation), B4 (Keyboard Navigation), G8 (Command Palette), and G9 (Hotkey Actions).

---

## Current State

From Task 2.4 analysis:
- Rich's `Live` display is read-only (no keyboard input)
- No keyboard event handler exists
- No task selection or navigation
- TUI is display-only

---

## Keyboard Input Architecture

### Input Library Options

| Library | Pros | Cons | Recommendation |
|---------|------|------|----------------|
| `blessed` | Full terminal control, ncurses-like | Heavy dependency, different paradigm | NO |
| `prompt_toolkit` | Async, good key handling | Separate from Rich | MAYBE |
| `keyboard` | Simple key listening | Requires root on Linux | NO |
| `pynput` | Cross-platform | Background threads | NO |
| `readchar` | Simple, lightweight | Blocking reads | MAYBE |
| **Threading + sys.stdin** | No deps, works with Rich | Manual implementation | YES |

### Recommended Approach

Use a separate input thread with `sys.stdin` in raw mode:

```python
import sys
import tty
import termios
import threading
from typing import Callable

class KeyboardHandler:
    """Non-blocking keyboard input handler."""

    def __init__(self, callback: Callable[[str], None]):
        self.callback = callback
        self.running = False
        self.thread = None

    def start(self):
        self.running = True
        self.thread = threading.Thread(target=self._read_loop, daemon=True)
        self.thread.start()

    def stop(self):
        self.running = False

    def _read_loop(self):
        fd = sys.stdin.fileno()
        old_settings = termios.tcgetattr(fd)
        try:
            tty.setraw(fd)
            while self.running:
                if sys.stdin in select.select([sys.stdin], [], [], 0.1)[0]:
                    key = sys.stdin.read(1)
                    # Handle escape sequences for arrow keys
                    if key == '\x1b':
                        key += sys.stdin.read(2)
                    self.callback(key)
        finally:
            termios.tcsetattr(fd, termios.TCSADRAIN, old_settings)
```

---

## Keyboard Navigation Design

### Global Hotkeys

Always available, regardless of mode:

| Key | Action | Description |
|-----|--------|-------------|
| `q` | Quit | Exit TUI |
| `r` | Refresh | Force status refresh |
| `?` | Help | Show keybinding help |
| `Ctrl+C` | Interrupt | Cancel current operation |
| `Esc` | Back/Cancel | Close modal or cancel selection |

### Navigation Keys

| Key | Action | Context |
|-----|--------|---------|
| `↑` / `k` | Move up | Task list, panel selection |
| `↓` / `j` | Move down | Task list, panel selection |
| `←` / `h` | Move left | Panel selection |
| `→` / `l` | Move right | Panel selection |
| `Tab` | Next panel | Cycle through panels |
| `Shift+Tab` | Previous panel | Cycle through panels |
| `Enter` | Select/Expand | Open task actions, expand details |
| `Space` | Toggle | Multi-select tasks |

### Task Action Keys

When task is selected:

| Key | Action | Command Invoked |
|-----|--------|-----------------|
| `e` | Explain | `/plan:explain TASK_ID` |
| `i` | Implement | `/plan:implement TASK_ID` |
| `v` | Verify | `/plan:verify TASK_ID` |
| `s` | Split | `/plan:split TASK_ID` |
| `f` | View Finding | Open findings browser |
| `d` | Dependencies | Show task dependencies |
| `m` | Mark complete | Manual completion |
| `x` | Mark failed | Manual failure |

### Batch Action Keys

For multi-selected tasks:

| Key | Action | Command Invoked |
|-----|--------|-----------------|
| `b` | Batch execute | `/plan:batch TASK_IDS` |
| `V` (shift) | Verify all | `/plan:verify TASK_IDS` |
| `X` (shift) | Clear selection | Deselect all |

### Panel Control Keys

| Key | Action |
|-----|--------|
| `1` | Toggle dependency graph |
| `2` | Toggle phase detail |
| `3` | Toggle upcoming panel |
| `4` | Toggle run history |
| `F` | Focus mode (maximize current panel) |

### Mode Keys

| Key | Action | Mode Entered |
|-----|--------|--------------|
| `:` | Command palette | Command mode |
| `/` | Search | Search mode |
| `p` | Pause/Resume | Toggle pause |

---

## Selection State Management

### Task Selection Model

```python
@dataclass
class SelectionState:
    """Track user selection state."""

    # Current focus
    current_panel: str = "in_progress"  # Which panel has focus
    current_index: int = 0               # Index within panel

    # Multi-selection
    selected_tasks: Set[str] = field(default_factory=set)

    # Mode
    mode: str = "normal"  # normal, command, search, action

    # Cursor visibility
    cursor_visible: bool = True

    def get_selected_task_id(self) -> Optional[str]:
        """Get the currently focused task ID."""
        ...

    def toggle_selection(self, task_id: str):
        """Toggle multi-selection for a task."""
        if task_id in self.selected_tasks:
            self.selected_tasks.discard(task_id)
        else:
            self.selected_tasks.add(task_id)
```

### Visual Indicators

```
┌ In Progress ─────────────────────────┐
│   2.1 First task description...      │  <- Normal
│ ► 2.2 Selected task (cursor)         │  <- Cursor (yellow highlight)
│ ✓ 2.3 Multi-selected task            │  <- Multi-select (cyan)
│ ►✓2.4 Cursor + multi-selected        │  <- Both
└──────────────────────────────────────┘
```

Legend:
- `►` = Cursor position (yellow background)
- `✓` = Multi-selected (cyan text)
- `►✓` = Both cursor and multi-selected

---

## Command Palette Design

### Activation

Press `:` to open command palette

### Visual Design

```
┌─ Command Palette ────────────────────────────────────────┐
│ : imp█                                                   │
│ ─────────────────────────────────────────────────────────│
│ ► plan:implement  Implement task(s)                      │
│   plan:import     Import external plan                   │
│   plan:inspect    Inspect plan structure                 │
│ ─────────────────────────────────────────────────────────│
│ [↑/↓ Select] [Enter Execute] [Tab Complete] [Esc Cancel] │
└──────────────────────────────────────────────────────────┘
```

### Features

1. **Fuzzy Matching** - Type partial command names
2. **Auto-complete** - Tab to complete selected command
3. **Argument Hints** - Show required/optional arguments
4. **History** - Up/Down to navigate previous commands
5. **Task Context** - Commands know currently selected task

### Command Categories

```python
COMMANDS = {
    # Plan commands (slash commands)
    'plan:implement': {'args': ['TASK_ID'], 'desc': 'Implement task(s)'},
    'plan:verify': {'args': ['TASK_ID|all'], 'desc': 'Verify task completion'},
    'plan:explain': {'args': ['TASK_ID'], 'desc': 'Explain task requirements'},
    'plan:split': {'args': ['TASK_ID'], 'desc': 'Split large task'},
    'plan:batch': {'args': ['TASK_IDS'], 'desc': 'Batch execute tasks'},
    'plan:status': {'args': [], 'desc': 'Show plan status'},

    # TUI commands
    'tui:refresh': {'args': [], 'desc': 'Force refresh'},
    'tui:focus': {'args': ['PANEL'], 'desc': 'Focus panel'},
    'tui:toggle': {'args': ['PANEL'], 'desc': 'Toggle panel visibility'},

    # Status commands
    'mark:complete': {'args': ['TASK_ID'], 'desc': 'Mark task complete'},
    'mark:failed': {'args': ['TASK_ID', 'ERROR'], 'desc': 'Mark task failed'},
    'mark:skip': {'args': ['TASK_ID'], 'desc': 'Skip task'},

    # View commands
    'view:findings': {'args': ['TASK_ID?'], 'desc': 'View task findings'},
    'view:deps': {'args': ['TASK_ID?'], 'desc': 'View dependencies'},
    'view:history': {'args': [], 'desc': 'View run history'},
}
```

### Command Execution Flow

```
User types ":plan:impl"
    ↓
Fuzzy match finds "plan:implement"
    ↓
User presses Tab to complete
    ↓
Palette shows: ":plan:implement [TASK_ID]"
    ↓
User presses Enter (uses selected task) OR types task ID
    ↓
Command executed:
    1. Build Claude prompt with slash command
    2. Spawn Claude session
    3. Stream output to activity panel
    4. Update status on completion
```

---

## Task Picker Modal

### Activation

When command requires task selection and none selected:

```
┌─ Select Task ────────────────────────────────────────────┐
│ Search: █                                                │
│ ─────────────────────────────────────────────────────────│
│ Phase 2: Analysis                                        │
│ ─────────────────────────────────────────────────────────│
│ ► [ ] 2.1 Analyze command output formats vs TUI          │
│   [✓] 2.2 Analyze workflow requirements vs TUI           │
│   [ ] 2.3 Analyze missing TUI features                   │
│   [ ] 2.4 Analyze command invocation from TUI            │
│   [✓] 2.5 Categorize findings by severity                │
│ ─────────────────────────────────────────────────────────│
│ Phase 3: Synthesis                                       │
│ ─────────────────────────────────────────────────────────│
│   [ ] 3.1 Design TUI panel extensions                    │
│   [ ] 3.2 Define command-to-TUI data contracts           │
│ ─────────────────────────────────────────────────────────│
│ [↑/↓ Navigate] [Space Toggle] [Enter Confirm] [Esc Cancel]│
│ Selected: 2.2, 2.5                                        │
└──────────────────────────────────────────────────────────┘
```

### Features

1. **Search/Filter** - Type to filter tasks
2. **Phase Groups** - Tasks organized by phase
3. **Status Indicators** - Show task status
4. **Multi-select** - Space to toggle selection
5. **Quick Select** - Enter on cursor for single select

---

## Search Mode

### Activation

Press `/` to enter search mode

### Visual Design

```
┌─ Search ─────────────────────────────────────────────────┐
│ /depend█                                                 │
│ ─────────────────────────────────────────────────────────│
│ Matches (3):                                             │
│   2.2 Analyze workflow requirements vs TUI ◄ dependencies│
│   3.1 Design TUI panel extensions ◄ Dependency graph     │
│   B1  Task Dependencies Visualization (blocker)          │
│ ─────────────────────────────────────────────────────────│
│ [Enter Jump] [n/N Next/Prev] [Esc Cancel]                │
└──────────────────────────────────────────────────────────┘
```

### Search Scope

- Task IDs and descriptions
- Finding content (if indexed)
- Phase titles
- Error messages

---

## Help Overlay

### Activation

Press `?` to show help

### Visual Design

```
┌─ Keyboard Shortcuts ─────────────────────────────────────┐
│                                                          │
│ NAVIGATION                 TASK ACTIONS                  │
│ ───────────────────────    ───────────────────────────   │
│ ↑/↓ or j/k  Move cursor    e  Explain selected task     │
│ ←/→ or h/l  Change panel   i  Implement selected task   │
│ Tab         Next panel     v  Verify task                │
│ Enter       Select/Action  s  Split large task           │
│ Space       Multi-select   f  View findings              │
│                            d  Show dependencies          │
│                                                          │
│ MODES                      GLOBAL                        │
│ ───────────────────────    ───────────────────────────   │
│ :           Command mode   q  Quit TUI                   │
│ /           Search mode    r  Refresh status             │
│ ?           This help      p  Pause/Resume               │
│ Esc         Cancel/Back    F  Focus mode                 │
│                                                          │
│ PANELS (toggle)            BATCH                         │
│ ───────────────────────    ───────────────────────────   │
│ 1           Dep. graph     b  Batch execute selected     │
│ 2           Phase detail   V  Verify all selected        │
│ 3           Upcoming       X  Clear selection            │
│ 4           Run history                                  │
│                                                          │
│                    [Press any key to close]              │
└──────────────────────────────────────────────────────────┘
```

---

## Implementation Architecture

### Class Structure

```python
class TUIKeyboardController:
    """Manage keyboard input and modes."""

    def __init__(self, tui: RichTUIManager, orchestrator: PlanOrchestrator):
        self.tui = tui
        self.orchestrator = orchestrator
        self.state = SelectionState()
        self.command_palette = CommandPalette()
        self.keyboard = KeyboardHandler(self._on_key)

    def start(self):
        self.keyboard.start()

    def _on_key(self, key: str):
        if self.state.mode == 'command':
            self.command_palette.handle_key(key)
        elif self.state.mode == 'search':
            self._handle_search_key(key)
        else:
            self._handle_normal_key(key)

    def _handle_normal_key(self, key: str):
        handlers = {
            'q': self._quit,
            'r': self._refresh,
            '?': self._show_help,
            ':': self._enter_command_mode,
            '/': self._enter_search_mode,
            '\x1b[A': self._move_up,    # Up arrow
            '\x1b[B': self._move_down,  # Down arrow
            'k': self._move_up,
            'j': self._move_down,
            'e': self._explain_task,
            'i': self._implement_task,
            'v': self._verify_task,
            's': self._split_task,
            ' ': self._toggle_selection,
            '\r': self._select_action,  # Enter
        }
        handler = handlers.get(key)
        if handler:
            handler()
```

### Command Palette Class

```python
class CommandPalette:
    """Fuzzy command search and execution."""

    def __init__(self):
        self.input = ""
        self.matches = []
        self.selected_index = 0
        self.history = []

    def handle_key(self, key: str):
        if key == '\x1b':  # Escape
            self.close()
        elif key == '\r':  # Enter
            self.execute()
        elif key == '\t':  # Tab
            self.complete()
        elif key == '\x7f':  # Backspace
            self.input = self.input[:-1]
            self.update_matches()
        else:
            self.input += key
            self.update_matches()

    def update_matches(self):
        self.matches = fuzzy_match(self.input, COMMANDS.keys())
        self.selected_index = 0
```

---

## Integration with Rich TUI

### Panel Selection Highlight

```python
def _render_panel(self, name: str, content: Renderable) -> Panel:
    """Render panel with focus indicator."""
    border_style = "green" if name == self.state.current_panel else "dim"
    title_style = "bold green" if name == self.state.current_panel else ""

    return Panel(
        content,
        title=name.replace('_', ' ').title(),
        border_style=border_style,
        title_style=title_style
    )
```

### Cursor Rendering in Task Lists

```python
def _render_task_list(self, tasks: List[dict], panel_name: str) -> Table:
    """Render task list with cursor and selection."""
    table = Table(box=None, show_header=False, expand=True)

    for i, task in enumerate(tasks):
        is_cursor = (
            self.state.current_panel == panel_name and
            self.state.current_index == i
        )
        is_selected = task['id'] in self.state.selected_tasks

        prefix = ""
        style = ""

        if is_cursor and is_selected:
            prefix = "►✓"
            style = "bold yellow on dark_green"
        elif is_cursor:
            prefix = "► "
            style = "bold yellow"
        elif is_selected:
            prefix = " ✓"
            style = "cyan"
        else:
            prefix = "  "

        table.add_row(
            Text(prefix, style=style),
            Text(f"{task['id']} {task['description'][:35]}", style=style)
        )

    return table
```

---

## Summary

| Component | Addresses | Complexity | Priority |
|-----------|-----------|------------|----------|
| Keyboard Handler | B4 | MEDIUM | 1 |
| Navigation Keys | B4 | LOW | 1 |
| Task Selection | B4 | MEDIUM | 2 |
| Task Action Keys | G9, B3 | MEDIUM | 2 |
| Command Palette | G8, B3 | HIGH | 3 |
| Task Picker | B3 | MEDIUM | 3 |
| Search Mode | Enhancement | MEDIUM | 4 |
| Help Overlay | Enhancement | LOW | 4 |

Implementation order:
1. Keyboard handler + basic navigation
2. Task selection and action keys
3. Command palette and task picker
4. Search mode and help overlay
