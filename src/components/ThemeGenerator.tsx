import { hsv, parseHex, formatHex } from "culori";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  type ThemeMode,
  type ThemeRole,
  type PaletteStyle,
  type PaletteTuning,
  type ThemePalette,
  DEFAULT_TUNING,
  PALETTE_STYLES,
} from "../palette";
import { useCopy } from "../useCopy";
import ColorInput from "./ColorInput";
import ColorWheel from "./ColorWheel";
import ThemePreview from "./ThemePreview";
import ImagePalette from "./ImagePalette";
import { useLocale, type MessageKey } from "../i18n";
import { designTokensJson, tailwindConfig } from "../paletteExport";
import {
  CssIcon,
  JsonIcon,
  TailwindIcon,
  SaveIcon,
  PanelLeftOpenIcon,
  PanelLeftCloseIcon,
} from "./Icons";
import { HARMONY_MODES, type HarmonyMode } from "../harmony";
interface RoleGridProps {
  title: string;
  roles: ThemeRole[];
  copied: string | null;
  onCopy: (hex: string, key: string) => void;
}

function RoleGrid({ title, roles, copied, onCopy }: RoleGridProps) {
  const { t } = useLocale();
  return (
    <div className="rounded-lg p-2">
      <h2 className="text-ink-muted mb-2 text-xs">{title}</h2>
      <div
        className={
          roles.length === 28 ? "token-grid" : "grid grid-cols-5 gap-2"
        }
      >
        {roles.map((role) => {
          const key = `${title}:${role.name}`;
          const label = `${role.name} · ${role.hex} · ${copied === key ? t("copied") : t("copyHex", { hex: role.hex })}`;
          return (
            <button
              key={role.name}
              type="button"
              onClick={() => onCopy(role.hex, key)}
              aria-label={label}
              data-tooltip={label}
              className="swatch-button rounded-lg"
              style={{ backgroundColor: role.hex }}
            />
          );
        })}
      </div>
    </div>
  );
}
const TABS = [
  "preview",
  "tuning",
  "tokens",
  "palettes",
  "image",
  "library",
] as const;
type Tab = (typeof TABS)[number];
const TAB_LABELS = {
  tuning: "tuningTab",
  preview: "previewTab",
  tokens: "colorSwatches",
  palettes: "morePalettes",
  library: "libraryTab",
  image: "imageTab",
} as const;

interface Props {
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
  extras?: ReactNode;
}
export default function ThemeGenerator({
  theme,
  settings,
  onSave,
  seed,
  accent,
  harmony,
  onAnchorChange,
  onHarmonyChange,
  style,
  onStyleChange,
  tuning,
  onTuningChange,
  palette,
  actions,
  library,
  extras,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<Tab>("preview");
  const [saveStatus, setSaveStatus] = useState<"" | "saved" | "error">("");
  const saveTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(saveTimer.current), []);
  const tabButtons = useRef<Array<HTMLButtonElement | null>>([]);
  useEffect(() => {
    window.workspace?.setExpanded(expanded);
  }, [expanded]);
  const { copied, copy, error } = useCopy();
  const { t } = useLocale();
  return (
    <main
      className={`workspace ${expanded ? "workspace-expanded" : "workspace-collapsed"} ${expanded && ["preview", "tuning", "image"].includes(tab) ? "workspace-aligned" : ""}`}
    >
      <aside className="controls-pane">
        <header className="panel-toolbar" aria-label={t("appTitle")}>
          <div className="toolbar-left">
            {actions}
            <select
              className="compact-select toolbar-style"
              aria-label={t("style")}
              value={style}
              onChange={(event) =>
                onStyleChange(event.target.value as PaletteStyle)
              }
            >
              {PALETTE_STYLES.map((value) => (
                <option key={value} value={value}>
                  {t(
                    `style${value[0].toUpperCase()}${value.slice(1)}` as MessageKey,
                  )}
                </option>
              ))}
            </select>
          </div>
          <div className="toolbar-right">
            {settings}
            <button
              className="icon-button"
              type="button"
              aria-label={t(expanded ? "collapseLayout" : "expandLayout")}
              data-tooltip={t(expanded ? "collapseLayout" : "expandLayout")}
              aria-expanded={expanded}
              aria-controls="workspace-tools"
              onClick={() => {
                if (!expanded) setTab("preview");
                setExpanded(!expanded);
              }}
            >
              {expanded ? <PanelLeftCloseIcon /> : <PanelLeftOpenIcon />}
            </button>
          </div>
        </header>
        <div className="grid grid-cols-2 gap-2">
          {[seed, accent].map((value, index) => (
            <div key={index}>
              <label className="mb-1 block text-xs font-medium">
                {t(index === 0 ? "colorOne" : "colorTwo")}
              </label>
              <ColorInput
                label={t(index === 0 ? "colorOne" : "colorTwo")}
                value={value}
                onChange={(hex) => onAnchorChange(index as 0 | 1, hex)}
              />
            </div>
          ))}
        </div>
        <label className="mt-3 flex items-center justify-between gap-2 text-xs">
          <span className="text-ink-muted">{t("harmony")}</span>
          <select
            className="compact-select"
            value={harmony}
            onChange={(event) =>
              onHarmonyChange(event.target.value as HarmonyMode)
            }
          >
            {HARMONY_MODES.map((value) => (
              <option key={value} value={value}>
                {t(value)}
              </option>
            ))}
          </select>
        </label>
        {palette ? (
          <ColorWheel
            seed={seed}
            accent={accent}
            mode={harmony}
            onChange={onAnchorChange}
          />
        ) : (
          <p className="text-danger my-4 text-xs" role="status">
            {t("invalidHex", { value: seed + " / " + accent })}
          </p>
        )}
        <footer className="output-toolbar" aria-label={t("outputs")}>
          <div className="output-actions">
            {(
            [
              [
                "json",
                "copyJson",
                JsonIcon,
                () =>
                  palette &&
                  designTokensJson(palette, style, tuning, {
                    mode: harmony,
                    accent,
                  }),
              ],
              ["css", "copyCss", CssIcon, () => palette?.css],
              [
                "tailwind",
                "copyTailwind",
                TailwindIcon,
                () => palette && tailwindConfig(palette),
              ],
            ] as const
            ).map(([key, label, Icon, content]) => (
            <button
              key={key}
              className="icon-button"
              type="button"
              disabled={!palette}
              aria-label={t(label)}
              data-feedback={copied === key || undefined}
              data-tooltip={
                error === key
                  ? t("copyFailed")
                  : copied === key
                    ? t("copied")
                    : t(label)
              }
              onClick={() => {
                const value = content();
                if (value) copy(value, key);
              }}
            >
              <Icon />
            </button>
            ))}
          </div>
          <button
            className="icon-button"
            type="button"
            disabled={!palette}
            aria-label={t("savePalette")}
            data-feedback={saveStatus === "saved" || undefined}
            data-tooltip={
              saveStatus === "saved"
                ? t("saved")
                : saveStatus === "error"
                  ? t("storageError")
                  : t("savePalette")
            }
            onClick={() => {
              window.clearTimeout(saveTimer.current);
              const saved = onSave();
              setSaveStatus(saved ? "saved" : "error");
              if (saved)
                saveTimer.current = window.setTimeout(
                  () => setSaveStatus(""),
                  1600,
                );
            }}
          >
            <SaveIcon />
          </button>
        </footer>
        <p role="status" className="sr-only">
          {error
            ? t("copyFailed")
            : copied
              ? t("copied")
              : saveStatus === "saved"
                ? t("saved")
                : saveStatus === "error"
                  ? t("storageError")
                  : ""}
        </p>
      </aside>
      <section
        id="workspace-tools"
        className="tools-pane"
        hidden={!expanded}
        aria-label={t("workspaceTools")}
      >
        <div
          role="tablist"
          aria-label={t("workspaceTools")}
          className="workspace-tabs"
        >
          {TABS.map((value, index) => (
            <button
              key={value}
              ref={(node) => {
                tabButtons.current[index] = node;
              }}
              type="button"
              role="tab"
              id={`tab-${value}`}
              aria-controls={`panel-${value}`}
              aria-selected={tab === value}
              tabIndex={tab === value ? 0 : -1}
              onClick={() => setTab(value)}
              onKeyDown={(event) => {
                let next = index;
                if (event.key === "ArrowRight")
                  next = (index + 1) % TABS.length;
                else if (event.key === "ArrowLeft")
                  next = (index + TABS.length - 1) % TABS.length;
                else if (event.key === "Home") next = 0;
                else if (event.key === "End") next = TABS.length - 1;
                else return;
                event.preventDefault();
                setTab(TABS[next]);
                tabButtons.current[next]?.focus();
              }}
            >
              {t(TAB_LABELS[value])}
            </button>
          ))}
        </div>
        <div
          role="tabpanel"
          id="panel-tuning"
          aria-labelledby="tab-tuning"
          tabIndex={0}
          hidden={tab !== "tuning"}
        >
          {" "}
          <div className="tuning-pane p-3">
            {[seed, accent].map((hex, index) => {
              const color = hsv(parseHex(hex));
              return (
                color && (
                  <label key={index} className="text-ink-muted block text-xs">
                    {t(index === 0 ? "colorOne" : "colorTwo")} ·{" "}
                    {t("brightness")}
                    <input
                      className="accent-primary mt-1 block w-full"
                      type="range"
                      min="0.01"
                      max="1"
                      step="0.01"
                      value={color.v}
                      onChange={(event) =>
                        onAnchorChange(
                          index as 0 | 1,
                          formatHex({
                            ...color,
                            v: Number(event.target.value),
                          }),
                        )
                      }
                    />
                  </label>
                )
              );
            })}
            {(
              [
                ["hueShift", "tuneHue", -30, 30, 1, "°"],
                ["lightnessShift", "tuneLightness", -0.1, 0.1, 0.01, ""],
                ["chromaScale", "tuneChroma", 0.5, 1.5, 0.05, "×"],
              ] as const
            ).map(([field, label, min, max, step, unit]) => (
              <label key={field} className="text-ink-muted block text-xs">
                <span className="flex justify-between">
                  <span>{t(label)}</span>
                  <output className="text-ink font-mono">
                    {field === "lightnessShift"
                      ? tuning[field].toFixed(2)
                      : tuning[field]}
                    {unit}
                  </output>
                </span>
                <input
                  className="accent-primary mt-1 w-full"
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={tuning[field]}
                  onChange={(event) =>
                    onTuningChange({
                      ...tuning,
                      [field]: Number(event.target.value),
                    })
                  }
                />
              </label>
            ))}
            <p className="text-ink-muted text-[11px] leading-relaxed">
              {t("tuningHint")}
            </p>
            {palette && (
              <RoleGrid
                title={t("adjustedColors")}
                roles={palette[theme].filter((role) =>
                  [
                    "primary",
                    "accent",
                    "background",
                    "surface",
                    "ink",
                  ].includes(role.name),
                )}
                copied={copied}
                onCopy={copy}
              />
            )}
            <button
              type="button"
              className="quiet-button tuning-reset"
              disabled={
                JSON.stringify(tuning) === JSON.stringify(DEFAULT_TUNING)
              }
              onClick={() => onTuningChange({ ...DEFAULT_TUNING })}
            >
              {t("resetTuning")}
            </button>
          </div>
        </div>
        <div
          role="tabpanel"
          id="panel-preview"
          aria-labelledby="tab-preview"
          tabIndex={0}
          hidden={tab !== "preview"}
        >
          {palette && <ThemePreview palette={palette} theme={theme} />}
        </div>
        <div
          role="tabpanel"
          id="panel-tokens"
          aria-labelledby="tab-tokens"
          tabIndex={0}
          hidden={tab !== "tokens"}
        >
          {palette && (
            <RoleGrid
              title={t(theme === "light" ? "lightPalette" : "darkPalette")}
              roles={palette[theme]}
              copied={copied}
              onCopy={copy}
            />
          )}
        </div>
        <div
          role="tabpanel"
          id="panel-palettes"
          aria-labelledby="tab-palettes"
          tabIndex={0}
          hidden={tab !== "palettes"}
        >
          {extras}
        </div>
        <div
          role="tabpanel"
          id="panel-image"
          aria-labelledby="tab-image"
          tabIndex={0}
          hidden={tab !== "image"}
        >
          <ImagePalette onApply={onAnchorChange} />
        </div>
        <div
          role="tabpanel"
          id="panel-library"
          aria-labelledby="tab-library"
          tabIndex={0}
          hidden={tab !== "library"}
        >
          {library}
        </div>
      </section>
    </main>
  );
}
