// Serialize generated palettes for JSON and Tailwind without UI or storage side effects.

import { generateScale, SCALE_STEPS } from './colors.ts'
import { harmonyColors, type WheelSettings } from './harmony.ts'
import {
  DEFAULT_TUNING,
  type PaletteStyle,
  type PaletteTuning,
  type ThemeMode,
  type ThemePalette,
} from './palette.ts'

const roleValues = (palette: ThemePalette, theme: ThemeMode) =>
  Object.fromEntries(
    palette[theme].map(({ name, hex }) => [
      name,
      { $value: hex, $type: 'color' },
    ]),
  )

export function designTokens(
  palette: ThemePalette,
  style: PaletteStyle,
  tuning: PaletteTuning = DEFAULT_TUNING,
  wheel?: WheelSettings,
) {
  const scale = generateScale(palette.seed)
  return {
    seed: palette.seed,
    ...(palette.background ? { background: palette.background } : {}),
    style,
    tuning,
    ...(wheel
      ? {
          wheel,
          harmony: harmonyColors(palette.seed, wheel.accent, wheel.mode),
        }
      : {}),
    generatedPalette: {
      scale: Object.fromEntries(
        SCALE_STEPS.map((step, index) => [step, scale[index]]),
      ),
    },
    semanticTokens: {
      light: roleValues(palette, 'light'),
      dark: roleValues(palette, 'dark'),
    },
  }
}

export function designTokensJson(
  palette: ThemePalette,
  style: PaletteStyle,
  tuning: PaletteTuning = DEFAULT_TUNING,
  wheel?: WheelSettings,
): string {
  return JSON.stringify(designTokens(palette, style, tuning, wheel), null, 2)
}

export function tailwindConfig(palette: ThemePalette): string {
  const colors = Object.fromEntries(
    palette.light.map(({ name }) => [name, `var(--${name})`]),
  )
  return `// Pair with tadahue.css for light and dark token values.\nexport default {\n  theme: {\n    extend: {\n      colors: ${JSON.stringify(colors, null, 2).replaceAll('\n', '\n      ')}\n    }\n  }\n};\n`
}
