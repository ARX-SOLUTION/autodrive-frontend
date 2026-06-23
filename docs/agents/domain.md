# Domain docs: single-context

This repo has a single `CONTEXT.md` at the root that contains the full domain glossary and architecture decisions.

Skills that consume domain context (`improve-codebase-architecture`, `diagnose`, `tdd`):

1. Read `CONTEXT.md` at repo root for domain language.
2. Architecture decisions live inline in `CONTEXT.md` (no separate ADR directory yet).
3. For cross-repo domain questions, see sibling repos:
   - `autodrive-backend` — NestJS API backend
   - `autodrive-admin-panel` — platform admin React UI

If the repo grows multiple domain contexts in the future, create `CONTEXT-MAP.md` at root pointing to per-context files.
