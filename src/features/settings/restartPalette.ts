// One-time palette handoff across an Electron display-mode restart.
import {
  isSavedPalette,
  type SavedPaletteSnapshot,
} from "../library/savedPalettes.ts";

export const RESTART_PALETTE_KEY = "tadahue-restart-palette";
export function readRestartPalette(): {
  snapshot: SavedPaletteSnapshot;
  activeId: string | null;
} | null {
  try {
    const value = JSON.parse(
      localStorage.getItem(RESTART_PALETTE_KEY) ?? "null",
    );
    return value &&
      isSavedPalette(value.snapshot) &&
      (value.activeId === null || typeof value.activeId === "string")
      ? value
      : null;
  } catch {
    return null;
  }
}
export function rememberRestartPalette(
  snapshot: SavedPaletteSnapshot,
  activeId: string | null,
): boolean {
  try {
    localStorage.setItem(
      RESTART_PALETTE_KEY,
      JSON.stringify({ snapshot, activeId }),
    );
    return true;
  } catch {
    return false;
  }
}
