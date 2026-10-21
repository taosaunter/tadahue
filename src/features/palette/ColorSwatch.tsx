// Reusable HEX swatch with clipboard feedback and an accessible label.

import { useLocale } from '../../app/i18n'
import { useCopy } from '../../shared/useCopy'

interface ColorSwatchProps {
  hex: string
  label?: string
}

export default function ColorSwatch({ hex, label }: ColorSwatchProps) {
  const { copied, copy } = useCopy(1000)
  const { t } = useLocale()

  const description = `${label ? label + ' · ' : ''}${hex} · ${copied === hex ? t('copied') : t('copyHex', { hex })}`
  return (
    <button
      type="button"
      onClick={() => copy(hex)}
      aria-label={description}
      data-tooltip={description}
      className="swatch-button rounded-md"
      style={{ backgroundColor: hex }}
    />
  )
}
