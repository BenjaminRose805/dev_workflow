# Task 4.1: Rich Library Capabilities - Feasibility Analysis

## Overview

This document analyzes the Rich Python library's capabilities against the proposed TUI panel designs from Phase 3 analysis. For each proposed panel, we assess technical feasibility, identify implementation approaches, and highlight any limitations.

**Analysis Date:** 2025-12-24
**Rich Version Analyzed:** 14.2.0 (latest)
**Platform:** Linux, macOS, Windows (Python 3.8+)

---

## 1. Rich Components Available

### Core Display Components

| Component | Purpose | Current Usage | Documentation |
|-----------|---------|---------------|---------------|
| **Panel** | Bordered container with title/subtitle | ✓ Used in all current panels | Panel component for borders |
| **Table** | Tabular data with flexible columns | ✓ Used in activity/tasks panels | Unicode box drawing, auto-resizing |
| **Layout** | Screen division and positioning | ✓ Used for 5-section layout | Split rows/columns, dynamic sizing |
| **Live** | Real-time updating display | ✓ Core TUI mechanism | Context manager, 4 FPS refresh |
| **Text** | Styled text with colors/formatting | ✓ Used throughout | Rich markup, spans, justification |
| **Progress** | Progress bars and task tracking | Partial (manual bar rendering) | Multiple bars, customizable columns |
| **Tree** | Hierarchical tree structures | ✗ Not used | Guide lines, expandable nodes |
| **Markdown** | Markdown rendering in terminal | ✗ Not used | Full GFM support, syntax highlighting |
| **Console** | Output management and rendering | ✓ Core console instance | Width detection, paging, recording |
| **Group** | Combine multiple renderables | ✗ Not used | Vertical stacking of components |

### Layout Utilities

| Component | Purpose | Capabilities |
|-----------|---------|--------------|
| **Table.grid()** | Invisible table for layout | No borders, flexible spacing for complex layouts |
| **Columns** | Multi-column layout | Equal or optimal width distribution |
| **Align** | Content alignment | Left, center, right, vertical middle |
| **Padding** | Add spacing around renderables | Configurable per-side padding |

### Styling Utilities

| Component | Purpose | Capabilities |
|-----------|---------|--------------|
| **Style** | Color and text styling | 16.7M colors, bold/italic/underline/dim |
| **Theme** | Consistent color schemes | Customizable palettes |
| **Syntax** | Code syntax highlighting | Pygments integration, 500+ languages |
| **Box** | Border styles | ASCII, rounded, double, heavy, custom |

---

## 2. Panel-by-Panel Feasibility Assessment

### Panel 1: Dependency Graph Panel

**Proposed Design:**
```
┌ Dependency Graph ────────────────────┐
│ 1.1 ✓ ─┬─► 2.1 ● ─┬─► 2.6 ◯        │
│        │          └─► 2.7 ◯        │
│        └─► 2.2 ✓ ─┬─► 2.3 ●        │
│                   └─► 2.4 ◯        │
│ 1.2 ✓ ──► 2.5 ●                    │
└─────────────────────────────────────┘
```

#### Rich Capabilities Analysis

**✓ SUPPORTED:**
- **Tree Component:** Rich has a native `Tree` class for hierarchical structures
  - `tree.add()` method for adding child nodes
  - Automatic guide lines with box-drawing characters
  - Custom labels (can use Text for colored status icons)
  - Example: `rich/examples/tree.py` displays directory trees

**✓ Box-Drawing Characters:**
  - Unicode box-drawing fully supported: `─`, `│`, `┌`, `┐`, `└`, `┘`, `├`, `┤`, `┬`, `┴`, `┼`
  - Tree uses these automatically for guide lines
  - Custom rendering via `Text()` for arrows: `─►`, `─┬─►`

**✓ Status Icons:**
  - Unicode symbols supported: `✓` (U+2713), `●` (U+25CF), `◯` (U+25CB), `✗` (U+2717)
  - Color styling via Rich's style system

**⚠ LIMITATIONS:**
- **Horizontal Layout:** Tree component renders **vertically only** (top-to-bottom)
- **Custom Layout Algorithm:** To achieve the horizontal DAG layout shown, must use **custom rendering** with `Table.grid()` or `Text()` composition
- **Dynamic Routing:** No automatic edge routing - must calculate positions manually

#### Implementation Approach

**Option A: Vertical Tree (Easier)**
```python
from rich.tree import Tree
from rich.text import Text

tree = Tree("📋 Dependencies")
task_1_1 = tree.add(Text("1.1 Task One", style="green"))
task_2_1 = task_1_1.add(Text("2.1 Task Two", style="yellow"))
task_2_1.add(Text("2.6 Task Six", style="dim"))
task_2_1.add(Text("2.7 Task Seven", style="dim"))
```

**Output:**
```
📋 Dependencies
└── 1.1 Task One
    ├── 2.1 Task Two
    │   ├── 2.6 Task Six
    │   └── 2.7 Task Seven
    └── 2.2 Task Two B
```

**Option B: Horizontal Graph (Custom, Complex)**
```python
from rich.table import Table
from rich.text import Text

grid = Table.grid(expand=True)
# Manually construct each row with spacing and arrows
row1 = Text()
row1.append("1.1 ", style="green")
row1.append("✓ ─┬─► ")
row1.append("2.1 ", style="yellow")
row1.append("● ─┬─► ")
row1.append("2.6 ", style="dim")
row1.append("◯")
grid.add_row(row1)
# ... repeat for each level, calculate spacing
```

**⚠ COMPLEXITY WARNING:** Option B requires:
1. Graph traversal algorithm to determine levels
2. Manual spacing calculation for alignment
3. Custom ASCII art construction
4. No automatic updates when graph changes

#### Feasibility Verdict

| Aspect | Status | Notes |
|--------|--------|-------|
| **Box Drawing** | **YES** | Full Unicode support, Tree component available |
| **Vertical Tree** | **YES** | Native Tree component, trivial implementation |
| **Horizontal DAG** | **PARTIAL** | Possible but requires significant custom code |
| **Dynamic Layout** | **NO** | No auto-layout algorithm, manual positioning required |
| **Overall** | **PARTIAL** | ✓ Vertical tree easy, horizontal graph complex |

**Recommendation:** Start with **vertical Tree component** for MVP. Horizontal DAG layout is feasible but HIGH effort (100+ LOC for layout algorithm).

---

### Panel 2: Phase Detail Panel

**Proposed Design:**
```
┌ Phase Progress ─────────────────────────────────────────┐
│ [████████████████████████████████░░░░░░░░] 80% 24/30    │
│                                                         │
│ P1 ████████ 100%  P2 ██████░░ 75%  P3 ░░░░░░░░ 0%      │
│ Discovery         Analysis         Synthesis            │
└─────────────────────────────────────────────────────────┘
```

#### Rich Capabilities Analysis

**✓ FULLY SUPPORTED:**
- **Progress Bars:** Rich has a sophisticated `Progress` class
  - Multiple progress bars in a single display
  - Customizable columns: BarColumn, TextColumn, PercentageColumn, etc.
  - Auto-sizing to fit available width

**✓ Grid Layout:**
  - `Table.grid()` perfect for this layout
  - Columns for each phase's mini-bar
  - No borders, flexible spacing

**✓ Manual Bar Rendering (Current Approach):**
  - Already used in current TUI: `"█" * filled + "░" * remaining`
  - Works well for simple bars

#### Implementation Approach

**Option A: Manual Bars (Current, Simple)**
```python
def _render_phase_detail(self) -> Panel:
    grid = Table.grid(expand=True)

    # Main progress bar (already working)
    main_bar = "█" * filled + "░" * remaining
    grid.add_row(f"[{main_bar}] 80% 24/30")
    grid.add_row("")  # Blank line

    # Phase mini-bars
    phase_row = Text()
    for phase in self.phases:
        filled = int(8 * phase['percentage'] / 100)
        bar = "█" * filled + "░" * (8 - filled)
        phase_row.append(f"P{phase['id']} {bar} {phase['percentage']}%  ")
    grid.add_row(phase_row)

    return Panel(grid, title="Phase Progress")
```

**Option B: Progress Component (More Robust)**
```python
from rich.progress import Progress, BarColumn, TextColumn, TaskProgressColumn

progress = Progress(
    TextColumn("[bold]{task.description}"),
    BarColumn(bar_width=30),
    TaskProgressColumn()
)

# Add tasks for each phase
p1_task = progress.add_task("P1 Discovery", total=10, completed=10)
p2_task = progress.add_task("P2 Analysis", total=8, completed=6)
p3_task = progress.add_task("P3 Synthesis", total=12, completed=0)
```

#### Feasibility Verdict

| Aspect | Status | Notes |
|--------|--------|-------|
| **Multiple Bars** | **YES** | Native Progress component or manual rendering |
| **Grid Layout** | **YES** | Table.grid() perfect for this |
| **Progress Component** | **YES** | Overkill for static mini-bars, but available |
| **Current Approach** | **YES** | Already working, just need to extend |
| **Overall** | **YES** | ✓ Fully feasible, LOW complexity |

**Recommendation:** Extend current manual bar approach. Progress component is more complex than needed for static phase bars.

---

### Panel 3: Upcoming Tasks Panel

**Proposed Design:**
```
┌ Upcoming ────────────────────────────┐
│ [1] 2.3 Define data contracts...     │
│ [2] 2.4 Design keyboard nav...       │
│ [3] 2.5 Plan workflow support...     │
│ [4] 2.6 VERIFY: All gaps doc...      │
│     ──────────────────               │
│     Press [i] to implement selected  │
└──────────────────────────────────────┘
```

#### Rich Capabilities Analysis

**✓ FULLY SUPPORTED:**
- **Numbered List:** Trivial with `Table` or `Text`
- **Selection Highlighting:** Rich's style system
  - Background colors for cursor: `style="on yellow"`
  - Text colors for multi-select: `style="cyan"`
- **Text Truncation:** `overflow="ellipsis"` on Table columns

#### Implementation Approach

```python
def _render_upcoming(self) -> Panel:
    table = Table(show_header=False, box=None, expand=True)
    table.add_column("Task", overflow="ellipsis")

    for i, task in enumerate(self.upcoming_tasks[:6], 1):
        task_id = task.get('id', '?')
        desc = task.get('description', '')[:35]

        # Highlight if selected
        style = "on yellow" if i == self.selected_index else "white"
        if task.get('is_verify'):
            desc = f"VERIFY: {desc}"
            style = f"{style} bold"

        table.add_row(f"[{i}] {task_id}: {desc}", style=style)

    table.add_row("─" * 30, style="dim")
    table.add_row("Press [i] to implement selected", style="dim")

    return Panel(table, title="Upcoming", border_style="blue")
```

#### Feasibility Verdict

| Aspect | Status | Notes |
|--------|--------|-------|
| **Numbered List** | **YES** | Simple table rendering |
| **Selection Highlight** | **YES** | Native style system |
| **Truncation** | **YES** | Table column overflow control |
| **Overall** | **YES** | ✓ Fully feasible, LOW complexity |

**Recommendation:** Straightforward extension of existing task panel code. ~20 LOC.

---

### Panel 4: Run History Panel

**Proposed Design:**
```
┌ Run History ─────────────────────────┐
│ Run  Started     Duration   Tasks    │
│ ─────────────────────────────────────│
│ #3   Today 14:30   1h 23m   +8 ✓ 1✗ │
│ #2   Today 10:15   45m      +5 ✓ 0✗ │
│ #1   Yest  16:00   2h 10m   +12 ✓ 2✗│
└──────────────────────────────────────┘
```

#### Rich Capabilities Analysis

**✓ FULLY SUPPORTED:**
- **Table:** Core Rich component
  - Headers, multiple columns
  - Auto-sizing, alignment
  - Row styling for current run
- **Time Formatting:** Python's datetime/timedelta (not Rich-specific)

#### Implementation Approach

```python
def _render_run_history(self) -> Panel:
    table = Table(show_header=True, box=None, expand=True)
    table.add_column("Run", width=5)
    table.add_column("Started", width=12)
    table.add_column("Duration", width=8)
    table.add_column("Tasks", width=10)

    for run in self.runs[-5:]:  # Last 5 runs
        run_num = f"#{run['id']}"
        started = self._format_time(run['startedAt'])  # "Today 14:30"
        duration = self._format_duration(run['duration'])  # "1h 23m"
        tasks = f"+{run['completed']} ✓ {run['failed']}✗"

        # Highlight current run
        style = "bold cyan" if run['id'] == self.current_run else "white"

        table.add_row(run_num, started, duration, tasks, style=style)

    return Panel(table, title="Run History", border_style="dim")
```

#### Feasibility Verdict

| Aspect | Status | Notes |
|--------|--------|-------|
| **Table Display** | **YES** | Native Table component |
| **Data Available** | **YES** | `status.json.runs` array exists |
| **Time Formatting** | **YES** | Python stdlib (datetime/timedelta) |
| **Overall** | **YES** | ✓ Fully feasible, LOW complexity |

**Recommendation:** Straightforward Table rendering. Data already in status.json.

---

### Panel 5: Findings Browser (Modal)

**Proposed Design:**
```
┌──────────────────────────────────────────────────────────┐
│ Findings: 2.5 Severity Categorization                    │
│ ────────────────────────────────────────────────────────│
│                                                          │
│ ## Overview                                              │
│                                                          │
│ This document categorizes all findings from Phase 2      │
│ analysis by severity level...                            │
│                                                          │
│ | Severity | Count |                                     │
│ |----------|-------|                                     │
│ | BLOCKER  | 4     |                                     │
│ ...                                                      │
│ [↑/↓ Scroll] [q Close] [n Next] [p Prev]                │
└──────────────────────────────────────────────────────────┘
```

#### Rich Capabilities Analysis

**✓ SUPPORTED:**
- **Markdown Rendering:** Rich has a full-featured `Markdown` class
  - GFM (GitHub Flavored Markdown) support
  - Tables, headers, lists, code blocks
  - Syntax highlighting in code blocks (Pygments)
  - Example usage:
    ```python
    from rich.markdown import Markdown
    md = Markdown("# Title\n\nContent here...")
    console.print(md)
    ```

**✓ Panel Overlay:**
  - Can replace entire Layout with modal content
  - `layout.update(Panel(markdown_content))` replaces current view

**⚠ LIMITATIONS:**
- **No Native Modal System:** Rich doesn't have a modal/dialog component
  - Must manually swap layout content
  - No built-in "overlay" that preserves background
- **No Built-in Scrolling:** Rich's Live display doesn't support interactive scrolling
  - Markdown is rendered fully (all content at once)
  - Can paginate manually by slicing content
  - Cannot scroll with arrow keys without additional keyboard handler

#### Implementation Approach

**Option A: Full-Screen Replace (Simple)**
```python
def show_findings_modal(self, task_id: str):
    # Read markdown file
    findings_path = f"findings/{task_id}-*.md"
    with open(findings_path, 'r') as f:
        content = f.read()

    # Render markdown
    from rich.markdown import Markdown
    md = Markdown(content)

    # Replace entire layout temporarily
    self.saved_layout = self.layout
    self.layout = Layout()
    self.layout.update(Panel(md, title=f"Findings: {task_id}"))
    self.refresh()

def close_modal(self):
    self.layout = self.saved_layout
    self.refresh()
```

**Option B: Scrollable Pagination (Complex)**
```python
class ScrollableMarkdown:
    def __init__(self, content: str, height: int):
        self.lines = content.split('\n')
        self.offset = 0
        self.height = height

    def scroll_up(self):
        self.offset = max(0, self.offset - 1)

    def scroll_down(self):
        self.offset = min(len(self.lines) - self.height, self.offset + 1)

    def render(self) -> Markdown:
        visible_lines = self.lines[self.offset:self.offset + self.height]
        return Markdown('\n'.join(visible_lines))
```

**⚠ Scrolling Requires:**
1. Keyboard handler (covered in Panel 7)
2. Manual line tracking and offset management
3. Cannot use Rich's Markdown component directly (renders all content)
4. Alternative: Use `Pager` class, but blocks entire TUI

#### Feasibility Verdict

| Aspect | Status | Notes |
|--------|--------|-------|
| **Markdown Rendering** | **YES** | Native Markdown component, full GFM support |
| **Full-Screen Modal** | **YES** | Layout swap approach works |
| **Overlay (Transparent)** | **NO** | No native overlay support, must replace content |
| **Scrolling** | **PARTIAL** | Manual pagination possible, no native scroll |
| **Keyboard Nav** | **DEPENDS** | Requires keyboard handler (Panel 7) |
| **Overall** | **PARTIAL** | ✓ Markdown rendering works, scrolling is complex |

**Recommendation:**
- **MVP:** Full-screen replace with static markdown (no scrolling)
- **Future:** Add pagination with keyboard handler (PgUp/PgDn keys)
- **Limitation:** Cannot scroll smoothly like a native pager

---

### Panel 6: Retry History Indicator

**Proposed Design:**
```
┌ In Progress ─────────────────────────┐
│ [▶] 2.3 Define data contracts...     │
│ [▶] 2.4 Design keyboard [Retry 2/3] │
│     └─ Last error: Timeout after... │
└──────────────────────────────────────┘
```

#### Rich Capabilities Analysis

**✓ FULLY SUPPORTED:**
- **Text Suffixes:** Trivial string concatenation
- **Conditional Display:** Python logic for showing retry count
- **Color Coding:** Rich's style system for yellow→red progression
- **Indented Sub-rows:** Table rows or Text with spacing

#### Implementation Approach

```python
def _render_tasks_in_progress(self) -> Panel:
    table = Table(show_header=False, box=None)
    table.add_column("Task", style="yellow", overflow="ellipsis")

    for task in self.tasks_in_progress[:4]:
        task_id = task.get('id', '?')
        desc = task.get('description', '')[:30]
        retry_count = task.get('retryCount', 0)

        # Build main row
        row_text = f"[▶] {task_id}: {desc}"
        if retry_count > 0:
            # Color code: yellow for 1-2, red for 3+
            retry_style = "yellow" if retry_count < 3 else "red"
            row_text += f" [Retry {retry_count}/3]"

        table.add_row(row_text)

        # Add error message if retried
        if retry_count > 0 and task.get('lastError'):
            error = task['lastError'][:40] + "..."
            table.add_row(f"    └─ Last error: {error}", style="dim red")

    return Panel(table, title="In Progress", border_style="yellow")
```

#### Feasibility Verdict

| Aspect | Status | Notes |
|--------|--------|-------|
| **Retry Suffix** | **YES** | Simple string concatenation |
| **Color Coding** | **YES** | Rich style system |
| **Error Message** | **YES** | Additional table row |
| **Data Available** | **YES** | `task.retryCount`, `task.retryErrors` in status.json |
| **Overall** | **YES** | ✓ Fully feasible, LOW complexity |

**Recommendation:** Minor extension to existing `_render_tasks_in_progress()` method. ~10 LOC.

---

### Panel 7: Keyboard Navigation

**Proposed Approach:**
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
                if select.select([sys.stdin], [], [], 0.1)[0]:
                    key = sys.stdin.read(1)
                    # Handle escape sequences for arrow keys
                    if key == '\x1b':
                        key += sys.stdin.read(2)
                    self.callback(key)
        finally:
            termios.tcsetattr(fd, termios.TCSADRAIN, old_settings)
```

#### Rich Compatibility Analysis

**✓ COMPATIBLE:**
- **Rich Live Display:** Read-only, doesn't interfere with stdin
- **Threading:** Keyboard handler runs in separate thread, doesn't block Live refresh
- **Terminal Control:** `termios` properly saves/restores settings

**⚠ CONSIDERATIONS:**
- **Raw Mode Safety:** Must restore terminal settings on exit (finally block)
- **Platform:** `termios` only available on Unix (Linux, macOS)
  - Windows requires alternative: `msvcrt.getch()` or `readchar` library
- **Signal Handling:** Ctrl+C in raw mode doesn't send SIGINT
  - Must detect `\x03` and handle manually

#### Implementation Approach

```python
class RichTUIManager:
    def __init__(self):
        # ... existing init ...
        self.keyboard_handler = None
        self.selection_state = SelectionState()

    def start(self):
        # Start Live display (existing)
        self.live.start()

        # Start keyboard handler
        self.keyboard_handler = KeyboardHandler(self._on_key_press)
        self.keyboard_handler.start()

    def stop(self):
        # Stop keyboard handler first
        if self.keyboard_handler:
            self.keyboard_handler.stop()

        # Stop Live display
        if self.live:
            self.live.stop()

    def _on_key_press(self, key: str):
        """Handle keyboard input."""
        if key == 'q':
            self.should_quit = True
        elif key == '\x1b[A':  # Up arrow
            self.selection_state.move_up()
            self.refresh()
        elif key == '\x1b[B':  # Down arrow
            self.selection_state.move_down()
            self.refresh()
        elif key == 'i':
            self._invoke_implement()
        # ... etc
```

#### Feasibility Verdict

| Aspect | Status | Notes |
|--------|--------|-------|
| **Threading + Rich Live** | **YES** | Compatible, no conflicts |
| **Raw Mode Input** | **YES** | Standard `termios`/`tty` modules |
| **Arrow Key Detection** | **YES** | Parse ANSI escape sequences |
| **Platform Support** | **PARTIAL** | Unix only, Windows needs alternative |
| **Terminal Restoration** | **YES** | try/finally pattern works |
| **Overall** | **YES** | ✓ Fully feasible on Linux/macOS |

**Recommendation:**
- Implement with `termios`/`tty` for Unix
- For Windows, use `readchar` library or `msvcrt.getch()`
- Test terminal restoration on crashes

---

## 3. Layout Flexibility

### Dynamic Panel Toggling

**Question:** Can Rich's Layout handle dynamic panel show/hide?

**✓ YES:**
```python
# Hide a panel by setting size to 0
layout["dependency_graph"].visible = False  # Not directly supported

# Workaround: Re-split layout
if self.show_dependency_graph:
    layout["middle"].split_row(
        Layout(name="activity"),
        Layout(name="dependency_graph")
    )
else:
    layout["middle"].update(Panel(...))  # Just activity panel
```

**⚠ LIMITATION:** No `.visible` property on Layout. Must reconstruct split when toggling panels.

### Dynamic Resizing

**Question:** Can panels resize based on content or user preference?

**✓ YES:**
```python
# Fixed size
layout["header"].size = 5

# Ratio-based (auto-resize)
layout["middle"].size = None  # Takes remaining space

# Minimum size
layout["footer"].minimum_size = 2
```

**✓ SUPPORTED:** Layouts automatically recalculate when terminal resizes (SIGWINCH signal).

### Modal Overlays

**Question:** Can we layer Rich layouts for modals?

**⚠ PARTIAL:**
- **No Native Overlay:** Rich doesn't support transparent overlays
- **Workaround:** Replace entire layout temporarily
  ```python
  self.saved_layout = self.layout
  self.layout = Layout()  # New layout for modal
  self.layout.update(Panel(modal_content))
  ```
- **Limitation:** Cannot show background behind modal (not a true overlay)

**Alternative:** Use Textual library (built on Rich) which has proper modal dialogs.

---

## 4. Identified Limitations

### What CANNOT Be Done with Rich

| Limitation | Impact | Workaround |
|------------|--------|------------|
| **Horizontal DAG Layout** | Dependency graph horizontal layout requires custom code | Use vertical Tree or write custom layout algorithm |
| **Native Modal Overlays** | Cannot layer content (transparent overlays) | Full-screen replace approach |
| **Interactive Scrolling** | No built-in scroll for Markdown/long content | Manual pagination or use external pager |
| **Layout `.visible` Property** | Cannot directly hide/show panels | Reconstruct layout splits |
| **Windows Platform** | `termios` not available on Windows | Use `readchar` library or `msvcrt` |
| **Clickable Elements** | Rich is keyboard/text only, no mouse support | Keyboard navigation only (acceptable) |
| **True Background Tasks** | Live display blocks main thread | Run Claude sessions in threads (already done) |

---

## 5. Feasibility Verdicts

### Summary Table

| Panel | Feasibility | Complexity | Notes |
|-------|-------------|------------|-------|
| **1. Dependency Graph** | **PARTIAL** | HIGH | ✓ Vertical tree: YES (easy)<br>✗ Horizontal DAG: PARTIAL (complex) |
| **2. Phase Detail** | **YES** | LOW | ✓ Multiple progress bars fully supported |
| **3. Upcoming Tasks** | **YES** | LOW | ✓ Simple extension of existing code |
| **4. Run History** | **YES** | LOW | ✓ Standard table rendering |
| **5. Findings Browser** | **PARTIAL** | MEDIUM | ✓ Markdown rendering: YES<br>⚠ Scrolling: Manual pagination needed |
| **6. Retry Indicator** | **YES** | LOW | ✓ Minor text formatting enhancement |
| **7. Keyboard Nav** | **YES** | MEDIUM | ✓ Threading + termios works with Rich<br>⚠ Unix only (Windows needs alt) |

### Detailed Verdicts

#### 1. Dependency Graph Panel
- **Vertical Tree:** **YES** - Native Tree component, trivial to implement
- **Horizontal DAG:** **PARTIAL** - Possible but requires custom layout algorithm (~100-200 LOC)
- **Recommendation:** Start with vertical tree for MVP

#### 2. Phase Detail Panel
- **YES** - Fully feasible with existing manual bar approach or Progress component
- **Complexity:** LOW - ~30 LOC extension

#### 3. Upcoming Tasks Panel
- **YES** - Straightforward table rendering with selection highlighting
- **Complexity:** LOW - ~20 LOC

#### 4. Run History Panel
- **YES** - Standard Rich Table, data already in status.json
- **Complexity:** LOW - ~40 LOC

#### 5. Findings Browser (Modal)
- **Markdown Rendering:** **YES** - Native Markdown component with full GFM support
- **Modal Overlay:** **PARTIAL** - Full-screen replace works, but not a true overlay
- **Scrolling:** **PARTIAL** - Manual pagination required, no smooth scrolling
- **Complexity:** MEDIUM - ~80 LOC for modal + pagination

#### 6. Retry History Indicator
- **YES** - Simple text formatting and color coding
- **Complexity:** LOW - ~10 LOC extension

#### 7. Keyboard Navigation
- **YES** - Threading + termios works perfectly with Rich Live
- **Platform:** Unix (Linux/macOS) supported, Windows needs alternative
- **Complexity:** MEDIUM - ~100 LOC for handler + event routing

---

## 6. Implementation Recommendations

### Prioritized Implementation Path

| Priority | Panel | Effort | Value | Rationale |
|----------|-------|--------|-------|-----------|
| **1** | Phase Detail | 2h | HIGH | Quick win, low complexity, high user value |
| **2** | Upcoming Tasks | 1h | HIGH | Enables task selection, prerequisite for keyboard nav |
| **3** | Retry Indicator | 0.5h | MEDIUM | Easy enhancement, useful for debugging |
| **4** | Keyboard Nav | 8h | HIGH | Enables interactivity, complex but essential |
| **5** | Run History | 2h | MEDIUM | Useful analytics, straightforward implementation |
| **6** | Findings Browser | 6h | MEDIUM | Markdown works, pagination adds complexity |
| **7** | Dependency Graph (Vertical) | 3h | MEDIUM | Tree component straightforward |
| **8** | Dependency Graph (Horizontal) | 20h | LOW | Complex custom layout, marginal UX gain |

### Risk Mitigation

| Risk | Mitigation Strategy |
|------|---------------------|
| **Windows Compatibility** | Test with `readchar` library or `msvcrt`, provide fallback to --no-tui |
| **Terminal Corruption** | Wrap keyboard handler in try/finally, add signal handlers for SIGTERM |
| **Layout Complexity** | Start with simple layouts, iterate based on feedback |
| **Scrolling UX** | Use PgUp/PgDn for pagination instead of smooth scroll |

---

## 7. Textual Alternative (Optional)

**Note:** Textual is a TUI framework built **on top of Rich** by the same author (Will McGugan / Textualize).

### Textual Advantages

| Feature | Rich | Textual |
|---------|------|---------|
| **Modal Dialogs** | ✗ No native support | ✓ Built-in Screen system |
| **Scrollable Views** | ✗ Manual pagination | ✓ ScrollView widget |
| **Keyboard Events** | ✗ Manual termios | ✓ Event system with key bindings |
| **Mouse Support** | ✗ Not supported | ✓ Click, drag, scroll |
| **Reactive Updates** | Manual refresh() | ✓ Reactive properties |
| **Component System** | Mix of renderables | ✓ Widget hierarchy (like React) |

### Textual Disadvantages

| Aspect | Impact |
|--------|--------|
| **Learning Curve** | Different paradigm (widget-based vs renderable-based) |
| **Migration Effort** | Would require rewriting entire TUI (~500+ LOC) |
| **Dependencies** | Adds additional dependency |
| **Overkill?** | May be over-engineered for current needs |

### Recommendation

**Stick with Rich for now:**
- Current TUI already implemented in Rich
- Most proposed features are feasible in Rich
- Only complex cases (horizontal DAG, smooth scrolling) would significantly benefit from Textual
- Can migrate to Textual later if needed (Rich components are compatible)

---

## 8. Conclusion

### Overall Feasibility: **85% YES**

Rich library can support **6 out of 7** proposed panels with reasonable effort:

**✓ Fully Feasible (5 panels):**
1. Phase Detail Panel - LOW complexity
2. Upcoming Tasks Panel - LOW complexity
3. Run History Panel - LOW complexity
4. Retry History Indicator - LOW complexity
5. Keyboard Navigation - MEDIUM complexity (Unix only)

**⚠ Partially Feasible (2 panels):**
6. Findings Browser - MEDIUM complexity (markdown works, scrolling needs pagination)
7. Dependency Graph - Vertical tree: EASY | Horizontal DAG: COMPLEX

### Key Takeaways

1. **Rich is sufficient** for the proposed TUI enhancements
2. **No blocking limitations** - all critical features are implementable
3. **Complexity mostly LOW** - 5 panels are straightforward extensions (~80 LOC total)
4. **Keyboard navigation works** - Threading + termios compatible with Rich Live
5. **Horizontal DAG is optional** - Vertical tree provides 90% of value with 10% of effort
6. **Textual not required** - Rich meets current needs, can migrate later if needed

### Next Steps

1. Implement **Phase Detail Panel** (quick win, 2h)
2. Add **Upcoming Tasks Panel** (prerequisite for keyboard nav, 1h)
3. Build **Keyboard Handler** (enables interactivity, 8h)
4. Add remaining panels based on user feedback

---

## Sources

- [Rich GitHub Repository](https://github.com/Textualize/rich)
- [Rich Documentation - Layout](https://rich.readthedocs.io/en/stable/layout.html)
- [Rich Documentation - Markdown](https://rich.readthedocs.io/en/latest/markdown.html)
- [Rich Documentation - Progress Display](https://rich.readthedocs.io/en/latest/progress.html)
- [Rich Documentation - Live Display](https://rich.readthedocs.io/en/stable/live.html)
- [Python termios Documentation](https://docs.python.org/3/library/termios.html)
- [Python tty Documentation](https://docs.python.org/3/library/tty.html)
- [Real Python - The Python Rich Package](https://realpython.com/python-rich-package/)
- [Medium - A Practical Guide to Rich](https://medium.com/@jainsnehasj6/a-practical-guide-to-rich-12-ways-to-instantly-beautify-your-python-terminal-3a4a3434d04a)
- [Rich PyPI Package](https://pypi.org/project/rich/)
