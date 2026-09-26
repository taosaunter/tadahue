import {
  app,
  BrowserWindow,
  Menu,
  screen,
  ipcMain,
  globalShortcut,
  nativeImage,
  nativeTheme,
} from "electron";
import { execFile } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      preload: join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: nativeTheme.shouldUseDarkColors ? "#120b0b" : "#fff7f7",
  });

  // Dev: connect to Vite dev server. Prod: load built files.
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
    win.webContents.openDevTools();
  } else {
    win.loadFile(join(__dirname, "../dist/index.html"));
  }

  return win;
}

const PICKER_SHOT = "/tmp/color-palette-picker.png";

function captureScreen() {
  return new Promise((resolve, reject) => {
    execFile(
      "spectacle",
      ["-b", "-n", "-o", PICKER_SHOT],
      { timeout: 10000 },
      (err) => {
        if (err) return reject(err);
        const img = nativeImage.createFromPath(PICKER_SHOT);
        if (img.isEmpty()) return reject(new Error("screenshot is empty"));
        const bmp = img.toBitmap();
        resolve({
          bitmap: bmp,
          width: img.getSize().width,
          height: img.getSize().height,
        });
      },
    );
  });
}

let picker = null; // { bitmap, width, height, scale, mainWin, overlay, lastHex }

async function startPicker(locale = "en") {
  console.log("[picker] startPicker called");
  if (picker) return;

  const mainWin =
    BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
  if (!mainWin) return;

  const display = screen.getPrimaryDisplay();
  const scale = display.scaleFactor;

  mainWin.hide();
  await new Promise((r) => setTimeout(r, 150));

  let shot;
  try {
    shot = await captureScreen();
    console.log("[picker] captured", shot.width, "x", shot.height);
  } catch (e) {
    console.error("[picker] capture failed:", e);
    mainWin.show();
    mainWin.webContents.send("picker:done", { hex: null });
    return;
  }
  const { bitmap, width, height } = shot;

  const wa = screen.getPrimaryDisplay().workArea;
  const overlay = new BrowserWindow({
    x: wa.x,
    y: wa.y,
    width: wa.width,
    height: wa.height,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    backgroundColor: "#00000000",
    webPreferences: {
      preload: join(__dirname, "overlay-preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  overlay.loadFile(join(__dirname, "overlay.html"), { query: { locale } });
  overlay.setAlwaysOnTop(true, "screen-saver");

  picker = { bitmap, width, height, scale, mainWin, overlay, lastHex: null };

  console.log(
    "[picker] Enter:",
    globalShortcut.register("Enter", () => finishPicker(true)),
  );
  console.log(
    "[picker] Escape:",
    globalShortcut.register("Escape", () => finishPicker(false)),
  );
}

function pickerPreview(sx, sy) {
  if (!picker) return;
  const px = Math.round(sx * picker.scale);
  const py = Math.round(sy * picker.scale);
  if (px < 0 || py < 0 || px >= picker.width || py >= picker.height) return;

  const N = 9;
  const half = Math.floor(N / 2);
  const grid = [];
  for (let r = -half; r <= half; r++) {
    for (let c = -half; c <= half; c++) {
      const gx = Math.min(picker.width - 1, Math.max(0, px + c));
      const gy = Math.min(picker.height - 1, Math.max(0, py + r));
      const gi = (gy * picker.width + gx) * 4;
      grid.push(
        "#" +
          [picker.bitmap[gi + 2], picker.bitmap[gi + 1], picker.bitmap[gi]]
            .map((v) => v.toString(16).padStart(2, "0"))
            .join(""),
      );
    }
  }

  const i = (py * picker.width + px) * 4;
  const hex =
    "#" +
    [picker.bitmap[i + 2], picker.bitmap[i + 1], picker.bitmap[i]]
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("");
  picker.lastHex = hex;
  picker.overlay.webContents.send("preview:color", {
    hex,
    grid,
    cx: half,
    cy: half,
  });
}

function finishPicker(commit) {
  console.log(`[picker] finishPicker(${commit}) called`);
  if (!picker) {
    console.log("[picker] picker is null, ignoring");
    return;
  }
  const { mainWin, overlay, bitmap, width, height, scale, lastHex } = picker;

  globalShortcut.unregisterAll();
  overlay.destroy();

  let hex = null;
  if (commit) {
    hex = lastHex;
    if (!hex) {
      const pt = screen.getCursorScreenPoint();
      const px = Math.round(pt.x * scale);
      const py = Math.round(pt.y * scale);
      if (px >= 0 && py >= 0 && px < width && py < height) {
        const i = (py * width + px) * 4;
        hex =
          "#" +
          [bitmap[i + 2], bitmap[i + 1], bitmap[i]]
            .map((v) => v.toString(16).padStart(2, "0"))
            .join("");
      }
    }
  }

  picker = null;
  mainWin.show();
  mainWin.webContents.send("picker:done", { hex });
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);

  createWindow();
  ipcMain.on("picker:start", (_event, locale) =>
    startPicker(locale === "zh-TW" ? "zh-TW" : "en"),
  );
  ipcMain.on("picker:move", (_e, { x, y }) => pickerPreview(x, y));
  ipcMain.on("picker:pick", () => finishPicker(true));
  ipcMain.on("picker:cancel", () => finishPicker(false));
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
app.on("will-quit", () => globalShortcut.unregisterAll());
