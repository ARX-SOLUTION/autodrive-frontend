// One build is served on multiple hostnames: the production apex
// (automaktab.uz -- marketing/landing only), app.automaktab.uz (the real
// CRM), and per-branch Vercel preview hosts. Auth redirects need to tell
// those apart at runtime.
const ROOT_DOMAIN = 'automaktab.uz';

// True only on the bare apex -- never on app./admin. subdomains,
// localhost/127.0.0.1, or *.vercel.app previews. Exact match is deliberate:
// endsWith(ROOT_DOMAIN) would also match those subdomains, since they end
// in "automaktab.uz" too.
export const isRootDomain = (hostname = window.location.hostname): boolean =>
  hostname === ROOT_DOMAIN;

// Full URL to `path` on the app subdomain. Root domain -> app is always a
// real navigation (not react-router's navigate), so the domain-wide auth
// cookie is sent on the new origin's first request.
export const rootDomainAppUrl = (path: string): string =>
  `https://app.${ROOT_DOMAIN}${path}`;

// A real full-page navigation, as opposed to react-router's client-side
// navigate() -- deliberately outside any component: react-hooks/immutability
// flags assigning to a global's property (window.location) anywhere inside a
// component/hook body, even when (as with LoginPage's onSuccess) it's only
// ever reachable from an async callback, never during render.
export const navigateFullPage = (url: string): void => {
  window.location.href = url;
};
