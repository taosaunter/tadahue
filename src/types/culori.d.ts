declare module "culori" {
  export interface Oklch {
    mode: "oklch";
    l: number;
    c: number;
    h?: number;
    alpha?: number;
  }

  export interface Hsv {
    mode: "hsv";
    h?: number;
    s: number;
    v: number;
    alpha?: number;
  }
  export function hsv(color: any): Hsv | null;

  export function oklch(color: any): Oklch | null;
  export function formatHex(color: any): string;
  export function parseHex(color: string): any;
  export function wcagContrast(a: any, b: any): number;
}
