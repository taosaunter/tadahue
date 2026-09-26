import { useEffect, useMemo } from "react";
import { generateThemePalette, scopeVars, type PaletteStyle } from "./palette";
import type { Theme } from "./theme";

export function useAppPalette(
  seedHex: string,
  theme: Theme,
  style: PaletteStyle = "balanced",
) {
  const palette = useMemo(
    () => generateThemePalette(seedHex, style),
    [seedHex, style],
  );

  useEffect(() => {
    if (!palette) return;
    const root = document.documentElement;
    for (const [prop, value] of Object.entries(scopeVars(palette, theme))) {
      root.style.setProperty(prop, value);
    }
  }, [palette, theme]);
}
