// X11/Windows/macOS capture adapter: per-display thumbnails, overlay ownership, and session cleanup.
import { captureFrame, sample } from "./picker-frame.mjs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const overlayPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "overlay.html",
);
const displayEvents = ["display-added", "display-removed"];

export function createScreenPicker(
  {
    BrowserWindow,
    desktopCapturer,
    screen,
    ipcMain,
    globalShortcut,
    systemPreferences,
  },
  {
    platform = process.platform,
    waitForHide = () => new Promise((resolve) => setTimeout(resolve, 150)),
    captureTimeoutMs = 30000,
  } = {},
) {
  let session = null;

  function finish(hex = null, error) {
    if (!session) return;
    const current = session;
    session = null;
    clearTimeout(current.captureTimeout);
    current.mainWin.removeListener("closed", cancel);
    for (const event of displayEvents) screen.removeListener(event, cancel);
    screen.removeListener("display-metrics-changed", onDisplayMetricsChanged);
    for (const shortcut of current.shortcuts)
      globalShortcut.unregister(shortcut);
    for (const overlay of current.overlays.keys()) {
      if (!overlay.isDestroyed()) overlay.destroy();
    }
    current.overlays.clear();
    if (!current.mainWin.isDestroyed()) {
      current.mainWin.show();
      current.mainWin.webContents.send(
        "picker:done",
        error ? { hex, error } : { hex },
      );
    }
  }

  function cancel() {
    finish();
  }

  function onDisplayMetricsChanged(_event, _display, metrics) {
    // Work-area changes (for example an auto-hiding dock) do not invalidate a
    // capture of the full display. Cancel only when its pixel mapping changes.
    if (
      metrics.some((metric) =>
        ["bounds", "scaleFactor", "rotation"].includes(metric),
      )
    )
      cancel();
  }

  function preview(overlay, point) {
    const frame = session?.overlays.get(overlay);
    const color = frame && sample(frame, point);
    if (color) overlay.webContents.send("preview:color", color);
  }

  function pickAtCursor() {
    const cursor = screen.getCursorScreenPoint();
    for (const frame of session?.overlays.values() ?? []) {
      const color = sample(frame, {
        x: cursor.x - frame.bounds.x,
        y: cursor.y - frame.bounds.y,
      });
      if (color) {
        finish(color.hex);
        return;
      }
    }
  }

  function overlayFor(event) {
    return [...(session?.overlays.keys() ?? [])].find(
      (overlay) => overlay.webContents === event.sender,
    );
  }

  ipcMain.on("picker:move", (event, point) => {
    const overlay = overlayFor(event);
    if (overlay) preview(overlay, point);
  });
  ipcMain.on("picker:pick", (event, point) => {
    const overlay = overlayFor(event);
    const color = overlay && sample(session.overlays.get(overlay), point);
    if (color) finish(color.hex);
  });
  ipcMain.on("picker:cancel", (event) => {
    if (overlayFor(event)) cancel();
  });
  ipcMain.on("picker:confirm", (event) => {
    if (overlayFor(event)) pickAtCursor();
  });

  async function start(mainWin, locale = "en") {
    if (session || mainWin.isDestroyed()) return;
    // Reserve the session before awaiting capture, so repeated requests cannot
    // create another set of overlays while the app is hidden.
    const current = { mainWin, overlays: new Map(), shortcuts: [] };
    session = current;
    mainWin.once("closed", cancel);
    for (const event of displayEvents) screen.on(event, cancel);
    screen.on("display-metrics-changed", onDisplayMetricsChanged);

    try {
      if (globalShortcut.register("Escape", cancel))
        current.shortcuts.push("Escape");
      const permission = () =>
        platform === "darwin"
          ? systemPreferences.getMediaAccessStatus("screen")
          : "granted";
      if (["denied", "restricted"].includes(permission()))
        throw new Error("screen-permission");

      mainWin.hide();
      await waitForHide();
      if (session !== current) return;
      const displays = screen.getAllDisplays();
      const capture = desktopCapturer.getSources({
        types: ["screen"],
        thumbnailSize: {
          width: Math.max(
            ...displays.map((display) =>
              Math.ceil(display.bounds.width * display.scaleFactor),
            ),
          ),
          height: Math.max(
            ...displays.map((display) =>
              Math.ceil(display.bounds.height * display.scaleFactor),
            ),
          ),
        },
        fetchWindowIcons: false,
      });
      const sources = await Promise.race([
        capture,
        new Promise((_resolve, reject) => {
          current.captureTimeout = setTimeout(
            () => reject(new Error("Screen capture timed out")),
            captureTimeoutMs,
          );
        }),
      ]);
      clearTimeout(current.captureTimeout);
      if (session !== current) return;
      // A first capture can prompt for consent. Do not sample a desktop-only
      // image returned by macOS while permission is still missing.
      if (permission() !== "granted") throw new Error("screen-permission");

      const frames = [];
      for (const display of displays) {
        const source =
          sources.find((item) => item.display_id === String(display.id)) ??
          (displays.length === 1 &&
          sources.length === 1 &&
          !sources[0].display_id
            ? sources[0]
            : null);
        // Never guess source order: an anonymous PipeWire capture on multiple
        // monitors cannot safely be mapped to desktop coordinates.
        if (source && !source.thumbnail.isEmpty())
          frames.push(captureFrame(display, source.thumbnail));
      }
      if (!frames.length) throw new Error("No matching screen capture");

      await Promise.all(
        frames.map(async (frame) => {
          const overlay = new BrowserWindow({
            ...frame.bounds,
            show: false,
            frame: false,
            transparent: true,
            alwaysOnTop: true,
            skipTaskbar: true,
            resizable: false,
            movable: false,
            fullscreenable: false,
            enableLargerThanScreen: true,
            hasShadow: false,
            backgroundColor: "#00000000",
            webPreferences: {
              preload: join(dirname(overlayPath), "overlay-preload.cjs"),
              contextIsolation: true,
              nodeIntegration: false,
            },
          });
          current.overlays.set(overlay, frame);
          overlay.on("closed", () => {
            if (session === current) cancel();
          });
          overlay.webContents.on("render-process-gone", () => {
            if (session === current) cancel();
          });
          overlay.setAlwaysOnTop(true, "screen-saver");
          if (platform === "darwin")
            overlay.setVisibleOnAllWorkspaces(true, {
              visibleOnFullScreen: true,
            });
          await overlay.loadFile(overlayPath, { query: { locale } });
          if (session !== current) return;
          overlay.setBounds(frame.bounds);
        }),
      );
      if (session !== current) return;

      const cursor = screen.getCursorScreenPoint();
      let focused;
      for (const [overlay, frame] of current.overlays) {
        overlay.showInactive();
        const point = {
          x: cursor.x - frame.bounds.x,
          y: cursor.y - frame.bounds.y,
        };
        if (sample(frame, point)) {
          preview(overlay, point);
          overlay.webContents.send("preview:position", point);
          focused = overlay;
        }
      }
      (focused ?? current.overlays.keys().next().value).show();
      if (globalShortcut.register("Enter", pickAtCursor))
        current.shortcuts.push("Enter");
    } catch (error) {
      if (session !== current) return;
      console.error("[picker] capture failed:", error);
      const denied =
        platform === "darwin" &&
        systemPreferences.getMediaAccessStatus("screen") !== "granted";
      finish(null, denied ? "screen-permission" : "capture-failed");
    }
  }

  return {
    start,
    cancel,
    get isActive() {
      return Boolean(session);
    },
  };
}
