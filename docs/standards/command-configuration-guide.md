# Command Configuration Guide

This guide documents the configuration system for dev workflow commands.

## Overview

All commands can be configured through a central configuration file at `.claude/config.json`. This file uses JSON Schema for validation (schema at `.claude/config-schema.json`).

## Configuration File

Create `.claude/config.json` in your project root:

```json
{
  "$schema": "./.claude/config-schema.json",
  "version": "1.0.0",
  "defaults": {
    "model": "sonnet",
    "timeout": {
      "quick": 30000,
      "standard": 120000,
      "deep": 600000
    }
  },
  "quality_gates": {
    "mode": "standard",
    "thresholds": {
      "critical": 0,
      "high": 5,
      "coverage": 85
    }
  }
}
```

## Configuration Sections

### Defaults

Global defaults applied to all commands:

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `model` | string | `sonnet` | Default model (sonnet, opus, haiku) |
| `output_dir` | string | `docs/plan-outputs` | Output directory for artifacts |
| `timeout.quick` | integer | 30000 | Quick operation timeout (ms) |
| `timeout.standard` | integer | 120000 | Standard operation timeout (ms) |
| `timeout.deep` | integer | 600000 | Deep operation timeout (ms) |
| `timeout.extended` | integer | 1800000 | Extended operation timeout (ms) |
| `verbose` | boolean | false | Enable verbose output |

### Quality Gates

Quality gate configuration for validation and deployment:

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `mode` | string | `standard` | Gate mode: strict, standard, permissive |
| `thresholds.critical` | integer | 0 | Max critical issues allowed |
| `thresholds.high` | integer | 5 | Max high issues allowed |
| `thresholds.medium` | integer | 20 | Max medium issues allowed |
| `thresholds.coverage` | number | 85 | Min test coverage percentage |
| `block_on_failure` | boolean | true | Block merge/deploy on failure |

**Gate Modes:**

| Mode | Critical | High | Medium | Coverage |
|------|----------|------|--------|----------|
| strict | 0 | 0 | 5 | 95 |
| standard | 0 | 5 | 20 | 85 |
| permissive | 0 | 10 | 30 | 70 |

### Command-Specific Configuration

#### /explore

```json
{
  "commands": {
    "explore": {
      "default_depth": "standard",
      "exclude_patterns": ["node_modules", ".git", "dist"],
      "max_files": 1000
    }
  }
}
```

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `default_depth` | string | `standard` | Default depth (quick, standard, deep) |
| `exclude_patterns` | array | `[...]` | Glob patterns to exclude |
| `max_files` | integer | 1000 | Maximum files to analyze |

#### /analyze

```json
{
  "commands": {
    "analyze": {
      "default_type": "quality",
      "depth": "standard",
      "security": {
        "owasp_checks": true,
        "cwe_mapping": true
      }
    }
  }
}
```

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `default_type` | string | `quality` | Default analysis type |
| `depth` | string | `standard` | Analysis depth |
| `security.owasp_checks` | boolean | true | Enable OWASP checks |
| `security.cwe_mapping` | boolean | true | Map to CWE IDs |

#### /validate

```json
{
  "commands": {
    "validate": {
      "checks": {
        "types": true,
        "lint": true,
        "format": true,
        "build": true,
        "test": false
      },
      "fix_on_fail": false
    }
  }
}
```

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `checks.types` | boolean | true | Run type checking |
| `checks.lint` | boolean | true | Run linting |
| `checks.format` | boolean | true | Check formatting |
| `checks.build` | boolean | true | Run build |
| `checks.test` | boolean | false | Run tests |
| `fix_on_fail` | boolean | false | Auto-fix on failure |

#### /test

```json
{
  "commands": {
    "test": {
      "framework": "auto",
      "coverage": {
        "enabled": true,
        "threshold": 85,
        "reporters": ["text", "lcov"]
      },
      "parallel": true
    }
  }
}
```

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `framework` | string | `auto` | Test framework (vitest, jest, mocha, auto) |
| `coverage.enabled` | boolean | true | Enable coverage reporting |
| `coverage.threshold` | number | 85 | Minimum coverage percentage |
| `coverage.reporters` | array | `["text", "lcov"]` | Coverage reporters |
| `parallel` | boolean | true | Run tests in parallel |

#### /review

```json
{
  "commands": {
    "review": {
      "model": "sonnet",
      "focus_areas": ["bugs", "security", "maintainability"],
      "diff_context_lines": 5
    }
  }
}
```

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `model` | string | `sonnet` | Model for review (sonnet, opus) |
| `focus_areas` | array | `[...]` | Areas to focus on |
| `diff_context_lines` | integer | 5 | Context lines for diffs |

#### /deploy

```json
{
  "commands": {
    "deploy": {
      "strategy": "direct",
      "require_validation": true,
      "environments": [
        { "name": "staging", "url": "...", "protected": false },
        { "name": "production", "url": "...", "protected": true }
      ]
    }
  }
}
```

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `strategy` | string | `direct` | Deploy strategy |
| `require_validation` | boolean | true | Require validation before deploy |
| `environments` | array | `[]` | Environment definitions |

### Artifact Registry

```json
{
  "artifact_registry": {
    "enabled": true,
    "path": "docs/.artifact-registry.json",
    "auto_register": true,
    "retention_days": 30
  }
}
```

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `enabled` | boolean | true | Enable artifact registry |
| `path` | string | `docs/.artifact-registry.json` | Registry file path |
| `auto_register` | boolean | true | Auto-register new artifacts |
| `retention_days` | integer | 30 | Draft artifact retention |

### Hooks

```json
{
  "hooks": {
    "context_loading": {
      "enabled": true,
      "cache_ttl_seconds": 300,
      "max_artifacts": 10
    },
    "artifact_storage": {
      "enabled": true,
      "validate_schema": true
    },
    "notifications": {
      "enabled": false,
      "channels": []
    },
    "error_recovery": {
      "enabled": true,
      "max_retries": 3,
      "backoff_multiplier": 2.0
    }
  }
}
```

## Environment-Specific Configuration

Create environment-specific overrides:

- `.claude/config.json` - Base configuration
- `.claude/config.development.json` - Development overrides
- `.claude/config.staging.json` - Staging overrides
- `.claude/config.production.json` - Production overrides

Environment is detected from `NODE_ENV` or can be specified explicitly.

## Validation

Validate your configuration against the schema:

```bash
npx ajv validate -s .claude/config-schema.json -d .claude/config.json
```

## Best Practices

1. **Version your configuration** - Include in source control
2. **Use environment overrides** - Don't hardcode environment-specific values
3. **Start with defaults** - Only override what you need to change
4. **Validate on CI** - Check configuration in your CI pipeline
5. **Document deviations** - If you override defaults, document why

## References

- [Configuration Schema](.claude/config-schema.json)
- [Implementation Plan Standards](implementation-plan-standards.md)
- [Quality Gate Standards](implementation-plan-standards.md#quality-gate-standards)
