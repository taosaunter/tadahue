import assert from 'node:assert/strict'
import test from 'node:test'
import { compile } from 'tailwindcss'
import { generateScale, SCALE_STEPS } from './colors.ts'
import { generateThemePalette, PALETTE_STYLES } from './palette.ts'
import {
  designTokens,
  designTokensJson,
  tailwindConfig,
} from './paletteExport.ts'

const requiredRoles = [
  'background',
  'surface',
  'surface-raised',
  'on-surface',
  'primary',
  'on-primary',
  'accent',
  'on-accent',
  'focus',
  'selected',
  'disabled',
  'disabled-muted',
  'success',
  'on-success',
  'success-muted',
  'warning',
  'on-warning',
  'warning-muted',
  'danger',
  'on-danger',
  'danger-muted',
  'info',
  'on-info',
  'info-muted',
]

test('every mode and style has the same semantic schema and valid contrast references', () => {
  for (const seed of ['#764646', '#2563eb', '#000000', '#ffffff', '#00ff00']) {
    for (const style of PALETTE_STYLES) {
      const palette = generateThemePalette(seed, style)
      assert.ok(palette)
      assert.deepEqual(
        palette.light.map(({ name }) => name),
        palette.dark.map(({ name }) => name),
      )
      for (const theme of ['light', 'dark'] as const) {
        const roles: Record<string, string> = Object.fromEntries(
          palette[theme].map(({ name, hex }) => [name, hex]),
        )
        for (const name of requiredRoles)
          assert.match(roles[name], /^#[0-9a-f]{6}$/i, `${theme} ${name}`)
        const pairKeys: Set<string> = new Set(
          palette.checks[theme].map(({ fg, bg }) => `${fg}/${bg}`),
        )
        for (const pair of [
          'on-surface/surface',
          'on-accent/accent',
          'warning/warning-muted',
          'info/info-muted',
          'on-info/info',
        ])
          assert.ok(pairKeys.has(pair), pair)
        for (const check of palette.checks[theme]) {
          assert.ok(
            roles[check.fg] && roles[check.bg],
            `${theme} ${check.label}`,
          )
          assert.equal(check.ok, check.ratio >= check.min)
        }
      }
    }
  }
})

test('default palette exports distinguish seed, scale, and theme tokens', () => {
  const palette = generateThemePalette('#764646', 'balanced')
  assert.ok(palette)
  const tokens = designTokens(palette, 'balanced')
  assert.equal(tokens.seed, '#764646')
  assert.equal(generateScale(palette.seed).length, 11)
  assert.deepEqual(Object.keys(tokens.generatedPalette.scale), [...SCALE_STEPS])
  assert.equal(tokens.generatedPalette.scale['50'].startsWith('#'), true)
  assert.match(tokens.generatedPalette.scale['900'], /^#[0-9a-f]{6}$/i)
  assert.match(palette.css, /^@theme inline \{/)
  assert.match(
    palette.css,
    new RegExp(
      `--color-seed-900: ${tokens.generatedPalette.scale['900']};`,
      'i',
    ),
  )
  assert.match(palette.css, /--color-primary: var\(--primary\);/)
  assert.equal(
    tokens.semanticTokens.light.primary.$value,
    palette.light.find(({ name }) => name === 'primary')?.hex,
  )
  assert.equal(
    tokens.semanticTokens.dark.primary.$value,
    palette.dark.find(({ name }) => name === 'primary')?.hex,
  )
  assert.deepEqual(JSON.parse(designTokensJson(palette, 'balanced')), tokens)
  assert.match(tailwindConfig(palette), /"primary": "var\(--primary\)"/)
  assert.match(palette.css, /--info:/)
})

test('exported Tailwind v4 CSS compiles role and 900-step utilities', async () => {
  const palette = generateThemePalette('#764646')
  assert.ok(palette)
  const compiler = await compile(`@tailwind utilities;\n${palette.css}`)
  const css = compiler.build(['bg-primary', 'bg-seed-900'])
  assert.match(css, /\.bg-primary\s*\{\s*background-color: var\(--primary\);/)
  assert.match(css, /\.bg-seed-900\s*\{\s*background-color: #[\da-f]{6};/i)
})

test('fixed backgrounds survive styles and extreme tuning with readable web roles', () => {
  for (const background of [
    '#ffffff',
    '#000000',
    '#777777',
    '#ff0000',
    '#00ff00',
    '#0000ff',
    '#F5F1ED',
    '#123456',
  ]) {
    for (const style of PALETTE_STYLES) {
      for (const tuning of [
        { hueShift: 0, lightnessShift: 0, chromaScale: 1 },
        { hueShift: 30, lightnessShift: 0.1, chromaScale: 1.5 },
        { hueShift: -30, lightnessShift: -0.1, chromaScale: 0.5 },
      ]) {
        const palette = generateThemePalette(
          '#2563eb',
          style,
          tuning,
          '#ff7733',
          background,
        )
        assert.ok(palette)
        assert.equal(palette.background, background.toUpperCase())
        for (const mode of ['light', 'dark'] as const) {
          assert.equal(
            palette[mode].find((role) => role.name === 'background')?.hex,
            background.toUpperCase(),
          )
          for (const check of palette.checks[mode])
            assert.ok(
              check.ok,
              `${background} ${style}: ${check.label} ${check.ratio}`,
            )
        }
        assert.ok(
          palette.css.includes(
            `--background: light-dark(${background.toUpperCase()}, ${background.toUpperCase()});`,
          ),
        )
        assert.equal(
          designTokens(palette, style, tuning).background,
          background.toUpperCase(),
        )
      }
    }
  }
})

test('fixed background validation and generation do not change the seed palette', () => {
  assert.equal(
    generateThemePalette('#2563eb', 'balanced', undefined, undefined, '#abc'),
    null,
  )
  assert.equal(
    generateThemePalette(
      '#invalid',
      'balanced',
      undefined,
      undefined,
      '#ffffff',
    ),
    null,
  )
  assert.equal(
    generateThemePalette(
      '#2563eb',
      'balanced',
      undefined,
      'invalid',
      '#ffffff',
    ),
    null,
  )
  const normal = generateThemePalette('#2563eb')!
  assert.equal(normal.background, undefined)
  assert.notEqual(
    normal.light.find((role) => role.name === 'background')?.hex,
    '#777777',
  )
  const blue = generateThemePalette(
    '#2563eb',
    'balanced',
    undefined,
    '#ff7733',
    '#ffffff',
  )!
  const red = generateThemePalette(
    '#cc3333',
    'balanced',
    undefined,
    '#ff7733',
    '#ffffff',
  )!
  assert.notEqual(
    blue.light.find((role) => role.name === 'primary')?.hex,
    red.light.find((role) => role.name === 'primary')?.hex,
  )
})
