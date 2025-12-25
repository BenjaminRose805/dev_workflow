# Task 3.4: MCP Server Integration Review

## What is MCP

Model Context Protocol (MCP) is an open-source standard for connecting AI applications to external systems. MCP acts as a "USB-C port for AI applications," providing a standardized way to connect Claude Code and the Claude API to:

- **Data sources**: Local files, databases (PostgreSQL, MongoDB, etc.)
- **Tools and APIs**: Search engines, calculators, monitoring tools (Sentry, DataDog)
- **Workflows**: Specialized prompts and automation sequences
- **Third-party services**: GitHub, Slack, Figma, Google Calendar, Notion, Jira, Asana

MCP enables:
- Personalized AI assistants with access to user data
- Generative design integration (e.g., Figma to code generation)
- Enterprise data integration for analytical chatbots
- Physical automation through external system control
- Implementation of features from issue trackers with automated PR creation

## Configuration

### Claude Code MCP Configuration Hierarchy

MCP servers in Claude Code are configured across three scopes with clear precedence:

1. **Local Scope** (default, `~/.claude.json`)
   - Private to individual user
   - Only accessible in current project directory
   - Ideal for personal development servers and sensitive credentials
   - Command: `claude mcp add --scope local` (or omit --scope flag)

2. **Project Scope** (`.mcp.json` in project root)
   - Shared with team via version control
   - Enables consistent team tooling
   - Requires user approval before first use
   - Command: `claude mcp add --scope project`
   - Reset choices: `claude mcp reset-project-choices`

3. **User Scope** (cross-project, `~/.claude.json`)
   - Available across all projects
   - Private to user account
   - Good for personal utilities used frequently
   - Command: `claude mcp add --scope user`

Scope hierarchy: Local > Project > User

### Configuration File Format

`.mcp.json` uses standardized format:

```json
{
  "mcpServers": {
    "server-name": {
      "type": "stdio",
      "command": "npx",
      "args": ["@modelcontextprotocol/server-filesystem"],
      "env": {
        "ALLOWED_PATHS": "/path/to/allowed"
      }
    }
  }
}
```

Features:
- Environment variable expansion: `${VAR}` or `${VAR:-default}`
- Supports configurable startup timeout: `MCP_TIMEOUT=10000`

### Installation Methods

Three transport options available:

1. **HTTP Servers** (Recommended for remote)
   - `claude mcp add --transport http server-name https://api.example.com/mcp`
   - Supports authentication headers

2. **SSE Servers** (Deprecated, use HTTP instead)
   - `claude mcp add --transport sse server-name https://api.example.com/sse`
   - Server-Sent Events transport

3. **Stdio Servers** (Local processes)
   - `claude mcp add --transport stdio server-name -- npx -y package-name`
   - Runs as local process via stdin/stdout
   - Windows requires: `cmd /c` wrapper for npx commands

### Enterprise MCP Configuration

Two deployment options for organizations:

1. **Exclusive Control** (`managed-mcp.json`)
   - System-wide paths: macOS `/Library/Application Support/ClaudeCode/managed-mcp.json`
   - Linux/WSL `/etc/claude-code/managed-mcp.json`
   - Windows `C:\Program Files\ClaudeCode\managed-mcp.json`
   - Users cannot add/modify servers

2. **Policy-Based Control** (Allowlists/Denylists)
   - Uses managed settings file
   - Restrict by: server name, command, or URL pattern

## Capabilities

### What MCP Servers Provide

MCP servers expose three types of capabilities:

1. **Tools** (Primary capability)
   - Function-calling interface
   - Claude can invoke tools autonomously
   - Tools have defined input schemas and descriptions

2. **Resources**
   - Readable data exposed by servers
   - Referenced via `@server:protocol://resource/path`
   - Auto-fetched and included as attachments

3. **Prompts**
   - Become available as slash commands
   - Format: `/mcp__servername__promptname`
   - Can accept arguments

### Common Operations Enabled

- **Issue Tracking**: "Add the feature described in JIRA issue ENG-4521 and create a PR"
- **Monitoring**: "Check Sentry and Statsig for usage patterns"
- **Database Queries**: "Find users from PostgreSQL"
- **Design Integration**: "Update template based on new Figma designs"
- **Workflow Automation**: "Create Gmail drafts inviting users to feedback sessions"

### Tool Configuration in Claude API

```json
{
  "type": "mcp_toolset",
  "mcp_server_name": "example-mcp",
  "default_config": {
    "enabled": true,
    "defer_loading": false
  },
  "configs": {
    "specific_tool": {
      "enabled": true,
      "defer_loading": true
    }
  }
}
```

## Available Servers

### Popular Pre-Built MCP Servers

- **GitHub**: Code review, issue management, PR operations
- **Sentry**: Error monitoring, stack trace analysis
- **Asana**: Task and project management
- **Notion**: Database and documentation access
- **PostgreSQL/Database**: Direct database queries
- **Slack**: Message and workflow integration
- **Google Calendar**: Event management
- **Figma**: Design system integration
- **Stripe**: Payment system integration
- **Filesystem**: Local file operations (with permission boundaries)
- **Airtable**: Spreadsheet and data management

### Finding Servers

- Official registry: https://api.anthropic.com/mcp-registry/docs
- GitHub repository: https://github.com/modelcontextprotocol/servers
- Discovery: `claude mcp list` to view configured servers

## Custom Server Development

### Creating MCP Servers

**Official SDK Support**:
- **TypeScript SDK**: `@modelcontextprotocol/sdk` via npm
- **Python SDK**: `mcp` via pip

### TypeScript Server Example

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";

const server = new McpServer({
  name: "utility-server",
  version: "1.0.0"
});

// Define a tool
server.tool(
  "calculate",
  {
    operation: z.enum(["add", "subtract", "multiply", "divide"]),
    a: z.number(),
    b: z.number()
  },
  async ({ operation, a, b }) => {
    // Implementation
  }
);

server.start();
```

### Transport Implementation

Servers can expose via:
- **stdio**: JSON-RPC over stdin/stdout
- **HTTP**: RESTful endpoints
- **SSE**: Server-Sent Events for streaming

Key consideration: For stdio servers, never write to stdout (corrupts JSON-RPC).

## Security & Permissions

### MCP Server Trust Model

**Initial Trust Verification**:
- First-time usage of new MCP servers requires user trust verification
- Interactive approval: User explicitly enables server
- Non-interactive (`-p` flag): Trust verification disabled
- Project-scoped servers: Reset approvals with `claude mcp reset-project-choices`

### Claude Code Permission Model

MCP server tools follow Claude Code permission system:

```bash
# Configure specific tool permissions
"Skill(plan:batch)"
"Skill(plan:batch:*)"
```

### MCP Security Considerations

**Core Principles**:
- Claude Code allows users to configure MCP servers in source code
- Anthropic does not manage, audit, or endorse third-party MCP servers
- Users should trust MCP server providers

**Threat Assessment**:
- **Prompt Injection**: MCP servers can expose untrusted content
- **Sensitive Data**: Some servers access databases or APIs with credentials
- **Command Execution**: Stdio servers execute local commands with user permissions

### Security Best Practices

1. **Source Verification**
   - Review server documentation before installation
   - Check repository maintenance and update frequency

2. **Credential Management**
   - Store sensitive tokens in environment variables
   - Use enterprise credential systems for organizational deployments
   - Never commit API keys to `.mcp.json`

3. **Permission Restriction**
   - Use allowlist pattern for sensitive servers
   - Restrict tool availability to needed functions

4. **Enterprise Controls**
   - Use `managed-mcp.json` for fixed server deployments
   - Deploy allowlists/denylists for policy enforcement

## Integration Patterns

### Claude Code Integration

**MCP Tools in Commands**:
- MCP tools available immediately after `/mcp` configuration
- Reference via tool name or through tool discovery

**MCP Resources and Prompts**:
- Reference resources: `@servername:protocol://path`
- Execute prompts: `/mcp__servername__promptname [args]`

**Management Commands**:
- `claude mcp list`: View all configured servers
- `claude mcp get <name>`: Get details for specific server
- `claude mcp remove <name>`: Remove server
- `/mcp`: Check server status and manage OAuth authentication

### Claude API Integration (MCP Connector)

```typescript
const response = await anthropic.beta.messages.create({
  model: "claude-opus-4-5",
  max_tokens: 1000,
  messages: [{ role: "user", content: "Your prompt" }],
  mcp_servers: [
    {
      type: "url",
      url: "https://mcp.server.com/sse",
      name: "my-server",
      authorization_token: "TOKEN"
    }
  ],
  tools: [
    {
      type: "mcp_toolset",
      mcp_server_name: "my-server"
    }
  ],
  betas: ["mcp-client-2025-11-20"]
});
```

### Agent SDK Integration

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: "Your request",
  options: {
    mcpServers: {
      "server-name": {
        command: "npx",
        args: ["@modelcontextprotocol/server-filesystem"]
      }
    }
  }
})) {
  // Process messages
}
```

## Key Findings

1. **Standardized Integration**: MCP is open-source standard providing consistent interface across multiple AI applications

2. **Multiple Configuration Layers**: Claude Code's scope system (local/project/user) enables both personal experiments and team-wide standardization

3. **Enterprise-Ready**: Enterprise MCP configuration options (`managed-mcp.json`, allowlists/denylists) enable IT control

4. **Triple Capability Model**: MCP servers provide tools (primary), resources (data access), and prompts (workflow templates)

5. **Transport Flexibility**: HTTP/SSE for remote, stdio for local; allows connecting legacy systems and modern cloud services

6. **Permission-Based Security**: Integrates with Claude Code permission system

7. **Cross-Platform Support**: Works with Claude Code CLI, Claude API via MCP connector, Claude Desktop, and Agent SDK

8. **Developer-Friendly**: Official SDKs (TypeScript/Python), extensive community server catalog

9. **Ecosystem Growth**: MCP registry enables discovery; community servers handle common integrations

10. **API Evolution**: MCP connector in Claude API (currently beta) enables serverless tool integration

## Evidence/Sources

### Official Documentation
- **Claude Code MCP Guide**: https://code.claude.com/docs/en/mcp.md
- **Claude Code Security**: https://code.claude.com/docs/en/security.md
- **MCP Connector (Beta)**: https://platform.claude.com/docs/en/agents-and-tools/mcp-connector.md
- **MCP in Agent SDK**: https://platform.claude.com/docs/en/agent-sdk/mcp.md

### MCP Specification & Community
- **Model Context Protocol Overview**: https://modelcontextprotocol.io/introduction
- **MCP Official Registry**: https://api.anthropic.com/mcp-registry/docs
- **Community Servers**: https://github.com/modelcontextprotocol/servers
