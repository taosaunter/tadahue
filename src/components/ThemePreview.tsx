import type { CSSProperties } from "react";
import { scopeVars, type ThemeMode, type ThemePalette } from "../palette";
import { useLocale } from "../i18n";

export type PreviewMode = ThemeMode | "both";

function themeScope(palette: ThemePalette, theme: ThemeMode): CSSProperties {
  return scopeVars(palette, theme) as CSSProperties;
}

function MiniApp({
  palette,
  theme,
}: {
  palette: ThemePalette;
  theme: ThemeMode;
}) {
  const { t } = useLocale();
  return (
    <div
      style={themeScope(palette, theme)}
      className="rounded-xl border border-line bg-surface p-4 shadow-sm"
    >
      <div className="mb-3 flex items-center gap-2">
        <div className="h-6 w-6 rounded-full bg-primary" />
        <span className="flex-1 text-sm font-semibold text-ink">
          {t("appPreview")}
        </span>
        <div className="h-5 w-5 rounded-full bg-primary-muted" />
        <div className="h-5 w-5 rounded-full bg-accent" />
      </div>

      <div className="mb-3 grid grid-cols-3 gap-2">
        {[
          [t("revenue"), "$12.4k"],
          [t("users"), "2,847"],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-lg border border-line bg-surface-raised p-2"
          >
            <div className="text-[9px] uppercase tracking-wider text-ink-muted">
              {label}
            </div>
            <div className="text-sm font-semibold text-ink">{value}</div>
          </div>
        ))}
        <div className="rounded-lg border border-line bg-surface-raised p-2">
          <div className="text-[9px] uppercase tracking-wider text-ink-muted">
            {t("growth")}
          </div>
          <span className="rounded bg-success-muted px-1 font-mono text-sm text-success">
            +18%
          </span>
        </div>
      </div>

      <div className="mb-3 rounded-lg border border-line bg-background p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold text-ink">
            {t("projectAlpha")}
          </span>
          <span className="font-mono text-[10px] text-ink-muted">72%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-primary-muted">
          <div className="h-full w-[72%] rounded-full bg-primary" />
        </div>
        <div className="mt-2 flex gap-3">
          {[
            [t("design"), "bg-accent"],
            [t("dev"), "bg-warning-muted"],
            [t("review"), "bg-ink-muted"],
          ].map(([label, dot]) => (
            <span
              key={label}
              className="flex items-center gap-1 text-[9px] text-ink-muted"
            >
              <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="mb-3 rounded-lg border border-line bg-background px-2 py-1.5 text-[11px] text-ink-muted">
        {t("search")}
      </div>

      <div className="mb-3 rounded-lg bg-danger-muted px-2 py-1.5 text-[10px] text-danger">
        {t("unpublished")}
      </div>

      <div className="mb-3 grid grid-cols-3 gap-2">
        <button
          type="button"
          className="rounded-lg bg-primary py-1.5 text-[11px] font-medium text-on-primary"
        >
          {t("continue")}
        </button>
        <button
          type="button"
          className="rounded-lg border border-line bg-surface-raised py-1.5 text-[11px] text-ink"
        >
          {t("cancel")}
        </button>
        <button
          type="button"
          className="rounded-lg bg-danger py-1.5 text-[11px] font-medium text-on-danger"
        >
          {t("delete")}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded bg-success px-1.5 py-0.5 text-[9px] uppercase text-on-success">
          {t("active")}
        </span>
        <span className="rounded bg-primary-muted px-1.5 py-0.5 text-[9px] uppercase text-ink">
          {t("featured")}
        </span>
        <span className="rounded bg-warning px-1.5 py-0.5 text-[9px] uppercase text-on-warning">
          {t("pending")}
        </span>
        <span className="rounded border border-line px-1.5 py-0.5 text-[9px] uppercase text-ink-muted">
          {t("draft")}
        </span>
      </div>

      <div className="mt-3 text-center font-mono text-[9px] tracking-widest text-ink-muted">
        {t(theme).toUpperCase()}
      </div>
    </div>
  );
}

interface ThemePreviewProps {
  palette: ThemePalette;
  mode: PreviewMode;
}

export default function ThemePreview({ palette, mode }: ThemePreviewProps) {
  const themes: ThemeMode[] = mode === "both" ? ["light", "dark"] : [mode];
  return (
    <div
      className={mode === "both" ? "grid gap-3 sm:grid-cols-2" : "grid gap-3"}
    >
      {themes.map((theme) => (
        <MiniApp key={theme} palette={palette} theme={theme} />
      ))}
    </div>
  );
}
