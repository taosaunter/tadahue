import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createDisplayMode,
  displayModeArgs,
  RESTART_X11,
  RESTART_AUTO,
} from "./display-mode.mjs";

function fixture(
  t,
  {
    args = ["electron", "."],
    env = { DISPLAY: ":1" },
    platform = "linux",
    saved,
    packaged = false,
  } = {},
) {
  const directory = mkdtempSync(join(tmpdir(), "tadahue-mode-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const preferences = join(directory, "preferences", "display-mode.json");
  if (saved !== undefined) {
    mkdirSync(join(directory, "preferences"));
    writeFileSync(
      preferences,
      typeof saved === "string"
        ? saved
        : JSON.stringify({ x11Compatibility: saved }),
    );
  }
  const calls = [];
  const app = {
    getPath: () => directory,
    isPackaged: packaged,
    commandLine: {
      getSwitchValue: (name) =>
        args.find((arg) => arg.startsWith(`--${name}=`))?.split("=")[1] ?? "",
      hasSwitch: (name) =>
        args.some((arg) => arg === `--${name}` || arg.startsWith(`--${name}=`)),
    },
    relaunch: (options) => calls.push(["relaunch", options]),
    exit: (code) => calls.push(["exit", code]),
  };
  const handlers = new Map();
  const ipcMain = {
    handle: (name, callback) => handlers.set(name, callback),
    removeHandler: (name) => handlers.delete(name),
  };
  const win = new EventEmitter();
  win.webContents = {
    mainFrame: {},
    session: { flushStorageData: () => calls.push(["flush"]) },
  };
  const event = {
    sender: win.webContents,
    senderFrame: win.webContents.mainFrame,
  };
  const mode = createDisplayMode(
    { app, ipcMain },
    { platform, argv: args, env },
  );
  mode.bindWindow(win);
  return { mode, app, handlers, event, win, calls, preferences, directory };
}

test("relaunch strips both Ozone switches, preserves unrelated arguments, and selects either mode", () => {
  const args = [
    ".",
    "--ozone-platform",
    "wayland",
    "--ozone-platform=x11",
    "--ozone-platform-hint=wayland",
    "--ozone-platform-hint",
    "auto",
    "--remote-debugging-port=9222",
  ];
  assert.deepEqual(displayModeArgs(args, true), [
    ".",
    "--remote-debugging-port=9222",
    "--ozone-platform=x11",
  ]);
  assert.deepEqual(displayModeArgs(args, false), [
    ".",
    "--remote-debugging-port=9222",
  ]);
});

test("saved X11 choice is applied by a fresh process before creating the window", (t) => {
  const f = fixture(t, { saved: true });
  assert.equal(f.mode.prepareStartup(), true);
  assert.deepEqual(f.calls, [
    ["relaunch", { args: [".", "--ozone-platform=x11"] }],
    ["exit", 0],
  ]);
});

test("system default, damaged settings, explicit flags, and missing XWayland do not enter a relaunch loop", (t) => {
  for (const options of [
    {},
    { saved: "{broken" },
    { saved: true, args: ["electron", ".", "--ozone-platform=x11"] },
    { saved: true, args: ["electron", ".", "--ozone-platform=wayland"] },
    { saved: true, env: {} },
  ]) {
    const f = fixture(t, options);
    assert.equal(f.mode.prepareStartup(), false);
    assert.deepEqual(f.calls, []);
  }
});

test("AppImage restarts through the original executable rather than its temporary mount", (t) => {
  const f = fixture(t, {
    saved: true,
    packaged: true,
    args: ["/tmp/.mount/app"],
    env: { DISPLAY: ":1", APPIMAGE: "/opt/TadaHue.AppImage" },
  });
  f.mode.prepareStartup();
  assert.deepEqual(f.calls[0], [
    "relaunch",
    {
      args: ["--appimage-extract-and-run", "--ozone-platform=x11"],
      execPath: "/opt/TadaHue.AppImage",
    },
  ]);
});

test("AppImage mode changes use extraction-and-run even after the runtime consumed the initial flag", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  for (const enabled of [true, false]) {
    const f = fixture(t, {
      packaged: true,
      args: [
        "/tmp/appimage_extracted_payload/tadahue",
        "--no-sandbox",
        "--ozone-platform=wayland",
      ],
      env: {
        DISPLAY: ":1",
        APPIMAGE: "/opt/Tada Hue.AppImage",
        APPDIR: "/tmp/appimage_extracted_payload",
      },
    });
    assert.deepEqual(f.handlers.get("display-mode:restart")(f.event, enabled), {
      ok: true,
    });
    assert.deepEqual(f.calls[1], [
      "relaunch",
      {
        execPath: "/opt/Tada Hue.AppImage",
        args: [
          "--appimage-extract-and-run",
          "--no-sandbox",
          ...(enabled ? ["--ozone-platform=x11"] : []),
        ],
      },
    ]);
    t.mock.timers.tick(150);
    assert.deepEqual(f.calls[2], ["exit", 0]);
  }
});

test("Electron's automatically injected Wayland switch does not override the saved choice", (t) => {
  const f = fixture(t, { saved: true });
  f.app.commandLine.hasSwitch = () => true;
  f.app.commandLine.getSwitchValue = () => "wayland";
  assert.equal(f.mode.prepareStartup(), true);
  assert.deepEqual(f.calls[0], [
    "relaunch",
    { args: [".", "--ozone-platform=x11"] },
  ]);
});

test("both mode changes persist and flush the palette before restarting", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  for (const enabled of [true, false]) {
    const f = fixture(t, { args: ["electron", ".", "--ozone-platform=x11"] });
    assert.deepEqual(f.handlers.get("display-mode:restart")(f.event, enabled), {
      ok: true,
    });
    assert.deepEqual(JSON.parse(readFileSync(f.preferences, "utf8")), {
      x11Compatibility: enabled,
    });
    assert.deepEqual(f.calls[0], ["flush"]);
    assert.deepEqual(f.calls[1], [
      "relaunch",
      { args: enabled ? [".", "--ozone-platform=x11"] : ["."] },
    ]);
    assert.deepEqual(f.handlers.get("display-mode:restart")(f.event, enabled), {
      ok: false,
    });
    t.mock.timers.tick(150);
    assert.deepEqual(f.calls[2], ["exit", 0]);
  }
});

test("the dev launcher receives restart codes while Vite remains owned by the launcher", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  for (const enabled of [true, false]) {
    const f = fixture(t, { env: { DISPLAY: ":1", TADAHUE_DEV_LAUNCHER: "1" } });
    f.handlers.get("display-mode:restart")(f.event, enabled);
    t.mock.timers.tick(150);
    assert.deepEqual(f.calls, [
      ["flush"],
      ["exit", enabled ? RESTART_X11 : RESTART_AUTO],
    ]);
  }
});

test("unauthorized renderers, subframes, invalid values, and unavailable X11 cannot change settings", (t) => {
  const f = fixture(t);
  for (const event of [
    { sender: {}, senderFrame: f.event.senderFrame },
    { ...f.event, senderFrame: {} },
  ]) {
    assert.equal(f.handlers.get("display-mode:get")(event), null);
    assert.deepEqual(f.handlers.get("display-mode:restart")(event, true), {
      ok: false,
    });
  }
  assert.deepEqual(f.handlers.get("display-mode:restart")(f.event, "true"), {
    ok: false,
  });
  const unavailable = fixture(t, { env: {} });
  assert.deepEqual(
    unavailable.handlers.get("display-mode:get")(unavailable.event),
    { enabled: false, available: false },
  );
  assert.deepEqual(
    unavailable.handlers.get("display-mode:restart")(unavailable.event, true),
    { ok: false },
  );
  assert.deepEqual(f.calls, []);
  assert.deepEqual(unavailable.calls, []);
});

test("Windows and macOS never expose or apply a Linux preference", (t) => {
  for (const platform of ["win32", "darwin"]) {
    const f = fixture(t, { platform, saved: true });
    assert.equal(f.mode.prepareStartup(), false);
    assert.equal(f.handlers.get("display-mode:get")(f.event), null);
    assert.deepEqual(f.handlers.get("display-mode:restart")(f.event, true), {
      ok: false,
    });
    assert.deepEqual(f.calls, []);
  }
});

test("failed writes and failed relaunches leave the app running and report failure", (t) => {
  const f = fixture(t, { saved: false });
  f.app.relaunch = () => {
    throw new Error("restart failed");
  };
  assert.deepEqual(f.handlers.get("display-mode:restart")(f.event, true), {
    ok: false,
  });
  assert.equal(
    JSON.parse(readFileSync(f.preferences, "utf8")).x11Compatibility,
    false,
  );
  const blocked = fixture(t);
  writeFileSync(join(blocked.directory, "preferences"), "not a directory");
  assert.deepEqual(
    blocked.handlers.get("display-mode:restart")(blocked.event, true),
    { ok: false },
  );
  assert.deepEqual(blocked.calls, []);
  assert.equal(
    f.calls.some(([name]) => name === "exit"),
    false,
  );
});

test("closing the main window removes its privileged handlers", (t) => {
  const f = fixture(t);
  f.win.emit("closed");
  assert.equal(f.handlers.size, 0);
});
