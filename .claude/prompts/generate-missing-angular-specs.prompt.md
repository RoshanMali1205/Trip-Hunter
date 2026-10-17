Generate missing Angular unit test spec files for the selected folder or files.

## Rules
- Read `PROJECT-CONVENTIONS.md` first to detect the test framework (Jasmine/Karma, Jest, or Vitest).
- Consider only eligible source files such as `.ts`, `.service.ts`, `.component.ts`, `.directive.ts`, `.pipe.ts`, `.guard.ts`, `.resolver.ts`, `.interceptor.ts`.
- Skip any file that already has a matching `.spec.ts`.
- Do not modify any production source file.
- Do not modify `.ts`, `.service.ts`, `.component.ts`, `.directive.ts`, `.pipe.ts`, `.html`, `.css`, `.scss`, `.sass`, or `.less`.
- Do not modify existing `.spec.ts` files.
- Use only libraries and helpers already supported by `package.json`, `angular.json`, `tsconfig*`, and nearby existing spec files.
- Do not add or recommend new npm packages during generation.
- Follow the project's existing testing patterns (Jasmine/Karma, Jest, or Vitest).
- Aim for the coverage target defined in `PROJECT-CONVENTIONS.md` (default 85%) where feasible.

## Large file rule
If any selected file is large or complex:
- first analyze and break it into logical testing sub-tasks
- then complete those sub-tasks in order
- finally generate one complete spec file
- do not stop at planning only; finish implementation wherever feasible

## Difficult test case rule
If some test cases require unusually deep analysis, hidden assumptions, brittle setup, or risky guessing:
- omit only those specific test cases
- complete all other feasible tests
- clearly report the omitted cases and why they were omitted

## What to do
1. Inspect `PROJECT-CONVENTIONS.md`, `package.json`, `angular.json`, `tsconfig*`, and nearby existing unit tests.
2. Find eligible source files in the selected scope.
3. Skip files that already have matching `.spec.ts`.
4. Create only missing spec files.
5. Cover public methods, branches, fallback logic, observables, service dependencies, and error paths.
6. If a file requires source-code changes for testability, do not edit it; report the limitation.

## Final response format
Return:
- created spec files
- skipped files and reason
- files requiring manual intervention
- omitted difficult test cases and reason
- recommended command to run coverage (read from `PROJECT-CONVENTIONS.md`)
- likely remaining uncovered areas
