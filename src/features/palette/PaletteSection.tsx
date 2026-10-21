// One labeled palette family in the More palettes tab.
import ColorSwatch from './ColorSwatch'

interface PaletteSectionProps {
  title: string
  colors: string[]
  labels?: string[]
}

export default function PaletteSection({
  title,
  colors,
  labels,
}: PaletteSectionProps) {
  return (
    <section className="palette-family">
      <h2 className="font-medium text-ink-muted text-xs">{title}</h2>
      <div className="swatch-grid">
        {colors.map((hex, i) =>
          labels?.[i] ? (
            <div className="scale-stop" key={i}>
              <ColorSwatch hex={hex} label={labels[i]} />
              <span aria-hidden="true">{labels[i]}</span>
            </div>
          ) : (
            <ColorSwatch key={i} hex={hex} />
          ),
        )}
      </div>
    </section>
  )
}
