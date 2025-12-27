/**
 * Feature C Service Tests
 * Task 6.7: Feature C tests (depends: 6.4)
 *
 * Fan-out pattern position:
 *       6.1 (base)
 *     /  |  \
 *   6.2 6.3 6.4
 *   |   |   |
 *  6.5 6.6 [6.7]
 *
 * Purpose: Comprehensive tests for FeatureCService - the logging service.
 * Tests cover log operations, filtering, log levels, rotation, and statistics.
 */

const { FeatureCService, LogLevel, LogLevelPriority, DEFAULT_LOGGING_CONFIG } = require('../services/feature-c-service');

/**
 * Test utilities for Feature C
 */
const TestUtils = {
  /**
   * Create a test service instance
   */
  createService(config = {}) {
    return new FeatureCService(config);
  },

  /**
   * Generate sample log messages
   */
  generateMessages(count = 5) {
    return Array.from({ length: count }, (_, i) => ({
      level: Object.values(LogLevel)[i % 4],
      message: `Test message ${i + 1}`,
      context: { index: i, timestamp: Date.now() }
    }));
  },

  /**
   * Wait for specified milliseconds
   */
  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};

/**
 * Test results collector
 */
class TestRunner {
  constructor() {
    this.results = [];
    this.passed = 0;
    this.failed = 0;
  }

  async test(name, testFn) {
    const result = {
      name,
      passed: false,
      error: null,
      duration: 0
    };

    const start = Date.now();
    try {
      await testFn();
      result.passed = true;
      this.passed++;
    } catch (error) {
      result.error = error.message;
      this.failed++;
    }
    result.duration = Date.now() - start;

    this.results.push(result);
    return result;
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  assertEqual(actual, expected, message = '') {
    if (actual !== expected) {
      throw new Error(`${message} Expected ${expected}, got ${actual}`);
    }
  }

  assertTrue(value, message = '') {
    if (!value) {
      throw new Error(`${message} Expected truthy value, got ${value}`);
    }
  }

  assertFalse(value, message = '') {
    if (value) {
      throw new Error(`${message} Expected falsy value, got ${value}`);
    }
  }

  assertNull(value, message = '') {
    if (value !== null) {
      throw new Error(`${message} Expected null, got ${value}`);
    }
  }

  assertNotNull(value, message = '') {
    if (value === null) {
      throw new Error(`${message} Expected non-null value`);
    }
  }

  getSummary() {
    return {
      total: this.results.length,
      passed: this.passed,
      failed: this.failed,
      passRate: ((this.passed / this.results.length) * 100).toFixed(1) + '%',
      results: this.results
    };
  }
}

/**
 * Run all Feature C Service tests
 */
async function runFeatureCTests() {
  const runner = new TestRunner();
  let service = null;

  // Setup - create and start service
  service = TestUtils.createService();
  await service.start();

  // ==================== Initialization Tests ====================

  await runner.test('Service should initialize with default config', async () => {
    const svc = TestUtils.createService();
    runner.assertEqual(svc.config.name, DEFAULT_LOGGING_CONFIG.name);
    runner.assertEqual(svc.config.maxLogs, DEFAULT_LOGGING_CONFIG.maxLogs);
    runner.assertEqual(svc.config.minLevel, LogLevel.DEBUG);
  });

  await runner.test('Service should accept custom config', async () => {
    const customConfig = { maxLogs: 500, minLevel: LogLevel.WARN };
    const svc = TestUtils.createService(customConfig);
    runner.assertEqual(svc.config.maxLogs, 500);
    runner.assertEqual(svc.config.minLevel, LogLevel.WARN);
  });

  await runner.test('Service should start and stop correctly', async () => {
    const svc = TestUtils.createService();
    runner.assertFalse(svc.isRunning());

    await svc.start();
    runner.assertTrue(svc.isRunning());

    await svc.stop();
    runner.assertFalse(svc.isRunning());
  });

  await runner.test('Service should clear logs on start', async () => {
    const svc = TestUtils.createService();
    await svc.start();
    svc.info('Test message');

    await svc.stop();
    await svc.start();

    const result = svc.getLogs();
    // Should only have initialization log
    runner.assertTrue(result.logs.length <= 2);
    await svc.stop();
  });

  // ==================== Basic Logging Tests ====================

  await runner.test('log should create log entry', async () => {
    const entry = service.log(LogLevel.INFO, 'Test log message');
    runner.assertNotNull(entry);
    runner.assertEqual(entry.level, LogLevel.INFO);
    runner.assertEqual(entry.message, 'Test log message');
  });

  await runner.test('debug should log at debug level', async () => {
    const entry = service.debug('Debug message');
    runner.assertNotNull(entry);
    runner.assertEqual(entry.level, LogLevel.DEBUG);
  });

  await runner.test('info should log at info level', async () => {
    const entry = service.info('Info message');
    runner.assertNotNull(entry);
    runner.assertEqual(entry.level, LogLevel.INFO);
  });

  await runner.test('warn should log at warn level', async () => {
    const entry = service.warn('Warning message');
    runner.assertNotNull(entry);
    runner.assertEqual(entry.level, LogLevel.WARN);
  });

  await runner.test('error should log at error level', async () => {
    const entry = service.error('Error message');
    runner.assertNotNull(entry);
    runner.assertEqual(entry.level, LogLevel.ERROR);
  });

  await runner.test('log should include context', async () => {
    const context = { userId: 123, action: 'test' };
    const entry = service.info('Context test', context);
    runner.assertEqual(entry.context.userId, 123);
    runner.assertEqual(entry.context.action, 'test');
  });

  await runner.test('log should include timestamp', async () => {
    const entry = service.info('Timestamp test');
    runner.assertNotNull(entry.timestamp);
    runner.assertNotNull(entry.timestampISO);
  });

  await runner.test('log should return null when service not running', async () => {
    const stoppedService = TestUtils.createService();
    const entry = stoppedService.info('Should fail');
    runner.assertNull(entry);
  });

  await runner.test('log should reject invalid level', async () => {
    const entry = service.log('INVALID', 'Test message');
    runner.assertNull(entry);
  });

  // ==================== Log Level Filtering Tests ====================

  await runner.test('Logs below minLevel should be filtered', async () => {
    const warnService = TestUtils.createService({ minLevel: LogLevel.WARN });
    await warnService.start();

    const debugEntry = warnService.debug('Should be filtered');
    const infoEntry = warnService.info('Should be filtered');
    const warnEntry = warnService.warn('Should appear');
    const errorEntry = warnService.error('Should appear');

    runner.assertNull(debugEntry);
    runner.assertNull(infoEntry);
    runner.assertNotNull(warnEntry);
    runner.assertNotNull(errorEntry);

    await warnService.stop();
  });

  await runner.test('setMinLevel should change filtering', async () => {
    const svc = TestUtils.createService();
    await svc.start();

    // Default is DEBUG, should log info
    runner.assertNotNull(svc.info('Should work'));

    // Change to ERROR only
    const result = svc.setMinLevel(LogLevel.ERROR);
    runner.assertTrue(result.success);
    runner.assertEqual(result.newLevel, LogLevel.ERROR);

    runner.assertNull(svc.info('Should be filtered'));
    runner.assertNotNull(svc.error('Should work'));

    await svc.stop();
  });

  await runner.test('setMinLevel should reject invalid level', async () => {
    const result = service.setMinLevel('INVALID');
    runner.assertFalse(result.success);
    runner.assertTrue(result.error.includes('Invalid'));
  });

  // ==================== Log Retrieval Tests ====================

  await runner.test('getLogs should return all logs', async () => {
    const svc = TestUtils.createService();
    await svc.start();

    svc.info('Message 1');
    svc.info('Message 2');
    svc.info('Message 3');

    const result = svc.getLogs();
    runner.assertTrue(result.success);
    runner.assertTrue(result.logs.length >= 3);

    await svc.stop();
  });

  await runner.test('getLogs should filter by level', async () => {
    const svc = TestUtils.createService();
    await svc.start();

    svc.debug('Debug');
    svc.info('Info');
    svc.warn('Warning');
    svc.error('Error');

    const result = svc.getLogs({ level: LogLevel.WARN });
    // Should include WARN and ERROR only
    runner.assertTrue(result.success);
    runner.assertTrue(result.logs.every(log =>
      LogLevelPriority[log.level] >= LogLevelPriority[LogLevel.WARN]
    ));

    await svc.stop();
  });

  await runner.test('getLogs should filter by search term', async () => {
    const svc = TestUtils.createService();
    await svc.start();

    svc.info('User login successful');
    svc.info('Database connection established');
    svc.info('User logout completed');

    const result = svc.getLogs({ search: 'User' });
    runner.assertTrue(result.success);
    runner.assertTrue(result.logs.every(log =>
      log.message.toLowerCase().includes('user')
    ));

    await svc.stop();
  });

  await runner.test('getLogs should support pagination', async () => {
    const svc = TestUtils.createService();
    await svc.start();

    for (let i = 0; i < 10; i++) {
      svc.info(`Message ${i}`);
    }

    const page1 = svc.getLogs({ limit: 3, offset: 0 });
    runner.assertEqual(page1.logs.length, 3);
    runner.assertEqual(page1.offset, 0);
    runner.assertTrue(page1.hasMore);

    const page2 = svc.getLogs({ limit: 3, offset: 3 });
    runner.assertEqual(page2.logs.length, 3);
    runner.assertEqual(page2.offset, 3);

    await svc.stop();
  });

  await runner.test('getLogs should filter by time range', async () => {
    const svc = TestUtils.createService();
    await svc.start();

    const beforeTime = Date.now();
    await TestUtils.wait(10);
    svc.info('In range message');
    await TestUtils.wait(10);
    const afterTime = Date.now();

    const result = svc.getLogs({
      startTime: beforeTime,
      endTime: afterTime
    });

    runner.assertTrue(result.success);
    runner.assertTrue(result.logs.some(log =>
      log.message === 'In range message'
    ));

    await svc.stop();
  });

  await runner.test('getLogs should fail when service not running', async () => {
    const stoppedService = TestUtils.createService();
    const result = stoppedService.getLogs();
    runner.assertFalse(result.success);
  });

  // ==================== Log Management Tests ====================

  await runner.test('clearLogs should remove all logs', async () => {
    const svc = TestUtils.createService();
    await svc.start();

    svc.info('Log 1');
    svc.info('Log 2');

    const result = svc.clearLogs();
    runner.assertTrue(result.success);
    runner.assertTrue(result.clearedCount >= 2);

    // Should have only the "Logs cleared" log
    const logs = svc.getLogs();
    runner.assertTrue(logs.logs.length <= 1);

    await svc.stop();
  });

  await runner.test('clearLogs should fail when service not running', async () => {
    const stoppedService = TestUtils.createService();
    const result = stoppedService.clearLogs();
    runner.assertFalse(result.success);
  });

  // ==================== Statistics Tests ====================

  await runner.test('getStats should return log statistics', async () => {
    const svc = TestUtils.createService();
    await svc.start();

    svc.debug('Debug msg');
    svc.info('Info msg');
    svc.warn('Warn msg');
    svc.error('Error msg');

    const stats = svc.getStats();
    runner.assertTrue(stats.totalLogsWritten >= 4);
    runner.assertTrue(stats.currentLogCount >= 4);
    runner.assertEqual(stats.minLevel, LogLevel.DEBUG);
    runner.assertTrue('levelCounts' in stats);

    await svc.stop();
  });

  await runner.test('Stats should count logs by level', async () => {
    const svc = TestUtils.createService();
    await svc.start();

    svc.info('Info 1');
    svc.info('Info 2');
    svc.error('Error 1');

    const stats = svc.getStats();
    runner.assertTrue(stats.levelCounts[LogLevel.INFO] >= 2);
    runner.assertTrue(stats.levelCounts[LogLevel.ERROR] >= 1);

    await svc.stop();
  });

  await runner.test('Stats should track oldest and newest logs', async () => {
    const svc = TestUtils.createService();
    await svc.start();

    svc.info('First');
    await TestUtils.wait(20);
    svc.info('Last');

    const stats = svc.getStats();
    runner.assertNotNull(stats.oldestLog);
    runner.assertNotNull(stats.newestLog);
    runner.assertTrue(stats.newestLog >= stats.oldestLog);

    await svc.stop();
  });

  // ==================== Log Rotation Tests ====================

  await runner.test('Logs should rotate when threshold reached', async () => {
    const svc = TestUtils.createService({
      rotationThreshold: 10,
      maxLogs: 20
    });
    await svc.start();

    // Fill up to rotation threshold
    for (let i = 0; i < 15; i++) {
      svc.info(`Log ${i}`);
    }

    const stats = svc.getStats();
    runner.assertTrue(stats.currentLogCount < 15);
    runner.assertTrue(stats.rotatedLogCount > 0);

    await svc.stop();
  });

  await runner.test('getLogs should optionally include rotated logs', async () => {
    const svc = TestUtils.createService({
      rotationThreshold: 5,
      maxLogs: 20
    });
    await svc.start();

    for (let i = 0; i < 10; i++) {
      svc.info(`Log ${i}`);
    }

    const withoutRotated = svc.getLogs({ includeRotated: false });
    const withRotated = svc.getLogs({ includeRotated: true });

    runner.assertTrue(withRotated.total >= withoutRotated.total);

    await svc.stop();
  });

  // ==================== Context and Metadata Tests ====================

  await runner.test('Log entries should have unique IDs', async () => {
    const svc = TestUtils.createService();
    await svc.start();

    const entry1 = svc.info('First');
    const entry2 = svc.info('Second');

    runner.assertTrue(entry1.id !== entry2.id);

    await svc.stop();
  });

  await runner.test('Context should be copied not referenced', async () => {
    const svc = TestUtils.createService();
    await svc.start();

    const context = { value: 1 };
    const entry = svc.info('Test', context);

    // Modify original context
    context.value = 2;

    // Entry should have original value
    runner.assertEqual(entry.context.value, 1);

    await svc.stop();
  });

  await runner.test('Logs can be searched by context values', async () => {
    const svc = TestUtils.createService();
    await svc.start();

    svc.info('Action 1', { userId: 'user123' });
    svc.info('Action 2', { userId: 'user456' });
    svc.info('Action 3', { userId: 'user123' });

    const result = svc.getLogs({ search: 'user123' });
    runner.assertTrue(result.logs.length >= 2);

    await svc.stop();
  });

  // ==================== Configuration Tests ====================

  await runner.test('includeTimestamp config should be respected', async () => {
    const svc = TestUtils.createService({ includeTimestamp: false });
    await svc.start();

    const entry = svc.info('No timestamp');
    runner.assertNull(entry.timestamp);
    runner.assertNull(entry.timestampISO);

    await svc.stop();
  });

  await runner.test('includeContext config should be respected', async () => {
    const svc = TestUtils.createService({ includeContext: false });
    await svc.start();

    const entry = svc.info('No context', { should: 'not appear' });
    runner.assertTrue(Object.keys(entry.context).length === 0);

    await svc.stop();
  });

  // ==================== Log Level Priority Tests ====================

  await runner.test('LogLevelPriority should have correct ordering', async () => {
    runner.assertTrue(LogLevelPriority[LogLevel.DEBUG] < LogLevelPriority[LogLevel.INFO]);
    runner.assertTrue(LogLevelPriority[LogLevel.INFO] < LogLevelPriority[LogLevel.WARN]);
    runner.assertTrue(LogLevelPriority[LogLevel.WARN] < LogLevelPriority[LogLevel.ERROR]);
  });

  // Cleanup
  await service.stop();

  return runner.getSummary();
}

// Export test utilities and runner
module.exports = {
  TestUtils,
  TestRunner,
  runFeatureCTests
};

// Run tests if executed directly
if (require.main === module) {
  runFeatureCTests()
    .then(summary => {
      console.log('\n=== Feature C Service Test Results ===');
      console.log(`Total: ${summary.total}`);
      console.log(`Passed: ${summary.passed}`);
      console.log(`Failed: ${summary.failed}`);
      console.log(`Pass Rate: ${summary.passRate}`);

      if (summary.failed > 0) {
        console.log('\nFailed Tests:');
        summary.results
          .filter(r => !r.passed)
          .forEach(r => console.log(`  ✗ ${r.name}: ${r.error}`));
      }

      process.exit(summary.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}
