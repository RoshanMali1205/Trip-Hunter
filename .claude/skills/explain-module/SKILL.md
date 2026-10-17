---
name: explain-module
description: 'Analyze an Angular module or feature area architecture including its components, services, routing, dependencies, and data flow'
---

# explain-module

Analyze and explain the architecture of an Angular module or feature area.

## When to Use This Skill

Use this skill when:
- A user asks to understand a module's structure
- Before planning features, to understand the target area
- When onboarding or exploring unfamiliar parts of the codebase
- Keywords: explain module, module architecture, how does X work, module structure, data flow, dependencies

## Project Context Detection

Before analyzing:

1. **`PROJECT-CONVENTIONS.md`** — read whether the project uses NgModule, standalone, or mixed
2. **`angular.json`** — confirm the project's source root

## Workflow

1. **Locate** the module or feature folder
   - For NgModule projects: find `*.module.ts` and `*-routing.module.ts`
   - For standalone projects: find the feature's `index.ts` / route definitions / standalone components
2. **Catalog** components, services, pipes, directives, guards, resolvers
3. **Map** the routing structure (lazy-loaded children, guards, resolvers)
4. **Identify** imported modules (NgModule) or imported dependencies (standalone)
5. **Trace** key data flows (service → component → template)
6. **Check** for a feature-scoped `shared/` folder

## Output Format

```
## Feature Area: <Name>
**Path**: `src/app/<area-name>/`
**Pattern**: NgModule | Standalone | Mixed
**Lazy-loaded**: Yes/No (route: `<path>`)

### Components (<count>)
| Component | Selector | Purpose |
|-----------|----------|---------|
| ... | ... | ... |

### Services (<count>)
| Service | Scope | Key Methods |
|---------|-------|-------------|
| ... | root / module | ... |

### Routing
- Route structure with guards and child routes

### Dependencies
- Imported modules / standalone imports
- Cross-feature service dependencies

### Data Flow
- Key flows: API → Service → Component → Template

### Shared Folder
- Feature-scoped shared components/services if present
```

## Rules

- Read-only analysis — do NOT modify any files
- Cover all declared components, not just the main ones
- Note any unusual patterns or potential issues
- Adapt the report to whether the project uses NgModule or standalone
