/**
 * Agent Launcher
 * Utility for spawning Claude CLI research agents with template support.
 */

const { execa } = require('execa');
const path = require('path');
const { readFile, resolvePath } = require('./file-utils');

const DEFAULT_TIMEOUT = 60000; // 60 seconds
const TEMPLATES_DIR = '.claude/templates/agents';

/**
 * Error codes for agent launcher
 */
const ErrorCodes = {
  TIMEOUT: 'TIMEOUT',
  PARSE_ERROR: 'PARSE_ERROR',
  TEMPLATE_NOT_FOUND: 'TEMPLATE_NOT_FOUND',
  AGENT_ERROR: 'AGENT_ERROR',
};

/**
 * Create a standardized error response
 * @param {string} code - Error code from ErrorCodes
 * @param {string} message - Error message
 * @param {object} context - Additional error context
 * @returns {object} Error response object
 */
function createErrorResponse(code, message, context = {}) {
  return {
    success: false,
    error: {
      code,
      message,
      context,
    },
  };
}

/**
 * Create a standardized success response
 * @param {any} result - The result from the agent
 * @returns {object} Success response object
 */
function createSuccessResponse(result) {
  return {
    success: true,
    result,
  };
}

/**
 * Substitute {{variable}} placeholders in template with provided values
 * @param {string} template - Template string with {{variable}} placeholders
 * @param {object} variables - Key-value pairs for substitution
 * @returns {string} Template with variables substituted
 */
function substituteVariables(template, variables) {
  let result = template;

  for (const [key, value] of Object.entries(variables)) {
    // Replace all occurrences of {{key}} with value
    const pattern = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
    result = result.replace(pattern, String(value));
  }

  return result;
}

/**
 * Parse streaming JSON output from Claude CLI
 * Extracts text content from stream-json format events
 * @param {string} output - Raw stdout from Claude CLI
 * @returns {object} Parsed result object
 */
function parseStreamingJson(output) {
  const lines = output.split('\n');
  let textContent = '';

  for (const line of lines) {
    if (!line.trim()) continue;

    try {
      const event = JSON.parse(line);

      // Extract text from content_block_delta events
      if (event.type === 'content_block_delta' && event.delta) {
        const delta = event.delta;
        if (delta.type === 'text_delta' && delta.text) {
          textContent += delta.text;
        }
      }
    } catch (err) {
      // Skip non-JSON lines
      continue;
    }
  }

  // Try to parse the accumulated text as JSON
  if (textContent.trim()) {
    try {
      return JSON.parse(textContent);
    } catch (err) {
      // If text is not JSON, return as-is
      return textContent;
    }
  }

  return null;
}

/**
 * Validate response against optional schema
 * Basic validation - can be extended with JSON schema validation libraries
 * @param {any} response - Response to validate
 * @param {object} schema - Optional schema object with expected fields
 * @returns {boolean} True if valid
 */
function validateResponse(response, schema = null) {
  if (!schema) {
    return true; // No schema provided, assume valid
  }

  if (!response || typeof response !== 'object') {
    return false;
  }

  // Check required fields if specified
  if (schema.required && Array.isArray(schema.required)) {
    for (const field of schema.required) {
      if (!(field in response)) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Launch a research agent with the given configuration
 * @param {object} config - Configuration object
 * @param {string} config.template - Path to agent template file (relative to .claude/templates/agents/)
 * @param {object} config.variables - Variables to substitute in template
 * @param {number} [config.timeout=60000] - Timeout in milliseconds
 * @param {string} [config.cwd] - Working directory for the agent
 * @param {object} [config.schema] - Optional JSON schema for response validation
 * @returns {Promise<object>} Promise resolving to result object
 */
async function launchResearchAgent(config) {
  const {
    template,
    variables = {},
    timeout = DEFAULT_TIMEOUT,
    cwd = process.cwd(),
    schema = null,
  } = config;

  // Resolve template path
  const templatePath = resolvePath(TEMPLATES_DIR, template);

  // Read template file
  const templateContent = readFile(templatePath);
  if (!templateContent) {
    return createErrorResponse(
      ErrorCodes.TEMPLATE_NOT_FOUND,
      `Template not found: ${template}`,
      { templatePath, template }
    );
  }

  // Substitute variables in template
  const prompt = substituteVariables(templateContent, variables);

  // Prepare Claude CLI arguments
  const args = [
    '--output-format', 'stream-json',
    '--print',
  ];

  try {
    // Spawn Claude CLI process with timeout
    const process = execa('claude', args, {
      cwd,
      input: prompt,
      timeout,
      reject: false, // Don't throw on non-zero exit code
    });

    // Wait for process to complete
    const result = await process;

    // Check if process timed out
    if (result.timedOut) {
      return createErrorResponse(
        ErrorCodes.TIMEOUT,
        `Agent execution timed out after ${timeout}ms`,
        { timeout, template }
      );
    }

    // Check for process errors
    if (result.exitCode !== 0 && result.exitCode !== null) {
      return createErrorResponse(
        ErrorCodes.AGENT_ERROR,
        `Agent process exited with code ${result.exitCode}`,
        {
          exitCode: result.exitCode,
          stderr: result.stderr,
          template,
        }
      );
    }

    // Parse the streaming JSON output
    let parsedResult;
    try {
      parsedResult = parseStreamingJson(result.stdout);
    } catch (err) {
      return createErrorResponse(
        ErrorCodes.PARSE_ERROR,
        'Failed to parse agent output',
        {
          error: err.message,
          rawOutput: result.stdout.substring(0, 500), // First 500 chars
        }
      );
    }

    // Validate response if schema provided
    if (!validateResponse(parsedResult, schema)) {
      return createErrorResponse(
        ErrorCodes.PARSE_ERROR,
        'Agent response does not match expected schema',
        {
          response: parsedResult,
          schema,
        }
      );
    }

    return createSuccessResponse(parsedResult);

  } catch (err) {
    // Handle unexpected errors
    return createErrorResponse(
      ErrorCodes.AGENT_ERROR,
      `Unexpected error launching agent: ${err.message}`,
      {
        error: err.message,
        stack: err.stack,
        template,
      }
    );
  }
}

module.exports = {
  launchResearchAgent,
  substituteVariables,
  parseStreamingJson,
  validateResponse,
  ErrorCodes,
};
