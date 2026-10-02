// Persist Linux backend preferences and restart AppImages without requiring FUSE.
import { readFileSync, mkdirSync, writeFileSync, renameSync } from "node:fs";
import { join } from "node:path";

// The dev launcher keeps Vite alive while replacing the Electron process.
export const RESTART_X11 = 75;
export const RESTART_AUTO = 76;

export function displayModeArgs(args, enabled) {
  const next = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (/^--ozone-platform(?:-hint)?=/.test(arg)) continue;
    if (arg === "--ozone-platform" || arg === "--ozone-platform-hint") {
      if (args[i + 1] && !args[i + 1].startsWith("--")) i++;
      continue;
    }
    next.push(arg);
  }
  return enabled ? [...next, "--ozone-platform=x11"] : next;
}

export function createDisplayMode(
  { app, ipcMain },
  { platform = process.platform, argv = process.argv, env = process.env } = {},
) {
  const directory = join(app.getPath("userData"), "preferences");
  const file = join(directory, "display-mode.json");
  let saved = false;
  try {
    saved = JSON.parse(readFileSync(file, "utf8")).x11Compatibility === true;
  } catch {
    /* Missing or damaged preferences fall back to the system default. */
  }
  const enabled = saved;
  const available = Boolean(env.DISPLAY);
  // Electron fills app.commandLine's Ozone switch when auto-selecting Wayland.
  // Only argv can distinguish that from a user's explicit launch argument.
  const explicitlyChosen = argv
    .slice(1)
    .some((arg) => /^--ozone-platform(?:-hint)?(?:=|$)/.test(arg));
  let restarting = false;

  function persist(value) {
    mkdirSync(directory, { recursive: true });
    writeFileSync(`${file}.tmp`, JSON.stringify({ x11Compatibility: value }), {
      mode: 0o600,
    });
    renameSync(`${file}.tmp`, file);
    saved = value;
  }

  function planRestart(value) {
    if (env.TADAHUE_DEV_LAUNCHER === "1") {
      return value ? RESTART_X11 : RESTART_AUTO;
    }
    const appImage = platform === "linux" && app.isPackaged && env.APPIMAGE;
    const args = displayModeArgs(argv.slice(1), value);
    app.relaunch({
      // The runtime consumes this flag, so it is absent from Electron's argv.
      // Use the supported FUSE-free launch path when reopening an AppImage.
      args: appImage ? ["--appimage-extract-and-run", ...args] : args,
      // AppImage's mounted executable is temporary; restart the original image.
      ...(appImage ? { execPath: appImage } : {}),
    });
    return 0;
  }

  return {
    prepareStartup() {
      // Ozone selects its backend before the main script runs. A fresh process
      // must receive the flag in argv. Explicit command-line choices win.
      if (platform !== "linux" || !saved || !available || explicitlyChosen)
        return false;
      app.exit(planRestart(true));
      return true;
    },
    bindWindow(win) {
      const authorized = (event) =>
        event.sender === win.webContents &&
        event.senderFrame === win.webContents.mainFrame;
      ipcMain.handle("display-mode:get", (event) => {
        if (!authorized(event) || platform !== "linux") return null;
        return { enabled, available };
      });
      ipcMain.handle("display-mode:restart", (event, value) => {
        if (
          !authorized(event) ||
          platform !== "linux" ||
          typeof value !== "boolean" ||
          restarting
        )
          return { ok: false };
        if (value && !available) return { ok: false };
        const previous = saved;
        try {
          persist(value);
          // The renderer writes its current palette before requesting restart.
          win.webContents.session.flushStorageData();
          const code = planRestart(value);
          restarting = true;
          // Give the invoke reply time to reach the renderer before exiting.
          setTimeout(() => app.exit(code), 150);
        } catch {
          try {
            persist(previous);
          } catch {
            /* Report the failure to the renderer. */
          }
          return { ok: false };
        }
        return { ok: true };
      });
      win.once("closed", () => {
        ipcMain.removeHandler("display-mode:get");
        ipcMain.removeHandler("display-mode:restart");
      });
    },
  };
}
