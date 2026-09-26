import { useCallback, useEffect, useState } from "react";
import {
  getStoredTheme,
  resolveTheme,
  storeTheme,
  systemPrefersDark,
  themeFromMedia,
  type Theme,
} from "./theme";

const QUERY = "(prefers-color-scheme: dark)";

export function useTheme() {
  const [stored, setStored] = useState<string | null>(getStoredTheme);
  const [systemTheme, setSystemTheme] = useState<Theme>(() =>
    themeFromMedia(systemPrefersDark()),
  );

  useEffect(() => {
    const media = window.matchMedia(QUERY);
    const sync = () => setSystemTheme(themeFromMedia(media.matches));
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const isManual = stored === "light" || stored === "dark";
  const theme = resolveTheme(stored, systemTheme === "dark");

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.classList.toggle("light", theme === "light");
    root.style.colorScheme = theme;
  }, [theme]);

  const toggle = useCallback(() => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    storeTheme(next);
    setStored(next);
  }, [theme]);

  return { theme, toggle, isManual };
}
