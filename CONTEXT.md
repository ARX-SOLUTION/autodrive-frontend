# AutoDrive Frontend — Domain Context

Domain glossary and product boundaries. Routes, state, UI architecture, generated API types, and i18n setup live in `docs/architecture/overview.md`.

## Overview

React 19 + Vite + TypeScript frontend for an Uzbek driving school CRM. Tenant-facing application serving owners, managers, accountants, operators, and teachers across driving school branches. Built with shadcn/ui, TanStack Router, TanStack Query, Zustand, and a tenant-local **Warm Paper** visual system (warm off-white surfaces, rust accent). Shared `@autodrive/design-tokens` remain the package default; the tenant CRM overrides palette in `src/index.css` so the admin panel stays unchanged.

## Product boundaries

**Tenant App**:
The authenticated driving-school workspace used by owners, managers, accountants, operators, and teachers. It contains no public marketing or editorial pages.
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
| Foydalanuvchi | User            | Roles: **dev** (platform developer, all access), **owner** (company owner, cross-branch analytics + branch CRUD), **manager** (branch manager, full branch operations), **accountant** (company accountant), **operator** (day-to-day registrar), **teacher** (read-only on assigned students/groups).                                                                                                                                              |
| Sana oralig‘i | Date Range      | Inclusive pair of Calendar Dates (`from` / `to` as `YYYY-MM-DD`). Same-day allowed. Wire params stay `date_from` / `date_to`. _Avoid_: period, interval, date filter.                                                                                                                                                                                                                                                                               |
| —             | DateRangePicker | Single-trigger + range calendar for Date Range in filter bars (Students, Payments, Audit, Dashboard). _Avoid_: DateRangeFields, dual DatePicker.                                                                                                                                                                                                                                                                                                    |
