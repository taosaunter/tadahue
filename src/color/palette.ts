// Pure theme-token generation, gamut mapping, contrast checks, and CSS export.
import { oklch, formatHex, parseHex, wcagContrast } from "culori";
import { isHexColor } from "./colors.ts";

export interface ContrastCheck {
  label: string;
  fg: string;
  bg: string;
  min: number;
  ratio: number;
  ok: boolean;
}

export type RoleGroup = "base" | "semantic";

export type ThemeMode = "light" | "dark";
export type PaletteStyle = "balanced" | "pastel" | "vintage";
export const PALETTE_STYLES: PaletteStyle[] = ["balanced", "pastel", "vintage"];
export interface PaletteTuning {
  hueShift: number;
  lightnessShift: number;
  chromaScale: number;
}
export const DEFAULT_TUNING: PaletteTuning = {
  hueShift: 0,
  lightnessShift: 0,
  chromaScale: 1,
};

export function isPaletteTuning(value: unknown): value is PaletteTuning {
  if (!value || typeof value !== "object") return false;
  const tuning = value as Partial<PaletteTuning>;
  return (
    typeof tuning.hueShift === "number" &&
    Number.isFinite(tuning.hueShift) &&
    Math.abs(tuning.hueShift) <= 30 &&
    typeof tuning.lightnessShift === "number" &&
    Number.isFinite(tuning.lightnessShift) &&
    Math.abs(tuning.lightnessShift) <= 0.1 &&
    typeof tuning.chromaScale === "number" &&
    Number.isFinite(tuning.chromaScale) &&
    tuning.chromaScale >= 0.5 &&
    tuning.chromaScale <= 1.5
  );
}

export interface ThemeRole {
  name: string;
  hex: string;
  group: RoleGroup;
}

export interface ThemePalette {
  seed: string;
  seedOklch: { l: number; c: number; h: number };
  light: ThemeRole[];
  dark: ThemeRole[];
  checks: { light: ContrastCheck[]; dark: ContrastCheck[] };
  css: string;
}

const ROLE_L: Record<string, [number, number]> = {
  background: [0.985, 0.16],
  surface: [0.97, 0.19],
  "surface-raised": [0.95, 0.23],
  "on-surface": [0.2, 0.93],
  ink: [0.2, 0.93],
  "ink-muted": [0.42, 0.72],
  line: [0.88, 0.32],
  primary: [0.45, 0.78],
  "on-primary": [0.98, 0.2],
  "primary-muted": [0.92, 0.3],
  accent: [0.45, 0.78],
  "on-accent": [0.98, 0.2],
  focus: [0.38, 0.82],
  selected: [0.9, 0.36],
  disabled: [0.52, 0.58],
  "disabled-muted": [0.91, 0.35],
};

const STYLE_ROLE_L: Record<
  Exclude<PaletteStyle, "balanced">,
  Partial<Record<string, [number, number]>>
> = {
  pastel: {
    background: [0.985, 0.22],
    surface: [0.965, 0.28],
    "surface-raised": [0.94, 0.34],
    ink: [0.28, 0.88],
    "ink-muted": [0.46, 0.68],
    line: [0.87, 0.4],
    primary: [0.55, 0.72],
    "primary-muted": [0.9, 0.38],
    accent: [0.55, 0.72],
  },
  vintage: {
    background: [0.93, 0.1],
    surface: [0.88, 0.14],
    "surface-raised": [0.82, 0.18],
    ink: [0.18, 0.88],
    "ink-muted": [0.42, 0.65],
    line: [0.3, 0.35],
    primary: [0.45, 0.72],
    "primary-muted": [0.78, 0.24],
    accent: [0.48, 0.75],
  },
};

function roleChroma(
  name: string,
  tint: number,
  primaryC: number,
  style: PaletteStyle,
): number {
  const scale = style === "pastel" ? 0.55 : style === "vintage" ? 0.9 : 1;
  switch (name) {
    case "primary":
      return primaryC * scale;
    case "primary-muted":
      return primaryC * 0.6 * scale;
    case "on-primary":
    case "on-accent":
      return 0;
    case "accent":
      return primaryC * scale;
    default:
      return tint * scale;
  }
}

function buildRoles(
  theme: ThemeMode,
  hue: number,
  tint: number,
  primaryC: number,
  style: PaletteStyle,
  tuning: PaletteTuning,
  accent?: ReturnType<typeof oklch>,
): ThemeRole[] {
  return Object.entries(ROLE_L).map(([name, [lightL, darkL]]) => {
    const styleL = style === "balanced" ? undefined : STYLE_ROLE_L[style][name];
    const baseL =
      (theme === "light" ? styleL?.[0] : styleL?.[1]) ??
      (theme === "light" ? lightL : darkL);
    const L = name.startsWith("on-")
      ? baseL
      : Math.max(0.04, Math.min(0.99, baseL + tuning.lightnessShift));
    const h =
      ((name === "accent" && accent
        ? (accent.h ?? 0)
        : hue + (name === "accent" ? 30 : 0)) +
        tuning.hueShift +
        360) %
      360;
    return {
      name,
      hex: formatHex({
        mode: "oklch",
        l: L,
        c:
          roleChroma(
            name,
            tint,
            name === "accent" && accent ? accent.c : primaryC,
            style,
          ) * tuning.chromaScale,
        h,
      }),
      group: "base",
    };
  });
}

const SEMANTIC: Record<
  string,
  {
    hue: number;
    lightC: number;
    darkC: number;
    lightL?: number;
    lightHex?: string;
    darkHex?: string;
    lightOnL?: number;
  }
> = {
  success: { hue: 155, lightC: 0.115, darkC: 0.17 },
  warning: {
    hue: 95,
    lightC: 0.14,
    darkC: 0.16,
    lightL: 0.505,
    lightHex: "#b94f16",
    darkHex: "#ec9453",
    lightOnL: 0.98,
  },
  danger: { hue: 25, lightC: 0.18, darkC: 0.1 },
  info: { hue: 250, lightC: 0.14, darkC: 0.12 },
};

const SEMANTIC_L: Record<"fill" | "on" | "muted", [number, number]> = {
  fill: [0.48, 0.8],
  on: [0.98, 0.2],
  muted: [0.92, 0.3],
};
const SEMANTIC_MUTED_C = 0.05;

function buildSemanticRoles(theme: ThemeMode): ThemeRole[] {
  const i = theme === "light" ? 0 : 1;
  return Object.entries(SEMANTIC).flatMap(
    ([key, { hue, lightC, darkC, lightL, lightHex, darkHex, lightOnL }]) => {
      const c = theme === "light" ? lightC : darkC;
      const at = (l: number, chroma: number) =>
        formatHex({ mode: "oklch", l, c: chroma, h: hue });
      const fillL =
        theme === "light" ? (lightL ?? SEMANTIC_L.fill[0]) : SEMANTIC_L.fill[1];
      return [
        {
          name: key,
          hex:
            theme === "light"
              ? (lightHex ?? at(fillL, c))
              : (darkHex ?? at(fillL, c)),
          group: "semantic",
        },
        {
          name: `on-${key}`,
          hex: at(
            theme === "light"
              ? (lightOnL ?? SEMANTIC_L.on[0])
              : SEMANTIC_L.on[1],
            0,
          ),
          group: "semantic",
        },
        {
          name: `${key}-muted`,
          hex: at(
            key === "warning" && theme === "light" ? 0.98 : SEMANTIC_L.muted[i],
            SEMANTIC_MUTED_C,
          ),
          group: "semantic",
        },
      ];
    },
  );
}

const AA_TEXT = 4.5;
const REPAIR_MAX_DL = 0.15;
const REPAIR_STEP = 0.001;

const CONTRAST_CHECKS: Array<
  [label: string, fg: string, bg: string, min: number]
> = [
  ["Body / background", "ink", "background", AA_TEXT],
  ["Muted text / background", "ink-muted", "background", AA_TEXT],
  ["Text on surface / surface", "on-surface", "surface", AA_TEXT],
  ["Primary / background (component)", "primary", "background", 3],
  ["Text on primary / primary", "on-primary", "primary", AA_TEXT],
  ["Accent / background (component)", "accent", "background", 3],
  ["Text on accent / accent", "on-accent", "accent", AA_TEXT],
  ["Focus / background (component)", "focus", "background", 3],
  ["Text on selected / selected", "ink", "selected", AA_TEXT],
  ["Success / background (component) ", "success", "background", 3],
  ["Text on success / success", "on-success", "success", AA_TEXT],
  [
    "Success text / light success background",
    "success",
    "success-muted",
    AA_TEXT,
  ],
  ["Warning / background (component)", "warning", "background", 3],
  ["Text on warning / warning", "on-warning", "warning", AA_TEXT],
  [
    "Warning text / light warning background",
    "warning",
    "warning-muted",
    AA_TEXT,
  ],
  ["Danger / background (component) ", "danger", "background", 3],
  ["Text on danger / danger", "on-danger", "danger", AA_TEXT],
  ["Danger text / light danger background", "danger", "danger-muted", AA_TEXT],
  ["Info / background (component)", "info", "background", 3],
  ["Text on info / info", "on-info", "info", AA_TEXT],
  ["Info text / light info background", "info", "info-muted", AA_TEXT],
];

function repairFillContrast(
  fillHex: string,
  onHex: string,
  maxDelta: number,
): string {
  if (wcagContrast(onHex, fillHex) >= AA_TEXT) return fillHex;
  const fill = oklch(parseHex(fillHex));
  const on = oklch(parseHex(onHex));
  if (!fill || !on) return fillHex;

  const dir = on.l > fill.l ? -1 : 1;
  for (let d = REPAIR_STEP; d <= maxDelta + 1e-9; d += REPAIR_STEP) {
    const l = fill.l + dir * d;
    if (l <= 0 || l >= 1) break;
    const hex = formatHex({ mode: "oklch", l, c: fill.c, h: fill.h });
    if (wcagContrast(onHex, hex) >= AA_TEXT) return hex;
  }
  return fillHex;
}

function repairRoles(
  roles: ThemeRole[],
  onName: string,
  fillName: string,
): void {
  const on = roles.find((r) => r.name === onName);
  const fill = roles.find((r) => r.name === fillName);
  if (on && fill)
    fill.hex = repairFillContrast(fill.hex, on.hex, REPAIR_MAX_DL);
}

export function generateThemePalette(
  seedHex: string,
  style: PaletteStyle = "balanced",
  tuning: PaletteTuning = DEFAULT_TUNING,
  accentHex?: string,
): ThemePalette | null {
  if (
    !isHexColor(seedHex) ||
    !PALETTE_STYLES.includes(style) ||
    !isPaletteTuning(tuning)
  )
    return null;
  const base = oklch(parseHex(seedHex));
  if (!base) return null;

  if (accentHex !== undefined && !isHexColor(accentHex)) return null;
  const accent = accentHex ? oklch(parseHex(accentHex)) : undefined;
  const H = base.h ?? 0;
  const C0 = base.c;
  const primaryC = C0 < 0.02 ? C0 : Math.max(C0, 0.05);
  const tint = Math.min(C0, 0.012);

  const light = [
    ...buildRoles("light", H, tint, primaryC, style, tuning, accent),
    ...buildSemanticRoles("light"),
  ];
  const dark = [
    ...buildRoles("dark", H, tint, primaryC, style, tuning, accent),
    ...buildSemanticRoles("dark"),
  ];

  repairRoles(light, "on-primary", "primary");
  repairRoles(dark, "on-primary", "primary");
  repairRoles(light, "on-accent", "accent");
  repairRoles(dark, "on-accent", "accent");

  return assembleThemePalette(seedHex, light, dark);
}

export function assembleThemePalette(
  seedHex: string,
  light: ThemeRole[],
  dark: ThemeRole[],
): ThemePalette | null {
  if (!isHexColor(seedHex)) return null;
  const base = oklch(parseHex(seedHex));
  if (!base) return null;

  const runChecks = (roles: ThemeRole[]) => {
    const hexes = Object.fromEntries(roles.map((r) => [r.name, r.hex]));
    return CONTRAST_CHECKS.map(([label, fg, bg, min]) => {
      const ratio = wcagContrast(hexes[fg], hexes[bg]);
      return { label, fg, bg, min, ratio, ok: ratio >= min };
    });
  };

  const names = light.map((r) => r.name);
  const lightVars = Object.fromEntries(light.map((r) => [r.name, r.hex]));
  const darkVars = Object.fromEntries(dark.map((r) => [r.name, r.hex]));
  const atTheme = names.map((n) => `  --color-${n}: var(--${n});`).join("\n");
  const pairVars = names
    .map((n) => `  --${n}: light-dark(${lightVars[n]}, ${darkVars[n]});`)
    .join("\n");
  const decls = (vars: Record<string, string>) =>
    names.map((n) => `  --${n}: ${vars[n]};`).join("\n");

  return {
    seed: seedHex.toUpperCase(),
    seedOklch: { l: base.l, c: base.c, h: base.h ?? 0 },
    light,
    dark,
    checks: { light: runChecks(light), dark: runChecks(dark) },
    css: `@theme {\n${atTheme}\n}\n\n:root {\n  color-scheme: light dark; \n${pairVars}\n}\n\n\n:root.light {\n  color-scheme: light;\n${decls(lightVars)}\n}\n\n:root.dark {\n  color-scheme: dark;\n${decls(darkVars)}\n}`,
  };
}

export function themeVars(
  p: ThemePalette,
  theme: ThemeMode,
): Array<[string, string]> {
  return p[theme].map((r) => [r.name, r.hex]);
}

export function scopeVars(
  p: ThemePalette,
  theme: ThemeMode,
): Record<string, string> {
  return Object.fromEntries(
    themeVars(p, theme).flatMap(([name, hex]) => [
      [`--${name}`, hex],
      [`--color-${name}`, hex],
    ]),
  );
}

export function allChecksPass(p: ThemePalette): boolean {
  return [...p.checks.light, ...p.checks.dark].every((c) => c.ok);
}
