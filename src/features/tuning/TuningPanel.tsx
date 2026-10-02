import { hsv, parseHex, formatHex } from "culori";
import { DEFAULT_TUNING } from "../../color/palette";
import { useLocale } from "../../app/i18n";
import { useCopy } from "../../shared/useCopy";
import RoleGrid from "../palette/RoleGrid";
import type { PaletteWorkspaceProps } from "../workspace/types";

type Props = Pick<
  PaletteWorkspaceProps,
  | "seed"
  | "accent"
  | "theme"
  | "palette"
  | "tuning"
  | "onTuningChange"
  | "onAnchorChange"
>;

// Tuning tab: HSV brightness per input, then OKLCH adjustments for theme tokens.
export default function TuningPanel({
  seed,
  accent,
  theme,
  palette,
  tuning,
  onTuningChange,
  onAnchorChange,
}: Props) {
  const { t } = useLocale();
  const { copied, copy, error } = useCopy();
  return (
    <div className="tuning-pane p-3">
      {[seed, accent].map((hex, index) => {
        const color = hsv(parseHex(hex));
        return (
          color && (
            <label key={index} className="text-ink-muted block text-xs">
              {t(index === 0 ? "colorOne" : "colorTwo")} · {t("brightness")}
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
            ["primary", "accent", "background", "surface", "ink"].includes(
              role.name,
            ),
          )}
          copied={copied}
          error={error}
          onCopy={copy}
        />
      )}
      <button
        type="button"
        className="quiet-button tuning-reset"
        disabled={JSON.stringify(tuning) === JSON.stringify(DEFAULT_TUNING)}
        onClick={() => onTuningChange({ ...DEFAULT_TUNING })}
      >
        {t("resetTuning")}
      </button>
    </div>
  );
}
