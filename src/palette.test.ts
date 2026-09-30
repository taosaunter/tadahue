import test from "node:test";
import assert from "node:assert/strict";
import { PALETTE_STYLES, generateThemePalette } from "./palette.ts";
import { designTokens, designTokensJson, tailwindConfig } from "./paletteExport.ts";

const requiredRoles = ["background", "surface", "surface-raised", "on-surface", "primary", "on-primary", "accent", "on-accent", "focus", "selected", "disabled", "disabled-muted", "success", "on-success", "success-muted", "warning", "on-warning", "warning-muted", "danger", "on-danger", "danger-muted", "info", "on-info", "info-muted"];

test("every mode and style has the same semantic schema and valid contrast references", () => {
  for (const seed of ["#764646", "#2563eb", "#000000", "#ffffff", "#00ff00"]) {
    for (const style of PALETTE_STYLES) {
      const palette = generateThemePalette(seed, style);
      assert.ok(palette);
      assert.deepEqual(palette.light.map(({ name }) => name), palette.dark.map(({ name }) => name));
      for (const theme of ["light", "dark"] as const) {
        const roles = Object.fromEntries(palette[theme].map(({ name, hex }) => [name, hex]));
        for (const name of requiredRoles) assert.match(roles[name], /^#[0-9a-f]{6}$/i, `${theme} ${name}`);
        const pairKeys = new Set(palette.checks[theme].map(({ fg, bg }) => `${fg}/${bg}`));
        for (const pair of ["on-surface/surface", "on-accent/accent", "warning/warning-muted", "info/info-muted", "on-info/info"]) assert.ok(pairKeys.has(pair), pair);
        for (const check of palette.checks[theme]) {
          assert.ok(roles[check.fg] && roles[check.bg], `${theme} ${check.label}`);
          assert.equal(check.ok, check.ratio >= check.min);
        }
      }
    }
  }
});

test("default palette exports distinguish seed, scale, and theme tokens", () => {
  const palette = generateThemePalette("#764646", "balanced");
  assert.ok(palette);
  const tokens = designTokens(palette, "balanced");
  assert.equal(tokens.seed, "#764646");
  assert.equal(tokens.generatedPalette.scale["50"].startsWith("#"), true);
  assert.equal(tokens.semanticTokens.light.primary.$value, palette.light.find(({ name }) => name === "primary")?.hex);
  assert.equal(tokens.semanticTokens.dark.primary.$value, palette.dark.find(({ name }) => name === "primary")?.hex);
  assert.deepEqual(JSON.parse(designTokensJson(palette, "balanced")), tokens);
  assert.match(tailwindConfig(palette), /"primary": "var\(--primary\)"/);
  assert.match(palette.css, /--info:/);
});
