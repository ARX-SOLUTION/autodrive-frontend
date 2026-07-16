# CLAUDE.md — autodrive-frontend (tenant CRM)

React 18 + Vite + TS · shadcn/ui + Tailwind · Zustand (auth only) + TanStack Query · react-hook-form + zod · Vitest.

**Shared rules — read on demand** (workspace-root `CLAUDE.md` is always loaded alongside this file):

- Engineering rules (parallelism, simplicity, surgical changes, checkpoint discipline, best practices, cross-repo propagation, pre-flight checklist): `../docs/agents/engineering-rules.md`
- Git workflow (pre-push sync, post-merge cleanup, post-PR conflict check): `../docs/agents/git-workflow.md`
- Skills (ui-ux-pro-max, backend suite, Matt Pocock, etiquette): `../docs/agents/skills.md`

## Advisor first — plan before code

**Advisor = Fable 5 (plans) · Executor = Opus 4.8 (implements; subagents `model: opus`).** Complex task → explicit Advisor plan first (files, interfaces/signatures, error handling, edge cases, pass/fail validation criteria); the Executor implements it exactly. Trivial edits skip the Advisor. Executor hits ambiguity → flag back, never resolve silently. Unclear requirement → ask ONE specific question with grep evidence; simpler way exists → push back before coding. Full routing: root `CLAUDE.md`.

## Verification — every significant change

`npm run typecheck && npm run lint && npm test -- --run && npm run build`

⚠️ NEVER bare `npx tsc --noEmit`: root tsconfig uses project references (`files: []`) — a bare run checks nothing and exits 0. Always the npm script.

## i18n — uz/ru/en MANDATORY (this repo only; admin panel is uz-only)

- All user-facing text via `useTranslation()`/`t()` — no hardcoded strings anywhere (toasts, labels, placeholders, empty states, errors).
- New page/component → add keys to `src/i18n/locales/{uz,ru,en}.json` BEFORE writing the component; all 3 locale files in the same PR; key sets must stay identical across locales.
- Key naming: `"pagename.element.action"` — e.g. `students.table.name`, `attendance.status.present`.

## Entity detail views

Always a dedicated route + tabs (e.g. `/students/:id`) — deep-linkable, back-button-safe, `React.lazy`-splittable. Never modal-only. Edit stays a launched modal alongside the route. A row/card that opens a detail view navigates; it does not open a modal. Precedent: `StudentDetailPage`, `BranchDetailPage`.

## Tenant discipline (FE)

`branchId` comes from the JWT via `authStore` only — never independent FE state, never URL-as-auth-source. Query keys include `branchId`; branch switch → invalidate queries; logout → `queryClient.clear()`.

## Parity

A feature added here with an admin-panel page-type equivalent gets mirrored there (shared key names where possible).
