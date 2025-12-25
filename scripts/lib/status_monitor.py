#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Status Monitor - Background monitoring for status.json changes.

This module provides the StatusMonitor class which watches the status.json file
for changes and invokes callbacks when updates are detected. Supports both
polling-based monitoring (cross-platform) and inotify-based monitoring (Linux)
for improved responsiveness.

Extracted from plan_orchestrator.py as part of module splitting.
"""

import json
import os
import threading
from typing import Callable, Dict, Optional


__all__ = ['StatusMonitor']


class StatusMonitor:
    """Background monitor that watches status.json for changes."""

    def __init__(
        self,
        status_path: str,
        callback: Callable[[Dict], None],
        interval: float = 0.5  # Reduced from 2.0s to 500ms for responsiveness
    ):
        self.status_path = status_path
        self.callback = callback
        self.interval = interval
        self._stop_event = threading.Event()
        self._thread: Optional[threading.Thread] = None
        self._last_mtime: float = 0
        self._use_inotify = False
        self._watcher = None

        # Try to use inotify for more responsive updates (Linux only)
        try:
            import inotify.adapters
            self._use_inotify = True
        except ImportError:
            pass  # Fall back to polling

    def start(self):
        """Start the background monitoring thread."""
        self._stop_event.clear()

        if self._use_inotify:
            self._thread = threading.Thread(target=self._inotify_loop, daemon=True)
        else:
            self._thread = threading.Thread(target=self._poll_loop, daemon=True)

        self._thread.start()

    def stop(self):
        """Stop the background monitoring thread."""
        self._stop_event.set()
        if self._thread:
            self._thread.join(timeout=5.0)

    def _poll_loop(self):
        """Polling-based monitoring loop (fallback)."""
        while not self._stop_event.is_set():
            try:
                self._check_status()
            except Exception:
                pass  # Silently handle errors

            self._stop_event.wait(self.interval)

    def _inotify_loop(self):
        """inotify-based monitoring loop (Linux, more responsive)."""
        try:
            import inotify.adapters
            import inotify.constants

            # Watch the directory containing status.json
            watch_dir = os.path.dirname(self.status_path)
            watch_file = os.path.basename(self.status_path)

            i = inotify.adapters.Inotify()
            i.add_watch(watch_dir, mask=inotify.constants.IN_MODIFY | inotify.constants.IN_CLOSE_WRITE)

            # Initial check
            self._check_status()

            for event in i.event_gen(yield_nones=True, timeout_s=0.5):
                if self._stop_event.is_set():
                    break

                if event is not None:
                    (_, type_names, path, filename) = event
                    if filename == watch_file:
                        self._check_status()

        except Exception:
            # Fall back to polling if inotify fails
            self._poll_loop()

    def _check_status(self):
        """Check status.json and invoke callback if changed."""
        try:
            mtime = os.path.getmtime(self.status_path)
            if mtime > self._last_mtime:
                self._last_mtime = mtime
                with open(self.status_path, 'r') as f:
                    status = json.load(f)
                self.callback(status)
        except (FileNotFoundError, json.JSONDecodeError, OSError):
            pass
