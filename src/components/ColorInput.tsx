import { type ChangeEvent, type KeyboardEvent } from "react";
import { useLocale } from "../i18n";

interface ColorInputProps {
  label?: string;
  value: string;
  onChange: (hex: string) => void;
}

export default function ColorInput({ value, onChange, label }: ColorInputProps) {
  const colorValue = /^#[0-9a-f]{6}$/i.test(value) ? value : "#000000";
  const { t } = useLocale();
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const input = e.currentTarget.value.trim();
      // Auto-prepend # if missing
      if (/^[0-9a-f]{6}$/i.test(input)) {
        onChange(`#${input}`);
      }
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        aria-label={label ?? t("seedHex")}
        placeholder="#663399"
        className="color-input min-w-0 w-full rounded-lg border border-line bg-surface-raised px-3 py-2 font-mono text-sm text-ink
          placeholder-ink-muted outline-none focus:border-primary"
      />
      <input
        type="color"
        value={colorValue}
        onChange={handleChange}
        aria-label={label ? `${label} · ${t("colorPicker")}` : t("colorPicker")}
        className="native-color-input h-9 w-9 shrink-0 cursor-pointer rounded-lg border-0 bg-transparent p-0.5"
      />
    </div>
  );
}
