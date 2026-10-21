import { useLocale } from '../../app/i18n'
import { type HarmonyMode, harmonyColors } from '../../color/harmony'
import { useCopy } from '../../shared/useCopy'

// The same live palette appears beside the editor, preview and export drawer.
export default function HarmonyPalette({
  seed,
  accent,
  mode,
}: {
  seed: string
  accent: string
  mode: HarmonyMode
}) {
  const { t } = useLocale()
  const { copied, copy, error } = useCopy()
  return (
    <div
      className="harmony-palette"
      role="group"
      aria-label={t('harmonyColors')}
    >
      {harmonyColors(seed, accent, mode).map((hex, index) => (
        <button
          key={index}
          type="button"
          className="palette-swatch"
          data-base={index === 1 || undefined}
          data-feedback={copied === String(index) || undefined}
          aria-label={`${t(index === 1 ? 'colorOne' : index === 2 ? 'colorTwo' : 'generatedColor')} · ${error === String(index) ? t('copyFailed') : t('copyHex', { hex })}`}
          onClick={() => void copy(hex, String(index))}
        >
          <span
            className="palette-swatch-color"
            style={{ backgroundColor: hex }}
          />
          <span className="palette-swatch-info">
            <span>
              {copied === String(index)
                ? t('copied')
                : t(
                    index === 1
                      ? 'colorOne'
                      : index === 2
                        ? 'colorTwo'
                        : 'generatedColor',
                  )}
            </span>
            <code>{hex.toUpperCase()}</code>
          </span>
        </button>
      ))}
      <span role="status" className="sr-only">
        {error ? t('copyFailed') : copied ? t('copied') : ''}
      </span>
    </div>
  )
}
