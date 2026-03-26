import { describe, expect, it } from 'vitest'
import {
  makeDecision,
  parseConsistencyResponse,
  type ConsistencyCheckResult,
} from '@/lib/agent-pipeline/asset-layer/consistency-checker'

describe('consistency-checker', () => {
  describe('parseConsistencyResponse', () => {
    it('parses valid JSON response with scores', () => {
      const response = JSON.stringify({
        characterScore: 0.8,
        sceneScore: 0.9,
        styleScore: 0.7,
        overallScore: 0.8,
        issues: ['minor color difference'],
      })

      const result = parseConsistencyResponse(response)
      expect(result.overallScore).toBe(0.8)
      expect(result.characterScore).toBe(0.8)
      expect(result.sceneScore).toBe(0.9)
      expect(result.styleScore).toBe(0.7)
      expect(result.issues).toEqual(['minor color difference'])
    })

    it('returns zero scores for unparseable response', () => {
      const result = parseConsistencyResponse('not json at all')
      expect(result.overallScore).toBe(0)
      expect(result.issues).toContain('Failed to parse consistency check response')
    })

    it('clamps scores to 0-1 range', () => {
      const response = JSON.stringify({
        characterScore: 1.5,
        sceneScore: -0.2,
        styleScore: 0.5,
        overallScore: 2.0,
        issues: [],
      })

      const result = parseConsistencyResponse(response)
      expect(result.overallScore).toBe(1.0)
      expect(result.characterScore).toBe(1.0)
      expect(result.sceneScore).toBe(0)
    })
  })

  describe('makeDecision', () => {
    it('returns pass when score >= threshold', () => {
      const result = makeDecision(0.8, 0.7, 1, 3)
      expect(result).toBe('pass')
    })

    it('returns retry when score < threshold and retries remain', () => {
      const result = makeDecision(0.5, 0.7, 1, 3)
      expect(result).toBe('retry')
    })

    it('returns manual_review when retries exhausted', () => {
      const result = makeDecision(0.5, 0.7, 3, 3)
      expect(result).toBe('manual_review')
    })
  })
})
