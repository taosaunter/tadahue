import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  writeFile,
  readFile,
  access,
  symlink,
  rm,
} from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import {
  capturePortalScreenshot,
  readPortalScreenshot,
} from "./portal-screenshot.mjs";
import {
  ensurePortalIdentity,
  desktopExec,
  portalAppId,
} from "../../platform/portal-identity.mjs";
import { requestPortal } from "./portal-request.mjs";
import { EventEmitter } from "node:events";

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==",
  "base64",
);
const tick = () => new Promise((resolve) => setImmediate(resolve));
function transport() {
  const calls = [],
    connection = new EventEmitter();
  let path,
    ended = false;
  connection.end = () => {
    ended = true;
  };
  return {
    calls,
    get ended() {
      return ended;
    },
    bus: {
      connection,
      invoke(message, cb) {
        calls.push(message);
        let reply;
        if (message.member === "Hello") reply = ":1.42";
        if (message.member === "GetNameOwner") reply = ":1.10";
        if (message.member === "Screenshot") {
          path =
            "/org/freedesktop/portal/desktop/request/1_42/" +
            message.body[1][0][1][1];
          reply = path;
        }
        queueMicrotask(() => cb(null, reply));
      },
    },
    respond(body) {
      connection.emit("message", {
        type: 4,
        sender: ":1.10",
        path,
        interface: "org.freedesktop.portal.Request",
        member: "Response",
        body,
      });
    },
  };
}

test("Screenshot registers its identity first and drains a cancelled request", async () => {
  const f = transport(),
    controller = new AbortController();
  const pending = requestPortal({
    createBus: () => f.bus,
    appId: portalAppId,
    method: "Screenshot",
    options: [["interactive", ["b", false]]],
    signal: controller.signal,
    drainOnAbort: true,
  });
  await tick();
  assert.deepEqual(
    f.calls.map((call) => call.member),
    ["Hello", "GetNameOwner", "Register", "AddMatch", "Screenshot"],
  );
  assert.deepEqual(f.calls[2].body, [portalAppId, []]);
  assert.deepEqual(f.calls.at(-1).body[1].at(-1), [
    "interactive",
    ["b", false],
  ]);
  controller.abort();
  assert.equal(f.ended, false);
  f.respond([0, []]);
  assert.deepEqual(await pending, [0, []]);
  assert.equal(f.ended, true);
  assert.equal(
    f.calls.some((call) => call.member === "Close"),
    false,
  );
});

test("Screenshot consumes and cleans the response even after cancellation", async () => {
  const controller = new AbortController();
  let read = false;
  assert.equal(
    await capturePortalScreenshot({
      signal: controller.signal,
      register: async () => portalAppId,
      request: async (options) => {
        assert.equal(options.appId, portalAppId);
        controller.abort();
        return [0, [["uri", [[{ type: "s" }], ["file:///tmp/request.png"]]]]];
      },
      read: async () => {
        read = true;
        return png;
      },
    }),
    null,
  );
  assert.equal(read, true);
  await assert.rejects(
    capturePortalScreenshot({
      register: async () => portalAppId,
      request: async () => [2, []],
    }),
    { code: "screenshot-unavailable" },
  );
});

test("removes new screenshot files but preserves existing files and symlink targets", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "tadahue-png-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const path = join(dir, "new.png"),
    uri = pathToFileURL(path).href;
  // Simulate a portal round trip rather than a same-clock-tick file creation.
  const startedAt = Date.now() - 100;
  await writeFile(path, png);
  assert.deepEqual(await readPortalScreenshot(uri, startedAt), png);
  await assert.rejects(access(path), { code: "ENOENT" });
  await writeFile(path, png);
  assert.deepEqual(await readPortalScreenshot(uri, Date.now() + 1000), png);
  assert.deepEqual(await readFile(path), png);
  const link = join(dir, "linked.png");
  await symlink(path, link);
  await assert.rejects(readPortalScreenshot(pathToFileURL(link).href, 0), {
    code: "ELOOP",
  });
  assert.deepEqual(await readFile(path), png);
  await assert.rejects(
    readPortalScreenshot("https://example.com/image.png", 0),
  );
  const invalid = join(dir, "bad.png");
  await writeFile(invalid, Buffer.alloc(24));
  await assert.rejects(readPortalScreenshot(pathToFileURL(invalid).href, 0));
  await assert.rejects(access(invalid), { code: "ENOENT" });
});

test("creates a stable, relocatable AppImage launcher and respects manual launchers", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "tadahue-identity-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await writeFile(join(dir, "tadahue.png"), png);
  const app = { isPackaged: true, getPath: () => dir };
  const env = {
    XDG_DATA_HOME: dir,
    XDG_DATA_DIRS: "/nonexistent",
    APPIMAGE: "/my apps/TadaHue.AppImage",
  };
  assert.equal(
    await ensurePortalIdentity(app, { env, resourcesPath: dir }),
    portalAppId,
  );
  const path = join(dir, "applications", portalAppId + ".desktop");
  let content = await readFile(path, "utf8");
  assert.ok(
    content.includes(
      'Exec="/my apps/TadaHue.AppImage" "--appimage-extract-and-run"',
    ),
  );
  assert.ok(content.includes("X-TadaHue-Managed=true"));
  assert.ok(
    content.includes(
      `Icon=${join(dir, "icons/hicolor/512x512/apps", portalAppId + ".png")}`,
    ),
  );
  assert.ok(content.includes(`StartupWMClass=${portalAppId}`));
  env.APPIMAGE = "/new/TadaHue.AppImage";
  await ensurePortalIdentity(app, { env, resourcesPath: dir });
  content = await readFile(path, "utf8");
  assert.ok(content.includes("/new/TadaHue.AppImage"));
  await writeFile(path, "[Desktop Entry]\nName=My TadaHue\n");
  await ensurePortalIdentity(app, { env, resourcesPath: dir });
  assert.equal(
    await readFile(path, "utf8"),
    "[Desktop Entry]\nName=My TadaHue\n",
  );
  assert.equal(desktopExec(["/my 100%/app"]), '"/my 100%%/app"');
  assert.throws(() => desktopExec(["/bad\npath"]));
});

test("a missing icon destination never publishes a launcher pointing at an unavailable icon", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "tadahue-icon-failure-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await writeFile(join(dir, "tadahue.png"), png);
  await writeFile(join(dir, "icons"), "not a directory");
  const app = { isPackaged: true, getPath: () => dir };
  await assert.rejects(
    ensurePortalIdentity(app, {
      env: { XDG_DATA_HOME: dir, XDG_DATA_DIRS: "/nonexistent" },
      resourcesPath: dir,
      execPath: "/test/tadahue",
    }),
  );
  await assert.rejects(
    access(join(dir, "applications", portalAppId + ".desktop")),
    { code: "ENOENT" },
  );
});
