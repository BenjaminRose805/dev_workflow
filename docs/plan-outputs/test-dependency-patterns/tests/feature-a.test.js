/**
 * Feature A Service Tests
 * Task 6.5: Feature A tests (depends: 6.2)
 *
 * Fan-out pattern position:
 *       6.1 (base)
 *     /  |  \
 *   6.2 6.3 6.4
 *   |   |   |
 * [6.5] 6.6 6.7
 *
 * Purpose: Comprehensive tests for FeatureAService - the data processing service.
 * Tests cover data processing, validation, transformation, and caching functionality.
 */

const { FeatureAService, DataFormat, ValidationRules, FEATURE_A_CONFIG } = require('../services/feature-a-service');

/**
 * Test utilities
 */
const TestUtils = {
  /**
   * Create a test service instance
   */
  createService(config = {}) {
    return new FeatureAService(config);
  },

  /**
   * Create sample test data
   */
  createSampleData() {
    return {
      id: 1,
      name: '  Test Item  ',
      value: 42,
      active: true,
      nested: {
        key: 'value',
        count: 10
      }
    };
  },

  /**
   * Create array of sample data
   */
  createSampleArray(count = 5) {
    return Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      name: `Item ${i + 1}`,
      value: (i + 1) * 10
    }));
  },

  /**
   * Wait for service to be running
   */
  async waitForRunning(service, timeout = 1000) {
    const start = Date.now();
    while (!service.isRunning() && (Date.now() - start) < timeout) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    return service.isRunning();
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

  /**
   * Run a test case
   */
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

  /**
   * Assert condition
   */
  assert(condition, message) {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  /**
   * Assert equality
   */
  assertEqual(actual, expected, message = '') {
    if (actual !== expected) {
      throw new Error(`${message} Expected ${expected}, got ${actual}`);
    }
  }

  /**
   * Assert truthy
   */
  assertTrue(value, message = '') {
    if (!value) {
      throw new Error(`${message} Expected truthy value, got ${value}`);
    }
  }

  /**
   * Assert falsy
   */
  assertFalse(value, message = '') {
    if (value) {
      throw new Error(`${message} Expected falsy value, got ${value}`);
    }
  }

  /**
   * Get test summary
   */
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
 * Run all Feature A Service tests
 */
async function runFeatureATests() {
  const runner = new TestRunner();
  let service = null;

  // Setup - create and start service
  service = TestUtils.createService();
  await service.start();

  // ==================== Initialization Tests ====================

  await runner.test('Service should initialize with default config', async () => {
    const svc = TestUtils.createService();
    runner.assertEqual(svc.config.name, FEATURE_A_CONFIG.name);
    runner.assertEqual(svc.config.maxBatchSize, FEATURE_A_CONFIG.maxBatchSize);
    runner.assertTrue(svc.config.enableCaching);
  });

  await runner.test('Service should accept custom config', async () => {
    const customConfig = { maxBatchSize: 500, enableCaching: false };
    const svc = TestUtils.createService(customConfig);
    runner.assertEqual(svc.config.maxBatchSize, 500);
    runner.assertFalse(svc.config.enableCaching);
  });

  await runner.test('Service should start and stop correctly', async () => {
    const svc = TestUtils.createService();
    runner.assertFalse(svc.isRunning());

    await svc.start();
    runner.assertTrue(svc.isRunning());

    await svc.stop();
    runner.assertFalse(svc.isRunning());
  });

  // ==================== Data Validation Tests ====================

  await runner.test('Validation should reject null data', async () => {
    const result = service.validateData(null);
    runner.assertFalse(result.valid);
    runner.assertTrue(result.errors.length > 0);
  });

  await runner.test('Validation should reject undefined data', async () => {
    const result = service.validateData(undefined);
    runner.assertFalse(result.valid);
  });

  await runner.test('Validation should reject empty object', async () => {
    const result = service.validateData({});
    runner.assertFalse(result.valid);
    runner.assertTrue(result.errors.some(e => e.includes('empty')));
  });

  await runner.test('Validation should reject empty array', async () => {
    const result = service.validateData([]);
    runner.assertFalse(result.valid);
  });

  await runner.test('Validation should reject empty string', async () => {
    const result = service.validateData('   ');
    runner.assertFalse(result.valid);
  });

  await runner.test('Validation should accept valid object', async () => {
    const data = TestUtils.createSampleData();
    const result = service.validateData(data);
    runner.assertTrue(result.valid);
    runner.assertEqual(result.errors.length, 0);
  });

  await runner.test('Validation should accept valid array', async () => {
    const data = TestUtils.createSampleArray();
    const result = service.validateData(data);
    runner.assertTrue(result.valid);
  });

  await runner.test('Validation should reject oversized array', async () => {
    const oversized = Array.from({ length: FEATURE_A_CONFIG.maxBatchSize + 100 }, () => ({}));
    const result = service.validateData(oversized);
    runner.assertFalse(result.valid);
    runner.assertTrue(result.errors.some(e => e.includes('batch size')));
  });

  // ==================== Data Processing Tests ====================

  await runner.test('processData should fail when service not running', async () => {
    const stoppedService = TestUtils.createService();
    const result = await stoppedService.processData({ test: 'data' });
    runner.assertFalse(result.success);
    runner.assertTrue(result.error.includes('not running'));
  });

  await runner.test('processData should process valid object', async () => {
    const data = TestUtils.createSampleData();
    const result = await service.processData(data);
    runner.assertTrue(result.success);
    runner.assertTrue(result.data !== null);
    runner.assertTrue(result.processingTime >= 0);
  });

  await runner.test('processData should normalize object keys', async () => {
    const data = { 'Test Key': 'value', '  Spaced  ': 'value2' };
    const result = await service.processData(data);
    runner.assertTrue(result.success);
    runner.assertTrue('test_key' in result.data);
    runner.assertTrue('spaced' in result.data);
  });

  await runner.test('processData should trim string values', async () => {
    const data = { name: '  padded  ' };
    const result = await service.processData(data);
    runner.assertTrue(result.success);
    runner.assertEqual(result.data.name, 'padded');
  });

  await runner.test('processData should add processing metadata', async () => {
    const data = { test: 'value' };
    const result = await service.processData(data);
    runner.assertTrue(result.success);
    runner.assertTrue(result.data._processed === true);
    runner.assertTrue(result.data._processedAt !== undefined);
  });

  await runner.test('processData should process arrays', async () => {
    const data = TestUtils.createSampleArray(3);
    const result = await service.processData(data);
    runner.assertTrue(result.success);
    runner.assertEqual(result.data.length, 3);
  });

  await runner.test('processData should fail validation for invalid data', async () => {
    const result = await service.processData(null);
    runner.assertFalse(result.success);
    runner.assertTrue(result.error.includes('Validation failed'));
  });

  await runner.test('processData should skip validation when disabled', async () => {
    const result = await service.processData({}, { validate: false });
    // Empty object normally fails validation, but should pass here
    runner.assertTrue(result.success);
  });

  // ==================== Caching Tests ====================

  await runner.test('processData should cache results when enabled', async () => {
    const data = { cacheTest: 'value123' };

    // First call - should not be cached
    const result1 = await service.processData(data);
    runner.assertTrue(result1.success);
    runner.assertFalse(result1.cached);

    // Second call with same data - should be cached
    const result2 = await service.processData(data);
    runner.assertTrue(result2.success);
    runner.assertTrue(result2.cached);
    runner.assertEqual(result2.processingTime, 0);
  });

  await runner.test('Cache should be clearable', async () => {
    const data = { clearTest: 'value' };
    await service.processData(data);

    service.clearCache();

    const result = await service.processData(data);
    runner.assertFalse(result.cached);
  });

  await runner.test('Caching should respect enableCaching config', async () => {
    const noCacheService = TestUtils.createService({ enableCaching: false });
    await noCacheService.start();

    const data = { noCacheTest: 'value' };
    await noCacheService.processData(data);
    const result2 = await noCacheService.processData(data);

    runner.assertFalse(result2.cached);
    await noCacheService.stop();
  });

  // ==================== Transformation Tests ====================

  await runner.test('transformData should convert to JSON', async () => {
    const data = { key: 'value', num: 42 };
    const result = service.transformData(data, DataFormat.JSON);
    runner.assertTrue(result.success);
    runner.assertEqual(result.format, 'json');
    runner.assertTrue(typeof result.data === 'string');
    const parsed = JSON.parse(result.data);
    runner.assertEqual(parsed.key, 'value');
  });

  await runner.test('transformData should convert to CSV', async () => {
    const data = [
      { name: 'Alice', age: 30 },
      { name: 'Bob', age: 25 }
    ];
    const result = service.transformData(data, DataFormat.CSV);
    runner.assertTrue(result.success);
    runner.assertEqual(result.format, 'csv');
    runner.assertTrue(result.data.includes('name,age'));
    runner.assertTrue(result.data.includes('Alice'));
  });

  await runner.test('transformData should convert to XML', async () => {
    const data = { name: 'Test', value: 100 };
    const result = service.transformData(data, DataFormat.XML);
    runner.assertTrue(result.success);
    runner.assertEqual(result.format, 'xml');
    runner.assertTrue(result.data.includes('<?xml'));
    runner.assertTrue(result.data.includes('<name>'));
  });

  await runner.test('transformData should convert to YAML', async () => {
    const data = { name: 'Test', nested: { key: 'value' } };
    const result = service.transformData(data, DataFormat.YAML);
    runner.assertTrue(result.success);
    runner.assertEqual(result.format, 'yaml');
    runner.assertTrue(result.data.includes('name:'));
    runner.assertTrue(result.data.includes('nested:'));
  });

  await runner.test('transformData should reject invalid format', async () => {
    const result = service.transformData({ test: 'data' }, 'invalid');
    runner.assertFalse(result.success);
    runner.assertTrue(result.error.includes('Unsupported format'));
  });

  await runner.test('processData should apply output format', async () => {
    const data = { key: 'value' };
    const result = await service.processData(data, { outputFormat: 'json' });
    runner.assertTrue(result.success);
    runner.assertTrue(typeof result.data === 'string');
  });

  // ==================== Metrics Tests ====================

  await runner.test('Metrics should track processing counts', async () => {
    const metricsService = TestUtils.createService();
    await metricsService.start();

    await metricsService.processData({ test: 1 });
    await metricsService.processData({ test: 2 });

    const metrics = metricsService.getProcessingMetrics();
    runner.assertTrue(metrics.totalProcessed >= 2);
    runner.assertTrue(metrics.successfulProcessed >= 2);

    await metricsService.stop();
  });

  await runner.test('Metrics should track validation counts', async () => {
    const metricsService = TestUtils.createService();
    await metricsService.start();

    metricsService.validateData({ valid: 'data' });
    metricsService.validateData(null);

    const metrics = metricsService.getProcessingMetrics();
    runner.assertTrue(metrics.totalValidations >= 2);
    runner.assertTrue(metrics.validationFailures >= 1);

    await metricsService.stop();
  });

  await runner.test('getInfo should include processing metrics', async () => {
    const info = service.getInfo();
    runner.assertTrue('processingMetrics' in info);
    runner.assertTrue('totalProcessed' in info.processingMetrics);
    runner.assertTrue('cacheSize' in info.processingMetrics);
  });

  // ==================== Schema Validation Tests ====================

  await runner.test('Schema validation should check required fields', async () => {
    const schema = {
      name: { required: true, type: 'string' },
      age: { required: true, type: 'number' }
    };

    const validResult = service.validateData({ name: 'Test', age: 25 }, schema);
    runner.assertTrue(validResult.valid);

    const invalidResult = service.validateData({ name: 'Test' }, schema);
    runner.assertFalse(invalidResult.valid);
    runner.assertTrue(invalidResult.errors.some(e => e.includes('age')));
  });

  await runner.test('Schema validation should check types', async () => {
    const schema = {
      count: { type: 'number' }
    };

    const validResult = service.validateData({ count: 42 }, schema);
    runner.assertTrue(validResult.valid);

    const invalidResult = service.validateData({ count: 'not a number' }, schema);
    runner.assertFalse(invalidResult.valid);
  });

  // Cleanup
  await service.stop();

  return runner.getSummary();
}

// Export test utilities and runner
module.exports = {
  TestUtils,
  TestRunner,
  runFeatureATests
};

// Run tests if executed directly
if (require.main === module) {
  runFeatureATests()
    .then(summary => {
      console.log('\n=== Feature A Service Test Results ===');
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
