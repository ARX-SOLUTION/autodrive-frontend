import { Component, type ReactNode } from 'react';
import { Warning } from '@phosphor-icons/react';
import { EmptyState } from '@/components/ui/EmptyState';
import i18n from '@/i18n';

const RELOAD_AT_KEY = 'chunk-error-reload-at';
const COOLDOWN_MS = 10_000;

const translateOrFallback = (key: string, fallback: string) => {
  const translated = i18n.t(key, { defaultValue: fallback });
  return typeof translated === 'string' && translated.trim()
    ? translated
    : fallback;
};

// Stale chunk hash after a deploy: the already-loaded shell references an
// asset URL the new build no longer has. One reload fetches the fresh
// index.html; the cooldown stops a loop if the deploy is genuinely broken.
const isChunkLoadError = (error: Error) =>
  /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk/i.test(
    error.message,
  );

export class ChunkErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    if (!isChunkLoadError(error)) return;
    const lastReload = Number(sessionStorage.getItem(RELOAD_AT_KEY) || 0);
    if (Date.now() - lastReload > COOLDOWN_MS) {
      sessionStorage.setItem(RELOAD_AT_KEY, String(Date.now()));
      window.location.reload();
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-[50vh] items-center justify-center">
          <EmptyState
            icon={Warning}
            title={translateOrFallback('common.error', 'Xatolik yuz berdi')}
            action={{
              label: translateOrFallback('common.retry', 'Qayta urinish'),
              onClick: () => window.location.reload(),
            }}
          />
        </div>
      );
    }
    return this.props.children;
  }
}
