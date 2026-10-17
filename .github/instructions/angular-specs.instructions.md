---
description: 'Use when: creating or editing Angular unit test spec files, TestBed configuration, mocking services, or improving test coverage.'
applyTo: '**/*.spec.ts'
---

# Angular Unit Test Conventions

## Framework (Read First)

Read `PROJECT-CONVENTIONS.md` and `package.json` to determine the project's test framework:

- **Jasmine + Karma** (typical Angular CLI default)
- **Jest** (with `jest-preset-angular`)
- **Vitest** (with Angular adapter)

Do NOT introduce a different framework. Match the project's stack.

## Mocking Patterns

### Jasmine + Karma
- Use `jasmine.createSpyObj<T>('Name', ['method1', 'method2'])` for service mocks
- Use `HttpClientTestingModule` + `HttpTestingController` for HTTP service tests
- Use `RouterTestingModule` for routing tests
- Configure spies in `beforeEach` with `and.returnValue(of(...))` for observable methods

### Jest
- Use `jest.fn()` for spies, `jest.spyOn()` for partial mocks
- Use `jest.mock('path')` for module-level mocks
- Same `HttpTestingController` pattern from `@angular/common/http/testing`
- `mockReturnValue(of(...))` for observable returns

### Vitest
- Use `vi.fn()` for spies, `vi.spyOn()` for partial mocks
- Use `vi.mock('path')` for module-level mocks
- Same `HttpTestingController` pattern
- `mockReturnValue(of(...))` for observable returns

## TestBed Setup (NgModule example)

```typescript
beforeEach(async () => {
  await TestBed.configureTestingModule({
    declarations: [MyComponent],
    imports: [SharedModule, TranslateModule.forRoot(), HttpClientTestingModule],
    providers: [
      { provide: MyService, useValue: jasmine.createSpyObj('MyService', ['getData']) }
    ]
  }).compileComponents();
});
```

## TestBed Setup (Standalone example)

```typescript
beforeEach(async () => {
  await TestBed.configureTestingModule({
    imports: [MyComponent, TranslateModule.forRoot(), HttpClientTestingModule],
    providers: [
      { provide: MyService, useValue: jasmine.createSpyObj('MyService', ['getData']) }
    ]
  }).compileComponents();
});
```

## Async Testing

- Use `fakeAsync` + `tick` (Jasmine) / `jest.useFakeTimers()` + `jest.advanceTimersByTime()` (Jest) / `vi.useFakeTimers()` (Vitest) for timer-based async
- Use `done` callback for promise-based tests when needed
- Use `of()` and `throwError()` for observable mock returns
- Call `fixture.detectChanges()` after setup to trigger `ngOnInit`

## Coverage Targets

- Aim for the coverage target in `PROJECT-CONVENTIONS.md` (default 85%)
- Prioritize: public methods, branches, observable success/error flows, guard conditions, fallback logic
- Do not inflate coverage with trivial assertions or empty test blocks
- Run coverage using the project's test command

## Preservation Rules

- Do NOT modify production `.ts`, `.html`, or style files when writing tests
- Do NOT modify existing `.spec.ts` files unless explicitly asked
- If a file is hard to test without source changes, report the limitation

## Sonar Cleanliness

- No unused imports, variables, mocks, or spies
- No commented-out code or empty `describe`/`it` blocks
- No duplicate test setup — centralize in `beforeEach`
- Use clear, descriptive test names
- Avoid unnecessary `any` — use typed spies where possible

## Cleanup

- Call `httpMock.verify()` in `afterEach` when using `HttpTestingController`
- Unsubscribe or clean up in `afterEach` when tests create subscriptions
