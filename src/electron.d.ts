export interface ColorPickerApi {
  start: (locale?: "en" | "zh-TW") => void;
  onDone: (cb: (data: { hex: string | null }) => void) => void;
}

declare global {
  interface Window {
    colorPicker?: ColorPickerApi;
  }
}
