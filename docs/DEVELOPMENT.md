# Developer guide

## Find the UI you want to edit

Start with this table before searching the whole repository. Each feature keeps its layout markup and stylesheet together. Visible text lives in the locale files rather than in layout modules.

| UI area | Markup / interaction | Styles |
| --- | --- | --- |
| App composition | `src/app/App.tsx` | `src/features/workspace/workspace.css` |
| Three-column workspace, shared heights, dialogs, tuning tabs and reset | `src/features/workspace/PaletteWorkspace.tsx` | `src/features/workspace/workspace.css` |
| Color sources, base/background input and fixed-background mode | `src/features/workspace/PaletteControls.tsx` | `src/features/workspace/workspace.css` |
| Independent tool/result tab labels, order, arrow-key navigation | `src/features/workspace/tabs.ts`, `WorkspaceTabs.tsx` | `src/features/workspace/workspace.css` |
| HEX inputs and RGB popovers | `src/features/palette/ColorInput.tsx` | `src/features/palette/palette.css` |
| Linked wheel handles and five palette colors | `src/features/palette/ColorWheel.tsx`, `HarmonyPalette.tsx` | `src/features/palette/palette.css` |
| Preview samples, style dropdown and theme toggle | `src/features/preview/ThemePreview.tsx`, `samples/Dashboard.tsx`, `samples/Landing.tsx`, `samples/Form.tsx` | `src/features/preview/preview.css` |
| Contrast checks / 對比檢查 | `src/features/preview/ContrastPanel.tsx` | `src/features/preview/preview.css` |
| Tuning / 微調 | `src/features/tuning/TuningPanel.tsx` | `src/features/tuning/tuning.css` |
| All color tokens / 完整色票 | `src/features/palette/RoleGrid.tsx` | `src/features/palette/palette.css` |
| More palettes / 更多配色 | `src/features/palette/MorePalettes.tsx`, `PaletteSection.tsx`, `ColorSwatch.tsx` | `src/features/palette/palette.css` |
| Image colors / 圖片取色 | `src/features/image/ImagePalette.tsx` | `src/features/image/image.css` |
| Saved palettes / 已存色板 | `src/features/library/PaletteLibrary.tsx` | `src/features/library/library.css` |
| Language, appearance, desktop preferences | `src/features/settings/AppSettings.tsx`, `DesktopSettings.tsx` | `src/features/settings/settings.css` |
| Screen eyedropper button and feedback | `src/features/picker/ScreenPickerControls.tsx` | Shared button styles |
| Shared buttons, selects, tooltips | `src/shared/ui/`, feature markup and Lucide icons | `src/shared/controls.css` |
| Semantic theme tokens and fallback colors | `src/color/palette.ts`, `src/app/usePaletteWorkspace.ts` | `src/styles/theme.css` |
| Desktop startup dimensions and work-area constraints | `electron/workspace-window.mjs`, `electron/main.mjs` | — |
| Interface text | `src/app/locales/en.ts`, `src/app/locales/zh-TW.ts` | — |

`src/index.css` only imports these stylesheets. Do not append feature-specific rules there.

Example: to change extracted image swatches, edit `.image-color` in `src/features/image/image.css`. They share one row with the base-color action and shrink to fit the source area. To change workspace alignment, edit `.workspace`, `.controls-pane`, `.results-pane`, and `.advanced-controls` in `src/features/workspace/workspace.css`.

## Directory responsibilities

```text
src/
  main.tsx                 Renderer entry point
  app/                     App composition, palette state, theme, and locale providers
  color/                   Pure palette/harmony calculations, exports, and their tests
  features/
    workspace/             Three-column shell, color controls, navigation, export
    palette/               Color inputs, wheel, token grid, additional palette families
    preview/               Preview samples and the separate contrast panel
    tuning/                Brightness and OKLCH editing
    image/                 Upload UI and local image extraction lifecycle
    library/               Saved palette UI, validation, migration, persistence
    settings/              Toolbar preferences and restart palette handoff
    picker/                Renderer picker status and preload bridge subscription
  shared/                  Reusable UI, controls, clipboard feedback
  styles/                  Global theme tokens and browser defaults
  types/                   Electron bridge and third-party type declarations

electron/
  main.mjs                 Desktop entry point and app composition
  preload.cjs              Renderer-facing desktop bridges
  workspace-window.mjs     Startup content dimensions and display-bound geometry
  picker/                  Picker routing, capture adapters, pixel geometry, overlay
    portal/                D-Bus requests for Wayland Screenshot and PickColor
  platform/                Display-mode preference/restart and desktop identity

scripts/                   Development, theme verification, palette generation
docs/                      Localized README, platform support, developer guide
THIRD_PARTY_NOTICES.md      Canonical dependency and font notices; packaged with the app
PRODUCT.md                 Product scope and principles
DESIGN.md                  Interface conventions and layout reference
notes/                     Local research; ignored by Git
assets/                    Packaged app icons
release/                   Generated packages; do not edit as source
```

Tests stay next to the code they exercise. `pnpm test` discovers nested TypeScript and Electron tests.

## shadcn/ui

`components.json` configures the Base Nova style, Lucide icons, and Tailwind v4. Add only the components needed with `pnpm exec shadcn add <component>`; generated UI goes in `src/shared/ui`, and `@/` resolves to `src/`. The shared `cn` helper is exported from `src/shared/utils.ts`.

`src/styles/theme.css` maps shadcn color utilities to the existing generated palette with `@theme inline`, so they follow app theme changes and scoped preview colors. Keep these mappings when adding components; do not replace them with the registry's default neutral palette. Animation utilities and shadcn variants are imported by `src/index.css`.

## State and dependency flow

- `App.tsx` connects features. `usePaletteWorkspace.ts` owns edits, exact saved snapshots, and restart recovery. UI modules receive values and callbacks rather than reaching into one another's state.
- Generation modes share one `hex` input. In background mode, `generateThemePalette` receives that same value as its fixed-background argument; there is no second editable background state. Screen picking uses `workspace.changeSeed`, so it updates the same input in both modes. Switching mode clears the loaded palette and regenerates from the current input.
- In background mode, editing the accent preserves the base/background rather than applying the usual reverse harmony link. Editing the base or its brightness updates the background; OKLCH token tuning preserves it.
- `src/color` contains pure calculations. It does not import React, UI features, Electron, or browser storage.
- `savedPalettes.ts` owns library validation and persistence. Its storage keys and snapshot version remain stable so existing palettes survive refactors. The optional snapshot `background` remains for export and compatibility. Loading or restarting an older background palette uses `snapshot.background ?? snapshot.seed` for the shared input and retains its exact saved tokens until an edit or mode change triggers regeneration.
- `useImagePalette.ts` owns decoding, bounded sampling, stale-request protection, and object-URL cleanup. `ImagePalette.tsx` owns upload controls and display feedback.
- `useScreenPicker.ts` subscribes to the narrow preload interface declared in `src/types/electron.d.ts`. Renderer code never imports Electron directly.
- `electron/picker/color-picker.mjs` chooses a capture adapter from the desktop session. X11 compatibility changes the app window backend; a Wayland session still uses the portal picker.

## Layout invariants

The renderer always uses the unified workspace. Desktop startup content size is 1120 × 900px, with a 356px minimum width and 520px minimum height. `workspace-window.mjs` accounts for window decorations, preserves the current height within the display work area, and clamps size and position. The renderer requests initialization through `window.workspace?.setExpanded(true)`; that bridge name is retained, but there is no compact-layout toggle. Restart Electron after changing main-process geometry.

Above 1100px, the workspace has a 272px color editor, flexible preview, and 272px tuning column. The viewport holds the header and workspace; source switching and tool tabs do not resize these columns. Desktop padding and gaps are 24px, reducing to 20px at heights of 800px or less. At 1100px or less, editor, preview, and library use tabs; color and tuning controls remain side by side until 680px, then stack. Small windows retain internal scrolling so controls stay reachable.

`tabs.ts` defines the compact workspace tabs (Colors, Preview, Saved palettes), tuning tabs (Tuning, All tokens, More palettes), preview samples (Website, Form, Dashboard), and export formats. Advanced tuning is always visible in the editor. Its reset icon sits outside the tab list. Contrast checks and exports open side sheets. The style dropdown and single preview-theme toggle share the preview toolbar; app appearance remains independent.

The harmony wheel has two linked handles for complementary mode and three for split-complementary or triadic mode, alongside five copyable palette colors. Token/family swatches are 32 × 32px with 6px gaps; image swatches retain a 32px height and share a row with a single base-color action. The shared token/family grid caps its width at 260px and wraps. Keep keyboard focus, accessible color labels, and copy feedback when changing swatch density.

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

For layout work, check every workspace, tuning, and preview tab in both languages and themes. Check the single preview-theme toggle, style dropdown, reset icon, fixed-background checkbox, wheel keyboard controls, RGB editor, image extraction/application, save/load/delete, copied exports, and contrast/export sheets. Inspect 1120 × 900, 1280 × 720, and narrow 356–390px layouts for overflow; both website-sample columns should remain visible. For Electron file moves, smoke-test the packaged app and both capture adapters so overlay/preload paths are verified as well.

## Before pushing or releasing

- Keep `pnpm-lock.yaml` with dependency changes. Do not add the project itself as a `link:` dependency: that makes desktop packages include old builds again.
- Keep `dist/`, `release/`, local notes, environment files, and credentials out of Git. AppImage/installer binaries belong in GitHub Releases.
- Keep both READMEs and their relative links current. Dependency and font notices have one canonical copy at the repository root because desktop packaging includes that path.
- Run the checks above. `verify:theme` uses a separate headless Chromium profile; set `CHROME=/path/to/chromium` if a Playwright browser is not installed.
- Build Windows and macOS packages on their matching platform. Their support remains unverified until someone tests them; see the README request for platform testers.
