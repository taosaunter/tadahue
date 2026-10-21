#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { extname, join, resolve } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'

const DIST = resolve(import.meta.dirname, '../dist')
const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
}

function findChrome() {
  if (process.env.CHROME) return process.env.CHROME
  const home = process.env.HOME ?? ''
  const cache = join(home, '.cache/ms-playwright')
  if (!existsSync(cache)) return null
  for (const dir of ['chrome-linux64', 'chrome-linux']) {
    for (const entry of readdirSync(cache)) {
      const p = join(cache, entry, dir, 'chrome')
      if (existsSync(p)) return p
    }
  }
  return null
}

function serveDist() {
  const server = createServer(async (req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname)
    const file = join(DIST, path === '/' ? 'index.html' : path)
    try {
      const body = await readFile(file)
      res.writeHead(200, {
        'content-type': MIME[extname(file)] ?? 'application/octet-stream',
      })
      res.end(body)
    } catch {
      res.writeHead(404).end('not found')
    }
  })
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok(server)))
}

async function openChrome(url, chromePath, { colorScheme = 'light' } = {}) {
  const profile = await mkdtemp(join(tmpdir(), 'verify-theme-'))
  const chrome = spawn(
    chromePath,
    [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      '--hide-scrollbars',
      '--remote-debugging-port=0',
      `--user-data-dir=${profile}`,
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  )

  const port = await new Promise((ok, fail) => {
    const timer = setTimeout(
      () => fail(new Error('Timed out waiting for DevTools')),
      15000,
    )
    let buf = ''
    chrome.stderr.on('data', (d) => {
      buf += d.toString()
      const m = buf.match(/ws:\/\/127\.0\.0\.1:(\d+)\//)
      if (m) {
        clearTimeout(timer)
        ok(Number(m[1]))
      }
    })
  })

  const wsUrl = (
    await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()
  ).webSocketDebuggerUrl
  const ws = new WebSocket(wsUrl)
  await new Promise((r) => {
    ws.onopen = r
  })

  let msgId = 0
  const pending = new Map()
  const events = []
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data)
    if (msg.id && pending.has(msg.id)) {
      const { resolve: ok, reject } = pending.get(msg.id)
      pending.delete(msg.id)
      if (msg.error) reject(new Error(JSON.stringify(msg.error)))
      else ok(msg.result)
    } else if (msg.method) events.push(msg)
  }
  const raw = (method, params = {}, sessionId) =>
    new Promise((ok, fail) => {
      const id = ++msgId
      pending.set(id, { resolve: ok, reject: fail })
      ws.send(
        JSON.stringify({
          id,
          method,
          params,
          ...(sessionId ? { sessionId } : {}),
        }),
      )
    })

  const { targetId } = await raw('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await raw('Target.attachToTarget', {
    targetId,
    flatten: true,
  })
  const send = (method, params) => raw(method, params, sessionId)
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    })
    if (r.exceptionDetails)
      throw new Error(
        r.exceptionDetails.exception?.description ??
          'Browser evaluation failed',
      )
    return r.result.value
  }

  await send('Page.enable')
  await send('Runtime.enable')
  await send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-color-scheme', value: colorScheme }],
  })
  try {
    await raw('Browser.grantPermissions', {
      origin: new URL(url).origin,
      permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'],
    })
  } catch {
    // Some browsers do not expose clipboard permissions.
  }

  await send('Page.navigate', { url })
  for (
    let i = 0;
    i < 100 && !events.some((e) => e.method === 'Page.loadEventFired');
    i++
  )
    await sleep(100)
  await sleep(300)

  return {
    evaluate,
    send,
    reload: () => send('Page.reload', {}),
    emulate: (scheme) =>
      send('Emulation.setEmulatedMedia', {
        features: [{ name: 'prefers-color-scheme', value: scheme }],
      }),
    close: () => {
      ws.close()
      chrome.kill()
    },
  }
}

// Verify the approved proofing desk against its real palette, storage and exports.
async function main() {
  const chromePath = findChrome()
  if (!chromePath)
    throw new Error('Set CHROME=/path/to/chromium to verify the UI.')
  const { generateThemePalette } = await import('../src/color/palette.ts')
  let server, page
  const results = []
  const check = (label, passed) => {
    results.push(passed)
    console.log(`${passed ? 'PASS' : 'FAIL'}: ${label}`)
  }
  try {
    const url =
      process.argv[2] ??
      (await (async () => {
        server = await serveDist()
        return `http://127.0.0.1:${server.address().port}/`
      })())
    page = await openChrome(url, chromePath)
    const click = async (selector) => {
      await page.evaluate(
        `document.querySelector(${JSON.stringify(selector)}).click()`,
      )
      await sleep(100)
    }
    const resize = async (width, height) => {
      await page.send('Emulation.setDeviceMetricsOverride', {
        width,
        height,
        deviceScaleFactor: 1,
        mobile: false,
      })
      await sleep(100)
    }
    const setSeed = async (value) => {
      await page.evaluate(
        `(()=>{const input=document.querySelector('.base-color-field .color-input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)});input.dispatchEvent(new Event('input',{bubbles:true}));})()`,
      )
      await sleep(100)
    }
    const screenshot = async (name) => {
      await page.evaluate('document.fonts.ready')
      const { data } = await page.send('Page.captureScreenshot', {
        format: 'png',
      })
      await writeFile(
        join(tmpdir(), `tadahue-${name}.png`),
        Buffer.from(data, 'base64'),
      )
    }
    const noOverflow = () =>
      page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    await resize(1440, 1024)
    check(
      'System light appearance applies',
      await page.evaluate(
        "document.documentElement.classList.contains('light')",
      ),
    )
    await page.emulate('dark')
    await sleep(100)
    check(
      'System appearance updates without reloading',
      await page.evaluate(
        "document.documentElement.classList.contains('dark')",
      ),
    )
    await page.emulate('light')
    await sleep(100)
    const chromeBackground = await page.evaluate(
      'getComputedStyle(document.body).backgroundColor',
    )
    const seed = await page.evaluate(
      "document.querySelector('.color-input').value",
    )
    const accent = await page.evaluate(
      "document.querySelector('.advanced-body .color-input').value",
    )
    const baseline = generateThemePalette(seed, 'balanced', undefined, accent)
    const checks = baseline.checks.light
    const mainCheck = checks.find(
      (check) => check.fg === 'on-primary' && check.bg === 'primary',
    )
    check(
      'Contrast summary displays the calculated ratio',
      await page.evaluate(
        `document.querySelector('.contrast-summary .contrast-badge').textContent.includes('${mainCheck.ratio.toFixed(2)}')`,
      ),
    )
    await setSeed('#2563eb')
    check(
      'Changing color retains neutral app chrome',
      chromeBackground ===
        (await page.evaluate(
          'getComputedStyle(document.body).backgroundColor',
        )),
    )
    const lastPreview = await page.evaluate(
      "document.querySelector('.preview-canvas').getAttribute('style')",
    )
    await setSeed('#invalid')
    check(
      'Incomplete HEX retains the last valid preview and disables outputs',
      await page.evaluate(
        `document.querySelector('.preview-canvas').getAttribute('style')===${JSON.stringify(lastPreview)} && document.querySelector('.save-button').disabled && document.querySelector('.header-export').disabled && !!document.querySelector('[aria-invalid=true][aria-describedby]')`,
      ),
    )
    await setSeed(seed)
    await click('.preview-appearance button[aria-label="Dark"]')
    check(
      'Preview theme is independent of app appearance',
      await page.evaluate(
        "document.querySelector('.preview-canvas').dataset.theme==='dark' && document.documentElement.classList.contains('light')",
      ),
    )
    await click('.preview-appearance button[aria-label="Light"]')
    await click('.header-export')
    check(
      'Export opens an accessible dialog',
      await page.evaluate(
        "!!document.querySelector('.export-sheet[role=dialog][aria-labelledby][aria-describedby]')",
      ),
    )
    for (const format of ['css', 'tailwind', 'json']) {
      await click(`#tab-${format}`)
      const content = await page.evaluate(
        "document.querySelector('.export-code code').textContent",
      )
      await click('.export-footer button')
      const copied = await page.evaluate('navigator.clipboard.readText()')
      check(
        `${format}: copies the complete displayed export`,
        copied === content && content.length > 1000,
      )
      if (format === 'css')
        check(
          'CSS contains both themes and Tailwind v4 tokens',
          content.includes(':root.light') &&
            content.includes(':root.dark') &&
            content.includes('@theme'),
        )
      if (format === 'json') check('Token JSON parses', !!JSON.parse(content))
    }
    await page.evaluate(
      "window.originalWrite=navigator.clipboard.writeText; navigator.clipboard.writeText=()=>Promise.reject(new Error('unavailable'))",
    )
    await click('.export-footer button')
    check(
      'Clipboard errors have accessible feedback',
      await page.evaluate(
        "document.querySelector('.export-footer [role=status]').textContent.includes('Could not copy')",
      ),
    )
    await page.evaluate('navigator.clipboard.writeText=window.originalWrite')
    await page.send('Input.dispatchKeyEvent', {
      type: 'keyDown',
      key: 'Escape',
      code: 'Escape',
    })
    await page.send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      key: 'Escape',
      code: 'Escape',
    })
    await sleep(150)
    check(
      'Escape closes the drawer and restores opener focus',
      await page.evaluate(
        "!document.querySelector('.export-sheet') && document.activeElement.classList.contains('header-export')",
      ),
    )
    await click('.contrast-summary button')
    check(
      'Contrast drawer includes every actual check',
      await page.evaluate(
        `document.querySelectorAll('.contrast-table tbody tr').length===${checks.length}`,
      ),
    )
    await click('.contrast-sheet .sheet-heading button')
    await click('.advanced-controls summary')
    await click('#tab-tokens')
    check(
      'Advanced tokens remain available',
      await page.evaluate(
        "document.querySelectorAll('#panel-tokens .swatch-button').length===28",
      ),
    )
    await click('#panel-tokens .swatch-button')
    check(
      'Token swatches copy their actual HEX',
      (await page.evaluate('navigator.clipboard.readText()')) ===
        baseline.light[0].hex,
    )
    await click('.advanced-controls summary')
    await page.evaluate("document.querySelector('.wheel-handle').focus()")
    await page.send('Input.dispatchKeyEvent', {
      type: 'keyDown',
      key: 'ArrowRight',
      code: 'ArrowRight',
    })
    await page.send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      key: 'ArrowRight',
      code: 'ArrowRight',
    })
    await sleep(100)
    check(
      'Hue anchors can be edited with the keyboard',
      await page.evaluate(
        `document.querySelector('.color-input').value!==${JSON.stringify(seed)}`,
      ),
    )
    await setSeed(seed)
    await click('.base-color-field .color-swatch-trigger')
    check(
      'RGB editor opens from the color swatch',
      await page.evaluate(
        "document.querySelector('.base-color-field .rgb-popover').matches(':popover-open')",
      ),
    )
    await page.send('Input.dispatchKeyEvent', {
      type: 'keyDown',
      key: 'Escape',
      code: 'Escape',
    })
    await page.send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      key: 'Escape',
      code: 'Escape',
    })
    await click('.source-options button:last-child')
    await page.evaluate(`(async()=>{
      const canvas=document.createElement('canvas');canvas.width=100;canvas.height=100;
      const context=canvas.getContext('2d');
      ['#386957','#BB7954','#D9E8B0','#7293BF','#C1A1C6'].forEach((color,i)=>{context.fillStyle=color;context.fillRect(i*20,0,20,100)});
      const blob=await new Promise(resolve=>canvas.toBlob(resolve));
      const transfer=new DataTransfer();transfer.items.add(new File([blob],'palette.png',{type:'image/png'}));
      const input=document.querySelector('.image-source input[type=file]');input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));
    })()`)
    for (
      let i = 0;
      i < 30 &&
      !(await page.evaluate("!!document.querySelector('.image-preview')"));
      i++
    )
      await sleep(100)
    check(
      'Local image extraction remains functional',
      await page.evaluate(
        "!!document.querySelector('.image-preview') && document.querySelectorAll('.image-color').length>1",
      ),
    )
    await click('.source-options button:first-child')
    await click('.source-options button:last-child')
    check(
      'Switching color sources preserves the extracted image',
      await page.evaluate("!!document.querySelector('.image-preview')"),
    )
    await click('.image-remove')
    await click('.source-options button:first-child')
    await click('.save-button')
    await click('.desktop-navigation button:last-child')
    check(
      'Saved palette appears in the library',
      await page.evaluate(
        "document.querySelectorAll('.library-list li').length===1",
      ),
    )
    await click('.library-heading button')
    await setSeed('#b94b43')
    await click('.desktop-navigation button:last-child')
    await click('.saved-palette')
    check(
      'Loading restores the exact saved seed and returns to the studio',
      await page.evaluate(
        `document.querySelector('.color-input').value===${JSON.stringify(seed)} && document.querySelector('.proofing-desk').dataset.view==='edit'`,
      ),
    )
    await page.reload()
    await sleep(300)
    await click('.desktop-navigation button:last-child')
    check(
      'Saved palettes survive reload',
      await page.evaluate(
        "document.querySelectorAll('.library-list li').length===1",
      ),
    )
    await click('.delete-palette')
    check(
      'Delete removes the saved palette',
      await page.evaluate(
        "!document.querySelector('.library-list li') && !!document.querySelector('.library-empty')",
      ),
    )
    await click('.library-heading button')
    await page.evaluate(
      "window.originalStorage=Storage.prototype.setItem; Storage.prototype.setItem=()=>{throw new Error('storage unavailable')}",
    )
    await click('.save-button')
    check(
      'Storage failure is visible and keeps the current palette',
      await page.evaluate(
        "!!document.querySelector('.save-feedback.feedback-error').textContent && !!document.querySelector('.preview-canvas')",
      ),
    )
    await page.evaluate('Storage.prototype.setItem=window.originalStorage')
    await click('.save-button')
    await sleep(2450)
    await click('.header-settings > button')
    await click('.preference-row button:last-child')
    check(
      'Traditional Chinese labels are available',
      await page.evaluate(
        "document.querySelector('.header-export').textContent.includes('匯出')",
      ),
    )
    await page.evaluate(
      "document.querySelector('.app-settings-panel').hidePopover()",
    )
    await screenshot('desktop')
    await click('.header-export')
    await screenshot('export')
    await click('.export-sheet .sheet-heading button')
    for (const [width, height] of [
      [1120, 900],
      [900, 900],
      [390, 1080],
      [356, 520],
    ]) {
      await resize(width, height)
      check(`${width}px: no horizontal page overflow`, await noOverflow())
    }
    await resize(390, 1080)
    await screenshot('mobile-editor')
    const before = await page.evaluate(
      "document.querySelector('.color-input').value",
    )
    await click('#tab-preview')
    check(
      'Narrow preview hides the editor and retains colors',
      await page.evaluate(
        `getComputedStyle(document.querySelector('.editor-region')).display==='none' && getComputedStyle(document.querySelector('.results-pane')).display!=='none' && document.querySelector('.color-input').value===${JSON.stringify(before)}`,
      ),
    )
    await screenshot('mobile-preview')
    await click('.mobile-output > button:last-child')
    check(
      'Narrow export fits inside the viewport',
      await page.evaluate(
        "document.querySelector('.export-sheet').getBoundingClientRect().width<=innerWidth",
      ),
    )
    await screenshot('mobile-export')
    await click('.export-sheet .sheet-heading button')
    await click('#tab-edit')
    await click('.header-settings > button')
    await click('.preference-row:last-of-type button')
    await page.evaluate(
      "document.querySelector('.app-settings-panel').hidePopover()",
    )
    await resize(1440, 1024)
    await screenshot('dark')
    check(
      'Manual app theme persists',
      await page.evaluate(
        "localStorage.getItem('color-palette-theme')==='dark'",
      ),
    )
    console.log(
      `\n${results.filter(Boolean).length}/${results.length} checks passed. Screenshots: /tmp/tadahue-*.png`,
    )
    return results.every(Boolean) ? 0 : 1
  } finally {
    page?.close()
    server?.close()
  }
}

main()
  .then((code) => {
    process.exitCode = code
  })
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
