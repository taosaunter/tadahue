// Register a stable Linux desktop identity and persistent panel icon before the first window.
import { mkdir, readFile, writeFile, rename, unlink } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import { randomUUID } from "node:crypto";

export const portalAppId = "com.taosaunter.tadahue";
const marker = "X-TadaHue-Managed=true";

function desktopValue(value) {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("\n", "\\n")
    .replaceAll("\r", "\\r")
    .replaceAll("\t", "\\t");
}

async function writeAtomic(target, content) {
  const temporary = target + "." + randomUUID();
  try {
    await writeFile(temporary, content, { mode: 0o644, flag: "wx" });
    await rename(temporary, target);
  } finally {
    await unlink(temporary).catch((error) => {
      if (error.code !== "ENOENT") throw error;
    });
  }
}

export function desktopExec(args) {
  return args
    .map((arg) => {
      if (/[\n\r\0]/.test(arg))
        throw new Error("Invalid desktop launcher path");
      // Desktop Entry Exec escaping, followed by the desktop file string layer.
      const quoted = arg.replaceAll("%", "%%").replace(/[\\"$`]/g, "\\$&");
      return '"' + quoted.replaceAll("\\", "\\\\") + '"';
    })
    .join(" ");
}

export async function ensurePortalIdentity(
  app,
  {
    env = process.env,
    execPath = process.execPath,
    resourcesPath = process.resourcesPath,
  } = {},
) {
  const data =
    env.XDG_DATA_HOME && isAbsolute(env.XDG_DATA_HOME)
      ? env.XDG_DATA_HOME
      : join(app.getPath("home"), ".local/share");
  const target = join(data, "applications", portalAppId + ".desktop");
  let existing;
  try {
    existing = await readFile(target, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  // Respect manually installed launchers. Never replace somebody else's entry.
  if (existing && !existing.split("\n").includes(marker)) return portalAppId;
  if (!existing) {
    for (const dir of (
      env.XDG_DATA_DIRS || "/usr/local/share:/usr/share"
    ).split(":")) {
      if (!isAbsolute(dir)) continue;
      try {
        await readFile(join(dir, "applications", portalAppId + ".desktop"));
        return portalAppId;
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
    }
  }
  const args = app.isPackaged
    ? env.APPIMAGE && isAbsolute(env.APPIMAGE)
      ? [env.APPIMAGE, "--appimage-extract-and-run"]
      : [execPath]
    : [execPath, app.getAppPath()];
  // Install the icon before publishing the launcher. A persistent absolute
  // path also avoids a theme-cache miss from the app's previous first launch.
  const icons = join(data, "icons/hicolor/512x512/apps");
  const icon = join(icons, portalAppId + ".png");
  const image = await readFile(
    app.isPackaged
      ? join(resourcesPath, "tadahue.png")
      : join(app.getAppPath(), "assets/icon-512x512.png"),
  );
  let installedImage;
  try {
    installedImage = await readFile(icon);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  if (!installedImage?.equals(image)) {
    await mkdir(icons, { recursive: true });
    await writeAtomic(icon, image);
  }
  const content = `[Desktop Entry]\nType=Application\nName=TadaHue\nExec=${desktopExec(args)}\nIcon=${desktopValue(icon)}\nStartupWMClass=${portalAppId}\nTerminal=false\nCategories=Graphics;\n${marker}\n`;
  if (existing !== content) {
    await mkdir(join(data, "applications"), { recursive: true });
    await writeAtomic(target, content);
  }
  return portalAppId;
}
