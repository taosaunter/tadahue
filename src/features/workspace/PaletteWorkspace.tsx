import { useEffect, useState, type ReactNode } from "react";
import { useLocale } from "../../app/i18n";
import { useCopy } from "../../shared/useCopy";
import PaletteControls from "./PaletteControls";
import WorkspaceTabs from "./WorkspaceTabs";
import {
  TOOL_TABS,
  RESULT_TABS,
  type WorkspaceTab,
  type ToolTab,
  type ResultTab,
} from "./tabs";
import type { PaletteWorkspaceProps } from "./types";
import ContrastPanel from "../preview/ContrastPanel";
import ColorWheel from "../palette/ColorWheel";
import ThemePreview from "../preview/ThemePreview";
import TuningPanel from "../tuning/TuningPanel";
import RoleGrid from "../palette/RoleGrid";
import MorePalettes from "../palette/MorePalettes";
import ImagePalette from "../image/ImagePalette";

function WorkspacePanel({
  tab,
  activeTab,
  children,
}: {
  tab: WorkspaceTab;
  activeTab: WorkspaceTab;
  children: ReactNode;
}) {
  return (
    <div
      role="tabpanel"
      id={`panel-${tab}`}
      aria-labelledby={`tab-${tab}`}
      tabIndex={0}
      hidden={activeTab !== tab}
    >
      {children}
    </div>
  );
}

// Independent editing and result tabs; panels stay mounted across layout changes.
// Keeping panels mounted preserves image previews and local status across tab changes.
export default function PaletteWorkspace(props: PaletteWorkspaceProps) {
  const { theme, palette, library, onAnchorChange, seed } = props;
  const { t } = useLocale();
  const { copied, copy, error } = useCopy();
  const [toolTab, setToolTab] = useState<ToolTab>("tokens");
  const [resultTab, setResultTab] = useState<ResultTab>("preview");
  useEffect(() => {
    window.workspace?.setExpanded(true);
  }, []);
  return (
    <main className="workspace workspace-expanded">
      <PaletteControls {...props}>
        <WorkspaceTabs
          tabs={TOOL_TABS}
          tab={toolTab}
          onChange={setToolTab}
          label={t("workspaceTools")}
        />
        <WorkspacePanel tab="tuning" activeTab={toolTab}>
          <TuningPanel {...props} />
        </WorkspacePanel>
        <WorkspacePanel tab="tokens" activeTab={toolTab}>
          {palette && !props.backgroundEnabled && (
            <ColorWheel
              seed={seed}
              accent={props.accent}
              mode={props.harmony}
              onChange={onAnchorChange}
            />
          )}
          {palette && (
            <RoleGrid
              title={t(theme === "light" ? "lightPalette" : "darkPalette")}
              roles={palette[theme]}
              copied={copied}
              error={error}
              onCopy={copy}
            />
          )}
        </WorkspacePanel>
        <WorkspacePanel tab="palettes" activeTab={toolTab}>
          <MorePalettes seed={seed} />
        </WorkspacePanel>
        <WorkspacePanel tab="image" activeTab={toolTab}>
          <ImagePalette onApply={onAnchorChange} />
        </WorkspacePanel>
        <WorkspacePanel tab="library" activeTab={toolTab}>
          {library}
        </WorkspacePanel>
      </PaletteControls>
      <section
        id="workspace-tools"
        className="results-pane"
        aria-label={t("workspaceResults")}
      >
        <WorkspaceTabs
          tabs={RESULT_TABS}
          tab={resultTab}
          onChange={setResultTab}
          label={t("workspaceResults")}
        />
        <WorkspacePanel tab="preview" activeTab={resultTab}>
          {palette ? (
            <ThemePreview
              palette={palette}
              theme={theme}
              onShowContrast={() => {
                setResultTab("contrast");
                document.getElementById("tab-contrast")?.focus();
              }}
            />
          ) : (
            <p role="status" className="text-ink-muted p-3 text-xs">
              {t("previewUnavailable")}
            </p>
          )}
        </WorkspacePanel>
        <WorkspacePanel tab="contrast" activeTab={resultTab}>
          {palette ? (
            <ContrastPanel palette={palette} theme={theme} />
          ) : (
            <p role="status" className="text-ink-muted p-3 text-xs">
              {t("previewUnavailable")}
            </p>
          )}
        </WorkspacePanel>
      </section>
    </main>
  );
}
