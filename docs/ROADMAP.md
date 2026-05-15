# Auto Drive CRM — Production Roadmap

> Yakuniy maqsad: 3 ta repo bo'yicha MVP'ni production-ready holatga olib chiqish.
> Yondashuv: phase-by-phase, har task uchun **verifiable checkpoint**, mustaqil ishlar **parallel** (CLAUDE.md §0).
> Tartib: Backend (asos) → Frontend (tenant CRM) → Admin panel (dev-only).

---

## 0. Loyiha xaritasi

| Repo | Vazifa | Foydalanuvchi |
|---|---|---|
| `arx-solution/autodrive-backend` | NestJS 11 API, Prisma 6, PostgreSQL | Hammasi |
| `arx-solution/autodrive-frontend` | Tenant CRM (React + Vite + shadcn) | `owner`, `manager`, `operator`, `teacher` |
| `xam1dullo/autodrive-admin-panel` | Platform admin (React + Vite + shadcn) | Faqat `dev` |

**Tenant ierarxiyasi (final):**

```
Platform (dev)
  └─ Company (owner)        ← driving school chain
       └─ Branch (manager)  ← single location
            ├─ Group (teacher)
            ├─ Student
            └─ Payment
```

---

## 1. Backend (`autodrive-backend`)

### Phase 1 — Production Blockers (kritik, sequential)

| # | Task | Verifiable checkpoint |
|---|---|---|
| 1.1 | `branches.service.ts` — barcha query'larga `companyId` filter (find/update/delete/create) | `npm run build` 0 error; e2e: company A manager company B filialini ko'rmaydi |
| 1.2 | `groups.service.ts` — `companyId` filter | Build clean; e2e: cross-company group leak yo'q |
| 1.3 | `students.service.ts` — `companyId` filter | Build clean; e2e: student listda boshqa company yo'q |
| 1.4 | `payments.service.ts` — `companyId` filter, aggregate'larga ham | Build clean; sum/count company bo'yicha to'g'ri |
| 1.5 | `users.service.ts` — owner faqat o'z company userlari; dev — barchasini | Owner A company B userlarini ko'rmaydi |
| 1.6 | `AuditLog.changes` payload'iga `companyId` + `branchId` + `actorRole` | Audit yozuvlarida hamma maydon mavjud |
| 1.7 | Prisma indexlari: `@@index([companyId, branchId, deletedAt])` hot table'larga | `EXPLAIN ANALYZE` index ishlatadi |
| 1.8 | e2e test: `tenant-isolation.e2e-spec.ts` — har bir entity uchun cross-company leak testi | `pnpm test:e2e` yashil |

### Phase 2 — Auth & Security

| # | Task | Verifiable checkpoint |
|---|---|---|
| 2.1 | Refresh token flow (`/auth/refresh`, httpOnly cookie rotation) | Access expire bo'lsa ham 7 kun avto login |
| 2.2 | Password policy: min 8, 1 raqam, 1 katta harf | Zaif parol 400 qaytaradi |
| 2.3 | Rate limiting: per-IP + per-branch (`@nestjs/throttler`) | Brute-force login 429 |
| 2.4 | Failed login lockout (5 xato → 15 daq), Redis counter | 6-chi urinish 423 Locked |
| 2.5 | `helmet`, CORS whitelist, CSRF (cookie auth bo'lsa) | Security headers `curl -I` |
| 2.6 | `POST /auth/forgot-password` + `/reset-password` (email/SMS token) | Token 15 daq, 1 marta |
| 2.7 | RBAC matrix hujjat — `docs/rbac-matrix.md` | Code bilan mos |
| 2.8 | Auth event'lar audit'da | Login/password reset audit'da |

### Phase 3 — Core CRM features

| # | Task | Verifiable checkpoint |
|---|---|---|
| 3.1 | `Attendance` modul (student+group+date+status), CRUD | Teacher daily attendance, manager ko'radi |
| 3.2 | `ExamResult` modul (theory/practice), CRUD | Student pass/fail history |
| 3.3 | `ScheduleSlot` (group+teacher+room+time), CRUD + conflict detection | Teacher 2 ta groupda bir vaqtda yo'q |
| 3.4 | `POST /students/bulk-create`, CSV import | 100 student bir so'rovda, validation per-row |
| 3.5 | `GET /students/search?q=` (name+phone+passport) | < 200ms, branchScoped |
| 3.6 | `Notification` table + Telegram bot integration | Manager yangi to'lov notification oladi |
| 3.7 | SMS integration (Eskiz/Playmobile) | Test SMS, balans tekshiriladi |

### Phase 4 — File handling & integrations

| # | Task | Verifiable checkpoint |
|---|---|---|
| 4.1 | File upload service — S3/MinIO | Upload → URL, GET orqali olib bo'ladi |
| 4.2 | `User.avatarUrl`, `Student.documents[]`, `Payment.receiptUrl` | Migrate o'tdi, FE ko'rsata oladi |
| 4.3 | File validation (max 5MB, jpg/png/pdf) | 6MB → 413, .exe → 415 |
| 4.4 | Pre-signed URL (direct S3 upload) | FE BE'siz S3'ga yuklaydi |
| 4.5 | `GET /reports/students/export?format=xlsx` | Excel 4 sheetli (students, payments, attendance, debt) |
| 4.6 | PDF generation — payment receipts, certificates | Pretty layout |
| 4.7 | Telegram bot — per-company token, daily report | Owner kuni report oladi |

### Phase 5 — Platform / Admin features

| # | Task | Verifiable checkpoint |
|---|---|---|
| 5.1 | `GET /platform/analytics` — companies/branches/students/MRR | Dev dashboardda real raqam |
| 5.2 | `GET /platform/audit-log` filterable (company, user, action, date) | 1M+ rowda <500ms |
| 5.3 | `POST /platform/companies/:id/impersonate` — dev token company token | Audit log "impersonation" event |
| 5.4 | `POST /platform/companies/:id/feature-flags` JSON config | `company.features.smsEnabled` ishlaydi |
| 5.5 | `GET /platform/health` — DB, Redis, S3 ping; `/metrics` Prometheus | 200/503 with details |
| 5.6 | System config — `GlobalConfig` model + admin endpoint | Default course types, currencies |

### Phase 6 — Performance & Observability

| # | Task | Verifiable checkpoint |
|---|---|---|
| 6.1 | Prisma query timeouts (`transactionOptions.timeout: 5000`) | Slow query 5s'da abort |
| 6.2 | Connection pool (PgBouncer / Prisma `connection_limit`) | 100 concurrent — DB exhausted emas |
| 6.3 | Pino structured logging — JSON, correlation-id, branchId | `traceId` Grafana parse qiladi |
| 6.4 | Sentry integration — error tracking | Test exception Sentry'da ko'rinadi |
| 6.5 | Prometheus metrics — req count, p95 latency, DB pool | Grafana dashboard |
| 6.6 | Redis caching — branch list, user list (staleTime 5 daq) | Cache hit > 70% |
| 6.7 | Pagination defaults — `limit=20`, max=100 | `?limit=1000` → 400 |

---

## 2. Tenant Frontend (`autodrive-frontend`)

### Phase 1 — UX polish

| # | Task | Verifiable checkpoint |
|---|---|---|
| 1.1 | Breadcrumbs (route'dan auto-generate) | `Bosh sahifa / Filial / X` |
| 1.2 | Theme toggle (light/dark, localStorage) | Sidebar tugma, dark tokenlari ishlaydi |
| 1.3 | Mobile sidebar drawer (`<md` sheet) | Telefonda hamburger, swipe-to-close |
| 1.4 | Page transitions (fade) | Smooth, content jump qilmaydi |
| 1.5 | Empty states (`EmptyState` har list page) | Bo'sh state CTA tugma |
| 1.6 | Skeleton loaders (table/card) | Initial load'da blank emas |
| 1.7 | ConfirmDialog destructive actions | Delete modal so'raydi |

### Phase 2 — Missing features

| # | Task | Verifiable checkpoint |
|---|---|---|
| 2.1 | Server-side pagination (Students/Payments/Groups) | `?page=2&limit=20`, URL'da saqlanadi |
| 2.2 | Filter panel (status, course type, debt) | Filter URL'ga, reload qoladi |
| 2.3 | Search bar global + per-page | Debounced 300ms |
| 2.4 | Attendance page (teacher daily) | Group → student → checkbox |
| 2.5 | Schedule calendar (FullCalendar / shadcn) | Manager weekly view |
| 2.6 | Exam results in student profile | Theory/practice attempts |
| 2.7 | Reports — Excel/PDF export | Tugma → toast → download |
| 2.8 | Notifications bell (unread count, dropdown) | WebSocket / polling 30s |
| 2.9 | File upload widget (avatar, scan) | Drag-drop, preview, progress |
| 2.10 | Payment receipt PDF download | "Cheque" tugma → PDF |

### Phase 3 — i18n & accessibility

| # | Task | Verifiable checkpoint |
|---|---|---|
| 3.1 | `react-i18next` setup (uz + ru + en) | Language switcher, tarjima |
| 3.2 | Hardcoded text'lar → `t('key')` | grep natijasi bo'sh |
| 3.3 | Date/number `Intl` lokal'ga ko'ra | uz: "15-yanvar 2026", ru: "15 января 2026" |
| 3.4 | Accessibility — `jsx-a11y`, keyboard nav | Tab orqali form to'liq |
| 3.5 | Screen reader test (VoiceOver/NVDA) | `aria-label` muhim tugmalarda |

### Phase 4 — Performance

| # | Task | Verifiable checkpoint |
|---|---|---|
| 4.1 | Route-level `React.lazy` | Initial bundle < 300KB |
| 4.2 | TanStack Query `staleTime` (branches 5daq, users 2daq) | Takror so'rov yo'q |
| 4.3 | List virtualization (`@tanstack/react-virtual`) — 100+ row | DOM'da 20 row faqat |
| 4.4 | Image lazy loading, WebP avatar | Lighthouse > 90 |
| 4.5 | PWA manifest + SW (offline cache) | "Add to Home" ishlaydi |

---

## 3. Admin Panel (`autodrive-admin-panel`) — dev role only

### Phase 1 — Yetishmaganlar

| # | Task | Verifiable checkpoint |
|---|---|---|
| 1.1 | `CompanyDetailPage` (`/companies/:id`) tab'lar: Overview, Branches, Users, Audit | Owner company barcha branchlari |
| 1.2 | Branches per company (CRUD ichidan) | Dev company A ga branch qo'shadi |
| 1.3 | Users per company (rol + branch tanlash) | Dev company A ga owner yaratadi |
| 1.4 | Audit log viewer full-page filter | 10K row pagination + search |
| 1.5 | Global search (cmd+k palette) — companies/users | Cmd+K → tez topish |

### Phase 2 — Platform-level

| # | Task | Verifiable checkpoint |
|---|---|---|
| 2.1 | Impersonation — "Login as owner" | Audit log, "Exit impersonation" tugma |
| 2.2 | Platform analytics charts (companies growth, MRR, active users) | Recharts 4 chart |
| 2.3 | Feature flags per company (JSON config UI) | Toggle → company saved, FE feature gate |
| 2.4 | Bulk operations — CSV import companies/users | 50 ta companyni CSV'dan |
| 2.5 | System health page (DB/Redis/S3 status) | Down → qizil indikator |
| 2.6 | Global settings page (course types, currencies) | Saqlash → backend `GlobalConfig` |

### Phase 3 — Operational tooling

| # | Task | Verifiable checkpoint |
|---|---|---|
| 3.1 | Logs viewer (Sentry/Pino orqali) | So'nggi 100 error stack trace |
| 3.2 | DB backup status + manual trigger | Tugma → backup job |
| 3.3 | Email/SMS template editor | Welcome email shabloni |
| 3.4 | Notification broadcast | Barcha owner'larga e'lon |
| 3.5 | Subscription/billing (agar SaaS) | Plan, expiry, payment history |
| 3.6 | 2FA dev account uchun majburiy | Login'da TOTP |

### Phase 4 — Polish & DX

| # | Task | Verifiable checkpoint |
|---|---|---|
| 4.1 | Theme toggle + mobile drawer | Telefonda ishlaydi |
| 4.2 | Keyboard shortcuts (cmd+k, g+c, g+u) | Power-user navigatsiya |
| 4.3 | Saved filters (localStorage) | Custom filter saqlash |
| 4.4 | Export from tables (CSV/Excel) | Tugma → download |
| 4.5 | Inline editing (table cell) | Click → input → enter → saved |

---

## 4. Cross-cutting (DevOps / Infra)

| # | Task | Verifiable checkpoint |
|---|---|---|
| C.1 | CI/CD — GitHub Actions: lint + build + test har PR'da | Red CI'da merge taqiqlanadi |
| C.2 | Docker Compose prod — BE + Postgres + Redis + Caddy bir fayl | `docker compose up` to'liq stack |
| C.3 | Environment management — `.env.example`, dotenv-vault | Secret'lar repo'da emas |
| C.4 | DB migrations CI auto — `prisma migrate deploy` | Deploy paytida migration auto |
| C.5 | Monitoring — Grafana + Prometheus + Loki | Dashboard'lar request rate, error rate, p95 |
| C.6 | Backup — daily Postgres dump → S3, 30 kun retention | Restore test o'tadi |
| C.7 | Documentation — `docs/` papka (API, RBAC, deployment, architecture) | Yangi dev 1 kunda boshlaydi |
| C.8 | Onboarding seed — `npm run seed:demo` | Yangi env'da darrov demo |

---

## 5. Tavsiya etilgan vaqt jadvali (rough)

| Hafta | Backend | Frontend | Admin Panel |
|---|---|---|---|
| 1 | Phase 1 (TS errors, tenancy) | — | — |
| 2 | Phase 2 (auth/security) | Phase 1 (polish) | Phase 1 (CompanyDetail) |
| 3 | Phase 3 (attendance/exam/schedule) | Phase 2.1–2.3 | Phase 1 (audit/search) |
| 4 | Phase 3 + 4.1–4.4 (files) | Phase 2.4–2.6 | Phase 2.1 (impersonation) |
| 5 | Phase 4.5–4.7 (reports, Telegram) | Phase 2.7–2.10 | Phase 2.2–2.4 |
| 6 | Phase 5 (platform analytics, audit) | Phase 3 (i18n) | Phase 2.5–2.6 + 3.1–3.2 |
| 7 | Phase 6 (perf/observability) | Phase 4 (perf) | Phase 3.3–3.5 |
| 8 | Cross-cutting (CI/CD, monitoring) | Polish, e2e | Phase 4 + bug fix |

**Total: ~8 hafta** (1 dev), ~4-5 hafta (2 dev parallel BE+FE).

---

## 6. Acceptance criteria (definition of done)

- [ ] Backend `npm run build` 0 error, `pnpm test:e2e` 100% pass
- [ ] Tenant isolation e2e — har entity uchun cross-company leak yo'qligi
- [ ] Frontend Lighthouse Performance > 85, Accessibility > 90
- [ ] Admin panelda dev har tenant ichiga kira oladi + log yoziladi
- [ ] Demo seed 1 buyruq (`docker compose up && npm run seed:demo`)
- [ ] CI/CD yashil, har PR'da auto-deploy preview
- [ ] Monitoring — Grafana dashboard 4 ta asosiy chart real-time
- [ ] Documentation — `README.md` + `docs/architecture.md` + `docs/rbac-matrix.md` + `docs/deployment.md`
- [ ] Backup restore test productiondan staging'ga 30 daq
- [ ] Security audit — `npm audit` 0 high/critical, helmet+CORS+rate-limit

---

## 7. Demo company seed — final spec

`npm run seed:demo` yaratadi:

```
Company: "Demo Auto Maktab"
  Owner: demo-owner@autodrive.uz / Demo1234!
  Branches:
    - Toshkent Markaziy
        Manager:   tashkent-manager@demo.uz / Demo1234!
        Operator:  tashkent-op@demo.uz / Demo1234!
        Teachers:  3
        Groups:    5 (B kategoriya)
        Students:  50 (random statuslar)
        Payments:  80 (oxirgi 3 oy)
    - Samarqand (kichikroq scale)
    - Buxoro    (kichikroq scale)

Platform dev:
  xamidullo@autodrive.uz / prodev (joriy)
```

**Verifikatsiya:** Dev login → admin panelda Demo ko'rinadi · Owner → 3 filial · Manager → faqat o'z filiali · Random data realistic.

---

## 8. Risk va yumshatish

| Risk | Yumshatish |
|---|---|
| Company tenancy migration data corruption | Backup avval, staging test, migration script idempotent |
| Impersonation security holes | Audit log majburiy, dev token alohida prefix |
| Rate limit cross-company adolatsiz | Per-branch + per-IP ikkitasi birga |
| Telegram bot token leak | Per-company token, encryption at rest |
| File upload abuse | Pre-signed URL, size limit, ClamAV virus scan |
| Demo seed productionga kirib qolish | `NODE_ENV !== 'production'` check seed'da |

---

## 9. PR strategy

**Branching:**
- `main` — production
- `develop` — staging (agar kerak bo'lsa)
- `feat/phase-N-X-description` — har task uchun

**PR checklist:**
- [ ] Task scope mos
- [ ] Build + test + lint clean
- [ ] CLAUDE.md pre-flight checklist o'tdi
- [ ] BE → FE type sync (agar shapelar o'zgargan bo'lsa)
- [ ] Migration bo'lsa rollback test
- [ ] Screenshot UI o'zgarishlar uchun

---

## 10. Hozirgi progress (2026-05-15)

### Backend
- ✅ Auth + change-password endpoint
- ✅ Demo Company seed (Phase 7 spec'ga yaqin)
- ✅ Phase 1.1-1.4 — branches/groups/students/payments `companyId` (PR #23 review'da)
- ⚠️ Phase 1.5-1.8 kutmoqda

### Tenant Frontend
- ✅ Phase 1.3 — mobile sidebar drawer (PR #9)
- ✅ Phase 1.5 — empty states
- ✅ Phase 4.1 — code-split (React.lazy)
- ✅ Phase 4.2 — staleTime defaults
- ⚠️ Phase 1.1, 1.2, 1.4, 1.7 — kutmoqda

### Admin Panel
- ✅ Companies CRUD + Platform Users CRUD + PlatformDashboard
- ✅ Company switcher (view-as company)
- ✅ Mobile responsive (drawer + card view)
- ⚠️ Phase 1.1-1.5 — CompanyDetailPage, full audit viewer, cmd+k kutmoqda
