# Implementation Plan: Orchestrator Dashboard (Next.js)

## Overview

- **Objective:** Build a Next.js web application that fully replaces the terminal TUI for plan orchestration
- **Priority:** P1 (New Feature)
- **Created:** 2025-12-27
- **Output:** `docs/plan-outputs/orchestrator-dashboard-nextjs/`
- **Repository:** New separate repository (e.g., `orchestrator-dashboard`)

> This dashboard provides a complete web-based replacement for the Rich TUI, consuming the Orchestrator API Server for all data and commands.

---

## Dependencies

### Upstream
- Orchestrator API Server plan (must be implemented first or in parallel)
- API endpoints: `/api/orchestrators/*`, WebSocket events

### Technology Stack
- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + shadcn/ui components
- **State:** Zustand or React Query for server state
- **Real-time:** Native WebSocket + React hooks
- **Charts:** Recharts or similar for progress visualization

---

## Phase 1: Project Setup & Foundation

**Objective:** Initialize Next.js project with core configuration and layout.

- [ ] 1.1 Initialize Next.js project with TypeScript and Tailwind
  - Run `npx create-next-app@latest orchestrator-dashboard --typescript --tailwind --eslint --app`
  - Configure `next.config.js` for API proxy to orchestrator server
  - Set up environment variables: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL`
  - Add shadcn/ui: `npx shadcn-ui@latest init`
  - Install core shadcn components: button, card, badge, table, dialog, tabs, toast
  - Set up dark mode with next-themes

- [ ] 1.2 Create app layout and navigation structure
  - Create root layout with sidebar navigation (`app/layout.tsx`)
  - Create header with status indicator and settings
  - Navigation items: Dashboard, Plans, Orchestrators, Activity, Settings
  - Responsive sidebar (collapsible on mobile)
  - Add loading states and error boundaries

- [ ] 1.3 Set up API client and TypeScript types
  - Create `lib/api/client.ts` with fetch wrapper for REST endpoints
  - Create `lib/api/types.ts` with TypeScript interfaces matching API models
  - Create `lib/api/hooks.ts` with React Query or SWR hooks for data fetching
  - Create `lib/api/websocket.ts` with WebSocket connection manager
  - Add error handling and retry logic

**VERIFY 1:** Run `npm run dev`, see styled layout with navigation, no TypeScript errors

---

## Phase 2: Dashboard Home & Orchestrator List

**Objective:** Build the main dashboard showing all orchestrators and system overview.

- [ ] 2.1 Create dashboard home page with system overview
  - Create `app/page.tsx` as dashboard home
  - Show summary cards: total plans, running orchestrators, completed today, failed tasks
  - Add quick actions: start new orchestrator, view recent activity
  - Show mini activity feed (last 10 events)
  - Auto-refresh data every 5 seconds

- [ ] 2.2 Create orchestrator list view
  - Create `app/orchestrators/page.tsx` for orchestrator list
  - Display table/cards of all registered orchestrators
  - Show: plan name, status (running/paused/stopped), progress %, current phase
  - Add status badges with color coding (green=running, yellow=paused, red=stopped)
  - Include actions: pause, resume, stop, view details
  - Add filtering by status

- [ ] 2.3 Implement real-time status updates for orchestrator list
  - Connect to WebSocket for status events
  - Update orchestrator cards in real-time when status changes
  - Show toast notification on orchestrator state change
  - Animate progress bar updates

**VERIFY 2:** Dashboard shows orchestrator list, clicking pause/resume updates status in real-time

---

## Phase 3: Orchestrator Detail View

**Objective:** Build detailed view for a single orchestrator with full task visibility.

- [ ] 3.1 Create orchestrator detail page with tabs
  - Create `app/orchestrators/[id]/page.tsx` for detail view
  - Header: plan name, status badge, progress bar, elapsed time
  - Tabs: Overview, Tasks, Activity, Findings, Settings
  - Overview tab: phase progress, task summary, recent completions
  - Add breadcrumb navigation

- [ ] 3.2 Build task list view with status and actions
  - Create Tasks tab showing all tasks grouped by phase
  - Display: task ID, description, status badge, retry count, duration
  - Collapsible phase sections with phase progress indicator
  - Task row actions: skip, retry, view findings, view dependencies
  - Highlight currently in-progress tasks
  - Show blocked tasks with blocker info

- [ ] 3.3 Build real-time activity stream panel
  - Create Activity tab with live tool call stream
  - Show: tool name, start time, duration, status (spinner while running)
  - Color-code by tool type (Read=blue, Edit=yellow, Bash=green, etc.)
  - Auto-scroll to latest activity
  - Expandable rows to show tool input/output details
  - Filter by tool type

- [ ] 3.4 Build findings browser
  - Create Findings tab listing all finding files for the plan
  - Group findings by task ID
  - Render markdown content with syntax highlighting
  - Navigation between findings (prev/next)
  - Search within findings

**VERIFY 3:** Orchestrator detail shows tasks, activity streams in real-time, can browse findings

---

## Phase 4: Plan Management

**Objective:** View and manage plans, start new orchestration runs.

- [ ] 4.1 Create plan list and detail pages
  - Create `app/plans/page.tsx` listing all available plans
  - Show: plan name, last run date, total tasks, completion history
  - Create `app/plans/[name]/page.tsx` for plan details
  - Display plan markdown content rendered nicely
  - Show task breakdown by phase
  - Show historical runs with outcomes

- [ ] 4.2 Implement start orchestrator flow
  - Add "Start Orchestrator" button on plan detail page
  - Create dialog/modal for configuration: max iterations, batch size, timeout
  - Call API to start new orchestrator instance
  - Redirect to orchestrator detail view on success
  - Handle errors (plan already running, etc.)

- [ ] 4.3 Implement plan status overview
  - Create `app/plans/[name]/status/page.tsx` for current status
  - Show status.json data in structured view
  - Task status breakdown chart (pie or bar)
  - Phase progress timeline visualization
  - Export status as JSON

**VERIFY 4:** Can browse plans, start new orchestrator, see plan status

---

## Phase 5: Command Execution & Task Actions

**Objective:** Execute commands and perform task actions from the dashboard.

- [ ] 5.1 Implement task action buttons
  - Add action buttons to task rows: Explain, Implement, Verify, Skip
  - Create confirmation dialog for destructive actions (skip)
  - Call appropriate API endpoints
  - Show loading state during execution
  - Update task status on completion
  - Show toast with result

- [ ] 5.2 Build command palette modal
  - Create global command palette (Cmd+K / Ctrl+K)
  - List available commands for current context
  - Fuzzy search through commands
  - Execute command on selection
  - Show command output in slide-over panel

- [ ] 5.3 Implement dependency graph visualization
  - Create interactive dependency graph for tasks
  - Use D3.js or React Flow for visualization
  - Color nodes by status
  - Highlight critical path
  - Click node to view task details
  - Show on orchestrator detail page

**VERIFY 5:** Can execute task actions, use command palette, view dependency graph

---

## Phase 6: Activity & History

**Objective:** Comprehensive activity logging and historical views.

- [ ] 6.1 Create global activity feed page
  - Create `app/activity/page.tsx` for all activity across orchestrators
  - Filterable by orchestrator, time range, event type
  - Paginated list with infinite scroll
  - Real-time updates via WebSocket
  - Export activity log

- [ ] 6.2 Build run history view
  - Create historical runs list for each plan
  - Show: run date, duration, tasks completed, final status
  - Click to view archived status snapshot
  - Compare runs side-by-side
  - Trend charts (completion rate over time)

**VERIFY 6:** Activity feed shows all events, can browse run history

---

## Phase 7: Settings & Configuration

**Objective:** User preferences and system configuration.

- [ ] 7.1 Create settings page
  - Create `app/settings/page.tsx`
  - Theme toggle (light/dark/system)
  - API server URL configuration
  - Notification preferences
  - Dashboard refresh interval
  - Default orchestrator settings (batch size, timeout)

- [ ] 7.2 Add notification system
  - Browser notifications for important events (task failed, orchestrator stopped)
  - In-app notification center
  - Notification preferences per event type
  - Sound alerts (optional)

**VERIFY 7:** Settings persist, notifications work

---

## Phase 8: Polish & Production Readiness

**Objective:** Final polish for production deployment.

- [ ] 8.1 Responsive design and mobile support
  - Test and fix all pages on mobile viewport
  - Collapsible sidebar on mobile
  - Touch-friendly task actions
  - Swipe gestures where appropriate

- [ ] 8.2 Performance optimization
  - Add React Suspense boundaries
  - Implement virtual scrolling for long lists
  - Optimize WebSocket reconnection
  - Add service worker for offline status page
  - Lighthouse audit and fixes

- [ ] 8.3 Deployment configuration
  - Create Dockerfile for containerized deployment
  - Add docker-compose.yml with API server
  - Create Vercel/Netlify deployment config
  - Add CI/CD pipeline (GitHub Actions)
  - Environment-specific configuration
  - Add health check endpoint

**VERIFY 8:** Lighthouse score >90, mobile works well, deploys successfully

---

## Success Criteria

### Functional Requirements
- [ ] View all running orchestrators with real-time status
- [ ] Start/pause/resume/stop orchestrators
- [ ] View task list with status, retry, skip actions
- [ ] Real-time activity stream (tool calls)
- [ ] Browse and search findings
- [ ] View dependency graph
- [ ] Command palette for quick actions
- [ ] Dark mode support
- [ ] Mobile responsive

### Quality Requirements
- [ ] Page load <2 seconds
- [ ] Real-time updates <100ms latency
- [ ] No layout shift on data load
- [ ] Graceful handling of API errors
- [ ] Works offline (shows last known state)

---

## Page Structure

```
app/
├── layout.tsx                    # Root layout with sidebar
├── page.tsx                      # Dashboard home
├── orchestrators/
│   ├── page.tsx                  # Orchestrator list
│   └── [id]/
│       └── page.tsx              # Orchestrator detail (tabbed)
├── plans/
│   ├── page.tsx                  # Plan list
│   └── [name]/
│       ├── page.tsx              # Plan detail
│       └── status/
│           └── page.tsx          # Plan status view
├── activity/
│   └── page.tsx                  # Global activity feed
└── settings/
    └── page.tsx                  # Settings
```

---

## Component Library

```
components/
├── ui/                           # shadcn/ui components
├── layout/
│   ├── Sidebar.tsx
│   ├── Header.tsx
│   └── Breadcrumbs.tsx
├── orchestrator/
│   ├── OrchestratorCard.tsx
│   ├── OrchestratorStatus.tsx
│   ├── ProgressBar.tsx
│   └── ControlButtons.tsx
├── task/
│   ├── TaskList.tsx
│   ├── TaskRow.tsx
│   ├── TaskActions.tsx
│   └── TaskStatusBadge.tsx
├── activity/
│   ├── ActivityStream.tsx
│   ├── ActivityItem.tsx
│   └── ToolCallDetail.tsx
├── plan/
│   ├── PlanCard.tsx
│   ├── PhaseProgress.tsx
│   └── DependencyGraph.tsx
└── common/
    ├── CommandPalette.tsx
    ├── FindingsBrowser.tsx
    └── NotificationCenter.tsx
```

---

## Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| WebSocket disconnects | MEDIUM | HIGH | Auto-reconnect with exponential backoff |
| Large task lists slow | MEDIUM | MEDIUM | Virtual scrolling, pagination |
| API server unavailable | HIGH | LOW | Graceful error states, retry UI |
| State sync issues | MEDIUM | MEDIUM | Optimistic updates with rollback |
