# TadaHue

<div align="right">
  <a href="../README.md">English</a>
</div>

桌面配色工具，協助你探索配色關係、建立色板並預覽主題。

![TadaHue 桌面應用程式，顯示配色工具與主題預覽](../assets/tadahue_001.webp)

## 功能

- 拖曳五色色輪，探索不同配色關係。
- 產生 50–950 色階，以及互補色、類似色、單色、分裂互補色、三角色與陰影色。
- 以 OKLCH 微調色相、明度和彩度，並選擇平衡、粉彩或復古風格。
- 在儀表板、形象頁和表單版面預覽亮色與暗色主題。
- 從 PNG、JPEG、WebP 和 GIF 圖片擷取最多五個代表色；圖片只在本機處理。
- 在本機儲存最多 20 組色板，並複製 CSS、Tailwind 設定或 JSON。
- 使用桌面版螢幕吸管，從畫面任意位置取色。

## 桌面平台

| 平台    | 套件格式                 | 螢幕吸管                            |
| ------- | ------------------------ | ----------------------------------- |
| Linux   | AppImage                 | X11 擷取或 Wayland 截圖 Portal      |
| Windows | NSIS 安裝程式或 portable | Electron 螢幕擷取                   |
| macOS   | DMG                      | Electron 螢幕擷取；需要螢幕錄製權限 |

權限需求與 Linux 顯示選項請參閱[平台支援說明](PLATFORM_SUPPORT-TW.md)。

## 隱私

TadaHue 不含分析、遙測或崩潰回報功能，也沒有帳號或雲端同步。圖片取色與已存色板都留在你的裝置上。

## 開發

需要 Node.js 與 pnpm。

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
pnpm test
pnpm verify:theme
```

建置 Windows 或 macOS 套件時，請使用對應平台的電腦或 CI runner。

## 授權

TadaHue 採用 MIT License。Linux Wayland 支援使用 `@homebridge/dbus-native`；其依賴套件授權列於[第三方授權 notices](THIRD_PARTY_NOTICES.md)。
