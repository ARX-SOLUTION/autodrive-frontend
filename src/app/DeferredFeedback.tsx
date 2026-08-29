import { lazy, Suspense, useEffect, useState } from 'react';

const Toaster = lazy(() =>
  import('@/components/ui/sonner').then((module) => ({
    default: module.Toaster,
  })),
);

const OfflineBanner = lazy(() =>
  import('@/components/layout/OfflineBanner').then((module) => ({
    default: module.OfflineBanner,
  })),
);

export const DeferredFeedback = () => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const idleWindow = window as unknown as {
      requestIdleCallback?: Window['requestIdleCallback'];
      cancelIdleCallback?: Window['cancelIdleCallback'];
      setTimeout: Window['setTimeout'];
      clearTimeout: Window['clearTimeout'];
    };

    if (idleWindow.requestIdleCallback && idleWindow.cancelIdleCallback) {
      const idleId = idleWindow.requestIdleCallback(() => setReady(true), {
        timeout: 1_500,
      });

      return () => idleWindow.cancelIdleCallback?.(idleId);
    }

    const timeoutId = idleWindow.setTimeout(() => setReady(true), 0);

    return () => idleWindow.clearTimeout(timeoutId);
  }, []);

  if (!ready) return null;

  return (
    <Suspense fallback={null}>
      <Toaster />
      <OfflineBanner />
    </Suspense>
  );
};
