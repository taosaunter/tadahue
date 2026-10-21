import { Moon, Settings2, Sun } from 'lucide-react'
import { useId, useRef } from 'react'
import { useLocale } from '../../app/i18n'
import type { ThemeMode } from '../../color/palette'
import { Button } from '../../shared/ui/button'
import DesktopSettings from './DesktopSettings'

// Preferences stay available without competing with the palette's primary actions.
export default function AppSettings({
  theme,
  onToggleTheme,
  picking,
  beforeRestart,
}: {
  theme: ThemeMode
  onToggleTheme: () => void
  picking: boolean
  beforeRestart: () => boolean
}) {
  const { locale, setLocale, t } = useLocale()
  const id = useId()
  const trigger = useRef<HTMLButtonElement>(null)
  return (
    <>
      <Button
        ref={trigger}
        variant="ghost"
        size="icon"
        popoverTarget={id}
        aria-label={t('preferences')}
      >
        <Settings2 aria-hidden="true" />
      </Button>
      <div
        className="app-settings-panel"
        id={id}
        popover="auto"
        aria-label={t('preferences')}
      >
        <h2>{t('preferences')}</h2>
        <div className="preference-row">
          <span>{t('language')}</span>
          <div role="group" aria-label={t('language')}>
            <Button
              variant={locale === 'en' ? 'default' : 'outline'}
              aria-pressed={locale === 'en'}
              onClick={() => setLocale('en')}
            >
              EN
            </Button>
            <Button
              variant={locale === 'zh-TW' ? 'default' : 'outline'}
              aria-pressed={locale === 'zh-TW'}
              onClick={() => setLocale('zh-TW')}
            >
              繁
            </Button>
          </div>
        </div>
        <div className="preference-row">
          <span>{t('appearance')}</span>
          <Button
            variant="outline"
            onClick={onToggleTheme}
            aria-label={t(theme === 'dark' ? 'switchToLight' : 'switchToDark')}
          >
            {theme === 'dark' ? (
              <Sun aria-hidden="true" />
            ) : (
              <Moon aria-hidden="true" />
            )}
            {t(theme)}
          </Button>
        </div>
        <DesktopSettings disabled={picking} beforeRestart={beforeRestart} />
      </div>
    </>
  )
}
