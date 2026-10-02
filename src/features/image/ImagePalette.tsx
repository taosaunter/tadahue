import { useEffect, useRef, useState } from "react";
import { useLocale } from "../../app/i18n";
import { useCopy } from "../../shared/useCopy";
import { DeleteIcon } from "../../shared/Icons";
import { useImagePalette } from "./useImagePalette";

interface Props {
  onApply: (anchor: 0 | 1, hex: string) => void;
}

// Image colors tab: upload/drop surface, preview, compact swatches, and apply buttons.
// Extraction stays in useImagePalette.ts; dimensions stay in image.css.
export default function ImagePalette({ onApply }: Props) {
  const { t } = useLocale();
  const input = useRef<HTMLInputElement>(null);
  const { image, colors, selected, setSelected, busy, error, clear, extract } =
    useImagePalette();
  const { copy, copied, error: copyError } = useCopy();
  const applyTimer = useRef<number | undefined>(undefined);
  const [dragging, setDragging] = useState(false);
  const [applied, setApplied] = useState<{ hex: string; target: 0 | 1 } | null>(
    null,
  );
  useEffect(() => () => window.clearTimeout(applyTimer.current), []);
  function resetFeedback() {
    setApplied(null);
    window.clearTimeout(applyTimer.current);
  }

  return (
    <div className="image-palette p-2">
      <input
        ref={input}
        className="sr-only"
        tabIndex={-1}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        aria-label={t("imageChoose")}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) {
            resetFeedback();
            void extract(file);
          }
        }}
      />
      <div
        className={`image-drop ${dragging ? "image-dragging" : ""}`}
        aria-busy={busy}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null))
            setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const file = event.dataTransfer.files[0];
          if (file) {
            resetFeedback();
            void extract(file);
          }
        }}
      >
        {image ? (
          <div className="image-preview-wrap">
            <img
              src={image}
              alt={t("imagePreview")}
              className="image-preview"
            />
            <button
              type="button"
              className="icon-button image-remove"
              aria-label={t("imageRemove")}
              data-tooltip={t("imageRemove")}
              onClick={() => {
                resetFeedback();
                clear();
              }}
            >
              <DeleteIcon />
            </button>
          </div>
        ) : (
          <p className="text-ink-muted text-sm">{t("imageDrop")}</p>
        )}
        <button
          type="button"
          className="quiet-button"
          onClick={() => input.current?.click()}
        >
          {t("imageChoose")}
        </button>
      </div>
      {!image && !busy && !error && (
        <p className="text-ink-muted text-xs">{t("imageLocal")}</p>
      )}
      {(busy || error) && (
        <p
          role="status"
          className={`text-xs ${error ? "text-danger" : "text-ink-muted"}`}
        >
          {busy ? t("imageBusy") : error ? t(error) : ""}
        </p>
      )}
      <p role="status" className="sr-only">
        {copyError
          ? t("copyFailed")
          : applied
            ? t("imageApplied", {
                hex: applied.hex,
                target: t(applied.target === 0 ? "colorOne" : "colorTwo"),
              })
            : copied
              ? t("copied")
              : ""}
      </p>
      {colors.length > 0 && (
        <>
          <div className="image-colors" role="group" aria-label={t("imageTab")}>
            {colors.map((hex) => (
              <button
                type="button"
                key={hex}
                className="image-color"
                style={{ backgroundColor: hex }}
                disabled={busy}
                aria-label={t("copyHex", { hex })}
                aria-pressed={selected === hex}
                data-feedback={copied === hex || undefined}
                data-tooltip={
                  copyError === hex
                    ? t("copyFailed")
                    : copied === hex
                      ? t("copied")
                      : t("copyHex", { hex })
                }
                onClick={() => {
                  setSelected(hex);
                  setApplied(null);
                  window.clearTimeout(applyTimer.current);
                  void copy(hex);
                }}
              />
            ))}
          </div>
          <div className="image-actions flex flex-wrap justify-end gap-2">
            {([0, 1] as const).map((target) => (
              <button
                key={target}
                type="button"
                className="quiet-button"
                disabled={busy || !selected}
                data-feedback={applied?.target === target || undefined}
                data-tooltip={
                  applied?.target === target ? t("imageApplyDone") : undefined
                }
                onClick={() => {
                  onApply(target, selected);
                  setApplied({ hex: selected, target });
                  window.clearTimeout(applyTimer.current);
                  applyTimer.current = window.setTimeout(
                    () => setApplied(null),
                    1200,
                  );
                }}
              >
                {t(target === 0 ? "imageSetBase" : "imageSetAccent")}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
