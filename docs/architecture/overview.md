# Tenant frontend architecture overview

UI architecture, state management, routes, tech stack, generated API types, cross-repo relationships, and i18n setup for `autodrive-frontend`. Product language, roles, and product boundaries live in `CONTEXT.md`.

## UI Architecture — Warm Paper (tenant CRM)

- **Mode:** Light/dark via `.dark` / class toggles (user preference).
- **Palette:** Warm paper surfaces + deep rust primary (tenant override in `src/index.css`). Semantic colors (success/warning/destructive/info) stay distinct from the brand accent. Admin panel is out of scope for this palette.
- **Typography:** Heading + body fonts from the design-token stack (no cyan/glass identity).
- **Components:** shadcn/ui Radix primitives in `src/components/ui/`.
- **Layout:** Collapsible sidebar + topbar shell; owner dashboard uses an asymmetric Variant B hierarchy (oversized metrics, ≤2 primary charts).
- **Dates:** Calendar-only single days use shared `DatePicker` (`YYYY-MM-DD`). Filter Date Ranges use `DateRangePicker` (one trigger, range calendar). Lesson/exam instants use `DateTimePicker` in Asia/Tashkent wall time → ISO. Default range `max` is Tashkent today.
- **i18n:** Uzbek (uz), Russian (ru), English (en). The saved language is read from `localStorage`; resources live in `src/i18n/locales/`.

---

## State Management

| Concern                 | Tool                      | Location                   |
| ----------------------- | ------------------------- | -------------------------- |
| Server state (API data) | TanStack Query 5          | `src/services/*Service.ts` |
| Auth / session          | Zustand 5                 | `src/store/authStore.ts`   |
| Local component state   | `useState` / `useReducer` | In component files         |

### Query patterns

- `staleTime: 30_000` (30s) on most queries.
- Query keys are domain-scoped and include tenant filters: `['students', 'page', { branchId, page, search }]`.
- Mutations: `mutationFn` via `axiosInstance` → `onSuccess` invalidates related keys → `toast.success()` → `disabled={mutation.isPending}` on submit button.
- Branch switch → `queryClient.invalidateQueries()` clears stale tenant cache.
- Logout → `queryClient.clear()` prevents data leakage to next session.

### Auth

- JWT via httpOnly cookies (primary) + Bearer token (fallback).
- Session restore: GET `/auth/me` on app mount.
- `axiosInstance` interceptor: auto-attaches token, handles 401 redirect to login.

---

## Route Map (canonical app paths)

Route files live in `src/routes/`; `src/app/routeAccess.ts` maps each protected route to its capability, and `src/lib/permissions.ts` maps capabilities to roles. Read those sources before changing access rules.

- Every authenticated route first uses `requireAuthenticated` from `src/app/routeGuards.ts`.
- Operational pages exclude accountants. Accountants use the finance dashboard and expense routes.
- Company user and branch administration require owner/dev access; manager staff-detail access is narrower than the company-wide user list.
- Expense visibility is separate from finance mutation permission. Direct dev sessions do not receive company-finance capabilities; impersonation uses the effective owner role.
- Teachers have their own settlement routes. Driving-session routes also honor feature availability.

TanStack Router compiles file routes into route-local chunks; heavy chart and
export dependencies are deferred to the routes that use them.

---

## Tech Stack

| Category      | Technology                                   |
| ------------- | -------------------------------------------- |
| Framework     | React, Vite, TypeScript (versions in `package.json`)               |
| Styling       | Tailwind CSS, shadcn/ui, Radix UI primitives |
| Server state  | TanStack Query 5                             |
| Client state  | Zustand 5                                    |
| Routing       | TanStack Router (file routes)                |
| Forms         | react-hook-form + zod resolver               |
| HTTP          | axios (shared `axiosInstance`)               |
| Charts        | Recharts                                     |
| Icons         | @phosphor-icons/react                        |
| Notifications | sonner                                       |
| Testing       | Vitest                                       |
| PWA           | vite-plugin-pwa                              |

---

## Key Architectural Patterns

1. **Code splitting:** TanStack Router route chunks plus deferred heavy dependencies (Recharts, date libraries, XLSX).
2. **Tenant isolation:** Query keys include `branchId`. Cache cleared on logout and branch switch.
3. **Optimistic updates:** Only reversible attendance/status interactions use optimistic updates; financial mutations stay server-authoritative.
4. **Error boundaries:** Route-level error boundaries catch render crashes. API errors handled by TanStack Query error states and sonner toasts.
5. **Empty/loading states:** shadcn `<Skeleton>` for loading. Explicit empty states (not blank tables) for zero-data views.
6. **Confirm before destroy:** `ConfirmDialog` component for all destructive actions. No silent deletes.
7. **Forms:** react-hook-form + zod schema validation. Errors via shadcn `<FormMessage />`. Submit handlers are async and await the mutation.

---

## API contract

- Backend is the source for the authenticated OpenAPI document at `/api/openapi.json`.
- Run `pnpm run api:types` with runtime-only `OPENAPI_TOKEN` or `OPENAPI_USERNAME`/`OPENAPI_PASSWORD` to regenerate `src/shared/api/schema.d.ts`.
- Run `pnpm run api:check` in CI to fail when the committed generated contract is stale.
- `VITE_*` variables are browser-visible; OpenAPI credentials must never use that prefix or be bundled into the app.
- Feature services import request/query aliases from `src/shared/api/contract.ts`; response payloads remain `unknown` until the backend publishes response schemas and are normalized by `src/lib/apiEnvelope.ts`.
- Route pages use TanStack Router links, typed params, and route search validators. There is no navigation compatibility wrapper.

## Cross-Repo Relationships

This frontend communicates with **autodrive-backend** (NestJS API) exclusively via REST. The backend is the source of truth for:

- Auth (JWT generation, session, RBAC)
- Tenant scoping (branch isolation enforced server-side)
- Business logic (payment calculations, schedule generation, attendance rules)

The **autodrive-admin-panel** is a separate React app for platform-level administration (dev tool, company switching, cross-tenant views). Not intended for tenant users.

---

## i18n Strategy

- 3 languages: Uzbek (uz), Russian (ru), English (en).
- Default language on first visit: Uzbek (`uz`).
- Override: stored in `localStorage` key `lang`.
- Translation files: `src/i18n/locales/{uz,ru,en}.json`.
- UI strings only — API data (student names, group names) stored in whatever language the operator entered.
- Date/number formatting via `Intl` API respecting the active locale.
