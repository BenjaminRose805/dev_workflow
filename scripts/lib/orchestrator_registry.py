#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Orchestrator Registry - Track running orchestrator instances.

This module provides a file-based registry for tracking multiple concurrent
orchestrator instances. Each instance registers itself on startup and
unregisters on shutdown, enabling visibility and coordination across
parallel plan executions.

Registry file: .claude/orchestrator-registry.json
"""

import json
import os
import time
import fcntl
from dataclasses import dataclass, asdict
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

__all__ = [
    'OrchestratorInstance',
    'OrchestratorRegistry',
    'DuplicatePlanError',
    'RegistryError',
]


# Configuration
REGISTRY_FILE = ".claude/orchestrator-registry.json"
LOCK_TIMEOUT = 5  # seconds
STALE_THRESHOLD = 60  # seconds - instances without heartbeat for this long are stale
HEARTBEAT_INTERVAL = 10  # seconds between heartbeats


class DuplicatePlanError(Exception):
    """Raised when attempting to run an already-executing plan."""
    pass


class RegistryError(Exception):
    """General registry operation error."""
    pass


@dataclass
class OrchestratorInstance:
    """Represents a running orchestrator instance."""

    id: str                         # Unique ID: orch-{timestamp}
    pid: int                        # Process ID
    plan_path: str                  # Path to plan file
    worktree_path: Optional[str]    # Worktree directory (None if main repo)
    started_at: str                 # ISO timestamp
    last_heartbeat: str             # ISO timestamp of last heartbeat
    status: str                     # running | stopping | stopped | crashed
    socket_path: Optional[str] = None  # Unix socket for IPC
    port: Optional[int] = None      # TCP port for IPC (Windows fallback)

    @classmethod
    def create(
        cls,
        plan_path: str,
        worktree_path: Optional[str] = None,
        socket_path: Optional[str] = None,
        port: Optional[int] = None,
    ) -> 'OrchestratorInstance':
        """Create a new instance with generated ID and timestamps."""
        now = datetime.utcnow().isoformat() + "Z"
        return cls(
            id=f"orch-{int(time.time() * 1000)}",
            pid=os.getpid(),
            plan_path=plan_path,
            worktree_path=worktree_path,
            started_at=now,
            last_heartbeat=now,
            status="running",
            socket_path=socket_path,
            port=port,
        )

    def to_dict(self) -> Dict:
        """Convert to dictionary for JSON serialization."""
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict) -> 'OrchestratorInstance':
        """Create from dictionary."""
        return cls(**data)

    def is_alive(self) -> bool:
        """Check if the process is still running."""
        try:
            os.kill(self.pid, 0)
            return True
        except (OSError, ProcessLookupError):
            return False

    def is_stale(self, threshold_seconds: int = STALE_THRESHOLD) -> bool:
        """Check if the heartbeat is stale."""
        try:
            last = datetime.fromisoformat(self.last_heartbeat.rstrip('Z'))
            age = (datetime.utcnow() - last).total_seconds()
            return age > threshold_seconds
        except (ValueError, AttributeError):
            return True


class OrchestratorRegistry:
    """File-based registry for tracking orchestrator instances.

    The registry file is stored at .claude/orchestrator-registry.json
    relative to the repository root. File locking ensures safe concurrent
    access from multiple orchestrator processes.

    Usage:
        registry = OrchestratorRegistry()

        # Register a new instance
        instance = OrchestratorInstance.create(plan_path)
        registry.register(instance)

        # Update heartbeat periodically
        registry.update_heartbeat(instance.id)

        # List all instances
        for inst in registry.get_all():
            print(f"{inst.id}: {inst.plan_path} ({inst.status})")

        # Unregister on shutdown
        registry.unregister(instance.id)
    """

    def __init__(self, repo_root: Optional[str] = None):
        """Initialize registry.

        Args:
            repo_root: Repository root directory. Auto-detected if not specified.
        """
        if repo_root:
            self.repo_root = Path(repo_root)
        else:
            self.repo_root = self._find_repo_root()

        self.registry_path = self.repo_root / REGISTRY_FILE
        self._ensure_directory()

    def _find_repo_root(self) -> Path:
        """Find repository root by looking for .git directory."""
        current = Path.cwd()
        while current != current.parent:
            if (current / ".git").exists():
                return current
            current = current.parent
        return Path.cwd()

    def _ensure_directory(self):
        """Ensure the .claude directory exists."""
        self.registry_path.parent.mkdir(parents=True, exist_ok=True)

    def _load(self) -> Dict:
        """Load registry data from file."""
        if not self.registry_path.exists():
            return {"instances": [], "lastCleanup": None}

        try:
            with open(self.registry_path, 'r') as f:
                return json.load(f)
        except (json.JSONDecodeError, OSError):
            return {"instances": [], "lastCleanup": None}

    def _save(self, data: Dict):
        """Save registry data to file atomically."""
        temp_path = self.registry_path.with_suffix('.json.tmp')
        with open(temp_path, 'w') as f:
            json.dump(data, f, indent=2)
        temp_path.rename(self.registry_path)

    def _with_lock(self, operation):
        """Execute operation with file locking."""
        lock_path = self.registry_path.with_suffix('.json.lock')

        try:
            # Create lock file if needed
            lock_path.parent.mkdir(parents=True, exist_ok=True)

            with open(lock_path, 'w') as lock_file:
                # Try to acquire exclusive lock
                start = time.time()
                while True:
                    try:
                        fcntl.flock(lock_file.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
                        break
                    except (IOError, OSError):
                        if time.time() - start > LOCK_TIMEOUT:
                            raise RegistryError(f"Failed to acquire registry lock after {LOCK_TIMEOUT}s")
                        time.sleep(0.1)

                try:
                    return operation()
                finally:
                    fcntl.flock(lock_file.fileno(), fcntl.LOCK_UN)
        except FileNotFoundError:
            # Lock file doesn't exist, proceed without locking
            return operation()

    def register(self, instance: OrchestratorInstance):
        """Register a new orchestrator instance.

        Args:
            instance: The orchestrator instance to register.

        Raises:
            DuplicatePlanError: If the plan is already being executed.
        """
        def _register():
            data = self._load()

            # Check for duplicate plan
            for existing in data["instances"]:
                inst = OrchestratorInstance.from_dict(existing)
                if inst.plan_path == instance.plan_path and inst.status == "running":
                    if inst.is_alive() and not inst.is_stale():
                        raise DuplicatePlanError(
                            f"Plan '{instance.plan_path}' is already running "
                            f"(instance: {inst.id}, PID: {inst.pid})"
                        )

            # Remove any stale entries for this plan
            data["instances"] = [
                i for i in data["instances"]
                if i.get("plan_path") != instance.plan_path or
                (OrchestratorInstance.from_dict(i).is_alive() and
                 OrchestratorInstance.from_dict(i).status == "running" and
                 not OrchestratorInstance.from_dict(i).is_stale())
            ]

            # Add new instance
            data["instances"].append(instance.to_dict())
            self._save(data)

        self._with_lock(_register)

    def unregister(self, instance_id: str):
        """Remove an orchestrator instance from the registry.

        Args:
            instance_id: ID of the instance to remove.
        """
        def _unregister():
            data = self._load()
            data["instances"] = [
                i for i in data["instances"]
                if i.get("id") != instance_id
            ]
            self._save(data)

        self._with_lock(_unregister)

    def update_heartbeat(self, instance_id: str):
        """Update the heartbeat timestamp for an instance.

        Args:
            instance_id: ID of the instance to update.
        """
        def _update():
            data = self._load()
            now = datetime.utcnow().isoformat() + "Z"

            for inst in data["instances"]:
                if inst.get("id") == instance_id:
                    inst["last_heartbeat"] = now
                    break

            self._save(data)

        self._with_lock(_update)

    def update_status(self, instance_id: str, status: str):
        """Update the status for an instance.

        Args:
            instance_id: ID of the instance to update.
            status: New status (running, stopping, stopped, crashed).
        """
        def _update():
            data = self._load()

            for inst in data["instances"]:
                if inst.get("id") == instance_id:
                    inst["status"] = status
                    inst["last_heartbeat"] = datetime.utcnow().isoformat() + "Z"
                    break

            self._save(data)

        self._with_lock(_update)

    def get_instance(self, instance_id: str) -> Optional[OrchestratorInstance]:
        """Get a specific instance by ID.

        Args:
            instance_id: ID of the instance to get.

        Returns:
            OrchestratorInstance or None if not found.
        """
        data = self._load()
        for inst in data["instances"]:
            if inst.get("id") == instance_id:
                return OrchestratorInstance.from_dict(inst)
        return None

    def get_all(self) -> List[OrchestratorInstance]:
        """Get all registered instances.

        Returns:
            List of all OrchestratorInstance objects.
        """
        data = self._load()
        return [OrchestratorInstance.from_dict(i) for i in data["instances"]]

    def get_running(self) -> List[OrchestratorInstance]:
        """Get all running instances.

        Returns:
            List of running OrchestratorInstance objects.
        """
        return [i for i in self.get_all() if i.status == "running" and i.is_alive()]

    def get_by_plan(self, plan_path: str) -> Optional[OrchestratorInstance]:
        """Find a running instance for a specific plan.

        Args:
            plan_path: Path to the plan file.

        Returns:
            OrchestratorInstance or None if not found.
        """
        for inst in self.get_all():
            if inst.plan_path == plan_path and inst.status == "running":
                if inst.is_alive() and not inst.is_stale():
                    return inst
        return None

    def get_by_worktree(self, worktree_path: str) -> Optional[OrchestratorInstance]:
        """Find a running instance for a specific worktree.

        Args:
            worktree_path: Path to the worktree directory.

        Returns:
            OrchestratorInstance or None if not found.
        """
        for inst in self.get_all():
            if inst.worktree_path == worktree_path and inst.status == "running":
                if inst.is_alive() and not inst.is_stale():
                    return inst
        return None

    def cleanup_stale(self, threshold_seconds: int = STALE_THRESHOLD) -> List[str]:
        """Remove stale and crashed instances from registry.

        An instance is considered stale if:
        - Its PID is no longer running
        - Its heartbeat is older than threshold_seconds

        Args:
            threshold_seconds: Heartbeat age threshold for staleness.

        Returns:
            List of removed instance IDs.
        """
        removed = []

        def _cleanup():
            nonlocal removed
            data = self._load()
            original_count = len(data["instances"])

            new_instances = []
            for inst_data in data["instances"]:
                inst = OrchestratorInstance.from_dict(inst_data)

                # Keep if: running, alive, and not stale
                if inst.status == "running":
                    if inst.is_alive() and not inst.is_stale(threshold_seconds):
                        new_instances.append(inst_data)
                    else:
                        removed.append(inst.id)
                elif inst.status in ("stopping", "stopped"):
                    # Keep stopping/stopped briefly for visibility
                    if not inst.is_stale(threshold_seconds * 2):
                        new_instances.append(inst_data)
                    else:
                        removed.append(inst.id)
                else:
                    removed.append(inst.id)

            data["instances"] = new_instances
            data["lastCleanup"] = datetime.utcnow().isoformat() + "Z"
            self._save(data)

        self._with_lock(_cleanup)
        return removed

    def count_running(self) -> int:
        """Count the number of running instances.

        Returns:
            Number of running orchestrator instances.
        """
        return len(self.get_running())

    def format_status(self) -> str:
        """Format registry status for display.

        Returns:
            Formatted string showing all instances.
        """
        instances = self.get_all()
        if not instances:
            return "No orchestrators registered"

        lines = ["Registered Orchestrators:", "-" * 60]

        for inst in instances:
            status_indicator = {
                "running": "●",
                "stopping": "○",
                "stopped": "◌",
                "crashed": "✗",
            }.get(inst.status, "?")

            alive_str = "alive" if inst.is_alive() else "dead"
            stale_str = "stale" if inst.is_stale() else "fresh"

            plan_name = Path(inst.plan_path).stem if inst.plan_path else "unknown"
            worktree_str = f" [{inst.worktree_path}]" if inst.worktree_path else ""

            lines.append(
                f"  {status_indicator} {inst.id}: {plan_name}{worktree_str}"
            )
            lines.append(
                f"      PID: {inst.pid} ({alive_str}), heartbeat: {stale_str}"
            )

        return "\n".join(lines)


# Heartbeat thread helper
class HeartbeatThread:
    """Background thread that updates heartbeat periodically."""

    def __init__(
        self,
        registry: OrchestratorRegistry,
        instance_id: str,
        interval: float = HEARTBEAT_INTERVAL,
    ):
        self.registry = registry
        self.instance_id = instance_id
        self.interval = interval
        self._stop = False
        self._thread = None

    def start(self):
        """Start the heartbeat thread."""
        import threading
        self._stop = False
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()

    def stop(self):
        """Stop the heartbeat thread."""
        self._stop = True
        if self._thread:
            self._thread.join(timeout=2.0)

    def _run(self):
        """Heartbeat loop."""
        while not self._stop:
            try:
                self.registry.update_heartbeat(self.instance_id)
            except Exception:
                pass  # Silently handle errors

            # Sleep in small increments for faster shutdown
            for _ in range(int(self.interval * 10)):
                if self._stop:
                    break
                time.sleep(0.1)
