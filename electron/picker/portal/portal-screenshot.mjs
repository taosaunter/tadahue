import { constants } from "node:fs";
import { open, lstat, unlink } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { requestPortal } from "./portal-request.mjs";
import { ensurePortalIdentity } from "../../platform/portal-identity.mjs";

const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

export async function readPortalScreenshot(uri, startedAt) {
  const url = new URL(uri);
  if (url.protocol !== "file:" || url.hostname || url.search || url.hash)
    throw new Error("Portal did not return a local screenshot");
  const path = fileURLToPath(url);
  const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  let info;
  try {
    info = await file.stat();
    if (
      !info.isFile() ||
      info.uid !== process.getuid() ||
      info.size > 128 * 1024 * 1024
    )
      throw new Error("Invalid screenshot file");
    const buffer = await file.readFile();
    if (
      buffer.length < 24 ||
      !buffer.subarray(0, 8).equals(pngSignature) ||
      buffer.toString("ascii", 12, 16) !== "IHDR"
    )
      throw new Error("Invalid screenshot PNG");
    const width = buffer.readUInt32BE(16),
      height = buffer.readUInt32BE(20);
    if (!width || !height || width * height > 64 * 1024 * 1024)
      throw new Error("Screenshot dimensions too large");
    return buffer;
  } finally {
    await file.close();
    // The backend saves a temporary PNG in Pictures. Delete only the newly
    // created, unchanged file owned by this request; preserve older user files.
    if (
      info?.isFile() &&
      info.uid === process.getuid() &&
      info.birthtimeMs >= startedAt
    ) {
      const latest = await lstat(path).catch((error) => {
        if (error.code === "ENOENT") return null;
        throw error;
      });
      if (
        latest?.isFile() &&
        latest.dev === info.dev &&
        latest.ino === info.ino &&
        latest.size === info.size &&
        latest.mtimeMs === info.mtimeMs &&
        latest.ctimeMs === info.ctimeMs
      )
        await unlink(path);
    }
  }
}

export async function capturePortalScreenshot({
  app,
  signal,
  register = () => ensurePortalIdentity(app),
  request = requestPortal,
  read = readPortalScreenshot,
} = {}) {
  try {
    if (signal?.aborted) return null;
    const appId = await register();
    if (signal?.aborted) return null;
    const startedAt = Date.now();
    const body = await request({
      method: "Screenshot",
      appId,
      options: [["interactive", ["b", false]]],
      signal,
      drainOnAbort: true,
    });
    if (!body || body[0] === 1) return null;
    if (body[0] !== 0 || !Array.isArray(body[1]))
      throw new Error("Screenshot request rejected");
    const variant = body[1].find((entry) => entry[0] === "uri")?.[1];
    if (
      variant?.[0]?.[0]?.type !== "s" ||
      typeof variant?.[1]?.[0] !== "string"
    )
      throw new Error("Missing screenshot URI");
    // Even when cancelled, consume the response to remove the temporary PNG.
    const buffer = await read(variant[1][0], startedAt);
    return signal?.aborted ? null : buffer;
  } catch (cause) {
    if (signal?.aborted) return null;
    throw Object.assign(new Error("Screenshot portal failed", { cause }), {
      code: "screenshot-unavailable",
    });
  }
}
