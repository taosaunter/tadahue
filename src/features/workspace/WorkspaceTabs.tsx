import { useRef } from 'react'
import { useLocale } from '../../app/i18n'

import { TAB_LABELS, type WorkspaceTab } from './tabs'

export default function WorkspaceTabs<T extends WorkspaceTab>({
  tab,
  onChange,
  tabs,
  label,
}: {
  tab: T
  onChange: (tab: T) => void
  tabs: readonly T[]
  label: string
}) {
  const { t } = useLocale()
  const tabButtons = useRef<Array<HTMLButtonElement | null>>([])
  return (
    <div role="tablist" aria-label={label} className="workspace-tabs">
      {tabs.map((value, index) => (
        <button
          key={value}
          ref={(node) => {
            tabButtons.current[index] = node
          }}
          type="button"
          role="tab"
          id={`tab-${value}`}
          aria-controls={`panel-${value}`}
          aria-selected={tab === value}
          tabIndex={tab === value ? 0 : -1}
          onClick={() => onChange(value)}
          onKeyDown={(event) => {
            let next: number
            if (event.key === 'ArrowRight') next = (index + 1) % tabs.length
            else if (event.key === 'ArrowLeft')
              next = (index + tabs.length - 1) % tabs.length
            else if (event.key === 'Home') next = 0
            else if (event.key === 'End') next = tabs.length - 1
            else return
            event.preventDefault()
            onChange(tabs[next])
            tabButtons.current[next]?.focus()
          }}
        >
          {t(TAB_LABELS[value])}
        </button>
      ))}
    </div>
  )
}
