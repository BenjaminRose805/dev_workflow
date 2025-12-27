/**
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
