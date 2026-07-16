import { createRoot } from 'react-dom/client';
import { toast } from 'sonner';
import App from './App.tsx';
import './index.css';
import i18n from './i18n';
import { registerSW } from 'virtual:pwa-register';
import { initWebVitals } from './lib/webVitals';

initWebVitals();

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    toast(i18n.t('common.update_available'), {
      duration: Infinity,
      action: {
        label: i18n.t('common.update_reload'),
        onClick: () => updateSW(true),
      },
    });
  },
});
createRoot(document.getElementById('root')!).render(<App />);
