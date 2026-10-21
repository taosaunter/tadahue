import { Moon, Sun } from 'lucide-react'
import { type CSSProperties, useState } from 'react'
import { type MessageKey, useLocale } from '../../app/i18n'
import {
  PALETTE_STYLES,
  type PaletteStyle,
  scopeVars,
  type ThemeMode,
  type ThemePalette,
} from '../../color/palette'
import { Button } from '../../shared/ui/button'
import { PREVIEW_TABS } from '../workspace/tabs'
import WorkspaceTabs from '../workspace/WorkspaceTabs'
import Dashboard from './samples/Dashboard'
import Form from './samples/Form'
import Landing from './samples/Landing'

// Preview themes are independent of the neutral app chrome. Samples stay mounted.
export default function ThemePreview({
  palette,
  theme,
  onThemeChange,
  style,
  onStyleChange,
}: {
  palette: ThemePalette
  theme: ThemeMode
  onThemeChange: (theme: ThemeMode) => void
  style: PaletteStyle
  onStyleChange: (style: PaletteStyle) => void
}) {
  const { t } = useLocale()
  const [sample, setSample] = useState<(typeof PREVIEW_TABS)[number]>('landing')
  return (
    <div className="theme-preview">
      <div className="preview-selector">
        <h3>{t('previewTab')}</h3>
        <WorkspaceTabs
          tabs={PREVIEW_TABS}
          tab={sample}
          onChange={setSample}
          label={t('previewTitle')}
        />
        <div className="preview-appearance">
          <select
            className="compact-select"
            aria-label={t('style')}
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
          <Button
            aria-label={t(theme === 'dark' ? 'switchToLight' : 'switchToDark')}
            variant="outline"
            onClick={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')}
          >
            <span>{t(theme)}</span>
            {theme === 'light' ? (
              <Sun aria-hidden="true" />
            ) : (
              <Moon aria-hidden="true" />
            )}
          </Button>
        </div>
      </div>
      <div
        className="preview-canvas"
        data-fixed-background={!!palette.background}
        data-theme={theme}
        style={
          { ...scopeVars(palette, theme), colorScheme: theme } as CSSProperties
        }
      >
        <div
          id="panel-landing"
          role="tabpanel"
          aria-labelledby="tab-landing"
          tabIndex={0}
          hidden={sample !== 'landing'}
        >
          <Landing />
        </div>
        <div
          id="panel-form"
          role="tabpanel"
          aria-labelledby="tab-form"
          tabIndex={0}
          hidden={sample !== 'form'}
        >
          <Form />
        </div>
        <div
          id="panel-dashboard"
          role="tabpanel"
          aria-labelledby="tab-dashboard"
          tabIndex={0}
          hidden={sample !== 'dashboard'}
        >
          <Dashboard />
        </div>
      </div>
    </div>
  )
}
