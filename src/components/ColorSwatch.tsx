import { useCopy } from "../useCopy";
import { useLocale } from "../i18n";

interface ColorSwatchProps {
  hex: string;
  label?: string;
}

export default function ColorSwatch({ hex, label }: ColorSwatchProps) {
  const { copied, copy } = useCopy(1000);
  const { t } = useLocale();

  return (
    <button
      type="button"
      onClick={() => copy(hex)}
      className="group relative flex flex-col items-center gap-1 focus:outline-none"
      title={t("copyHex", { hex })}
    >
      <div
        className="h-10 w-full rounded-lg border border-line"
        style={{ backgroundColor: hex }}
      />
      <span className="font-mono text-[10px] text-ink-muted">
        {label ?? hex}
      </span>
      {copied === hex && (
        <span className="absolute -top-1 left-1/2 -translate-x-1/2 rounded border border-success bg-surface-raised px-1.5 py-0.5 text-[10px] text-success shadow-md">
          {t("copied")}
        </span>
      )}
    </button>
  );
}
