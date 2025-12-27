/**
 * Feature B Service Tests
 * Task 6.6: Feature B tests (depends: 6.3)
 *
 * Fan-out pattern position:
 *       6.1 (base)
 *     /  |  \
 *   6.2 6.3 6.4
 *   |   |   |
 *  6.5 [6.6] 6.7
 *
 * Purpose: Comprehensive tests for FeatureBService - the caching service.
 * Tests cover cache operations, TTL handling, eviction, and cache statistics.
 */

const { FeatureBService, CacheEvents, DEFAULT_CACHE_CONFIG } = require('../services/feature-b-service');

/**
 * Test utilities for Feature B
 */
const TestUtils = {
  /**
   * Create a test service instance
   */
  createService(config = {}) {
    return new FeatureBService(config);
  },

  /**
   * Generate unique test keys
   */
  generateKey(prefix = 'test') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  /**
   * Create sample data
   */
  createSampleData(size = 1) {
    if (size === 1) {
      return { value: 'test', timestamp: Date.now() };
    }
    return Array.from({ length: size }, (_, i) => ({
      id: i,
      value: `item_${i}`
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

  assertUndefined(value, message = '') {
    if (value !== undefined) {
      throw new Error(`${message} Expected undefined, got ${value}`);
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
 * Run all Feature B Service tests
 */
async function runFeatureBTests() {
  const runner = new TestRunner();
  let service = null;

  // Setup - create and start service
  service = TestUtils.createService();
  await service.start();

  // ==================== Initialization Tests ====================

  await runner.test('Service should initialize with default config', async () => {
    const svc = TestUtils.createService();
    runner.assertEqual(svc.config.name, DEFAULT_CACHE_CONFIG.name);
    runner.assertEqual(svc.config.maxSize, DEFAULT_CACHE_CONFIG.maxSize);
    runner.assertEqual(svc.config.defaultTtl, null);
  });

  await runner.test('Service should accept custom config', async () => {
    const customConfig = { maxSize: 500, defaultTtl: 5000 };
    const svc = TestUtils.createService(customConfig);
    runner.assertEqual(svc.config.maxSize, 500);
    runner.assertEqual(svc.config.defaultTtl, 5000);
  });

  await runner.test('Service should start and stop correctly', async () => {
    const svc = TestUtils.createService();
    runner.assertFalse(svc.isRunning());

    await svc.start();
    runner.assertTrue(svc.isRunning());

    await svc.stop();
    runner.assertFalse(svc.isRunning());
  });

  await runner.test('Service should clear cache on start', async () => {
    const svc = TestUtils.createService();
    await svc.start();
    svc.set('key1', 'value1');
    runner.assertTrue(svc.has('key1'));

    await svc.stop();
    await svc.start();

    runner.assertFalse(svc.has('key1'));
    await svc.stop();
  });

  // ==================== Basic Cache Operations ====================

  await runner.test('set should store value', async () => {
    const key = TestUtils.generateKey();
    const result = service.set(key, 'testValue');
    runner.assertTrue(result);
  });

  await runner.test('get should retrieve stored value', async () => {
    const key = TestUtils.generateKey();
    service.set(key, 'retrieveTest');
    const value = service.get(key);
    runner.assertEqual(value, 'retrieveTest');
  });

  await runner.test('get should return undefined for non-existent key', async () => {
    const value = service.get('nonExistentKey_12345');
    runner.assertUndefined(value);
  });

  await runner.test('has should return true for existing key', async () => {
    const key = TestUtils.generateKey();
    service.set(key, 'value');
    runner.assertTrue(service.has(key));
  });

  await runner.test('has should return false for non-existent key', async () => {
    runner.assertFalse(service.has('noSuchKey_98765'));
  });

  await runner.test('delete should remove key', async () => {
    const key = TestUtils.generateKey();
    service.set(key, 'toDelete');
    runner.assertTrue(service.has(key));

    const deleted = service.delete(key);
    runner.assertTrue(deleted);
    runner.assertFalse(service.has(key));
  });

  await runner.test('delete should return false for non-existent key', async () => {
    const result = service.delete('noSuchKeyToDelete');
    runner.assertFalse(result);
  });

  await runner.test('clear should remove all entries', async () => {
    service.set('clear1', 'v1');
    service.set('clear2', 'v2');
    service.set('clear3', 'v3');

    const count = service.clear();
    runner.assertTrue(count >= 3);
    runner.assertEqual(service.stats.size, 0);
  });

  // ==================== TTL Tests ====================

  await runner.test('Entry should expire after TTL', async () => {
    const key = TestUtils.generateKey('ttl');
    service.set(key, 'expiring', 50); // 50ms TTL

    runner.assertTrue(service.has(key));
    await TestUtils.wait(100);
    runner.assertFalse(service.has(key));
  });

  await runner.test('get should return undefined for expired entry', async () => {
    const key = TestUtils.generateKey('ttlGet');
    service.set(key, 'willExpire', 30);

    await TestUtils.wait(60);
    const value = service.get(key);
    runner.assertUndefined(value);
  });

  await runner.test('Entry without TTL should not expire', async () => {
    const key = TestUtils.generateKey('noTtl');
    service.set(key, 'permanent', null);

    await TestUtils.wait(50);
    runner.assertTrue(service.has(key));
    runner.assertEqual(service.get(key), 'permanent');
  });

  await runner.test('Default TTL should apply when not specified', async () => {
    const svcWithTtl = TestUtils.createService({ defaultTtl: 50 });
    await svcWithTtl.start();

    const key = TestUtils.generateKey('defaultTtl');
    svcWithTtl.set(key, 'withDefaultTtl');

    runner.assertTrue(svcWithTtl.has(key));
    await TestUtils.wait(100);
    runner.assertFalse(svcWithTtl.has(key));

    await svcWithTtl.stop();
  });

  // ==================== Bulk Operations ====================

  await runner.test('keys should return all valid keys', async () => {
    const testService = TestUtils.createService();
    await testService.start();

    testService.set('k1', 'v1');
    testService.set('k2', 'v2');
    testService.set('k3', 'v3');

    const keys = testService.keys();
    runner.assertTrue(keys.includes('k1'));
    runner.assertTrue(keys.includes('k2'));
    runner.assertTrue(keys.includes('k3'));

    await testService.stop();
  });

  await runner.test('keys should exclude expired entries', async () => {
    const testService = TestUtils.createService();
    await testService.start();

    testService.set('permanent', 'value');
    testService.set('expiring', 'value', 30);

    await TestUtils.wait(60);

    const keys = testService.keys();
    runner.assertTrue(keys.includes('permanent'));
    runner.assertFalse(keys.includes('expiring'));

    await testService.stop();
  });

  await runner.test('getMany should return multiple values', async () => {
    service.set('multi1', 'value1');
    service.set('multi2', 'value2');

    const results = service.getMany(['multi1', 'multi2', 'nonexistent']);
    runner.assertEqual(results.size, 2);
    runner.assertEqual(results.get('multi1'), 'value1');
    runner.assertEqual(results.get('multi2'), 'value2');
  });

  await runner.test('setMany should store multiple values', async () => {
    const entries = {
      batch1: 'value1',
      batch2: 'value2',
      batch3: 'value3'
    };

    const count = service.setMany(entries);
    runner.assertEqual(count, 3);
    runner.assertEqual(service.get('batch1'), 'value1');
    runner.assertEqual(service.get('batch2'), 'value2');
    runner.assertEqual(service.get('batch3'), 'value3');
  });

  await runner.test('setMany should accept Map', async () => {
    const entries = new Map([
      ['mapKey1', 'value1'],
      ['mapKey2', 'value2']
    ]);

    const count = service.setMany(entries);
    runner.assertEqual(count, 2);
    runner.assertEqual(service.get('mapKey1'), 'value1');
  });

  // ==================== Eviction Tests ====================

  await runner.test('Cache should evict oldest entry when full', async () => {
    const smallCache = TestUtils.createService({ maxSize: 3 });
    await smallCache.start();

    smallCache.set('first', 'v1');
    await TestUtils.wait(10);
    smallCache.set('second', 'v2');
    await TestUtils.wait(10);
    smallCache.set('third', 'v3');
    await TestUtils.wait(10);

    // Adding fourth should evict 'first'
    smallCache.set('fourth', 'v4');

    runner.assertFalse(smallCache.has('first'));
    runner.assertTrue(smallCache.has('second'));
    runner.assertTrue(smallCache.has('third'));
    runner.assertTrue(smallCache.has('fourth'));

    await smallCache.stop();
  });

  await runner.test('Eviction count should be tracked in stats', async () => {
    const smallCache = TestUtils.createService({ maxSize: 2 });
    await smallCache.start();

    smallCache.set('a', 1);
    smallCache.set('b', 2);
    smallCache.set('c', 3); // Should trigger eviction

    runner.assertTrue(smallCache.stats.evictions > 0);
    await smallCache.stop();
  });

  // ==================== Metadata Tests ====================

  await runner.test('getMetadata should return entry info', async () => {
    const key = TestUtils.generateKey('meta');
    service.set(key, 'metaValue', 5000);

    const metadata = service.getMetadata(key);
    runner.assertEqual(metadata.key, key);
    runner.assertTrue(metadata.createdAt !== null);
    runner.assertTrue(metadata.expiresAt !== null);
    runner.assertFalse(metadata.isExpired);
    runner.assertTrue(metadata.ttlRemaining > 0);
  });

  await runner.test('getMetadata should return null for non-existent key', async () => {
    const metadata = service.getMetadata('noSuchMetaKey');
    runner.assertEqual(metadata, null);
  });

  await runner.test('getMetadata should show null TTL for permanent entries', async () => {
    const key = TestUtils.generateKey('permaMeta');
    service.set(key, 'value', null);

    const metadata = service.getMetadata(key);
    runner.assertEqual(metadata.expiresAt, null);
    runner.assertEqual(metadata.ttlRemaining, null);
  });

  // ==================== Statistics Tests ====================

  await runner.test('Stats should track hits and misses', async () => {
    const statsService = TestUtils.createService();
    await statsService.start();

    statsService.set('hitKey', 'value');
    statsService.get('hitKey'); // Hit
    statsService.get('hitKey'); // Hit
    statsService.get('missKey'); // Miss

    const stats = statsService.stats;
    runner.assertTrue(stats.hits >= 2);
    runner.assertTrue(stats.misses >= 1);

    await statsService.stop();
  });

  await runner.test('Stats should calculate hit rate', async () => {
    const statsService = TestUtils.createService();
    await statsService.start();

    statsService.set('key', 'value');
    statsService.get('key'); // Hit
    statsService.get('key'); // Hit
    statsService.get('noKey'); // Miss
    statsService.get('noKey'); // Miss

    const stats = statsService.stats;
    runner.assertEqual(stats.hitRate, '50.00%');

    await statsService.stop();
  });

  await runner.test('Stats should track set and delete counts', async () => {
    const statsService = TestUtils.createService();
    await statsService.start();

    statsService.set('k1', 'v');
    statsService.set('k2', 'v');
    statsService.delete('k1');

    const stats = statsService.stats;
    runner.assertTrue(stats.sets >= 2);
    runner.assertTrue(stats.deletes >= 1);

    await statsService.stop();
  });

  // ==================== Service Info Tests ====================

  await runner.test('getInfo should include cache stats', async () => {
    const info = service.getInfo();
    runner.assertTrue('cache' in info);
    runner.assertTrue('size' in info.cache);
    runner.assertTrue('hitRate' in info.cache);
  });

  await runner.test('healthCheck should include cache utilization', async () => {
    const health = service.healthCheck();
    runner.assertTrue('cache' in health);
    runner.assertTrue('utilizationPercent' in health.cache);
  });

  // ==================== Service Not Running Tests ====================

  await runner.test('Operations should fail when service not running', async () => {
    const stoppedService = TestUtils.createService();

    runner.assertFalse(stoppedService.set('key', 'value'));
    runner.assertUndefined(stoppedService.get('key'));
    runner.assertFalse(stoppedService.delete('key'));
    runner.assertEqual(stoppedService.clear(), 0);
    runner.assertFalse(stoppedService.has('key'));
  });

  // ==================== Complex Data Types ====================

  await runner.test('Cache should store objects', async () => {
    const key = TestUtils.generateKey('obj');
    const obj = { nested: { deep: { value: 42 } } };
    service.set(key, obj);

    const retrieved = service.get(key);
    runner.assertEqual(retrieved.nested.deep.value, 42);
  });

  await runner.test('Cache should store arrays', async () => {
    const key = TestUtils.generateKey('arr');
    const arr = [1, 2, 3, { four: 4 }];
    service.set(key, arr);

    const retrieved = service.get(key);
    runner.assertEqual(retrieved.length, 4);
    runner.assertEqual(retrieved[3].four, 4);
  });

  await runner.test('Cache should store functions', async () => {
    const key = TestUtils.generateKey('fn');
    const fn = (x) => x * 2;
    service.set(key, fn);

    const retrieved = service.get(key);
    runner.assertEqual(retrieved(5), 10);
  });

  // Cleanup
  await service.stop();

  return runner.getSummary();
}

// Export test utilities and runner
module.exports = {
  TestUtils,
  TestRunner,
  runFeatureBTests
};

// Run tests if executed directly
if (require.main === module) {
  runFeatureBTests()
    .then(summary => {
      console.log('\n=== Feature B Service Test Results ===');
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
