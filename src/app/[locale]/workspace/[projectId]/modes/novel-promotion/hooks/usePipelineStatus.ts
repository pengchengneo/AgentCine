'use client'

import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import type { TokenUsage, StepInfo, SubStepInfo, ActiveTaskInfo, PipelineLogEntry } from '@/lib/agent-pipeline/pipeline-types'

export type { TokenUsage, StepInfo, SubStepInfo, ActiveTaskInfo, PipelineLogEntry }

export type ReviewSummary = {
  total: number
  autoPassedCount: number
  pendingCount: number
  approvedCount: number
  rejectedCount: number
  retryingCount: number
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
      if (status === 'paused') return 10000
      return 3000
    },
    enabled,
  })
}
