# Mock Data for Frontend Development

This directory contains mock data files for developing and testing the NextJS frontend dashboard without requiring a running backend.

## Files

| File | Description | API Endpoint |
|------|-------------|--------------|
| `plans.json` | List of all plans with summary info | `GET /api/plans` |
| `plan-detail.json` | Detailed plan view with phases and tasks | `GET /api/plans/:name` |
| `worktrees.json` | List of active worktrees | `GET /api/worktrees` |
| `resources.json` | Resource usage and limits | `GET /api/resources` |
| `conflicts.json` | Conflict detection results | `GET /api/conflicts` |
| `websocket-messages.json` | Sample WebSocket messages | `WS /ws/plans/:name`, `WS /ws/all` |
| `orchestrator-logs.json` | Sample orchestrator log entries | `GET /api/plans/:name/logs` |

## Usage

### In NextJS with API Mocking

```typescript
// lib/api/mock.ts
import plans from '@/mock-data/plans.json';
import planDetail from '@/mock-data/plan-detail.json';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

export async function fetchPlans() {
  if (USE_MOCK) {
    return plans;
  }
  const res = await fetch('/api/plans');
  return res.json();
}
```

### In Storybook

```typescript
// .storybook/preview.ts
import plans from '../mock-data/plans.json';

export const parameters = {
  mockData: {
    plans: plans.plans,
  },
};
```

### In Tests

```typescript
// tests/components/PlanList.test.tsx
import { render, screen } from '@testing-library/react';
import plans from '@/mock-data/plans.json';
import { PlanList } from '@/components/plans/plan-list';

test('renders plan list', () => {
  render(<PlanList plans={plans.plans} />);
  expect(screen.getByText('Git Workflow Phase 5')).toBeInTheDocument();
});
```

## WebSocket Testing

Use the messages in `websocket-messages.json` to simulate WebSocket events:

```typescript
// lib/websocket/mock.ts
import messages from '@/mock-data/websocket-messages.json';

export function createMockWebSocket(onMessage: (data: any) => void) {
  // Simulate status updates
  setInterval(() => {
    onMessage(messages.messages.status);
  }, 5000);

  // Simulate heartbeat
  setInterval(() => {
    onMessage(messages.messages.heartbeat);
  }, 30000);
}
```

## Data Structure

### Plan Status Values

- `pending` - Plan not started
- `in_progress` - Plan actively being worked on
- `completed` - All tasks completed

### Task Status Values

- `pending` - Task not started
- `in_progress` - Task currently running
- `completed` - Task finished successfully
- `failed` - Task failed with error
- `skipped` - Task intentionally skipped

### Log Levels

- `debug` - Detailed debugging info
- `info` - General information
- `warn` - Warning conditions
- `error` - Error conditions

## Updating Mock Data

When API responses change, update these files to match:

1. Run the API server: `node scripts/api-server.js`
2. Make requests to get real data
3. Copy responses to mock files
4. Adjust timestamps and sensitive data as needed

## Related Documentation

- [Frontend Requirements](../findings/12.1-frontend-requirements.md)
- [WebSocket Message Format](../findings/12.2-websocket-message-format.md)
- [Component Structure](../findings/12.4-component-structure.md)
- [OpenAPI Spec](../../../api/openapi.yaml)
