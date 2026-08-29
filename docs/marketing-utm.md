# Marketing UTM Tracking

Analytics provider: **Umami** (pivoted from Yandex Metrica, bd autodrive-nbc.2).

## How umami reads UTM params

Umami auto-captures `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, and `utm_term` from the URL on every pageview — no code needed. They appear in the "Sources" tab of your umami dashboard.

## SPA auto-tracking note

Umami monkey-patches `history.pushState` and `history.replaceState` at init, so every TanStack Router `<Link>` click and `navigate()` call fires a pageview automatically. No manual RouteTracker component is needed.

**Caveat:** Browser back/forward buttons (`popstate`) are NOT tracked by umami. If that matters, add: `window.addEventListener('popstate', () => window.umami?.track('pageview'))`.

## Ready-to-use Telegram links

Paste these into your Telegram posts/channels. Umami will bucket them automatically under "telegram" in Sources.

```
# General channel post
https://app.automaktab.uz/?utm_source=telegram&utm_medium=social&utm_campaign=organic

# Paid/sponsored post
https://app.automaktab.uz/?utm_source=telegram&utm_medium=paid&utm_campaign=ads_jul2026

# Demo CTA in bio
https://app.automaktab.uz/?utm_source=telegram&utm_medium=social&utm_campaign=bio_cta
```
