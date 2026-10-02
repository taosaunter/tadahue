import { requestPortal } from "./portal-request.mjs";

function portalError(code, cause) {
  return Object.assign(new Error("Native color picker failed", { cause }), {
    code,
  });
}

function responseColor(body) {
  if (!Array.isArray(body)) throw portalError("native-failed");
  const [status, results] = body;
  if (status === 1) return null;
  if (status !== 0 || !Array.isArray(results))
    throw portalError("native-failed");
  const variant = results.find((entry) => entry[0] === "color")?.[1];
  // dbus-native decodes a variant as [signature tree, values]. The color
  // is one struct containing three sRGB components, each between 0 and 1.
  const signature = variant?.[0]?.[0];
  const rgb = variant?.[1]?.[0];
  if (
    signature?.type !== "(" ||
    signature.child?.map((field) => field.type).join("") !== "ddd" ||
    !Array.isArray(rgb) ||
    rgb.length !== 3 ||
    rgb.some((value) => !Number.isFinite(value) || value < 0 || value > 1)
  )
    throw portalError("native-failed");
  return (
    "#" +
    rgb
      .map((value) =>
        Math.round(value * 255)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

export async function pickPortalColor(options = {}) {
  const body = await requestPortal(options);
  return body === null ? null : responseColor(body);
}

export function createPortalPicker({
  pick = pickPortalColor,
  waitForHide = () => new Promise((resolve) => setTimeout(resolve, 150)),
} = {}) {
  let session;
  return {
    get isActive() {
      return Boolean(session);
    },
    async start(mainWin) {
      if (session || mainWin.isDestroyed()) return;
      const mainContents = mainWin.webContents;
      const current = { controller: new AbortController() };
      session = current;
      const cancel = () => current.controller.abort();
      mainWin.once("closed", cancel);
      mainContents.once("render-process-gone", cancel);
      let hex = null;
      let error;
      try {
        mainWin.hide();
        await waitForHide();
        if (!current.controller.signal.aborted)
          hex = await pick({ signal: current.controller.signal });
      } catch (cause) {
        error =
          cause.code === "native-unavailable"
            ? "native-unavailable"
            : "native-failed";
      } finally {
        mainWin.removeListener("closed", cancel);
        mainContents.removeListener("render-process-gone", cancel);
        session = null;
        if (!mainWin.isDestroyed() && !mainContents.isDestroyed()) {
          mainWin.show();
          mainContents.send("picker:done", error ? { hex, error } : { hex });
        }
      }
    },
  };
}
