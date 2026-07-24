import { useCallback, useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'theme';

const readInitial = (): Theme => {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
};

const applyTheme = (theme: Theme) => {
  const root = document.documentElement;
  if (theme === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* localStorage disabled — silently no-op */
  }
};

// ── Module-level store: one shared theme value for every useTheme() call.
// Previously each call held its own useState copy, so the .dark class flipped
// globally but a sibling consumer's Sun/Moon icon + label stayed stale until
// its own next render. A module-level value + subscriber set fixes that: one
// toggle notifies every mounted consumer.
let currentTheme: Theme = readInitial();
const listeners = new Set<() => void>();

// Mirrors the original per-instance mount effect (sync DOM class +
// localStorage with the resolved initial theme) — now runs once for the
// whole module instead of once per mounted consumer.
if (typeof document !== 'undefined') {
  applyTheme(currentTheme);
}

const setThemeInternal = (theme: Theme) => {
  if (theme === currentTheme) return;
  currentTheme = theme;
  applyTheme(theme);
  listeners.forEach((listener) => listener());
};

const subscribe = (onStoreChange: () => void) => {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
};

// Theme is a string primitive, so handing back the module variable is
// already a stable reference when unchanged — required by
// useSyncExternalStore to avoid a re-render loop.
const getSnapshot = (): Theme => currentTheme;

// Prerender (SSR) has no document/localStorage; useSyncExternalStore requires
// an explicit server snapshot. Mirror readInitial()'s server branch ('dark')
// so prerendered markup matches the module's server-side initial state — the
// client corrects to the real theme on hydration (index.html boots the class
// before React mounts, so colors never flash).
const getServerSnapshot = (): Theme => 'dark';

// Cross-tab sync: another tab flipped the theme -> reflect it here too.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (
      e.key === STORAGE_KEY &&
      (e.newValue === 'light' || e.newValue === 'dark')
    ) {
      setThemeInternal(e.newValue);
    }
  });
}

/**
 * Single source of truth for the theme, shared across every consumer via a
 * module-level store. The inline boot script in `index.html` paints the
 * correct class before React mounts to avoid FOUC; this hook just reflects
 * that initial state and offers a setter.
 */
export const useTheme = () => {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setTheme = useCallback((value: Theme | ((prev: Theme) => Theme)) => {
    setThemeInternal(
      typeof value === 'function'
        ? (value as (prev: Theme) => Theme)(currentTheme)
        : value,
    );
  }, []);

  const toggle = useCallback(() => {
    setThemeInternal(currentTheme === 'dark' ? 'light' : 'dark');
  }, []);

  return { theme, setTheme, toggle };
};
