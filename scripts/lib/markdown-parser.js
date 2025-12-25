/**
 * @module markdown-parser
 * @description Extracts tasks, headings, and structure from markdown files.
 *
 * This module provides utilities for parsing markdown plan files:
 * - Task extraction (checkboxes)
 * - Phase parsing (## Phase N: Title)
 * - Heading extraction
 * - Title extraction (first H1)
 *
 * @example
 * const { parsePhases, getTitle, countTasks } = require('./lib/markdown-parser');
 *
 * const content = fs.readFileSync('docs/plans/my-plan.md', 'utf8');
 * const title = getTitle(content);
 * const phases = parsePhases(content);
 * const { total, complete } = countTasks(content);
 */

/**
 * Extract all tasks from markdown content
 * @param {string} content - Markdown content
 * @returns {Array<{ line: number, text: string, complete: boolean }>}
 */
function extractTasks(content) {
  const lines = content.split('\n');
  const tasks = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const incompleteMatch = line.match(/^(\s*)-\s*\[\s*\]\s*(.+)$/);
    const completeMatch = line.match(/^(\s*)-\s*\[x\]\s*(.+)$/i);

    if (incompleteMatch) {
      tasks.push({
        line: i + 1,
        text: incompleteMatch[2].trim(),
        complete: false,
        indent: incompleteMatch[1].length
      });
    } else if (completeMatch) {
      tasks.push({
        line: i + 1,
        text: completeMatch[2].trim(),
        complete: true,
        indent: completeMatch[1].length
      });
    }
  }

  return tasks;
}

/**
 * Parse phases from markdown content
 * @param {string} content - Markdown content
 * @returns {Array<{ id: string, name: string, line: number, tasks: Array }>}
 */
function parsePhases(content) {
  const lines = content.split('\n');
  const phases = [];
  let currentPhase = null;
  let taskIdCounter = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Match phase headings like "## Phase 0: Infrastructure Setup"
    const phaseMatch = line.match(/^##\s*Phase\s*(\d+):\s*(.+)$/i);
    if (phaseMatch) {
      if (currentPhase) {
        phases.push(currentPhase);
      }
      currentPhase = {
        id: phaseMatch[1],
        name: phaseMatch[2].trim(),
        line: i + 1,
        tasks: []
      };
      taskIdCounter = 1;
      continue;
    }

    // Match tasks within a phase
    if (currentPhase) {
      const incompleteMatch = line.match(/^-\s*\[\s*\]\s*(.+)$/);
      const completeMatch = line.match(/^-\s*\[x\]\s*(.+)$/i);

      if (incompleteMatch || completeMatch) {
        const text = (incompleteMatch?.[1] || completeMatch?.[1])?.trim() || '';
        const complete = !!completeMatch;

        // Extract priority markers
        let priority = 'MEDIUM';
        if (text.includes('(CRITICAL)')) priority = 'CRITICAL';
        else if (text.includes('(HIGH)')) priority = 'HIGH';
        else if (text.includes('(LOW)')) priority = 'LOW';

        currentPhase.tasks.push({
          id: `${currentPhase.id}.${taskIdCounter}`,
          title: text.replace(/\s*\((CRITICAL|HIGH|MEDIUM|LOW)\)/gi, '').trim(),
          line: i + 1,
          complete,
          priority
        });
        taskIdCounter++;
      }
    }
  }

  // Don't forget the last phase
  if (currentPhase) {
    phases.push(currentPhase);
  }

  return phases;
}

/**
 * Extract all headings from markdown
 * @param {string} content - Markdown content
 * @returns {Array<{ level: number, text: string, line: number }>}
 */
function extractHeadings(content) {
  const lines = content.split('\n');
  const headings = [];

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      headings.push({
        level: match[1].length,
        text: match[2].trim(),
        line: i + 1
      });
    }
  }

  return headings;
}

/**
 * Get title from markdown (first H1)
 * @param {string} content - Markdown content
 * @returns {string|null}
 */
function getTitle(content) {
  const headings = extractHeadings(content);
  const h1 = headings.find(h => h.level === 1);
  return h1 ? h1.text : null;
}

/**
 * Count tasks in markdown
 * @param {string} content - Markdown content
 * @returns {{ total: number, complete: number, incomplete: number }}
 */
function countTasks(content) {
  const tasks = extractTasks(content);
  const complete = tasks.filter(t => t.complete).length;
  return {
    total: tasks.length,
    complete,
    incomplete: tasks.length - complete
  };
}

module.exports = {
  extractTasks,
  parsePhases,
  extractHeadings,
  getTitle,
  countTasks
};
