# CLAUDE.md

Operating rules for **Auto Drive CRM** (NestJS backend + React frontend). Optimized for **speed at scale** via parallel execution, surgical edits, and verified checkpoints.

**Stack:** NestJS 11 · Prisma 6 · PostgreSQL · JWT · class-validator · Zod · React 18 · Vite · shadcn/ui · Tailwind · Zustand · TanStack Query · React Hook Form · Vitest.

---

## ⚡ 0. Parallelism — Default to Concurrent

**Independent work runs in parallel. Always.**

- [ ] Multiple files, no shared deps? → **One message, multiple `Task` calls.** Never serialize.
- [ ] Multiple read-only lookups (Grep/Glob/Read/Bash)? → Batch in one message.
- [ ] Dependent steps only? → Sequential.

> When making independent changes across multiple files, launch multiple subagents in parallel by including ALL Task tool calls in a single message. Do not serialize independent edits — spawn one subagent per independent change and run them simultaneously.

**Examples — fire in parallel:**

- Add field to backend DTO **+** add column to frontend table → 2 subagents, 1 message.
- Search 3 directories for usages → 3 Grep calls, 1 message.
- Update `userService.ts`, `studentService.ts`, `paymentService.ts` for the same API change → 3 subagents, 1 message.

**Serialize only when:**

- Step B reads Step A's output.
- Schema migration before code using it.
- Type generation (`prisma generate`) before TS that imports it.

---

## 🧠 1. Think Before Coding

- [ ] Surface assumptions explicitly. Pick? → Show options.
- [ ] Unclear? → Stop. Ask **one** specific question (with grep evidence).
- [ ] Simpler way? → Push back before coding.

**❌** _"Active students" → silently uses `isActive`._
**✅** _"`status='active'` or `deletedAt IS NULL`? Existing code uses status — confirm?"_

---

## ✂️ 2. Simplicity First

**Minimum code. Nothing speculative.**

- [ ] No features beyond ask.
- [ ] No abstractions for single use.
- [ ] No error handling for impossible cases.
- [ ] 200 lines feel like 50? → Rewrite.

**Backend — don't:**

- `try/catch` re-throw — `HttpExceptionFilter` handles it.
- Custom partial DTOs — use `PartialType(CreateXDto)`.
- `BaseService<T>` for 2 modules — repeat the code.
- Pre-emptive cache/queue/retry.

**Frontend — don't:**

- Custom `useFetch` — TanStack Query is the standard.
- New shadcn variant for one-off color — `className` override.
- Zustand for local state — `useState`. Auth store is the **only** global.
- "Reusable" form abstraction for one form.

```ts
// ❌ overengineered
async findActive(user, opts?: { include?; cache? }) { /* 40 lines */ }

// ✅ smallest thing that works
async findActive(user: CurrentUserPayload) {
  return this.prisma.student.findMany({
    where: { status: 'active', deletedAt: null, branchId: user.branchId },
  });
}
```

---

## 🎯 3. Surgical Changes

**Touch only what the task requires. Match existing style.**

- [ ] No drive-by refactor / reformat / rename.
- [ ] Notice dead code → mention, don't delete.
- [ ] Your edit orphaned an import? → remove it.
- [ ] Pre-existing dead code? → leave it.

**Test:** every changed line traces directly to the request.

**Style-match checklist (read file before editing):**

| Backend                                 | Frontend                                    |
| --------------------------------------- | ------------------------------------------- |
| `snake_case` API via `fromEntity()`     | services in `src/services/<name>Service.ts` |
| `camelCase` Prisma models               | types in `src/types/<name>.ts`              |
| `Api*Exception` (never raw `Error`)     | `cn()` from `@/lib/utils`                   |
| Request DTOs in `dto/request/`          | shadcn primitives in `components/ui/`       |
| `EmptyToUndefined` for optional strings | toasts via `sonner`                         |

---

## ✅ 4. Goal-Driven Execution — Checkpoint Discipline

**Every task = verifiable goal. Loop until each checkpoint passes.**

| Vague              | Verifiable                                                  |
| ------------------ | ----------------------------------------------------------- |
| "Add validation"   | "DTO rejects empty input with 400; valid input creates row" |
| "Fix the bug"      | "Failing test reproduces it; passes after fix"              |
| "Refactor X"       | "Tests pass before AND after; no behavior change"           |
| "Make table nicer" | "Sortable name+date, paginated, mobile-responsive"          |

**Multi-step format:**

```
1. [Step] → verify: [check]   ← STOP if fails
2. [Step] → verify: [check]   ← STOP if fails
3. [Step] → verify: [check]
```

**Backend example — "Operators see only own students":**

```
1. Add registeredBy filter when role==='operator' in StudentsService.findAll
   → verify: operator A sees own only; manager sees branch-wide
2. Update @ApiQuery if needed
   → verify: /api/docs reflects behavior
3. e2e covers new path
   → verify: pnpm test:e2e green
```

**Frontend example — "Mark paid action":**

```
1. paymentService.ts: mutation POST /payments/:id/mark-paid
   → verify: network tab shows correct call
2. PaymentsPage row button → invalidate ['payments']
   → verify: row updates without manual refresh
3. Sonner toast on success/error
   → verify: both paths trigger correct toast
4. Disable button while pending
   → verify: no double-click possible
```

**Verification failed?** → Don't declare done. Don't change goal silently. Report what failed + minimal repro.

---

## 🏗️ 5. Best Practices (Quick Reference)

### Backend (NestJS + Prisma)

**Response shape — auto-wrapped, don't build manually:**

- Success → `{ success: true, data }` via `ResponseWrapperInterceptor`
- Error → `{ error: { code, message, ... } }` via `HttpExceptionFilter`

**Auth & tenancy (always):**

- `JwtAuthGuard` global. Opt out with `@Public()`.
- `@Roles(Role.owner, ...)` for RBAC.
- Branch-scope `manager`/`operator` queries by `CurrentUserPayload.branchId`. Owner/dev see all.
- Filter `deletedAt: null` on `User`, `Student`, `Branch`.

**Data integrity:**

- Multi-table writes → `prisma.$transaction`. No exceptions.
- Use `Decimal` arithmetic for money — never cast to `number` mid-calc.
- DTO validation: `class-validator` + `EmptyToUndefined` for optional strings.

**Performance at scale:**

- Index hot filters (`@@index` already on `branchId+courseType+deletedAt`, `debt`, `groupId`). Add when adding new filters.
- `findMany` with pagination — never unbounded.
- `select` only what's needed for list endpoints (avoid loading relations you don't render).
- N+1 → use `include` or batched `findMany({ where: { id: { in: [...] } } })`.

### Frontend (React + Vite)

**State boundaries:**

- Server state → **TanStack Query only**. Hooks live in `src/services/*Service.ts`.
- Global client state → **Zustand only for auth** (`src/store/authStore.ts`).
- Everything else → local `useState`.

**Mutations checklist:**

- [ ] `mutationFn` uses `axiosInstance` (handles JWT + 401).
- [ ] `onSuccess`: `queryClient.invalidateQueries({ queryKey: [...] })`.
- [ ] `onError`: `toast.error(msg)` via `sonner`.
- [ ] Button `disabled={mutation.isPending}` — no double-clicks.

**Forms:**

- `react-hook-form` + `zod` resolver.
- Errors via shadcn `<FormMessage />`.
- Submit handler is `async`, awaits mutation.

**Entity detail views:**

- Always a dedicated route + tabs (e.g. `/students/:id` with tabs), never a modal-only detail view. Supports deep-linking, browser back, and `React.lazy` code-splitting. Precedent: admin panel's `CompanyDetailPage`, this repo's `StudentDetailPage`/`BranchDetailPage`.
- Edit stays a launched action (modal/dialog) alongside the detail route — the route is for viewing + related-data tabs, not replaced by an edit modal.
- A card/row that opens a detail view navigates to the route; it does not open a modal.

**Performance at scale:**

- Long lists → paginate (use existing `usePagination` hook).
- Expensive renders → `React.memo` + stable keys; never `index` as key for editable rows.
- Query keys: tuple form `['students', { branchId, page }]` for granular invalidation.
- `staleTime` on rarely-changing data (branches, users list).
- Code-split heavy pages (`React.lazy` for routes if bundle grows).

**Accessibility & UX:**

- All actionable elements keyboard-reachable (Radix primitives handle this — don't override).
- Loading → shadcn `<Skeleton>`. Empty → explicit empty state, not blank table.
- Destructive actions → `ConfirmDialog`. No silent deletes.

### Both sides

- **snake_case** crosses the wire; **camelCase** in TS/Prisma. The `fromEntity()` boundary maps between them.
- **Types are source of truth** — `src/types/*.ts` on FE must match backend response DTOs. Update both in the same PR.
- **Never** hardcode URLs — use `axiosInstance` baseURL + relative paths.
- **Logs at boundaries** — service entry/exit for new flows; never `console.log` in committed code (use `Logger` on BE, remove on FE).

---

## 🚀 6. Speed at Scale Playbook

| Situation                                              | Move                                   |
| ------------------------------------------------------ | -------------------------------------- |
| Adding same field to BE DTO + FE type + FE form        | 3 subagents, 1 message                 |
| Searching for usages across BE+FE                      | Parallel Grep, 1 message               |
| Reading 5 unrelated files to understand context        | Parallel Read, 1 message               |
| Modifying 4 service files for same API contract change | 4 subagents, 1 message                 |
| Schema change → migration → seed update → code         | **Sequential** (each depends on prior) |
| Type generation → code using types                     | **Sequential**                         |

**Cost discipline:**

- Use `Explore`/`Plan` subagents for read-heavy investigation — keeps main context small.
- Don't re-read files just edited (harness tracks state).
- Don't double-search: if a subagent is searching, **you** don't also search.

---

## 🎨 7. Installed Skills — Use Them First

**Rule:** When a task matches a skill's trigger, defer to it **before** writing code. Skills carry curated patterns, palettes, and decision rules — manual guessing wastes tokens and produces inconsistent output.

### Frontend — `ui-ux-pro-max` (nextlevelbuilder)

**Install (Claude Code marketplace):**

```
/plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill
/plugin install ui-ux-pro-max@ui-ux-pro-max-skill
```

**Or via CLI (per-project / global):**

```bash
npm install -g uipro-cli
uipro init --ai claude              # per project
uipro init --ai claude --global     # all projects
```

**Auto-triggers on:** "build a page", "design a dashboard", "create a component", "make a landing", "mobile UI", "dark mode", "color scheme", "redesign X".

**Provides:** 67 UI styles · 161 color palettes · 57 font pairings · 161 product-type reasoning rules · 99 UX guidelines · 25 chart types · 10 stacks (incl. React, Tailwind, shadcn).

**Workflow rule (this project = React + shadcn + Tailwind):**

1. New page or significant UI change → **let the skill propose** style/palette/typography **first**.
2. Map skill output onto existing shadcn primitives in `src/components/ui/`. Don't introduce a new component library.
3. Use Tailwind tokens + `cn()` for overrides. Don't fork `tailwind.config.ts` unless skill explicitly recommends a token addition.
4. Skill recommends a pattern that conflicts with project conventions (§5) → conventions win. Surface the conflict to the user.

### Backend — equivalent skill set (jeffallan/claude-skills)

**Install (Claude Code marketplace):**

```
/plugin marketplace add jeffallan/claude-skills
/plugin install fullstack-dev-skills@jeffallan
```

**Repo:** https://github.com/Jeffallan/claude-skills — check repo for exact `/plugin install` slug if the above changes.

**Relevant skills for this stack (NestJS 11 + Prisma 6 + PostgreSQL):**

| Skill                    | Triggers on                                                                     | Use for                                                         |
| ------------------------ | ------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| **NestJS Expert**        | "new module", "controller", "service", "guard", "interceptor", "DI"             | Module scaffolds, decorators, DTO patterns, lifecycle hooks     |
| **API Architect**        | "new endpoint", "REST", "OpenAPI", "versioning", "pagination", "error contract" | Endpoint shape, HTTP semantics, Swagger annotations             |
| **Database Designer**    | "migration", "schema change", "index", "relation", "Prisma", "query plan"       | Schema edits, index strategy, N+1 avoidance, transactions       |
| **Secure Code Guardian** | "auth", "JWT", "RBAC", "password", "input validation", "rate limit", "CORS"     | Threat-model new flows, harden inputs, audit `@Public()` routes |
| **Test Master**          | "write test", "e2e", "Jest", "mock", "coverage"                                 | Spec scaffolds, fixture builders, integration test setup        |
| **Debugging Wizard**     | "bug", "500", "Prisma error", "race", "deadlock"                                | Root-cause analysis, minimal repros                             |

**Workflow rule:**

1. New endpoint/migration/auth flow → **load relevant skill first** (often 2: e.g., `API Architect` + `Database Designer` for an endpoint that hits new tables).
2. Run skills in parallel via subagents (§0) when investigating an unfamiliar area.
3. Skill output is **input to your work** — apply project conventions (§5) on top. Don't paste skill scaffolds raw if they contradict our `Api*Exception`, `fromEntity()`, or branch-tenancy patterns.

### Built-in Claude Code skills (already available)

| Skill              | When to invoke                                             |
| ------------------ | ---------------------------------------------------------- |
| `/review`          | Before opening a PR — internal code review pass            |
| `/security-review` | Any change touching auth, input handling, or data exposure |
| `/init`            | Bootstrapping a new repo's `CLAUDE.md`                     |

### Skill etiquette

- [ ] Don't invoke a skill that's already running.
- [ ] Don't double-work: if skill is searching/analyzing, **you** don't also search the same thing.
- [ ] Skill recommendation conflicts with project convention? → Project wins. Tell the user why.
- [ ] Skill output too generic? → Refine the prompt with stack specifics (NestJS 11, Prisma 6, shadcn, React Query) before re-invoking.

---

## 🏢 8. Multi-Tenancy Discipline — Branch is the Tenant

**Tenant model:** This project uses **Branch** as the tenant boundary. Isolation pattern is **shared database + shared schema with `tenant_id` column** (`branch_id` here) — the cheapest, riskiest model. **A single missing `branchId` filter leaks data across tenants.**

### 8.1 Tenant context — non-negotiable rules

- [ ] **Never trust client-supplied tenant context.** Always read `branchId` from `CurrentUserPayload` (JWT-derived), never from query params, body, or headers. A user-supplied `branch_id=other-tenant` must be **rejected or ignored**, not used.
- [ ] **JWT is the source of truth.** `branchId` lives in the signed token. If it's not in the token, the user is cross-tenant (only `owner` / `dev`).
- [ ] **Validate JWT signature before reading claims.** `JwtAuthGuard` handles this — don't bypass it. Never use `jwt.decode()` without verification.
- [ ] **No tenant switching mid-session.** A user who somehow gains roles in another branch must re-authenticate. No "switch tenant" cookie/header tricks.

### 8.2 Cross-tenant roles — `owner` and `dev` only

| Role       | `branchId` in JWT | Scope             | Use                                           |
| ---------- | ----------------- | ----------------- | --------------------------------------------- |
| `dev`      | usually `null`    | All branches      | Internal/debug — flag in audit log            |
| `owner`    | usually `null`    | All branches      | Company owner — global analytics, branch CRUD |
| `manager`  | **required**      | Their branch only | Branch operations                             |
| `operator` | **required**      | Their branch only | Day-to-day registrar                          |
| `teacher`  | **required**      | Their branch only | Read-only on assigned students                |

**Rule:** Every service method must explicitly handle cross-tenant roles:

```ts
// ✅ Correct — explicit cross-tenant branch
const where: Prisma.StudentWhereInput = { deletedAt: null };
if (user.role !== 'owner' && user.role !== 'dev') {
  if (!user.branchId) throw new ApiForbiddenException();
  where.branchId = user.branchId;
}

// ❌ Wrong — silent: if user.branchId is null, returns ALL tenants' data
const where = { deletedAt: null, branchId: user.branchId ?? undefined };
```

### 8.3 Query layer — every read AND write must be tenant-scoped

- [ ] `findMany` / `findFirst` / `count` → `where: { branchId: user.branchId, ... }` (unless cross-tenant role).
- [ ] `update` / `delete` → use `updateMany` / `deleteMany` with `branchId` filter to prevent updating another tenant's row by ID guess. Or pre-fetch with `branchId` filter, then update by `id`.
- [ ] `create` → `branchId: user.branchId` (server-side), never accept it from request body for non-cross-tenant roles.
- [ ] Aggregates (`groupBy`, `sum`) → same rule: `branchId` filter.
- [ ] Raw SQL (`$queryRaw`) — banned for branched tables unless reviewed. Parameterize and include `WHERE branch_id = $1`.

**Why `updateMany` over `update`:**

```ts
// ❌ Vulnerable: operator from branch A can update student in branch B if they guess ID
await prisma.student.update({ where: { id: dto.id }, data: ... });

// ✅ Safe: filter ensures cross-tenant update silently does nothing (rows=0)
const result = await prisma.student.updateMany({
  where: { id: dto.id, branchId: user.branchId },
  data: ...,
});
if (result.count === 0) throw new ApiNotFoundException();
```

### 8.4 Audit logging — tenant context required

Every entry in `AuditLog` must capture the actor's tenant context for forensic analysis:

- [ ] `userId` — actor (already present)
- [ ] `entity` / `entityId` — what was touched
- [ ] **`changes.branchId`** — tenant the action affected (add to `changes` payload)
- [ ] **`changes.actorRole`** — actor role at time of action (important: a `dev` action on tenant X must be distinguishable)
- [ ] Cross-tenant actions by `owner`/`dev` → log explicitly with `crossTenant: true` flag in `changes`.

### 8.5 Tenant isolation at the boundaries

**Inbound (controllers):**

- [ ] Reject requests where body/query `branch_id` differs from JWT `branchId` for non-cross-tenant roles. Don't silently ignore — return 403.
- [ ] Swagger: don't document `branch_id` as a writable field for branch-scoped endpoints.

**Outbound (responses):**

- [ ] `fromEntity()` must not expose foreign-tenant data leaked via `include`. If you `include: { branch: true }`, ensure the join couldn't return another tenant's branch.
- [ ] Error messages: don't leak existence of another tenant's records. `"Student not found"` for both "doesn't exist" and "exists in another tenant" — never `"Student belongs to branch X"`.

**Telemetry / logs:**

- [ ] Every `Logger.log()` for a request includes `branchId` and `userId`. Add to correlation context (see [correlation-id.middleware.ts](src/core/middleware/correlation-id.middleware.ts)).
- [ ] Never log full PII (phone, full name) — log IDs + branch.

### 8.6 Noisy neighbor & scale

The shared-schema model means one tenant's heavy query can degrade all tenants:

- [ ] **Pagination is mandatory.** No unbounded `findMany`. Default `limit = 20`, max `100`.
- [ ] **Query timeouts** — set Prisma `transactionOptions.timeout` on `$transaction` calls (default 5s).
- [ ] **Indexes carry `branchId` first** when query patterns are branch-scoped. Existing: `@@index([branchId, courseType, deletedAt])`. Add new composites with `branchId` as leading column for branch-scoped queries.
- [ ] **Rate limiting per branch** (not just per IP) — not yet implemented; flag if adding rate-limit middleware.

### 8.7 Frontend tenant discipline

- [ ] **Never store `branchId` in frontend state independently of the JWT.** Read it from the decoded token in `authStore` — single source of truth.
- [ ] Branch selector (owner/dev only) → on switch, **re-fetch all queries** (`queryClient.invalidateQueries()`) or scope query keys to `['students', branchId, ...]` so cache doesn't bleed across tenants.
- [ ] After logout, **clear React Query cache**: `queryClient.clear()`. Stale tenant data must not persist for the next user.
- [ ] Don't render `branch_id` in URLs as the auth source — JWT decides what the user can see, not the URL.

### 8.8 Future hardening (not required, flag when relevant)

| Pattern                                 | When to consider                                                                                                                   |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| PostgreSQL **Row-Level Security (RLS)** | When tenant count grows or audit requires DB-layer enforcement. Add `tenant_id = current_setting('app.branch_id')::uuid` policies. |
| **Schema-per-tenant** migration         | If a single tenant (e.g., large franchise) needs schema customization.                                                             |
| **Database-per-tenant**                 | Enterprise/regulated customer demands full isolation. Not currently planned.                                                       |
| **Logical replication per tenant**      | Geo-distribution per branch (cross-region) — only at significant scale.                                                            |
| **Connection pool per tenant**          | If noisy neighbor becomes measurable in production.                                                                                |

**Today:** stick with shared-schema + strict app-layer enforcement. Don't introduce RLS or schema-per-tenant without explicit user approval — it's a major architectural change.

### 8.9 Quick examples

**❌ Tenant leak via direct ID lookup**

```ts
@Get(':id')
async findOne(@Param('id') id: string) {
  return this.prisma.payment.findUnique({ where: { id } }); // any tenant's payment!
}
```

**✅ Tenant-scoped fetch**

```ts
@Get(':id')
async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
  const payment = await this.prisma.payment.findFirst({
    where: this.scopeByBranch({ id }, user),
  });
  if (!payment) throw new ApiNotFoundException();
  return PaymentResponse.fromEntity(payment);
}
```

**❌ Cross-tenant cache poisoning on FE**

```ts
useQuery({ queryKey: ['students'], queryFn: fetchStudents });
// after branch switch → stale data from old tenant served from cache
```

**✅ Tenant-keyed cache**

```ts
const branchId = useAuthStore((s) => s.user?.branchId);
useQuery({
  queryKey: ['students', branchId],
  queryFn: () => fetchStudents(),
  enabled: !!branchId || isCrossTenantRole,
});
```

---

## 📋 Pre-flight Checklist (Before Submitting Work)

- [ ] Goal verifiable? Each checkpoint passed?
- [ ] Diff only contains lines tracing to the request?
- [ ] Style matches existing files (snake_case API, camelCase TS, conventions table)?
- [ ] Multi-file independent changes ran in **parallel**?
- [ ] Relevant skill (§7) consulted when task matched its triggers?
- [ ] BE response DTO change → FE type updated in same change set?
- [ ] Mutation added → query invalidation wired?
- [ ] Money/Decimal handled correctly (no float coercion mid-calc)?
- [ ] Branch tenancy filter present where applicable?
- [ ] Soft-delete filter present on User/Student/Branch queries?
- [ ] No `try/catch` swallowing errors; no manual response envelope?
- [ ] **Tenant:** `branchId` sourced from JWT only, never request body/query?
- [ ] **Tenant:** writes use `updateMany`/`deleteMany` with `branchId` filter (or pre-fetch verified)?
- [ ] **Tenant:** cross-tenant roles (`owner`/`dev`) handled explicitly, not by `null` slipping through?
- [ ] **Tenant:** audit log includes `branchId` + actor role for the action?
- [ ] **Tenant (FE):** query keys include `branchId`; cache cleared on logout/branch switch?

---

**Working when:** smaller diffs · fewer rewrites · clarifications before code · parallel batches for independent work · BE+FE shapes stay in sync · **zero cross-tenant data leaks**.

---

## 🔄 9. Cross-Repo Dependency & Multi-Language Rules

**Rules that ensure BE+FE+Admin stay in sync, and every feature supports all 3 languages (uz/ru/en).**

### 9.1 API contract changes → FE + Admin must update

When any backend API response shape, request DTO, or query parameter changes:

- [ ] Update `src/types/*.ts` in this repo to match BE response DTOs.
- [ ] Update `src/services/*Service.ts` hooks (query keys, params, return types).
- [ ] Verify: `tsc --noEmit` builds clean.

### 9.2 Every feature must support uz/ru/en (MANDATORY)

All user-facing text must use `useTranslation()` / `t()` from `react-i18next`. No hardcoded Uzbek, Russian, or English strings.

- [ ] New page → add translation keys to `src/i18n/locales/{uz,ru,en}.json` **before** writing the component.
- [ ] New component with user-facing text → add keys + use `t('key')`.
- [ ] Toast messages, button labels, placeholders, empty states, errors — all must use `t()`.
- [ ] Never commit a component without checking if it needs translations.
- [ ] Pre-flight: `t()` calls exist for every visible string in the component.

**Translation key naming convention:**

```
"pagename.element.action": "Uzbek text"
"students.table.name": "Ism"
"attendance.status.present": "Keldi"
"schedule.legends.theory": "Teoriya"
```

### 9.3 Frontend ↔ Admin panel parity

- A feature added to this frontend should have an equivalent in `autodrive-admin-panel` if the admin panel has the same page type.
- Shared translation patterns between FE and Admin should be consistent (same key names where possible).

### 9.4 After adding translations

- [ ] Verify translation coverage: all keys in `uz.json` exist in `ru.json` and `en.json`.
- [ ] Build check: `tsc --noEmit` passes.
- [ ] PR must include all 3 locale files.

---

## 🔀 Post-PR-open Conflict Check

Right after `gh pr create` — and again any time `origin/main` moves while the PR sits open — check for conflicts:

```bash
gh pr view <number> --json mergeable,mergeStateStatus --jq '{mergeable,mergeStateStatus}'
```

If `mergeable` is `CONFLICTING`, fix it immediately — don't leave a conflicted PR sitting open for the user to discover later. Full resolution rules (why-first, when `--ours` is safe, verification bar) live in the workspace-root `CLAUDE.md`'s "Post-PR-open conflict check" section — same rules apply here.

---

## Agent skills

### Issue tracker

Issues tracked on GitHub. See `docs/agents/issue-tracker.md`.

### Triage labels

5 canonical labels: needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context — one `CONTEXT.md` at repo root. See `docs/agents/domain.md`.

---

## Matt Pocock Engineering Skills

Globally installed at `~/.agents/skills/`. Vanilla (original).

### Workflow (sinab koʻrilgan)

1. `/grill-with-docs` → design decisions
2. `/to-prd` → PRD
3. `/to-issues` → GitHub Issues (BEADS tracker)
4. `/tdd` → implement

### Key skills

- `/triage` — backlog management
- `/implement` — plan execution
- `/prototype` — throwaway prototypes
- `/review` — parallel code review
- `/handoff` — cross-session context
- `/diagnosing-bugs` — bug investigation
- `/ask-matt` — router (lists all skills)
