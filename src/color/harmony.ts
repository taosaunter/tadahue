import { hsv, parseHex, formatHex } from "culori";

export const HARMONY_MODES = [
  "complementary",
  "splitComplementary",
  "triad",
] as const;
export type HarmonyMode = (typeof HARMONY_MODES)[number];
export interface WheelSettings {
  mode: HarmonyMode;
  accent: string;
}
const wrap = (h: number) => ((h % 360) + 360) % 360;
const clamp = (value: number) => Math.max(0, Math.min(1, value));
export const harmonyOffset = (mode: HarmonyMode) =>
  mode === "complementary" ? 180 : mode === "splitComplementary" ? 150 : 120;
// Fan derived handles near the saturation boundary so pure colors remain editable.
const edgeSpread = (s: number, amount: number) =>
  Math.max(0, (s - 0.8) / 0.2) * 36 * amount;
const branchOffset = (mode: HarmonyMode) =>
  mode === "complementary" ? 0 : mode === "splitComplementary" ? 60 : 120;

export function isWheelSettings(value: unknown): value is WheelSettings {
  if (!value || typeof value !== "object") return false;
  const settings = value as Partial<WheelSettings>;
  return (
    HARMONY_MODES.includes(settings.mode as HarmonyMode) &&
    typeof settings.accent === "string" &&
    /^#[\da-f]{6}$/i.test(settings.accent)
  );
}

export function pairedColor(seed: string, mode: HarmonyMode): string {
  const base = hsv(parseHex(seed));
  return base
    ? formatHex({ ...base, h: wrap((base.h ?? 0) + harmonyOffset(mode)) })
    : "#467676";
}

/** Keep the hue relationship linked; each input retains its own saturation and value. */
export function linkedAnchors(
  seed: string,
  accent: string,
  anchor: 0 | 1,
  next: string,
  mode: HarmonyMode,
): [string, string] {
  const color = hsv(parseHex(next));
  const other = hsv(parseHex(anchor === 0 ? accent : seed));
  if (!color || !other) return [seed, accent];
  const h = color.h ?? hsv(parseHex(anchor === 0 ? seed : accent))?.h ?? 0;
  const linked = formatHex({
    ...other,
    h: wrap(h + (anchor === 0 ? 1 : -1) * harmonyOffset(mode)),
  });
  return anchor === 0 ? [next, linked] : [linked, next];
}

/** Two input handles (indices 1, 2), with three outward extensions. */
export function harmonyColors(
  seed: string,
  accent: string,
  mode: HarmonyMode,
): string[] {
  const first = hsv(parseHex(seed));
  const second = hsv(parseHex(accent));
  if (!first || !second) return [];
  const extend = (
    base: typeof first,
    amount: number,
    hue = base.h ?? 0,
    direction = 1,
  ) =>
    formatHex({
      ...base,
      h: wrap(hue + direction * edgeSpread(base.s, amount)),
      s: base.s + (1 - base.s) * amount,
      v: base.v + (1 - base.v) * amount,
    });
  return [
    extend(first, 0.65, first.h ?? 0, -1),
    seed,
    accent,
    extend(second, 0.35, (second.h ?? 0) + branchOffset(mode)),
    extend(second, 0.8, (second.h ?? 0) + branchOffset(mode)),
  ];
}

/** Convert a moved derived handle back into the input that controls it. */
export function movedWheelAnchor(
  index: number,
  hue: number,
  saturation: number,
  seed: string,
  accent: string,
  mode: HarmonyMode,
): { anchor: 0 | 1; hex: string } {
  const anchor = index < 2 ? 0 : 1;
  const base = hsv(parseHex(anchor === 0 ? seed : accent))!;
  const amount =
    index === 0 ? 0.65 : index === 3 ? 0.35 : index === 4 ? 0.8 : 0;
  const offset =
    (index > 2 ? branchOffset(mode) : 0) +
    (index === 0 ? -1 : 1) * edgeSpread(base.s, amount);
  return {
    anchor,
    hex: formatHex({
      ...base,
      h: wrap(hue - offset),
      s: clamp((saturation - amount) / (1 - amount)),
    }),
  };
}
