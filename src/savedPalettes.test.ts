import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { DEFAULT_TUNING, generateThemePalette } from "./palette.ts";
import { designTokensJson, tailwindConfig } from "./paletteExport.ts";
import { createSnapshot, isSavedPalette, mergeLibraries, migrateLegacyHistory, parseLibrary, restoreSnapshot, serializeLibrary } from "./savedPalettes.ts";

test("tuning updates theme values and contrast while preserving semantic status hues", () => {
  const base = generateThemePalette("#764646", "balanced");
  const tuning = { hueShift: 20, lightnessShift: 0.04, chromaScale: 1.2 };
  const tuned = generateThemePalette("#764646", "balanced", tuning);
  assert.ok(base && tuned);
  assert.notEqual(tuned.light.find((role) => role.name === "primary")?.hex, base.light.find((role) => role.name === "primary")?.hex);
  assert.equal(tuned.light.find((role) => role.name === "success")?.hex, base.light.find((role) => role.name === "success")?.hex);
  assert.notEqual(tuned.checks.light.find((check) => check.fg === "primary")?.ratio, base.checks.light.find((check) => check.fg === "primary")?.ratio);
  assert.equal(generateThemePalette("#764646", "balanced", { ...DEFAULT_TUNING })?.css, base.css);
  assert.equal(generateThemePalette("#764646", "balanced", { ...tuning, chromaScale: Infinity }), null);
});

test("saved snapshot round trips exact token values and all export formats", async () => {
  const tuning = { hueShift: -12, lightnessShift: -0.02, chromaScale: 0.85 };
  const palette = generateThemePalette("#2563eb", "pastel", tuning);
  assert.ok(palette);
  const snapshot = createSnapshot("sample-1", "Blue UI", "Brand trial", "pastel", tuning, palette, 100, 200);
  const parsed = parseLibrary(serializeLibrary([snapshot]));
  assert.deepEqual(parsed, [snapshot]);
  const restored = restoreSnapshot(parsed[0]);
  assert.ok(restored);
  assert.deepEqual(restored.light, palette.light);
  assert.deepEqual(restored.dark, palette.dark);
  assert.equal(restored.css, palette.css);
  const tokens = JSON.parse(designTokensJson(restored, snapshot.style, snapshot.tuning));
  assert.deepEqual(tokens.tuning, tuning);
  assert.equal(tokens.semanticTokens.dark.primary.$value, snapshot.dark.primary);
  assert.match(restored.css, new RegExp(`--primary: ${snapshot.light.primary};`));
  const config = (await import(`data:text/javascript,${encodeURIComponent(tailwindConfig(restored))}`)).default;
  assert.equal(config.theme.extend.colors.primary, "var(--primary)");
});

test("legacy seed history migrates and malformed imports cannot replace the library", () => {
  const migrated = migrateLegacyHistory(JSON.stringify([{ id: "old-1", hex: "#764646", savedAt: 123 }]));
  assert.equal(migrated.length, 1);
  assert.equal(migrated[0].style, "balanced");
  assert.deepEqual(migrated[0].tuning, DEFAULT_TUNING);
  assert.equal(migrated[0].createdAt, 123);
  assert.ok(isSavedPalette(migrated[0]));
  assert.deepEqual(mergeLibraries(migrated, migrated), migrated);
  const broken = JSON.parse(serializeLibrary(migrated));
  broken.palettes[0].light.primary = "javascript:alert(1)";
  assert.throws(() => parseLibrary(JSON.stringify(broken)));
  assert.throws(() => parseLibrary(JSON.stringify({ version: 1, palettes: [migrated[0], migrated[0]] })));
});

test("exported CSS, token JSON, Tailwind config, and library JSON remain usable as files", async () => {
  const palette = generateThemePalette("#764646");
  assert.ok(palette);
  const snapshot = createSnapshot("file-test", "File test", "", "balanced", DEFAULT_TUNING, palette);
  const directory = await mkdtemp(join(tmpdir(), "palette-export-"));
  try {
    const cssPath = join(directory, "color-palette.css");
    const tokensPath = join(directory, "color-palette.tokens.json");
    const configPath = join(directory, "color-palette.tailwind.mjs");
    const libraryPath = join(directory, "color-palette-library.json");
    await Promise.all([
      writeFile(cssPath, palette.css),
      writeFile(tokensPath, designTokensJson(palette, "balanced", DEFAULT_TUNING)),
      writeFile(configPath, tailwindConfig(palette)),
      writeFile(libraryPath, serializeLibrary([snapshot])),
    ]);
    assert.match(await readFile(cssPath, "utf8"), /:root\.dark \{/);
    assert.equal(JSON.parse(await readFile(tokensPath, "utf8")).semanticTokens.light.primary.$value, snapshot.light.primary);
    assert.equal((await import(pathToFileURL(configPath).href)).default.theme.extend.colors.primary, "var(--primary)");
    assert.deepEqual(parseLibrary(await readFile(libraryPath, "utf8")), [snapshot]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
