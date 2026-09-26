import { useState, useMemo, useEffect, useCallback } from "react";
import { generateAll, isHexColor } from "./colors";
import { useTheme } from "./useTheme";
import { useAppPalette } from "./useAppPalette";
import { EyedropperIcon, MoonIcon, SunIcon } from "./components/Icons";
import PaletteSection from "./components/PaletteSection";
import ThemeGenerator from "./components/ThemeGenerator";
import "./electron.d.ts";
import { useLocale } from "./i18n";
import type { PaletteStyle } from "./palette";

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
const STORAGE_KEY = "color-palette-history";

interface SavedPalette {
  id: string;
  hex: string;
  savedAt: number;
}

function loadHistory(): SavedPalette[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) &&
      parsed.every(
        (p) =>
          p &&
          typeof p.id === "string" &&
          isHexColor(p.hex) &&
          typeof p.savedAt === "number",
      )
      ? parsed
      : [];
  } catch {
    return [];
  }
}

function saveHistory(palettes: SavedPalette[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(palettes));
  } catch {}
}

export default function App() {
  const [hex, setHex] = useState("#764646");
  const [saved, setSaved] = useState<SavedPalette[]>(() => loadHistory());
  const [justSaved, setJustSaved] = useState(false);
  const [picking, setPicking] = useState(false);
  const [style, setStyle] = useState<PaletteStyle>("balanced");
  const { theme, toggle, isManual } = useTheme();
  const { locale, setLocale, t } = useLocale();

  useEffect(() => {
    const api = window.colorPicker;
    if (!api) return;
    api.onDone(({ hex }) => {
      setPicking(false);
      if (hex) setHex(hex);
    });
  }, []);

  const handlePick = useCallback(() => {
    if (!window.colorPicker) return;
    window.colorPicker.start(locale);
    setPicking(true);
  }, [locale]);

  useEffect(() => {
    saveHistory(saved);
  }, [saved]);

  const schemes = useMemo(() => generateAll(hex), [hex]);
  const isValid = schemes !== null;

  useAppPalette(hex, theme, style);

  const handleSave = useCallback(() => {
    const h = hex.toUpperCase();
    if (saved.some((p) => p.hex === h)) return; // already saved
    const entry: SavedPalette = {
      id: `${h}-${Date.now()}`,
      hex: h,
      savedAt: Date.now(),
    };
    setSaved((prev) => [entry, ...prev].slice(0, 20)); // keep last 20
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1500);
  }, [hex, saved]);

  const handleLoad = useCallback((h: string) => {
    setHex(h);
  }, []);

  const handleDelete = useCallback((id: string) => {
    setSaved((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-ink">{t("appTitle")}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div
            className="flex rounded-lg border border-line bg-surface-raised p-0.5"
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
              繁中
            </button>
          </div>
          <button
            type="button"
            onClick={toggle}
            aria-label={
              theme === "dark" ? t("switchToLight") : t("switchToDark")
            }
            title={isManual ? t("manualTheme") : t("followSystem")}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-line bg-surface-raised px-3 py-2
              text-xs text-ink-muted transition-colors hover:border-primary hover:text-ink active:scale-95"
          >
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
            {theme === "dark" ? t("light") : t("dark")}
          </button>
        </div>
      </header>

      {/* Saved palettes bar */}
      {saved.length > 0 && (
        <section className="my-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-ink-muted">
            {t("savedPalettes")}
          </h2>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {saved.map((p) => (
              <div key={p.id} className="group relative shrink-0">
                <button
                  type="button"
                  onClick={() => handleLoad(p.hex)}
                  className="relative block h-8 w-8 rounded-lg border border-line transition-transform hover:scale-110"
                  style={{ backgroundColor: p.hex }}
                  title={p.hex}
                >
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(p.id);
                    }}
                    className="absolute right-0 top-0 hidden h-3 w-3 cursor-pointer items-center justify-center
                      rounded-bl-md rounded-tr-lg bg-danger/90 text-[8px] text-on-danger group-hover:flex"
                  >
                    ×
                  </span>
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <ThemeGenerator
        seed={hex}
        onSeedChange={setHex}
        style={style}
        onStyleChange={setStyle}
        actions={
          <>
            {window.colorPicker && (
              <button
                type="button"
                onClick={handlePick}
                className="flex items-center gap-1.5 rounded-lg border border-line bg-surface-raised px-3 py-2
                  text-xs text-ink-muted transition-colors hover:border-primary hover:text-ink active:scale-95"
                title={t("eyedropper")}
              >
                <EyedropperIcon /> {t("eyedropper")}
              </button>
            )}
            {isValid && (
              <button
                type="button"
                onClick={handleSave}
                className={`rounded-lg border bg-surface-raised px-3 py-2 text-xs transition-colors active:scale-95 ${
                  justSaved
                    ? "border-success text-success"
                    : "border-line text-ink-muted hover:border-primary hover:text-ink"
                }`}
              >
                {justSaved ? t("saved") : t("savePalette")}
              </button>
            )}
          </>
        }
      />

      {picking && <p className="mt-2 text-xs text-accent">{t("picking")}</p>}

      {/* Color schemes */}
      {isValid && (
        <div className="space-y-6">
          <PaletteSection
            title={t("scale")}
            colors={schemes.scale}
            labels={TITLE_LABELS}
          />
          <PaletteSection title={t("analogous")} colors={schemes.analogous} />
          <PaletteSection
            title={t("monochromatic")}
            colors={schemes.monochromatic}
          />
          <PaletteSection
            title={t("complementary")}
            colors={schemes.complementary}
          />
          <PaletteSection
            title={t("splitComplementary")}
            colors={schemes.splitComplementary}
          />
          <PaletteSection title={t("triad")} colors={schemes.triad} />
          <PaletteSection title={t("shades")} colors={schemes.shades} />
        </div>
      )}
    </div>
  );
}
