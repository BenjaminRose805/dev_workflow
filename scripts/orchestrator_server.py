#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Orchestrator API Server - FastAPI-based HTTP/WebSocket server.

This module provides a REST API and WebSocket interface for controlling and
monitoring orchestrator instances. It exposes endpoints for:
- Listing registered orchestrator instances
- Getting status of specific orchestrators
- Querying plans and tasks
- Sending control commands (pause, resume, shutdown)

Usage:
    # Run standalone:
    uvicorn scripts.orchestrator_server:app --reload --port 8000

    # Or via runner script:
    python scripts/run_api_server.py --port 8000

Part of the orchestrator API server implementation.
"""

import asyncio
import json
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional, Set

from fastapi import FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from scripts.lib.event_bus import EventBus, EventType, Event, get_event_bus

# Local imports - these are relative to the repo root
from scripts.lib.orchestrator_registry import OrchestratorRegistry, OrchestratorInstance

# ============================================================================
# Pydantic Models
# ============================================================================


class TaskInfo(BaseModel):
    """Information about a single task."""

    id: str
    description: str
    status: Literal["pending", "in_progress", "completed", "failed", "skipped"]
    phase: Optional[str] = None
    retry_count: int = 0
    last_error: Optional[str] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None


class PhaseSummary(BaseModel):
    """Summary of a phase's progress."""

    phase_number: int
    name: str
    total_tasks: int
    completed_tasks: int
    pending_tasks: int
    failed_tasks: int
    is_current: bool = False


class StatusSummary(BaseModel):
    """Summary of plan execution status."""

    total_tasks: int = 0
    completed: int = 0
    pending: int = 0
    in_progress: int = 0
    failed: int = 0
    skipped: int = 0
    current_phase: Optional[str] = None
    progress_percent: float = 0.0


class OrchestratorInfo(BaseModel):
    """Information about a registered orchestrator instance."""

    id: str = Field(..., description="Unique orchestrator instance ID")
    pid: int = Field(..., description="Process ID of the orchestrator")
    plan_path: str = Field(..., description="Path to the plan file being executed")
    plan_name: str = Field(..., description="Name of the plan (derived from filename)")
    worktree_path: Optional[str] = Field(None, description="Worktree path if using worktrees")
    started_at: str = Field(..., description="ISO timestamp when orchestrator started")
    last_heartbeat: str = Field(..., description="ISO timestamp of last heartbeat")
    status: Literal["running", "stopping", "stopped", "crashed"] = Field(
        ..., description="Current orchestrator status"
    )
    socket_path: Optional[str] = Field(None, description="Unix socket path for IPC")
    is_alive: bool = Field(..., description="Whether the process is still running")
    is_stale: bool = Field(..., description="Whether the heartbeat is stale")


class StatusResponse(BaseModel):
    """Full status response for an orchestrator."""

    instance_id: str
    plan_path: str
    plan_name: str
    status: Literal["running", "paused", "stopping", "stopped"]
    summary: StatusSummary
    tasks: List[TaskInfo] = []
    phases: List[PhaseSummary] = []
    started_at: Optional[str] = None
    iteration: int = 0
    max_iterations: int = 0


class PlanInfo(BaseModel):
    """Information about an available plan."""

    name: str
    path: str
    has_status: bool = False
    last_modified: Optional[str] = None
    output_dir: Optional[str] = None


class FindingInfo(BaseModel):
    """Information about a task finding."""

    task_id: str
    file_path: str
    size_bytes: int
    last_modified: str


class HealthResponse(BaseModel):
    """Health check response."""

    status: Literal["healthy", "degraded", "unhealthy"] = "healthy"
    version: str = "1.0.0"
    timestamp: str
    orchestrators_running: int = 0


# ============================================================================
# FastAPI Application
# ============================================================================


API_DESCRIPTION = """
# Orchestrator API

REST API for controlling and monitoring plan orchestrators.

## Features

- **List Orchestrators**: View all registered orchestrator instances
- **Status Monitoring**: Get real-time status of tasks and progress
- **Control Commands**: Pause, resume, and shutdown orchestrators
- **Plan Management**: Query available plans and their execution status
- **Real-time Events**: WebSocket and SSE endpoints for live updates

## WebSocket Endpoints

Connect to `/api/orchestrators/{instance_id}/events` for all events, or
`/api/orchestrators/{instance_id}/activity` for tool activity only.

## Quick Start

```python
import requests

# List running orchestrators
response = requests.get("http://localhost:8000/api/orchestrators")
orchestrators = response.json()

# Get status of specific orchestrator
response = requests.get(f"http://localhost:8000/api/orchestrators/{orchestrators[0]['id']}/status")
status = response.json()
```

## TypeScript Client

Generated TypeScript types are available. See `api-types.ts` and `api-client.ts`
in the plan outputs directory.
"""

app = FastAPI(
    title="Orchestrator API",
    description=API_DESCRIPTION,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_tags=[
        {
            "name": "Health",
            "description": "Health check and liveness probes",
        },
        {
            "name": "Orchestrators",
            "description": "List and query orchestrator instances",
        },
        {
            "name": "Commands",
            "description": "Control orchestrator execution (pause, resume, shutdown)",
        },
        {
            "name": "Plans",
            "description": "Query available plans and their status",
        },
        {
            "name": "Events",
            "description": "Real-time event streaming via WebSocket and SSE",
        },
    ],
)

# Configure CORS for Next.js frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",       # Next.js dev server
        "http://localhost:3001",       # Alternative port
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================================
# Helper Functions
# ============================================================================


def get_registry() -> OrchestratorRegistry:
    """Get the orchestrator registry instance."""
    return OrchestratorRegistry()


def get_plans_dir() -> Path:
    """Get the plans directory path."""
    # Find repo root by looking for .git
    current = Path.cwd()
    while current != current.parent:
        if (current / ".git").exists():
            return current / "docs" / "plans"
        current = current.parent
    return Path.cwd() / "docs" / "plans"


def get_output_dir(plan_name: str) -> Path:
    """Get the output directory for a plan."""
    current = Path.cwd()
    while current != current.parent:
        if (current / ".git").exists():
            return current / "docs" / "plan-outputs" / plan_name
        current = current.parent
    return Path.cwd() / "docs" / "plan-outputs" / plan_name


def load_status_json(plan_path: str) -> Optional[Dict[str, Any]]:
    """Load status.json for a plan.

    Args:
        plan_path: Path to the plan file.

    Returns:
        Status data or None if not found.
    """
    plan_name = Path(plan_path).stem
    output_dir = get_output_dir(plan_name)
    status_file = output_dir / "status.json"

    if not status_file.exists():
        return None

    try:
        with open(status_file, 'r') as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return None


def instance_to_info(inst: OrchestratorInstance) -> OrchestratorInfo:
    """Convert OrchestratorInstance to OrchestratorInfo response model."""
    return OrchestratorInfo(
        id=inst.id,
        pid=inst.pid,
        plan_path=inst.plan_path,
        plan_name=Path(inst.plan_path).stem if inst.plan_path else "unknown",
        worktree_path=inst.worktree_path,
        started_at=inst.started_at,
        last_heartbeat=inst.last_heartbeat,
        status=inst.status,
        socket_path=inst.socket_path,
        is_alive=inst.is_alive(),
        is_stale=inst.is_stale(),
    )


def build_status_response(inst: OrchestratorInstance) -> StatusResponse:
    """Build a full status response for an orchestrator instance.

    Args:
        inst: The orchestrator instance.

    Returns:
        StatusResponse with full status data.
    """
    status_data = load_status_json(inst.plan_path) or {}

    # Build summary
    summary_data = status_data.get('summary', {})
    summary = StatusSummary(
        total_tasks=summary_data.get('totalTasks', 0),
        completed=summary_data.get('completed', 0),
        pending=summary_data.get('pending', 0),
        in_progress=summary_data.get('in_progress', 0),
        failed=summary_data.get('failed', 0),
        skipped=summary_data.get('skipped', 0),
        current_phase=summary_data.get('currentPhase'),
        progress_percent=(
            (summary_data.get('completed', 0) / summary_data.get('totalTasks', 1)) * 100
            if summary_data.get('totalTasks', 0) > 0 else 0.0
        ),
    )

    # Build task list
    tasks = []
    for task_data in status_data.get('tasks', []):
        tasks.append(TaskInfo(
            id=task_data.get('id', ''),
            description=task_data.get('description', ''),
            status=task_data.get('status', 'pending'),
            phase=task_data.get('phase'),
            retry_count=task_data.get('retryCount', 0),
            last_error=task_data.get('lastError'),
            started_at=task_data.get('startedAt'),
            completed_at=task_data.get('completedAt'),
        ))

    # Determine orchestrator status
    orch_status = inst.status
    if orch_status == "running":
        # Check if actually paused (would need IPC or status file check)
        pass

    return StatusResponse(
        instance_id=inst.id,
        plan_path=inst.plan_path,
        plan_name=Path(inst.plan_path).stem if inst.plan_path else "unknown",
        status=orch_status,
        summary=summary,
        tasks=tasks,
        phases=[],  # Phase summaries can be derived from tasks by client
        started_at=inst.started_at,
        iteration=status_data.get('iteration', 0),
        max_iterations=status_data.get('maxIterations', 0),
    )


# ============================================================================
# Health Endpoint
# ============================================================================


@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check() -> HealthResponse:
    """Health check endpoint for liveness probes.

    Returns basic health status and count of running orchestrators.
    """
    registry = get_registry()
    running_count = registry.count_running()

    return HealthResponse(
        status="healthy",
        version="1.0.0",
        timestamp=datetime.utcnow().isoformat() + "Z",
        orchestrators_running=running_count,
    )


# ============================================================================
# Orchestrator Endpoints
# ============================================================================


@app.get("/api/orchestrators", response_model=List[OrchestratorInfo], tags=["Orchestrators"])
async def list_orchestrators() -> List[OrchestratorInfo]:
    """List all registered orchestrator instances.

    Returns both running and recently stopped orchestrators from the registry.
    Stale entries are cleaned up automatically.
    """
    registry = get_registry()

    # Clean up stale entries
    registry.cleanup_stale()

    # Get all instances
    instances = registry.get_all()

    return [instance_to_info(inst) for inst in instances]


@app.get(
    "/api/orchestrators/{instance_id}",
    response_model=OrchestratorInfo,
    tags=["Orchestrators"],
)
async def get_orchestrator(instance_id: str) -> OrchestratorInfo:
    """Get information about a specific orchestrator instance.

    Args:
        instance_id: The orchestrator instance ID.

    Returns:
        OrchestratorInfo with instance details.

    Raises:
        HTTPException 404: If instance not found.
    """
    registry = get_registry()
    inst = registry.get_instance(instance_id)

    if not inst:
        raise HTTPException(status_code=404, detail=f"Orchestrator '{instance_id}' not found")

    return instance_to_info(inst)


@app.get(
    "/api/orchestrators/{instance_id}/status",
    response_model=StatusResponse,
    tags=["Orchestrators"],
)
async def get_orchestrator_status(instance_id: str) -> StatusResponse:
    """Get full status for an orchestrator including tasks and progress.

    Args:
        instance_id: The orchestrator instance ID.

    Returns:
        StatusResponse with full execution status.

    Raises:
        HTTPException 404: If instance not found.
    """
    registry = get_registry()
    inst = registry.get_instance(instance_id)

    if not inst:
        raise HTTPException(status_code=404, detail=f"Orchestrator '{instance_id}' not found")

    return build_status_response(inst)


# ============================================================================
# Plan Endpoints
# ============================================================================


@app.get("/api/plans", response_model=List[PlanInfo], tags=["Plans"])
async def list_plans() -> List[PlanInfo]:
    """List all available plans.

    Scans the docs/plans/ directory for markdown plan files.
    """
    plans_dir = get_plans_dir()
    plans = []

    if not plans_dir.exists():
        return plans

    for plan_file in plans_dir.glob("*.md"):
        plan_name = plan_file.stem
        output_dir = get_output_dir(plan_name)
        status_file = output_dir / "status.json"

        plans.append(PlanInfo(
            name=plan_name,
            path=str(plan_file),
            has_status=status_file.exists(),
            last_modified=datetime.fromtimestamp(plan_file.stat().st_mtime).isoformat() + "Z",
            output_dir=str(output_dir) if output_dir.exists() else None,
        ))

    # Sort by name
    plans.sort(key=lambda p: p.name)
    return plans


@app.get("/api/plans/{plan_name}/status", response_model=StatusSummary, tags=["Plans"])
async def get_plan_status(plan_name: str) -> StatusSummary:
    """Get status summary for a specific plan.

    Args:
        plan_name: Name of the plan (without .md extension).

    Returns:
        StatusSummary with progress information.

    Raises:
        HTTPException 404: If plan or status not found.
    """
    plans_dir = get_plans_dir()
    plan_file = plans_dir / f"{plan_name}.md"

    if not plan_file.exists():
        raise HTTPException(status_code=404, detail=f"Plan '{plan_name}' not found")

    status_data = load_status_json(str(plan_file))
    if not status_data:
        raise HTTPException(
            status_code=404,
            detail=f"No status found for plan '{plan_name}'. Run /plan:implement first.",
        )

    summary_data = status_data.get('summary', {})
    return StatusSummary(
        total_tasks=summary_data.get('totalTasks', 0),
        completed=summary_data.get('completed', 0),
        pending=summary_data.get('pending', 0),
        in_progress=summary_data.get('in_progress', 0),
        failed=summary_data.get('failed', 0),
        skipped=summary_data.get('skipped', 0),
        current_phase=summary_data.get('currentPhase'),
        progress_percent=(
            (summary_data.get('completed', 0) / summary_data.get('totalTasks', 1)) * 100
            if summary_data.get('totalTasks', 0) > 0 else 0.0
        ),
    )


@app.get("/api/plans/{plan_name}/tasks", response_model=List[TaskInfo], tags=["Plans"])
async def get_plan_tasks(plan_name: str) -> List[TaskInfo]:
    """Get all tasks for a specific plan.

    Args:
        plan_name: Name of the plan (without .md extension).

    Returns:
        List of TaskInfo objects.

    Raises:
        HTTPException 404: If plan or status not found.
    """
    plans_dir = get_plans_dir()
    plan_file = plans_dir / f"{plan_name}.md"

    if not plan_file.exists():
        raise HTTPException(status_code=404, detail=f"Plan '{plan_name}' not found")

    status_data = load_status_json(str(plan_file))
    if not status_data:
        raise HTTPException(
            status_code=404,
            detail=f"No status found for plan '{plan_name}'. Run /plan:implement first.",
        )

    tasks = []
    for task_data in status_data.get('tasks', []):
        tasks.append(TaskInfo(
            id=task_data.get('id', ''),
            description=task_data.get('description', ''),
            status=task_data.get('status', 'pending'),
            phase=task_data.get('phase'),
            retry_count=task_data.get('retryCount', 0),
            last_error=task_data.get('lastError'),
            started_at=task_data.get('startedAt'),
            completed_at=task_data.get('completedAt'),
        ))

    return tasks


@app.get("/api/plans/{plan_name}/findings", response_model=List[FindingInfo], tags=["Plans"])
async def list_plan_findings(plan_name: str) -> List[FindingInfo]:
    """List all findings files for a plan.

    Args:
        plan_name: Name of the plan (without .md extension).

    Returns:
        List of FindingInfo objects.

    Raises:
        HTTPException 404: If plan not found.
    """
    plans_dir = get_plans_dir()
    plan_file = plans_dir / f"{plan_name}.md"

    if not plan_file.exists():
        raise HTTPException(status_code=404, detail=f"Plan '{plan_name}' not found")

    output_dir = get_output_dir(plan_name)
    findings_dir = output_dir / "findings"

    findings = []
    if findings_dir.exists():
        for finding_file in findings_dir.glob("*.md"):
            task_id = finding_file.stem
            stat = finding_file.stat()
            findings.append(FindingInfo(
                task_id=task_id,
                file_path=str(finding_file),
                size_bytes=stat.st_size,
                last_modified=datetime.fromtimestamp(stat.st_mtime).isoformat() + "Z",
            ))

    return findings


@app.get("/api/plans/{plan_name}/findings/{task_id}", tags=["Plans"])
async def get_finding_content(plan_name: str, task_id: str) -> Dict[str, str]:
    """Get the content of a specific finding.

    Args:
        plan_name: Name of the plan (without .md extension).
        task_id: The task ID (e.g., "1.1").

    Returns:
        Dict with task_id and content.

    Raises:
        HTTPException 404: If finding not found.
    """
    output_dir = get_output_dir(plan_name)
    findings_dir = output_dir / "findings"
    finding_file = findings_dir / f"{task_id}.md"

    if not finding_file.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Finding for task '{task_id}' not found in plan '{plan_name}'",
        )

    try:
        with open(finding_file, 'r') as f:
            content = f.read()
        return {"task_id": task_id, "content": content}
    except OSError as e:
        raise HTTPException(status_code=500, detail=f"Failed to read finding: {e}")


# ============================================================================
# Command Endpoints (IPC Proxy)
# ============================================================================


class CommandResponse(BaseModel):
    """Response from a command endpoint."""

    success: bool
    message: str
    error: Optional[str] = None


class SkipTaskRequest(BaseModel):
    """Request to skip a task."""

    task_id: str
    reason: Optional[str] = None


class RetryTaskRequest(BaseModel):
    """Request to retry a task."""

    task_id: str


def send_ipc_command(instance_id: str, command: str, payload: Optional[Dict] = None) -> Dict:
    """Send a command to an orchestrator via IPC.

    Args:
        instance_id: The orchestrator instance ID.
        command: Command to send (pause, resume, shutdown, status).
        payload: Optional command payload.

    Returns:
        Response payload from the orchestrator.

    Raises:
        HTTPException: If the orchestrator is not found or IPC fails.
    """
    from scripts.lib.orchestrator_ipc import IPCClient, IPCError, get_socket_path

    registry = get_registry()
    inst = registry.get_instance(instance_id)

    if not inst:
        raise HTTPException(status_code=404, detail=f"Orchestrator '{instance_id}' not found")

    if not inst.is_alive():
        raise HTTPException(
            status_code=503,
            detail=f"Orchestrator '{instance_id}' is not running (process dead)",
        )

    # Get socket path
    socket_path = inst.socket_path or get_socket_path(instance_id)

    try:
        client = IPCClient(socket_path)
        if not client.is_available():
            raise HTTPException(
                status_code=503,
                detail=f"Orchestrator '{instance_id}' IPC server not available",
            )

        response = client.send_command(command, payload)
        return response.payload

    except IPCError as e:
        raise HTTPException(status_code=503, detail=f"IPC error: {e}")


@app.post(
    "/api/orchestrators/{instance_id}/pause",
    response_model=CommandResponse,
    tags=["Commands"],
)
async def pause_orchestrator(instance_id: str) -> CommandResponse:
    """Pause an orchestrator's execution.

    The orchestrator will complete the current task before pausing.

    Args:
        instance_id: The orchestrator instance ID.

    Returns:
        CommandResponse indicating success or failure.
    """
    try:
        result = send_ipc_command(instance_id, "pause")
        if result.get("ack"):
            return CommandResponse(
                success=True,
                message=f"Orchestrator '{instance_id}' pause requested",
            )
        else:
            return CommandResponse(
                success=False,
                message="Pause not acknowledged",
                error=result.get("error"),
            )
    except HTTPException:
        raise
    except Exception as e:
        return CommandResponse(success=False, message="Pause failed", error=str(e))


@app.post(
    "/api/orchestrators/{instance_id}/resume",
    response_model=CommandResponse,
    tags=["Commands"],
)
async def resume_orchestrator(instance_id: str) -> CommandResponse:
    """Resume a paused orchestrator.

    Args:
        instance_id: The orchestrator instance ID.

    Returns:
        CommandResponse indicating success or failure.
    """
    try:
        result = send_ipc_command(instance_id, "resume")
        if result.get("ack"):
            return CommandResponse(
                success=True,
                message=f"Orchestrator '{instance_id}' resume requested",
            )
        else:
            return CommandResponse(
                success=False,
                message="Resume not acknowledged",
                error=result.get("error"),
            )
    except HTTPException:
        raise
    except Exception as e:
        return CommandResponse(success=False, message="Resume failed", error=str(e))


@app.post(
    "/api/orchestrators/{instance_id}/shutdown",
    response_model=CommandResponse,
    tags=["Commands"],
)
async def shutdown_orchestrator(instance_id: str, force: bool = False) -> CommandResponse:
    """Request graceful shutdown of an orchestrator.

    Args:
        instance_id: The orchestrator instance ID.
        force: If True, request immediate shutdown without waiting for current task.

    Returns:
        CommandResponse indicating success or failure.
    """
    try:
        result = send_ipc_command(instance_id, "shutdown", {"force": force})
        if result.get("ack"):
            return CommandResponse(
                success=True,
                message=f"Orchestrator '{instance_id}' shutdown requested",
            )
        else:
            return CommandResponse(
                success=False,
                message="Shutdown not acknowledged",
                error=result.get("error"),
            )
    except HTTPException:
        raise
    except Exception as e:
        return CommandResponse(success=False, message="Shutdown failed", error=str(e))


@app.post(
    "/api/orchestrators/{instance_id}/skip-task",
    response_model=CommandResponse,
    tags=["Commands"],
)
async def skip_task(instance_id: str, request: SkipTaskRequest) -> CommandResponse:
    """Skip a task in the orchestrator's plan.

    Uses status-cli.js to mark the task as skipped.

    Args:
        instance_id: The orchestrator instance ID.
        request: SkipTaskRequest with task_id and optional reason.

    Returns:
        CommandResponse indicating success or failure.
    """
    import subprocess

    registry = get_registry()
    inst = registry.get_instance(instance_id)

    if not inst:
        raise HTTPException(status_code=404, detail=f"Orchestrator '{instance_id}' not found")

    # Use status-cli.js to skip the task
    cmd = [
        "node", "scripts/status-cli.js",
        "mark-skipped", request.task_id,
        "--plan", inst.plan_path,
    ]
    if request.reason:
        cmd.extend(["--reason", request.reason])

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=10,
        )

        if result.returncode == 0:
            return CommandResponse(
                success=True,
                message=f"Task '{request.task_id}' skipped",
            )
        else:
            return CommandResponse(
                success=False,
                message="Skip failed",
                error=result.stderr or result.stdout,
            )
    except subprocess.TimeoutExpired:
        return CommandResponse(
            success=False,
            message="Skip command timed out",
            error="Command took too long to execute",
        )
    except Exception as e:
        return CommandResponse(success=False, message="Skip failed", error=str(e))


@app.post(
    "/api/orchestrators/{instance_id}/retry-task",
    response_model=CommandResponse,
    tags=["Commands"],
)
async def retry_task(instance_id: str, request: RetryTaskRequest) -> CommandResponse:
    """Reset a failed task for retry.

    Changes the task status back to pending so it will be attempted again.

    Args:
        instance_id: The orchestrator instance ID.
        request: RetryTaskRequest with task_id.

    Returns:
        CommandResponse indicating success or failure.
    """
    import subprocess

    registry = get_registry()
    inst = registry.get_instance(instance_id)

    if not inst:
        raise HTTPException(status_code=404, detail=f"Orchestrator '{instance_id}' not found")

    # Load status.json to get task info
    status_data = load_status_json(inst.plan_path)
    if not status_data:
        raise HTTPException(
            status_code=404,
            detail=f"No status found for orchestrator's plan",
        )

    # Find the task
    task = next(
        (t for t in status_data.get('tasks', []) if t.get('id') == request.task_id),
        None,
    )

    if not task:
        raise HTTPException(
            status_code=404,
            detail=f"Task '{request.task_id}' not found in plan",
        )

    if task.get('status') not in ('failed', 'skipped'):
        return CommandResponse(
            success=False,
            message="Task is not in a retriable state",
            error=f"Task status is '{task.get('status')}', must be 'failed' or 'skipped'",
        )

    # Reset task to pending by updating status.json
    # Use a temporary approach - modify the JSON directly
    plan_name = Path(inst.plan_path).stem
    output_dir = get_output_dir(plan_name)
    status_file = output_dir / "status.json"

    try:
        # Update the task status
        for t in status_data.get('tasks', []):
            if t.get('id') == request.task_id:
                t['status'] = 'pending'
                t['lastError'] = None
                t['startedAt'] = None
                t['completedAt'] = None
                # Increment retry count
                t['retryCount'] = t.get('retryCount', 0) + 1
                break

        # Recalculate summary
        tasks = status_data.get('tasks', [])
        summary = status_data.get('summary', {})
        summary['pending'] = len([t for t in tasks if t.get('status') == 'pending'])
        summary['failed'] = len([t for t in tasks if t.get('status') == 'failed'])
        summary['skipped'] = len([t for t in tasks if t.get('status') == 'skipped'])

        # Write back
        with open(status_file, 'w') as f:
            json.dump(status_data, f, indent=2)

        return CommandResponse(
            success=True,
            message=f"Task '{request.task_id}' reset for retry",
        )

    except Exception as e:
        return CommandResponse(
            success=False,
            message="Failed to reset task",
            error=str(e),
        )


# ============================================================================
# WebSocket Connection Manager
# ============================================================================


class WebSocketManager:
    """Manages WebSocket connections and event subscriptions.

    This manager handles multiple concurrent WebSocket clients, subscribes
    to the event bus, and broadcasts events to connected clients.
    """

    def __init__(self):
        # Map: instance_id -> set of WebSocket connections
        self._connections: Dict[str, Set[WebSocket]] = {}
        # Map: websocket -> instance_id (for cleanup)
        self._websocket_to_instance: Dict[WebSocket, str] = {}
        # Map: instance_id -> subscription handle
        self._subscriptions: Dict[str, Any] = {}
        self._lock = asyncio.Lock()
        # Heartbeat tracking
        self._heartbeat_tasks: Dict[WebSocket, asyncio.Task] = {}

    async def connect(self, websocket: WebSocket, instance_id: str):
        """Accept a WebSocket connection and subscribe to events.

        Args:
            websocket: The WebSocket connection to accept.
            instance_id: The orchestrator instance ID to receive events for.
        """
        await websocket.accept()

        async with self._lock:
            # Add to connections
            if instance_id not in self._connections:
                self._connections[instance_id] = set()
            self._connections[instance_id].add(websocket)
            self._websocket_to_instance[websocket] = instance_id

            # Subscribe to event bus if first connection for this instance
            if instance_id not in self._subscriptions:
                event_bus = get_event_bus()
                # Subscribe to all event types for this instance
                handles = []
                for event_type in EventType:
                    handle = event_bus.subscribe(
                        event_type,
                        lambda event, iid=instance_id: asyncio.create_task(
                            self._broadcast_event(event, iid)
                        ),
                        instance_filter=instance_id,
                    )
                    handles.append(handle)
                self._subscriptions[instance_id] = handles

            # Start heartbeat for this connection
            self._heartbeat_tasks[websocket] = asyncio.create_task(
                self._heartbeat_loop(websocket)
            )

    async def disconnect(self, websocket: WebSocket):
        """Clean up a disconnected WebSocket.

        Args:
            websocket: The WebSocket that disconnected.
        """
        async with self._lock:
            # Cancel heartbeat task
            if websocket in self._heartbeat_tasks:
                self._heartbeat_tasks[websocket].cancel()
                try:
                    await self._heartbeat_tasks[websocket]
                except asyncio.CancelledError:
                    pass
                del self._heartbeat_tasks[websocket]

            # Remove from connections
            instance_id = self._websocket_to_instance.pop(websocket, None)
            if instance_id and instance_id in self._connections:
                self._connections[instance_id].discard(websocket)

                # Unsubscribe from event bus if no more connections for this instance
                if not self._connections[instance_id]:
                    del self._connections[instance_id]
                    if instance_id in self._subscriptions:
                        for handle in self._subscriptions[instance_id]:
                            handle.unsubscribe()
                        del self._subscriptions[instance_id]

    async def _broadcast_event(self, event: Event, instance_id: str):
        """Broadcast an event to all connected clients for an instance.

        Args:
            event: The event to broadcast.
            instance_id: The instance ID to broadcast to.
        """
        async with self._lock:
            if instance_id not in self._connections:
                return

            # Convert event to JSON
            event_data = event.to_dict()
            dead_connections = set()

            for websocket in self._connections[instance_id]:
                try:
                    await websocket.send_json(event_data)
                except Exception:
                    # Connection is dead, mark for removal
                    dead_connections.add(websocket)

            # Clean up dead connections
            for ws in dead_connections:
                self._connections[instance_id].discard(ws)
                self._websocket_to_instance.pop(ws, None)

    async def _heartbeat_loop(self, websocket: WebSocket, interval: float = 30.0):
        """Send periodic heartbeat pings to detect stale connections.

        Args:
            websocket: The WebSocket to ping.
            interval: Seconds between pings.
        """
        try:
            while True:
                await asyncio.sleep(interval)
                try:
                    # Send ping frame - if client is gone, this will fail
                    await websocket.send_json({"type": "ping", "timestamp": datetime.utcnow().isoformat() + "Z"})
                except Exception:
                    # Connection is stale
                    break
        except asyncio.CancelledError:
            pass

    def get_connection_count(self, instance_id: Optional[str] = None) -> int:
        """Get the number of active WebSocket connections.

        Args:
            instance_id: If set, count only for this instance.

        Returns:
            Number of active connections.
        """
        if instance_id:
            return len(self._connections.get(instance_id, set()))
        return sum(len(conns) for conns in self._connections.values())


# Global WebSocket manager instance
ws_manager = WebSocketManager()


# ============================================================================
# WebSocket Endpoints
# ============================================================================


@app.websocket("/api/orchestrators/{instance_id}/events")
async def websocket_events(websocket: WebSocket, instance_id: str):
    """WebSocket endpoint for real-time event streaming.

    Connects to the event bus and streams all events for the specified
    orchestrator instance. Events are sent as JSON objects with the format:

    {
        "type": "status_updated" | "tool_started" | "tool_completed" | ...,
        "timestamp": "2024-01-01T00:00:00Z",
        "instance_id": "instance-123",
        "data": { ... event-specific data ... }
    }

    Periodic ping messages are sent to detect stale connections:
    {
        "type": "ping",
        "timestamp": "2024-01-01T00:00:00Z"
    }

    Args:
        websocket: The WebSocket connection.
        instance_id: The orchestrator instance ID to receive events for.
    """
    # Verify instance exists
    registry = get_registry()
    inst = registry.get_instance(instance_id)

    if not inst:
        await websocket.close(code=4004, reason=f"Orchestrator '{instance_id}' not found")
        return

    await ws_manager.connect(websocket, instance_id)

    try:
        # Send initial status as first message
        status_response = build_status_response(inst)
        await websocket.send_json({
            "type": "initial_status",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "instance_id": instance_id,
            "data": status_response.model_dump(),
        })

        # Keep connection alive and handle incoming messages (pong, etc.)
        while True:
            try:
                message = await websocket.receive_json()
                # Handle pong responses or other client messages
                if message.get("type") == "pong":
                    continue
            except WebSocketDisconnect:
                break
            except Exception:
                # JSON decode error or other issue
                continue

    finally:
        await ws_manager.disconnect(websocket)


class ActivityStreamManager:
    """Manages WebSocket connections for tool activity streaming.

    Similar to WebSocketManager but filters to only TOOL_STARTED and
    TOOL_COMPLETED events, and adds backpressure handling.
    """

    def __init__(self):
        # Map: instance_id -> set of WebSocket connections
        self._connections: Dict[str, Set[WebSocket]] = {}
        # Map: websocket -> instance_id
        self._websocket_to_instance: Dict[WebSocket, str] = {}
        # Map: instance_id -> subscription handles
        self._subscriptions: Dict[str, Any] = {}
        # Map: websocket -> message queue for backpressure
        self._message_queues: Dict[WebSocket, asyncio.Queue] = {}
        # Map: websocket -> sender task
        self._sender_tasks: Dict[WebSocket, asyncio.Task] = {}
        self._lock = asyncio.Lock()
        # Max queue size for backpressure
        self._max_queue_size = 100

    async def connect(self, websocket: WebSocket, instance_id: str):
        """Accept a WebSocket connection for activity streaming.

        Args:
            websocket: The WebSocket connection to accept.
            instance_id: The orchestrator instance ID to receive events for.
        """
        await websocket.accept()

        async with self._lock:
            # Add to connections
            if instance_id not in self._connections:
                self._connections[instance_id] = set()
            self._connections[instance_id].add(websocket)
            self._websocket_to_instance[websocket] = instance_id

            # Create message queue for this connection
            self._message_queues[websocket] = asyncio.Queue(maxsize=self._max_queue_size)

            # Start sender task
            self._sender_tasks[websocket] = asyncio.create_task(
                self._sender_loop(websocket)
            )

            # Subscribe to tool events if first connection for this instance
            if instance_id not in self._subscriptions:
                event_bus = get_event_bus()
                handles = []
                # Only subscribe to tool events
                for event_type in [EventType.TOOL_STARTED, EventType.TOOL_COMPLETED]:
                    handle = event_bus.subscribe(
                        event_type,
                        lambda event, iid=instance_id: asyncio.create_task(
                            self._queue_event(event, iid)
                        ),
                        instance_filter=instance_id,
                    )
                    handles.append(handle)
                self._subscriptions[instance_id] = handles

    async def disconnect(self, websocket: WebSocket):
        """Clean up a disconnected WebSocket.

        Args:
            websocket: The WebSocket that disconnected.
        """
        async with self._lock:
            # Cancel sender task
            if websocket in self._sender_tasks:
                self._sender_tasks[websocket].cancel()
                try:
                    await self._sender_tasks[websocket]
                except asyncio.CancelledError:
                    pass
                del self._sender_tasks[websocket]

            # Remove message queue
            self._message_queues.pop(websocket, None)

            # Remove from connections
            instance_id = self._websocket_to_instance.pop(websocket, None)
            if instance_id and instance_id in self._connections:
                self._connections[instance_id].discard(websocket)

                # Unsubscribe if no more connections
                if not self._connections[instance_id]:
                    del self._connections[instance_id]
                    if instance_id in self._subscriptions:
                        for handle in self._subscriptions[instance_id]:
                            handle.unsubscribe()
                        del self._subscriptions[instance_id]

    async def _queue_event(self, event: Event, instance_id: str):
        """Queue an event for all connected clients.

        Implements backpressure by dropping oldest events when queue is full.

        Args:
            event: The event to queue.
            instance_id: The instance ID this event is for.
        """
        async with self._lock:
            if instance_id not in self._connections:
                return

            # Build activity message with tool-specific fields
            activity_data = {
                "type": event.type.value,
                "timestamp": event.timestamp,
                "instance_id": event.instance_id,
                "tool_name": event.data.get("tool_name", "unknown"),
                "tool_id": event.data.get("tool_id"),
                "input_summary": event.data.get("input_summary"),
            }

            # Add duration for completed events
            if event.type == EventType.TOOL_COMPLETED:
                activity_data["duration_ms"] = event.data.get("duration_ms")
                activity_data["success"] = event.data.get("success", True)

            for websocket in list(self._connections.get(instance_id, set())):
                if websocket in self._message_queues:
                    queue = self._message_queues[websocket]
                    try:
                        # Non-blocking put
                        queue.put_nowait(activity_data)
                    except asyncio.QueueFull:
                        # Backpressure: drop oldest message and add new one
                        try:
                            queue.get_nowait()  # Drop oldest
                            queue.put_nowait(activity_data)
                        except asyncio.QueueEmpty:
                            pass

    async def _sender_loop(self, websocket: WebSocket):
        """Send queued messages to a WebSocket client.

        Args:
            websocket: The WebSocket to send to.
        """
        try:
            queue = self._message_queues.get(websocket)
            if not queue:
                return

            while True:
                message = await queue.get()
                try:
                    await websocket.send_json(message)
                except Exception:
                    # Connection is dead
                    break
        except asyncio.CancelledError:
            pass


# Global activity stream manager
activity_manager = ActivityStreamManager()


@app.websocket("/api/orchestrators/{instance_id}/activity")
async def websocket_activity(websocket: WebSocket, instance_id: str):
    """WebSocket endpoint for tool activity streaming.

    Streams only TOOL_STARTED and TOOL_COMPLETED events for the specified
    orchestrator instance. Includes backpressure handling to prevent
    overwhelming slow clients.

    Events are sent as JSON objects:

    TOOL_STARTED:
    {
        "type": "tool_started",
        "timestamp": "2024-01-01T00:00:00Z",
        "instance_id": "instance-123",
        "tool_name": "Read",
        "tool_id": "tool-abc",
        "input_summary": "file.txt"
    }

    TOOL_COMPLETED:
    {
        "type": "tool_completed",
        "timestamp": "2024-01-01T00:00:00Z",
        "instance_id": "instance-123",
        "tool_name": "Read",
        "tool_id": "tool-abc",
        "duration_ms": 150,
        "success": true
    }

    Args:
        websocket: The WebSocket connection.
        instance_id: The orchestrator instance ID to receive events for.
    """
    # Verify instance exists
    registry = get_registry()
    inst = registry.get_instance(instance_id)

    if not inst:
        await websocket.close(code=4004, reason=f"Orchestrator '{instance_id}' not found")
        return

    await activity_manager.connect(websocket, instance_id)

    try:
        # Send initial connection confirmation
        await websocket.send_json({
            "type": "connected",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "instance_id": instance_id,
            "message": "Activity stream connected",
        })

        # Keep connection alive
        while True:
            try:
                await websocket.receive_json()
            except WebSocketDisconnect:
                break
            except Exception:
                continue

    finally:
        await activity_manager.disconnect(websocket)


# ============================================================================
# Server-Sent Events (SSE) Endpoints
# ============================================================================


async def sse_event_generator(instance_id: str, request: Request):
    """Generate Server-Sent Events for an orchestrator instance.

    Args:
        instance_id: The orchestrator instance ID to stream events for.
        request: The HTTP request (for detecting client disconnect).

    Yields:
        SSE-formatted event strings.
    """
    event_queue: asyncio.Queue = asyncio.Queue()
    subscription_handles = []

    def queue_event(event: Event):
        """Sync callback to queue events."""
        try:
            event_queue.put_nowait(event)
        except asyncio.QueueFull:
            pass  # Drop if queue is full

    try:
        # Subscribe to all event types for this instance
        event_bus = get_event_bus()
        for event_type in EventType:
            handle = event_bus.subscribe(
                event_type,
                queue_event,
                instance_filter=instance_id,
            )
            subscription_handles.append(handle)

        # Send initial status
        registry = get_registry()
        inst = registry.get_instance(instance_id)
        if inst:
            status_response = build_status_response(inst)
            initial_event = {
                "type": "initial_status",
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "instance_id": instance_id,
                "data": status_response.model_dump(),
            }
            yield f"event: initial_status\ndata: {json.dumps(initial_event)}\n\n"

        # Stream events
        while True:
            # Check if client disconnected
            if await request.is_disconnected():
                break

            try:
                # Wait for event with timeout to allow disconnect checks
                event = await asyncio.wait_for(event_queue.get(), timeout=1.0)
                event_data = event.to_dict()
                event_type = event.type.value

                yield f"event: {event_type}\ndata: {json.dumps(event_data)}\n\n"

            except asyncio.TimeoutError:
                # Send heartbeat to keep connection alive
                heartbeat = {
                    "type": "heartbeat",
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                }
                yield f"event: heartbeat\ndata: {json.dumps(heartbeat)}\n\n"

    finally:
        # Clean up subscriptions
        for handle in subscription_handles:
            handle.unsubscribe()


@app.get("/api/orchestrators/{instance_id}/events-sse", tags=["Events"])
async def sse_events(instance_id: str, request: Request):
    """Server-Sent Events endpoint for real-time event streaming.

    Alternative to WebSocket for environments where WebSocket is problematic.
    Streams all events for the specified orchestrator instance.

    Events are sent in SSE format:
    ```
    event: status_updated
    data: {"type": "status_updated", "timestamp": "...", "instance_id": "...", "data": {...}}

    event: heartbeat
    data: {"type": "heartbeat", "timestamp": "..."}
    ```

    Args:
        instance_id: The orchestrator instance ID to receive events for.
        request: The HTTP request object.

    Returns:
        StreamingResponse with text/event-stream content type.

    Raises:
        HTTPException 404: If orchestrator not found.
    """
    # Verify instance exists
    registry = get_registry()
    inst = registry.get_instance(instance_id)

    if not inst:
        raise HTTPException(status_code=404, detail=f"Orchestrator '{instance_id}' not found")

    return StreamingResponse(
        sse_event_generator(instance_id, request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        },
    )


# ============================================================================
# Application Lifecycle Events
# ============================================================================


@app.on_event("startup")
async def startup_event():
    """Initialize the event bus when the application starts."""
    event_bus = get_event_bus()
    event_bus.start(asyncio.get_event_loop())


@app.on_event("shutdown")
async def shutdown_event():
    """Clean up the event bus when the application shuts down."""
    event_bus = get_event_bus()
    await event_bus.stop()


# ============================================================================
# Main Entry Point
# ============================================================================


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "scripts.orchestrator_server:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
