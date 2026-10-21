import { useState } from 'react'
import PaletteLibrary from '../features/library/PaletteLibrary'
import {
  ScreenPickerButton,
  ScreenPickerStatus,
} from '../features/picker/ScreenPickerControls'
import { useScreenPicker } from '../features/picker/useScreenPicker'
import AppSettings from '../features/settings/AppSettings'
import PaletteWorkspace from '../features/workspace/PaletteWorkspace'
import { usePaletteWorkspace } from './usePaletteWorkspace'
import { useTheme } from './useTheme'

// App composition only. UI lives in features/; palette state lives in usePaletteWorkspace.
export default function App() {
  const [view, setView] = useState<'edit' | 'preview' | 'library'>('edit')
  const workspace = usePaletteWorkspace()
  const { theme, toggle } = useTheme()
  const picker = useScreenPicker(workspace.changeSeed)
  return (
    <div className="app-shell">
      <PaletteWorkspace
        {...workspace.editor}
        view={view}
        onViewChange={setView}
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
            onLoad={(snapshot) => {
              workspace.load(snapshot)
              setView('edit')
            }}
            onDelete={workspace.remove}
          />
        }
      />
      <ScreenPickerStatus picker={picker} />
    </div>
  )
}
