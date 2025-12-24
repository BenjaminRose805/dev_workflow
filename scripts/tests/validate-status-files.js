#!/usr/bin/env node
/**
 * Validate all status.json files against the canonical schema
 */

const fs = require('fs');
const path = require('path');
const schema = require('../lib/schemas/plan-status.json');

const outputsDir = path.join(__dirname, '../../docs/plan-outputs');
const dirs = fs.readdirSync(outputsDir);

let valid = 0;
let invalid = 0;
const issues = [];

for (const dir of dirs) {
  const statusPath = path.join(outputsDir, dir, 'status.json');
  if (!fs.existsSync(statusPath)) continue;

  try {
    const data = JSON.parse(fs.readFileSync(statusPath, 'utf8'));

    // Check required fields
    const missing = [];
    for (const field of schema.required) {
      if (!(field in data)) missing.push(field);
    }

    // Check task ID format (N.N or N.N.N)
    const idPattern = /^\d+\.\d+(\.\d+)?$/;
    let badIds = [];
    if (data.tasks) {
      for (const task of data.tasks) {
        if (task.id && !idPattern.test(task.id)) {
          badIds.push(task.id);
        }
      }
    }

    // Check task status values
    const validStatuses = ['pending', 'in_progress', 'completed', 'failed', 'skipped'];
    let badStatuses = [];
    if (data.tasks) {
      for (const task of data.tasks) {
        if (task.status && !validStatuses.includes(task.status)) {
          badStatuses.push({ id: task.id, status: task.status });
        }
      }
    }

    if (missing.length > 0 || badIds.length > 0 || badStatuses.length > 0) {
      invalid++;
      issues.push({ path: dir + '/status.json', missing, badIds, badStatuses });
    } else {
      valid++;
    }
  } catch (e) {
    invalid++;
    issues.push({ path: dir + '/status.json', error: e.message });
  }
}

console.log(JSON.stringify({ valid, invalid, issues }, null, 2));
