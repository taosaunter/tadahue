import { useEffect, useRef, useState } from "react";
import type { MessageKey } from "../../app/i18n";

const IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

// Local image lifecycle: validate, decode, downsample, extract, and release object URLs.
// A request ID prevents a slow earlier upload from replacing a newer image or a cleared preview.
export function useImagePalette() {
  const request = useRef(0);
  const [image, setImage] = useState<string | null>(null);
  const [colors, setColors] = useState<string[]>([]);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<MessageKey | null>(null);
  useEffect(
    () => () => {
      request.current += 1;
    },
    [],
  );
  useEffect(
    () => () => {
      if (image) URL.revokeObjectURL(image);
    },
    [image],
  );

  function clear() {
    request.current += 1;
    setImage(null);
    setColors([]);
    setSelected("");
    setError(null);
    setBusy(false);
  }

  async function extract(file: File) {
    const id = ++request.current;
    setImage(null);
    setColors([]);
    setSelected("");
    setBusy(false);
    setError(null);
    if (!IMAGE_TYPES.has(file.type)) {
      setError("imageUnsupported");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError("imageTooLarge");
      return;
    }
    setBusy(true);
    const url = URL.createObjectURL(file);
    let retained = false;
    try {
      const decoded = new Image();
      decoded.src = url;
      await decoded.decode();
      if (id !== request.current) return;
      if (decoded.naturalWidth * decoded.naturalHeight > 64_000_000) {
        setError("imageTooLarge");
        return;
      }
      // Bound the pixel workload before sampling; the original stays available for preview.
      const scale = Math.min(
        1,
        512 / Math.max(decoded.naturalWidth, decoded.naturalHeight),
      );
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(decoded.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(decoded.naturalHeight * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas unavailable");
      context.drawImage(decoded, 0, 0, canvas.width, canvas.height);
      const { getPalette } = await import("colorthief");
      if (id !== request.current) return;
      const palette = await getPalette(canvas, {
        colorCount: 5,
        quality: 1,
        ignoreWhite: false,
        gamut: "srgb",
      });
      if (id !== request.current) return;
      const result = [...new Set(palette?.map((color) => color.hex()) ?? [])];
      if (!result.length) {
        setError("imageEmpty");
        return;
      }
      setImage(url);
      retained = true;
      setColors(result);
      setSelected(result[0]);
    } catch {
      if (id === request.current) setError("imageFailed");
    } finally {
      if (!retained) URL.revokeObjectURL(url);
      if (id === request.current) setBusy(false);
    }
  }

  return { image, colors, selected, setSelected, busy, error, clear, extract };
}
