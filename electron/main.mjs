// Desktop app composition: main window, preload bridges, picker routing, and platform identity.

import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  app,
  BrowserWindow,
  desktopCapturer,
  globalShortcut,
  ipcMain,
  Menu,
  nativeImage,
  nativeTheme,
  screen,
  systemPreferences,
} from 'electron'

import { createColorPicker } from './picker/color-picker.mjs'
import { createDisplayMode } from './platform/display-mode.mjs'
import {
  ensurePortalIdentity,
  portalAppId,
} from './platform/portal-identity.mjs'
import {
  WORKSPACE_WINDOW,
  workspaceWindowGeometry,
} from './workspace-window.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
if (process.platform === 'linux') app.setDesktopName(`${portalAppId}.desktop`)
// Guard against Chromium's independent screen-sharing picker.
// RGB controls use the app's popover; screen picking uses our capture adapters.
const disabledFeatures = new Set(
  app.commandLine.getSwitchValue('disable-features').split(',').filter(Boolean),
)
disabledFeatures.add('EyeDropper')
app.commandLine.appendSwitch(
  'disable-features',
  [...disabledFeatures].join(','),
)

const displayMode = createDisplayMode({ app, ipcMain })
const restartingForDisplayMode = displayMode.prepareStartup()
// Wayland panels resolve icons through the desktop entry, not the window's
// icon option. Publish our persistent entry before showing the first window.
const desktopIdentityReady =
  process.platform === 'linux' && app.isPackaged
    ? ensurePortalIdentity(app).catch((error) =>
        console.warn('[desktop] integration unavailable:', error),
      )
    : Promise.resolve()

const picker = createColorPicker({
  app,
  nativeImage,
  BrowserWindow,
  desktopCapturer,
  screen,
  ipcMain,
  globalShortcut,
  systemPreferences,
})

function createWindow() {
  const win = new BrowserWindow({
    ...WORKSPACE_WINDOW,
    useContentSize: true,
    icon: app.isPackaged
      ? join(process.resourcesPath, 'tadahue.png')
      : join(__dirname, '../assets/icon-512x512.png'),
    webPreferences: {
      preload: join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#120b0b' : '#fff7f7',
  })
  displayMode.bindWindow(win)

  // Only this window's renderer can initialize the unified workspace bounds.
  const resizeWorkspace = (event, expanded) => {
    if (event.sender !== win.webContents || expanded !== true) return
    if (win.isFullScreen()) {
      win.once('leave-full-screen', () => resizeWorkspace(event, expanded))
      win.setFullScreen(false)
      return
    }
    if (win.isMaximized()) win.unmaximize()
    const bounds = win.getBounds()
    const content = win.getContentBounds()
    const area = screen.getDisplayMatching(bounds).workArea
    const geometry = workspaceWindowGeometry(bounds, content, area)
    win.setMinimumSize(...geometry.minimum)
    win.setBounds(geometry.bounds)
  }
  ipcMain.on('workspace:expanded', resizeWorkspace)
  win.on('closed', () =>
    ipcMain.removeListener('workspace:expanded', resizeWorkspace),
  )

  // Dev: connect to Vite dev server. Prod: load built files.
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    win.loadFile(join(__dirname, '../dist/index.html'))
  }

  const startPicker = (event, locale, mode) => {
    if (
      event.sender !== win.webContents ||
      event.senderFrame !== win.webContents.mainFrame
    )
      return
    void picker.start(
      win,
      locale === 'zh-TW' ? 'zh-TW' : 'en',
      mode === 'native' ? 'native' : 'magnifier',
    )
  }
  ipcMain.handle(
    'picker:native-available',
    (event) =>
      event.sender === win.webContents &&
      event.senderFrame === win.webContents.mainFrame &&
      Boolean(picker.nativeAvailable),
  )
  ipcMain.on('picker:start', startPicker)
  win.on('closed', () => {
    ipcMain.removeListener('picker:start', startPicker)
    ipcMain.removeHandler('picker:native-available')
  })

  return win
}

if (!restartingForDisplayMode)
  app.whenReady().then(async () => {
    Menu.setApplicationMenu(null)
    await desktopIdentityReady
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
app.on('activate', async () => {
  await desktopIdentityReady
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
app.on('will-quit', () => globalShortcut.unregisterAll())
