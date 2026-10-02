import { useEffect, useState, type ReactNode } from "react";
import { useLocale } from "../../app/i18n";
import { useCopy } from "../../shared/useCopy";
import PaletteControls from "./PaletteControls";
import WorkspaceTabs, { type WorkspaceTab } from "./WorkspaceTabs";
import type { PaletteWorkspaceProps } from "./types";
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

// Workspace shell only: left controls, tab selection, and six persistent panels.
// Keeping panels mounted preserves image previews and local status across tab changes.
export default function PaletteWorkspace(props: PaletteWorkspaceProps) {
  const { theme, palette, library, onAnchorChange, seed } = props;
  const { t } = useLocale();
  const { copied, copy, error } = useCopy();
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<WorkspaceTab>("preview");
  useEffect(() => {
    window.workspace?.setExpanded(expanded);
  }, [expanded]);
  return (
    <main
      className={`workspace ${expanded ? "workspace-expanded" : "workspace-collapsed"}`}
    >
      <PaletteControls
        {...props}
        expanded={expanded}
        onToggleExpanded={() => {
          if (!expanded) setTab("preview");
          setExpanded(!expanded);
        }}
      />
      <section
        id="workspace-tools"
        className="tools-pane"
        hidden={!expanded}
        aria-label={t("workspaceTools")}
      >
        <WorkspaceTabs tab={tab} onChange={setTab} />
        <WorkspacePanel tab="preview" activeTab={tab}>
          {palette && <ThemePreview palette={palette} theme={theme} />}
        </WorkspacePanel>
        <WorkspacePanel tab="tuning" activeTab={tab}>
          <TuningPanel {...props} />
        </WorkspacePanel>
        <WorkspacePanel tab="tokens" activeTab={tab}>
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
        <WorkspacePanel tab="palettes" activeTab={tab}>
          <MorePalettes seed={seed} />
        </WorkspacePanel>
        <WorkspacePanel tab="image" activeTab={tab}>
          <ImagePalette onApply={onAnchorChange} />
        </WorkspacePanel>
        <WorkspacePanel tab="library" activeTab={tab}>
          {library}
        </WorkspacePanel>
      </section>
    </main>
  );
}
