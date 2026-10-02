// Wayland magnifier adapter: hide app, request a portal still image, then gate selection on overlay readiness.
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { captureFrame, sample } from "./picker-frame.mjs";
import { capturePortalScreenshot } from "./portal/portal-screenshot.mjs";

const directory = dirname(fileURLToPath(import.meta.url));

export function createScreenshotPicker(
  { app, nativeImage, BrowserWindow, ipcMain, screen },
  {
    capture = capturePortalScreenshot,
    // hide() acknowledges the native visibility change before compositor fade
    // effects necessarily finish. Keep those transient pixels out of the PNG.
    waitForHide = () => new Promise((resolve) => setTimeout(resolve, 650)),
    imageReadyTimeoutMs = 5000,
  } = {},
) {
  let session;
  function finish(hex = null, error) {
    if (!session) return;
    const current = session;
    session = null;
    current.controller.abort();
    clearTimeout(current.imageReadyTimeout);
    current.mainWin.removeListener("closed", cancel);
    current.mainContents.removeListener("render-process-gone", cancel);
    for (const name of ["display-added", "display-removed"])
      screen.removeListener(name, cancel);
    screen.removeListener("display-metrics-changed", onMetricsChanged);
    if (current.overlay && !current.overlay.isDestroyed())
      current.overlay.destroy();
    current.frame = null;
    if (!current.mainWin.isDestroyed() && !current.mainContents.isDestroyed()) {
      current.mainWin.show();
      current.mainContents.send(
        "picker:done",
        error ? { hex, error } : { hex },
      );
    }
  }
  function cancel() {
    finish();
  }
  function onMetricsChanged(_event, _display, metrics) {
    if (
      metrics.some((metric) =>
        ["bounds", "scaleFactor", "rotation"].includes(metric),
      )
    )
      cancel();
  }
  function owns(event) {
    return session?.overlay && event.sender === session.overlay.webContents;
  }
  function pick(event, point) {
    if (!owns(event) || !session.selectionReady || !session.frame) return;
    const color = sample(session.frame, point);
    if (color) finish(color.hex);
  }
  ipcMain.on("picker:ready", (event) => {
    if (!owns(event) || !session.awaitingImage) return;
    session.awaitingImage = false;
    session.selectionReady = true;
    clearTimeout(session.imageReadyTimeout);
    session.overlay.show();
  });
  ipcMain.on("picker:image-error", (event) => {
    if (owns(event)) finish(null, "screenshot-unavailable");
  });
  ipcMain.on("picker:move", (event, point) => {
    // A hidden native surface can already emit pointer events while its
    // renderer loads and the compositor/capture is still being awaited.
    if (!owns(event) || !session.frame) return;
    const color = sample(session.frame, point);
    if (color) session.overlay.webContents.send("preview:color", color);
  });
  ipcMain.on("picker:pick", pick);
  ipcMain.on("picker:confirm", pick);
  ipcMain.on("picker:cancel", (event) => {
    if (owns(event)) cancel();
  });

  return {
    get isActive() {
      return Boolean(session);
    },
    cancel,
    async start(mainWin, locale = "en") {
      if (session || mainWin.isDestroyed()) return;
      // Keep the contents reference while the BrowserWindow is alive. Electron
      // throws when reading win.webContents after the closed event.
      const current = {
        mainWin,
        mainContents: mainWin.webContents,
        controller: new AbortController(),
      };
      session = current;
      mainWin.once("closed", cancel);
      current.mainContents.once("render-process-gone", cancel);
      for (const name of ["display-added", "display-removed"])
        screen.on(name, cancel);
      screen.on("display-metrics-changed", onMetricsChanged);
      try {
        // Prepare the hidden renderer during the compositor wait instead of
        // adding HTML startup to the time after the screenshot is ready.
        const overlay = (current.overlay = new BrowserWindow({
          show: false,
          paintWhenInitiallyHidden: true,
          frame: false,
          fullscreen: true,
          fullscreenable: true,
          transparent: true,
          hasShadow: false,
          backgroundColor: "#00000000",
          skipTaskbar: true,
          webPreferences: {
            preload: join(directory, "overlay-preload.cjs"),
            contextIsolation: true,
            nodeIntegration: false,
            backgroundThrottling: false,
          },
        }));
        overlay.on("closed", () => {
          if (session === current) cancel();
        });
        overlay.webContents.on("render-process-gone", () => {
          if (session === current) cancel();
        });
        mainWin.hide();
        await Promise.all([
          waitForHide(),
          overlay.loadFile(join(directory, "overlay.html"), {
            query: { locale },
          }),
        ]);
        if (session !== current) return;
        const buffer = await capture({
          app,
          signal: current.controller.signal,
        });
        if (session !== current) return;
        if (!buffer) {
          finish();
          return;
        }
        const image = nativeImage.createFromBuffer(buffer);
        const bounds = image.getSize(1);
        current.frame = captureFrame({ bounds }, image);
        const displays = screen.getAllDisplays();
        // The workspace PNG has no per-output metadata. A transparent overlay
        // is safe only when one display exactly matches its native resolution.
        // Otherwise keep the fitted snapshot, whose coordinates are explicit.
        const display = displays.length === 1 && displays[0];
        const desktop =
          display &&
          Math.abs(bounds.width - display.bounds.width * display.scaleFactor) <=
            1 &&
          Math.abs(
            bounds.height - display.bounds.height * display.scaleFactor,
          ) <= 1;
        current.awaitingImage = true;
        current.imageReadyTimeout = setTimeout(() => {
          if (session === current) finish(null, "screenshot-unavailable");
        }, imageReadyTimeoutMs);
        // On one display the desktop stays visible through the overlay. The
        // bitmap is still the only source of sample pixels, as in the old picker.
        overlay.webContents.send("preview:image", {
          ...bounds,
          presentation: desktop ? "desktop" : "snapshot",
          ...(desktop ? {} : { dataUrl: image.toDataURL() }),
        });
      } catch (cause) {
        if (session !== current) return;
        console.error("[picker] screenshot failed:", cause);
        finish(null, "screenshot-unavailable");
      }
    },
  };
}
