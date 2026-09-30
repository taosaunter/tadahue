import ColorSwatch from "./ColorSwatch";

interface PaletteSectionProps {
  title: string;
  colors: string[];
  labels?: string[];
}

export default function PaletteSection({
  title,
  colors,
  labels,
}: PaletteSectionProps) {
  return (
    <section>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-ink-muted">
        {title}
      </h2>
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${Math.min(colors.length, 5)}, minmax(0, 1fr))` }}
      >
        {colors.map((hex, i) => (
          <ColorSwatch key={i} hex={hex} label={labels?.[i]} />
        ))}
      </div>
    </section>
  );
}
