// src/lib/agent-pipeline/review/types.ts

import type { ReviewStatus, PipelinePhase } from '../types'

export type ReviewItemInput = {
  pipelineRunId: string
  phase: PipelinePhase
  targetType: 'character' | 'location' | 'panel'
  targetId: string
  status: ReviewStatus
  score?: number | null
  feedback?: string | null
}

export type ReviewSummary = {
  total: number
  autoPassedCount: number
  pendingCount: number
  approvedCount: number
  rejectedCount: number
  retryingCount: number
}
