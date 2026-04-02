'use client'

import { memo } from 'react'
import { useTranslations } from 'next-intl'

export type CanvasView = 'overview' | 'script' | 'characters' | 'storyboard' | 'assembly'

interface CanvasViewNavProps {
  activeView: CanvasView
  onViewChange: (view: CanvasView) => void
}

const NAV_ITEMS: { view: CanvasView; key: string }[] = [
  { view: 'overview', key: 'canvasViewOverview' },
  { view: 'script', key: 'canvasViewScript' },
  { view: 'characters', key: 'canvasViewCharacters' },
  { view: 'storyboard', key: 'canvasViewStoryboard' },
  { view: 'assembly', key: 'canvasViewAssembly' },
]

export const CanvasViewNav = memo(function CanvasViewNav({
  activeView,
  onViewChange,
}: CanvasViewNavProps) {
  const t = useTranslations('pipeline')

  return (
    <div
      className="absolute top-4 left-4 z-10 flex flex-col rounded-xl py-1"
      style={{
        background: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      {NAV_ITEMS.map(({ view, key }) => {
        const isActive = activeView === view
        return (
          <button
            key={view}
            onClick={() => onViewChange(view)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-left transition-colors duration-150 hover:bg-white/10"
            style={{ fontSize: '13px' }}
          >
            <span
              className="w-3 text-center"
              style={{ color: 'rgba(255,255,255,0.9)' }}
            >
              {isActive ? '•' : ''}
            </span>
            <span
              style={{
                color: isActive ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.5)',
                fontWeight: isActive ? 500 : 400,
                transition: 'color 0.15s',
              }}
            >
              {t(key)}
            </span>
          </button>
        )
      })}
    </div>
  )
})
