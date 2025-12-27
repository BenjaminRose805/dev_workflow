#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Event Bus - Async event bus for orchestrator events.

This module provides an asynchronous event bus that decouples event producers
(StatusMonitor, StreamingClaudeRunner) from consumers (API server, WebSocket clients).

Features:
- Async and sync callback support
- Thread-safe event queue for cross-thread publishing
- Event filtering by orchestrator instance ID
- Multiple subscribers per event type

Part of the orchestrator API server implementation.
"""

import asyncio
import queue
import threading
import time
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Set, Union

__all__ = [
    'EventType',
    'Event',
    'EventBus',
    'SubscriptionHandle',
]


class EventType(Enum):
    """Event types emitted by the orchestrator system."""

    # Status monitor events
    STATUS_UPDATED = "status_updated"       # Full status.json update
    TASK_CHANGED = "task_changed"           # Individual task status transition
    PHASE_CHANGED = "phase_changed"         # Current phase changed

    # Claude runner events
    TOOL_STARTED = "tool_started"           # Tool call began
    TOOL_COMPLETED = "tool_completed"       # Tool call ended

    # Orchestrator lifecycle events
    ORCHESTRATOR_STATE = "orchestrator_state"  # Orchestrator state change (running/paused/stopped)


@dataclass
class Event:
    """An event emitted on the event bus."""

    type: EventType
    data: Dict[str, Any]
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    instance_id: Optional[str] = None  # Orchestrator instance ID for filtering

    def to_dict(self) -> Dict[str, Any]:
        """Convert event to dictionary for JSON serialization."""
        return {
            "type": self.type.value,
            "data": self.data,
            "timestamp": self.timestamp,
            "instance_id": self.instance_id,
        }


# Type alias for callbacks
SyncCallback = Callable[[Event], None]
AsyncCallback = Callable[[Event], Any]  # Returns coroutine
Callback = Union[SyncCallback, AsyncCallback]


@dataclass
class SubscriptionHandle:
    """Handle for managing a subscription."""

    id: str
    event_type: EventType
    instance_filter: Optional[str]

    _bus: Optional['EventBus'] = field(default=None, repr=False)

    def unsubscribe(self):
        """Remove this subscription from the event bus."""
        if self._bus:
            self._bus.unsubscribe(self)


class EventBus:
    """Async event bus with support for sync and async callbacks.

    The event bus allows components to publish events and subscribe to specific
    event types. It handles both synchronous and asynchronous callbacks, and
    provides thread-safe publishing from sync contexts.

    Usage:
        # Create bus
        bus = EventBus()

        # Subscribe to events
        async def on_status(event):
            print(f"Status updated: {event.data}")

        handle = bus.subscribe(EventType.STATUS_UPDATED, on_status)

        # Emit events (from async context)
        await bus.emit(EventType.STATUS_UPDATED, {"progress": 50})

        # Emit from sync context (queued for async processing)
        bus.emit_sync(EventType.STATUS_UPDATED, {"progress": 75})

        # Unsubscribe when done
        handle.unsubscribe()
    """

    def __init__(self):
        # Subscriptions: event_type -> list of (callback, instance_filter, handle_id)
        self._subscriptions: Dict[EventType, List[tuple]] = {et: [] for et in EventType}
        self._subscription_lock = threading.Lock()
        self._next_id = 0

        # Thread-safe queue for cross-thread event publishing
        self._sync_queue: queue.Queue[Event] = queue.Queue()
        self._queue_processor_task: Optional[asyncio.Task] = None
        self._running = False

        # Event loop reference (set when start() is called)
        self._loop: Optional[asyncio.AbstractEventLoop] = None

    def start(self, loop: Optional[asyncio.AbstractEventLoop] = None):
        """Start the event bus queue processor.

        Args:
            loop: Event loop to use. If None, uses current loop.
        """
        if self._running:
            return

        self._running = True
        self._loop = loop or asyncio.get_event_loop()

        # Start queue processor in the event loop
        self._queue_processor_task = self._loop.create_task(self._process_queue())

    async def stop(self):
        """Stop the event bus and clean up."""
        self._running = False

        if self._queue_processor_task:
            self._queue_processor_task.cancel()
            try:
                await self._queue_processor_task
            except asyncio.CancelledError:
                pass
            self._queue_processor_task = None

    def subscribe(
        self,
        event_type: EventType,
        callback: Callback,
        instance_filter: Optional[str] = None,
    ) -> SubscriptionHandle:
        """Subscribe to an event type.

        Args:
            event_type: The type of event to subscribe to.
            callback: Callback function (sync or async).
            instance_filter: If set, only receive events from this instance ID.

        Returns:
            SubscriptionHandle for managing the subscription.
        """
        with self._subscription_lock:
            handle_id = f"sub-{self._next_id}"
            self._next_id += 1

            handle = SubscriptionHandle(
                id=handle_id,
                event_type=event_type,
                instance_filter=instance_filter,
                _bus=self,
            )

            self._subscriptions[event_type].append((callback, instance_filter, handle_id))

            return handle

    def unsubscribe(self, handle: SubscriptionHandle):
        """Remove a subscription.

        Args:
            handle: The subscription handle to remove.
        """
        with self._subscription_lock:
            subs = self._subscriptions.get(handle.event_type, [])
            self._subscriptions[handle.event_type] = [
                s for s in subs if s[2] != handle.id
            ]

    async def emit(
        self,
        event_type: EventType,
        data: Dict[str, Any],
        instance_id: Optional[str] = None,
    ):
        """Emit an event to all subscribers (async).

        Args:
            event_type: Type of event to emit.
            data: Event data payload.
            instance_id: Orchestrator instance ID (for filtering).
        """
        event = Event(type=event_type, data=data, instance_id=instance_id)
        await self._dispatch(event)

    def emit_sync(
        self,
        event_type: EventType,
        data: Dict[str, Any],
        instance_id: Optional[str] = None,
    ):
        """Emit an event from a sync context (queued for async processing).

        This method is thread-safe and can be called from any thread.
        The event will be processed in the event bus's async loop.

        Args:
            event_type: Type of event to emit.
            data: Event data payload.
            instance_id: Orchestrator instance ID (for filtering).
        """
        event = Event(type=event_type, data=data, instance_id=instance_id)
        self._sync_queue.put(event)

        # If we have a loop reference and it's running, schedule processing
        if self._loop and self._running:
            try:
                self._loop.call_soon_threadsafe(self._wake_queue_processor)
            except RuntimeError:
                pass  # Loop might be closed

    def _wake_queue_processor(self):
        """Wake up the queue processor to handle new events."""
        # The processor checks the queue periodically anyway,
        # but this provides faster response for immediate events
        pass

    async def _process_queue(self):
        """Process events from the sync queue."""
        while self._running:
            try:
                # Check queue with timeout to allow for shutdown
                try:
                    event = self._sync_queue.get_nowait()
                    await self._dispatch(event)
                except queue.Empty:
                    # No events, sleep briefly
                    await asyncio.sleep(0.01)
            except asyncio.CancelledError:
                break
            except Exception:
                # Log but don't crash on individual event errors
                pass

    async def _dispatch(self, event: Event):
        """Dispatch an event to all matching subscribers.

        Args:
            event: The event to dispatch.
        """
        with self._subscription_lock:
            subs = list(self._subscriptions.get(event.type, []))

        for callback, instance_filter, handle_id in subs:
            # Apply instance filter
            if instance_filter and event.instance_id != instance_filter:
                continue

            try:
                # Check if callback is async
                if asyncio.iscoroutinefunction(callback):
                    await callback(event)
                else:
                    # Run sync callback in thread pool to avoid blocking
                    loop = asyncio.get_event_loop()
                    await loop.run_in_executor(None, callback, event)
            except Exception:
                # Log but don't crash on callback errors
                pass

    def get_subscriber_count(self, event_type: Optional[EventType] = None) -> int:
        """Get the number of subscribers.

        Args:
            event_type: If set, count only for this event type.

        Returns:
            Number of active subscriptions.
        """
        with self._subscription_lock:
            if event_type:
                return len(self._subscriptions.get(event_type, []))
            return sum(len(subs) for subs in self._subscriptions.values())

    def clear_subscriptions(self, event_type: Optional[EventType] = None):
        """Clear all subscriptions.

        Args:
            event_type: If set, clear only for this event type.
        """
        with self._subscription_lock:
            if event_type:
                self._subscriptions[event_type] = []
            else:
                self._subscriptions = {et: [] for et in EventType}


# Convenience function for creating a global bus instance
_global_bus: Optional[EventBus] = None


def get_event_bus() -> EventBus:
    """Get or create the global event bus instance.

    Returns:
        The global EventBus instance.
    """
    global _global_bus
    if _global_bus is None:
        _global_bus = EventBus()
    return _global_bus


def reset_event_bus():
    """Reset the global event bus (mainly for testing)."""
    global _global_bus
    _global_bus = None
