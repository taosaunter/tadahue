#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, readdirSync } from "node:fs";
import { readFile, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const DIST = resolve(import.meta.dirname, "../dist");
const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".json": "application/json",
};

function findChrome() {
  if (process.env.CHROME) return process.env.CHROME;
  const home = process.env.HOME ?? "";
  const cache = join(home, ".cache/ms-playwright");
  if (!existsSync(cache)) return null;
  for (const dir of ["chrome-linux64", "chrome-linux"]) {
    for (const entry of readdirSync(cache)) {
      const p = join(cache, entry, dir, "chrome");
      if (existsSync(p)) return p;
    }
  }
  return null;
}

function serveDist() {
  const server = createServer(async (req, res) => {
    const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
    const file = join(DIST, path === "/" ? "index.html" : path);
    try {
      const body = await readFile(file);
      res.writeHead(200, {
        "content-type": MIME[extname(file)] ?? "application/octet-stream",
      });
      res.end(body);
    } catch {
      res.writeHead(404).end("not found");
    }
  });
  return new Promise((ok) => server.listen(0, "127.0.0.1", () => ok(server)));
}

async function openChrome(url, chromePath, { colorScheme = "light" } = {}) {
  const profile = await mkdtemp(join(tmpdir(), "verify-theme-"));
  const chrome = spawn(
    chromePath,
    [
      "--headless=new",
      "--no-sandbox",
      "--disable-gpu",
      "--hide-scrollbars",
      "--remote-debugging-port=0",
      `--user-data-dir=${profile}`,
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );

  const port = await new Promise((ok, fail) => {
    const timer = setTimeout(
      () => fail(new Error("Timed out waiting for DevTools")),
      15000,
    );
    let buf = "";
    chrome.stderr.on("data", (d) => {
      buf += d.toString();
      const m = buf.match(/ws:\/\/127\.0\.0\.1:(\d+)\//);
      if (m) {
        clearTimeout(timer);
        ok(Number(m[1]));
      }
    });
  });

  const wsUrl = (
    await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()
  ).webSocketDebuggerUrl;
  const ws = new WebSocket(wsUrl);
  await new Promise((r) => {
    ws.onopen = r;
  });

  let msgId = 0;
  const pending = new Map();
  const events = [];
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve: ok, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else ok(msg.result);
    } else if (msg.method) events.push(msg);
  };
  const raw = (method, params = {}, sessionId) =>
    new Promise((ok, fail) => {
      const id = ++msgId;
      pending.set(id, { resolve: ok, reject: fail });
      ws.send(
        JSON.stringify({
          id,
          method,
          params,
          ...(sessionId ? { sessionId } : {}),
        }),
      );
    });

  const { targetId } = await raw("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await raw("Target.attachToTarget", {
    targetId,
    flatten: true,
  });
  const send = (method, params) => raw(method, params, sessionId);
  const evaluate = async (expression) => {
    const r = await send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (r.exceptionDetails)
      throw new Error(
        r.exceptionDetails.exception?.description ??
          "Browser evaluation failed",
      );
    return r.result.value;
  };

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-color-scheme", value: colorScheme }],
  });
  try {
    await raw("Browser.grantPermissions", {
      origin: new URL(url).origin,
      permissions: ["clipboardReadWrite", "clipboardSanitizedWrite"],
    });
  } catch {
    // Some browsers do not expose clipboard permissions.
  }

  await send("Page.navigate", { url });
  for (
    let i = 0;
    i < 100 && !events.some((e) => e.method === "Page.loadEventFired");
    i++
  )
    await sleep(100);
  await sleep(300);

  return {
    evaluate,
    reload: () => send("Page.reload", {}),
    emulate: (scheme) =>
      send("Emulation.setEmulatedMedia", {
        features: [{ name: "prefers-color-scheme", value: scheme }],
      }),
    close: () => {
      ws.close();
      chrome.kill();
    },
  };
}

// Verify the current six-tab workspace rather than the retired dual-card preview UI.
async function main() {
  const chromePath = findChrome();
  if (!chromePath) {
    console.log(
      "Skipped: set CHROME=/path/to/chromium or install a Playwright browser.",
    );
    return 0;
  }
  const { generateThemePalette } = await import("../src/color/palette.ts");
  let server, page;
  const results = [];
  const check = (label, passed) => {
    results.push(passed);
    console.log(`${passed ? "PASS" : "FAIL"}: ${label}`);
  };
  try {
    const url =
      process.argv[2] ??
      (await (async () => {
        server = await serveDist();
        return `http://127.0.0.1:${server.address().port}/`;
      })());
    page = await openChrome(url, chromePath);
    const click = async (selector) => {
      await page.evaluate(
        `document.querySelector(${JSON.stringify(selector)}).click()`,
      );
      await sleep(80);
    };
    const appearance = () =>
      page.evaluate(
        `({theme: document.documentElement.className, background: getComputedStyle(document.body).backgroundColor, stored: localStorage.getItem('color-palette-theme')})`,
      );
    const expectedRgb = (hex) =>
      `rgb(${[1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16)).join(", ")})`;
    const expectedPalette = async () => {
      const [seed, accent] = await page.evaluate(
        `[...document.querySelectorAll('.color-input')].map(input=>input.value)`,
      );
      return generateThemePalette(seed, "balanced", undefined, accent);
    };
    const role = (palette, mode, name) =>
      palette[mode].find((item) => item.name === name).hex;
    const initial = await appearance();
    check(
      "System light appearance applies to the app",
      initial.theme.includes("light"),
    );
    await page.emulate("dark");
    await sleep(150);
    check(
      "System changes update appearance without reload",
      (await appearance()).theme.includes("dark"),
    );
    await click('button[aria-controls="workspace-tools"]');
    const baseline = await expectedPalette();
    check(
      "Dark app background uses generated tokens",
      (await appearance()).background ===
        expectedRgb(role(baseline, "dark", "background")),
    );

    for (const tab of [
      "preview",
      "tuning",
      "tokens",
      "palettes",
      "image",
      "library",
    ]) {
      await click(`#tab-${tab}`);
      const geometry = await page.evaluate(`(()=>{
        const rect=s=>document.querySelector(s).getBoundingClientRect();
        const left=rect('.controls-pane'),right=rect('.tools-pane');
        const toolbar=rect('.panel-toolbar'),tabs=rect('.workspace-tabs');
        return {equal:Math.abs(left.height-right.height)<1,aligned:Math.abs(toolbar.top-tabs.top)<1,
          selected:document.querySelector('#tab-${tab}').getAttribute('aria-selected')==='true',
          hidden:document.querySelector('#panel-${tab}').hidden};
      })()`);
      check(
        `${tab}: equal pane heights and aligned toolbars`,
        geometry.equal && geometry.aligned,
      );
      check(
        `${tab}: selected tab exposes its panel`,
        geometry.selected && !geometry.hidden,
      );
    }
    await click("#tab-tokens");
    check(
      "All 28 tokens have swatches",
      await page.evaluate(
        `document.querySelectorAll('#panel-tokens .swatch-button').length===28`,
      ),
    );
    await click("#panel-tokens .swatch-button");
    const copied = await page.evaluate(`navigator.clipboard.readText()`);
    check("Token swatches copy HEX values", copied === baseline.dark[0].hex);
    await page.evaluate(
      `window.__verifyClipboardWrite = navigator.clipboard.writeText; navigator.clipboard.writeText = () => Promise.reject(new Error('Clipboard unavailable'));`,
    );
    await click("#panel-tokens .swatch-button");
    check(
      "Clipboard failure keeps accessible feedback",
      await page.evaluate(
        `document.querySelector('#panel-tokens .swatch-button').getAttribute('aria-label').includes('Could not copy') && document.querySelector('#panel-tokens [role=status]').textContent.includes('Could not copy')`,
      ),
    );
    await page.evaluate(
      `navigator.clipboard.writeText = window.__verifyClipboardWrite; delete window.__verifyClipboardWrite;`,
    );
    await click("#tab-preview");
    const previewBackground = await page.evaluate(
      `getComputedStyle(document.querySelector('.preview-canvas')).backgroundColor`,
    );
    check(
      "Preview uses the current theme's scoped surface",
      previewBackground === expectedRgb(role(baseline, "dark", "surface")),
    );
    await click('button[aria-label="Switch to light theme"]');
    check(
      "Manual appearance overrides system preference",
      (await appearance()).theme.includes("light"),
    );
    const valueSetter = (value) =>
      `(()=>{const input=document.querySelector('.color-input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)});input.dispatchEvent(new Event('input',{bubbles:true}));})()`;
    await page.evaluate(valueSetter("#2563eb"));
    await sleep(100);
    const blue = await expectedPalette();
    check(
      "Color edits update app tokens",
      (await appearance()).background ===
        expectedRgb(role(blue, "light", "background")),
    );
    check(
      "Color edits update preview tokens",
      (await page.evaluate(
        `getComputedStyle(document.querySelector('.preview-canvas')).backgroundColor`,
      )) === expectedRgb(role(blue, "light", "surface")),
    );
    await page.evaluate(valueSetter("#invalid"));
    await sleep(80);
    check(
      "Invalid HEX shows a hint and removes the preview",
      await page.evaluate(
        `!document.querySelector('.preview-canvas') && /Invalid hex/.test(document.body.innerText)`,
      ),
    );
    await page.evaluate(valueSetter("#764646"));
    await sleep(80);
    await click(".output-actions button:nth-child(2)");
    const css = await page.evaluate(`navigator.clipboard.readText()`);
    check(
      "CSS export retains light and dark token blocks",
      css.includes(":root.light") &&
        css.includes(":root.dark") &&
        css.includes("@theme"),
    );
    await click(".output-toolbar > button");
    await click("#tab-library");
    check(
      "Saved palette appears in its tab",
      await page.evaluate(
        `document.querySelectorAll('.library-list li').length===1`,
      ),
    );
    const stored = (await appearance()).stored;
    await page.reload();
    await sleep(300);
    check(
      "Manual appearance survives reload",
      (await appearance()).stored === stored &&
        (await appearance()).theme.includes(stored),
    );
    await click('button[aria-controls="workspace-tools"]');
    await click("#tab-library");
    check(
      "Saved palette survives reload",
      await page.evaluate(
        `document.querySelectorAll('.library-list li').length===1`,
      ),
    );
    console.log(
      `\n${results.filter(Boolean).length}/${results.length} checks passed.`,
    );
    return results.every(Boolean) ? 0 : 1;
  } finally {
    page?.close();
    server?.close();
  }
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
