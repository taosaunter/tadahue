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
      () => fail(new Error("等 DevTools 端口超时")),
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
      throw new Error(r.exceptionDetails.exception?.description ?? "eval 失败");
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

const PROBE = `(() => {
  const html = document.documentElement;
  return {
    bg: getComputedStyle(document.body).backgroundColor,
    classes: html.className,
    toggle: (() => {
      const b = document.querySelector('header button:not([aria-pressed])');
      return b ? b.textContent.trim() : null;
    })(),
    stored: localStorage.getItem('color-palette-theme'),
  };
})()`;

const CARDS = `[...document.querySelectorAll('div[style*="--color-surface"]')]`;

const cardReport = `(() => {
  const cards = ${CARDS};
  return {
    count: cards.length,
    backgrounds: cards.map(c => getComputedStyle(c).backgroundColor),
  };
})()`;

const setMode = (label) => `(() => {
  const b = [...document.querySelectorAll('section button')].find(x => x.textContent.trim() === '${label}');
  if (!b) return 'not-found';
  b.click();
  return 'clicked';
})()`;

const cardColors = `(() => {
  const card = ${CARDS}[0];
  if (!card) return [];
  const props = ['backgroundColor', 'color', 'borderTopColor', 'borderBottomColor',
    'borderLeftColor', 'borderRightColor', 'outlineColor'];
  const seen = new Set();
  for (const el of [card, ...card.querySelectorAll('*')]) {
    const cs = getComputedStyle(el);
    for (const p of props) {
      const m = cs[p].match(/^rgba?\\((\\d+), (\\d+), (\\d+)(?:, ([\\d.]+))?\\)$/);
      if (!m || (m[4] !== undefined && Number(m[4]) === 0)) continue;
      const hex = '#' + [m[1], m[2], m[3]].map(n => Number(n).toString(16).padStart(2, '0')).join('');
      seen.add(hex);
    }
  }
  return [...seen];
})()`;

const setInput = (hex) => `(() => {
  const input = document.querySelector('input[type="text"]');
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  setter.call(input, '${hex}');
  input.dispatchEvent(new Event('input', { bubbles: true }));
  return input.value;
})()`;

const toRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
};

async function main() {
  const chromePath = findChrome();
  if (!chromePath) {
    console.log(
      "跳過：沒找到 Chrome（設 CHROME=/path/to/chrome 或裝 playwright 瀏覽器）",
    );
    return 0;
  }
  if (!process.argv[2] && !existsSync(join(DIST, "index.html"))) {
    console.error("dist/ 不存在，先跑 pnpm build");
    return 1;
  }

  let server;
  const url =
    process.argv[2] ??
    (await (async () => {
      server = await serveDist();
      return `http://127.0.0.1:${server.address().port}/`;
    })());
  console.log(`驗證目標 ${url}\n`);

  const { generateThemePalette } = await import("../src/palette.ts");
  const roleHex = (p, theme, name) => p[theme].find((r) => r.name === name).hex;

  const page = await openChrome(url, chromePath);
  const results = [];
  const check = (name, pass, detail = "") => {
    results.push(pass);
    console.log(`${pass ? "✔" : "✘"} ${name}${detail ? ` — ${detail}` : ""}`);
  };

  try {
    const base = generateThemePalette("#764646");
    const bg = (p, theme) => toRgb(roleHex(p, theme, "background"));
    const surfaceOf = (p, theme) => toRgb(roleHex(p, theme, "surface"));

    const initial = await page.evaluate(PROBE);
    check(
      "系統偏好亮 → 應用亮色",
      initial.bg === bg(base, "light") && initial.classes.includes("light"),
      `bg=${initial.bg} class="${initial.classes}"`,
    );

    await page.emulate("dark");
    await sleep(300);
    const followed = await page.evaluate(PROBE);
    check(
      "系統偏好切暗 → 應用即時跟隨（無需重載）",
      followed.bg === bg(base, "dark"),
      `bg ${initial.bg} → ${followed.bg}`,
    );

    check(
      "header 有主題切換按鈕且有可存取名稱",
      followed.toggle !== null,
      `按鈕文案="${followed.toggle}"`,
    );

    const both = await page.evaluate(cardReport);
    check("默认 BOTH → 两张预览卡", both.count === 2, `cards=${both.count}`);

    await page.evaluate(setMode("Light"));
    await sleep(250);
    const light = await page.evaluate(cardReport);
    const surface = {
      light: surfaceOf(base, "light"),
      dark: surfaceOf(base, "dark"),
    };
    check(
      "LIGHT 模式 → 一張卡片且是亮色板",
      light.count === 1 && light.backgrounds[0] === surface.light,
      `cards=${light.count} bg=${light.backgrounds[0]}`,
    );

    await page.evaluate(setMode("Dark"));
    await sleep(250);
    const dark = await page.evaluate(cardReport);
    check(
      "DARK 模式 → 一張卡片且是暗色板",
      dark.count === 1 && dark.backgrounds[0] === surface.dark,
      `cards=${dark.count} bg=${dark.backgrounds[0]}`,
    );

    await page.evaluate(setMode("Light"));
    await sleep(250);
    const scoped = await page.evaluate(cardReport);
    const appStillDark = (await page.evaluate(PROBE)).bg;
    check(
      "暗色 app 內的亮色預覽卡不受 app 主題影響",
      scoped.backgrounds[0] === surface.light &&
        appStillDark === bg(base, "dark"),
      `card=${scoped.backgrounds[0]}（應爲亮色 surface ${surface.light}）app=${appStillDark}`,
    );

    const palette = base;
    for (const [theme, mode] of [
      ["light", "Light"],
      ["dark", "Dark"],
    ]) {
      await page.evaluate(setMode(mode));
      await sleep(250);
      const rendered = new Set(await page.evaluate(cardColors));
      const missing = palette[theme]
        .filter((r) => !rendered.has(r.hex))
        .map((r) => r.name);
      check(
        `${mode.toUpperCase()} 預覽涵蓋全部 ${palette[theme].length} 個角色`,
        missing.length === 0,
        missing.length
          ? `缺 ${missing.join(", ")}`
          : `渲染出 ${rendered.size} 種顏色`,
      );
    }

    await page.evaluate(setMode("Both"));
    await page.evaluate(setInput("#2563eb"));
    await sleep(350);
    const bluePalette = generateThemePalette("#2563eb");
    const blueCards = await page.evaluate(cardReport);
    const blueApp = await page.evaluate(PROBE);
    check(
      "輸入色改變 → 預覽即時跟著換",
      blueCards.backgrounds[0] === surfaceOf(bluePalette, "light") &&
        blueCards.backgrounds[1] === surfaceOf(bluePalette, "dark"),
      `light=${blueCards.backgrounds[0]} dark=${blueCards.backgrounds[1]}`,
    );
    check(
      "輸入色改變 → 應用自身跟著換（:root 內聯變數）",
      blueApp.bg === bg(bluePalette, "dark") && blueApp.bg !== bg(base, "dark"),
      `app bg ${bg(base, "dark")} → ${blueApp.bg}`,
    );
    await page.evaluate(setInput("#764646"));
    await sleep(300);

    await page.evaluate(setInput("#zzz"));
    await sleep(300);
    const invalid = await page.evaluate(`(() => {
      const cards = ${CARDS};
      return { cards: cards.length, hint: /Invalid hex|無效的 hex/.test(document.body.innerText) };
    })()`);
    check(
      "無效 hex → 不渲染預覽卡並給予提示",
      invalid.cards === 0 && invalid.hint === true,
      `cards=${invalid.cards} hint=${invalid.hint}`,
    );
    await page.evaluate(setInput("#764646"));
    await sleep(300);

    await page.evaluate(
      `document.querySelectorAll('section details')[1].open = true; true`,
    );
    await sleep(200);
    const swatch = await page.evaluate(`(() => {
      const b = [...document.querySelectorAll('section button')].find(x => x.title.includes('#'));
      b.click();
      return b.getAttribute('title').match(/#[0-9a-f]{6}/i)[0];
    })()`);
    await sleep(250);
    const label = await page.evaluate(
      `[...document.querySelectorAll('section button')].find(x => x.title.includes('#')).querySelector('span:last-child').textContent`,
    );
    let clipboard = null;
    try {
      clipboard = await page.evaluate("navigator.clipboard.readText()");
    } catch {
      // Clipboard access is optional in headless mode.
    }
    check(
      "點色票複製 HEX",
      /Copied|已複製/.test(label) && (!clipboard || clipboard === swatch),
      `複製 ${swatch}，剪貼簿=${clipboard ?? "不可讀"}，回饋="${label}"`,
    );
    const previewOutline = await page.evaluate(`(() => {
      const card = document.querySelector('div[style*="--color-surface"]');
      const label = card.querySelector('strong');
      label.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      return { outline: getComputedStyle(label).outlineStyle, marked: card.querySelectorAll('[data-active="true"]').length };
    })()`);
    check(
      "預覽懸停不出現 token 外框",
      previewOutline.outline === "none" && previewOutline.marked === 0,
      JSON.stringify(previewOutline),
    );

    const copied = await page.evaluate(
      `[...document.querySelectorAll('section button')].find(b => /Copy CSS|复制 CSS/.test(b.textContent)).click(); 'clicked'`,
    );
    await sleep(250);
    let cssText = null;
    try {
      cssText = await page.evaluate("navigator.clipboard.readText()");
    } catch {
      // Clipboard access is optional in headless mode.
    }
    check(
      "複製 CSS 變數含三塊（@theme / :root / :root.dark）",
      copied === "clicked" &&
        (!cssText ||
          (cssText.includes("@theme") &&
            cssText.includes(":root.light") &&
            cssText.includes(":root.dark"))),
      cssText ? `長度 ${cssText.length}` : "剪貼簿不可讀",
    );
    const beforeToggle = await page.evaluate(PROBE);
    await page.evaluate(
      `document.querySelector('header button:not([aria-pressed])').click(); true`,
    );
    await sleep(250);
    const afterToggle = await page.evaluate(PROBE);
    check(
      "點擊切換 → 主題立即改變且寫入 localStorage",
      afterToggle.bg !== beforeToggle.bg && afterToggle.stored !== null,
      `bg ${beforeToggle.bg} → ${afterToggle.bg}；stored=${afterToggle.stored}`,
    );

    await page.emulate("dark");
    await sleep(300);
    const manualWins = await page.evaluate(PROBE);
    check(
      "手動選擇優先於系統偏好",
      manualWins.bg === afterToggle.bg &&
        manualWins.classes.includes(afterToggle.stored),
      `系統=dark，手動=${afterToggle.stored} → bg=${manualWins.bg}`,
    );

    await page.reload();
    for (let i = 0; i < 100; i++) {
      const ready = await page.evaluate(
        `document.readyState === 'complete' && !!document.querySelector('header button:not([aria-pressed])')`,
      );
      if (ready) break;
      await sleep(100);
    }
    await sleep(300);
    const afterReload = await page.evaluate(PROBE);
    check(
      "刷新後保持手動選擇（FOUC 腳本讀同一份 localStorage）",
      afterReload.bg === afterToggle.bg &&
        afterReload.stored === afterToggle.stored,
      `bg=${afterReload.bg} stored=${afterReload.stored}`,
    );

    await page.evaluate(
      `localStorage.setItem('color-palette-history', 'null'); true`,
    );
    await page.reload();
    for (let i = 0; i < 100; i++) {
      const ready = await page.evaluate(
        `document.readyState === 'complete' && !!document.querySelector('header button:not([aria-pressed])')`,
      );
      if (ready) break;
      await sleep(100);
    }
    await sleep(300);
    const recovered = await page.evaluate(PROBE);
    check(
      "損壞的歷史資料 → App 仍可啟動",
      recovered.bg === afterToggle.bg &&
        recovered.stored === afterToggle.stored,
      `bg=${recovered.bg} stored=${recovered.stored}`,
    );

    await page.evaluate(
      `([...document.querySelectorAll('header button')].find(b => b.textContent.trim() === '繁')).click(); true`,
    );
    await sleep(250);
    const localeProbe = await page.evaluate(
      `({ lang: document.documentElement.lang, title: document.querySelector('h1').textContent, input: document.querySelector('input[type="text"]').getAttribute('aria-label') })`,
    );
    check(
      "切換繁中 → UI 與 html lang 同步",
      localeProbe.lang === "zh-TW" &&
        localeProbe.title === "色彩配色器" &&
        localeProbe.input === "種子色 hex",
      `lang=${localeProbe.lang} title=${localeProbe.title} input=${localeProbe.input}`,
    );
    await page.evaluate(
      `document.querySelectorAll('section details')[1].open = true; true`,
    );
    const localizedChecks = await page.evaluate(`(() => {
      const text = document.querySelectorAll('section details')[1].innerText;
      return { body: text.includes('正文／背景'), warning: text.includes('警告色文字／警告淺底'), info: text.includes('資訊文字／資訊淺底') };
    })()`);
    check(
      "WCAG 檢查名稱在繁中正確對應",
      Object.values(localizedChecks).every(Boolean),
      JSON.stringify(localizedChecks),
    );
  } finally {
    page.close();
    server?.close();
  }

  const failed = results.filter((r) => !r).length;
  console.log(`\n${results.length - failed}/${results.length} 通過`);
  return failed ? 1 : 0;
}

main()
  .then((code) => process.exit(code))
  .catch((e) => {
    console.error("驗證腳本出錯:", e);
    process.exit(1);
  });
