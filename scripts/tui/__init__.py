"""
TUI Enhancement Package for Plan Orchestrator.

This package provides enhanced TUI components including:
- KeyboardHandler: Non-blocking keyboard input handling
- Overlays: Help overlay and modal systems
- Panels: Extended panel types for TUI layout
- CommandPalette: Command discovery and execution
"""

from scripts.tui.keyboard import KeyboardHandler, KeyEvent, InputMode
from scripts.tui.overlays import (
    HelpOverlay,
    OverlayManager,
    OverlayType,
    KeyBinding,
)
from scripts.tui.panels import (
    PhaseProgressPanel,
    PhaseInfo,
    create_phase_panel,
)
from scripts.tui.command_palette import (
    CommandPaletteModal,
    PlanCommand,
    discover_plan_commands,
)
from scripts.tui.task_picker import (
    TaskPickerModal,
    PickableTask,
    create_task_picker,
)
from scripts.tui.task_actions import (
    TaskActionHandler,
    ActionResult,
    create_task_action_handler,
)
from scripts.tui.command_runner import (
    CommandRunner,
    CommandOutputStreamer,
    CommandResult,
    CommandState,
    StreamEvent,
    create_command_runner,
    create_output_streamer,
)

__all__ = [
    # Keyboard
    'KeyboardHandler',
    'KeyEvent',
    'InputMode',
    # Overlays
    'HelpOverlay',
    'OverlayManager',
    'OverlayType',
    'KeyBinding',
    # Panels
    'PhaseProgressPanel',
    'PhaseInfo',
    'create_phase_panel',
    # Command Palette
    'CommandPaletteModal',
    'PlanCommand',
    'discover_plan_commands',
    # Task Picker
    'TaskPickerModal',
    'PickableTask',
    'create_task_picker',
    # Task Actions
    'TaskActionHandler',
    'ActionResult',
    'create_task_action_handler',
    # Command Runner
    'CommandRunner',
    'CommandOutputStreamer',
    'CommandResult',
    'CommandState',
    'StreamEvent',
    'create_command_runner',
    'create_output_streamer',
]
