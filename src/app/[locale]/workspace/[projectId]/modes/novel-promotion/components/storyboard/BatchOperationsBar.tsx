'use client'

import { useTranslations } from 'next-intl'
import { AppIcon } from '@/components/ui/icons'

type Props = {
  selectedCount: number
  onSelectAll: () => void
  onDeselectAll: () => void
  onRegenerateSelected: () => void
  onDeleteSelected: () => void
  isProcessing?: boolean
}

export function BatchOperationsBar({
  selectedCount,
  onSelectAll,
  onDeselectAll,
  onRegenerateSelected,
  onDeleteSelected,
  isProcessing,
}: Props) {
  const t = useTranslations('pipeline')

  if (selectedCount === 0) return null

  return (
    <div className="cinema-fade-up glass-surface-elevated sticky bottom-4 z-30 mx-4 flex items-center justify-between rounded-xl px-4 py-3 shadow-lg">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-(--glass-text-primary)">
          {t('selectedCount', { count: selectedCount })}
        </span>
        <button
          onClick={onSelectAll}
          className="text-xs text-(--glass-text-tertiary) hover:text-(--glass-text-secondary) transition-colors"
        >
          {t('selectAll')}
        </button>
        <button
          onClick={onDeselectAll}
          className="text-xs text-(--glass-text-tertiary) hover:text-(--glass-text-secondary) transition-colors"
        >
          {t('deselectAll')}
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onRegenerateSelected}
          disabled={isProcessing}
          className="flex items-center gap-1.5 rounded-lg bg-(--glass-bg-surface-strong) px-3 py-1.5 text-xs font-medium text-(--glass-text-primary) hover:bg-(--glass-bg-surface-strong)/80 disabled:opacity-50 transition-colors"
        >
          <AppIcon name="refresh" className={`h-3.5 w-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
          {t('regenerateSelected')}
        </button>
        <button
          onClick={onDeleteSelected}
          disabled={isProcessing}
          className="flex items-center gap-1.5 rounded-lg border border-red-800/50 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-900/30 disabled:opacity-50 transition-colors"
        >
          <AppIcon name="trash" className="h-3.5 w-3.5" />
          {t('deleteSelected')}
        </button>
      </div>
    </div>
  )
}
