/**
 * Color palette generation — pure functions, zero UI.
 * Uses culori for OKLCH ↔ hex conversions.
 */
import { formatHex, oklch, parseHex } from 'culori'
import { harmonyColors, pairedColor } from './harmony.ts'

type HexColor = string // "#RRGGBB"
export const SCALE_STEPS = [
  '50',
  '100',
  '200',
  '300',
  '400',
  '500',
  '600',
  '700',
  '800',
  '900',
  '950',
] as const

export function isHexColor(hex: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(hex)
}

/**
 * Tailwind-style 50-950 color scale.
 * Fixes H and C to input's values. Retains the original lightness stops and
 * inserts 900 between 800 and 950 for a complete 11-step scale.
 */
export function generateScale(hex: HexColor): HexColor[] {
  const base = oklch(parseHex(hex))
  if (!base) return []

  const lMin = 0.05
  const lMax = 0.95
  const scale: HexColor[] = []

  for (let i = 0; i < SCALE_STEPS.length; i++) {
    // Preserve the existing stops while filling the former 800 → 950 gap.
    base.l = i === 9 ? 0.1 : lMax - Math.min(i, 9) * ((lMax - lMin) / 9)
    scale.push(formatHex(base))
  }

  return scale
}

/**
 * Analogous: hues shifted by ±15°, ±30°.
 * Returns [h-30, h-15, original, h+15, h+30] — 5 colors.
 */
export function generateAnalogous(hex: HexColor): HexColor[] {
  const base = oklch(parseHex(hex))
  if (!base) return []

  return [-30, -15, 0, 15, 30]
    .map((d) => ((base.h ?? 0) + d + 360) % 360)
    .map((h) => formatHex({ ...base, h }))
}

/**
 * Monochromatic: same hue, vary S + L across 5 steps.
 */
export function generateMonochromatic(hex: HexColor): HexColor[] {
  const base = oklch(parseHex(hex))
  if (!base) return []

  const result: HexColor[] = []
  for (let i = 0; i < 5; i++) {
    const t = i / 4
    result.push(
      formatHex({
        ...base,
        l: Math.max(0, Math.min(1, base.l - t * 0.2)),
        c: Math.max(0, base.c + t * 0.04),
      }),
    )
  }
  return result
}

/** Complementary: hue + 180°. */
export function generateComplementary(hex: HexColor): HexColor {
  const base = oklch(parseHex(hex))
  if (!base) return hex

  return formatHex({
    ...base,
    h: ((base.h ?? 0) + 180) % 360,
  })
}

/** Five colors: two linked inputs and three derived colors. */
export function generateSplitComplementary(hex: HexColor): HexColor[] {
  return isHexColor(hex)
    ? harmonyColors(
        hex,
        pairedColor(hex, 'splitComplementary'),
        'splitComplementary',
      )
    : []
}
export function generateTriad(hex: HexColor): HexColor[] {
  return isHexColor(hex)
    ? harmonyColors(hex, pairedColor(hex, 'triad'), 'triad')
    : []
}

/** Shades: same hue, progressive darkening toward black — 5 steps. */
export function generateShades(hex: HexColor): HexColor[] {
  const base = oklch(parseHex(hex))
  if (!base) return []

  const result: HexColor[] = []
  for (let i = 0; i < 5; i++) {
    const t = i / 4
    result.push(
      formatHex({
        ...base,
        l: Math.max(0, base.l - t * base.l),
        c: base.c * (1 - t * 0.7),
      }),
    )
  }
  return result
}

/**
 * All schemes for one hex input, keyed by scheme name.
 * Returns null on invalid input.
 */
export function generateAll(hex: HexColor): Record<string, HexColor[]> | null {
  if (!isHexColor(hex) || !oklch(parseHex(hex))) return null

  return {
    scale: generateScale(hex),
    analogous: generateAnalogous(hex),
    monochromatic: generateMonochromatic(hex),
    complementary: harmonyColors(
      hex,
      pairedColor(hex, 'complementary'),
      'complementary',
    ),
    splitComplementary: generateSplitComplementary(hex),
    triad: generateTriad(hex),
    shades: generateShades(hex),
  }
}
