// tests/unit/agent-pipeline/quality-gate.test.ts
import { describe, expect, it } from 'vitest'
import { evaluatePhaseQuality } from '@/lib/agent-pipeline/quality/quality-gate'
import type { PipelineConfig } from '@/lib/agent-pipeline/types'
import { REVIEW_MODE } from '@/lib/agent-pipeline/types'

const config: PipelineConfig = {
  reviewMode: REVIEW_MODE.STANDARD,
  consistencyThreshold: 0.7,
  maxRetriesPerItem: 3,
}

describe('quality-gate', () => {
  it('passes phase when all items score above threshold', () => {
    const result = evaluatePhaseQuality({
      config,
      itemScores: [
        { targetId: 'c1', score: 0.9, retryCount: 0 },
        { targetId: 'c2', score: 0.8, retryCount: 0 },
      ],
    })
    expect(result.passed).toBe(true)
    expect(result.autoPassedIds).toEqual(['c1', 'c2'])
    expect(result.pendingIds).toEqual([])
    expect(result.failedIds).toEqual([])
  })

  it('marks items as pending when below threshold with retries left', () => {
    const result = evaluatePhaseQuality({
      config,
      itemScores: [
        { targetId: 'c1', score: 0.5, retryCount: 1 },
      ],
    })
    expect(result.passed).toBe(false)
    expect(result.retryIds).toEqual(['c1'])
  })

  it('marks items as failed when retries exhausted', () => {
    const result = evaluatePhaseQuality({
      config,
      itemScores: [
        { targetId: 'c1', score: 0.5, retryCount: 3 },
      ],
    })
    expect(result.passed).toBe(false)
    expect(result.failedIds).toEqual(['c1'])
  })

  it('relaxed mode auto-passes items with retries left', () => {
    const relaxedConfig = { ...config, reviewMode: REVIEW_MODE.RELAXED as const }
    const result = evaluatePhaseQuality({
      config: relaxedConfig,
      itemScores: [
        { targetId: 'c1', score: 0.5, retryCount: 3 },
      ],
    })
    expect(result.failedIds).toEqual(['c1'])
  })

  it('strict mode puts all items as pending regardless of score', () => {
    const strictConfig = { ...config, reviewMode: REVIEW_MODE.STRICT as const }
    const result = evaluatePhaseQuality({
      config: strictConfig,
      itemScores: [
        { targetId: 'c1', score: 0.95, retryCount: 0 },
      ],
    })
    expect(result.pendingIds).toEqual(['c1'])
    expect(result.autoPassedIds).toEqual([])
  })
})
