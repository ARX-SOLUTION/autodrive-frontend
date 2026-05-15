import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "theme";

const readInitial = (): Theme => {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
};

const applyTheme = (theme: Theme) => {
  const root = document.documentElement;
  if (theme === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* localStorage disabled — silently no-op */
  }
};

/**
 * Single source of truth for the theme. The inline boot script in `index.html`
 * paints the correct class before React mounts to avoid FOUC; this hook just
 * reflects that initial state and offers a setter.
 */
export const useTheme = () => {
  const [theme, setTheme] = useState<Theme>(readInitial);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  return { theme, setTheme, toggle };
};
