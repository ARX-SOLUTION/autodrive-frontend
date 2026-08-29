# AutoDrive Frontend — Domain Context

## Overview

React 18 + Vite + TypeScript frontend for a Uzbek driving school CRM. Tenant-facing application serving managers, operators, and teachers across driving school branches. Built with shadcn/ui, TanStack Query, Zustand, and a tenant-local **Warm Paper** visual system (warm off-white surfaces, rust accent). Shared `@autodrive/design-tokens` remain the package default; the tenant CRM overrides palette in `src/index.css` so the admin panel stays unchanged.

## Product boundaries

**Tenant App**:
The authenticated driving-school workspace used by owners, managers, operators, and teachers. It contains no public marketing or editorial pages.
_Avoid_: website, landing app, public app

**Public Web**:
The public Automaktab presence containing the landing pages and blog. It is separate from the Tenant App.
_Avoid_: CRM, tenant app

---

## Domain Glossary

| Term (UZ)     | English         | Definition                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Filial        | Branch          | Tenant boundary — each branch has its own manager, operators, teachers, students, groups, schedule. Equivalent to a franchise location or school office.                                                                                                                                                                                                                                                                                            |
| Guruh         | Group           | A class of students. Has a teacher, a course type (teoriya / amaliy), a schedule template, and a fixed capacity.                                                                                                                                                                                                                                                                                                                                    |
| Talaba        | Student         | Two types: **tezkor** (express course, shorter duration, compact payment plan) and **avto_maktab** (full course, standard duration, more expensive, installment payments). Students carry payment fields (debt, total_amount, paid_amount). `group_id`/`group_name` are optional for both course types — a student (tezkor or avto_maktab) can exist with no assigned group; no frontend validation requires one.                                   |
| Dars          | Lesson          | Individual session — either **teoriya** (theory, classroom) or **amaliy** (practice, driving). Linked to a group. Generated automatically from a schedule template.                                                                                                                                                                                                                                                                                 |
| Davomat       | Attendance      | Per-student-per-lesson record. States: **present** (keldi), **absent** (kelmadi), **late** (kech qoldi), **excused** (uzrli).                                                                                                                                                                                                                                                                                                                       |
| Jadval        | Schedule        | Weekly schedule template assigned to a group. Defines which days/hours lessons occur. Auto-generates lessons for the scheduled period.                                                                                                                                                                                                                                                                                                              |
| To'lov        | Payment         | Student payment record. Supports partial payments, installment tracking, and debt management. `debt` is a single running balance, not an invoice/ledger entity — it can go **negative**, meaning the student has a credit balance (overpaid / advance payment), not an amount owed. UI treats `debt > 0` as owed (destructive/red), `debt < 0` as credit (shown via `students.credit_label`, abs value, success/green), `debt === 0` as fully paid. |
| Foydalanuvchi | User            | Five roles: **dev** (platform developer, all access), **owner** (company owner, cross-branch analytics + branch CRUD), **manager** (branch manager, full branch operations), **operator** (day-to-day registrar), **teacher** (read-only on assigned students/groups).                                                                                                                                                                              |
| Sana oralig‘i | Date Range      | Inclusive pair of Calendar Dates (`from` / `to` as `YYYY-MM-DD`). Same-day allowed. Wire params stay `date_from` / `date_to`. _Avoid_: period, interval, date filter.                                                                                                                                                                                                                                                                               |
| —             | DateRangePicker | Single-trigger + range calendar for Date Range in filter bars (Students, Payments, Audit, Dashboard). _Avoid_: DateRangeFields, dual DatePicker.                                                                                                                                                                                                                                                                                                    |

---

## UI Architecture — Warm Paper (tenant CRM)

- **Mode:** Light/dark via `.dark` / class toggles (user preference).
- **Palette:** Warm paper surfaces + deep rust primary (tenant override in `src/index.css`). Semantic colors (success/warning/destructive/info) stay distinct from the brand accent. Admin panel is out of scope for this palette.
- **Typography:** Heading + body fonts from the design-token stack (no cyan/glass identity).
- **Components:** shadcn/ui Radix primitives in `src/components/ui/`.
- **Layout:** Collapsible sidebar + topbar shell; owner dashboard uses an asymmetric Variant B hierarchy (oversized metrics, ≤2 primary charts).
- **Dates:** Calendar-only single days use shared `DatePicker` (`YYYY-MM-DD`). Filter Date Ranges use `DateRangePicker` (one trigger, range calendar). Lesson/exam instants use `DateTimePicker` in Asia/Tashkent wall time → ISO. Default range `max` is Tashkent today.
- **i18n:** Uzbek (uz), Russian (ru), English (en). Detection via `navigator.language` + `localStorage`. Files in `src/i18n/`.

---

## State Management

| Concern                 | Tool                      | Location                   |
| ----------------------- | ------------------------- | -------------------------- |
| Server state (API data) | TanStack Query 5          | `src/services/*Service.ts` |
| Auth / session          | Zustand 5                 | `src/store/authStore.ts`   |
| Local component state   | `useState` / `useReducer` | In component files         |

### Query patterns

- `staleTime: 30_000` (30s) on most queries.
- Query keys include `branchId` for tenant isolation: `['students', branchId, { page, search }]`.
- Mutations: `mutationFn` via `axiosInstance` → `onSuccess` invalidates related keys → `toast.success()` → `disabled={mutation.isPending}` on submit button.
- Branch switch → `queryClient.invalidateQueries()` clears stale tenant cache.
- Logout → `queryClient.clear()` prevents data leakage to next session.

### Auth

- JWT via httpOnly cookies (primary) + Bearer token (fallback).
- Session restore: GET `/auth/me` on app mount.
- `axiosInstance` interceptor: auto-attaches token, handles 401 redirect to login.

---

## Route Map (Uzbek path names)

| Path                | Page                                                | Access            |
| ------------------- | --------------------------------------------------- | ----------------- |
| `/dashboard`        | Analytics dashboard with Recharts (bar, pie charts) | All authenticated |
| `/filiallar`        | Branch management CRUD                              | Owner only        |
| `/jadval`           | Schedule calendar + template management             | Manager, operator |
| `/davomat`          | Lesson attendance tracking                          | Teacher, operator |
| `/guruhlar`         | Group CRUD                                          | Manager, operator |
| `/talabalar`        | Student CRUD with payment data                      | Operator, manager |
| `/tolovlar`         | Payment list + debt management                      | Operator, manager |
| `/operatorlar`      | Operator staff management                           | Manager           |
| `/oqituvchilar`     | Teacher staff management                            | Manager           |
| `/foydalanuvchilar` | User management                                     | Manager           |
| `/audit`            | Audit log viewer                                    | Owner only        |
| `/profile`          | User profile / settings                             | All authenticated |

All route pages use `React.lazy()` for code splitting.

---

## Tech Stack

| Category      | Technology                                   |
| ------------- | -------------------------------------------- |
| Framework     | React 18, Vite 6, TypeScript 5.8             |
| Styling       | Tailwind CSS, shadcn/ui, Radix UI primitives |
| Server state  | TanStack Query 5                             |
| Client state  | Zustand 5                                    |
| Routing       | react-router-dom 6                           |
| Forms         | react-hook-form + zod resolver               |
| HTTP          | axios (shared `axiosInstance`)               |
| Charts        | Recharts                                     |
| Icons         | lucide-react                                 |
| Notifications | sonner                                       |
| Testing       | Vitest                                       |
| PWA           | vite-plugin-pwa                              |

---

## Key Architectural Patterns

1. **Code splitting:** `React.lazy()` for every route page. Heavy dependencies (Recharts, date libraries) loaded on demand.
2. **Tenant isolation:** Query keys include `branchId`. Cache cleared on logout and branch switch.
3. **Optimistic updates:** Not yet standard — evaluate per mutation (high-confidence mutations like toggles benefit most).
4. **Error boundaries:** Route-level error boundaries catch render crashes. API errors handled by TanStack Query error states and sonner toasts.
5. **Empty/loading states:** shadcn `<Skeleton>` for loading. Explicit empty states (not blank tables) for zero-data views.
6. **Confirm before destroy:** `ConfirmDialog` component for all destructive actions. No silent deletes.
7. **Forms:** react-hook-form + zod schema validation. Errors via shadcn `<FormMessage />`. Submit handlers are async and await the mutation.

---

## Cross-Repo Relationships

This frontend communicates with **autodrive-backend** (NestJS API) exclusively via REST. The backend is the source of truth for:

- Auth (JWT generation, session, RBAC)
- Tenant scoping (branch isolation enforced server-side)
- Business logic (payment calculations, schedule generation, attendance rules)

The **autodrive-admin-panel** is a separate React app for platform-level administration (dev tool, company switching, cross-tenant views). Not intended for tenant users.

---

## i18n Strategy

- 3 languages: Uzbek (uz), Russian (ru), English (en).
- Primary detection: `navigator.language` on first visit.
- Override: stored in `localStorage` key `lang`.
- Translation files: `src/i18n/{uz,ru,en}/`.
- UI strings only — API data (student names, group names) stored in whatever language the operator entered.
- Date/number formatting via `Intl` API respecting the active locale.
