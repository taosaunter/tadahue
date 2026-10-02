import { useEffect, useRef, useState } from "react";
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
  PanelLeftOpenIcon,
  PanelLeftCloseIcon,
} from "../../shared/Icons";
import ColorInput from "../palette/ColorInput";
import ColorWheel from "../palette/ColorWheel";
import type { PaletteWorkspaceProps } from "./types";

type Props = Omit<PaletteWorkspaceProps, "theme" | "library"> & {
  expanded: boolean;
  onToggleExpanded: () => void;
};

// Left pane: toolbar, base/accent inputs, harmony wheel, and export/save actions.
// Spacing and alignment live in workspace.css; color editing lives in ../palette.
export default function PaletteControls({
  settings,
  actions,
  onSave,
  seed,
  accent,
  harmony,
  onAnchorChange,
  onHarmonyChange,
  style,
  onStyleChange,
  tuning,
  palette,
  expanded,
  onToggleExpanded,
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
        <div className="toolbar-right">
          {settings}
          <button
            className="icon-button"
            type="button"
            aria-label={t(expanded ? "collapseLayout" : "expandLayout")}
            data-tooltip={t(expanded ? "collapseLayout" : "expandLayout")}
            aria-expanded={expanded}
            aria-controls="workspace-tools"
            onClick={onToggleExpanded}
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
  );
}
