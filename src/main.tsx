import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ensureI18n } from './i18n/ensure';

const isLoginDocument = () => {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  return path === '/login';
};

const SERVICE_WORKER_UPDATE_INTERVAL_MS = 60 * 60 * 1000;
const SERVICE_WORKER_UPDATE_THROTTLE_MS = 60 * 1000;

if ('serviceWorker' in navigator) {
  let hasController = Boolean(navigator.serviceWorker.controller);
  let isReloading = false;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hasController) {
      hasController = true;
      return;
    }
    if (isReloading) return;

    isReloading = true;
    window.location.reload();
  });

  window.addEventListener(
    'load',
    () => {
      void navigator.serviceWorker
        .register('/sw.js', { type: 'module' })
        .then((registration) => {
          let isUpdateCheckInFlight = false;
          let lastUpdateCheckAt = Date.now();

          const checkForUpdate = () => {
            const now = Date.now();
            if (
              !navigator.onLine ||
              isUpdateCheckInFlight ||
              now - lastUpdateCheckAt < SERVICE_WORKER_UPDATE_THROTTLE_MS
            ) {
              return;
            }

            isUpdateCheckInFlight = true;
            lastUpdateCheckAt = now;
            void registration
              .update()
              .catch((error: unknown) => {
                console.error('[service-worker] Update check failed.', error);
              })
              .finally(() => {
                isUpdateCheckInFlight = false;
              });
          };

          window.setInterval(checkForUpdate, SERVICE_WORKER_UPDATE_INTERVAL_MS);
          window.addEventListener('focus', checkForUpdate);
          document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') checkForUpdate();
          });
        })
        .catch((error: unknown) => {
          console.error('[service-worker] Registration failed.', error);
        });
    },
    { once: true },
  );
}

const bootstrap = async () => {
  if (!isLoginDocument()) {
    await ensureI18n();
  }

  createRoot(document.getElementById('root')!).render(<App />);

  if (isLoginDocument()) {
    const warmTranslations = () => {
      void ensureI18n();
    };
    window.requestIdleCallback(warmTranslations, { timeout: 2_000 });
  }

  void import('./lib/webVitals')
    .then(({ initWebVitals }) => initWebVitals())
    .catch(() => undefined);
};

void bootstrap();
