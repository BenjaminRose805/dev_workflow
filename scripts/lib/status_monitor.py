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
from typing import Callable, Dict, Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from .event_bus import EventBus


__all__ = ['StatusMonitor']


class StatusMonitor:
    """Background monitor that watches status.json for changes.

    Optionally integrates with an EventBus to emit events when status changes,
    allowing decoupled subscribers (like API server, WebSocket clients) to
    react to status updates without direct coupling.
    """

    def __init__(
        self,
        status_path: str,
        callback: Callable[[Dict], None],
        interval: float = 0.5,  # Reduced from 2.0s to 500ms for responsiveness
        event_bus: Optional['EventBus'] = None,
        instance_id: Optional[str] = None,
    ):
        self.status_path = status_path
        self.callback = callback
        self.interval = interval
        self.event_bus = event_bus
        self.instance_id = instance_id
        self._stop_event = threading.Event()
        self._thread: Optional[threading.Thread] = None
        self._last_mtime: float = 0
        self._last_status: Optional[Dict] = None  # Track previous status for diff
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
        """Check status.json and invoke callback if changed.

        Also emits events to the event bus if configured:
        - STATUS_UPDATED: Full status data on any change
        - TASK_CHANGED: For individual task status transitions
        - PHASE_CHANGED: When currentPhase changes
        """
        try:
            mtime = os.path.getmtime(self.status_path)
            if mtime > self._last_mtime:
                self._last_mtime = mtime
                with open(self.status_path, 'r') as f:
                    status = json.load(f)

                # Invoke the legacy callback (backward compatibility)
                self.callback(status)

                # Emit events to event bus if configured
                if self.event_bus:
                    self._emit_events(status)

                # Update last status for next diff
                self._last_status = status
        except (FileNotFoundError, json.JSONDecodeError, OSError):
            pass

    def _emit_events(self, status: Dict):
        """Emit events to the event bus based on status changes.

        Args:
            status: The new status data from status.json
        """
        # Import here to avoid circular imports at module load
        from .event_bus import EventType

        # Emit STATUS_UPDATED with full status
        self.event_bus.emit_sync(
            EventType.STATUS_UPDATED,
            data=status,
            instance_id=self.instance_id,
        )

        # Detect and emit TASK_CHANGED events
        if self._last_status:
            old_tasks = {t.get('id'): t for t in self._last_status.get('tasks', [])}
            new_tasks = {t.get('id'): t for t in status.get('tasks', [])}

            for task_id, new_task in new_tasks.items():
                old_task = old_tasks.get(task_id, {})
                old_status = old_task.get('status')
                new_status = new_task.get('status')

                if old_status != new_status:
                    self.event_bus.emit_sync(
                        EventType.TASK_CHANGED,
                        data={
                            'task_id': task_id,
                            'description': new_task.get('description', ''),
                            'old_status': old_status,
                            'new_status': new_status,
                            'phase': new_task.get('phase', ''),
                        },
                        instance_id=self.instance_id,
                    )

            # Detect and emit PHASE_CHANGED events
            old_phase = self._last_status.get('summary', {}).get('currentPhase')
            new_phase = status.get('summary', {}).get('currentPhase')

            if old_phase != new_phase:
                self.event_bus.emit_sync(
                    EventType.PHASE_CHANGED,
                    data={
                        'old_phase': old_phase,
                        'new_phase': new_phase,
                    },
                    instance_id=self.instance_id,
                )
