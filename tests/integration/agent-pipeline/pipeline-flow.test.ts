// tests/integration/agent-pipeline/pipeline-flow.test.ts
import { describe, expect, it } from 'vitest'
import {
  PIPELINE_STATUS,
  PIPELINE_PHASE,
  REVIEW_STATUS,
  DEFAULT_PIPELINE_CONFIG,
} from '@/lib/agent-pipeline/types'
import { composeImagePrompt } from '@/lib/agent-pipeline/asset-layer/prompt-composer'
import { evaluatePhaseQuality } from '@/lib/agent-pipeline/quality/quality-gate'
import { parseConsistencyResponse, makeDecision } from '@/lib/agent-pipeline/asset-layer/consistency-checker'

describe('agent-pipeline integration', () => {
  it('full prompt composition pipeline', () => {
    const prompt = composeImagePrompt({
      stylePrefix: 'american comic style, bold outlines, vibrant colors',
      characterFragments: [
        'a muscular man with a scar on his left cheek, wearing armor',
        'a young woman with silver hair and blue eyes',
      ],
      locationFragment: 'ancient stone castle, moonlit courtyard, torches on walls',
      shotDescription: 'wide shot, dramatic low angle',
      actionDescription: 'the two characters face each other in standoff',
    })

    expect(prompt).toContain('american comic style')
    expect(prompt).toContain('muscular man')
    expect(prompt).toContain('silver hair')
    expect(prompt).toContain('ancient stone castle')
    expect(prompt).toContain('wide shot')
    expect(prompt).toContain('standoff')
  })

  it('quality gate with standard review mode', () => {
    const result = evaluatePhaseQuality({
      config: DEFAULT_PIPELINE_CONFIG,
      itemScores: [
        { targetId: 'panel-1', score: 0.9, retryCount: 0 },
        { targetId: 'panel-2', score: 0.5, retryCount: 2 },
        { targetId: 'panel-3', score: 0.4, retryCount: 3 },
      ],
    })

    expect(result.autoPassedIds).toEqual(['panel-1'])
    expect(result.retryIds).toEqual(['panel-2'])
    expect(result.failedIds).toEqual(['panel-3'])
    expect(result.passed).toBe(false)
  })

  it('consistency check parse + decision pipeline', () => {
    const vlmResponse = JSON.stringify({
      characterScore: 0.85,
      sceneScore: 0.9,
      styleScore: 0.75,
      overallScore: 0.84,
      issues: [],
    })

    const parsed = parseConsistencyResponse(vlmResponse)
    expect(parsed.overallScore).toBe(0.84)

    const decision = makeDecision(parsed.overallScore, 0.7, 0, 3)
    expect(decision).toBe('pass')
  })

  it('consistency check with low score triggers retry', () => {
    const vlmResponse = JSON.stringify({
      characterScore: 0.4,
      sceneScore: 0.5,
      styleScore: 0.3,
      overallScore: 0.4,
      issues: ['character hair color mismatch', 'wrong clothing'],
    })

    const parsed = parseConsistencyResponse(vlmResponse)
    const decision = makeDecision(parsed.overallScore, 0.7, 1, 3)
    expect(decision).toBe('retry')
  })
})
