// src/lib/agent-pipeline/quality/quality-gate.ts

import type { PipelineConfig } from '../types'
import { REVIEW_MODE } from '../types'
import { shouldAutoPass } from './scoring'

type ItemScore = {
  targetId: string
  score: number
  retryCount: number
}

export type PhaseQualityResult = {
  passed: boolean
  autoPassedIds: string[]
  pendingIds: string[]
  retryIds: string[]
  failedIds: string[]
}

export function evaluatePhaseQuality(input: {
  config: PipelineConfig
  itemScores: ItemScore[]
}): PhaseQualityResult {
  const { config, itemScores } = input
  const autoPassedIds: string[] = []
  const pendingIds: string[] = []
  const retryIds: string[] = []
  const failedIds: string[] = []

  for (const item of itemScores) {
    if (config.reviewMode === REVIEW_MODE.STRICT) {
      pendingIds.push(item.targetId)
      continue
    }

    if (shouldAutoPass(item.score, config.consistencyThreshold)) {
      autoPassedIds.push(item.targetId)
    } else if (item.retryCount >= config.maxRetriesPerItem) {
      failedIds.push(item.targetId)
    } else {
      retryIds.push(item.targetId)
    }
  }

  const passed = pendingIds.length === 0 && retryIds.length === 0 && failedIds.length === 0

  return { passed, autoPassedIds, pendingIds, retryIds, failedIds }
}
