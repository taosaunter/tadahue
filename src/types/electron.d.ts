// Renderer contract for Electron preload bridges; keep channel implementations in electron/preload.cjs.
export type PickerError =
  | "screenshot-unavailable"
  | "screen-permission"
  | "capture-failed"
  | "native-unavailable"
  | "native-failed";

export interface ColorPickerApi {
  nativeAvailable: () => Promise<boolean>;
  start: (locale?: "en" | "zh-TW", mode?: "magnifier" | "native") => void;
  onDone: (
    cb: (data: { hex: string | null; error?: PickerError }) => void,
  ) => () => void;
}

declare global {
  interface Window {
    desktopSettings?: {
      getDisplayMode: () => Promise<{
        enabled: boolean;
        available: boolean;
      } | null>;
      restartWithX11: (enabled: boolean) => Promise<{ ok: boolean }>;
    };
    workspace?: { setExpanded: (expanded: boolean) => void };
    colorPicker?: ColorPickerApi;
  }
}
