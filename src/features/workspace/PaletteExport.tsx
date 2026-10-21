import { Check, CircleAlert, CircleCheck, Copy } from 'lucide-react'
import { type RefObject, useState } from 'react'
import { useLocale } from '../../app/i18n'
import { designTokensJson, tailwindConfig } from '../../color/paletteExport'
import { Button } from '../../shared/ui/button'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '../../shared/ui/sheet'
import { useCopy } from '../../shared/useCopy'
import HarmonyPalette from '../palette/HarmonyPalette'
import { EXPORT_TABS } from './tabs'
import type { PaletteWorkspaceProps } from './types'
import WorkspaceTabs from './WorkspaceTabs'

type Props = Pick<
  PaletteWorkspaceProps,
  'palette' | 'preview' | 'style' | 'tuning'
> & {
  open: boolean
  onOpenChange: (open: boolean) => void
  finalFocus: RefObject<HTMLElement | null>
  theme: 'light' | 'dark'
}

// The preview and clipboard always share the same complete serialized output.
export default function PaletteExport({
  open,
  onOpenChange,
  finalFocus,
  palette,
  preview,
  style,
  tuning,
  theme,
}: Props) {
  const { t } = useLocale()
  const [format, setFormat] = useState<(typeof EXPORT_TABS)[number]>('css')
  const { copied, copy, error } = useCopy(2400)
  const shown = palette ?? preview.palette
  const content = !palette
    ? ''
    : format === 'css'
      ? palette.css
      : format === 'tailwind'
        ? tailwindConfig(palette)
        : designTokensJson(palette, style, tuning, {
            mode: preview.harmony,
            accent: preview.accent,
          })
  const check = shown?.checks[theme].find(
    (check) => check.fg === 'on-primary' && check.bg === 'primary',
  )
  const filename =
    format === 'css'
      ? 'tadahue.css'
      : format === 'tailwind'
        ? 'tailwind.config.js'
        : 'tadahue.json'
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="export-sheet" finalFocus={finalFocus}>
        <div className="sheet-heading">
          <SheetTitle>{t('exportHeading')}</SheetTitle>
          <SheetClose render={<Button variant="ghost" />}>
            {t('close')}
          </SheetClose>
        </div>
        <SheetDescription>{t('exportDescription')}</SheetDescription>
        {shown && (
          <HarmonyPalette
            seed={shown.seed}
            accent={preview.accent}
            mode={preview.harmony}
          />
        )}
        <WorkspaceTabs
          tabs={EXPORT_TABS}
          tab={format}
          onChange={setFormat}
          label={t('exportPalette')}
        />
        <section
          className="export-description"
          id={`panel-${format}`}
          role="tabpanel"
          aria-labelledby={`tab-${format}`}
        >
          <h3>
            {t(
              format === 'css'
                ? 'exportCssHeading'
                : format === 'tailwind'
                  ? 'exportTailwindHeading'
                  : 'exportJsonHeading',
            )}
          </h3>
          <p>
            {t(
              format === 'css'
                ? 'exportCssHint'
                : format === 'tailwind'
                  ? 'exportTailwindHint'
                  : 'exportJsonHint',
            )}
          </p>
        </section>
        <div className="export-code">
          <div>
            <span>{filename}</span>
          </div>
          <pre tabIndex={0} aria-label={filename}>
            <code>{content || t('previewRetained')}</code>
          </pre>
        </div>
        {check && (
          <div
            className={`export-confidence ${check.ok ? '' : 'needs-adjustment'}`}
          >
            {check.ok ? (
              <CircleCheck aria-hidden="true" />
            ) : (
              <CircleAlert aria-hidden="true" />
            )}
            <span>
              {t('primaryText')} · {check.ratio.toFixed(2)} : 1 ·{' '}
              {t(check.ok ? 'contrastPass' : 'contrastFail')}
            </span>
          </div>
        )}
        <div className="export-footer">
          <p
            role="status"
            className={error ? 'feedback-error' : 'copy-feedback'}
          >
            {error
              ? t('copyFailed')
              : copied
                ? t('copiedOutput', {
                    format:
                      format === 'json'
                        ? 'JSON'
                        : format === 'css'
                          ? 'CSS'
                          : 'Tailwind',
                  })
                : ''}
          </p>
          <Button
            disabled={!palette}
            onClick={() => void copy(content, format)}
          >
            {copied === format ? (
              <Check aria-hidden="true" />
            ) : (
              <Copy aria-hidden="true" />
            )}
            {t('exportCopy', {
              format:
                format === 'json'
                  ? 'JSON'
                  : format === 'css'
                    ? 'CSS'
                    : 'Tailwind',
            })}
          </Button>
          <p>{t('clipboardLocal')}</p>
        </div>
      </SheetContent>
    </Sheet>
  )
}
