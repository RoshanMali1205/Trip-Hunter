---
name: conventional-commit
description: 'Generate conventional commit messages by analyzing staged git changes and applying the Conventional Commits specification with project-specific scopes'
---

# conventional-commit

Generate conventional commit messages from staged changes.

## When to Use This Skill

Use this skill when:
- A user asks to commit changes or write a commit message
- After completing implementation work
- Keywords: commit, commit message, stage, conventional commit, git commit

## Project Context Detection

Before composing a message:

1. **`PROJECT-CONVENTIONS.md`** — read project name and main folder structure to derive valid scopes
2. **`.commitlintrc*`** if present — match the project's commit lint rules
3. **Recent commits** (`git log -10 --oneline`) — match the team's existing commit style

## Workflow

1. Run `git status` to review changed files
2. Run `git diff --cached` to inspect staged changes (or `git diff` if nothing staged)
3. Determine the commit type and scope from the changes (use the project's main folder names as scopes)
4. Construct the commit message using Conventional Commits format

## Commit Message Structure

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types
| Type | When to Use |
|------|-------------|
| `feat` | New feature or functionality |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, style file changes (no logic change) |
| `refactor` | Code restructuring (no feature/fix) |
| `perf` | Performance improvement |
| `test` | Adding or fixing tests |
| `build` | Build system or dependencies |
| `ci` | CI/CD configuration |
| `chore` | Maintenance tasks |

### Scopes
Use the Angular feature module name as scope. Read `PROJECT-CONVENTIONS.md` and the top-level folders under `src/app/` to derive valid scopes for the project.

Common Angular scopes include: `core`, `shared`, `auth`, `dashboard`, `admin`, `settings`, `<feature-area>`.

## Examples

```
feat(dashboard): add date range filter
fix(admin): correct user role permission check
test(shared): add specs for pagination component
style(settings): align responsive layout of preference table
refactor(core): extract common HTTP error handling to base service
chore(deps): bump rxjs to 7.8.1
```

## Rules

- Keep the description under 72 characters
- Use imperative mood: "add" not "added" or "adds"
- Do NOT capitalize the first letter of the description
- Do NOT end with a period
- Include breaking change footer if applicable: `BREAKING CHANGE: <description>`
- Match any custom rules from the project's commitlint config
