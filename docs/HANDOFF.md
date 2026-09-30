# Color Palette — handoff

更新：2026-09-30

## 產品方向

- 使用者選色後，優先在儀表板、品牌／形象頁、表單情境中直觀看配色效果。
- 桌面介面應更緊湊；可參考 ColorSlurp 的色票速覽與工具分區，但保留本專案的即時 UI 預覽，不照搬其視覺或功能。
- 色輪方向：五個控制點；中間兩個是使用者指定色，外側三個依互補、分裂互補或三角色關係生成。拖曳色輪後即時更新色票和預覽。
- 生成色板只保留 JSON、CSS、Tailwind 複製；移除下載和重複的 CSS 複製入口。
- WCAG 檢查保留在程式內部，不在介面顯示達標標示或長檢查清單。
- 進階微調要能立即看到更新後的 HEX 色票。現有微調以 OKLCH 運算，不應標成 HSL。
- 色板庫精簡為色票預覽與點擊載入，移除主流程中的冗長欄位和操作；載入仍應還原完整色板狀態。

## 目前實作

- 已有 Dashboard、Landing、Form 三種預覽，light／dark／both 顯示，28 個語義角色與 WCAG 內部計算。
- 已有 balanced、pastel、vintage 三種 preset、全域 OKLCH 微調、JSON／CSS／Tailwind 生成和本機色板庫（最多 20 組）。
- 色板 snapshot 保留名稱、備註、風格、微調參數與亮暗 token；舊版 seed HEX 紀錄可轉換。
- 色輪面板採無外框、透明底色，保留 12px 內距與工具列分隔線。圖示按鈕 32px，底部操作對齊左右邊緣。
- 啟動時只顯示左側色輪面板；Electron 內容區寬 356px，展開右側後為 1020px（超出螢幕時限制在可用範圍），啟動內容高度為 560px，展開／收起時高度維持不變。
- 色輪面板頂部依序為吸管、風格下拉、語言、主題、展開／收起；底部為 JSON、CSS、Tailwind、儲存圖示。圖示沿用 `src/components/Icons.tsx`。
- Header 中吸管與風格居左，語言／主題／展開按鈕居右。複製與儲存成功只在圖示上顯示短暫浮動提示；底部不留文字區。輸入框和下拉選單聚焦使用主題色邊框，移除外層黑邊。
- 右側頁籤依序為預覽、微調、完整色票、更多配色、已存色板。每次展開預設顯示預覽；預覽與完整色票跟隨主題按鈕，移除 light／dark／both 選項。
- 完整色票顯示目前主題的 28 色，桌面為 4 行 × 7 列，窄版為 7 行 × 4 列。色票名稱與 HEX 改為懸浮／聚焦提示，保留點擊複製。
- 五點色輪使用 HSV 色相／飽和度；兩個指定色維持 180°（互補）、150°（分裂互補）、120°（三角色）關係，生成色向外增加飽和度與亮度；高飽和度邊界加入小幅色相延展，避免控制點完全重疊。拖曳或方向鍵均可操作。這是本專案的演算法，不宣稱與 Adobe 相同。
- 第二個指定色控制主題 accent；主題 token 仍透過 OKLCH、風格與微調生成。五色色票呈現輸入／harmony 色，微調區 HEX 呈現最終主題角色。
- JSON、CSS、Tailwind 只有複製入口；WCAG 清單和下載已移除。
- 色板庫移至右側頁籤，只有五色色帶、點擊還原和刪除；儲存按鈕位於左側底部；新快照另存配色關係與第二色，舊快照仍可載入。

## 重要位置

- `src/colors.ts`：基礎色階；`src/harmony.ts`、`src/components/ColorWheel.tsx`：五色關係與互動色輪。
- `src/palette.ts`：OKLCH 主題生成、角色、微調與 WCAG 計算。
- `src/paletteExport.ts`：JSON、CSS、Tailwind 輸出。
- `src/savedPalettes.ts`：色板快照驗證、還原及本機儲存（匯入／匯出資料函式保留，沒有 UI 入口）。
- `src/App.tsx`、`src/components/ThemeGenerator.tsx`、`src/components/ThemePreview.tsx`、`src/components/PaletteLibrary.tsx`：主要介面。
- `docs/color-palette-feature-evaluation.md`：目前產品方向與候選項目。
- `docs/reddit-color-pairing-report.md`：研究證據；其中候選建議不等於已確認規格。

## 暫緩項目

局部重生、圖片取色、APCA、Figma 整合、登入與雲端同步目前都不排入近期工作。

## 本輪紀錄

2026-09-30：已實作本輪 UI 整理；未新增套件。`pnpm build` 通過，已檢視收起、展開、頁籤與色票排列。未執行自動化測試，未實測原生 Electron 視窗。原生螢幕取色流程未改動。
