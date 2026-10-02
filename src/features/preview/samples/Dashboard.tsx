import { useLocale } from "../../../app/i18n";

// Static dashboard sample used to preview the current palette.
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

export default function Dashboard() {
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
