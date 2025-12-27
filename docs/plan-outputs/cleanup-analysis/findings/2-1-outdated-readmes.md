# Finding: Outdated Documentation - README Files

## Summary

Audit of README files in the `/home/benjamin/tools/dev_workflow` codebase revealed one critical accuracy issue where the mock data README references an API endpoint (`GET /api/conflicts`) that does not exist in the actual API server implementation. Additionally, there are documentation examples referencing optional dependencies (React Query) and development tools (Storybook) that may not be available in the project, which could confuse developers following the documentation.

All other file references and command examples have been verified as accurate and functional.

## Items for Review/Removal

| File | Issue | Risk | Notes |
|------|-------|------|-------|
| `docs/plan-outputs/git-workflow-phase5-worktrees/mock-data/README.md` | References non-existent endpoint `/api/conflicts` | High | Line 13: `conflicts.json` file claims to map to `GET /api/conflicts` endpoint, but this endpoint does not exist in `scripts/api-server.js`. The `conflicts.json` file exists but has no corresponding backend endpoint. |
| `docs/plan-outputs/orchestrator-api-server/README.md` | Example code imports `@tanstack/react-query` which is not in project dependencies | Medium | Lines 116-127: React Query examples are shown but this library is not listed in `package.json`. Users following these examples will encounter import errors. |
| `docs/plan-outputs/git-workflow-phase5-worktrees/mock-data/README.md` | Reference to Storybook setup without .storybook directory | Medium | Lines 38-48: Storybook example references `.storybook/preview.ts` but the `.storybook/` directory does not exist in the project. This is example documentation that may confuse setup. |
| `docs/plan-outputs/orchestrator-api-server/README.md` | Hardcoded localhost URLs in examples | Low | Lines 32, 97, 119: Examples use hardcoded `http://localhost:8000` URLs. These should be environment-configurable for production deployments. This is more of a best-practice issue. |

## Recommendations

### Priority 1 (Fix First)
- Remove the `conflicts.json` file from the mock data directory OR add the `GET /api/conflicts` endpoint to `scripts/api-server.js` to make the documentation accurate
- Update the mock data README to remove or mark as conditional the conflicts.json file reference if the endpoint is intentionally not implemented

### Priority 2 (Update Documentation)
- Either add `@tanstack/react-query` to the project's `package.json` dependencies or remove the React Query example code from the orchestrator API server README
- If Storybook is not part of the current project setup, remove the Storybook example from the mock data README OR create the `.storybook/` directory with proper configuration

### Priority 3 (Best Practices)
- Update hardcoded localhost URLs in orchestrator README examples to use environment variables or configuration (e.g., `process.env.REACT_APP_API_URL || 'http://localhost:8000'`)

## Items Verified as Accurate (No Action Needed)

- All schema JSON files referenced in `/docs/schemas/README.md` exist and contain correct schema definitions
- All implementation plan files referenced in `/docs/plans/README.md` exist in `/docs/plan-templates/` (38 plans verified)
- All referenced documentation files and standards exist (implementation-plan-standards.md, command-dependency-graph.md, artifact-compatibility-matrix.md, etc.)
- Git hook pre-commit file is executable and properly documented
- Python scripts referenced in orchestrator API README all exist and are executable (run_api_server.py, plan_orchestrator.py, generate_api_types.py)
- Node.js scripts exist and match documentation (api-server.js, status-cli.js, validate-plan-format.js)
- Finding files referenced in mock data README exist in the findings directory
- OpenAPI spec file exists at the referenced path

## Files Affected

- `docs/plan-outputs/git-workflow-phase5-worktrees/mock-data/README.md` - issues found
- `docs/plan-outputs/orchestrator-api-server/README.md` - issues found
- `docs/schemas/README.md` - verified accurate
- `docs/plans/README.md` - verified accurate
- `.githooks/README.md` - verified accurate
