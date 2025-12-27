# Plan Management REST API

A lightweight HTTP/WebSocket API for managing plan execution, designed for integration with NextJS frontends.

## Quick Start

```bash
# Start the API server
node scripts/api-server.js

# Server runs on http://localhost:3100 by default
```

## Configuration

Configure the API in `.claude/git-workflow.json`:

```json
{
  "api": {
    "enabled": true,
    "port": 3100,
    "host": "localhost"
  }
}
```

Environment variables override config:
- `PORT` - Server port
- `HOST` - Server host

---

## REST Endpoints

### List All Plans

```
GET /api/plans
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status: `pending`, `in_progress`, `completed` |
| `worktree` | boolean | Filter by worktree presence: `true` or `false` |

**Response:**
```json
{
  "plans": [
    {
      "name": "git-workflow-phase5-worktrees",
      "path": "docs/plans/git-workflow-phase5-worktrees.md",
      "title": "Implementation Plan: Git Workflow Phase 5",
      "status": "in_progress",
      "progress": {
        "total": 84,
        "completed": 67,
        "pending": 17,
        "failed": 0,
        "percentage": 80
      },
      "currentPhase": "Phase 11: API for External Integration",
      "worktree": {
        "active": true,
        "path": "/path/to/worktrees/plan-git-workflow-phase5-worktrees"
      },
      "orchestrator": {
        "running": true,
        "pid": 12345
      },
      "lastUpdatedAt": "2025-12-26T17:20:10.986Z"
    }
  ],
  "summary": {
    "totalPlans": 5,
    "running": 1,
    "pending": 2,
    "completed": 2
  }
}
```

**NextJS Example:**
```typescript
// app/api/plans/route.ts (App Router)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  const url = new URL('http://localhost:3100/api/plans');
  if (status) url.searchParams.set('status', status);

  const res = await fetch(url.toString());
  const data = await res.json();

  return Response.json(data);
}
```

---

### Get Plan Details

```
GET /api/plans/:name
```

**Response:**
```json
{
  "name": "git-workflow-phase5-worktrees",
  "path": "docs/plans/git-workflow-phase5-worktrees.md",
  "title": "Implementation Plan: Git Workflow Phase 5",
  "status": "in_progress",
  "progress": {
    "total": 84,
    "completed": 67,
    "pending": 17,
    "in_progress": 0,
    "failed": 0,
    "skipped": 0,
    "percentage": 80
  },
  "phases": [
    {
      "number": 1,
      "name": "Worktree Management Command",
      "total": 7,
      "completed": 7,
      "percentage": 100
    }
  ],
  "currentPhase": "Phase 11: API for External Integration",
  "recentActivity": [
    {
      "timestamp": "2025-12-26T17:20:10.986Z",
      "taskId": "11.4",
      "action": "completed",
      "description": "Implement /api/plans/:name/stop"
    }
  ],
  "worktree": null,
  "orchestrator": null,
  "lastUpdatedAt": "2025-12-26T17:20:10.986Z"
}
```

---

### Get Plan Status (Lightweight)

```
GET /api/plans/:name/status
```

Optimized endpoint for polling - returns minimal status information.

**Response:**
```json
{
  "name": "git-workflow-phase5-worktrees",
  "status": "in_progress",
  "progress": {
    "total": 84,
    "completed": 67,
    "percentage": 80
  },
  "currentTask": {
    "id": "11.8",
    "description": "Document API for NextJS frontend integration",
    "status": "in_progress",
    "startedAt": "2025-12-26T18:00:00.000Z"
  },
  "orchestrator": {
    "running": true,
    "pid": 12345
  },
  "lastUpdatedAt": "2025-12-26T17:20:10.986Z"
}
```

---

### Stream Logs

```
GET /api/plans/:name/logs
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `lines` | number | 100 | Number of lines to return |
| `follow` | boolean | false | Keep connection open and stream new lines |
| `since` | ISO string | - | Only return logs after this timestamp |

**Non-streaming Response (follow=false):**
```json
{
  "plan": "git-workflow-phase5-worktrees",
  "logFile": "/path/to/orchestrator-git-workflow-phase5-worktrees.log",
  "lineCount": 50,
  "logs": [
    "[2025-12-26T17:00:00] Starting task 11.5...",
    "[2025-12-26T17:01:00] Task 11.5 completed"
  ]
}
```

**Streaming Response (follow=true):**
Uses Server-Sent Events (SSE):
```
data: {"type":"log","content":"[2025-12-26T17:00:00] Starting task..."}

data: {"type":"heartbeat","timestamp":"2025-12-26T17:00:30.000Z"}

data: {"type":"log","content":"[2025-12-26T17:01:00] Task completed"}
```

**NextJS Example (Streaming):**
```typescript
// components/LogViewer.tsx
'use client';

import { useEffect, useState } from 'react';

export function LogViewer({ planName }: { planName: string }) {
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const eventSource = new EventSource(
      `http://localhost:3100/api/plans/${planName}/logs?follow=true`
    );

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'log') {
        setLogs(prev => [...prev, data.content]);
      }
    };

    return () => eventSource.close();
  }, [planName]);

  return (
    <pre className="bg-black text-green-400 p-4 font-mono text-sm">
      {logs.map((log, i) => <div key={i}>{log}</div>)}
    </pre>
  );
}
```

---

### Start Orchestrator

```
POST /api/plans/:name/start
```

**Request Body:**
```json
{
  "mode": "batch",          // "batch" or "continuous"
  "tasks": ["11.5", "11.6"], // Optional: specific tasks to run
  "autonomous": true,        // Skip interactive prompts
  "daemon": true             // Run in background (default: true)
}
```

**Response:**
```json
{
  "success": true,
  "message": "Orchestrator started for plan git-workflow-phase5-worktrees",
  "orchestrator": {
    "pid": 12345,
    "logFile": "/path/to/orchestrator-git-workflow-phase5-worktrees.log",
    "startedAt": "2025-12-26T18:00:00.000Z"
  }
}
```

**Error Response (already running):**
```json
{
  "success": false,
  "error": "Plan already has running orchestrator",
  "code": "ORCHESTRATOR_ALREADY_RUNNING",
  "details": {
    "existingPid": 12345
  }
}
```

---

### Stop Orchestrator

```
POST /api/plans/:name/stop
```

**Request Body:**
```json
{
  "force": false,   // Use SIGKILL instead of SIGTERM
  "timeout": 30     // Seconds to wait before force kill
}
```

**Response:**
```json
{
  "success": true,
  "message": "Orchestrator stopped for plan git-workflow-phase5-worktrees",
  "orchestrator": {
    "pid": 12345,
    "stoppedAt": "2025-12-26T18:05:00.000Z",
    "forced": false
  }
}
```

---

### Get Resources

```
GET /api/resources
```

**Response:**
```json
{
  "limits": {
    "concurrentWorktrees": {
      "current": 2,
      "max": 3,
      "canCreate": true
    },
    "diskSpace": {
      "availableMB": 50000,
      "requiredMB": 1000,
      "sufficient": true
    }
  },
  "worktrees": {
    "total": 2,
    "stale": 0,
    "abandoned": 0
  },
  "warnings": [],
  "canCreateWorktree": true
}
```

---

### List Worktrees

```
GET /api/worktrees
```

**Response:**
```json
{
  "worktrees": [
    {
      "name": "plan-feature-auth",
      "path": "/path/to/worktrees/plan-feature-auth",
      "branch": "plan/feature-auth",
      "planName": "feature-auth",
      "status": "active",
      "age": {
        "days": 3,
        "isStale": false
      }
    }
  ],
  "summary": {
    "total": 2,
    "active": 2,
    "stale": 0,
    "abandoned": 0
  }
}
```

---

## WebSocket Endpoints

WebSocket connections provide real-time updates without polling.

### Connect to Plan Updates

```
WS ws://localhost:3100/ws/plans/:name
```

**Initial Message (sent on connect):**
```json
{
  "type": "status",
  "plan": "git-workflow-phase5-worktrees",
  "status": "in_progress",
  "progress": {
    "total": 84,
    "completed": 67,
    "pending": 17,
    "in_progress": 0,
    "failed": 0,
    "percentage": 80
  },
  "currentTask": {
    "id": "11.8",
    "description": "Document API",
    "startedAt": "2025-12-26T18:00:00.000Z"
  },
  "lastUpdatedAt": "2025-12-26T17:20:10.986Z",
  "timestamp": "2025-12-26T18:00:00.000Z"
}
```

**Update Messages (on status.json changes):**
Same format as initial message.

**Heartbeat (every 30 seconds):**
```json
{
  "type": "heartbeat",
  "timestamp": "2025-12-26T18:00:30.000Z"
}
```

**Error Message:**
```json
{
  "type": "error",
  "error": "Plan not found: unknown-plan",
  "code": "PLAN_NOT_FOUND"
}
```

---

### Connect to All Plans Updates

```
WS ws://localhost:3100/ws/all
```

**Message Format:**
```json
{
  "type": "all-plans",
  "plans": [
    {
      "name": "git-workflow-phase5-worktrees",
      "status": "in_progress",
      "progress": {
        "total": 84,
        "completed": 67,
        "percentage": 80
      }
    }
  ],
  "aggregate": {
    "totalPlans": 5,
    "totalTasks": 200,
    "completed": 150,
    "pending": 45,
    "in_progress": 3,
    "failed": 2,
    "percentage": 75
  },
  "timestamp": "2025-12-26T18:00:00.000Z"
}
```

---

## NextJS Integration Examples

### React Hook for Plan Status

```typescript
// hooks/usePlanStatus.ts
'use client';

import { useState, useEffect, useCallback } from 'react';

interface PlanStatus {
  name: string;
  status: 'pending' | 'in_progress' | 'completed';
  progress: {
    total: number;
    completed: number;
    percentage: number;
  };
  currentTask?: {
    id: string;
    description: string;
  };
}

export function usePlanStatus(planName: string) {
  const [status, setStatus] = useState<PlanStatus | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:3100/ws/plans/${planName}`);

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setError('WebSocket connection failed');

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'status') {
        setStatus(data);
      } else if (data.type === 'error') {
        setError(data.error);
      }
    };

    return () => ws.close();
  }, [planName]);

  return { status, connected, error };
}
```

### Dashboard Component

```tsx
// components/PlanDashboard.tsx
'use client';

import { usePlanStatus } from '@/hooks/usePlanStatus';

function ProgressBar({ percentage }: { percentage: number }) {
  return (
    <div className="w-full bg-gray-200 rounded-full h-4">
      <div
        className="bg-blue-600 h-4 rounded-full transition-all duration-300"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

export function PlanDashboard({ planName }: { planName: string }) {
  const { status, connected, error } = usePlanStatus(planName);

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  if (!status) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">{status.name}</h2>
        <span className={`px-2 py-1 rounded text-sm ${
          connected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {connected ? 'Live' : 'Disconnected'}
        </span>
      </div>

      <ProgressBar percentage={status.progress.percentage} />

      <div className="mt-2 text-sm text-gray-600">
        {status.progress.completed} / {status.progress.total} tasks completed
      </div>

      {status.currentTask && (
        <div className="mt-4 p-3 bg-blue-50 rounded">
          <div className="text-sm text-blue-800">
            Currently working on: {status.currentTask.id}
          </div>
          <div className="text-xs text-blue-600 mt-1">
            {status.currentTask.description}
          </div>
        </div>
      )}
    </div>
  );
}
```

### Server-Side Fetching

```typescript
// app/plans/page.tsx
async function getPlans() {
  const res = await fetch('http://localhost:3100/api/plans', {
    next: { revalidate: 10 } // Revalidate every 10 seconds
  });

  if (!res.ok) {
    throw new Error('Failed to fetch plans');
  }

  return res.json();
}

export default async function PlansPage() {
  const data = await getPlans();

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Plans</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.plans.map((plan: any) => (
          <div key={plan.name} className="p-4 border rounded-lg">
            <h3 className="font-semibold">{plan.title}</h3>
            <div className="mt-2 text-sm text-gray-600">
              {plan.progress.percentage}% complete
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Error Handling

All error responses follow this format:

```json
{
  "success": false,
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

**Common Error Codes:**
| Code | HTTP Status | Description |
|------|-------------|-------------|
| `PLAN_NOT_FOUND` | 404 | Plan does not exist |
| `LOGS_NOT_FOUND` | 404 | No log file for plan |
| `ORCHESTRATOR_NOT_RUNNING` | 404 | No running orchestrator |
| `ORCHESTRATOR_ALREADY_RUNNING` | 409 | Orchestrator already active |
| `START_FAILED` | 500 | Failed to start orchestrator |
| `STOP_FAILED` | 500 | Failed to stop orchestrator |
| `INTERNAL_ERROR` | 500 | Server error |

---

## CORS Configuration

The API includes CORS headers for cross-origin requests:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

For production, consider configuring allowed origins in `.claude/git-workflow.json`:

```json
{
  "api": {
    "cors": {
      "origin": ["http://localhost:3000", "https://your-app.com"]
    }
  }
}
```

---

## Health Check

```
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-12-26T18:00:00.000Z"
}
```

Use for load balancer health checks or uptime monitoring.
