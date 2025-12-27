# Orchestrator API Server

This directory contains generated API documentation and TypeScript types for the Orchestrator API Server.

## Generated Files

| File | Description |
|------|-------------|
| `openapi.json` | OpenAPI 3.0 specification |
| `api-types.ts` | TypeScript types generated from OpenAPI spec |
| `api-client.ts` | Type-safe API client helper for Next.js |

## Quick Start

### Running the API Server

```bash
# Standalone mode (no orchestration)
python scripts/run_api_server.py --port 8000

# With orchestration
python scripts/plan_orchestrator.py --api-server --api-port 8000

# Development mode with hot-reload
python scripts/run_api_server.py --reload
```

### Accessing Documentation

Once the server is running:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI JSON**: http://localhost:8000/openapi.json

## API Endpoints

### Health Check

```
GET /health
```

Returns server health status and count of running orchestrators.

### Orchestrators

```
GET /api/orchestrators              # List all registered instances
GET /api/orchestrators/{id}         # Get instance info
GET /api/orchestrators/{id}/status  # Get full status with tasks
```

### Commands

```
POST /api/orchestrators/{id}/pause      # Pause execution
POST /api/orchestrators/{id}/resume     # Resume execution
POST /api/orchestrators/{id}/shutdown   # Request shutdown
POST /api/orchestrators/{id}/skip-task  # Skip a task
POST /api/orchestrators/{id}/retry-task # Retry a failed task
```

### Plans

```
GET /api/plans                          # List available plans
GET /api/plans/{name}/status            # Get plan status
GET /api/plans/{name}/tasks             # Get all tasks
GET /api/plans/{name}/findings          # List findings files
GET /api/plans/{name}/findings/{taskId} # Get finding content
```

### Real-time Events

```
WebSocket: /api/orchestrators/{id}/events      # All events
WebSocket: /api/orchestrators/{id}/activity    # Tool calls only
GET:       /api/orchestrators/{id}/events-sse  # Server-Sent Events
```

## Using in Next.js

### 1. Copy Type Files

```bash
# Copy to your Next.js project
cp docs/plan-outputs/orchestrator-api-server/api-types.ts src/types/
cp docs/plan-outputs/orchestrator-api-server/api-client.ts src/lib/
```

### 2. Use the API Client

```typescript
import { createApiClient, type OrchestratorInfo } from '@/lib/api-client';

const api = createApiClient('http://localhost:8000');

// List orchestrators
const orchestrators = await api.listOrchestrators();

// Get status
const status = await api.getOrchestratorStatus(orchestrators[0].id);

// Connect to WebSocket for real-time updates
const ws = api.connectEvents(orchestrators[0].id);
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Event:', data.type, data.data);
};
```

### 3. Using with React Query

```typescript
import { useQuery, useMutation } from '@tanstack/react-query';
import { createApiClient } from '@/lib/api-client';

const api = createApiClient('http://localhost:8000');

export function useOrchestrators() {
  return useQuery({
    queryKey: ['orchestrators'],
    queryFn: () => api.listOrchestrators(),
    refetchInterval: 5000,
  });
}

export function usePauseOrchestrator() {
  return useMutation({
    mutationFn: (id: string) => api.pauseOrchestrator(id),
  });
}
```

## WebSocket Event Types

Events streamed via WebSocket or SSE:

| Event Type | Description |
|------------|-------------|
| `initial_status` | Full status sent on connection |
| `status_updated` | Status.json changed |
| `task_changed` | Individual task status changed |
| `phase_changed` | Current phase changed |
| `tool_started` | Tool call began |
| `tool_completed` | Tool call finished |
| `ping` | Heartbeat (every 30s) |

### Event Format

```json
{
  "type": "task_changed",
  "timestamp": "2024-01-01T12:00:00Z",
  "instance_id": "orch-abc123",
  "data": {
    "task_id": "1.1",
    "old_status": "in_progress",
    "new_status": "completed"
  }
}
```

## Regenerating Types

If the API changes, regenerate the types:

```bash
python scripts/generate_api_types.py
```

This will update:
- `openapi.json` - Latest OpenAPI spec
- `api-types.ts` - Fresh TypeScript types (requires openapi-typescript)
- `api-client.ts` - Updated client helper
