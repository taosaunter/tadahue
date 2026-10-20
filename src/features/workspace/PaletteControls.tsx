import { useEffect, useRef, useState, type ReactNode } from "react";
import { PALETTE_STYLES } from "../../color/palette";
import { HARMONY_MODES, type HarmonyMode } from "../../color/harmony";
import type { PaletteStyle } from "../../color/palette";
import { designTokensJson, tailwindConfig } from "../../color/paletteExport";
import { useLocale, type MessageKey } from "../../app/i18n";
import { useCopy } from "../../shared/useCopy";
import {
  CssIcon,
  JsonIcon,
  TailwindIcon,
  SaveIcon,
} from "../../shared/Icons";
import ColorInput from "../palette/ColorInput";
import type { PaletteWorkspaceProps } from "./types";

type Props = Omit<PaletteWorkspaceProps, "theme" | "library"> & {
  children: ReactNode;
};

// Left pane: toolbar, persistent palette settings, editing tools, and exports.
// Spacing and alignment live in workspace.css; color editing lives in ../palette.
export default function PaletteControls({
  children,
  settings,
  actions,
  onSave,
  seed,
  backgroundEnabled,
  onBackgroundEnabledChange,
  accent,
  harmony,
  onAnchorChange,
  onHarmonyChange,
  style,
  onStyleChange,
  tuning,
  palette,
}: Props) {
  const { t } = useLocale();
  const { copied, copy, error } = useCopy();
  const [saveStatus, setSaveStatus] = useState<"" | "saved" | "error">("");
  const saveTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(saveTimer.current), []);
  return (
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
        <div className="toolbar-right">{settings}</div>
      </header>
      <section
        className="palette-settings"
        aria-labelledby="palette-settings-heading"
      >
        <h2 id="palette-settings-heading">{t("paletteSettings")}</h2>
        <div className="palette-inputs">
          <div className="settings-options">
            <label className="settings-field">
              <span>{t("generationMode")}</span>
              <select
                className="compact-select"
                value={backgroundEnabled ? "background" : "seed"}
                onChange={(event) =>
                  onBackgroundEnabledChange(event.target.value === "background")
                }
              >
                <option value="seed">{t("seedMode")}</option>
                <option value="background">{t("backgroundMode")}</option>
              </select>
            </label>
            <label className="settings-field">
              <span>{t("harmony")}</span>
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
          </div>
          <div className="settings-colors">
            {[seed, accent].map((value, index) => (
              <div key={index}>
                <span className="settings-label">
                  {t(index === 0 ? "colorOne" : "colorTwo")}
                </span>
                <ColorInput
                  label={t(index === 0 ? "colorOne" : "colorTwo")}
                  value={value}
                  onChange={(hex) => onAnchorChange(index as 0 | 1, hex)}
                />
              </div>
            ))}
          </div>
        </div>
      </section>
      <section
        className="palette-tools"
        id="palette-tools"
        aria-label={t("workspaceTools")}
      >
        {children}
      </section>
      {!palette && (
        <p className="text-danger my-2 text-xs" role="status">
          {t("invalidHex", {
            value: [
              seed,
              accent,
            ].join(" / "),
          })}
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
  );
}
