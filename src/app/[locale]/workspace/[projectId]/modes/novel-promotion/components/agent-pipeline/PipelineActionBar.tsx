'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AppIcon } from '@/components/ui/icons'
import { queryKeys } from '@/lib/query/keys'

type Props = {
  projectId: string
  novelText: string
  disabled: boolean
  pipelineStatus?: string
  runId: string | null
  onStarted: (pipelineRunId: string) => void
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'running':
      return (
        <div className="flex items-center gap-1.5 text-xs text-blue-400">
          <div className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
          运行中
        </div>
      )
    case 'review':
      return (
        <div className="flex items-center gap-1.5 text-xs text-amber-400">
          <AppIcon name="clock" className="h-3 w-3" />
          等待审核
        </div>
      )
    case 'completed':
      return (
        <div className="flex items-center gap-1.5 text-xs text-emerald-400">
          <AppIcon name="checkCircle" className="h-3 w-3" />
          已完成
        </div>
      )
    case 'failed':
      return (
        <div className="flex items-center gap-1.5 text-xs text-red-400">
          <AppIcon name="alertCircle" className="h-3 w-3" />
          失败
        </div>
      )
    default:
      return null
  }
}

export function PipelineActionBar({
  projectId,
  novelText,
  disabled,
  pipelineStatus,
  runId,
  onStarted,
}: Props) {
  const queryClient = useQueryClient()

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

  const isRunning = pipelineStatus === 'running'
  const canStart = !isRunning && !disabled && !!novelText?.trim() && !startMutation.isPending

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-(--glass-text-primary)">Agent Pipeline</h3>
        {pipelineStatus && <StatusBadge status={pipelineStatus} />}
      </div>

      <div className="flex gap-2">
        {!isRunning ? (
          <button
            onClick={() => startMutation.mutate()}
            disabled={!canStart}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <AppIcon name="rocket" className="h-4 w-4" />
            {startMutation.isPending ? '启动中...' : '启动 Pipeline'}
          </button>
        ) : (
          <button
            onClick={() => cancelMutation.mutate()}
            disabled={cancelMutation.isPending}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-red-800 px-4 py-2.5 text-sm font-medium text-red-400 hover:bg-red-900/30 disabled:opacity-50 transition-colors"
          >
            <AppIcon name="square" className="h-3.5 w-3.5" />
            {cancelMutation.isPending ? '取消中...' : '停止'}
          </button>
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
