// One tab registry drives order, labels, keyboard navigation, and panel IDs.
export const TOOL_TABS = ['tuning', 'tokens', 'palettes'] as const
export const WORKSPACE_TABS = ['edit', 'preview', 'library'] as const
export const PREVIEW_TABS = ['landing', 'form', 'dashboard'] as const
export const EXPORT_TABS = ['css', 'tailwind', 'json'] as const
export type ToolTab = (typeof TOOL_TABS)[number]
export type WorkspaceTab =
  | ToolTab
  | (typeof WORKSPACE_TABS)[number]
  | (typeof PREVIEW_TABS)[number]
  | (typeof EXPORT_TABS)[number]
export const TAB_LABELS = {
  edit: 'editTab',
  tuning: 'tuningTab',
  preview: 'previewTab',
  tokens: 'allTokens',
  palettes: 'morePalettes',
  library: 'libraryTab',
  landing: 'previewWebsite',
  form: 'previewForm',
  dashboard: 'previewDashboard',
  css: 'cssFormat',
  tailwind: 'tailwindFormat',
  json: 'jsonFormat',
} as const
