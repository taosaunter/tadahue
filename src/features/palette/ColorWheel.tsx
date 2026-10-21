// Hue-ring anchors retain saturation and brightness; RGB controls edit those axes.

import { formatHex, hsv, parseHex } from 'culori'
import { type PointerEvent, useRef } from 'react'
import { useLocale } from '../../app/i18n'
import hueSpectrum from '../../assets/hue-spectrum.png'
import type { HarmonyMode } from '../../color/harmony'

interface Props {
  seed: string
  accent: string
  mode: HarmonyMode
  onChange: (anchor: 0 | 1, hex: string) => void
}

export default function ColorWheel({ seed, accent, mode, onChange }: Props) {
  const { t } = useLocale()
  const dragging = useRef<number | null>(null)
  const colors = [seed, accent].map((hex) => hsv(parseHex(hex))!)
  const branchOffset = mode === 'splitComplementary' ? 60 : 120
  if (mode !== 'complementary')
    colors.push({ ...colors[1], h: ((colors[1].h ?? 0) + branchOffset) % 360 })

  function change(index: number, color: (typeof colors)[number]) {
    onChange(
      index === 0 ? 0 : 1,
      formatHex(
        index === 2
          ? { ...color, h: ((color.h ?? 0) - branchOffset + 360) % 360 }
          : color,
      ),
    )
  }
  const points = colors.map((color) => {
    const angle = ((color.h ?? 0) * Math.PI) / 180
    return { x: 100 + Math.cos(angle) * 87, y: 100 + Math.sin(angle) * 87 }
  })
  function move(event: PointerEvent<SVGSVGElement>) {
    const anchor = dragging.current
    if (anchor === null) return
    const rect = event.currentTarget.getBoundingClientRect()
    const hue =
      ((Math.atan2(
        event.clientY - rect.top - rect.height / 2,
        event.clientX - rect.left - rect.width / 2,
      ) *
        180) /
        Math.PI +
        360) %
      360
    change(anchor, { ...colors[anchor], h: hue })
  }
  return (
    <section className="harmony-editor" aria-label={t('wheelTitle')}>
      <div className="wheel-wrap">
        <svg
          viewBox="0 0 200 200"
          className="color-wheel"
          aria-label={t('wheelTitle')}
          onPointerMove={move}
          onPointerUp={() => {
            dragging.current = null
          }}
          onPointerCancel={() => {
            dragging.current = null
          }}
          onLostPointerCapture={() => {
            dragging.current = null
          }}
        >
          <image href={hueSpectrum} x="0" y="0" width="200" height="200" />
          <circle cx="100" cy="100" r="74" fill="var(--background)" />
          <text x="100" y="105" textAnchor="middle" className="wheel-label">
            {t(mode)}
          </text>
          {points.map((point, index) => (
            <g
              key={index}
              role="slider"
              tabIndex={0}
              aria-label={t(
                index === 0
                  ? 'colorOne'
                  : index === 1
                    ? 'colorTwo'
                    : 'generatedColor',
              )}
              aria-valuemin={0}
              aria-valuemax={360}
              aria-valuenow={Math.round(colors[index].h ?? 0)}
              aria-valuetext={formatHex(colors[index])}
              onPointerDown={(event) => {
                event.preventDefault()
                dragging.current = index
                event.currentTarget.focus()
                event.currentTarget.ownerSVGElement?.setPointerCapture(
                  event.pointerId,
                )
              }}
              onKeyDown={(event) => {
                if (
                  !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(
                    event.key,
                  )
                )
                  return
                event.preventDefault()
                const color = colors[index]
                change(index, {
                  ...color,
                  h:
                    ((color.h ?? 0) +
                      (event.key === 'ArrowRight'
                        ? 2
                        : event.key === 'ArrowLeft'
                          ? -2
                          : 0) +
                      360) %
                    360,
                  s: Math.max(
                    0,
                    Math.min(
                      1,
                      color.s +
                        (event.key === 'ArrowUp'
                          ? 0.02
                          : event.key === 'ArrowDown'
                            ? -0.02
                            : 0),
                    ),
                  ),
                })
              }}
              className="wheel-handle"
            >
              <circle cx={point.x} cy={point.y} r="22" fill="transparent" />
              <circle
                cx={point.x}
                cy={point.y}
                r="10"
                fill={formatHex(colors[index])}
                stroke="white"
                strokeWidth="4"
              />
              <circle
                className="wheel-focus"
                cx={point.x}
                cy={point.y}
                r="14"
                fill="none"
                stroke="var(--focus)"
                strokeWidth="2"
              />
            </g>
          ))}
        </svg>
      </div>
      <p className="wheel-hint">{t('wheelHint')}</p>
    </section>
  )
}
