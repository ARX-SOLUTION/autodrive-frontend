# Redesign Audit — autodrive-frontend (OVERHAUL)

Mode: OVERHAUL — new visual language, keep content/IA. Branch: `feat/redesign`.
Before-state captured 2026-07-18 from live automaktab.uz (login, dashboard, students, payments; dark + light).
Beads epic: `autodrive-ott`.

## Phase 0 — Scan summary

- React 18 + Vite 5 + TS · **Tailwind v3.4** (config = `tailwind.config.ts`, NOT v4 CSS-config) · shadcn/Radix · TanStack Query · react-hook-form+zod · **GSAP already installed** · recharts · sonner · next-themes (class dark mode) · lucide-react (83 files) · Storybook.
- Tokens: shared **`@autodrive/design-tokens`** GitHub pkg (`tokens.css` + `tailwind-preset.cjs`) — consumed via preset + `@import`. Admin-panel shares it → palette overhaul = cross-repo decision.
- Fonts now: Unbounded (all h1–h6) + Inter (body), Google Fonts `@import` in `src/index.css:2`.
- Current language: shadcn-slate dark navy + Tailwind-blue primary + glassmorphism tiers + neon glow + fixed mesh gradients = stock "AI dashboard" fingerprint (repo literally `vite_react_shadcn_ts`, Lovable origin).
- i18n uz/ru/en mandatory → **any font choice must cover Cyrillic (ru)**.

### Routes by exposure

1. `/dashboard` (all roles, post-login landing)
2. `/students`, `/students/:id` (operators, daily)
3. `/payments` (operators/owner, daily)
4. `/attendance`, `/schedule` (teachers, daily)
5. `/groups`, `/groups/:id`
6. `/login` (every session)
7. `/branches`, `/users`, `/audit` (owner, weekly)
8. `/`, `/blog` — public marketing, **out of scope this pass** (shares tokens; note C4)

## Phase 1 — Findings (grouped by Fix Priority)

### 1. Fonts

| #   | file:line                                               | Problem                                                                                          | Fix                                                                  | Risk |
| --- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- | ---- |
| F1  | `src/index.css:2`, `index.html`                         | Google Fonts `@import` inside CSS = late discovery, FOUT; no preconnect to fonts.gstatic         | Move to `<link rel="preconnect">` + stylesheet link in `index.html`  | low  |
| F2  | `tailwind.config.ts:26-29` + `src/index.css:86-93`      | Unbounded forced on ALL h1–h6 (wide techno display at card-title sizes); Inter body = AI default | Direction font pair; display font scoped to true display sizes       | low  |
| F3  | `src/pages/StudentsPage.tsx` (debt col), `PaymentsPage` | Money not `tabular-nums`/`nowrap` — "500 000 so'm" wraps 3 lines (screenshot)                    | `tabular-nums whitespace-nowrap text-right` + direction numeral font | low  |

### 2. Color / surfaces

| #   | file:line                                                                   | Problem                                                                                                         | Fix                                                                                                              | Risk             |
| --- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------- |
| C1  | design-tokens `tokens.css:26,58`                                            | Primary = Tailwind blue-600; dark bg = shadcn slate `222 47% 11%` — stock template palette                      | New palette per direction; **override locally in `src/index.css` first, upstream to tokens repo after approval** | med (cross-repo) |
| C2  | `src/index.css:21-26`                                                       | Light-mode glass = white-on-white → KPI cards invisible (screenshot)                                            | Real light surfaces (solid card + border); glass dies in overhaul                                                | low              |
| C3  | `src/index.css:65-84,96-136`                                                | Fixed mesh gradients (`background-attachment: fixed` repaint cost) + glass tiers + `.neon-glow` = dated AI look | Replace with direction surfaces; drop fixed attachment                                                           | low              |
| C4  | `src/pages/LandingPage.tsx:57-64`, `components/landing/DemoForm.tsx:94,103` | Hardcoded `#22D3EE` off-token                                                                                   | Tokenize when landing pass happens (out of scope now)                                                            | low              |
| C5  | `src/pages/DashboardPage.tsx:90-96`                                         | `branchHues` hardcoded 5-hue chart soup (incl. violet)                                                          | Chart scale derived from single accent + neutrals                                                                | low              |
| C6  | `src/index.css:12-18` → `Sidebar.tsx:225`, `Topbar.tsx:47`                  | HSL vars carry alpha (`/ 0.5`) → breaks Tailwind `<alpha-value>` → forced inline `style={{}}`                   | Split alpha; pure utility classes                                                                                | low              |

### 3. Interactivity / states

| #   | file:line                                                | Problem                                                                    | Fix                                                | Risk |
| --- | -------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------- | ---- |
| S1  | `src/pages/LoginPage.tsx:36-46`                          | Login errors toast-only, no inline field errors (rest of app uses RHF+zod) | Inline errors under fields; toast only for network | low  |
| S2  | `components/layout/PageLoader.tsx`                       | Generic `Loader2` spinner                                                  | App-shell-shaped skeleton                          | low  |
| S3  | list-page row actions (e.g. `StudentsPage` pencil/trash) | Tiny icon targets, no hover surface/tooltip                                | Hover surface + tooltip + larger hit area          | low  |

Already good: Button focus ring + `active:scale` (`ui/button.tsx:10`), global focus fallback (`index.css:53-64`), EmptyState ×25 files, Skeleton ×14 pages, `motion-reduce` respected, command palette.

### 4. Layout / spacing

| #   | file:line                                                | Problem                                                                  | Fix                                                                  | Risk |
| --- | -------------------------------------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------- | ---- |
| L1  | `DashboardPage` KPI row (screenshot)                     | 4 equal cards = the generic pattern                                      | Asymmetric KPI: lead metric oversized + compact rest (per direction) | low  |
| L2  | `AppLayout.tsx:35`                                       | Flat `p-6`, tables stretch edge-to-edge on wide screens, no rhythm scale | Content max-width + spacing scale tokens                             | low  |
| L3  | `StudentsPage` table                                     | `#` index col, timestamps with seconds, debt wrap                        | Drop seconds, right-align money, nowrap                              | low  |
| L4  | `LandingPage.tsx` (15 arbitrary z), ui primitives `z-50` | No z-scale                                                               | z-index scale tokens (sticky/overlay/toast)                          | low  |
| L5  | `AppLayout.tsx:36`                                       | Breadcrumbs on root pages (1-level crumb = noise)                        | Hide when depth < 2                                                  | low  |

### 5. Component patterns

| #   | file:line                                    | Problem                                       | Fix                                                                                                                   | Risk      |
| --- | -------------------------------------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | --------- |
| P1  | 83 files                                     | lucide-only iconography (AI default)          | Option A: add `@phosphor-icons/react` (**new dep — needs OK**); Option B: keep lucide, standardize 1.5 stroke + sizes | med (dep) |
| P2  | `LoginPage.tsx:75`, `Sidebar.tsx:136-144`    | Logo = raw `favicon.png` `<img>`; no wordmark | Small SVG wordmark component per direction                                                                            | low       |
| P3  | `StudentsPage` "Natija"/status as plain text | No semantic tone                              | Status chip in direction language                                                                                     | low       |
| P4  | `Topbar.tsx`                                 | Generic icon-button strip                     | Direction signature topbar (context chip + styled ⌘K)                                                                 | low       |

### 6. Loading / empty / error

| #   | file:line                      | Problem                                                                                          | Fix                                              | Risk |
| --- | ------------------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------------ | ---- |
| E1  | `src/pages/NotFound.tsx:19-24` | Hardcoded English "Oops! Page not found" (**i18n violation**), `console.error` left in, unstyled | Branded 404, `t()` keys ×3 locales, drop console | low  |

### 7. Type polish

| #   | file:line                                | Problem                                            | Fix                                          | Risk |
| --- | ---------------------------------------- | -------------------------------------------------- | -------------------------------------------- | ---- |
| T1  | dashboard/payments section labels        | Tracked ALL-CAPS labels everywhere (`JORIY HOLAT`) | Sentence case + weight/color hierarchy       | low  |
| T2  | `DashboardPage` greeting, `LoginPage` h1 | Static sizes, no display scale                     | `clamp()` fluid display on top surfaces only | low  |

## Constraints

- Cyrillic coverage mandatory (ru locale) — rules out Geist/Satoshi/Space Grotesk/Bricolage.
- No new npm deps without approval (fonts via Google Fonts = no dep; icons = dep → question).
- Existing stack only; shadcn primitives stay; GSAP + recharts reused.
- Non-negotiables: focus rings, WCAG AA, `prefers-reduced-motion`, 360px responsive, zero functionality change.
- Tokens: local override layer in `src/index.css` on the branch; upstream PR to `autodrive-design-tokens` + admin-panel parity AFTER approval.

## Three directions

### D1 — "Signal" (road-sign utility, light-first)

- Vibe: driving-test signage — paper white, ink text, one high-vis accent. Swiss, flat, fast.
- Fonts: **Oswald** (condensed signage display) + **Golos Text** (body, Cyrillic-native) + **JetBrains Mono** (numerals). All Cyrillic ✓.
- Palette: bg `40 20% 97%` warm paper / surface white / text ink `220 15% 12%` / accent **high-vis yellow `50 100% 50%`** (bg-chip only, ink text on it — never yellow text). Dark = asphalt `220 10% 10%`, same accent.
- Layout signature: dashed road-line dividers + dashed active-nav marker; 4px radius; hairline borders; crisp 1px offset shadows; no glass, no glow.
- Motion signature: 150ms snaps only; GSAP wordmark draw-on at login. Nothing else moves.
- Signature moments: broken-grid KPI (lead metric oversized), staggered entry on dashboard cards, road-line motif.

### D2 — "Night console" (instrument-cluster dark) ← Advisor recommendation

- Vibe: car dashboard at night — graphite, amber instruments, mono data. Fits domain; keeps current users' dark habit.
- Fonts: **IBM Plex Sans** (display+body) + **IBM Plex Mono** (numbers/micro-labels). Cyrillic ✓.
- Palette: bg graphite `220 6% 8%` (tinted, not #000) / solid panels `220 6% 11%` + 1px `220 6% 18%` borders / warm-white text `40 10% 92%` / ONE accent **amber `35 95% 55%`**; semantic red/green stay muted. Light mode = warm gray paper + same amber.
- Layout signature: gauge-tick axes/sparklines; KPI = odometer mono numerals; sidebar becomes flat rail with amber active tick (no pill, no glow).
- Motion signature: GSAP count-up on KPI numerals once per load; chart draw-on; 150–250ms elsewhere.
- Signature moments: amber-tinted shadows, ultra-low grain overlay, staggered entry.

### D3 — "Ledger" (editorial paper, serif)

- Vibe: school journal/ledger — cream paper, ink, red-ink debts.
- Fonts: **Source Serif 4** (display ≥20px only) + **Onest** (body) + tabular numerals. Cyrillic ✓.
- Palette: bg cream `45 40% 97%` / ink `220 20% 14%` / accent **racing green `160 60% 30%`** / debt ink-red `358 65% 45%`. Dark = green-black ink `170 15% 8%` + cream.
- Layout signature: ruled-line tables (horizontal rules only, no zebra), underline nav, 2px radius, aggressive whitespace.
- Motion signature: ink-underline grow on hover; page crossfade only.
- Signature moments: whitespace maximization, text-mask wordmark reveal at login, stamped-outline status badges.

Ban check (all 3): no purple/blue gradients, no Inter, no 3-equal-card rows, not lucide-only-by-default, no pure #000. ✓
