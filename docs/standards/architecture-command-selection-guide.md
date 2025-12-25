# Architecture Command Selection Guide

This guide helps users select the appropriate architecture/design command for their needs.

## Command Scope Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│                        /architect                               │
│    System-level: boundaries, technology, quality attributes    │
├─────────────────────────────────────────────────────────────────┤
│                         /design                                 │
│    Component-level: interfaces, contracts, interactions        │
├─────────────────────────────────────────────────────────────────┤
│                        /refactor                                │
│    Function-level: implementation, structure, complexity       │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Decision Matrix

| Need | Scope | Command | Output |
|------|-------|---------|--------|
| Define system boundaries | System | `/architect:system` | architecture.md |
| Choose technologies | System | `/architect:evaluate` | adr-*.md |
| Define component interface | Component | `/design:component` | design-spec.md |
| Specify API contract | Component | `/design:api` | interfaces.md |
| Design data model | Component | `/design:data` | design-spec.md |
| Design state machine | Component | `/design:state` | state-machine.md |
| Extract method | Function | `/refactor:extract` | Code changes |
| Rename symbol | Function | `/refactor:rename` | Code changes |
| Apply design pattern | Function | `/refactor:patterns` | Code changes |
| Reduce complexity | Function | `/refactor:simplify` | Code changes |

## Detailed Scope Definitions

### `/architect` - System Level
Use when you need to:
- Define or modify system-wide boundaries
- Make technology stack decisions
- Document architectural decisions (ADRs)
- Define cross-cutting concerns (security, observability)
- Plan deployment topology
- Create C4 diagrams

**Key artifacts:**
- architecture.md (C4 model format)
- components.json (component registry)
- adr-*.md (Architecture Decision Records)

### `/design` - Component Level
Use when you need to:
- Define component interfaces and contracts
- Specify internal component structure
- Design interaction patterns (sequence diagrams)
- Define state machines for complex behavior
- Design data models for a component

**Key artifacts:**
- design-spec.md (component specification)
- interfaces.md (TypeScript/Python interfaces)
- interaction-diagrams.md (Mermaid sequence diagrams)

### `/refactor` - Function Level
Use when you need to:
- Extract methods, classes, or modules
- Rename symbols across codebase
- Simplify complex implementations
- Apply design patterns to existing code
- Modernize syntax or migrate APIs
- Add type annotations

**Key artifacts:**
- refactoring-plan.md (scope and impact)
- impact-analysis.json (affected files)
- Code changes (actual implementation)

## Workflow Examples

### Starting a New Feature

```
1. /architect:system    → Define where it fits in the system
2. /design:component    → Design the component interface
3. /implement           → Implement the code
4. /refactor:simplify   → Clean up implementation
```

### Adding a New Service

```
1. /architect:system    → Add to container architecture
2. /architect:adr       → Document technology decision
3. /design:api          → Design API contracts
4. /design:data         → Design data model
5. /implement           → Implement the service
```

### Major Refactoring

```
1. /architect:evaluate  → Consider architectural changes
2. /design:component    → Redesign affected components
3. /refactor:patterns   → Apply new patterns
4. /refactor:organize   → Reorganize file structure
```

### Interface Changes

```
1. /design:api          → Update interface specification
2. /refactor:types      → Update type annotations
3. /refactor:rename     → Rename affected symbols
```

## Handoff Points

### Architect → Design
- architecture.md provides component boundaries
- components.json lists components to design
- ADRs provide constraints to follow

### Design → Implement
- design-spec.md provides implementation guidance
- interfaces.md provides TypeScript/Python interfaces
- interaction-diagrams.md provides integration patterns

### Design → Refactor
- design-spec.md guides pattern selection
- interfaces.md informs type annotations

## Key Differentiators

1. **Strategic vs Tactical**
   - `/architect` makes strategic decisions
   - `/design` makes tactical decisions
   - `/refactor` makes implementation decisions

2. **Creates vs Changes**
   - `/architect` creates architecture documentation
   - `/design` creates specifications
   - `/refactor` changes code

3. **Scope of Impact**
   - `/architect` impacts entire system
   - `/design` impacts single component
   - `/refactor` impacts individual files

4. **Decision Persistence**
   - `/architect` decisions in ADRs (years)
   - `/design` specifications (months)
   - `/refactor` changes (immediate)
