/**
 * YAML Frontmatter Parser
 * Extracts and parses YAML frontmatter from markdown files.
 */

const matter = require('gray-matter');

/**
 * Parse YAML frontmatter from markdown content
 * @param {string} content - Raw markdown content
 * @returns {{ data: object, content: string }} Parsed frontmatter and remaining content
 */
function parseFrontmatter(content) {
  try {
    const result = matter(content);
    return {
      data: result.data || {},
      content: result.content || ''
    };
  } catch (error) {
    return {
      data: {},
      content: content,
      error: error.message
    };
  }
}

/**
 * Check if content has valid frontmatter
 * @param {string} content - Raw markdown content
 * @returns {boolean}
 */
function hasFrontmatter(content) {
  return content.trim().startsWith('---');
}

/**
 * Extract specific frontmatter fields
 * @param {string} content - Raw markdown content
 * @param {string[]} fields - Fields to extract
 * @returns {object} Extracted fields
 */
function extractFields(content, fields) {
  const { data } = parseFrontmatter(content);
  const result = {};
  for (const field of fields) {
    if (field in data) {
      result[field] = data[field];
    }
  }
  return result;
}

module.exports = {
  parseFrontmatter,
  hasFrontmatter,
  extractFields
};
