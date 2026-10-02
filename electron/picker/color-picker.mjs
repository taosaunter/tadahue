// Select the picker by desktop session, independent of an Electron XWayland compatibility window.
import { createPortalPicker } from "./portal/portal-picker.mjs";
import { createScreenshotPicker } from "./screenshot-picker.mjs";
import { createScreenPicker } from "./screen-picker.mjs";

export function usesWaylandPicker(
  platform = process.platform,
  env = process.env,
) {
  return (
    platform === "linux" &&
    (env.XDG_SESSION_TYPE === "wayland" ||
      (env.XDG_SESSION_TYPE !== "x11" && Boolean(env.WAYLAND_DISPLAY)))
  );
}

export function createColorPicker(
  dependencies,
  {
    platform = process.platform,
    env = process.env,
    portalFactory = createPortalPicker,
    screenFactory = createScreenPicker,
    screenshotFactory = createScreenshotPicker,
  } = {},
) {
  if (!usesWaylandPicker(platform, env))
    return screenFactory(dependencies, { platform });
  const magnifier = screenshotFactory(dependencies);
  const native = portalFactory();
  return {
    nativeAvailable: true,
    start(mainWin, locale, mode = "magnifier") {
      if (magnifier.isActive || native.isActive) return;
      return (mode === "native" ? native : magnifier).start(mainWin, locale);
    },
  };
}
