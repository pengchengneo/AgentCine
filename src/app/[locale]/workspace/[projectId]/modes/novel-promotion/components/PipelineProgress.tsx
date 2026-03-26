'use client'

import { useQuery } from '@tanstack/react-query'
import { Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react'

type Props = {
  projectId: string
  pipelineRunId: string | null
}

const PHASES = [
  { key: 'script', label: '剧本分析' },
  { key: 'art', label: '美术生成' },
  { key: 'storyboard', label: '分镜生成' },
  { key: 'review', label: '审核' },
]

export function PipelineProgress({ projectId, pipelineRunId }: Props) {
  const { data } = useQuery({
    queryKey: ['pipeline-status', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/novel-promotion/${projectId}/pipeline/status`)
      if (!response.ok) throw new Error('Failed to fetch status')
      return response.json()
    },
    refetchInterval: 3000,
    enabled: !!pipelineRunId,
  })

  if (!data?.exists) return null

  const currentPhaseIndex = PHASES.findIndex((p) => p.key === data.currentPhase)
  const isRunning = data.status === 'running'
  const isFailed = data.status === 'failed'

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-4">
      <div className="flex items-center gap-3 mb-4">
        {isRunning && <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />}
        {isFailed && <XCircle className="h-5 w-5 text-red-400" />}
        {data.status === 'review' && <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
        <span className="font-medium">
          {isRunning ? 'Agent 生成中...' : isFailed ? '生成失败' : '生成完成，等待审核'}
        </span>
      </div>

      <div className="flex gap-2">
        {PHASES.map((phase, index) => {
          const isDone = index < currentPhaseIndex
          const isCurrent = index === currentPhaseIndex && isRunning
          return (
            <div
              key={phase.key}
              className={`flex-1 rounded px-3 py-2 text-center text-sm ${
                isDone
                  ? 'bg-emerald-900/40 text-emerald-400'
                  : isCurrent
                    ? 'bg-blue-900/40 text-blue-400'
                    : 'bg-zinc-800 text-zinc-500'
              }`}
            >
              {isDone && <CheckCircle2 className="inline h-3 w-3 mr-1" />}
              {isCurrent && <Loader2 className="inline h-3 w-3 mr-1 animate-spin" />}
              {!isDone && !isCurrent && <Clock className="inline h-3 w-3 mr-1" />}
              {phase.label}
            </div>
          )
        })}
      </div>

      {isFailed && data.errorMessage && (
        <p className="mt-3 text-sm text-red-400">{data.errorMessage}</p>
      )}
    </div>
  )
}
