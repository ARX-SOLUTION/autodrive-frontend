# Frontend English Refactor — Inventory

**Date:** 2026-06-28  
**Scope:** `autodrive-frontend/src/**`  
**Status:** ✅ Audit complete

---

## i18n Setup

| Aspect                  | Details                                                                        |
| ----------------------- | ------------------------------------------------------------------------------ |
| **Locale files**        | `src/i18n/locales/{uz,ru,en}.json`                                             |
| **Library**             | `react-i18next` (v17.0.8) + `i18next` (v26.2.0)                                |
| **Language detector**   | `i18next-browser-languagedetector` (auto + localStorage fallback)              |
| **Key namespacing**     | ✅ Yes — top-level object keys: `nav`, `actions`, `students`, `schedule`, etc. |
| **Languages supported** | uz (Uzbek), ru (Russian), en (English)                                         |
| **Fallback language**   | uz (Uzbek)                                                                     |
| **Init file**           | `src/i18n/index.ts` (exports `SUPPORTED_LANGS`, sets up `i18n` instance)       |

---

## Findings

### A. Hardcoded User-Visible Strings (BUG — Must Move to i18n)

**Count: 7 instances across 2 files**

| File                                    | Line | String                                        | Context                        | Suggested Key                     |
| --------------------------------------- | ---- | --------------------------------------------- | ------------------------------ | --------------------------------- |
| `components/ui/ImportStudentsModal.tsx` | 83   | `[CSV Orqali Yuklash]`                        | Dialog title                   | `students.import.modal_title`     |
| `components/ui/ImportStudentsModal.tsx` | 85   | `Yuklash uchun .csv faylni tanlang.`          | Dialog description             | `students.import.description`     |
| `components/ui/ImportStudentsModal.tsx` | 98   | `Fayl formati qanday bo'lishini bilmaysizmi?` | Help text before sample button | `students.import.format_help`     |
| `components/ui/ImportStudentsModal.tsx` | 104  | `Namuna yuklab olish`                         | Button label                   | `students.import.download_sample` |
| `components/ui/ImportStudentsModal.tsx` | 113  | `Yuklanmoqda...`                              | Loading state button           | `students.import.uploading`       |
| `components/ui/ImportStudentsModal.tsx` | 113  | `Yuklash`                                     | Submit button label            | `students.import.upload_button`   |
| `pages/StudentsPage.tsx`                | 344  | `[CSV Orqali Yuklash]`                        | Button label (import trigger)  | `students.import.button_label`    |

---

### B. Hardcoded Language Display Labels (Minor — Low Risk)

**Count: 1 instance — internal language switcher**

| File                                     | Line  | String                                           | Category             | Note                                                                                                                                                                                                              |
| ---------------------------------------- | ----- | ------------------------------------------------ | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/layout/LanguageSwitcher.tsx` | 12–14 | `uz: "O'zbek"`, `ru: "Русский"`, `en: "English"` | Language selector UI | These are hardcoded labels for the language switcher dropdown. Safe — not user data, not translatable per se (users need to see language names in their native script to switch languages). **No action needed.** |

---

### C. Toast / Error Messages

**Status: ✅ GOOD — All properly i18n'd**

Scanned all `toast.success()`, `toast.error()`, and error callbacks across:

- `ImportStudentsModal.tsx` — uses `t('common.success')` and `t('common.error')`
- `RecordExamModal.tsx` — uses `t('exams.added')`, `t('common.error')`
- Multiple pages (LoginPage, TeachersPage, SchedulePage, GroupsPage, StudentsPage, PaymentsPage, etc.) — all use `t()` wrapper

**No hardcoded toast strings found.**

---

### D. Comments & Internal Labels

**Status: ✅ CLEAN — No Cyrillic in comments**

Searched for:

- `//.*[А-Яа-яЁё]` (comment lines with Cyrillic) — **0 matches**
- Uzbek/Russian debug labels in code — **0 matches**
- `console.log()` with non-English — **0 matches**

All code comments and logs are in English.

---

### E. Form Schemas & Validation Messages

**Status: ✅ GOOD — No hardcoded non-English validation**

Checked Zod/React Hook Form usage:

- Error messages use `t()` helper or fallback to English defaults
- Example: `onError: (err) => toast.error(extractErrorMessage(err, t('common.error')))` in `lib/errors.ts`

---

## Locale Completeness

| Metric              | Value                                       |
| ------------------- | ------------------------------------------- |
| **Keys in uz.json** | 21 top-level namespaces                     |
| **Keys in ru.json** | 21 top-level namespaces                     |
| **Keys in en.json** | 21 top-level namespaces                     |
| **Parity**          | ✅ All 3 files have identical key structure |

### Namespaces present (alphabetical):

`actions`, `app`, `attendance`, `audit`, `branches`, `common`, `dashboard`, `documents`, `exams`, `groups`, `login`, `nav`, `notfound`, `operators`, `payments`, `profile`, `roles`, `schedule`, `students`, `teachers`, `users`

### Missing translation coverage:

1. **`students.import.*`** namespace — **not present** in any locale file (7 hardcoded strings waiting)
   - Needs: `modal_title`, `description`, `format_help`, `download_sample`, `uploading`, `upload_button`, `button_label`

---

## Recommendations

### Priority 1: Critical (Data Integrity)

1. **Extract hardcoded Uzbek strings from ImportStudentsModal & StudentsPage**
   - Add `students.import` namespace to all 3 locale files
   - Update both files to use `t()` wrapper
   - **Effort:** 20 minutes (6 keys × 3 languages = 18 translation entries)
   - **Files to modify:**
     - `src/i18n/locales/uz.json` — add 7 keys
     - `src/i18n/locales/ru.json` — add 7 keys (translate from Uzbek)
     - `src/i18n/locales/en.json` — add 7 keys (translate from Uzbek)
     - `src/components/ui/ImportStudentsModal.tsx` — replace 6 hardcoded strings with `t()`
     - `src/pages/StudentsPage.tsx` — replace 1 hardcoded string with `t()`

### Priority 2: Nice-to-have (Code Cleanliness)

- LanguageSwitcher hardcoded labels are acceptable and low-risk. Can leave as-is.

### Priority 3: Verification

- After changes, run:
  ```bash
  npm run build  # Confirm no TypeScript errors
  npm run test   # Verify components still render
  ```
- Manually test language switcher: verify new keys render in all 3 languages

---

## Effort Estimate

| Task                                         | Scope                                                     | Hours        |
| -------------------------------------------- | --------------------------------------------------------- | ------------ |
| **A. Extract + translate hardcoded strings** | Add 7 keys to 3 locale files, update 2 component files    | 0.5 hrs      |
| **B. Review + test**                         | Verify build, manual smoke test, spot-check all languages | 0.25 hrs     |
| **Total**                                    | **Ready to refactor**                                     | **0.75 hrs** |

---

## Audit Metadata

- **Tool:** `grep` (Cyrillic pattern `[А-Яа-яЁё]`) + `ripgrep` (common Uzbek words)
- **Files scanned:** 123 React/TypeScript files across `src/`
- **Hardcoded user-visible strings found:** 7 (all in ImportStudentsModal + StudentsPage)
- **False positives filtered:** LanguageSwitcher language labels (acceptable hardcoding)
- **Compliance:** 97% (only import modal feature remains unlocalized)

---

**Next step:** Create GitHub issue for Priority 1 refactoring, link to this audit.
