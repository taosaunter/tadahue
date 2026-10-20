// One tab registry drives order, labels, keyboard navigation, and panel IDs.
export const TOOL_TABS = [
  "tuning",
  "tokens",
  "palettes",
  "image",
  "library",
] as const;
export const RESULT_TABS = ["preview", "contrast"] as const;
export type ToolTab = (typeof TOOL_TABS)[number];
export type ResultTab = (typeof RESULT_TABS)[number];
export type WorkspaceTab = ToolTab | ResultTab;
export const TAB_LABELS = {
  contrast: "contrastTab",
  tuning: "tuningTab",
  preview: "previewTab",
  tokens: "colorSwatches",
  palettes: "morePalettes",
  library: "libraryTab",
  image: "imageTab",
} as const;
