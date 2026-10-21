import type { ReactNode } from 'react'
import type { HarmonyMode } from '../../color/harmony'
import type {
  PaletteStyle,
  PaletteTuning,
  ThemeMode,
  ThemePalette,
} from '../../color/palette'

// Editable palette data and app-level actions passed into the workspace.
export interface PaletteWorkspaceProps {
  view: 'edit' | 'preview' | 'library'
  onViewChange: (view: 'edit' | 'preview' | 'library') => void
  theme: ThemeMode
  settings: ReactNode
  onSave: () => boolean
  seed: string
  backgroundEnabled: boolean
  onBackgroundEnabledChange: (enabled: boolean) => void
  accent: string
  harmony: HarmonyMode
  onAnchorChange: (anchor: 0 | 1, hex: string) => void
  onHarmonyChange: (mode: HarmonyMode) => void
  style: PaletteStyle
  onStyleChange: (style: PaletteStyle) => void
  tuning: PaletteTuning
  onTuningChange: (tuning: PaletteTuning) => void
  palette: ThemePalette | null
  preview: {
    palette: ThemePalette | null
    accent: string
    harmony: HarmonyMode
  }
  actions?: ReactNode
  library?: ReactNode
}
