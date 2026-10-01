import { useState, useMemo, useEffect, useCallback } from "react";
import { generateAll } from "./colors";
import { useTheme } from "./useTheme";
import { useAppPalette } from "./useAppPalette";
import { EyedropperIcon, MoonIcon, SunIcon } from "./components/Icons";
import PaletteSection from "./components/PaletteSection";
import ThemeGenerator from "./components/ThemeGenerator";
import PaletteLibrary from "./components/PaletteLibrary";
import "./electron.d.ts";
import { useLocale } from "./i18n";
import {
  DEFAULT_TUNING,
  generateThemePalette,
  type PaletteStyle,
  type PaletteTuning,
  type ThemePalette,
} from "./palette";
import {
  createSnapshot,
  loadLibrary,
  mergeLibraries,
  restoreSnapshot,
  saveLibrary,
  type SavedPaletteSnapshot,
} from "./savedPalettes";

import { linkedAnchors, pairedColor, type HarmonyMode } from "./harmony";

const TITLE_LABELS = [
  "50",
  "100",
  "200",
  "300",
  "400",
  "500",
  "600",
  "700",
  "800",
  "950",
];
export default function App() {
  const [hex, setHex] = useState("#764646");
  const [saved, setSaved] = useState<SavedPaletteSnapshot[]>(loadLibrary);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [accent, setAccent] = useState(() =>
    pairedColor("#764646", "complementary"),
  );
  const [harmony, setHarmony] = useState<HarmonyMode>("complementary");
  const [loadedPalette, setLoadedPalette] = useState<ThemePalette | null>(null);
  const [picking, setPicking] = useState(false);
  const [style, setStyle] = useState<PaletteStyle>("balanced");
  const [tuning, setTuning] = useState<PaletteTuning>({ ...DEFAULT_TUNING });
  const { theme, toggle } = useTheme();
  const { locale, setLocale, t } = useLocale();
  const handleSeedChange = useCallback(
    (value: string) => {
      setHex(value);
      setLoadedPalette(null);
      setActiveId(null);
      setAccent(pairedColor(value, harmony));
    },
    [harmony],
  );

  useEffect(() => {
    const api = window.colorPicker;
    if (!api) return;
    return api.onDone(({ hex }) => {
      setPicking(false);
      if (hex) handleSeedChange(hex);
    });
  }, [handleSeedChange]);

  const handlePick = useCallback(() => {
    if (!window.colorPicker) return;
    window.colorPicker.start(locale);
    setPicking(true);
  }, [locale]);

  const schemes = useMemo(() => generateAll(hex), [hex]);
  const isValid = schemes !== null;
  const palette = useMemo(
    () => loadedPalette ?? generateThemePalette(hex, style, tuning, accent),
    [hex, accent, style, tuning, loadedPalette],
  );

  useAppPalette(palette, theme);

  function handleAnchorChange(anchor: 0 | 1, value: string) {
    const [nextSeed, nextAccent] = linkedAnchors(
      hex,
      accent,
      anchor,
      value,
      harmony,
    );
    setHex(anchor === 0 ? value : nextSeed);
    setAccent(anchor === 1 ? value : nextAccent);
    setLoadedPalette(null);
    setActiveId(null);
  }
  function handleHarmonyChange(value: HarmonyMode) {
    setHarmony(value);
    setAccent(pairedColor(hex, value));
    setLoadedPalette(null);
    setActiveId(null);
  }
  function handleStyleChange(value: PaletteStyle) {
    setStyle(value);
    setLoadedPalette(null);
    setActiveId(null);
  }
  function handleTuningChange(value: PaletteTuning) {
    setTuning(value);
    setLoadedPalette(null);
    setActiveId(null);
  }
  function handleSave() {
    if (!palette) return false;
    const existing = saved.find((item) => item.id === activeId);
    const entry = {
      ...createSnapshot(
        existing?.id ?? crypto.randomUUID(),
        existing?.name ?? "",
        existing?.note ?? "",
        style,
        tuning,
        palette,
        existing?.createdAt,
      ),
      wheel: { mode: harmony, accent },
    };
    const next = mergeLibraries(saved, [entry]);
    if (!saveLibrary(next)) return false;
    setSaved(next);
    setActiveId(entry.id);
    return true;
  }
  function handleLoad(snapshot: SavedPaletteSnapshot) {
    const restored = restoreSnapshot(snapshot);
    if (!restored) return;
    setHex(snapshot.seed);
    setStyle(snapshot.style);
    setTuning({ ...snapshot.tuning });
    setLoadedPalette(restored);
    setActiveId(snapshot.id);
    setHarmony(snapshot.wheel?.mode ?? "complementary");
    setAccent(
      snapshot.wheel?.accent ?? pairedColor(snapshot.seed, "complementary"),
    );
  }
  function handleDelete(id: string) {
    const next = saved.filter((item) => item.id !== id);
    if (!saveLibrary(next)) return false;
    setSaved(next);
    if (activeId === id) {
      setActiveId(null);
    }
    return true;
  }

  return (
    <div className="app-shell">
      <ThemeGenerator
        theme={theme}
        settings={
          <>
            {" "}
            <div
              className="border-line bg-surface-raised flex rounded-lg border p-0.5"
              aria-label={t("language")}
            >
              <button
                type="button"
                onClick={() => setLocale("en")}
                aria-pressed={locale === "en"}
                className={`rounded-md px-2 py-1 text-xs ${locale === "en" ? "bg-primary text-on-primary" : "text-ink-muted"}`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLocale("zh-TW")}
                aria-pressed={locale === "zh-TW"}
                className={`rounded-md px-2 py-1 text-xs ${locale === "zh-TW" ? "bg-primary text-on-primary" : "text-ink-muted"}`}
              >
                繁
              </button>
            </div>
            <button
              type="button"
              onClick={toggle}
              className="icon-button"
              data-tooltip={t(
                theme === "dark" ? "switchToLight" : "switchToDark",
              )}
              aria-label={t(
                theme === "dark" ? "switchToLight" : "switchToDark",
              )}
            >
              {theme === "dark" ? <SunIcon /> : <MoonIcon />}
            </button>
          </>
        }
        onSave={handleSave}
        seed={hex}
        accent={accent}
        harmony={harmony}
        onAnchorChange={handleAnchorChange}
        onHarmonyChange={handleHarmonyChange}
        style={style}
        onStyleChange={handleStyleChange}
        tuning={tuning}
        onTuningChange={handleTuningChange}
        palette={palette}
        library={
          <PaletteLibrary
            saved={saved}
            activeId={activeId}
            onLoad={handleLoad}
            onDelete={handleDelete}
          />
        }
        extras={
          isValid && (
            <div className="space-y-2 rounded-lg p-2">
              <PaletteSection
                title={t("scale")}
                colors={schemes.scale}
                labels={TITLE_LABELS}
              />
              <PaletteSection
                title={t("analogous")}
                colors={schemes.analogous}
              />
              <PaletteSection
                title={t("monochromatic")}
                colors={schemes.monochromatic}
              />
              <PaletteSection title={t("shades")} colors={schemes.shades} />
            </div>
          )
        }
        actions={
          <>
            {window.colorPicker && (
              <button
                type="button"
                onClick={handlePick}
                className="icon-button"
                aria-label={t("eyedropper")}
                disabled={picking}
                data-tooltip={t("eyedropper")}
                title={t("eyedropper")}
              >
                <EyedropperIcon />
              </button>
            )}
          </>
        }
      />

      {picking && <p className="text-accent mt-2 text-xs">{t("picking")}</p>}
    </div>
  );
}
