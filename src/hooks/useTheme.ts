import { useTheme as useNextTheme } from 'next-themes';

export type Theme = 'light' | 'dark';

/**
 * Thin wrapper over next-themes' useTheme(), narrowing its string/undefined
 * resolvedTheme down to this app's light/dark-only contract. resolvedTheme is
 * undefined with no ThemeProvider mounted (tests, the build-time SSR
 * prerender) or before next-themes reads localStorage — fall back to 'dark'
 * to match the provider's defaultTheme and the old hook's SSR snapshot.
 * The provider (mounted in App.tsx with attribute="class" + storageKey="theme")
 * now owns the DOM class + localStorage sync that this hook used to hand-roll.
 */
export const useTheme = () => {
  const { resolvedTheme, setTheme } = useNextTheme();
  const theme: Theme = resolvedTheme === 'light' ? 'light' : 'dark';

  const toggle = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  return { theme, toggle };
};
