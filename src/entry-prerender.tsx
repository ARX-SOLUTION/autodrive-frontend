import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import i18n from './i18n';
import LandingPage from './pages/LandingPage';

// Build-time prerender of the public landing page (see scripts/prerender.mjs).
// Forced to uz so Node's navigator.language can't leak another locale into the snapshot.
export async function render(): Promise<string> {
  await i18n.changeLanguage('uz');
  const queryClient = new QueryClient();
  return renderToString(
    <QueryClientProvider client={queryClient}>
      <StaticRouter location="/">
        <LandingPage />
      </StaticRouter>
    </QueryClientProvider>,
  );
}
