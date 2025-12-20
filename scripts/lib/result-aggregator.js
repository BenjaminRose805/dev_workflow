/**
 * Agent Result Aggregator
 *
 * Aggregates common patterns from multiple research agent results to reduce
 * context size for the main agent. When 5+ agents return similar findings,
 * this extracts shared patterns, dependencies, and recommendations.
 *
 * Features:
 * - Pattern frequency analysis (frameworks, dependencies, file patterns)
 * - Dependency consolidation (currently_installed vs would_need_to_add)
 * - Common recommendation extraction
 * - Confidence-weighted aggregation
 * - Structured summary output
 *
 * Usage:
 *   const { aggregateResearchResults } = require('./result-aggregator');
 *
 *   const aggregated = aggregateResearchResults(researchResults, {
 *     minResultsForAggregation: 5,
 *     minPatternFrequency: 0.4, // 40% of results must mention pattern
 *     verbose: false
 *   });
 *
 *   console.log(aggregated.commonPatterns);
 *   console.log(aggregated.summary);
 */

/**
 * Default configuration
 */
const DEFAULT_CONFIG = {
  minResultsForAggregation: 5,  // Min number of results before aggregation
  minPatternFrequency: 0.4,     // Min frequency (0-1) for pattern to be considered "common"
  minDependencyFrequency: 0.3,  // Min frequency for dependency to be highlighted
  confidenceThreshold: 60,      // Only aggregate results with confidence >= this
  verbose: false,               // Verbose logging
};

/**
 * Pattern categories for classification
 */
const PATTERN_CATEGORIES = {
  TEST_FRAMEWORK: /vitest|jest|mocha|jasmine|playwright/i,
  MOCKING: /vi\.mock|jest\.mock|sinon|mock|stub|spy/i,
  ASSERTION: /expect|assert|should|chai/i,
  REACT_TESTING: /testing-library|render|screen|fireEvent|userEvent/i,
  FILE_STRUCTURE: /tests?\/|src\/|\.test\.|\.spec\.|__tests__|__mocks__/i,
  IMPORTS: /import\s+|require\(|from\s+['"]/i,
  TYPESCRIPT: /\.tsx?|interface|type\s+|enum\s+/i,
  WEBSOCKET: /websocket|socket\.io|ws\b/i,
  STATE_MANAGEMENT: /zustand|redux|context|useState|store/i,
};

/**
 * Extract keywords from text using pattern matching
 * @param {string} text - Text to analyze
 * @returns {object} Categorized keywords
 */
function extractKeywords(text) {
  const keywords = {
    testFramework: [],
    mocking: [],
    assertions: [],
    reactTesting: [],
    fileStructure: [],
    imports: [],
    typescript: [],
    websocket: [],
    stateManagement: [],
    other: [],
  };

  if (!text || typeof text !== 'string') {
    return keywords;
  }

  const lowerText = text.toLowerCase();

  // Test frameworks
  const testFrameworks = ['vitest', 'jest', 'mocha', 'jasmine', 'playwright'];
  for (const fw of testFrameworks) {
    if (lowerText.includes(fw)) {
      keywords.testFramework.push(fw);
    }
  }

  // Mocking
  const mockingPatterns = ['vi.mock', 'jest.mock', 'mock', 'stub', 'spy', 'sinon'];
  for (const pattern of mockingPatterns) {
    if (lowerText.includes(pattern.toLowerCase())) {
      keywords.mocking.push(pattern);
    }
  }

  // Assertions
  const assertionPatterns = ['expect', 'assert', 'should', 'chai'];
  for (const pattern of assertionPatterns) {
    if (lowerText.includes(pattern)) {
      keywords.assertions.push(pattern);
    }
  }

  // React Testing
  const reactPatterns = ['testing-library', 'render', 'screen', 'fireEvent', 'userEvent'];
  for (const pattern of reactPatterns) {
    if (lowerText.includes(pattern.toLowerCase())) {
      keywords.reactTesting.push(pattern);
    }
  }

  // File structure
  const filePatterns = ['.test.', '.spec.', '__tests__', '__mocks__', 'tests/', 'src/'];
  for (const pattern of filePatterns) {
    if (text.includes(pattern)) {
      keywords.fileStructure.push(pattern);
    }
  }

  // TypeScript
  if (lowerText.includes('typescript') || lowerText.includes('interface') ||
      text.includes('.ts') || text.includes('.tsx')) {
    keywords.typescript.push('TypeScript');
  }

  // WebSocket
  const wsPatterns = ['websocket', 'socket.io', 'ws'];
  for (const pattern of wsPatterns) {
    if (lowerText.includes(pattern.toLowerCase())) {
      keywords.websocket.push(pattern);
    }
  }

  // State management
  const statePatterns = ['zustand', 'redux', 'context', 'usestate', 'store'];
  for (const pattern of statePatterns) {
    if (lowerText.includes(pattern)) {
      keywords.stateManagement.push(pattern);
    }
  }

  return keywords;
}

/**
 * Extract dependencies from research result
 * @param {object} result - Research result object
 * @returns {object} Dependencies found
 */
function extractDependencies(result) {
  const deps = {
    installed: [],
    toAdd: [],
  };

  // From research result
  if (result.research && result.research.dependencies) {
    if (Array.isArray(result.research.dependencies)) {
      deps.installed.push(...result.research.dependencies);
    }
  }

  // From analysis result
  if (result.dependencies) {
    if (Array.isArray(result.dependencies.currently_installed)) {
      deps.installed.push(...result.dependencies.currently_installed);
    }
    if (Array.isArray(result.dependencies.would_need_to_add)) {
      deps.toAdd.push(...result.dependencies.would_need_to_add);
    }
  }

  // Extract from text patterns
  const allText = JSON.stringify(result);
  const packagePattern = /@?[\w-]+\/[\w-]+|@[\w-]+|vitest|playwright|socket\.io/g;
  const matches = allText.match(packagePattern) || [];

  for (const match of matches) {
    if (match.length > 2 && !deps.installed.includes(match) && !deps.toAdd.includes(match)) {
      deps.installed.push(match);
    }
  }

  return deps;
}

/**
 * Extract file patterns from research result
 * @param {object} result - Research result object
 * @returns {string[]} File patterns found
 */
function extractFilePatterns(result) {
  const patterns = [];

  // From research evidence
  if (result.research && result.research.files_analyzed) {
    patterns.push(...result.research.files_analyzed);
  }

  // From analysis evidence
  if (result.evidence) {
    if (result.evidence.files_analyzed) {
      patterns.push(...result.evidence.files_analyzed);
    }
    if (result.evidence.locations) {
      for (const loc of result.evidence.locations) {
        if (loc.file) {
          patterns.push(loc.file);
        }
      }
    }
  }

  // From existing patterns
  if (result.existing_patterns) {
    for (const pattern of result.existing_patterns) {
      const location = pattern.location || pattern.file || '';
      if (location) {
        patterns.push(location);
      }
    }
  }

  return patterns;
}

/**
 * Count frequency of items in array
 * @param {string[]} items - Items to count
 * @returns {Map<string, number>} Frequency map
 */
function countFrequency(items) {
  const frequency = new Map();

  for (const item of items) {
    const normalized = item.toLowerCase().trim();
    if (normalized) {
      frequency.set(normalized, (frequency.get(normalized) || 0) + 1);
    }
  }

  return frequency;
}

/**
 * Extract common patterns from frequency map
 * @param {Map<string, number>} frequencyMap - Frequency map
 * @param {number} totalResults - Total number of results
 * @param {number} minFrequency - Minimum frequency threshold (0-1)
 * @returns {Array<object>} Common patterns with frequency
 */
function extractCommonPatterns(frequencyMap, totalResults, minFrequency) {
  const patterns = [];
  const threshold = Math.ceil(totalResults * minFrequency);

  for (const [pattern, count] of frequencyMap.entries()) {
    if (count >= threshold) {
      patterns.push({
        pattern,
        count,
        frequency: (count / totalResults).toFixed(2),
        percentage: Math.round((count / totalResults) * 100),
      });
    }
  }

  // Sort by frequency descending
  patterns.sort((a, b) => b.count - a.count);

  return patterns;
}

/**
 * Aggregate research results into common patterns
 * @param {Array<object>} results - Array of research results
 * @param {object} options - Aggregation options
 * @returns {object} Aggregated insights
 */
function aggregateResearchResults(results, options = {}) {
  const config = { ...DEFAULT_CONFIG, ...options };

  const verbose = (...args) => {
    if (config.verbose) {
      console.error('[result-aggregator]', ...args);
    }
  };

  // Validate input
  if (!Array.isArray(results) || results.length === 0) {
    return {
      shouldAggregate: false,
      reason: 'No results to aggregate',
      commonPatterns: {},
      summary: '',
    };
  }

  // Check if aggregation threshold met
  const validResults = results.filter(r =>
    !r.error &&
    (!r.confidence || r.confidence >= config.confidenceThreshold)
  );

  if (validResults.length < config.minResultsForAggregation) {
    verbose(`Only ${validResults.length} valid results, need ${config.minResultsForAggregation} for aggregation`);
    return {
      shouldAggregate: false,
      reason: `Insufficient results (${validResults.length}/${config.minResultsForAggregation})`,
      commonPatterns: {},
      summary: '',
    };
  }

  verbose(`Aggregating ${validResults.length} research results...`);

  // Collect all patterns
  const allKeywords = {
    testFramework: [],
    mocking: [],
    assertions: [],
    reactTesting: [],
    fileStructure: [],
    typescript: [],
    websocket: [],
    stateManagement: [],
  };

  const allDependencies = {
    installed: [],
    toAdd: [],
  };

  const allFilePatterns = [];
  const allRecommendations = [];

  // Extract from each result
  for (const result of validResults) {
    // Extract text to analyze
    const textSources = [
      result.summary || '',
      result.recommendation || '',
      JSON.stringify(result.findings || []),
      JSON.stringify(result.evidence || []),
      JSON.stringify(result.existing_patterns || []),
    ];
    const allText = textSources.join(' ');

    // Extract keywords
    const keywords = extractKeywords(allText);
    for (const [category, items] of Object.entries(keywords)) {
      if (allKeywords[category]) {
        allKeywords[category].push(...items);
      }
    }

    // Extract dependencies
    const deps = extractDependencies(result);
    allDependencies.installed.push(...deps.installed);
    allDependencies.toAdd.push(...deps.toAdd);

    // Extract file patterns
    const filePatterns = extractFilePatterns(result);
    allFilePatterns.push(...filePatterns);

    // Extract recommendations
    if (result.recommendation) {
      allRecommendations.push(result.recommendation);
    }
    if (result.summary) {
      allRecommendations.push(result.summary);
    }
  }

  // Count frequencies
  const testFrameworkFreq = countFrequency(allKeywords.testFramework);
  const mockingFreq = countFrequency(allKeywords.mocking);
  const assertionFreq = countFrequency(allKeywords.assertions);
  const reactTestingFreq = countFrequency(allKeywords.reactTesting);
  const fileStructureFreq = countFrequency(allKeywords.fileStructure);
  const typescriptFreq = countFrequency(allKeywords.typescript);
  const websocketFreq = countFrequency(allKeywords.websocket);
  const stateManagementFreq = countFrequency(allKeywords.stateManagement);
  const depsInstalledFreq = countFrequency(allDependencies.installed);
  const depsToAddFreq = countFrequency(allDependencies.toAdd);

  // Extract common patterns
  const commonTestFrameworks = extractCommonPatterns(
    testFrameworkFreq,
    validResults.length,
    config.minPatternFrequency
  );

  const commonMocking = extractCommonPatterns(
    mockingFreq,
    validResults.length,
    config.minPatternFrequency
  );

  const commonAssertions = extractCommonPatterns(
    assertionFreq,
    validResults.length,
    config.minPatternFrequency
  );

  const commonReactTesting = extractCommonPatterns(
    reactTestingFreq,
    validResults.length,
    config.minPatternFrequency
  );

  const commonFileStructure = extractCommonPatterns(
    fileStructureFreq,
    validResults.length,
    config.minPatternFrequency
  );

  const commonDepsInstalled = extractCommonPatterns(
    depsInstalledFreq,
    validResults.length,
    config.minDependencyFrequency
  );

  const commonDepsToAdd = extractCommonPatterns(
    depsToAddFreq,
    validResults.length,
    config.minDependencyFrequency
  );

  // Detect file location patterns
  const fileLocationPatterns = detectFileLocationPatterns(allFilePatterns);

  // Build aggregated insights
  const commonPatterns = {
    testFramework: commonTestFrameworks,
    mocking: commonMocking,
    assertions: commonAssertions,
    reactTesting: commonReactTesting,
    fileStructure: commonFileStructure,
    fileLocations: fileLocationPatterns,
    dependencies: {
      installed: commonDepsInstalled,
      toAdd: commonDepsToAdd,
    },
  };

  // Generate summary
  const summary = generateAggregatedSummary(commonPatterns, validResults.length);

  // Calculate average confidence
  const totalConfidence = validResults.reduce((sum, r) => sum + (r.confidence || 75), 0);
  const avgConfidence = Math.round(totalConfidence / validResults.length);

  verbose(`Aggregation complete: ${summary.split('.')[0]}`);

  return {
    shouldAggregate: true,
    totalResults: validResults.length,
    averageConfidence: avgConfidence,
    commonPatterns,
    summary,
    insights: generateKeyInsights(commonPatterns, validResults.length),
  };
}

/**
 * Detect common file location patterns
 * @param {string[]} filePaths - Array of file paths
 * @returns {Array<object>} Common location patterns
 */
function detectFileLocationPatterns(filePaths) {
  const patterns = [];

  if (filePaths.length === 0) {
    return patterns;
  }

  // Count directory prefixes
  const dirFreq = new Map();

  for (const filePath of filePaths) {
    const parts = filePath.split('/');

    // Collect directory prefixes
    for (let i = 1; i <= parts.length - 1; i++) {
      const prefix = parts.slice(0, i).join('/');
      if (prefix) {
        dirFreq.set(prefix, (dirFreq.get(prefix) || 0) + 1);
      }
    }

    // Check for common patterns
    if (filePath.includes('test')) {
      dirFreq.set('**/tests/**', (dirFreq.get('**/tests/**') || 0) + 1);
    }
    if (filePath.includes('.test.') || filePath.includes('.spec.')) {
      dirFreq.set('**/*.test.*', (dirFreq.get('**/*.test.*') || 0) + 1);
    }
    if (filePath.includes('src/')) {
      dirFreq.set('src/**', (dirFreq.get('src/**') || 0) + 1);
    }
  }

  // Extract top patterns
  const sortedDirs = Array.from(dirFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  for (const [dir, count] of sortedDirs) {
    patterns.push({
      pattern: dir,
      count,
      percentage: Math.round((count / filePaths.length) * 100),
    });
  }

  return patterns;
}

/**
 * Generate aggregated summary text
 * @param {object} commonPatterns - Common patterns object
 * @param {number} resultCount - Number of results aggregated
 * @returns {string} Summary text
 */
function generateAggregatedSummary(commonPatterns, resultCount) {
  const parts = [];

  parts.push(`Aggregated findings from ${resultCount} research results:`);

  // Test framework
  if (commonPatterns.testFramework && commonPatterns.testFramework.length > 0) {
    const top = commonPatterns.testFramework[0];
    parts.push(`All tasks use ${top.pattern} for testing (${top.percentage}% of results).`);
  }

  // Mocking
  if (commonPatterns.mocking && commonPatterns.mocking.length > 0) {
    const mockingTools = commonPatterns.mocking.map(m => m.pattern).join(', ');
    parts.push(`Common mocking approach: ${mockingTools}.`);
  }

  // File structure
  if (commonPatterns.fileStructure && commonPatterns.fileStructure.length > 0) {
    const top = commonPatterns.fileStructure[0];
    parts.push(`Files follow ${top.pattern} pattern (${top.percentage}% of results).`);
  }

  // Dependencies
  if (commonPatterns.dependencies.installed.length > 0) {
    const topDeps = commonPatterns.dependencies.installed
      .slice(0, 3)
      .map(d => d.pattern)
      .join(', ');
    parts.push(`Common dependencies: ${topDeps}.`);
  }

  // React testing
  if (commonPatterns.reactTesting && commonPatterns.reactTesting.length > 0) {
    const reactTools = commonPatterns.reactTesting.map(r => r.pattern).join(', ');
    parts.push(`React testing tools: ${reactTools}.`);
  }

  return parts.join(' ');
}

/**
 * Generate key insights for main agent
 * @param {object} commonPatterns - Common patterns object
 * @param {number} resultCount - Number of results
 * @returns {string[]} Array of key insights
 */
function generateKeyInsights(commonPatterns, resultCount) {
  const insights = [];

  // Test framework insight
  if (commonPatterns.testFramework && commonPatterns.testFramework.length > 0) {
    const framework = commonPatterns.testFramework[0];
    if (framework.percentage >= 80) {
      insights.push(
        `CONSISTENT: ${framework.percentage}% of tasks use ${framework.pattern} - strongly recommended for consistency`
      );
    }
  }

  // Mocking insight
  if (commonPatterns.mocking && commonPatterns.mocking.length > 0) {
    const mockTools = commonPatterns.mocking.filter(m => m.percentage >= 40);
    if (mockTools.length > 0) {
      insights.push(
        `MOCKING: Use ${mockTools.map(m => m.pattern).join(' or ')} (found in ${mockTools[0].percentage}% of tasks)`
      );
    }
  }

  // File location insight
  if (commonPatterns.fileLocations && commonPatterns.fileLocations.length > 0) {
    const topLocation = commonPatterns.fileLocations[0];
    insights.push(
      `LOCATION: ${topLocation.percentage}% of files follow ${topLocation.pattern} structure`
    );
  }

  // Dependency insight
  if (commonPatterns.dependencies.installed.length > 0) {
    const deps = commonPatterns.dependencies.installed
      .filter(d => d.percentage >= 30)
      .slice(0, 3)
      .map(d => d.pattern);

    if (deps.length > 0) {
      insights.push(
        `DEPENDENCIES: Already available: ${deps.join(', ')}`
      );
    }
  }

  // New dependency warning
  if (commonPatterns.dependencies.toAdd.length > 0) {
    const newDeps = commonPatterns.dependencies.toAdd
      .filter(d => d.percentage >= 20)
      .map(d => d.pattern);

    if (newDeps.length > 0) {
      insights.push(
        `WARNING: ${newDeps.join(', ')} may need to be added - verify before use`
      );
    }
  }

  return insights;
}

module.exports = {
  aggregateResearchResults,
  extractKeywords,
  extractDependencies,
  extractFilePatterns,
  countFrequency,
  extractCommonPatterns,
  DEFAULT_CONFIG,
};
