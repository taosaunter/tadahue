import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { test } from "node:test";
import { createScreenPicker } from "./screen-picker.mjs";

const primary = {
  id: 1,
  bounds: { x: 0, y: 0, width: 4, height: 3 },
  scaleFactor: 1,
};
const retina = {
  id: 2,
  bounds: { x: -4, y: -3, width: 4, height: 3 },
  scaleFactor: 2,
};

function source(
  display,
  width = 4,
  height = 3,
  displayId = String(display.id),
) {
  const bitmap = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Known BGRA pixels: RGB = (display ID, x, y).
      bitmap.set([y, x, display.id, 255], (y * width + x) * 4);
    }
  }
  return {
    display_id: displayId,
    thumbnail: {
      isEmpty: () => false,
      getSize: (scale) => {
        assert.equal(scale, 1);
        return { width, height };
      },
      toBitmap: (options) => {
        assert.deepEqual(options, { scaleFactor: 1 });
        return bitmap;
      },
    },
  };
}

function harness({
  displays = [primary],
  sources = displays.map((d) => source(d)),
  platform = "win32",
  status = "granted",
  capture,
  waitForHide,
  loadFailure = false,
  shortcutsAvailable = true,
  captureTimeoutMs,
} = {}) {
  const overlays = [];
  class Window extends EventEmitter {
    constructor(options = {}) {
      super();
      this.options = options;
      this.messages = [];
      this.webContents = new EventEmitter();
      this.webContents.send = (channel, data) =>
        this.messages.push({ channel, data });
      this.destroyed = false;
      this.visible = true;
      overlays.push(this);
    }
    isDestroyed() {
      return this.destroyed;
    }
    hide() {
      this.visible = false;
    }
    show() {
      this.visible = true;
    }
    showInactive() {
      this.show();
    }
    setAlwaysOnTop() {}
    setVisibleOnAllWorkspaces() {
      this.allWorkspaces = true;
    }
    setBounds(bounds) {
      this.bounds = bounds;
    }
    async loadFile() {
      if (loadFailure) throw new Error("Overlay load failed");
    }
    destroy() {
      this.destroyed = true;
      this.emit("closed");
    }
  }
  const mainWin = new Window();
  overlays.pop();
  const screen = new EventEmitter();
  screen.getAllDisplays = () => displays;
  let cursor = { x: 1, y: 1 };
  screen.getCursorScreenPoint = () => cursor;
  const ipcMain = new EventEmitter();
  const captureCalls = [];
  const desktopCapturer = {
    getSources: async (options) => {
      captureCalls.push(options);
      return capture ? capture() : sources;
    },
  };
  const shortcuts = new Map([["Unrelated", () => {}]]);
  const globalShortcut = {
    register: (key, cb) => {
      if (!shortcutsAvailable) return false;
      shortcuts.set(key, cb);
      return true;
    },
    unregister: (key) => shortcuts.delete(key),
  };
  const picker = createScreenPicker(
    {
      BrowserWindow: Window,
      desktopCapturer,
      screen,
      ipcMain,
      globalShortcut,
      systemPreferences: { getMediaAccessStatus: () => status },
    },
    {
      platform,
      waitForHide: waitForHide ?? (() => Promise.resolve()),
      captureTimeoutMs,
    },
  );
  const send = (overlay, channel, point) =>
    ipcMain.emit(channel, { sender: overlay.webContents }, point);
  const done = () =>
    mainWin.messages
      .filter((m) => m.channel === "picker:done")
      .map((m) => m.data);
  return {
    picker,
    mainWin,
    overlays,
    captureCalls,
    shortcuts,
    screen,
    send,
    done,
    setCursor: (point) => {
      cursor = point;
    },
    setStatus: (next) => {
      status = next;
    },
  };
}

test("captures through Electron, previews pixels, and commits the clicked pixel rather than a stale preview", async () => {
  const h = harness();
  await h.picker.start(h.mainWin);
  assert.equal(h.mainWin.visible, false);
  assert.deepEqual(h.captureCalls, [
    {
      types: ["screen"],
      thumbnailSize: { width: 4, height: 3 },
      fetchWindowIcons: false,
    },
  ]);
  const overlay = h.overlays[0];
  assert.deepEqual(overlay.bounds, primary.bounds);
  assert.equal(overlay.visible, true);
  h.send(overlay, "picker:move", { x: 0, y: 0 });
  const preview = overlay.messages.at(-1).data;
  assert.equal(preview.hex, "#010000");
  assert.equal(preview.grid.length, 81);
  assert.equal(preview.grid[40], preview.hex);
  assert.equal(preview.grid[0], "#010000");
  assert.equal(preview.grid[80], "#010302");
  h.send(overlay, "picker:pick", { x: 3, y: 2 });
  assert.deepEqual(h.done(), [{ hex: "#010302" }]);
  assert.equal(h.mainWin.visible, true);
  assert.equal(overlay.destroyed, true);
  assert.deepEqual([...h.shortcuts.keys()], ["Unrelated"]);
});

test("matches reversed source IDs, handles negative screen origins, and maps using actual capture size", async () => {
  const h = harness({
    displays: [primary, retina],
    sources: [source(retina, 12, 9), source(primary)],
  });
  h.setCursor({ x: -2, y: -2 });
  await h.picker.start(h.mainWin);
  assert.deepEqual(h.captureCalls[0].thumbnailSize, { width: 8, height: 6 });
  const overlay = h.overlays[1];
  assert.deepEqual(overlay.bounds, retina.bounds);
  assert.equal(
    overlay.messages.find((m) => m.channel === "preview:color").data.hex,
    "#020603",
  );
  h.send(overlay, "picker:pick", { x: 3.9, y: 2.9 });
  assert.deepEqual(h.done(), [{ hex: "#020b08" }]);
  assert.ok(h.overlays.every((o) => o.destroyed));
});

test("Enter samples the current global cursor, even after moving onto another monitor", async () => {
  const h = harness({
    displays: [primary, retina],
    sources: [source(primary), source(retina, 8, 6)],
  });
  await h.picker.start(h.mainWin);
  h.send(h.overlays[0], "picker:move", { x: 1, y: 1 });
  h.setCursor({ x: -1, y: -1 });
  h.shortcuts.get("Enter")();
  assert.deepEqual(h.done(), [{ hex: "#020604" }]);
});

test("right-click and Escape cancel without changing the color and release only picker shortcuts", async () => {
  for (const keyboard of [false, true]) {
    const h = harness();
    await h.picker.start(h.mainWin);
    if (keyboard) h.shortcuts.get("Escape")();
    else h.send(h.overlays[0], "picker:cancel");
    assert.deepEqual(h.done(), [{ hex: null }]);
    assert.equal(h.mainWin.visible, true);
    assert.deepEqual([...h.shortcuts.keys()], ["Unrelated"]);
    assert.equal(h.screen.listenerCount("display-removed"), 0);
  }
});

test("local keyboard confirmation works when global shortcuts are unavailable", async () => {
  const h = harness({ shortcutsAvailable: false });
  await h.picker.start(h.mainWin);
  h.send(h.overlays[0], "picker:confirm");
  assert.deepEqual(h.done(), [{ hex: "#010101" }]);
});

test("rejects IPC from other windows and malformed or out-of-bounds coordinates", async () => {
  const h = harness();
  await h.picker.start(h.mainWin);
  h.send(h.mainWin, "picker:cancel");
  h.send(h.mainWin, "picker:pick", { x: 1, y: 1 });
  for (const point of [
    undefined,
    null,
    { x: NaN, y: 0 },
    { x: "1", y: 0 },
    { x: -1, y: 0 },
    { x: 4, y: 0 },
  ])
    h.send(h.overlays[0], "picker:pick", point);
  assert.deepEqual(h.done(), []);
  h.picker.cancel();
});

test("repeated start requests share one in-flight capture and cancellation discards late results", async () => {
  let resolveCapture;
  const h = harness({
    capture: () =>
      new Promise((resolve) => {
        resolveCapture = resolve;
      }),
  });
  const first = h.picker.start(h.mainWin);
  await Promise.resolve();
  await h.picker.start(h.mainWin);
  assert.equal(h.captureCalls.length, 1);
  h.shortcuts.get("Escape")();
  resolveCapture([source(primary)]);
  await first;
  assert.equal(h.overlays.length, 0);
  assert.deepEqual(h.done(), [{ hex: null }]);
});

test("capture and overlay failures restore the main window, report an error, and allow retry", async () => {
  let fail = true;
  const h = harness({
    capture: () => {
      if (fail) throw new Error("Capture failed");
      return [source(primary)];
    },
  });
  await h.picker.start(h.mainWin);
  assert.deepEqual(h.done(), [{ hex: null, error: "capture-failed" }]);
  assert.equal(h.mainWin.visible, true);
  fail = false;
  await h.picker.start(h.mainWin);
  h.send(h.overlays[0], "picker:pick", { x: 0, y: 0 });
  assert.equal(h.done().at(-1).hex, "#010000");

  const broken = harness({ displays: [primary, retina], loadFailure: true });
  await broken.picker.start(broken.mainWin);
  assert.ok(broken.overlays.every((overlay) => overlay.destroyed));
  assert.deepEqual(broken.done(), [{ hex: null, error: "capture-failed" }]);
});

test("macOS permission denial is actionable and never returns a misleading captured color", async () => {
  for (const status of ["denied", "restricted", "not-determined"]) {
    const h = harness({ platform: "darwin", status });
    await h.picker.start(h.mainWin);
    assert.deepEqual(h.done(), [{ hex: null, error: "screen-permission" }]);
    assert.equal(h.mainWin.visible, true);
    assert.equal(h.overlays.length, 0);
    assert.equal(h.captureCalls.length, status === "not-determined" ? 1 : 0);
  }
});

test("macOS can prompt on first capture and uses overlays visible on fullscreen workspaces", async () => {
  const h = harness({
    platform: "darwin",
    status: "not-determined",
    capture: () => {
      h.setStatus("granted");
      return [source(primary)];
    },
  });
  await h.picker.start(h.mainWin);
  assert.equal(h.overlays[0].allWorkspaces, true);
  h.picker.cancel();
});

test("supports an anonymous single-monitor source and refuses ambiguous multi-monitor sources", async () => {
  const h = harness({
    platform: "linux",
    sources: [source(primary, 4, 3, "")],
  });
  await h.picker.start(h.mainWin);
  h.send(h.overlays[0], "picker:pick", { x: 1, y: 1 });
  assert.deepEqual(h.done(), [{ hex: "#010101" }]);
  for (const sources of [
    [],
    [source(primary, 4, 3, "")],
    [{ display_id: "1", thumbnail: { isEmpty: () => true } }],
  ]) {
    const ambiguous = harness({
      platform: "linux",
      displays: [primary, retina],
      sources,
    });
    await ambiguous.picker.start(ambiguous.mainWin);
    assert.deepEqual(ambiguous.done(), [
      { hex: null, error: "capture-failed" },
    ]);
  }
});

test("display changes, overlay destruction, and renderer crashes cancel and restore the app", async () => {
  for (const trigger of [
    (h) => h.screen.emit("display-metrics-changed", {}, primary, ["bounds"]),
    (h) => h.overlays[0].destroy(),
    (h) => h.overlays[0].webContents.emit("render-process-gone"),
  ]) {
    const h = harness();
    await h.picker.start(h.mainWin);
    trigger(h);
    assert.deepEqual(h.done(), [{ hex: null }]);
    assert.equal(h.mainWin.visible, true);
  }
});

test("work-area changes preserve an active capture of the full display", async () => {
  const h = harness();
  await h.picker.start(h.mainWin);
  h.screen.emit("display-metrics-changed", {}, primary, ["workArea"]);
  assert.deepEqual(h.done(), []);
  h.send(h.overlays[0], "picker:pick", { x: 1, y: 1 });
  assert.deepEqual(h.done(), [{ hex: "#010101" }]);
});

test("a stalled capture times out, restores the app, and ignores late capture results", async () => {
  let resolveCapture;
  const h = harness({
    captureTimeoutMs: 5,
    capture: () =>
      new Promise((resolve) => {
        resolveCapture = resolve;
      }),
  });
  await h.picker.start(h.mainWin);
  assert.equal(h.mainWin.visible, true);
  assert.deepEqual(h.done(), [{ hex: null, error: "capture-failed" }]);
  resolveCapture([source(primary)]);
  await Promise.resolve();
  assert.equal(h.overlays.length, 0);
});

test("closing the main window during capture never resurrects it or creates an overlay", async () => {
  let resume;
  const h = harness({
    waitForHide: () =>
      new Promise((resolve) => {
        resume = resolve;
      }),
  });
  const started = h.picker.start(h.mainWin);
  h.mainWin.destroy();
  resume();
  await started;
  assert.equal(h.mainWin.visible, false);
  assert.equal(h.overlays.length, 0);
  assert.equal(h.captureCalls.length, 0);
});
