#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Overlay System for TUI.

This module provides overlay/modal components for the TUI:
- HelpOverlay: Displays keybinding reference
- OverlayManager: Manages overlay visibility and rendering

Usage:
    from scripts.tui.overlays import HelpOverlay, OverlayManager

    overlay_manager = OverlayManager()
    overlay_manager.show_help()
"""

from dataclasses import dataclass, field
from enum import Enum, auto
from typing import Dict, List, Optional, Callable, Any

try:
    from rich.console import Console, RenderableType
    from rich.panel import Panel
    from rich.table import Table
    from rich.text import Text
    from rich.align import Align
    from rich.box import ROUNDED
    RICH_AVAILABLE = True
except ImportError:
    RICH_AVAILABLE = False


class OverlayType(Enum):
    """Types of overlays available."""
    HELP = auto()
    COMMAND_PALETTE = auto()
    TASK_PICKER = auto()
    FINDINGS = auto()
    ERROR = auto()


@dataclass
class KeyBinding:
    """Represents a keybinding for display in help."""
    key: str
    description: str
    category: str = "General"
    context: Optional[str] = None  # e.g., "In Progress panel only"


# Default keybindings organized by category
DEFAULT_KEYBINDINGS: List[KeyBinding] = [
    # Navigation
    KeyBinding("j / ↓", "Move selection down", "Navigation"),
    KeyBinding("k / ↑", "Move selection up", "Navigation"),
    KeyBinding("Tab", "Switch to next panel", "Navigation"),
    KeyBinding("g / Home", "Move to first item", "Navigation"),
    KeyBinding("G / End", "Move to last item", "Navigation"),

    # Mode
    KeyBinding("?", "Toggle this help overlay", "Mode"),
    KeyBinding(":", "Open command palette", "Mode"),
    KeyBinding("/", "Enter search mode", "Mode"),
    KeyBinding("Esc", "Exit current mode / close overlay", "Mode"),

    # Task Actions
    KeyBinding("e", "Explain selected task", "Task Actions"),
    KeyBinding("i", "Implement selected task", "Task Actions"),
    KeyBinding("v", "Verify selected task", "Task Actions"),
    KeyBinding("s", "Skip selected task", "Task Actions"),
    KeyBinding("f", "View task findings", "Task Actions"),
    KeyBinding("d", "Show task dependencies", "Task Actions"),

    # Panel Toggles
    KeyBinding("1-5", "Toggle panel visibility", "Panel Toggles"),
    KeyBinding("F", "Focus mode (maximize panel)", "Panel Toggles"),

    # General
    KeyBinding("q", "Quit TUI", "General"),
    KeyBinding("r", "Refresh display", "General"),
]


class HelpOverlay:
    """
    Help overlay displaying keybinding reference.

    Features:
    - Organized by category
    - Context-sensitive help per panel
    - Toggle visibility with ? key
    """

    def __init__(self, keybindings: Optional[List[KeyBinding]] = None):
        """
        Initialize help overlay.

        Args:
            keybindings: List of keybindings to display (uses defaults if None)
        """
        self.keybindings = keybindings or DEFAULT_KEYBINDINGS
        self._visible = False
        self._current_context: Optional[str] = None

    @property
    def visible(self) -> bool:
        """Check if overlay is visible."""
        return self._visible

    def show(self):
        """Show the help overlay."""
        self._visible = True

    def hide(self):
        """Hide the help overlay."""
        self._visible = False

    def toggle(self) -> bool:
        """Toggle overlay visibility. Returns new visibility state."""
        self._visible = not self._visible
        return self._visible

    def set_context(self, context: Optional[str]):
        """Set context for context-sensitive help."""
        self._current_context = context

    def add_keybinding(self, binding: KeyBinding):
        """Add a keybinding to the help display."""
        self.keybindings.append(binding)

    def get_keybindings_by_category(self) -> Dict[str, List[KeyBinding]]:
        """Get keybindings organized by category."""
        categories: Dict[str, List[KeyBinding]] = {}

        for binding in self.keybindings:
            # Filter by context if set
            if self._current_context and binding.context:
                if binding.context != self._current_context:
                    continue

            if binding.category not in categories:
                categories[binding.category] = []
            categories[binding.category].append(binding)

        return categories

    def render(self) -> 'RenderableType':
        """Render the help overlay as a Rich renderable."""
        if not RICH_AVAILABLE:
            return "Help overlay (Rich not available)"

        # Create a table for keybindings
        categories = self.get_keybindings_by_category()

        # Build content
        content = Text()
        content.append("Keyboard Shortcuts\n\n", style="bold cyan")

        for category, bindings in categories.items():
            content.append(f"  {category}\n", style="bold yellow")
            for binding in bindings:
                content.append(f"    {binding.key:12}", style="green")
                content.append(f"  {binding.description}\n", style="white")
            content.append("\n")

        content.append("Press ", style="dim")
        content.append("?", style="bold cyan")
        content.append(" or ", style="dim")
        content.append("Esc", style="bold cyan")
        content.append(" to close", style="dim")

        # Wrap in a panel
        panel = Panel(
            Align.center(content),
            title="Help",
            border_style="cyan",
            box=ROUNDED,
            padding=(1, 2),
        )

        return panel

    def render_compact(self) -> 'RenderableType':
        """Render a compact version of the help overlay."""
        if not RICH_AVAILABLE:
            return "Help (compact)"

        # Show just the most essential keybindings
        essential = [
            ("j/k", "Navigate"),
            ("Tab", "Switch panel"),
            ("e/i/v", "Actions"),
            ("?", "Full help"),
            ("q", "Quit"),
        ]

        text = Text()
        for key, desc in essential:
            text.append(f" {key}", style="green")
            text.append(f":{desc}", style="dim")

        return Panel(text, title="Quick Keys", border_style="dim")


class OverlayManager:
    """
    Manages overlay visibility and rendering.

    Handles:
    - Overlay stack (only one visible at a time)
    - Keyboard handling for overlays
    - Rendering active overlay
    """

    def __init__(self, plan_path: Optional[str] = None):
        self._overlays: Dict[OverlayType, Any] = {
            OverlayType.HELP: HelpOverlay(),
        }
        self._active_overlay: Optional[OverlayType] = None
        self._plan_path = plan_path

        # Callbacks for overlay events
        self._on_overlay_change: List[Callable[[Optional[OverlayType]], None]] = []

        # Command palette (lazy loaded)
        self._command_palette: Optional[Any] = None

        # Task picker (lazy loaded)
        self._task_picker: Optional[Any] = None

        # Findings browser (lazy loaded)
        self._findings_browser: Optional[Any] = None

    @property
    def active_overlay(self) -> Optional[OverlayType]:
        """Get the currently active overlay type."""
        return self._active_overlay

    @property
    def has_active_overlay(self) -> bool:
        """Check if any overlay is currently active."""
        return self._active_overlay is not None

    def get_overlay(self, overlay_type: OverlayType) -> Any:
        """Get an overlay instance by type."""
        return self._overlays.get(overlay_type)

    def register_overlay(self, overlay_type: OverlayType, overlay: Any):
        """Register a new overlay."""
        self._overlays[overlay_type] = overlay

    def show(self, overlay_type: OverlayType):
        """Show a specific overlay."""
        if overlay_type in self._overlays:
            # Hide current overlay first
            if self._active_overlay:
                self.hide()

            self._active_overlay = overlay_type
            overlay = self._overlays[overlay_type]
            if hasattr(overlay, 'show'):
                overlay.show()

            self._notify_change()

    def hide(self):
        """Hide the active overlay."""
        if self._active_overlay:
            overlay = self._overlays.get(self._active_overlay)
            if overlay and hasattr(overlay, 'hide'):
                overlay.hide()
            self._active_overlay = None
            self._notify_change()

    def toggle(self, overlay_type: OverlayType) -> bool:
        """Toggle an overlay. Returns True if now visible."""
        if self._active_overlay == overlay_type:
            self.hide()
            return False
        else:
            self.show(overlay_type)
            return True

    def toggle_help(self) -> bool:
        """Convenience method to toggle help overlay."""
        return self.toggle(OverlayType.HELP)

    def show_command_palette(self) -> bool:
        """
        Show the command palette overlay.

        Lazy loads the command palette on first use.

        Returns:
            True if shown successfully
        """
        # Lazy load command palette
        if self._command_palette is None:
            try:
                from scripts.tui.command_palette import CommandPaletteModal
                self._command_palette = CommandPaletteModal()
                self._overlays[OverlayType.COMMAND_PALETTE] = self._command_palette
            except ImportError:
                return False

        self._command_palette.show()
        self.show(OverlayType.COMMAND_PALETTE)
        return True

    def get_command_palette(self) -> Optional[Any]:
        """Get the command palette instance (or None if not loaded)."""
        return self._command_palette

    def show_task_picker(
        self,
        multi_select: bool = False,
        title: str = "Select Task",
        on_select: Optional[Callable[[List[str]], None]] = None
    ) -> bool:
        """
        Show the task picker overlay.

        Lazy loads the task picker on first use.

        Args:
            multi_select: Whether to allow multi-select with Space key
            title: Title for the picker modal
            on_select: Callback receiving list of selected task IDs

        Returns:
            True if shown successfully
        """
        # Lazy load task picker
        if self._task_picker is None:
            try:
                from scripts.tui.task_picker import TaskPickerModal
                self._task_picker = TaskPickerModal(multi_select=multi_select)
                self._overlays[OverlayType.TASK_PICKER] = self._task_picker
            except ImportError:
                return False

        # Configure the picker
        self._task_picker.multi_select = multi_select
        self._task_picker.set_title(title)
        if on_select:
            self._task_picker.set_select_callback(on_select)

        self._task_picker.show()
        self.show(OverlayType.TASK_PICKER)
        return True

    def get_task_picker(self) -> Optional[Any]:
        """Get the task picker instance (or None if not loaded)."""
        return self._task_picker

    def show_findings_browser(
        self,
        task_id: Optional[str] = None,
    ) -> bool:
        """
        Show the findings browser overlay.

        Lazy loads the findings browser on first use.

        Args:
            task_id: Optional task ID to show initially

        Returns:
            True if shown successfully
        """
        # Lazy load findings browser
        if self._findings_browser is None:
            try:
                from scripts.tui.findings_browser import FindingsBrowserModal
                self._findings_browser = FindingsBrowserModal(self._plan_path)
                self._overlays[OverlayType.FINDINGS] = self._findings_browser
            except ImportError:
                return False

        self._findings_browser.show(task_id)
        self.show(OverlayType.FINDINGS)
        return True

    def get_findings_browser(self) -> Optional[Any]:
        """Get the findings browser instance (or None if not loaded)."""
        return self._findings_browser

    def set_command_execute_callback(self, callback: Callable[[Any, str], None]):
        """
        Set callback for command execution from palette.

        Args:
            callback: Function receiving (PlanCommand, args_string)
        """
        # Ensure command palette is loaded
        if self._command_palette is None:
            try:
                from scripts.tui.command_palette import CommandPaletteModal
                self._command_palette = CommandPaletteModal()
                self._overlays[OverlayType.COMMAND_PALETTE] = self._command_palette
            except ImportError:
                return

        self._command_palette.set_execute_callback(callback)

    def on_change(self, callback: Callable[[Optional[OverlayType]], None]):
        """Register callback for overlay change events."""
        self._on_overlay_change.append(callback)

    def _notify_change(self):
        """Notify callbacks of overlay change."""
        for callback in self._on_overlay_change:
            try:
                callback(self._active_overlay)
            except Exception:
                pass

    def render(self) -> Optional['RenderableType']:
        """Render the active overlay, or None if no overlay is active."""
        if not self._active_overlay:
            return None

        overlay = self._overlays.get(self._active_overlay)
        if overlay and hasattr(overlay, 'render'):
            return overlay.render()

        return None

    def handle_key(self, key: str) -> bool:
        """
        Handle a key press for overlay navigation.

        Returns True if the key was handled by the overlay.
        """
        if not self._active_overlay:
            return False

        # Command palette has its own key handling
        if self._active_overlay == OverlayType.COMMAND_PALETTE:
            if self._command_palette:
                handled = self._command_palette.handle_key(key)
                # Check if palette was closed
                if not self._command_palette.visible:
                    self._active_overlay = None
                    self._notify_change()
                return handled

        # Task picker has its own key handling
        if self._active_overlay == OverlayType.TASK_PICKER:
            if self._task_picker:
                handled = self._task_picker.handle_key(key)
                # Check if picker was closed
                if not self._task_picker.visible:
                    self._active_overlay = None
                    self._notify_change()
                return handled

        # Findings browser has its own key handling
        if self._active_overlay == OverlayType.FINDINGS:
            if self._findings_browser:
                handled = self._findings_browser.handle_key(key)
                # Check if browser was closed
                if not self._findings_browser.visible:
                    self._active_overlay = None
                    self._notify_change()
                return handled

        # Escape always closes overlay
        if key == 'Escape':
            self.hide()
            return True

        # Help overlay can be toggled with ?
        if key == '?' and self._active_overlay == OverlayType.HELP:
            self.hide()
            return True

        # Let the overlay handle the key
        overlay = self._overlays.get(self._active_overlay)
        if overlay and hasattr(overlay, 'handle_key'):
            return overlay.handle_key(key)

        return False


# Context-specific help configurations
PANEL_HELP_CONTEXTS = {
    'IN_PROGRESS': [
        KeyBinding("e", "Explain this task", "Task Actions", "IN_PROGRESS"),
        KeyBinding("i", "Implement this task", "Task Actions", "IN_PROGRESS"),
        KeyBinding("v", "Verify this task", "Task Actions", "IN_PROGRESS"),
    ],
    'COMPLETIONS': [
        KeyBinding("f", "View findings", "Task Actions", "COMPLETIONS"),
        KeyBinding("u", "Undo completion", "Task Actions", "COMPLETIONS"),
    ],
    'ACTIVITY': [
        KeyBinding("c", "Clear activity log", "Activity", "ACTIVITY"),
        KeyBinding("p", "Pause activity tracking", "Activity", "ACTIVITY"),
    ],
}


def get_help_for_panel(panel_name: str) -> HelpOverlay:
    """Get a help overlay configured for a specific panel."""
    bindings = DEFAULT_KEYBINDINGS.copy()

    # Add panel-specific bindings
    if panel_name in PANEL_HELP_CONTEXTS:
        bindings.extend(PANEL_HELP_CONTEXTS[panel_name])

    overlay = HelpOverlay(keybindings=bindings)
    overlay.set_context(panel_name)
    return overlay


__all__ = [
    'OverlayType',
    'KeyBinding',
    'HelpOverlay',
    'OverlayManager',
    'DEFAULT_KEYBINDINGS',
    'PANEL_HELP_CONTEXTS',
    'get_help_for_panel',
]
