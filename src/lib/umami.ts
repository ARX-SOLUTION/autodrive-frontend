// ponytail: thin env-gated wrapper — umami script does all the heavy lifting
const SRC = import.meta.env.VITE_UMAMI_SRC;
const ID = import.meta.env.VITE_UMAMI_WEBSITE_ID;

let injected = false;

/**
 * Inject the umami script once at module load.
 * No-op if either env var is missing or already injected.
 */
export const initUmami = (): void => {
  if (!SRC || !ID || injected || typeof document === 'undefined') return;
  const s = document.createElement('script');
  s.src = SRC;
  s.defer = true;
  s.setAttribute('data-website-id', ID);
  document.head.appendChild(s);
  injected = true;
};

/**
 * Fire a named umami event. Safe no-op if umami hasn't loaded yet.
 * Never include PII (names, emails, phones) in data.
 */
export const track = (event: string, data?: Record<string, unknown>): void => {
  try {
    window.umami?.track(event, data);
  } catch {
    // never throws — analytics must not break the app
  }
};
