# Frontend Perf Baseline (autodrive-6ef.16)

Captured 2026-07-16. Prerequisite for autodrive-6ef.17 (perf optimizations) — every
optimization there must show a measured before/after against these numbers.
Admin-panel's equivalent harness is deferred to a follow-up (scoped out of this pass).

## Harness

- **Web Vitals** (`src/lib/webVitals.ts`, wired in `main.tsx`): reports LCP/INP/CLS.
  Dev mode → `console.log`. Always → `track('web_vitals_<metric>', {value, rating})`
  via the existing umami helper (safe no-op if umami isn't loaded — no new backend).
- **Bundle visualizer**: `ANALYZE=1 npm run build` writes `dist/stats.html`
  (gzip + brotli sizes per chunk). Not committed — regenerate on demand.

## Bundle baseline (production build, `ANALYZE=1 npm run build`)

Shared chunks loaded on **every** route (via `index.html`'s eager `<script>` tags):

| Chunk                         | Raw           | Gzip         |
| ----------------------------- | ------------- | ------------ |
| `index` (app entry)           | 277.57 kB     | 92.81 kB     |
| `react-vendor`                | 186.65 kB     | 61.69 kB     |
| `ui-vendor` (Radix)           | 103.22 kB     | 31.38 kB     |
| `query-vendor` (TanStack)     | 39.19 kB      | 11.69 kB     |
| `i18n-vendor`                 | 57.26 kB      | 18.76 kB     |
| `charts-vendor` (recharts/d3) | 410.12 kB     | 110.60 kB    |
| **Total eager**               | **1074.0 kB** | **326.9 kB** |

**Biggest optimization candidate for 6ef.17**: `charts-vendor` (110.6 kB gzip — a third
of the entire eager payload) loads on every route including `/login`, but recharts is
only used on Dashboard/analytics pages. It should be route-split, not eager.

Route-specific lazy chunks (loaded in addition to the eager baseline above, only when
that route is visited):

| Route         | Chunk           | Raw      | Gzip     |
| ------------- | --------------- | -------- | -------- |
| `/` (landing) | `LandingPage`   | 60.17 kB | 14.73 kB |
| `/dashboard`  | `DashboardPage` | 63.30 kB | 15.23 kB |
| `/students`   | `StudentsPage`  | 23.07 kB | 6.95 kB  |
| `/payments`   | `PaymentsPage`  | 19.01 kB | 5.91 kB  |

Full per-chunk breakdown: regenerate `dist/stats.html` (`ANALYZE=1 npm run build`, not
committed to the repo).

## Timing baseline

Two measurement passes, different build modes — noted explicitly since they aren't
comparable to each other, only to future re-runs of the _same_ mode:

### Production build (`vite preview`), unauthenticated

| Route                      | FCP    | LCP              | Load   |
| -------------------------- | ------ | ---------------- | ------ |
| `/` (landing, prerendered) | 212 ms | 628 ms (H1 hero) | 230 ms |

### Dev server (`vite dev`), authenticated as owner

Dev-mode numbers (unminified ESM, HMR overhead) — directionally useful for relative
route comparison today, but **not** a substitute for production numbers once
authenticated-route production measurement is unblocked (see Known gap below).

| Route        | FCP    | DOMContentLoaded | Load  |
| ------------ | ------ | ---------------- | ----- |
| `/dashboard` | 124 ms | 87 ms            | 90 ms |
| `/students`  | 128 ms | 88 ms            | 91 ms |
| `/payments`  | 112 ms | 79 ms            | 82 ms |

### Known gap

Couldn't get a production-build (`vite preview`) authenticated session locally — the
seeded `owner@autodrive.uz` credentials in `prisma/seed.ts` return 401 against the
local DB (seed script reports "already applied — skipping", so the stored hash may
have drifted from `owner123` at some point). Not investigated further — out of scope
for a perf-measurement task. Whoever picks up 6ef.17 should fix the local seed/login
first, then re-run the authenticated routes through `vite preview` for real production
LCP/CLS numbers before/after their optimization.

## Soft budget (for 6ef.17 to measure against)

Not a hard CI gate — a target to notice regression against.

- **LCP**: < 1.5s on 4G-equivalent throttling for landing; < 1s for authenticated
  routes (warm cache, already-loaded eager chunks).
- **INP**: < 200ms for any in-app interaction (row click, filter change, modal open).
- **CLS**: < 0.1 on every route (no unstyled-content layout jumps — skeleton loaders
  should already prevent this, verify it holds).
- **Per-route JS ceiling**: eager baseline (327 kB gzip today) should trend down, not
  up, as 6ef.17 lands; route-specific lazy chunks should stay under ~20 kB gzip each
  (Dashboard is already over at 15.2 kB — watch it, don't let it grow past 20).
