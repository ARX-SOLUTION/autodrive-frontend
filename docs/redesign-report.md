# Redesign Report — Night Console (feat/redesign)

Direction D2 executed per [redesign-audit.md](./redesign-audit.md). 8 commits on `feat/redesign`; tokens on `autodrive-design-tokens#feat/night-console` (pushed, branch only). Every commit passed `typecheck && lint && test (267) && build` + pre-commit hook.

## Before → after per priority level

| Level         | Commit    | Before                                                                                                                                           | After                                                                                                                                                                                                                                                                       |
| ------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1-fonts       | `058dbf9` | Unbounded all-headings + Inter body via CSS `@import` (FOUT, no preconnect)                                                                      | IBM Plex Sans (headings+body) + IBM Plex Mono (numerals) via preconnect+link in `index.html`; Cyrillic ✓                                                                                                                                                                    |
| 2-colors      | `60eb35a` | shadcn-slate navy + Tailwind blue, glass tiers (invisible cards in light), neon glow, fixed mesh gradients, alpha-in-var hacks, 5-hue chart soup | Graphite `220 6% 8%` / warm paper `40 20% 96%`, ONE amber accent, solid 1px-border panels (legacy `.glass-*` names re-pointed), amber rail-tick active states, static grain overlay, alpha split (no inline styles), amber-first chart hues, landing cyan → token (5 spots) |
| 3-states      | `480d93f` | Login errors toast-only; generic spinner PageLoader; some icon rows unlabeled                                                                    | Inline `role="alert"` credential error; shell-shaped skeleton loader; aria-label + hover surface on Operators/Teachers rows (others already compliant)                                                                                                                      |
| 4-layout      | `c53b857` | 4 equal KPI cards; tables edge-to-edge; `#` col + `HH:mm:ss` noise; debt wraps 3 lines; crumbs on root                                           | Asymmetric KPI grid (`1.7fr` lead) ×3 role variants; `max-w-screen-2xl` content; money = `font-mono tabular-nums nowrap` right-aligned; `HH:mm`; crumbs hidden at depth<2                                                                                                   |
| 5-components  | `15a85e3` | lucide everywhere (83 files); favicon.png `<img>` as logo; plain-text statuses; blue-circle favicon                                              | @phosphor-icons/react across 86 files, lucide dep removed; `Brand` amber-tick wordmark (t('app.title')); outlined mono status chips (info/success/destructive); amber SVG favicon                                                                                           |
| 6-states      | `06eadab` | 404: hardcoded English "Oops!", console.error, unstyled                                                                                          | Branded mono amber 404, i18n via existing `notfound.*` keys, dashboard CTA                                                                                                                                                                                                  |
| 7-type-polish | `61ba9ee` | Default-looking tracked-caps labels; static greeting; proportional axis digits                                                                   | Mono instrument micro-labels (`11px tracking-[0.14em]`); fluid greeting `text-3xl md:text-4xl`; mono chart axes; GSAP count-up on lead KPI (mount-once, reduced-motion-safe)                                                                                                |

## Distinctiveness (the "not-a-template" test)

1. **Instrument-cluster identity**: amber-on-graphite with rail-tick active nav (inset amber bar, no pill/no glow) — stock shadcn is slate+blue with pill highlights.
2. **Odometer numerals**: every money value, KPI, chart axis, and micro-label runs IBM Plex Mono tabular; lead KPI counts up once on load. The mono dotted-zero (404, `0 so'm`) is a recurring signature.
3. **Own brand system**: amber-tick wordmark (`Brand`), matching SVG favicon, outlined mono status chips — no gradients, no glassmorphism, one accent.

## Verification evidence

- Full suite green at every level (267 tests; build + prerender OK).
- Live checks (local dev + seeded backend, demo account): login, dashboard (owner), students (incl. empty state), payments, 404 — dark + light — mobile 360px (no horizontal scroll) — keyboard focus rings visible (amber double-ring).
- Before screenshots: prod automaktab.uz 2026-07-18; after: local dev same day (session captures; not stored in repo).

## Remaining / known issues

1. **Deliberately skipped**: z-index scale (uniform `z-50` primitives suffice; landing z-soup deferred with landing pass) — audit L4.
2. **Partial**: topbar signature = mono ⌘K only (context chip judged duplicative of sidebar footer) — audit P4.
3. **Deferred**: full landing/blog night-console pass (cyan hardcodes tokenized, layout/copy untouched) — audit C4.
4. **Asset gap**: `apple-touch-icon` still old blue PNG (needs exported PNG asset; SVG favicon done).
5. **Side effect (accepted)**: payments Excel export timestamps now `HH:mm` (shared formatter with table; no test asserted seconds).
6. **Bundle**: GSAP now loads in the dashboard chunk (was landing-only) for the KPI count-up.
7. **Cross-repo pending**: tokens PR (`feat/night-console` → main) + frontend dep flip back to `#main` after merge; admin-panel re-themes on next install after tokens merge and needs its own font/glass parity pass.
8. **npm gotcha (documented)**: `github:org/repo#branch-with-slash` silently re-resolves to default branch on npm 10.9.8; package.json pins the full `git+https://…#feat/night-console` URL instead — flip to `#main` shorthand at merge time.

Fix cycles used: 0 of 2 (cold pass found no regressions requiring a cycle; items above are scoped follow-ups, not failures).
