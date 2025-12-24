# Idea-to-Code: Comprehensive Architecture Documentation

> A complete guide for developers to understand the project structure, architecture, components, and data flow.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Technology Stack](#2-technology-stack)
3. [Project Structure](#3-project-structure)
4. [Architecture Overview](#4-architecture-overview)
5. [Backend Components](#5-backend-components)
6. [Frontend Components](#6-frontend-components)
7. [State Management](#7-state-management)
8. [Phase System](#8-phase-system)
9. [API Reference](#9-api-reference)
10. [WebSocket Protocol](#10-websocket-protocol)
11. [Data Models](#11-data-models)
12. [Configuration](#12-configuration)

---

## 1. Executive Summary

### What is Idea-to-Code?

Idea-to-Code is a **phased project creation tool** that guides users through building software from an initial idea to deployment. It uses **Claude Code** as the backend AI agent, with a **Next.js** frontend providing a chat interface for each development phase.

### Key Capabilities

- **6-Phase Workflow**: Understand → Explore → Define → Build → Validate → Deliver
- **Real-time Chat**: WebSocket-based streaming responses from Claude Code
- **Decision Points**: AI agent can pause and ask users for decisions
- **Session Resumption**: Conversations persist and can be resumed
- **File-based Storage**: Projects stored locally with full history

### How It Works

```
User Input → WebSocket → Server → Orchestrator → Claude Code CLI
                                       ↓
User Display ← WebSocket ← Server ← Stream JSON Output
```

---

## 2. Technology Stack

### Core Framework
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 14.2.35 | React framework with App Router |
| React | 18.x | UI library |
| TypeScript | 5.x | Type safety |
| Node.js | - | Server runtime |

### Real-time Communication
| Technology | Version | Purpose |
|------------|---------|---------|
| Socket.IO | 4.8.1 | WebSocket with auto-reconnect, rooms |
| execa | 8.0.1 | Process spawning for Claude CLI |

### State & UI
| Technology | Version | Purpose |
|------------|---------|---------|
| Zustand | 5.0.9 | Lightweight state management |
| Tailwind CSS | 3.4.1 | Utility-first CSS |
| Radix UI | 1.x | Accessible component primitives |
| shadcn/ui | - | Pre-built component library |
| Lucide React | 0.561.0 | Icon library |

### Testing
| Technology | Purpose |
|------------|---------|
| Vitest | Unit testing |
| Playwright | E2E testing |
| Testing Library | Component testing |

---

## 3. Project Structure

```
idea-to-code/
├── server.ts                    # Custom HTTP + Socket.IO server entry point
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── api/                 # REST API routes
│   │   │   └── projects/        # Project CRUD + phase management
│   │   ├── project/[id]/phase/[phase]/  # Phase UI pages
│   │   ├── layout.tsx           # Root layout
│   │   ├── page.tsx             # Dashboard (home)
│   │   └── globals.css          # Global styles + CSS variables
│   │
│   ├── components/              # React components (50+ files)
│   │   ├── ui/                  # shadcn/ui primitives (button, card, dialog, etc.)
│   │   ├── chat/                # Chat interface components
│   │   ├── dashboard/           # Project list/cards
│   │   ├── decisions/           # Decision prompts from AI
│   │   ├── build/               # Build phase activity
│   │   ├── validate/            # Validation results
│   │   ├── navigation/          # Phase navigation
│   │   ├── modals/              # Dialogs (new project, delete, etc.)
│   │   └── layout/              # Header, toggles
│   │
│   ├── hooks/                   # Custom React hooks
│   │   ├── use-websocket.ts     # WebSocket connection + store integration
│   │   └── use-toast.ts         # Notifications
│   │
│   ├── lib/                     # Core backend logic
│   │   ├── orchestrator.ts      # Claude Code CLI process management
│   │   ├── project-store.ts     # File-based persistence
│   │   ├── websocket-manager.ts # Socket.IO server (broadcast hub)
│   │   ├── websocket-connection.ts  # Socket.IO client
│   │   ├── constants/           # Phase definitions, markers
│   │   ├── prompts/             # AI prompt templates per phase
│   │   ├── types/               # TypeScript interfaces
│   │   └── utils/               # Helper functions
│   │
│   ├── stores/                  # Zustand state stores
│   │   ├── phase-session-store.ts  # Main app state
│   │   └── preferences-store.ts    # User preferences
│   │
│   └── test/                    # Test utilities
│
├── e2e/                         # Playwright E2E tests
├── docs/                        # Documentation
└── [config files]               # tsconfig, tailwind, vitest, etc.
```

---

## 4. Architecture Overview

### System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           CLIENT (Browser)                          │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │   Next.js    │  │    Zustand   │  │   WebSocket Connection   │  │
│  │   Pages      │  │    Store     │  │   (socket.io-client)     │  │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                              │ HTTP/WS
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          SERVER (Node.js)                           │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  server.ts   │  │  Next.js     │  │   WebSocket Manager      │  │
│  │  (HTTP+WS)   │  │  API Routes  │  │   (socket.io server)     │  │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘  │
│                              │                                      │
│                              ▼                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │ Orchestrator │  │   Project    │  │   Prompt Templates       │  │
│  │ (CLI spawn)  │  │   Store      │  │   (per phase)            │  │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                              │ stdin/stdout
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Claude Code CLI                              │
│          (Spawned process with --output-format stream-json)         │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User sends message** → WebSocket → Server
2. **Server checks session** → Start new agent or resume existing
3. **Orchestrator spawns Claude CLI** → Passes prompt via stdin
4. **Claude outputs stream-json** → Orchestrator parses events
5. **Orchestrator detects markers** → Decision requests, phase completion
6. **Server broadcasts to room** → All subscribed clients receive updates
7. **Frontend updates store** → React re-renders UI

---

## 5. Backend Components

### 5.1 server.ts - HTTP + WebSocket Server

**Purpose**: Entry point that wraps Next.js with Socket.IO for real-time communication.

**Key Responsibilities**:
- Creates HTTP server wrapping Next.js
- Initializes Socket.IO at `/api/ws`
- Routes WebSocket messages to orchestrator
- Handles `user_message` and `decision_response` events

**Message Routing Logic**:
```typescript
// On user_message:
if (hasActiveSession(projectId)) {
  sendFollowUpMessage(projectId, content, phase);  // Resume session
} else {
  startAgent(context);  // Start new Claude process
  sendMessageToAgent(projectId, content, phase);
}
```

### 5.2 orchestrator.ts - Claude Code Process Manager

**Purpose**: Manages Claude Code CLI processes, streaming output, and session lifecycle.

**Key Functions**:

| Function | Purpose |
|----------|---------|
| `startAgent(context)` | Spawn new Claude process with phase prompt |
| `sendMessageToAgent(id, msg, phase)` | Write to agent's stdin |
| `sendFollowUpMessage(id, msg, phase)` | Resume session with `--resume` flag |
| `pauseAgent(id)` / `resumeAgent(id)` | Send SIGSTOP/SIGCONT signals |
| `cancelAgent(id)` | Terminate agent process |
| `streamContent(id, text, msgId)` | Broadcast text + detect markers |

**Marker Detection**:
```
<<<DECISION_START>>>
{"question": "...", "options": [...]}
<<<DECISION_END>>>

<<<PHASE_COMPLETE>>>
```

**Session Resumption**: Claude sessions are persisted via session IDs stored in `session.json`. When resuming, the CLI is invoked with `--resume <sessionId>`.

### 5.3 websocket-manager.ts - Broadcast Hub

**Purpose**: Singleton managing all WebSocket connections with Socket.IO rooms.

**Key Features**:
- **Room-based broadcasting**: One room per projectId
- **Subscribe/Unsubscribe**: Clients join/leave rooms
- **Dynamic handlers**: Register handlers per message type

**API**:
```typescript
wsManager.initialize(io)              // Setup Socket.IO server
wsManager.onMessage(type, handler)    // Register message handler
wsManager.broadcast(projectId, msg)   // Send to all room subscribers
wsManager.send(connectionId, msg)     // Send to specific client
```

### 5.4 project-store.ts - File-based Persistence

**Purpose**: Manages all project data on the filesystem.

**Storage Locations**:
```
~/.idea-to-code/
├── config.json                    # Global registry of all projects

<project-path>/
├── .idea/
│   ├── project.json               # Project metadata
│   └── phases/
│       ├── 01-understand/
│       │   ├── conversation.json  # Chat history
│       │   ├── decisions.json     # User decisions
│       │   ├── session.json       # Claude session ID
│       │   └── output/
│       │       └── intent.json    # Phase artifact
│       ├── 02-explore/
│       │   └── output/experience.json
│       ├── 03-define/
│       │   └── output/architecture.json
│       ├── 04-build/
│       │   └── output/build-result.json
│       ├── 05-validate/
│       │   └── output/validation.json
│       └── 06-deliver/
│           └── output/deployment.json
```

**Key Functions**:

| Function | Purpose |
|----------|---------|
| `listProjects()` | Get all projects from registry |
| `getProject(id)` | Load single project |
| `createProject(name, desc, path)` | Create project with directory structure |
| `updateProject(id, updates)` | Update project metadata |
| `deleteProject(id, deleteFiles)` | Remove from registry, optionally delete files |
| `getConversation(id, phase)` | Load chat history |
| `saveMessage(id, phase, msg)` | Append message (with deduplication) |
| `advancePhase(id)` | Mark current complete, unlock next |
| `resetToPhase(id, targetPhase)` | Reset progress and clear downstream data |

**Atomic Writes**: Uses temp file + rename pattern to prevent corruption.

---

## 6. Frontend Components

### 6.1 Component Hierarchy

```
App
├── Header
│   └── TechModeToggle
├── Dashboard (/)
│   ├── ViewToggle
│   ├── EmptyState (if no projects)
│   └── ProjectCard[] → GridProjectCard | ListProjectCard
│
└── Phase Page (/project/[id]/phase/[phase])
    ├── PhaseNavigation
    │   └── PhaseStep[]
    ├── ChatContainer
    │   ├── WelcomePrompt
    │   ├── MessageList
    │   │   └── ChatMessage[]
    │   ├── StreamingMessage | TypingIndicator
    │   └── ChatInput
    ├── DecisionPanel (when decision pending)
    │   └── DecisionOption[]
    ├── DecisionHistory (sidebar)
    ├── FeatureList (build phase)
    ├── ActivityFeed (build phase)
    └── ResultsSidebar (validate phase)

Modals (overlays)
├── NewProjectModal
├── DeleteProjectModal
├── QualityGateModal
└── PhaseJumpWarning
```

### 6.2 UI Components (src/components/ui/)

Built with **shadcn/ui** (Radix UI + Tailwind CSS):

| Component | Purpose |
|-----------|---------|
| `Button` | CVA-based variants (default, destructive, outline, ghost, link) |
| `Card` | Compound component (Card, CardHeader, CardTitle, CardContent, CardFooter) |
| `Dialog` | Modal with overlay, animations, close button |
| `Input` / `Textarea` | Form inputs with focus states |
| `Label` | Form label with disabled state |
| `Badge` | Status indicators (default, secondary, destructive, outline) |
| `Progress` | Progress bar |
| `Tabs` | Tab navigation (TabsList, TabsTrigger, TabsContent) |
| `Checkbox` / `RadioGroup` / `Switch` | Selection controls |
| `ScrollArea` | Custom scrollbar styling |
| `Separator` | Horizontal/vertical dividers |
| `Toast` / `Toaster` | Notification system |

### 6.3 Chat Components (src/components/chat/)

| Component | Props | Purpose |
|-----------|-------|---------|
| `ChatContainer` | messages, streamingContent, isStreaming, isWaiting, phase | Main wrapper with auto-scroll |
| `ChatInput` | onSend, disabled, placeholder | User input with auto-resize textarea |
| `MessageList` | messages | Renders ChatMessage array |
| `ChatMessage` | message, isStreaming | User/assistant/system message with markdown |
| `StreamingMessage` | isStreaming, streamingContent, isWaiting | Shows streaming or typing indicator |
| `TypingIndicator` | - | Three bouncing dots animation |
| `WelcomePrompt` | phase | Initial greeting for each phase |

### 6.4 Decision Components (src/components/decisions/)

| Component | Props | Purpose |
|-----------|-------|---------|
| `DecisionPanel` | decision, onConfirm, isSubmitting | Option selection or custom response |
| `DecisionOption` | label, description, isSelected, isRecommended, onSelect | Single option button |
| `DecisionHistory` | decisions | List of past decisions |

### 6.5 Dashboard Components (src/components/dashboard/)

| Component | Props | Purpose |
|-----------|-------|---------|
| `ProjectCard` | project, viewMode, onDelete | Routes to Grid or List variant |
| `GridProjectCard` | project, onDelete | Card layout for grid view |
| `ListProjectCard` | project, onDelete | Row layout for list view |
| `ViewToggle` | viewMode, onViewModeChange | Grid/List toggle buttons |
| `EmptyState` | onCreateProject | No projects placeholder |

### 6.6 Modal Components (src/components/modals/)

| Component | Purpose |
|-----------|---------|
| `BaseModal` | Wrapper with icon, title, description, footer |
| `NewProjectModal` | Create project form (name + description) |
| `DeleteProjectModal` | Confirm deletion with "delete files" checkbox |
| `QualityGateModal` | Phase completion approval |
| `PhaseJumpWarning` | Confirm reset to earlier phase |

---

## 7. State Management

### 7.1 Main Store (phase-session-store.ts)

**Single Zustand store** with 4 logical slices:

#### ProjectState
```typescript
{
  currentProject: Project | null;
  projects: Project[];
  isLoading: boolean;
  isLoadingProjects: boolean;
  error: string | null;
}
```

#### ChatState
```typescript
{
  messages: Message[];
  streamingContent: string;
  isStreaming: boolean;
  agentStatus: 'idle' | 'running' | 'paused' | 'error';
  currentPhase: PhaseName | null;
  isWaitingForInput: boolean;
}
```

#### BuildState
```typescript
{
  tasks: BuildTask[];
  activityFeed: ActivityItem[];
  progress: number;
  isRunning: boolean;
}
```

#### DecisionState
```typescript
{
  currentDecision: Decision | null;
  decisionHistory: Decision[];
  isSubmitting: boolean;
}
```

### 7.2 Key Actions

| Action | Purpose |
|--------|---------|
| `setMessages(msgs)` | Deduplicate by ID, sort by timestamp, merge |
| `addMessage(msg)` | Append single message |
| `appendStreamingContent(text)` | Add to streaming buffer |
| `finalizeStreamingMessage()` | Move buffer to messages array |
| `setCurrentDecision(decision)` | Set pending decision |
| `completeDecision(response)` | Move to history with user's choice |
| `clearSession()` | Reset chat/build/decision state |

### 7.3 Preferences Store (preferences-store.ts)

**Persisted to localStorage** via Zustand persist middleware:

```typescript
{
  techMode: boolean;           // Show technical details
  viewMode: 'grid' | 'list';   // Dashboard layout
  projectsBasePath: string;    // Default project location
}
```

### 7.4 WebSocket → Store Integration

The `useWebSocket` hook maps WebSocket messages to store actions:

```typescript
const handlers = {
  chat_stream: () => appendStreamingContent(payload.content),
  chat_stream_end: () => finalizeStreamingMessage(),
  decision_request: () => {
    setCurrentDecision(payload);
    setIsWaitingForInput(true);
  },
  agent_status: () => setAgentStatus(payload.status),
  phase_complete: () => {
    clearStreamingContent();
    setIsWaitingForInput(false);
  },
  // ... more handlers
};
```

---

## 8. Phase System

### 8.1 The 6 Phases

| # | Phase | Role | Input | Output Artifact |
|---|-------|------|-------|-----------------|
| 1 | **Understand** | Analyst | User's idea | `intent.json` - Problem, users, scope, constraints |
| 2 | **Explore** | Designer | Intent | `experience.json` - User journeys, screens, interactions |
| 3 | **Define** | Architect | Intent + Experience | `architecture.json` - Tech stack, components, build tasks |
| 4 | **Build** | Builder | All previous | `build-result.json` - Code, tests, dependencies |
| 5 | **Validate** | QA | Built code | `validation.json` - Test results, issues |
| 6 | **Deliver** | Release Eng | Validated code | `deployment.json` - Packages, docs, release |

### 8.2 Phase Status

Each phase has one of three statuses:

```typescript
type PhaseStatus = 'locked' | 'active' | 'complete';
```

**Initial State** (new project):
```
understand: 'active'
explore: 'locked'
define: 'locked'
build: 'locked'
validate: 'locked'
deliver: 'locked'
```

### 8.3 Phase Transitions

**Advance to Next Phase**:
1. User approves phase output
2. POST `/api/projects/[id]/phase/[phase]/advance` with `action: 'advance'`
3. Current phase → `'complete'`
4. Next phase → `'active'`
5. `currentPhase` incremented

**Reset to Earlier Phase**:
1. User confirms reset warning
2. POST with `action: 'reset'`
3. Target phase → `'active'`
4. All phases after → `'locked'`
5. Conversation/decisions/session cleared for reset phases

### 8.4 Prompt Templates

Located in `src/lib/prompts/templates/`:

```
templates/
├── understand.txt   # Analyst prompts for requirements gathering
├── explore.txt      # Designer prompts for UX design
├── define.txt       # Architect prompts for technical planning
├── build.txt        # Builder prompts for implementation
├── validate.txt     # QA prompts for testing
└── deliver.txt      # Release prompts for deployment
```

**Context Injection**: Each prompt receives:
- Project name, path, description
- Previous phase outputs
- Tech mode flag

### 8.5 Decision Flow

```
Agent outputs:
<<<DECISION_START>>>
{"question": "Which database?", "options": [...], "recommendation": 0}
<<<DECISION_END>>>

↓ Orchestrator detects marker
↓ Broadcasts decision_request
↓ Frontend shows DecisionPanel
↓ User selects option
↓ Frontend sends decision_response
↓ Server formats response ("Option 1" or custom text)
↓ Sends to agent via stdin
↓ Agent continues with decision
```

---

## 9. API Reference

### Projects

#### GET /api/projects
List all projects.

**Response**: `{ projects: Project[] }`

#### POST /api/projects
Create new project.

**Request**:
```json
{
  "name": "string (required, max 100)",
  "description": "string (required, max 5000)",
  "basePath": "string (optional)"
}
```

**Response**: `{ project: Project }`

#### GET /api/projects/[id]
Get single project.

**Response**: `{ project: Project }`

#### PATCH /api/projects/[id]
Update project.

**Request**: `{ name?, description?, currentPhase?, phaseStatus? }`

**Response**: `{ project: Project }`

#### DELETE /api/projects/[id]?deleteFiles=true|false
Delete project.

**Response**: `{ success: true }`

### Phase Data

#### GET /api/projects/[id]/phase/[phase]
Get phase conversation, decisions, and output.

**Response**:
```json
{
  "phase": {
    "name": "understand",
    "status": "active",
    "conversation": Message[],
    "decisions": Decision[],
    "output": object | null,
    "shouldInitialize": boolean
  }
}
```

#### POST /api/projects/[id]/phase/[phase]
Add message or decision.

**Request (message)**:
```json
{
  "type": "message",
  "data": { "id": "...", "role": "user", "content": "...", "timestamp": "..." }
}
```

**Request (decision)**:
```json
{
  "type": "decision",
  "data": { "id": "...", "question": "...", "options": [...], "selectedOption": 0 }
}
```

#### POST /api/projects/[id]/phase/[phase]/advance
Advance or reset phase.

**Request (advance)**:
```json
{
  "action": "advance",
  "output": { /* optional phase output to save */ }
}
```

**Request (reset)**:
```json
{
  "action": "reset"
}
```

---

## 10. WebSocket Protocol

### Connection

- **Endpoint**: `/api/ws`
- **Library**: Socket.IO
- **Transport**: WebSocket with polling fallback

### Client → Server Messages

| Type | Payload | Purpose |
|------|---------|---------|
| `subscribe` | `{ projectId }` | Join project room |
| `unsubscribe` | `{ projectId }` | Leave project room |
| `user_message` | `{ content, phase, id? }` | Send message to agent |
| `decision_response` | `{ decisionId, response, phase }` | Respond to decision |
| `pause_agent` | - | Pause agent process |
| `resume_agent` | - | Resume agent process |

### Server → Client Messages

| Type | Payload | Purpose |
|------|---------|---------|
| `chat_stream` | `{ content, messageId }` | Streaming text chunk |
| `chat_stream_end` | `{ messageId }` | End of message |
| `chat_message` | `Message` | Complete message (non-streaming) |
| `decision_request` | `Decision` | Agent needs user input |
| `agent_status` | `{ status, phase }` | Agent state change |
| `phase_complete` | `{ phase, nextPhase? }` | Phase finished |
| `build_progress` | `{ tasks, progress }` | Build phase updates |
| `build_activity` | `ActivityItem` | Build activity log entry |
| `validation_result` | `ValidationResult` | Test results |
| `error` | `{ code, message, details? }` | Error notification |

---

## 11. Data Models

### Core Types

```typescript
// Phase
type PhaseName = 'understand' | 'explore' | 'define' | 'build' | 'validate' | 'deliver';
type PhaseStatus = 'locked' | 'active' | 'complete';

// Project
interface Project {
  id: string;
  name: string;
  description: string;
  path: string;
  currentPhase: number;  // 1-6
  phaseStatus: Record<PhaseName, PhaseStatus>;
  createdAt: string;     // ISO 8601
  updatedAt: string;
}

// Message
type MessageRole = 'user' | 'assistant' | 'system';
interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// Decision
interface DecisionOption {
  label: string;
  description: string;
}
interface Decision {
  id: string;
  question: string;
  options: DecisionOption[];
  recommendation?: number;      // Index of recommended option
  selectedOption?: number;      // User's choice
  customResponse?: string;      // User's custom text
  skipped: boolean;
  timestamp?: string;
}

// Agent
type AgentStatus = 'idle' | 'running' | 'paused' | 'error';
interface AgentContext {
  projectId: string;
  projectPath: string;
  projectName: string;
  projectDescription: string;
  phase: PhaseName;
  previousOutputs: Record<string, unknown>;
  techMode: boolean;
}

// Build
type BuildTaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed';
interface BuildTask {
  id: string;
  name: string;
  description: string;
  status: BuildTaskStatus;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

// Activity
interface ActivityItem {
  id: string;
  timestamp: string;
  type: 'file_create' | 'file_modify' | 'test_run' | 'command' | 'info' | 'error';
  message: string;
  details?: string;
}

// Validation
type ValidationStatus = 'pass' | 'fail' | 'warning';
interface ValidationIssue {
  id: string;
  description: string;
  file?: string;
  line?: number;
  autoFixable: boolean;
  ignored: boolean;
}
interface ValidationResult {
  id: string;
  checkName: string;
  status: ValidationStatus;
  message: string;
  issues?: ValidationIssue[];
}
```

---

## 12. Configuration

### Package Scripts

```bash
npm run dev          # Development server with WebSocket (tsx server.ts)
npm run dev:next     # Next.js dev only (no WebSocket)
npm run build        # Production build
npm run start        # Production server with WebSocket
npm run lint         # ESLint
npm run test         # Vitest unit tests
npm run test:ui      # Vitest with UI
npm run test:coverage # Coverage report
npm run test:e2e     # Playwright E2E tests
```

### TypeScript (tsconfig.json)

- **strict**: true (all strict checks enabled)
- **target**: ES2017
- **module**: esnext (ESM)
- **Path alias**: `@/*` → `./src/*`

### Tailwind (tailwind.config.ts)

- **Dark mode**: Class-based (`.dark` selector)
- **CSS Variables**: HSL color system
- **Plugins**: tailwindcss-animate

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `IDEA_PROJECT_ID` | Passed to Claude process (project context) |
| `IDEA_PHASE` | Passed to Claude process (current phase) |
| `NODE_ENV` | production/development |

---

## Quick Reference

### Starting the Application

```bash
# Development
npm run dev

# Production
npm run build
npm run start
```

### Key Files to Know

| File | Purpose |
|------|---------|
| `server.ts` | Entry point, HTTP + WebSocket setup |
| `src/lib/orchestrator.ts` | Claude CLI process management |
| `src/lib/project-store.ts` | File persistence |
| `src/lib/websocket-manager.ts` | Broadcast hub |
| `src/stores/phase-session-store.ts` | Main Zustand store |
| `src/hooks/use-websocket.ts` | WebSocket ↔ Store bridge |
| `src/app/project/[id]/phase/[phase]/page.tsx` | Phase UI page |

### Adding a New Component

1. Create in appropriate `src/components/` subdirectory
2. Use `cn()` from `@/lib/utils` for class merging
3. Import UI primitives from `@/components/ui`
4. Export from barrel file if in subdirectory

### Adding a New API Route

1. Create `route.ts` in `src/app/api/`
2. Use `withErrorHandling()` wrapper
3. Use validation functions from `api-validation.ts`
4. Return `NextResponse.json()`

### Debugging Agent Issues

1. Check `server.ts` message handlers
2. Check `orchestrator.ts` stream parsing
3. Look for marker detection issues
4. Check `project-store.ts` session persistence

---

*This document provides a comprehensive overview of the Idea-to-Code architecture. For specific implementation details, refer to the source files directly.*
