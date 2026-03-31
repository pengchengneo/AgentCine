'use client'

import { ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import type { TaskPresentationState } from '@/lib/task/presentation'
import TaskStatusInline from '@/components/task/TaskStatusInline'
import { BatchOperationsBar } from './BatchOperationsBar'

interface StoryboardStageShellProps {
  children: ReactNode
  isTransitioning: boolean
  isNextDisabled: boolean
  transitioningState: TaskPresentationState | null
  onNext: () => void
  selectedPanelIds?: Set<string>
  onSelectAll?: () => void
  onDeselectAll?: () => void
  onRegenerateSelected?: () => void
  onDeleteSelected?: () => void
  isBatchProcessing?: boolean
}

export default function StoryboardStageShell({
  children,
  isTransitioning,
  isNextDisabled,
  transitioningState,
  onNext,
  selectedPanelIds,
  onSelectAll,
  onDeselectAll,
  onRegenerateSelected,
  onDeleteSelected,
  isBatchProcessing,
}: StoryboardStageShellProps) {
  const t = useTranslations('storyboard')
  const selectedCount = selectedPanelIds?.size ?? 0

  return (
    <div className="space-y-6 pb-20">
      {children}

      {selectedCount > 0 && onSelectAll && onDeselectAll && onRegenerateSelected && onDeleteSelected && (
        <BatchOperationsBar
          selectedCount={selectedCount}
          onSelectAll={onSelectAll}
          onDeselectAll={onDeselectAll}
          onRegenerateSelected={onRegenerateSelected}
          onDeleteSelected={onDeleteSelected}
          isProcessing={isBatchProcessing}
        />
      )}

      <button
        onClick={onNext}
        disabled={isNextDisabled}
        className="glass-btn-base glass-btn-primary fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-2xl px-6 py-3 text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isTransitioning ? (
          <TaskStatusInline state={transitioningState} className="text-white [&>span]:text-white [&_svg]:text-white" />
        ) : (
          t('header.generateVideo')
        )}
      </button>
    </div>
  )
}
