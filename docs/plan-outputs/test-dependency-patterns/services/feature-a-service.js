/**
 * Feature A Service Module - Data Processing
 * Task 6.2: Feature A module (depends: 6.1)
 *
 * Fan-out pattern position:
 *       6.1 (base)
 *     /  |  \
 *  [6.2] 6.3 6.4
 *    |   |   |
 *   6.5 6.6 6.7
 *
 * Purpose: Demonstrates extending the base service with specialized
 * data processing functionality. This service runs in parallel with
 * Feature B (6.3) and Feature C (6.4) once the base service (6.1) completes.
 */

const { BaseService, ServiceStatus, ServiceEvents } = require('./base-service');

/**
 * Supported data formats for transformation
 */
const DataFormat = {
  JSON: 'json',
  CSV: 'csv',
  XML: 'xml',
  YAML: 'yaml'
};

/**
 * Validation rules for different data types
 */
const ValidationRules = {
  STRING: {
    type: 'string',
    validate: (value) => typeof value === 'string'
  },
  NUMBER: {
    type: 'number',
    validate: (value) => typeof value === 'number' && !isNaN(value)
  },
  BOOLEAN: {
    type: 'boolean',
    validate: (value) => typeof value === 'boolean'
  },
  ARRAY: {
    type: 'array',
    validate: (value) => Array.isArray(value)
  },
  OBJECT: {
    type: 'object',
    validate: (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
  },
  DATE: {
    type: 'date',
    validate: (value) => value instanceof Date || !isNaN(Date.parse(value))
  }
};

/**
 * Default configuration for Feature A Service
 */
const FEATURE_A_CONFIG = {
  name: 'FeatureAService',
  version: '1.0.0',
  maxBatchSize: 1000,
  processingTimeout: 10000,
  enableCaching: true,
  cacheMaxSize: 500
};

/**
 * Feature A Service Class - Data Processing
 * Extends BaseService with data processing, validation, and transformation capabilities
 */
class FeatureAService extends BaseService {
  /**
   * Create a new Feature A service instance
   * @param {Object} config - Service configuration
   */
  constructor(config = {}) {
    super({ ...FEATURE_A_CONFIG, ...config });

    // Data processing specific state
    this.processingQueue = [];
    this.cache = new Map();
    this.processingMetrics = {
      totalProcessed: 0,
      successfulProcessed: 0,
      failedProcessed: 0,
      totalValidations: 0,
      validationFailures: 0,
      totalTransformations: 0,
      transformationFailures: 0,
      averageProcessingTime: 0,
      processingTimes: []
    };
  }

  /**
   * Initialize the service
   * Sets up data processing resources
   * @protected
   * @returns {Promise<void>}
   */
  async _initialize() {
    // Clear any existing state
    this.processingQueue = [];
    this.cache.clear();

    // Reset processing metrics
    this.processingMetrics = {
      totalProcessed: 0,
      successfulProcessed: 0,
      failedProcessed: 0,
      totalValidations: 0,
      validationFailures: 0,
      totalTransformations: 0,
      transformationFailures: 0,
      averageProcessingTime: 0,
      processingTimes: []
    };

    // Simulate async initialization (e.g., connecting to data sources)
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  /**
   * Cleanup the service
   * Releases data processing resources
   * @protected
   * @returns {Promise<void>}
   */
  async _cleanup() {
    // Process any remaining items in the queue
    if (this.processingQueue.length > 0) {
      console.warn(`FeatureAService: Discarding ${this.processingQueue.length} items from processing queue`);
    }

    // Clear the cache
    this.cache.clear();

    // Clear the queue
    this.processingQueue = [];

    // Simulate async cleanup
    await new Promise(resolve => setTimeout(resolve, 25));
  }

  /**
   * Process data with tracking and metrics
   * @param {*} input - The data to process
   * @param {Object} options - Processing options
   * @param {boolean} options.validate - Whether to validate before processing
   * @param {string} options.outputFormat - Desired output format
   * @returns {Promise<Object>} Processing result
   */
  async processData(input, options = {}) {
    if (!this.isRunning()) {
      return {
        success: false,
        error: 'Service is not running'
      };
    }

    const startTime = Date.now();
    this.trackRequest();
    this.processingMetrics.totalProcessed++;

    try {
      // Check cache if enabled
      const cacheKey = this._generateCacheKey(input, options);
      if (this.config.enableCaching && this.cache.has(cacheKey)) {
        const cachedResult = this.cache.get(cacheKey);
        return {
          success: true,
          data: cachedResult,
          cached: true,
          processingTime: 0
        };
      }

      // Validate if requested
      if (options.validate !== false) {
        const validationResult = this.validateData(input);
        if (!validationResult.valid) {
          this.processingMetrics.failedProcessed++;
          return {
            success: false,
            error: 'Validation failed',
            validationErrors: validationResult.errors
          };
        }
      }

      // Process the data
      let processedData = await this._performProcessing(input);

      // Transform if output format specified
      if (options.outputFormat) {
        const transformResult = this.transformData(processedData, options.outputFormat);
        if (!transformResult.success) {
          this.processingMetrics.failedProcessed++;
          return transformResult;
        }
        processedData = transformResult.data;
      }

      const processingTime = Date.now() - startTime;
      this._updateProcessingMetrics(processingTime);
      this.processingMetrics.successfulProcessed++;

      // Cache the result if enabled
      if (this.config.enableCaching) {
        this._cacheResult(cacheKey, processedData);
      }

      return {
        success: true,
        data: processedData,
        cached: false,
        processingTime
      };
    } catch (error) {
      this.trackError(error);
      this.processingMetrics.failedProcessed++;

      return {
        success: false,
        error: error.message,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Validate input data
   * @param {*} data - The data to validate
   * @param {Object} schema - Optional validation schema
   * @returns {Object} Validation result
   */
  validateData(data, schema = null) {
    this.processingMetrics.totalValidations++;

    const errors = [];

    // Basic null/undefined check
    if (data === null || data === undefined) {
      errors.push('Data cannot be null or undefined');
      this.processingMetrics.validationFailures++;
      return { valid: false, errors };
    }

    // If schema is provided, validate against it
    if (schema) {
      const schemaErrors = this._validateAgainstSchema(data, schema);
      if (schemaErrors.length > 0) {
        errors.push(...schemaErrors);
      }
    }

    // Type-specific validation
    if (Array.isArray(data)) {
      if (data.length === 0) {
        errors.push('Array cannot be empty');
      }
      if (data.length > this.config.maxBatchSize) {
        errors.push(`Array exceeds maximum batch size of ${this.config.maxBatchSize}`);
      }
    } else if (typeof data === 'object') {
      if (Object.keys(data).length === 0) {
        errors.push('Object cannot be empty');
      }
    } else if (typeof data === 'string') {
      if (data.trim().length === 0) {
        errors.push('String cannot be empty or whitespace only');
      }
    }

    if (errors.length > 0) {
      this.processingMetrics.validationFailures++;
      return { valid: false, errors };
    }

    return { valid: true, errors: [] };
  }

  /**
   * Transform data to specified format
   * @param {*} data - The data to transform
   * @param {string} format - Target format (json, csv, xml, yaml)
   * @returns {Object} Transformation result
   */
  transformData(data, format) {
    this.processingMetrics.totalTransformations++;

    const normalizedFormat = format.toLowerCase();

    if (!Object.values(DataFormat).includes(normalizedFormat)) {
      this.processingMetrics.transformationFailures++;
      return {
        success: false,
        error: `Unsupported format: ${format}. Supported formats: ${Object.values(DataFormat).join(', ')}`
      };
    }

    try {
      let transformedData;

      switch (normalizedFormat) {
        case DataFormat.JSON:
          transformedData = this._toJSON(data);
          break;
        case DataFormat.CSV:
          transformedData = this._toCSV(data);
          break;
        case DataFormat.XML:
          transformedData = this._toXML(data);
          break;
        case DataFormat.YAML:
          transformedData = this._toYAML(data);
          break;
        default:
          throw new Error(`Transform not implemented for format: ${format}`);
      }

      return {
        success: true,
        data: transformedData,
        format: normalizedFormat
      };
    } catch (error) {
      this.processingMetrics.transformationFailures++;
      this.trackError(error);
      return {
        success: false,
        error: `Transformation failed: ${error.message}`
      };
    }
  }

  /**
   * Get processing metrics
   * @returns {Object} Processing metrics
   */
  getProcessingMetrics() {
    return {
      ...this.processingMetrics,
      cacheSize: this.cache.size,
      queueSize: this.processingQueue.length,
      cacheHitRate: this._calculateCacheHitRate()
    };
  }

  /**
   * Clear the processing cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get extended service info including processing metrics
   * @returns {Object} Extended service info
   */
  getInfo() {
    const baseInfo = super.getInfo();
    return {
      ...baseInfo,
      processingMetrics: this.getProcessingMetrics()
    };
  }

  // ==================== Private Methods ====================

  /**
   * Perform the actual data processing
   * @private
   * @param {*} input - Input data
   * @returns {Promise<*>} Processed data
   */
  async _performProcessing(input) {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 5));

    // Process based on data type
    if (Array.isArray(input)) {
      return input.map(item => this._processItem(item));
    } else if (typeof input === 'object' && input !== null) {
      return this._processObject(input);
    } else {
      return this._processPrimitive(input);
    }
  }

  /**
   * Process a single item
   * @private
   */
  _processItem(item) {
    if (typeof item === 'object' && item !== null) {
      return this._processObject(item);
    }
    return this._processPrimitive(item);
  }

  /**
   * Process an object
   * @private
   */
  _processObject(obj) {
    const processed = {};
    for (const [key, value] of Object.entries(obj)) {
      // Normalize key names
      const normalizedKey = key.trim().toLowerCase().replace(/\s+/g, '_');

      // Process nested values
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        processed[normalizedKey] = this._processObject(value);
      } else if (Array.isArray(value)) {
        processed[normalizedKey] = value.map(item => this._processItem(item));
      } else {
        processed[normalizedKey] = this._processPrimitive(value);
      }
    }

    // Add metadata
    processed._processed = true;
    processed._processedAt = new Date().toISOString();

    return processed;
  }

  /**
   * Process a primitive value
   * @private
   */
  _processPrimitive(value) {
    if (typeof value === 'string') {
      return value.trim();
    }
    return value;
  }

  /**
   * Validate data against a schema
   * @private
   */
  _validateAgainstSchema(data, schema) {
    const errors = [];

    for (const [field, rule] of Object.entries(schema)) {
      const value = data[field];

      if (rule.required && (value === undefined || value === null)) {
        errors.push(`Field '${field}' is required`);
        continue;
      }

      if (value !== undefined && value !== null && rule.type) {
        const validator = ValidationRules[rule.type.toUpperCase()];
        if (validator && !validator.validate(value)) {
          errors.push(`Field '${field}' must be of type ${rule.type}`);
        }
      }

      if (rule.minLength && typeof value === 'string' && value.length < rule.minLength) {
        errors.push(`Field '${field}' must be at least ${rule.minLength} characters`);
      }

      if (rule.maxLength && typeof value === 'string' && value.length > rule.maxLength) {
        errors.push(`Field '${field}' must be at most ${rule.maxLength} characters`);
      }

      if (rule.min !== undefined && typeof value === 'number' && value < rule.min) {
        errors.push(`Field '${field}' must be at least ${rule.min}`);
      }

      if (rule.max !== undefined && typeof value === 'number' && value > rule.max) {
        errors.push(`Field '${field}' must be at most ${rule.max}`);
      }
    }

    return errors;
  }

  /**
   * Generate a cache key for the input and options
   * @private
   */
  _generateCacheKey(input, options) {
    const inputStr = JSON.stringify(input);
    const optionsStr = JSON.stringify(options);
    return `${this._hashString(inputStr)}_${this._hashString(optionsStr)}`;
  }

  /**
   * Simple hash function for strings
   * @private
   */
  _hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Cache a result with LRU-style eviction
   * @private
   */
  _cacheResult(key, data) {
    // Evict oldest entries if cache is full
    while (this.cache.size >= this.config.cacheMaxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, data);
  }

  /**
   * Update processing time metrics
   * @private
   */
  _updateProcessingMetrics(processingTime) {
    this.processingMetrics.processingTimes.push(processingTime);

    // Keep only the last 100 processing times for average calculation
    if (this.processingMetrics.processingTimes.length > 100) {
      this.processingMetrics.processingTimes.shift();
    }

    // Calculate new average
    const sum = this.processingMetrics.processingTimes.reduce((a, b) => a + b, 0);
    this.processingMetrics.averageProcessingTime =
      Math.round(sum / this.processingMetrics.processingTimes.length);
  }

  /**
   * Calculate cache hit rate
   * @private
   */
  _calculateCacheHitRate() {
    const total = this.processingMetrics.totalProcessed;
    if (total === 0) return 0;

    // Estimate cache hits from the difference between total and actual processing
    // This is a simplified calculation
    const nonCached = this.processingMetrics.successfulProcessed +
                      this.processingMetrics.failedProcessed;
    const cacheHits = total - nonCached;

    return Math.round((cacheHits / total) * 100);
  }

  /**
   * Convert data to JSON string
   * @private
   */
  _toJSON(data) {
    return JSON.stringify(data, null, 2);
  }

  /**
   * Convert data to CSV format
   * @private
   */
  _toCSV(data) {
    if (!Array.isArray(data)) {
      data = [data];
    }

    if (data.length === 0) {
      return '';
    }

    // Get headers from first object
    const firstItem = data[0];
    if (typeof firstItem !== 'object' || firstItem === null) {
      return data.join('\n');
    }

    const headers = Object.keys(firstItem).filter(k => !k.startsWith('_'));
    const rows = [headers.join(',')];

    for (const item of data) {
      const values = headers.map(header => {
        const value = item[header];
        if (value === null || value === undefined) {
          return '';
        }
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return String(value);
      });
      rows.push(values.join(','));
    }

    return rows.join('\n');
  }

  /**
   * Convert data to XML format
   * @private
   */
  _toXML(data, rootName = 'root') {
    const xmlParts = ['<?xml version="1.0" encoding="UTF-8"?>'];
    xmlParts.push(`<${rootName}>`);
    xmlParts.push(this._objectToXML(data));
    xmlParts.push(`</${rootName}>`);
    return xmlParts.join('\n');
  }

  /**
   * Convert object to XML elements
   * @private
   */
  _objectToXML(obj, indent = '  ') {
    if (Array.isArray(obj)) {
      return obj.map(item => `${indent}<item>\n${this._objectToXML(item, indent + '  ')}\n${indent}</item>`).join('\n');
    }

    if (typeof obj !== 'object' || obj === null) {
      return `${indent}${this._escapeXML(String(obj))}`;
    }

    const parts = [];
    for (const [key, value] of Object.entries(obj)) {
      if (key.startsWith('_')) continue;

      const safeKey = key.replace(/[^a-zA-Z0-9_]/g, '_');

      if (typeof value === 'object' && value !== null) {
        parts.push(`${indent}<${safeKey}>\n${this._objectToXML(value, indent + '  ')}\n${indent}</${safeKey}>`);
      } else {
        parts.push(`${indent}<${safeKey}>${this._escapeXML(String(value))}</${safeKey}>`);
      }
    }
    return parts.join('\n');
  }

  /**
   * Escape XML special characters
   * @private
   */
  _escapeXML(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Convert data to YAML format
   * @private
   */
  _toYAML(data, indent = 0) {
    const spaces = '  '.repeat(indent);

    if (Array.isArray(data)) {
      if (data.length === 0) return '[]';
      return data.map(item => {
        if (typeof item === 'object' && item !== null) {
          return `${spaces}- \n${this._toYAML(item, indent + 2)}`;
        }
        return `${spaces}- ${this._yamlValue(item)}`;
      }).join('\n');
    }

    if (typeof data !== 'object' || data === null) {
      return this._yamlValue(data);
    }

    const lines = [];
    for (const [key, value] of Object.entries(data)) {
      if (key.startsWith('_')) continue;

      if (typeof value === 'object' && value !== null) {
        lines.push(`${spaces}${key}:`);
        lines.push(this._toYAML(value, indent + 1));
      } else {
        lines.push(`${spaces}${key}: ${this._yamlValue(value)}`);
      }
    }
    return lines.join('\n');
  }

  /**
   * Format a value for YAML
   * @private
   */
  _yamlValue(value) {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'number') return String(value);
    if (typeof value === 'string') {
      if (value.includes('\n') || value.includes(':') || value.includes('#')) {
        return `"${value.replace(/"/g, '\\"')}"`;
      }
      return value;
    }
    return String(value);
  }
}

module.exports = {
  FeatureAService,
  DataFormat,
  ValidationRules,
  FEATURE_A_CONFIG
};
