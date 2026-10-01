# TadaHue

> 一款桌面配色工具，可建立和諧色板、產生色階、從圖片擷取顏色，並預覽亮色與暗色主題。

[English](README.md)

## 功能

- 拖曳五色色輪，探索互補色、分裂互補色與三角色配色。
- 產生 Tailwind 風格的 50–950 色階，以及類似色、單色、互補色和陰影色。
- 選擇平衡、粉彩或復古風格，並以 OKLCH 微調色相、明度與彩度。
- 在儀表板、形象頁和表單介面中預覽亮色與暗色主題。
- 從 PNG、JPEG、WebP 或 GIF 圖片擷取最多五個代表色，套用為基準色或強調色。圖片在本機處理，不會上傳。
- 在本機儲存最多 20 組色板，並複製 CSS、Tailwind 設定或 JSON。
- 桌面版提供螢幕吸管，可直接從畫面取色。

## 隱私與資料

- TadaHue 不含使用分析、遙測或崩潰回報功能，不會傳送使用記錄或色彩資料。
- 圖片取色在本機完成；圖片不會上傳。
- 已儲存的色板只保存在本機瀏覽器或桌面應用程式的儲存空間，不使用帳號或雲端同步。

## 開發

需要 Node.js 與 pnpm。

```bash
pnpm install
pnpm dev             # 啟動瀏覽器開發伺服器
pnpm electron:dev    # 啟動 Electron 桌面版
```

## 建置與檢查

```bash
pnpm build
pnpm lint
pnpm test
pnpm verify:theme
pnpm electron:build
```

Electron Builder 已設定以下套件目標：Linux AppImage、Windows NSIS 安裝程式與 portable 版本、macOS DMG。建置 Windows 或 macOS 版本時，建議使用對應平台的電腦或 CI runner。

**平台注意事項：** 螢幕吸管目前透過 Linux 的 `spectacle` 命令擷取畫面，因此這項功能目前只支援已安裝 `spectacle` 的 Linux 桌面環境。圖片取色則在本機瀏覽器端執行。
