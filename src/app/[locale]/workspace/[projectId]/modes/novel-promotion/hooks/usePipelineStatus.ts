'use client'

import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'

type TokenUsage = {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

export type StepInfo = {
  stepKey: string
  stepTitle: string
  status: string
  stepIndex: number
  startedAt: string | null
  finishedAt: string | null
  lastErrorMessage: string | null
  usage: TokenUsage
}

export type ActiveTaskInfo = {
  type: string
  targetType: string
  progress: number
  status: string
  model: string | null
}

export type ReviewSummary = {
  total: number
  autoPassedCount: number
  pendingCount: number
  approvedCount: number
  rejectedCount: number
  retryingCount: number
}

export type PipelineLogEntry = {
  ts: string
  agent: string
  message: string
  model?: string
  detail?: string
}

export type PipelineStatusResponse = {
  exists: boolean
  pipelineRunId?: string
  status?: string
  currentPhase?: string | null
  startedAt?: string | null
  completedAt?: string | null
  errorMessage?: string | null
  runId?: string | null
  steps?: StepInfo[]
  totalUsage?: TokenUsage
  activeTask?: ActiveTaskInfo | null
  review?: ReviewSummary
  logs?: PipelineLogEntry[]
}

export function usePipelineStatus(projectId: string, enabled: boolean) {
  return useQuery<PipelineStatusResponse>({
    queryKey: queryKeys.pipeline.status(projectId),
    queryFn: async () => {
      const res = await fetch(`/api/novel-promotion/${projectId}/pipeline/status`)
      if (!res.ok) throw new Error('Failed to fetch pipeline status')
      return res.json()
    },
    refetchInterval: (query) => {
      const data = query.state.data
      if (!data?.exists) return false
      const status = data.status
      if (status === 'completed' || status === 'failed') return false
      return 3000
    },
    enabled,
  })
}
