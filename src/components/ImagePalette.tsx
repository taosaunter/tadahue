import { useEffect, useRef, useState } from "react";
import { useLocale, type MessageKey } from "../i18n";
import { useCopy } from "../useCopy";
import { DeleteIcon } from "./Icons";

interface Props {
  onApply: (anchor: 0 | 1, hex: string) => void;
}

const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

export default function ImagePalette({ onApply }: Props) {
  const { t } = useLocale();
  const input = useRef<HTMLInputElement>(null);
  const request = useRef(0);
  const [image, setImage] = useState<string | null>(null);
  const [colors, setColors] = useState<string[]>([]);
  const [selected, setSelected] = useState("");
  const { copy, copied, error: copyError } = useCopy();
  const applyTimer = useRef<number | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<MessageKey | null>(null);
  const [applied, setApplied] = useState<{ hex: string; target: 0 | 1 } | null>(null);

  useEffect(() => () => { request.current += 1; window.clearTimeout(applyTimer.current); }, []);
  useEffect(() => () => { if (image) URL.revokeObjectURL(image); }, [image]);

  function clear() {
    request.current += 1;
    setImage(null);
    setColors([]);
    setSelected("");
    setError(null);
    setApplied(null);
    window.clearTimeout(applyTimer.current);
    setBusy(false);
  }

  async function extract(file: File) {
    const id = ++request.current;
    setImage(null);
    setColors([]);
    setSelected("");
    setBusy(false);
    setError(null);
    setApplied(null);
    window.clearTimeout(applyTimer.current);
    if (!IMAGE_TYPES.has(file.type)) { setError("imageUnsupported"); return; }
    if (file.size > 20 * 1024 * 1024) { setError("imageTooLarge"); return; }
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
      const scale = Math.min(1, 512 / Math.max(decoded.naturalWidth, decoded.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(decoded.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(decoded.naturalHeight * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas unavailable");
      context.drawImage(decoded, 0, 0, canvas.width, canvas.height);
      const { getPalette } = await import("colorthief");
      if (id !== request.current) return;
      const palette = await getPalette(canvas, { colorCount: 5, quality: 1, ignoreWhite: false, gamut: "srgb" });
      if (id !== request.current) return;
      const result = [...new Set(palette?.map(color => color.hex()) ?? [])];
      if (!result.length) { setError("imageEmpty"); return; }
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

  return (
    <div className="image-palette p-2">
      <input ref={input} className="sr-only" tabIndex={-1} type="file" accept="image/png,image/jpeg,image/webp,image/gif" aria-label={t("imageChoose")} onChange={event => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (file) void extract(file);
      }}/>
      <div className={`image-drop ${dragging ? "image-dragging" : ""}`} aria-busy={busy} onDragOver={event => {
        event.preventDefault(); setDragging(true);
      }} onDragLeave={event => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
      }} onDrop={event => {
        event.preventDefault(); setDragging(false);
        const file = event.dataTransfer.files[0];
        if (file) void extract(file);
      }}>
        {image ? <div className="image-preview-wrap">
          <img src={image} alt={t("imagePreview")} className="image-preview"/>
          <button type="button" className="icon-button image-remove" aria-label={t("imageRemove")} data-tooltip={t("imageRemove")} onClick={clear}><DeleteIcon/></button>
        </div> : <p className="text-sm text-ink-muted">{t("imageDrop")}</p>}
        <button type="button" className="quiet-button" onClick={() => input.current?.click()}>{t("imageChoose")}</button>
      </div>
      {!image && !busy && !error && <p className="text-xs text-ink-muted">{t("imageLocal")}</p>}
      {(busy || error) && <p role="status" className={`text-xs ${error ? "text-danger" : "text-ink-muted"}`}>
        {busy ? t("imageBusy") : error ? t(error) : ""}
      </p>}
      <p role="status" className="sr-only">{copyError ? t("copyFailed") : applied ? t("imageApplied", { hex: applied.hex, target: t(applied.target === 0 ? "colorOne" : "colorTwo") }) : copied ? t("copied") : ""}</p>
      {colors.length > 0 && <>
        <div className="image-colors" role="group" aria-label={t("imageTab")}>
          {colors.map(hex => <button type="button" key={hex} className="image-color" style={{ backgroundColor: hex }} disabled={busy} aria-label={t("copyHex", { hex })} aria-pressed={selected === hex} data-feedback={copied === hex || undefined} data-tooltip={copyError === hex ? t("copyFailed") : copied === hex ? t("copied") : t("copyHex", { hex })} onClick={() => {
            setSelected(hex);
            setApplied(null);
            window.clearTimeout(applyTimer.current);
            void copy(hex);
          }}/>) }
        </div>
        <div className="image-actions flex flex-wrap justify-end gap-2">
          {([0, 1] as const).map(target => <button key={target} type="button" className="quiet-button" disabled={busy || !selected} data-feedback={applied?.target === target || undefined} data-tooltip={applied?.target === target ? t("imageApplyDone") : undefined} onClick={() => {
            onApply(target, selected);
            setApplied({ hex: selected, target });
            window.clearTimeout(applyTimer.current);
            applyTimer.current = window.setTimeout(() => setApplied(null), 1200);
          }}>{t(target === 0 ? "imageSetBase" : "imageSetAccent")}</button>)}
        </div>
      </>}
    </div>
  );
}
