# TadaHue

<div align="right">
  <a href="../README.md">English</a>
</div>

桌面配色工具，協助你探索配色關係、建立色板並預覽主題。

![TadaHue 桌面應用程式，顯示配色工具與主題預覽](../assets/tadahue_001.webp)

## 功能

- 使用兩個連動控制點探索互補色，或以三個控制點探索分裂互補色與三角色配色，並複製色盤中的五組 HEX 色碼。
- 產生完整的 11 階 50–950 色階，以及互補色、類似色、單色、分裂互補色、三角色與陰影色。
- 以 OKLCH 微調色相、明度和彩度，並選擇平衡、粉彩或復古風格。
- 在儀表板、形象頁和表單版面預覽亮色與暗色主題。
- 共用基準色輸入，在一般主題與固定背景的網頁配色之間切換，並於獨立標籤檢查對比。
- 從 PNG、JPEG、WebP 和 GIF 圖片擷取最多五個代表色；圖片只在本機處理。
- 在本機儲存最多 20 組色板，並複製可用於 Tailwind v4 的 CSS、Tailwind v3 設定或 JSON。
- 使用桌面版螢幕吸管，從畫面任意位置取色。

## 桌面平台

| 平台    | 套件格式                 | 螢幕吸管                            |
| ------- | ------------------------ | ----------------------------------- |
| Linux   | AppImage                 | X11 擷取或 Wayland 截圖 Portal      |
| Windows | NSIS 安裝程式或 portable | Electron 螢幕擷取                   |
| macOS   | DMG                      | Electron 螢幕擷取；需要螢幕錄製權限 |

權限需求與 Linux 顯示選項請參閱[平台支援說明](PLATFORM_SUPPORT-TW.md)。

## 徵求 Windows 與 macOS 測試協助

目前只有 Linux AppImage 通過測試。我沒有 Windows 或 macOS 電腦，因此上表列出的 Windows 與 macOS 套件格式尚未經過測試。

如果你有這些平台的電腦，也願意幫忙，歡迎協助建置與測試桌面版。下方的開發與建置指令可作為起點。

無論使用正常或遇到問題，都歡迎透過 [GitHub Issues](https://github.com/taosaunter/tadahue/issues) 分享結果。回報時可以附上：

- 作業系統版本、CPU 架構，以及測試的 TadaHue 版本或 commit。
- 是否能順利建置、安裝與啟動。
- 螢幕吸管及其權限、圖片取色、色板儲存，以及 CSS／Tailwind／JSON 匯出是否正常。
- 若遇到問題，請附上重現步驟、預期與實際結果，以及相關錯誤訊息或截圖。

簡短的測試回報也很有幫助，謝謝你協助完善平台支援！

## 隱私

TadaHue 不含分析、遙測或崩潰回報功能，也沒有帳號或雲端同步。圖片取色與已存色板都留在你的裝置上。

## 開發

需要 Node.js 與 pnpm。元件位置、配色狀態及版面規則請參閱[開發指南](DEVELOPMENT.md)，介面慣例請參閱[設計系統](../DESIGN.md)。

```bash
pnpm install
pnpm dev             # 啟動瀏覽器開發伺服器
pnpm electron:dev    # 啟動桌面版
```

## 建置與檢查

```bash
pnpm build
pnpm electron:build
pnpm lint
pnpm lint:fix
pnpm test
pnpm verify:theme
```

建置 Windows 或 macOS 套件時，請使用對應平台的電腦或 CI runner。

## 授權

TadaHue 採用 MIT License。套件與字型授權請參閱[第三方授權說明](../THIRD_PARTY_NOTICES.md)，其中包含 Linux Wayland 支援使用的 `@homebridge/dbus-native`。
