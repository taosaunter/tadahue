// Base/accent HEX inputs and their RGB popovers. Visual rules live in palette.css.
import {
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { formatHex, hsv, parseHex, type Hsv } from "culori";
import { useLocale } from "../../app/i18n";

interface ColorInputProps {
  label?: string;
  value: string;
  onChange: (hex: string) => void;
}

function RgbChannel({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <label className="rgb-channel">
      <span>{label}</span>
      <input
        type="number"
        min={0}
        max={255}
        step={1}
        value={draft ?? value}
        onFocus={(event) => event.currentTarget.select()}
        onChange={(event) => {
          const text = event.target.value;
          setDraft(text);
          const number = Number(text);
          if (
            text !== "" &&
            Number.isInteger(number) &&
            number >= 0 &&
            number <= 255
          )
            onChange(number);
        }}
        onBlur={() => {
          if (
            draft !== null &&
            draft !== "" &&
            Number.isFinite(Number(draft))
          ) {
            onChange(Math.round(Math.max(0, Math.min(255, Number(draft)))));
          }
          setDraft(null);
        }}
      />
    </label>
  );
}

export default function ColorInput({
  value,
  onChange,
  label,
}: ColorInputProps) {
  const colorValue = /^#[0-9a-f]{6}$/i.test(value)
    ? value.toLowerCase()
    : "#000000";
  const { t } = useLocale();
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  // Keep the chosen hue at black/gray, where the RGB value cannot represent it.
  const [selection, setSelection] = useState({
    hex: colorValue,
    color: hsv(parseHex(colorValue))!,
  });
  const color =
    selection.hex === colorValue ? selection.color : hsv(parseHex(colorValue))!;
  const hue = color.h ?? 0;
  const rgb = [1, 3, 5].map((offset) =>
    parseInt(colorValue.slice(offset, offset + 2), 16),
  );

  function updateColor(next: Hsv) {
    const hex = formatHex(next);
    setSelection({ hex, color: next });
    onChange(hex);
  }

  function move(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    updateColor({
      ...color,
      s: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      v: 1 - Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
    });
  }

  function moveByKey(event: KeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? 0.1 : 0.01;
    const delta = {
      ArrowLeft: { s: -step, v: 0 },
      ArrowRight: { s: step, v: 0 },
      ArrowUp: { s: 0, v: step },
      ArrowDown: { s: 0, v: -step },
    }[event.key];
    if (!delta) return;
    event.preventDefault();
    updateColor({
      ...color,
      s: Math.max(0, Math.min(1, color.s + delta.s)),
      v: Math.max(0, Math.min(1, color.v + delta.v)),
    });
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (
            event.key === "Enter" &&
            /^[0-9a-f]{6}$/i.test(event.currentTarget.value.trim())
          ) {
            onChange(`#${event.currentTarget.value.trim()}`);
          }
        }}
        aria-label={label ?? t("seedHex")}
        placeholder="#663399"
        className="color-input border-line bg-surface-raised text-ink placeholder-ink-muted focus:border-primary w-full min-w-0 rounded-lg border px-3 py-2 font-mono text-sm outline-none"
      />
      <button
        ref={trigger}
        type="button"
        className="color-swatch-trigger"
        aria-label={label ? `${label} · ${t("colorPicker")}` : t("colorPicker")}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={id}
        popoverTarget={id}
        onClick={() => {
          const rect = trigger.current!.getBoundingClientRect();
          const height = popup.current!.getBoundingClientRect().height || 300;
          setPosition({
            left: Math.max(
              12,
              Math.min(rect.right - 272, window.innerWidth - 284),
            ),
            top: Math.max(
              12,
              Math.min(rect.bottom + 8, window.innerHeight - height - 12),
            ),
          });
        }}
      >
        <span style={{ backgroundColor: colorValue }} />
      </button>
      <div
        ref={popup}
        id={id}
        popover="auto"
        role="dialog"
        aria-label={label ? `${label} · RGB` : "RGB"}
        className="rgb-popover"
        style={position}
        onToggle={(event) => {
          setOpen(event.newState === "open");
          if (event.newState === "open")
            popup.current?.querySelector<HTMLElement>(".rgb-spectrum")?.focus();
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            popup.current?.hidePopover();
            trigger.current?.focus();
          }
        }}
      >
        <div className="rgb-heading">
          <strong>
            {label} <span>RGB</span>
          </strong>
          <button
            type="button"
            className="quiet-button"
            onClick={() => {
              popup.current?.hidePopover();
              trigger.current?.focus();
            }}
          >
            {t("colorDone")}
          </button>
        </div>
        <div
          className="rgb-spectrum"
          role="group"
          tabIndex={0}
          aria-label={t("colorSpectrum")}
          aria-describedby={`${id}-hint`}
          style={{ backgroundColor: `hsl(${hue} 100% 50%)` }}
          onPointerDown={(event) => {
            event.currentTarget.focus();
            event.currentTarget.setPointerCapture(event.pointerId);
            move(event);
          }}
          onPointerMove={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId))
              move(event);
          }}
          onKeyDown={moveByKey}
        >
          <span
            className="rgb-spectrum-marker"
            style={{
              left: `${color.s * 100}%`,
              top: `${(1 - color.v) * 100}%`,
              backgroundColor: colorValue,
            }}
          />
        </div>
        <p id={`${id}-hint`} className="sr-only">
          {t("colorSpectrumHint")}
        </p>
        <label className="rgb-hue">
          <span className="sr-only">{t("colorHue")}</span>
          <input
            type="range"
            min={0}
            max={360}
            step={1}
            value={hue}
            onChange={(event) =>
              updateColor({ ...color, h: Number(event.target.value) })
            }
          />
        </label>
        <div className="rgb-channels">
          {["R", "G", "B"].map((channel, index) => (
            <RgbChannel
              key={channel}
              label={channel}
              value={rgb[index]}
              onChange={(number) => {
                const next = [...rgb];
                next[index] = number;
                const hex = `#${next.map((component) => component.toString(16).padStart(2, "0")).join("")}`;
                setSelection({ hex, color: hsv(parseHex(hex))! });
                onChange(hex);
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
