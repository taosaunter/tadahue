export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "color-palette-theme";

export function themeFromMedia(prefersDark: boolean): Theme {
  return prefersDark ? "dark" : "light";
}

export function resolveTheme(
  stored: string | null,
  prefersDark: boolean,
): Theme {
  if (stored === "light" || stored === "dark") return stored;
  return themeFromMedia(prefersDark);
}

export function getStoredTheme(): string | null {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function storeTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {}
}

export function systemPrefersDark(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}
