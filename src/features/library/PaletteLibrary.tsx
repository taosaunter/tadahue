// Saved palettes tab: restore exact snapshots or delete local entries.
import { Bookmark, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useLocale } from '../../app/i18n'
import { harmonyColors, pairedColor } from '../../color/harmony'
import type { SavedPaletteSnapshot } from './savedPalettes'

interface Props {
  saved: SavedPaletteSnapshot[]
  activeId: string | null
  onLoad: (snapshot: SavedPaletteSnapshot) => void
  onDelete: (id: string) => boolean
}
export default function PaletteLibrary({
  saved,
  activeId,
  onLoad,
  onDelete,
}: Props) {
  const { t } = useLocale()
  const [status, setStatus] = useState('')
  return (
    <section aria-label={t('savedPalettes')}>
      {status && (
        <p role="status" className="text-ink-muted mb-2 text-xs">
          {status}
        </p>
      )}
      {saved.length ? (
        <ul className="library-list">
          {saved.map((item) => {
            const wheel = item.wheel ?? {
              mode: 'complementary',
              accent: pairedColor(item.seed, 'complementary'),
            }
            const colors = harmonyColors(item.seed, wheel.accent, wheel.mode)
            return (
              <li key={item.id} className="library-card">
                <button
                  type="button"
                  aria-label={t('loadPalette', { hex: item.seed })}
                  aria-pressed={activeId === item.id}
                  title={item.name}
                  onClick={() => {
                    onLoad(item)
                    setStatus('')
                  }}
                  className="saved-palette"
                >
                  <span className="saved-swatches">
                    {colors.map((hex, index) => (
                      <span
                        key={index}
                        className="saved-swatch"
                        style={{ background: hex }}
                      />
                    ))}
                  </span>
                  <span className="saved-palette-info">
                    <strong>{item.name || item.seed.toUpperCase()}</strong>
                    <span>{t(wheel.mode)}</span>
                  </span>
                </button>
                <button
                  type="button"
                  className="delete-palette"
                  aria-label={t('deleteSavedPalette', { name: item.name })}
                  onClick={() =>
                    setStatus(onDelete(item.id) ? '' : t('storageError'))
                  }
                >
                  <Trash2 aria-hidden="true" />
                </button>
              </li>
            )
          })}
        </ul>
      ) : (
        <div className="library-empty">
          <Bookmark aria-hidden="true" />
          <p>{t('libraryEmpty')}</p>
        </div>
      )}
    </section>
  )
}
