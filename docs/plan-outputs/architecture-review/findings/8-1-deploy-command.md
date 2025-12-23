# /deploy Command Design Specification

**Task:** 8.1 Design `/deploy` command (deployment workflows)
**Category:** Operations & Meta
**Priority:** HIGH
**Date:** 2025-12-20

---

## Executive Summary

The `/deploy` command provides comprehensive deployment workflow automation across environments (preview, staging, production). It orchestrates pre-flight checks, deployment execution, health verification, and rollback capabilities while integrating with various deployment platforms (Vercel, AWS, Docker, Kubernetes, etc.).

**Key Differentiator:** `/deploy` focuses on **deployment orchestration and environment management**, whereas `/ci` handles continuous integration pipeline configuration, and `/release` manages version bumping and release notes. It's the operational command for getting code into production safely.

**Core Philosophy:**
- **Safety-first deployment:** Comprehensive pre-flight checks before any deployment
- **Environment-aware:** Different strategies for preview/staging/production
- **Platform-agnostic:** Support for multiple deployment platforms with smart detection
- **Rollback-ready:** Always maintain ability to quickly revert deployments
- **Observable deployments:** Real-time status tracking and health verification

---

## Command Structure

### Primary Command: `/deploy`

**Base invocation** (without sub-command):
```
/deploy [environment]
```

Intelligently analyzes context (git branch, config files, current environment) and routes to appropriate deployment strategy.

### Sub-Commands

| Sub-command | Purpose | Input Artifacts | Output | Priority |
|-------------|---------|-----------------|--------|----------|
| `deploy:app` | Deploy application to environment | Git commit, config files | Deployment URL, `deploy-notes.md` | P0 |
| `deploy:config` | Deploy/sync configuration changes only | Config files, secrets | Config deployment log | P0 |
| `deploy:rollback` | Rollback to previous version | Deployment history | Rollback confirmation | P0 |
| `deploy:status` | Check deployment status and health | Environment name | Status report | P0 |
| `deploy:verify` | Verify deployment health post-deploy | Deployment URL | Health check report | P0 |
| `deploy:preview` | Create preview deployment from branch | Current branch | Preview URL | P1 |
| `deploy:promote` | Promote staging to production | Staging deployment | Production deployment | P1 |
| `deploy:canary` | Canary deployment with gradual rollout | App code, rollout config | Canary status | P2 |
| `deploy:blue-green` | Blue-green deployment strategy | App code | Deployment status | P2 |

---

## YAML Frontmatter Specification

### Primary Command: `.claude/commands/deploy.md`

```yaml
---
name: deploy
description: Deploy applications to preview, staging, or production environments with pre-flight checks, health verification, and rollback capabilities.
model: sonnet
allowed-tools: Read, Write, Grep, Glob, Bash, AskUserQuestion
argument-hint: [environment]
category: operations
output_artifacts:
  - deploy-notes.md
  - deployment-config.json
  - health-check-report.md
---
```

---

## Model Configuration Rationale

**Primary Model:** `sonnet` (Claude Sonnet 4.5)
- Strong at orchestration and decision-making
- Excellent at parsing deployment output and detecting issues
- Cost-effective for deployment workflows
- Sufficient for most deployment scenarios

**Haiku for:**
- `deploy:status` - Simple status checks don't require complex reasoning

**Consider Upgrade to Opus for:**
- Complex multi-region deployments
- High-criticality production deployments requiring maximum safety
- Novel deployment platforms requiring adaptation
- Incident response during failed deployments

---

## Deployment Strategy

### 1. Platform Detection Phase

Automatically detect deployment platform by scanning for:

**Platform Indicators:**
- Vercel: `vercel.json`, `.vercel/`
- Netlify: `netlify.toml`, `.netlify/`
- AWS: `.aws/`, `cloudformation/`, `cdk.json`
- Docker: `Dockerfile`, `docker-compose.yml`
- Kubernetes: `k8s/`, `kubernetes/`, `*.k8s.yaml`

### 2. Pre-Flight Checks Phase

**Critical Checks (Must Pass):**
- All tests passing
- Build successful
- No uncommitted changes (for production)
- On correct branch
- Environment variables configured

### 3. Health Verification Phase

Automated health checks including HTTP endpoints, database connectivity, and performance metrics.

---

## Output Artifacts

### deploy-notes.md Template

Includes deployment summary, pre-flight results, deployment steps executed, health check results, and rollback information.

### deployment-config.json Schema

Contains metadata, deployment details, pre-flight results, environment variables status, health checks, and rollback information.

---

## Workflow Integration

### Upstream Commands (Inputs)
- `/test:run` - Verify tests pass before deployment
- `/validate:build` - Ensure build succeeds
- `/audit:security` - Security checks before production
- `/release:notes` - Include in deployment documentation

### Downstream Commands (Outputs)
- `/document`, `/changelog` - Deployment history and documentation
- `/monitor`, `/analyze:performance` - Performance tracking
- `/validate:production`, `/debug` - Production health validation

---

## Example Usage Scenarios

### Example 1: Standard Production Deployment
Pre-flight checks, user confirmation, deployment execution, health verification.

### Example 2: Quick Preview Deployment
Fast iteration with minimal checks, preview URL generation.

### Example 3: Rollback After Issues
Check current deployment, rollback to previous version, health verification.

---

## Differentiation from Related Commands

| Aspect | `/deploy` | `/ci` | `/release` |
|--------|-----------|-------|-----------|
| **Focus** | Deploy to environments | Configure CI/CD pipelines | Version management |
| **Scope** | Runtime deployment | Build automation | Version bumping, changelog |
| **Output** | Live deployments, URLs | Pipeline configs | Release artifacts, tags |

---

## Priority Classification

### P0 (Must Have)
- `/deploy`, `/deploy:app`, `/deploy:rollback`, `/deploy:status`, `/deploy:verify`, `/deploy:config`

### P1 (Should Have)
- `/deploy:preview`, `/deploy:promote`

### P2 (Nice to Have)
- `/deploy:canary`, `/deploy:blue-green`

---

**Phase 8 Task 8.1 Status: COMPLETE**
