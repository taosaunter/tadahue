import { Pipette } from 'lucide-react'
import { useLocale } from '../../app/i18n'
import { Button } from '../../shared/ui/button'
import type { useScreenPicker } from './useScreenPicker'

type Props = { picker: ReturnType<typeof useScreenPicker> }

const PICKER_ERROR_MESSAGES = {
  'screenshot-unavailable': 'pickerScreenshotUnavailable',
  'screen-permission': 'pickerPermission',
  'capture-failed': 'pickerFailed',
  'native-unavailable': 'pickerNativeUnavailable',
  'native-failed': 'pickerNativeFailed',
} as const

// Toolbar action is separate from the status below the workspace.
export function ScreenPickerButton({ picker }: Props) {
  const { t } = useLocale()
  return (
    <Button
      type="button"
      onClick={() => picker.start()}
      className="screen-picker-button"
      variant="outline"
      aria-label={t('eyedropper')}
      disabled={picker.picking || !window.colorPicker}
      data-tooltip={t('eyedropper')}
      title={t(window.colorPicker ? 'screenPick' : 'desktopPickerOnly')}
    >
      <Pipette aria-hidden="true" />
      {t('screenPick')}
    </Button>
  )
}

export function ScreenPickerStatus({ picker }: Props) {
  const { t } = useLocale()
  return (
    <div className="save-feedback">
      {picker.picking && <p className="text-accent text-xs">{t('picking')}</p>}
      {picker.error && (
        <div>
          <p role="alert" className="text-accent text-xs">
            {t(PICKER_ERROR_MESSAGES[picker.error])}
          </p>
          {picker.nativeAvailable &&
            picker.error === 'screenshot-unavailable' && (
              <button
                className="quiet-button mt-2"
                type="button"
                onClick={() => picker.start('native')}
              >
                {t('pickerUseNative')}
              </button>
            )}
        </div>
      )}
    </div>
  )
}
