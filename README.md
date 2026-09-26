# Color Palette

## 簡介 | Overview

輸入一個 HEX 顏色，生成 Tailwind 風格色階、配色方案與 OKLCH light/dark 主題色板，並提供 WCAG 對比度自檢。

Enter a HEX color to generate Tailwind-style scales, color schemes, and OKLCH light/dark theme tokens with WCAG contrast checks.

輸入的顏色會即時套用到整個應用，也能在預覽面板切換 `balanced`、`pastel`、`vintage` 三種風格。預覽支援 `LIGHT / DARK / BOTH`，滿意後可複製 CSS 變數。

The seed color is applied live to the app. Preview and switch between `balanced`, `pastel`, and `vintage` styles, then copy the generated CSS variables.

## 技術棧 | Stack

- React 19 + TypeScript
- Vite 8 + Tailwind CSS 4
- `culori` for OKLCH conversion and contrast calculation
- Electron desktop shell

## 開發指令 | Commands

| 指令 / Command        | 作用 / Purpose                                          |
| --------------------- | ------------------------------------------------------- |
| `pnpm dev`            | 啟動 Vite 開發伺服器 / Start the Vite dev server        |
| `pnpm build`          | 型別檢查並建立 production bundle / Type-check and build |
| `pnpm preview`        | 預覽 `dist/` / Preview the production build             |
| `pnpm test`           | 執行 `node:test` 測試 / Run tests                       |
| `pnpm lint`           | 執行 ESLint / Run ESLint                                |
| `pnpm verify:theme`   | 執行瀏覽器回歸檢查 / Run browser regression checks      |
| `pnpm electron:dev`   | Electron + Vite HMR                                     |
| `pnpm electron:prod`  | 建置後啟動 Electron / Build and run Electron            |
| `pnpm electron:build` | 建立 Linux AppImage / Build the Linux AppImage          |

## 主題色怎麼改 | Customize a theme

```bash
node scripts/generate-palette.mjs "#新種子色"
```

把輸出的 `@theme`、`:root`、`:root.light`、`:root.dark` 貼進 `src/index.css`，或直接使用預覽面板的「複製 CSS 變數」。執行期預覽會由 `src/palette.ts` 依種子色即時生成。

Paste the generated `@theme`, `:root`, `:root.light`, and `:root.dark` blocks into `src/index.css`, or use “Copy CSS variables” in the preview. Runtime previews are generated from the seed by `src/palette.ts`.

## 專案結構 | Project structure

- `src/colors.ts` — 一般色階與色彩方案 / General scales and color schemes
- `src/palette.ts` — 主題 token、風格 preset、OKLCH 與 WCAG / Theme tokens, style presets, OKLCH, and WCAG
- `src/components/` — React UI 與主題預覽 / React UI and theme preview
- `scripts/` — 色板產生器與瀏覽器回歸檢查 / Palette generator and browser checks
- `electron/` — Electron 主程序與取色器 / Electron main process and eyedropper

## 不使用 Docker | No Docker

這是本機前端／Electron 小工具，不需要常駐服務、資料庫或容器；使用 pnpm 即可開發與建置。

This is a local frontend/Electron utility. It has no server, database, or container requirement; pnpm is enough to develop and build it.
