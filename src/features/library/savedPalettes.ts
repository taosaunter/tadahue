// Versioned local library: validation, legacy migration, exact token snapshots, and persistence.
import { isWheelSettings, type WheelSettings } from "../../color/harmony.ts";
import { isHexColor } from "../../color/colors.ts";
import {
  assembleThemePalette,
  DEFAULT_TUNING,
  generateThemePalette,
  isPaletteTuning,
  PALETTE_STYLES,
  type PaletteStyle,
  type PaletteTuning,
  type ThemeMode,
  type ThemePalette,
} from "../../color/palette.ts";

// Keep these keys stable so upgrades retain saved palettes and can migrate history.
export const LIBRARY_KEY = "color-palette-snapshots-v1";
export const LEGACY_KEY = "color-palette-history";
export const LIBRARY_LIMIT = 20;

export interface SavedPaletteSnapshot {
  wheel?: WheelSettings;
  version: 1;
  id: string;
  name: string;
  note: string;
  seed: string;
  style: PaletteStyle;
  tuning: PaletteTuning;
  light: Record<string, string>;
  dark: Record<string, string>;
  createdAt: number;
  updatedAt: number;
}

const values = (palette: ThemePalette, mode: ThemeMode) =>
  Object.fromEntries(palette[mode].map(({ name, hex }) => [name, hex]));

export function createSnapshot(
  id: string,
  name: string,
  note: string,
  style: PaletteStyle,
  tuning: PaletteTuning,
  palette: ThemePalette,
  createdAt: number = Date.now(),
  updatedAt: number = Date.now(),
): SavedPaletteSnapshot {
  return {
    version: 1,
    id,
    name: name.trim() || palette.seed,
    note: note.trim(),
    seed: palette.seed,
    style,
    tuning: { ...tuning },
    light: values(palette, "light"),
    dark: values(palette, "dark"),
    createdAt,
    updatedAt,
  };
}

export function isSavedPalette(value: unknown): value is SavedPaletteSnapshot {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<SavedPaletteSnapshot>;
  if (
    item.version !== 1 ||
    typeof item.id !== "string" ||
    !item.id ||
    typeof item.name !== "string" ||
    !item.name.trim() ||
    item.name.length > 80 ||
    typeof item.note !== "string" ||
    item.note.length > 500 ||
    typeof item.seed !== "string" ||
    !isHexColor(item.seed) ||
    !PALETTE_STYLES.includes(item.style as PaletteStyle) ||
    !isPaletteTuning(item.tuning) ||
    typeof item.createdAt !== "number" ||
    !Number.isFinite(item.createdAt) ||
    item.createdAt < 0 ||
    item.createdAt > 8.64e15 ||
    typeof item.updatedAt !== "number" ||
    !Number.isFinite(item.updatedAt) ||
    item.updatedAt < item.createdAt ||
    item.updatedAt > 8.64e15
  )
    return false;
  if (item.wheel !== undefined && !isWheelSettings(item.wheel)) return false;
  const expected = generateThemePalette(item.seed, item.style, item.tuning);
  if (!expected) return false;
  return (["light", "dark"] as const).every((mode) => {
    const stored = item[mode];
    if (!stored || typeof stored !== "object" || Array.isArray(stored))
      return false;
    const names = expected[mode].map(({ name }) => name);
    return (
      Object.keys(stored).length === names.length &&
      names.every(
        (name) => typeof stored[name] === "string" && isHexColor(stored[name]),
      )
    );
  });
}

export function restoreSnapshot(
  snapshot: SavedPaletteSnapshot,
): ThemePalette | null {
  if (!isSavedPalette(snapshot)) return null;
  const generated = generateThemePalette(
    snapshot.seed,
    snapshot.style,
    snapshot.tuning,
  );
  if (!generated) return null;
  const roles = (mode: ThemeMode) =>
    generated[mode].map((role) => ({
      ...role,
      hex: snapshot[mode][role.name],
    }));
  return assembleThemePalette(snapshot.seed, roles("light"), roles("dark"));
}

export function serializeLibrary(palettes: SavedPaletteSnapshot[]): string {
  return JSON.stringify({ version: 1, palettes }, null, 2);
}

export function parseLibrary(raw: string): SavedPaletteSnapshot[] {
  const data: unknown = JSON.parse(raw);
  if (!data || typeof data !== "object")
    throw new Error("Invalid palette library");
  const library = data as { version?: unknown; palettes?: unknown };
  if (
    library.version !== 1 ||
    !Array.isArray(library.palettes) ||
    library.palettes.length > LIBRARY_LIMIT ||
    !library.palettes.every(isSavedPalette)
  )
    throw new Error("Invalid palette library");
  const ids = library.palettes.map(
    (palette: SavedPaletteSnapshot) => palette.id,
  );
  if (new Set(ids).size !== ids.length)
    throw new Error("Duplicate palette IDs");
  return library.palettes;
}

export function migrateLegacyHistory(raw: string): SavedPaletteSnapshot[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.slice(0, LIBRARY_LIMIT).flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const legacy = entry as { id?: unknown; hex?: unknown; savedAt?: unknown };
    if (
      typeof legacy.id !== "string" ||
      typeof legacy.hex !== "string" ||
      !isHexColor(legacy.hex) ||
      typeof legacy.savedAt !== "number" ||
      !Number.isFinite(legacy.savedAt) ||
      legacy.savedAt < 0 ||
      legacy.savedAt > 8.64e15
    )
      return [];
    const palette = generateThemePalette(legacy.hex);
    return palette
      ? [
          createSnapshot(
            legacy.id,
            palette.seed,
            "",
            "balanced",
            DEFAULT_TUNING,
            palette,
            legacy.savedAt,
            legacy.savedAt,
          ),
        ]
      : [];
  });
}

export function loadLibrary(): SavedPaletteSnapshot[] {
  try {
    const current = localStorage.getItem(LIBRARY_KEY);
    if (current) {
      try {
        return parseLibrary(current);
      } catch {
        /* Try the older seed-only history. */
      }
    }
    return migrateLegacyHistory(localStorage.getItem(LEGACY_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function saveLibrary(palettes: SavedPaletteSnapshot[]): boolean {
  try {
    localStorage.setItem(LIBRARY_KEY, serializeLibrary(palettes));
    return true;
  } catch {
    return false;
  }
}

export function mergeLibraries(
  existing: SavedPaletteSnapshot[],
  incoming: SavedPaletteSnapshot[],
): SavedPaletteSnapshot[] {
  const merged = new Map(existing.map((palette) => [palette.id, palette]));
  for (const palette of incoming) merged.set(palette.id, palette);
  return [...merged.values()]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, LIBRARY_LIMIT);
}
