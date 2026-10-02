import { useLocale } from "../../../app/i18n";

// Static landing sample used to preview the current palette.
export default function Landing() {
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
