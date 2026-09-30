import { useEffect } from "react";
import { scopeVars, type ThemePalette } from "./palette";
import type { Theme } from "./theme";

export function useAppPalette(
  palette: ThemePalette | null,
  theme: Theme,
) {
  useEffect(() => {
    if (!palette) return;
    const root = document.documentElement;
    for (const [prop, value] of Object.entries(scopeVars(palette, theme))) {
      root.style.setProperty(prop, value);
    }
  }, [palette, theme]);
}
