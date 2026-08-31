const SRC = import.meta.env.VITE_UMAMI_SRC;
const ID = import.meta.env.VITE_UMAMI_WEBSITE_ID;
const MAX_PENDING_EVENTS = 20;

type PendingEvent = {
  event: string;
  data?: Record<string, unknown>;
};

let injected = false;
const pendingEvents: PendingEvent[] = [];

const flushPendingEvents = (): void => {
  if (typeof window === 'undefined' || !window.umami?.track) return;

  for (const pending of pendingEvents.splice(0)) {
    window.umami.track(pending.event, pending.data);
  }
};

export const initUmami = (): void => {
  if (!SRC || !ID || injected || typeof document === 'undefined') return;

  const script = document.createElement('script');
  script.src = SRC;
  script.defer = true;
  script.setAttribute('data-website-id', ID);
  script.addEventListener('load', flushPendingEvents, { once: true });
  document.head.appendChild(script);
  injected = true;
};

/** Never include PII (names, emails, phones) in event data. */
export const track = (event: string, data?: Record<string, unknown>): void => {
  if (typeof window === 'undefined') return;

  try {
    if (window.umami?.track) {
      flushPendingEvents();
      window.umami.track(event, data);
      return;
    }

    pendingEvents.push({ event, data });
    if (pendingEvents.length > MAX_PENDING_EVENTS) pendingEvents.shift();
  } catch {
    // Analytics must never interrupt the product flow.
  }
};
