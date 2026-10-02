// One labeled palette family in the More palettes tab.
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
    <section className="flex flex-col gap-4">
      <h2 className="text-ink-muted mt-4 text-xs font-semibold tracking-widest uppercase">
        {title}
      </h2>
      <div
        className="grid gap-2"
        style={{
          gridTemplateColumns: `repeat(${Math.min(colors.length, 5)}, minmax(0, 1fr))`,
        }}
      >
        {colors.map((hex, i) => (
          <ColorSwatch key={i} hex={hex} label={labels?.[i]} />
        ))}
      </div>
    </section>
  );
}
