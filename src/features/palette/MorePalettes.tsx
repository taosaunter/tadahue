import { useMemo } from "react";
import { generateAll } from "../../color/colors";
import { useLocale } from "../../app/i18n";
import PaletteSection from "./PaletteSection";

const SCALE_LABELS = [
  "50",
  "100",
  "200",
  "300",
  "400",
  "500",
  "600",
  "700",
  "800",
  "950",
];

// More palettes tab: derived scales and families, independent of theme-token tuning.
export default function MorePalettes({ seed }: { seed: string }) {
  const { t } = useLocale();
  const schemes = useMemo(() => generateAll(seed), [seed]);
  if (!schemes) return null;
  return (
    <div className="space-y-2 rounded-lg p-2">
      <PaletteSection
        title={t("scale")}
        colors={schemes.scale}
        labels={SCALE_LABELS}
      />
      <PaletteSection title={t("analogous")} colors={schemes.analogous} />
      <PaletteSection
        title={t("monochromatic")}
        colors={schemes.monochromatic}
      />
      <PaletteSection title={t("shades")} colors={schemes.shades} />
    </div>
  );
}
