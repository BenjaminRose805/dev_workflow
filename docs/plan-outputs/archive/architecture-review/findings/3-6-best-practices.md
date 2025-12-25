# Task 3.6: Best Practices for Each Feature Type

This document synthesizes best practices from the research conducted in Tasks 3.1-3.5, providing actionable guidance for each Claude Code feature type.

## Custom Slash Commands Best Practices

### Design Principles

1. **Single Responsibility**
   - Each command should do one thing well
   - Avoid combining unrelated operations in one command
   - Keep commands focused and predictable

2. **Clear Naming**
   - Use descriptive, action-oriented names
   - Namespace related commands (e.g., `/plan:status`, `/plan:verify`)
   - Follow consistent naming conventions across the project

3. **Minimal Tool Access**
   - Only include `allowed-tools` that the command actually needs
   - Use specific patterns (e.g., `Bash(git add:*)`) not wildcards
   - Reduces risk of unintended actions

### Implementation Guidelines

```yaml
# Good: Minimal, specific permissions
---
allowed-tools: Bash(git status:*), Bash(git diff:*), Read
description: Review git changes
argument-hint: [branch-name]
---
```

```yaml
# Avoid: Overly broad permissions
---
allowed-tools: Bash
---
```

4. **Explicit Output Expectations**
   - Define what the command should output
   - Include format examples in the command body
   - Specify where results should be written (if applicable)

5. **Context Injection Pattern**
   - Use `!` prefix for bash output inclusion
   - Use `@` prefix for file content inclusion
   - Always include relevant context to reduce ambiguity

6. **SlashCommand Tool Compatibility**
   - Always include `description` field for programmatic access
   - Keep descriptions concise but informative
   - Use `disable-model-invocation: true` only when necessary

### When to Use Commands vs Skills

| Use Commands When | Use Skills When |
|-------------------|-----------------|
| Simple, single-action prompts | Complex multi-step workflows |
| Explicit user invocation desired | Context-aware auto-discovery needed |
| Quick template substitution | Supporting resources required |
| Team-wide command consistency | Comprehensive capability encapsulation |

---

## Custom Agents Best Practices

### Agent Design

1. **Focused Specialization**
   - Create agents with single, clear responsibilities
   - Better performance than generalist agents
   - Easier to reason about behavior and debug

2. **Detailed System Prompts**
   - Include specific instructions and examples
   - Define constraints and best practices
   - Specify output formats explicitly
   - More guidance = better performance

3. **Appropriate Tool Access**
   - Only grant necessary tools
   - Use read-only tools for research agents
   - Consider security implications

### Configuration Recommendations

```markdown
---
name: code-reviewer
description: Expert code review specialist. Use PROACTIVELY after code changes.
tools: Read, Grep, Glob, Bash
model: inherit
---

## Role
Senior code reviewer focused on quality, security, and maintainability.

## Process
1. Run git diff to see recent changes
2. Focus on modified files
3. Provide prioritized feedback

## Output Format
- Critical (must fix)
- Warnings (should fix)
- Suggestions (consider improving)
```

4. **Model Selection Strategy**
   - Use `inherit` for consistency
   - Use `haiku` for fast exploration/search
   - Use `opus` for complex reasoning
   - Use `sonnet` for balanced capability/speed

5. **Description Optimization**
   - Include trigger phrases: "Use PROACTIVELY", "MUST BE USED when"
   - Describe when agent should be invoked
   - Make descriptions specific enough for reliable auto-invocation

6. **Version Control Integration**
   - Check project agents into git
   - Enable team collaboration and improvement
   - Track agent evolution over time

---

## Hooks System Best Practices

### Configuration

1. **Scope Appropriately**
   - Use `.claude/settings.local.json` for personal/sensitive hooks
   - Use `.claude/settings.json` for team-wide hooks
   - Leverage enterprise managed settings for organization policies

2. **Matcher Precision**
   - Use exact tool names when possible: `Write`
   - Use regex for tool groups: `Edit|Write`
   - Use MCP patterns for external tools: `mcp__github__.*`
   - Avoid wildcards `*` unless necessary

3. **Timeout Configuration**
   - Default 60 seconds is usually sufficient
   - Increase for slow external APIs
   - Consider parallel hook execution time

### Implementation Patterns

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "validate-bash-command.sh",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

4. **Error Handling Strategy**
   - Exit code 0: Success, continue execution
   - Exit code 2: Block action with feedback
   - Other codes: Non-blocking warnings

5. **JSON Output Structure**
   - Use structured output for complex decisions
   - Include clear `reason` fields for debugging
   - Leverage `hookSpecificOutput` for event-specific data

6. **Notification Patterns**
   - Filter by notification type for relevant alerts
   - Use desktop notifications for attention-getting
   - Integrate with team communication tools (Slack, etc.)

### Security Considerations

- Validate all tool inputs before processing
- Check for path traversal in file operations
- Use absolute paths with `$CLAUDE_PROJECT_DIR`
- Quote all variables in bash commands

---

## MCP Server Integration Best Practices

### Server Selection

1. **Trust Verification**
   - Review server documentation before installation
   - Check repository maintenance and update frequency
   - Verify provider trust and security practices
   - Prefer official/well-maintained servers

2. **Scope Selection**
   - **Local scope**: Personal development, sensitive credentials
   - **Project scope**: Team-shared tooling, version-controlled
   - **User scope**: Cross-project personal utilities

### Configuration

```json
{
  "mcpServers": {
    "github": {
      "type": "stdio",
      "command": "npx",
      "args": ["@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}"
      }
    }
  }
}
```

3. **Environment Variables**
   - Never commit secrets to `.mcp.json`
   - Use `${VAR}` syntax for credential injection
   - Leverage environment variable defaults: `${VAR:-default}`

4. **Tool Access Control**
   - Use allowlist pattern for sensitive servers
   - Restrict tool availability to needed functions
   - Disable dangerous operations when possible

5. **Enterprise Deployment**
   - Use `managed-mcp.json` for fixed server configurations
   - Deploy allowlists/denylists for policy enforcement
   - Consider audit logging for compliance

### Custom Server Development

6. **Schema Validation**
   - Use Zod (TypeScript) or equivalent for input validation
   - Define clear input/output schemas
   - Document all tool parameters

7. **Transport Selection**
   - Use HTTP for remote servers (recommended)
   - Use stdio for local processes
   - Avoid SSE (deprecated)

8. **Output Management**
   - Keep responses concise when possible
   - Summarize large result sets
   - Configure `MAX_MCP_OUTPUT_TOKENS` for large data

---

## Agent-to-Agent Communication Best Practices

### Orchestration Strategy

1. **Pattern Selection**
   - **Orchestrator-Worker**: Complex workflows, result synthesis
   - **Parallel Specialization**: Independent domain-specific tasks
   - **Sequential Pipeline**: Deterministic step-by-step workflows
   - **Resumable Agent**: Long-running iterative analysis

2. **Task Specification**
   - Provide clear, specific objectives
   - Define expected output format explicitly
   - Specify tools and data sources to prioritize
   - Include examples of expected output

### Implementation

```
Main Agent (Orchestrator)
├── Research Agent: Gather context (Read, Grep, Glob)
├── Analysis Agent: Evaluate findings (Read, Bash)
└── Implementation Agent: Execute changes (Edit, Write, Bash)
     ↓
Orchestrator synthesizes and coordinates
```

3. **Context Management**
   - Keep agent prompts concise (Windows has 8191 char limit)
   - Leverage separate context windows to prevent overload
   - Return only essential findings to parent
   - Summarize large result sets

4. **Error Handling**
   - Implement retry logic for transient failures
   - Include fallback strategies for complex queries
   - Monitor agent health and respawn on failure
   - Graceful degradation when hitting resource limits

5. **Resource Awareness**
   - Multi-agent systems consume ~15x more tokens
   - Consider cost implications of parallel execution
   - Use resumable agents for cost-efficiency on long tasks

6. **Read-Only Agent Pattern**
   - Agents return content, main conversation writes files
   - Avoids permission issues
   - Provides review checkpoint before changes committed

```
IMPORTANT: Do NOT write files directly. Instead:
1. Analyze the task requirements
2. Generate the complete code/content
3. Return your output in format:
   FILE: <path>
   ```language
   <content>
   ```
4. The main conversation will handle file writing
```

---

## Cross-Feature Integration Patterns

### Commands + Agents

- Commands can invoke agents via the Task tool
- Use commands as entry points, agents as workers
- Commands handle user interaction, agents handle processing

### Commands + Hooks

- Hooks can validate command inputs (UserPromptSubmit)
- Hooks can post-process command outputs (PostToolUse)
- Use hooks for automated quality checks after commands

### Agents + MCP

- Agents can access MCP tools when available
- Configure agent tool access to include/exclude MCP tools
- MCP provides external data/actions for agent workflows

### Hooks + MCP

- Hooks can monitor MCP tool usage (PreToolUse with `mcp__*` patterns)
- Enable audit logging for external system interactions
- Implement security policies for MCP operations

---

## Decision Matrix: Feature Selection

| Requirement | Best Feature |
|-------------|--------------|
| Quick prompt template | Slash Command |
| Complex multi-step workflow | Skill or Agent |
| Specialized expertise | Custom Agent |
| Guaranteed execution at event | Hook |
| External system integration | MCP Server |
| Parallel task execution | Multiple Agents |
| Context-aware auto-invocation | Agent or Skill |
| Team-shared configuration | Project-scoped settings |
| Personal customization | User-scoped settings |

---

## Anti-Patterns to Avoid

1. **Overly Broad Permissions**
   - Don't use `allowed-tools: *` unless necessary
   - Restrict tools to what's actually needed

2. **Vague Agent Descriptions**
   - Don't use generic descriptions like "helpful agent"
   - Be specific about when and how agent should be used

3. **Monolithic Commands**
   - Don't create commands that try to do everything
   - Split into focused, composable commands

4. **Ignoring Context Isolation**
   - Don't expect agents to have parent context
   - Provide all necessary context in task specification

5. **Committing Secrets**
   - Never commit API keys or tokens
   - Use environment variables for credentials

6. **Blocking Hooks Without Feedback**
   - Always provide clear error messages
   - Help users understand why action was blocked

7. **Infinite Hook Loops**
   - Check `stop_hook_active` in Stop/SubagentStop hooks
   - Implement circuit breakers for recursive patterns

---

## Summary

The Claude Code extensibility system provides five complementary feature types:

1. **Slash Commands**: Quick, explicit user-invoked templates
2. **Custom Agents**: Specialized expertise with isolated context
3. **Hooks**: Guaranteed execution at specific lifecycle events
4. **MCP Servers**: Standardized external system integration
5. **Agent Communication**: Hierarchical task delegation and parallelism

Each feature type serves distinct use cases, and the best implementations combine them thoughtfully based on the requirements at hand. Focus on:

- **Minimal permissions** for security
- **Clear specifications** for reliability
- **Appropriate scope** for collaboration
- **Error handling** for resilience
- **Documentation** for maintainability
