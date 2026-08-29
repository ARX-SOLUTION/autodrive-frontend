# Owner experience research

## Decision

The owner dashboard does not need more KPIs. It needs a clearer decision order:

`scope and freshness -> KPI pulse -> daily attention -> trends and branch comparison -> diagnostics`

The smallest useful frontend slice is to place the existing debt-recovery queue and operational follow-through cards together, directly after the KPI strip. This creates one daily-attention band without changing the API, calculations, routes, or visual system.

## Evidence

- QuickBooks describes A/R aging as a view of who owes money, how much remains due, and how long balances are past due. Automaktab already has aggregate debt aging and a recovery queue, but recovery rows do not have a contractual due date, so the UI must not claim they are overdue: [QuickBooks A/R aging](https://quickbooks.intuit.com/learn-support/en-us/help-article/accounts-receivable-reports/run-accounts-receivable-aging-report/L4N7PC2hg_US_en_US).
- Mindbody's multi-location reporting emphasizes side-by-side location comparison, outlier discovery, and drill-down. Automaktab already supports this through `branch_performance`: [Mindbody multi-location management](https://www.mindbodyonline.com/business/multi-location-management).
- Jackrabbit's education dashboard groups high-priority alerts, exposes counts, and links incomplete attendance to detail. Before this slice, Automaktab separated that signal from debt recovery and showed only its count: [Jackrabbit dashboard alerts](https://help.jackrabbitclass.com/help/dashboard-alerts).

These sources establish recurring product patterns, not direct Automaktab user preference. The priority below is an inference from those patterns and the data already available in this repository.

## Repository findings

- `CompanyRevenueDashboard` is shared by owner, manager, and operator; owner is distinguished by cross-branch access rather than a separate component.
- The API model already includes revenue, debt, collection, branch performance, academic outcomes, staff metrics, a recovery queue, and incomplete-attendance operations.
- Before this slice, the recovery and operations cards occupied separate two-column sections with one empty desktop column each. They represented the same decision job but were far apart in the page.
- Individual recovery items expose `last_payment_at`, not `due_date` or `overdue_days`. The existing frontend heuristic is not receivables truth.
- The student funnel starts after a student record exists. A real lead-to-contract funnel cannot be built from the current frontend contract.

## Brand direction

Keep the existing Road Signal system: warm paper, road teal, one amber action accent, solid borders, compact radii, tabular numbers, and minimal motion. Brand value here comes from hierarchy and repeated product behavior, not a new logo, gradient, effect, or color set.

## Accepted slice

- Move the existing recovery and operations cards into one responsive two-column section immediately after the KPI strip.
- Move JSX; do not duplicate or redesign the cards.
- Preserve filters, freshness, calculations, ordering, labels, routes, and accessibility.
- Keep every later trend, branch, finance, academic, and staff block unchanged.
- Add no API call, dependency, abstraction, animation, translation key, or speculative urgency score.

## Deferred gaps

1. Receivables truth requires backend `due_date` or `overdue_days` per recovery item.
2. A pre-contract funnel requires lead-stage data, not the current post-creation `lead_source` field.
3. Owner-specific header actions need usage evidence before replacing operator-oriented shortcuts.
