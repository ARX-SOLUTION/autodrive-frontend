import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initI18n } from './i18n';

if ('serviceWorker' in navigator) {
  window.addEventListener(
    'load',
    () => {
      void navigator.serviceWorker
        .register('/sw.js', { type: 'module' })
        .catch(() => undefined);
    },
    { once: true },
  );
}

const bootstrap = async () => {
  await initI18n();
  createRoot(document.getElementById('root')!).render(<App />);

  void import('./lib/webVitals')
    .then(({ initWebVitals }) => initWebVitals())
    .catch(() => undefined);
};

void bootstrap();
