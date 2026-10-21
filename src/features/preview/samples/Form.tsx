import { useLocale } from '../../../app/i18n'

// Static form sample used to preview the current palette.
export default function Form() {
  const { t } = useLocale()
  return (
    <div className="mx-auto max-w-sm space-y-2.5 py-1">
      <h3 className="font-semibold text-ink text-lg">{t('welcomeBack')}</h3>
      <div className="block text-ink text-xs">
        <span>{t('emailAddress')}</span>
        <span className="mt-1 block w-full rounded-lg border border-line bg-surface-raised px-3 py-2 text-ink">
          hello@example.com
        </span>
      </div>
      <div className="block text-ink text-xs">
        <span>{t('password')}</span>
        <span className="mt-1 block w-full rounded-lg border border-line bg-surface-raised px-3 py-2 text-ink">
          •••••••
        </span>
      </div>
      <p className="rounded-md bg-danger-muted px-3 py-2 text-danger text-xs">
        {t('passwordError')}
      </p>
      <p className="rounded-md bg-info-muted px-3 py-2 text-info text-xs">
        {t('resetInfo')}
      </p>
      <div className="flex items-center gap-2 rounded-md bg-selected px-2 py-1 text-ink text-xs">
        <span
          className="h-3 w-3 rounded-sm border border-primary bg-primary"
          aria-hidden="true"
        />
        {t('rememberMe')}
      </div>
      <div className="flex justify-end gap-2">
        <span className="rounded-lg bg-primary px-4 py-2 text-on-primary text-xs">
          {t('signIn')}
        </span>
        <span className="rounded-lg bg-disabled-muted px-4 py-2 text-disabled text-xs">
          {t('continueLater')}
        </span>
      </div>
    </div>
  )
}
