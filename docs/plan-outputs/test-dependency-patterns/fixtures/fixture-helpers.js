const fs = require('fs');
const path = require('path');

/**
 * Fixture Helper Module
 * Provides utilities to load, manage, and generate test fixtures
 */

// Load fixtures from sample-data.json
let fixturesCache = null;

/**
 * Load fixtures from sample-data.json
 * @returns {Object} The loaded fixtures object
 */
function loadFixtures() {
  if (fixturesCache) {
    return fixturesCache;
  }

  const fixturesPath = path.join(__dirname, 'sample-data.json');
  const fixturesData = fs.readFileSync(fixturesPath, 'utf-8');
  fixturesCache = JSON.parse(fixturesData);
  return fixturesCache;
}

/**
 * Reset the fixture cache to ensure fresh data
 */
function resetCache() {
  fixturesCache = null;
}

/**
 * Get sample users from fixtures
 * @param {string|number} [filter] - Optional filter by user id or index
 * @returns {Array|Object} Users array or single user if filter provided
 */
function getSampleUsers(filter) {
  const fixtures = loadFixtures();
  const users = fixtures.sampleUsers;

  if (filter === undefined) {
    return cloneDeep(users);
  }

  if (typeof filter === 'number') {
    return cloneDeep(users[filter]);
  }

  if (typeof filter === 'string') {
    return cloneDeep(users.find(u => u.id === filter));
  }

  return cloneDeep(users);
}

/**
 * Get sample tasks from fixtures
 * @param {string|number} [filter] - Optional filter by task id or index
 * @returns {Array|Object} Tasks array or single task if filter provided
 */
function getSampleTasks(filter) {
  const fixtures = loadFixtures();
  const tasks = fixtures.sampleTasks;

  if (filter === undefined) {
    return cloneDeep(tasks);
  }

  if (typeof filter === 'number') {
    return cloneDeep(tasks[filter]);
  }

  if (typeof filter === 'string') {
    return cloneDeep(tasks.find(t => t.id === filter));
  }

  return cloneDeep(tasks);
}

/**
 * Get test cases from fixtures
 * @param {string} [type] - Optional type filter ('dependencyPatterns' or 'edgeCases')
 * @returns {Object|Array} All test cases or filtered by type
 */
function getTestCases(type) {
  const fixtures = loadFixtures();
  const testCases = fixtures.testCases;

  if (type === undefined) {
    return cloneDeep(testCases);
  }

  if (type === 'dependencyPatterns' || type === 'edgeCases') {
    return cloneDeep(testCases[type]);
  }

  return cloneDeep(testCases);
}

/**
 * Get fixture metadata
 * @returns {Object} Test fixtures metadata
 */
function getFixtureMetadata() {
  const fixtures = loadFixtures();
  return cloneDeep(fixtures.testFixtures);
}

/**
 * Clone a user object for test isolation
 * @param {Object} user - User object to clone
 * @returns {Object} Deep cloned user
 */
function cloneUser(user) {
  return cloneDeep(user);
}

/**
 * Clone a task object for test isolation
 * @param {Object} task - Task object to clone
 * @returns {Object} Deep cloned task
 */
function cloneTask(task) {
  return cloneDeep(task);
}

/**
 * Clone all fixtures for test isolation
 * @returns {Object} Deep cloned fixtures
 */
function cloneFixtures() {
  const fixtures = loadFixtures();
  return {
    testFixtures: cloneDeep(fixtures.testFixtures),
    sampleUsers: cloneDeep(fixtures.sampleUsers),
    sampleTasks: cloneDeep(fixtures.sampleTasks),
    testCases: cloneDeep(fixtures.testCases)
  };
}

/**
 * Generate a mock user with optional overrides
 * @param {Object} [overrides] - Properties to override in generated user
 * @returns {Object} Generated user object
 */
function generateMockUser(overrides = {}) {
  const id = overrides.id || `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const name = overrides.name || `Test User ${Math.random().toString(36).substr(2, 5)}`;
  const email = overrides.email || `user-${Date.now()}@test.example`;

  return {
    id,
    name,
    email,
    ...overrides
  };
}

/**
 * Generate a mock task with optional overrides
 * @param {Object} [overrides] - Properties to override in generated task
 * @returns {Object} Generated task object
 */
function generateMockTask(overrides = {}) {
  const id = overrides.id || `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const title = overrides.title || `Test Task ${Math.random().toString(36).substr(2, 5)}`;
  const status = overrides.status || 'pending';
  const dependencies = overrides.dependencies || [];

  return {
    id,
    title,
    status,
    dependencies,
    ...overrides
  };
}

/**
 * Generate multiple mock users
 * @param {number} count - Number of users to generate
 * @param {Object} [baseOverrides] - Base properties to apply to all users
 * @returns {Array} Array of generated users
 */
function generateMockUsers(count, baseOverrides = {}) {
  const users = [];
  for (let i = 0; i < count; i++) {
    users.push(generateMockUser({ ...baseOverrides }));
  }
  return users;
}

/**
 * Generate multiple mock tasks
 * @param {number} count - Number of tasks to generate
 * @param {Object} [baseOverrides] - Base properties to apply to all tasks
 * @returns {Array} Array of generated tasks
 */
function generateMockTasks(count, baseOverrides = {}) {
  const tasks = [];
  for (let i = 0; i < count; i++) {
    tasks.push(generateMockTask({ ...baseOverrides }));
  }
  return tasks;
}

/**
 * Create a user-task relationship collection for testing
 * @param {number} [userCount=2] - Number of users to include
 * @param {number} [taskCount=5] - Number of tasks to include
 * @returns {Object} Collection with users and tasks
 */
function createTestCollection(userCount = 2, taskCount = 5) {
  return {
    users: generateMockUsers(userCount),
    tasks: generateMockTasks(taskCount),
    metadata: getFixtureMetadata()
  };
}

/**
 * Create a dependency graph test fixture
 * @param {string} pattern - Pattern type ('linear', 'diamond', 'fan-out', 'fan-in', 'cross-phase')
 * @returns {Array} Array of tasks forming the specified dependency pattern
 */
function createDependencyPattern(pattern) {
  const patterns = {
    linear: () => [
      generateMockTask({ id: 'task-1', title: 'Task 1', dependencies: [] }),
      generateMockTask({ id: 'task-2', title: 'Task 2', dependencies: ['task-1'] }),
      generateMockTask({ id: 'task-3', title: 'Task 3', dependencies: ['task-2'] })
    ],
    diamond: () => [
      generateMockTask({ id: 'task-1', title: 'Task 1', dependencies: [] }),
      generateMockTask({ id: 'task-2', title: 'Task 2', dependencies: ['task-1'] }),
      generateMockTask({ id: 'task-3', title: 'Task 3', dependencies: ['task-1'] }),
      generateMockTask({ id: 'task-4', title: 'Task 4', dependencies: ['task-2', 'task-3'] })
    ],
    'fan-out': () => [
      generateMockTask({ id: 'task-1', title: 'Task 1', dependencies: [] }),
      generateMockTask({ id: 'task-2', title: 'Task 2', dependencies: ['task-1'] }),
      generateMockTask({ id: 'task-3', title: 'Task 3', dependencies: ['task-1'] }),
      generateMockTask({ id: 'task-4', title: 'Task 4', dependencies: ['task-1'] })
    ],
    'fan-in': () => [
      generateMockTask({ id: 'task-1', title: 'Task 1', dependencies: [] }),
      generateMockTask({ id: 'task-2', title: 'Task 2', dependencies: [] }),
      generateMockTask({ id: 'task-3', title: 'Task 3', dependencies: [] }),
      generateMockTask({ id: 'task-4', title: 'Task 4', dependencies: ['task-1', 'task-2', 'task-3'] })
    ],
    'cross-phase': () => [
      generateMockTask({ id: 'task-phase1-1', title: 'Phase 1 Task 1', dependencies: [] }),
      generateMockTask({ id: 'task-phase1-2', title: 'Phase 1 Task 2', dependencies: [] }),
      generateMockTask({ id: 'task-phase2-1', title: 'Phase 2 Task 1', dependencies: ['task-phase1-1', 'task-phase1-2'] }),
      generateMockTask({ id: 'task-phase2-2', title: 'Phase 2 Task 2', dependencies: ['task-phase2-1'] })
    ]
  };

  if (patterns[pattern]) {
    return patterns[pattern]();
  }

  throw new Error(`Unknown dependency pattern: ${pattern}`);
}

/**
 * Deep clone utility function
 * @param {*} obj - Object to clone
 * @returns {*} Cloned object
 */
function cloneDeep(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }

  if (obj instanceof Array) {
    return obj.map(item => cloneDeep(item));
  }

  if (obj instanceof Object) {
    const cloned = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = cloneDeep(obj[key]);
      }
    }
    return cloned;
  }

  return obj;
}

// Export all helper functions
module.exports = {
  // Loading functions
  loadFixtures,
  resetCache,

  // Getter functions
  getSampleUsers,
  getSampleTasks,
  getTestCases,
  getFixtureMetadata,

  // Clone functions
  cloneUser,
  cloneTask,
  cloneFixtures,

  // Mock data generators
  generateMockUser,
  generateMockTask,
  generateMockUsers,
  generateMockTasks,

  // Collection creators
  createTestCollection,
  createDependencyPattern,

  // Utility
  cloneDeep
};
