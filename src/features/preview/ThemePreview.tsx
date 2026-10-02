import { useState, type CSSProperties, type ReactNode } from "react";
import {
  scopeVars,
  type ThemeMode,
  type ThemePalette,
} from "../../color/palette";
import { useLocale } from "../../app/i18n";

import Dashboard from "./samples/Dashboard";
import Landing from "./samples/Landing";
import Form from "./samples/Form";

type Sample = "dashboard" | "landing" | "form";
const SAMPLES: Sample[] = ["dashboard", "landing", "form"];

// Preview tab: sample selector and token-scoped frame; samples are in ./samples.
function MiniApp({
  palette,
  theme,
  sample,
}: {
  palette: ThemePalette;
  theme: ThemeMode;
  sample: Sample;
}) {
  const { t } = useLocale();
  const content: Record<Sample, ReactNode> = {
    dashboard: <Dashboard />,
    landing: <Landing />,
    form: <Form />,
  };
  return (
    <div
      style={scopeVars(palette, theme) as CSSProperties}
      className="preview-canvas border-line bg-surface rounded-xl border p-4 shadow-sm"
    >
      <div className="border-line text-ink-muted mb-3 flex items-center justify-between border-b pb-2 text-[10px] font-semibold tracking-wider uppercase">
        <span>
          {t(theme)} ·{" "}
          {t(
            `preview${sample[0].toUpperCase()}${sample.slice(1)}` as
              "previewDashboard" | "previewLanding" | "previewForm",
          )}
        </span>
      </div>
      {content[sample]}
    </div>
  );
}

export default function ThemePreview({
  palette,
  theme,
}: {
  palette: ThemePalette;
  theme: ThemeMode;
}) {
  const { t } = useLocale();
  const [sample, setSample] = useState<Sample>("dashboard");
  return (
    <div className="theme-preview">
      <div className="preview-selector mb-3 flex flex-wrap items-center justify-between gap-2">
        <div
          role="group"
          aria-label={t("previewTitle")}
          className="border-line bg-surface-raised flex rounded-lg border p-0.5"
        >
          {SAMPLES.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setSample(item)}
              aria-pressed={sample === item}
              className={`rounded-md px-2.5 py-1 text-xs ${sample === item ? "bg-primary text-on-primary" : "text-ink-muted hover:text-ink"}`}
            >
              {t(
                `preview${item[0].toUpperCase()}${item.slice(1)}` as
                  "previewDashboard" | "previewLanding" | "previewForm",
              )}
            </button>
          ))}
        </div>
      </div>
      <div className="preview-frame grid gap-3">
        <MiniApp palette={palette} theme={theme} sample={sample} />
      </div>
    </div>
  );
}
