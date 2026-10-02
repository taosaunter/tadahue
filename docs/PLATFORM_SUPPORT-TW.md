# 平台支援說明

[English](PLATFORM_SUPPORT.md)

## 套件格式

| 平台 | 套件 |
| --- | --- |
| Linux | AppImage |
| Windows | NSIS 安裝程式或 portable 版本 |
| macOS | DMG |

## 螢幕吸管

放大鏡取樣的是啟動取色時取得的靜態畫面，不會持續擷取影片。使用放大鏡時，左鍵或 **Enter** 取色；方向鍵可逐像素微調；右鍵或 **Esc** 取消。

### Linux Wayland

- TadaHue 透過 XDG Desktop Portal 取得單張截圖。權限提示及是否記住授權由桌面環境管理。
- 單螢幕且截圖尺寸相符時，透明覆蓋層會讓桌面維持可見，但放大鏡取樣的仍是截圖。多螢幕或尺寸不符時，會顯示縮放後的截圖預覽。
- 如果無法截圖，且 Portal 提供 `Screenshot.PickColor`，TadaHue 會提供「**使用系統原生吸管（無放大鏡）**」作為替代方式。

### Linux X11、Windows 與 macOS

這些工作階段使用 Electron 的 `desktopCapturer`，不需要外部截圖工具。截圖只保留在記憶體中，取色結束後即釋放。多螢幕依顯示器 ID 對應，並依截圖實際尺寸換算高 DPI 螢幕的座標。

macOS 請在「**系統設定 → 隱私權與安全性 → 螢幕錄製**」允許 TadaHue。部分 macOS 版本會將此項目稱為「**螢幕與系統音訊錄製**」。若系統要求，請重新啟動應用程式。

## Linux X11 相容模式

開啟「**桌面設定 → X11 相容模式**」，再選擇「**重新啟動並套用**」。系統需提供 XWayland。此選項會切換 Electron 的顯示後端；若 TadaHue 仍在 Wayland 工作階段中執行，螢幕取色會繼續使用截圖 Portal。手動指定 `--ozone-platform` 啟動參數時，會優先採用該參數。

