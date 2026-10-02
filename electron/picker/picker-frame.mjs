// Shared frame geometry and pixel sampling; coordinates use captured pixels rather than assumed DPI.
// All supported desktop Chromium builds use BGRA for NativeImage bitmaps.
// Read the same 1x representation for both dimensions and pixels; Retina
// thumbnails need not have the size requested from desktopCapturer.
export function captureFrame(display, image) {
  const { width, height } = image.getSize(1);
  const bitmap = image.toBitmap({ scaleFactor: 1 });
  if (
    image.isEmpty() ||
    width <= 0 ||
    height <= 0 ||
    bitmap.length !== width * height * 4
  )
    throw new Error("Empty screen capture");
  return { bounds: display.bounds, width, height, bitmap };
}

export function sample(frame, point) {
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y))
    return null;
  const { bounds, width, height, bitmap } = frame;
  if (
    point.x < 0 ||
    point.y < 0 ||
    point.x >= bounds.width ||
    point.y >= bounds.height
  )
    return null;
  const px = Math.min(width - 1, Math.floor((point.x * width) / bounds.width));
  const py = Math.min(
    height - 1,
    Math.floor((point.y * height) / bounds.height),
  );
  const readHex = (x, y) => {
    const i = (y * width + x) * 4;
    return (
      "#" +
      [bitmap[i + 2], bitmap[i + 1], bitmap[i]]
        .map((value) => value.toString(16).padStart(2, "0"))
        .join("")
    );
  };
  const grid = [];
  for (let y = -4; y <= 4; y++) {
    for (let x = -4; x <= 4; x++) {
      grid.push(
        readHex(
          Math.max(0, Math.min(width - 1, px + x)),
          Math.max(0, Math.min(height - 1, py + y)),
        ),
      );
    }
  }
  return { hex: readHex(px, py), grid, cx: 4, cy: 4 };
}
