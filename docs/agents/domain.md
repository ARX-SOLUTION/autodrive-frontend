# Domain docs: single-context

This repo has a single `CONTEXT.md` at the root: the domain glossary and product boundaries. Routes, state, UI architecture, generated API types, and i18n setup live in `docs/architecture/overview.md`.

Skills that consume domain context (`improve-codebase-architecture`, `diagnose`, `tdd`):

1. Read `CONTEXT.md` at repo root for domain language.
2. Architecture decisions live in `docs/architecture/overview.md` (no separate ADR directory yet).
3. For cross-repo domain questions, see sibling repos:
   - `autodrive-backend` — NestJS API backend
   - `autodrive-admin-panel` — platform admin React UI

If the repo grows multiple domain contexts, add an explicit root-level context map pointing to the focused files.
