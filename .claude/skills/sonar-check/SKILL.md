---
name: sonar-check
description: 'Analyze changed or specified files for SonarQube/static-analysis code quality issues including code smells, bugs, vulnerabilities, cognitive complexity, and coverage gaps in Angular projects'
---

# sonar-check

Analyze files for SonarQube / static-analysis quality issues.

## When to Use This Skill

Use this skill when:
- A user asks to check for Sonar issues, code quality, or lint
- After implementing changes, before committing
- You need to verify code meets quality standards
- Keywords: sonar, code quality, code smells, lint, static analysis, sonarqube, sonarcloud

## Project Context Detection

Before analyzing:

1. **`PROJECT-CONVENTIONS.md`** — read max line length, max cognitive complexity, linter, static analysis tool, project key
2. **Linter config** (`tslint.json`, `.eslintrc.*`, `eslint.config.*`) — pull the project's enforced rules
3. **Sonar config** (`sonar-project.properties` if present) — pull project-specific overrides

## Workflow

1. **Identify** changed files (or user-specified files)
2. **Analyze** each file against the rules below + project-specific rules
3. **Report** issues with severity and line numbers

## Universal Quality Rules

### Critical
- No unused variables or imports (dead code)
- No empty blocks (`if`, `catch`, lifecycle hooks, `subscribe`)
- No duplicate string literals (3+ occurrences → extract constant)
- No cognitive complexity above the project limit (default 15) per method

### Major
- Type safety — avoid `any`, use explicit types
- Subscription management — all subscriptions cleaned up (`ngOnDestroy`, `takeUntilDestroyed`, `takeUntil`)
- Null safety — check before member access (`?.`, `??`)
- Error handling — HTTP calls must have error handlers (`catchError`)

### Minor
- Naming conventions — camelCase for variables/methods, PascalCase for classes
- No `console.log/warn/error` in production code
- No commented-out code blocks
- No `// TODO` or `// FIXME` without tracking ID

### Info
- Within project max line length (default 140)
- Linter compliance (component / directive selector prefix)

## Output Format

```
## Quality Analysis: <filename>

| # | Severity | Rule | Line | Issue | Fix |
|---|----------|------|------|-------|-----|
| 1 | Critical | dead-code | 42 | Unused import `X` | Remove import |

**Summary**: X critical, X major, X minor, X info
```

## Rules

- Do NOT modify files — report issues only
- Check ALL changed files, not just one
- Focus on rules that the configured static analysis tool will actually flag
- Reference the project-specific Sonar key from `PROJECT-CONVENTIONS.md` if available
