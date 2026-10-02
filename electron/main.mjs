// Desktop app composition: main window, preload bridges, picker routing, and platform identity.
import {
  app,
  BrowserWindow,
  Menu,
  screen,
  ipcMain,
  globalShortcut,
  desktopCapturer,
  systemPreferences,
  nativeTheme,
  nativeImage,
} from "electron";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { createColorPicker } from "./picker/color-picker.mjs";
import { createDisplayMode } from "./platform/display-mode.mjs";
import {
  ensurePortalIdentity,
  portalAppId,
} from "./platform/portal-identity.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
if (process.platform === "linux") app.setDesktopName(`${portalAppId}.desktop`);
// Guard against Chromium's independent screen-sharing picker.
// RGB controls use the app's popover; screen picking uses our capture adapters.
const disabledFeatures = new Set(
  app.commandLine.getSwitchValue("disable-features").split(",").filter(Boolean),
);
disabledFeatures.add("EyeDropper");
app.commandLine.appendSwitch(
  "disable-features",
  [...disabledFeatures].join(","),
);

const displayMode = createDisplayMode({ app, ipcMain });
const restartingForDisplayMode = displayMode.prepareStartup();
// Wayland panels resolve icons through the desktop entry, not the window's
// icon option. Publish our persistent entry before showing the first window.
const desktopIdentityReady =
  process.platform === "linux" && app.isPackaged
    ? ensurePortalIdentity(app).catch((error) =>
        console.warn("[desktop] integration unavailable:", error),
      )
    : Promise.resolve();

const picker = createColorPicker({
  app,
  nativeImage,
  BrowserWindow,
  desktopCapturer,
  screen,
  ipcMain,
  globalShortcut,
  systemPreferences,
});

function createWindow() {
  const win = new BrowserWindow({
    width: 356,
    minWidth: 356,
    minHeight: 520,
    height: 560,
    useContentSize: true,
    icon: app.isPackaged
      ? join(process.resourcesPath, "tadahue.png")
      : join(__dirname, "../assets/icon-512x512.png"),
    webPreferences: {
      preload: join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: nativeTheme.shouldUseDarkColors ? "#120b0b" : "#fff7f7",
  });
  displayMode.bindWindow(win);

  // Only this window's renderer can request the two supported workspace widths.
  const resizeWorkspace = (event, expanded) => {
    if (event.sender !== win.webContents || typeof expanded !== "boolean")
      return;
    if (win.isFullScreen()) {
      win.once("leave-full-screen", () => resizeWorkspace(event, expanded));
      win.setFullScreen(false);
      return;
    }
    if (win.isMaximized()) win.unmaximize();
    const bounds = win.getBounds();
    const content = win.getContentBounds();
    const frameWidth = bounds.width - content.width;
    const area = screen.getDisplayMatching(bounds).workArea;
    const width = Math.min((expanded ? 1020 : 356) + frameWidth, area.width);
    win.setMinimumSize(356 + frameWidth, 520 + bounds.height - content.height);
    win.setBounds({
      ...bounds,
      width,
      x: Math.max(area.x, Math.min(bounds.x, area.x + area.width - width)),
    });
  };
  ipcMain.on("workspace:expanded", resizeWorkspace);
  win.on("closed", () =>
    ipcMain.removeListener("workspace:expanded", resizeWorkspace),
  );

  // Dev: connect to Vite dev server. Prod: load built files.
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    win.loadFile(join(__dirname, "../dist/index.html"));
  }

  const startPicker = (event, locale, mode) => {
    if (
      event.sender !== win.webContents ||
      event.senderFrame !== win.webContents.mainFrame
    )
      return;
    void picker.start(
      win,
      locale === "zh-TW" ? "zh-TW" : "en",
      mode === "native" ? "native" : "magnifier",
    );
  };
  ipcMain.handle(
    "picker:native-available",
    (event) =>
      event.sender === win.webContents &&
      event.senderFrame === win.webContents.mainFrame &&
      Boolean(picker.nativeAvailable),
  );
  ipcMain.on("picker:start", startPicker);
  win.on("closed", () => {
    ipcMain.removeListener("picker:start", startPicker);
    ipcMain.removeHandler("picker:native-available");
  });

  return win;
}

if (!restartingForDisplayMode)
  app.whenReady().then(async () => {
    Menu.setApplicationMenu(null);
    await desktopIdentityReady;
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
app.on("activate", async () => {
  await desktopIdentityReady;
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
app.on("will-quit", () => globalShortcut.unregisterAll());
