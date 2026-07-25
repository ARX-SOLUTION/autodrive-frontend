import * as React from 'react';

const MOBILE_BREAKPOINT = 768;

// Textbook useSyncExternalStore migration off a matchMedia-mirroring
// useState+useEffect (react-hooks/set-state-in-effect) -- same pattern as
// src/hooks/useTheme.ts. getServerSnapshot matches the old hook's
// pre-effect initial value (`!!undefined` = false) so the SSR prerender and
// the client's first paint agree.
const subscribe = (onStoreChange: () => void) => {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
  mql.addEventListener('change', onStoreChange);
  return () => mql.removeEventListener('change', onStoreChange);
};

const getSnapshot = () => window.innerWidth < MOBILE_BREAKPOINT;

const getServerSnapshot = () => false;

export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
