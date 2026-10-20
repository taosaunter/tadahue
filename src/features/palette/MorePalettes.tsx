import { useMemo } from "react";
import { generateAll, SCALE_STEPS } from "../../color/colors";
import { useLocale } from "../../app/i18n";
import PaletteSection from "./PaletteSection";

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
        labels={[...SCALE_STEPS]}
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
