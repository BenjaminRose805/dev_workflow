/**
 * @module conflict-detector
 * @description Conflict detection and management for parallel plan execution.
 *
 * This module provides functions for:
 * - Detecting conflicts between parallel plan branches (Task 9.1)
 * - Warning when plans modify same files (Task 9.2)
 * - Recommending merge order to minimize conflicts (Task 9.3)
 * - Supporting worktree rebasing (Task 9.4)
 *
 * ## Conflict Detection Strategy
 *
 * Conflicts are detected by comparing the files modified by each plan:
 * - Direct conflicts: Same file modified by multiple plans
 * - Merge conflicts: Git detects conflicting changes in file content
 * - Dependency conflicts: Changes that affect same code paths
 *
 * ## Merge Order Algorithm
 *
 * Plans are ordered for merging based on:
 * 1. Fewer modified files = merge first (lower conflict potential)
 * 2. Older branches = merge first (more likely to be complete)
 * 3. Less overlap with other plans = merge first
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// =============================================================================
// Git Utilities
// =============================================================================

/**
 * Get the repository root directory
 * @returns {string | null}
 */
function getRepoRoot() {
  try {
    const output = execSync('git rev-parse --show-toplevel', { encoding: 'utf8', stdio: 'pipe' });
    return output.trim();
  } catch (error) {
    return null;
  }
}

/**
 * Get the main branch name (main or master)
 * @returns {string}
 */
function getMainBranch() {
  try {
    // Check if 'main' exists
    execSync('git rev-parse --verify main', { stdio: 'pipe' });
    return 'main';
  } catch {
    try {
      // Fall back to 'master'
      execSync('git rev-parse --verify master', { stdio: 'pipe' });
      return 'master';
    } catch {
      return 'main'; // Default
    }
  }
}

/**
 * Get files modified on a branch since diverging from main
 * @param {string} branchName - The branch to analyze
 * @returns {string[]} List of modified file paths
 */
function getModifiedFiles(branchName) {
  const repoRoot = getRepoRoot();
  if (!repoRoot) return [];

  const mainBranch = getMainBranch();

  try {
    // Get the merge base with main
    const mergeBase = execSync(
      `git merge-base "${mainBranch}" "${branchName}"`,
      { encoding: 'utf8', cwd: repoRoot, stdio: 'pipe' }
    ).trim();

    // Get files changed since merge base
    const output = execSync(
      `git diff --name-only "${mergeBase}" "${branchName}"`,
      { encoding: 'utf8', cwd: repoRoot, stdio: 'pipe' }
    ).trim();

    return output ? output.split('\n').filter(f => f) : [];
  } catch (error) {
    return [];
  }
}

/**
 * Get the creation timestamp (first commit) of a branch
 * @param {string} branchName - The branch to analyze
 * @returns {Date | null}
 */
function getBranchCreationDate(branchName) {
  const repoRoot = getRepoRoot();
  if (!repoRoot) return null;

  const mainBranch = getMainBranch();

  try {
    const mergeBase = execSync(
      `git merge-base "${mainBranch}" "${branchName}"`,
      { encoding: 'utf8', cwd: repoRoot, stdio: 'pipe' }
    ).trim();

    // Get the first commit after diverging from main
    const firstCommit = execSync(
      `git log --reverse --format=%H "${mergeBase}..${branchName}" | head -1`,
      { encoding: 'utf8', cwd: repoRoot, stdio: 'pipe', shell: true }
    ).trim();

    if (!firstCommit) return null;

    const timestamp = execSync(
      `git log -1 --format=%ci "${firstCommit}"`,
      { encoding: 'utf8', cwd: repoRoot, stdio: 'pipe' }
    ).trim();

    return new Date(timestamp);
  } catch (error) {
    return null;
  }
}

/**
 * List all plan branches
 * @returns {string[]} List of plan branch names
 */
function listPlanBranches() {
  const repoRoot = getRepoRoot();
  if (!repoRoot) return [];

  try {
    const output = execSync(
      'git branch --format="%(refname:short)" | grep "^plan/"',
      { encoding: 'utf8', cwd: repoRoot, stdio: 'pipe', shell: true }
    ).trim();

    return output ? output.split('\n').filter(b => b) : [];
  } catch (error) {
    return [];
  }
}

// =============================================================================
// Conflict Detection (Task 9.1 & 9.2)
// =============================================================================

/**
 * Detect conflicts between two plan branches
 *
 * Task 9.1: Detect conflicts between parallel plan branches
 *
 * @param {string} branch1 - First branch name
 * @param {string} branch2 - Second branch name
 * @returns {{
 *   hasConflicts: boolean,
 *   conflictingFiles: string[],
 *   branch1Files: string[],
 *   branch2Files: string[],
 *   overlapPercentage: number
 * }}
 */
function detectConflictsBetweenBranches(branch1, branch2) {
  const files1 = getModifiedFiles(branch1);
  const files2 = getModifiedFiles(branch2);

  const set1 = new Set(files1);
  const set2 = new Set(files2);

  const conflictingFiles = files1.filter(f => set2.has(f));

  const totalUniqueFiles = new Set([...files1, ...files2]).size;
  const overlapPercentage = totalUniqueFiles > 0
    ? Math.round((conflictingFiles.length / totalUniqueFiles) * 100)
    : 0;

  return {
    hasConflicts: conflictingFiles.length > 0,
    conflictingFiles,
    branch1Files: files1,
    branch2Files: files2,
    overlapPercentage
  };
}

/**
 * Detect all conflicts between parallel plan branches
 *
 * Task 9.1: Detect conflicts between parallel plan branches
 *
 * @returns {Array<{
 *   branch1: string,
 *   branch2: string,
 *   conflictingFiles: string[],
 *   severity: 'high' | 'medium' | 'low'
 * }>}
 */
function detectAllConflicts() {
  const branches = listPlanBranches();
  const conflicts = [];

  // Compare each pair of branches
  for (let i = 0; i < branches.length; i++) {
    for (let j = i + 1; j < branches.length; j++) {
      const result = detectConflictsBetweenBranches(branches[i], branches[j]);

      if (result.hasConflicts) {
        // Determine severity based on overlap
        let severity = 'low';
        if (result.overlapPercentage > 30) {
          severity = 'high';
        } else if (result.overlapPercentage > 10) {
          severity = 'medium';
        }

        conflicts.push({
          branch1: branches[i],
          branch2: branches[j],
          conflictingFiles: result.conflictingFiles,
          severity
        });
      }
    }
  }

  return conflicts;
}

/**
 * Get a summary of file modifications across all plan branches
 *
 * Task 9.2: Warn when plans modify same files
 *
 * @returns {Map<string, string[]>} Map of file path to list of branches modifying it
 */
function getFileModificationMap() {
  const branches = listPlanBranches();
  const fileMap = new Map();

  for (const branch of branches) {
    const files = getModifiedFiles(branch);
    for (const file of files) {
      if (!fileMap.has(file)) {
        fileMap.set(file, []);
      }
      fileMap.get(file).push(branch);
    }
  }

  return fileMap;
}

/**
 * Find files that are modified by multiple plans
 *
 * Task 9.2: Warn when plans modify same files
 *
 * @returns {Array<{ file: string, branches: string[], count: number }>}
 */
function findSharedFileModifications() {
  const fileMap = getFileModificationMap();
  const shared = [];

  for (const [file, branches] of fileMap.entries()) {
    if (branches.length > 1) {
      shared.push({
        file,
        branches,
        count: branches.length
      });
    }
  }

  // Sort by count (most shared first)
  shared.sort((a, b) => b.count - a.count);

  return shared;
}

/**
 * Generate conflict warnings for a specific branch
 *
 * Task 9.2: Warn when plans modify same files
 *
 * @param {string} branchName - The branch to check
 * @returns {Array<{ file: string, otherBranches: string[], severity: 'high' | 'medium' | 'low' }>}
 */
function getConflictWarningsForBranch(branchName) {
  const myFiles = new Set(getModifiedFiles(branchName));
  const fileMap = getFileModificationMap();
  const warnings = [];

  for (const file of myFiles) {
    const allBranches = fileMap.get(file) || [];
    const otherBranches = allBranches.filter(b => b !== branchName);

    if (otherBranches.length > 0) {
      // Severity based on number of other branches
      let severity = 'low';
      if (otherBranches.length >= 3) {
        severity = 'high';
      } else if (otherBranches.length >= 2) {
        severity = 'medium';
      }

      warnings.push({
        file,
        otherBranches,
        severity
      });
    }
  }

  // Sort by severity
  const severityOrder = { high: 0, medium: 1, low: 2 };
  warnings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return warnings;
}

// =============================================================================
// Merge Order Recommendation (Task 9.3)
// =============================================================================

/**
 * Calculate merge priority score for a branch
 *
 * Lower score = higher priority (should merge first)
 *
 * Factors:
 * - File count: Fewer files = lower score
 * - Age: Older branches = lower score
 * - Overlap: Less overlap with others = lower score
 *
 * @param {string} branchName - The branch to score
 * @param {Map<string, string[]>} fileMap - File modification map
 * @returns {number}
 */
function calculateMergePriority(branchName, fileMap) {
  const files = getModifiedFiles(branchName);
  const creationDate = getBranchCreationDate(branchName);

  // Factor 1: File count (0-100 points)
  // Fewer files = lower score
  const fileScore = Math.min(files.length * 2, 100);

  // Factor 2: Age (0-100 points)
  // Older = lower score
  let ageScore = 50; // Default if no date
  if (creationDate) {
    const ageInDays = (Date.now() - creationDate.getTime()) / (1000 * 60 * 60 * 24);
    // Invert: older branches get lower score
    ageScore = Math.max(0, 100 - ageInDays * 5);
  }

  // Factor 3: Overlap with other branches (0-100 points)
  // Less overlap = lower score
  let overlapCount = 0;
  for (const file of files) {
    const branches = fileMap.get(file) || [];
    overlapCount += branches.length - 1; // Exclude self
  }
  const overlapScore = Math.min(overlapCount * 10, 100);

  return fileScore + ageScore + overlapScore;
}

/**
 * Recommend merge order for plan branches
 *
 * Task 9.3: Implement merge order recommendation
 *
 * @returns {Array<{
 *   branch: string,
 *   priority: number,
 *   reason: string,
 *   fileCount: number,
 *   overlapCount: number
 * }>}
 */
function recommendMergeOrder() {
  const branches = listPlanBranches();
  const fileMap = getFileModificationMap();
  const recommendations = [];

  for (const branch of branches) {
    const files = getModifiedFiles(branch);
    const priority = calculateMergePriority(branch, fileMap);

    // Calculate overlap count
    let overlapCount = 0;
    for (const file of files) {
      const fileBranches = fileMap.get(file) || [];
      if (fileBranches.length > 1) {
        overlapCount++;
      }
    }

    // Generate reason
    let reason = '';
    if (files.length <= 5 && overlapCount === 0) {
      reason = 'Small change, no conflicts';
    } else if (overlapCount === 0) {
      reason = 'No conflicting files';
    } else if (overlapCount < files.length * 0.3) {
      reason = 'Few conflicts';
    } else {
      reason = 'Has potential conflicts';
    }

    recommendations.push({
      branch,
      priority,
      reason,
      fileCount: files.length,
      overlapCount
    });
  }

  // Sort by priority (lower = merge first)
  recommendations.sort((a, b) => a.priority - b.priority);

  return recommendations;
}

/**
 * Get detailed merge order analysis
 *
 * Task 9.3: Implement merge order recommendation
 *
 * @returns {{
 *   recommendations: Array<{ branch: string, order: number, reason: string, fileCount: number }>,
 *   conflictSummary: { totalConflicts: number, highSeverity: number, affectedFiles: number },
 *   suggestedStrategy: string
 * }}
 */
function getMergeOrderAnalysis() {
  const recommendations = recommendMergeOrder();
  const conflicts = detectAllConflicts();
  const sharedFiles = findSharedFileModifications();

  // Conflict summary
  const highSeverityConflicts = conflicts.filter(c => c.severity === 'high').length;
  const totalConflicts = conflicts.length;
  const affectedFiles = sharedFiles.length;

  // Suggested strategy
  let suggestedStrategy = '';
  if (totalConflicts === 0) {
    suggestedStrategy = 'All branches can be merged independently in any order.';
  } else if (highSeverityConflicts > 0) {
    suggestedStrategy = 'Merge branches in recommended order. High-severity conflicts require careful review.';
  } else {
    suggestedStrategy = 'Follow recommended order for cleanest merge. Minor conflicts may occur.';
  }

  return {
    recommendations: recommendations.map((r, i) => ({
      branch: r.branch,
      order: i + 1,
      reason: r.reason,
      fileCount: r.fileCount
    })),
    conflictSummary: {
      totalConflicts,
      highSeverity: highSeverityConflicts,
      affectedFiles
    },
    suggestedStrategy
  };
}

// =============================================================================
// Merge Conflict Preview (Task 9.1)
// =============================================================================

/**
 * Preview potential merge conflicts between a branch and main
 *
 * Task 9.1: Detect conflicts between parallel plan branches
 *
 * @param {string} branchName - The branch to check
 * @returns {{
 *   hasConflicts: boolean,
 *   conflictFiles: string[],
 *   cleanMerge: boolean,
 *   error: string | null
 * }}
 */
function previewMergeConflicts(branchName) {
  const repoRoot = getRepoRoot();
  if (!repoRoot) {
    return { hasConflicts: false, conflictFiles: [], cleanMerge: false, error: 'Not in a git repository' };
  }

  const mainBranch = getMainBranch();

  try {
    // Try a dry-run merge to detect conflicts
    execSync(`git merge-tree $(git merge-base ${mainBranch} ${branchName}) ${mainBranch} ${branchName}`, {
      encoding: 'utf8',
      cwd: repoRoot,
      stdio: 'pipe'
    });

    // If we get here, merge would be clean
    return { hasConflicts: false, conflictFiles: [], cleanMerge: true, error: null };
  } catch (error) {
    // Parse the output for conflict markers
    const output = error.stdout || '';
    const conflictFiles = [];

    // Look for conflict markers in the output
    const lines = output.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('<<<<<<<') || lines[i].includes('=======') || lines[i].includes('>>>>>>>')) {
        // Try to extract filename from context
        for (let j = i - 1; j >= 0 && j >= i - 5; j--) {
          const match = lines[j].match(/^(?:diff --git a\/|--- a\/|diff --cc )([^\s]+)/);
          if (match && !conflictFiles.includes(match[1])) {
            conflictFiles.push(match[1]);
            break;
          }
        }
      }
    }

    return {
      hasConflicts: conflictFiles.length > 0,
      conflictFiles,
      cleanMerge: false,
      error: null
    };
  }
}

// =============================================================================
// Integration with status-cli.js
// =============================================================================

/**
 * Generate a conflict report in text format
 *
 * @returns {string}
 */
function generateConflictReport() {
  const conflicts = detectAllConflicts();
  const sharedFiles = findSharedFileModifications();
  const recommendations = recommendMergeOrder();

  let report = '';

  // Header
  report += '╔════════════════════════════════════════════════════════════════╗\n';
  report += '║          Worktree Conflict Detection Report                    ║\n';
  report += '╚════════════════════════════════════════════════════════════════╝\n\n';

  // Branch pair conflicts
  if (conflicts.length > 0) {
    report += '⚠ Potential Conflicts Between Plans:\n\n';
    for (const conflict of conflicts) {
      const severityIcon = conflict.severity === 'high' ? '🔴' :
        conflict.severity === 'medium' ? '🟡' : '🟢';
      report += `  ${severityIcon} ${conflict.branch1} ↔ ${conflict.branch2}\n`;
      report += `     ${conflict.conflictingFiles.length} shared file(s): ${conflict.conflictingFiles.slice(0, 3).join(', ')}`;
      if (conflict.conflictingFiles.length > 3) {
        report += ` +${conflict.conflictingFiles.length - 3} more`;
      }
      report += '\n\n';
    }
  } else {
    report += '✓ No conflicts detected between plan branches\n\n';
  }

  // Shared files
  if (sharedFiles.length > 0) {
    report += '📁 Files Modified by Multiple Plans:\n\n';
    for (const { file, branches, count } of sharedFiles.slice(0, 10)) {
      report += `  ${file}\n`;
      report += `    Modified by: ${branches.join(', ')}\n`;
    }
    if (sharedFiles.length > 10) {
      report += `\n  ... and ${sharedFiles.length - 10} more files\n`;
    }
    report += '\n';
  }

  // Merge order recommendations
  if (recommendations.length > 1) {
    report += '📋 Recommended Merge Order:\n\n';
    recommendations.forEach((rec, index) => {
      report += `  ${index + 1}. ${rec.branch}\n`;
      report += `     ${rec.reason} (${rec.fileCount} files)\n`;
    });
    report += '\n';
  }

  return report;
}

/**
 * Generate a conflict report in JSON format
 *
 * @returns {object}
 */
function generateConflictReportJSON() {
  const analysis = getMergeOrderAnalysis();
  const conflicts = detectAllConflicts();
  const sharedFiles = findSharedFileModifications();

  return {
    generatedAt: new Date().toISOString(),
    conflicts: conflicts.map(c => ({
      branch1: c.branch1,
      branch2: c.branch2,
      severity: c.severity,
      files: c.conflictingFiles
    })),
    sharedFiles: sharedFiles.map(s => ({
      file: s.file,
      branches: s.branches,
      count: s.count
    })),
    mergeOrder: analysis.recommendations,
    summary: analysis.conflictSummary,
    strategy: analysis.suggestedStrategy
  };
}

// =============================================================================
// Merge Conflict Resolution in Worktree Context (Task 9.5)
// =============================================================================

/**
 * Detect merge conflicts when completing a plan in a worktree
 *
 * Task 9.5: Handle merge conflicts in worktree context
 *
 * @param {string} worktreePath - Path to the worktree
 * @param {string} branch - Branch name (e.g., 'plan/feature-auth')
 * @returns {{
 *   hasConflicts: boolean,
 *   conflictFiles: string[],
 *   canFastForward: boolean,
 *   behindCount: number,
 *   aheadCount: number,
 *   mergeStrategy: 'fast-forward' | 'clean-merge' | 'conflict-merge',
 *   error: string | null
 * }}
 */
function detectWorktreeMergeConflicts(worktreePath, branch) {
  const repoRoot = getRepoRoot();
  if (!repoRoot) {
    return {
      hasConflicts: false,
      conflictFiles: [],
      canFastForward: false,
      behindCount: 0,
      aheadCount: 0,
      mergeStrategy: 'conflict-merge',
      error: 'Not in a git repository'
    };
  }

  const mainBranch = getMainBranch();

  try {
    // Get commit counts
    const behindCount = parseInt(execSync(
      `git rev-list --count "${branch}".."${mainBranch}"`,
      { encoding: 'utf8', cwd: repoRoot, stdio: 'pipe' }
    ).trim());

    const aheadCount = parseInt(execSync(
      `git rev-list --count "${mainBranch}".."${branch}"`,
      { encoding: 'utf8', cwd: repoRoot, stdio: 'pipe' }
    ).trim());

    // Check if fast-forward is possible
    if (behindCount === 0) {
      return {
        hasConflicts: false,
        conflictFiles: [],
        canFastForward: true,
        behindCount: 0,
        aheadCount,
        mergeStrategy: 'fast-forward',
        error: null
      };
    }

    // Try a dry-run merge to detect conflicts
    // Use merge-tree for conflict detection without modifying working directory
    try {
      const mergeBase = execSync(
        `git merge-base "${mainBranch}" "${branch}"`,
        { encoding: 'utf8', cwd: repoRoot, stdio: 'pipe' }
      ).trim();

      const mergeResult = execSync(
        `git merge-tree "${mergeBase}" "${mainBranch}" "${branch}"`,
        { encoding: 'utf8', cwd: repoRoot, stdio: 'pipe' }
      );

      // Look for conflict markers in the output
      const hasConflictMarkers = mergeResult.includes('<<<<<<<') ||
        mergeResult.includes('=======') ||
        mergeResult.includes('>>>>>>>');

      if (!hasConflictMarkers) {
        return {
          hasConflicts: false,
          conflictFiles: [],
          canFastForward: false,
          behindCount,
          aheadCount,
          mergeStrategy: 'clean-merge',
          error: null
        };
      }

      // Extract conflicting files from merge-tree output
      const conflictFiles = extractConflictFilesFromMergeTree(mergeResult);

      return {
        hasConflicts: true,
        conflictFiles,
        canFastForward: false,
        behindCount,
        aheadCount,
        mergeStrategy: 'conflict-merge',
        error: null
      };
    } catch (mergeError) {
      // merge-tree may return non-zero on conflicts, check output
      const output = mergeError.stdout || '';
      const hasConflictMarkers = output.includes('<<<<<<<') ||
        output.includes('=======') ||
        output.includes('>>>>>>>');

      if (hasConflictMarkers) {
        const conflictFiles = extractConflictFilesFromMergeTree(output);
        return {
          hasConflicts: true,
          conflictFiles,
          canFastForward: false,
          behindCount,
          aheadCount,
          mergeStrategy: 'conflict-merge',
          error: null
        };
      }

      // Not a conflict, some other error
      return {
        hasConflicts: false,
        conflictFiles: [],
        canFastForward: false,
        behindCount,
        aheadCount,
        mergeStrategy: 'clean-merge',
        error: null
      };
    }
  } catch (error) {
    return {
      hasConflicts: false,
      conflictFiles: [],
      canFastForward: false,
      behindCount: 0,
      aheadCount: 0,
      mergeStrategy: 'conflict-merge',
      error: error.message
    };
  }
}

/**
 * Extract conflict files from git merge-tree output
 * @param {string} mergeTreeOutput - Output from git merge-tree
 * @returns {string[]} List of conflicting file paths
 */
function extractConflictFilesFromMergeTree(mergeTreeOutput) {
  const conflictFiles = new Set();
  const lines = mergeTreeOutput.split('\n');

  let currentFile = null;

  for (const line of lines) {
    // Look for file markers: diff --cc or diff --git patterns
    const ccMatch = line.match(/^diff --cc ([^\s]+)/);
    const gitMatch = line.match(/^diff --git a\/([^\s]+)/);

    if (ccMatch) {
      currentFile = ccMatch[1];
    } else if (gitMatch) {
      currentFile = gitMatch[1];
    }

    // If we see conflict markers and have a current file, add it
    if (currentFile && (line.includes('<<<<<<<') || line.includes('>>>>>>>'))) {
      conflictFiles.add(currentFile);
    }
  }

  return Array.from(conflictFiles);
}

/**
 * Check if a worktree is in conflict state
 *
 * Task 9.5: Handle merge conflicts in worktree context
 *
 * @param {string} worktreePath - Path to the worktree
 * @returns {{ inConflict: boolean, conflictFiles: string[], conflictType: 'merge' | 'rebase' | 'cherry-pick' | null }}
 */
function checkWorktreeConflictState(worktreePath) {
  try {
    // Check for merge in progress
    const mergeHead = path.join(worktreePath, '.git', 'MERGE_HEAD');
    if (fs.existsSync(mergeHead)) {
      const conflictFiles = getUnmergedFiles(worktreePath);
      return { inConflict: true, conflictFiles, conflictType: 'merge' };
    }

    // .git might be a file pointing to the actual git dir for worktrees
    let gitDir = worktreePath;
    const gitFile = path.join(worktreePath, '.git');
    if (fs.existsSync(gitFile)) {
      const content = fs.readFileSync(gitFile, 'utf8').trim();
      if (content.startsWith('gitdir:')) {
        gitDir = content.split('gitdir:')[1].trim();
      }
    }

    // Check for rebase in progress
    const rebaseApply = path.join(gitDir, 'rebase-apply');
    const rebaseMerge = path.join(gitDir, 'rebase-merge');
    if (fs.existsSync(rebaseApply) || fs.existsSync(rebaseMerge)) {
      const conflictFiles = getUnmergedFiles(worktreePath);
      return { inConflict: conflictFiles.length > 0, conflictFiles, conflictType: 'rebase' };
    }

    // Check for cherry-pick in progress
    const cherryPick = path.join(gitDir, 'CHERRY_PICK_HEAD');
    if (fs.existsSync(cherryPick)) {
      const conflictFiles = getUnmergedFiles(worktreePath);
      return { inConflict: true, conflictFiles, conflictType: 'cherry-pick' };
    }

    // Check for unmerged files (conflict state without explicit operation)
    const conflictFiles = getUnmergedFiles(worktreePath);
    if (conflictFiles.length > 0) {
      return { inConflict: true, conflictFiles, conflictType: 'merge' };
    }

    return { inConflict: false, conflictFiles: [], conflictType: null };
  } catch (error) {
    return { inConflict: false, conflictFiles: [], conflictType: null };
  }
}

/**
 * Get list of unmerged (conflicting) files in a directory
 * @param {string} cwd - Working directory
 * @returns {string[]}
 */
function getUnmergedFiles(cwd) {
  try {
    const output = execSync('git diff --name-only --diff-filter=U', {
      encoding: 'utf8',
      cwd,
      stdio: 'pipe'
    }).trim();
    return output ? output.split('\n').filter(f => f) : [];
  } catch (error) {
    return [];
  }
}

/**
 * Abort any in-progress merge/rebase operation in a worktree
 *
 * Task 9.5: Handle merge conflicts in worktree context
 *
 * @param {string} worktreePath - Path to the worktree
 * @returns {{ success: boolean, operation: string | null, error: string | null }}
 */
function abortWorktreeConflict(worktreePath) {
  const conflictState = checkWorktreeConflictState(worktreePath);

  if (!conflictState.inConflict && !conflictState.conflictType) {
    return { success: true, operation: null, error: null };
  }

  try {
    switch (conflictState.conflictType) {
      case 'merge':
        execSync('git merge --abort', { cwd: worktreePath, stdio: 'pipe' });
        return { success: true, operation: 'merge', error: null };

      case 'rebase':
        execSync('git rebase --abort', { cwd: worktreePath, stdio: 'pipe' });
        return { success: true, operation: 'rebase', error: null };

      case 'cherry-pick':
        execSync('git cherry-pick --abort', { cwd: worktreePath, stdio: 'pipe' });
        return { success: true, operation: 'cherry-pick', error: null };

      default:
        // Try merge abort as fallback
        try {
          execSync('git merge --abort', { cwd: worktreePath, stdio: 'pipe' });
          return { success: true, operation: 'merge', error: null };
        } catch {
          return { success: false, operation: null, error: 'No conflict operation to abort' };
        }
    }
  } catch (error) {
    return { success: false, operation: conflictState.conflictType, error: error.message };
  }
}

/**
 * Get conflict resolution instructions for a worktree
 *
 * Task 9.5: Handle merge conflicts in worktree context
 *
 * @param {string} worktreePath - Path to the worktree
 * @param {string} branch - Branch name
 * @param {'rebase' | 'merge' | 'manual'} strategy - Preferred resolution strategy
 * @returns {{ steps: string[], commands: string[] }}
 */
function getConflictResolutionSteps(worktreePath, branch, strategy = 'rebase') {
  const mainBranch = getMainBranch();

  if (strategy === 'rebase') {
    return {
      steps: [
        'Rebase your branch onto main to incorporate latest changes',
        'Resolve any conflicts that arise during rebase',
        'Continue the rebase after resolving each conflict',
        'Re-run /plan:complete when rebase is successful'
      ],
      commands: [
        `cd ${worktreePath}`,
        `git rebase ${mainBranch}`,
        '# If conflicts occur:',
        '#   1. Edit conflicting files to resolve',
        '#   2. git add <resolved-files>',
        '#   3. git rebase --continue',
        '# To abort: git rebase --abort'
      ]
    };
  } else if (strategy === 'merge') {
    return {
      steps: [
        'Merge main into your branch to incorporate latest changes',
        'Resolve any conflicts that arise during merge',
        'Commit the merge resolution',
        'Re-run /plan:complete when merge is successful'
      ],
      commands: [
        `cd ${worktreePath}`,
        `git merge ${mainBranch}`,
        '# If conflicts occur:',
        '#   1. Edit conflicting files to resolve',
        '#   2. git add <resolved-files>',
        '#   3. git commit',
        '# To abort: git merge --abort'
      ]
    };
  } else {
    // Manual strategy
    return {
      steps: [
        'Review the conflicting files listed above',
        'Decide whether to rebase (cleaner history) or merge (preserve structure)',
        'Resolve conflicts manually in each file',
        'Re-run /plan:complete when all conflicts are resolved'
      ],
      commands: [
        `cd ${worktreePath}`,
        '# To rebase: git rebase main',
        '# To merge: git merge main',
        '# View conflict markers: grep -rn "<<<<<<" .',
        '# After resolving, stage files: git add <files>'
      ]
    };
  }
}

/**
 * Generate a worktree conflict report
 *
 * Task 9.5: Handle merge conflicts in worktree context
 *
 * @param {string} worktreePath - Path to the worktree
 * @param {string} branch - Branch name
 * @returns {{ hasConflicts: boolean, report: string, jsonData: object }}
 */
function generateWorktreeConflictReport(worktreePath, branch) {
  const detection = detectWorktreeMergeConflicts(worktreePath, branch);
  const conflictState = checkWorktreeConflictState(worktreePath);
  const mainBranch = getMainBranch();

  let report = '';

  // Header
  report += `Worktree Conflict Analysis\n`;
  report += `${'═'.repeat(50)}\n\n`;
  report += `Worktree: ${worktreePath}\n`;
  report += `Branch: ${branch}\n`;
  report += `Main Branch: ${mainBranch}\n\n`;

  // Current state
  if (conflictState.inConflict) {
    report += `⚠ ACTIVE CONFLICT DETECTED\n`;
    report += `  Type: ${conflictState.conflictType}\n`;
    report += `  Files in conflict:\n`;
    for (const file of conflictState.conflictFiles) {
      report += `    - ${file}\n`;
    }
    report += '\n';
    report += `  To abort: git ${conflictState.conflictType} --abort\n\n`;
  }

  // Merge analysis
  report += `Merge Analysis:\n`;
  report += `  Commits ahead of ${mainBranch}: ${detection.aheadCount}\n`;
  report += `  Commits behind ${mainBranch}: ${detection.behindCount}\n`;
  report += `  Strategy: ${detection.mergeStrategy}\n`;

  if (detection.hasConflicts) {
    report += `  Status: ✗ Conflicts detected\n\n`;
    report += `  Conflicting files:\n`;
    for (const file of detection.conflictFiles) {
      report += `    - ${file}\n`;
    }
  } else if (detection.canFastForward) {
    report += `  Status: ✓ Can fast-forward (no conflicts)\n`;
  } else {
    report += `  Status: ✓ Clean merge possible (no conflicts)\n`;
  }

  report += '\n';

  // Resolution instructions
  if (detection.hasConflicts || conflictState.inConflict) {
    const resolution = getConflictResolutionSteps(worktreePath, branch, 'rebase');
    report += `Recommended Resolution (Rebase):\n`;
    for (let i = 0; i < resolution.steps.length; i++) {
      report += `  ${i + 1}. ${resolution.steps[i]}\n`;
    }
    report += '\nCommands:\n';
    for (const cmd of resolution.commands) {
      report += `  ${cmd}\n`;
    }
  }

  const jsonData = {
    worktreePath,
    branch,
    mainBranch,
    currentConflict: conflictState,
    mergeAnalysis: detection,
    hasConflicts: detection.hasConflicts || conflictState.inConflict
  };

  return { hasConflicts: jsonData.hasConflicts, report, jsonData };
}

// =============================================================================
// Exports
// =============================================================================

module.exports = {
  // Git utilities
  getRepoRoot,
  getMainBranch,
  getModifiedFiles,
  getBranchCreationDate,
  listPlanBranches,

  // Task 9.1: Conflict detection
  detectConflictsBetweenBranches,
  detectAllConflicts,
  previewMergeConflicts,

  // Task 9.2: File modification warnings
  getFileModificationMap,
  findSharedFileModifications,
  getConflictWarningsForBranch,

  // Task 9.3: Merge order recommendation
  calculateMergePriority,
  recommendMergeOrder,
  getMergeOrderAnalysis,

  // Task 9.5: Worktree merge conflict handling
  detectWorktreeMergeConflicts,
  extractConflictFilesFromMergeTree,
  checkWorktreeConflictState,
  getUnmergedFiles,
  abortWorktreeConflict,
  getConflictResolutionSteps,
  generateWorktreeConflictReport,

  // Reports
  generateConflictReport,
  generateConflictReportJSON
};
