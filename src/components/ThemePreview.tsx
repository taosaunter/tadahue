import { useState, type CSSProperties, type ReactNode } from "react";
import { scopeVars, type ThemeMode, type ThemePalette } from "../palette";
import { useLocale } from "../i18n";

type Sample = "dashboard" | "landing" | "form";
const SAMPLES: Sample[] = ["dashboard", "landing", "form"];
const semanticClasses: Record<string, { strong: string; soft: string }> = {
  success: {
    strong: "bg-success text-on-success",
    soft: "bg-success-muted text-success",
  },
  warning: {
    strong: "bg-warning text-on-warning",
    soft: "bg-warning-muted text-warning",
  },
  danger: {
    strong: "bg-danger text-on-danger",
    soft: "bg-danger-muted text-danger",
  },
  info: { strong: "bg-info text-on-info", soft: "bg-info-muted text-info" },
};

function Dashboard() {
  const { t } = useLocale();
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="bg-primary h-6 w-6 rounded-full" />
        <strong className="text-on-surface flex-1 text-sm">
          {t("appPreview")}
        </strong>
        <span className="bg-accent h-3 w-3 rounded-full" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          [t("revenue"), "$12.4k"],
          [t("users"), "2,847"],
          [t("growth"), "+18%"],
        ].map(([label, value]) => (
          <div
            key={label}
            className="border-line bg-surface-raised rounded-lg border p-2"
          >
            <div className="text-ink-muted text-[10px]">{label}</div>
            <strong className="text-ink text-sm">{value}</strong>
          </div>
        ))}
      </div>
      <div className="border-line bg-background rounded-lg border p-3">
        <div className="flex justify-between text-xs">
          <strong className="text-ink">{t("projectAlpha")}</strong>
          <span className="text-ink-muted">72%</span>
        </div>
        <div className="bg-primary-muted mt-2 h-2 rounded-full">
          <div className="bg-primary h-full w-[72%] rounded-full" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
        {[
          ["success", t("active")],
          ["warning", t("pending")],
          ["danger", t("delete")],
          ["info", "Info"],
        ].map(([fill, label]) => (
          <span
            key={fill}
            className={`rounded-md px-2 py-1 text-center ${semanticClasses[fill].strong}`}
          >
            {label}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
        {[
          ["success", t("active")],
          ["warning", t("pending")],
          ["danger", t("unpublished")],
          ["info", "Info"],
        ].map(([name, label]) => (
          <span
            key={name}
            className={`truncate rounded-md px-2 py-1 ${semanticClasses[name].soft}`}
            title={label}
          >
            {label}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="bg-selected text-ink rounded-md px-2 py-1">
            {t("featured")}
          </span>
          <span className="bg-disabled-muted text-disabled rounded-md px-2 py-1">
            {t("draft")}
          </span>
          <span className="border-focus text-ink rounded-md border-2 px-2 py-1">
            {t("review")}
          </span>
          <span className="bg-accent text-on-accent rounded-md px-2 py-1">
            {t("design")}
          </span>
        </div>
        <div className="flex gap-2">
          <span className="bg-primary text-on-primary rounded-md px-2 py-1 text-xs">
            {t("continue")}
          </span>
          <span className="border-line bg-surface-raised text-ink rounded-md border px-2 py-1 text-xs">
            {t("cancel")}
          </span>
        </div>
      </div>
    </div>
  );
}

function Landing() {
  const { t } = useLocale();
  return (
    <div className="space-y-2 py-2">
      <nav className="flex items-center justify-between">
        <strong className="text-ink text-sm">Studio North</strong>
        <span className="text-ink-muted text-xs">Work · About · Contact</span>
      </nav>
      <div className="bg-primary-muted rounded-xl px-5 py-8 sm:px-8">
        <span className="text-accent text-xs font-semibold">
          {t("landingTagline")}
        </span>
        <h3 className="text-ink mt-2 max-w-sm text-2xl leading-tight font-bold">
          {t("landingHeading")}
        </h3>
        <p className="text-ink-muted mt-2 max-w-sm text-xs leading-relaxed">
          {t("landingDescription")}
        </p>
        <div className="mt-4 flex gap-2">
          <span className="bg-primary text-on-primary rounded-lg px-3 py-2 text-xs">
            {t("continue")}
          </span>
          <span className="bg-accent text-on-accent rounded-lg px-3 py-2 text-xs">
            {t("review")}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="border-line bg-surface rounded-lg border p-3">
          <strong className="text-on-surface text-xs">
            {t("creativeDirection")}
          </strong>
          <p className="text-ink-muted mt-1 text-[11px]">
            {t("creativeDescription")}
          </p>
        </div>
        <div className="border-line bg-surface rounded-lg border p-3">
          <strong className="text-on-surface text-xs">
            {t("brandSystems")}
          </strong>
          <p className="text-ink-muted mt-1 text-[11px]">
            {t("brandDescription")}
          </p>
        </div>
      </div>
    </div>
  );
}

function Form() {
  const { t } = useLocale();
  return (
    <div className="mx-auto max-w-sm space-y-2.5 py-1">
      <h3 className="text-ink text-lg font-semibold">{t("welcomeBack")}</h3>
      <p className="text-ink-muted text-xs">{t("signInDescription")}</p>
      <div className="text-ink block text-xs">
        <span>{t("emailAddress")}</span>
        <span className="border-line bg-surface-raised text-ink mt-1 block w-full rounded-lg border px-3 py-2">
          hello@example.com
        </span>
      </div>
      <div className="text-ink block text-xs">
        <span>{t("password")}</span>
        <span className="border-line bg-surface-raised text-ink mt-1 block w-full rounded-lg border px-3 py-2">
          •••••••
        </span>
      </div>
      <p className="bg-danger-muted text-danger rounded-md px-3 py-2 text-xs">
        {t("passwordError")}
      </p>
      <p className="bg-info-muted text-info rounded-md px-3 py-2 text-xs">
        {t("resetInfo")}
      </p>
      <div className="bg-selected text-ink flex items-center gap-2 rounded-md px-2 py-1 text-xs">
        <span
          className="border-primary bg-primary h-3 w-3 rounded-sm border"
          aria-hidden="true"
        />
        {t("rememberMe")}
      </div>
      <div className="flex justify-end gap-2">
        <span className="bg-primary text-on-primary rounded-lg px-4 py-2 text-xs">
          {t("signIn")}
        </span>
        <span className="bg-disabled-muted text-disabled rounded-lg px-4 py-2 text-xs">
          {t("continueLater")}
        </span>
      </div>
    </div>
  );
}

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
