---
name: run-test-suite
description: 'Execute the Angular test suite (Jasmine/Karma, Jest, or Vitest), parse failures from output, identify root causes, and suggest targeted fixes for failing tests'
---

# run-test-suite

Execute the project's test suite and analyze results.

## When to Use This Skill

Use this skill when:
- A user asks to run tests or check test status
- You need to verify changes pass all tests
- You need to identify and fix test failures
- Keywords: run tests, npm test, test suite, check tests, karma, jest, vitest, test failures

## Project Context Detection

Before running:

1. **`PROJECT-CONVENTIONS.md`** — read the test command and test framework
2. **`package.json`** scripts — find the actual test command

## Workflow

### 1. Detect the test command and framework

Check `PROJECT-CONVENTIONS.md` first. If not specified, check `package.json` scripts (`test`, `test:ci`, `test:headless`).

Common framework patterns:

**Jasmine + Karma** (typical Angular CLI default):
```
npx ng test --no-watch --browsers=ChromeHeadless
```

**Jest** (when `jest-preset-angular` is installed):
```
npm test -- --ci
```

**Vitest** (when `@analogjs/vitest-angular` or similar is installed):
```
npx vitest run
```

### 2. Run the tests
Use the detected command, capture full output.

### 3. Parse the output for:
- Total specs, passed, failed, skipped counts
- Failed spec names with file locations
- Error messages and stack traces

### 4. Categorize failures by type:
- Missing provider (`NullInjectorError`)
- Missing module import (`not a known element`)
- Async timing (`timers still in queue`)
- Observable not emitting
- HTTP mock mismatch
- Missing `TranslateModule` / i18n test setup
- Standalone component import missing

### 5. Report structured summary with fix suggestions

## Output Format

```
## Test Results Summary
- Framework: Jasmine/Karma | Jest | Vitest
- Total: X | Passed: X | Failed: X | Skipped: X

## Failures
| # | Spec | File | Error Type | Suggested Fix |
|---|------|------|------------|---------------|
| 1 | ... | ... | ... | ... |
```

## Rules

- Never modify production source files to fix tests
- Run tests headless / non-interactive (`--no-watch`, `--ci`, `run`)
- If the output is too long, focus on the FAILED specs only
- For fix recommendations, hand off to `@angular-test-fixer`
