#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Command Palette for TUI.

This module provides a command palette modal for the TUI:
- CommandPaletteModal: Full-screen command palette with fuzzy search
- Command discovery from .claude/commands/plan/ directory
- Tab completion and execution

Usage:
    from scripts.tui.command_palette import CommandPaletteModal

    palette = CommandPaletteModal()
    palette.show()
"""

import os
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Callable, Any, Tuple

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


@dataclass
class PlanCommand:
    """Represents a plan command from .claude/commands/plan/."""
    name: str                          # e.g., "status", "implement"
    description: str                   # First line description from markdown
    path: Path                         # Full path to command file
    category: str = "plan"             # Command category
    shortcut: Optional[str] = None     # Optional keyboard shortcut

    @property
    def display_name(self) -> str:
        """Get display name for the command palette."""
        return f"plan:{self.name}"


@dataclass
class CommandMatch:
    """Represents a command match with score."""
    command: PlanCommand
    score: int = 0  # Higher = better match
    match_ranges: List[Tuple[int, int]] = field(default_factory=list)  # Highlighted ranges


class CommandPaletteModal:
    """
    Command palette modal with fuzzy search.

    Features:
    - Lists available plan commands
    - Fuzzy filter as user types
    - Tab completion for command names
    - Enter to execute selected command
    - Escape to close
    """

    # Path to plan commands relative to project root
    COMMANDS_DIR = ".claude/commands/plan"

    # Commands to exclude from palette (internal/helper files)
    EXCLUDED_PATTERNS = [
        "_common",      # Common includes directory
        "worktree.md",  # Advanced worktree command
    ]

    def __init__(self, project_root: Optional[str] = None):
        """
        Initialize command palette.

        Args:
            project_root: Project root directory (defaults to cwd)
        """
        self.project_root = Path(project_root or os.getcwd())
        self._visible = False
        self._commands: List[PlanCommand] = []
        self._filtered_commands: List[CommandMatch] = []
        self._input_buffer = ""
        self._selected_index = 0
        self._max_visible = 10  # Maximum commands to show

        # Callbacks
        self._on_execute: Optional[Callable[[PlanCommand, str], None]] = None
        self._on_close: Optional[Callable[[], None]] = None

        # Load commands on init
        self._load_commands()

    def _load_commands(self):
        """Load available plan commands from .claude/commands/plan/."""
        commands_path = self.project_root / self.COMMANDS_DIR

        if not commands_path.exists():
            return

        self._commands = []

        for file_path in commands_path.glob("*.md"):
            # Skip excluded patterns
            if any(pattern in file_path.name for pattern in self.EXCLUDED_PATTERNS):
                continue

            # Extract command name (remove .md extension)
            name = file_path.stem

            # Parse description from file (first non-empty, non-header line)
            description = self._parse_command_description(file_path)

            self._commands.append(PlanCommand(
                name=name,
                description=description,
                path=file_path,
            ))

        # Sort by name
        self._commands.sort(key=lambda c: c.name)

        # Initialize filtered list
        self._update_filtered()

    def _parse_command_description(self, file_path: Path) -> str:
        """Parse the description from a command markdown file."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()

            # Skip the first line (typically the title/header)
            for line in lines[1:10]:  # Check first 10 lines after title
                line = line.strip()
                # Skip empty lines and headers
                if not line or line.startswith('#'):
                    continue
                # Found a description line
                return line[:100]  # Truncate to reasonable length

            return "No description available"
        except Exception:
            return "Unable to read description"

    def _update_filtered(self):
        """Update filtered command list based on input buffer."""
        if not self._input_buffer:
            # Show all commands when no filter
            self._filtered_commands = [
                CommandMatch(command=cmd, score=0)
                for cmd in self._commands
            ]
        else:
            # Apply fuzzy filter
            self._filtered_commands = self._fuzzy_filter(self._input_buffer)

        # Clamp selected index
        if self._filtered_commands:
            self._selected_index = min(self._selected_index, len(self._filtered_commands) - 1)
        else:
            self._selected_index = 0

    def _fuzzy_filter(self, query: str) -> List[CommandMatch]:
        """
        Apply fuzzy filtering to commands.

        Scoring:
        - Exact prefix match: +100
        - Substring match: +50
        - Fuzzy char match: +10 per char
        - Consecutive matches: +5 bonus
        """
        query_lower = query.lower()
        matches: List[CommandMatch] = []

        for cmd in self._commands:
            name_lower = cmd.name.lower()
            desc_lower = cmd.description.lower()

            score = 0
            match_ranges: List[Tuple[int, int]] = []

            # Exact prefix match (highest priority)
            if name_lower.startswith(query_lower):
                score += 100 + (10 - len(query_lower))  # Prefer shorter queries
                match_ranges.append((0, len(query_lower)))

            # Substring match
            elif query_lower in name_lower:
                idx = name_lower.index(query_lower)
                score += 50
                match_ranges.append((idx, idx + len(query_lower)))

            # Fuzzy character match
            else:
                query_idx = 0
                last_match = -1
                consecutive_bonus = 0

                for i, char in enumerate(name_lower):
                    if query_idx < len(query_lower) and char == query_lower[query_idx]:
                        score += 10

                        # Consecutive match bonus
                        if last_match == i - 1:
                            consecutive_bonus += 5
                        else:
                            consecutive_bonus = 0

                        score += consecutive_bonus
                        match_ranges.append((i, i + 1))
                        last_match = i
                        query_idx += 1

                # Must match all query chars to be included
                if query_idx < len(query_lower):
                    score = 0

            # Also check description for partial match
            if query_lower in desc_lower:
                score += 20

            if score > 0:
                matches.append(CommandMatch(
                    command=cmd,
                    score=score,
                    match_ranges=match_ranges,
                ))

        # Sort by score (highest first)
        matches.sort(key=lambda m: m.score, reverse=True)
        return matches

    @property
    def visible(self) -> bool:
        """Check if palette is visible."""
        return self._visible

    @property
    def input_buffer(self) -> str:
        """Get current input buffer."""
        return self._input_buffer

    @property
    def selected_command(self) -> Optional[PlanCommand]:
        """Get the currently selected command."""
        if self._filtered_commands and 0 <= self._selected_index < len(self._filtered_commands):
            return self._filtered_commands[self._selected_index].command
        return None

    def show(self):
        """Show the command palette."""
        self._visible = True
        self._input_buffer = ""
        self._selected_index = 0
        self._update_filtered()

    def hide(self):
        """Hide the command palette."""
        self._visible = False
        self._input_buffer = ""
        if self._on_close:
            self._on_close()

    def set_execute_callback(self, callback: Callable[[PlanCommand, str], None]):
        """
        Set callback for command execution.

        Args:
            callback: Function receiving (command, args_string)
        """
        self._on_execute = callback

    def set_close_callback(self, callback: Callable[[], None]):
        """Set callback for palette close."""
        self._on_close = callback

    def handle_input(self, char: str):
        """Handle character input."""
        self._input_buffer += char
        self._update_filtered()

    def handle_backspace(self):
        """Handle backspace key."""
        if self._input_buffer:
            self._input_buffer = self._input_buffer[:-1]
            self._update_filtered()

    def handle_key(self, key: str) -> bool:
        """
        Handle a key press.

        Returns True if the key was handled.
        """
        if key == 'Escape':
            self.hide()
            return True

        if key == 'Enter':
            self._execute_selected()
            return True

        if key == 'Tab':
            self._complete_input()
            return True

        if key == 'Up':
            self.move_selection(-1)
            return True

        if key == 'Down':
            self.move_selection(1)
            return True

        if key == 'Backspace':
            self.handle_backspace()
            return True

        # Regular character input
        if len(key) == 1 and key.isprintable():
            self.handle_input(key)
            return True

        return False

    def move_selection(self, direction: int):
        """Move selection up (-1) or down (+1)."""
        if not self._filtered_commands:
            return

        new_idx = self._selected_index + direction
        new_idx = max(0, min(len(self._filtered_commands) - 1, new_idx))
        self._selected_index = new_idx

    def _complete_input(self):
        """Tab completion - complete to longest common prefix."""
        if not self._filtered_commands:
            return

        if len(self._filtered_commands) == 1:
            # Single match - complete fully
            self._input_buffer = self._filtered_commands[0].command.name
            self._update_filtered()
            return

        # Find longest common prefix
        names = [m.command.name for m in self._filtered_commands]
        prefix = os.path.commonprefix(names)

        if len(prefix) > len(self._input_buffer):
            self._input_buffer = prefix
            self._update_filtered()

    def _execute_selected(self):
        """Execute the selected command."""
        cmd = self.selected_command
        if cmd and self._on_execute:
            # Parse any additional args from input (e.g., "implement 1.1")
            args = ""
            if " " in self._input_buffer:
                args = self._input_buffer.split(" ", 1)[1]
            self._on_execute(cmd, args)
        self.hide()

    def reload_commands(self):
        """Reload commands from disk."""
        self._load_commands()

    def render(self) -> 'RenderableType':
        """Render the command palette as a Rich renderable."""
        if not RICH_AVAILABLE:
            return "Command Palette (Rich not available)"

        # Build content
        content = Text()

        # Input line
        content.append(":", style="bold cyan")
        content.append(self._input_buffer, style="white")
        content.append("█", style="blink white")  # Cursor
        content.append("\n\n")

        # Command list
        if not self._filtered_commands:
            content.append("  No matching commands\n", style="dim italic")
        else:
            visible_commands = self._filtered_commands[:self._max_visible]

            for idx, match in enumerate(visible_commands):
                cmd = match.command

                # Selection indicator
                if idx == self._selected_index:
                    content.append("▶ ", style="bold cyan")
                else:
                    content.append("  ", style="dim")

                # Command name with highlight
                name_text = Text(cmd.display_name)
                for start, end in match.match_ranges:
                    # Adjust for "plan:" prefix
                    name_text.stylize("bold underline", start + 5, end + 5)
                content.append(name_text, style="green" if idx == self._selected_index else "white")

                # Description
                content.append(f"  {cmd.description[:50]}", style="dim")
                content.append("\n")

            # Show more indicator
            remaining = len(self._filtered_commands) - self._max_visible
            if remaining > 0:
                content.append(f"\n  ... and {remaining} more", style="dim italic")

        # Help line
        content.append("\n")
        content.append("Tab", style="cyan")
        content.append(": complete  ", style="dim")
        content.append("↑↓", style="cyan")
        content.append(": navigate  ", style="dim")
        content.append("Enter", style="cyan")
        content.append(": execute  ", style="dim")
        content.append("Esc", style="cyan")
        content.append(": close", style="dim")

        # Wrap in a panel
        panel = Panel(
            content,
            title="Command Palette",
            border_style="cyan",
            box=ROUNDED,
            padding=(1, 2),
        )

        return Align.center(panel)


def discover_plan_commands(project_root: Optional[str] = None) -> List[PlanCommand]:
    """
    Discover available plan commands.

    Args:
        project_root: Project root directory

    Returns:
        List of PlanCommand objects
    """
    palette = CommandPaletteModal(project_root=project_root)
    return palette._commands.copy()


__all__ = [
    'PlanCommand',
    'CommandMatch',
    'CommandPaletteModal',
    'discover_plan_commands',
]
