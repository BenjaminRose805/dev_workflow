#!/usr/bin/env node

/**
 * Scripts Index - Unified Entry Point
 * Routes to specific scripts in the scripts/ directory
 *
 * Usage:
 *   node scripts/index.js <command> [options]
 *   node scripts/index.js scan-plans
 *   node scripts/index.js cache-clear --all
 *   node scripts/index.js --help
 *
 * Available Commands:
 *   scan-plans                  Scan all plan files and generate JSON summary
 *   parse-plan-structure        Parse a plan file structure
 *   check-file-status           Check file existence and status
 *   substitute-variables        Substitute variables in templates
 *   cache-clear                 Clear various cache types
 *   cache-stats                 Show cache statistics
 *
 * Global Options:
 *   --help, -h                  Show help for command or list all commands
 *   --json                      Output in JSON format (if applicable)
 *   --verbose, -v               Show detailed output
 *   --cache                     Cache control (pass through to scripts)
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Map of command names to script files
const COMMANDS = {
  'scan-plans': 'scan-plans.js',
  'parse-plan-structure': 'parse-plan-structure.js',
  'check-file-status': 'check-file-status.js',
  'substitute-variables': 'substitute-variables.js',
  'cache-clear': 'cache-clear.js',
  'cache-stats': 'cache-stats.js',
};

// Command descriptions for help output
const DESCRIPTIONS = {
  'scan-plans': 'Scan all plan files in docs/plans/ and generate JSON summary',
  'parse-plan-structure': 'Parse the structure of a specific plan file',
  'check-file-status': 'Check file existence, size, mtime, and optionally run tests',
  'substitute-variables': 'Substitute variables in prompt templates',
  'cache-clear': 'Clear various cache types (scripts, research)',
  'cache-stats': 'Show cache hit rates, sizes, and statistics',
};

/**
 * Print global help message
 */
function printHelp() {
  console.log(`
Scripts Index - Unified Entry Point for All Scripts

Usage:
  node scripts/index.js <command> [options]
  node scripts/index.js scan-plans
  node scripts/index.js cache-clear --all
  node scripts/index.js --help

Available Commands:
`);

  // Calculate padding for alignment
  const maxLength = Math.max(...Object.keys(COMMANDS).map(cmd => cmd.length));

  for (const [command, script] of Object.entries(COMMANDS)) {
    const padding = ' '.repeat(maxLength - command.length + 2);
    const description = DESCRIPTIONS[command] || 'No description available';
    console.log(`  ${command}${padding}${description}`);
  }

  console.log(`
Global Options:
  --help, -h                  Show help for command or list all commands
  --json                      Output in JSON format (passed to script if supported)
  --verbose, -v               Show detailed output (passed to script if supported)
  --cache                     Cache control flag (passed to script if supported)

Examples:
  node scripts/index.js scan-plans
  node scripts/index.js cache-clear --all --verbose
  node scripts/index.js check-file-status --files file1.js file2.js --run-tests

For command-specific help:
  node scripts/index.js <command> --help
`);
}

/**
 * Print help for a specific command
 * @param {string} command - Command name
 */
function printCommandHelp(command) {
  const scriptFile = COMMANDS[command];
  if (!scriptFile) {
    console.error(`Error: Unknown command "${command}"`);
    console.error(`Run "node scripts/index.js --help" to see available commands`);
    process.exit(1);
  }

  const scriptPath = path.join(__dirname, scriptFile);

  // Execute the script with --help flag
  const child = spawn('node', [scriptPath, '--help'], {
    stdio: 'inherit',
    cwd: process.cwd(),
  });

  child.on('exit', (code) => {
    process.exit(code || 0);
  });
}

/**
 * Execute a script with given arguments
 * @param {string} command - Command name
 * @param {string[]} args - Command arguments
 */
function executeCommand(command, args) {
  const scriptFile = COMMANDS[command];
  if (!scriptFile) {
    console.error(`Error: Unknown command "${command}"`);
    console.error(`Run "node scripts/index.js --help" to see available commands`);
    process.exit(1);
  }

  const scriptPath = path.join(__dirname, scriptFile);

  // Check if script exists
  if (!fs.existsSync(scriptPath)) {
    console.error(`Error: Script file not found: ${scriptPath}`);
    process.exit(1);
  }

  // Execute the script with remaining arguments
  const child = spawn('node', [scriptPath, ...args], {
    stdio: 'inherit',
    cwd: process.cwd(),
  });

  child.on('error', (err) => {
    console.error(`Error executing ${command}:`, err.message);
    process.exit(1);
  });

  child.on('exit', (code) => {
    process.exit(code || 0);
  });
}

/**
 * Parse command line arguments
 * @returns {{ command: string|null, args: string[], showHelp: boolean }}
 */
function parseArgs() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    return { command: null, args: [], showHelp: true };
  }

  // Check for global help flag
  if (args[0] === '--help' || args[0] === '-h') {
    return { command: null, args: [], showHelp: true };
  }

  const command = args[0];
  const remainingArgs = args.slice(1);

  // Check if asking for command-specific help
  if (remainingArgs.includes('--help') || remainingArgs.includes('-h')) {
    return { command, args: remainingArgs, showHelp: true };
  }

  return { command, args: remainingArgs, showHelp: false };
}

/**
 * Main entry point
 */
function main() {
  const { command, args, showHelp } = parseArgs();

  // Show global help
  if (showHelp && !command) {
    printHelp();
    process.exit(0);
  }

  // Show command-specific help
  if (showHelp && command) {
    printCommandHelp(command);
    return; // printCommandHelp handles exit
  }

  // Execute command
  if (command) {
    executeCommand(command, args);
  } else {
    // No command provided
    console.error('Error: No command specified');
    console.error('Run "node scripts/index.js --help" to see available commands');
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

// Export for testing
module.exports = {
  COMMANDS,
  DESCRIPTIONS,
  executeCommand,
  printHelp,
  printCommandHelp,
  parseArgs,
};
