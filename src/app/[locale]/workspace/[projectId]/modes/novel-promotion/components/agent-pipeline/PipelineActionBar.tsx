'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AppIcon } from '@/components/ui/icons'
import { queryKeys } from '@/lib/query/keys'

type Props = {
  projectId: string
  episodeId: string
  novelText: string
  disabled: boolean
  pipelineStatus?: string
  runId: string | null
  onStarted: (pipelineRunId: string) => void
  onEnterEditor: () => void
}

function StatusBadge({ status, t }: { status: string; t: (key: string) => string }) {
  switch (status) {
    case 'running':
      return (
        <div className="flex items-center gap-1.5 text-xs text-blue-400">
          <div className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
          {t('statusRunning')}
        </div>
      )
    case 'paused':
      return (
        <div className="flex items-center gap-1.5 text-xs text-amber-400">
          <AppIcon name="pause" className="h-3 w-3" />
          {t('statusPaused')}
        </div>
      )
    case 'review':
      return (
        <div className="flex items-center gap-1.5 text-xs text-amber-400">
          <AppIcon name="clock" className="h-3 w-3" />
          {t('statusReview')}
        </div>
      )
    case 'completed':
      return (
        <div className="flex items-center gap-1.5 text-xs text-emerald-400">
          <AppIcon name="checkCircle" className="h-3 w-3" />
          {t('statusCompleted')}
        </div>
      )
    case 'failed':
      return (
        <div className="flex items-center gap-1.5 text-xs text-red-400">
          <AppIcon name="alertCircle" className="h-3 w-3" />
          {t('statusFailed')}
        </div>
      )
    default:
      return null
  }
}

export function PipelineActionBar({
  projectId,
  episodeId,
  novelText,
  disabled,
  pipelineStatus,
  runId,
  onStarted,
  onEnterEditor,
}: Props) {
  const t = useTranslations('pipeline')
  const queryClient = useQueryClient()
  const [isAssembling, setIsAssembling] = useState(false)

  const startMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/novel-promotion/${projectId}/pipeline/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: novelText }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error?.message || data.message || 'Failed to start pipeline')
      }
      return response.json()
    },
    onSuccess: (data) => {
      onStarted(data.pipelineRunId)
      queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.status(projectId) })
    },
  })

  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!runId) throw new Error('No runId')
      const response = await fetch(`/api/runs/${runId}/cancel`, { method: 'POST' })
      if (!response.ok) throw new Error('Failed to cancel')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.status(projectId) })
    },
  })

  const pauseMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/novel-promotion/${projectId}/pipeline/pause`, {
        method: 'POST',
      })
      if (!response.ok) throw new Error('Failed to pause')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.status(projectId) })
    },
  })

  const resumeMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/novel-promotion/${projectId}/pipeline/resume`, {
        method: 'POST',
      })
      if (!response.ok) throw new Error('Failed to resume')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.status(projectId) })
    },
  })

  const isRunning = pipelineStatus === 'running'
  const isPaused = pipelineStatus === 'paused'
  const isReview = pipelineStatus === 'review'
  const isCompleted = pipelineStatus === 'completed'
  const isFailed = pipelineStatus === 'failed'
  const canStart = !isRunning && !isPaused && !isReview && !isCompleted && !disabled && !!novelText?.trim() && !startMutation.isPending

  const handleAutoAssemble = async () => {
    setIsAssembling(true)
    try {
      const res = await fetch(`/api/novel-promotion/${projectId}/editor/auto-assemble`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ episodeId }),
      })
      if (!res.ok) throw new Error('Auto-assembly failed')
      onEnterEditor()
    } catch {
      // Silently fall through - user can try again
    } finally {
      setIsAssembling(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-(--glass-text-primary)">{t('pipelineTitle')}</h3>
        {pipelineStatus && <StatusBadge status={pipelineStatus} t={t} />}
      </div>

      <div className="flex gap-2">
        {isReview ? (
          <div className="flex-1 flex items-center gap-2 rounded-lg bg-white/10 border border-white/20 px-4 py-2.5 text-sm font-semibold text-white">
            <AppIcon name="eye" className="h-4 w-4 shrink-0" />
            <span>{t('reviewGuidance')}</span>
          </div>
        ) : isCompleted ? (
          <div className="flex-1 flex flex-col gap-2">
            <div className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-orange-100 to-amber-50 border border-orange-200 px-4 py-2.5 text-sm font-semibold text-emerald-700">
              <AppIcon name="checkCircle" className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{t('pipelineCompleted')}</span>
            </div>
            <button
              onClick={handleAutoAssemble}
              disabled={isAssembling}
              className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <AppIcon name="video" className="h-4 w-4" />
              {isAssembling ? t('assembling') : t('oneClickFilm')}
            </button>
          </div>
        ) : !isRunning && !isPaused ? (
          <button
            onClick={() => startMutation.mutate()}
            disabled={!canStart}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <AppIcon name="rocket" className="h-4 w-4" />
            {startMutation.isPending ? t('starting') : t('startPipeline')}
          </button>
        ) : (
          <>
            {isRunning && (
              <button
                onClick={() => pauseMutation.mutate()}
                disabled={pauseMutation.isPending}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-amber-800 px-4 py-2.5 text-sm font-medium text-amber-400 hover:bg-amber-900/30 disabled:opacity-50 transition-colors"
              >
                <AppIcon name="pause" className="h-3.5 w-3.5" />
                {pauseMutation.isPending ? t('pausing') : t('pausePipeline')}
              </button>
            )}
            {isPaused && (
              <button
                onClick={() => resumeMutation.mutate()}
                disabled={resumeMutation.isPending}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                <AppIcon name="play" className="h-3.5 w-3.5" />
                {resumeMutation.isPending ? t('resuming') : t('resumePipeline')}
              </button>
            )}
            <button
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
              className="flex items-center justify-center gap-2 rounded-lg border border-red-800 px-4 py-2.5 text-sm font-medium text-red-400 hover:bg-red-900/30 disabled:opacity-50 transition-colors"
            >
              <AppIcon name="square" className="h-3.5 w-3.5" />
              {cancelMutation.isPending ? t('stopping') : t('stop')}
            </button>
          </>
        )}
      </div>

      {startMutation.isError && (
        <div className="flex items-start gap-2 rounded-lg bg-red-900/30 border border-red-800 px-3 py-2 text-xs text-red-300">
          <AppIcon name="alertCircle" className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>{startMutation.error.message}</span>
        </div>
      )}
    </div>
  )
}
