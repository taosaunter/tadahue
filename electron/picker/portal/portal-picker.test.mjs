import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { pickPortalColor, createPortalPicker } from "./portal-picker.mjs";
import { createColorPicker, usesWaylandPicker } from "../color-picker.mjs";

const tick = () => new Promise((resolve) => setImmediate(resolve));
const color = (rgb) => [
  [
    "color",
    [
      [{ type: "(", child: [{ type: "d" }, { type: "d" }, { type: "d" }] }],
      [rgb],
    ],
  ],
];

function fixture({ reply, fail, missingOwner = false, failureName } = {}) {
  const calls = [];
  const connection = new EventEmitter();
  let ended = 0;
  let path;
  connection.end = () => {
    ended++;
  };
  function respond(body = [0, color([1, 0.5, 0])], overrides = {}) {
    connection.emit("message", {
      type: 4,
      sender: ":1.10",
      path,
      interface: "org.freedesktop.portal.Request",
      member: "Response",
      body,
      ...overrides,
    });
  }
  const bus = {
    connection,
    invoke(message, callback) {
      calls.push(message);
      if (message.member === "GetNameOwner" && missingOwner) {
        missingOwner = false;
        queueMicrotask(() =>
          callback({ name: "org.freedesktop.DBus.Error.NameHasNoOwner" }),
        );
        return;
      }
      if (fail === message.member) {
        queueMicrotask(() =>
          callback(
            Object.assign(
              new Error("Unsupported portal"),
              failureName ? { name: failureName } : {},
            ),
          ),
        );
        return;
      }
      let result;
      switch (message.member) {
        case "Hello":
          result = ":1.42";
          break;
        case "GetNameOwner":
          result = ":1.10";
          break;
        case "Screenshot":
        case "PickColor":
          path =
            "/org/freedesktop/portal/desktop/request/1_42/" +
            message.body[1][0][1][1];
          if (reply) {
            reply({ respond, callback, path });
            return;
          }
          result = path;
          break;
      }
      queueMicrotask(() => callback(null, result));
    },
  };
  return {
    bus,
    calls,
    respond,
    get ended() {
      return ended;
    },
  };
}

test("Wayland defaults to a screenshot magnifier and explicitly offers the native fallback", () => {
  for (const env of [
    { XDG_SESSION_TYPE: "wayland", DISPLAY: ":1" },
    { WAYLAND_DISPLAY: "wayland-0", DISPLAY: ":1" },
  ]) {
    const calls = [];
    const magnifier = {
      start: (...args) => calls.push(["screenshot", ...args]),
    };
    const native = { start: (...args) => calls.push(["native", ...args]) };
    const picker = createColorPicker(
      {},
      {
        platform: "linux",
        env,
        portalFactory: () => native,
        screenshotFactory: () => magnifier,
        screenFactory: () =>
          assert.fail("ScreenCast must not be used on Wayland"),
      },
    );
    picker.start("main", "zh-TW");
    picker.start("main", "en", "native");
    magnifier.isActive = true;
    picker.start("main", "en", "native");
    magnifier.isActive = false;
    native.isActive = true;
    picker.start("main", "en");
    assert.equal(picker.nativeAvailable, true);
    assert.deepEqual(calls, [
      ["screenshot", "main", "zh-TW"],
      ["native", "main", "en"],
    ]);
  }
});

test("X11, Windows and macOS retain desktopCapturer", () => {
  for (const [platform, env] of [
    ["linux", { XDG_SESSION_TYPE: "x11", WAYLAND_DISPLAY: "stale" }],
    ["linux", { DISPLAY: ":0" }],
    ["win32", { XDG_SESSION_TYPE: "wayland" }],
    ["darwin", {}],
  ]) {
    assert.equal(usesWaylandPicker(platform, env), false);
    const deps = {};
    assert.equal(
      createColorPicker(deps, {
        platform,
        env,
        portalFactory: () => {
          assert.fail("Linux transport should not load");
        },
        screenFactory: (actual, options) => {
          assert.equal(actual, deps);
          assert.equal(options.platform, platform);
          return "screen";
        },
      }),
      "screen",
    );
  }
});

test("subscribes before PickColor and accepts a response before the method reply", async () => {
  const f = fixture({
    reply: ({ respond, callback, path }) => {
      respond();
      callback(null, path);
    },
  });
  assert.equal(await pickPortalColor({ createBus: () => f.bus }), "#ff8000");
  assert.deepEqual(
    f.calls.map((call) => call.member),
    ["Hello", "GetNameOwner", "AddMatch", "PickColor"],
  );
  assert.equal(f.ended, 1);
  assert.equal(f.bus.connection.listenerCount("message"), 0);
});

test("ignores responses from other callers and returns only the owned request", async () => {
  const f = fixture();
  const pending = pickPortalColor({ createBus: () => f.bus });
  await tick();
  for (const overrides of [
    { sender: ":1.99" },
    { path: "/unrelated" },
    { member: "Other" },
    { interface: "Other" },
    { type: 2 },
  ])
    f.respond(undefined, overrides);
  assert.equal(f.ended, 0);
  f.respond([0, color([0, 1, 0])]);
  assert.equal(await pending, "#00ff00");
});

test("native user cancellation returns no color and no error", async () => {
  const f = fixture();
  const pending = pickPortalColor({ createBus: () => f.bus });
  await tick();
  f.respond([1, []]);
  assert.equal(await pending, null);
  assert.equal(f.ended, 1);
});

test("rejects failed or malformed color results", async () => {
  for (const body of [
    [2, []],
    [0, []],
    [0, color([NaN, 0, 0])],
    [0, color([-0.01, 0, 0])],
    [0, color([0, 0, 1.01])],
    [0, color([0, 0])],
  ]) {
    const f = fixture();
    const pending = pickPortalColor({ createBus: () => f.bus });
    const rejected = assert.rejects(pending, { code: "native-failed" });
    await tick();
    f.respond(body);
    await rejected;
    assert.equal(f.ended, 1);
  }
});

test("missing portal reports unavailable without falling back to screen sharing", async () => {
  const f = fixture({ fail: "StartServiceByName", missingOwner: true });
  await assert.rejects(pickPortalColor({ createBus: () => f.bus }), {
    code: "native-unavailable",
  });
  assert.equal(f.ended, 1);
  assert.equal(
    f.calls.some((call) => call.member === "PickColor"),
    false,
  );
});

test("starts an inactive portal and subscribes to its new owner", async () => {
  const f = fixture({
    missingOwner: true,
    reply: ({ respond, callback, path }) => {
      callback(null, path);
      respond();
    },
  });
  assert.equal(await pickPortalColor({ createBus: () => f.bus }), "#ff8000");
  assert.deepEqual(
    f.calls.map((call) => call.member),
    [
      "Hello",
      "GetNameOwner",
      "StartServiceByName",
      "GetNameOwner",
      "AddMatch",
      "PickColor",
    ],
  );
});

test("a portal without PickColor reports native picker unavailable", async () => {
  const f = fixture({
    fail: "PickColor",
    failureName: "org.freedesktop.DBus.Error.UnknownMethod",
  });
  await assert.rejects(pickPortalColor({ createBus: () => f.bus }), {
    code: "native-unavailable",
  });
  assert.equal(f.ended, 1);
});

test("abort closes the owned native request and its connection", async () => {
  const f = fixture();
  const controller = new AbortController();
  const pending = pickPortalColor({
    createBus: () => f.bus,
    signal: controller.signal,
  });
  await tick();
  controller.abort();
  assert.equal(await pending, null);
  assert.equal(f.calls.at(-1).member, "Close");
  assert.equal(f.ended, 1);
  f.bus.connection.emit("error", new Error("Late socket error"));
});

test("abort before and during loading does not launch native UI", async () => {
  const controller = new AbortController();
  controller.abort();
  assert.equal(
    await pickPortalColor({
      signal: controller.signal,
      createBus: () => assert.fail("Must not open a bus"),
    }),
    null,
  );
  const f = fixture();
  const next = new AbortController();
  let loaded;
  const pending = pickPortalColor({
    signal: next.signal,
    createBus: () =>
      new Promise((resolve) => {
        loaded = resolve;
      }),
  });
  next.abort();
  loaded(f.bus);
  assert.equal(await pending, null);
  await tick();
  assert.equal(f.calls.length, 0);
  assert.equal(f.ended, 1);
});

test("socket disconnects and stalled requests release the picker", async () => {
  const f = fixture();
  const pending = pickPortalColor({ createBus: () => f.bus });
  const rejected = assert.rejects(pending, { code: "native-failed" });
  await tick();
  f.bus.connection.emit("end");
  await rejected;
  const stalled = fixture();
  await assert.rejects(
    pickPortalColor({ createBus: () => stalled.bus, timeoutMs: 10 }),
    { code: "native-failed" },
  );
  assert.equal(stalled.calls.at(-1).member, "Close");
  assert.equal(stalled.ended, 1);
});

function windowFixture() {
  const win = new EventEmitter();
  win.webContents = new EventEmitter();
  const messages = [];
  let destroyed = false;
  win.isDestroyed = () => destroyed;
  win.webContents.isDestroyed = () => destroyed;
  win.hide = () => messages.push("hide");
  win.show = () => messages.push("show");
  win.webContents.send = (...args) => messages.push(args);
  win.close = () => {
    destroyed = true;
    win.emit("closed");
  };
  return { win, messages };
}

test("native picks hide/restore the app, reject duplicates and allow subsequent picks", async () => {
  const { win, messages } = windowFixture();
  let complete;
  let calls = 0;
  const picker = createPortalPicker({
    waitForHide: async () => {},
    pick: () => {
      calls++;
      return new Promise((resolve) => {
        complete = resolve;
      });
    },
  });
  const pending = picker.start(win);
  await tick();
  await picker.start(win);
  assert.equal(calls, 1);
  complete("#123456");
  await pending;
  assert.deepEqual(messages, [
    "hide",
    "show",
    ["picker:done", { hex: "#123456" }],
  ]);
  const next = picker.start(win);
  await tick();
  complete(null);
  await next;
  assert.equal(calls, 2);
  assert.deepEqual(messages.at(-1), ["picker:done", { hex: null }]);
  assert.equal(win.listenerCount("closed"), 0);
});

test("closing the app cancels native picking without resurrecting the window", async () => {
  const { win, messages } = windowFixture();
  const picker = createPortalPicker({
    waitForHide: async () => {},
    pick: ({ signal }) =>
      new Promise((resolve) => {
        signal.addEventListener("abort", () => resolve(null));
      }),
  });
  const pending = picker.start(win);
  await tick();
  win.close();
  await pending;
  assert.deepEqual(messages, ["hide"]);
});

test("native errors restore the app and return an actionable error", async () => {
  const { win, messages } = windowFixture();
  const picker = createPortalPicker({
    waitForHide: async () => {},
    pick: async () => {
      throw { code: "native-unavailable" };
    },
  });
  await picker.start(win);
  assert.deepEqual(messages.at(-1), [
    "picker:done",
    { hex: null, error: "native-unavailable" },
  ]);
});

test("native cleanup does not access the destroyed BrowserWindow's webContents getter", async () => {
  const { win } = windowFixture();
  const contents = win.webContents;
  let closed = false;
  win.on("closed", () => {
    closed = true;
  });
  Object.defineProperty(win, "webContents", {
    get() {
      if (closed) throw new Error("Object has been destroyed");
      return contents;
    },
  });
  const picker = createPortalPicker({
    waitForHide: async () => {},
    pick: ({ signal }) =>
      new Promise((resolve) =>
        signal.addEventListener("abort", () => resolve(null)),
      ),
  });
  const pending = picker.start(win);
  await tick();
  win.close();
  await assert.doesNotReject(pending);
});
