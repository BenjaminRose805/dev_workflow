/**
 * JSON Schema exports for agent output validation
 *
 * Provides schemas for validating different types of agent outputs:
 * - researchResult: Generic research agent findings
 * - verifyResult: Task verification status
 * - analysisResult: Deep analysis with recommendations
 */

const researchResultSchema = require('./research-result.json');
const verifyResultSchema = require('./verify-result.json');
const analysisResultSchema = require('./analysis-result.json');
const planStatusSchema = require('./plan-status.json');

module.exports = {
  researchResult: researchResultSchema,
  verifyResult: verifyResultSchema,
  analysisResult: analysisResultSchema,
  planStatus: planStatusSchema,
};
