import { useLocale } from "../../../app/i18n";

// Static form sample used to preview the current palette.
export default function Form() {
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
