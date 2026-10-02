import { useRef } from "react";
import { useLocale } from "../../app/i18n";

// One tab registry drives order, labels, keyboard navigation, and panel IDs.
const TABS = [
  "preview",
  "tuning",
  "tokens",
  "palettes",
  "image",
  "library",
] as const;
export type WorkspaceTab = (typeof TABS)[number];
const TAB_LABELS = {
  tuning: "tuningTab",
  preview: "previewTab",
  tokens: "colorSwatches",
  palettes: "morePalettes",
  library: "libraryTab",
  image: "imageTab",
} as const;

export default function WorkspaceTabs({
  tab,
  onChange,
}: {
  tab: WorkspaceTab;
  onChange: (tab: WorkspaceTab) => void;
}) {
  const { t } = useLocale();
  const tabButtons = useRef<Array<HTMLButtonElement | null>>([]);
  return (
    <div
      role="tablist"
      aria-label={t("workspaceTools")}
      className="workspace-tabs"
    >
      {TABS.map((value, index) => (
        <button
          key={value}
          ref={(node) => {
            tabButtons.current[index] = node;
          }}
          type="button"
          role="tab"
          id={`tab-${value}`}
          aria-controls={`panel-${value}`}
          aria-selected={tab === value}
          tabIndex={tab === value ? 0 : -1}
          onClick={() => onChange(value)}
          onKeyDown={(event) => {
            let next: number;
            if (event.key === "ArrowRight") next = (index + 1) % TABS.length;
            else if (event.key === "ArrowLeft")
              next = (index + TABS.length - 1) % TABS.length;
            else if (event.key === "Home") next = 0;
            else if (event.key === "End") next = TABS.length - 1;
            else return;
            event.preventDefault();
            onChange(TABS[next]);
            tabButtons.current[next]?.focus();
          }}
        >
          {t(TAB_LABELS[value])}
        </button>
      ))}
    </div>
  );
}
