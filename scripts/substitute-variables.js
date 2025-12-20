#!/usr/bin/env node

/**
 * Variable Substitution Script
 *
 * Substitutes {{variable}} placeholders in prompt content with provided values.
 * Validates that all required variables are provided.
 *
 * Usage:
 *   # From stdin with JSON variables
 *   cat prompt.md | node scripts/substitute-variables.js --vars '{"user":"john"}'
 *
 *   # From file with JSON variables
 *   node scripts/substitute-variables.js --file prompt.md --vars '{"user":"john"}'
 *
 *   # Using --var flags
 *   cat prompt.md | node scripts/substitute-variables.js --var user=john --var project=myapp
 *
 *   # With metadata for defaults and validation
 *   node scripts/substitute-variables.js --file prompt.md --metadata meta.json --vars '{"user":"john"}'
 *
 * Input (via stdin or --file):
 *   Hello {{user}}, welcome to {{project}}!
 *
 * Output:
 * {
 *   "success": true,
 *   "content": "Hello john, welcome to myapp!",
 *   "substitutions": {
 *     "user": "john",
 *     "project": "myapp"
 *   }
 * }
 *
 * Error output (missing variables):
 * {
 *   "success": false,
 *   "error": {
 *     "code": "MISSING_VARIABLES",
 *     "message": "Required variables not provided",
 *     "context": {
 *       "missing": ["user", "project"]
 *     }
 *   }
 * }
 */

const fs = require('fs');
const path = require('path');
const { readFile, fileExists } = require('./lib/file-utils');

/**
 * Parse command line arguments
 * @returns {{ file: string|null, vars: object, metadata: object|null, verbose: boolean, validate: boolean }}
 */
function parseArgs() {
  const args = process.argv.slice(2);
  let file = null;
  let varsJson = null;
  let metadataFile = null;
  let verbose = false;
  let validate = true;
  const varFlags = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--file' && i + 1 < args.length) {
      file = args[i + 1];
      i++; // Skip next arg
    } else if (args[i] === '--vars' && i + 1 < args.length) {
      varsJson = args[i + 1];
      i++; // Skip next arg
    } else if (args[i] === '--metadata' && i + 1 < args.length) {
      metadataFile = args[i + 1];
      i++; // Skip next arg
    } else if (args[i] === '--var' && i + 1 < args.length) {
      const varPair = args[i + 1];
      const [key, ...valueParts] = varPair.split('=');
      if (key && valueParts.length > 0) {
        varFlags[key.trim()] = valueParts.join('=').trim();
      }
      i++; // Skip next arg
    } else if (args[i] === '--verbose') {
      verbose = true;
    } else if (args[i] === '--no-validate') {
      validate = false;
    } else if (args[i] === '--help' || args[i] === '-h') {
      printUsage();
      process.exit(0);
    }
  }

  // Parse JSON vars if provided
  let vars = {};
  if (varsJson) {
    try {
      vars = JSON.parse(varsJson);
    } catch (error) {
      console.error(`Error parsing --vars JSON: ${error.message}`);
      process.exit(1);
    }
  }

  // Merge var flags into vars (flags take precedence)
  vars = { ...vars, ...varFlags };

  // Load metadata if provided
  let metadata = null;
  if (metadataFile) {
    const metadataContent = readFile(metadataFile);
    if (!metadataContent) {
      console.error(`Error: Cannot read metadata file: ${metadataFile}`);
      process.exit(1);
    }
    try {
      metadata = JSON.parse(metadataContent);
    } catch (error) {
      console.error(`Error parsing metadata JSON: ${error.message}`);
      process.exit(1);
    }
  }

  return { file, vars, metadata, verbose, validate };
}

/**
 * Print usage information
 */
function printUsage() {
  console.error(`
Variable Substitution Script

Substitutes {{variable}} placeholders in prompt content with provided values.

Usage:
  cat prompt.md | node scripts/substitute-variables.js --vars '{"user":"john"}'
  node scripts/substitute-variables.js --file prompt.md --vars '{"user":"john"}'
  node scripts/substitute-variables.js --file prompt.md --var user=john --var project=myapp
  node scripts/substitute-variables.js --file prompt.md --metadata meta.json --vars '{"user":"john"}'

Options:
  --file <path>           Read content from file instead of stdin
  --vars <json>           Variable values as JSON object
  --var key=value         Set individual variable (can be used multiple times)
  --metadata <path>       JSON file with variable metadata (for defaults/validation)
  --no-validate           Skip validation of required variables
  --verbose               Show detailed progress output
  --help, -h              Show this help message

Metadata format:
{
  "variables": [
    {
      "name": "user",
      "description": "Username",
      "default": "guest"
    },
    {
      "name": "project",
      "description": "Project name"
    }
  ]
}

Output format:
{
  "success": true,
  "content": "Substituted content...",
  "substitutions": {
    "user": "john",
    "project": "myapp"
  }
}
`);
}

/**
 * Read content from stdin or file
 * @param {string|null} filePath - Optional file path
 * @returns {Promise<string>} Content
 */
async function readContent(filePath) {
  if (filePath) {
    // Read from file
    const content = readFile(filePath);
    if (content === null) {
      throw new Error(`Failed to read file: ${filePath}`);
    }
    return content;
  }

  // Read from stdin
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf-8');

    process.stdin.on('data', chunk => {
      data += chunk;
    });

    process.stdin.on('end', () => {
      resolve(data);
    });

    process.stdin.on('error', reject);

    // If stdin is a TTY and no file specified, show error
    if (process.stdin.isTTY) {
      reject(new Error('No input provided. Use --file or pipe content to stdin.'));
    }
  });
}

/**
 * Find all {{variable}} placeholders in content
 * @param {string} content - Content to search
 * @returns {string[]} Array of unique variable names
 */
function findVariables(content) {
  const regex = /\{\{(\w+)\}\}/g;
  const matches = new Set();

  let match;
  while ((match = regex.exec(content)) !== null) {
    matches.add(match[1]);
  }

  return Array.from(matches);
}

/**
 * Build defaults map from metadata
 * @param {object|null} metadata - Metadata object with variables array
 * @returns {Map<string, string>} Map of variable names to default values
 */
function buildDefaultsMap(metadata) {
  const defaults = new Map();

  if (!metadata || !Array.isArray(metadata.variables)) {
    return defaults;
  }

  for (const variable of metadata.variables) {
    if (variable.name && variable.default !== undefined) {
      defaults.set(variable.name, String(variable.default));
    }
  }

  return defaults;
}

/**
 * Substitute {{variable}} placeholders with values
 * @param {string} content - Content with placeholders
 * @param {object} values - Variable values
 * @param {object|null} metadata - Optional metadata with defaults
 * @returns {{ content: string, substitutions: object }} Result with substituted content and used values
 */
function substituteVariables(content, values, metadata = null) {
  const defaults = buildDefaultsMap(metadata);
  const substitutions = {};

  const result = content.replace(/\{\{(\w+)\}\}/g, (match, variableName) => {
    let value;

    // Use provided value, or default, or leave placeholder unchanged
    if (values[variableName] !== undefined) {
      value = values[variableName];
    } else if (defaults.has(variableName)) {
      value = defaults.get(variableName);
    } else {
      // Leave unchanged
      return match;
    }

    // Track what we substituted
    substitutions[variableName] = value;
    return value;
  });

  return { content: result, substitutions };
}

/**
 * Get list of missing required variables
 * @param {string} content - Content with placeholders
 * @param {object} values - Provided variable values
 * @param {object|null} metadata - Metadata with defaults
 * @returns {string[]} Array of missing variable names
 */
function getMissingVariables(content, values, metadata) {
  const variablesInContent = findVariables(content);
  const defaults = buildDefaultsMap(metadata);
  const missing = [];

  for (const varName of variablesInContent) {
    // Variable is missing if it has no value and no default
    if (values[varName] === undefined && !defaults.has(varName)) {
      missing.push(varName);
    }
  }

  return missing;
}

/**
 * Validate that all required variables have values
 * @param {string} content - Content with placeholders
 * @param {object} values - Provided variable values
 * @param {object|null} metadata - Metadata with defaults
 * @returns {{ valid: boolean, missing: string[] }} Validation result
 */
function validateVariables(content, values, metadata) {
  const missing = getMissingVariables(content, values, metadata);

  return {
    valid: missing.length === 0,
    missing
  };
}

/**
 * Main function to substitute variables
 * @param {string} content - Content with placeholders
 * @param {object} values - Variable values
 * @param {object|null} metadata - Optional metadata
 * @param {boolean} validate - Whether to validate required variables
 * @param {boolean} verbose - Whether to show verbose output
 * @returns {object} Result object
 */
function processSubstitution(content, values, metadata = null, validate = true, verbose = false) {
  if (verbose) {
    console.error('Finding variables in content...');
  }

  const variablesInContent = findVariables(content);

  if (verbose) {
    console.error(`Found ${variablesInContent.length} variable(s): ${variablesInContent.join(', ')}`);
    console.error(`Provided ${Object.keys(values).length} value(s): ${Object.keys(values).join(', ')}`);
  }

  // Validate if requested
  if (validate) {
    const validation = validateVariables(content, values, metadata);

    if (!validation.valid) {
      if (verbose) {
        console.error(`Validation failed: ${validation.missing.length} missing variable(s)`);
      }

      return {
        success: false,
        error: {
          code: 'MISSING_VARIABLES',
          message: 'Required variables not provided',
          context: {
            missing: validation.missing,
            found: variablesInContent,
            provided: Object.keys(values)
          }
        }
      };
    }

    if (verbose) {
      console.error('Validation passed');
    }
  }

  // Perform substitution
  if (verbose) {
    console.error('Substituting variables...');
  }

  const { content: resultContent, substitutions } = substituteVariables(content, values, metadata);

  if (verbose) {
    console.error(`Substituted ${Object.keys(substitutions).length} variable(s)`);
  }

  return {
    success: true,
    content: resultContent,
    substitutions,
    stats: {
      found: variablesInContent.length,
      substituted: Object.keys(substitutions).length,
      remaining: findVariables(resultContent).length
    }
  };
}

/**
 * Main entry point
 */
async function main() {
  try {
    const { file, vars, metadata, verbose, validate } = parseArgs();

    if (verbose) {
      console.error('Reading content...');
    }

    // Read input content
    const content = await readContent(file);

    if (!content) {
      const result = {
        success: false,
        error: {
          code: 'EMPTY_CONTENT',
          message: 'No content provided',
          context: {}
        }
      };
      console.log(JSON.stringify(result, null, 2));
      process.exit(1);
    }

    // Process substitution
    const result = processSubstitution(content, vars, metadata, validate, verbose);

    // Output JSON to stdout
    console.log(JSON.stringify(result, null, 2));

    // Exit with appropriate code
    if (!result.success) {
      process.exit(1);
    }

    process.exit(0);

  } catch (error) {
    const result = {
      success: false,
      error: {
        code: 'UNEXPECTED_ERROR',
        message: error.message,
        context: {}
      }
    };
    console.log(JSON.stringify(result, null, 2));
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

// Export for testing
module.exports = {
  substituteVariables,
  findVariables,
  getMissingVariables,
  validateVariables,
  buildDefaultsMap,
  processSubstitution,
  parseArgs,
  readContent
};
