// tests/unit/agent-pipeline/scoring.test.ts
import { describe, expect, it } from 'vitest'
import { shouldAutoPass, computePhaseScore } from '@/lib/agent-pipeline/quality/scoring'

describe('scoring', () => {
  it('shouldAutoPass returns true when score >= threshold', () => {
    expect(shouldAutoPass(0.8, 0.7)).toBe(true)
    expect(shouldAutoPass(0.7, 0.7)).toBe(true)
  })

  it('shouldAutoPass returns false when score < threshold', () => {
    expect(shouldAutoPass(0.6, 0.7)).toBe(false)
  })

  it('computePhaseScore averages item scores', () => {
    const scores = [0.9, 0.8, 0.7]
    expect(computePhaseScore(scores)).toBeCloseTo(0.8, 1)
  })

  it('computePhaseScore returns 1.0 for empty array', () => {
    expect(computePhaseScore([])).toBe(1.0)
  })
})
