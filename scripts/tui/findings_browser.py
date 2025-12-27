#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Findings Browser Modal for TUI.

This module provides a full-screen modal overlay for browsing findings:
- FindingsBrowserModal: Displays task findings with markdown rendering
- Supports scrolling, navigation between findings, and keyboard control

Usage:
    from scripts.tui.findings_browser import FindingsBrowserModal

    browser = FindingsBrowserModal(plan_path)
    browser.show(task_id='1.1')
    renderable = browser.render()
"""

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Any

try:
    from rich.console import Console, RenderableType
    from rich.panel import Panel
    from rich.text import Text
    from rich.markdown import Markdown
    from rich.align import Align
    from rich.box import ROUNDED
    from rich.padding import Padding
    RICH_AVAILABLE = True
except ImportError:
    RICH_AVAILABLE = False


@dataclass
class Finding:
    """Represents a single finding document."""
    task_id: str
    path: str
    title: str
    content: str

    @classmethod
    def from_file(cls, path: str) -> Optional['Finding']:
        """
        Load a finding from a markdown file.

        Args:
            path: Path to the finding file

        Returns:
            Finding instance or None if file cannot be read
        """
        try:
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()

            # Extract task ID from filename (e.g., "1.1.md" or "1.1-analysis.md")
            filename = os.path.basename(path)
            task_id = filename.split('.md')[0]
            # Handle filenames like "1.1-analysis.md"
            if '-' in task_id:
                task_id = task_id.split('-')[0]

            # Extract title from first heading or filename
            lines = content.split('\n')
            title = filename
            for line in lines:
                if line.startswith('# '):
                    title = line[2:].strip()
                    break
                elif line.startswith('## '):
                    title = line[3:].strip()
                    break

            return cls(
                task_id=task_id,
                path=path,
                title=title,
                content=content,
            )
        except Exception:
            return None


class FindingsBrowserModal:
    """
    Full-screen modal overlay for browsing findings.

    Features:
    - Reads findings from docs/plan-outputs/{plan}/findings/*.md
    - Renders markdown using Rich Markdown component
    - Supports scrolling with arrow keys
    - Navigate between findings with n/p keys
    - Close with q or Escape
    """

    def __init__(self, plan_path: Optional[str] = None):
        """
        Initialize the findings browser.

        Args:
            plan_path: Path to plan file (uses current plan if None)
        """
        self.plan_path = plan_path
        self._plan_name: Optional[str] = None
        self._findings_dir: Optional[str] = None

        # State
        self._visible = False
        self._findings: List[Finding] = []
        self._current_index = 0
        self._scroll_offset = 0
        self._max_scroll = 0

        # Display settings
        self._lines_per_page = 20  # Will be adjusted based on terminal size

        # Initialize paths
        self._init_paths()

    def _init_paths(self):
        """Initialize plan paths."""
        if self.plan_path:
            self._plan_name = os.path.basename(self.plan_path).replace('.md', '')
        else:
            # Try to read current plan
            current_plan_path = '.claude/current-plan.txt'
            if os.path.exists(current_plan_path):
                with open(current_plan_path, 'r') as f:
                    plan_path = f.read().strip()
                self._plan_name = os.path.basename(plan_path).replace('.md', '')

        if self._plan_name:
            self._findings_dir = f'docs/plan-outputs/{self._plan_name}/findings'

    @property
    def visible(self) -> bool:
        """Check if modal is visible."""
        return self._visible

    def show(self, task_id: Optional[str] = None):
        """
        Show the findings browser.

        Args:
            task_id: Optional task ID to show initially
        """
        self._visible = True
        self.load_findings()

        if task_id:
            self.navigate_to_task(task_id)
        else:
            self._current_index = 0
            self._scroll_offset = 0

    def hide(self):
        """Hide the findings browser."""
        self._visible = False

    def toggle(self) -> bool:
        """Toggle visibility. Returns new visibility state."""
        self._visible = not self._visible
        if self._visible:
            self.load_findings()
        return self._visible

    def load_findings(self):
        """Load all findings from the findings directory."""
        self._findings = []

        if not self._findings_dir or not os.path.isdir(self._findings_dir):
            return

        # Find all markdown files
        for filename in sorted(os.listdir(self._findings_dir)):
            if filename.endswith('.md'):
                path = os.path.join(self._findings_dir, filename)
                finding = Finding.from_file(path)
                if finding:
                    self._findings.append(finding)

    def get_finding(self, task_id: str) -> Optional[Finding]:
        """Get a finding by task ID."""
        for finding in self._findings:
            if finding.task_id == task_id:
                return finding
        return None

    def navigate_to_task(self, task_id: str) -> bool:
        """
        Navigate to a specific task's finding.

        Args:
            task_id: Task ID to navigate to

        Returns:
            True if found and navigated, False otherwise
        """
        for idx, finding in enumerate(self._findings):
            if finding.task_id == task_id:
                self._current_index = idx
                self._scroll_offset = 0
                return True
        return False

    @property
    def current_finding(self) -> Optional[Finding]:
        """Get the currently displayed finding."""
        if 0 <= self._current_index < len(self._findings):
            return self._findings[self._current_index]
        return None

    @property
    def finding_count(self) -> int:
        """Get total number of findings."""
        return len(self._findings)

    # =========================================================================
    # Navigation
    # =========================================================================

    def next_finding(self) -> bool:
        """
        Navigate to next finding.

        Returns:
            True if moved to next, False if at end
        """
        if self._current_index < len(self._findings) - 1:
            self._current_index += 1
            self._scroll_offset = 0
            return True
        return False

    def prev_finding(self) -> bool:
        """
        Navigate to previous finding.

        Returns:
            True if moved to previous, False if at start
        """
        if self._current_index > 0:
            self._current_index -= 1
            self._scroll_offset = 0
            return True
        return False

    def scroll_down(self, lines: int = 1) -> bool:
        """
        Scroll content down.

        Args:
            lines: Number of lines to scroll

        Returns:
            True if scrolled, False if at bottom
        """
        if self._scroll_offset < self._max_scroll:
            self._scroll_offset = min(self._scroll_offset + lines, self._max_scroll)
            return True
        return False

    def scroll_up(self, lines: int = 1) -> bool:
        """
        Scroll content up.

        Args:
            lines: Number of lines to scroll

        Returns:
            True if scrolled, False if at top
        """
        if self._scroll_offset > 0:
            self._scroll_offset = max(0, self._scroll_offset - lines)
            return True
        return False

    def scroll_page_down(self) -> bool:
        """Scroll down by one page."""
        return self.scroll_down(self._lines_per_page)

    def scroll_page_up(self) -> bool:
        """Scroll up by one page."""
        return self.scroll_up(self._lines_per_page)

    def scroll_to_top(self):
        """Scroll to top of content."""
        self._scroll_offset = 0

    def scroll_to_bottom(self):
        """Scroll to bottom of content."""
        self._scroll_offset = self._max_scroll

    # =========================================================================
    # Key Handling
    # =========================================================================

    def handle_key(self, key: str) -> bool:
        """
        Handle a key press.

        Args:
            key: Key that was pressed

        Returns:
            True if key was handled, False otherwise
        """
        # Close keys
        if key in ('q', 'Escape'):
            self.hide()
            return True

        # Navigation between findings
        if key in ('n', 'Right'):
            return self.next_finding()

        if key in ('p', 'N', 'Left'):
            return self.prev_finding()

        # Scrolling
        if key in ('j', 'Down'):
            return self.scroll_down()

        if key in ('k', 'Up'):
            return self.scroll_up()

        if key in ('PageDown', 'Space'):
            return self.scroll_page_down()

        if key == 'PageUp':
            return self.scroll_page_up()

        if key in ('g', 'Home'):
            self.scroll_to_top()
            return True

        if key in ('G', 'End'):
            self.scroll_to_bottom()
            return True

        return False

    # =========================================================================
    # Rendering
    # =========================================================================

    def set_viewport_size(self, lines: int):
        """
        Set the viewport size for scrolling calculations.

        Args:
            lines: Number of visible lines
        """
        self._lines_per_page = max(5, lines - 8)  # Account for borders and header

    def _render_content(self) -> 'RenderableType':
        """Render the finding content with markdown."""
        finding = self.current_finding

        if not finding:
            return Text("[dim]No findings available[/dim]", justify="center")

        # Split content into lines for scrolling
        content_lines = finding.content.split('\n')
        self._max_scroll = max(0, len(content_lines) - self._lines_per_page)

        # Get visible portion
        start = self._scroll_offset
        end = start + self._lines_per_page
        visible_content = '\n'.join(content_lines[start:end])

        # Render as markdown
        try:
            return Markdown(visible_content)
        except Exception:
            # Fall back to plain text if markdown fails
            return Text(visible_content)

    def _render_header(self) -> Text:
        """Render the header with navigation info."""
        finding = self.current_finding

        header = Text()
        header.append("FINDINGS BROWSER", style="bold cyan")
        header.append("  |  ", style="dim")

        if finding:
            header.append(f"Task {finding.task_id}: ", style="bold yellow")
            header.append(finding.title, style="white")
        else:
            header.append("No findings", style="dim")

        return header

    def _render_footer(self) -> Text:
        """Render the footer with navigation hints."""
        footer = Text()

        # Navigation info
        if len(self._findings) > 1:
            footer.append(f"Finding {self._current_index + 1}/{len(self._findings)}", style="cyan")
            footer.append("  ", style="dim")

        # Scroll info
        if self._max_scroll > 0:
            pct = int((self._scroll_offset / self._max_scroll) * 100) if self._max_scroll else 0
            footer.append(f"[{pct}%]", style="dim")
            footer.append("  ", style="dim")

        # Key hints
        footer.append("j/k", style="green")
        footer.append(":scroll ", style="dim")
        footer.append("n/p", style="green")
        footer.append(":prev/next ", style="dim")
        footer.append("q", style="green")
        footer.append(":close", style="dim")

        return footer

    def render(self) -> 'RenderableType':
        """Render the findings browser modal."""
        if not RICH_AVAILABLE:
            return "Findings Browser (Rich not available)"

        if not self._visible:
            return Text("")

        # Build content
        content = self._render_content()

        # Build header panel
        header = self._render_header()

        # Build footer
        footer = self._render_footer()

        # Combine into panel
        from rich.console import Group

        full_content = Group(
            header,
            Text("─" * 60, style="dim"),  # Separator
            Padding(content, (1, 2)),
            Text("─" * 60, style="dim"),  # Separator
            footer,
        )

        panel = Panel(
            Align.center(full_content, vertical="top"),
            title="Findings",
            border_style="cyan",
            box=ROUNDED,
            padding=(0, 1),
        )

        return panel

    def render_compact(self) -> 'RenderableType':
        """Render a compact version showing just the title."""
        if not RICH_AVAILABLE:
            return "Findings (compact)"

        finding = self.current_finding

        text = Text()
        if finding:
            text.append(f"Task {finding.task_id}: ", style="bold yellow")
            text.append(finding.title[:40], style="white")
            if len(finding.title) > 40:
                text.append("...", style="dim")
        else:
            text.append("No findings", style="dim")

        return Panel(text, title="Findings", border_style="cyan")


def create_findings_browser(plan_path: Optional[str] = None) -> FindingsBrowserModal:
    """
    Create a findings browser modal.

    Args:
        plan_path: Optional path to plan file

    Returns:
        Configured FindingsBrowserModal instance
    """
    return FindingsBrowserModal(plan_path)


__all__ = [
    'Finding',
    'FindingsBrowserModal',
    'create_findings_browser',
]
