# Developer guide

## Find the UI you want to edit

Start with this table before searching the whole repository. Each feature keeps its layout markup and stylesheet together. Visible text lives in the locale files rather than in layout modules.

| UI area | Markup / interaction | Styles |
| --- | --- | --- |
| App composition | `src/app/App.tsx` | `src/features/workspace/workspace.css` |
| Two-pane layout, shared heights, scrolling | `src/features/workspace/PaletteWorkspace.tsx` | `src/features/workspace/workspace.css` |
| Left toolbar, Base/Accent inputs, export/save footer | `src/features/workspace/PaletteControls.tsx` | `src/features/workspace/workspace.css` |
| Six tab labels, order, arrow-key navigation | `src/features/workspace/WorkspaceTabs.tsx` | `src/features/workspace/workspace.css` |
| HEX inputs and RGB popovers | `src/features/palette/ColorInput.tsx` | `src/features/palette/palette.css` |
| Harmony wheel and its five colors | `src/features/palette/ColorWheel.tsx` | `src/features/palette/palette.css` |
| Preview / 預覽 | `src/features/preview/ThemePreview.tsx`, `samples/Dashboard.tsx`, `samples/Landing.tsx`, `samples/Form.tsx` | `src/features/preview/preview.css` |
| Tuning / 微調 | `src/features/tuning/TuningPanel.tsx` | `src/features/tuning/tuning.css` |
| All color tokens / 完整色票 | `src/features/palette/RoleGrid.tsx` | `src/features/palette/palette.css` |
| More palettes / 更多配色 | `src/features/palette/MorePalettes.tsx`, `PaletteSection.tsx`, `ColorSwatch.tsx` | `src/features/palette/palette.css` |
| Image colors / 圖片取色 | `src/features/image/ImagePalette.tsx` | `src/features/image/image.css` |
| Saved palettes / 已存色板 | `src/features/library/PaletteLibrary.tsx` | `src/features/library/library.css` |
| Language, appearance, desktop preferences | `src/features/settings/AppSettings.tsx`, `DesktopSettings.tsx` | `src/features/settings/settings.css` |
| Screen eyedropper button and feedback | `src/features/picker/ScreenPickerControls.tsx` | Shared button styles |
| Shared buttons, selects, tooltips | Feature markup and `src/shared/Icons.tsx` | `src/shared/controls.css` |
| Semantic theme tokens and fallback colors | `src/color/palette.ts`, `src/app/useAppPalette.ts` | `src/styles/theme.css` |
| Interface text | `src/app/locales/en.ts`, `src/app/locales/zh-TW.ts` | — |

`src/index.css` only imports these stylesheets. Do not append feature-specific rules there.

Example: to change the height of extracted image swatches, edit `.image-color` in `src/features/image/image.css`. To change right-pane alignment for every tab, edit `.workspace-expanded` in `src/features/workspace/workspace.css`.

## Directory responsibilities

```text
src/
  main.tsx                 Renderer entry point
  app/                     App composition, palette state, theme, and locale providers
  color/                   Pure palette/harmony calculations, exports, and their tests
  features/
    workspace/             Two-pane shell, left controls, tab navigation
    palette/               Color inputs, wheel, token grid, additional palette families
    preview/               Preview frame and separate sample layouts
    tuning/                Brightness and OKLCH editing
    image/                 Upload UI and local image extraction lifecycle
    library/               Saved palette UI, validation, migration, persistence
    settings/              Toolbar preferences and restart palette handoff
    picker/                Renderer picker status and preload bridge subscription
  shared/                  Reusable icons, controls, clipboard feedback
  styles/                  Global theme tokens and browser defaults
  types/                   Electron bridge and third-party type declarations

electron/
  main.mjs                 Desktop entry point and app composition
  preload.cjs              Renderer-facing desktop bridges
  picker/                  Picker routing, capture adapters, pixel geometry, overlay
    portal/                D-Bus requests for Wayland Screenshot and PickColor
  platform/                Display-mode preference/restart and desktop identity

scripts/                   Development, theme verification, palette generation
docs/                      Developer documentation
assets/                    Packaged app icons
release/                   Generated packages; do not edit as source
```

Tests stay next to the code they exercise. `pnpm test` discovers nested TypeScript and Electron tests.

## State and dependency flow

- `App.tsx` connects features. `usePaletteWorkspace.ts` owns edits, exact saved snapshots, and restart recovery. UI modules receive values and callbacks rather than reaching into one another's state.
- `src/color` contains pure calculations. It does not import React, UI features, Electron, or browser storage.
- `savedPalettes.ts` owns library validation and persistence. Its storage keys and snapshot version remain stable so existing palettes survive refactors.
- `useImagePalette.ts` owns decoding, bounded sampling, stale-request protection, and object-URL cleanup. `ImagePalette.tsx` owns upload controls and display feedback.
- `useScreenPicker.ts` subscribes to the narrow preload interface declared in `src/types/electron.d.ts`. Renderer code never imports Electron directly.
- `electron/picker/color-picker.mjs` chooses a capture adapter from the desktop session. X11 compatibility changes the app window backend; a Wayland session still uses the portal picker.

## Layout invariants

On a two-column desktop layout, the left palette determines the shared row height. The right pane uses size containment, equal top/bottom padding, and an independently scrollable active panel. Apply geometry to every expanded workspace, not a subset of tab names. Below 701px the panes stack and return to natural heights.

Panels remain mounted when hidden. This preserves the chosen preview sample, uploaded image, and local feedback across tab switches. Do not conditionally mount the active panel without accounting for that state.

The single-monitor transparent eyedropper overlay intentionally has a hidden screenshot image until capture requires bitmap presentation. `picker:ready` gates selection; cancel must still work while capture is pending. Keep these lifecycle guards when adjusting the overlay UI.

## English comments

Use a short module comment to identify the visible area and its stylesheet. Add comments for reasons and invariants, especially storage compatibility, cancellation, native window lifetime, DPI mapping, and capture readiness. Avoid comments that merely repeat the next line. Translated interface copy belongs in locale files and should not be converted into English source comments.

## Checks after changes

```sh
pnpm lint
pnpm test
pnpm build
pnpm verify:theme
```

For layout work, also open all six tabs in both languages and themes. Check RGB editing, image extraction/application, save/load/delete, copied exports, narrow layouts, and scrolling with a full library. For Electron file moves, smoke-test the packaged app and both capture adapters so overlay/preload paths are verified as well.
