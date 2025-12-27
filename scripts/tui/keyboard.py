#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Keyboard Handler for TUI.

This module provides non-blocking keyboard input handling for the TUI:
- KeyboardHandler: Main class for handling keyboard input
- KeyEvent: Dataclass representing a key event
- InputMode: Enum for different input modes (NORMAL, COMMAND, SEARCH)

Usage:
    from scripts.tui.keyboard import KeyboardHandler, InputMode

    handler = KeyboardHandler()
    handler.start()

    while True:
        event = handler.get_event(timeout=0.1)
        if event:
            if event.key == 'q':
                break
            handler.dispatch(event)

    handler.stop()
"""

import os
import sys
import select
import threading
import termios
import tty
from collections import deque
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum, auto
from typing import Callable, Dict, List, Optional, Set, Any


class InputMode(Enum):
    """Input mode for keyboard handling."""
    NORMAL = auto()      # Normal navigation mode
    COMMAND = auto()     # Command palette mode (: prefix)
    SEARCH = auto()      # Search mode (/ prefix)
    INSERT = auto()      # Text input mode


@dataclass
class KeyEvent:
    """Represents a keyboard event."""
    key: str                           # The key pressed (e.g., 'j', 'k', 'Enter', 'Escape')
    timestamp: datetime = field(default_factory=datetime.now)
    modifiers: Set[str] = field(default_factory=set)  # e.g., {'ctrl', 'shift', 'alt'}
    raw: bytes = b''                   # Raw bytes from stdin

    @property
    def is_ctrl(self) -> bool:
        """Check if Ctrl modifier is active."""
        return 'ctrl' in self.modifiers

    @property
    def is_alt(self) -> bool:
        """Check if Alt modifier is active."""
        return 'alt' in self.modifiers

    @property
    def is_shift(self) -> bool:
        """Check if Shift modifier is active."""
        return 'shift' in self.modifiers

    def __repr__(self) -> str:
        mods = '+'.join(sorted(self.modifiers)) if self.modifiers else ''
        if mods:
            return f"KeyEvent({mods}+{self.key})"
        return f"KeyEvent({self.key})"


# Key mappings for special keys
SPECIAL_KEYS = {
    b'\x1b[A': 'Up',
    b'\x1b[B': 'Down',
    b'\x1b[C': 'Right',
    b'\x1b[D': 'Left',
    b'\x1b[H': 'Home',
    b'\x1b[F': 'End',
    b'\x1b[5~': 'PageUp',
    b'\x1b[6~': 'PageDown',
    b'\x1b[2~': 'Insert',
    b'\x1b[3~': 'Delete',
    b'\x1b': 'Escape',
    b'\t': 'Tab',
    b'\r': 'Enter',
    b'\n': 'Enter',
    b'\x7f': 'Backspace',
    b' ': 'Space',
}

# Vim-style key mappings (alternative keys for same action)
VIM_MAPPINGS = {
    'j': 'Down',
    'k': 'Up',
    'h': 'Left',
    'l': 'Right',
    'g': 'Home',      # gg for first item
    'G': 'End',       # G for last item
}

# Control key mappings
CTRL_KEYS = {
    1: 'a', 2: 'b', 3: 'c', 4: 'd', 5: 'e', 6: 'f', 7: 'g',
    8: 'h', 9: 'i', 10: 'j', 11: 'k', 12: 'l', 13: 'm', 14: 'n',
    15: 'o', 16: 'p', 17: 'q', 18: 'r', 19: 's', 20: 't', 21: 'u',
    22: 'v', 23: 'w', 24: 'x', 25: 'y', 26: 'z',
}


class KeyboardHandler:
    """
    Non-blocking keyboard input handler for TUI.

    Features:
    - Threaded stdin reader for non-blocking input
    - Key mapping configuration (vim-style j/k, arrows)
    - Mode system (NORMAL, COMMAND, SEARCH)
    - Key event queue with thread-safe access
    - Action dispatcher for key events
    """

    def __init__(self, use_vim_keys: bool = True, queue_size: int = 100):
        """
        Initialize the keyboard handler.

        Args:
            use_vim_keys: Enable vim-style key mappings (j/k for up/down)
            queue_size: Maximum number of events to queue
        """
        self.use_vim_keys = use_vim_keys
        self.queue_size = queue_size

        # Event queue (thread-safe)
        self._event_queue: deque = deque(maxlen=queue_size)
        self._queue_lock = threading.Lock()

        # Input mode
        self._mode = InputMode.NORMAL
        self._mode_lock = threading.Lock()

        # Command/search buffer for text input modes
        self._input_buffer = ""
        self._input_cursor = 0

        # Reader thread
        self._reader_thread: Optional[threading.Thread] = None
        self._running = False
        self._stop_event = threading.Event()

        # Terminal state
        self._original_settings = None
        self._stdin_fd = None

        # Action handlers: mode -> key -> callback
        self._handlers: Dict[InputMode, Dict[str, Callable[[KeyEvent], Any]]] = {
            InputMode.NORMAL: {},
            InputMode.COMMAND: {},
            InputMode.SEARCH: {},
            InputMode.INSERT: {},
        }

        # Global handlers (called regardless of mode)
        self._global_handlers: Dict[str, Callable[[KeyEvent], Any]] = {}

        # Mode change callbacks
        self._mode_change_callbacks: List[Callable[[InputMode, InputMode], None]] = []

        # Navigation callbacks for TUI integration
        self._nav_callbacks: Dict[str, Callable[[], Any]] = {}

        # Setup default key bindings
        self._setup_default_bindings()

    def _setup_default_bindings(self):
        """Setup default key bindings for all modes."""
        # Escape always exits to NORMAL mode
        self.register_global('Escape', self._handle_escape)

        # Default NORMAL mode bindings
        self.register(InputMode.NORMAL, ':', self._enter_command_mode)
        self.register(InputMode.NORMAL, '/', self._enter_search_mode)
        self.register(InputMode.NORMAL, '?', self._toggle_help)

        # Navigation bindings (handled via callbacks to TUI)
        # These are registered but actual handlers set via set_navigation_callbacks
        self.register(InputMode.NORMAL, 'Up', self._nav_up)
        self.register(InputMode.NORMAL, 'Down', self._nav_down)
        self.register(InputMode.NORMAL, 'Tab', self._nav_next_panel)
        self.register(InputMode.NORMAL, 'Home', self._nav_first)
        self.register(InputMode.NORMAL, 'End', self._nav_last)

    def set_navigation_callbacks(self,
                                  on_up: Optional[Callable[[], Any]] = None,
                                  on_down: Optional[Callable[[], Any]] = None,
                                  on_next_panel: Optional[Callable[[], Any]] = None,
                                  on_prev_panel: Optional[Callable[[], Any]] = None,
                                  on_first: Optional[Callable[[], Any]] = None,
                                  on_last: Optional[Callable[[], Any]] = None):
        """
        Set navigation callbacks for TUI integration.

        These callbacks are invoked when navigation keys are pressed.
        """
        if on_up:
            self._nav_callbacks['up'] = on_up
        if on_down:
            self._nav_callbacks['down'] = on_down
        if on_next_panel:
            self._nav_callbacks['next_panel'] = on_next_panel
        if on_prev_panel:
            self._nav_callbacks['prev_panel'] = on_prev_panel
        if on_first:
            self._nav_callbacks['first'] = on_first
        if on_last:
            self._nav_callbacks['last'] = on_last

    def _nav_up(self, event: KeyEvent) -> bool:
        """Handle up navigation."""
        if 'up' in self._nav_callbacks:
            self._nav_callbacks['up']()
            return True
        return False

    def _nav_down(self, event: KeyEvent) -> bool:
        """Handle down navigation."""
        if 'down' in self._nav_callbacks:
            self._nav_callbacks['down']()
            return True
        return False

    def _nav_next_panel(self, event: KeyEvent) -> bool:
        """Handle next panel navigation (Tab)."""
        if 'next_panel' in self._nav_callbacks:
            self._nav_callbacks['next_panel']()
            return True
        return False

    def _nav_prev_panel(self, event: KeyEvent) -> bool:
        """Handle previous panel navigation (Shift+Tab)."""
        if 'prev_panel' in self._nav_callbacks:
            self._nav_callbacks['prev_panel']()
            return True
        return False

    def _nav_first(self, event: KeyEvent) -> bool:
        """Handle move to first item."""
        if 'first' in self._nav_callbacks:
            self._nav_callbacks['first']()
            return True
        return False

    def _nav_last(self, event: KeyEvent) -> bool:
        """Handle move to last item."""
        if 'last' in self._nav_callbacks:
            self._nav_callbacks['last']()
            return True
        return False

    def _handle_escape(self, event: KeyEvent) -> bool:
        """Handle Escape key - return to NORMAL mode."""
        if self._mode != InputMode.NORMAL:
            self.set_mode(InputMode.NORMAL)
            self._input_buffer = ""
            self._input_cursor = 0
            return True
        return False

    def _enter_command_mode(self, event: KeyEvent) -> bool:
        """Enter command palette mode."""
        self.set_mode(InputMode.COMMAND)
        self._input_buffer = ""
        self._input_cursor = 0
        return True

    def _enter_search_mode(self, event: KeyEvent) -> bool:
        """Enter search mode."""
        self.set_mode(InputMode.SEARCH)
        self._input_buffer = ""
        self._input_cursor = 0
        return True

    def _toggle_help(self, event: KeyEvent) -> bool:
        """Toggle help display (handler should be set externally)."""
        # This is a placeholder - actual implementation handled by TUI
        return True

    @property
    def mode(self) -> InputMode:
        """Get current input mode."""
        with self._mode_lock:
            return self._mode

    def set_mode(self, mode: InputMode):
        """Set input mode with callback notification."""
        with self._mode_lock:
            old_mode = self._mode
            self._mode = mode

        # Notify mode change callbacks
        for callback in self._mode_change_callbacks:
            try:
                callback(old_mode, mode)
            except Exception:
                pass  # Don't crash on callback errors

    @property
    def input_buffer(self) -> str:
        """Get current input buffer (for COMMAND/SEARCH modes)."""
        return self._input_buffer

    @property
    def input_cursor(self) -> int:
        """Get cursor position in input buffer."""
        return self._input_cursor

    def register(self, mode: InputMode, key: str, handler: Callable[[KeyEvent], Any]):
        """
        Register a key handler for a specific mode.

        Args:
            mode: The input mode this handler applies to
            key: The key to handle (e.g., 'j', 'Enter', 'ctrl+c')
            handler: Callback function receiving KeyEvent, returns True if handled
        """
        self._handlers[mode][key] = handler

    def register_global(self, key: str, handler: Callable[[KeyEvent], Any]):
        """
        Register a global key handler (called regardless of mode).

        Args:
            key: The key to handle
            handler: Callback function receiving KeyEvent
        """
        self._global_handlers[key] = handler

    def unregister(self, mode: InputMode, key: str):
        """Unregister a key handler."""
        if key in self._handlers[mode]:
            del self._handlers[mode][key]

    def unregister_global(self, key: str):
        """Unregister a global key handler."""
        if key in self._global_handlers:
            del self._global_handlers[key]

    def on_mode_change(self, callback: Callable[[InputMode, InputMode], None]):
        """Register a callback for mode changes."""
        self._mode_change_callbacks.append(callback)

    def start(self) -> bool:
        """
        Start the keyboard handler.

        Returns:
            True if started successfully, False otherwise
        """
        if self._running:
            return True

        # Check if stdin is a TTY
        if not sys.stdin.isatty():
            return False

        try:
            self._stdin_fd = sys.stdin.fileno()
            self._original_settings = termios.tcgetattr(self._stdin_fd)

            # Set terminal to raw mode (non-blocking, no echo)
            tty.setraw(self._stdin_fd)

            # Start reader thread
            self._running = True
            self._stop_event.clear()
            self._reader_thread = threading.Thread(target=self._reader_loop, daemon=True)
            self._reader_thread.start()

            return True
        except Exception:
            self._restore_terminal()
            return False

    def stop(self):
        """Stop the keyboard handler and restore terminal."""
        self._running = False
        self._stop_event.set()

        if self._reader_thread and self._reader_thread.is_alive():
            self._reader_thread.join(timeout=1.0)

        self._restore_terminal()

    def _restore_terminal(self):
        """Restore terminal to original settings."""
        if self._original_settings and self._stdin_fd is not None:
            try:
                termios.tcsetattr(self._stdin_fd, termios.TCSADRAIN, self._original_settings)
            except Exception:
                pass

    def _reader_loop(self):
        """Background thread that reads from stdin."""
        while self._running and not self._stop_event.is_set():
            try:
                # Use select for non-blocking read with timeout
                if select.select([sys.stdin], [], [], 0.05)[0]:
                    raw = self._read_key()
                    if raw:
                        event = self._parse_key(raw)
                        if event:
                            with self._queue_lock:
                                self._event_queue.append(event)
            except Exception:
                if self._running:
                    continue
                break

    def _read_key(self) -> bytes:
        """Read a key or key sequence from stdin."""
        char = os.read(self._stdin_fd, 1)

        # Handle escape sequences
        if char == b'\x1b':
            # Check if more bytes are available (escape sequence)
            if select.select([sys.stdin], [], [], 0.05)[0]:
                char += os.read(self._stdin_fd, 5)  # Read up to 5 more bytes

        return char

    def _parse_key(self, raw: bytes) -> Optional[KeyEvent]:
        """Parse raw bytes into a KeyEvent."""
        modifiers: Set[str] = set()

        # Check for special keys first
        if raw in SPECIAL_KEYS:
            return KeyEvent(
                key=SPECIAL_KEYS[raw],
                modifiers=modifiers,
                raw=raw
            )

        # Check for Ctrl+key combinations
        if len(raw) == 1:
            byte_val = raw[0]

            # Ctrl+key (codes 1-26 map to Ctrl+a through Ctrl+z)
            if byte_val in CTRL_KEYS:
                modifiers.add('ctrl')
                return KeyEvent(
                    key=CTRL_KEYS[byte_val],
                    modifiers=modifiers,
                    raw=raw
                )

            # Regular ASCII character
            try:
                key = raw.decode('utf-8')
                return KeyEvent(
                    key=key,
                    modifiers=modifiers,
                    raw=raw
                )
            except UnicodeDecodeError:
                return None

        # Multi-byte UTF-8 character
        try:
            key = raw.decode('utf-8')
            return KeyEvent(
                key=key,
                modifiers=modifiers,
                raw=raw
            )
        except UnicodeDecodeError:
            return None

    def get_event(self, timeout: float = 0.0) -> Optional[KeyEvent]:
        """
        Get the next key event from the queue.

        Args:
            timeout: Maximum time to wait (0 for non-blocking)

        Returns:
            KeyEvent if available, None otherwise
        """
        if timeout <= 0:
            with self._queue_lock:
                if self._event_queue:
                    return self._event_queue.popleft()
                return None

        # Wait for event with timeout
        start = datetime.now()
        while (datetime.now() - start).total_seconds() < timeout:
            with self._queue_lock:
                if self._event_queue:
                    return self._event_queue.popleft()
            self._stop_event.wait(0.01)

        return None

    def has_events(self) -> bool:
        """Check if there are pending events."""
        with self._queue_lock:
            return len(self._event_queue) > 0

    def clear_events(self):
        """Clear all pending events."""
        with self._queue_lock:
            self._event_queue.clear()

    def dispatch(self, event: KeyEvent) -> bool:
        """
        Dispatch a key event to registered handlers.

        Args:
            event: The key event to dispatch

        Returns:
            True if the event was handled, False otherwise
        """
        # Handle text input modes specially
        if self._mode in (InputMode.COMMAND, InputMode.SEARCH, InputMode.INSERT):
            if self._handle_text_input(event):
                return True

        # Try global handlers first
        key_str = self._get_handler_key(event)
        if key_str in self._global_handlers:
            result = self._global_handlers[key_str](event)
            if result:
                return True

        # Try mode-specific handlers
        mode_handlers = self._handlers.get(self._mode, {})

        # Try with modifiers first (e.g., 'ctrl+c')
        if key_str in mode_handlers:
            result = mode_handlers[key_str](event)
            if result:
                return True

        # Try vim mappings if enabled and in NORMAL mode
        if self.use_vim_keys and self._mode == InputMode.NORMAL:
            if event.key in VIM_MAPPINGS:
                mapped_key = VIM_MAPPINGS[event.key]
                if mapped_key in mode_handlers:
                    result = mode_handlers[mapped_key](event)
                    if result:
                        return True

        return False

    def _get_handler_key(self, event: KeyEvent) -> str:
        """Get the handler lookup key for an event."""
        if event.modifiers:
            mods = '+'.join(sorted(event.modifiers))
            return f"{mods}+{event.key}"
        return event.key

    def _handle_text_input(self, event: KeyEvent) -> bool:
        """Handle text input for COMMAND/SEARCH/INSERT modes."""
        if event.key == 'Backspace':
            if self._input_cursor > 0:
                self._input_buffer = (
                    self._input_buffer[:self._input_cursor - 1] +
                    self._input_buffer[self._input_cursor:]
                )
                self._input_cursor -= 1
            return True

        if event.key == 'Delete':
            if self._input_cursor < len(self._input_buffer):
                self._input_buffer = (
                    self._input_buffer[:self._input_cursor] +
                    self._input_buffer[self._input_cursor + 1:]
                )
            return True

        if event.key == 'Left':
            if self._input_cursor > 0:
                self._input_cursor -= 1
            return True

        if event.key == 'Right':
            if self._input_cursor < len(self._input_buffer):
                self._input_cursor += 1
            return True

        if event.key == 'Home':
            self._input_cursor = 0
            return True

        if event.key == 'End':
            self._input_cursor = len(self._input_buffer)
            return True

        # Regular character input
        if len(event.key) == 1 and not event.is_ctrl:
            self._input_buffer = (
                self._input_buffer[:self._input_cursor] +
                event.key +
                self._input_buffer[self._input_cursor:]
            )
            self._input_cursor += 1
            return True

        return False


# Convenience function for simple use cases
def create_keyboard_handler(use_vim_keys: bool = True) -> KeyboardHandler:
    """
    Create and configure a keyboard handler.

    Args:
        use_vim_keys: Enable vim-style key mappings

    Returns:
        Configured KeyboardHandler instance
    """
    return KeyboardHandler(use_vim_keys=use_vim_keys)


__all__ = [
    'KeyboardHandler',
    'KeyEvent',
    'InputMode',
    'create_keyboard_handler',
    'SPECIAL_KEYS',
    'VIM_MAPPINGS',
]
