# autodrive-frontend agent router

The workspace-root `AGENTS.md` is canonical. This file adds tenant-CRM rules. Versions and scripts live in `package.json`; do not copy them here.

## Read on demand

Paths marked (workspace) are not in this repo: resolve them from the workspace root, the nearest ancestor directory that contains `docs/agents/git-workflow.md`. Unmarked paths are repo-relative.

| Trigger                                                            | Read                                           |
| ------------------------------------------------------------------ | ---------------------------------------------- |
| Product language, roles, and product boundaries                    | `CONTEXT.md`                                   |
| Routes, state, UI architecture, generated API types, or i18n setup | `docs/architecture/overview.md`                |
| API contracts, React conventions, or cross-repo propagation        | `docs/agents/engineering-rules.md` (workspace) |
| Branch, commit, rebase, conflict, or PR work                       | `docs/agents/git-workflow.md` (workspace)      |

## Frontend invariants

- User-facing text uses `t()` and every new key lands in `uz`, `ru`, and `en` with identical key sets.
- Tenant identity comes from authenticated state; tenant query keys include `branchId`, and logout or branch switch clears or invalidates tenant cache.
- Check the admin panel when a feature or backend contract has an equivalent surface there.

## Validation

`pnpm run typecheck && pnpm run lint && pnpm test -- --run && pnpm run build`

Use the `typecheck` script; a bare `tsc --noEmit` does not validate this project-reference setup.
