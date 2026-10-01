import { useRef, type PointerEvent } from "react";
import { hsv, parseHex } from "culori";
import { harmonyColors, movedWheelAnchor, type HarmonyMode } from "../harmony";
import { useLocale } from "../i18n";
import { useCopy } from "../useCopy";

interface Props {
  seed: string;
  accent: string;
  mode: HarmonyMode;
  onChange: (anchor: 0 | 1, hex: string) => void;
}
const radius = 92;
export default function ColorWheel({ seed, accent, mode, onChange }: Props) {
  const { t } = useLocale();
  const { copied, copy } = useCopy();
  const dragging = useRef<number | null>(null);
  const colors = harmonyColors(seed, accent, mode);
  const points = colors.map((hex) => {
    const color = hsv(parseHex(hex))!;
    const angle = ((color.h ?? 0) * Math.PI) / 180;
    return {
      x: 100 + Math.sin(angle) * color.s * radius,
      y: 100 - Math.cos(angle) * color.s * radius,
      color,
    };
  });
  function move(event: PointerEvent<SVGSVGElement>) {
    if (dragging.current === null) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 200 - 100;
    const y = ((event.clientY - rect.top) / rect.height) * 200 - 100;
    const hue = ((Math.atan2(x, -y) * 180) / Math.PI + 360) % 360;
    const saturation = Math.min(1, Math.hypot(x, y) / radius);
    const next = movedWheelAnchor(
      dragging.current,
      hue,
      saturation,
      seed,
      accent,
      mode,
    );
    onChange(next.anchor, next.hex);
  }
  return (
    <div>
      <div className="wheel-wrap">
        <svg
          viewBox="0 0 200 200"
          className="color-wheel"
          aria-label={t("wheelTitle")}
          onPointerMove={move}
          onPointerUp={() => {
            dragging.current = null;
          }}
          onPointerCancel={() => {
            dragging.current = null;
          }}
        >
          <defs>
            <radialGradient id="wheel-white">
              <stop stopColor="white" />
              <stop offset="1" stopColor="white" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="100" cy="100" r={radius} fill="url(#wheel-white)" />
          <polyline
            points={points.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke="#fff"
            strokeWidth="2"
            strokeOpacity=".85"
          />
          {points.map((point, index) => (
            <g
              key={index}
              role="slider"
              tabIndex={0}
              aria-label={`${t(index === 1 ? "colorOne" : index === 2 ? "colorTwo" : "generatedColor")} ${index + 1}`}
              aria-valuemin={0}
              aria-valuemax={360}
              aria-valuenow={Math.round(point.color.h ?? 0)}
              aria-valuetext={colors[index]}
              onPointerDown={(event) => {
                event.preventDefault();
                dragging.current = index;
                event.currentTarget.focus();
                event.currentTarget.ownerSVGElement?.setPointerCapture(
                  event.pointerId,
                );
              }}
              onKeyDown={(event) => {
                if (
                  !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
                    event.key,
                  )
                )
                  return;
                event.preventDefault();
                const hue =
                  (point.color.h ?? 0) +
                  (event.key === "ArrowRight"
                    ? 2
                    : event.key === "ArrowLeft"
                      ? -2
                      : 0);
                const saturation = Math.max(
                  0,
                  Math.min(
                    1,
                    point.color.s +
                      (event.key === "ArrowUp"
                        ? 0.02
                        : event.key === "ArrowDown"
                          ? -0.02
                          : 0),
                  ),
                );
                const next = movedWheelAnchor(
                  index,
                  hue,
                  saturation,
                  seed,
                  accent,
                  mode,
                );
                onChange(next.anchor, next.hex);
              }}
              className="wheel-handle"
            >
              <circle
                cx={point.x}
                cy={point.y}
                r={index === 1 || index === 2 ? 9 : 7}
                fill={colors[index]}
                stroke="white"
                strokeWidth="2"
              />
              {(index === 1 || index === 2) && (
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="4"
                  fill="none"
                  stroke="white"
                  strokeWidth="1.5"
                />
              )}
              <circle
                className="wheel-focus"
                cx={point.x}
                cy={point.y}
                r="12"
                fill="none"
                stroke="#111"
                strokeWidth="2"
              />
            </g>
          ))}
        </svg>
      </div>
      <p className="text-ink-muted mt-1 text-center text-[11px]">
        {t("wheelHint")}
      </p>
      <div className="mt-3 grid grid-cols-5 gap-1">
        {colors.map((hex, index) => (
          <button
            key={index}
            type="button"
            aria-label={t("copyHex", { hex })}
            data-tooltip={
              copied === String(index) ? t("copied") : hex.toUpperCase()
            }
            onClick={() => copy(hex, String(index))}
            className="focus-visible:outline-focus min-w-0 rounded focus-visible:outline-2"
          >
            <span
              className="border-line block h-8 rounded border"
              style={{ background: hex }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
