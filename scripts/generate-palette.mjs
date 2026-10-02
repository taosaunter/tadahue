#!/usr/bin/env node

import { generateThemePalette, allChecksPass } from "../src/color/palette.ts";

const seed = (process.argv[2] ?? "#778873").replace(/^#/, "");
if (!/^[0-9a-f]{6}$/i.test(seed)) {
  console.error(
    `Invalid seed color: "${process.argv[2]}"（Example: node scripts/generate-palette.mjs "#778873"）`,
  );
  process.exit(1);
}

const p = generateThemePalette(`#${seed}`);
if (!p) {
  console.error(`Unable to resolve seed color: ${seed}`);
  process.exit(1);
}

console.log(
  `\nSeed ${p.seed} → OKLCH(${p.seedOklch.l.toFixed(3)} ${p.seedOklch.c.toFixed(3)} ${p.seedOklch.h.toFixed(1)}°)`,
);
console.log("Light L 0.2~0.98, Dark L 0.16~0.93, same H same C\n");

for (const theme of ["light", "dark"]) {
  console.log(`${theme}:`);
  console.log(`  ${p[theme].map((r) => `${r.name}=${r.hex}`).join("\n  ")}`);
  console.log("  Contrast:");
  for (const c of p.checks[theme]) {
    console.log(
      `  ${theme} ${c.label.padEnd(12)} ${c.ratio.toFixed(2)}:1  ${c.ok ? "✔" : `✘ must ≥ ${c.min}:1`}`,
    );
  }
  console.log();
}

if (allChecksPass(p)) {
  console.log(`CSS variables
${p.css}`);
}
process.exit(allChecksPass(p) ? 0 : 1);
