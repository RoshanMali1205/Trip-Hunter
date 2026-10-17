---
name: scaffold-component
description: 'Generate a new Angular component (NgModule or standalone) with template, styles, and unit test spec, following the project''s conventions'
---

# scaffold-component

Generate a complete Angular component scaffold for the project.

## When to Use This Skill

Use this skill when:
- A user asks to create a new component
- You need to scaffold a component with all associated files
- Keywords: new component, create component, scaffold component, add component

## Project Context Detection

Before scaffolding:

1. **`PROJECT-CONVENTIONS.md`** — read component pattern (NgModule / standalone), preprocessor (LESS / SCSS / CSS), selector prefix, test framework, i18n pattern
2. **`angular.json`** — confirm preprocessor and inline style settings
3. **2–3 nearby components** — copy the existing patterns (file structure, naming, imports, lifecycle usage)

## Requirements

1. **Analyze** the target module / folder to determine the correct location and naming
2. **Generate** the following files:
   - `<name>.component.ts` — Component class with the project's selector prefix
   - `<name>.component.html` — HTML template with the project's i18n pattern for all text
   - `<name>.component.<ext>` — Component-scoped styles in the project's preprocessor (`.less`, `.scss`, `.css`)
   - `<name>.component.spec.ts` — Unit test spec in the project's test framework
3. **Register** the component:
   - **NgModule project**: add to the parent NgModule's `declarations` array
   - **Standalone project**: ensure the component is `standalone: true` and importable directly
4. **Follow** existing patterns in the target folder (check nearby components)

## Conventions

- Selector prefix: from `PROJECT-CONVENTIONS.md` (default `app-`, kebab-case)
- Use the project's component pattern — do NOT mix NgModule and standalone in the same area
- Use the project's i18n pattern for all user-facing strings
- Use the project's preprocessor for styles
- Component-scoped styles with `styleUrls`
- Follow existing naming patterns in the target folder

## Component Templates

### NgModule pattern
```typescript
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: '<prefix>-<name>',
  templateUrl: './<name>.component.html',
  styleUrls: ['./<name>.component.<ext>']
})
export class <Name>Component implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  constructor() {}

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

### Standalone pattern (Trip Hunter default)
```typescript
import { Component, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-<name>',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './<name>.page.html',
  styleUrl: './<name>.page.scss',
})
export class <Name>Page {
  readonly loading = signal(false);
}
```

Prefer `*.page.ts` for routed screens and `*.component.ts` for shared widgets. Prefer Signals + `inject()`.

## What to Avoid

- Do NOT introduce NgModules for new Trip Hunter features
- Do NOT use a different preprocessor than SCSS
- Do NOT introduce an i18n library — English copy is intentional
- Do NOT hardcode brand colors — use `--th-*` tokens
- Do NOT skip the Vitest spec file
