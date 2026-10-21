import {
  ArrowUpRight,
  Bookmark,
  Check,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { useLocale } from '../../app/i18n'
import { DEFAULT_TUNING } from '../../color/palette'
import { Button } from '../../shared/ui/button'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '../../shared/ui/sheet'
import { useCopy } from '../../shared/useCopy'
import ColorInput from '../palette/ColorInput'
import HarmonyPalette from '../palette/HarmonyPalette'
import MorePalettes from '../palette/MorePalettes'
import RoleGrid from '../palette/RoleGrid'
import ContrastPanel from '../preview/ContrastPanel'
import ThemePreview from '../preview/ThemePreview'
import TuningPanel from '../tuning/TuningPanel'
import PaletteControls from './PaletteControls'
import PaletteExport from './PaletteExport'
import {
  TOOL_TABS,
  type ToolTab,
  WORKSPACE_TABS,
  type WorkspaceTab,
} from './tabs'
import type { PaletteWorkspaceProps } from './types'
import WorkspaceTabs from './WorkspaceTabs'

function WorkspacePanel({
  tab,
  activeTab,
  children,
}: {
  tab: WorkspaceTab
  activeTab: WorkspaceTab
  children: ReactNode
}) {
  return (
    <div
      role="tabpanel"
      id={`panel-${tab}`}
      aria-labelledby={`tab-${tab}`}
      hidden={activeTab !== tab}
    >
      {children}
    </div>
  )
}

// Stable neutral chrome; generated colors are scoped to palette output and preview.
export default function PaletteWorkspace(props: PaletteWorkspaceProps) {
  const { t } = useLocale()
  const { copied, copy, error } = useCopy()
  const [toolTab, setToolTab] = useState<ToolTab>('tuning')
  const [previewTheme, setPreviewTheme] = useState<'light' | 'dark' | null>(
    null,
  )
  const [drawer, setDrawer] = useState<'export' | 'contrast' | null>(null)
  const [saveStatus, setSaveStatus] = useState<'' | 'saved' | 'error'>('')
  const saveTimer = useRef<number | undefined>(undefined)
  const opener = useRef<HTMLElement | null>(null)
  const advanced = useRef<HTMLDivElement>(null)
  const { palette: shown, accent, harmony } = props.preview
  const theme = previewTheme ?? props.theme
  const check = shown?.checks[theme].find(
    (check) => check.fg === 'on-primary' && check.bg === 'primary',
  )
  const failed = shown?.checks[theme].filter((check) => !check.ok).length ?? 0
  const roles = Object.fromEntries(
    (shown?.[theme] ?? []).map((role) => [role.name, role.hex]),
  )
  useEffect(() => {
    window.workspace?.setExpanded(true)
    return () => window.clearTimeout(saveTimer.current)
  }, [])
  function save() {
    window.clearTimeout(saveTimer.current)
    const success = props.onSave()
    setSaveStatus(success ? 'saved' : 'error')
    if (success)
      saveTimer.current = window.setTimeout(() => setSaveStatus(''), 2400)
  }
  function openDrawer(kind: 'export' | 'contrast', button: HTMLElement) {
    opener.current = button
    setDrawer(kind)
  }
  return (
    <div className="proofing-desk" data-view={props.view}>
      <header className="app-header">
        <a
          className="app-brand"
          href="#studio"
          aria-label="TadaHue"
          onClick={(event) => {
            event.preventDefault()
            props.onViewChange('edit')
          }}
        >
          <span className="brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span>TadaHue</span>
        </a>
        <nav className="desktop-navigation" aria-label={t('workspaceTools')}>
          <button
            type="button"
            aria-current={props.view !== 'library' ? 'page' : undefined}
            onClick={() => props.onViewChange('edit')}
          >
            {t('studio')}
          </button>
          <button
            type="button"
            aria-current={props.view === 'library' ? 'page' : undefined}
            onClick={() => props.onViewChange('library')}
          >
            {t('libraryTab')}
          </button>
        </nav>
        <span className="header-privacy">{t('localPrivacy')}</span>
        <div className="header-settings">{props.settings}</div>
        <Button
          variant="outline"
          className="save-button"
          disabled={!props.palette}
          onClick={save}
        >
          {saveStatus === 'saved' ? (
            <Check aria-hidden="true" />
          ) : (
            <Bookmark aria-hidden="true" />
          )}
          <span className="desktop-label">{t('savePalette')}</span>
          <span className="mobile-label">{t('saveShort')}</span>
        </Button>
        <Button
          className="header-export"
          disabled={!props.palette}
          onClick={(event) => openDrawer('export', event.currentTarget)}
        >
          <ArrowUpRight aria-hidden="true" />
          {t('exportPalette')}
        </Button>
      </header>
      <nav className="mobile-navigation" aria-label={t('workspaceTools')}>
        <WorkspaceTabs
          tabs={WORKSPACE_TABS}
          tab={props.view}
          onChange={props.onViewChange}
          label={t('workspaceTools')}
        />
      </nav>
      <main className="workspace" id="studio">
        <div className="editor-region">
          <PaletteControls {...props} />
        </div>
        <section
          role="tabpanel"
          className="results-pane"
          id="panel-preview"
          aria-labelledby="tab-preview"
        >
          {shown && (
            <HarmonyPalette seed={shown.seed} accent={accent} mode={harmony} />
          )}
          {!props.palette && (
            <p className="retained-notice" role="status">
              <CircleAlert aria-hidden="true" />
              {t('previewRetained')}
            </p>
          )}
          {shown ? (
            <ThemePreview
              palette={shown}
              theme={theme}
              onThemeChange={setPreviewTheme}
              style={props.style}
              onStyleChange={props.onStyleChange}
            />
          ) : (
            <p>{t('previewUnavailable')}</p>
          )}
          {check && (
            <div className="contrast-summary">
              {check.ok ? (
                <CircleCheck className="status-icon" aria-hidden="true" />
              ) : (
                <CircleAlert
                  className="status-icon needs-adjustment"
                  aria-hidden="true"
                />
              )}
              <div className="contrast-summary-text">
                <strong>{t('primaryText')}</strong>
                <span>
                  {t('colorPairDescription', {
                    fg: roles['on-primary'].toUpperCase(),
                    bg: roles.primary.toUpperCase(),
                  })}
                </span>
              </div>
              <span
                className={`contrast-badge ${check.ok ? '' : 'needs-adjustment'}`}
              >
                {check.ok
                  ? t('contrastAA', { ratio: check.ratio.toFixed(2) })
                  : `${check.ratio.toFixed(2)} : 1 · ${t('contrastFail')}`}
              </span>
              <Button
                variant="ghost"
                onClick={(event) => openDrawer('contrast', event.currentTarget)}
              >
                <ChevronRight aria-hidden="true" />
                {t('contrastAll')}
              </Button>
            </div>
          )}
        </section>
        <section className="advanced-controls" aria-labelledby="advanced-title">
          <h2 id="advanced-title">
            <SlidersHorizontal aria-hidden="true" />
            {t('advancedTuning')}
          </h2>
          <div className="advanced-body">
            <div className="settings-field">
              <span>{t('colorTwo')}</span>
              <ColorInput
                value={props.accent}
                label={t('colorTwo')}
                onChange={(hex) => props.onAnchorChange(1, hex)}
              />
            </div>
            <div className="tuning-toolbar">
              <WorkspaceTabs
                tabs={TOOL_TABS}
                tab={toolTab}
                onChange={setToolTab}
                label={t('workspaceTools')}
              />
              <Button
                className="tuning-reset"
                variant="ghost"
                size="icon"
                aria-label={t('resetTuning')}
                title={t('resetTuning')}
                disabled={
                  JSON.stringify(props.tuning) ===
                  JSON.stringify(DEFAULT_TUNING)
                }
                onClick={() => props.onTuningChange({ ...DEFAULT_TUNING })}
              >
                <RotateCcw aria-hidden="true" />
              </Button>
            </div>
            <WorkspacePanel tab="tuning" activeTab={toolTab}>
              <div ref={advanced}>
                <TuningPanel {...props} />
              </div>
            </WorkspacePanel>
            <WorkspacePanel tab="tokens" activeTab={toolTab}>
              {shown && (
                <RoleGrid
                  title={t('allTokens')}
                  roles={shown[theme]}
                  copied={copied}
                  error={error}
                  onCopy={copy}
                />
              )}
            </WorkspacePanel>
            <WorkspacePanel tab="palettes" activeTab={toolTab}>
              <MorePalettes seed={shown?.seed ?? props.seed} />
            </WorkspacePanel>
          </div>
        </section>
        <section
          role="tabpanel"
          className="library-page"
          id="panel-library"
          aria-labelledby="tab-library"
          hidden={props.view !== 'library'}
        >
          <div className="library-heading">
            <div>
              <h1>{t('libraryTab')}</h1>
              <p>{t('localLimit')}</p>
            </div>
            <Button
              variant="outline"
              onClick={() => props.onViewChange('edit')}
            >
              {t('backToStudio')}
            </Button>
          </div>
          {props.library}
        </section>
      </main>
      <footer className="mobile-output">
        <button
          type="button"
          className={`contrast-badge ${failed ? 'needs-adjustment' : ''}`}
          disabled={!shown}
          onClick={(event) => openDrawer('contrast', event.currentTarget)}
        >
          {failed
            ? t('contrastNeeds', { count: failed })
            : `AA · ${t('contrastPass')}`}
        </button>
        <Button
          disabled={!props.palette}
          onClick={(event) => openDrawer('export', event.currentTarget)}
        >
          <ArrowUpRight aria-hidden="true" />
          {t('exportPalette')}
        </Button>
      </footer>
      <p
        className={`save-feedback ${saveStatus === 'error' ? 'feedback-error' : ''}`}
        role="status"
      >
        {saveStatus === 'error'
          ? t('storageError')
          : saveStatus === 'saved'
            ? t('savedLocal')
            : ''}
      </p>
      <PaletteExport
        palette={props.palette}
        preview={props.preview}
        style={props.style}
        tuning={props.tuning}
        theme={theme}
        open={drawer === 'export'}
        onOpenChange={(open) => {
          if (!open) setDrawer(null)
        }}
        finalFocus={opener}
      />
      <Sheet
        open={drawer === 'contrast'}
        onOpenChange={(open) => {
          if (!open) setDrawer(null)
        }}
      >
        <SheetContent className="contrast-sheet" finalFocus={opener}>
          <div className="sheet-heading">
            <SheetTitle>{t('contrastTab')}</SheetTitle>
            <SheetClose render={<Button variant="ghost" />}>
              {t('close')}
            </SheetClose>
          </div>
          <SheetDescription>{t('contrastHint')}</SheetDescription>
          {shown && <ContrastPanel palette={shown} theme={theme} />}
          <Button
            variant="outline"
            onClick={() => {
              setDrawer(null)
              props.onViewChange('edit')
              setToolTab('tuning')
              window.setTimeout(
                () =>
                  advanced.current
                    ?.querySelector<HTMLInputElement>('input[type="range"]')
                    ?.focus(),
                250,
              )
            }}
          >
            {t('advancedTuning')}
          </Button>
        </SheetContent>
      </Sheet>
    </div>
  )
}
