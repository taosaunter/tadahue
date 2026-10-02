import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { createScreenshotPicker } from "./screenshot-picker.mjs";
const tick = () => new Promise((resolve) => setImmediate(resolve));
function fixture(capture = async () => Buffer.alloc(0), options = {}) {
  const ipcMain = new EventEmitter(),
    screen = new EventEmitter(),
    windows = [];
  screen.getAllDisplays = () => [
    { bounds: { width: 2, height: 1 }, scaleFactor: 1 },
  ];
  class Window extends EventEmitter {
    constructor(options) {
      super();
      this.hidden = options?.show === false;
      this.options = options;
      this.sent = [];
      this.webContents = new EventEmitter();
      this.webContents.send = (...args) => this.sent.push(args);
      this.webContents.isDestroyed = () => this.destroyed;
      windows.push(this);
    }
    isDestroyed() {
      return this.destroyed;
    }
    hide() {
      this.hidden = true;
    }
    show() {
      this.hidden = false;
    }
    destroy() {
      this.destroyed = true;
      this.emit("closed");
    }
    async loadFile() {}
  }
  const main = new Window();
  const bitmap = Buffer.from([0, 0, 255, 255, 0, 255, 0, 255]);
  const picker = createScreenshotPicker(
    {
      app: {},
      BrowserWindow: Window,
      ipcMain,
      screen,
      nativeImage: {
        createFromBuffer: () => ({
          getSize: () => ({ width: 2, height: 1 }),
          toBitmap: () => bitmap,
          isEmpty: () => false,
          toDataURL: () => "data:image/png;base64,AA==",
        }),
      },
    },
    { capture, waitForHide: async () => {}, ...options },
  );
  return { picker, main, windows, ipcMain, screen };
}

test("Wayland magnifier samples screenshot pixels, rejects foreign IPC and restores the app", async () => {
  const f = fixture();
  await f.picker.start(f.main, "zh-TW");
  const overlay = f.windows[1];
  assert.equal(overlay.options.fullscreen, true);
  assert.equal(overlay.options.transparent, true);
  assert.equal(overlay.options.backgroundColor, "#00000000");
  assert.equal(f.main.hidden, true);
  f.screen.emit("display-metrics-changed", {}, {}, ["workArea"]);
  assert.equal(f.picker.isActive, true);
  assert.equal(overlay.sent[0][0], "preview:image");
  assert.equal(overlay.sent[0][1].presentation, "desktop");
  assert.equal(
    overlay.sent[0][1].dataUrl,
    undefined,
    "Do not paint a frozen screenshot over a moving desktop",
  );
  f.ipcMain.emit("picker:pick", { sender: f.main.webContents }, { x: 0, y: 0 });
  f.ipcMain.emit(
    "picker:pick",
    { sender: overlay.webContents },
    { x: 2, y: 0 },
  );
  assert.equal(f.picker.isActive, true);
  f.ipcMain.emit(
    "picker:move",
    { sender: overlay.webContents },
    { x: 0, y: 0 },
  );
  assert.equal(overlay.sent.at(-1)[1].hex, "#ff0000");
  f.ipcMain.emit("picker:ready", { sender: overlay.webContents });
  f.ipcMain.emit(
    "picker:confirm",
    { sender: overlay.webContents },
    { x: 1, y: 0 },
  );
  assert.deepEqual(f.main.sent.at(-1), ["picker:done", { hex: "#00ff00" }]);
  assert.equal(f.main.hidden, false);
  assert.equal(overlay.destroyed, true);
  assert.equal(f.screen.listenerCount("display-added"), 0);
});

test("early overlay input during hide/capture cannot sample a missing frame or show the window", async () => {
  let resumeHide, resolveCapture;
  const f = fixture(
    () =>
      new Promise((resolve) => {
        resolveCapture = resolve;
      }),
    {
      waitForHide: () =>
        new Promise((resolve) => {
          resumeHide = resolve;
        }),
    },
  );
  const pending = f.picker.start(f.main);
  const overlay = f.windows[1];
  try {
    for (const stage of ["hide", "capture"]) {
      if (stage === "capture") {
        resumeHide();
        await tick();
      }
      for (const channel of [
        "picker:move",
        "picker:pick",
        "picker:confirm",
        "picker:ready",
      ]) {
        assert.doesNotThrow(
          () =>
            f.ipcMain.emit(
              channel,
              { sender: overlay.webContents },
              { x: 0, y: 0 },
            ),
          `${stage}: ${channel}`,
        );
      }
      assert.equal(overlay.hidden, true);
      assert.equal(overlay.sent.length, 0);
      assert.equal(f.main.sent.length, 0);
      assert.equal(f.picker.isActive, true);
    }
    resolveCapture(Buffer.alloc(0));
    await pending;
    for (const channel of ["picker:pick", "picker:confirm"]) {
      f.ipcMain.emit(channel, { sender: overlay.webContents }, { x: 0, y: 0 });
      assert.equal(
        f.picker.isActive,
        true,
        "No selection until the renderer has painted its preview",
      );
    }
    f.ipcMain.emit(
      "picker:move",
      { sender: overlay.webContents },
      { x: 0, y: 0 },
    );
    assert.equal(overlay.sent.at(-1)[1].hex, "#ff0000");
    f.ipcMain.emit("picker:ready", { sender: overlay.webContents });
    f.ipcMain.emit(
      "picker:pick",
      { sender: overlay.webContents },
      { x: 1, y: 0 },
    );
    assert.deepEqual(f.main.sent.at(-1), ["picker:done", { hex: "#00ff00" }]);
  } finally {
    f.picker.cancel();
    resumeHide();
    await tick();
    resolveCapture?.(Buffer.alloc(0));
    await pending;
  }
});

test("cancel during screenshot preparation restores the app and ignores late input/results", async () => {
  let resolveCapture;
  const f = fixture(
    () =>
      new Promise((resolve) => {
        resolveCapture = resolve;
      }),
  );
  const pending = f.picker.start(f.main);
  await tick();
  const overlay = f.windows[1];
  f.ipcMain.emit("picker:cancel", { sender: overlay.webContents });
  assert.equal(f.main.hidden, false);
  assert.equal(overlay.destroyed, true);
  for (const channel of [
    "picker:move",
    "picker:pick",
    "picker:confirm",
    "picker:ready",
  ]) {
    assert.doesNotThrow(() =>
      f.ipcMain.emit(channel, { sender: overlay.webContents }, { x: 0, y: 0 }),
    );
  }
  resolveCapture(Buffer.alloc(0));
  await pending;
  assert.equal(f.picker.isActive, false);
  assert.deepEqual(f.main.sent, [["picker:done", { hex: null }]]);
});

test("prepare the hidden overlay while waiting for the compositor and capture", async () => {
  let resumeHide;
  let captures = 0;
  const f = fixture(
    async () => {
      captures++;
      return Buffer.alloc(0);
    },
    {
      waitForHide: () =>
        new Promise((resolve) => {
          resumeHide = resolve;
        }),
    },
  );
  const pending = f.picker.start(f.main);
  await tick();
  assert.equal(
    f.windows.length,
    2,
    "HTML startup must overlap the existing hide wait",
  );
  assert.equal(f.windows[1].hidden, true);
  assert.equal(captures, 0, "Never capture before the fade finishes");
  resumeHide();
  await pending;
  f.picker.cancel();
});

test("multiple displays and mismatched screenshot dimensions retain the accurate screenshot preview", async () => {
  for (const displays of [
    [
      { bounds: { width: 2, height: 1 }, scaleFactor: 1 },
      { bounds: { width: 2, height: 1 }, scaleFactor: 1 },
    ],
    [{ bounds: { width: 100, height: 100 }, scaleFactor: 1 }],
  ]) {
    const f = fixture();
    f.screen.getAllDisplays = () => displays;
    await f.picker.start(f.main);
    const image = f.windows[1].sent[0][1];
    assert.equal(image.presentation, "snapshot");
    assert.ok(image.dataUrl.startsWith("data:image/png;"));
    f.picker.cancel();
  }
});

test("duplicate starts and cancelled late captures never open another overlay", async () => {
  let resolve,
    signal,
    captures = 0;
  const f = fixture((options) => {
    captures++;
    signal = options.signal;
    return new Promise((accept) => {
      resolve = accept;
    });
  });
  const pending = f.picker.start(f.main);
  await tick();
  await f.picker.start(f.main);
  assert.equal(captures, 1);
  f.picker.cancel();
  assert.equal(signal.aborted, true);
  resolve(Buffer.alloc(0));
  await pending;
  assert.equal(f.windows.length, 2);
  assert.equal(f.windows[1].destroyed, true);
  assert.equal(f.main.hidden, false);
  assert.deepEqual(f.main.sent.at(-1), ["picker:done", { hex: null }]);
});

test("portal errors and overlay crashes allow retry; closing the main window does not resurrect it", async () => {
  let fail = true;
  const f = fixture(async () => {
    if (fail) throw new Error("Permission denied");
    return Buffer.alloc(0);
  });
  await f.picker.start(f.main);
  assert.deepEqual(f.main.sent.at(-1), [
    "picker:done",
    { hex: null, error: "screenshot-unavailable" },
  ]);
  fail = false;
  await f.picker.start(f.main);
  f.windows.at(-1).webContents.emit("render-process-gone");
  assert.equal(f.picker.isActive, false);
  assert.equal(f.main.hidden, false);
  await f.picker.start(f.main);
  f.main.destroy();
  assert.equal(f.picker.isActive, false);
  assert.equal(f.main.hidden, true);
  assert.equal(f.windows.at(-1).destroyed, true);
});

test("actual display geometry changes cancel an active screenshot selection", async () => {
  const f = fixture();
  await f.picker.start(f.main);
  f.screen.emit("display-metrics-changed", {}, {}, ["scaleFactor"]);
  assert.equal(f.picker.isActive, false);
  assert.equal(f.main.hidden, false);
});

test("closing a real-style destroyed window never reads its webContents getter", async () => {
  const f = fixture();
  await f.picker.start(f.main);
  const contents = f.main.webContents;
  Object.defineProperty(f.main, "webContents", {
    get() {
      if (f.main.destroyed) throw new Error("Object has been destroyed");
      return contents;
    },
  });
  assert.doesNotThrow(() => f.main.destroy());
  assert.equal(f.picker.isActive, false);
  assert.equal(f.windows[1].destroyed, true);
});

test("the fullscreen picker stays hidden until the snapshot renderer reports painted pixels", async () => {
  const f = fixture();
  const pending = f.picker.start(f.main);
  await tick();
  const overlay = f.windows[1];
  assert.equal(
    overlay.hidden,
    true,
    "Showing before image decode exposes the blank fullscreen background",
  );
  f.ipcMain.emit("picker:ready", { sender: f.main.webContents });
  assert.equal(overlay.hidden, true);
  f.ipcMain.emit("picker:ready", { sender: overlay.webContents });
  await pending;
  assert.equal(overlay.hidden, false);
  f.picker.cancel();
});

test("failed image decode restores the app and rejects foreign failure IPC", async () => {
  const f = fixture();
  await f.picker.start(f.main);
  f.ipcMain.emit("picker:image-error", { sender: f.main.webContents });
  assert.equal(f.picker.isActive, true);
  f.ipcMain.emit("picker:image-error", { sender: f.windows[1].webContents });
  assert.equal(f.picker.isActive, false);
  assert.deepEqual(f.main.sent.at(-1), [
    "picker:done",
    { hex: null, error: "screenshot-unavailable" },
  ]);
});

test("a stalled snapshot restores the app and a ready snapshot cannot be cancelled by the old timer", async () => {
  const f = fixture(undefined, { imageReadyTimeoutMs: 5 });
  await f.picker.start(f.main);
  await new Promise((resolve) => setTimeout(resolve, 15));
  assert.equal(f.picker.isActive, false);
  assert.equal(f.main.hidden, false);
  assert.deepEqual(f.main.sent.at(-1), [
    "picker:done",
    { hex: null, error: "screenshot-unavailable" },
  ]);
  await f.picker.start(f.main);
  f.ipcMain.emit("picker:ready", { sender: f.windows[2].webContents });
  await new Promise((resolve) => setTimeout(resolve, 15));
  assert.equal(f.picker.isActive, true);
  f.picker.cancel();
});
