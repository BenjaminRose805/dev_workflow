#!/usr/bin/env node

/**
 * Plan Format Validation Script
 *
 * Validates implementation plans in docs/plans/implement-*.md against
 * the standards defined in docs/standards/implementation-plan-standards.md
 *
 * Usage:
 *   node scripts/validate-plan-format.js [--verbose] [--fix]
 */

const fs = require('fs');
const path = require('path');

const PLANS_DIR = path.join(__dirname, '../docs/plans');
const OUTPUT_DIR = path.join(__dirname, '../docs/plan-outputs/fix-implementation-plan-inconsistencies');

// Validation rules based on implementation-plan-standards.md
const REQUIRED_SECTIONS = [
  { pattern: /^## Overview\s*$/m, name: 'Overview' },
  { pattern: /^## Dependencies\s*$/m, name: 'Dependencies' },
  { pattern: /^## Success Criteria\s*$/m, name: 'Success Criteria' },
  { pattern: /^## Risks\s*$/m, name: 'Risks' }
];

const REQUIRED_OVERVIEW_FIELDS = [
  { pattern: /\*\*Goal:\*\*|\*\*Objective:\*\*/m, name: 'Goal/Objective' },
  { pattern: /\*\*Priority:\*\*\s*P[012]/m, name: 'Priority (P0/P1/P2)' },
  { pattern: /\*\*Created:\*\*/m, name: 'Created date' },
  { pattern: /\*\*Output:\*\*/m, name: 'Output directory' }
];

const DEPENDENCY_SUBSECTIONS = [
  { pattern: /### Upstream\b/, name: 'Upstream' },
  { pattern: /### Downstream\b/, name: 'Downstream' },
  { pattern: /### External Tools\b/, name: 'External Tools' }
];

// Naming convention patterns
const INVALID_PATTERNS = [
  // Match actual subcommand invocations like "/analyze quick" but not prose like "/analyze command"
  // This is hard to do reliably, so we'll be more conservative
  {
    pattern: /`\/(explore|analyze|test|validate|review|audit|design|architect|spec|document|explain|fix|refactor|debug|implement|migrate|release|deploy|brainstorm|clarify|research|model|template|workflow)\s+[a-z]+`/gi,
    name: 'Space-separated sub-commands in backticks',
    fix: 'Use colon notation: /{command}:{subcommand}'
  },
  {
    pattern: /claude-(opus|sonnet|haiku)-\d+(-\d+)?-\d+/gi,
    name: 'Full model IDs',
    fix: 'Use short form: opus, sonnet, or haiku'
  },
  {
    pattern: /[a-z]+_[a-z]+-(report|spec|document|plan|results|map)/gi,
    name: 'Snake_case artifact types',
    fix: 'Use kebab-case: artifact-type'
  }
];

// Phase and VERIFY format patterns
const PHASE_PATTERNS = {
  valid: /^## Phase \d+: .+$/m,
  invalid: [
    { pattern: /^### Phase \d+:/m, name: 'Phase as H3 instead of H2' },
    { pattern: /^## Phase \d+\.\d+:/m, name: 'Decimal phase numbering at top level' }
  ]
};

const VERIFY_PATTERNS = {
  valid: /^\*\*VERIFY (Phase \d+|\d+\.\d+):\*\*$/m,
  invalid: [
    { pattern: /^VERIFY \d+:/m, name: 'VERIFY without bold' },
    { pattern: /^\*\*VERIFY:\*\*/m, name: 'VERIFY without phase/task number' }
  ]
};

class PlanValidator {
  constructor(verbose = false) {
    this.verbose = verbose;
    this.results = {
      valid: [],
      warnings: [],
      errors: []
    };
  }

  log(message) {
    if (this.verbose) {
      console.log(message);
    }
  }

  validatePlan(filePath) {
    const fileName = path.basename(filePath);
    const content = fs.readFileSync(filePath, 'utf-8');
    const issues = [];
    const warnings = [];

    this.log(`\nValidating: ${fileName}`);

    // Check required sections
    for (const section of REQUIRED_SECTIONS) {
      if (!section.pattern.test(content)) {
        issues.push(`Missing required section: ${section.name}`);
      }
    }

    // Check Overview fields
    const overviewMatch = content.match(/## Overview[\s\S]*?(?=## [A-Z]|$)/);
    if (overviewMatch) {
      const overviewContent = overviewMatch[0];
      for (const field of REQUIRED_OVERVIEW_FIELDS) {
        if (!field.pattern.test(overviewContent)) {
          issues.push(`Missing Overview field: ${field.name}`);
        }
      }
    }

    // Check Dependencies subsections
    const depsMatch = content.match(/## Dependencies[\s\S]*?(?=\n## [A-Z]|$)/);
    if (depsMatch) {
      const depsContent = depsMatch[0];
      for (const subsection of DEPENDENCY_SUBSECTIONS) {
        if (!subsection.pattern.test(depsContent)) {
          warnings.push(`Missing Dependencies subsection: ${subsection.name}`);
        }
      }
    } else {
      // Dependencies section is already checked in REQUIRED_SECTIONS
    }

    // Check for at least one phase
    if (!PHASE_PATTERNS.valid.test(content)) {
      issues.push('No valid phase found (expected: "## Phase N: Title")');
    }

    // Check for invalid phase formats
    for (const invalid of PHASE_PATTERNS.invalid) {
      if (invalid.pattern.test(content)) {
        warnings.push(`Invalid phase format: ${invalid.name}`);
      }
    }

    // Check for VERIFY sections
    // Both phase-level (**VERIFY Phase N:**) and subsection-level (**VERIFY N.M:**) are valid
    const phaseMatches = content.match(/## Phase \d+:/g);
    if (phaseMatches) {
      // Check that each phase has at least one VERIFY (phase-level or subsection-level)
      const phaseNumbers = phaseMatches.map(m => m.match(/\d+/)[0]);
      for (const num of phaseNumbers) {
        // Match either **VERIFY Phase N:** or **VERIFY N.M:**
        const verifyPhasePattern = new RegExp(`\\*\\*VERIFY Phase ${num}:\\*\\*`);
        const verifySubsectionPattern = new RegExp(`\\*\\*VERIFY ${num}\\.\\d+:\\*\\*`);
        if (!verifyPhasePattern.test(content) && !verifySubsectionPattern.test(content)) {
          warnings.push(`Phase ${num} missing VERIFY section (expected **VERIFY Phase ${num}:** or **VERIFY ${num}.N:**)`);
        }
      }
    }

    // Check for invalid naming patterns
    for (const invalid of INVALID_PATTERNS) {
      const matches = content.match(invalid.pattern);
      if (matches) {
        warnings.push(`${invalid.name} found: ${matches.slice(0, 3).join(', ')}${matches.length > 3 ? '...' : ''}`);
      }
    }

    // Check Output directory format
    const outputMatch = content.match(/\*\*Output:\*\*\s*`?([^`\n]+)`?/);
    if (outputMatch) {
      const outputPath = outputMatch[1].trim();
      if (!outputPath.startsWith('docs/plan-outputs/')) {
        warnings.push(`Output directory doesn't follow convention: ${outputPath}`);
      }
    }

    // Check for cross-references to non-existent plans
    const planRefs = content.match(/implement-[a-z-]+-(?:command|agent|hook|registry)\.md/g);
    if (planRefs) {
      const uniqueRefs = [...new Set(planRefs)];
      for (const ref of uniqueRefs) {
        const refPath = path.join(PLANS_DIR, ref);
        if (!fs.existsSync(refPath)) {
          issues.push(`Reference to non-existent plan: ${ref}`);
        }
      }
    }

    return {
      file: fileName,
      valid: issues.length === 0,
      issues,
      warnings
    };
  }

  validateAllPlans() {
    const planFiles = fs.readdirSync(PLANS_DIR)
      .filter(f => f.startsWith('implement-') && f.endsWith('.md'))
      .sort();

    console.log(`\n📋 Validating ${planFiles.length} implementation plans...\n`);

    let validCount = 0;
    let warningCount = 0;
    let errorCount = 0;

    for (const file of planFiles) {
      const result = this.validatePlan(path.join(PLANS_DIR, file));

      if (result.valid && result.warnings.length === 0) {
        this.results.valid.push(result.file);
        validCount++;
        if (this.verbose) {
          console.log(`✓ ${result.file}`);
        }
      } else if (result.valid) {
        this.results.warnings.push(result);
        warningCount++;
        console.log(`⚠ ${result.file}`);
        for (const warning of result.warnings) {
          console.log(`   - ${warning}`);
        }
      } else {
        this.results.errors.push(result);
        errorCount++;
        console.log(`✗ ${result.file}`);
        for (const issue of result.issues) {
          console.log(`   ✗ ${issue}`);
        }
        for (const warning of result.warnings) {
          console.log(`   ⚠ ${warning}`);
        }
      }
    }

    // Summary
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`\n📊 Validation Summary:`);
    console.log(`   ✓ Valid: ${validCount} plans`);
    console.log(`   ⚠ Warnings: ${warningCount} plans`);
    console.log(`   ✗ Errors: ${errorCount} plans`);
    console.log(`   Total: ${planFiles.length} plans\n`);

    return {
      total: planFiles.length,
      valid: validCount,
      warnings: warningCount,
      errors: errorCount,
      results: this.results
    };
  }

  generateReport() {
    const timestamp = new Date().toISOString();
    let report = `# Plan Validation Report

**Generated:** ${timestamp}
**Plans Validated:** ${this.results.valid.length + this.results.warnings.length + this.results.errors.length}

## Summary

| Status | Count |
|--------|-------|
| ✓ Valid | ${this.results.valid.length} |
| ⚠ Warnings | ${this.results.warnings.length} |
| ✗ Errors | ${this.results.errors.length} |

`;

    if (this.results.errors.length > 0) {
      report += `## Plans with Errors

| Plan | Issues |
|------|--------|
`;
      for (const result of this.results.errors) {
        const issueList = result.issues.map(i => `• ${i}`).join('<br>');
        report += `| ${result.file} | ${issueList} |\n`;
      }
      report += '\n';
    }

    if (this.results.warnings.length > 0) {
      report += `## Plans with Warnings

| Plan | Warnings |
|------|----------|
`;
      for (const result of this.results.warnings) {
        const warningList = result.warnings.map(w => `• ${w}`).join('<br>');
        report += `| ${result.file} | ${warningList} |\n`;
      }
      report += '\n';
    }

    if (this.results.valid.length > 0) {
      report += `## Valid Plans

${this.results.valid.map(f => `- ✓ ${f}`).join('\n')}
`;
    }

    return report;
  }
}

// CLI entry point
if (require.main === module) {
  const args = process.argv.slice(2);
  const verbose = args.includes('--verbose') || args.includes('-v');
  const generateReport = args.includes('--report') || args.includes('-r');

  const validator = new PlanValidator(verbose);
  const summary = validator.validateAllPlans();

  if (generateReport) {
    const report = validator.generateReport();
    const reportPath = path.join(OUTPUT_DIR, 'validation-report.md');

    // Ensure output directory exists
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    fs.writeFileSync(reportPath, report);
    console.log(`📄 Report saved to: ${reportPath}`);
  }

  // Exit with error code if there are errors
  process.exit(summary.errors > 0 ? 1 : 0);
}

module.exports = { PlanValidator };
