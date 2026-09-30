# Color Palette

## 簡介 | Overview

選擇基準色與強調色，拖曳五色色輪，立即在儀表板、形象頁、表單查看亮／暗主題。

Choose two linked colors, explore a five-color harmony wheel, and preview dashboard, landing page, or form themes in light and dark modes.

啟動時只顯示窄版色輪面板，頂部為吸管、風格（平衡、粉彩、復古）、語言、主題與展開按鈕。展開後視窗加寬，右側提供預覽、微調、完整色票、更多配色、已存色板五個頁籤。預覽跟隨主題切換；微調頁提供亮度與 OKLCH 色相／明度／彩度操作。互補、分裂互補、三角色的兩個指定色會維持色相關係。

色輪底部以圖示複製 JSON、CSS、Tailwind，或儲存色板。完整色票採 4 行 × 7 列（窄版 7 行 × 4 列）；色票名稱與 HEX 使用懸浮／聚焦提示。WCAG 計算保留在內部。色板庫以五色色帶呈現，點擊即可還原完整設定與亮暗 token，最多保存 20 組；舊版 HEX 紀錄仍可載入。

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

把輸出的 `@theme`、`:root`、`:root.light`、`:root.dark` 貼進 `src/index.css`，或直接使用預覽面板的「複製 CSS」。Tailwind config 使用 CSS 變數，因此需與複製的 CSS 一起使用。執行期預覽會由 `src/palette.ts` 依種子色即時生成。

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
