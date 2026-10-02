// Saved palettes tab: restore exact snapshots or delete local entries.
import { useState } from "react";
import { useLocale } from "../../app/i18n";
import { harmonyColors, pairedColor } from "../../color/harmony";
import type { SavedPaletteSnapshot } from "./savedPalettes";
interface Props {
  saved: SavedPaletteSnapshot[];
  activeId: string | null;
  onLoad: (snapshot: SavedPaletteSnapshot) => void;
  onDelete: (id: string) => boolean;
}
export default function PaletteLibrary({
  saved,
  activeId,
  onLoad,
  onDelete,
}: Props) {
  const { t } = useLocale();
  const [status, setStatus] = useState("");
  return (
    <section aria-label={t("savedPalettes")}>
      {status && (
        <p role="status" className="text-ink-muted mb-2 text-xs">
          {status}
        </p>
      )}
      {saved.length ? (
        <ul className="library-list space-y-2">
          {saved.map((item) => {
            const wheel = item.wheel ?? {
              mode: "complementary",
              accent: pairedColor(item.seed, "complementary"),
            };
            const colors = harmonyColors(item.seed, wheel.accent, wheel.mode);
            return (
              <li key={item.id} className="flex gap-1">
                <button
                  type="button"
                  aria-label={t("loadPalette", { hex: item.seed })}
                  aria-pressed={activeId === item.id}
                  title={item.name}
                  onClick={() => {
                    onLoad(item);
                    setStatus("");
                  }}
                  className={`flex min-w-0 flex-1 overflow-hidden rounded-md border-2 ${activeId === item.id ? "border-primary" : "border-transparent"}`}
                >
                  {colors.map((hex, index) => (
                    <span
                      key={index}
                      className="h-7 flex-1"
                      style={{ background: hex }}
                    />
                  ))}
                </button>
                <button
                  type="button"
                  className="text-ink-muted hover:bg-danger-muted hover:text-danger rounded-md px-2 text-sm"
                  aria-label={t("deleteSavedPalette", { name: item.name })}
                  onClick={() =>
                    setStatus(onDelete(item.id) ? "" : t("storageError"))
                  }
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-ink-muted text-[11px]">{t("libraryEmpty")}</p>
      )}
    </section>
  );
}
