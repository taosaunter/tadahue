import { ChevronDown, Image } from 'lucide-react'
import { useState } from 'react'
import { useLocale } from '../../app/i18n'
import { HARMONY_MODES, type HarmonyMode } from '../../color/harmony'
import { Button } from '../../shared/ui/button'
import ImagePalette from '../image/ImagePalette'
import ColorInput from '../palette/ColorInput'
import ColorWheel from '../palette/ColorWheel'
import HarmonyPalette from '../palette/HarmonyPalette'
import type { PaletteWorkspaceProps } from './types'

// Color sources and progressive disclosure; all source panels remain mounted.
export default function PaletteControls(props: PaletteWorkspaceProps) {
  const { t } = useLocale()
  const [source, setSource] = useState<'code' | 'image'>('code')
  const { palette: preview, accent, harmony } = props.preview
  return (
    <aside
      className="controls-pane"
      role="tabpanel"
      tabIndex={0}
      id="panel-edit"
      aria-labelledby="tab-edit"
    >
      <div
        className="source-options"
        role="group"
        aria-label={t('generationMode')}
      >
        <Button
          variant={source === 'code' ? 'default' : 'outline'}
          aria-pressed={source === 'code'}
          onClick={() => setSource('code')}
        >
          {t('sourceCode')}
        </Button>
        <Button
          variant={source === 'image' ? 'default' : 'outline'}
          aria-pressed={source === 'image'}
          onClick={() => setSource('image')}
        >
          <Image aria-hidden="true" />
          {t('sourceImage')}
        </Button>
      </div>
      <div className="color-source">
        <div className="image-source" hidden={source !== 'image'}>
          <ImagePalette onApply={(hex) => props.onAnchorChange(0, hex)} />
        </div>
        <div className="code-source" hidden={source !== 'code'}>
          <div className="base-color-field">
            <div className="base-color-heading">
              <span>
                {t(props.backgroundEnabled ? 'backgroundColor' : 'colorOne')}
              </span>
              <label className="background-choice" title={t('backgroundHint')}>
                <input
                  type="checkbox"
                  checked={props.backgroundEnabled}
                  onChange={(event) =>
                    props.onBackgroundEnabledChange(event.target.checked)
                  }
                />
                <span>{t('backgroundMode')}</span>
              </label>
            </div>
            <ColorInput
              value={props.seed}
              label={t(
                props.backgroundEnabled ? 'backgroundColor' : 'colorOne',
              )}
              onChange={(hex) => props.onAnchorChange(0, hex)}
            />
          </div>
          {props.actions}
        </div>
      </div>
      {!props.palette && (
        <p className="invalid-preview" role="status">
          {t('previewRetained')}
        </p>
      )}
      <label className="settings-field">
        <span>{t('harmony')}</span>
        <span className="select-wrap">
          <select
            value={props.harmony}
            onChange={(event) =>
              props.onHarmonyChange(event.target.value as HarmonyMode)
            }
          >
            {HARMONY_MODES.map((value) => (
              <option key={value} value={value}>
                {t(value)}
              </option>
            ))}
          </select>
          <ChevronDown aria-hidden="true" />
        </span>
      </label>
      {preview && (
        <ColorWheel
          seed={preview.seed}
          accent={accent}
          mode={harmony}
          onChange={props.onAnchorChange}
        />
      )}
      <div className="editor-palette">
        {preview && (
          <HarmonyPalette seed={preview.seed} accent={accent} mode={harmony} />
        )}
      </div>
    </aside>
  )
}
