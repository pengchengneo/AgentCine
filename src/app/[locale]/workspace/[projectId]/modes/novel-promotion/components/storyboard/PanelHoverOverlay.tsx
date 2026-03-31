'use client'

import { useTranslations } from 'next-intl'
import { AppIcon } from '@/components/ui/icons'

type Props = {
  onRegenerate: () => void
  onEdit: () => void
  onDelete: () => void
  isRegenerating?: boolean
}

export function PanelHoverOverlay({ onRegenerate, onEdit, onDelete, isRegenerating }: Props) {
  const t = useTranslations('storyboard')

  return (
    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2 z-10">
      <button
        onClick={(e) => { e.stopPropagation(); onEdit() }}
        className="glass-icon-btn-sm rounded-full bg-white/10 backdrop-blur-sm p-2 hover:bg-white/20 transition-colors"
        title={t('panel.edit')}
      >
        <AppIcon name="edit" className="h-4 w-4 text-white" />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onRegenerate() }}
        disabled={isRegenerating}
        className="glass-icon-btn-sm rounded-full bg-white/10 backdrop-blur-sm p-2 hover:bg-white/20 transition-colors disabled:opacity-50"
        title={t('panel.regenerate')}
      >
        <AppIcon name="refresh" className={`h-4 w-4 text-white ${isRegenerating ? 'animate-spin' : ''}`} />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete() }}
        className="glass-icon-btn-sm rounded-full bg-white/10 backdrop-blur-sm p-2 hover:bg-red-500/30 transition-colors"
        title={t('panel.delete')}
      >
        <AppIcon name="trash" className="h-4 w-4 text-white" />
      </button>
    </div>
  )
}
