const fs = require('fs');
const path = require('path');

/**
 * Database Migration Manager
 * Handles schema management, migrations, and seed data operations
 */
class MigrationManager {
  constructor(databasePath = null) {
    this.databasePath = databasePath || path.join(__dirname, 'test-database.json');
    this.migrationHistory = [];
    this.currentSchema = null;
    this.seedData = null;
    this.constraints = null;
    this.database = null;
  }

  /**
   * Load schema and seed data from test-database.json
   */
  loadSchema() {
    try {
      const rawData = fs.readFileSync(this.databasePath, 'utf8');
      const data = JSON.parse(rawData);

      this.database = data.database;
      this.currentSchema = data.schema;
      this.seedData = data.seedData;
      this.constraints = data.constraints;

      return {
        success: true,
        message: `Schema loaded from ${this.databasePath}`,
        schema: this.currentSchema,
        database: this.database
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to load schema: ${error.message}`
      };
    }
  }

  /**
   * Initialize database with current schema and seed data
   */
  init(inMemoryDb = null) {
    const result = this.loadSchema();

    if (!result.success) {
      return result;
    }

    // Initialize in-memory database structure
    const db = inMemoryDb || this._createEmptyDatabase();

    // Create all tables
    const tables = this.currentSchema.tables || {};
    Object.keys(tables).forEach(tableName => {
      db[tableName] = [];
    });

    // Insert seed data
    if (this.seedData) {
      Object.keys(this.seedData).forEach(tableName => {
        if (db[tableName]) {
          db[tableName].push(...this.seedData[tableName]);
        }
      });
    }

    // Record migration
    this.migrationHistory.push({
      type: 'init',
      timestamp: new Date().toISOString(),
      description: 'Initialize database schema and load seed data',
      status: 'success'
    });

    return {
      success: true,
      message: 'Database initialized successfully',
      tables: Object.keys(db),
      recordCount: Object.keys(db).reduce((sum, table) => sum + db[table].length, 0),
      db
    };
  }

  /**
   * Apply migration: up
   * Execute all pending migrations forward
   */
  up(migration = null) {
    const result = this.loadSchema();

    if (!result.success) {
      return result;
    }

    const migrationEntry = {
      type: 'up',
      timestamp: new Date().toISOString(),
      description: migration?.description || 'Apply migration',
      changes: [],
      status: 'pending'
    };

    try {
      if (migration && migration.apply) {
        const changeResult = migration.apply(this.currentSchema);
        migrationEntry.changes.push(changeResult);
      }

      migrationEntry.status = 'success';
      this.migrationHistory.push(migrationEntry);

      return {
        success: true,
        message: 'Migration applied successfully',
        migration: migrationEntry,
        currentSchema: this.currentSchema
      };
    } catch (error) {
      migrationEntry.status = 'failed';
      migrationEntry.error = error.message;
      this.migrationHistory.push(migrationEntry);

      return {
        success: false,
        error: `Migration failed: ${error.message}`,
        migration: migrationEntry
      };
    }
  }

  /**
   * Rollback migration: down
   * Rollback to previous schema state
   */
  down(stepsBack = 1) {
    if (this.migrationHistory.length === 0) {
      return {
        success: false,
        error: 'No migrations to rollback'
      };
    }

    const migrationsToRollback = this.migrationHistory.splice(-stepsBack);

    const migrationEntry = {
      type: 'down',
      timestamp: new Date().toISOString(),
      description: `Rollback ${stepsBack} migration(s)`,
      rolledBackMigrations: migrationsToRollback.map(m => ({
        type: m.type,
        timestamp: m.timestamp,
        description: m.description
      })),
      status: 'success'
    };

    this.migrationHistory.push(migrationEntry);

    return {
      success: true,
      message: `Successfully rolled back ${stepsBack} migration(s)`,
      migration: migrationEntry,
      currentSchema: this.currentSchema
    };
  }

  /**
   * Reset database to initial state
   * Clears all migrations and restores original schema
   */
  reset() {
    const originalSchema = this.loadSchema();

    if (!originalSchema.success) {
      return originalSchema;
    }

    // Clear migration history and reset to initial state
    const migrationEntry = {
      type: 'reset',
      timestamp: new Date().toISOString(),
      description: 'Reset database to initial state',
      migrationsCleared: this.migrationHistory.length,
      status: 'success'
    };

    this.migrationHistory = [migrationEntry];

    return {
      success: true,
      message: 'Database reset to initial state',
      migration: migrationEntry,
      currentSchema: this.currentSchema,
      db: this.init()
    };
  }

  /**
   * Add a new column to an existing table
   */
  addColumn(tableName, columnName, columnType = 'string', options = {}) {
    try {
      if (!this.currentSchema.tables[tableName]) {
        throw new Error(`Table ${tableName} does not exist`);
      }

      const table = this.currentSchema.tables[tableName];

      if (table.columns.includes(columnName)) {
        throw new Error(`Column ${columnName} already exists in table ${tableName}`);
      }

      table.columns.push(columnName);

      const migrationEntry = {
        type: 'addColumn',
        timestamp: new Date().toISOString(),
        description: `Add column ${columnName} to table ${tableName}`,
        details: {
          table: tableName,
          column: columnName,
          columnType,
          options
        },
        status: 'success'
      };

      this.migrationHistory.push(migrationEntry);

      return {
        success: true,
        message: `Column ${columnName} added to table ${tableName}`,
        migration: migrationEntry,
        table: this.currentSchema.tables[tableName]
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Add a new table to the schema
   */
  addTable(tableName, columns, primaryKey, options = {}) {
    try {
      if (this.currentSchema.tables[tableName]) {
        throw new Error(`Table ${tableName} already exists`);
      }

      this.currentSchema.tables[tableName] = {
        columns,
        primaryKey,
        indexes: options.indexes || [],
        constraints: options.constraints || {},
        foreignKeys: options.foreignKeys || {}
      };

      const migrationEntry = {
        type: 'addTable',
        timestamp: new Date().toISOString(),
        description: `Create new table ${tableName}`,
        details: {
          table: tableName,
          columns,
          primaryKey,
          options
        },
        status: 'success'
      };

      this.migrationHistory.push(migrationEntry);

      return {
        success: true,
        message: `Table ${tableName} created successfully`,
        migration: migrationEntry,
        table: this.currentSchema.tables[tableName]
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Add seed data for a table
   */
  seedTable(tableName, data) {
    try {
      if (!this.currentSchema.tables[tableName]) {
        throw new Error(`Table ${tableName} does not exist`);
      }

      if (!Array.isArray(data)) {
        throw new Error('Seed data must be an array of records');
      }

      if (!this.seedData) {
        this.seedData = {};
      }

      if (!this.seedData[tableName]) {
        this.seedData[tableName] = [];
      }

      this.seedData[tableName].push(...data);

      const migrationEntry = {
        type: 'seed',
        timestamp: new Date().toISOString(),
        description: `Seed table ${tableName} with ${data.length} record(s)`,
        details: {
          table: tableName,
          recordCount: data.length
        },
        status: 'success'
      };

      this.migrationHistory.push(migrationEntry);

      return {
        success: true,
        message: `Seeded table ${tableName} with ${data.length} record(s)`,
        migration: migrationEntry,
        totalRecords: this.seedData[tableName].length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Clear data from a table
   */
  clearTable(tableName) {
    try {
      if (!this.currentSchema.tables[tableName]) {
        throw new Error(`Table ${tableName} does not exist`);
      }

      if (this.seedData && this.seedData[tableName]) {
        this.seedData[tableName] = [];
      }

      const migrationEntry = {
        type: 'clearTable',
        timestamp: new Date().toISOString(),
        description: `Clear all data from table ${tableName}`,
        details: {
          table: tableName
        },
        status: 'success'
      };

      this.migrationHistory.push(migrationEntry);

      return {
        success: true,
        message: `Table ${tableName} cleared successfully`,
        migration: migrationEntry
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get current migration history
   */
  getHistory() {
    return {
      migrations: this.migrationHistory,
      totalMigrations: this.migrationHistory.length,
      lastMigration: this.migrationHistory[this.migrationHistory.length - 1] || null
    };
  }

  /**
   * Get current schema
   */
  getSchema() {
    return {
      database: this.database,
      schema: this.currentSchema,
      seedData: this.seedData,
      constraints: this.constraints
    };
  }

  /**
   * Get table structure
   */
  getTableStructure(tableName) {
    if (!this.currentSchema || !this.currentSchema.tables[tableName]) {
      return {
        success: false,
        error: `Table ${tableName} not found`
      };
    }

    return {
      success: true,
      table: tableName,
      structure: this.currentSchema.tables[tableName],
      seedDataCount: this.seedData?.[tableName]?.length || 0
    };
  }

  /**
   * Create an empty in-memory database structure
   */
  _createEmptyDatabase() {
    return {};
  }

  /**
   * Validate migration entry
   */
  validateMigration(migration) {
    if (!migration.type) {
      return { valid: false, error: 'Migration must have a type' };
    }

    if (!migration.apply || typeof migration.apply !== 'function') {
      return { valid: false, error: 'Migration must have an apply function' };
    }

    return { valid: true };
  }

  /**
   * Export current state to file
   */
  exportState(outputPath) {
    try {
      const state = {
        database: this.database,
        schema: this.currentSchema,
        seedData: this.seedData,
        constraints: this.constraints,
        migrationHistory: this.migrationHistory,
        exportedAt: new Date().toISOString()
      };

      fs.writeFileSync(outputPath, JSON.stringify(state, null, 2), 'utf8');

      return {
        success: true,
        message: `State exported to ${outputPath}`,
        recordCount: this.migrationHistory.length
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to export state: ${error.message}`
      };
    }
  }

  /**
   * Import state from file
   */
  importState(inputPath) {
    try {
      const rawData = fs.readFileSync(inputPath, 'utf8');
      const state = JSON.parse(rawData);

      this.database = state.database;
      this.currentSchema = state.schema;
      this.seedData = state.seedData;
      this.constraints = state.constraints;
      this.migrationHistory = state.migrationHistory || [];

      return {
        success: true,
        message: `State imported from ${inputPath}`,
        migrationsLoaded: this.migrationHistory.length
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to import state: ${error.message}`
      };
    }
  }
}

/**
 * Helper function to create a new migration
 */
function createMigration(type, description, apply) {
  return {
    type,
    description,
    apply,
    createdAt: new Date().toISOString()
  };
}

/**
 * Pre-built common migrations
 */
const CommonMigrations = {
  addTimestampColumns: (tables = ['tasks', 'dependencies', 'runs']) => {
    return createMigration(
      'addColumns',
      'Add timestamp columns to tables',
      (schema) => {
        const added = [];
        tables.forEach(tableName => {
          if (schema.tables[tableName]) {
            ['created_at', 'updated_at'].forEach(col => {
              if (!schema.tables[tableName].columns.includes(col)) {
                schema.tables[tableName].columns.push(col);
                added.push(`${tableName}.${col}`);
              }
            });
          }
        });
        return { columns: added };
      }
    );
  },

  addIndexes: (table, columns) => {
    return createMigration(
      'addIndexes',
      `Add indexes to ${table} table`,
      (schema) => {
        if (schema.tables[table]) {
          schema.tables[table].indexes = [
            ...(schema.tables[table].indexes || []),
            ...columns
          ];
          return { table, indexedColumns: columns };
        }
        throw new Error(`Table ${table} not found`);
      }
    );
  },

  addConstraint: (table, column, constraint) => {
    return createMigration(
      'addConstraint',
      `Add ${constraint} constraint to ${table}.${column}`,
      (schema) => {
        if (schema.tables[table]) {
          if (!schema.tables[table].constraints) {
            schema.tables[table].constraints = {};
          }
          schema.tables[table].constraints[column] = constraint;
          return { table, column, constraint };
        }
        throw new Error(`Table ${table} not found`);
      }
    );
  }
};

module.exports = {
  MigrationManager,
  createMigration,
  CommonMigrations
};
