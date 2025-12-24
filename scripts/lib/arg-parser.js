/**
 * Argument Parser Factory
 * Provides reusable argument parsing for CLI scripts
 *
 * Usage:
 *   const { createArgParser, COMMON_FLAGS } = require('./lib/arg-parser');
 *
 *   const parser = createArgParser({
 *     name: 'cache-clear',
 *     description: 'Clears various cache types',
 *     flags: {
 *       ...COMMON_FLAGS,
 *       all: { short: '-a', long: '--all', description: 'Clear all caches' },
 *       scripts: { short: '-s', long: '--scripts', description: 'Clear scripts cache' },
 *     }
 *   });
 *
 *   const args = parser.parse();
 *   // args = { all: false, scripts: true, verbose: false, help: false }
 */

/**
 * Common flags used across many scripts
 */
const COMMON_FLAGS = {
  verbose: {
    short: '-v',
    long: '--verbose',
    description: 'Show detailed progress output',
    type: 'boolean',
  },
  dryRun: {
    short: '-n',
    long: '--dry-run',
    description: 'Show what would be done without making changes',
    type: 'boolean',
  },
  help: {
    short: '-h',
    long: '--help',
    description: 'Show this help message',
    type: 'boolean',
  },
};

/**
 * Create an argument parser with the given configuration
 * @param {object} config - Parser configuration
 * @param {string} config.name - Script name for help text
 * @param {string} config.description - Script description for help text
 * @param {object} config.flags - Flag definitions
 * @param {string} [config.usage] - Custom usage string (optional)
 * @param {string[]} [config.examples] - Usage examples (optional)
 * @returns {object} Parser object with parse() and printHelp() methods
 */
function createArgParser(config) {
  const { name, description, flags, usage, examples } = config;

  /**
   * Print help message to stderr
   */
  function printHelp() {
    console.error(`\n${description}\n`);

    if (usage) {
      console.error('Usage:');
      console.error(`  ${usage}\n`);
    } else {
      console.error('Usage:');
      console.error(`  node scripts/${name}.js [options]\n`);
    }

    console.error('Options:');

    // Calculate padding for alignment
    const maxFlagLength = Math.max(
      ...Object.entries(flags).map(([, def]) => {
        const flagStr = [def.short, def.long].filter(Boolean).join(', ');
        const valueHint = def.type === 'value' ? ` <${def.valueName || 'value'}>` : '';
        return flagStr.length + valueHint.length;
      })
    );

    // Print each flag
    for (const [, def] of Object.entries(flags)) {
      const flagStr = [def.short, def.long].filter(Boolean).join(', ');
      const valueHint = def.type === 'value' ? ` <${def.valueName || 'value'}>` : '';
      const fullFlag = flagStr + valueHint;
      const padding = ' '.repeat(maxFlagLength - fullFlag.length + 4);
      console.error(`  ${fullFlag}${padding}${def.description}`);
    }

    if (examples && examples.length > 0) {
      console.error('\nExamples:');
      for (const example of examples) {
        console.error(`  ${example}`);
      }
    }

    console.error('');
  }

  /**
   * Parse command line arguments
   * @param {string[]} [argv] - Arguments to parse (defaults to process.argv.slice(2))
   * @returns {object} Parsed arguments object
   */
  function parse(argv) {
    const args = argv || process.argv.slice(2);
    const parsed = {};
    const positional = [];

    // Initialize defaults
    for (const [key, def] of Object.entries(flags)) {
      if (def.type === 'array') {
        parsed[key] = [];
      } else if (def.type === 'value') {
        parsed[key] = def.default !== undefined ? def.default : null;
      } else {
        // boolean
        parsed[key] = def.default !== undefined ? def.default : false;
      }
    }

    // Build lookup maps
    const shortToKey = {};
    const longToKey = {};

    for (const [key, def] of Object.entries(flags)) {
      if (def.short) shortToKey[def.short] = key;
      if (def.long) longToKey[def.long] = key;
    }

    // Parse arguments
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      let key = null;

      // Check if it's a known flag
      if (longToKey[arg]) {
        key = longToKey[arg];
      } else if (shortToKey[arg]) {
        key = shortToKey[arg];
      } else if (arg.startsWith('--') || arg.startsWith('-')) {
        // Unknown flag
        console.error(`Unknown argument: ${arg}`);
        printHelp();
        process.exit(1);
      } else {
        // Positional argument
        positional.push(arg);
        continue;
      }

      const def = flags[key];

      if (def.type === 'value') {
        // Expect next arg to be the value
        if (i + 1 >= args.length || args[i + 1].startsWith('-')) {
          console.error(`Missing value for ${arg}`);
          printHelp();
          process.exit(1);
        }
        i++;
        parsed[key] = args[i];
      } else if (def.type === 'array') {
        // Collect all following non-flag arguments
        i++;
        while (i < args.length && !args[i].startsWith('-')) {
          parsed[key].push(args[i]);
          i++;
        }
        i--; // Step back for next iteration
      } else {
        // Boolean flag
        parsed[key] = true;
      }
    }

    // Handle help flag
    if (parsed.help) {
      printHelp();
      process.exit(0);
    }

    // Add positional arguments
    parsed._positional = positional;

    return parsed;
  }

  return {
    parse,
    printHelp,
    flags,
  };
}

module.exports = {
  createArgParser,
  COMMON_FLAGS,
};
