#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generate OpenAPI Spec and TypeScript Types for the Orchestrator API.

This script:
1. Starts the FastAPI app to extract the OpenAPI spec
2. Writes the spec to docs/plan-outputs/orchestrator-api-server/openapi.json
3. Generates TypeScript types using openapi-typescript (if installed)
4. Outputs api-types.ts for Next.js consumption

Usage:
    # Generate both OpenAPI spec and TypeScript types
    python scripts/generate_api_types.py

    # Only generate OpenAPI spec (no TypeScript)
    python scripts/generate_api_types.py --no-typescript

    # Output to custom directory
    python scripts/generate_api_types.py --output-dir ./api/types

    # Print OpenAPI spec to stdout
    python scripts/generate_api_types.py --stdout

Prerequisites:
    pip install fastapi uvicorn

    For TypeScript generation:
    npm install -g openapi-typescript
    # or
    npx openapi-typescript (will be used automatically)

Part of the orchestrator API server implementation.
"""

import argparse
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Optional

# Ensure project root is in path
_script_dir = Path(__file__).parent
_project_root = _script_dir.parent
if str(_project_root) not in sys.path:
    sys.path.insert(0, str(_project_root))


def get_openapi_spec() -> dict:
    """Extract OpenAPI spec from the FastAPI application.

    Returns:
        OpenAPI specification as a dictionary.
    """
    # Import the FastAPI app
    from scripts.orchestrator_server import app

    # Generate OpenAPI spec
    return app.openapi()


def write_openapi_spec(output_path: Path, spec: dict) -> None:
    """Write OpenAPI spec to a JSON file.

    Args:
        output_path: Path to write the spec to.
        spec: OpenAPI specification dictionary.
    """
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, 'w') as f:
        json.dump(spec, f, indent=2)
    print(f"OpenAPI spec written to: {output_path}")


def check_openapi_typescript() -> Optional[str]:
    """Check if openapi-typescript is available.

    Returns:
        Path to executable or None if not found.
    """
    # Check for global installation
    result = shutil.which("openapi-typescript")
    if result:
        return result

    # Check if npx can run it
    try:
        proc = subprocess.run(
            ["npx", "--yes", "openapi-typescript", "--version"],
            capture_output=True,
            text=True,
            timeout=30,
        )
        if proc.returncode == 0:
            return "npx"
    except (subprocess.TimeoutExpired, FileNotFoundError):
        pass

    return None


def generate_typescript_types(
    openapi_path: Path,
    output_path: Path,
    executable: str,
) -> bool:
    """Generate TypeScript types from OpenAPI spec.

    Args:
        openapi_path: Path to OpenAPI JSON file.
        output_path: Path to output TypeScript file.
        executable: Path to openapi-typescript or "npx".

    Returns:
        True if generation succeeded.
    """
    print(f"Generating TypeScript types...")

    try:
        if executable == "npx":
            cmd = [
                "npx", "--yes", "openapi-typescript",
                str(openapi_path),
                "-o", str(output_path),
            ]
        else:
            cmd = [
                executable,
                str(openapi_path),
                "-o", str(output_path),
            ]

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=60,
        )

        if result.returncode == 0:
            print(f"TypeScript types written to: {output_path}")
            return True
        else:
            print(f"Error generating TypeScript types: {result.stderr}")
            return False

    except subprocess.TimeoutExpired:
        print("Error: TypeScript generation timed out")
        return False
    except FileNotFoundError:
        print("Error: Could not run openapi-typescript")
        return False


def generate_api_client_helper(output_dir: Path) -> None:
    """Generate a helper file with API client utilities.

    Args:
        output_dir: Directory to write the helper file to.
    """
    helper_content = '''/**
 * API Client Helper for Orchestrator API
 *
 * This file provides type-safe API client utilities for the Orchestrator API.
 * Generated alongside api-types.ts from the OpenAPI specification.
 *
 * Usage:
 *   import { createApiClient, type ApiClient } from './api-client';
 *
 *   const client = createApiClient('http://localhost:8000');
 *   const orchestrators = await client.listOrchestrators();
 */

import type { paths, components } from './api-types';

// Re-export types for convenience
export type OrchestratorInfo = components['schemas']['OrchestratorInfo'];
export type StatusResponse = components['schemas']['StatusResponse'];
export type TaskInfo = components['schemas']['TaskInfo'];
export type StatusSummary = components['schemas']['StatusSummary'];
export type PlanInfo = components['schemas']['PlanInfo'];
export type FindingInfo = components['schemas']['FindingInfo'];
export type CommandResponse = components['schemas']['CommandResponse'];
export type HealthResponse = components['schemas']['HealthResponse'];

/**
 * WebSocket event types from the API
 */
export interface WebSocketEvent {
  type: 'status_updated' | 'tool_started' | 'tool_completed' | 'task_changed' | 'phase_changed' | 'ping' | 'initial_status';
  timestamp: string;
  instance_id: string;
  data: Record<string, unknown>;
}

/**
 * Activity stream event (tool calls only)
 */
export interface ActivityEvent {
  type: 'tool_started' | 'tool_completed' | 'connected';
  timestamp: string;
  instance_id: string;
  tool_name?: string;
  tool_id?: string;
  input_summary?: string;
  duration_ms?: number;
  success?: boolean;
  message?: string;
}

/**
 * API client configuration
 */
export interface ApiClientConfig {
  baseUrl: string;
  headers?: Record<string, string>;
  onError?: (error: Error) => void;
}

/**
 * Create a type-safe API client
 *
 * @param baseUrl - Base URL of the API server (e.g., 'http://localhost:8000')
 * @returns API client with typed methods
 */
export function createApiClient(config: string | ApiClientConfig) {
  const baseUrl = typeof config === 'string' ? config : config.baseUrl;
  const headers = typeof config === 'string' ? {} : (config.headers || {});
  const onError = typeof config === 'string' ? undefined : config.onError;

  async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = new Error(`API error: ${response.status} ${response.statusText}`);
      if (onError) onError(error);
      throw error;
    }

    return response.json();
  }

  return {
    // Health
    health: () => fetchJson<HealthResponse>('/health'),

    // Orchestrators
    listOrchestrators: () =>
      fetchJson<OrchestratorInfo[]>('/api/orchestrators'),

    getOrchestrator: (instanceId: string) =>
      fetchJson<OrchestratorInfo>(`/api/orchestrators/${instanceId}`),

    getOrchestratorStatus: (instanceId: string) =>
      fetchJson<StatusResponse>(`/api/orchestrators/${instanceId}/status`),

    // Commands
    pauseOrchestrator: (instanceId: string) =>
      fetchJson<CommandResponse>(`/api/orchestrators/${instanceId}/pause`, { method: 'POST' }),

    resumeOrchestrator: (instanceId: string) =>
      fetchJson<CommandResponse>(`/api/orchestrators/${instanceId}/resume`, { method: 'POST' }),

    shutdownOrchestrator: (instanceId: string, force = false) =>
      fetchJson<CommandResponse>(`/api/orchestrators/${instanceId}/shutdown?force=${force}`, { method: 'POST' }),

    skipTask: (instanceId: string, taskId: string, reason?: string) =>
      fetchJson<CommandResponse>(`/api/orchestrators/${instanceId}/skip-task`, {
        method: 'POST',
        body: JSON.stringify({ task_id: taskId, reason }),
      }),

    retryTask: (instanceId: string, taskId: string) =>
      fetchJson<CommandResponse>(`/api/orchestrators/${instanceId}/retry-task`, {
        method: 'POST',
        body: JSON.stringify({ task_id: taskId }),
      }),

    // Plans
    listPlans: () => fetchJson<PlanInfo[]>('/api/plans'),

    getPlanStatus: (planName: string) =>
      fetchJson<StatusSummary>(`/api/plans/${planName}/status`),

    getPlanTasks: (planName: string) =>
      fetchJson<TaskInfo[]>(`/api/plans/${planName}/tasks`),

    listPlanFindings: (planName: string) =>
      fetchJson<FindingInfo[]>(`/api/plans/${planName}/findings`),

    getFindingContent: (planName: string, taskId: string) =>
      fetchJson<{ task_id: string; content: string }>(`/api/plans/${planName}/findings/${taskId}`),

    // WebSocket connections
    connectEvents: (instanceId: string): WebSocket => {
      const wsUrl = baseUrl.replace(/^http/, 'ws');
      return new WebSocket(`${wsUrl}/api/orchestrators/${instanceId}/events`);
    },

    connectActivityStream: (instanceId: string): WebSocket => {
      const wsUrl = baseUrl.replace(/^http/, 'ws');
      return new WebSocket(`${wsUrl}/api/orchestrators/${instanceId}/activity`);
    },

    // Server-Sent Events
    connectSSE: (instanceId: string): EventSource => {
      return new EventSource(`${baseUrl}/api/orchestrators/${instanceId}/events-sse`);
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
'''

    helper_path = output_dir / "api-client.ts"
    with open(helper_path, 'w') as f:
        f.write(helper_content)
    print(f"API client helper written to: {helper_path}")


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Generate OpenAPI spec and TypeScript types for the Orchestrator API.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )

    parser.add_argument(
        "--output-dir",
        type=str,
        default=None,
        help="Output directory (default: docs/plan-outputs/orchestrator-api-server/)",
    )

    parser.add_argument(
        "--no-typescript",
        action="store_true",
        help="Skip TypeScript type generation",
    )

    parser.add_argument(
        "--stdout",
        action="store_true",
        help="Print OpenAPI spec to stdout instead of file",
    )

    parser.add_argument(
        "--no-client",
        action="store_true",
        help="Skip API client helper generation",
    )

    args = parser.parse_args()

    # Determine output directory
    if args.output_dir:
        output_dir = Path(args.output_dir)
    else:
        output_dir = _project_root / "docs" / "plan-outputs" / "orchestrator-api-server"

    # Generate OpenAPI spec
    print("Extracting OpenAPI spec from FastAPI app...")
    try:
        spec = get_openapi_spec()
    except ImportError as e:
        print(f"Error importing FastAPI app: {e}")
        print("Make sure FastAPI is installed: pip install fastapi")
        sys.exit(1)

    # Output OpenAPI spec
    if args.stdout:
        print(json.dumps(spec, indent=2))
        return

    openapi_path = output_dir / "openapi.json"
    write_openapi_spec(openapi_path, spec)

    # Generate TypeScript types
    if not args.no_typescript:
        ts_path = output_dir / "api-types.ts"

        # Check for openapi-typescript
        executable = check_openapi_typescript()
        if executable:
            success = generate_typescript_types(openapi_path, ts_path, executable)
            if not success:
                print("Warning: TypeScript generation failed, continuing...")
        else:
            print("Warning: openapi-typescript not found")
            print("Install with: npm install -g openapi-typescript")
            print("Or use: npx openapi-typescript")
            print(f"Then run: openapi-typescript {openapi_path} -o {ts_path}")

    # Generate API client helper
    if not args.no_client:
        generate_api_client_helper(output_dir)

    print("\nGeneration complete!")
    print(f"Output directory: {output_dir}")
    print("\nFiles generated:")
    print(f"  - openapi.json    : OpenAPI specification")
    if not args.no_typescript:
        print(f"  - api-types.ts    : TypeScript types (if openapi-typescript available)")
    if not args.no_client:
        print(f"  - api-client.ts   : Type-safe API client helper")


if __name__ == "__main__":
    main()
