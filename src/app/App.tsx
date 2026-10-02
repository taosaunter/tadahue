import { useTheme } from "./useTheme";
import { useAppPalette } from "./useAppPalette";
import { usePaletteWorkspace } from "./usePaletteWorkspace";
import PaletteWorkspace from "../features/workspace/PaletteWorkspace";
import PaletteLibrary from "../features/library/PaletteLibrary";
import AppSettings from "../features/settings/AppSettings";
import { useScreenPicker } from "../features/picker/useScreenPicker";
import {
  ScreenPickerButton,
  ScreenPickerStatus,
} from "../features/picker/ScreenPickerControls";

// App composition only. UI lives in features/; palette state lives in usePaletteWorkspace.
export default function App() {
  const workspace = usePaletteWorkspace();
  const { theme, toggle } = useTheme();
  const picker = useScreenPicker(workspace.changeSeed);
  useAppPalette(workspace.editor.palette, theme);
  return (
    <div className="app-shell">
      <PaletteWorkspace
        {...workspace.editor}
        theme={theme}
        settings={
          <AppSettings
            theme={theme}
            onToggleTheme={toggle}
            picking={picker.picking}
            beforeRestart={workspace.rememberForRestart}
          />
        }
        actions={<ScreenPickerButton picker={picker} />}
        library={
          <PaletteLibrary
            saved={workspace.saved}
            activeId={workspace.activeId}
            onLoad={workspace.load}
            onDelete={workspace.remove}
          />
        }
      />
      <ScreenPickerStatus picker={picker} />
    </div>
  );
}
