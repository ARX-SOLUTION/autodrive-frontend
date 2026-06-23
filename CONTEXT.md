# AutoDrive Frontend — Domain Context

## Overview

React 18 + Vite + TypeScript frontend for a Uzbek driving school CRM. Tenant-facing application serving managers, operators, and teachers across driving school branches. Built with shadcn/ui, TanStack Query, Zustand, and the Shabnam theme (dark-mode-first glassmorphism).

---

## Domain Glossary

| Term (UZ) | English | Definition |
|---|---|---|
| Filial | Branch | Tenant boundary — each branch has its own manager, operators, teachers, students, groups, schedule. Equivalent to a franchise location or school office. |
| Guruh | Group | A class of students. Has a teacher, a course type (teoriya / amaliy), a schedule template, and a fixed capacity. |
| Talaba | Student | Two types: **tezkor** (express course, shorter duration, compact payment plan) and **avto_maktab** (full course, standard duration, more expensive, installment payments). Students carry payment fields (debt, total_amount, paid_amount). |
| Dars | Lesson | Individual session — either **teoriya** (theory, classroom) or **amaliy** (practice, driving). Linked to a group. Generated automatically from a schedule template. |
| Davomat | Attendance | Per-student-per-lesson record. States: **present** (keldi), **absent** (kelmadi), **late** (kech qoldi), **excused** (uzrli). |
| Jadval | Schedule | Weekly schedule template assigned to a group. Defines which days/hours lessons occur. Auto-generates lessons for the scheduled period. |
| To'lov | Payment | Student payment record. Supports partial payments, installment tracking, and debt management (debt tracking is a key feature). |
| Foydalanuvchi | User | Five roles: **dev** (platform developer, all access), **owner** (company owner, cross-branch analytics + branch CRUD), **manager** (branch manager, full branch operations), **operator** (day-to-day registrar), **teacher** (read-only on assigned students/groups). |

---

## UI Architecture — Shabnam Theme

- **Mode:** Dark-mode-first. `.dark` / `.light` CSS class toggles.
- **Palette:** Cyan accent (hsl 186 100% 50%), amber for admin surfaces. Glassmorphism throughout — glass sidebar, glass topbar, glass-sm cards.
- **Typography:** Unbounded (headings) + Inter (body).
- **Components:** shadcn/ui Radix primitives in `src/components/ui/`, custom glass components alongside.
- **Layout:** Collapsible glass sidebar (w-60 expanded, w-[68px] collapsed), glass topbar, main content area with glass-sm container.
- **Animations:** fade-in, scale-in, float, neon-glow on active elements. Enter/exit transitions on modals and sidebars.
- **i18n:** 3 languages — Uzbek (uz), Russian (ru), English (en). Language detection via `navigator.language` + `localStorage` override. Translation files in `src/i18n/`.

---

## State Management

| Concern | Tool | Location |
|---|---|---|
| Server state (API data) | TanStack Query 5 | `src/services/*Service.ts` |
| Auth / session | Zustand 5 | `src/store/authStore.ts` |
| Local component state | `useState` / `useReducer` | In component files |

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

| Path | Page | Access |
|---|---|---|
| `/dashboard` | Analytics dashboard with Recharts (bar, pie charts) | All authenticated |
| `/filiallar` | Branch management CRUD | Owner only |
| `/jadval` | Schedule calendar + template management | Manager, operator |
| `/davomat` | Lesson attendance tracking | Teacher, operator |
| `/guruhlar` | Group CRUD | Manager, operator |
| `/talabalar` | Student CRUD with payment data | Operator, manager |
| `/tolovlar` | Payment list + debt management | Operator, manager |
| `/operatorlar` | Operator staff management | Manager |
| `/oqituvchilar` | Teacher staff management | Manager |
| `/foydalanuvchilar` | User management | Manager |
| `/audit` | Audit log viewer | Owner only |
| `/profile` | User profile / settings | All authenticated |

All route pages use `React.lazy()` for code splitting.

---

## Tech Stack

| Category | Technology |
|---|---|
| Framework | React 18, Vite 6, TypeScript 5.8 |
| Styling | Tailwind CSS, shadcn/ui, Radix UI primitives |
| Server state | TanStack Query 5 |
| Client state | Zustand 5 |
| Routing | react-router-dom 6 |
| Forms | react-hook-form + zod resolver |
| HTTP | axios (shared `axiosInstance`) |
| Charts | Recharts |
| Icons | lucide-react |
| Notifications | sonner |
| Testing | Vitest |
| PWA | vite-plugin-pwa |

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
