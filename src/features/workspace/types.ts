import type { ReactNode } from "react";
import type {
  ThemeMode,
  PaletteStyle,
  PaletteTuning,
  ThemePalette,
} from "../../color/palette";
import type { HarmonyMode } from "../../color/harmony";

// Editable palette data and app-level actions passed into the workspace.
export interface PaletteWorkspaceProps {
  theme: ThemeMode;
  settings: ReactNode;
  onSave: () => boolean;
  seed: string;
  accent: string;
  harmony: HarmonyMode;
  onAnchorChange: (anchor: 0 | 1, hex: string) => void;
  onHarmonyChange: (mode: HarmonyMode) => void;
  style: PaletteStyle;
  onStyleChange: (style: PaletteStyle) => void;
  tuning: PaletteTuning;
  onTuningChange: (tuning: PaletteTuning) => void;
  palette: ThemePalette | null;
  actions?: ReactNode;
  library?: ReactNode;
}
