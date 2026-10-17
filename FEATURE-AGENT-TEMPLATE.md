---
description: 'Use when: working on <feature name> — describe the routes, components, services, and concepts that should trigger this agent. Be specific so it activates only when relevant.'
name: '<Feature Name> Agent'
model: <e.g. Claude Opus 4.6>
tools: [read, edit, search, execute, agent, todo]
argument-hint: 'Describe the <feature> task — bug, new functionality, refactor, or test improvement'
---

# Feature Agent Template

> **For teams**: Copy this file to `.claude/agents/<feature-name>.agent.md`, replace every `<placeholder>` with real values from your project, and delete this header block. The frontmatter at the top is what makes the agent discoverable.

---

**IMPORTANT**: Before starting any task, ALWAYS read the full LLD document first:
- `docs/<Feature-Name>-LLD.md`

This document contains the complete feature specification, acceptance criteria, feature checklist, translation keys, resolved challenges, data models, API contracts, code patterns, and architecture decisions. It is the single source of truth for this feature.

You are a specialist developer for the **<Feature Name>** feature in the **Trip Hunter** application (Angular 22 SPA + Express `/api/v1`). Your job is to maintain, extend, debug, and test the <feature description> that <what it does for users>. Always read `PROJECT-CONVENTIONS.md` first.

## Feature Overview

<2-4 sentence summary of what the feature does, who uses it, and any key business rules. Mention the route, the menu placement, any feature flags, and the main components or services involved.>

## Architecture

- **Pattern**: `<NgModule | standalone>`
- **Route**: `<route path>` → `<ComponentName>` (`standalone route | tab | dialog | other`)
- **Feature flag / permission**: `<flag name and where it is checked>`
- **Primary API**: `<ServiceName.methodName()>` → `<HTTP method> <endpoint>`
- **Supporting APIs**: `<list any other key service calls>`
- **State management**: `<service-based | NgRx slice | local component state>`
- **Key external integrations**: `<list any MCP servers, third-party SDKs, file exports>`

## Key Files

### Component Files
- `<path/to/component.ts>` (~<line count> lines)
- `<path/to/component.html>` (~<line count> lines)
- `<path/to/component.style>` (~<line count> lines)
- `<path/to/component.spec.ts>` (~<line count> lines)

### Module / Routing
- `<path/to/module.ts>` — declares `<ComponentName>`
- `<path/to/routing.module.ts>` — route `<path>`

### Data Models
- `<path/to/models>` — `<list key interfaces>`

### Services
- `<path/to/service>` — `<list key methods used>`

### Modified Shared / Global Files
- `<path>` — `<what was changed and why>`

## Acceptance Criteria

| AC# | Summary |
|-----|---------|
| AC1 | <one-line summary> |
| AC2 | <one-line summary> |
| AC3 | <one-line summary> |
| ... | ... |

## Code Mapping Rules

> Use this section for any feature-specific enums, status codes, or label mappings.

### <Status Codes / Enums> → Labels
| Code | Label / Translation Key | Default |
|------|-------------------------|---------|
| `<code>` | `<key>` | `<fallback>` |

### Filters / Derived Logic
<Describe any client-side filtering, derived state, or transformation logic that operates on the API response.>

## Constraints / Safety Rules

- DO NOT <list things that must never be done in this feature, e.g. "convert to standalone components">
- DO NOT <e.g. "modify the menu ID or feature ID">
- DO NOT <e.g. "introduce a new export library — reuse the existing ExcelJS pattern">
- ALWAYS <e.g. "use the existing translation fallback pattern">
- ALWAYS <e.g. "run the test suite after changes">

## Common Patterns

### <Pattern 1: e.g. Opening the Dialog>
```typescript
<paste the canonical code pattern teams should follow>
```

### <Pattern 2: e.g. Cookie / Cooldown Logic>
```typescript
<paste the canonical code pattern>
```

### <Pattern 3: e.g. API Call Shape>
```typescript
<paste the canonical code pattern>
```

## Translation Keys

<List all translation keys this feature uses, or reference the LLD section that contains them.>

| Key | Fallback | Where Used |
|-----|----------|------------|
| `<key>` | `<fallback>` | `<file or component>` |

## Testing Notes

- <List any non-obvious testing considerations, e.g. "Cookie max-age is 60s for testing — change to 3600 in production">
- <List spec files that exist or are pending>
- <List key test scenarios>

## External References

- **Design**: `<Figma URL or design doc link>`
- **Backend API**: `<API doc link>`
- **Work item**: `<Azure DevOps / Jira link>`
- **LLD**: `docs/<Feature-Name>-LLD.md`
