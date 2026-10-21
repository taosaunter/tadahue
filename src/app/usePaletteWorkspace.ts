import { useCallback, useEffect, useMemo, useState } from 'react'
import { type HarmonyMode, linkedAnchors, pairedColor } from '../color/harmony'
import {
  DEFAULT_TUNING,
  generateThemePalette,
  type PaletteStyle,
  type PaletteTuning,
  type ThemePalette,
} from '../color/palette'
import {
  createSnapshot,
  loadLibrary,
  mergeLibraries,
  restoreSnapshot,
  type SavedPaletteSnapshot,
  saveLibrary,
} from '../features/library/savedPalettes'
import {
  RESTART_PALETTE_KEY,
  readRestartPalette,
  rememberRestartPalette,
} from '../features/settings/restartPalette'

// Own palette edits, exact saved snapshots, and restart recovery in one place.
// Storage keys and snapshot versions are deliberately unchanged during UI refactors.
export function usePaletteWorkspace() {
  const [restartDraft] = useState(readRestartPalette)
  const [hex, setHex] = useState(
    restartDraft?.snapshot.background ??
      restartDraft?.snapshot.seed ??
      '#386957',
  )
  const [backgroundEnabled, setBackgroundEnabled] = useState(
    !!restartDraft?.snapshot.background,
  )
  const [saved, setSaved] = useState<SavedPaletteSnapshot[]>(loadLibrary)
  const [activeId, setActiveId] = useState<string | null>(
    restartDraft?.activeId ?? null,
  )
  const [accent, setAccent] = useState(
    () =>
      restartDraft?.snapshot.wheel?.accent ??
      pairedColor('#386957', 'complementary'),
  )
  const [harmony, setHarmony] = useState<HarmonyMode>(
    restartDraft?.snapshot.wheel?.mode ?? 'complementary',
  )
  const [loadedPalette, setLoadedPalette] = useState<ThemePalette | null>(() =>
    restartDraft ? restoreSnapshot(restartDraft.snapshot) : null,
  )
  const [style, setStyle] = useState<PaletteStyle>(
    restartDraft?.snapshot.style ?? 'balanced',
  )
  const [tuning, setTuning] = useState<PaletteTuning>({
    ...(restartDraft?.snapshot.tuning ?? DEFAULT_TUNING),
  })
  useEffect(() => {
    try {
      localStorage.removeItem(RESTART_PALETTE_KEY)
    } catch {
      /* Storage may be unavailable. */
    }
  }, [])
  const handleSeedChange = useCallback(
    (value: string) => {
      setHex(value)
      setLoadedPalette(null)
      setActiveId(null)
      setAccent(pairedColor(value, harmony))
    },
    [harmony],
  )

  const palette = useMemo(
    () =>
      loadedPalette ??
      generateThemePalette(
        hex,
        style,
        tuning,
        accent,
        backgroundEnabled ? hex : undefined,
      ),
    [hex, accent, style, tuning, loadedPalette, backgroundEnabled],
  )

  // Incomplete HEX edits retain the last valid visual result, never export it.
  const [preview, setPreview] = useState({ palette, accent, harmony })
  if (palette && preview.palette !== palette)
    setPreview({ palette, accent, harmony })

  function handleBackgroundEnabledChange(value: boolean) {
    setBackgroundEnabled(value)
    setLoadedPalette(null)
    setActiveId(null)
  }
  function handleAnchorChange(anchor: 0 | 1, value: string) {
    const [nextSeed, nextAccent] = linkedAnchors(
      hex,
      accent,
      anchor,
      value,
      harmony,
    )
    setHex(anchor === 0 ? value : backgroundEnabled ? hex : nextSeed)
    setAccent(anchor === 1 ? value : nextAccent)
    setLoadedPalette(null)
    setActiveId(null)
  }
  function handleHarmonyChange(value: HarmonyMode) {
    setHarmony(value)
    setAccent(pairedColor(hex, value))
    setLoadedPalette(null)
    setActiveId(null)
  }
  function handleStyleChange(value: PaletteStyle) {
    setStyle(value)
    setLoadedPalette(null)
    setActiveId(null)
  }
  function handleTuningChange(value: PaletteTuning) {
    setTuning(value)
    setLoadedPalette(null)
    setActiveId(null)
  }
  function handleSave() {
    if (!palette) return false
    const existing = saved.find((item) => item.id === activeId)
    const entry = {
      ...createSnapshot(
        existing?.id ?? crypto.randomUUID(),
        existing?.name ?? '',
        existing?.note ?? '',
        style,
        tuning,
        palette,
        existing?.createdAt,
      ),
      wheel: { mode: harmony, accent },
    }
    const next = mergeLibraries(saved, [entry])
    if (!saveLibrary(next)) return false
    setSaved(next)
    setActiveId(entry.id)
    return true
  }
  function handleLoad(snapshot: SavedPaletteSnapshot) {
    const restored = restoreSnapshot(snapshot)
    if (!restored) return
    setHex(snapshot.background ?? snapshot.seed)
    setBackgroundEnabled(!!snapshot.background)
    setStyle(snapshot.style)
    setTuning({ ...snapshot.tuning })
    setLoadedPalette(restored)
    setActiveId(snapshot.id)
    setHarmony(snapshot.wheel?.mode ?? 'complementary')
    setAccent(
      snapshot.wheel?.accent ?? pairedColor(snapshot.seed, 'complementary'),
    )
  }
  function handleDelete(id: string) {
    const next = saved.filter((item) => item.id !== id)
    if (!saveLibrary(next)) return false
    setSaved(next)
    if (activeId === id) {
      setActiveId(null)
    }
    return true
  }

  function rememberForRestart() {
    if (!palette) return false
    return rememberRestartPalette(
      {
        ...createSnapshot(
          'restart',
          'Restart draft',
          '',
          style,
          tuning,
          palette,
        ),
        wheel: { mode: harmony, accent },
      },
      activeId,
    )
  }

  return {
    editor: {
      seed: hex,
      backgroundEnabled,
      onBackgroundEnabledChange: handleBackgroundEnabledChange,
      accent,
      harmony,
      style,
      tuning,
      palette,
      preview,
      onAnchorChange: handleAnchorChange,
      onHarmonyChange: handleHarmonyChange,
      onStyleChange: handleStyleChange,
      onTuningChange: handleTuningChange,
      onSave: handleSave,
    },
    saved,
    activeId,
    load: handleLoad,
    remove: handleDelete,
    changeSeed: handleSeedChange,
    rememberForRestart,
  }
}
